import { UserRole } from "@/lib/enums";

export type Permission =
  | "recruitmentJobCreate"
  | "recruitmentJobRead"
  | "recruitmentJobUpdate"
  | "recruitmentJobDelete"
  | "recruitmentCandidateCreate"
  | "recruitmentCandidateRead"
  | "recruitmentCandidateUpdate"
  | "recruitmentCandidateDelete"
  | "recruitmentProfileCreate"
  | "recruitmentProfileRead"
  | "recruitmentProfileUpdate"
  | "recruitmentProfileDelete";

export type PermissionSet = Record<Permission, boolean>;
export type RolePermissions = Record<UserRole, PermissionSet>;

export interface PermissionMeta {
  label: string;
  description: string;
  icon: string;
  category: "pipeline" | "jobs" | "profiles";
  crudType: "C" | "R" | "U" | "D";
  danger?: boolean;
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  recruitmentCandidateCreate: {
    label: "Create Candidate",
    description: "recruitment:candidate:create",
    icon: "fa-user-plus",
    category: "pipeline",
    crudType: "C",
  },
  recruitmentCandidateRead: {
    label: "Read Candidate",
    description: "recruitment:candidate:read",
    icon: "fa-user-shield",
    category: "pipeline",
    crudType: "R",
  },
  recruitmentCandidateUpdate: {
    label: "Update Candidate",
    description: "recruitment:candidate:update",
    icon: "fa-user-pen",
    category: "pipeline",
    crudType: "U",
  },
  recruitmentCandidateDelete: {
    label: "Delete Candidate",
    description: "recruitment:candidate:delete",
    icon: "fa-user-minus",
    category: "pipeline",
    crudType: "D",
    danger: true,
  },
  recruitmentJobCreate: {
    label: "Create Job",
    description: "recruitment:job:create",
    icon: "fa-circle-plus",
    category: "jobs",
    crudType: "C",
  },
  recruitmentJobRead: {
    label: "Read Job",
    description: "recruitment:job:read",
    icon: "fa-eye",
    category: "jobs",
    crudType: "R",
  },
  recruitmentJobUpdate: {
    label: "Update Job",
    description: "recruitment:job:update",
    icon: "fa-pen-to-square",
    category: "jobs",
    crudType: "U",
  },
  recruitmentJobDelete: {
    label: "Delete Job",
    description: "recruitment:job:delete",
    icon: "fa-trash-can",
    category: "jobs",
    crudType: "D",
    danger: true,
  },
  recruitmentProfileCreate: {
    label: "Create Profile",
    description: "identity:profile:create",
    icon: "fa-folder-plus",
    category: "profiles",
    crudType: "C",
  },
  recruitmentProfileRead: {
    label: "Read Profile",
    description: "identity:profile:read",
    icon: "fa-folder-open",
    category: "profiles",
    crudType: "R",
  },
  recruitmentProfileUpdate: {
    label: "Update Profile",
    description: "identity:profile:update",
    icon: "fa-folder-minus",
    category: "profiles",
    crudType: "U",
  },
  recruitmentProfileDelete: {
    label: "Delete Profile",
    description: "identity:profile:delete",
    icon: "fa-folder-tree",
    category: "profiles",
    crudType: "D",
    danger: true,
  },
};

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pipeline: { label: "Candidates & Applications", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" },
  jobs:     { label: "Job Requisitions",         color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
  profiles: { label: "Profiles & Permissions",   color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" },
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
    recruitmentJobCreate:       true,
    recruitmentJobRead:         true,
    recruitmentJobUpdate:       true,
    recruitmentJobDelete:       true,
    recruitmentCandidateCreate:  true,
    recruitmentCandidateRead:    true,
    recruitmentCandidateUpdate:  true,
    recruitmentCandidateDelete:  true,
    recruitmentProfileCreate:    true,
    recruitmentProfileRead:      true,
    recruitmentProfileUpdate:    true,
    recruitmentProfileDelete:    true,
  },
  [UserRole.RECRUITER]: {
    recruitmentJobCreate:       true,
    recruitmentJobRead:         true,
    recruitmentJobUpdate:       true,
    recruitmentJobDelete:       false,
    recruitmentCandidateCreate:  true,
    recruitmentCandidateRead:    true,
    recruitmentCandidateUpdate:  true,
    recruitmentCandidateDelete:  false,
    recruitmentProfileCreate:    false,
    recruitmentProfileRead:      true,
    recruitmentProfileUpdate:    false,
    recruitmentProfileDelete:    false,
  },
  [UserRole.HIRING_MANAGER]: {
    recruitmentJobCreate:       false,
    recruitmentJobRead:         true,
    recruitmentJobUpdate:       false,
    recruitmentJobDelete:       false,
    recruitmentCandidateCreate:  false,
    recruitmentCandidateRead:    true,
    recruitmentCandidateUpdate:  true,
    recruitmentCandidateDelete:  false,
    recruitmentProfileCreate:    false,
    recruitmentProfileRead:      true,
    recruitmentProfileUpdate:    false,
    recruitmentProfileDelete:    false,
  },
  [UserRole.READ_ONLY]: {
    recruitmentJobCreate:       false,
    recruitmentJobRead:         true,
    recruitmentJobUpdate:       false,
    recruitmentJobDelete:       false,
    recruitmentCandidateCreate:  false,
    recruitmentCandidateRead:    true,
    recruitmentCandidateUpdate:  false,
    recruitmentCandidateDelete:  false,
    recruitmentProfileCreate:    false,
    recruitmentProfileRead:      true,
    recruitmentProfileUpdate:    false,
    recruitmentProfileDelete:    false,
  },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_META) as Permission[];
export const EDITABLE_ROLES = [UserRole.RECRUITER, UserRole.HIRING_MANAGER, UserRole.READ_ONLY];

export const BACKEND_PERM_MAP: Record<Permission, string[]> = {
  recruitmentJobCreate:       ["recruitment:job:create"],
  recruitmentJobRead:         ["recruitment:job:read"],
  recruitmentJobUpdate:       ["recruitment:job:update"],
  recruitmentJobDelete:       ["recruitment:job:delete"],
  recruitmentCandidateCreate: ["recruitment:candidate:create"],
  recruitmentCandidateRead:   ["recruitment:candidate:read"],
  recruitmentCandidateUpdate: ["recruitment:candidate:update"],
  recruitmentCandidateDelete: ["recruitment:candidate:delete"],
  recruitmentProfileCreate:    ["identity:profile:create"],
  recruitmentProfileRead:      ["identity:profile:read"],
  recruitmentProfileUpdate:    ["identity:profile:update"],
  recruitmentProfileDelete:    ["identity:profile:delete"],
};
