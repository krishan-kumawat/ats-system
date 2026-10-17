"use client";

import React, { useState } from "react";
import DualListBox from "@/components/ats/DualListBox";
import { assignUserPermissionSetsAction } from "@/app/actions/users";
import { updateUserGroupsAction } from "@/app/actions/setup-actions";
import Link from "next/link";

interface UserSetupWorkspaceProps {
  userId: string;
  initialData: {
    user: any;
    assignedPermissionSets: any[];
    allPermissionSets: any[];
    assignedGroups: any[];
    allGroups: any[];
  };
}

export default function UserSetupWorkspace({
  userId,
  initialData,
}: UserSetupWorkspaceProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showPsetModal, setShowPsetModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Draft lists for DualListBoxes
  const [draftPsetIds, setDraftPsetIds] = useState<string[]>(
    initialData.assignedPermissionSets.map((ps) => ps.id)
  );
  const [draftGroupIds, setDraftGroupIds] = useState<string[]>(
    initialData.assignedGroups.map((g) => g.id)
  );

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSavePermissionSets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignUserPermissionSetsAction(userId, draftPsetIds);
      if (res.error) throw new Error(res.error);

      // Update local state
      const updatedAssigned = data.allPermissionSets.filter((ps) =>
        draftPsetIds.includes(ps.id)
      );
      setData((prev) => ({
        ...prev,
        assignedPermissionSets: updatedAssigned,
      }));
      setShowPsetModal(false);
      triggerToast("Permission set assignments updated successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update permission sets.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateUserGroupsAction(userId, draftGroupIds);
      if (!res.success) throw new Error("Failed to update public groups.");

      // Update local state
      const updatedAssigned = data.allGroups.filter((g) =>
        draftGroupIds.includes(g.id)
      );
      setData((prev) => ({
        ...prev,
        assignedGroups: updatedAssigned,
      }));
      setShowGroupModal(false);
      triggerToast("Public group memberships updated successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to update public groups.");
    } finally {
      setLoading(false);
    }
  };

  const user = data.user;

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
            <h4 className="font-bold">Error executing action</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Setup Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <i className="fa-solid fa-user-gear text-2xl" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Setup Console &gt; User Detail
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {user.firstName} {user.lastName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-850 font-medium transition-colors"
          >
            Close Setup
          </Link>
        </div>
      </div>

      {/* Two-Column Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            User Detail
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">First Name</span>
              <span className="col-span-2 font-semibold">{user.firstName || "N/A"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Last Name</span>
              <span className="col-span-2 font-semibold">{user.lastName || "N/A"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Email</span>
              <span className="col-span-2 font-semibold text-indigo-600 dark:text-indigo-400">
                {user.email}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Assigned Profile</span>
              <span className="col-span-2 font-semibold">
                {user.profile?.name || "N/A"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Assigned Role</span>
              <span className="col-span-2 font-semibold">
                {user.role?.name || "N/A"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400 font-medium">Active Status</span>
              <span className="col-span-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-550" : "bg-slate-450"}`} />
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Permission Set Assignments (Related List) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-indigo-500" />
              Permission Set Assignments
            </h3>
            <button
              onClick={() => {
                setDraftPsetIds(data.assignedPermissionSets.map((ps) => ps.id));
                setShowPsetModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors"
            >
              Edit Assignments
            </button>
          </div>
          <div className="p-6 flex-1">
            {data.assignedPermissionSets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 py-6">
                No custom permission sets assigned
              </div>
            ) : (
              <div className="space-y-3">
                {data.assignedPermissionSets.map((pset) => (
                  <div
                    key={pset.id}
                    className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">
                        {pset.name}
                      </span>
                      {pset.description && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {pset.description}
                        </p>
                      )}
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold border border-slate-200 dark:border-slate-800">
                      Custom Set
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Public Group Memberships (Related List) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-users text-indigo-500" />
              Public Group Memberships
            </h3>
            <button
              onClick={() => {
                setDraftGroupIds(data.assignedGroups.map((g) => g.id));
                setShowGroupModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors"
            >
              Edit Group Membership
            </button>
          </div>
          <div className="p-6 flex-1">
            {data.assignedGroups.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 py-6">
                Not a member of any public groups
              </div>
            ) : (
              <div className="space-y-3">
                {data.assignedGroups.map((g) => (
                  <div
                    key={g.id}
                    className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">
                        {g.name}
                      </span>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold border border-slate-200 dark:border-slate-800">
                      Public Group
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Permission Sets Modal (DualListBox Box) */}
      {showPsetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-4xl w-full flex flex-col shadow-2xl animate-scale-in max-h-[90vh]">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Edit Permission Set Assignments
              </h3>
              <button
                onClick={() => setShowPsetModal(false)}
                className="text-slate-400 hover:text-slate-500 text-lg"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <DualListBox
                availableTitle="Available Permission Sets"
                selectedTitle="Selected Permission Sets"
                options={data.allPermissionSets.map((ps) => ({
                  id: ps.id,
                  name: ps.name,
                  description: ps.description,
                }))}
                selectedIds={draftPsetIds}
                onChange={setDraftPsetIds}
              />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowPsetModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-850 font-medium transition-colors text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissionSets}
                disabled={loading}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs rounded font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                {loading && <i className="fa-solid fa-spinner animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Group Modal (DualListBox Box) */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-4xl w-full flex flex-col shadow-2xl animate-scale-in max-h-[90vh]">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Edit Public Group Memberships
              </h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-500 text-lg"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <DualListBox
                availableTitle="Available Groups"
                selectedTitle="Selected Group Memberships"
                options={data.allGroups.map((g) => ({
                  id: g.id,
                  name: g.name,
                }))}
                selectedIds={draftGroupIds}
                onChange={setDraftGroupIds}
              />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-850 font-medium transition-colors text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroups}
                disabled={loading}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs rounded font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                {loading && <i className="fa-solid fa-spinner animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
