"use server";


import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { createUserAction } from "./users";
import { API_BASE_URL } from "@/lib/api";


export interface AssignmentRow {
  id: string; // Map to `jobId::{assignedToId}`
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
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
    };


    // 1. Fetch all jobs
    const jobsRes = await fetch(`${API_BASE_URL}/api/v1/jobs`, { headers });
    if (!jobsRes.ok) return [];
    const jobs = await jobsRes.json();
    console.log("JOBS DATA: ", jobs);


    const rows: AssignmentRow[] = [];


    // 2. For each job, fetch collaborators from backend sharing API (simulated as Account type)
    const promises = jobs.map(async (job: any) => {
      try {
        const shareRes = await fetch(
          `${API_BASE_URL}/api/v1/sharing/collaborators?recordId=${job.id}&objectType=Account`,
          { headers }
        );
        if (shareRes.ok) {
          const collaborators = await shareRes.json();
          for (const col of collaborators) {
            if (col.rowCause === "MANUAL") {
              rows.push({
                id: `${job.id}::${col.userId}`,
                jobId: job.id,
                jobTitle: job.title,
                department: job.department?.name || "Unassigned",
                assignedToId: col.userId,
                assignedToName: col.userName || col.userEmail || "Unknown",
                assignedToEmail: col.userEmail || "",
                assignedToRole: col.accessLevel,
                assignedByName: "System",
                note: `Access level: ${col.accessLevel}`,
                assignedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch collaborators for job ${job.id}:`, err);
      }
    });


    await Promise.all(promises);


    return rows;
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
    const response = await fetch(`${API_BASE_URL}/api/v1/users?limit=200`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/users?limit=200&profile=Hiring Manager`, {
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


    // Reassigning is mapped to giving the Hiring Manager access to the record (simulated as Account type)
    const res = await fetch(`${API_BASE_URL}/api/v1/sharing/share`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        recordId: candidateId,
        objectType: "Account",
        targetUserId: newHiringManagerId,
        accessLevel: "EDIT",
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


    // Call manual sharing API to share this Job with the assigned user
    const res = await fetch(`${API_BASE_URL}/api/v1/sharing/share`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        recordId: input.jobId,
        objectType: "Account",
        targetUserId: assignedToId,
        accessLevel: "READ",
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
    const [jobId, targetUserId] = assignmentId.split("::");
    if (!jobId || !targetUserId) throw new Error("Invalid assignment ID structure.");


    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // Call DELETE sharing API
    const revokeRes = await fetch(
      `${API_BASE_URL}/api/v1/sharing/share?recordId=${jobId}&objectType=Account&targetUserId=${targetUserId}`,
      {
        method: "DELETE",
        headers,
      }
    );


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



