"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { createUserAction } from "./users";

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
  assignedToId?: string;
  newUser?: {
    name: string;
    email: string;
    role: UserRole;
    password: string;
  };
  note?: string;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Map profile name to UserRole enum
function mapProfileToRole(profileName: string): UserRole {
  const norm = (profileName || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (norm.includes("admin")) return UserRole.ADMIN;
  if (norm.includes("recruiter")) return UserRole.RECRUITER;
  if (norm.includes("hiring") || norm.includes("manager")) return UserRole.HIRING_MANAGER;
  return UserRole.READ_ONLY;
}

// ─── Fetch all assignments ────────────────────────────────────────────────────

export async function fetchAssignmentsAction(): Promise<AssignmentRow[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];

  try {
    const response = await fetch("http://localhost:3000/api/v1/sharing", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) return [];

    const shares = await response.json();

    const rows: AssignmentRow[] = shares.map((s: any) => ({
      id: s.id,
      jobId: s.resourceId,
      jobTitle: s.job?.title || "Unknown Job",
      department: s.job?.department || "Unassigned",
      assignedToId: s.sharedToId,
      assignedToName: s.sharedTo ? `${s.sharedTo.firstName} ${s.sharedTo.lastName}`.trim() : "",
      assignedToEmail: s.sharedTo?.email || "",
      assignedToRole: s.sharedTo?.profile?.name || "",
      assignedByName: s.sharedBy ? `${s.sharedBy.firstName} ${s.sharedBy.lastName}`.trim() : "System",
      note: `Access level: ${s.accessLevel}`,
      assignedAt: s.createdAt
        ? new Date(s.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "",
    }));

    return rows.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  } catch (err) {
    console.error("[fetchAssignmentsAction]", err);
    return [];
  }
}

// ─── Fetch all users eligible to be assigned (everyone except Founder/Admin) ──

export async function fetchAssignableUsersAction(): Promise<UserOption[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];

  try {
    const response = await fetch("http://localhost:3000/api/v1/users?limit=200", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const users = result.data || [];

    return users
      .filter((u: any) => (u.profile?.name || "").toLowerCase() !== "admin")
      .map((u: any) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        email: u.email,
        role: mapProfileToRole(u.profile?.name),
      }))
      .sort((a: UserOption, b: UserOption) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[fetchAssignableUsersAction]", err);
    return [];
  }
}

// ─── Fetch users who can act as Hiring Manager (HIRING_MANAGER) ───────────────

export async function fetchHiringManagerUsersAction(): Promise<UserOption[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];

  try {
    const response = await fetch("http://localhost:3000/api/v1/users?limit=200&profile=Hiring Manager", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const users = result.data || [];

    return users
      .map((u: any) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        email: u.email,
        role: UserRole.HIRING_MANAGER,
      }))
      .sort((a: UserOption, b: UserOption) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[fetchHiringManagerUsersAction]", err);
    return [];
  }
}

// ─── Reassign a specific applicant's Hiring Manager (Admin only) ─────────────

export async function reassignApplicantHMAction(
  applicationId: string,
  newHiringManagerId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) {
    return { error: "Only Admin can reassign hiring managers." };
  }

  try {
    const [candidateId] = applicationId.split("::");
    if (!candidateId) throw new Error("Invalid application structure.");

    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // Reassigning is mapped to giving the Hiring Manager access to the Candidate record
    const res = await fetch("http://localhost:3000/api/v1/sharing/share", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resourceType: "Candidate",
        resourceId: candidateId,
        sharedToId: newHiringManagerId,
        accessLevel: "EDIT",
        cascadeToChildren: false,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to share candidate record.");
    }

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
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) {
    return { error: "Only Admin can assign job requisitions." };
  }

  try {
    let assignedToId = input.assignedToId;

    // Create user if they don't exist
    if (!assignedToId) {
      if (!input.newUser) throw new Error("Provide either assignedToId or newUser details.");

      const createUserRes = await createUserAction({
        name: input.newUser.name,
        email: input.newUser.email,
        password: input.newUser.password,
        profileName: input.newUser.role,
        roleName: input.newUser.role,
      });

      if (createUserRes.error) {
        throw new Error(createUserRes.error);
      }
      assignedToId = createUserRes.user?.id;
    }

    if (!assignedToId) throw new Error("Failed to resolve user ID for assignment.");

    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // Call sharing API to share this Job with the assigned user
    const res = await fetch("http://localhost:3000/api/v1/sharing/share", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resourceType: "Job",
        resourceId: input.jobId,
        sharedToId: assignedToId,
        accessLevel: "READ",
        cascadeToChildren: true,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to create share rule on backend.");
    }

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
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) {
    return { error: "Only Admin can revoke assignments." };
  }

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // 1. Fetch sharing rules to find this specific sharing rule details
    const response = await fetch("http://localhost:3000/api/v1/sharing", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!response.ok) throw new Error("Failed to retrieve share list.");
    const shares = await response.json();
    const s = shares.find((share: any) => share.id === assignmentId);

    if (!s) throw new Error("Assignment record not found.");

    // 2. Call unshare API
    const revokeRes = await fetch("http://localhost:3000/api/v1/sharing/unshare", {
      method: "POST",
      headers,
      body: JSON.stringify({
        resourceType: s.resourceType,
        resourceId: s.resourceId,
        sharedToId: s.sharedToId,
      }),
    });

    if (!revokeRes.ok) {
      const errData = await revokeRes.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to revoke share on backend.");
    }

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[revokeAssignmentAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to revoke assignment." };
  }
}
