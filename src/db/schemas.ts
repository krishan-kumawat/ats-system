import { EntitySchema } from "typeorm";

// ─── Enums (re-exported from lib/enums to keep TypeORM out of client bundles) ─

export {
  UserRole,
  JobStatus,
  ApplicationStage,
  ApprovalStatus,
  Recommendation,
} from "@/lib/enums";

import {
  UserRole,
  JobStatus,
  ApplicationStage,
  ApprovalStatus,
  Recommendation,
} from "@/lib/enums";

// ─── Entity interfaces ────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IJob {
  id: string;
  title: string;
  department: string;
  hiringManagerId: string;
  hiringManager?: IUser;
  hiringManagerName: string;
  status: JobStatus;
  gDriveFolderId: string | null;
  budgetLimit: number;
  createdAt: Date;
}

export interface ICandidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  currentCompany: string | null;
  skills: string[];
  createdAt: Date;
}

export interface IApplication {
  id: string;
  candidateId: string;
  candidate?: ICandidate;
  jobId: string;
  job?: IJob;
  stage: ApplicationStage;
  sourceTag: string;
  gDriveFileId: string;
  gDriveViewUrl: string;
  expectedSalary: number | null;
  assignedHiringManagerId: string | null;
  assignedHiringManager?: IUser;
  createdAt: Date;
}

export interface IScorecard {
  id: string;
  applicationId: string;
  application?: IApplication;
  reviewerId: string;
  reviewer?: IUser;
  technicalScore: number;
  systemScore: number;
  cultureScore: number;
  pros: string | null;
  cons: string | null;
  recommendation: Recommendation;
  createdAt: Date;
}

export interface IFounderApproval {
  id: string;
  applicationId: string;
  application?: IApplication;
  founderId: string | null;
  founder?: IUser;
  proposedSalary: number;
  proposedEquity: number | null;
  status: ApprovalStatus;
  feedback: string | null;
  createdAt: Date;
  actionedAt: Date | null;
}

export interface IAuditLog {
  id: bigint;
  userId: string;
  user?: IUser;
  action: string;
  targetTable: string;
  targetId: string;
  notes: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  timestamp: Date;
}

export interface IRolePermission {
  id: number;
  role: UserRole;
  permissionKey: string;
  granted: boolean;
  updatedAt: Date;
}

export interface IJobAssignment {
  id: string;
  jobId: string;
  job?: IJob;
  assignedToId: string;
  assignedTo?: IUser;
  assignedById: string;
  assignedBy?: IUser;
  note: string | null;
  assignedAt: Date;
}

// ─── EntitySchema definitions ─────────────────────────────────────────────────

export const UserSchema = new EntitySchema<IUser>({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    email: {
      type: "varchar",
      unique: true,
      nullable: false,
    },
    name: {
      type: "varchar",
      nullable: false,
    },
    role: {
      type: "enum",
      enum: UserRole,
      nullable: false,
    },
    passwordHash: {
      type: "varchar",
      nullable: false,
    },
    isActive: {
      type: "boolean",
      default: true,
      nullable: false,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
});

export const JobSchema = new EntitySchema<IJob>({
  name: "Job",
  tableName: "jobs",
  columns: {
    id: {
      type: "varchar",
      primary: true,
      nullable: false,
    },
    title: {
      type: "varchar",
      nullable: false,
    },
    department: {
      type: "varchar",
      nullable: false,
    },
    hiringManagerId: {
      type: "uuid",
      nullable: false,
    },
    hiringManagerName: {
      type: "varchar",
      nullable: false,
      default: "",
    },
    status: {
      type: "enum",
      enum: JobStatus,
      default: JobStatus.DRAFT,
      nullable: false,
    },
    gDriveFolderId: {
      type: "varchar",
      nullable: true,
    },
    budgetLimit: {
      type: "decimal",
      precision: 12,
      scale: 2,
      nullable: false,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
  relations: {
    hiringManager: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "hiringManagerId" },
      eager: false,
    },
  },
});

export const CandidateSchema = new EntitySchema<ICandidate>({
  name: "Candidate",
  tableName: "candidates",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    name: {
      type: "varchar",
      nullable: false,
    },
    email: {
      type: "varchar",
      unique: true,
      nullable: false,
    },
    phone: {
      type: "varchar",
      nullable: true,
    },
    currentCompany: {
      type: "varchar",
      nullable: true,
    },
    skills: {
      type: "jsonb",
      default: [],
      nullable: false,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
});

export const ApplicationSchema = new EntitySchema<IApplication>({
  name: "Application",
  tableName: "applications",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    candidateId: {
      type: "uuid",
      nullable: false,
    },
    jobId: {
      type: "varchar",
      nullable: false,
    },
    stage: {
      type: "enum",
      enum: ApplicationStage,
      default: ApplicationStage.APPLIED,
      nullable: false,
    },
    sourceTag: {
      type: "varchar",
      default: "MANUAL",
      nullable: false,
    },
    gDriveFileId: {
      type: "varchar",
      nullable: false,
    },
    gDriveViewUrl: {
      type: "varchar",
      nullable: false,
    },
    expectedSalary: {
      type: "decimal",
      precision: 12,
      scale: 2,
      nullable: true,
    },
    assignedHiringManagerId: {
      type: "uuid",
      nullable: true,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
  relations: {
    candidate: {
      type: "many-to-one",
      target: "Candidate",
      joinColumn: { name: "candidateId" },
      eager: false,
    },
    job: {
      type: "many-to-one",
      target: "Job",
      joinColumn: { name: "jobId" },
      eager: false,
    },
    assignedHiringManager: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "assignedHiringManagerId" },
      nullable: true,
      eager: false,
    },
  },
});

export const ScorecardSchema = new EntitySchema<IScorecard>({
  name: "Scorecard",
  tableName: "scorecards",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    applicationId: {
      type: "uuid",
      nullable: false,
    },
    reviewerId: {
      type: "uuid",
      nullable: false,
    },
    technicalScore: {
      type: "smallint",
      nullable: false,
    },
    systemScore: {
      type: "smallint",
      nullable: false,
    },
    cultureScore: {
      type: "smallint",
      nullable: false,
    },
    pros: {
      type: "text",
      nullable: true,
    },
    cons: {
      type: "text",
      nullable: true,
    },
    recommendation: {
      type: "enum",
      enum: Recommendation,
      nullable: false,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
  relations: {
    application: {
      type: "many-to-one",
      target: "Application",
      joinColumn: { name: "applicationId" },
      eager: false,
    },
    reviewer: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "reviewerId" },
      eager: false,
    },
  },
  checks: [
    {
      name: "CHK_SCORECARD_TECHNICAL",
      expression: `"technicalScore" BETWEEN 1 AND 5`,
    },
    {
      name: "CHK_SCORECARD_SYSTEM",
      expression: `"systemScore" BETWEEN 1 AND 5`,
    },
    {
      name: "CHK_SCORECARD_CULTURE",
      expression: `"cultureScore" BETWEEN 1 AND 5`,
    },
  ],
});

export const FounderApprovalSchema = new EntitySchema<IFounderApproval>({
  name: "FounderApproval",
  tableName: "founder_approvals",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    applicationId: {
      type: "uuid",
      nullable: false,
    },
    founderId: {
      type: "uuid",
      nullable: true,
    },
    proposedSalary: {
      type: "decimal",
      precision: 12,
      scale: 2,
      nullable: false,
    },
    proposedEquity: {
      type: "decimal",
      precision: 6,
      scale: 4,
      nullable: true,
    },
    status: {
      type: "enum",
      enum: ApprovalStatus,
      default: ApprovalStatus.PENDING,
      nullable: false,
    },
    feedback: {
      type: "text",
      nullable: true,
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
    actionedAt: {
      type: "timestamp with time zone",
      nullable: true,
    },
  },
  relations: {
    application: {
      type: "many-to-one",
      target: "Application",
      joinColumn: { name: "applicationId" },
      eager: false,
    },
    founder: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "founderId" },
      nullable: true,
      eager: false,
    },
  },
});

export const AuditLogSchema = new EntitySchema<IAuditLog>({
  name: "AuditLog",
  tableName: "audit_logs",
  columns: {
    id: {
      type: "bigint",
      primary: true,
      generated: "increment",
    },
    userId: {
      type: "varchar",
      nullable: false,
    },
    action: {
      type: "varchar",
      nullable: false,
    },
    targetTable: {
      type: "varchar",
      nullable: false,
    },
    targetId: {
      type: "varchar",
      nullable: false,
    },
    notes: {
      type: "text",
      nullable: true,
    },
    oldValues: {
      type: "jsonb",
      nullable: true,
    },
    newValues: {
      type: "jsonb",
      nullable: true,
    },
    timestamp: {
      type: "timestamp with time zone",
      createDate: true,
    },
  },
});

export const JobAssignmentSchema = new EntitySchema<IJobAssignment>({
  name: "JobAssignment",
  tableName: "job_assignments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    jobId: { type: "varchar", nullable: false },
    assignedToId: { type: "uuid", nullable: false },
    assignedById: { type: "uuid", nullable: false },
    note: { type: "text", nullable: true },
    assignedAt: { type: "timestamp with time zone", createDate: true },
  },
  relations: {
    job:        { type: "many-to-one", target: "Job",  joinColumn: { name: "jobId" },        eager: false },
    assignedTo: { type: "many-to-one", target: "User", joinColumn: { name: "assignedToId" }, eager: false },
    assignedBy: { type: "many-to-one", target: "User", joinColumn: { name: "assignedById" }, eager: false },
  },
  uniques: [{ name: "UQ_JOB_ASSIGNMENT", columns: ["jobId", "assignedToId"] }],
});

export const RolePermissionSchema = new EntitySchema<IRolePermission>({
  name: "RolePermission",
  tableName: "role_permissions",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: "increment",
    },
    role: {
      type: "enum",
      enum: UserRole,
      nullable: false,
    },
    permissionKey: {
      type: "varchar",
      nullable: false,
    },
    granted: {
      type: "boolean",
      default: false,
      nullable: false,
    },
    updatedAt: {
      type: "timestamp with time zone",
      updateDate: true,
    },
  },
  uniques: [
    {
      name: "UQ_ROLE_PERMISSION",
      columns: ["role", "permissionKey"],
    },
  ],
});
