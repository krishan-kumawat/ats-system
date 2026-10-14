"use client";

import { useState, useEffect, useRef } from "react";
import { Job, JobStatus, AuditEntry } from "@/lib/atsStore";
import { createJobAction, updateJobAction, fetchDepartmentsAction, DepartmentOption } from "@/app/actions/jobs";
import { fetchHiringManagerUsersAction, UserOption } from "@/app/actions/assignments";
import { ROLE_META } from "@/lib/permissions";
import { UserRole } from "@/lib/enums";

interface AddJobModalProps {
  onClose: () => void;
  onSave: (job: Job, audit: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  mode?: "create" | "edit" | "clone";
  jobId?: string;
  initialValues?: {
    title: string;
    department: string;
    departmentId?: string;
    status: JobStatus;
    budget: string;
    hiringManagerName?: string;
    hiringManagerId?: string;
  };
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "DRAFT", label: "Draft" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CLOSED", label: "Closed" },
];

export default function AddJobModal({
  onClose,
  onSave,
  onToast,
  mode = "create",
  jobId,
  initialValues,
}: AddJobModalProps) {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [status, setStatus] = useState<JobStatus>(initialValues?.status || "OPEN");
  const [budget, setBudget] = useState(initialValues?.budget || "");
  const [saving, setSaving] = useState(false);

  // Department combobox state
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [deptQuery, setDeptQuery] = useState(initialValues?.department || "");
  const [deptOpen, setDeptOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentOption | null>(null);
  const deptComboRef = useRef<HTMLDivElement>(null);

  // Hiring Manager combobox state
  const [hmUsers, setHmUsers] = useState<UserOption[]>([]);
  const [loadingHM, setLoadingHM] = useState(true);
  const [hmQuery, setHmQuery] = useState(initialValues?.hiringManagerName || "");
  const [hmOpen, setHmOpen] = useState(false);
  const [selectedHM, setSelectedHM] = useState<UserOption | null>(
    initialValues?.hiringManagerId && initialValues?.hiringManagerName
      ? { id: initialValues.hiringManagerId, name: initialValues.hiringManagerName, email: "", role: UserRole.HIRING_MANAGER }
      : null
  );
  const hmComboRef = useRef<HTMLDivElement>(null);

  // Load departments
  useEffect(() => {
    fetchDepartmentsAction().then((depts) => {
      setDepartments(depts);
      setLoadingDepts(false);
      const targetId = initialValues?.departmentId;
      const targetName = initialValues?.department;
      const matched = depts.find(
        (d) => (targetId && d.id === targetId) || (targetName && d.name.toLowerCase() === targetName.toLowerCase())
      );
      if (matched) {
        setSelectedDept(matched);
        setDeptQuery(matched.name);
      } else if (targetName) {
        setDeptQuery(targetName);
      }
    });
  }, [initialValues?.department, initialValues?.departmentId]);

  // Load users for Hiring Manager
  useEffect(() => {
    fetchHiringManagerUsersAction().then((users) => {
      setHmUsers(users);
      setLoadingHM(false);
      const targetId = initialValues?.hiringManagerId;
      const targetName = initialValues?.hiringManagerName;
      const matched = users.find(
        (u) => (targetId && u.id === targetId) || (targetName && u.name.toLowerCase() === targetName.toLowerCase())
      );
      if (matched) {
        setSelectedHM(matched);
        setHmQuery(matched.name);
      } else if (targetName) {
        setHmQuery(targetName);
      }
    });
  }, [initialValues?.hiringManagerName, initialValues?.hiringManagerId]);

  useEffect(() => {
    if (initialValues?.title) setTitle(initialValues.title);
    if (initialValues?.status) setStatus(initialValues.status);
    if (initialValues?.budget != null && initialValues.budget !== "") setBudget(String(initialValues.budget));
  }, [initialValues?.title, initialValues?.status, initialValues?.budget]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (hmComboRef.current && !hmComboRef.current.contains(e.target as Node)) {
        setHmOpen(false);
      }
      if (deptComboRef.current && !deptComboRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredDepts = departments.filter((d) =>
    !deptQuery || d.name.toLowerCase().includes(deptQuery.toLowerCase())
  );

  function selectDept(d: DepartmentOption) {
    setSelectedDept(d);
    setDeptQuery(d.name);
    setDeptOpen(false);
  }

  const filteredHM = hmUsers.filter((u) =>
    !hmQuery || u.name.toLowerCase().includes(hmQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(hmQuery.toLowerCase())
  );

  function selectHM(u: UserOption) {
    setSelectedHM(u);
    setHmQuery(u.name);
    setHmOpen(false);
  }

  async function handleSave() {
    if (!title.trim()) {
      onToast("Missing Field", "Job title is required.", "ban");
      return;
    }
    const finalDept = selectedDept?.name || deptQuery.trim();
    if (!finalDept) {
      onToast("Missing Field", "Department is required.", "ban");
      return;
    }
    if (!selectedHM) {
      onToast("Missing Field", "Please select a Hiring Manager.", "ban");
      return;
    }

    setSaving(true);

    if (mode === "edit") {
      const result = await updateJobAction(jobId!, {
        title: title.trim(),
        department: finalDept,
        departmentId: selectedDept?.id,
        hiringManager: selectedHM.name,
        hiringManagerId: selectedHM.id,
        status,
        budgetLimit: budget ? parseInt(budget) : 0,
      });

      if (result.error) {
        onToast("Error", result.error, "ban");
        setSaving(false);
        return;
      }

      const job = result.job!;
      const audit: AuditEntry = {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "System",
        action: "EDITED_JOB",
        target: `${job.id} (${job.title})`,
        notes: `Job requisition updated. Department: ${finalDept}. HM: ${selectedHM.name}. Budget: $${(budget ? parseInt(budget) : 0).toLocaleString("en-US")}.`,
      };

      onSave(job, audit);
      onToast("Job Updated", `"${title.trim()}" has been updated.`, "pen-to-square");
    } else {
      const result = await createJobAction({
        title: title.trim(),
        department: finalDept,
        departmentId: selectedDept?.id,
        hiringManager: selectedHM.name,
        hiringManagerId: selectedHM.id,
        status,
        budgetLimit: budget ? parseInt(budget) : 0,
      });

      if (result.error) {
        onToast("Error", result.error, "ban");
        setSaving(false);
        return;
      }

      const job = result.job!;
      const audit: AuditEntry = {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "System",
        action: mode === "clone" ? "CLONED_JOB" : "CREATED_JOB",
        target: `${job.id} (${job.title})`,
        notes: `Job requisition ${mode === "clone" ? "cloned" : "created"}. Department: ${finalDept}. HM: ${selectedHM.name}. Budget: $${(budget ? parseInt(budget) : 0).toLocaleString("en-US")}.`,
      };

      onSave(job, audit);
      onToast(
        mode === "clone" ? "Job Cloned" : "Job Created",
        `"${title.trim()}" has been ${mode === "clone" ? "cloned and saved" : "added to active requisitions"}.`,
        mode === "clone" ? "copy" : "briefcase"
      );
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col transition-colors duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center">
              <i className="fa-solid fa-briefcase text-indigo-600 dark:text-indigo-400 text-sm" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              {mode === "edit" ? "Edit Job Requisition" : mode === "clone" ? "Clone Job Requisition" : "Create New Job Requisition"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Department combobox + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>

              {loadingDepts ? (
                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                  Loading…
                </div>
              ) : (
                <div className="relative" ref={deptComboRef}>
                  <div className="relative">
                    <i className="fa-solid fa-building absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      value={deptQuery}
                      onFocus={() => setDeptOpen(true)}
                      onChange={(e) => {
                        setDeptQuery(e.target.value);
                        setSelectedDept(null);
                        setDeptOpen(true);
                      }}
                      placeholder="Search department…"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-8 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setDeptOpen((o) => !o)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <i className={`fa-solid fa-chevron-${deptOpen ? "up" : "down"} text-[10px]`} />
                    </button>
                  </div>

                  {/* Department Dropdown */}
                  {deptOpen && (
                    <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                      {filteredDepts.length === 0 ? (
                        <li className="px-3 py-3 text-xs text-slate-400 text-center">
                          {deptQuery ? `Use "${deptQuery}"` : "No departments found"}
                        </li>
                      ) : (
                        filteredDepts.map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              onClick={() => selectDept(d)}
                              className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-2.5 ${selectedDept?.id === d.id ? "bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <i className="fa-solid fa-building text-[10px] text-slate-500 dark:text-slate-400" />
                              </div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{d.name}</span>
                              {selectedDept?.id === d.id && (
                                <i className="fa-solid fa-check text-indigo-600 dark:text-indigo-400 text-[10px] ml-auto flex-shrink-0" />
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}

                  {selectedDept && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{selectedDept.name}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedDept(null); setDeptQuery(""); }}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                      >
                        <i className="fa-solid fa-xmark text-[10px]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Hiring Manager combobox + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Hiring Manager <span className="text-red-500">*</span>
              </label>

              {loadingHM ? (
                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                  Loading…
                </div>
              ) : hmUsers.length === 0 ? (
                <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                  No users found
                </div>
              ) : (
                <div className="relative" ref={hmComboRef}>
                  <div className="relative">
                    <i className="fa-solid fa-user-tie absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      value={hmQuery}
                      onFocus={() => setHmOpen(true)}
                      onChange={(e) => {
                        setHmQuery(e.target.value);
                        setSelectedHM(null);
                        setHmOpen(true);
                      }}
                      placeholder="Search by name…"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-8 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setHmOpen((o) => !o)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <i className={`fa-solid fa-chevron-${hmOpen ? "up" : "down"} text-[10px]`} />
                    </button>
                  </div>

                  {/* Dropdown list */}
                  {hmOpen && (
                    <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                      {filteredHM.length === 0 ? (
                        <li className="px-3 py-3 text-xs text-slate-400 text-center">No users match</li>
                      ) : filteredHM.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => selectHM(u)}
                            className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-2.5 ${selectedHM?.id === u.id ? "bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                          >
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                            </div>
                            <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${ROLE_META[u.role]?.bg ?? ""} ${ROLE_META[u.role]?.color ?? ""}`}>
                              {ROLE_META[u.role]?.label ?? u.role}
                            </span>
                            {selectedHM?.id === u.id && (
                              <i className="fa-solid fa-check text-indigo-600 dark:text-indigo-400 text-[10px] flex-shrink-0" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {selectedHM && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{selectedHM.name}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedHM(null); setHmQuery(""); }}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                      >
                        <i className="fa-solid fa-xmark text-[10px]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Budget Ceiling (USD)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-xs">
                  $
                </span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <i className={`fa-solid ${mode === "edit" ? "fa-pen-to-square" : mode === "clone" ? "fa-copy" : "fa-plus"} text-xs`} />
                <span>{mode === "edit" ? "Save Changes" : mode === "clone" ? "Clone Requisition" : "Create Requisition"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
