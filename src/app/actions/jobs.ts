"use server";


import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { Job, JobStatus } from "@/lib/atsStore";
import { API_BASE_URL } from "@/lib/api";


export interface CreateJobInput {
  title: string;
  department: string;
  departmentId?: string;
  hiringManager: string;
  hiringManagerId?: string;
  status: JobStatus;
  budgetLimit: number;
}


export interface DepartmentOption {
  id: string;
  name: string;
}


export async function fetchDepartmentsAction(): Promise<DepartmentOption[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];


  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/departments`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!res.ok) return [];
    const departments = await res.json();
    return Array.isArray(departments)
      ? departments.map((d: any) => ({ id: d.id, name: d.name }))
      : [];
  } catch {
    return [];
  }
}


export async function createJobSimpleAction(input: {
  title: string;
  description: string;
  departmentId?: string;
  departmentName?: string;
  ownerId?: string;
  hiringManager?: string;
  status?: JobStatus;
  budgetLimit?: number;
}): Promise<{ job: Job; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { job: {} as Job, error: "Unauthorized" };


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    const body: Record<string, unknown> = {
      title: input.title,
      description: input.description,
    };
    if (input.departmentId) {
      body.departmentId = input.departmentId;
    }
    if (input.ownerId) {
      body.ownerId = input.ownerId;
    }
    if (input.budgetLimit != null) {
      body.budgetLimit = input.budgetLimit;
    }


    const res = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { job: {} as Job, error: errData.message || "Failed to create job." };
    }


    let createdJob = await res.json();


    const targetStatus = input.status || "DRAFT";
    const statusMap: Record<string, string> = { OPEN: "Open", DRAFT: "Draft", ON_HOLD: "On Hold", CLOSED: "Closed" };
    const backendStatus = statusMap[targetStatus] || "Draft";
    
    const patchBody: Record<string, unknown> = {};
    if (createdJob.status !== backendStatus) {
      patchBody.status = backendStatus;
    }
    if (input.ownerId && createdJob.ownerId !== input.ownerId) {
      patchBody.ownerId = input.ownerId;
    }

    if (Object.keys(patchBody).length > 0) {
      const updateRes = await fetch(`${API_BASE_URL}/api/v1/jobs/${createdJob.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patchBody),
      });
      if (updateRes.ok) {
        createdJob = await updateRes.json();
      }
    }


    revalidatePath("/");


    return {
      job: {
        id: createdJob.id,
        title: createdJob.title,
        department: createdJob.department?.name || input.departmentName || "",
        hiringManager: input.hiringManager || (createdJob.owner
          ? `${createdJob.owner.firstName} ${createdJob.owner.lastName}`
          : session.name || "System"),
        status: (createdJob.status || "DRAFT").toUpperCase().replace(/ /g, "_") as unknown as JobStatus,
        budgetLimit: Number(createdJob.budgetLimit || 0),
        createdAt: createdJob.createdAt ? String(createdJob.createdAt).slice(0, 10) : "",
      },
    };
  } catch (err) {
    console.error("[createJobSimpleAction]", err);
    return { job: {} as Job, error: "Failed to create job. Please try again." };
  }
}


export async function createJobAction(input: CreateJobInput): Promise<{ job: Job; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { job: {} as Job, error: "Unauthorized" };


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // 1. Resolve or Create Department on Backend
    const deptRes = await fetch(`${API_BASE_URL}/api/v1/departments`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const departments = deptRes.ok ? await deptRes.json() : [];
    let dept = departments.find(
      (d: any) => d.name.toLowerCase() === input.department.toLowerCase()
    );


    if (!dept && input.department.trim()) {
      const code = input.department.trim().toUpperCase().replace(/[\s_-]+/g, "_");
      const createDeptRes = await fetch(`${API_BASE_URL}/api/v1/departments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: input.department.trim(), code }),
      });
      if (createDeptRes.ok) {
        dept = await createDeptRes.json();
      }
    }


    // 2. Create Job
    const jobBody: Record<string, unknown> = {
      title: input.title,
      description: `Job posting for ${input.title} in ${input.department}.`,
      departmentId: input.departmentId || dept?.id || undefined,
    };
    if (input.hiringManagerId) {
      jobBody.ownerId = input.hiringManagerId;
    }
    if (input.budgetLimit != null) {
      jobBody.budgetLimit = input.budgetLimit;
    }
    const createJobRes = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify(jobBody),
    });


    if (!createJobRes.ok) {
      const errData = await createJobRes.json().catch(() => ({}));
      return {
        job: {} as Job,
        error: errData.message || "Failed to create job requisition on backend.",
      };
    }


    let createdJob = await createJobRes.json();


    // 3. Update status or owner if differs
    const statusMap = { OPEN: "Open", DRAFT: "Draft", ON_HOLD: "On Hold", CLOSED: "Closed" };
    const targetStatus = statusMap[input.status] || "Draft";
    const patchBody: Record<string, unknown> = {};
    if (createdJob.status !== targetStatus) {
      patchBody.status = targetStatus;
    }
    if (input.hiringManagerId && createdJob.ownerId !== input.hiringManagerId) {
      patchBody.ownerId = input.hiringManagerId;
    }
    if (Object.keys(patchBody).length > 0) {
      const updateJobRes = await fetch(`${API_BASE_URL}/api/v1/jobs/${createdJob.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patchBody),
      });
      if (updateJobRes.ok) {
        createdJob = await updateJobRes.json();
      }
    }


    revalidatePath("/");


    return {
      job: {
        id: createdJob.id,
        title: createdJob.title,
        department: dept?.name || input.department,
        hiringManager: input.hiringManager || session.name || "System Admin",
        status: (createdJob.status || "DRAFT").toUpperCase().replace(/ /g, "_") as JobStatus,
        budgetLimit: Number(createdJob.budgetLimit || input.budgetLimit || 0),
        createdAt: createdJob.createdAt ? String(createdJob.createdAt).slice(0, 10) : "",
      },
    };
  } catch (err) {
    console.error("[createJobAction]", err);
    return { job: {} as Job, error: "Failed to create job requisition. Please try again." };
  }
}


export async function updateJobAction(jobId: string, input: CreateJobInput): Promise<{ job?: Job; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // 1. Resolve or Create Department on Backend
    const deptRes = await fetch(`${API_BASE_URL}/api/v1/departments`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const departments = deptRes.ok ? await deptRes.json() : [];
    let dept = departments.find(
      (d: any) => d.name.toLowerCase() === input.department.toLowerCase()
    );


    if (!dept && input.department.trim()) {
      const code = input.department.trim().toUpperCase().replace(/[\s_-]+/g, "_");
      const createDeptRes = await fetch(`${API_BASE_URL}/api/v1/departments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: input.department.trim(), code }),
      });
      if (createDeptRes.ok) {
        dept = await createDeptRes.json();
      }
    }


    const statusMap2: Record<string, string> = { OPEN: "Open", DRAFT: "Draft", ON_HOLD: "On Hold", CLOSED: "Closed" };
    const targetStatus = statusMap2[input.status] || "Draft";


    // 2. Update Job on Backend
    const updateBody: Record<string, unknown> = {
      title: input.title,
      status: targetStatus,
      departmentId: input.departmentId || dept?.id || null,
    };
    if (input.hiringManagerId) {
      updateBody.ownerId = input.hiringManagerId;
    }
    if (input.budgetLimit != null) {
      updateBody.budgetLimit = input.budgetLimit;
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updateBody),
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { error: errData.message || "Failed to update job requisition." };
    }


    const updatedJob = await res.json();
    revalidatePath("/");


    return {
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        department: dept?.name || input.department,
        hiringManager: input.hiringManager,
        status: (updatedJob.status || "DRAFT").toUpperCase().replace(/ /g, "_") as JobStatus,
        budgetLimit: Number(updatedJob.budgetLimit || input.budgetLimit || 0),
        createdAt: updatedJob.createdAt ? String(updatedJob.createdAt).slice(0, 10) : "",
      },
    };
  } catch (err: any) {
    console.error("[updateJobAction]", err);
    return { error: err.message || "Failed to update job requisition." };
  }
}


export async function updateJobSimpleAction(
  jobId: string,
  input: {
    title: string;
    description: string;
    status: JobStatus;
    departmentId?: string;
    ownerId?: string;
    budgetLimit?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    const statusMap: Record<string, string> = { OPEN: "Open", DRAFT: "Draft", ON_HOLD: "On Hold", CLOSED: "Closed" };
    const backendStatus = statusMap[input.status] || "Draft";


    const body: Record<string, unknown> = {
      title: input.title,
      description: input.description,
      status: backendStatus,
    };
    if (input.departmentId) {
      body.departmentId = input.departmentId;
    }
    if (input.ownerId) {
      body.ownerId = input.ownerId;
    }
    if (input.budgetLimit != null) {
      body.budgetLimit = input.budgetLimit;
    }


    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to update job." };
    }


    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("[updateJobSimpleAction]", err);
    return { success: false, error: err.message || "Failed to update job." };
  }
}


export async function deleteJobAction(jobId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };


  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to delete job requisition." };
    }


    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteJobAction]", err);
    return { success: false, error: err.message || "Failed to delete job requisition." };
  }
}



