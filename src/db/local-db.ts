import fs from "fs";
import path from "path";
import {
  IUser,
  IJob,
  ICandidate,
  IApplication,
  IScorecard,
  IFounderApproval,
  IAuditLog,
  IRolePermission,
  IJobAssignment,
} from "./schemas";
import { UserRole, JobStatus, ApplicationStage, ApprovalStatus, Recommendation } from "@/lib/enums";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

const DB_FILE = path.join(process.cwd(), "src/db/db.json");

export interface LocalDb {
  users: IUser[];
  jobs: IJob[];
  candidates: ICandidate[];
  applications: IApplication[];
  scorecards: IScorecard[];
  founderApprovals: IFounderApproval[];
  auditLogs: IAuditLog[];
  rolePermissions: IRolePermission[];
  jobAssignments: IJobAssignment[];
}

export function readDb(): LocalDb {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb = getSeedData();
    writeDb(defaultDb);
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    if (!data.trim()) {
      const defaultDb = getSeedData();
      writeDb(defaultDb);
      return defaultDb;
    }
    const db = JSON.parse(data);
    
    // Parse Date strings back into Date objects
    db.users = (db.users || []).map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) }));
    db.jobs = (db.jobs || []).map((j: any) => ({ ...j, createdAt: new Date(j.createdAt) }));
    db.candidates = (db.candidates || []).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));
    db.applications = (db.applications || []).map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) }));
    db.scorecards = (db.scorecards || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }));
    db.founderApprovals = (db.founderApprovals || []).map((fa: any) => ({
      ...fa,
      createdAt: new Date(fa.createdAt),
      actionedAt: fa.actionedAt ? new Date(fa.actionedAt) : null,
    }));
    db.auditLogs = (db.auditLogs || []).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }));
    db.rolePermissions = (db.rolePermissions || []).map((rp: any) => ({ ...rp, updatedAt: new Date(rp.updatedAt) }));
    db.jobAssignments = (db.jobAssignments || []).map((ja: any) => ({ ...ja, assignedAt: new Date(ja.assignedAt) }));
    
    return db as LocalDb;
  } catch (err) {
    console.error("Failed to read local DB, resetting to seed data:", err);
    const defaultDb = getSeedData();
    writeDb(defaultDb);
    return defaultDb;
  }
}

export function writeDb(db: LocalDb): void {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local DB:", err);
  }
}

function getSeedData(): LocalDb {
  const SEED_USERS: IUser[] = [
    { id: "00000000-0000-0000-0000-000000000001", name: "Arjun Mehta",   email: "founder@orgats.com",    role: UserRole.FOUNDER,         passwordHash: "Founder@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000002", name: "Priya Sharma",  email: "recruiter@orgats.com",  role: UserRole.RECRUITER,       passwordHash: "Recruiter@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000003", name: "Rohan Verma",   email: "admin@orgats.com",      role: UserRole.ADMIN,           passwordHash: "Admin@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000004", name: "Neha Kapoor",   email: "hiring@orgats.com",     role: UserRole.HIRING_MANAGER,  passwordHash: "Hiring@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000005", name: "Kiran Desai",   email: "recruiter2@orgats.com", role: UserRole.RECRUITER,       passwordHash: "Recruiter2@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000006", name: "Samira Bose",   email: "admin2@orgats.com",     role: UserRole.ADMIN,           passwordHash: "Admin2@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000007", name: "Dev Anand",     email: "hiring2@orgats.com",    role: UserRole.HIRING_MANAGER,  passwordHash: "Hiring2@123", isActive: true, createdAt: new Date() },
    { id: "00000000-0000-0000-0000-000000000008", name: "Meera Iyer",    email: "headofhr@orgats.com",   role: UserRole.HEAD_OF_HR,      passwordHash: "HeadHR@123", isActive: true, createdAt: new Date() },
  ];

  const SEED_JOBS: IJob[] = [
    {
      id: "job-eng-104",
      title: "Senior Frontend Engineer",
      department: "Engineering",
      hiringManagerId: "00000000-0000-0000-0000-000000000003",
      hiringManagerName: "Rohan Verma",
      status: JobStatus.OPEN,
      gDriveFolderId: null,
      budgetLimit: 160000,
      createdAt: new Date("2026-06-20"),
    },
    {
      id: "job-eng-105",
      title: "Lead Data Scientist",
      department: "Engineering",
      hiringManagerId: "00000000-0000-0000-0000-000000000004",
      hiringManagerName: "Neha Kapoor",
      status: JobStatus.OPEN,
      gDriveFolderId: null,
      budgetLimit: 180000,
      createdAt: new Date("2026-06-22"),
    },
    {
      id: "job-prd-201",
      title: "Principal Product Manager",
      department: "Product",
      hiringManagerId: "00000000-0000-0000-0000-000000000001",
      hiringManagerName: "Arjun Mehta",
      status: JobStatus.OPEN,
      gDriveFolderId: null,
      budgetLimit: 175000,
      createdAt: new Date("2026-06-25"),
    },
  ];

  const C_ALICE   = "a1ce0000-0000-4000-8000-000000000001";
  const C_BOB     = "b0b00000-0000-4000-8000-000000000002";
  const C_CLARA   = "c1a20000-0000-4000-8000-000000000003";
  const APP_ALICE = "a9900000-0000-4000-8000-000000000001";
  const APP_BOB   = "b0900000-0000-4000-8000-000000000002";
  const APP_CLARA = "c0900000-0000-4000-8000-000000000003";
  const SC_BOB    = "5c0b0000-0000-4000-8000-000000000002";
  const SC_CLARA  = "5cc1a000-0000-4000-8000-000000000003";
  const FA_CLARA  = "fa000000-0000-4000-8000-000000000003";

  const SEED_CANDIDATES: ICandidate[] = [
    {
      id: C_ALICE,
      name: "Alice Chen",
      email: "alice.chen@techmail.io",
      phone: "+1 555-0142",
      currentCompany: null,
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Jest"],
      createdAt: new Date("2026-06-20"),
    },
    {
      id: C_BOB,
      name: "Bob Smith",
      email: "bob.smith@datascience.net",
      phone: "+1 555-0189",
      currentCompany: null,
      skills: ["Python", "PyTorch", "SQL", "Pandas", "Scikit-Learn"],
      createdAt: new Date("2026-06-22"),
    },
    {
      id: C_CLARA,
      name: "Clara Rodriguez",
      email: "clara.rod@productco.org",
      phone: "+1 555-0199",
      currentCompany: null,
      skills: ["Product Strategy", "SQL", "Agile Roadmap", "A/B Testing", "Figma"],
      createdAt: new Date("2026-06-25"),
    },
  ];

  const SEED_APPLICATIONS: IApplication[] = [
    {
      id: APP_ALICE,
      candidateId: C_ALICE,
      jobId: "job-eng-104",
      stage: ApplicationStage.APPLIED,
      sourceTag: "Manual PDF Upload",
      gDriveFileId: "gdrive_sim_alice_001",
      gDriveViewUrl: "https://drive.google.com/file/d/gdrive_sim_alice_001/view",
      expectedSalary: 145000,
      assignedHiringManagerId: null,
      createdAt: new Date("2026-06-20"),
    },
    {
      id: APP_BOB,
      candidateId: C_BOB,
      jobId: "job-eng-105",
      stage: ApplicationStage.SCREENING,
      sourceTag: "Referral",
      gDriveFileId: "gdrive_sim_bob_002",
      gDriveViewUrl: "https://drive.google.com/file/d/gdrive_sim_bob_002/view",
      expectedSalary: 165000,
      assignedHiringManagerId: null,
      createdAt: new Date("2026-06-22"),
    },
    {
      id: APP_CLARA,
      candidateId: C_CLARA,
      jobId: "job-prd-201",
      stage: ApplicationStage.OFFER_PREP,
      sourceTag: "Manual PDF Ingest",
      gDriveFileId: "gdrive_sim_clara_003",
      gDriveViewUrl: "https://drive.google.com/file/d/gdrive_sim_clara_003/view",
      expectedSalary: 160000,
      assignedHiringManagerId: null,
      createdAt: new Date("2026-06-25"),
    },
  ];

  const SEED_SCORECARDS: IScorecard[] = [
    {
      id: SC_BOB,
      applicationId: APP_BOB,
      reviewerId: "00000000-0000-0000-0000-000000000004",
      technicalScore: 4,
      systemScore: 3,
      cultureScore: 5,
      pros: "Excellent research background.",
      cons: "Needs tooling adjustment.",
      recommendation: Recommendation.HIRE,
      createdAt: new Date("2026-06-23"),
    },
    {
      id: SC_CLARA,
      applicationId: APP_CLARA,
      reviewerId: "00000000-0000-0000-0000-000000000004",
      technicalScore: 5,
      systemScore: 4,
      cultureScore: 5,
      pros: "Exceptional startup scaling background.",
      cons: "Needs steering on infra constraints.",
      recommendation: Recommendation.STRONG_HIRE,
      createdAt: new Date("2026-06-26"),
    },
  ];

  const SEED_APPROVALS: IFounderApproval[] = [
    {
      id: FA_CLARA,
      applicationId: APP_CLARA,
      founderId: null,
      proposedSalary: 160000,
      proposedEquity: 0.0015,
      status: ApprovalStatus.PENDING,
      feedback: null,
      createdAt: new Date("2026-06-26"),
      actionedAt: null,
    },
  ];

  const SEED_AUDIT_LOGS: IAuditLog[] = [
    {
      id: 1,
      userId: "00000000-0000-0000-0000-000000000002",
      action: "CREATED_JOB",
      targetTable: "jobs",
      targetId: "job-eng-104",
      notes: "Initialized folder structures inside Company_ATS_Storage/.",
      oldValues: null,
      newValues: { jobId: "job-eng-104", title: "Senior Frontend Engineer" },
      timestamp: new Date("2026-06-20T10:24:00Z"),
    },
    {
      id: 2,
      userId: "00000000-0000-0000-0000-000000000002",
      action: "INGESTED_PROFILE",
      targetTable: "candidates",
      targetId: C_ALICE,
      notes: "Manual resume PDF streamed to Google Drive. Skills parser complete.",
      oldValues: null,
      newValues: { name: "Alice Chen" },
      timestamp: new Date("2026-06-20T10:28:00Z"),
    },
    {
      id: 3,
      userId: "00000000-0000-0000-0000-000000000002",
      action: "STAGE_TRANSITION",
      targetTable: "applications",
      targetId: APP_CLARA,
      notes: "Moved stage: Interviewing -> Offer Prep. Secure gate triggered.",
      oldValues: { stage: "INTERVIEWING" },
      newValues: { stage: "OFFER_PREP" },
      timestamp: new Date("2026-06-25T11:02:00Z"),
    },
  ];

  const SEED_ROLE_PERMISSIONS: IRolePermission[] = [];
  const roles = [
    UserRole.FOUNDER,
    UserRole.RECRUITER,
    UserRole.ADMIN,
    UserRole.HIRING_MANAGER,
    UserRole.HEAD_OF_HR,
  ];
  let permId = 1;
  for (const role of roles) {
    for (const perm of ALL_PERMISSIONS) {
      SEED_ROLE_PERMISSIONS.push({
        id: permId++,
        role,
        permissionKey: perm,
        granted: DEFAULT_ROLE_PERMISSIONS[role]?.[perm] ?? false,
        updatedAt: new Date(),
      });
    }
  }

  return {
    users: SEED_USERS,
    jobs: SEED_JOBS,
    candidates: SEED_CANDIDATES,
    applications: SEED_APPLICATIONS,
    scorecards: SEED_SCORECARDS,
    founderApprovals: SEED_APPROVALS,
    auditLogs: SEED_AUDIT_LOGS,
    rolePermissions: SEED_ROLE_PERMISSIONS,
    jobAssignments: [],
  };
}
