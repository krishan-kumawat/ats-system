"use server";

import { revalidatePath } from "next/cache";
import { readDb, writeDb } from "@/db/local-db";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";
import { PermissionSet, RolePermissions, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

export async function saveRolePermissionsAction(
  role: UserRole,
  permissions: PermissionSet
): Promise<{ error?: string }> {
  const session = await getSession();

  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.FOUNDER) return { error: "Only Founders can manage permissions." };

  try {
    const db = readDb();

    // Update or insert each permission key
    for (const key of ALL_PERMISSIONS) {
      const existing = db.rolePermissions.find(
        (rp) => rp.role === role && rp.permissionKey === key
      );
      if (existing) {
        existing.granted = permissions[key];
        existing.updatedAt = new Date();
      } else {
        const nextId = db.rolePermissions.length > 0
          ? Math.max(...db.rolePermissions.map((rp) => rp.id)) + 1
          : 1;

        db.rolePermissions.push({
          id: nextId,
          role,
          permissionKey: key,
          granted: permissions[key],
          updatedAt: new Date(),
        });
      }
    }

    const changed = ALL_PERMISSIONS
      .filter((k) => permissions[k] !== DEFAULT_ROLE_PERMISSIONS[role][k])
      .map((k) => `${k}: ${permissions[k] ? "ON" : "OFF"}`)
      .join(", ");

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "PERMISSION_CHANGE",
      targetTable: "role_permissions",
      targetId: role,
      notes: changed || "No changes from default",
      oldValues: null,
      newValues: Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, permissions[k]])),
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[saveRolePermissionsAction] FAILED:", err);
    return { error: err instanceof Error ? err.message : "Failed to save permissions." };
  }
}

export async function fetchRolePermissionsAction(): Promise<RolePermissions> {
  try {
    const db = readDb();

    if (db.rolePermissions.length === 0) return DEFAULT_ROLE_PERMISSIONS;

    const result: RolePermissions = {} as RolePermissions;
    for (const role of [
      UserRole.FOUNDER,
      UserRole.RECRUITER,
      UserRole.ADMIN,
      UserRole.HIRING_MANAGER,
      UserRole.HEAD_OF_HR,
    ]) {
      const roleRows = db.rolePermissions.filter((p) => p.role === role);
      const set: Record<string, boolean> = {};
      for (const row of roleRows) {
        set[row.permissionKey] = row.granted;
      }
      for (const key of ALL_PERMISSIONS) {
        if (!(key in set)) set[key] = DEFAULT_ROLE_PERMISSIONS[role][key];
      }
      result[role] = set as PermissionSet;
    }
    return result;
  } catch (err) {
    console.error("[fetchRolePermissionsAction]", err);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}
