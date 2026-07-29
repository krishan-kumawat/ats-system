"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { Candidate, Role, AuditEntry, Recommendation } from "@/lib/atsStore";

interface EvaluationWorkspaceProps {
  candidate: Candidate;
  role: Role;
  canEditScorecard?: boolean;
  onClose: () => void;
  onCandidateUpdate: (updated: Candidate) => void;
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onSaveScorecard?: (applicationId: string, scorecard: Candidate["scorecard"]) => Promise<void>;
  onApproveOffer?: (applicationId: string) => Promise<void>;
  onRejectOffer?: (applicationId: string) => Promise<void>;
}

export default function EvaluationWorkspace({
  candidate,
  role,
  canEditScorecard = true,
  onClose,
  onCandidateUpdate,
  onAuditLog,
  onToast,
  onSaveScorecard,
  onApproveOffer,
  onRejectOffer,
}: EvaluationWorkspaceProps) {
  const [techScore, setTechScore] = useState(candidate.scorecard.technicalScore || 1);
  const [sysScore, setSysScore] = useState(candidate.scorecard.systemScore || 1);
  const [cultureScore, setCultureScore] = useState(candidate.scorecard.cultureScore || 1);
  const [pros, setPros] = useState(candidate.scorecard.pros);
  const [cons, setCons] = useState(candidate.scorecard.cons);
  const [recommendation, setRecommendation] = useState<Recommendation>(
    candidate.scorecard.recommendation
  );

  useEffect(() => {
    setTechScore(candidate.scorecard.technicalScore || 1);
    setSysScore(candidate.scorecard.systemScore || 1);
    setCultureScore(candidate.scorecard.cultureScore || 1);
    setPros(candidate.scorecard.pros);
    setCons(candidate.scorecard.cons);
    setRecommendation(candidate.scorecard.recommendation);
  }, [candidate.id]);

  function saveScorecard() {
    const avg = ((techScore + sysScore + cultureScore) / 3).toFixed(1);
    const newScorecard: Candidate["scorecard"] = {
      technicalScore: techScore,
      systemScore: sysScore,
      cultureScore: cultureScore,
      pros,
      cons,
      recommendation,
    };
    const updated: Candidate = { ...candidate, scorecard: newScorecard };
    onCandidateUpdate(updated);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: role === "founder" ? "Founder" : "HRRecruiter_01",
      action: "LOGGED_SCORECARD",
      target: candidate.name,
      notes: `Average ratings logged: ${avg}/5. Recommendation: ${recommendation || "NONE"}.`,
    });
    onSaveScorecard?.(candidate.id, newScorecard).catch(() => {});
    onToast("Evaluation Saved", "Candidate scorecard committed to internal database.", "check");
  }

  function approveOffer() {
    if (candidate.founderApproval.status !== "PENDING") {
      onToast("Action Locked", "No pending offer gate found.", "ban");
      return;
    }
    const updated: Candidate = {
      ...candidate,
      founderApproval: { ...candidate.founderApproval, status: "APPROVED" },
    };
    onCandidateUpdate(updated);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: "Founder",
      action: "OFFER_APPROVED",
      target: candidate.name,
      notes: `Digitally signed off salary allocation of $${(candidate.proposedSalary || candidate.expectedSalary).toLocaleString("en-US")} annually.`,
    });
    onApproveOffer?.(candidate.id).catch(() => {});
    onToast(
      "Offer Approved",
      `${candidate.name}'s gate sign-off completed. Recruiter unlocked.`,
      "check"
    );
  }

  function rejectOffer() {
    if (candidate.founderApproval.status !== "PENDING") {
      onToast("Action Locked", "No pending offer gate found.", "ban");
      return;
    }
    const updated: Candidate = {
      ...candidate,
      stage: "Interviewing",
      founderApproval: { ...candidate.founderApproval, status: "REJECTED" },
    };
    onCandidateUpdate(updated);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: "Founder",
      action: "OFFER_REJECTED",
      target: candidate.name,
      notes: "Offer returned for budget readjustments. Candidate reverted to Interviewing.",
    });
    onRejectOffer?.(candidate.id).catch(() => {});
    onToast("Gate Blocked", "Offer rejected. Candidate reverted to Interviewing.", "ban");
    onClose();
  }

  const isLocked = candidate.founderApproval.status === "PENDING";
  const approvalStatus = candidate.founderApproval.status;

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 text-sm font-semibold transition-all"
          >
            <i className="fa-solid fa-arrow-left" /><span>Back to Pipeline</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">{candidate.name}</span>
            {candidate.role && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
                ({candidate.role})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
              Current Stage:
            </span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              {candidate.stage}
            </span>
          </div>
          {isLocked && (
            <div className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-lock" /><span>Locked: Pending Sign-off</span>
            </div>
          )}
        </div>
      </div>

      {/* Split panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Resume viewer */}
        <div className="w-1/2 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
              <i className="fa-brands fa-google-drive text-indigo-500 dark:text-indigo-400" />
              Google Drive Secure Embed: Resume.pdf
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200 dark:bg-slate-900">
            <div className="bg-white text-slate-900 w-full max-w-xl p-8 rounded-xl shadow-2xl min-h-[700px] border border-slate-200">
              {/* Simulated CV */}
              <div style={{ borderBottom: "2px solid #0b57d0", paddingBottom: 15, marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: "bold", color: "#0f172a", marginBottom: 4 }}>
                  {candidate.name}
                </h1>
                <p style={{ fontSize: 13, color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>
                  {candidate.role}
                </p>
                <div style={{ display: "flex", gap: 15, fontSize: 11, color: "#64748b", marginTop: 8 }}>
                  <span><i className="fa-solid fa-envelope" /><span> {candidate.email}</span></span>
                  <span><i className="fa-solid fa-phone" /><span> {candidate.phone}</span></span>
                  <span><i className="fa-solid fa-location-dot" /><span> San Francisco, CA</span></span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
                  Professional Profile
                </h3>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "#334155" }}>
                  Experienced professional specializing in {candidate.department.toLowerCase()} ecosystems. Proven track record leading major project deliveries, resolving operational bottlenecks, and translating complex requirements into solid architecture.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
                  Parsed Skills &amp; Proficiencies
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {candidate.skills.map((s) => (
                    <span
                      key={s}
                      style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 12, fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
                  Professional Work Experience
                </h3>
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", color: "#0f172a" }}>
                    <span>Senior Specialist</span><span>2022 – Present</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>Scalable Tech Systems Inc.</p>
                  <ul style={{ fontSize: 11, lineHeight: 1.5, color: "#475569", paddingLeft: 15, listStyleType: "disc" }}>
                    <li>Led cross-functional infrastructure migrations saving substantial operational expenses.</li>
                    <li>Architected internal tooling suites, increasing engineering velocities by 35%.</li>
                    <li>Authored clean, testable system code following robust CI/CD pipelines.</li>
                  </ul>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", color: "#0f172a" }}>
                    <span>Associate Specialist</span><span>2019 – 2022</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>Startup Growth Lab</p>
                  <ul style={{ fontSize: 11, lineHeight: 1.5, color: "#475569", paddingLeft: 15, listStyleType: "disc" }}>
                    <li>Integrated automation monitors decreasing pipeline crashes.</li>
                    <li>Contributed directly to products facilitating scalable series funding.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scorecard */}
        <div className="w-1/2 flex flex-col overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-950">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Interview Evaluation Scorecard</h3>
            <p className="text-xs text-slate-400 mt-0.5">Rate technical competencies and document key hiring takeaways.</p>
          </div>

          <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Technical Depth:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{techScore}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={techScore}
                disabled={!canEditScorecard}
                onChange={(e) => setTechScore(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">System Architecture:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sysScore}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={sysScore}
                disabled={!canEditScorecard}
                onChange={(e) => setSysScore(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Cultural & Communication:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{cultureScore}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={cultureScore}
                disabled={!canEditScorecard}
                onChange={(e) => setCultureScore(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Candidate Strengths (Pros)</label>
              <textarea
                rows={2}
                value={pros}
                disabled={!canEditScorecard}
                onChange={(e) => setPros(e.target.value)}
                placeholder="Highlight technical domain strengths..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Areas for Growth (Cons)</label>
              <textarea
                rows={2}
                value={cons}
                disabled={!canEditScorecard}
                onChange={(e) => setCons(e.target.value)}
                placeholder="Document skill gaps or missing experience..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Overall Recommendation</label>
              <select
                value={recommendation}
                disabled={!canEditScorecard}
                onChange={(e) => setRecommendation(e.target.value as Recommendation)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
              >
                <option value="">No Recommendation Selected</option>
                <option value="STRONG_HIRE">Strong Hire</option>
                <option value="HIRE">Hire</option>
                <option value="NO_HIRE">No Hire</option>
                <option value="STRONG_NO_HIRE">Strong No Hire</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={saveScorecard}
              disabled={!canEditScorecard}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk" />
              <span>Save Scorecard</span>
            </button>
          </div>

          {/* Offer Sign-off Gate Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <i className="fa-solid fa-signature text-indigo-500" />
                  Founder Executive Sign-Off Gate
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Gate State:</span>
                  {approvalStatus === "NONE" && (
                    <span className="px-2.5 py-0.5 font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px]">
                      NO RUNNING OFFER
                    </span>
                  )}
                  {approvalStatus === "PENDING" && (
                    <span className="px-2.5 py-0.5 font-bold rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[10px] animate-pulse">
                      AWAITING SIGNATURE
                    </span>
                  )}
                  {approvalStatus === "APPROVED" && (
                    <span className="px-2.5 py-0.5 font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[10px]">
                      APPROVED &amp; SIGNED
                    </span>
                  )}
                  {approvalStatus === "REJECTED" && (
                    <span className="px-2.5 py-0.5 font-bold rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-[10px]">
                      RETURNED / REJECTED
                    </span>
                  )}
                </div>
              </div>

              {role === "founder" && approvalStatus === "PENDING" && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={approveOffer}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-file-signature" />
                    <span>Approve Offer Package</span>
                  </button>
                  <button
                    onClick={rejectOffer}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-rotate-left" />
                    <span>Return for Readjustment</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
