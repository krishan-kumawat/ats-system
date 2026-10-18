"use client";

import React, { useState, useEffect } from "react";
import {
  fetchDepartmentDetailsAction,
  deleteDepartmentAction,
  DepartmentItem,
} from "@/app/actions/departments";
import EditDepartmentModal from "@/components/ats/EditDepartmentModal";

interface DepartmentRecordPageProps {
  departmentId: string;
  departmentRecord?: any;
  onBack: () => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onDepartmentUpdate?: (dept: DepartmentItem) => void;
  onDepartmentDelete?: (deptId: string) => void;
}

export default function DepartmentRecordPage({
  departmentId,
  departmentRecord,
  onBack,
  onToast,
  onDepartmentUpdate,
  onDepartmentDelete,
}: DepartmentRecordPageProps) {
  const [department, setDepartment] = useState<DepartmentItem | null>(departmentRecord || null);
  const [loading, setLoading] = useState(!departmentRecord);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetchDepartmentDetailsAction(departmentId);
        if (!active) return;
        if (res.error) {
          if (!department) setError(res.error);
        } else if (res.department) {
          setDepartment(res.department);
        }
      } catch (err: any) {
        if (!active) return;
        if (!department) setError(err.message || "Failed to load department details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [departmentId]);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete the "${department?.name || "department"}" record?`)) {
      return;
    }

    setDeleting(true);
    const res = await deleteDepartmentAction(departmentId);
    if (!res.success) {
      onToast("Error", res.error || "Failed to delete department.", "ban");
      setDeleting(false);
      return;
    }

    onToast("Deleted", "Department record has been deleted.", "trash-can");
    onDepartmentDelete?.(departmentId);
    onBack();
  }

  function handleEditSaved(updated?: DepartmentItem) {
    if (updated) {
      setDepartment(updated);
      onDepartmentUpdate?.(updated);
    }
    // Re-fetch to ensure parent entity relations are resolved
    fetchDepartmentDetailsAction(departmentId).then((res) => {
      if (res.department) {
        setDepartment(res.department);
        onDepartmentUpdate?.(res.department);
      }
    });
  }

  if (loading && !department) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Loading department details...
        </p>
      </div>
    );
  }

  if (error && !department) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
          <i className="fa-solid fa-triangle-exclamation text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Failed to Load Department
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
        >
          Back to Departments
        </button>
      </div>
    );
  }

  const parentName =
    department?.parent?.name ||
    (department?.parentId ? `Parent (${department.parentId.slice(0, 8)}...)` : "None (Top Level)");

  const createdDate = department?.createdAt
    ? new Date(department.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const updatedDate = department?.updatedAt
    ? new Date(department.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] dark:bg-slate-950 p-4 sm:p-6 space-y-4 overflow-y-auto">
      {/* 1. HIGHLIGHTS PANEL (Salesforce Header) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
            <i className="fa-solid fa-building text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                Department Record
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                Active
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {department?.name}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <i className="fa-solid fa-arrow-left text-[11px]" />
            <span>Back to List</span>
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <i className="fa-solid fa-pen-to-square text-[11px]" />
            <span>Edit</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-1.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
          >
            <i className="fa-solid fa-trash-can text-[11px]" />
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </button>
        </div>
      </div>

      {/* 2. DETAILS CARD (Salesforce-style Key-Value 2-Column Section) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Section Header: Information */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-indigo-600 dark:text-indigo-400 text-xs" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Department Information
          </h2>
        </div>

        {/* 2-Column Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs border-b border-slate-200 dark:border-slate-800">
          {/* Department Name */}
          <div className="flex items-center justify-between sm:justify-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[130px]">
              Department Name:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {department?.name || "-"}
            </span>
          </div>

          {/* Parent Department */}
          <div className="flex items-center justify-between sm:justify-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[130px]">
              Parent Department:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {parentName}
            </span>
          </div>
        </div>

        {/* Section Header: System Information */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-slate-500 text-xs" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            System Information
          </h2>
        </div>

        {/* System Information 2-Column Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
          {/* Created Date */}
          <div className="flex items-center justify-between sm:justify-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[130px]">
              Created Date:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {createdDate}
            </span>
          </div>

          {/* Last Modified Date */}
          <div className="flex items-center justify-between sm:justify-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[130px]">
              Last Modified Date:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {updatedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Department Modal */}
      {showEditModal && (
        <EditDepartmentModal
          record={department}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
          onToast={onToast}
        />
      )}
    </div>
  );
}
