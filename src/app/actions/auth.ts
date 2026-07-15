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
    } else {
      return { error: "Invalid email or password." };
    }
  } catch (err: any) {
    console.error("[loginAction] DB authentication error:", err);
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
