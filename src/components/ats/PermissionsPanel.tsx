"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchProfilesAction, createProfileAndCloneAction } from "@/app/actions/permissions";
import { AuditEntry } from "@/lib/atsStore";
import ProfileRecordPanel from "./ProfileRecordPanel";

interface PermissionsPanelProps {
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function PermissionsPanel({
  onAuditLog,
  onToast,
}: PermissionsPanelProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Create Profile Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [cloneFromId, setCloneFromId] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);

  const loadProfiles = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const res = await fetchProfilesAction();
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Error", res.error, "ban");
    } else if (res.profiles) {
      setProfiles(res.profiles);
    }
    setLoading(false);
  }, [onToast]);

  useEffect(() => {
    let active = true;
    async function init() {
      const res = await fetchProfilesAction();
      if (!active) return;
      if (res.unauthorized) {
        window.location.href = "/login";
        return;
      }
      if (res.error) {
        onToast("Error", res.error, "ban");
      } else if (res.profiles) {
        setProfiles(res.profiles);
      }
      setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, [onToast]);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      onToast("Validation Error", "Profile name is required.", "triangle-exclamation");
      return;
    }

    setCreatingProfile(true);
    const res = await createProfileAndCloneAction(
      newName.trim(),
      newDesc.trim(),
      cloneFromId || undefined
    );

    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Creation Failed", res.error, "ban");
    } else {
      onToast("Profile Created", `Profile '${newName.trim()}' created successfully.`, "circle-check");
      setIsCreating(false);
      setNewName("");
      setNewDesc("");
      setCloneFromId("");
      await loadProfiles();
    }
    setCreatingProfile(false);
  }

  if (loading && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500" />
        <span className="text-sm font-medium">Loading Profiles…</span>
      </div>
    );
  }

  // Redirect to profile record details view if one is active
  if (selectedProfileId) {
    return (
      <ProfileRecordPanel
        profileId={selectedProfileId}
        onBack={() => {
          setSelectedProfileId(null);
          loadProfiles();
        }}
        onAuditLog={onAuditLog}
        onToast={onToast}
      />
    );
  }

  // MASTER PROFILES TABLE VIEW
  return (
    <div className="flex flex-col h-full gap-5 text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-user-shield text-indigo-605 dark:text-indigo-400" />
            Profile Permission Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Founder-only control. Manage security profiles and define database access sets.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
        >
          <i className="fa-solid fa-plus" />
          <span>Create Profile</span>
        </button>
      </div>

      {/* Profiles Table */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[25%]">Profile Name</th>
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[45%]">Description</th>
              <th className="px-5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[15%]">Assigned Rules</th>
              <th className="px-5 py-3 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {profiles.map((p) => {
              // Count assigned database rules
              const assignedCount = p.profilePermissions?.filter((pp: any) =>
                pp.permission && ["recruitment:job:write", "recruitment:job:read", "recruitment:candidate:write", "recruitment:candidate:read"].includes(pp.permission.code)
              ).length || 0;

              return (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold">
                    <button
                      onClick={() => setSelectedProfileId(p.id)}
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline text-left font-bold focus:outline-none"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                    {p.description || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30">
                      {assignedCount}/4 Assigned
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedProfileId(p.id)}
                      className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Profile Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 font-bold">
                  <i className="fa-solid fa-plus text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Create Security Profile</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Define a new security authorization baseline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Profile Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Technical Recruiter"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe access level guidelines…"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Clone Permissions From</label>
                <select
                  value={cloneFromId}
                  onChange={(e) => setCloneFromId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                >
                  <option value="">None (Empty Permissions)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingProfile}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
              >
                {creatingProfile ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check" />
                    <span>Create Profile</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
