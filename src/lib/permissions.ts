import { UserRole } from "@/lib/enums";

export type Permission =
  | "recruitmentJobWrite"
  | "recruitmentJobRead"
  | "recruitmentCandidateWrite"
  | "recruitmentCandidateRead";

export type PermissionSet = Record<Permission, boolean>;
export type RolePermissions = Record<UserRole, PermissionSet>;

export interface PermissionMeta {
  label: string;
  description: string;
  icon: string;
  category: "pipeline" | "jobs";
  danger?: boolean;
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  recruitmentCandidateWrite: {
    label: "Database: Candidate Write",
    description: "recruitment:candidate:write",
    icon: "fa-database",
    category: "pipeline",
  },
  recruitmentCandidateRead: {
    label: "Database: Candidate Read",
    description: "recruitment:candidate:read",
    icon: "fa-database",
    category: "pipeline",
  },
  recruitmentJobWrite: {
    label: "Database: Job Write",
    description: "recruitment:job:write",
    icon: "fa-database",
    category: "jobs",
  },
  recruitmentJobRead: {
    label: "Database: Job Read",
    description: "recruitment:job:read",
    icon: "fa-database",
    category: "jobs",
  },
};

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pipeline: { label: "Pipeline", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" },
  jobs:     { label: "Jobs",     color: "text-emerald-600 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-950/40" },
};

export const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; icon: string }> = {
  [UserRole.ADMIN]: {
    label: "Admin",
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
  [UserRole.HIRING_MANAGER]: {
    label: "Hiring Manager",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950",
    icon: "fa-user-tie",
  },
  [UserRole.READ_ONLY]: {
    label: "Read Only",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-950",
    icon: "fa-eye",
  },
};

export const ADMIN_LOCKED_PERMISSIONS = new Set<Permission>([]);

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: {
    recruitmentJobWrite:        true,
    recruitmentJobRead:         true,
    recruitmentCandidateWrite:  true,
    recruitmentCandidateRead:   true,
  },
  [UserRole.RECRUITER]: {
    recruitmentJobWrite:        true,
    recruitmentJobRead:         true,
    recruitmentCandidateWrite:  true,
    recruitmentCandidateRead:   true,
  },
  [UserRole.HIRING_MANAGER]: {
    recruitmentJobWrite:        false,
    recruitmentJobRead:         true,
    recruitmentCandidateWrite:  false,
    recruitmentCandidateRead:   true,
  },
  [UserRole.READ_ONLY]: {
    recruitmentJobWrite:        false,
    recruitmentJobRead:         true,
    recruitmentCandidateWrite:  false,
    recruitmentCandidateRead:   true,
  },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_META) as Permission[];
export const EDITABLE_ROLES = [UserRole.RECRUITER, UserRole.HIRING_MANAGER, UserRole.READ_ONLY];

export const BACKEND_PERM_MAP: Record<Permission, string[]> = {
  recruitmentJobWrite:        ["recruitment:job:write"],
  recruitmentJobRead:         ["recruitment:job:read"],
  recruitmentCandidateWrite:  ["recruitment:candidate:write"],
  recruitmentCandidateRead:   ["recruitment:candidate:read"],
};
