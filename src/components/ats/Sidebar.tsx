"use client";

import { Role, Tab } from "@/lib/atsStore";
import { UserRole } from "@/lib/enums";
import { ROLE_META } from "@/lib/permissions";
import { usePermissions } from "@/context/PermissionsContext";

interface SidebarProps {
  role: Role;
  userRole: UserRole;
  tab: string; // Changed to string to support dynamic tab strings
  candidateCount: number;
  jobCount: number;
  permissions: {
    canViewJobs?: boolean;
    canViewCandidates?: boolean;
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
  onTabChange: (tab: any) => void;
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
  onToast,
}: SidebarProps) {
  const { navigationTabs, loading } = usePermissions();
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
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading tabs...</div>
            ) : (
              navigationTabs.map((tabItem) => {
                let icon = "fa-solid fa-folder";
                if (tabItem.iconName === "briefcase") icon = "fa-solid fa-briefcase";
                else if (tabItem.iconName === "users") icon = "fa-solid fa-users";
                else if (tabItem.iconName === "layers") icon = "fa-solid fa-layer-group";
                else if (tabItem.iconName === "settings") icon = "fa-solid fa-users-gear";
                else if (tabItem.iconName === "shield") icon = "fa-solid fa-user-shield";
                else if (tabItem.iconName === "git-merge") icon = "fa-solid fa-network-wired";
                else if (tabItem.iconName === "bar-chart-2") icon = "fa-solid fa-chart-line";
                else if (tabItem.iconName === "file-text") icon = "fa-solid fa-shield-halved";

                const isTabActive =
                  (tab || "").toLowerCase() === (tabItem.apiName || "").toLowerCase() ||
                  (tab || "").toLowerCase() === `${(tabItem.apiName || "").toLowerCase()}s` ||
                  (tabItem.apiName === "Candidate" && tab === "pipeline");

                return (
                  <button
                    key={tabItem.apiName}
                    onClick={() => {
                      window.location.href = tabItem.route;
                    }}
                    className={isTabActive ? active : inactive}
                  >
                    <span className="flex items-center gap-3">
                      <i className={icon} />
                      <span>{tabItem.label}</span>
                    </span>
                    {tabItem.apiName === "Job" && (
                      <span className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 font-bold">
                        {jobCount}
                      </span>
                    )}
                    {tabItem.apiName === "Candidate" && (
                      <span className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 font-bold">
                        {candidateCount}
                      </span>
                    )}
                  </button>
                );
              })
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
