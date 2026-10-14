"use client";

import { useState, useEffect, useRef } from "react";
import { Job, JobStatus, AuditEntry } from "@/lib/atsStore";
import { createJobSimpleAction, fetchDepartmentsAction, DepartmentOption } from "@/app/actions/jobs";
import { fetchHiringManagerUsersAction, UserOption } from "@/app/actions/assignments";
import { ROLE_META } from "@/lib/permissions";

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Open" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "CLOSED", label: "Closed" },
];

interface CreateJobModalProps {
    onClose: () => void;
    onSave: (job: Job, audit: AuditEntry) => void;
    onToast: (title: string, msg: string, icon?: string) => void;
}

export default function CreateJobModal({ onClose, onSave, onToast }: CreateJobModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<JobStatus>("DRAFT");
    const [budget, setBudget] = useState("");
    const [saving, setSaving] = useState(false);

    // Department combobox state
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [deptQuery, setDeptQuery] = useState("");
    const [deptOpen, setDeptOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState<DepartmentOption | null>(null);
    const deptComboRef = useRef<HTMLDivElement>(null);

    // Hiring Manager combobox state
    const [hmUsers, setHmUsers] = useState<UserOption[]>([]);
    const [loadingHM, setLoadingHM] = useState(true);
    const [hmQuery, setHmQuery] = useState("");
    const [hmOpen, setHmOpen] = useState(false);
    const [selectedHM, setSelectedHM] = useState<UserOption | null>(null);
    const hmComboRef = useRef<HTMLDivElement>(null);

    // Status dropdown state
    const [statusOpen, setStatusOpen] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);

    // Load departments
    useEffect(() => {
        fetchDepartmentsAction().then((depts) => {
            setDepartments(depts);
            setLoadingDepts(false);
        });
    }, []);

    // Load users for Hiring Manager
    useEffect(() => {
        fetchHiringManagerUsersAction().then((users) => {
            setHmUsers(users);
            setLoadingHM(false);
        });
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (deptComboRef.current && !deptComboRef.current.contains(e.target as Node)) {
                setDeptOpen(false);
            }
            if (hmComboRef.current && !hmComboRef.current.contains(e.target as Node)) {
                setHmOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
                setStatusOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredDepts = departments.filter(
        (d) => !deptQuery || d.name.toLowerCase().includes(deptQuery.toLowerCase())
    );

    function selectDept(d: DepartmentOption) {
        setSelectedDept(d);
        setDeptQuery(d.name);
        setDeptOpen(false);
    }

    const filteredHM = hmUsers.filter(
        (u) =>
            !hmQuery ||
            u.name.toLowerCase().includes(hmQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(hmQuery.toLowerCase())
    );

    function selectHM(u: UserOption) {
        setSelectedHM(u);
        setHmQuery(u.name);
        setHmOpen(false);
    }

    const selectedStatusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || "Draft";

    async function handleSave() {
        if (!title.trim()) {
            onToast("Missing Field", "Job title is required.", "ban");
            return;
        }
        if (!description.trim()) {
            onToast("Missing Field", "Job description is required.", "ban");
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

        const result = await createJobSimpleAction({
            title: title.trim(),
            description: description.trim(),
            departmentId: selectedDept?.id || undefined,
            departmentName: finalDept,
            ownerId: selectedHM.id,
            hiringManager: selectedHM.name,
            status,
            budgetLimit: budget ? Number(budget) : undefined,
        });

        if (result.error) {
            onToast("Error", result.error, "ban");
            setSaving(false);
            return;
        }

        const job = result.job;
        const audit: AuditEntry = {
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            user: "System",
            action: "CREATED_JOB",
            target: `${job.id} (${job.title})`,
            notes: `Job requisition created. Department: ${finalDept}. HM: ${selectedHM.name}. Status: ${selectedStatusLabel}.`,
        };

        onSave(job, audit);
        onToast("Job Created", `"${title.trim()}" has been added to active requisitions.`, "briefcase");
        setSaving(false);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col transition-colors duration-200 max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center">
                            <i className="fa-solid fa-briefcase text-indigo-600 dark:text-indigo-400 text-sm" />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">
                            Create New Job Requisition
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto">

                    {/* Title */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Job Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Senior Backend Developer"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. We are looking for an experienced developer with deep technical expertise."
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>

                    {/* Department + Status row */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Department combobox */}
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

                        {/* Status dropdown */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Status
                            </label>

                            <div className="relative" ref={statusRef}>
                                <button
                                    type="button"
                                    onClick={() => setStatusOpen((o) => !o)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all flex items-center justify-between"
                                >
                                    <span>{selectedStatusLabel}</span>
                                    <i className={`fa-solid fa-chevron-${statusOpen ? "up" : "down"} text-[10px] text-slate-400`} />
                                </button>

                                {statusOpen && (
                                    <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                                        {STATUS_OPTIONS.map((s) => (
                                            <li key={s.value}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setStatus(s.value); setStatusOpen(false); }}
                                                    className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between ${status === s.value ? "bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                                                >
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{s.label}</span>
                                                    {status === s.value && (
                                                        <i className="fa-solid fa-check text-indigo-600 dark:text-indigo-400 text-[10px]" />
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hiring Manager combobox + Budget row */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Hiring Manager combobox */}
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
                                            placeholder="Search user…"
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

                                    {hmOpen && (
                                        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                                            {filteredHM.length === 0 ? (
                                                <li className="px-3 py-3 text-xs text-slate-400 text-center">No users match</li>
                                            ) : (
                                                filteredHM.map((u) => (
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
                                                ))
                                            )}
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

                        {/* Budget */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Budget Ceiling (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">₹</span>
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="150000"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-6 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loadingDepts || loadingHM}
                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? (
                            <><i className="fa-solid fa-circle-notch fa-spin" /><span>Creating…</span></>
                        ) : (
                            <><i className="fa-solid fa-plus" /><span>Create Requisition</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
