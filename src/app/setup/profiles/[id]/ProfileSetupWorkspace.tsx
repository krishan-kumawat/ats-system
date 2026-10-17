"use client";

import React, { useState, useEffect } from "react";
import {
  updateSetupProfileOLSListAction,
  fetchSetupProfileFieldsAction,
  updateSetupProfileFLSListAction,
  updateSetupProfileSystemAction,
  updateSetupProfileTabSettingsAction,
} from "@/app/actions/setup-actions";
import Link from "next/link";

interface ProfileSetupWorkspaceProps {
  profileId: string;
  initialData: {
    profile: any;
    permissionSetId: string;
    objects: any[];
    ols: any[];
    systemPermissions: any[];
    tabSettings: any[];
  };
}

export default function ProfileSetupWorkspace({
  profileId,
  initialData,
}: ProfileSetupWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"system" | "ols" | "fls" | "tabSettings">("system");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const psetId = initialData.permissionSetId;

  // 1. System Permissions State
  const defaultKeys = ["viewAllData", "modifyAllData", "manageUsers", "manageProfilesRoles"];
  const [sysPerms, setSysPerms] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    defaultKeys.forEach((key) => {
      const match = initialData.systemPermissions.find((sp) => sp.key === key);
      map[key] = match ? match.enabled : false;
    });
    return map;
  });

  // 2. OLS Matrix State
  const [olsMap, setOlsMap] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    initialData.objects.forEach((obj) => {
      const match = initialData.ols.find((o) => o.schemaObjectId === obj.id);
      map[obj.id] = match || {
        allowRead: false,
        allowCreate: false,
        allowEdit: false,
        allowDelete: false,
        viewAllData: false,
        modifyAllData: false,
      };
    });
    return map;
  });

  // 3. FLS State
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");
  const [fields, setFields] = useState<any[]>([]);
  const [flsMap, setFlsMap] = useState<Record<string, { allowRead: boolean; allowEdit: boolean }>>({});
  const [loadingFls, setLoadingFls] = useState(false);

  // Load fields when object changes
  useEffect(() => {
    if (!selectedObjectId) return;
    setLoadingFls(true);
    setError(null);
    fetchSetupProfileFieldsAction(psetId, selectedObjectId)
      .then((res) => {
        setFields(res.fields);
        const map: Record<string, { allowRead: boolean; allowEdit: boolean }> = {};
        res.fields.forEach((f: any) => {
          const match = res.fls.find((fp: any) => fp.schemaFieldId === f.id);
          map[f.id] = match || { allowRead: false, allowEdit: false };
        });
        setFlsMap(map);
      })
      .catch((e) => setError("Failed to load field permissions: " + e.message))
      .finally(() => setLoadingFls(false));
  }, [selectedObjectId, psetId]);

  // 4. Tab Settings State
  const [tabSettings, setTabSettings] = useState<any[]>(() => {
    return initialData.tabSettings || [];
  });

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Save Handlers
  const handleSaveTabSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const formatted = tabSettings.map((t) => ({
        schemaObjectId: t.schemaObjectId,
        isVisible: t.isVisible,
        precedenceOrder: t.precedenceOrder === "" || t.precedenceOrder === null ? null : Number(t.precedenceOrder),
      }));
      await updateSetupProfileTabSettingsAction(profileId, formatted);
      triggerToast("Tab settings saved successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update tab settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = Object.entries(sysPerms).map(([key, enabled]) => ({
        key,
        enabled,
      }));
      await updateSetupProfileSystemAction(psetId, payload);
      triggerToast("System permissions saved successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update system permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOls = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = Object.entries(olsMap).map(([schemaObjectId, val]) => ({
        schemaObjectId,
        allowCreate: !!val.allowCreate,
        allowRead: !!val.allowRead,
        allowEdit: !!val.allowEdit,
        allowDelete: !!val.allowDelete,
        viewAllData: !!val.viewAllData,
        modifyAllData: !!val.modifyAllData,
      }));
      await updateSetupProfileOLSListAction(profileId, list);
      triggerToast("Object permissions saved successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update object permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFls = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = Object.entries(flsMap).map(([schemaFieldId, val]) => ({
        schemaFieldId,
        allowRead: !!val.allowRead,
        allowEdit: !!val.allowEdit,
      }));
      await updateSetupProfileFLSListAction(profileId, list);
      triggerToast("Field permissions saved successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update field permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOls = (objId: string, field: string) => {
    const current = olsMap[objId];
    const updated = { ...current, [field]: !current[field] };
    setOlsMap((prev) => ({ ...prev, [objId]: updated }));
  };

  const handleToggleFls = (fieldId: string, perm: "allowRead" | "allowEdit") => {
    const current = flsMap[fieldId];
    const updated = { ...current, [perm]: !current[perm] };
    setFlsMap((prev) => ({ ...prev, [fieldId]: updated }));
  };

  const profile = initialData.profile;
  const isEditable = profile.isCustom === true || profile.is_custom === true;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white text-xs px-4 py-3 rounded-lg shadow-lg border border-emerald-500 animate-slide-in">
          <i className="fa-solid fa-circle-check text-base" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 text-xs text-red-600 dark:text-red-400 flex items-start gap-3">
          <i className="fa-solid fa-triangle-exclamation text-base mt-0.5" />
          <div>
            <h4 className="font-bold">Error updating configuration</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Setup Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <i className="fa-solid fa-user-shield text-2xl" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Setup Console &gt; Profile Editor
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {profile.name}
              {(profile.isCustom || profile.is_custom) ? (
                <span className="bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Custom
                </span>
              ) : (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  System Standard
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">{profile.description || "No description provided."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-850 font-medium transition-colors"
          >
            Close Profile Editor
          </Link>
        </div>
      </div>

      {/* Tabs Controller */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("system")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "system"
                ? "border-indigo-600 text-indigo-650 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-500"
            }`}
          >
            System Permissions
          </button>
          <button
            onClick={() => setActiveTab("ols")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "ols"
                ? "border-indigo-600 text-indigo-650 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-500"
            }`}
          >
            Object Permissions (OLS)
          </button>
          <button
            onClick={() => setActiveTab("fls")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "fls"
                ? "border-indigo-600 text-indigo-650 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-500"
            }`}
          >
            Field Permissions (FLS)
          </button>
          <button
            onClick={() => setActiveTab("tabSettings")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "tabSettings"
                ? "border-indigo-600 text-indigo-650 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-500"
            }`}
          >
            Tab Settings
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          
          {/* Tab 1: System Permissions */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "viewAllData", label: "View All Data", desc: "Allows full read-only visibility on all records regardless of sharing mechanisms." },
                  { key: "modifyAllData", label: "Modify All Data", desc: "Allows full read, edit, delete, and sharing control on all records." },
                  { key: "manageUsers", label: "Manage Users", desc: "Enables administrator capabilities for creating and managing organization users." },
                  { key: "manageProfilesRoles", label: "Manage Profiles & Roles", desc: "Enables setup configurations to modify profiles, system controls, and hierarchy roles." },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50/55 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sysPerms[item.key] || false}
                      onChange={() =>
                        setSysPerms((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      disabled={!isEditable}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {item.label}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {isEditable && (
                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handleSaveSystem}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                  >
                    {loading && <i className="fa-solid fa-spinner animate-spin" />}
                    Save System Permissions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: OLS Matrix */}
          {activeTab === "ols" && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-4 py-3">Object API Name</th>
                      <th className="px-4 py-3">Label</th>
                      <th className="px-4 py-3 text-center">Read</th>
                      <th className="px-4 py-3 text-center">Create</th>
                      <th className="px-4 py-3 text-center">Edit</th>
                      <th className="px-4 py-3 text-center">Delete</th>
                      <th className="px-4 py-3 text-center">View All</th>
                      <th className="px-4 py-3 text-center">Modify All</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {initialData.objects.map((obj) => {
                      const row = olsMap[obj.id] || {};
                      return (
                        <tr key={obj.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-250">
                            {obj.apiName}
                          </td>
                          <td className="px-4 py-3 text-slate-450">{obj.label}</td>
                          {["allowRead", "allowCreate", "allowEdit", "allowDelete", "viewAllData", "modifyAllData"].map(
                            (field) => (
                              <td key={field} className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={row[field] || false}
                                  onChange={() => handleToggleOls(obj.id, field)}
                                  disabled={!isEditable}
                                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                />
                              </td>
                            )
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {isEditable && (
                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handleSaveOls}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                  >
                    {loading && <i className="fa-solid fa-spinner animate-spin" />}
                    Save Object Permissions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: FLS Matrix */}
          {activeTab === "fls" && (
            <div className="space-y-6">
              
              {/* Dropdown Selector */}
              <div className="flex flex-col gap-2 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Schema Object
                </label>
                <select
                  value={selectedObjectId}
                  onChange={(e) => setSelectedObjectId(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Object --</option>
                  {initialData.objects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.label} ({obj.apiName})
                    </option>
                  ))}
                </select>
              </div>

              {/* FLS List */}
              {selectedObjectId ? (
                loadingFls ? (
                  <div className="py-12 flex justify-center items-center gap-2 text-xs text-slate-400">
                    <i className="fa-solid fa-spinner animate-spin text-lg" />
                    Loading fields...
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                            <th className="px-4 py-3">Field API Name</th>
                            <th className="px-4 py-3">Field Label</th>
                            <th className="px-4 py-3 text-center">Read Access</th>
                            <th className="px-4 py-3 text-center">Edit Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {fields.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                No fields defined for this schema object.
                              </td>
                            </tr>
                          ) : (
                            fields.map((f) => {
                              const perms = flsMap[f.id] || { allowRead: false, allowEdit: false };
                              return (
                                <tr key={f.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-250">
                                    {f.apiName}
                                  </td>
                                  <td className="px-4 py-3 text-slate-450">{f.label}</td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={perms.allowRead}
                                      onChange={() => handleToggleFls(f.id, "allowRead")}
                                      disabled={!isEditable}
                                      className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={perms.allowEdit}
                                      onChange={() => handleToggleFls(f.id, "allowEdit")}
                                      disabled={!isEditable}
                                      className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {isEditable && (
                      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                        <button
                          onClick={handleSaveFls}
                          disabled={loading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                        >
                          {loading && <i className="fa-solid fa-spinner animate-spin" />}
                          Save Field Permissions
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center text-xs text-slate-400">
                  Select a schema object above to edit field-level security (FLS) access defaults.
                </div>
              )}

            </div>
          )}

          {/* Tab 4: Tab Settings */}
          {activeTab === "tabSettings" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Tab Visibility & Sort Precedence Settings
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure visibility switches and sort order overrides. Lower sort precedence order values appear first in the sidebar.
                  </p>
                </div>
                {isEditable && (
                  <button
                    onClick={handleSaveTabSettings}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all"
                  >
                    {loading ? "Saving..." : "Save Tab Settings"}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-4 py-3">Tab Object</th>
                      <th className="px-4 py-3">API Name</th>
                      <th className="px-4 py-3 text-center">Visibility Toggle</th>
                      <th className="px-4 py-3 text-center">Precedence Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                    {tabSettings.map((t) => (
                      <tr key={t.schemaObjectId} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {t.label}
                        </td>
                        <td className="px-4 py-3 text-slate-450 font-mono">{t.apiName}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={t.isVisible}
                            onChange={(e) =>
                              setTabSettings((prev) =>
                                prev.map((item) =>
                                  item.schemaObjectId === t.schemaObjectId
                                    ? { ...item, isVisible: e.target.checked }
                                    : item
                                )
                              )
                            }
                            disabled={!isEditable}
                            className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            value={t.precedenceOrder === null ? "" : t.precedenceOrder}
                            placeholder="e.g. 10"
                            onChange={(e) => {
                              const valStr = e.target.value;
                              const val = valStr === "" ? null : Number(valStr);
                              setTabSettings((prev) =>
                                prev.map((item) =>
                                  item.schemaObjectId === t.schemaObjectId
                                    ? { ...item, precedenceOrder: val }
                                    : item
                                )
                              );
                            }}
                            disabled={!isEditable}
                            className="w-24 px-2 py-1 border border-slate-250 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-center font-bold disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
