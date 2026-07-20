"use client";

import { useState, useEffect } from "react";
import {
  Permission,
  PermissionSet,
  PERMISSION_META,
  ALL_PERMISSIONS,
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

export default function ProfileRecordPanel({
  profileId,
  onBack,
  onAuditLog,
  onToast,
}: ProfileRecordPanelProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editPermissions, setEditPermissions] = useState<PermissionSet>({
    recruitmentJobWrite: false,
    recruitmentJobRead: false,
    recruitmentCandidateWrite: false,
    recruitmentCandidateRead: false,
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
            recruitmentJobWrite: false,
            recruitmentJobRead: false,
            recruitmentCandidateWrite: false,
            recruitmentCandidateRead: false,
          };
          if (found.profilePermissions) {
            for (const pp of found.profilePermissions) {
              if (pp.permission?.code === "recruitment:job:write") initialSet.recruitmentJobWrite = true;
              if (pp.permission?.code === "recruitment:job:read") initialSet.recruitmentJobRead = true;
              if (pp.permission?.code === "recruitment:candidate:write") initialSet.recruitmentCandidateWrite = true;
              if (pp.permission?.code === "recruitment:candidate:read") initialSet.recruitmentCandidateRead = true;
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

      // Audit Log
      const changed = Object.entries(editPermissions)
        .map(([k, v]) => `${PERMISSION_META[k as Permission].label}: ${v ? "ON" : "OFF"}`)
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
        <button onClick={onBack} className="mt-2 text-xs text-indigo-650 hover:underline">
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
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-semibold mb-2"
          >
            <i className="fa-solid fa-arrow-left" />
            <span>Back to Profiles</span>
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-id-card text-indigo-650" />
            Profile Details: {profile.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{profile.description || "No description provided."}</p>
        </div>
      </div>

      {/* Permissions Toggles Form */}
      <form onSubmit={handleSavePermissions} className="flex-1 overflow-y-auto space-y-6 max-w-3xl pr-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Database Access Rules</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {ALL_PERMISSIONS.map((perm) => {
              const meta = PERMISSION_META[perm];
              const isOn = editPermissions[perm];

              return (
                <div
                  key={perm}
                  onClick={() => setEditPermissions(prev => ({ ...prev, [perm]: !prev[perm] }))}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isOn ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                    }`}>
                      <i className={`fa-solid ${meta.icon} text-xs`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{meta.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{meta.description}</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
                    isOn ? "bg-indigo-650" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                    style={{ minWidth: "40px", height: "22px" }}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${
                      isOn ? "translate-x-[18px]" : "translate-x-0"
                    }`} />
                  </div>
                </div>
              );
            })}
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
