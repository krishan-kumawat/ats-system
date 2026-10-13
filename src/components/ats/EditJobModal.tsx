"use client";


import { useState, useEffect, useRef } from "react";
import { JobStatus } from "@/lib/atsStore";
import { updateJobSimpleAction, fetchDepartmentsAction, DepartmentOption } from "@/app/actions/jobs";


const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Open" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "CLOSED", label: "Closed" },
];


interface EditJobModalProps {
    record: any;
    onClose: () => void;
    onSaved: () => void;
    onToast: (title: string, msg: string, icon?: string) => void;
}


function normalizeStatus(raw: string): JobStatus {
    const s = (raw || "").toUpperCase().replace(/ /g, "_");
    if (s === "OPEN" || s === "DRAFT" || s === "ON_HOLD" || s === "CLOSED") return s as JobStatus;
    return "DRAFT";
}


export default function EditJobModal({ record, onClose, onSaved, onToast }: EditJobModalProps) {
    const [title, setTitle] = useState(record.title || "");
    const [description, setDescription] = useState(record.description || "");
    const [status, setStatus] = useState<JobStatus>(normalizeStatus(record.status));
    const [budget, setBudget] = useState(record.budgetLimit ? String(record.budgetLimit) : "");
    const [saving, setSaving] = useState(false);


    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [deptQuery, setDeptQuery] = useState(record.department?.name || "");
    const [deptOpen, setDeptOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState<DepartmentOption | null>(
        record.department?.id ? { id: record.department.id, name: record.department.name } : null
    );
    const comboRef = useRef<HTMLDivElement>(null);


    const [statusOpen, setStatusOpen] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        fetchDepartmentsAction().then((depts) => {
            setDepartments(depts);
            setLoadingDepts(false);
            if (!selectedDept && record.department?.name) {
                const match = depts.find((d) => d.name === record.department.name);
                if (match) {
                    setSelectedDept(match);
                    setDeptQuery(match.name);
                }
            }
        });
    }, []);


    useEffect(() => {
        function handler(e: MouseEvent) {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
                setDeptOpen(false);
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


        setSaving(true);


        const result = await updateJobSimpleAction(record.id, {
            title: title.trim(),
            description: description.trim(),
            status,
            departmentId: selectedDept?.id || undefined,
            budgetLimit: budget ? Number(budget) : undefined,
        });


        if (result.error) {
            onToast("Error", result.error, "ban");
            setSaving(false);
            return;
        }


        onToast("Job Updated", `"${title.trim()}" has been updated.`, "briefcase");
        setSaving(false);
        onSaved();
    }


    return (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col transition-colors duration-200">


                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center">
                            <i className="fa-solid fa-pen-to-square text-amber-600 dark:text-amber-400 text-sm" />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">
                            Edit Job Requisition
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
                            placeholder="e.g. Senior NestJS Developer"
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
                            placeholder="Job description…"
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>


                    {/* Department + Status row */}
                    <div className="grid grid-cols-2 gap-4">


                        {/* Department combobox */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Department
                            </label>


                            {loadingDepts ? (
                                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                    Loading…
                                </div>
                            ) : departments.length === 0 ? (
                                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-400">
                                    No departments
                                </div>
                            ) : (
                                <div className="relative" ref={comboRef}>
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
                                            placeholder="Search…"
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
                                                <li className="px-3 py-3 text-xs text-slate-400 text-center">No match</li>
                                            ) : filteredDepts.map((d) => (
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
                                            ))}
                                        </ul>
                                    )}
                                </div>
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


                        {/* Status combobox */}
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


                    {/* Budget */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Budget Ceiling (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">$</span>
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


                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loadingDepts}
                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? (
                            <><i className="fa-solid fa-circle-notch fa-spin" /><span>Saving…</span></>
                        ) : (
                            <><i className="fa-solid fa-floppy-disk" /><span>Save Changes</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}



