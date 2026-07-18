"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "@/db/local-db";
import { getSession } from "@/lib/auth";
import { Job, JobStatus } from "@/lib/atsStore";
import { JobStatus as DBJobStatus } from "@/lib/enums";

function mapStatus(s: JobStatus): DBJobStatus {
  return s as unknown as DBJobStatus;
}

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
  if (!session) return { job: {} as Job, error: "Unauthorized" };

  try {
    const db = readDb();
    const id = `job-${input.department.toLowerCase().slice(0, 3)}-${uuidv4().replace(/-/g, "").slice(0, 5)}`;

    // Use the explicit picker ID; fall back to name lookup for legacy paths
    let hmId = input.hiringManagerId ?? null;
    if (!hmId) {
      const hmUser = db.users.find((u) => u.name === input.hiringManager);
      hmId = hmUser?.id ?? session.id;
    }

    const newJob = {
      id,
      title: input.title,
      department: input.department,
      hiringManagerId: hmId,
      hiringManagerName: input.hiringManager,
      status: mapStatus(input.status),
      gDriveFolderId: null,
      budgetLimit: input.budgetLimit,
      createdAt: new Date(),
    };

    db.jobs.push(newJob);

    // Assign all existing applicants of this job to the selected HM
    db.applications.forEach((app) => {
      if (app.jobId === id) {
        app.assignedHiringManagerId = hmId;
      }
    });

    // Write audit log entry
    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "CREATED_JOB",
      targetTable: "jobs",
      targetId: id,
      notes: `Job requisition created. Department: ${input.department}. Budget: $${input.budgetLimit.toLocaleString("en-US")}.`,
      oldValues: null,
      newValues: { jobId: id, title: input.title, status: input.status },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");

    return {
      job: {
        id: newJob.id,
        title: newJob.title,
        department: newJob.department,
        hiringManager: newJob.hiringManagerName,
        status: newJob.status as unknown as JobStatus,
        budgetLimit: Number(newJob.budgetLimit),
        createdAt: new Date().toISOString().slice(0, 10),
      },
    };
  } catch (err) {
    console.error("[createJobAction]", err);
    return { job: {} as Job, error: "Failed to create job. Please try again." };
  }
}
