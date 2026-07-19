"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/enums";
import { getSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  profileName: string;
  roleName: string;
  departmentName?: string;
}

export interface UpdateUserInput {
  id: string;
  name: string;
  email: string;
  profileName: string;
  roleName: string;
  departmentName?: string;
  password?: string; // only set if changing
}

function mapProfileToRole(profileName: string): UserRole {
  const norm = (profileName || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (norm.includes("admin")) return UserRole.ADMIN;
  if (norm.includes("recruiter")) return UserRole.RECRUITER;
  if (norm.includes("hiring")) return UserRole.HIRING_MANAGER;
  if (norm.includes("readonly") || norm.includes("read")) return UserRole.READ_ONLY;
  return UserRole.READ_ONLY;
}

// ─── Fetch all users — active first, then inactive (Founder only) ─────────────

export interface FetchUsersResult {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  roleCounts: Record<UserRole, number>;
}

export async function fetchUsersAction(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  roleFilter: string = "all"
): Promise<FetchUsersResult> {
  const session = await getSession();
  if (!session || !session.accessToken) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      roleCounts: {
        [UserRole.ADMIN]: 0,
        [UserRole.RECRUITER]: 0,
        [UserRole.HIRING_MANAGER]: 0,
        [UserRole.READ_ONLY]: 0,
      },
    };
  }

  try {
    let backendProfile = roleFilter;
    if (roleFilter === UserRole.ADMIN) backendProfile = "Admin";
    else if (roleFilter === UserRole.RECRUITER) backendProfile = "Recruiter";
    else if (roleFilter === UserRole.HIRING_MANAGER) backendProfile = "Hiring Manager";
    else if (roleFilter === UserRole.READ_ONLY) backendProfile = "Read Only";

    const url = `http://localhost:3000/api/v1/users?page=${page}&limit=${limit}&search=${encodeURIComponent(
      search
    )}&profile=${encodeURIComponent(backendProfile)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (response.status === 401) {
      console.warn("[fetchUsersAction] Session expired or unauthorized (401). Redirecting to login.");
      await destroySession();
      redirect("/login");
    }

    if (!response.ok) {
      console.error("[fetchUsersAction] Backend API error:", response.statusText);
      return {
        users: [],
        total: 0,
        page,
        limit,
        roleCounts: {
          [UserRole.ADMIN]: 0,
          [UserRole.RECRUITER]: 0,
          [UserRole.HIRING_MANAGER]: 0,
          [UserRole.READ_ONLY]: 0,
        },
      };
    }

    const result = await response.json();
    const users = result.data || [];
    const total = result.total || 0;
    const profileCounts = result.profileCounts || {};

    const roleCounts: Record<UserRole, number> = {
      [UserRole.ADMIN]: profileCounts["Admin"] || 0,
      [UserRole.RECRUITER]: profileCounts["Recruiter"] || 0,
      [UserRole.HIRING_MANAGER]: profileCounts["Hiring Manager"] || 0,
      [UserRole.READ_ONLY]: profileCounts["Read Only"] || 0,
    };

    const mapped: UserRow[] = users.map((u: any) => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      email: u.email,
      role: mapProfileToRole(u.profile?.name),
      isActive: !u.deletedAt,
      createdAt: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "",
    }));

    return {
      users: mapped,
      total,
      page: result.page || page,
      limit: result.limit || limit,
      roleCounts,
    };
  } catch (err) {
    console.error("[fetchUsersAction]", err);
    return {
      users: [],
      total: 0,
      page,
      limit,
      roleCounts: {
        [UserRole.ADMIN]: 0,
        [UserRole.RECRUITER]: 0,
        [UserRole.HIRING_MANAGER]: 0,
        [UserRole.READ_ONLY]: 0,
      },
    };
  }
}

// ─── Create user (Admin only) ─────────────────────────────────────────────────

export async function createUserAction(
  input: CreateUserInput
): Promise<{ user?: UserRow; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can create users." };

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (!input.password || input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        firstName,
        lastName,
        profileName: input.profileName,
        roleName: input.roleName,
        departmentName: input.departmentName || undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { error: errData.message || "Failed to create user." };
    }

    const u = await response.json();
    revalidatePath("/");

    return {
      user: {
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        email: u.email,
        role: mapProfileToRole(input.profileName),
        isActive: !u.deletedAt,
        createdAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      },
    };
  } catch (err) {
    console.error("[createUserAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to create user." };
  }
}

// ─── Update user details (Admin only) ────────────────────────────────────────

export async function updateUserAction(
  input: UpdateUserInput
): Promise<{ user?: UserRow; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can edit users." };

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (input.password && input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const bodyData: any = {
      email: input.email.trim().toLowerCase(),
      firstName,
      lastName,
      profileName: (input.profileName && input.profileName !== "None") ? input.profileName : undefined,
      roleName: (input.roleName && input.roleName !== "None") ? input.roleName : undefined,
      departmentName: (input.departmentName && input.departmentName !== "None") ? input.departmentName : undefined,
    };

    if (input.password) {
      bodyData.password = input.password;
    }

    const response = await fetch(`http://localhost:3000/api/v1/users/${input.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { error: errData.message || "Failed to update user." };
    }

    const u = await response.json();
    revalidatePath("/");

    return {
      user: {
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        email: u.email,
        role: mapProfileToRole(input.profileName),
        isActive: !u.deletedAt,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "",
      },
    };
  } catch (err) {
    console.error("[updateUserAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to update user." };
  }
}

// ─── Toggle active/inactive (Admin only) ──────────────────────────────────────

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can activate/deactivate users." };
  if (userId === session.id) return { error: "You cannot deactivate your own account." };

  try {
    if (isActive) {
      return { error: "Re-activating a soft-deleted user is not supported by the backend API. Please create a new user." };
    }

    // Deactivating is done via DELETE (soft delete) in NestJS backend
    const response = await fetch(`http://localhost:3000/api/v1/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { error: errData.message || "Failed to deactivate user." };
    }    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[toggleUserActiveAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to update user status." };
  }
}

export interface UserDetailPayload {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileName: string;
  roleName: string;
  departmentName: string;
  isActive: boolean;
  createdAt: string;
  permissions: {
    assigned: { code: string; module: string; entity: string; action: string }[];
    unassigned: { code: string; module: string; entity: string; action: string }[];
  };
}

export async function fetchUserDetailAction(userId: string): Promise<{ user?: UserDetailPayload; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };

  try {
    const headers = { Authorization: `Bearer ${session.accessToken}` };

    // 1. Fetch user record
    const userRes = await fetch(`http://localhost:3000/api/v1/users/${userId}`, { headers });
    if (!userRes.ok) return { error: "User not found." };
    const u = await userRes.json();

    // 2. Fetch all system permissions
    const permsRes = await fetch("http://localhost:3000/api/v1/permissions", { headers });
    const allPerms = permsRes.ok ? await permsRes.json() : [];

    // 3. Fetch the profile details of the user (to know which permissions the profile has)
    const profilesRes = await fetch("http://localhost:3000/api/v1/profiles", { headers });
    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const userProfile = profiles.find((p: any) => p.id === u.profileId);
    
    const profilePermCodes = new Set<string>();
    if (userProfile && userProfile.profilePermissions) {
      for (const pp of userProfile.profilePermissions) {
        if (pp.permission?.code) {
          profilePermCodes.add(pp.permission.code);
        }
      }
    }

    // 4. Collect user custom permission set codes
    const customPermCodes = new Set<string>();
    if (u.userPermissionSets) {
      for (const ups of u.userPermissionSets) {
        if (ups.permissionSet?.permissionSetPerms) {
          for (const psp of ups.permissionSet.permissionSetPerms) {
            if (psp.permission?.code) {
              customPermCodes.add(psp.permission.code);
            }
          }
        }
      }
    }

    // Combined assigned codes
    const assignedCodes = new Set([...profilePermCodes, ...customPermCodes]);

    const assigned: any[] = [];
    const unassigned: any[] = [];

    for (const p of allPerms) {
      const item = {
        code: p.code,
        module: p.module || "System",
        entity: p.entity || "General",
        action: p.action || "Access",
      };
      if (assignedCodes.has(p.code)) {
        assigned.push(item);
      } else {
        unassigned.push(item);
      }
    }

    return {
      user: {
        id: u.id,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        profileName: u.profile?.name || "None",
        roleName: u.role?.name || "None",
        departmentName: u.department?.name || "None",
        isActive: !u.deletedAt,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "",
        permissions: { assigned, unassigned },
      },
    };
  } catch (err) {
    console.error("[fetchUserDetailAction]", err);
    return { error: "Failed to load user details." };
  }
}
