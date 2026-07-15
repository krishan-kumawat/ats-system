"use server";

import { withDb } from "@/db/data-source";
import {
  IJob,
  ICandidate,
  IApplication,
  IScorecard,
  IFounderApproval,
  IAuditLog,
  IRolePermission,
} from "@/db/schemas";
import { UserRole, ApplicationStage, ApprovalStatus, Recommendation } from "@/lib/enums";
import { Candidate, Job, AuditEntry, JobStatus, PipelineStage } from "@/lib/atsStore";
import {
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionSet,
} from "@/lib/permissions";
import {
  INITIAL_CANDIDATES,
  INITIAL_JOBS,
  INITIAL_AUDIT_LOGS,
} from "@/lib/atsStore";

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
  // If DATABASE_URL is not configured, return static seed data gracefully.
  if (!process.env.DATABASE_URL) {
    return {
      candidates: INITIAL_CANDIDATES,
      jobs: INITIAL_JOBS,
      auditLogs: INITIAL_AUDIT_LOGS,
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    };
  }

  try {
    const [dbJobs, dbApps, dbScorecards, dbApprovals, dbLogs, dbPerms] = await withDb((ds) => Promise.all([
      ds.getRepository<IJob>("Job").find({ order: { createdAt: "ASC" } }),
      ds.getRepository<IApplication>("Application").find({
        relations: { candidate: true },
        order: { createdAt: "ASC" },
      }),
      ds.getRepository<IScorecard>("Scorecard").find(),
      ds.getRepository<IFounderApproval>("FounderApproval").find(),
      ds.getRepository<IAuditLog>("AuditLog").find({
        order: { timestamp: "ASC" },
        take: 200,
      }),
      ds.getRepository<IRolePermission>("RolePermission").find(),
    ]));

    // ── Map jobs ──────────────────────────────────────────────────────────────
    const jobs: Job[] = dbJobs.map((j) => ({
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
    const scorecardsByAppId = new Map(dbScorecards.map((s) => [s.applicationId, s]));
    const approvalsByAppId  = new Map(dbApprovals.map((fa) => [fa.applicationId, fa]));

    const candidates: Candidate[] = dbApps.map((app) => {
      const cand = app.candidate!;
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
    const auditLogs: AuditEntry[] = dbLogs.map((l) => ({
      timestamp: l.timestamp instanceof Date
        ? l.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : String(l.timestamp),
      user: l.userId,
      action: l.action,
      target: l.targetId,
      notes: l.notes ?? "",
    }));

    let rolePermissions: RolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };

    if (dbPerms.length > 0) {
      const built: RolePermissions = {} as RolePermissions;

      for (const role of [UserRole.FOUNDER, UserRole.RECRUITER, UserRole.ADMIN, UserRole.HIRING_MANAGER, UserRole.HEAD_OF_HR]) {
        const rolePerms = dbPerms.filter((p) => p.role === role);
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
    console.error("[fetchInitialData] DB error, falling back to static data:", err);
    return {
      candidates: INITIAL_CANDIDATES,
      jobs: INITIAL_JOBS,
      auditLogs: INITIAL_AUDIT_LOGS,
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
  if (!process.env.DATABASE_URL) {
    // Fallback: derive from static seed
    return INITIAL_CANDIDATES.map((c) => {
      const job = INITIAL_JOBS.find((j) => j.id === c.jobId);
      return {
        applicationId: c.id,
        candidateId: c.id,
        assignedHiringManagerId: null,
        assignedHiringManagerName: "",
        name: c.name,
        email: c.email,
        phone: c.phone,
        skills: c.skills,
        stage: c.stage,
        sourceTag: c.sourceTag,
        expectedSalary: c.expectedSalary,
        jobId: c.jobId ?? "",
        jobTitle: job?.title ?? "",
        department: job?.department ?? "",
        hiringManager: job?.hiringManager ?? "",
        appliedAt: "",
        recommendation: c.scorecard.recommendation,
      };
    }).filter((a) => !jobId || a.jobId === jobId);
  }

  try {
    const rows = await withDb((ds) =>
      ds.query(
        `SELECT
           a.id                          AS "applicationId",
           a."candidateId",
           a."assignedHiringManagerId",
           c.name,
           c.email,
           c.phone,
           c.skills,
           a.stage,
           a."sourceTag",
           a."expectedSalary",
           a."jobId",
           a."createdAt"                 AS "appliedAt",
           j.title                       AS "jobTitle",
           j.department,
           j."hiringManagerName"         AS "jobHiringManagerName",
           COALESCE(uhm.name, j."hiringManagerName") AS "hiringManager",
           uhm.name                      AS "assignedHiringManagerName",
           s.recommendation
         FROM applications a
         JOIN candidates  c   ON c.id  = a."candidateId"
         LEFT JOIN jobs   j   ON j.id  = a."jobId"
         LEFT JOIN users  uhm ON uhm.id = a."assignedHiringManagerId"
         LEFT JOIN scorecards s ON s."applicationId" = a.id
         ${jobId ? `WHERE a."jobId" = $1` : ""}
         ORDER BY a."createdAt" DESC`,
        jobId ? [jobId] : []
      )
    ) as Array<{
      applicationId: string;
      candidateId: string;
      assignedHiringManagerId: string | null;
      assignedHiringManagerName: string | null;
      name: string;
      email: string;
      phone: string | null;
      skills: string[];
      stage: ApplicationStage;
      sourceTag: string;
      expectedSalary: string | null;
      jobId: string;
      appliedAt: Date | string;
      jobTitle: string | null;
      department: string | null;
      hiringManager: string | null;
      recommendation: string | null;
    }>;

    return rows.map((r) => ({
      applicationId: r.applicationId,
      candidateId: r.candidateId,
      assignedHiringManagerId: r.assignedHiringManagerId ?? null,
      assignedHiringManagerName: r.assignedHiringManagerName ?? "",
      name: r.name,
      email: r.email,
      phone: r.phone ?? "",
      skills: Array.isArray(r.skills) ? r.skills : [],
      stage: dbStageToPipeline(r.stage),
      sourceTag: r.sourceTag,
      expectedSalary: Number(r.expectedSalary) || 0,
      jobId: r.jobId,
      jobTitle: r.jobTitle ?? "",
      department: r.department ?? "",
      hiringManager: r.hiringManager ?? "",
      appliedAt: r.appliedAt instanceof Date
        ? r.appliedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : r.appliedAt
          ? new Date(r.appliedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "",
      recommendation: r.recommendation ?? "",
    }));
  } catch (err) {
    console.error("[fetchApplicantsAction]", err);
    return [];
  }
}
