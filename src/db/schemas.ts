// ─── Enums (re-exported from lib/enums) ──────────────────────────────────────

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
  id: number;
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
