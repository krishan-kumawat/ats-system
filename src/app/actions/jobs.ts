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
  description?: string;
  workMode?: string;
  salaryMin?: number;
  salaryMax?: number;
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
  workMode?: string;
  salaryMin?: number;
  salaryMax?: number;
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
    if (input.workMode) {
      body.workMode = input.workMode;
    }
    if (input.salaryMin != null) {
      body.salaryMin = input.salaryMin;
    }
    if (input.salaryMax != null) {
      body.salaryMax = input.salaryMax;
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
        description: createdJob.description || input.description || "",
        department: createdJob.department?.name || input.departmentName || "",
        departmentId: createdJob.departmentId || input.departmentId || "",
        ownerId: createdJob.ownerId || input.ownerId || "",
        hiringManager: input.hiringManager || (createdJob.owner
          ? `${createdJob.owner.firstName} ${createdJob.owner.lastName}`
          : session.name || "System"),
        status: (createdJob.status || "DRAFT").toUpperCase().replace(/ /g, "_") as unknown as JobStatus,
        budgetLimit: Number(createdJob.budgetLimit || 0),
        workMode: createdJob.workMode || input.workMode,
        salaryMin: createdJob.salaryMin != null ? Number(createdJob.salaryMin) : (input.salaryMin != null ? Number(input.salaryMin) : null),
        salaryMax: createdJob.salaryMax != null ? Number(createdJob.salaryMax) : (input.salaryMax != null ? Number(input.salaryMax) : null),
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
      description: input.description || `Job posting for ${input.title} in ${input.department}.`,
      departmentId: input.departmentId || dept?.id || undefined,
    };
    if (input.hiringManagerId) {
      jobBody.ownerId = input.hiringManagerId;
    }
    if (input.budgetLimit != null) {
      jobBody.budgetLimit = input.budgetLimit;
    }
    if (input.workMode) {
      jobBody.workMode = input.workMode;
    }
    if (input.salaryMin != null) {
      jobBody.salaryMin = input.salaryMin;
    }
    if (input.salaryMax != null) {
      jobBody.salaryMax = input.salaryMax;
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
        description: createdJob.description || input.description || "",
        department: dept?.name || input.department,
        departmentId: createdJob.departmentId || input.departmentId || dept?.id || "",
        ownerId: createdJob.ownerId || input.hiringManagerId || "",
        hiringManager: input.hiringManager || session.name || "System Admin",
        status: (createdJob.status || "DRAFT").toUpperCase().replace(/ /g, "_") as JobStatus,
        budgetLimit: Number(createdJob.budgetLimit || input.budgetLimit || 0),
        workMode: createdJob.workMode || input.workMode,
        salaryMin: createdJob.salaryMin != null ? Number(createdJob.salaryMin) : (input.salaryMin != null ? Number(input.salaryMin) : null),
        salaryMax: createdJob.salaryMax != null ? Number(createdJob.salaryMax) : (input.salaryMax != null ? Number(input.salaryMax) : null),
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


    // 1. Resolve departmentId if not already provided
    let departmentId = input.departmentId;
    let deptName = input.department;

    if (!departmentId && input.department?.trim()) {
      try {
        const deptRes = await fetch(`${API_BASE_URL}/api/v1/departments`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const rawDepts = deptRes.ok ? await deptRes.json() : [];
        const depts = Array.isArray(rawDepts) ? rawDepts : (rawDepts.data || []);
        let dept = depts.find(
          (d: any) => d.name && d.name.toLowerCase() === input.department.trim().toLowerCase()
        );

        if (!dept) {
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
        if (dept) {
          departmentId = dept.id;
          deptName = dept.name;
        }
      } catch (deptErr) {
        console.warn("[updateJobAction] Department lookup warning:", deptErr);
      }
    }


    // 2. Build payload matching updated Job API requirements:
    // { title, description, departmentId, budgetLimit, workMode, salaryMin, salaryMax }
    const updateBody: Record<string, unknown> = {
      title: input.title,
    };
    if (input.description) {
      updateBody.description = input.description;
    }
    if (departmentId) {
      updateBody.departmentId = departmentId;
    }
    if (input.budgetLimit != null && !isNaN(Number(input.budgetLimit))) {
      updateBody.budgetLimit = Number(input.budgetLimit);
    }
    if (input.workMode) {
      updateBody.workMode = input.workMode;
    }
    if (input.salaryMin != null && !isNaN(Number(input.salaryMin))) {
      updateBody.salaryMin = Number(input.salaryMin);
    }
    if (input.salaryMax != null && !isNaN(Number(input.salaryMax))) {
      updateBody.salaryMax = Number(input.salaryMax);
    }


    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updateBody),
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.message || errData.error;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : typeof rawMsg === "string"
        ? rawMsg
        : `Failed to update job requisition (${res.status}).`;
      console.error("[updateJobAction] backend responded with error:", res.status, errMsg);
      return { error: errMsg };
    }


    const updatedJob = await res.json();
    revalidatePath("/");


    return {
      job: {
        id: updatedJob.id || jobId,
        title: updatedJob.title || input.title,
        description: updatedJob.description || input.description || "",
        department: updatedJob.department?.name || deptName || input.department || "",
        departmentId: updatedJob.departmentId || departmentId || "",
        ownerId: updatedJob.ownerId || input.hiringManagerId || "",
        hiringManager: input.hiringManager || (updatedJob.owner ? `${updatedJob.owner.firstName || ""} ${updatedJob.owner.lastName || ""}`.trim() : ""),
        status: (updatedJob.status || input.status || "DRAFT").toUpperCase().replace(/ /g, "_") as JobStatus,
        budgetLimit: Number(updatedJob.budgetLimit ?? input.budgetLimit ?? 0),
        workMode: updatedJob.workMode || input.workMode || "Hybrid",
        salaryMin: updatedJob.salaryMin != null ? Number(updatedJob.salaryMin) : (input.salaryMin != null ? Number(input.salaryMin) : null),
        salaryMax: updatedJob.salaryMax != null ? Number(updatedJob.salaryMax) : (input.salaryMax != null ? Number(input.salaryMax) : null),
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
    workMode?: string;
    salaryMin?: number;
    salaryMax?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };


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
    if (input.budgetLimit != null && !isNaN(Number(input.budgetLimit))) {
      body.budgetLimit = Number(input.budgetLimit);
    }
    if (input.workMode) {
      body.workMode = input.workMode;
    }
    if (input.salaryMin != null && !isNaN(Number(input.salaryMin))) {
      body.salaryMin = Number(input.salaryMin);
    }
    if (input.salaryMax != null && !isNaN(Number(input.salaryMax))) {
      body.salaryMax = Number(input.salaryMax);
    }


    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.message || errData.error;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : typeof rawMsg === "string"
        ? rawMsg
        : `Failed to update job (${res.status}).`;
      return { success: false, error: errMsg };
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



