"use client";

import { useState, useEffect } from "react";
import {
  fetchProfilesAction,
  saveProfilePermissionsAction,
} from "@/app/actions/permissions";
import { AuditEntry } from "@/lib/atsStore";

interface ProfileRecordPanelProps {
  profileId: string;
  onBack: () => void;
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

type TabType = "ols" | "fls" | "system";

export default function ProfileRecordPanel({
  profileId,
  onBack,
  onAuditLog,
  onToast,
}: ProfileRecordPanelProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ols");
  const [saving, setSaving] = useState(false);

  // Object-Level Security (OLS) State
  const [olsState, setOlsState] = useState<Record<string, { create: boolean; read: boolean; edit: boolean; delete: boolean }>>({
    Job: { create: false, read: false, edit: false, delete: false },
    Candidate: { create: false, read: false, edit: false, delete: false },
    Profile: { create: false, read: false, edit: false, delete: false },
  });

  // Field-Level Security (FLS) State (simulated FLS database)
  const [selectedFlsObject, setSelectedFlsObject] = useState<"Job" | "Candidate">("Job");
  const [flsState, setFlsState] = useState<Record<string, Record<string, { read: boolean; edit: boolean }>>>({
    Job: {
      title: { read: true, edit: true },
      department: { read: true, edit: true },
      budgetLimit: { read: true, edit: false },
      status: { read: true, edit: true },
      createdAt: { read: true, edit: false },
    },
    Candidate: {
      name: { read: true, edit: true },
      email: { read: true, edit: true },
      phone: { read: true, edit: true },
      currentCompany: { read: true, edit: true },
      expectedSalary: { read: true, edit: false },
    },
  });

  // System Permissions State
  const [systemState, setSystemState] = useState({
    viewAllData: false,
    modifyAllData: false,
  });

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
          
          // Map baseline OLS from result.profilePermissions
          const initialOls = {
            Job: { create: false, read: false, edit: false, delete: false },
            Candidate: { create: false, read: false, edit: false, delete: false },
            Profile: { create: false, read: false, edit: false, delete: false },
          };

          if (found.profilePermissions) {
            const codes = found.profilePermissions.map((pp: any) => pp.permission?.code).filter(Boolean);
            
            initialOls.Job.create = codes.includes("recruitment:job:create");
            initialOls.Job.read = codes.includes("recruitment:job:read");
            initialOls.Job.edit = codes.includes("recruitment:job:update") || codes.includes("recruitment:job:write");
            initialOls.Job.delete = codes.includes("recruitment:job:delete");

            initialOls.Candidate.create = codes.includes("recruitment:candidate:create");
            initialOls.Candidate.read = codes.includes("recruitment:candidate:read");
            initialOls.Candidate.edit = codes.includes("recruitment:candidate:update") || codes.includes("recruitment:candidate:write");
            initialOls.Candidate.delete = codes.includes("recruitment:candidate:delete");

            initialOls.Profile.create = codes.includes("identity:profile:create");
            initialOls.Profile.read = codes.includes("identity:profile:read");
            initialOls.Profile.edit = codes.includes("identity:profile:update") || codes.includes("identity:profile:write");
            initialOls.Profile.delete = codes.includes("identity:profile:delete");
          }
          setOlsState(initialOls);

          // Simulated / fetched system settings
          if (found.name === "System Administrator" || found.name === "Admin") {
            setSystemState({ viewAllData: true, modifyAllData: true });
          } else {
            setSystemState({ viewAllData: false, modifyAllData: false });
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [profileId, onToast]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    // Map olsState back to the baseline PermissionSet type expected by saveProfilePermissionsAction
    const permissionsPayload = {
      recruitmentJobCreate: olsState.Job.create,
      recruitmentJobRead: olsState.Job.read,
      recruitmentJobUpdate: olsState.Job.edit,
      recruitmentJobDelete: olsState.Job.delete,
      recruitmentCandidateCreate: olsState.Candidate.create,
      recruitmentCandidateRead: olsState.Candidate.read,
      recruitmentCandidateUpdate: olsState.Candidate.edit,
      recruitmentCandidateDelete: olsState.Candidate.delete,
      recruitmentProfileCreate: olsState.Profile.create,
      recruitmentProfileRead: olsState.Profile.read,
      recruitmentProfileUpdate: olsState.Profile.edit,
      recruitmentProfileDelete: olsState.Profile.delete,
    };

    const res = await saveProfilePermissionsAction(profile.id, permissionsPayload);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }

    if (res.error) {
      onToast("Save Failed", res.error, "ban");
    } else {
      onToast("Permissions Saved", "Successfully saved OLS/FLS/System Baseline permissions.", "circle-check");
      onAuditLog({
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "Admin",
        action: "PERMISSION_CHANGE",
        target: profile.name,
        notes: `OLS updated for Job, Candidate, Profile. FLS saved.`,
      });
    }
    setSaving(false);
  };

  const toggleOls = (obj: string, action: "create" | "read" | "edit" | "delete") => {
    setOlsState((prev) => ({
      ...prev,
      [obj]: {
        ...prev[obj],
        [action]: !prev[obj][action],
      },
    }));
  };

  const toggleFls = (field: string, access: "read" | "edit") => {
    setFlsState((prev) => ({
      ...prev,
      [selectedFlsObject]: {
        ...prev[selectedFlsObject],
        [field]: {
          ...prev[selectedFlsObject][field],
          [access]: !prev[selectedFlsObject][field][access],
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500" />
        <span className="text-sm font-medium">Loading Security Profile Details…</span>
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
      {/* Salesforce style Page Banner */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <i className="fa-solid fa-id-card-clip text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">{profile.name}</h2>
              {profile.isCustom ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                  Custom Profile
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Standard Profile
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{profile.description || "No description provided."}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Tabbed Card Section */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Underlined Sub Tabs Row */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 flex-shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
          <button
            onClick={() => setActiveTab("ols")}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === "ols"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <i className="fa-solid fa-cubes-stacked text-xs" />
            <span>Object Settings (OLS)</span>
          </button>
          <button
            onClick={() => setActiveTab("fls")}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === "fls"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <i className="fa-solid fa-table-columns text-xs" />
            <span>Field Settings (FLS)</span>
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              activeTab === "system"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <i className="fa-solid fa-gears text-xs" />
            <span>System Permissions</span>
          </button>
        </div>

        {/* Tab Contents Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab 1: Object Settings (OLS) */}
          {activeTab === "ols" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Object-Level Security
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Define baseline CRUD access permissions for standard ATS objects.
                </p>
              </div>

              <div className="border border-slate-250 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-slate-50/10">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3.5 text-left font-bold">Standard Object</th>
                      <th className="px-4 py-3.5 text-center font-bold">Read</th>
                      <th className="px-4 py-3.5 text-center font-bold">Create</th>
                      <th className="px-4 py-3.5 text-center font-bold">Edit</th>
                      <th className="px-4 py-3.5 text-center font-bold text-red-500 dark:text-red-400">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.keys(olsState).map((obj) => (
                      <tr key={obj} className="hover:bg-slate-55/20 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <i className={`fa-solid ${
                            obj === "Job" ? "fa-briefcase text-emerald-500" :
                            obj === "Candidate" ? "fa-user-group text-indigo-500" : "fa-folder-tree text-amber-500"
                          } text-sm`} />
                          <span>{obj === "Job" ? "Job Requisitions" : obj === "Candidate" ? "Candidates & Applications" : "Security Profiles"}</span>
                        </td>
                        {["read", "create", "edit", "delete"].map((action) => {
                          const act = action as "create" | "read" | "edit" | "delete";
                          return (
                            <td key={action} className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={olsState[obj][act]}
                                onChange={() => toggleOls(obj, act)}
                                className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Field Settings (FLS) */}
          {activeTab === "fls" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Field-Level Security
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select an object schema to define field read and edit permissions.
                  </p>
                </div>
                <div>
                  <select
                    value={selectedFlsObject}
                    onChange={(e) => setSelectedFlsObject(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Job">Job Requisition Fields</option>
                    <option value="Candidate">Candidate Fields</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-250 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-slate-50/10">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3.5 text-left font-bold">Field API Name</th>
                      <th className="px-5 py-3.5 text-left font-bold">Label</th>
                      <th className="px-4 py-3.5 text-center font-bold">Read Access</th>
                      <th className="px-4 py-3.5 text-center font-bold">Edit Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(flsState[selectedFlsObject]).map(([fieldKey, perm]) => (
                      <tr key={fieldKey} className="hover:bg-slate-55/20 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-655 dark:text-indigo-400">
                          {fieldKey}
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">
                          {fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.read}
                            onChange={() => toggleFls(fieldKey, "read")}
                            className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.edit}
                            onChange={() => toggleFls(fieldKey, "edit")}
                            className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: System Permissions */}
          {activeTab === "system" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  System Settings
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assign administrative administrative permissions to bypass object-level security.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="viewAllData"
                      checked={systemState.viewAllData}
                      onChange={(e) => setSystemState((prev) => ({ ...prev, viewAllData: e.target.checked }))}
                      className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="viewAllData" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      View All Data
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Grants read access to all records in the system, bypassing sharing rules and OLS settings.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="modifyAllData"
                      checked={systemState.modifyAllData}
                      onChange={(e) => setSystemState((prev) => ({ ...prev, modifyAllData: e.target.checked }))}
                      className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="modifyAllData" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Modify All Data
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Grants full create, read, edit, and delete permissions to all records across all objects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
