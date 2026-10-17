"use client";


import { useState, useRef, useMemo, useCallback } from "react";
import Header from "@/components/ats/Header";
import Sidebar from "@/components/ats/Sidebar";
import Toast from "@/components/ats/Toast";
import PipelineBoard from "@/components/ats/PipelineBoard";
import {
  Role,
  Tab,
  Job,
  Candidate,
  AuditEntry,
} from "@/lib/atsStore";
import { UserRole } from "@/lib/enums";
import { SessionPayload } from "@/lib/auth-config";
import {
  movePipelineAction,
  saveScorecardAction,
  approveOfferAction,
  rejectOfferAction,
} from "@/app/actions/scorecard";
import { writeAuditAction } from "@/app/actions/audit";
import AddCandidateModal from "@/components/ats/AddCandidateModal";
import EvaluationWorkspace from "@/components/ats/EvaluationWorkspace";
import AnalyticsPanel from "@/components/ats/AnalyticsPanel";
import AuditLogPanel from "@/components/ats/AuditLogPanel";
import JobsPanel from "@/components/ats/JobsPanel";
import PermissionsPanel from "@/components/ats/PermissionsPanel";
import ApplicantsPanel from "@/components/ats/ApplicantsPanel";
import JobAssignmentPanel from "@/components/ats/JobAssignmentPanel";
import UsersPanel from "@/components/ats/UsersPanel";
import UserRecordPanel from "@/components/ats/UserRecordPanel";
import HomePanel from "@/components/ats/HomePanel";


const TOTAL_BUDGET = 1200000;


interface ATSClientProps {
  user: SessionPayload & {
    profile?: {
      id: string;
      name: string;
      permissions: {
        canViewJobs?: boolean;
        canViewCandidates?: boolean;
        canAddJob?: boolean;
        canIngestCandidate?: boolean;
        canDragPipeline?: boolean;
        canViewAuditLog?: boolean;
        canApproveOffer?: boolean;
        canViewAnalytics?: boolean;
        canEditScorecard?: boolean;
        canManagePermissions?: boolean;
        canAssignJobs?: boolean;
      };
    };
  };
  initialData?: {
    jobs: Job[];
    candidates: Candidate[];
    auditLogs: AuditEntry[];
  };
  jobs?: Job[];
  candidates?: Candidate[];
  auditLogs?: AuditEntry[];
}


export default function ATSClient({
  user,
  initialData,
  jobs: propsJobs,
  candidates: propsCandidates,
  auditLogs: propsAuditLogs,
}: ATSClientProps) {
  const initialJobs = initialData?.jobs ?? propsJobs ?? [];
  const initialCandidates = initialData?.candidates ?? propsCandidates ?? [];
  const initialAuditLogs = initialData?.auditLogs ?? propsAuditLogs ?? [];


  const [tab, setTab] = useState<Tab>("home");


  const [role, setRole] = useState<Role>("founder");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState({ title: "", message: "", icon: "", visible: false });
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(initialAuditLogs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [, setActivePermissionRole] = useState<UserRole | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);


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
      canViewJobs: (dbPerms as any).recruitmentJobRead !== false && dbPerms.canViewJobs !== false,
      canViewCandidates: (dbPerms as any).recruitmentCandidateRead !== false && dbPerms.canViewCandidates !== false,
      canAddJob: !!((dbPerms as any).recruitmentJobCreate ?? dbPerms.canAddJob),
      canIngestCandidate: !!((dbPerms as any).recruitmentCandidateCreate ?? dbPerms.canIngestCandidate),
      canDragPipeline: !!((dbPerms as any).recruitmentCandidateUpdate ?? dbPerms.canDragPipeline),
      canViewAuditLog: !!dbPerms.canViewAuditLog,
      canApproveOffer: !!dbPerms.canApproveOffer,
      canViewAnalytics: !!dbPerms.canViewAnalytics,
      canEditScorecard: !!((dbPerms as any).recruitmentCandidateUpdate ?? dbPerms.canEditScorecard),
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


  const handleNavigateToRolePermissions = useCallback((role: UserRole) => {
    setActivePermissionRole(role);
    setTab("permissions");
    setSelectedUserId(null);
  }, []);


  function handleRoleChange(newRole: Role) {
    setRole(newRole);
    if (newRole === "founder") {
      showToast("Access Granted", "Logged in under Founder executive security node.", "shield-halved");
    } else {
      showToast("Recruiter Mode", "Operational recruitment pipeline active.", "info");
      if (tab === "audit" || tab === "permissions") setTab("pipeline");
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


  function addAuditLog(entry: AuditEntry) {
    setAuditLogs((prev) => [...prev, entry]);
  }


  async function persistAudit(entry: AuditEntry, resource = "system", resourceId = "—") {
    addAuditLog(entry);
    await writeAuditAction({
      action: entry.action,
      resource,
      targetId: resourceId,
      notes: entry.notes,
    }).catch(() => { });
  }


  function handleSaveCandidate(candidate: Candidate, auditEntry: AuditEntry) {
    setCandidates((prev) => [...prev, candidate]);
    addAuditLog(auditEntry);
  }


  function handleJobAdd(job: Job, audit: AuditEntry) {
    setJobs((prev) => [...prev, job]);
    addAuditLog(audit);
  }


  async function handleCandidateUpdate(updated: Candidate) {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }


  async function handleMoveStage(
    candidateId: string,
    targetStage: Candidate["stage"],
    proposedSalary?: number,
    proposedEquity?: number
  ) {
    await movePipelineAction(candidateId, targetStage, proposedSalary, proposedEquity).catch(() => { });
  }


  async function handleSaveScorecard(
    applicationId: string,
    scorecard: Candidate["scorecard"]
  ) {
    await saveScorecardAction({
      applicationId,
      technicalScore: scorecard.technicalScore,
      systemScore: scorecard.systemScore,
      cultureScore: scorecard.cultureScore,
      pros: scorecard.pros,
      cons: scorecard.cons,
      recommendation: scorecard.recommendation,
    }).catch(() => { });
  }


  async function handleApproveOffer(applicationId: string) {
    await approveOfferAction(applicationId).catch(() => { });
  }


  async function handleRejectOffer(applicationId: string) {
    await rejectOfferAction(applicationId).catch(() => { });
  }


  const allocated = candidates.reduce(
    (acc, c) => acc + (c.proposedSalary || c.expectedSalary || 0),
    0
  );


  const activeCandidate = activeCandidateId
    ? candidates.find((c) => c.id === activeCandidateId) ?? null
    : null;


  return (
    <>
      <Header
        role={role}
        onRoleChange={handleRoleChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        allocated={allocated}
        totalBudget={TOTAL_BUDGET}
        user={user}
        onToast={showToast}
      />


      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          role={role}
          userRole={user.role}
          tab={tab}
          candidateCount={candidates.length}
          jobCount={jobs.length}
          permissions={myPerms}
          onTabChange={(t) => {
            setTab(t);
            setSelectedUserId(null);
          }}
          onToast={showToast}
        />


        <main className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden relative transition-colors duration-200">
          <Toast toast={toast} />


          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {tab === "home" && (
              <HomePanel
                user={user}
                onNavigate={(t) => {
                  setTab(t as Tab);
                  setSelectedUserId(null);
                }}
              />
            )}

            {tab === "pipeline" && (
              <PipelineBoard
                candidates={candidates}
                jobs={jobs}
                role={role}
                permissions={myPerms}
                onCandidatesChange={setCandidates}
                onAuditLog={(entry) => persistAudit(entry, "applications", entry.target)}
                onOpenCandidate={(id) => setActiveCandidateId(id)}
                onToast={showToast}
                onMoveStage={handleMoveStage}
              />
            )}


            {tab === "jobs" && (
              <JobsPanel
                jobs={jobs}
                candidates={candidates}
                canAddJob={myPerms.canAddJob}
                onJobAdd={handleJobAdd}
                onToast={showToast}
              />
            )}


            {tab === "analytics" && (
              myPerms.canViewAnalytics
                ? <AnalyticsPanel candidates={candidates} totalBudget={TOTAL_BUDGET} />
                : <PermissionDenied label="Talent ROI Analytics" />
            )}


            {tab === "audit" && (
              myPerms.canViewAuditLog
                ? <AuditLogPanel logs={auditLogs} />
                : <PermissionDenied label="Security Audit Log" />
            )}


            {tab === "applicants" && (
              <ApplicantsPanel
                jobs={jobs}
                user={user}
                onOpenCandidate={(id) => setActiveCandidateId(id)}
                onToast={showToast}
              />
            )}


            {tab === "assignments" && (
              isFounder
                ? <JobAssignmentPanel jobs={jobs} onToast={showToast} />
                : <PermissionDenied label="Job Assignment Manager" />
            )}


            {tab === "users" && (
              isFounder
                ? (selectedUserId
                  ? (
                    <UserRecordPanel
                      userId={selectedUserId}
                      onBack={() => setSelectedUserId(null)}
                      onToast={showToast}
                      onNavigateToProfile={(profileId) => {
                        setSelectedUserId(null);
                        setActiveProfileId(profileId);
                        setTab("permissions");
                      }}
                    />
                  )
                  : <UsersPanel onToast={showToast} onNavigateToRolePermissions={handleNavigateToRolePermissions} onSelectUserId={setSelectedUserId} />
                )
                : <PermissionDenied label="User Management" />
            )}


            {tab === "permissions" && (
              isFounder
                ? (
                  <PermissionsPanel
                    initialSelectedProfileId={activeProfileId}
                    onClearInitialProfile={() => setActiveProfileId(null)}
                    onAuditLog={(entry) => persistAudit(entry, "role_permissions", entry.target)}
                    onToast={showToast}
                  />
                )
                : <PermissionDenied label="Permission Manager" />
            )}
          </div>
        </main>
      </div>


      {showAddModal && myPerms.canIngestCandidate && (
        <AddCandidateModal
          jobs={jobs}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveCandidate}
          onToast={showToast}
        />
      )}


      {activeCandidate && (
        <EvaluationWorkspace
          candidate={activeCandidate}
          role={role}
          canEditScorecard={myPerms.canEditScorecard}
          onClose={() => setActiveCandidateId(null)}
          onCandidateUpdate={handleCandidateUpdate}
          onAuditLog={(entry) => persistAudit(entry, "scorecards", activeCandidate.id)}
          onToast={showToast}
          onSaveScorecard={handleSaveScorecard}
          onApproveOffer={handleApproveOffer}
          onRejectOffer={handleRejectOffer}
        />
      )}
    </>
  );
}


function PermissionDenied({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center">
        <i className="fa-solid fa-lock text-2xl text-red-400 dark:text-red-500" />
      </div>
      <div>
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          You don&apos;t have permission to access this section.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Contact your Founder to request access.
        </p>
      </div>
    </div>
  );
}



