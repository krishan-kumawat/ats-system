"use server";


import { UserRole, ApplicationStage, ApprovalStatus, Recommendation } from "@/lib/enums";
import { Candidate, Job, AuditEntry, JobStatus, PipelineStage } from "@/lib/atsStore";
import { getSession } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import {
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionSet,
  BACKEND_PERM_MAP,
} from "@/lib/permissions";


export interface InitialData {
  candidates: Candidate[];
  jobs: Job[];
  auditLogs: AuditEntry[];
  rolePermissions: RolePermissions;
}


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


// ─── DB → UI shape converters ─────────────────────────────────────────────────


function dbStageToPipeline(stage: string): PipelineStage {
  const s = (stage || "").toLowerCase();
  if (s.includes("applied")) return "Applied";
  if (s.includes("screening")) return "Screening";
  if (s.includes("interviewing")) return "Interviewing";
  if (s.includes("offered") || s.includes("offer")) return "Offer";
  return "Applied";
}


function dbApprovalToUI(status: string | null): "NONE" | "PENDING" | "APPROVED" | "REJECTED" {
  if (!status) return "NONE";
  const s = status.toUpperCase();
  if (s === "PENDING") return "PENDING";
  if (s === "APPROVED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return "NONE";
}


function dbRecommendationToUI(r: string | null): Candidate["scorecard"]["recommendation"] {
  if (!r) return "";
  return r as Candidate["scorecard"]["recommendation"];
}


// ─── Main fetch ───────────────────────────────────────────────────────────────


export async function fetchInitialData(): Promise<InitialData> {
  const session = await getSession();
  if (!session || !session.accessToken) {
    return {
      candidates: [],
      jobs: [],
      auditLogs: [],
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    };
  }


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
    };


    // 1. Fetch Jobs
    const jobsRes = await fetch(`${API_BASE_URL}/api/v1/jobs`, { headers });
    const backendJobs = jobsRes.ok ? await jobsRes.json() : [];
    console.log("JOBS DATA 1: ", backendJobs);


    const jobs: Job[] = backendJobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      description: j.description || "",
      department: j.department?.name || "Unassigned",
      departmentId: j.departmentId || j.department?.id,
      hiringManager: j.owner ? `${j.owner.firstName} ${j.owner.lastName}` : "System Owner",
      ownerId: j.ownerId || j.owner?.id,
      status: (j.status || "OPEN").toUpperCase() as unknown as JobStatus,
      budgetLimit: Number(j.budgetLimit ?? j.budget ?? 0),
      workMode: j.workMode || "On-site",
      salaryMin: j.salaryMin != null ? Number(j.salaryMin) : null,
      salaryMax: j.salaryMax != null ? Number(j.salaryMax) : null,
      createdAt: j.createdAt ? String(j.createdAt).slice(0, 10) : "",
    }));


    // 2. Fetch Candidates
    const candRes = await fetch(`${API_BASE_URL}/api/v1/candidates`, { headers });
    const backendCandidates = candRes.ok ? await candRes.json() : [];


    const candidates: Candidate[] = [];
    for (const c of backendCandidates) {
      for (const cj of c.candidateJobs || []) {
        candidates.push({
          id: `${c.id}::${cj.jobId}`, // Flatten relation to Candidate UI applications
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone ?? "",
          role: cj.job?.title ?? "",
          department: cj.job?.department?.name ?? "",
          stage: dbStageToPipeline(cj.status),
          sourceTag: cj.sourceTag ?? "Manual PDF Upload",
          skills: c.skills || [],
          expectedSalary: Number(cj.expectedSalary) || 0,
          proposedSalary: Number(cj.proposedSalary) || 0,
          proposedEquity: Number(cj.proposedEquity) || 0,
          jobId: cj.jobId,
          scorecard: {
            technicalScore: cj.technicalScore ?? 0,
            systemScore: cj.systemScore ?? 0,
            cultureScore: cj.cultureScore ?? 0,
            pros: cj.pros ?? "",
            cons: cj.cons ?? "",
            recommendation: dbRecommendationToUI(cj.recommendation),
          },
          founderApproval: {
            status: dbApprovalToUI(cj.approvalStatus),
            feedback: cj.approvalFeedback ?? "",
          },
        });
      }
    }


    // 3. Fetch Audit Logs
    const auditRes = await fetch(`${API_BASE_URL}/api/v1/audit-logs`, { headers });
    const backendAuditLogs = auditRes.ok ? await auditRes.json() : [];


    const auditLogs: AuditEntry[] = backendAuditLogs.map((l: any) => ({
      timestamp: l.createdAt
        ? new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      user: l.user ? `${l.user.firstName} ${l.user.lastName}` : "System",
      action: l.action,
      target: l.resourceId ?? "",
      notes: l.payload?.notes || l.action,
    }));


    // 4. Fetch Role Permissions
    const profilesRes = await fetch(`${API_BASE_URL}/api/v1/profiles`, { headers });
    const backendProfiles = profilesRes.ok ? await profilesRes.json() : [];


    const BACKEND_PERM_MAP_REVERSE: Record<string, keyof PermissionSet> = {};
    for (const [key, codes] of Object.entries(BACKEND_PERM_MAP)) {
      for (const c of codes) {
        BACKEND_PERM_MAP_REVERSE[c] = key as keyof PermissionSet;
      }
    }


    const rolePermissions: RolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };
    for (const p of backendProfiles) {
      let roleKey: UserRole | null = null;
      const nameNorm = p.name.toLowerCase().replace(/[\s_-]+/g, "");
      if (nameNorm === "admin") roleKey = UserRole.ADMIN;
      else if (nameNorm === "recruiter") roleKey = UserRole.RECRUITER;
      else if (nameNorm === "hiringmanager") roleKey = UserRole.HIRING_MANAGER;
      else if (nameNorm === "readonly") roleKey = UserRole.READ_ONLY;


      if (roleKey) {
        const set: PermissionSet = { ...DEFAULT_ROLE_PERMISSIONS[roleKey] };
        // Reset all UI managed permissions to false first
        for (const key of ALL_PERMISSIONS) {
          set[key] = false;
        }


        // Enable permissions that are present in profilePermissions
        for (const pp of p.profilePermissions || []) {
          const code = pp.permission?.code;
          const uiKey = BACKEND_PERM_MAP_REVERSE[code];
          if (uiKey) {
            set[uiKey] = true;
          }
        }
        rolePermissions[roleKey] = set;
      }
    }


    return { candidates, jobs, auditLogs, rolePermissions };
  } catch (err) {
    console.error("[fetchInitialData] Backend error:", err);
    return {
      candidates: [],
      jobs: [],
      auditLogs: [],
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    };
  }
}


// ─── Applicants list (with optional job filter) ───────────────────────────────


export async function fetchApplicantsAction(jobId?: string): Promise<any[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
    };


    const candRes = await fetch(`${API_BASE_URL}/api/v1/candidates`, { headers });
    if (!candRes.ok) return [];
    const backendCandidates = await candRes.json();


    const applicants: any[] = [];
    for (const c of backendCandidates) {
      for (const cj of c.candidateJobs || []) {
        if (jobId && cj.jobId !== jobId) continue;


        applicants.push({
          applicationId: `${c.id}::${cj.jobId}`,
          candidateId: c.id,
          assignedHiringManagerId: cj.job?.ownerId || null,
          assignedHiringManagerName: cj.job?.owner ? `${cj.job.owner.firstName} ${cj.job.owner.lastName}` : "",
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone ?? "",
          skills: c.skills || [],
          stage: dbStageToPipeline(cj.status),
          sourceTag: cj.sourceTag ?? "Manual PDF Upload",
          expectedSalary: Number(cj.expectedSalary) || 0,
          jobId: cj.jobId,
          jobTitle: cj.job?.title || "",
          department: cj.job?.department?.name || "",
          hiringManager: cj.job?.owner ? `${cj.job.owner.firstName} ${cj.job.owner.lastName}` : "",
          appliedAt: cj.createdAt ? new Date(cj.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "",
          recommendation: cj.recommendation ?? "",
        });
      }
    }


    // Sort applicants by appliedAt DESC
    applicants.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());


    return applicants;
  } catch (err) {
    console.error("[fetchApplicantsAction]", err);
    return [];
  }
}


export async function fetchObjectRecordsAction(objectApiName: string, page = 1, limit = 10, search = "") {
  const session = await getSession();
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized: Access token is missing or expired.");
  }


  let endpointName = `${objectApiName.toLowerCase()}s`;
  if (objectApiName.toLowerCase() === "auditlog") {
    endpointName = "audit-logs";
  }


  const url = `${API_BASE_URL}/api/v1/${endpointName}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;


  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });


    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Server returned ${res.status}: ${res.statusText}`);
    }


    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.data || []);
    const total = Array.isArray(data) ? data.length : (Number(data.total) || rows.length);
    return { data: rows, total, page, limit };
  } catch (err: any) {
    console.error(`[fetchObjectRecordsAction] error fetching ${objectApiName}:`, err);
    throw err;
  }
}


export async function fetchJobDetailsAction(jobId: string) {
  const session = await getSession();
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized");
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Failed to fetch job details: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      msg = errJson.message || msg;
      console.log('mesg ', errJson.message);
    } catch (_) { }
    throw new Error(msg);
  }
  return res.json();
}


export async function fetchCandidateDetailsAction(candidateId: string) {
  const session = await getSession();
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized");
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Failed to fetch candidate details: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      msg = errJson.message || msg;
    } catch (_) { }
    throw new Error(msg);
  }
  return res.json();
}



