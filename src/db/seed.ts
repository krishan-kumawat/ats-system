/**
 * Run once to create all tables and seed initial data.
 * Usage: npx tsx src/db/seed.ts
 *
 * Requires DATABASE_URL to be set in the environment (or .env.local).
 * The script uses synchronize:true to create/alter tables, then seeds if empty.
 */

import { DataSource } from "typeorm";
import {
  UserSchema,
  JobSchema,
  CandidateSchema,
  ApplicationSchema,
  ScorecardSchema,
  FounderApprovalSchema,
  AuditLogSchema,
  RolePermissionSchema,
  IUser,
  IJob,
  ICandidate,
  IApplication,
  IScorecard,
  IFounderApproval,
  IAuditLog,
  IRolePermission,
} from "./schemas";
import {
  UserRole,
  JobStatus,
  ApplicationStage,
  ApprovalStatus,
  Recommendation,
} from "../lib/enums";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";

// ─── Dotenv fallback for .env.local ──────────────────────────────────────────
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envLocalPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envLocalPath)) return;
  const lines = readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

// ─── Seed users ───────────────────────────────────────────────────────────────

const SEED_USERS: Array<{ id: string; name: string; email: string; role: UserRole; password: string }> = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Arjun Mehta",   email: "founder@orgats.com",    role: UserRole.FOUNDER,         password: "Founder@123"      },
  { id: "00000000-0000-0000-0000-000000000002", name: "Priya Sharma",  email: "recruiter@orgats.com",  role: UserRole.RECRUITER,       password: "Recruiter@123"    },
  { id: "00000000-0000-0000-0000-000000000003", name: "Rohan Verma",   email: "admin@orgats.com",      role: UserRole.ADMIN,           password: "Admin@123"        },
  { id: "00000000-0000-0000-0000-000000000004", name: "Neha Kapoor",   email: "hiring@orgats.com",     role: UserRole.HIRING_MANAGER,  password: "Hiring@123"       },
  { id: "00000000-0000-0000-0000-000000000005", name: "Kiran Desai",   email: "recruiter2@orgats.com", role: UserRole.RECRUITER,       password: "Recruiter2@123"   },
  { id: "00000000-0000-0000-0000-000000000006", name: "Samira Bose",   email: "admin2@orgats.com",     role: UserRole.ADMIN,           password: "Admin2@123"       },
  { id: "00000000-0000-0000-0000-000000000007", name: "Dev Anand",     email: "hiring2@orgats.com",    role: UserRole.HIRING_MANAGER,  password: "Hiring2@123"      },
];

const SEED_JOBS: Array<Omit<IJob, "hiringManager">> = [
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

// Fixed UUIDs for seed data — must all be valid UUID v4 format
const C_ALICE   = "a1ce0000-0000-4000-8000-000000000001";
const C_BOB     = "b0b00000-0000-4000-8000-000000000002";
const C_CLARA   = "c1a20000-0000-4000-8000-000000000003";
const APP_ALICE = "a9900000-0000-4000-8000-000000000001";
const APP_BOB   = "b0900000-0000-4000-8000-000000000002";
const APP_CLARA = "c0900000-0000-4000-8000-000000000003";
const SC_BOB    = "5c0b0000-0000-4000-8000-000000000002";
const SC_CLARA  = "5cc1a000-0000-4000-8000-000000000003";
const FA_CLARA  = "fa000000-0000-4000-8000-000000000003";

const SEED_CANDIDATES: Array<Omit<ICandidate, "createdAt">> = [
  {
    id: C_ALICE,
    name: "Alice Chen",
    email: "alice.chen@techmail.io",
    phone: "+1 555-0142",
    currentCompany: null,
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Jest"],
  },
  {
    id: C_BOB,
    name: "Bob Smith",
    email: "bob.smith@datascience.net",
    phone: "+1 555-0189",
    currentCompany: null,
    skills: ["Python", "PyTorch", "SQL", "Pandas", "Scikit-Learn"],
  },
  {
    id: C_CLARA,
    name: "Clara Rodriguez",
    email: "clara.rod@productco.org",
    phone: "+1 555-0199",
    currentCompany: null,
    skills: ["Product Strategy", "SQL", "Agile Roadmap", "A/B Testing", "Figma"],
  },
];

const SEED_APPLICATIONS = [
  {
    id: APP_ALICE,
    candidateId: C_ALICE,
    jobId: "job-eng-104",
    stage: ApplicationStage.APPLIED,
    sourceTag: "Manual PDF Upload",
    gDriveFileId: "gdrive_sim_alice_001",
    gDriveViewUrl: "https://drive.google.com/file/d/gdrive_sim_alice_001/view",
    expectedSalary: 145000,
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
  },
];

const SEED_SCORECARDS = [
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
  },
];

const SEED_APPROVALS = [
  {
    id: FA_CLARA,
    applicationId: APP_CLARA,
    founderId: null,
    proposedSalary: 160000,
    proposedEquity: 0.0015,
    status: ApprovalStatus.PENDING,
    feedback: null,
    actionedAt: null,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set. Update .env.local and retry.");
    process.exit(1);
  }

  const ds = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: true, // creates/alters tables automatically
    logging: false,
    entities: [
      UserSchema,
      JobSchema,
      CandidateSchema,
      ApplicationSchema,
      ScorecardSchema,
      FounderApprovalSchema,
      AuditLogSchema,
      RolePermissionSchema,
    ],
  });

  await ds.initialize();
  console.log("✅  Connected to PostgreSQL");

  // ── Users ──────────────────────────────────────────────────────────────────
  const userRepo = ds.getRepository<IUser>("User");
  const existingUserCount = await userRepo.count();
  if (existingUserCount === 0) {
    for (const u of SEED_USERS) {
      await userRepo.save(
        userRepo.create({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: u.password, // plain text for dev; replace with bcrypt in prod
        })
      );
    }
    console.log(`✅  Seeded ${SEED_USERS.length} users`);
  } else {
    console.log(`⏭   Users already exist (${existingUserCount}), skipping`);
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────
  const jobRepo = ds.getRepository<IJob>("Job");
  const existingJobCount = await jobRepo.count();
  if (existingJobCount === 0) {
    for (const j of SEED_JOBS) {
      await jobRepo.save(jobRepo.create(j));
    }
    console.log(`✅  Seeded ${SEED_JOBS.length} jobs`);
  } else {
    console.log(`⏭   Jobs already exist (${existingJobCount}), skipping`);
  }

  // ── Candidates ─────────────────────────────────────────────────────────────
  const candidateRepo = ds.getRepository<ICandidate>("Candidate");
  const existingCandidateCount = await candidateRepo.count();
  if (existingCandidateCount === 0) {
    for (const c of SEED_CANDIDATES) {
      await candidateRepo.save(candidateRepo.create(c));
    }
    console.log(`✅  Seeded ${SEED_CANDIDATES.length} candidates`);
  } else {
    console.log(`⏭   Candidates already exist (${existingCandidateCount}), skipping`);
  }

  // ── Applications ───────────────────────────────────────────────────────────
  const appRepo = ds.getRepository<IApplication>("Application");
  const existingAppCount = await appRepo.count();
  if (existingAppCount === 0) {
    for (const a of SEED_APPLICATIONS) {
      await appRepo.save(appRepo.create(a));
    }
    console.log(`✅  Seeded ${SEED_APPLICATIONS.length} applications`);
  } else {
    console.log(`⏭   Applications already exist (${existingAppCount}), skipping`);
  }

  // ── Scorecards ─────────────────────────────────────────────────────────────
  const scorecardRepo = ds.getRepository<IScorecard>("Scorecard");
  const existingScorecardCount = await scorecardRepo.count();
  if (existingScorecardCount === 0) {
    for (const s of SEED_SCORECARDS) {
      await scorecardRepo.save(scorecardRepo.create(s));
    }
    console.log(`✅  Seeded ${SEED_SCORECARDS.length} scorecards`);
  } else {
    console.log(`⏭   Scorecards already exist (${existingScorecardCount}), skipping`);
  }

  // ── Founder Approvals ──────────────────────────────────────────────────────
  const approvalRepo = ds.getRepository<IFounderApproval>("FounderApproval");
  const existingApprovalCount = await approvalRepo.count();
  if (existingApprovalCount === 0) {
    for (const fa of SEED_APPROVALS) {
      await approvalRepo.save(approvalRepo.create(fa));
    }
    console.log(`✅  Seeded ${SEED_APPROVALS.length} founder approvals`);
  } else {
    console.log(`⏭   Founder approvals already exist (${existingApprovalCount}), skipping`);
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
  const existingAuditCount = await auditRepo.count();
  if (existingAuditCount === 0) {
    const seedAudits = [
      {
        userId: "00000000-0000-0000-0000-000000000002",
        action: "CREATED_JOB",
        targetTable: "jobs",
        targetId: "job-eng-104",
        notes: "Initialized folder structures inside Company_ATS_Storage/.",
        oldValues: null,
        newValues: { jobId: "job-eng-104", title: "Senior Frontend Engineer" },
      },
      {
        userId: "00000000-0000-0000-0000-000000000002",
        action: "INGESTED_PROFILE",
        targetTable: "candidates",
        targetId: C_ALICE,
        notes: "Manual resume PDF streamed to Google Drive. Skills parser complete.",
        oldValues: null,
        newValues: { name: "Alice Chen" },
      },
      {
        userId: "00000000-0000-0000-0000-000000000002",
        action: "STAGE_TRANSITION",
        targetTable: "applications",
        targetId: APP_CLARA,
        notes: "Moved stage: Interviewing -> Offer Prep. Secure gate triggered.",
        oldValues: { stage: "INTERVIEWING" },
        newValues: { stage: "OFFER_PREP" },
      },
    ];
    for (const a of seedAudits) {
      await auditRepo.save(auditRepo.create(a));
    }
    console.log(`✅  Seeded ${seedAudits.length} audit log entries`);
  } else {
    console.log(`⏭   Audit logs already exist (${existingAuditCount}), skipping`);
  }

  // ── Role Permissions ───────────────────────────────────────────────────────
  const permRepo = ds.getRepository<IRolePermission>("RolePermission");
  const existingPermCount = await permRepo.count();
  if (existingPermCount === 0) {
    const roles = [UserRole.FOUNDER, UserRole.RECRUITER, UserRole.ADMIN, UserRole.HIRING_MANAGER];
    for (const role of roles) {
      for (const perm of ALL_PERMISSIONS) {
        await permRepo.save(
          permRepo.create({
            role,
            permissionKey: perm,
            granted: DEFAULT_ROLE_PERMISSIONS[role][perm],
          })
        );
      }
    }
    const total = roles.length * ALL_PERMISSIONS.length;
    console.log(`✅  Seeded ${total} role permission entries`);
  } else {
    console.log(`⏭   Role permissions already exist (${existingPermCount}), skipping`);
  }

  await ds.destroy();
  console.log("✅  Database setup complete.");
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
