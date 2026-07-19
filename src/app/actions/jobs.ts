"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { Job, JobStatus } from "@/lib/atsStore";

export interface CreateJobInput {
  title: string;
  department: string;
  hiringManager: string;
  hiringManagerId?: string;
  status: JobStatus;
  budgetLimit: number;
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
    const deptRes = await fetch("http://localhost:3000/api/v1/departments", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const departments = deptRes.ok ? await deptRes.json() : [];
    let dept = departments.find(
      (d: any) => d.name.toLowerCase() === input.department.toLowerCase()
    );

    if (!dept && input.department.trim()) {
      const code = input.department.trim().toUpperCase().replace(/[\s_-]+/g, "_");
      const createDeptRes = await fetch("http://localhost:3000/api/v1/departments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: input.department.trim(), code }),
      });
      if (createDeptRes.ok) {
        dept = await createDeptRes.json();
      }
    }

    // 2. Create Job on PostgreSQL Backend
    const createJobRes = await fetch("http://localhost:3000/api/v1/jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: input.title,
        description: `Job posting for ${input.title} in ${input.department}.`,
        departmentId: dept?.id || undefined,
      }),
    });

    if (!createJobRes.ok) {
      const errData = await createJobRes.json().catch(() => ({}));
      return {
        job: {} as Job,
        error: errData.message || "Failed to create job requisition on backend.",
      };
    }

    let createdJob = await createJobRes.json();

    // 3. Update status if it differs from the default ('Draft')
    const targetStatus = input.status === "OPEN" ? "Open" : input.status === "CLOSED" ? "Closed" : "Draft";
    if (createdJob.status !== targetStatus) {
      const updateJobRes = await fetch(`http://localhost:3000/api/v1/jobs/${createdJob.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: targetStatus }),
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
        hiringManager: session.name || "System Admin",
        status: createdJob.status.toUpperCase() as unknown as JobStatus,
        budgetLimit: input.budgetLimit,
        createdAt: createdJob.createdAt ? String(createdJob.createdAt).slice(0, 10) : "",
      },
    };
  } catch (err) {
    console.error("[createJobAction]", err);
    return { job: {} as Job, error: "Failed to create job requisition. Please try again." };
  }
}
