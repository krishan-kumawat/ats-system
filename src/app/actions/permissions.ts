"use server";

import { revalidatePath } from "next/cache";
import { withDb } from "@/db/data-source";
import { IAuditLog } from "@/db/schemas";
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
  if (!process.env.DATABASE_URL) return {};

  try {
    await withDb(async (ds) => {
      // Raw SQL upsert — fully bypasses TypeORM ORM layer and any caching/
      // change-tracking quirks. One statement per permission key.
      for (const key of ALL_PERMISSIONS) {
        await ds.query(
          `INSERT INTO role_permissions (role, "permissionKey", granted)
           VALUES ($1, $2, $3)
           ON CONFLICT (role, "permissionKey")
           DO UPDATE SET granted = EXCLUDED.granted, "updatedAt" = NOW()`,
          [role, key, permissions[key]]
        );
      }

      const changed = ALL_PERMISSIONS
        .filter((k) => permissions[k] !== DEFAULT_ROLE_PERMISSIONS[role][k])
        .map((k) => `${k}: ${permissions[k] ? "ON" : "OFF"}`)
        .join(", ");

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: "PERMISSION_CHANGE",
          targetTable: "role_permissions",
          targetId: role,
          notes: changed || "No changes from default",
          oldValues: null,
          newValues: Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, permissions[k]])),
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[saveRolePermissionsAction] FAILED:", err);
    return { error: err instanceof Error ? err.message : "Failed to save permissions." };
  }
}

export async function fetchRolePermissionsAction(): Promise<RolePermissions> {
  if (!process.env.DATABASE_URL) return DEFAULT_ROLE_PERMISSIONS;

  try {
    const rows = await withDb((ds) =>
      ds.query(
        `SELECT role, "permissionKey", granted FROM role_permissions`
      )
    ) as Array<{ role: string; permissionKey: string; granted: boolean }>;

    if (rows.length === 0) return DEFAULT_ROLE_PERMISSIONS;

    const result: RolePermissions = {} as RolePermissions;
    for (const role of [UserRole.FOUNDER, UserRole.RECRUITER, UserRole.ADMIN, UserRole.HIRING_MANAGER]) {
      const roleRows = rows.filter((p) => p.role === role);
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
