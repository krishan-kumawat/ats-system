import { UserRole } from "@/lib/enums";

export type Permission =
  | "canAddJob"
  | "canIngestCandidate"
  | "canDragPipeline"
  | "canViewAuditLog"
  | "canApproveOffer"
  | "canViewAnalytics"
  | "canEditScorecard"
  | "canManagePermissions"
  | "canAssignJobs";

export type PermissionSet = Record<Permission, boolean>;
export type RolePermissions = Record<UserRole, PermissionSet>;

export interface PermissionMeta {
  label: string;
  description: string;
  icon: string;
  category: "pipeline" | "jobs" | "access" | "admin";
  danger?: boolean;
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  canAddJob: {
    label: "Create Job Requisitions",
    description: "Add new job postings and requisitions",
    icon: "fa-briefcase",
    category: "jobs",
  },
  canIngestCandidate: {
    label: "Ingest Candidates",
    description: "Upload resumes and add new candidates",
    icon: "fa-user-plus",
    category: "pipeline",
  },
  canDragPipeline: {
    label: "Move Pipeline Stages",
    description: "Drag & drop candidates between stages",
    icon: "fa-arrows-up-down-left-right",
    category: "pipeline",
  },
  canViewAuditLog: {
    label: "View Audit Log",
    description: "Access the system security audit log",
    icon: "fa-shield-halved",
    category: "access",
  },
  canApproveOffer: {
    label: "Approve Offers",
    description: "Sign-off on candidate compensation packages",
    icon: "fa-signature",
    category: "admin",
    danger: true,
  },
  canViewAnalytics: {
    label: "View Analytics",
    description: "Access talent ROI analytics panel",
    icon: "fa-chart-line",
    category: "access",
  },
  canEditScorecard: {
    label: "Edit Scorecards",
    description: "Fill and submit evaluation scorecards",
    icon: "fa-clipboard-check",
    category: "pipeline",
  },
  canManagePermissions: {
    label: "Manage Permissions",
    description: "Control role-based access settings",
    icon: "fa-user-shield",
    category: "admin",
    danger: true,
  },
  canAssignJobs: {
    label: "Assign Job Requisitions",
    description: "Assign job responsibilities to subordinate users",
    icon: "fa-user-tag",
    category: "jobs",
    danger: false,
  },
};

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pipeline: { label: "Pipeline", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" },
  jobs:     { label: "Jobs",     color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
  access:   { label: "Access",   color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" },
  admin:    { label: "Admin",    color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40" },
};

export const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; icon: string }> = {
  [UserRole.FOUNDER]: {
    label: "Founder",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-100 dark:bg-indigo-950",
    icon: "fa-chess-king",
  },
  [UserRole.RECRUITER]: {
    label: "Recruiter",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950",
    icon: "fa-id-badge",
  },
  [UserRole.ADMIN]: {
    label: "Admin",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950",
    icon: "fa-screwdriver-wrench",
  },
  [UserRole.HIRING_MANAGER]: {
    label: "Hiring Mgr",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950",
    icon: "fa-user-tie",
  },
  [UserRole.HEAD_OF_HR]: {
    label: "Head of HR",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-950",
    icon: "fa-user-gear",
  },
};

// Permissions the Founder always has and which can never be revoked
export const FOUNDER_LOCKED_PERMISSIONS = new Set<Permission>([
  "canApproveOffer",
  "canManagePermissions",
  "canViewAuditLog",
]);

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.FOUNDER]: {
    canAddJob:            true,
    canIngestCandidate:   true,
    canDragPipeline:      true,
    canViewAuditLog:      true,
    canApproveOffer:      true,
    canViewAnalytics:     true,
    canEditScorecard:     true,
    canManagePermissions: true,
    canAssignJobs:        true,
  },
  [UserRole.RECRUITER]: {
    canAddJob:            true,
    canIngestCandidate:   true,
    canDragPipeline:      true,
    canViewAuditLog:      false,
    canApproveOffer:      false,
    canViewAnalytics:     true,
    canEditScorecard:     false,
    canManagePermissions: false,
    canAssignJobs:        false,
  },
  [UserRole.ADMIN]: {
    canAddJob:            true,
    canIngestCandidate:   true,
    canDragPipeline:      true,
    canViewAuditLog:      true,
    canApproveOffer:      false,
    canViewAnalytics:     true,
    canEditScorecard:     false,
    canManagePermissions: false,
    canAssignJobs:        false,
  },
  [UserRole.HIRING_MANAGER]: {
    canAddJob:            false,
    canIngestCandidate:   false,
    canDragPipeline:      false,
    canViewAuditLog:      false,
    canApproveOffer:      false,
    canViewAnalytics:     true,
    canEditScorecard:     true,
    canManagePermissions: false,
    canAssignJobs:        false,
  },
  [UserRole.HEAD_OF_HR]: {
    canAddJob:            true,
    canIngestCandidate:   true,
    canDragPipeline:      true,
    canViewAuditLog:      true,
    canApproveOffer:      false,
    canViewAnalytics:     true,
    canEditScorecard:     true,
    canManagePermissions: false,
    canAssignJobs:        true,
  },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_META) as Permission[];
export const EDITABLE_ROLES = [UserRole.RECRUITER, UserRole.ADMIN, UserRole.HIRING_MANAGER, UserRole.HEAD_OF_HR];
