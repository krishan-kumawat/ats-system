"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import Header from "@/components/ats/Header";
import Sidebar from "@/components/ats/Sidebar";
import Toast from "@/components/ats/Toast";
import PipelineBoard from "@/components/ats/PipelineBoard";
import JobsPanel from "@/components/ats/JobsPanel";
import AnalyticsPanel from "@/components/ats/AnalyticsPanel";
import GenericDataGrid from "@/components/ats/GenericDataGrid";
import PermissionsPanel from "@/components/ats/PermissionsPanel";
import AddCandidateModal from "@/components/ats/AddCandidateModal";
import EvaluationWorkspace from "@/components/ats/EvaluationWorkspace";
import JobRecordPage from "@/components/ats/JobRecordPage";
import UserRecordPage from "@/components/ats/UserRecordPage";
import { UserRole } from "@/lib/enums";
import { SessionPayload } from "@/lib/auth-config";
import { Job, Candidate, AuditEntry } from "@/lib/atsStore";
import { writeAuditAction } from "@/app/actions/audit";
import {
  movePipelineAction,
  saveScorecardAction,
  approveOfferAction,
  rejectOfferAction,
} from "@/app/actions/scorecard";

const TOTAL_BUDGET = 1200000;

interface ObjectWorkspaceProps {
  objectApiName: string;
  user: SessionPayload & {
    profile?: {
      id: string;
      name: string;
      permissions: any;
    };
  };
  initialData: {
    jobs: Job[];
    candidates: Candidate[];
    auditLogs: AuditEntry[];
  };
}

export default function ObjectWorkspace({
  objectApiName,
  user,
  initialData,
}: ObjectWorkspaceProps) {
  // Determine standard tab name based on objectApiName
  let normName = objectApiName;
  const lower = normName.toLowerCase();
  if (lower === "jobs") normName = "Job";
  else if (lower === "candidates") normName = "Candidate";
  else if (lower === "departments") normName = "Department";
  else if (lower === "users") normName = "User";
  else if (lower === "profiles") normName = "Profile";
  else if (lower === "roles") normName = "Role";
  else if (lower === "auditlogs" || lower === "auditlog") normName = "AuditLog";
  else if (lower === "analytics") normName = "Analytics";
  else if (lower === "accounts" || lower === "account") normName = "Account";

  const [role, setRole] = useState<"founder" | "recruiter">("founder");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState({ title: "", message: "", icon: "", visible: false });
  const [jobs, setJobs] = useState<Job[]>(initialData.jobs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialData.candidates);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(initialData.auditLogs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobRecord, setSelectedJobRecord] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const isFounder = role === "founder" && user.role === UserRole.ADMIN;

  const myPerms = useMemo(() => {
    if (isFounder) {
      return {
        canViewJobs: true,
        canViewCandidates: true,
        canAddJob: true,
        canIngestCandidate: true,
        canDragPipeline: true,
        canViewAuditLog: true,
        canApproveOffer: true,
        canViewAnalytics: true,
        canEditScorecard: true,
        canManagePermissions: true,
        canAssignJobs: true,
      };
    }
    const dbPerms = user.profile?.permissions || {};
    return {
      canViewJobs: dbPerms.canViewJobs !== false,
      canViewCandidates: dbPerms.canViewCandidates !== false,
      canAddJob: !!dbPerms.canAddJob,
      canIngestCandidate: !!dbPerms.canIngestCandidate,
      canDragPipeline: !!dbPerms.canDragPipeline,
      canViewAuditLog: !!dbPerms.canViewAuditLog,
      canApproveOffer: !!dbPerms.canApproveOffer,
      canViewAnalytics: !!dbPerms.canViewAnalytics,
      canEditScorecard: !!dbPerms.canEditScorecard,
      canManagePermissions: !!dbPerms.canManagePermissions,
      canAssignJobs: !!dbPerms.canAssignJobs,
    };
  }, [isFounder, user.profile]);

  const showToast = useCallback((title: string, msg: string, icon = "info") => {
    if (msg === "__OPEN_ADD_MODAL__") {
      if (!myPerms.canIngestCandidate) return;
      setShowAddModal(true);
      return;
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, message: msg, icon, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  }, [myPerms.canIngestCandidate]);

  function handleRoleChange(newRole: "founder" | "recruiter") {
    setRole(newRole);
    if (newRole === "founder") {
      showToast("Access Granted", "Logged in under Founder executive security node.", "shield-halved");
    } else {
      showToast("Recruiter Mode", "Operational recruitment pipeline active.", "info");
    }
  }

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    showToast(
      next === "dark" ? "Dark Mode Engaged" : "Light Mode Engaged",
      `Interface updated to ${next} mode.`,
      next === "dark" ? "moon" : "sun"
    );
  }

  async function handleMoveStage(
    candidateId: string,
    targetStage: Candidate["stage"],
    proposedSalary?: number,
    proposedEquity?: number
  ) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: targetStage } : c))
    );
    await movePipelineAction(candidateId, targetStage, proposedSalary, proposedEquity).catch(() => {});
    showToast("Pipeline Moved", "Candidate transition sequence initiated.", "arrows-left-right");
  }

  async function handleSaveScorecard(
    applicationId: string,
    scorecard: Candidate["scorecard"]
  ) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === applicationId ? { ...c, scorecard } : c))
    );
    await saveScorecardAction({
      applicationId,
      technicalScore: scorecard.technicalScore,
      systemScore: scorecard.systemScore,
      cultureScore: scorecard.cultureScore,
      pros: scorecard.pros,
      cons: scorecard.cons,
      recommendation: scorecard.recommendation,
    }).catch(() => {});
    showToast("Scorecard Logged", "Applicant metrics updated successfully.", "check");
  }

  async function handleApproveOffer(applicationId: string) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === applicationId
          ? { ...c, founderApproval: { ...c.founderApproval, status: "APPROVED" } }
          : c
      )
    );
    await approveOfferAction(applicationId).catch(() => {});
    showToast("Offer Approved", "Compensation proposal approved.", "circle-check");
  }

  async function handleRejectOffer(applicationId: string) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === applicationId
          ? { ...c, founderApproval: { ...c.founderApproval, status: "REJECTED" } }
          : c
      )
    );
    await rejectOfferAction(applicationId).catch(() => {});
    showToast("Offer Returned", "Offer proposal returned for modification.", "circle-xmark");
  }

  function handleSaveCandidate(candidate: Candidate, auditEntry: AuditEntry) {
    setCandidates((prev) => [...prev, candidate]);
    setAuditLogs((prev) => [...prev, auditEntry]);
  }

  function handleJobAdd(job: Job, audit: AuditEntry) {
    setJobs((prev) => [...prev, job]);
    setAuditLogs((prev) => [...prev, audit]);
  }

  function handleJobUpdate(updatedJob: Job, audit: AuditEntry) {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
    setSelectedJobRecord(updatedJob);
    setAuditLogs((prev) => [...prev, audit]);
  }

  function handleJobDelete(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setSelectedJobId(null);
    setSelectedJobRecord(null);
  }

  function handleJobClone(clonedJob: Job, audit: AuditEntry) {
    setJobs((prev) => [...prev, clonedJob]);
    setAuditLogs((prev) => [...prev, audit]);
    setSelectedJobId(clonedJob.id);
    setSelectedJobRecord(clonedJob);
  }

  const allocated = candidates.reduce(
    (acc, c) => acc + (c.proposedSalary || c.expectedSalary || 0),
    0
  );

  const activeCandidate = activeCandidateId
    ? candidates.find((c) => c.id === activeCandidateId) ?? null
    : null;

  // CUSTOM_COMPONENTS dictionary mapping specialized components
  const CUSTOM_COMPONENTS: Record<string, React.ReactNode> = {
    Candidate: (
      <PipelineBoard
        candidates={candidates}
        jobs={jobs}
        role={role}
        permissions={myPerms}
        onCandidatesChange={setCandidates}
        onAuditLog={(entry) => setAuditLogs((prev) => [...prev, entry])}
        onOpenCandidate={(id) => setActiveCandidateId(id)}
        onToast={showToast}
        onMoveStage={handleMoveStage}
      />
    ),
    Job: selectedJobId ? (
      <JobRecordPage
        jobId={selectedJobId}
        jobRecord={selectedJobRecord}
        jobs={jobs}
        candidates={candidates}
        auditLogs={auditLogs}
        role={role}
        onBack={() => {
          setSelectedJobId(null);
          setSelectedJobRecord(null);
        }}
        onToast={showToast}
        onJobUpdate={handleJobUpdate}
        onJobDelete={handleJobDelete}
        onJobClone={handleJobClone}
      />
    ) : (
      <GenericDataGrid
        objectApiName="Job"
        onRowClick={(id, record) => {
          setSelectedJobId(id);
          setSelectedJobRecord(record);
        }}
      />
    ),
    User: selectedUserId ? (
      <UserRecordPage
        userId={selectedUserId}
        auditLogs={auditLogs}
        onBack={() => setSelectedUserId(null)}
        onToast={showToast}
      />
    ) : (
      <GenericDataGrid
        objectApiName="User"
        onRowClick={(id) => setSelectedUserId(id)}
      />
    ),
    Analytics: (
      <AnalyticsPanel
        candidates={candidates}
        totalBudget={TOTAL_BUDGET}
      />
    ),
    Profile: (
      <PermissionsPanel
        onAuditLog={(entry) => setAuditLogs((prev) => [...prev, entry])}
        onToast={showToast}
      />
    ),
  };

  React.useEffect(() => {
    setSelectedJobId(null);
    setSelectedJobRecord(null);
    setSelectedUserId(null);
  }, [normName]);

  const currentComponent = CUSTOM_COMPONENTS[normName] || (
    <GenericDataGrid objectApiName={normName} />
  );

  return (
    <div className={`h-full flex flex-col ${theme === "dark" ? "dark" : ""}`}>
      <Header
        role={role}
        onRoleChange={handleRoleChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        user={user}
        allocated={allocated}
        totalBudget={TOTAL_BUDGET}
        onToast={showToast}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          role={role}
          userRole={user.role}
          tab={normName}
          candidateCount={candidates.length}
          jobCount={jobs.length}
          permissions={myPerms}
          onTabChange={() => {}}
          onToast={showToast}
        />

        {/* Dynamic component rendering */}
        {currentComponent}
      </div>

      {activeCandidate && (
        <EvaluationWorkspace
          candidate={activeCandidate}
          role={role}
          canEditScorecard={myPerms.canEditScorecard}
          onClose={() => setActiveCandidateId(null)}
          onCandidateUpdate={async (updated) => {
            setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
          onAuditLog={(entry) => setAuditLogs((prev) => [...prev, entry])}
          onToast={showToast}
          onSaveScorecard={handleSaveScorecard}
          onApproveOffer={handleApproveOffer}
          onRejectOffer={handleRejectOffer}
        />
      )}

      {showAddModal && (
        <AddCandidateModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveCandidate}
          jobs={jobs}
          onToast={showToast}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
