"use client";

import React, { useState, useEffect } from "react";
import { fetchSetupUserDetailsAction } from "@/app/actions/setup-actions";
import { AuditEntry } from "@/lib/atsStore";

interface UserRecordPageProps {
  userId: string;
  auditLogs: AuditEntry[];
  onBack: () => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

export default function UserRecordPage({
  userId,
  auditLogs,
  onBack,
  onToast,
}: UserRecordPageProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"details" | "related">("details");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSetupUserDetailsAction(userId);
        if (!active) return;
        setData(res);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load user details.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading user details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <i className="fa-solid fa-triangle-exclamation text-rose-500 text-3xl animate-bounce" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Error Loading User</h3>
        <p className="text-xs text-slate-450">{error || "User data is missing."}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
        >
          Back to List
        </button>
      </div>
    );
  }

  const { user, assignedPermissionSets, assignedGroups } = data;

  // Filter logs where this user is the actor
  const userFullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const relatedLogs = auditLogs.filter(
    (log) =>
      (log.user && log.user.toLowerCase().includes(userFullName.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(user.email.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f3f3f3] dark:bg-slate-950 p-3 space-y-3 overflow-y-auto">
      
      {/* 1. HIGHLIGHTS PANEL (Salesforce Header) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3ca0e0] text-white rounded flex items-center justify-center shadow">
            <i className="fa-solid fa-user text-lg" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              User
            </div>
            <h1 className="text-lg font-bold text-slate-855 dark:text-slate-100 flex items-center gap-2">
              {user.firstName} {user.lastName}
            </h1>
          </div>
        </div>

        {/* Buttons Panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold shadow-sm transition-colors"
          >
            Back to List
          </button>
          <a
            href={`/setup/users/${user.id}`}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
          >
            Manage User Setup
          </a>
        </div>
      </div>

      {/* Highlights Grid summary fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs flex-shrink-0">
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Email</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-all">{user.email}</div>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Profile</div>
          <div className="font-semibold text-slate-850 dark:text-slate-200 mt-0.5">{user.profile?.name || "None"}</div>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Role</div>
          <div className="font-semibold text-slate-850 dark:text-slate-200 mt-0.5">{user.role?.name || "None"}</div>
        </div>
        <div>
          <div className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Active Status</div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${
            user.isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border-emerald-250/30"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200"
          }`}>
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* 2. MAIN LAYOUT (Details/Related Left, Sidebar Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        
        {/* Left Column (Tabs Details & Related) */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col min-h-0">
          
          {/* Salesforce Sub-tab headers */}
          <div className="flex border-b border-slate-200 dark:border-slate-850 px-4 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveSubTab("details")}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeSubTab === "details"
                  ? "border-[#0070d2] text-[#0070d2] dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-455 hover:text-slate-700"
              }`}
            >
              <i className="fa-solid fa-circle-info text-[10px]" />
              Details
            </button>
            <button
              onClick={() => setActiveSubTab("related")}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeSubTab === "related"
                  ? "border-[#0070d2] text-[#0070d2] dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-455 hover:text-slate-700"
              }`}
            >
              <i className="fa-solid fa-list-ul text-[10px]" />
              Related (Permission Sets & Groups)
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto min-h-0 text-xs text-slate-700 dark:text-slate-350">
            
            {/* Details Grid */}
            {activeSubTab === "details" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">First Name</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-100 mt-1">{user.firstName || "N/A"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Last Name</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-100 mt-1">{user.lastName || "N/A"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Email / Username</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-100 mt-1">{user.email}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Profile Name</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-100 mt-1">{user.profile?.name || "None"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Role Node</span>
                    <p className="font-semibold text-slate-850 dark:text-slate-100 mt-1">{user.role?.name || "None"}</p>
                  </div>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">User Record ID</span>
                    <p className="font-semibold font-mono text-slate-500 dark:text-slate-400 mt-1">{user.id}</p>
                  </div>
                </div>

                {/* System Information */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info text-indigo-500" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Created By</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {user.createdByName || "System"} ({user.createdDate ? new Date(user.createdDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"})
                      </p>
                    </div>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Last Modified By</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {user.lastModifiedByName || "System"} ({user.lastModifiedDate ? new Date(user.lastModifiedDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Lists */}
            {activeSubTab === "related" && (
              <div className="space-y-6">
                
                {/* Custom Permission Sets */}
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-halved text-indigo-500" />
                    Permission Set Assignments ({assignedPermissionSets.length})
                  </h3>
                  {assignedPermissionSets.length === 0 ? (
                    <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
                      No custom permission sets assigned.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignedPermissionSets.map((ps: any) => (
                        <div key={ps.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{ps.name}</span>
                          <span className="text-[10px] text-slate-450 mt-0.5">{ps.description || "No description"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Public Groups */}
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-users text-indigo-500" />
                    Public Group Memberships ({assignedGroups.length})
                  </h3>
                  {assignedGroups.length === 0 ? (
                    <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
                      Not mapped to any public sharing groups.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignedGroups.map((g: any) => (
                        <div key={g.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{g.name}</span>
                          <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200 dark:border-slate-800">
                            Public Group
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Right Column (Activities / User Activity Feed) */}
        <div className="w-full lg:w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col p-4 space-y-4 flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              User Activity
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Chronological log matches for this user
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {relatedLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-[11px]">
                No recent activity recorded for this user.
              </div>
            ) : (
              relatedLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex gap-2 items-start"
                >
                  <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 text-[10px] font-bold">
                    <i className="fa-solid fa-clock-rotate-left" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action || "Audit Log"}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{log.notes}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
