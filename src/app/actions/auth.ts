"use server";

import { redirect } from "next/navigation";
import { USERS } from "@/lib/auth-config";
import { createSession, destroySession } from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let shouldRedirect = false;
  // ── Try DB auth if DATABASE_URL is set ─────────────────────────────────────
  if (process.env.DATABASE_URL) {
    try {
      const { withDb } = await import("@/db/data-source");
      const dbUser = await withDb((ds) =>
        ds.getRepository("User").findOne({ where: { email } })
      ) as { id: string; name: string; email: string; role: string; passwordHash: string; isActive: boolean } | null;

      if (dbUser) {
        if (dbUser.passwordHash !== password) {
          return { error: "Invalid email or password." };
        }
        if (dbUser.isActive === false) {
          return { error: "Your account has been deactivated. Contact the Founder." };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await createSession(dbUser as any);
        shouldRedirect = true;
      }
      // Fall through to static list if user not in DB
    } catch (err) {
      console.error("[loginAction] DB error, falling back to static users:", err);
    }
  }

  if (shouldRedirect) {
    redirect("/");
  }

  // ── Fallback: static USERS list ────────────────────────────────────────────
  const user = USERS.find(
    (u) => u.email.toLowerCase() === email && u.password === password
  );

  if (!user) {
    return { error: "Invalid email or password." };
  }

  await createSession(user);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
