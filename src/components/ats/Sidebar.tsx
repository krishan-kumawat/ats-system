"use client";

import { Role, Tab } from "@/lib/atsStore";
import { UserRole } from "@/lib/enums";
import { ROLE_META } from "@/lib/permissions";
interface SidebarProps {
  role: Role;
  userRole: UserRole;
  tab: Tab;
  candidateCount: number;
  jobCount: number;
  permissions: {
    canAddJob: boolean;
    canIngestCandidate: boolean;
    canDragPipeline: boolean;
    canViewAuditLog: boolean;
    canApproveOffer: boolean;
    canViewAnalytics: boolean;
    canEditScorecard: boolean;
    canManagePermissions: boolean;
    canAssignJobs: boolean;
  };
  onTabChange: (tab: Tab) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function Sidebar({
  role,
  userRole,
  tab,
  candidateCount,
  jobCount,
  permissions,
  onTabChange,
}: SidebarProps) {
  const isAdmin = userRole === UserRole.ADMIN;
  const roleMeta = ROLE_META[userRole] || {
    label: String(userRole),
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: "fa-user",
  };

  const active =
    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400";
  const inactive =
    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50";

  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col flex-shrink-0 justify-between transition-colors duration-200">
      <div className="p-4 space-y-5">

        {/* User identity card */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {/* name initial shown via parent — we don't have name here, use role icon */}
            <i className={`fa-solid ${roleMeta.icon} text-xs`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Signed in as</p>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${roleMeta.bg} ${roleMeta.color}`}>
              {roleMeta.label}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
            Navigation
          </div>
          <nav className="space-y-1">

            {/* Pipeline — always visible */}
            <button onClick={() => onTabChange("pipeline")} className={tab === "pipeline" ? active : inactive}>
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-rectangle-list" />
                <span>Recruitment Board</span>
              </span>
              <span className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 font-bold">
                {candidateCount}
              </span>
            </button>

            {/* Jobs */}
            <button onClick={() => onTabChange("jobs")} className={tab === "jobs" ? active : inactive}>
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-briefcase" />
                <span>Job Requisitions</span>
              </span>
              <span className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 font-bold">
                {jobCount}
              </span>
            </button>

            {/* Applicants */}
            <button onClick={() => onTabChange("applicants")} className={tab === "applicants" ? active : inactive}>
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-users" />
                <span>All Applicants</span>
              </span>
              <span className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 font-bold">
                {candidateCount}
              </span>
            </button>

            {/* Analytics — hidden if no permission */}
            {permissions.canViewAnalytics && (
              <button onClick={() => onTabChange("analytics")} className={tab === "analytics" ? active : inactive}>
                <span className="flex items-center gap-3">
                  <i className="fa-solid fa-chart-line" />
                  <span>Talent ROI Analytics</span>
                </span>
              </button>
            )}

            {/* Audit log — hidden if no permission */}
            {permissions.canViewAuditLog && (
              <button onClick={() => onTabChange("audit")} className={tab === "audit" ? active : inactive}>
                <span className="flex items-center gap-3">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Security Audit Log</span>
                </span>
              </button>
            )}

            {/* Job Assignment — Admin only */}
            {isAdmin && (
              <button onClick={() => onTabChange("assignments")} className={tab === "assignments" ? active : inactive}>
                <span className="flex items-center gap-3">
                  <i className="fa-solid fa-user-tag" />
                  <span>Job Assignments</span>
                </span>
                <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 px-1.5 py-0.5 rounded-md">
                  HR
                </span>
              </button>
            )}

            {/* Permission Manager — admin only */}
            {isAdmin && (
              <button onClick={() => onTabChange("permissions")} className={tab === "permissions" ? active : inactive}>
                <span className="flex items-center gap-3">
                  <i className="fa-solid fa-user-shield" />
                  <span>Permission Manager</span>
                </span>
                <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 px-1.5 py-0.5 rounded-md">
                  ADMIN
                </span>
              </button>
            )}

            {/* User Management — admin only */}
            {isAdmin && (
              <button onClick={() => onTabChange("users")} className={tab === "users" ? active : inactive}>
                <span className="flex items-center gap-3">
                  <i className="fa-solid fa-users-gear" />
                  <span>User Management</span>
                </span>
                <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 px-1.5 py-0.5 rounded-md">
                  ADMIN
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Permission summary card */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
            Your Permissions
          </div>
          <ul className="space-y-1.5">
            {[
              { key: "canAddJob",          label: "Create Jobs" },
              { key: "canIngestCandidate", label: "Ingest Candidates" },
              { key: "canDragPipeline",    label: "Move Pipeline" },
              { key: "canEditScorecard",   label: "Edit Scorecards" },
              { key: "canViewAnalytics",   label: "View Analytics" },
              { key: "canViewAuditLog",    label: "Audit Log" },
              { key: "canApproveOffer",    label: "Approve Offers" },
            ].map(({ key, label }) => {
              const granted = permissions[key as keyof typeof permissions];
              return (
                <li key={key} className="flex items-center gap-2">
                  <i className={`fa-solid ${granted ? "fa-check text-emerald-500" : "fa-lock text-slate-300 dark:text-slate-700"} text-[10px]`} />
                  <span className={`text-[11px] ${granted ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-medium text-slate-700 dark:text-slate-300">Compliance Guideline:</p>
        <p>No browser extension scrapers linked to live profiles. Upload CV files manually.</p>
      </div>
    </aside>
  );
}
