"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { Candidate, Role, AuditEntry, Recommendation } from "@/lib/atsStore";

interface EvaluationWorkspaceProps {
  candidate: Candidate;
  role: Role;
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
            <span
              className="text-xs text-slate-400 dark:text-slate-500 ml-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {candidate.id}
            </span>
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
            <span
              className="text-[10px] text-slate-400 dark:text-slate-500"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ID: gdrive_file_id_embed
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
        <div className="w-1/2 flex flex-col overflow-y-auto p-8 space-y-6 bg-slate-50 dark:bg-slate-950">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              Applicant Profile &amp; Scorecard
            </h3>
          </div>

          {/* Bio */}
          <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs">
            <div>
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold">{candidate.email}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Phone</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold">{candidate.phone}</p>
            </div>
            <div className="mt-2">
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Assigned Opening</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold">{candidate.role}</p>
            </div>
            <div className="mt-2">
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Sourcing Origin</p>
              <p className="text-slate-800 dark:text-slate-200 font-semibold">{candidate.sourceTag}</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Automated Skill Tagging Metadata
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((s) => (
                <span
                  key={s}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Score sliders */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1">
              Hiring Manager Technical Ratings
            </h4>
            {[
              { label: "1. Technical Execution Rating", value: techScore, onChange: setTechScore },
              { label: "2. Systems Architecture Competency", value: sysScore, onChange: setSysScore },
              { label: "3. Culture Alignment Synergy", value: cultureScore, onChange: setCultureScore },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{value} / 5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={value}
                  onChange={(e) => onChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            ))}
          </div>

          {/* Pros / Cons */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Key Strengths (Pros)
                </label>
                <textarea
                  rows={3}
                  value={pros}
                  onChange={(e) => setPros(e.target.value)}
                  placeholder="Identify strong technical takeaways..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Identified Concerns (Cons)
                </label>
                <textarea
                  rows={3}
                  value={cons}
                  onChange={(e) => setCons(e.target.value)}
                  placeholder="Identify limitations or red flags..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Final Recommendation
                </label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as Recommendation)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Recommendation Selected</option>
                  <option value="STRONG_HIRE">Strong Hire</option>
                  <option value="HIRE">Hire</option>
                  <option value="NO_HIRE">No Hire</option>
                  <option value="STRONG_NO_HIRE">Strong No Hire</option>
                </select>
              </div>
              <button
                onClick={saveScorecard}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <i className="fa-regular fa-square-check" /><span>Save Evaluation Scorecard</span>
              </button>
            </div>
          </div>

          {/* Founder compensation gate */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                Founder Auth Required
              </span>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Compensation Package &amp; Approval Gate
              </h4>
            </div>

            {role !== "founder" ? (
              <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <i className="fa-solid fa-shield-halved text-amber-500 text-lg" />
                <p>
                  You are viewing as an{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">HR Recruiter</span>.
                  Budget numbers and approval mechanisms are secure. Switch to{" "}
                  <span className="font-bold text-indigo-500">Founder</span> to review and sign off packages.
                </p>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Proposed Base Salary
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                      ${(candidate.proposedSalary || candidate.expectedSalary).toLocaleString("en-US")} / year
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Proposed Equity Allocation
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                      {((candidate.proposedEquity || 0) * 100).toFixed(2)}% Options
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Gate State:</span>
                    {approvalStatus === "NONE" && (
                      <span className="px-2.5 py-0.5 font-bold rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800">
                        NO RUNNING OFFER
                      </span>
                    )}
                    {approvalStatus === "PENDING" && (
                      <span className="px-2.5 py-0.5 font-bold rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                        PENDING SIGN-OFF
                      </span>
                    )}
                    {approvalStatus === "APPROVED" && (
                      <span className="px-2.5 py-0.5 font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        OFFER APPROVED
                      </span>
                    )}
                    {approvalStatus === "REJECTED" && (
                      <span className="px-2.5 py-0.5 font-bold rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                        GATE BLOCKED
                      </span>
                    )}
                  </div>
                  {approvalStatus === "PENDING" && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={approveOffer}
                        className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                      >
                        <i className="fa-solid fa-check" /><span>Approve Offer</span>
                      </button>
                      <button
                        onClick={rejectOffer}
                        className="flex-1 md:flex-initial bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                      >
                        <i className="fa-solid fa-ban" /><span>Reject Gate</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
