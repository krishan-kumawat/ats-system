"use client";

import { useState, useEffect, useMemo } from "react";
import { type Candidate, type Role, type AuditEntry } from "@/lib/atsStore";
import { fetchCandidateDetailsAction } from "@/app/actions/data";
import {
  updateCandidateAction,
  deleteCandidateAction,
  type UpdateCandidateInput,
} from "@/app/actions/scorecard";
import {
  fetchRecordAccessAction,
  fetchCollaboratorsAction,
  addManualShareAction,
  removeManualShareAction,
} from "@/app/actions/sharing";
import { fetchAssignableUsersAction, type UserOption } from "@/app/actions/assignments";

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

const SOURCE_OPTIONS = [
  "LinkedIn",
  "Referral",
  "Careers Page",
  "Job Portal",
  "Other",
] as const;

const STATUS_OPTIONS = [
  "NEW",
  "ACTIVE",
  "ON_HOLD",
  "REJECTED",
  "HIRED",
  "INACTIVE",
] as const;

export default function EvaluationWorkspace({
  candidate,
  role,
  onClose,
  onCandidateUpdate,
  onAuditLog,
  onToast,
}: EvaluationWorkspaceProps) {
  // Extract candidate UUID (in case candidate.id is in "candId::jobId" format)
  const candUuid = useMemo(() => {
    return candidate.id.includes("::") ? candidate.id.split("::")[0] : candidate.id;
  }, [candidate.id]);

  const [fullCandidate, setFullCandidate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Access rights & sharing
  const [access, setAccess] = useState({
    isEditable: true,
    isDeletable: true,
    isShareable: true,
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserOption[]>([]);
  const [shareTargetUserId, setShareTargetUserId] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState<"READ" | "EDIT">("READ");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);

  // Edit Candidate Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCurrentLocation, setEditCurrentLocation] = useState("");
  const [editTotalExperience, setEditTotalExperience] = useState("");
  const [editCurrentCompany, setEditCurrentCompany] = useState("");
  const [editCurrentDesignation, setEditCurrentDesignation] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");
  const [editResumeUrl, setEditResumeUrl] = useState("");
  const [editSource, setEditSource] = useState("LinkedIn");
  const [editCandidateStatus, setEditCandidateStatus] = useState("NEW");
  const [editSkillsText, setEditSkillsText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch candidate details & access permissions on mount or when candidate changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchCandidateDetailsAction(candUuid),
      fetchRecordAccessAction(candUuid, "Candidate"),
    ])
      .then(([detailsRes, accessRes]) => {
        if (!isMounted) return;

        if (detailsRes.status === "fulfilled" && detailsRes.value) {
          setFullCandidate(detailsRes.value);
        } else if (detailsRes.status === "rejected") {
          console.warn("Could not fetch remote candidate details:", detailsRes.reason);
        }

        if (accessRes.status === "fulfilled" && accessRes.value) {
          setAccess(accessRes.value);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load candidate.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [candUuid]);

  // Sync edit form fields when opening edit modal
  function handleOpenEdit() {
    const data = fullCandidate || {};
    const [defFirst, ...rest] = (candidate.name || "").trim().split(/\s+/);
    const defLast = rest.join(" ");

    setEditFirstName(data.firstName || candidate.firstName || defFirst || "");
    setEditLastName(data.lastName || candidate.lastName || defLast || "");
    setEditEmail(data.email || candidate.email || "");
    setEditPhone(data.phone || candidate.phone || "");
    setEditCurrentLocation(data.currentLocation || candidate.currentLocation || "");
    setEditTotalExperience(
      data.totalExperience != null
        ? String(data.totalExperience)
        : candidate.totalExperience != null
        ? String(candidate.totalExperience)
        : ""
    );
    setEditCurrentCompany(data.currentCompany || candidate.currentCompany || "");
    setEditCurrentDesignation(
      data.currentDesignation || candidate.currentDesignation || candidate.role || ""
    );
    setEditLinkedinUrl(data.linkedinUrl || candidate.linkedinUrl || "");
    setEditResumeUrl(data.resumeUrl || candidate.resumeUrl || "");
    setEditSource(data.source || candidate.source || "LinkedIn");
    setEditCandidateStatus(data.candidateStatus || candidate.candidateStatus || "NEW");

    const existingSkills: string[] = Array.isArray(data.skills)
      ? data.skills
      : Array.isArray(candidate.skills)
      ? candidate.skills
      : [];
    setEditSkillsText(existingSkills.join(", "));
    setShowEditModal(true);
  }

  // Handle Edit submission
  async function handleSaveEdit() {
    if (!editFirstName.trim()) {
      onToast("Required Field", "First Name is required.", "ban");
      return;
    }
    if (!editLastName.trim()) {
      onToast("Required Field", "Last Name is required.", "ban");
      return;
    }
    if (!editEmail.trim()) {
      onToast("Required Field", "Email Address is required.", "ban");
      return;
    }

    setSavingEdit(true);

    const parsedSkills = editSkillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatePayload: UpdateCandidateInput = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim() || undefined,
      currentLocation: editCurrentLocation.trim() || undefined,
      totalExperience: editTotalExperience ? parseFloat(editTotalExperience) : undefined,
      currentCompany: editCurrentCompany.trim() || undefined,
      currentDesignation: editCurrentDesignation.trim() || undefined,
      linkedinUrl: editLinkedinUrl.trim() || undefined,
      resumeUrl: editResumeUrl.trim() || undefined,
      source: editSource,
      candidateStatus: editCandidateStatus,
      skills: parsedSkills,
    };

    const res = await updateCandidateAction(candUuid, updatePayload);

    if (!res.success) {
      onToast("Update Failed", res.error || "Failed to update candidate.", "ban");
      setSavingEdit(false);
      return;
    }

    const updatedFullName = `${editFirstName.trim()} ${editLastName.trim()}`;
    const updatedCandidate: Candidate = {
      ...candidate,
      name: updatedFullName,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      currentLocation: editCurrentLocation.trim(),
      totalExperience: editTotalExperience ? parseFloat(editTotalExperience) : undefined,
      currentCompany: editCurrentCompany.trim(),
      currentDesignation: editCurrentDesignation.trim(),
      linkedinUrl: editLinkedinUrl.trim(),
      resumeUrl: editResumeUrl.trim(),
      source: editSource,
      candidateStatus: editCandidateStatus,
      skills: parsedSkills,
      role: editCurrentDesignation.trim() || candidate.role,
    };

    setFullCandidate((prev: any) => ({
      ...prev,
      ...updatePayload,
      name: updatedFullName,
    }));

    onCandidateUpdate(updatedCandidate);
    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: role === "founder" ? "Founder" : "Recruiter",
      action: "UPDATED_CANDIDATE",
      target: updatedFullName,
      notes: `Updated candidate profile details for ${updatedFullName}.`,
    });

    onToast("Candidate Saved", "Candidate details updated successfully.", "check");
    setSavingEdit(false);
    setShowEditModal(false);
  }

  // Handle Delete Candidate
  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete candidate ${candidate.name}?`)) {
      return;
    }
    setDeleting(true);

    const result = await deleteCandidateAction(candUuid);
    if (!result.success) {
      onToast("Error", result.error || "Failed to delete candidate.", "ban");
      setDeleting(false);
      return;
    }

    onToast("Candidate Deleted", `${candidate.name} has been removed.`, "trash");
    onClose();
  }

  // Open sharing modal
  const handleOpenSharing = async () => {
    setSharingLoading(true);
    setSharingError(null);
    setShowShareModal(true);
    try {
      const [collabs, users] = await Promise.all([
        fetchCollaboratorsAction(candUuid, "Candidate"),
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
      await addManualShareAction(candUuid, "Candidate", shareTargetUserId, shareAccessLevel);
      const updatedCollabs = await fetchCollaboratorsAction(candUuid, "Candidate");
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
      await removeManualShareAction(candUuid, "Candidate", targetUserId);
      const updatedCollabs = await fetchCollaboratorsAction(candUuid, "Candidate");
      setCollaborators(updatedCollabs);
      onToast("Revoked", "Sharing permission revoked.", "info");
    } catch (err: any) {
      setSharingError(err.message || "Failed to revoke share.");
    } finally {
      setSharingLoading(false);
    }
  };

  // Resolve display values
  const record = fullCandidate || {};
  const firstName = record.firstName || candidate.firstName || candidate.name?.split(" ")[0] || "—";
  const lastName =
    record.lastName ||
    candidate.lastName ||
    candidate.name?.split(" ").slice(1).join(" ") ||
    "—";
  const fullName = `${firstName} ${lastName}`.trim() || candidate.name || "Untitled Candidate";
  const email = record.email || candidate.email || "—";
  const phone = record.phone || candidate.phone || "—";
  const currentLocation = record.currentLocation || candidate.currentLocation || "—";
  const totalExperience =
    record.totalExperience != null
      ? `${record.totalExperience} Years`
      : candidate.totalExperience != null
      ? `${candidate.totalExperience} Years`
      : "—";
  const currentCompany = record.currentCompany || candidate.currentCompany || "—";
  const currentDesignation =
    record.currentDesignation || candidate.currentDesignation || candidate.role || "—";
  const source = record.source || candidate.source || candidate.sourceTag || "LinkedIn";
  const candidateStatus = record.candidateStatus || candidate.candidateStatus || "NEW";
  const linkedinUrl = record.linkedinUrl || candidate.linkedinUrl || "";
  const resumeUrl = record.resumeUrl || candidate.resumeUrl || "";
  const skillsList: string[] = Array.isArray(record.skills)
    ? record.skills
    : Array.isArray(candidate.skills)
    ? candidate.skills
    : [];

  // Associated job / application
  const primaryJob = record.candidateJobs?.[0]?.job || null;
  const jobTitle = primaryJob?.title || candidate.role || "—";
  const jobDepartment =
    (typeof primaryJob?.department === "object" ? primaryJob?.department?.name : primaryJob?.department) ||
    candidate.department ||
    "—";
  const applicationStage =
    record.candidateJobs?.[0]?.status || candidate.stage || "Applied";

  // System audit details
  const ownerName = record.owner
    ? `${record.owner.firstName} ${record.owner.lastName}`
    : "System Owner";
  const createdByName = record.createdBy
    ? `${record.createdBy.firstName} ${record.createdBy.lastName}`
    : "System";
  const createdDate = record.createdAt || record.createdDate;
  const formattedCreated = createdDate
    ? new Date(createdDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const lastModifiedByName = record.lastModifiedBy
    ? `${record.lastModifiedBy.firstName} ${record.lastModifiedBy.lastName}`
    : "System";
  const lastModifiedDate = record.updatedAt || record.lastModifiedDate;
  const formattedModified = lastModifiedDate
    ? new Date(lastModifiedDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  if (loading && !fullCandidate) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-8 space-y-4 bg-[#f4f6f9] dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Loading candidate record...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#f4f6f9] dark:bg-slate-950 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* 1. HIGHLIGHTS PANEL (Salesforce Header) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#1b96ff] text-white rounded-lg flex items-center justify-center shadow-sm">
            <i className="fa-solid fa-user-tie text-xl" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Candidate
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {fullName}
            </h1>
          </div>
        </div>

        {/* Action Buttons Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrow-left text-[11px]" />
            Back to Pipeline
          </button>

          {access.isShareable && (
            <button
              type="button"
              onClick={handleOpenSharing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-share-nodes text-[11px]" />
              Share
            </button>
          )}

          {access.isEditable && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-pen text-[10px]" />
              Edit
            </button>
          )}

          {access.isDeletable && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-trash text-[10px]" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Highlights Summary Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs flex-shrink-0">
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Email
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={email}>
            {email}
          </div>
        </div>

        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Phone
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{phone}</div>
        </div>

        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Current Location
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={currentLocation}>
            {currentLocation}
          </div>
        </div>

        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Total Experience
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{totalExperience}</div>
        </div>

        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Candidate Status
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 mt-1 border border-indigo-200/40">
            {candidateStatus}
          </span>
        </div>

        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-wider">
            Source
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{source}</div>
        </div>
      </div>

      {/* 2. CATEGORIZED SECTIONS (Single-Page Salesforce Layout) */}
      <div className="space-y-4">
        {/* SECTION 1: Personal Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-850/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-id-card text-indigo-600 dark:text-indigo-400 text-xs" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Personal Information
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">First Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{firstName}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Last Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{lastName}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Email Address</span>
              <a
                href={`mailto:${email}`}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              >
                {email}
              </a>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Phone Number</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{phone}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3 md:col-span-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Current Location</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentLocation}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Professional & Experience Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-850/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-briefcase text-indigo-600 dark:text-indigo-400 text-xs" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Professional Details
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Current Designation</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentDesignation}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Current Company</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentCompany}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Total Experience</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalExperience}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Candidate Source</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{source}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Candidate Status</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{candidateStatus}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">LinkedIn Profile</span>
              {linkedinUrl ? (
                <a
                  href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-linkedin" />
                  <span>View Profile</span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not Provided</span>
              )}
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Resume / CV</span>
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-file-pdf text-rose-500" />
                  <span>View Resume</span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not Uploaded</span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Candidate Skills & Proficiencies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-850/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-code text-indigo-600 dark:text-indigo-400 text-xs" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Candidate Skills &amp; Proficiencies
            </h2>
          </div>
          <div className="p-5">
            {skillsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                  >
                    <i className="fa-solid fa-check text-indigo-500 text-[10px]" />
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No skills listed for this candidate. Use Edit Candidate to add comma-separated skills.
              </p>
            )}
          </div>
        </div>

        {/* SECTION 4: Application & Assignment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-850/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-indigo-600 dark:text-indigo-400 text-xs" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Application &amp; Job Alignment
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Associated Position</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{jobTitle}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Department</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{jobDepartment}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3 md:col-span-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Pipeline Stage</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                {applicationStage}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: System Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-850/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-indigo-600 dark:text-indigo-400 text-xs" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              System Information
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3 md:col-span-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Candidate Owner</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{ownerName}</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Created By</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {createdByName} &middot; <span className="text-slate-400 font-normal">{formattedCreated}</span>
              </span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-3">
              <span className="text-slate-400 dark:text-slate-500 font-medium w-36 sm:w-40 flex-shrink-0">Last Modified By</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {lastModifiedByName} &middot; <span className="text-slate-400 font-normal">{formattedModified}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EDIT CANDIDATE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden my-8 transition-colors duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <i className="fa-solid fa-user-pen text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Edit Candidate Record
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update personal, professional, and credential information.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)] text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={editCurrentLocation}
                    onChange={(e) => setEditCurrentLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Total Exp (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editTotalExperience}
                    onChange={(e) => setEditTotalExperience(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Current Company
                  </label>
                  <input
                    type="text"
                    value={editCurrentCompany}
                    onChange={(e) => setEditCurrentCompany(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Current Designation
                  </label>
                  <input
                    type="text"
                    value={editCurrentDesignation}
                    onChange={(e) => setEditCurrentDesignation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Candidate Source
                  </label>
                  <select
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Candidate Status
                  </label>
                  <select
                    value={editCandidateStatus}
                    onChange={(e) => setEditCandidateStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={editLinkedinUrl}
                    onChange={(e) => setEditLinkedinUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Resume Document URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editResumeUrl}
                    onChange={(e) => setEditResumeUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Candidate Skills
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                      enter candidate skills by , seperated
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={editSkillsText}
                    onChange={(e) => setEditSkillsText(e.target.value)}
                    placeholder="e.g. React, TypeScript, Next.js, Node.js"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs" />
                    <span>Save Candidate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SALESFORCE SHARING MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-emerald-600" />
                Sharing Hierarchy: {fullName}
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {sharingError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px]">
                  {sharingError}
                </div>
              )}

              {/* Add Share Row */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  Grant Access to Teammate
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    value={shareTargetUserId}
                    onChange={(e) => setShareTargetUserId(e.target.value)}
                  >
                    <option value="">Select User...</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || u.email})
                      </option>
                    ))}
                  </select>

                  <select
                    className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    value={shareAccessLevel}
                    onChange={(e) => setShareAccessLevel(e.target.value as "READ" | "EDIT")}
                  >
                    <option value="READ">Read Only</option>
                    <option value="EDIT">Read/Write</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddShare}
                    disabled={!shareTargetUserId || sharingLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded"
                  >
                    Share
                  </button>
                </div>
              </div>

              {/* Collaborators List */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  Active Access List
                </div>
                {sharingLoading ? (
                  <div className="text-center py-4 text-slate-400">Loading access rights...</div>
                ) : collaborators.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 italic">
                    No explicit manual shares configured.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                    {collaborators.map((c) => (
                      <div
                        key={c.id || c.userId}
                        className="p-2.5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.user ? `${c.user.firstName} ${c.user.lastName}` : c.userName || "User"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {c.user?.email || c.userEmail} &middot;{" "}
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {c.accessLevel}
                            </span>
                          </div>
                        </div>
                        {c.rowCause === "Manual" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveShare(c.userId || c.user?.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
