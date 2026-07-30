"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { UserRole } from "@/lib/enums";

// ─── User Setup Actions ───────────────────────────────────────────────────────

export async function fetchSetupUserDetailsAction(userId: string) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized setup console access.");
  }

  const res = await fetch(`http://localhost:3000/api/v1/setup/users/${userId}/details`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load user details from backend API.");
  }
  return res.json();
}

export async function updateUserGroupsAction(userId: string, groupIds: string[]) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized group update.");
  }

  const res = await fetch(`http://localhost:3000/api/v1/setup/users/${userId}/groups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupIds }),
  });

  if (!res.ok) {
    throw new Error("Failed to update user groups.");
  }
  revalidatePath(`/setup/users/${userId}`);
  return { success: true };
}

// ─── Profile Setup Actions (Mapped to security-settings REST endpoint) ────────

export async function fetchSetupProfileDetailsAction(profileId: string) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized setup console access.");
  }

  // 1. Fetch profile metadata details
  const profileRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!profileRes.ok) {
    throw new Error("Failed to load profile details.");
  }
  const profile = await profileRes.json();

  // 2. Fetch OLS, FLS, and System permissions unified settings
  const securityRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!securityRes.ok) {
    throw new Error("Failed to load profile security settings from backend.");
  }
  const sec = await securityRes.json();

  // 3. Map to old UI contract structure
  const objects = (sec.objectPermissions || []).map((o: any) => ({
    id: o.schemaObjectId,
    apiName: o.apiName,
    label: o.label,
  }));

  const ols = (sec.objectPermissions || []).map((o: any) => ({
    schemaObjectId: o.schemaObjectId,
    allowCreate: o.allowCreate,
    allowRead: o.allowRead,
    allowEdit: o.allowEdit,
    allowDelete: o.allowDelete,
    viewAllData: o.viewAllData,
    modifyAllData: o.modifyAllData,
  }));

  const systemPermissions = Object.entries(sec.systemPermissions || {}).map(([key, enabled]) => ({
    key,
    enabled: !!enabled,
  }));

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      isCustom: profile.isCustom,
    },
    permissionSetId: profileId, // We use profileId as psetId reference for front-to-back REST mapping
    objects,
    ols,
    systemPermissions,
    tabSettings: sec.tabSettings || [],
  };
}

export async function updateSetupProfileTabSettingsAction(
  profileId: string,
  tabSettings: { schemaObjectId: string; isVisible: boolean; precedenceOrder: number | null }[]
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized tab settings update.");
  }

  const getRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!getRes.ok) throw new Error("Failed to fetch current security settings.");
  const sec = await getRes.json();

  sec.tabSettings = tabSettings;

  const putRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sec),
  });

  if (!putRes.ok) {
    throw new Error("Failed to save tab settings update on backend.");
  }
  return { success: true };
}

export async function updateSetupProfileOLSListAction(
  profileId: string,
  olsList: {
    schemaObjectId: string;
    allowCreate: boolean;
    allowRead: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    viewAllData: boolean;
    modifyAllData: boolean;
  }[]
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized OLS update.");
  }

  // 1. Fetch current security settings
  const getRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!getRes.ok) throw new Error("Failed to fetch current security settings.");
  const sec = await getRes.json();

  // 2. Update list
  sec.objectPermissions = (sec.objectPermissions || []).map((o: any) => {
    const match = olsList.find((item) => item.schemaObjectId === o.schemaObjectId);
    return match ? { ...o, ...match } : o;
  });

  // 3. Put updated settings back to NestJS backend
  const putRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sec),
  });

  if (!putRes.ok) {
    throw new Error("Failed to save OLS update on backend.");
  }
  return { success: true };
}
export async function fetchSetupProfileFieldsAction(profileId: string, schemaObjectId: string) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized setup console access.");
  }

  // 1. Fetch security settings
  const getRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!getRes.ok) throw new Error("Failed to fetch FLS settings.");
  const sec = await getRes.json();

  // 2. Filter fields and FLS mapping where schemaObjectId matches
  const matchedFp = (sec.fieldPermissions || []).filter((fp: any) => fp.schemaObjectId === schemaObjectId);
  
  const fields = matchedFp.map((fp: any) => ({
    id: fp.schemaFieldId,
    apiName: fp.apiName,
    label: fp.label,
  }));

  const fls = matchedFp.map((fp: any) => ({
    schemaFieldId: fp.schemaFieldId,
    allowRead: fp.allowRead,
    allowEdit: fp.allowEdit,
  }));

  return {
    fields,
    fls,
  };
}

export async function updateSetupProfileFLSListAction(
  profileId: string,
  flsList: { schemaFieldId: string; allowRead: boolean; allowEdit: boolean }[]
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized FLS update.");
  }

  // 1. Fetch current settings
  const getRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!getRes.ok) throw new Error("Failed to fetch current security settings.");
  const sec = await getRes.json();

  // 2. Update list
  sec.fieldPermissions = (sec.fieldPermissions || []).map((fp: any) => {
    const match = flsList.find((item) => item.schemaFieldId === fp.schemaFieldId);
    return match ? { ...fp, ...match } : fp;
  });

  // 3. Put updated settings back to NestJS backend
  const putRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sec),
  });

  if (!putRes.ok) {
    throw new Error("Failed to save FLS update on backend.");
  }
  return { success: true };
}

export async function updateSetupProfileSystemAction(
  profileId: string,
  systemPerms: { key: string; enabled: boolean }[]
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized system permissions update.");
  }

  // 1. Fetch current settings
  const getRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!getRes.ok) throw new Error("Failed to fetch current security settings.");
  const sec = await getRes.json();

  // 2. Update keys
  if (!sec.systemPermissions) sec.systemPermissions = {};
  for (const perm of systemPerms) {
    sec.systemPermissions[perm.key] = perm.enabled;
  }

  // 3. Put back to NestJS
  const putRes = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/security-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sec),
  });

  if (!putRes.ok) {
    throw new Error("Failed to save system permissions update on backend.");
  }
  return { success: true };
}
