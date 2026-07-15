"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { withDb } from "@/db/data-source";
import { IUser, IAuditLog } from "@/db/schemas";
import { UserRole } from "@/lib/enums";
import { getSession } from "@/lib/auth";

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
  role: UserRole;
}

export interface UpdateUserInput {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // only set if changing
}

// Ensure the isActive column exists (idempotent — safe to call every time)
async function ensureIsActiveColumn(ds: import("typeorm").DataSource) {
  await ds.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE
  `);
}

// ─── Fetch all users — active first, then inactive (Founder only) ─────────────

export async function fetchUsersAction(): Promise<UserRow[]> {
  const session = await getSession();
  if (!session || session.role !== UserRole.FOUNDER) return [];
  if (!process.env.DATABASE_URL) return [];

  try {
    const rows = await withDb(async (ds) => {
      await ensureIsActiveColumn(ds);
      return ds.query(
        `SELECT id, name, email, role, "isActive", "createdAt"
         FROM users
         ORDER BY "isActive" DESC, "createdAt" DESC`
      );
    }) as Array<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      isActive: boolean;
      createdAt: Date | string;
    }>;

    return rows.map((u) => ({
      id:       u.id,
      name:     u.name,
      email:    u.email,
      role:     u.role,
      isActive: u.isActive ?? true,
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : "",
    }));
  } catch (err) {
    console.error("[fetchUsersAction]", err);
    return [];
  }
}

// ─── Create user (Founder only) ───────────────────────────────────────────────

export async function createUserAction(
  input: CreateUserInput
): Promise<{ user?: UserRow; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.FOUNDER) return { error: "Only Founders can create users." };
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  if (!input.name.trim())  return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (!input.password || input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const created = await withDb(async (ds) => {
      await ensureIsActiveColumn(ds);

      const userRepo  = ds.getRepository<IUser>("User");
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");

      const existing = await userRepo.findOne({ where: { email: input.email.trim().toLowerCase() } });
      if (existing) throw new Error("A user with this email already exists.");

      const newUser = await userRepo.save(
        userRepo.create({
          id:           uuidv4(),
          name:         input.name.trim(),
          email:        input.email.trim().toLowerCase(),
          role:         input.role,
          passwordHash: input.password,
          isActive:     true,
        })
      );

      await auditRepo.save(
        auditRepo.create({
          userId:      session.id,
          action:      "USER_CREATED",
          targetTable: "users",
          targetId:    newUser.id,
          notes:       `User "${newUser.name}" (${newUser.email}) created with role ${newUser.role}.`,
          oldValues:   null,
          newValues:   { name: newUser.name, email: newUser.email, role: newUser.role },
        })
      );

      return newUser;
    });

    revalidatePath("/");

    return {
      user: {
        id:        created.id,
        name:      created.name,
        email:     created.email,
        role:      created.role,
        isActive:  true,
        createdAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      },
    };
  } catch (err) {
    console.error("[createUserAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to create user." };
  }
}

// ─── Update user details (Founder only) ──────────────────────────────────────

export async function updateUserAction(
  input: UpdateUserInput
): Promise<{ user?: UserRow; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.FOUNDER) return { error: "Only Founders can edit users." };
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  if (!input.name.trim())  return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (input.password && input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const updated = await withDb(async (ds) => {
      const userRepo  = ds.getRepository<IUser>("User");
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");

      const existing = await userRepo.findOne({ where: { id: input.id } });
      if (!existing) throw new Error("User not found.");

      // Check email uniqueness (excluding self)
      const emailConflict = await ds.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [input.email.trim().toLowerCase(), input.id]
      ) as Array<{ id: string }>;
      if (emailConflict.length > 0) throw new Error("Another user with this email already exists.");

      const oldValues = { name: existing.name, email: existing.email, role: existing.role };

      // Build update query
      if (input.password) {
        await ds.query(
          `UPDATE users SET name=$1, email=$2, role=$3, "passwordHash"=$4 WHERE id=$5`,
          [input.name.trim(), input.email.trim().toLowerCase(), input.role, input.password, input.id]
        );
      } else {
        await ds.query(
          `UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4`,
          [input.name.trim(), input.email.trim().toLowerCase(), input.role, input.id]
        );
      }

      await auditRepo.save(
        auditRepo.create({
          userId:      session.id,
          action:      "USER_UPDATED",
          targetTable: "users",
          targetId:    input.id,
          notes:       `User "${input.name}" updated by Founder.`,
          oldValues,
          newValues:   { name: input.name, email: input.email, role: input.role },
        })
      );

      // Fetch updated row
      const rows = await ds.query(
        `SELECT id, name, email, role, "isActive", "createdAt" FROM users WHERE id = $1`,
        [input.id]
      ) as Array<{ id: string; name: string; email: string; role: UserRole; isActive: boolean; createdAt: Date | string }>;
      return rows[0];
    });

    revalidatePath("/");

    return {
      user: {
        id:        updated.id,
        name:      updated.name,
        email:     updated.email,
        role:      updated.role,
        isActive:  updated.isActive ?? true,
        createdAt:
          updated.createdAt instanceof Date
            ? updated.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : updated.createdAt
            ? new Date(updated.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : "",
      },
    };
  } catch (err) {
    console.error("[updateUserAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to update user." };
  }
}

// ─── Toggle active/inactive (Founder only) ────────────────────────────────────

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (session.role !== UserRole.FOUNDER) return { error: "Only Founders can activate/deactivate users." };
  if (userId === session.id) return { error: "You cannot deactivate your own account." };
  if (!process.env.DATABASE_URL) return { error: "Database not configured." };

  try {
    await withDb(async (ds) => {
      await ensureIsActiveColumn(ds);
      await ds.query(`UPDATE users SET "isActive" = $1 WHERE id = $2`, [isActive, userId]);

      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      const target = await ds.query(`SELECT name FROM users WHERE id = $1`, [userId]) as Array<{ name: string }>;

      await auditRepo.save(
        auditRepo.create({
          userId:      session.id,
          action:      isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
          targetTable: "users",
          targetId:    userId,
          notes:       `User "${target[0]?.name ?? userId}" ${isActive ? "activated" : "deactivated"} by Founder.`,
          oldValues:   { isActive: !isActive },
          newValues:   { isActive },
        })
      );
    });

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[toggleUserActiveAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to update user status." };
  }
}
