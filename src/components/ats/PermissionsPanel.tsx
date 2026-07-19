"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@/lib/enums";
import {
  Permission,
  PermissionSet,
  RolePermissions,
  ALL_PERMISSIONS,
  EDITABLE_ROLES,
  ADMIN_LOCKED_PERMISSIONS,
  PERMISSION_META,
  CATEGORY_META,
  ROLE_META,
} from "@/lib/permissions";
import { AuditEntry } from "@/lib/atsStore";

interface PermissionsPanelProps {
  permissions: RolePermissions;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  onPermissionsChange: (role: UserRole, set: PermissionSet, next: RolePermissions) => Promise<void>;
  onAuditLog: (entry: AuditEntry) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}

const CATEGORIES = ["pipeline", "jobs"] as const;

export default function PermissionsPanel({
  permissions,
  activeRole,
  setActiveRole,
  onPermissionsChange,
  onAuditLog,
  onToast,
}: PermissionsPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<Partial<PermissionSet>>({});
  const [saving, setSaving] = useState(false);

  const [prevActiveRole, setPrevActiveRole] = useState<UserRole>(activeRole);
  if (activeRole !== prevActiveRole) {
    setPrevActiveRole(activeRole);
    setPendingChanges({});
  }

  const currentSet = permissions[activeRole];
  const merged: PermissionSet = { ...currentSet, ...pendingChanges };
  const hasPending = Object.keys(pendingChanges).length > 0;

  function toggle(perm: Permission) {
    if (ADMIN_LOCKED_PERMISSIONS.has(perm) && activeRole === UserRole.ADMIN) return;
    const next = !merged[perm];
    setPendingChanges((prev) => {
      const updated = { ...prev, [perm]: next };
      // Remove if same as saved value
      if (currentSet[perm] === next) delete updated[perm];
      return updated;
    });
  }

  async function saveChanges() {
    setSaving(true);
    const updatedSet: PermissionSet = { ...currentSet, ...pendingChanges };
    const next: RolePermissions = { ...permissions, [activeRole]: updatedSet };
    await onPermissionsChange(activeRole, updatedSet, next);

    const changed = Object.entries(pendingChanges)
      .map(([k, v]) => `${PERMISSION_META[k as Permission].label}: ${v ? "ON" : "OFF"}`)
      .join(", ");

    onAuditLog({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: "Admin",
      action: "PERMISSION_CHANGE",
      target: ROLE_META[activeRole].label,
      notes: `Updated: ${changed}`,
    });

    onToast("Permissions Saved", `${ROLE_META[activeRole].label} permissions updated.`, "user-shield");
    setPendingChanges({});
    setSaving(false);
  }

  function discardChanges() {
    setPendingChanges({});
    onToast("Discarded", "All pending changes have been reverted.", "xmark");
  }

  function grantAll() {
    const updates: Partial<PermissionSet> = {};
    ALL_PERMISSIONS.forEach((p) => {
      if (!ADMIN_LOCKED_PERMISSIONS.has(p) || activeRole !== UserRole.ADMIN) {
        if (!currentSet[p]) updates[p] = true;
      }
    });
    setPendingChanges((prev) => {
      const merged2 = { ...prev, ...updates };
      Object.keys(merged2).forEach((k) => {
        if (currentSet[k as Permission] === merged2[k as Permission]) delete merged2[k as Permission];
      });
      return merged2;
    });
  }

  function revokeAll() {
    const updates: Partial<PermissionSet> = {};
    ALL_PERMISSIONS.forEach((p) => {
      if (!ADMIN_LOCKED_PERMISSIONS.has(p)) {
        if (currentSet[p]) updates[p] = false;
      }
    });
    setPendingChanges((prev) => {
      const merged2 = { ...prev, ...updates };
      Object.keys(merged2).forEach((k) => {
        if (currentSet[k as Permission] === merged2[k as Permission]) delete merged2[k as Permission];
      });
      return merged2;
    });
  }

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <i className="fa-solid fa-user-shield text-indigo-600 dark:text-indigo-400" />
            Profile Permission Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Founder-only control. Toggle permissions per profile, then save.
          </p>
        </div>

        {hasPending && (
          <div className="flex items-center gap-2">
            <button
              onClick={discardChanges}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-all"
            >
              Discard
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <i className="fa-solid fa-floppy-disk" />
              Save Changes ({Object.keys(pendingChanges).length})
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-5 flex-1 overflow-hidden">

        {/* ── Profile selector column ── */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1">
            Select Profile
          </p>
          {EDITABLE_ROLES.map((r) => {
            const meta = ROLE_META[r];
            const set = permissions[r];
            const granted = ALL_PERMISSIONS.filter((p) => set[p]).length;
            const total = ALL_PERMISSIONS.length;
            const pct = Math.round((granted / total) * 100);
            const isActive = activeRole === r;
            return (
              <button
                key={r}
                onClick={() => { setActiveRole(r); setPendingChanges({}); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isActive
                    ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
                    <i className={`fa-solid ${meta.icon} text-xs ${meta.color}`} />
                  </div>
                  <span className={`text-xs font-bold ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                    {meta.label}
                  </span>
                  {isActive && <i className="fa-solid fa-chevron-right text-[9px] text-indigo-500 ml-auto" />}
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${pct > 66 ? "bg-emerald-500" : pct > 33 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{granted}/{total} permissions</p>
              </button>
            );
          })}

          {/* Founder card — locked */}
          <div className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 mt-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-100 dark:bg-indigo-950">
                <i className="fa-solid fa-chess-king text-xs text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Founder</span>
              <i className="fa-solid fa-lock text-[9px] text-slate-400 ml-auto" />
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">All permissions (immutable)</p>
          </div>
        </div>

        {/* ── Permissions grid ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick:
            </span>
            <button
              onClick={grantAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all"
            >
              <i className="fa-solid fa-check-double mr-1" /> Grant All
            </button>
            <button
              onClick={revokeAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 transition-all"
            >
              <i className="fa-solid fa-ban mr-1" /> Revoke All
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ROLE_META[activeRole].bg}`}>
                <i className={`fa-solid ${ROLE_META[activeRole].icon} text-[10px] ${ROLE_META[activeRole].color}`} />
              </div>
              <span className={`text-xs font-bold ${ROLE_META[activeRole].color}`}>
                {ROLE_META[activeRole].label}
              </span>
            </div>
          </div>

          {/* Permission cards by category */}
          {CATEGORIES.map((cat) => {
            const perms = ALL_PERMISSIONS.filter((p) => PERMISSION_META[p].category === cat);
            if (perms.length === 0) return null;
            const catMeta = CATEGORY_META[cat];
            return (
              <div key={cat} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Category header */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${catMeta.color}`}>
                    {catMeta.label}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perms.map((perm) => {
                    const meta = PERMISSION_META[perm];
                    const isOn = merged[perm];
                    const isLocked = activeRole === UserRole.ADMIN && ADMIN_LOCKED_PERMISSIONS.has(perm);
                    const isDirty = perm in pendingChanges;

                    return (
                      <div
                        key={perm}
                        className={`flex items-center justify-between px-4 py-3.5 transition-colors ${
                          isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        } ${isDirty ? "bg-amber-50/60 dark:bg-amber-950/10" : ""}`}
                        onClick={() => !isLocked && toggle(perm)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isOn
                              ? "bg-indigo-100 dark:bg-indigo-950"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                            <i className={`fa-solid ${meta.icon} text-xs ${
                              isOn ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600"
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {meta.label}
                              </p>
                              {meta.danger && (
                                <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-1.5 rounded">
                                  SENSITIVE
                                </span>
                              )}
                              {isDirty && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-1.5 rounded">
                                  UNSAVED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{meta.description}</p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        {isLocked ? (
                          <i className="fa-solid fa-lock text-slate-400 text-xs flex-shrink-0" />
                        ) : (
                          <div className={`relative w-10 h-5.5 flex-shrink-0 rounded-full transition-colors duration-200 ${
                            isOn ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                            style={{ minWidth: "40px", height: "22px" }}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${
                              isOn ? "translate-x-[18px]" : "translate-x-0"
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
