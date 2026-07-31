"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchProfilesAction,
  cloneProfileAPIAction,
  updateProfileAPIAction,
  deleteProfileAPIAction,
} from "@/app/actions/permissions";
import { AuditEntry } from "@/lib/atsStore";
import ProfileRecordPanel from "./ProfileRecordPanel";
import OwdSettingsPanel from "./OwdSettingsPanel";

interface PermissionsPanelProps {
  initialSelectedProfileId?: string | null;
  onClearInitialProfile?: () => void;
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function PermissionsPanel({
  initialSelectedProfileId,
  onClearInitialProfile,
  onAuditLog,
  onToast,
}: PermissionsPanelProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"profiles" | "owd">("profiles");

  // Initialize selectedProfileId from prop if present
  useEffect(() => {
    if (initialSelectedProfileId) {
      setSelectedProfileId(initialSelectedProfileId);
    }
  }, [initialSelectedProfileId]);

  // Modals state
  const [cloneSourceProfile, setCloneSourceProfile] = useState<any | null>(null);
  const [editProfile, setEditProfile] = useState<any | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
    loadProfiles(true);
  }, [loadProfiles]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      onToast("Validation Error", "Profile name is required.", "triangle-exclamation");
      return;
    }

    setActionLoading(true);
    // Directly create via standard cloning or empty creation
    // We can use standard create endpoints or clone from existing
    let res;
    if (cloneSourceProfile) {
      res = await cloneProfileAPIAction(cloneSourceProfile.id, profileName.trim(), profileDesc.trim());
    } else {
      // Custom endpoint to create profile
      const session = await fetch("/api/v1/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim(), description: profileDesc.trim() }),
      });
      // We will handle via our actions instead
      // Let's call clone from standard system profile if no source is selected
      const standardSource = profiles.find((p) => !p.isCustom) || profiles[0];
      if (standardSource) {
        res = await cloneProfileAPIAction(standardSource.id, profileName.trim(), profileDesc.trim());
      } else {
        res = { error: "No standard baseline profile found to clone from." };
      }
    }

    if (res?.unauthorized) {
      window.location.href = "/login";
      return;
    }

    if (res?.error) {
      onToast("Operation Failed", res.error, "ban");
    } else {
      onToast("Profile Created", `Profile '${profileName.trim()}' was successfully created.`, "circle-check");
      setIsCreating(false);
      setCloneSourceProfile(null);
      setProfileName("");
      setProfileDesc("");
      await loadProfiles();
    }
    setActionLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfile) return;
    if (!profileName.trim()) {
      onToast("Validation Error", "Profile name is required.", "triangle-exclamation");
      return;
    }

    setActionLoading(true);
    const res = await updateProfileAPIAction(editProfile.id, profileName.trim(), profileDesc.trim());
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Update Failed", res.error, "ban");
    } else {
      onToast("Profile Updated", "Security profile details updated successfully.", "circle-check");
      setEditProfile(null);
      setProfileName("");
      setProfileDesc("");
      await loadProfiles();
    }
    setActionLoading(false);
  };

  const handleDeleteProfile = async () => {
    if (!deleteProfileId) return;
    setActionLoading(true);
    const res = await deleteProfileAPIAction(deleteProfileId);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Delete Failed", res.error, "ban");
    } else {
      onToast("Profile Deleted", "Custom security profile has been removed.", "trash-can");
      setDeleteProfileId(null);
      await loadProfiles();
    }
    setActionLoading(false);
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500" />
        <span className="text-sm font-medium">Loading Security Profiles…</span>
      </div>
    );
  }

  if (selectedProfileId) {
    return (
      <ProfileRecordPanel
        profileId={selectedProfileId}
        onBack={() => {
          setSelectedProfileId(null);
          onClearInitialProfile?.();
          loadProfiles();
        }}
        onAuditLog={onAuditLog}
        onToast={onToast}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-indigo-600 dark:text-indigo-400" />
            Security Baseline Profiles
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Salesforce Lightning Security Administration. Configure permission baselines and OLS/FLS settings.
          </p>
        </div>
        <button
          onClick={() => {
            setProfileName("");
            setProfileDesc("");
            setCloneSourceProfile(null);
            setIsCreating(true);
          }}
          className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
        >
          <i className="fa-solid fa-plus" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 -mt-2 flex-shrink-0">
        <button
          onClick={() => setActiveSubTab("profiles")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeSubTab === "profiles"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
          }`}
        >
          <i className="fa-solid fa-users-gear mr-1.5" />
          Security Profiles
        </button>
        <button
          onClick={() => setActiveSubTab("owd")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeSubTab === "owd"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
          }`}
        >
          <i className="fa-solid fa-earth-americas mr-1.5" />
          Sharing Settings (OWD)
        </button>
      </div>

      {activeSubTab === "profiles" ? (
        /* Profiles Table Container */
        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Profile Name</th>
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</th>
              <th className="px-5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[12%]">Type</th>
              <th className="px-5 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[18%]">Created Date</th>
              <th className="px-5 py-3 text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-[20%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {profiles.map((p) => {
              const createdDate = p.createdAt
                ? new Date(p.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : "System Standard";

              return (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                  <td className="px-5 py-3.5 font-bold">
                    <button
                      onClick={() => {
                        window.location.href = `/setup/profiles/${p.id}`;
                      }}
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline text-left font-bold focus:outline-none"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                    {p.description || "No description provided."}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.isCustom ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
                        Custom
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {createdDate}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        setProfileName(p.name);
                        setProfileDesc(p.description || "");
                        setCloneSourceProfile(p);
                        setIsCreating(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 rounded-lg transition-all"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => {
                        setProfileName(p.name);
                        setProfileDesc(p.description || "");
                        setEditProfile(p);
                      }}
                      disabled={!p.isCustom}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 rounded-lg transition-all disabled:opacity-40 disabled:hover:text-slate-700 disabled:border-slate-200 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProfileId(p.id)}
                      disabled={!p.isCustom}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : (
        <OwdSettingsPanel onToast={onToast} />
      )}

      {/* Clone / New Profile Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fa-solid fa-clone text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {cloneSourceProfile ? `Clone Profile: ${cloneSourceProfile.name}` : "Create Security Profile"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Specify new metadata for the profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Profile Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Recruiter Lead Profile"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  placeholder="Detailed guidelines on profile security boundaries..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2"
              >
                {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                <span>Create Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fa-solid fa-pen-to-square text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Edit Profile Details</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Modify profile metadata properties</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditProfile(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Profile Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setEditProfile(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2"
              >
                {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProfileId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto text-red-650 dark:text-red-500">
                <i className="fa-solid fa-triangle-exclamation text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Delete Profile?</h3>
                <p className="text-xs text-slate-400 mt-1">This operation cannot be undone. Users currently assigned to this profile will lose their permissions baseline.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteProfileId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white flex items-center gap-2"
              >
                {actionLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash-can" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
