"use client";

import { AuditEntry } from "@/lib/atsStore";

const ACTION_STYLES: Record<string, string> = {
  INGESTED_PROFILE:
    "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900",
  STAGE_TRANSITION:
    "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900",
  OFFER_APPROVED:
    "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900",
  OFFER_REJECTED:
    "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900",
  LOGGED_SCORECARD:
    "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900",
  CREATED_JOB:
    "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800",
};

interface AuditLogPanelProps {
  logs: AuditEntry[];
}

export default function AuditLogPanel({ logs }: AuditLogPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-indigo-600 dark:text-indigo-400" />
            Append-Only System Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logs sensitive database modifications in real-time.
          </p>
        </div>
        <span
          className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          DB Integrity Intact
        </span>
      </div>

      <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/45 rounded-2xl p-4 space-y-2.5 shadow-inner">
        {[...logs].reverse().map((log, i) => {
          const actionClass =
            ACTION_STYLES[log.action] ??
            "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800";

          return (
            <div
              key={i}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-sm"
            >
              <div className="flex items-start md:items-center gap-4 flex-1">
                <span
                  className="text-slate-500 dark:text-slate-500 text-[10px] w-20 flex-shrink-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {log.timestamp}
                </span>
                <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                  <span
                    className={`${actionClass} text-[10px] px-2 py-0.5 rounded font-bold w-40 text-center flex-shrink-0`}
                  >
                    {log.action}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold w-44 flex-shrink-0 truncate">
                    {log.target}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{log.notes}</span>
                </div>
              </div>
              <div
                className="text-[10px] text-slate-500 dark:text-slate-500 flex-shrink-0"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Actor: {log.user}
              </div>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-slate-400 dark:text-slate-600">
            No audit entries recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
