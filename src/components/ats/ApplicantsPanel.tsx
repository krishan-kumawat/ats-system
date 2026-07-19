"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { fetchApplicantsAction, Applicant } from "@/app/actions/data";
import {
  fetchHiringManagerUsersAction,
  reassignApplicantHMAction,
  UserOption,
} from "@/app/actions/assignments";
import { ROLE_META } from "@/lib/permissions";
import { UserRole } from "@/lib/enums";
import { Job } from "@/lib/atsStore";
import { SessionPayload } from "@/lib/auth-config";

const STAGE_COLORS: Record<string, string> = {
  Applied:      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  Screening:    "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  Interviewing: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  Offer:        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
};

const REC_COLORS: Record<string, string> = {
  STRONG_HIRE:    "text-emerald-600 dark:text-emerald-400",
  HIRE:           "text-blue-600 dark:text-blue-400",
  NO_HIRE:        "text-amber-600 dark:text-amber-400",
  STRONG_NO_HIRE: "text-red-600 dark:text-red-400",
};

const REC_LABELS: Record<string, string> = {
  STRONG_HIRE:    "Strong Hire",
  HIRE:           "Hire",
  NO_HIRE:        "No Hire",
  STRONG_NO_HIRE: "Strong No Hire",
};

interface ApplicantsPanelProps {
  jobs: Job[];
  user: SessionPayload;
  onOpenCandidate: (applicationId: string) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

// ─── Change HM Modal ──────────────────────────────────────────────────────────

interface ChangeHMModalProps {
  applicant: Applicant;
  hmUsers: UserOption[];
  onClose: () => void;
  onSaved: (applicationId: string, hm: UserOption) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

function ChangeHMModal({ applicant, hmUsers, onClose, onSaved, onToast }: ChangeHMModalProps) {
  const [query, setQuery]               = useState("");
  const [selected, setSelected]         = useState<UserOption | null>(null);
  const [open, setOpen]                 = useState(false);
  const [saving, setSaving]             = useState(false);
  const comboRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = hmUsers.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  async function handleSave() {
    if (!selected) {
      onToast("Missing Selection", "Please select a Hiring Manager.", "ban");
      return;
    }
    setSaving(true);
    const result = await reassignApplicantHMAction(applicant.applicationId, selected.id);
    if (result.error) {
      onToast("Error", result.error, "ban");
      setSaving(false);
      return;
    }
    onSaved(applicant.applicationId, selected);
    onToast("HM Reassigned", `${applicant.name} is now assigned to ${selected.name}.`, "user-tie");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600/10 dark:bg-rose-500/20 flex items-center justify-center">
              <i className="fa-solid fa-user-tie text-rose-600 dark:text-rose-400 text-sm" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Change Hiring Manager</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Applicant summary */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {applicant.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{applicant.name}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{applicant.jobTitle || "No job"}</p>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-[10px] text-slate-400">Current HM</p>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{applicant.hiringManager || "—"}</p>
            </div>
          </div>

          {/* HM combobox */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              New Hiring Manager <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={comboRef}>
              <div className="relative">
                <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onFocus={() => setOpen(true)}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
                  placeholder="Search by name or email…"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-8 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-[10px]`} />
                </button>
              </div>
              {open && (
                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-slate-400 text-center">No users match</li>
                  ) : filtered.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => { setSelected(u); setQuery(u.name); setOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2.5 ${selected?.id === u.id ? "bg-rose-50 dark:bg-rose-950/30" : ""}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${ROLE_META[u.role]?.bg ?? ""} ${ROLE_META[u.role]?.color ?? ""}`}>
                          {ROLE_META[u.role]?.label ?? u.role}
                        </span>
                        {selected?.id === u.id && <i className="fa-solid fa-check text-rose-500 text-[10px] flex-shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selected && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                <span className="text-[10px] text-slate-500">{selected.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
          >
            {saving ? (
              <><i className="fa-solid fa-circle-notch fa-spin" /><span>Saving…</span></>
            ) : (
              <><i className="fa-solid fa-user-pen" /><span>Reassign HM</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function ApplicantsPanel({ jobs, user, onOpenCandidate, onToast }: ApplicantsPanelProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [applicants, setApplicants]       = useState<Applicant[]>([]);
  const [search, setSearch]               = useState("");
  const [stageFilter, setStageFilter]     = useState<string>("all");
  const [isPending, startTransition]      = useTransition();
  const [hmUsers, setHmUsers]             = useState<UserOption[]>([]);
  const [changeHMTarget, setChangeHMTarget] = useState<Applicant | null>(null);

  const canChangeHM =
    user.role === UserRole.ADMIN;

  // Fetch HM users once for the modal (only if allowed)
  useEffect(() => {
    if (canChangeHM) {
      fetchHiringManagerUsersAction().then(setHmUsers);
    }
  }, [canChangeHM]);

  // Reload applicants whenever job filter changes
  useEffect(() => {
    startTransition(async () => {
      const data = await fetchApplicantsAction(
        selectedJobId === "all" ? undefined : selectedJobId
      );
      setApplicants(data);
    });
  }, [selectedJobId]);

  function handleHMSaved(applicationId: string, hm: UserOption) {
    setApplicants((prev) =>
      prev.map((a) =>
        a.applicationId === applicationId
          ? { ...a, hiringManager: hm.name, assignedHiringManagerId: hm.id, assignedHiringManagerName: hm.name }
          : a
      )
    );
  }

  const filtered = applicants.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchStage = stageFilter === "all" || a.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stages = ["all", "Applied", "Screening", "Interviewing", "Offer"];

  return (
    <>
      <div className="flex flex-col h-full gap-4">

        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <i className="fa-solid fa-users text-indigo-600 dark:text-indigo-400" />
              All Applicants
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isPending ? "Loading…" : `${filtered.length} applicant${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Job filter */}
            <div className="relative">
              <i className="fa-solid fa-briefcase absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[200px]"
              >
                <option value="all">All Job Requisitions</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>

            {/* Search */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, email, skill…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
              />
            </div>
          </div>
        </div>

        {/* Stage pills */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {stages.map((s) => {
            const count = s === "all" ? applicants.length : applicants.filter((a) => a.stage === s).length;
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  stageFilter === s
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {s === "all" ? "All Stages" : s}
                <span className={`ml-1.5 ${stageFilter === s ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isPending ? (
            <div className="flex items-center justify-center h-40 gap-3 text-slate-400 dark:text-slate-500">
              <i className="fa-solid fa-circle-notch fa-spin text-lg text-indigo-500" />
              <span className="text-sm">Fetching from database…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
              <i className="fa-solid fa-user-slash text-2xl" />
              <p className="text-sm">No applicants match the current filters</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Candidate</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden sm:table-cell">Job Requisition</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Stage</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden md:table-cell">Hiring Manager</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden lg:table-cell">Skills</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden lg:table-cell">Expected Salary</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden xl:table-cell">Scorecard</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden xl:table-cell">Applied</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((a) => (
                  <tr key={a.applicationId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">

                    {/* Candidate */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{a.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Job */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{a.jobTitle || "—"}</p>
                      <p className="text-[11px] text-slate-400">{a.department}</p>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${STAGE_COLORS[a.stage] ?? STAGE_COLORS.Applied}`}>
                        {a.stage}
                      </span>
                    </td>

                    {/* Hiring Manager */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {a.hiringManager || "—"}
                          </p>
                          {a.assignedHiringManagerId && (
                            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Reassigned</p>
                          )}
                        </div>
                        {canChangeHM && (
                          <button
                            onClick={() => setChangeHMTarget(a)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Change Hiring Manager"
                          >
                            <i className="fa-solid fa-user-pen text-[11px]" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Skills */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {a.skills.slice(0, 3).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-medium">{s}</span>
                        ))}
                        {a.skills.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px]">+{a.skills.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Salary */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {a.expectedSalary ? `$${a.expectedSalary.toLocaleString("en-US")}` : "—"}
                      </span>
                    </td>

                    {/* Recommendation */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {a.recommendation ? (
                        <span className={`text-[11px] font-semibold ${REC_COLORS[a.recommendation] ?? "text-slate-400"}`}>
                          {REC_LABELS[a.recommendation] ?? a.recommendation}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 dark:text-slate-600">Pending</span>
                      )}
                    </td>

                    {/* Applied */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-slate-400 dark:text-slate-500">{a.appliedAt || "—"}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canChangeHM && (
                          <button
                            onClick={() => setChangeHMTarget(a)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/70 whitespace-nowrap"
                          >
                            <i className="fa-solid fa-user-pen mr-1" />
                            Change HM
                          </button>
                        )}
                        <button
                          onClick={() => onOpenCandidate(a.applicationId)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/70"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Change HM Modal */}
      {changeHMTarget && (
        <ChangeHMModal
          applicant={changeHMTarget}
          hmUsers={hmUsers}
          onClose={() => setChangeHMTarget(null)}
          onSaved={handleHMSaved}
          onToast={onToast}
        />
      )}
    </>
  );
}
