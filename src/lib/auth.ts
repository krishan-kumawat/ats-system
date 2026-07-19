import { cookies } from "next/headers";
import { SESSION_COOKIE, SessionPayload, AuthUser } from "@/lib/auth-config";
import { UserRole } from "@/lib/enums";

export type { AuthUser, SessionPayload };
export { SESSION_COOKIE, USERS } from "@/lib/auth-config";

export async function createSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as SessionPayload;
    if (payload && payload.role) {
      const r = String(payload.role).toUpperCase();
      if (r === "FOUNDER" || r === "ADMIN") {
        payload.role = UserRole.ADMIN;
      } else if (r === "HEAD_OF_HR") {
        payload.role = UserRole.RECRUITER;
      } else if (r === "RECRUITER") {
        payload.role = UserRole.RECRUITER;
      } else if (r.includes("HIRING")) {
        payload.role = UserRole.HIRING_MANAGER;
      } else if (r.includes("READ")) {
        payload.role = UserRole.READ_ONLY;
      } else {
        payload.role = UserRole.READ_ONLY;
      }
    }
    return payload;
  } catch {
    return null;
  }
}
