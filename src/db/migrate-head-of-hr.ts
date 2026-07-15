/**
 * Run once to:
 *  1. Add HEAD_OF_HR to the users_role_enum
 *  2. Create the job_assignments table
 *  3. Add HEAD_OF_HR seed user (Meera Iyer)
 *  4. Seed role_permissions rows for HEAD_OF_HR
 *
 * Usage: npx tsx src/db/migrate-head-of-hr.ts
 */

import { DataSource } from "typeorm";
import {
  UserSchema, JobSchema, JobAssignmentSchema, RolePermissionSchema, AuditLogSchema,
  CandidateSchema, ApplicationSchema, ScorecardSchema, FounderApprovalSchema,
} from "./schemas";
import { UserRole } from "../lib/enums";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

const ds = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: false,
  entities: [
    UserSchema, JobSchema, CandidateSchema, ApplicationSchema,
    ScorecardSchema, FounderApprovalSchema, AuditLogSchema,
    RolePermissionSchema, JobAssignmentSchema,
  ],
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL not set");
    process.exit(1);
  }

  await ds.initialize();
  console.log("✅  Connected");

  // 1. Add HEAD_OF_HR to all role enums (idempotent)
  const enumsToUpdate = [
    "users_role_enum",
    "role_permissions_role_enum",
  ];
  for (const enumName of enumsToUpdate) {
    try {
      await ds.query(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'HEAD_OF_HR'`);
      console.log(`✅  HEAD_OF_HR added to ${enumName}`);
    } catch (e) {
      console.log(`⏭   ${enumName}: ${(e as Error).message}`);
    }
  }

  // 2. Create job_assignments table (synchronize handles it via TypeORM)
  await ds.query(`
    CREATE TABLE IF NOT EXISTS job_assignments (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "jobId"        VARCHAR NOT NULL,
      "assignedToId" UUID NOT NULL,
      "assignedById" UUID NOT NULL,
      note           TEXT,
      "assignedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "UQ_JOB_ASSIGNMENT" UNIQUE ("jobId", "assignedToId"),
      CONSTRAINT "FK_JA_job"        FOREIGN KEY ("jobId")        REFERENCES jobs(id)  ON DELETE CASCADE,
      CONSTRAINT "FK_JA_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT "FK_JA_assignedBy" FOREIGN KEY ("assignedById") REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("✅  job_assignments table ready");

  // 3. Seed Head of HR user
  const existing = await ds.query(
    `SELECT id FROM users WHERE email = 'headofhr@orgats.com'`
  );
  if (existing.length === 0) {
    await ds.query(
      `INSERT INTO users (id, email, name, role, "passwordHash")
       VALUES ('00000000-0000-0000-0000-000000000008', 'headofhr@orgats.com', 'Meera Iyer', 'HEAD_OF_HR', 'HeadHR@123')`
    );
    console.log("✅  Head of HR user (Meera Iyer) created");
  } else {
    console.log("⏭   Head of HR user already exists");
  }

  // 4. Seed role_permissions for HEAD_OF_HR
  const existingPerms = await ds.query(
    `SELECT id FROM role_permissions WHERE role = 'HEAD_OF_HR' LIMIT 1`
  );
  if (existingPerms.length === 0) {
    const headPerms = DEFAULT_ROLE_PERMISSIONS[UserRole.HEAD_OF_HR];
    for (const key of ALL_PERMISSIONS) {
      await ds.query(
        `INSERT INTO role_permissions (role, "permissionKey", granted)
         VALUES ('HEAD_OF_HR', $1, $2)
         ON CONFLICT (role, "permissionKey") DO UPDATE SET granted = EXCLUDED.granted`,
        [key, headPerms[key]]
      );
    }
    console.log(`✅  Seeded ${ALL_PERMISSIONS.length} role_permissions for HEAD_OF_HR`);
  } else {
    console.log("⏭   HEAD_OF_HR permissions already seeded");
  }

  await ds.destroy();
  console.log("✅  Migration complete.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
