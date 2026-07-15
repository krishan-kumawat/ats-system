"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  fetchUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  UserRow,
} from "@/app/actions/users";
import { UserRole } from "@/lib/enums";
import { ROLE_META } from "@/lib/permissions";

const ALL_ROLES: UserRole[] = [
  UserRole.RECRUITER,
  UserRole.ADMIN,
  UserRole.HIRING_MANAGER,
  UserRole.HEAD_OF_HR,
  UserRole.FOUNDER,
];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.FOUNDER]:        "Full access — all permissions, immutable",
  [UserRole.HEAD_OF_HR]:     "Assign jobs, full pipeline access",
  [UserRole.ADMIN]:          "Broad access, no offer approval",
  [UserRole.RECRUITER]:      "Pipeline, jobs, candidate ingest",
  [UserRole.HIRING_MANAGER]: "Scorecards and analytics only",
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

function RoleCombobox({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (r: UserRole) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef<HTMLDivElement>(null);
  const meta              = ROLE_META[value];

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = ALL_ROLES.filter(
    (r) => !query || ROLE_META[r].label.toLowerCase().includes(query.toLowerCase()) || ROLE_DESCRIPTIONS[r].toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-left transition-all ${open ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
          <i className={`fa-solid ${meta.icon} text-xs ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
          <p className="text-[10px] text-slate-400 truncate">{ROLE_DESCRIPTIONS[value]}</p>
        </div>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-slate-400 text-[10px] flex-shrink-0`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles…"
                className="w-full bg-slate-50 dark:bg-slate-950 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((r) => {
              const m = ROLE_META[r];
              const sel = value === r;
              return (
                <li key={r}>
                  <button
                    type="button"
                    onClick={() => { onChange(r); setQuery(""); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel ? "bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                      <i className={`fa-solid ${m.icon} text-xs ${m.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${sel ? m.color : "text-slate-800 dark:text-slate-200"}`}>{m.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{ROLE_DESCRIPTIONS[r]}</p>
                    </div>
                    {sel && <i className="fa-solid fa-check text-indigo-500 text-[10px] flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Shared form fields used in both Create and Edit modals ──────────────────

interface UserFormFields {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  showPw: boolean;
  saving: boolean;
  isEdit?: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onRoleChange: (v: UserRole) => void;
  onTogglePw: () => void;
}

function UserFormBody({ name, email, password, role, showPw, saving, isEdit, onNameChange, onEmailChange, onPasswordChange, onRoleChange, onTogglePw }: UserFormFields) {
  const meta    = ROLE_META[role];
  const isValid = name.trim() && email.trim() && (!isEdit ? password.length >= 6 : !password || password.length >= 6);

  return (
    <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Full Name <span className="text-red-400">*</span></label>
          <div className="relative">
            <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-xs pointer-events-none" />
            <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Priya Sharma"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
          <div className="relative">
            <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-xs pointer-events-none" />
            <input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="priya@org.com"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
          Password {isEdit ? <span className="normal-case font-normal text-slate-400">(leave blank to keep current)</span> : <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-xs pointer-events-none" />
          <input type={showPw ? "text" : "password"} value={password} onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={isEdit ? "New password (optional)" : "Min. 6 characters"}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          <button type="button" onClick={onTogglePw} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"} text-xs`} />
          </button>
        </div>
        {password.length > 0 && password.length < 6 && (
          <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation" /> At least 6 characters required</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Role <span className="text-red-400">*</span></label>
        <RoleCombobox value={role} onChange={onRoleChange} />
      </div>

      {/* Preview */}
      {name && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
          isValid ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${meta.bg}`}>
            <span className={`text-sm ${meta.color}`}>{name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{name}</p>
            <p className="text-[11px] text-slate-400 truncate">{email || "No email yet"}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
          {isValid && <i className="fa-solid fa-circle-check text-emerald-500 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated, onToast }: {
  onClose: () => void;
  onCreated: (user: UserRow) => void;
  onToast: (t: string, m: string, i?: string) => void;
}) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPw]     = useState("");
  const [role, setRole]       = useState<UserRole>(UserRole.RECRUITER);
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const isValid = name.trim() && email.trim() && password.length >= 6;

  async function handleSave() {
    setSaving(true);
    const result = await createUserAction({ name, email, password, role });
    if (result.error) { onToast("Error", result.error, "ban"); setSaving(false); return; }
    onCreated(result.user!);
    onToast("User Created", `${name} added as ${ROLE_META[role].label}.`, "user-plus");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <i className="fa-solid fa-user-plus text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Create New User</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Founder access only</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <UserFormBody name={name} email={email} password={password} role={role} showPw={showPw} saving={saving} isEdit={false}
          onNameChange={setName} onEmailChange={setEmail} onPasswordChange={setPw} onRoleChange={setRole} onTogglePw={() => setShowPw((v) => !v)} />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950 rounded-b-2xl">
          <p className="text-[10px] text-slate-400"><i className="fa-solid fa-shield-halved mr-1" />Changes are audit-logged</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60">Cancel</button>
            <button onClick={handleSave} disabled={saving || !isValid}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /><span>Creating…</span></> : <><i className="fa-solid fa-user-plus" /><span>Create User</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onUpdated, onToast }: {
  user: UserRow;
  onClose: () => void;
  onUpdated: (user: UserRow) => void;
  onToast: (t: string, m: string, i?: string) => void;
}) {
  const [name, setName]     = useState(user.name);
  const [email, setEmail]   = useState(user.email);
  const [password, setPw]   = useState("");
  const [role, setRole]     = useState<UserRole>(user.role);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid = name.trim() && email.trim() && (!password || password.length >= 6);

  async function handleSave() {
    setSaving(true);
    const result = await updateUserAction({ id: user.id, name, email, role, password: password || undefined });
    if (result.error) { onToast("Error", result.error, "ban"); setSaving(false); return; }
    onUpdated(result.user!);
    onToast("User Updated", `${name}'s details have been saved.`, "user-pen");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <i className="fa-solid fa-user-pen text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Edit User</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <UserFormBody name={name} email={email} password={password} role={role} showPw={showPw} saving={saving} isEdit={true}
          onNameChange={setName} onEmailChange={setEmail} onPasswordChange={setPw} onRoleChange={setRole} onTogglePw={() => setShowPw((v) => !v)} />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950 rounded-b-2xl">
          <p className="text-[10px] text-slate-400"><i className="fa-solid fa-shield-halved mr-1" />Changes are audit-logged</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60">Cancel</button>
            <button onClick={handleSave} disabled={saving || !isValid}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2">
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /><span>Saving…</span></> : <><i className="fa-solid fa-floppy-disk" /><span>Save Changes</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function UsersPanel({ onToast }: { onToast: (t: string, m: string, i?: string) => void }) {
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState<UserRole | "all">("all");
  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<UserRow | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [toggling, setToggling]       = useState<Set<string>>(new Set());

  useEffect(() => {
    startTransition(async () => {
      const data = await fetchUsersAction();
      setUsers(data);
    });
  }, []);

  // Keep active-first sort after any local mutation
  function sortUsers(list: UserRow[]): UserRow[] {
    return [...list].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return 0;
    });
  }

  const filtered = sortUsers(
    users.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    })
  );

  async function handleToggle(u: UserRow) {
    const next = !u.isActive;
    setToggling((prev) => new Set(prev).add(u.id));
    setUsers((prev) => sortUsers(prev.map((x) => x.id === u.id ? { ...x, isActive: next } : x)));
    const result = await toggleUserActiveAction(u.id, next);
    if (result.error) {
      setUsers((prev) => sortUsers(prev.map((x) => x.id === u.id ? { ...x, isActive: u.isActive } : x)));
      onToast("Error", result.error, "ban");
    } else {
      onToast(next ? "User Activated" : "User Deactivated", `${u.name} is now ${next ? "active" : "deactivated"}.`, next ? "circle-check" : "circle-xmark");
    }
    setToggling((prev) => { const s = new Set(prev); s.delete(u.id); return s; });
  }

  function handleCreated(user: UserRow) { setUsers((prev) => sortUsers([user, ...prev])); }
  function handleUpdated(user: UserRow) { setUsers((prev) => sortUsers(prev.map((x) => x.id === user.id ? user : x))); }

  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;
  const roleCounts    = ALL_ROLES.reduce<Record<string, number>>((acc, r) => { acc[r] = users.filter((u) => u.role === r).length; return acc; }, {});

  return (
    <>
      <div className="flex flex-col h-full gap-4">

        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <i className="fa-solid fa-users-gear text-indigo-600 dark:text-indigo-400" />
              User Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isPending ? "Loading…" : <>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeCount} active</span>
                {inactiveCount > 0 && <span className="text-red-500 dark:text-red-400 font-semibold"> · {inactiveCount} deactivated</span>}
                <span className="text-slate-400"> · {users.length} total</span>
              </>}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all">
            <i className="fa-solid fa-user-plus" /><span>Create User</span>
          </button>
        </div>

        {/* Role stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-shrink-0">
          {ALL_ROLES.map((r) => {
            const meta = ROLE_META[r];
            const sel  = roleFilter === r;
            return (
              <button key={r} onClick={() => setRoleFilter((p) => p === r ? "all" : r)}
                className={`p-3.5 rounded-xl border text-left transition-all ${sel ? "border-indigo-400 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${meta.bg}`}>
                  <i className={`fa-solid ${meta.icon} text-xs ${meta.color}`} />
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-none">{roleCounts[r] ?? 0}</p>
                <p className={`text-[11px] font-semibold mt-0.5 ${meta.color}`}>{meta.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <input type="text" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {roleFilter !== "all" && (
            <button onClick={() => setRoleFilter("all")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all bg-white dark:bg-slate-900">
              <i className="fa-solid fa-xmark text-[10px]" />Clear filter
            </button>
          )}
          <p className="text-xs text-slate-400 ml-auto hidden sm:block">{filtered.length} of {users.length} users</p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isPending ? (
            <div className="flex items-center justify-center h-40 gap-3 text-slate-400 dark:text-slate-500">
              <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
              <i className="fa-solid fa-user-slash text-3xl" />
              <p className="text-sm font-medium">No users match the current filter</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Joined</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => {
                  const meta       = ROLE_META[u.role];
                  const isToggling = toggling.has(u.id);
                  return (
                    <tr key={u.id} className={`transition-colors group ${u.isActive ? "hover:bg-slate-50 dark:hover:bg-slate-800/40" : "bg-slate-50/60 dark:bg-slate-950/60 opacity-60"}`}>

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                            <span className={`text-xs font-bold ${meta.color}`}>{u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate md:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${meta.bg} ${meta.color}`}>
                          <i className={`fa-solid ${meta.icon} text-[9px]`} />{meta.label}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-slate-500 dark:text-slate-400">{u.email}</span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-slate-400 dark:text-slate-500">{u.createdAt || "—"}</span>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        {isToggling ? (
                          <i className="fa-solid fa-circle-notch fa-spin text-indigo-500 text-sm" />
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <Toggle checked={u.isActive} onChange={() => handleToggle(u)} disabled={isToggling} />
                            <span className={`text-[9px] font-bold ${u.isActive ? "text-emerald-500" : "text-slate-400"}`}>
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Edit button */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/70"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} onToast={onToast} />}
      {editTarget  && <EditUserModal  user={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} onToast={onToast} />}
    </>
  );
}
