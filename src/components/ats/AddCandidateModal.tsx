"use client";

import { useState } from "react";
import { Candidate, AuditEntry, SKILLS_LEXICON, Job } from "@/lib/atsStore";
import { ingestCandidateAction } from "@/app/actions/scorecard";

interface AddCandidateModalProps {
  jobs: Job[];
  onClose: () => void;
  onSave: (candidate: Candidate, auditEntry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

type ParserState = "idle" | "parsing" | "done";

const PARSE_STEPS = [
  { text: "Streaming binary to Google Drive company directories...", progress: 30 },
  { text: "Reading static character arrays via PDF parser...", progress: 65 },
  { text: "Mapping candidate profiles against tech dictionary lexicons...", progress: 100 },
];

const ROLE_OPTIONS = [
  "Senior Staff Platform Engineer",
  "Principal Product Manager",
  "Senior Frontend Engineer",
  "Lead Data Scientist",
];

export default function AddCandidateModal({
  jobs,
  onClose,
  onSave,
  onToast,
}: AddCandidateModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [salary, setSalary] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id ?? "");
  const [parserState, setParserState] = useState<ParserState>("idle");
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStepText, setParseStepText] = useState("");
  const [discoveredSkills, setDiscoveredSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function triggerParserSimulation() {
    if (!name.trim()) {
      onToast("Form Incomplete", "Please enter the candidate name first.", "ban");
      return;
    }
    setParserState("parsing");
    setParseProgress(0);

    let stepIdx = 0;
    function runStep() {
      if (stepIdx < PARSE_STEPS.length) {
        setParseStepText(PARSE_STEPS[stepIdx].text);
        setParseProgress(PARSE_STEPS[stepIdx].progress);
        stepIdx++;
        setTimeout(runStep, 1000);
      } else {
        const skills = SKILLS_LEXICON[role] ?? ["Resume Parser Standard", "Local Lexicon Match"];
        setDiscoveredSkills(skills);
        setParserState("done");
        onToast("Parser Complete", "File parsed successfully. Tags verified.", "check");
      }
    }
    runStep();
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      onToast("Form Incomplete", "Name and email are required.", "ban");
      return;
    }

    setSaving(true);

    const skills = discoveredSkills.length > 0 ? discoveredSkills : [];
    const expectedSalary = parseInt(salary) || 120000;
    const selectedJob = jobs.find((j) => j.id === selectedJobId);

    // ── Try DB ingest ────────────────────────────────────────────────────────
    const result = await ingestCandidateAction({
      name: name.trim(),
      email: email.trim(),
      phone: "+1 555-0100",
      role,
      department: selectedJob?.department ?? "Engineering",
      skills,
      expectedSalary,
      jobId: selectedJobId || undefined,
      sourceTag: "Manual PDF Upload",
    });

    const id = result.applicationId || `cnd-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCandidate: Candidate = {
      id,
      name: name.trim(),
      email: email.trim(),
      phone: "+1 555-0100",
      role,
      department: selectedJob?.department ?? "Engineering",
      stage: "Applied",
      sourceTag: "Manual PDF Upload",
      skills,
      expectedSalary,
      proposedSalary: 0,
      proposedEquity: 0,
      jobId: selectedJobId || undefined,
      scorecard: {
        technicalScore: 0,
        systemScore: 0,
        cultureScore: 0,
        pros: "",
        cons: "",
        recommendation: "",
      },
      founderApproval: { status: "NONE", feedback: "" },
    };

    const auditEntry: AuditEntry = {
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: "HRRecruiter_01",
      action: "INGESTED_PROFILE",
      target: name.trim(),
      notes: `Simulated Google Drive file written. Parsed tags: ${skills.slice(0, 3).join(", ")}...`,
    };

    onSave(newCandidate, auditEntry);
    onToast("Ingestion Complete", `${name} has been added to the pipeline.`, "check");
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden transition-colors duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-file-import text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Ingest New Candidate</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Connor"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.c@skymail.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Job Designation Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Expected Annual Comp
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="185000"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Job assignment */}
          {jobs.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Assign to Job Requisition
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {jobs.filter((j) => j.status === "OPEN" || j.status === "DRAFT").map((j) => (
                  <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                ))}
              </select>
            </div>
          )}

          {/* Upload zone */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Manual Resume File Ingest
            </label>
            {parserState === "idle" && (
              <div
                onClick={triggerParserSimulation}
                className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 rounded-xl p-6 text-center cursor-pointer transition-all"
              >
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 dark:text-slate-500 mb-2 block" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to upload resume PDF
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Simulates automatic parsing &amp; Google Drive streaming upload
                </p>
              </div>
            )}

            {parserState === "parsing" && (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{parseStepText}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${parseProgress}%` }}
                  />
                </div>
              </div>
            )}

            {parserState === "done" && (
              <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <i className="fa-solid fa-circle-check" /><span> CV Document Scanned &amp; Mapped to Google Drive!</span>
              </div>
            )}
          </div>

          {/* Discovered tags */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Discovered Resume Skills Tags
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[42px]">
              {discoveredSkills.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No resume analyzed yet...</span>
              ) : (
                discoveredSkills.map((s) => (
                  <span
                    key={s}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-1 rounded text-[11px]"
                  >
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={parserState !== "done" || saving}
            onClick={handleSave}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              parserState === "done" && !saving
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 cursor-pointer"
                : "bg-indigo-600/30 dark:bg-indigo-600/50 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving && (
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Ingest Candidate
          </button>
        </div>
      </div>
    </div>
  );
}
