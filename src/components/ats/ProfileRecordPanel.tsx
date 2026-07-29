"use client";

import { useState, useEffect } from "react";
import {
  Permission,
  PermissionSet,
  PERMISSION_META,
} from "@/lib/permissions";
import { AuditEntry } from "@/lib/atsStore";
import {
  fetchProfilesAction,
  saveProfilePermissionsAction,
} from "@/app/actions/permissions";

interface ProfileRecordPanelProps {
  profileId: string;
  onBack: () => void;
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

interface ObjectPermissionRow {
  objectKey: "pipeline" | "jobs" | "profiles";
  objectLabel: string;
  createKey: Permission;
  readKey: Permission;
  updateKey: Permission;
  deleteKey: Permission;
}

const OBJECT_ROWS: ObjectPermissionRow[] = [
  {
    objectKey: "pipeline",
    objectLabel: "Candidates & Applications",
    createKey: "recruitmentCandidateCreate",
    readKey: "recruitmentCandidateRead",
    updateKey: "recruitmentCandidateUpdate",
    deleteKey: "recruitmentCandidateDelete",
  },
  {
    objectKey: "jobs",
    objectLabel: "Job Requisitions",
    createKey: "recruitmentJobCreate",
    readKey: "recruitmentJobRead",
    updateKey: "recruitmentJobUpdate",
    deleteKey: "recruitmentJobDelete",
  },
  {
    objectKey: "profiles",
    objectLabel: "Profiles (Permissions)",
    createKey: "recruitmentProfileCreate",
    readKey: "recruitmentProfileRead",
    updateKey: "recruitmentProfileUpdate",
    deleteKey: "recruitmentProfileDelete",
  },
];

export default function ProfileRecordPanel({
  profileId,
  onBack,
  onAuditLog,
  onToast,
}: ProfileRecordPanelProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editPermissions, setEditPermissions] = useState<PermissionSet>({
    recruitmentJobCreate: false,
    recruitmentJobRead: false,
    recruitmentJobUpdate: false,
    recruitmentJobDelete: false,
    recruitmentCandidateCreate: false,
    recruitmentCandidateRead: false,
    recruitmentCandidateUpdate: false,
    recruitmentCandidateDelete: false,
    recruitmentProfileCreate: false,
    recruitmentProfileRead: false,
    recruitmentProfileUpdate: false,
    recruitmentProfileDelete: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await fetchProfilesAction();
      if (res.unauthorized) {
        window.location.href = "/login";
        return;
      }
      if (res.error) {
        onToast("Error", res.error, "ban");
      } else if (res.profiles) {
        const found = res.profiles.find((p) => p.id === profileId);
        if (found) {
          setProfile(found);
          const initialSet: PermissionSet = {
            recruitmentJobCreate: false,
            recruitmentJobRead: false,
            recruitmentJobUpdate: false,
            recruitmentJobDelete: false,
            recruitmentCandidateCreate: false,
            recruitmentCandidateRead: false,
            recruitmentCandidateUpdate: false,
            recruitmentCandidateDelete: false,
            recruitmentProfileCreate: false,
            recruitmentProfileRead: false,
            recruitmentProfileUpdate: false,
            recruitmentProfileDelete: false,
          };
          if (found.profilePermissions) {
            for (const pp of found.profilePermissions) {
              const code = pp.permission?.code;
              if (code === "recruitment:job:create") initialSet.recruitmentJobCreate = true;
              if (code === "recruitment:job:read") initialSet.recruitmentJobRead = true;
              if (code === "recruitment:job:update") initialSet.recruitmentJobUpdate = true;
              if (code === "recruitment:job:delete") initialSet.recruitmentJobDelete = true;
              if (code === "recruitment:candidate:create") initialSet.recruitmentCandidateCreate = true;
              if (code === "recruitment:candidate:read") initialSet.recruitmentCandidateRead = true;
              if (code === "recruitment:candidate:update") initialSet.recruitmentCandidateUpdate = true;
              if (code === "recruitment:candidate:delete") initialSet.recruitmentCandidateDelete = true;
              if (code === "identity:profile:create") initialSet.recruitmentProfileCreate = true;
              if (code === "identity:profile:read") initialSet.recruitmentProfileRead = true;
              if (code === "identity:profile:update") initialSet.recruitmentProfileUpdate = true;
              if (code === "identity:profile:delete") initialSet.recruitmentProfileDelete = true;
            }
          }
          setEditPermissions(initialSet);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [profileId, onToast]);

  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSavingEdit(true);
    const res = await saveProfilePermissionsAction(profile.id, editPermissions);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Save Failed", res.error, "ban");
    } else {
      onToast("Permissions Saved", `Successfully updated permissions for ${profile.name}.`, "user-shield");

      const changed = Object.entries(editPermissions)
        .map(([k, v]) => `${PERMISSION_META[k as Permission]?.label || k}: ${v ? "ON" : "OFF"}`)
        .join(", ");

      onAuditLog({
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "Admin",
        action: "PERMISSION_CHANGE",
        target: profile.name,
        notes: `Updated: ${changed}`,
      });
    }
    setSavingEdit(false);
  }

  function togglePerm(key: Permission) {
    setEditPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAllRow(row: ObjectPermissionRow, enable: boolean) {
    setEditPermissions((prev) => ({
      ...prev,
      [row.createKey]: enable,
      [row.readKey]: enable,
      [row.updateKey]: enable,
      [row.deleteKey]: enable,
    }));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500" />
        <span className="text-sm font-medium">Loading Profile Details…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500" />
        <span className="text-sm font-medium">Failed to retrieve profile record.</span>
        <button onClick={onBack} className="mt-2 text-xs text-indigo-600 hover:underline">
          Go back to profiles
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5 text-slate-800 dark:text-slate-200">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-606 hover:text-indigo-808 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-semibold mb-2"
          >
            <i className="fa-solid fa-arrow-left" />
            <span>Back to Profiles</span>
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-id-card text-indigo-600" />
            Profile Details: {profile.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{profile.description || "No description provided."}</p>
        </div>
      </div>

      {/* Permissions Form */}
      <form onSubmit={handleSavePermissions} className="flex-1 overflow-y-auto space-y-6 max-w-4xl pr-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <i className="fa-solid fa-table-cells text-indigo-500" />
                Salesforce Object Permissions Matrix (CRUD)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Define Create, Read, Update, and Delete access levels per standard object.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3 text-left font-bold">Standard Object</th>
                  <th className="px-4 py-3 text-center font-bold">Create (C)</th>
                  <th className="px-4 py-3 text-center font-bold">Read (R)</th>
                  <th className="px-4 py-3 text-center font-bold">Update (U)</th>
                  <th className="px-4 py-3 text-center font-bold text-red-500 dark:text-red-400">Delete (D)</th>
                  <th className="px-4 py-3 text-center font-bold">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {OBJECT_ROWS.map((row) => {
                  const hasC = editPermissions[row.createKey];
                  const hasR = editPermissions[row.readKey];
                  const hasU = editPermissions[row.updateKey];
                  const hasD = editPermissions[row.deleteKey];
                  const allActive = hasC && hasR && hasU && hasD;

                  return (
                    <tr key={row.objectKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                        <i className={`fa-solid ${
                          row.objectKey === "pipeline" 
                            ? "fa-user-group text-indigo-500" 
                            : row.objectKey === "jobs"
                            ? "fa-briefcase text-emerald-500"
                            : "fa-folder-tree text-amber-500"
                        } text-sm`} />
                        <span>{row.objectLabel}</span>
                      </td>

                      {/* Create Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasC}
                          onChange={() => togglePerm(row.createKey)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Read Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasR}
                          onChange={() => togglePerm(row.readKey)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Update Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasU}
                          onChange={() => togglePerm(row.updateKey)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Delete Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasD}
                          onChange={() => togglePerm(row.deleteKey)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>

                      {/* Quick Action Toggle */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAllRow(row, !allActive)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border ${
                            allActive
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                          }`}
                        >
                          {allActive ? "Deselect All" : "Select All"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={savingEdit}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
          >
            {savingEdit ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Saving Changes…</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-circle-check" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
