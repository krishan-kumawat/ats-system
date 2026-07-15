"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { withDb } from "@/db/data-source";
import { IUser, IJobAssignment, IAuditLog } from "@/db/schemas";
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
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await withDb((ds) =>
      ds.query(`
        SELECT
          ja.id,
          ja."jobId",
          j.title        AS "jobTitle",
          j.department,
          ja."assignedToId",
          u1.name        AS "assignedToName",
          u1.email       AS "assignedToEmail",
          u1.role        AS "assignedToRole",
          u2.name        AS "assignedByName",
          ja.note,
          ja."assignedAt"
        FROM job_assignments ja
        JOIN jobs  j  ON j.id  = ja."jobId"
        JOIN users u1 ON u1.id = ja."assignedToId"
        JOIN users u2 ON u2.id = ja."assignedById"
        ORDER BY ja."assignedAt" DESC
      `)
    ) as Array<{
      id: string;
      jobId: string;
      jobTitle: string;
      department: string;
      assignedToId: string;
      assignedToName: string;
      assignedToEmail: string;
      assignedToRole: string;
      assignedByName: string;
      note: string | null;
      assignedAt: Date | string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      department: r.department,
      assignedToId: r.assignedToId,
      assignedToName: r.assignedToName,
      assignedToEmail: r.assignedToEmail,
      assignedToRole: r.assignedToRole,
      assignedByName: r.assignedByName,
      note: r.note ?? "",
      assignedAt: r.assignedAt instanceof Date
        ? r.assignedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : r.assignedAt
          ? new Date(r.assignedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "",
    }));
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
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await withDb((ds) =>
      ds.getRepository<IUser>("User").find({
        order: { name: "ASC" },
      })
    );

    return rows
      .filter((u) => u.role !== UserRole.FOUNDER)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  } catch (err) {
    console.error("[fetchAssignableUsersAction]", err);
    return [];
  }
}

// ─── Fetch users who can act as Hiring Manager (HIRING_MANAGER + HEAD_OF_HR) ──

export async function fetchHiringManagerUsersAction(): Promise<UserOption[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await withDb((ds) =>
      ds.query(
        `SELECT id, name, email, role FROM users
         WHERE role IN ('HIRING_MANAGER', 'HEAD_OF_HR')
         ORDER BY name ASC`
      )
    ) as Array<{ id: string; name: string; email: string; role: UserRole }>;

    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
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
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  try {
    await withDb(async (ds) => {
      // Fetch old HM name for audit
      const oldRow = await ds.query(
        `SELECT a."assignedHiringManagerId", j."hiringManagerName"
         FROM applications a
         LEFT JOIN jobs j ON j.id = a."jobId"
         WHERE a.id = $1`,
        [applicationId]
      ) as Array<{ assignedHiringManagerId: string | null; hiringManagerName: string }>;

      const newHM = await ds.query(
        `SELECT name FROM users WHERE id = $1`,
        [newHiringManagerId]
      ) as Array<{ name: string }>;

      await ds.query(
        `UPDATE applications SET "assignedHiringManagerId" = $1 WHERE id = $2`,
        [newHiringManagerId, applicationId]
      );

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "HM_REASSIGNED",
          targetTable: "applications",
          targetId: applicationId,
          notes: `Hiring Manager reassigned to ${newHM[0]?.name ?? newHiringManagerId}.`,
          oldValues: { hiringManager: oldRow[0]?.assignedHiringManagerId ?? oldRow[0]?.hiringManagerName },
          newValues: { hiringManagerId: newHiringManagerId, name: newHM[0]?.name },
        })
      );
    });

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
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  try {
    await withDb(async (ds) => {
      const userRepo = ds.getRepository<IUser>("User");
      const assignmentRepo = ds.getRepository<IJobAssignment>("JobAssignment");
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");

      let assignedToId = input.assignedToId;

      // Create user if they don't exist
      if (!assignedToId) {
        if (!input.newUser) throw new Error("Provide either assignedToId or newUser details.");

        const existing = await userRepo.findOne({ where: { email: input.newUser.email } });
        if (existing) {
          assignedToId = existing.id;
        } else {
          const created = await userRepo.save(
            userRepo.create({
              id: uuidv4(),
              name: input.newUser.name,
              email: input.newUser.email,
              role: input.newUser.role,
              passwordHash: input.newUser.password,
            })
          );
          assignedToId = created.id;

          await auditRepo.save(
            auditRepo.create({
              userId: session.id,
              action: "USER_CREATED",
              targetTable: "users",
              targetId: created.id,
              notes: `New user created during job assignment. Role: ${input.newUser.role}.`,
              oldValues: null,
              newValues: { name: input.newUser.name, email: input.newUser.email, role: input.newUser.role },
            })
          );
        }
      }

      // Upsert — if already assigned, update the note; else insert fresh
      const existing = await assignmentRepo.findOne({
        where: { jobId: input.jobId, assignedToId },
      });

      if (existing) {
        await ds.query(
          `UPDATE job_assignments SET note = $1, "assignedById" = $2, "assignedAt" = NOW() WHERE id = $3`,
          [input.note ?? null, session.id, existing.id]
        );
      } else {
        await assignmentRepo.save(
          assignmentRepo.create({
            id: uuidv4(),
            jobId: input.jobId,
            assignedToId,
            assignedById: session.id,
            note: input.note ?? null,
          })
        );
      }

      const assignedUser = await userRepo.findOne({ where: { id: assignedToId } });

      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "JOB_ASSIGNED",
          targetTable: "job_assignments",
          targetId: input.jobId,
          notes: `Job assigned to ${assignedUser?.name ?? assignedToId}. ${input.note ? `Note: ${input.note}` : ""}`,
          oldValues: null,
          newValues: { jobId: input.jobId, assignedToId, assignedById: session.id },
        })
      );
    });

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
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  try {
    await withDb(async (ds) => {
      await ds.query(`DELETE FROM job_assignments WHERE id = $1`, [assignmentId]);

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "JOB_ASSIGNMENT_REVOKED",
          targetTable: "job_assignments",
          targetId: assignmentId,
          notes: "Job assignment revoked by Head of HR.",
          oldValues: null,
          newValues: null,
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[revokeAssignmentAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to revoke assignment." };
  }
}
