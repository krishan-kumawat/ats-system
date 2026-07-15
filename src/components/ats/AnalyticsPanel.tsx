"use client";

import { Candidate } from "@/lib/atsStore";

interface AnalyticsPanelProps {
  candidates: Candidate[];
  totalBudget: number;
}

export default function AnalyticsPanel({ candidates, totalBudget }: AnalyticsPanelProps) {
  const allocated = candidates
    .filter((c) => c.stage !== "Offer" || c.founderApproval.status !== "REJECTED")
    .reduce((acc, c) => acc + (c.proposedSalary || c.expectedSalary || 0), 0);

  const remaining = totalBudget - allocated;
  const budgetPct = Math.min((allocated / totalBudget) * 100, 100);

  const stageBreakdown = ["Applied", "Screening", "Interviewing", "Offer"].map((stage) => ({
    stage,
    count: candidates.filter((c) => c.stage === stage).length,
  }));

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-y-auto pb-4">
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <i className="fa-solid fa-chart-line text-indigo-600 dark:text-indigo-400" />
          Org Recruitment &amp; Cost Analytics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Real-time budget deductions and pipeline flow tracking.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Remaining Runrate Budget
          </p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            ${remaining.toLocaleString("en-US")}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Calculated directly from active applicant salary requirements.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Allocated Budget
          </p>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            ${allocated.toLocaleString("en-US")}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Combined allocations of active loops and offer letters.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Overall Pipeline Health
          </p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {candidates.length} Candidates
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Total volume of manual PDF submissions processed.
          </p>
        </div>
      </div>

      {/* Budget bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Q3 Headcount Allocation Progress
          </h3>
          <span
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {budgetPct.toFixed(1)}% Limit Used
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-900">
          <div
            className={`h-full transition-all duration-300 ${
              budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500"
            }`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>$0.00 base</span>
          <span>Budget Limit Ceiling: ${totalBudget.toLocaleString("en-US")}</span>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          Pipeline Stage Distribution
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {stageBreakdown.map(({ stage, count }) => (
            <div
              key={stage}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{count}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                {stage}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
