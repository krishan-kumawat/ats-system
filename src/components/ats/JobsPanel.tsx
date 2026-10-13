"use client";


import { useState } from "react";
import { Job, JobStatus, Candidate, AuditEntry } from "@/lib/atsStore";
import CreateJobModal from "@/components/ats/CreateJobModal";


interface JobsPanelProps {
  jobs: Job[];
  candidates: Candidate[];
  canAddJob: boolean;
  onJobAdd: (job: Job, audit: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}


const STATUS_CONFIG: Record<JobStatus, { label: string; dot: string; badge: string }> = {
  OPEN: { label: "Open", dot: "bg-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" },
  DRAFT: { label: "Draft", dot: "bg-slate-400", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },
  ON_HOLD: { label: "On Hold", dot: "bg-amber-500", badge: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" },
  CLOSED: { label: "Closed", dot: "bg-red-500", badge: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400" },
};


const STAGE_CONFIG: Record<string, { bg: string; text: string }> = {
  Applied: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
  Screening: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400" },
  Interviewing: { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-400" },
  Offer: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-400" },
};


const APPROVAL_CONFIG: Record<string, { label: string; cls: string }> = {
  NONE: { label: "—", cls: "text-slate-400 dark:text-slate-600" },
  PENDING: { label: "Pending", cls: "text-amber-600 dark:text-amber-400" },
  APPROVED: { label: "Approved", cls: "text-emerald-600 dark:text-emerald-400" },
  REJECTED: { label: "Rejected", cls: "text-red-600 dark:text-red-400" },
};


export default function JobsPanel({ jobs, candidates, canAddJob, onJobAdd, onToast }: JobsPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<JobStatus | "ALL">("ALL");


  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) ?? null : null;
  const jobApplications = selectedJob
    ? candidates.filter((c) => c.jobId === selectedJob.id)
    : [];


  const filteredJobs = filterStatus === "ALL" ? jobs : jobs.filter((j) => j.status === filterStatus);


  function getAppCount(jobId: string) {
    return candidates.filter((c) => c.jobId === jobId).length;
  }


  if (selectedJob) {
    return (
      <ApplicationsView
        job={selectedJob}
        applications={jobApplications}
        onBack={() => setSelectedJobId(null)}
      />
    );
  }


  return (
    <div className="flex flex-col h-full gap-5">


      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Job Requisitions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {jobs.length} total &middot; {jobs.filter((j) => j.status === "OPEN").length} open
          </p>
        </div>


        <div className="flex items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
            {(["ALL", "OPEN", "DRAFT", "ON_HOLD", "CLOSED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${filterStatus === s
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                {s === "ALL" ? "All" : s === "ON_HOLD" ? "On Hold" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>


          {canAddJob && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            >
              <i className="fa-solid fa-plus" />
              <span>Create New Jobs</span>
            </button>
          )}        </div>
      </div>


      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {(["OPEN", "DRAFT", "ON_HOLD", "CLOSED"] as JobStatus[]).map((s) => {
          const count = jobs.filter((j) => j.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {cfg.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{count}</p>
            </div>
          );
        })}
      </div>


      {/* Jobs table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span className="col-span-4">Job Title</span>
          <span className="col-span-2">Department</span>
          <span className="col-span-2">Hiring Manager</span>
          <span className="col-span-1 text-center">Apps</span>
          <span className="col-span-1 text-center">Budget</span>
          <span className="col-span-1 text-center">Status</span>
          <span className="col-span-1 text-center">View</span>
        </div>


        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="fa-solid fa-briefcase text-3xl text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No requisitions found</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                {canAddJob ? 'Click "Add Job" to create one.' : "No requisitions match the current filter."}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const appCount = getAppCount(job.id);
              const cfg = STATUS_CONFIG[job.status];
              return (
                <div
                  key={job.id}
                  className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{job.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Created on {job.createdAt}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{job.department}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{job.hiringManager}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${appCount > 0
                        ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500"
                      }`}>
                      {appCount}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      ${(job.budgetLimit / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => setSelectedJobId(job.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {showAddModal && (
        <CreateJobModal
          onClose={() => setShowAddModal(false)}
          onSave={onJobAdd}
          onToast={onToast}
        />
      )}
    </div>
  );
}


// ─── Applications view ────────────────────────────────────────────────────────


function ApplicationsView({
  job,
  applications,
  onBack,
}: {
  job: Job;
  applications: Candidate[];
  onBack: () => void;
}) {
  const cfg = STATUS_CONFIG[job.status];


  const stageCounts = applications.reduce<Record<string, number>>((acc, c) => {
    acc[c.stage] = (acc[c.stage] ?? 0) + 1;
    return acc;
  }, {});


  return (
    <div className="flex flex-col h-full gap-5">


      {/* Back + header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <i className="fa-solid fa-arrow-left" />
            <span>All Jobs</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">{job.title}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {job.department} &middot; HM: {job.hiringManager} &middot; Budget: ${job.budgetLimit.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>


      {/* Stage summary pills */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
          Pipeline:
        </span>
        {["Applied", "Screening", "Interviewing", "Offer"].map((stage) => {
          const count = stageCounts[stage] ?? 0;
          const sc = STAGE_CONFIG[stage];
          return (
            <span key={stage} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
              {stage}
              <span className="font-bold">{count}</span>
            </span>
          );
        })}
        <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
          {applications.length} total application{applications.length !== 1 ? "s" : ""}
        </span>
      </div>


      {/* Applications table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span className="col-span-3">Candidate</span>
          <span className="col-span-2">Contact</span>
          <span className="col-span-2">Stage</span>
          <span className="col-span-2">Source</span>
          <span className="col-span-1 text-center">Expected</span>
          <span className="col-span-1 text-center">Offer</span>
          <span className="col-span-1 text-center">Approval</span>
        </div>


        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="fa-solid fa-users text-3xl text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No applications yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                Add candidates and assign them to this job.
              </p>
            </div>
          ) : (
            applications.map((c) => {
              const sc = STAGE_CONFIG[c.stage] ?? STAGE_CONFIG["Applied"];
              const ap = APPROVAL_CONFIG[c.founderApproval.status];
              const avg = c.scorecard.technicalScore
                ? ((c.scorecard.technicalScore + c.scorecard.systemScore + c.scorecard.cultureScore) / 3).toFixed(1)
                : null;
              return (
                <div key={c.id} className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="col-span-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">{c.name}</p>
                      {avg && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          <i className="fa-solid fa-star text-amber-400" /> {avg} avg score
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{c.email}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                      {c.stage}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.sourceTag}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      ${(c.expectedSalary / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    {c.proposedSalary > 0 ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ${(c.proposedSalary / 1000).toFixed(0)}k
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`text-[11px] font-semibold ${ap.cls}`}>{ap.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}



