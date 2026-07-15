"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { withDb } from "@/db/data-source";
import { IScorecard, IFounderApproval, IApplication, IAuditLog } from "@/db/schemas";
import { ApprovalStatus, Recommendation, ApplicationStage } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { Candidate } from "@/lib/atsStore";

// ─── Save scorecard ───────────────────────────────────────────────────────────

export interface SaveScorecardInput {
  applicationId: string;
  technicalScore: number;
  systemScore: number;
  cultureScore: number;
  pros: string;
  cons: string;
  recommendation: string;
}

export async function saveScorecardAction(input: SaveScorecardInput): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (!process.env.DATABASE_URL) return {};

  try {
    await withDb(async (ds) => {
      const repo = ds.getRepository<IScorecard>("Scorecard");
      const existing = await repo.findOne({ where: { applicationId: input.applicationId } });

      if (existing) {
        existing.technicalScore = input.technicalScore;
        existing.systemScore = input.systemScore;
        existing.cultureScore = input.cultureScore;
        existing.pros = input.pros || null;
        existing.cons = input.cons || null;
        existing.recommendation = input.recommendation as Recommendation;
        await repo.save(existing);
      } else {
        await repo.save(
          repo.create({
            id: uuidv4(),
            applicationId: input.applicationId,
            reviewerId: session.id,
            technicalScore: input.technicalScore,
            systemScore: input.systemScore,
            cultureScore: input.cultureScore,
            pros: input.pros || null,
            cons: input.cons || null,
            recommendation: input.recommendation as Recommendation,
          })
        );
      }

      const avg = ((input.technicalScore + input.systemScore + input.cultureScore) / 3).toFixed(1);
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "LOGGED_SCORECARD",
          targetTable: "scorecards",
          targetId: input.applicationId,
          notes: `Average ratings: ${avg}/5. Recommendation: ${input.recommendation || "NONE"}.`,
          oldValues: null,
          newValues: {
            technicalScore: input.technicalScore,
            systemScore: input.systemScore,
            cultureScore: input.cultureScore,
            recommendation: input.recommendation,
          },
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[saveScorecardAction]", err);
    return { error: "Failed to save scorecard." };
  }
}

// ─── Approve offer ────────────────────────────────────────────────────────────

export async function approveOfferAction(applicationId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (!process.env.DATABASE_URL) return {};

  try {
    await withDb(async (ds) => {
      const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");
      const approval = await approvalRepo.findOne({ where: { applicationId } });
      if (!approval || approval.status !== ApprovalStatus.PENDING) {
        throw new Error("No pending offer found for this application.");
      }

      approval.status = ApprovalStatus.APPROVED;
      approval.founderId = session.id;
      approval.actionedAt = new Date();
      await approvalRepo.save(approval);

      const appRepo = ds.getRepository<IApplication>("Application");
      const app = await appRepo.findOne({ where: { id: applicationId } });
      if (app) {
        app.stage = ApplicationStage.OFFER_APPROVED;
        await appRepo.save(app);
      }

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "OFFER_APPROVED",
          targetTable: "founder_approvals",
          targetId: approval.id,
          notes: `Offer approved. Salary: $${Number(approval.proposedSalary).toLocaleString("en-US")}.`,
          oldValues: { status: "PENDING" },
          newValues: { status: "APPROVED", founderId: session.id },
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[approveOfferAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to approve offer." };
  }
}

// ─── Reject offer ─────────────────────────────────────────────────────────────

export async function rejectOfferAction(
  applicationId: string,
  feedback?: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (!process.env.DATABASE_URL) return {};

  try {
    await withDb(async (ds) => {
      const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");
      const approval = await approvalRepo.findOne({ where: { applicationId } });
      if (!approval || approval.status !== ApprovalStatus.PENDING) {
        throw new Error("No pending offer found for this application.");
      }

      approval.status = ApprovalStatus.REJECTED;
      approval.founderId = session.id;
      approval.feedback = feedback ?? null;
      approval.actionedAt = new Date();
      await approvalRepo.save(approval);

      const appRepo = ds.getRepository<IApplication>("Application");
      const app = await appRepo.findOne({ where: { id: applicationId } });
      if (app) {
        app.stage = ApplicationStage.INTERVIEWING;
        await appRepo.save(app);
      }

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "OFFER_REJECTED",
          targetTable: "founder_approvals",
          targetId: approval.id,
          notes: feedback ?? "Offer returned for budget readjustments.",
          oldValues: { status: "PENDING" },
          newValues: { status: "REJECTED", founderId: session.id },
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[rejectOfferAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to reject offer." };
  }
}

// ─── Move pipeline stage ──────────────────────────────────────────────────────

export async function movePipelineAction(
  applicationId: string,
  targetStage: Candidate["stage"],
  proposedSalary?: number,
  proposedEquity?: number
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (!process.env.DATABASE_URL) return {};

  try {
    await withDb(async (ds) => {
      const appRepo = ds.getRepository<IApplication>("Application");
      const app = await appRepo.findOne({ where: { id: applicationId } });
      if (!app) throw new Error("Application not found.");

      const oldStage = app.stage;
      const stageMap: Record<Candidate["stage"], ApplicationStage> = {
        Applied:      ApplicationStage.APPLIED,
        Screening:    ApplicationStage.SCREENING,
        Interviewing: ApplicationStage.INTERVIEWING,
        Offer:        ApplicationStage.OFFER_PREP,
      };

      app.stage = stageMap[targetStage];
      await appRepo.save(app);

      if (targetStage === "Offer" && proposedSalary) {
        const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");
        const existing = await approvalRepo.findOne({ where: { applicationId } });
        if (!existing) {
          await approvalRepo.save(
            approvalRepo.create({
              id: uuidv4(),
              applicationId,
              founderId: null,
              proposedSalary,
              proposedEquity: proposedEquity ?? null,
              status: ApprovalStatus.PENDING,
              feedback: null,
              actionedAt: null,
            })
          );
        }
      }

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "STAGE_TRANSITION",
          targetTable: "applications",
          targetId: applicationId,
          notes: `Dragged & Dropped: ${oldStage} → ${app.stage}.`,
          oldValues: { stage: oldStage },
          newValues: { stage: app.stage },
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[movePipelineAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to move stage." };
  }
}

// ─── Ingest candidate ─────────────────────────────────────────────────────────

export interface IngestCandidateInput {
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  skills: string[];
  expectedSalary: number;
  jobId?: string;
  sourceTag?: string;
}

export async function ingestCandidateAction(
  input: IngestCandidateInput
): Promise<{ applicationId: string; error?: string }> {
  const session = await getSession();
  if (!session) return { applicationId: "", error: "Unauthorized" };

  if (!process.env.DATABASE_URL) {
    return { applicationId: `app-${uuidv4().slice(0, 8)}` };
  }

  try {
    const applicationId = await withDb(async (ds) => {
      const candidateRepo = ds.getRepository("Candidate");
      const appRepo = ds.getRepository<IApplication>("Application");
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");

      const candidateId = uuidv4();
      await candidateRepo.save(
        candidateRepo.create({
          id: candidateId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          currentCompany: null,
          skills: input.skills,
        })
      );

      const simulatedFileId = `gdrive_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
      const appId = uuidv4();

      await appRepo.save(
        appRepo.create({
          id: appId,
          candidateId,
          jobId: input.jobId ?? "unassigned",
          stage: ApplicationStage.APPLIED,
          sourceTag: input.sourceTag ?? "Manual PDF Upload",
          gDriveFileId: simulatedFileId,
          gDriveViewUrl: `https://drive.google.com/file/d/${simulatedFileId}/view`,
          expectedSalary: input.expectedSalary || null,
        })
      );

      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "INGESTED_PROFILE",
          targetTable: "candidates",
          targetId: candidateId,
          notes: `Simulated Google Drive file written. Parsed tags: ${input.skills.slice(0, 3).join(", ")}.`,
          oldValues: null,
          newValues: { candidateId, applicationId: appId, name: input.name, skills: input.skills },
        })
      );

      return appId;
    });

    revalidatePath("/");
    return { applicationId };
  } catch (err) {
    console.error("[ingestCandidateAction]", err);
    return { applicationId: "", error: "Failed to ingest candidate." };
  }
}
