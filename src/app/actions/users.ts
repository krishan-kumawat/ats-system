"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "@/db/local-db";
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

// ─── Fetch all users — active first, then inactive (Founder only) ─────────────

export async function fetchUsersAction(): Promise<UserRow[]> {
  const session = await getSession();
  if (!session || session.role !== UserRole.FOUNDER) return [];

  try {
    const db = readDb();

    // Sort by isActive DESC, then createdAt DESC
    const sorted = [...db.users].sort((a, b) => {
      const activeA = a.isActive !== false;
      const activeB = b.isActive !== false;
      if (activeA !== activeB) {
        return activeA ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive !== false,
      createdAt: u.createdAt instanceof Date
        ? u.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : String(u.createdAt),
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

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (!input.password || input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const db = readDb();

    const existing = db.users.find(
      (u) => u.email.trim().toLowerCase() === input.email.trim().toLowerCase()
    );
    if (existing) throw new Error("A user with this email already exists.");

    const id = uuidv4();
    const newUser = {
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash: input.password,
      isActive: true,
      createdAt: new Date(),
    };

    db.users.push(newUser);

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "USER_CREATED",
      targetTable: "users",
      targetId: newUser.id,
      notes: `User "${newUser.name}" (${newUser.email}) created with role ${newUser.role}.`,
      oldValues: null,
      newValues: { name: newUser.name, email: newUser.email, role: newUser.role },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: true,
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

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.email.trim()) return { error: "Email is required." };
  if (input.password && input.password.length < 6)
    return { error: "Password must be at least 6 characters." };

  try {
    const db = readDb();

    const user = db.users.find((u) => u.id === input.id);
    if (!user) throw new Error("User not found.");

    // Check email uniqueness (excluding self)
    const emailConflict = db.users.some(
      (u) => u.email.trim().toLowerCase() === input.email.trim().toLowerCase() && u.id !== input.id
    );
    if (emailConflict) throw new Error("Another user with this email already exists.");

    const oldValues = { name: user.name, email: user.email, role: user.role };

    user.name = input.name.trim();
    user.email = input.email.trim().toLowerCase();
    user.role = input.role;
    if (input.password) {
      user.passwordHash = input.password;
    }

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: "USER_UPDATED",
      targetTable: "users",
      targetId: input.id,
      notes: `User "${input.name}" updated by Founder.`,
      oldValues,
      newValues: { name: input.name, email: input.email, role: input.role },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive !== false,
        createdAt: user.createdAt instanceof Date
          ? user.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          : String(user.createdAt),
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

  try {
    const db = readDb();

    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found.");

    const oldIsActive = user.isActive !== false;
    user.isActive = isActive;

    const nextLogId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    db.auditLogs.push({
      id: nextLogId,
      userId: session.id,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      targetTable: "users",
      targetId: userId,
      notes: `User "${user.name}" ${isActive ? "activated" : "deactivated"} by Founder.`,
      oldValues: { isActive: oldIsActive },
      newValues: { isActive },
      timestamp: new Date(),
    });

    writeDb(db);

    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[toggleUserActiveAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to update user status." };
  }
}
