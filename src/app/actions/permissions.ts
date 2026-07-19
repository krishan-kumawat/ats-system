"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";
import {
  Permission,
  PermissionSet,
  RolePermissions,
  ALL_PERMISSIONS,
  BACKEND_PERM_MAP,
} from "@/lib/permissions";

export async function fetchRolePermissionsAction(): Promise<RolePermissions> {
  // Not used directly in UI since we load permissions in fetchInitialData(),
  // but kept for API surface safety.
  return {} as RolePermissions;
}

export async function saveRolePermissionsAction(
  role: UserRole,
  permissions: PermissionSet
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Not authenticated." };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can manage permissions." };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // 1. Fetch available backend permission codes to map codes to IDs
    const permsRes = await fetch("http://localhost:3000/api/v1/permissions", { headers });
    if (!permsRes.ok) {
      const errText = await permsRes.text().catch(() => "");
      throw new Error(`Failed to fetch atomic permissions from backend (Status: ${permsRes.status}): ${errText}`);
    }
    const backendPermsList = await permsRes.json();

    // Map permission code to its database ID
    const codeToId = new Map<string, string>();
    for (const p of backendPermsList) {
      codeToId.set(p.code, p.id);
    }

    // 2. Fetch profiles to locate the profileId for this role
    const profilesRes = await fetch("http://localhost:3000/api/v1/profiles", { headers });
    if (!profilesRes.ok) {
      const errText = await profilesRes.text().catch(() => "");
      throw new Error(`Failed to fetch profiles from backend (Status: ${profilesRes.status}): ${errText}`);
    }
    const profiles = await profilesRes.json();

    // Map role to profile name
    let targetProfileName = "";
    if (role === UserRole.ADMIN) targetProfileName = "Admin";
    else if (role === UserRole.RECRUITER) targetProfileName = "Recruiter";
    else if (role === UserRole.HIRING_MANAGER) targetProfileName = "Hiring Manager";
    else if (role === UserRole.READ_ONLY) targetProfileName = "Read Only";

    const matchedProfile = profiles.find(
      (p: any) =>
        p.name.toLowerCase().replace(/[\s_-]+/g, "") ===
        targetProfileName.toLowerCase().replace(/[\s_-]+/g, "")
    );

    if (!matchedProfile) {
      throw new Error(`Profile '${targetProfileName}' not found on backend.`);
    }

    // 3. Compute new set of backend permission codes to assign
    // Identify which codes are managed by our UI checkboxes
    const managedCodes = new Set<string>();
    for (const codes of Object.values(BACKEND_PERM_MAP)) {
      for (const c of codes) {
        managedCodes.add(c);
      }
    }

    // Get currently assigned codes on this profile
    const currentCodes = new Set<string>();
    if (matchedProfile.profilePermissions) {
      for (const pp of matchedProfile.profilePermissions) {
        if (pp.permission && pp.permission.code) {
          currentCodes.add(pp.permission.code);
        }
      }
    }

    // Retain all un-managed codes (so backend-only rules don't get cleared!)
    const nextCodes = new Set<string>();
    for (const c of currentCodes) {
      if (!managedCodes.has(c)) {
        nextCodes.add(c);
      }
    }

    // Add managed codes that are checked in the UI
    for (const key of ALL_PERMISSIONS) {
      if (permissions[key]) {
        const codes = BACKEND_PERM_MAP[key] || [];
        for (const c of codes) {
          nextCodes.add(c);
        }
      }
    }

    // Map backend codes to their database IDs
    const nextPermissionIds: string[] = [];
    for (const c of nextCodes) {
      const pid = codeToId.get(c);
      if (pid) {
        nextPermissionIds.push(pid);
      }
    }

    // 4. Call backend API to save the profile permissions
    const saveRes = await fetch(`http://localhost:3000/api/v1/profiles/${matchedProfile.id}/permissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ permissionIds: nextPermissionIds }),
    });

    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to update profile permissions on backend");
    }

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[saveRolePermissionsAction] FAILED:", err);
    try {
      const logPath = path.join(process.cwd(), "debug.log");
      const time = new Date().toISOString();
      const msg = `[${time}] FAILED: ${err instanceof Error ? err.stack : String(err)}\n`;
      fs.appendFileSync(logPath, msg, "utf-8");
    } catch (e) {
      console.error("Failed to write to debug.log", e);
    }
    return { error: err instanceof Error ? err.message : "Failed to save permissions." };
  }
}
