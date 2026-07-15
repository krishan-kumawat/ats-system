"use server";

import { v4 as uuidv4 } from "uuid";
import { getDataSource } from "@/db/data-source";
import {
  ApplicationStage,
  ApprovalStatus,
  UserRole,
  ICandidate,
  IApplication,
  IFounderApproval,
  IAuditLog,
} from "@/db/schemas";
import { extractSkillsFromBuffer } from "@/lib/parser";

// ─── Mock session ─────────────────────────────────────────────────────────────
// Replace with real auth (e.g. next-auth getServerSession) before production.

interface MockSession {
  userId: string;
  role: UserRole;
  name: string;
}

function getMockSession(): MockSession {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    role: UserRole.RECRUITER,
    name: "Demo Recruiter",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertRole(session: MockSession, ...allowed: UserRole[]): void {
  if (!allowed.includes(session.role)) {
    throw new Error(
      `Forbidden: requires one of [${allowed.join(", ")}], got ${session.role}`
    );
  }
}

async function writeAuditLog(
  userId: string,
  action: string,
  targetTable: string,
  targetId: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository<IAuditLog>("AuditLog");
  const entry = repo.create({
    userId,
    action,
    targetTable,
    targetId,
    oldValues,
    newValues,
  });
  await repo.save(entry);
}

// ─── createManualCandidate ────────────────────────────────────────────────────

interface CreateCandidateInput {
  name: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  jobId: string;
  expectedSalary?: number;
}

interface CreateCandidateResult {
  candidate: ICandidate;
  application: IApplication;
}

export async function createManualCandidate(
  candidateData: CreateCandidateInput,
  fileBuffer: Buffer
): Promise<CreateCandidateResult> {
  const session = getMockSession();
  assertRole(session, UserRole.RECRUITER, UserRole.ADMIN, UserRole.FOUNDER);

  const skills = await extractSkillsFromBuffer(fileBuffer);

  // Simulate Google Drive upload — replace with real googleapis stream in prod.
  const simulatedFileId = `gdrive_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
  const simulatedViewUrl = `https://drive.google.com/file/d/${simulatedFileId}/view`;

  const ds = await getDataSource();
  const candidateRepo = ds.getRepository<ICandidate>("Candidate");
  const applicationRepo = ds.getRepository<IApplication>("Application");

  const candidate = candidateRepo.create({
    id: uuidv4(),
    name: candidateData.name,
    email: candidateData.email,
    phone: candidateData.phone ?? null,
    currentCompany: candidateData.currentCompany ?? null,
    skills,
  });

  const savedCandidate = await candidateRepo.save(candidate);

  const application = applicationRepo.create({
    id: uuidv4(),
    candidateId: savedCandidate.id,
    jobId: candidateData.jobId,
    stage: ApplicationStage.APPLIED,
    sourceTag: "MANUAL",
    gDriveFileId: simulatedFileId,
    gDriveViewUrl: simulatedViewUrl,
    expectedSalary: candidateData.expectedSalary ?? null,
  });

  const savedApplication = await applicationRepo.save(application);

  await writeAuditLog(
    session.userId,
    "CREATE_CANDIDATE",
    "candidates",
    savedCandidate.id,
    null,
    {
      candidateId: savedCandidate.id,
      applicationId: savedApplication.id,
      jobId: candidateData.jobId,
      skills,
    }
  );

  return { candidate: savedCandidate, application: savedApplication };
}

// ─── updateCandidateStage ─────────────────────────────────────────────────────

const STANDARD_STAGES: ApplicationStage[] = [
  ApplicationStage.APPLIED,
  ApplicationStage.SCREENING,
  ApplicationStage.INTERVIEWING,
];

export async function updateCandidateStage(
  applicationId: string,
  targetStage: ApplicationStage
): Promise<IApplication> {
  const session = getMockSession();
  assertRole(
    session,
    UserRole.RECRUITER,
    UserRole.FOUNDER,
    UserRole.ADMIN,
    UserRole.HIRING_MANAGER
  );

  if (!STANDARD_STAGES.includes(targetStage)) {
    throw new Error(
      `updateCandidateStage only handles standard stages. Use proposeCandidateOffer for OFFER_PREP.`
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository<IApplication>("Application");

  const application = await repo.findOneByOrFail({ id: applicationId });

  if (
    application.stage === ApplicationStage.OFFER_PREP ||
    application.stage === ApplicationStage.OFFER_APPROVED
  ) {
    throw new Error(
      "Cannot move a locked offer-stage application via standard stage update."
    );
  }

  const oldStage = application.stage;
  application.stage = targetStage;
  const saved = await repo.save(application);

  await writeAuditLog(
    session.userId,
    "STAGE_TRANSITION",
    "applications",
    applicationId,
    { stage: oldStage },
    { stage: targetStage }
  );

  return saved;
}

// ─── proposeCandidateOffer ────────────────────────────────────────────────────

export async function proposeCandidateOffer(
  applicationId: string,
  proposedSalary: number
): Promise<{ application: IApplication; approval: IFounderApproval }> {
  const session = getMockSession();
  assertRole(session, UserRole.RECRUITER, UserRole.ADMIN);

  if (proposedSalary <= 0) {
    throw new Error("Proposed salary must be a positive value.");
  }

  const ds = await getDataSource();
  const appRepo = ds.getRepository<IApplication>("Application");
  const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");

  const application = await appRepo.findOneByOrFail({ id: applicationId });

  const oldStage = application.stage;
  application.stage = ApplicationStage.OFFER_PREP;
  const savedApp = await appRepo.save(application);

  const approval = approvalRepo.create({
    id: uuidv4(),
    applicationId,
    founderId: null,
    proposedSalary,
    proposedEquity: null,
    status: ApprovalStatus.PENDING,
    feedback: null,
    actionedAt: null,
  });

  const savedApproval = await approvalRepo.save(approval);

  await writeAuditLog(
    session.userId,
    "OFFER_PROPOSED",
    "applications",
    applicationId,
    { stage: oldStage },
    {
      stage: ApplicationStage.OFFER_PREP,
      approvalId: savedApproval.id,
      proposedSalary,
    }
  );

  return { application: savedApp, approval: savedApproval };
}

// ─── approveCandidateOffer ────────────────────────────────────────────────────

export async function approveCandidateOffer(
  applicationId: string,
  founderId: string
): Promise<{ application: IApplication; approval: IFounderApproval }> {
  const session = getMockSession();
  assertRole(session, UserRole.FOUNDER);

  const ds = await getDataSource();
  const appRepo = ds.getRepository<IApplication>("Application");
  const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");

  const application = await appRepo.findOneByOrFail({ id: applicationId });

  if (application.stage !== ApplicationStage.OFFER_PREP) {
    throw new Error("Application is not in OFFER_PREP stage.");
  }

  const approval = await approvalRepo.findOneByOrFail({ applicationId });

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error("Offer has already been actioned.");
  }

  approval.status = ApprovalStatus.APPROVED;
  approval.founderId = founderId;
  approval.actionedAt = new Date();
  const savedApproval = await approvalRepo.save(approval);

  application.stage = ApplicationStage.OFFER_APPROVED;
  const savedApp = await appRepo.save(application);

  await writeAuditLog(
    session.userId,
    "OFFER_APPROVED",
    "founder_approvals",
    approval.id,
    { status: ApprovalStatus.PENDING },
    {
      status: ApprovalStatus.APPROVED,
      founderId,
      stage: ApplicationStage.OFFER_APPROVED,
    }
  );

  return { application: savedApp, approval: savedApproval };
}

// ─── rejectCandidateOffer ─────────────────────────────────────────────────────

export async function rejectCandidateOffer(
  applicationId: string,
  founderId: string,
  feedback: string
): Promise<{ application: IApplication; approval: IFounderApproval }> {
  const session = getMockSession();
  assertRole(session, UserRole.FOUNDER);

  const ds = await getDataSource();
  const appRepo = ds.getRepository<IApplication>("Application");
  const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");

  const application = await appRepo.findOneByOrFail({ id: applicationId });

  if (application.stage !== ApplicationStage.OFFER_PREP) {
    throw new Error("Application is not in OFFER_PREP stage.");
  }

  const approval = await approvalRepo.findOneByOrFail({ applicationId });

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error("Offer has already been actioned.");
  }

  approval.status = ApprovalStatus.REJECTED;
  approval.founderId = founderId;
  approval.feedback = feedback;
  approval.actionedAt = new Date();
  const savedApproval = await approvalRepo.save(approval);

  application.stage = ApplicationStage.INTERVIEWING;
  const savedApp = await appRepo.save(application);

  await writeAuditLog(
    session.userId,
    "OFFER_REJECTED",
    "founder_approvals",
    approval.id,
    { status: ApprovalStatus.PENDING, stage: ApplicationStage.OFFER_PREP },
    {
      status: ApprovalStatus.REJECTED,
      founderId,
      feedback,
      stage: ApplicationStage.INTERVIEWING,
    }
  );

  return { application: savedApp, approval: savedApproval };
}
