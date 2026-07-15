"use client";

import { useActionState } from "react";
import { loginAction, LoginState } from "@/app/actions/auth";
import { USERS } from "@/lib/auth-config";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <i className="fa-solid fa-users-gear text-3xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            OrgATS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise Command v1.2 — Internal Access Only
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            Sign in to your account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Use your assigned internal credentials to continue.
          </p>

          <form action={formAction} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                  <i className="fa-solid fa-envelope text-xs" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@orgats.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                  <i className="fa-solid fa-lock text-xs" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Error message */}
            {state.error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-xs font-medium">
                <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 mt-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials table */}
        <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Demo Credentials — Test Users
          </p>

          {/* Group by role */}
          {(["FOUNDER","RECRUITER","ADMIN","HIRING_MANAGER"] as const).map((roleKey) => {
            const roleUsers = USERS.filter((u) => u.role === roleKey);
            if (roleUsers.length === 0) return null;

            const roleStyles: Record<string, { badge: string; desc: string }> = {
              FOUNDER:        { badge: "bg-indigo-100 text-indigo-700",   desc: "Full access · Approves offers · Manages permissions" },
              RECRUITER:      { badge: "bg-emerald-100 text-emerald-700", desc: "Add jobs · Ingest candidates · Move pipeline" },
              ADMIN:          { badge: "bg-amber-100 text-amber-700",     desc: "Add jobs · View audit log · No offer approval" },
              HIRING_MANAGER: { badge: "bg-violet-100 text-violet-700",   desc: "Edit scorecards · View analytics only" },
            };
            const style = roleStyles[roleKey];

            return (
              <div key={roleKey} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
                    {roleKey.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{style.desc}</span>
                </div>
                <div className="space-y-1.5 pl-1">
                  {roleUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{u.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                        {u.password}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-6">
          Unauthorized access is strictly prohibited. All sessions are logged.
        </p>
      </div>
    </div>
  );
}
