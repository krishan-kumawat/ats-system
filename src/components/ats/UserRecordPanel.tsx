"use client";

import { useState, useEffect } from "react";
import {
  fetchUserDetailAction,
  toggleUserActiveAction,
  updateUserAction,
  fetchPermissionSetsAction,
  assignUserPermissionSetsAction,
  UserDetailPayload,
} from "@/app/actions/users";
import { fetchProfilesAction } from "@/app/actions/permissions";

interface UserRecordPanelProps {
  userId: string;
  onBack: () => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onNavigateToProfile?: (profileId: string) => void;
}

const ALL_ROLE_NAMES = [
  "CEO",
  "VP of Recruitment",
  "Recruitment Director",
  "Lead Recruiter",
  "Recruiter",
];

export default function UserRecordPanel({
  userId,
  onBack,
  onToast,
  onNavigateToProfile,
}: UserRecordPanelProps) {
  const [userDetail, setUserDetail] = useState<any | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [allPermissionSets, setAllPermissionSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Edit fields state
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editProfile, setEditProfile] = useState("");
  const [editRole, setEditRole] = useState("");

  // Permission Set Assignments modal state
  const [isEditingAssignments, setIsEditingAssignments] = useState(false);
  const [selectedPermissionSetIds, setSelectedPermissionSetIds] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchUserDetailAction(userId);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Error", res.error, "ban");
    } else if (res.user) {
      setUserDetail(res.user);
      setEditFirstName(res.user.firstName);
      setEditLastName(res.user.lastName);
      setEditEmail(res.user.email);
      setEditProfile(res.user.profileName);
      setEditRole(res.user.roleName === "None" ? "" : res.user.roleName);

      // Prepopulate assigned custom permission sets IDs
      if (res.user.permissionSets) {
        const assignedIds = res.user.permissionSets.map((ups: any) => ups.permissionSetId);
        setSelectedPermissionSetIds(assignedIds);
      }
    }

    // Fetch all profiles
    const profRes = await fetchProfilesAction();
    if (profRes.profiles) {
      setAllProfiles(profRes.profiles);
    }

    // Fetch all custom permission sets
    const permSetsRes = await fetchPermissionSetsAction();
    if (permSetsRes.permissionSets) {
      // Filter out base permission sets which are managed by profiles baseline (usually name ending with "BaseSet" or "Base")
      const customs = permSetsRes.permissionSets.filter((ps: any) => ps.isCustom !== false);
      setAllPermissionSets(customs);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleToggleActive = async () => {
    if (!userDetail) return;
    setToggling(true);
    const nextActive = !userDetail.isActive;
    const res = await toggleUserActiveAction(userDetail.id, nextActive);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Status Change Failed", res.error, "ban");
    } else {
      setUserDetail((prev: any) => (prev ? { ...prev, isActive: nextActive } : null));
      onToast(
        nextActive ? "User Activated" : "User Deactivated",
        `${userDetail.firstName} ${userDetail.lastName} status updated.`,
        nextActive ? "circle-check" : "circle-xmark"
      );
    }
    setToggling(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDetail) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      onToast("Validation Error", "First Name, Last Name, and Email are required.", "triangle-exclamation");
      return;
    }

    setSavingEdit(true);
    const res = await updateUserAction({
      id: userDetail.id,
      name: `${editFirstName.trim()} ${editLastName.trim()}`,
      email: editEmail.trim(),
      profileName: editProfile,
      roleName: editRole || "None",
    });

    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }

    if (res.error) {
      onToast("Update Failed", res.error, "ban");
    } else {
      onToast("User Updated", "User record successfully updated.", "circle-check");
      setIsEditing(false);
      await loadData();
    }
    setSavingEdit(false);
  };

  const handleSaveAssignments = async () => {
    if (!userDetail) return;
    setSavingAssignments(true);
    const res = await assignUserPermissionSetsAction(userDetail.id, selectedPermissionSetIds);
    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }
    if (res.error) {
      onToast("Save Failed", res.error, "ban");
    } else {
      onToast("Assignments Updated", "Permission set assignments saved successfully.", "circle-check");
      setIsEditingAssignments(false);
      await loadData();
    }
    setSavingAssignments(false);
  };

  const togglePermissionSetSelection = (id: string) => {
    setSelectedPermissionSetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500" />
        <span className="text-sm font-medium">Loading User Record…</span>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400 dark:text-slate-500">
        <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500" />
        <span className="text-sm font-medium">Failed to retrieve user details.</span>
        <button onClick={onBack} className="mt-2 text-xs text-indigo-600 hover:underline">
          Go back to user list
        </button>
      </div>
    );
  }

  // Find custom permission sets currently assigned
  const assignedCustomSets = userDetail.permissionSets
    ? userDetail.permissionSets
        .map((ups: any) => ups.permissionSet)
        .filter((ps: any) => ps && ps.isCustom !== false)
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto text-slate-800 dark:text-slate-200">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-semibold"
        >
          <i className="fa-solid fa-arrow-left" />
          <span>Back to User List</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <i className="fa-solid fa-user-gear text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
              {userDetail.firstName} {userDetail.lastName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">User Administration details and baseline settings</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
          >
            {toggling ? "Updating…" : userDetail.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1"
          >
            <i className="fa-solid fa-user-pen" />
            <span>Edit User</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN SALESFORCE LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Column: Detail Panel (Takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                <i className="fa-solid fa-address-card text-indigo-500" />
                User Details Baseline
              </h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* User Info Section */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-indigo-605 dark:text-indigo-400 uppercase tracking-wide border-b pb-1 border-slate-100 dark:border-slate-800">
                  User Info
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">First Name</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{userDetail.firstName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Name</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{userDetail.lastName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email / Username</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono break-all">{userDetail.email}</span>
                  </div>
                </div>
              </div>

              {/* Organization Info Section */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-indigo-605 dark:text-indigo-400 uppercase tracking-wide border-b pb-1 border-slate-100 dark:border-slate-800">
                  Organization Info
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Active Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${userDetail.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-350"}`} />
                      <span className="text-xs font-bold uppercase">{userDetail.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Security Profile</span>
                    {onNavigateToProfile && userDetail.profileId ? (
                      <button
                        type="button"
                        onClick={() => onNavigateToProfile(userDetail.profileId)}
                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-850 dark:hover:text-indigo-300 hover:underline text-left cursor-pointer focus:outline-none"
                      >
                        {userDetail.profileName || "None"}
                      </button>
                    ) : (
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{userDetail.profileName || "None"}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Hierarchical Role</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{userDetail.roleName || "None"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Related List (Takes 1 col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full max-h-[500px]">
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                <i className="fa-solid fa-shield-cat text-indigo-500" />
                Permission Set Assignments ({assignedCustomSets.length})
              </h3>
              <button
                onClick={() => setIsEditingAssignments(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
              >
                Edit Assignments
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {assignedCustomSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500">
                  <i className="fa-solid fa-folder-open text-2xl mb-2" />
                  <p className="text-xs font-medium">No custom permission sets assigned.</p>
                  <p className="text-[10px] mt-0.5">Click &quot;Edit Assignments&quot; to assign custom sets.</p>
                </div>
              ) : (
                assignedCustomSets.map((ps: any) => (
                  <div
                    key={ps.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start gap-2.5 hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-user-shield text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{ps.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">{ps.description || "No description."}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Edit Details Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fa-solid fa-user-pen text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Edit User Properties</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Change baseline profile and role details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">First Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-205 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Last Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-205 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-205 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Assigned Profile</label>
                <select
                  value={editProfile}
                  onChange={(e) => setEditProfile(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                >
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                >
                  <option value="">None (No Role)</option>
                  {ALL_ROLE_NAMES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2"
              >
                {savingEdit ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permission Set Assignment Multi-Select Modal */}
      {isEditingAssignments && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fa-solid fa-user-shield text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Edit Permission Set Assignments</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Assign additional custom permission sets to this user</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAssignments(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2">
              {allPermissionSets.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No custom permission sets available in the system.</p>
              ) : (
                allPermissionSets.map((ps) => {
                  const isChecked = selectedPermissionSetIds.includes(ps.id);
                  return (
                    <label
                      key={ps.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40 cursor-pointer transition-all ${
                        isChecked ? "border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/10" : ""
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermissionSetSelection(ps.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-605 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-855 dark:text-slate-200 block">{ps.name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 leading-relaxed block">{ps.description || "No description provided."}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setIsEditingAssignments(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-750"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssignments}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2"
              >
                {savingAssignments ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                <span>Save Assignments</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
