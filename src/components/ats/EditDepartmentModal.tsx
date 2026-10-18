"use client";

import { useState, useEffect } from "react";
import {
  fetchDepartmentsListAction,
  updateDepartmentAction,
  DepartmentItem,
} from "@/app/actions/departments";

interface EditDepartmentModalProps {
  record: any;
  onClose: () => void;
  onSaved: (updatedDept?: DepartmentItem) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function EditDepartmentModal({
  record,
  onClose,
  onSaved,
  onToast,
}: EditDepartmentModalProps) {
  const [name, setName] = useState(record?.name || "");
  const [parentId, setParentId] = useState<string>(
    record?.parentId || record?.parent?.id || ""
  );
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartmentsListAction()
      .then((data) => {
        // Exclude current department to prevent circular hierarchy
        setDepartments(data.filter((d) => d.id !== record?.id));
      })
      .finally(() => {
        setLoadingDepts(false);
      });
  }, [record?.id]);

  async function handleSave() {
    if (!name.trim()) {
      onToast("Missing Field", "Department name is required.", "ban");
      return;
    }

    setSaving(true);
    const result = await updateDepartmentAction(record.id, {
      name: name.trim(),
      parentId: parentId ? parentId : null,
    });

    if (result.error) {
      onToast("Error", result.error, "ban");
      setSaving(false);
      return;
    }

    onToast("Department Updated", `"${name.trim()}" has been updated.`, "building");
    setSaving(false);
    onSaved(result.department);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col transition-colors duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center">
              <i className="fa-solid fa-pen-to-square text-amber-600 dark:text-amber-400 text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                Edit Department
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Update organizational unit details and hierarchy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Sales, Human Resources"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Parent Department */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Parent Department <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={loadingDepts}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              <option value="">-- None (Top Level Department) --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-40"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-[10px]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
