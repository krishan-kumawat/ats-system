"use client";

import { useTransition } from "react";
import { Role } from "@/lib/atsStore";
import { SessionPayload } from "@/lib/auth-config";
import { logoutAction } from "@/app/actions/auth";
import { UserRole } from "@/lib/enums";

interface HeaderProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  allocated: number;
  totalBudget: number;
  user: SessionPayload;
  onToast: (title: string, msg: string, icon?: string) => void;
}

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  [UserRole.FOUNDER]: {
    label: "Founder",
    cls: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400",
  },
  [UserRole.RECRUITER]: {
    label: "Recruiter",
    cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
  },
  [UserRole.ADMIN]: {
    label: "Admin",
    cls: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  },
  [UserRole.HIRING_MANAGER]: {
    label: "Hiring Mgr",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  },
  [UserRole.HEAD_OF_HR]: {
    label: "Head of HR",
    cls: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
  },
};

export default function Header({
  role,
  onRoleChange,
  theme,
  onThemeToggle,
  allocated,
  totalBudget,
  user,
  onToast,
}: HeaderProps) {
  const isOver = allocated > totalBudget;
  const [isPending, startTransition] = useTransition();
  const badge = ROLE_BADGE[user.role];
  const isFounder = user.role === UserRole.FOUNDER;

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 transition-colors duration-200">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-500/30">
          <i className="fa-solid fa-users-gear text-xl" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none tracking-tight text-slate-800 dark:text-slate-100">
            OrgATS{" "}
            <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium ml-1">
              Enterprise Command v1.2
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Multi-Persona Internal Sourcing System
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Budget pill */}
        <div
          className={`${
            isOver
              ? "bg-red-50 dark:bg-slate-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400"
              : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          } border rounded-lg py-1 px-3 flex items-center gap-2 text-xs transition-colors duration-200`}
        >
          <span className={`w-2 h-2 rounded-full ${isOver ? "bg-red-500" : "bg-emerald-500"}`} />
          <span className="text-slate-500 dark:text-slate-400">Headcount Budget:</span>
          <span className="font-semibold">
            ${allocated.toLocaleString("en-US")} / ${totalBudget.toLocaleString("en-US")} allocated
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-900 transition-all flex items-center justify-center shadow-inner"
          title="Toggle Theme"
        >
          <i className={theme === "dark" ? "fa-solid fa-sun text-amber-500" : "fa-solid fa-moon text-indigo-600"} />
        </button>

        {/* Role view switcher — only meaningful for Founders */}
        <div className="bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1 shadow-inner">
          {/* HR Recruiter tab — always clickable */}
          <button
            onClick={() => onRoleChange("recruiter")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              role === "recruiter"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <i className={`fa-solid fa-id-badge ${role === "recruiter" ? "text-indigo-200" : ""}`} />
            <span>HR Recruiter</span>
          </button>

          {/* Founder Executive tab — enabled only for actual Founders */}
          <button
            onClick={() => {
              if (!isFounder) {
                onToast("Access Restricted", "Founder Executive view is only available to Founders.", "chess-king");
                return;
              }
              onRoleChange("founder");
            }}
            title={!isFounder ? "Only Founder accounts can switch to this view" : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              role === "founder" && isFounder
                ? "bg-indigo-600 text-white shadow-sm"
                : isFounder
                ? "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                : "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
            }`}
          >
            <i className={`fa-solid fa-chess-king ${!isFounder ? "text-slate-400 dark:text-slate-600" : ""}`} />
            <span>Founder Executive</span>
            {!isFounder && (
              <i className="fa-solid fa-lock text-[9px] text-slate-400 dark:text-slate-600" />
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* User identity + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                {user.name}
              </p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 inline-block ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-800 transition-all disabled:opacity-50"
            title="Sign out"
          >
            <i className="fa-solid fa-right-from-bracket" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
