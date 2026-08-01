import React, { useState, useEffect } from "react";
import { AuditEntry, JobStatus } from "@/lib/atsStore";
import {
  fetchRecordAccessAction,
  fetchCollaboratorsAction,
  addManualShareAction,
  removeManualShareAction,
} from "@/app/actions/sharing";
import { fetchAssignableUsersAction } from "@/app/actions/assignments";
import { fetchJobDetailsAction } from "@/app/actions/data";
import { deleteJobAction } from "@/app/actions/jobs";
import AddJobModal from "@/components/ats/AddJobModal";

interface JobRecordPageProps {
  jobId: string;
  jobs: any[];
  candidates: any[];
  auditLogs: AuditEntry[];
  role: "founder" | "recruiter";
  onBack: () => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onJobUpdate?: (job: any, audit: AuditEntry) => void;
  onJobDelete?: (jobId: string) => void;
  onJobClone?: (job: any, audit: AuditEntry) => void;
}

export default function JobRecordPage({
  jobId,
  jobs,
  candidates,
  auditLogs,
  role,
  onBack,
  onToast,
  onJobUpdate,
  onJobDelete,
  onJobClone,
}: JobRecordPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<"details" | "related">("details");

  const [access, setAccess] = useState({ isEditable: false, isDeletable: false, isShareable: false });
  const [showShareModal, setShowShareModal] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [shareTargetUserId, setShareTargetUserId] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState<"READ" | "EDIT">("READ");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);

  const [fullJob, setFullJob] = useState<any | null>(null);
  const [fullJobLoading, setFullJobLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this job requisition?")) return;
    setDeleting(true);
    const result = await deleteJobAction(jobId);
    if (!result.success) {
      onToast("Error", result.error || "Failed to delete job.", "ban");
      setDeleting(false);
      return;
    }
    onToast("Job Deleted", "Job requisition removed from system.", "trash");
    onJobDelete?.(jobId);
    onBack();
  }

  useEffect(() => {
    fetchRecordAccessAction(jobId, "Job")
      .then((res) => setAccess(res))
      .catch((err) => console.error("Error fetching record access", err));

    fetchJobDetailsAction(jobId)
      .then((res) => {
        setFullJob(res);
        setFullJobLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching job details", err);
        setFullJobLoading(false);
      });
  }, [jobId]);

  const handleOpenSharing = async () => {
    setSharingLoading(true);
    setSharingError(null);
    setShowShareModal(true);
    try {
      const [collabs, users] = await Promise.all([
        fetchCollaboratorsAction(jobId, "Job"),
        fetchAssignableUsersAction(),
      ]);
      setCollaborators(collabs);
      setAssignableUsers(users);
    } catch (err: any) {
      setSharingError(err.message || "Failed to load sharing metadata.");
    } finally {
      setSharingLoading(false);
    }
  };

  const handleAddShare = async () => {
    if (!shareTargetUserId) return;
    setSharingLoading(true);
    setSharingError(null);
    try {
      await addManualShareAction(jobId, "Job", shareTargetUserId, shareAccessLevel);
      const updatedCollabs = await fetchCollaboratorsAction(jobId, "Job");
      setCollaborators(updatedCollabs);
      setShareTargetUserId("");
      onToast("Success", "Record shared successfully.", "circle-check");
    } catch (err: any) {
      setSharingError(err.message || "Failed to add manual share.");
    } finally {
      setSharingLoading(false);
    }
  };

  const handleRemoveShare = async (targetUserId: string) => {
    setSharingLoading(true);
    setSharingError(null);
    try {
      await removeManualShareAction(jobId, "Job", targetUserId);
      const updatedCollabs = await fetchCollaboratorsAction(jobId, "Job");
      setCollaborators(updatedCollabs);
      onToast("Revoked", "Sharing permission revoked.", "info");
    } catch (err: any) {
      setSharingError(err.message || "Failed to revoke share.");
    } finally {
      setSharingLoading(false);
    }
  };

  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <i className="fa-solid fa-triangle-exclamation text-rose-500 text-3xl animate-bounce" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Job Record Not Found</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
        >
          Back to List
        </button>
      </div>
    );
  }

  // Filter candidates applied to this job
  const relatedCandidates = candidates.filter((c) => c.jobId === jobId || c.job?.id === jobId);

  // Filter audit logs for this job
  const relatedLogs = auditLogs.filter(
    (log) =>
      log.target === jobId ||
      (log.notes && log.notes.toLowerCase().includes(job.title.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f3f3f3] dark:bg-slate-950 p-3 space-y-3 overflow-y-auto">
      
      {/* 1. HIGHLIGHTS PANEL (Salesforce Header) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ba0516] text-white rounded flex items-center justify-center shadow">
            <i className="fa-solid fa-briefcase text-lg" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Job
            </div>
            <h1 className="text-lg font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              {job.title}
            </h1>
          </div>
        </div>

        {/* Buttons Panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold shadow-sm transition-colors"
          >
            Back to List
          </button>
          
          {access.isShareable && (
            <button
              onClick={handleOpenSharing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-share-nodes" />
              Share
            </button>
          )}

          <button
            onClick={() => setShowCloneModal(true)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-750 dark:text-slate-300 rounded text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-copy text-[10px]" />
            Clone
          </button>

          {access.isEditable && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-pen text-[10px]" />
              Edit
            </button>
          )}

          {access.isDeletable && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-trash text-[10px]" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Highlights Grid summary fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs flex-shrink-0">
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Department</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{job.department?.name || job.department || "Engineering"}</div>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Status</div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 mt-1 border border-emerald-250/30">
            {job.status || "Open"}
          </span>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Budget Limit</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {job.budgetLimit ? `$${Number(job.budgetLimit).toLocaleString()}` : "$150,000"}
          </div>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Created Date</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Today"}
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT (Details/Related Left, Sidebar Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        
        {/* Left Column (Tabs Details & Related) */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col min-h-0">
          
          {/* Salesforce Sub-tab headers */}
          <div className="flex border-b border-slate-200 dark:border-slate-850 px-4 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveSubTab("details")}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeSubTab === "details"
                  ? "border-[#0070d2] text-[#0070d2] dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-700"
              }`}
            >
              <i className="fa-solid fa-circle-info text-[10px]" />
              Details
            </button>
            <button
              onClick={() => setActiveSubTab("related")}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeSubTab === "related"
                  ? "border-[#0070d2] text-[#0070d2] dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-700"
              }`}
            >
              <i className="fa-solid fa-list-ul text-[10px]" />
              Related Applicants ({relatedCandidates.length})
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto min-h-0 text-xs text-slate-700 dark:text-slate-350">
            
            {/* Details Grid */}
            {activeSubTab === "details" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Job Title</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{job.title}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Department</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{job.department?.name || job.department || "Engineering"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Status</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{job.status || "Open"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Budget Limit</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {job.budgetLimit ? `$${Number(job.budgetLimit).toLocaleString()}` : "$150,000"}
                    </p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Job Record ID</span>
                    <p className="font-semibold font-mono text-slate-500 dark:text-slate-400 mt-1">{job.id}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">System Permissions Required</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">recruitment:job:read</p>
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Job Description</span>
                  <p className="text-slate-700 dark:text-slate-350 mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded border border-slate-100 dark:border-slate-800">
                    {job.description || `Responsible for designing, building, and deploying highly modular and scalable distributed application layers. Collaborates closely with product engineering teams to implement modern Salesforce OLS/FLS metadata controls.`}
                  </p>
                </div>

                {/* System Information */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info text-indigo-500" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Owner</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {fullJob?.owner ? `${fullJob.owner.firstName} ${fullJob.owner.lastName}` : job.hiringManager || "System Owner"}
                      </p>
                    </div>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Created By</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {fullJob?.createdBy ? `${fullJob.createdBy.firstName} ${fullJob.createdBy.lastName}` : "System"} ({fullJob?.createdDate ? new Date(fullJob.createdDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "N/A")})
                      </p>
                    </div>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Last Modified By</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {fullJob?.lastModifiedBy ? `${fullJob.lastModifiedBy.firstName} ${fullJob.lastModifiedBy.lastName}` : "System"} ({fullJob?.lastModifiedDate ? new Date(fullJob.lastModifiedDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related List */}
            {activeSubTab === "related" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    Applicants applying to this job ({relatedCandidates.length})
                  </h3>
                </div>

                {relatedCandidates.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No candidates are currently mapped or applying to this job post.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5">Candidate Name</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">Stage</th>
                          <th className="px-4 py-2.5 text-right">Expected Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-355">
                        {relatedCandidates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="px-4 py-3 font-semibold text-[#0070d2] dark:text-indigo-400">
                              {c.name}
                            </td>
                            <td className="px-4 py-3 font-mono">{c.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-850 font-semibold">
                                {c.stage}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c.expectedSalary ? `$${Number(c.expectedSalary).toLocaleString()}` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Column (Activities / Activity Timeline) */}
        <div className="w-full lg:w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col p-4 space-y-4 flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Activity History
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Live audit events matching this job record
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {relatedLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-[11px]">
                No recent actions recorded for this job.
              </div>
            ) : (
              relatedLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex gap-2 items-start"
                >
                  <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 text-[10px] font-bold">
                    <i className="fa-solid fa-clock-rotate-left" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action || "Audit Log"}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{log.notes}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-indigo-600 dark:text-indigo-400 text-lg" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Sharing Settings: {job.title}
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 text-xs">
              {sharingError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg flex items-start gap-2">
                  <i className="fa-solid fa-circle-exclamation mt-0.5" />
                  <span>{sharingError}</span>
                </div>
              )}

              {/* Share with New Collaborator Row */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-800/80 rounded-lg space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">
                  Manual Share Record
                </h4>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-slate-405 font-medium">Select Recipient User</label>
                    <select
                      value={shareTargetUserId}
                      onChange={(e) => setShareTargetUserId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-750"
                    >
                      <option value="">-- Choose User --</option>
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-[10px] text-slate-405 font-medium">Access Level</label>
                    <select
                      value={shareAccessLevel}
                      onChange={(e) => setShareAccessLevel(e.target.value as "READ" | "EDIT")}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-750"
                    >
                      <option value="READ">Read Only</option>
                      <option value="EDIT">Read/Write</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddShare}
                    disabled={sharingLoading || !shareTargetUserId}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors h-[38px]"
                  >
                    {sharingLoading && <i className="fa-solid fa-spinner animate-spin" />}
                    Share
                  </button>
                </div>
              </div>

              {/* Collaborators List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Current Access & Collaborators
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {collaborators.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No active sharing records populated.
                    </div>
                  ) : (
                    collaborators.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-750 dark:text-slate-200 truncate">
                            {c.userName || c.userEmail || "Group/Role Entry"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <span className="font-medium bg-slate-105 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase text-[8px]">
                              {c.rowCause || "MANUAL"}
                            </span>
                            {c.groupName && <span>• Group: {c.groupName}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {c.accessLevel === "EDIT" ? "Read/Write" : "Read Only"}
                          </span>
                          {c.rowCause === "MANUAL" && (
                            <button
                              onClick={() => handleRemoveShare(c.userId)}
                              disabled={sharingLoading}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-955/20 p-1.5 rounded transition-colors"
                              title="Revoke manual share"
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <AddJobModal
          mode="edit"
          jobId={jobId}
          initialValues={{
            title: job.title,
            department: job.department?.name || job.department || "Engineering",
            status: (job.status || "OPEN").toUpperCase() as unknown as JobStatus,
            budget: String(job.budgetLimit || ""),
            hiringManagerName: fullJob?.owner ? `${fullJob.owner.firstName} ${fullJob.owner.lastName}` : job.hiringManager || "",
            hiringManagerId: fullJob?.ownerId || "",
          }}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          onToast={onToast}
        />
      )}

      {showCloneModal && (
        <AddJobModal
          mode="clone"
          initialValues={{
            title: `Clone of ${job.title}`,
            department: job.department?.name || job.department || "Engineering",
            status: (job.status || "OPEN").toUpperCase() as unknown as JobStatus,
            budget: String(job.budgetLimit || ""),
            hiringManagerName: fullJob?.owner ? `${fullJob.owner.firstName} ${fullJob.owner.lastName}` : job.hiringManager || "",
            hiringManagerId: fullJob?.ownerId || "",
          }}
          onClose={() => setShowCloneModal(false)}
          onSave={handleCloneSave}
          onToast={onToast}
        />
      )}
    </div>
  );

  function handleEditSave(updatedJob: any, audit: AuditEntry) {
    setFullJob(updatedJob);
    onJobUpdate?.(updatedJob, audit);
  }

  function handleCloneSave(clonedJob: any, audit: AuditEntry) {
    onJobClone?.(clonedJob, audit);
  }
}
