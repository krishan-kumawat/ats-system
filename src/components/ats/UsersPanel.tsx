"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
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
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.HIRING_MANAGER,
  UserRole.READ_ONLY,
];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]:          "Full access — all permissions, immutable",
  [UserRole.RECRUITER]:      "Pipeline, jobs, candidate ingest",
  [UserRole.HIRING_MANAGER]: "Scorecards and analytics only",
  [UserRole.READ_ONLY]:      "Read-only access to recruitment data",
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

const ALL_PROFILES = ["Admin", "Recruiter", "Hiring Manager", "Read Only"];
const ALL_ROLE_NAMES = ["CEO", "HR Head", "Recruitment Manager", "Recruiter"];
const ALL_DEPARTMENTS = ["Engineering", "HR"];

const PROFILE_ICONS: Record<string, string> = {
  "Admin": "fa-chess-king",
  "Recruiter": "fa-id-badge",
  "Hiring Manager": "fa-user-tie",
  "Read Only": "fa-eye",
};

const PROFILE_COLORS: Record<string, string> = {
  "Admin": "text-indigo-750 dark:text-indigo-350 bg-indigo-100 dark:bg-indigo-950",
  "Recruiter": "text-emerald-750 dark:text-emerald-350 bg-emerald-100 dark:bg-emerald-950",
  "Hiring Manager": "text-violet-750 dark:text-violet-350 bg-violet-100 dark:bg-violet-950",
  "Read Only": "text-slate-750 dark:text-slate-350 bg-slate-100 dark:bg-slate-950",
};

function ProfileNameCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-semibold"
      >
        {ALL_PROFILES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
        <i className="fa-solid fa-chevron-down" />
      </div>
    </div>
  );
}

function RoleNameCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-semibold"
      >
        {ALL_ROLE_NAMES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
        <i className="fa-solid fa-chevron-down" />
      </div>
    </div>
  );
}

function DepartmentNameCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-semibold"
      >
        <option value="">None</option>
        {ALL_DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
        <i className="fa-solid fa-chevron-down" />
      </div>
    </div>
  );
}


// ─── Shared form fields used in both Create and Edit modals ──────────────────

interface UserFormFields {
  name: string;
  email: string;
  password: string;
  profileName: string;
  roleName: string;
  departmentName: string;
  showPw: boolean;
  saving: boolean;
  isEdit?: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onProfileNameChange: (v: string) => void;
  onRoleNameChange: (v: string) => void;
  onDepartmentNameChange: (v: string) => void;
  onTogglePw: () => void;
}

function UserFormBody({
  name,
  email,
  password,
  profileName,
  roleName,
  departmentName,
  showPw,
  saving,
  isEdit,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onProfileNameChange,
  onRoleNameChange,
  onDepartmentNameChange,
  onTogglePw,
}: UserFormFields) {
  const isValid = (name || "").trim() && (email || "").trim() && (!isEdit ? (password || "").length >= 6 : !password || (password || "").length >= 6);

  // Map profileName string to UserRole to look up style assets
  let mappedRole = UserRole.RECRUITER;
  if (profileName === "Admin") mappedRole = UserRole.ADMIN;
  else if (profileName === "Hiring Manager") mappedRole = UserRole.HIRING_MANAGER;
  else if (profileName === "Read Only") mappedRole = UserRole.READ_ONLY;

  const meta = ROLE_META[mappedRole];

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
              name="new-user-email-field" autoComplete="new-password"
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
            name="new-user-password-field" autoComplete="new-password"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          <button type="button" onClick={onTogglePw} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"} text-xs`} />
          </button>
        </div>
        {password.length > 0 && password.length < 6 && (
          <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation" /> At least 6 characters required</p>
        )}
      </div>

      {/* Combobox selections */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Profile Name <span className="text-red-400">*</span></label>
          <ProfileNameCombobox value={profileName} onChange={onProfileNameChange} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Role Name <span className="text-red-400">*</span></label>
          <RoleNameCombobox value={roleName} onChange={onRoleNameChange} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Department</label>
        <DepartmentNameCombobox value={departmentName} onChange={onDepartmentNameChange} />
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
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPw]         = useState("");
  const [profileName, setProfile] = useState("Recruiter");
  const [roleName, setRoleName]   = useState("Recruiter");
  const [deptName, setDeptName]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);

  const isValid = name.trim() && email.trim() && password.length >= 6 && profileName && roleName;

  async function handleSave() {
    setSaving(true);
    const result = await createUserAction({
      name,
      email,
      password,
      profileName,
      roleName,
      departmentName: deptName || undefined,
    });
    if (result.error) { onToast("Error", result.error, "ban"); setSaving(false); return; }
    onCreated(result.user!);
    onToast("User Created", `${name} added successfully.`, "user-plus");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <i className="fa-solid fa-user-plus text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Create New User</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Admin access only</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <UserFormBody
          name={name}
          email={email}
          password={password}
          profileName={profileName}
          roleName={roleName}
          departmentName={deptName}
          showPw={showPw}
          saving={saving}
          isEdit={false}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPw}
          onProfileNameChange={setProfile}
          onRoleNameChange={setRoleName}
          onDepartmentNameChange={setDeptName}
          onTogglePw={() => setShowPw((v) => !v)}
        />

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
  const [name, setName]     = useState(user.name || "");
  const [email, setEmail]   = useState(user.email || "");
  const [password, setPw]   = useState("");

  const initialProfile = user.role === UserRole.ADMIN ? "Admin"
    : user.role === UserRole.RECRUITER ? "Recruiter"
    : user.role === UserRole.HIRING_MANAGER ? "Hiring Manager"
    : "Read Only";

  const initialRole = user.role === UserRole.ADMIN ? "CEO"
    : user.role === UserRole.RECRUITER ? "Recruiter"
    : user.role === UserRole.HIRING_MANAGER ? "Recruitment Manager"
    : "Recruiter";

  const [profileName, setProfile] = useState(initialProfile);
  const [roleName, setRoleName]   = useState(initialRole);
  const [deptName, setDeptName]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);

  const isValid = (name || "").trim() && (email || "").trim() && (!password || (password || "").length >= 6);

  async function handleSave() {
    setSaving(true);
    const result = await updateUserAction({
      id: user.id,
      name,
      email,
      password: password || undefined,
      profileName,
      roleName,
      departmentName: deptName || undefined,
    });
    if (result.error) { onToast("Error", result.error, "ban"); setSaving(false); return; }
    onUpdated(result.user!);
    onToast("User Updated", `${name}'s details have been saved.`, "user-pen");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col">
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

        <UserFormBody
          name={name}
          email={email}
          password={password}
          profileName={profileName}
          roleName={roleName}
          departmentName={deptName}
          showPw={showPw}
          saving={saving}
          isEdit={true}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPw}
          onProfileNameChange={setProfile}
          onRoleNameChange={setRoleName}
          onDepartmentNameChange={setDeptName}
          onTogglePw={() => setShowPw((v) => !v)}
        />

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

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface UsersPanelProps {
  onToast: (t: string, m: string, i?: string) => void;
  onNavigateToRolePermissions?: (role: UserRole) => void;
  onSelectUserId?: (userId: string) => void;
}

export default function UsersPanel({ onToast, onNavigateToRolePermissions, onSelectUserId }: UsersPanelProps) {
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter]   = useState<UserRole | "all">("all");
  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<UserRow | null>(null);
  const [isPending, startTransition]  = useTransition();
  const [toggling, setToggling]       = useState<Set<string>>(new Set());

  // Pagination State
  const [page, setPage]               = useState(1);
  const [limit]                       = useState(10);
  const [total, setTotal]             = useState(0);
  const [roleCounts, setRoleCounts]   = useState<Record<UserRole, number>>({
    [UserRole.ADMIN]: 0,
    [UserRole.RECRUITER]: 0,
    [UserRole.HIRING_MANAGER]: 0,
    [UserRole.READ_ONLY]: 0,
  });

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search query
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const data = await fetchUsersAction(page, limit, debouncedSearch, roleFilter);
      if (data.unauthorized) {
        window.location.href = "/login";
        return;
      }
      setUsers(data.users);
      setTotal(data.total);
      if (data.roleCounts) {
        setRoleCounts(data.roleCounts);
      }
    });
  }, [page, limit, debouncedSearch, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggle(u: UserRow) {
    const next = !u.isActive;
    setToggling((prev) => new Set(prev).add(u.id));
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: next } : x));
    const result = await toggleUserActiveAction(u.id, next);
    if (result.error) {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: u.isActive } : x));
      onToast("Error", result.error, "ban");
    } else {
      onToast(next ? "User Activated" : "User Deactivated", `${u.name} is now ${next ? "active" : "deactivated"}.`, next ? "circle-check" : "circle-xmark");
      fetchData();
    }
    setToggling((prev) => { const s = new Set(prev); s.delete(u.id); return s; });
  }

  function handleCreated(_user: UserRow) {
    setPage(1);
    fetchData();
  }

  function handleUpdated(_user: UserRow) {
    fetchData();
  }

  const totalPages = Math.ceil(total / limit);
  const pageNumbers = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

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
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{total} active</span>
                <span className="text-slate-400"> · {total} total</span>
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
              <button key={r} onClick={() => {
                setRoleFilter((p) => p === r ? "all" : r);
                setPage(1);
              }}
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
              name="user-table-search-field" autoComplete="new-password"
              className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(roleFilter !== "all" || search) && (
            <button onClick={() => { setRoleFilter("all"); setSearch(""); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all bg-white dark:bg-slate-900">
              <i className="fa-solid fa-xmark text-[10px]" />Clear filter
            </button>
          )}
          <p className="text-xs text-slate-400 ml-auto hidden sm:block">
            Showing {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} users
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-t-2xl border-x border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isPending ? (
            <div className="flex items-center justify-center h-40 gap-3 text-slate-400 dark:text-slate-500">
              <i className="fa-solid fa-circle-notch fa-spin text-xl text-indigo-500" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : users.length === 0 ? (
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
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Profile Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Joined</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const meta       = ROLE_META[u.role];
                  const isToggling = toggling.has(u.id);
                  return (
                    <tr key={u.id} className={`transition-colors group ${u.isActive ? "hover:bg-slate-50 dark:hover:bg-slate-800/40" : "bg-slate-50/60 dark:bg-slate-950/60 opacity-60"}`}>

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => onSelectUserId?.(u.id)}
                          className="flex items-center gap-3 text-left hover:underline group"
                        >
                          <div className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                            <span className={`text-xs font-bold ${meta.color}`}>{u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate md:hidden">{u.email}</p>
                          </div>
                        </button>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300`}>
                          {u.role === UserRole.ADMIN ? "CEO" : u.role === UserRole.RECRUITER ? "Recruiter" : u.role === UserRole.HIRING_MANAGER ? "Recruitment Manager" : "Recruiter"}
                        </span>
                      </td>

                      {/* Profile Name (Clickable Link) */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => onNavigateToRolePermissions?.(u.role)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-all"
                        >
                          <i className={`fa-solid ${meta.icon} text-[10px]`} />
                          <span>{meta.label}</span>
                        </button>
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

        {/* Pagination controls */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-2xl flex-shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {total}
              </span>{" "}
              users
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1"
              >
                <i className="fa-solid fa-chevron-left text-[10px]" />
                Prev
              </button>
              {pageNumbers.map((pNum) => {
                const active = pNum === page;
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1"
              >
                Next
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} onToast={onToast} />}
      {editTarget  && <EditUserModal  user={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} onToast={onToast} />}
    </>
  );
}
