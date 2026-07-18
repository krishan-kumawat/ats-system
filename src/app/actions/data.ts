"use server";

import { readDb } from "@/db/local-db";
import { UserRole, ApplicationStage, ApprovalStatus, Recommendation } from "@/lib/enums";
import { Candidate, Job, AuditEntry, JobStatus, PipelineStage } from "@/lib/atsStore";
import {
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionSet,
} from "@/lib/permissions";

export interface InitialData {
  candidates: Candidate[];
  jobs: Job[];
  auditLogs: AuditEntry[];
  rolePermissions: RolePermissions;
}

// ─── DB → UI shape converters ─────────────────────────────────────────────────

function dbStageToPipeline(stage: ApplicationStage): PipelineStage {
  switch (stage) {
    case ApplicationStage.APPLIED:       return "Applied";
    case ApplicationStage.SCREENING:     return "Screening";
    case ApplicationStage.INTERVIEWING:  return "Interviewing";
    case ApplicationStage.OFFER_PREP:
    case ApplicationStage.OFFER_APPROVED:
    case ApplicationStage.HIRED:         return "Offer";
    default:                             return "Applied";
  }
}

function dbApprovalToUI(status: ApprovalStatus | null): "NONE" | "PENDING" | "APPROVED" | "REJECTED" {
  if (!status) return "NONE";
  if (status === ApprovalStatus.PENDING)  return "PENDING";
  if (status === ApprovalStatus.APPROVED) return "APPROVED";
  if (status === ApprovalStatus.REJECTED) return "REJECTED";
  return "NONE";
}

function dbRecommendationToUI(r: Recommendation | null): Candidate["scorecard"]["recommendation"] {
  if (!r) return "";
  return r as Candidate["scorecard"]["recommendation"];
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchInitialData(): Promise<InitialData> {
  try {
    const db = readDb();

    // ── Map jobs ──────────────────────────────────────────────────────────────
    const jobs: Job[] = db.jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      hiringManager: j.hiringManagerName,
      status: j.status as unknown as JobStatus,
      budgetLimit: Number(j.budgetLimit),
      createdAt: j.createdAt instanceof Date
        ? j.createdAt.toISOString().slice(0, 10)
        : String(j.createdAt).slice(0, 10),
    }));

    // ── Map candidates from applications ──────────────────────────────────────
    const scorecardsByAppId = new Map(db.scorecards.map((s) => [s.applicationId, s]));
    const approvalsByAppId  = new Map(db.founderApprovals.map((fa) => [fa.applicationId, fa]));

    const candidates: Candidate[] = db.applications.map((app) => {
      const cand = db.candidates.find((c) => c.id === app.candidateId)!;
      const sc = scorecardsByAppId.get(app.id);
      const fa = approvalsByAppId.get(app.id);

      return {
        id: app.id,
        name: cand.name,
        email: cand.email,
        phone: cand.phone ?? "",
        role: jobs.find((j) => j.id === app.jobId)?.title ?? "",
        department: jobs.find((j) => j.id === app.jobId)?.department ?? "",
        stage: dbStageToPipeline(app.stage),
        sourceTag: app.sourceTag,
        skills: cand.skills,
        expectedSalary: Number(app.expectedSalary) || 0,
        proposedSalary: fa ? Number(fa.proposedSalary) : 0,
        proposedEquity: fa ? Number(fa.proposedEquity) : 0,
        jobId: app.jobId,
        scorecard: {
          technicalScore: sc?.technicalScore ?? 0,
          systemScore: sc?.systemScore ?? 0,
          cultureScore: sc?.cultureScore ?? 0,
          pros: sc?.pros ?? "",
          cons: sc?.cons ?? "",
          recommendation: dbRecommendationToUI(sc?.recommendation ?? null),
        },
        founderApproval: {
          status: dbApprovalToUI(fa?.status ?? null),
          feedback: fa?.feedback ?? "",
        },
      };
    });

    // ── Map audit logs ────────────────────────────────────────────────────────
    const auditLogs: AuditEntry[] = db.auditLogs.map((l) => ({
      timestamp: l.timestamp instanceof Date
        ? l.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : String(l.timestamp),
      user: l.userId,
      action: l.action,
      target: l.targetId,
      notes: l.notes ?? "",
    }));

    let rolePermissions: RolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };

    if (db.rolePermissions.length > 0) {
      const built: RolePermissions = {} as RolePermissions;

      for (const role of [
        UserRole.FOUNDER,
        UserRole.RECRUITER,
        UserRole.ADMIN,
        UserRole.HIRING_MANAGER,
        UserRole.HEAD_OF_HR,
      ]) {
        const rolePerms = db.rolePermissions.filter((p) => p.role === role);
        const set: Record<string, boolean> = {};
        for (const rp of rolePerms) {
          set[rp.permissionKey] = rp.granted;
        }
        // Fill missing keys from defaults (schema evolution safety)
        for (const key of ALL_PERMISSIONS) {
          if (!(key in set)) set[key] = DEFAULT_ROLE_PERMISSIONS[role][key];
        }
        built[role] = set as PermissionSet;
      }
      rolePermissions = built;
    }

    return { candidates, jobs, auditLogs, rolePermissions };
  } catch (err) {
    console.error("[fetchInitialData] local DB error, falling back to static:", err);
    return {
      candidates: [],
      jobs: [],
      auditLogs: [],
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    };
  }
}

// ─── Applicants list (with optional job filter) ───────────────────────────────

export interface Applicant {
  applicationId: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  stage: PipelineStage;
  sourceTag: string;
  expectedSalary: number;
  jobId: string;
  jobTitle: string;
  department: string;
  hiringManager: string;
  assignedHiringManagerId: string | null;
  assignedHiringManagerName: string;
  appliedAt: string;
  recommendation: string;
}

export async function fetchApplicantsAction(jobId?: string): Promise<Applicant[]> {
  try {
    const db = readDb();

    // Filter and sort applications by createdAt DESC
    const filteredApps = db.applications
      .filter((app) => !jobId || app.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filteredApps.map((app) => {
      const candidate = db.candidates.find((c) => c.id === app.candidateId)!;
      const job = db.jobs.find((j) => j.id === app.jobId);
      const assignedHM = app.assignedHiringManagerId
        ? db.users.find((u) => u.id === app.assignedHiringManagerId)
        : null;
      const scorecard = db.scorecards.find((s) => s.applicationId === app.id);

      const hiringManagerName = assignedHM?.name || job?.hiringManagerName || "";

      return {
        applicationId: app.id,
        candidateId: app.candidateId,
        assignedHiringManagerId: app.assignedHiringManagerId,
        assignedHiringManagerName: assignedHM?.name ?? "",
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone ?? "",
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
        stage: dbStageToPipeline(app.stage),
        sourceTag: app.sourceTag,
        expectedSalary: Number(app.expectedSalary) || 0,
        jobId: app.jobId,
        jobTitle: job?.title ?? "",
        department: job?.department ?? "",
        hiringManager: hiringManagerName,
        appliedAt: app.createdAt instanceof Date
          ? app.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : String(app.createdAt),
        recommendation: scorecard?.recommendation ?? "",
      };
    });
  } catch (err) {
    console.error("[fetchApplicantsAction]", err);
    return [];
  }
}
