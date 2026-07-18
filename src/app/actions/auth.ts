"use server";

import { redirect } from "next/navigation";
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
  
  try {
    const { readDb } = await import("@/db/local-db");
    const db = readDb();
    const dbUser = db.users.find((u) => u.email === email) || null;

    if (dbUser) {
      if (dbUser.passwordHash !== password) {
        return { error: "Invalid email or password." };
      }
      if (dbUser.isActive === false) {
        return { error: "Your account has been deactivated. Contact the Founder." };
      }
      await createSession(dbUser as any);
      shouldRedirect = true;
    } else {
      return { error: "Invalid email or password." };
    }
  } catch (err: any) {
    console.error("[loginAction] local DB authentication error:", err);
    return { error: "Authentication service is temporarily unavailable. Please try again later." };
  }

  if (shouldRedirect) {
    redirect("/");
  }

  return { error: "Invalid email or password." };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
