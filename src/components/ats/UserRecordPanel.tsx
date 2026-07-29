"use client";

import { useState, useEffect } from "react";
import { fetchUserDetailAction, toggleUserActiveAction, updateUserAction, UserDetailPayload } from "@/app/actions/users";
import { fetchProfilesAction } from "@/app/actions/permissions";
import { UserRole } from "@/lib/enums";

interface UserRecordPanelProps {
  userId: string;
  onBack: () => void;
  onToast: (title: string, msg: string, icon?: string) => void;
  onNavigateToRolePermissions?: (role: UserRole) => void;
}

const ALL_ROLE_NAMES = ["CEO", "HR Head", "Recruitment Manager", "Recruiter"];
const ALL_DEPARTMENTS = ["Engineering", "HR"];

const FRIENDLY_TABLE_PERMS: Record<string, { name: string; action: string }> = {
  "recruitment:job:create": { name: "Job Requisitions", action: "Create" },
  "recruitment:job:read": { name: "Job Requisitions", action: "Read" },
  "recruitment:job:update": { name: "Job Requisitions", action: "Update" },
  "recruitment:job:delete": { name: "Job Requisitions", action: "Delete" },
  "recruitment:candidate:create": { name: "Candidates & Applications", action: "Create" },
  "recruitment:candidate:read": { name: "Candidates & Applications", action: "Read" },
  "recruitment:candidate:update": { name: "Candidates & Applications", action: "Update" },
  "recruitment:candidate:delete": { name: "Candidates & Applications", action: "Delete" },
  "identity:profile:create": { name: "Profiles (Permissions)", action: "Create" },
  "identity:profile:read": { name: "Profiles (Permissions)", action: "Read" },
  "identity:profile:update": { name: "Profiles (Permissions)", action: "Update" },
  "identity:profile:delete": { name: "Profiles (Permissions)", action: "Delete" },
};

export default function UserRecordPanel({ userId, onBack, onToast, onNavigateToRolePermissions }: UserRecordPanelProps) {
  const [userDetail, setUserDetail] = useState<UserDetailPayload | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [subTab, setSubTab] = useState<"details" | "permissions">("details");

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editProfile, setEditProfile] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDept, setEditDept] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function loadData() {
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
        // Prepopulate edit fields
        setEditFirstName(res.user.firstName);
        setEditLastName(res.user.lastName);
        setEditEmail(res.user.email);
        setEditProfile(res.user.profileName);
        setEditRole(res.user.roleName === "None" ? "" : res.user.roleName);
        setEditDept(res.user.departmentName === "None" ? "" : res.user.departmentName);
      }

      const profRes = await fetchProfilesAction();
      if (profRes.unauthorized) {
        window.location.href = "/login";
        return;
      }
      if (profRes.profiles) {
        setAllProfiles(profRes.profiles);
      }
      setLoading(false);
    }
    loadData();
  }, [userId, onToast]);

  async function handleToggleActive() {
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
      setUserDetail((prev) => prev ? { ...prev, isActive: nextActive } : null);
      onToast(
        nextActive ? "User Activated" : "User Deactivated",
        `${userDetail.firstName} ${userDetail.lastName} status updated successfully.`,
        nextActive ? "circle-check" : "circle-xmark"
      );
    }
    setToggling(false);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!userDetail) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      onToast("Validation Error", "First Name, Last Name, and Email are required.", "triangle-exclamation");
      return;
    }

    setSavingEdit(true);
    const fullName = `${editFirstName.trim()} ${editLastName.trim()}`;
    const res = await updateUserAction({
      id: userDetail.id,
      name: fullName,
      email: editEmail.trim(),
      profileName: editProfile,
      roleName: editRole,
      departmentName: editDept || undefined,
    });

    if (res.unauthorized) {
      window.location.href = "/login";
      return;
    }

    if (res.error) {
      onToast("Update Failed", res.error, "ban");
    } else {
      setUserDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          profileName: editProfile,
          roleName: editRole || "None",
          departmentName: editDept || "None",
        };
      });
      onToast("User Updated", `${fullName}'s record has been successfully updated in the database.`, "user-pen");
      setIsEditing(false);
    }
    setSavingEdit(false);
  }

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
        <button onClick={onBack} className="mt-2 text-xs text-indigo-650 hover:underline">
          Go back to user list
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto text-slate-800 dark:text-slate-200">
      
      {/* Breadcrumb back navigation */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-655 hover:text-indigo-808 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-semibold"
        >
          <i className="fa-solid fa-arrow-left" />
          <span>Back to User List</span>
        </button>
      </div>

      {/* Title & Button Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <i className="fa-solid fa-user text-sm" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">User Detail</h1>
            <p className="text-xs text-slate-400 mt-1">{userDetail.firstName} {userDetail.lastName}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
          >
            {toggling ? "Updating…" : userDetail.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Underlined Sub Tabs Row */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 mt-4 flex-shrink-0">
        <button
          onClick={() => setSubTab("details")}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[1px] ${
            subTab === "details"
              ? "border-indigo-600 text-indigo-605 dark:text-indigo-400"
              : "border-transparent text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setSubTab("permissions")}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[1px] ${
            subTab === "permissions"
              ? "border-indigo-600 text-indigo-605 dark:text-indigo-400"
              : "border-transparent text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Permissions
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-5 flex-1 min-h-0">
        {subTab === "details" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
            <table className="w-full text-xs border-collapse">
              <tbody>
                
                {/* Row 1: Name & Role */}
                <tr className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="w-[15%] px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Name
                  </td>
                  <td className="w-[35%] px-5 py-3 font-semibold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800/80">
                    {userDetail.firstName} {userDetail.lastName}
                  </td>
                  <td className="w-[15%] px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Role
                  </td>
                  <td className="w-[35%] px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    {userDetail.roleName}
                  </td>
                </tr>

                {/* Row 2: Email & Profile */}
                <tr className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Email
                  </td>
                  <td className="px-5 py-3 border-r border-slate-100 dark:border-slate-800/80">
                    <span className="text-indigo-655 dark:text-indigo-400 hover:underline cursor-pointer select-all">{userDetail.email}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-455 font-bold ml-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">[Verified]</span>
                  </td>
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Profile
                  </td>
                  <td className="px-5 py-3 border-r border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        let roleKey = UserRole.READ_ONLY;
                        const norm = (userDetail.profileName || "").toLowerCase();
                        if (norm.includes("admin")) roleKey = UserRole.ADMIN;
                        else if (norm.includes("recruiter")) roleKey = UserRole.RECRUITER;
                        else if (norm.includes("hiring") || norm.includes("manager")) roleKey = UserRole.HIRING_MANAGER;
                        onNavigateToRolePermissions?.(roleKey);
                      }}
                      className="font-semibold text-indigo-655 dark:text-indigo-400 hover:underline cursor-pointer text-left focus:outline-none"
                    >
                      {userDetail.profileName}
                    </button>
                  </td>
                </tr>

                {/* Row 3: Department & Joined Date */}
                <tr className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Department
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/80">
                    {userDetail.departmentName || "Unassigned"}
                  </td>
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Joined Date
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {userDetail.createdAt || "—"}
                  </td>
                </tr>

                {/* Row 4: Active & Blank */}
                <tr className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    Active
                  </td>
                  <td className="px-5 py-3 border-r border-slate-100 dark:border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={userDetail.isActive}
                      readOnly
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-605 focus:ring-indigo-500 cursor-not-allowed pointer-events-none"
                    />
                  </td>
                  <td className="px-5 py-3 bg-slate-50/50 dark:bg-slate-950/20 text-left font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80">
                    {/* Empty cell */}
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {/* Empty cell */}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        )}

        {subTab === "permissions" && (() => {
          const assignedPerms = userDetail.permissions.assigned;
          const hasCode = (code: string) => assignedPerms.some((p) => p.code === code);

          const matrixRows = [
            {
              label: "Candidates & Applications",
              icon: "fa-user-group text-indigo-500",
              c: hasCode("recruitment:candidate:create"),
              r: hasCode("recruitment:candidate:read"),
              u: hasCode("recruitment:candidate:update"),
              d: hasCode("recruitment:candidate:delete"),
            },
            {
              label: "Job Requisitions",
              icon: "fa-briefcase text-emerald-500",
              c: hasCode("recruitment:job:create"),
              r: hasCode("recruitment:job:read"),
              u: hasCode("recruitment:job:update"),
              d: hasCode("recruitment:job:delete"),
            },
            {
              label: "Profiles (Permissions)",
              icon: "fa-folder-tree text-amber-500",
              c: hasCode("identity:profile:create"),
              r: hasCode("identity:profile:read"),
              u: hasCode("identity:profile:update"),
              d: hasCode("identity:profile:delete"),
            },
          ];

          return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3 text-left font-bold">Standard Object</th>
                    <th className="px-4 py-3 text-center font-bold">Create (C)</th>
                    <th className="px-4 py-3 text-center font-bold">Read (R)</th>
                    <th className="px-4 py-3 text-center font-bold">Update (U)</th>
                    <th className="px-4 py-3 text-center font-bold text-red-500">Delete (D)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matrixRows.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className={`fa-solid ${row.icon}`} />
                        <span>{row.label}</span>
                      </td>
                      {[row.c, row.r, row.u, row.d].map((val, idx) => (
                        <td key={idx} className="px-4 py-4 text-center">
                          {val ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                              <i className="fa-solid fa-check text-[10px]" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600">
                              <i className="fa-solid fa-minus text-[10px]" />
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Edit User Details Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fa-solid fa-user-pen text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Edit User Details</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Update database attributes</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">First Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Last Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-808 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Profile & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Profile <span className="text-red-400">*</span></label>
                  <select
                    value={editProfile}
                    onChange={(e) => setEditProfile(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                  >
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Role <span className="text-red-400">*</span></label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                  >
                    <option value="">None</option>
                    {ALL_ROLE_NAMES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                >
                  <option value="">None / Unassigned</option>
                  {ALL_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 flex-shrink-0">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin animate-spin" />
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
      )}
    </div>
  );
}
