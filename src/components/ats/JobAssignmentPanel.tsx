"use client";

import { useState, useEffect, useTransition } from "react";
import { Job } from "@/lib/atsStore";
import { UserRole } from "@/lib/enums";
import { ROLE_META } from "@/lib/permissions";
import {
  fetchAssignmentsAction,
  fetchAssignableUsersAction,
  assignJobAction,
  revokeAssignmentAction,
  AssignmentRow,
  UserOption,
} from "@/app/actions/assignments";

interface JobAssignmentPanelProps {
  jobs: Job[];
  onToast: (title: string, msg: string, icon?: string) => void;
}

const ASSIGNABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.HIRING_MANAGER,
  UserRole.READ_ONLY,
];

export default function JobAssignmentPanel({ jobs, onToast }: JobAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterJobId, setFilterJobId] = useState("all");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [a, u] = await Promise.all([
        fetchAssignmentsAction(),
        fetchAssignableUsersAction(),
      ]);
      setAssignments(a);
      setUsers(u);
    });
  }, []);

  const filtered = filterJobId === "all"
    ? assignments
    : assignments.filter((a) => a.jobId === filterJobId);

  async function handleRevoke(id: string, name: string) {
    const result = await revokeAssignmentAction(id);
    if (result.error) {
      onToast("Revoke Failed", result.error, "xmark");
    } else {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      onToast("Assignment Revoked", `${name}'s assignment has been removed.`, "user-minus");
    }
  }

  function handleAssigned(row: AssignmentRow) {
    setAssignments((prev) => {
      const exists = prev.findIndex((a) => a.id === row.id);
      if (exists >= 0) return prev.map((a) => (a.id === row.id ? row : a));
      return [row, ...prev];
    });
    if (!users.find((u) => u.id === row.assignedToId)) {
      setUsers((prev) => [...prev, {
        id: row.assignedToId,
        name: row.assignedToName,
        email: row.assignedToEmail,
        role: row.assignedToRole as UserRole,
      }]);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <i className="fa-solid fa-user-tag text-rose-600 dark:text-rose-400" />
            Job Assignment Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign job requisition responsibilities to your team. Head of HR only.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Job filter */}
          <div className="relative">
            <i className="fa-solid fa-briefcase absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none min-w-[200px]"
            >
              <option value="all">All Job Requisitions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-rose-500/20 transition-all"
          >
            <i className="fa-solid fa-plus" />
            Assign Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Assignments</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{assignments.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jobs Assigned</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {new Set(assignments.map((a) => a.jobId)).size}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assignees</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {new Set(assignments.map((a) => a.assignedToId)).size}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {isPending ? (
          <div className="flex items-center justify-center h-40 gap-3 text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-lg text-rose-500" />
            <span className="text-sm">Loading assignments…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <i className="fa-solid fa-user-tag text-2xl" />
            <p className="text-sm">No assignments yet</p>
            <p className="text-xs text-slate-400">Click &quot;Assign Job&quot; to get started.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignee</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Requisition</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Assigned By</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Note</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden xl:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((a) => {
                const roleMeta = ROLE_META[a.assignedToRole as UserRole] ?? ROLE_META[UserRole.RECRUITER];
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${roleMeta.bg}`}>
                          <i className={`fa-solid ${roleMeta.icon} text-xs ${roleMeta.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{a.assignedToName}</p>
                          <p className="text-[11px] text-slate-400">{a.assignedToEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${roleMeta.bg} ${roleMeta.color}`}>
                        {roleMeta.label}
                      </span>
                    </td>

                    {/* Job */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{a.jobTitle}</p>
                      <p className="text-[11px] text-slate-400">{a.department}</p>
                    </td>

                    {/* Assigned by */}
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 dark:text-slate-400">
                      {a.assignedByName}
                    </td>

                    {/* Note */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-slate-400 dark:text-slate-500 italic">
                        {a.note || "—"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-400">
                      {a.assignedAt}
                    </td>

                    {/* Revoke */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevoke(a.id, a.assignedToName)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-100"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AssignModal
          jobs={jobs}
          users={users}
          onClose={() => setShowModal(false)}
          onAssigned={(row) => {
            handleAssigned(row);
            onToast("Job Assigned", `${row.assignedToName} assigned to ${row.jobTitle}.`, "user-tag");
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({
  jobs,
  users,
  onClose,
  onAssigned,
  onToast,
}: {
  jobs: Job[];
  users: UserOption[];
  onClose: () => void;
  onAssigned: (row: AssignmentRow) => void;
  onToast: (title: string, msg: string, icon?: string) => void;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.RECRUITER);
  const [newPassword, setNewPassword] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await assignJobAction({
      jobId,
      assignedToId: mode === "existing" ? selectedUserId : undefined,
      newUser: mode === "new" ? { name: newName, email: newEmail, role: newRole, password: newPassword } : undefined,
      note: note.trim() || undefined,
    });

    if (result.error) {
      onToast("Assignment Failed", result.error, "xmark");
      setSaving(false);
      return;
    }

    // Refresh assignments list from DB to get the full row with names
    const fresh = await fetchAssignmentsAction();
    const newRow = fresh.find((r) => r.jobId === jobId && (
      mode === "existing" ? r.assignedToId === selectedUserId : r.assignedToEmail === newEmail
    ));
    if (newRow) onAssigned(newRow);

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-user-tag text-rose-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Assign Job Requisition</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Job picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Job Requisition <span className="text-red-500">*</span>
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
              ))}
            </select>
          </div>

          {/* Assignee mode toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Assign To</label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${mode === "existing" ? "bg-rose-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <i className="fa-solid fa-user mr-1.5" />Existing User
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${mode === "new" ? "bg-rose-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <i className="fa-solid fa-user-plus mr-1.5" />Create New User
              </button>
            </div>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Select User <span className="text-red-500">*</span>
              </label>
              {users.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No users available. Create a new one.</p>
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({ROLE_META[u.role]?.label ?? u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New User Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    required placeholder="Jane Doe"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                  <input
                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    required placeholder="jane@company.com"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                  <select
                    value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password *</label>
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required placeholder="Temp password"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Assignment Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} placeholder="e.g. Focus on engineering candidates only…"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/20 transition-all disabled:opacity-60"
            >
              {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-user-tag" />}
              {saving ? "Assigning…" : "Assign Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
