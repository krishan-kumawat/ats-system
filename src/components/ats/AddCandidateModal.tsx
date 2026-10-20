"use client";

import { useState, useEffect, useRef } from "react";
import { type Candidate, type AuditEntry, type Job } from "@/lib/atsStore";
import { ingestCandidateAction, fetchJobsListAction, type JobOption } from "@/app/actions/scorecard";

interface AddCandidateModalProps {
  jobs?: Job[];
  onClose: () => void;
  onSave?: (candidate: Candidate, auditEntry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
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

export default function AddCandidateModal({
  jobs = [],
  onClose,
  onSave,
  onToast,
}: AddCandidateModalProps) {
  // Required fields
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Optional fields
  const [phone, setPhone] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [totalExperience, setTotalExperience] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentDesignation, setCurrentDesignation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState<string>("LinkedIn");
  const [candidateStatus, setCandidateStatus] = useState<string>("NEW");
  const [skillsText, setSkillsText] = useState("");

  // Resume File (UI only)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Job options list state
  const [availableJobs, setAvailableJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [saving, setSaving] = useState(false);

  // Always fetch fresh jobs from the job endpoint on mount and filter to OPEN status
  useEffect(() => {
    let isMounted = true;
    setLoadingJobs(true);

    fetchJobsListAction()
      .then((fetched) => {
        if (!isMounted) return;
        // Filter to only show jobs with "OPEN" status
        const openJobs = fetched.filter(
          (j) => (j.status || "OPEN").toUpperCase() === "OPEN"
        );
        setAvailableJobs(openJobs);
        if (openJobs.length > 0) {
          setSelectedJobId((prev) =>
            prev && openJobs.some((j) => j.id === prev) ? prev : openJobs[0].id
          );
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback to passed jobs if available
        const openPassed = jobs.filter(
          (j) => (j.status || "OPEN").toUpperCase() === "OPEN"
        );
        const mapped = openPassed.map((j) => ({
          id: j.id,
          title: j.title,
          department: j.department,
          status: j.status,
        }));
        setAvailableJobs(mapped);
        if (mapped.length > 0) {
          setSelectedJobId(mapped[0].id);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingJobs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jobs]);

  // Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        onToast("Invalid File Type", "Please upload a valid PDF document (.pdf).", "ban");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setResumeFile(file);
    }
  }

  function removeFile() {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    // Validation
    if (!resumeFile) {
      onToast("Resume Required", "Please attach a PDF resume to proceed.", "ban");
      return;
    }
    if (!selectedJobId) {
      onToast("Selection Required", "Please select an associated Job.", "ban");
      return;
    }
    if (!firstName.trim()) {
      onToast("Required Field", "First Name is required.", "ban");
      return;
    }
    if (!lastName.trim()) {
      onToast("Required Field", "Last Name is required.", "ban");
      return;
    }
    if (!email.trim()) {
      onToast("Required Field", "Email Address is required.", "ban");
      return;
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      onToast("Invalid Email", "Please enter a valid email address.", "ban");
      return;
    }

    setSaving(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const selectedJob = availableJobs.find((j) => j.id === selectedJobId);

    // Parse comma-separated skills
    const parsedSkills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Build FormData with PDF attached under key 'resume'
    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("firstName", firstName.trim());
    formData.append("lastName", lastName.trim());
    formData.append("email", email.trim().toLowerCase());
    formData.append("jobId", selectedJobId.trim());

    if (phone.trim()) formData.append("phone", phone.trim());
    if (currentLocation.trim()) formData.append("currentLocation", currentLocation.trim());
    if (totalExperience) formData.append("totalExperience", totalExperience.trim());
    if (currentCompany.trim()) formData.append("currentCompany", currentCompany.trim());
    if (currentDesignation.trim()) formData.append("currentDesignation", currentDesignation.trim());
    if (linkedinUrl.trim()) formData.append("linkedinUrl", linkedinUrl.trim());
    if (source) formData.append("source", source);
    if (candidateStatus) formData.append("candidateStatus", candidateStatus);
    formData.append("skills", JSON.stringify(parsedSkills));

    const result = await ingestCandidateAction(formData);

    if (result.error) {
      onToast("Error Adding Candidate", result.error, "circle-exclamation");
      setSaving(false);
      return;
    }

    const candidateId =
      result.candidateId ||
      result.candidate?.id ||
      result.applicationId?.split("::")[0] ||
      `cnd-${Date.now()}`;

    const newCandidate: Candidate = {
      id: candidateId,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      currentLocation: currentLocation.trim(),
      totalExperience: totalExperience ? parseFloat(totalExperience) : undefined,
      currentCompany: currentCompany.trim(),
      currentDesignation: currentDesignation.trim(),
      linkedinUrl: linkedinUrl.trim(),
      source,
      candidateStatus,
      role: currentDesignation.trim() || selectedJob?.title || "Candidate",
      department: selectedJob?.department || "Engineering",
      stage: "Applied",
      sourceTag: source,
      skills: parsedSkills,
      expectedSalary: 0,
      proposedSalary: 0,
      proposedEquity: 0,
      jobId: selectedJobId,
      resumeUrl: result.candidate?.resumeUrl,
      resumeFileId: result.candidate?.resumeFileId,
      resumePreviewUrl: result.candidate?.resumePreviewUrl,
      resumeDownloadUrl: result.candidate?.resumeDownloadUrl,
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
      user: "Current User",
      action: "CREATED_CANDIDATE",
      target: fullName,
      notes: `Added candidate to job "${selectedJob?.title ?? selectedJobId}" (Skills: ${parsedSkills.join(", ") || "None"})`,
    };

    if (onSave) {
      onSave(newCandidate, auditEntry);
    }

    onToast("Candidate Created", `${fullName} has been successfully added.`, "check");
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden my-8 transition-colors duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-candidate-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <i className="fa-solid fa-user-plus text-base" />
            </div>
            <div>
              <h3 id="add-candidate-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add New Candidate
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register candidate details and assign to an active job opening.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* SECTION 1: Associated Job & Status */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <i className="fa-solid fa-briefcase text-indigo-500" />
              <span>Position & Assignment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Dropdown (Required, fetched via job endpoint) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Associated Job <span className="text-red-500">*</span>
                </label>
                {loadingJobs ? (
                  <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center px-3 gap-2 text-xs text-slate-400 animate-pulse">
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    <span>Fetching open jobs from server...</span>
                  </div>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="" disabled>Select Job Position</option>
                    {availableJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} {j.department ? `(${j.department})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Candidate Status Dropdown */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Candidate Status
                </label>
                <select
                  value={candidateStatus}
                  onChange={(e) => setCandidateStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <i className="fa-solid fa-id-card text-indigo-500" />
              <span>Personal Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs pointer-events-none">
                    <i className="fa-solid fa-envelope" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul.sharma@example.com"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs pointer-events-none">
                    <i className="fa-solid fa-phone" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Current Location
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs pointer-events-none">
                    <i className="fa-solid fa-location-dot" />
                  </span>
                  <input
                    type="text"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, Karnataka, India"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Professional Experience & Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <i className="fa-solid fa-user-tie text-indigo-500" />
              <span>Professional Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Experience */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Total Exp (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={totalExperience}
                  onChange={(e) => setTotalExperience(e.target.value)}
                  placeholder="e.g. 5.5"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Current Company */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Current Company
                </label>
                <input
                  type="text"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="e.g. TechCorp"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Current Designation */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Current Designation
                </label>
                <input
                  type="text"
                  value={currentDesignation}
                  onChange={(e) => setCurrentDesignation(e.target.value)}
                  placeholder="e.g. Senior Engineer"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Candidate Source */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Candidate Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                >
                  {SOURCE_OPTIONS.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>

              {/* LinkedIn Profile URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs pointer-events-none">
                    <i className="fa-brands fa-linkedin text-indigo-500" />
                  </span>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Candidate Skills (textarea with info span tag) */}
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
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  placeholder="e.g. React, TypeScript, Next.js, PostgreSQL, Node.js"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Resume Document (File Upload) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <i className="fa-solid fa-file-pdf text-red-500" />
                <span>Resume Document <span className="text-red-500">*</span></span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">PDF only (Max 10MB)</span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {!resumeFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-5 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/30 group"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-cloud-arrow-up text-sm" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to browse or drag and drop resume
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Supports standard CV formats
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-file-lines text-sm" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {resumeFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(resumeFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    Ready
                  </span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    title="Remove file"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                <span>Creating Candidate...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs" />
                <span>Add Candidate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
