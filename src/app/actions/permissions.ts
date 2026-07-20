"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/enums";
import { getSession, destroySession } from "@/lib/auth";
import {
  PermissionSet,
  ALL_PERMISSIONS,
  BACKEND_PERM_MAP,
} from "@/lib/permissions";

export async function fetchProfilesAction(): Promise<{ profiles?: any[]; error?: string; unauthorized?: boolean }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { unauthorized: true };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
    };
    const res = await fetch("http://localhost:3000/api/v1/profiles", { headers, cache: "no-store" });
    if (res.status === 401) {
      await destroySession();
      return { unauthorized: true };
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch profiles (Status: ${res.status})`);
    }
    const profiles = await res.json();
    return { profiles };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch profiles." };
  }
}

export async function saveProfilePermissionsAction(
  profileId: string,
  permissions: PermissionSet
): Promise<{ error?: string; unauthorized?: boolean }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { unauthorized: true };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can manage permissions." };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // 1. Fetch available backend permissions to map codes to IDs
    const permsRes = await fetch("http://localhost:3000/api/v1/permissions", { headers });
    if (permsRes.status === 401) {
      await destroySession();
      return { unauthorized: true };
    }
    if (!permsRes.ok) {
      throw new Error(`Failed to fetch available permissions (Status: ${permsRes.status})`);
    }
    const backendPermsList = await permsRes.json();
    const codeToId = new Map<string, string>();
    for (const p of backendPermsList) {
      codeToId.set(p.code, p.id);
    }

    // 2. Map UI selections to backend IDs
    const nextPermissionIds: string[] = [];
    for (const key of ALL_PERMISSIONS) {
      if (permissions[key]) {
        const codes = BACKEND_PERM_MAP[key] || [];
        for (const c of codes) {
          const pid = codeToId.get(c);
          if (pid && !nextPermissionIds.includes(pid)) {
            nextPermissionIds.push(pid);
          }
        }
      }
    }

    // 3. POST to profile permissions endpoint
    const saveRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/permissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ permissionIds: nextPermissionIds }),
    });

    if (saveRes.status === 401) {
      await destroySession();
      return { unauthorized: true };
    }
    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to update profile permissions on backend");
    }

    revalidatePath("/");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save permissions." };
  }
}

export async function createProfileAndCloneAction(
  name: string,
  description: string,
  cloneFromProfileId?: string
): Promise<{ profile?: any; error?: string; unauthorized?: boolean }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { unauthorized: true };
  if (session.role !== UserRole.ADMIN) return { error: "Only Administrators can create profiles." };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    // 1. Create Profile
    const createRes = await fetch("http://localhost:3000/api/v1/profiles", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, description }),
    });

    if (createRes.status === 401) {
      await destroySession();
      return { unauthorized: true };
    }
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to create profile");
    }
    const newProfile = await createRes.json();

    // 2. Clone permissions if selected
    if (cloneFromProfileId) {
      const profilesRes = await fetch("http://localhost:3000/api/v1/profiles", { headers });
      if (profilesRes.status === 401) {
        await destroySession();
        return { unauthorized: true };
      }
      if (profilesRes.ok) {
        const profiles = await profilesRes.json();
        const sourceProfile = profiles.find((p: any) => p.id === cloneFromProfileId);
        if (sourceProfile && sourceProfile.profilePermissions) {
          const permissionIds = sourceProfile.profilePermissions
            .map((pp: any) => pp.permission?.id)
            .filter(Boolean);

          if (permissionIds.length > 0) {
            const cloneRes = await fetch(`http://localhost:3000/api/v1/profiles/${newProfile.id}/permissions`, {
              method: "POST",
              headers,
              body: JSON.stringify({ permissionIds }),
            });
            if (cloneRes.status === 401) {
              await destroySession();
              return { unauthorized: true };
            }
            if (!cloneRes.ok) {
              throw new Error("Profile created, but failed to clone permissions.");
            }
          }
        }
      }
    }

    revalidatePath("/");
    return { profile: newProfile };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create profile." };
  }
}
