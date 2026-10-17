"use client";

import { SessionPayload } from "@/lib/auth-config";
import { UserRole } from "@/lib/enums";
import { ROLE_META } from "@/lib/permissions";

interface HomePanelProps {
  user: SessionPayload & {
    profile?: {
      id: string;
      name: string;
      permissions?: Record<string, any>;
    };
  };
  onNavigate?: (tab: string) => void;
}

export default function HomePanel({ user, onNavigate }: HomePanelProps) {
  const roleMeta = ROLE_META[user.role as UserRole] || {
    label: String(user.role || "User"),
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    icon: "fa-user",
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 overflow-y-auto space-y-6 max-w-6xl w-full mx-auto animate-in fade-in duration-200">
      {/* 1. WELCOME HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-xs text-indigo-200 border border-white/10">
              <i className="fa-solid fa-calendar-day text-[11px]" />
              <span>{currentDate}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome to OrgATS, {user.name || user.email}!
            </h1>
            <p className="text-sm text-indigo-200 max-w-xl">
              Your centralized hiring and applicant tracking command center. Everything you need to manage candidate pipelines, review applications, and coordinate hiring.
            </p>
          </div>

          {/* User badge pill */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-xl self-start md:self-auto flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-white/20 flex items-center justify-center text-white text-base">
              <i className={`fa-solid ${roleMeta.icon}`} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                Current Role
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{roleMeta.label}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PLACEHOLDER / DASHBOARD WORKSPACE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
          <i className="fa-solid fa-house-chimney text-2xl" />
        </div>

        <div className="max-w-md space-y-1.5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Home Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Personalized metrics, candidate activity feeds, and recruitment widgets are being prepared and will appear here on your home dashboard.
          </p>
        </div>

        {/* Quick Launchpad Shortcuts */}
        {onNavigate && (
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("pipeline")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-layer-group text-xs" />
              <span>Go to Candidate Pipeline</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-chart-line text-xs" />
              <span>Hiring Analytics</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
