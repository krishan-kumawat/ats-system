"use client";

import { useRef, useState, useEffect } from "react";
import {
  Candidate,
  Job,
  PipelineStage,
  PIPELINE_STAGES,
  Role,
  AuditEntry,
} from "@/lib/atsStore";
import { PermissionSet } from "@/lib/permissions";

interface PipelineBoardProps {
  candidates: Candidate[];
  jobs: Job[];
  role: Role;
  permissions: PermissionSet;
  onCandidatesChange: (updated: Candidate[]) => void;
  onAuditLog: (entry: AuditEntry) => void;
  onOpenCandidate: (id: string) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onMoveStage?: (candidateId: string, stage: PipelineStage, salary?: number, equity?: number) => Promise<void>;
}

export default function PipelineBoard({
  candidates,
  jobs,
  role,
  permissions,
  onCandidatesChange,
  onAuditLog,
  onOpenCandidate,
  onToast,
  onMoveStage,
}: PipelineBoardProps) {
  const draggingId = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salaryModal, setSalaryModal] = useState<{ candidateId: string } | null>(null);
  const [salaryInput, setSalaryInput] = useState("");
  const [equityInput, setEquityInput] = useState("0.10");
  const [salaryError, setSalaryError] = useState("");

  const activeJobs = jobs.filter((j) => j.status === "OPEN" || j.status === "DRAFT");
  const visibleCandidates =
    selectedJobId === "ALL"
      ? candidates
      : candidates.filter((c) => c.jobId === selectedJobId);

  const selectedJob = activeJobs.find((j) => j.id === selectedJobId) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    (e.currentTarget as HTMLDivElement).style.opacity = "0.4";
  }

  function handleDragEnd(e: React.DragEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).style.opacity = "1";
    draggingId.current = null;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetStage: PipelineStage) {
    e.preventDefault();
    setDragOverStage(null);
    const id = draggingId.current ?? e.dataTransfer.getData("text/plain");
    draggingId.current = null;
    if (!id) return;
    moveCandidate(id, targetStage);
  }

  function moveCandidate(candidateId: string, targetStage: PipelineStage) {
    if (!permissions.canDragPipeline) {
      onToast("Access Denied", "You don't have permission to move pipeline stages.", "lock");
      return;
    }
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand || cand.stage === targetStage) return;

    if (targetStage === "Offer" && cand.founderApproval.status === "NONE") {
      setSalaryInput(String(cand.expectedSalary));
      setEquityInput("0.10");
      setSalaryError("");
      setSalaryModal({ candidateId });
      return;
    }

    applyStageMove(candidateId, targetStage);
  }

  function applyStageMove(candidateId: string, targetStage: PipelineStage) {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;
    const prevStage = cand.stage;
    const updated = candidates.map((c) =>
      c.id === candidateId ? { ...c, stage: targetStage } : c
    );
    onCandidatesChange(updated);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: role === "founder" ? "Founder" : "HRRecruiter_01",
      action: "STAGE_TRANSITION",
      target: cand.name,
      notes: `Dragged & Dropped: ${prevStage} → ${targetStage}.`,
    });
    onToast("Pipeline Drop Complete", `${cand.name} moved to ${targetStage}.`, "check");
    onMoveStage?.(candidateId, targetStage);
  }

  function confirmSalaryModal() {
    const salary = parseFloat(salaryInput.replace(/,/g, ""));
    const equity = parseFloat(equityInput);
    if (!salaryModal || isNaN(salary) || salary <= 0) {
      setSalaryError("Please enter a valid positive salary.");
      return;
    }
    const cand = candidates.find((c) => c.id === salaryModal.candidateId);
    if (!cand) return;

    const updated = candidates.map((c) =>
      c.id === salaryModal.candidateId
        ? {
            ...c,
            stage: "Offer" as PipelineStage,
            proposedSalary: salary,
            proposedEquity: isNaN(equity) ? 0 : equity,
            founderApproval: { ...c.founderApproval, status: "PENDING" as const },
          }
        : c
    );
    onCandidatesChange(updated);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: "HRRecruiter_01",
      action: "STAGE_TRANSITION",
      target: cand.name,
      notes: `Locked state triggered. Budget request ($${salary.toLocaleString("en-US")}) logged for review.`,
    });
    onToast("Lock Gate Triggered", `${cand.name} locked pending Founder sign-off.`, "lock");
    onMoveStage?.(salaryModal.candidateId, "Offer", salary, isNaN(equity) ? 0 : equity);
    setSalaryModal(null);
  }

  function triggerCardShift(candidateId: string, direction: number) {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;
    const idx = PIPELINE_STAGES.indexOf(cand.stage);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= PIPELINE_STAGES.length) return;
    moveCandidate(candidateId, PIPELINE_STAGES[nextIdx]);
  }

  const modalCand = salaryModal ? candidates.find((c) => c.id === salaryModal.candidateId) : null;

  return (
    <>
      {/* Salary Proposal Modal */}
      {salaryModal && modalCand && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Propose Offer Package
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Submitting a salary for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {modalCand.name}
              </span>{" "}
              will lock this card pending Founder approval.
            </p>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Proposed Base Salary (USD)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={salaryInput}
              onChange={(e) => { setSalaryInput(e.target.value); setSalaryError(""); }}
              placeholder="e.g. 150000"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 mb-4"
            />
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Equity Allocation % (e.g. 0.15)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={equityInput}
              onChange={(e) => setEquityInput(e.target.value)}
              placeholder="e.g. 0.10"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            {salaryError && <p className="mt-1 text-xs text-red-600">{salaryError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSalaryModal(null)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSalaryModal}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-medium text-white"
              >
                Lock &amp; Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Toolbar row ── */}
        <div className="flex items-center gap-3 mb-5 flex-shrink-0 flex-wrap">

          {/* Title block */}
          <div className="mr-2">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 leading-none">
              <i className="fa-solid fa-rectangle-list text-indigo-600 dark:text-indigo-400" />
              Recruitment Pipeline Board
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Drag cards between stages · filter by requisition below
            </p>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />

          {/* ── Custom job combobox ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm w-[340px] ${
                dropdownOpen
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/40"
                  : selectedJob
                  ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                dropdownOpen ? "bg-white/20" : "bg-indigo-100 dark:bg-indigo-900/60"
              }`}>
                <i className={`fa-solid fa-briefcase text-[11px] ${dropdownOpen ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`} />
              </div>
              <span className="flex-1 text-left truncate">
                {selectedJob ? selectedJob.title : "All Requisitions"}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  dropdownOpen ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400"
                }`}>
                  {visibleCandidates.length}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-white" : "text-slate-400"}`} />
              </div>
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-200/80 dark:shadow-slate-950/60 z-30 overflow-hidden">
                {/* "All" option */}
                <button
                  onClick={() => { setSelectedJobId("ALL"); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors border-b border-slate-100 dark:border-slate-800 text-left ${
                    selectedJobId === "ALL"
                      ? "bg-indigo-50 dark:bg-indigo-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <i className="fa-solid fa-layer-group text-white text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">All Requisitions</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {candidates.length} total applicant{candidates.length !== 1 ? "s" : ""} across all jobs
                    </p>
                  </div>
                  {selectedJobId === "ALL" && (
                    <i className="fa-solid fa-circle-check text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  )}
                </button>

                {/* Job options */}
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {activeJobs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No active requisitions</p>
                  ) : (
                    activeJobs.map((j, idx) => {
                      const count = candidates.filter((c) => c.jobId === j.id).length;
                      const isSelected = selectedJobId === j.id;
                      const colors = [
                        "from-blue-500 to-indigo-600",
                        "from-emerald-500 to-teal-600",
                        "from-violet-500 to-purple-600",
                        "from-amber-500 to-orange-600",
                        "from-rose-500 to-pink-600",
                      ];
                      const grad = colors[idx % colors.length];
                      return (
                        <button
                          key={j.id}
                          onClick={() => { setSelectedJobId(j.id); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-200 dark:ring-indigo-800"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <span className="text-white text-xs font-black">
                              {j.title.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{j.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{j.department}</span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{j.hiringManager}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              count > 0
                                ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}>
                              {count} applicant{count !== 1 ? "s" : ""}
                            </span>
                            {isSelected && (
                              <i className="fa-solid fa-circle-check text-indigo-500 text-xs" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active filter meta pill */}
          {selectedJob && (
            <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">{selectedJob.department}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-500 dark:text-slate-400">HM: {selectedJob.hiringManager}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">${(selectedJob.budgetLimit / 1000).toFixed(0)}k</span>
              <button
                onClick={() => setSelectedJobId("ALL")}
                className="ml-0.5 w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Clear filter"
              >
                <i className="fa-solid fa-xmark text-[9px]" />
              </button>
            </div>
          )}

          {selectedJobId !== "ALL" && visibleCandidates.length === 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg px-2.5 py-1.5">
              <i className="fa-solid fa-circle-exclamation" />
              No applicants for this requisition yet
            </span>
          )}

          {/* Push Ingest button to the right */}
          <div className="ml-auto">
            {permissions.canIngestCandidate ? (
              <button
                onClick={() => onToast("Open Modal", "__OPEN_ADD_MODAL__", "plus")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <i className="fa-solid fa-plus" /><span>Ingest Candidate</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700">
                <i className="fa-solid fa-lock" /><span>Ingest Candidate</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto min-h-0 pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const colCards = visibleCandidates.filter((c) => c.stage === stage);
            const isOver = dragOverStage === stage;

            return (
              <div
                key={stage}
                data-stage={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                className={`bg-slate-100 dark:bg-slate-900/40 border-2 rounded-2xl flex flex-col min-h-[300px] md:min-h-0 overflow-hidden transition-all duration-150 ${
                  isOver
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                    : "border-transparent border-slate-200 dark:border-slate-900"
                }`}
              >
                {/* Column header */}
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between transition-colors duration-200">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {stage}
                  </span>
                  <span className="bg-slate-200 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-800 font-bold">
                    {colCards.length}
                  </span>
                </div>

                {/* Cards area */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colCards.length === 0 ? (
                    <div
                      className={`h-full min-h-[120px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl ${
                        isOver ? "border-indigo-300" : "border-slate-200 dark:border-slate-900"
                      }`}
                    >
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                        Drag candidates here
                      </p>
                    </div>
                  ) : (
                    colCards.map((cand) => {
                      const isLocked = cand.founderApproval.status === "PENDING";
                      const avg =
                        cand.scorecard.technicalScore > 0
                          ? (
                              (cand.scorecard.technicalScore +
                                cand.scorecard.systemScore +
                                cand.scorecard.cultureScore) /
                              3
                            ).toFixed(1)
                          : null;

                      return (
                        <div
                          key={cand.id}
                          draggable={!isLocked && permissions.canDragPipeline}
                          onDragStart={(e) => !isLocked && handleDragStart(e, cand.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onOpenCandidate(cand.id)}
                          className={`bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-3 transition-all shadow-sm relative ${
                            isLocked
                              ? "border-amber-300 dark:border-amber-800 opacity-80 cursor-not-allowed"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 tracking-tight leading-tight">
                                {cand.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {cand.role}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                {cand.id}
                              </span>
                              {avg && (
                                <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                  <i className="fa-solid fa-star text-[9px] mr-1" />
                                  Score: {avg}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Skills */}
                          <div className="flex flex-wrap gap-1">
                            {cand.skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[9px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800"
                              >
                                {s}
                              </span>
                            ))}
                            {cand.skills.length > 3 && (
                              <span className="bg-slate-100 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 text-[9px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-bold">
                                +{cand.skills.length - 3}
                              </span>
                            )}
                          </div>

                          {/* Source & approval status */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                              {cand.sourceTag}
                            </span>
                          </div>

                          {cand.founderApproval.status === "PENDING" && (
                            <div className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 font-bold">
                              <i className="fa-solid fa-lock text-[9px]" /><span>Pending Founder Review</span>
                            </div>
                          )}
                          {cand.founderApproval.status === "APPROVED" && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 font-bold">
                              <i className="fa-solid fa-circle-check text-[9px]" /><span>Offer Approved</span>
                            </div>
                          )}
                          {cand.founderApproval.status === "REJECTED" && (
                            <div className="bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 font-bold">
                              <i className="fa-solid fa-circle-xmark text-[9px]" /><span>Gate Rejected</span>
                            </div>
                          )}

                          {/* Nav arrows */}
                          <div
                            className="flex items-center justify-end gap-1 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {PIPELINE_STAGES.indexOf(stage) > 0 && (
                              <button
                                onClick={() => triggerCardShift(cand.id, -1)}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                              >
                                <i className="fa-solid fa-chevron-left text-[9px]" />
                              </button>
                            )}
                            {PIPELINE_STAGES.indexOf(stage) < PIPELINE_STAGES.length - 1 && (
                              <button
                                onClick={() => triggerCardShift(cand.id, 1)}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                              >
                                <i className="fa-solid fa-chevron-right text-[9px]" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
