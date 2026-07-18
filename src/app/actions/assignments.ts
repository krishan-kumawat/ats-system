"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "@/db/local-db";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";

export interface AssignmentRow {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  assignedToId: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedToRole: string;
  assignedByName: string;
  note: string;
  assignedAt: string;
}

export interface AssignJobInput {
  jobId: string;
  /** existing user id OR leave empty to create a new user */
  assignedToId?: string;
  /** required when creating a new user */
  newUser?: {
    name: string;
    email: string;
    role: UserRole;
    password: string;
  };
  note?: string;
}

// ─── Fetch all assignments ────────────────────────────────────────────────────

export async function fetchAssignmentsAction(): Promise<AssignmentRow[]> {
  try {
    const db = readDb();

    const rows = db.jobAssignments.map((ja) => {
      const job = db.jobs.find((j) => j.id === ja.jobId);
      const assignedTo = db.users.find((u) => u.id === ja.assignedToId);
      const assignedBy = db.users.find((u) => u.id === ja.assignedById);

      return {
        id: ja.id,
        jobId: ja.jobId,
        jobTitle: job?.title ?? "",
        department: job?.department ?? "",
        assignedToId: ja.assignedToId,
        assignedToName: assignedTo?.name ?? "",
        assignedToEmail: assignedTo?.email ?? "",
        assignedToRole: assignedTo?.role ?? "",
        assignedByName: assignedBy?.name ?? "",
        note: ja.note ?? "",
        assignedAt: ja.assignedAt instanceof Date
          ? ja.assignedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : String(ja.assignedAt),
      };
    });

    // Sort by assignedAt DESC
    return rows.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  } catch (err) {
    console.error("[fetchAssignmentsAction]", err);
    return [];
  }
}

// ─── Fetch all users eligible to be assigned (everyone except Founder) ───────

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function fetchAssignableUsersAction(): Promise<UserOption[]> {
  try {
    const db = readDb();

    return db.users
      .filter((u) => u.role !== UserRole.FOUNDER)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[fetchAssignableUsersAction]", err);
    return [];
  }
}

// ─── Fetch users who can act as Hiring Manager (HIRING_MANAGER + HEAD_OF_HR) ──

export async function fetchHiringManagerUsersAction(): Promise<UserOption[]> {
  try {
    const db = readDb();

    return db.users
      .filter((u) => u.role === UserRole.HIRING_MANAGER || u.role === UserRole.HEAD_OF_HR)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[fetchHiringManagerUsersAction]", err);
    return [];
  }
}

// ─── Reassign a specific applicant's Hiring Manager (HEAD_OF_HR / FOUNDER) ───

export async function reassignApplicantHMAction(
  applicationId: string,
  newHiringManagerId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.HEAD_OF_HR && session.role !== UserRole.FOUNDER) {
    return { error: "Only Head of HR or Founder can reassign hiring managers." };
  }

  try {
    const db = readDb();

    const app = db.applications.find((a) => a.id === applicationId);
    if (!app) throw new Error("Application not found.");

    const job = db.jobs.find((j) => j.id === app.jobId);
    const newHM = db.users.find((u) => u.id === newHiringManagerId);

    const oldHMVal = app.assignedHiringManagerId || job?.hiringManagerName || "Unassigned";
    app.assignedHiringManagerId = newHiringManagerId;

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "HM_REASSIGNED",
      targetTable: "applications",
      targetId: applicationId,
      notes: `Hiring Manager reassigned to ${newHM?.name ?? newHiringManagerId}.`,
      oldValues: { hiringManager: oldHMVal },
      newValues: { hiringManagerId: newHiringManagerId, name: newHM?.name },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[reassignApplicantHMAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to reassign hiring manager." };
  }
}

// ─── Assign job ───────────────────────────────────────────────────────────────

export async function assignJobAction(
  input: AssignJobInput
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.HEAD_OF_HR && session.role !== UserRole.FOUNDER) {
    return { error: "Only Head of HR or Founder can assign job requisitions." };
  }

  try {
    const db = readDb();
    let assignedToId = input.assignedToId;

    // Create user if they don't exist
    if (!assignedToId) {
      if (!input.newUser) throw new Error("Provide either assignedToId or newUser details.");

      const existing = db.users.find((u) => u.email === input.newUser!.email.trim().toLowerCase());
      if (existing) {
        assignedToId = existing.id;
      } else {
        const createdId = uuidv4();
        const createdUser = {
          id: createdId,
          name: input.newUser.name,
          email: input.newUser.email.trim().toLowerCase(),
          role: input.newUser.role,
          passwordHash: input.newUser.password,
          isActive: true,
          createdAt: new Date(),
        };
        db.users.push(createdUser);
        assignedToId = createdId;

        const nextLogId1 = db.auditLogs.length > 0
          ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
          : 1;

        db.auditLogs.push({
          id: nextLogId1,
          userId: session.id,
          action: "USER_CREATED",
          targetTable: "users",
          targetId: createdUser.id,
          notes: `New user created during job assignment. Role: ${input.newUser.role}.`,
          oldValues: null,
          newValues: { name: input.newUser.name, email: input.newUser.email, role: input.newUser.role },
          timestamp: new Date(),
        });
      }
    }

    // Upsert — if already assigned, update the note; else insert fresh
    const existingAssign = db.jobAssignments.find(
      (ja) => ja.jobId === input.jobId && ja.assignedToId === assignedToId
    );

    if (existingAssign) {
      existingAssign.note = input.note ?? null;
      existingAssign.assignedById = session.id;
      existingAssign.assignedAt = new Date();
    } else {
      db.jobAssignments.push({
        id: uuidv4(),
        jobId: input.jobId,
        assignedToId: assignedToId!,
        assignedById: session.id,
        note: input.note ?? null,
        assignedAt: new Date(),
      });
    }

    const assignedUser = db.users.find((u) => u.id === assignedToId);

    const nextLogId2 = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId2,
      userId: session.id,
      action: "JOB_ASSIGNED",
      targetTable: "job_assignments",
      targetId: input.jobId,
      notes: `Job assigned to ${assignedUser?.name ?? assignedToId}. ${input.note ? `Note: ${input.note}` : ""}`,
      oldValues: null,
      newValues: { jobId: input.jobId, assignedToId, assignedById: session.id },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[assignJobAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to assign job." };
  }
}

// ─── Revoke assignment ────────────────────────────────────────────────────────

export async function revokeAssignmentAction(
  assignmentId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.HEAD_OF_HR && session.role !== UserRole.FOUNDER) {
    return { error: "Only Head of HR or Founder can revoke assignments." };
  }

  try {
    const db = readDb();

    db.jobAssignments = db.jobAssignments.filter((ja) => ja.id !== assignmentId);

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "JOB_ASSIGNMENT_REVOKED",
      targetTable: "job_assignments",
      targetId: assignmentId,
      notes: "Job assignment revoked by Head of HR.",
      oldValues: null,
      newValues: null,
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[revokeAssignmentAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to revoke assignment." };
  }
}
