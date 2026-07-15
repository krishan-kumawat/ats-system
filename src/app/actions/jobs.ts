"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { withDb } from "@/db/data-source";
import { IJob, IUser, IAuditLog } from "@/db/schemas";
import { JobStatus as DBJobStatus } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { Job, JobStatus } from "@/lib/atsStore";

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

  if (!process.env.DATABASE_URL) {
    const id = `job-${input.department.toLowerCase().slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;
    const job: Job = {
      id,
      title: input.title,
      department: input.department,
      hiringManager: input.hiringManager,
      status: input.status,
      budgetLimit: input.budgetLimit,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    return { job };
  }

  try {
    const id = `job-${input.department.toLowerCase().slice(0, 3)}-${uuidv4().replace(/-/g, "").slice(0, 5)}`;

    const saved = await withDb(async (ds) => {
      const jobRepo = ds.getRepository<IJob>("Job");
      const userRepo = ds.getRepository<IUser>("User");
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");

      // Use the explicit picker ID; fall back to name lookup for legacy paths
      let hmId = input.hiringManagerId ?? null;
      if (!hmId) {
        const hmUser = await userRepo.findOne({ where: { name: input.hiringManager } });
        hmId = hmUser?.id ?? session.id;
      }

      const job = jobRepo.create({
        id,
        title: input.title,
        department: input.department,
        hiringManagerId: hmId,
        hiringManagerName: input.hiringManager,
        status: mapStatus(input.status),
        gDriveFolderId: null,
        budgetLimit: input.budgetLimit,
      });

      const result = await jobRepo.save(job);

      // Assign all existing applicants of this job to the selected HM
      await ds.query(
        `UPDATE applications SET "assignedHiringManagerId" = $1 WHERE "jobId" = $2`,
        [hmId, result.id]
      );

      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "CREATED_JOB",
          targetTable: "jobs",
          targetId: result.id,
          notes: `Job requisition created. Department: ${input.department}. Budget: $${input.budgetLimit.toLocaleString("en-US")}.`,
          oldValues: null,
          newValues: { jobId: result.id, title: input.title, status: input.status },
        })
      );

      return result;
    });

    revalidatePath("/");

    return {
      job: {
        id: saved.id,
        title: saved.title,
        department: saved.department,
        hiringManager: saved.hiringManagerName,
        status: saved.status as unknown as JobStatus,
        budgetLimit: Number(saved.budgetLimit),
        createdAt: saved.createdAt instanceof Date
          ? saved.createdAt.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      },
    };
  } catch (err) {
    console.error("[createJobAction]", err);
    return { job: {} as Job, error: "Failed to create job. Please try again." };
  }
}
