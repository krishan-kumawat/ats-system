"use server";


import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { API_BASE_URL } from "@/lib/api";


export interface LoginState {
  error: string | null;
}


function mapProfileToRole(profileName: string): UserRole {
  const norm = (profileName || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (norm.includes("admin")) return UserRole.ADMIN;
  if (norm.includes("recruiter")) return UserRole.RECRUITER;
  if (norm.includes("hiring")) return UserRole.HIRING_MANAGER;
  if (norm.includes("readonly") || norm.includes("read")) return UserRole.READ_ONLY;
  return UserRole.READ_ONLY;
}


function decodeJwt(token: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token");
  }
  const payload = parts[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    Buffer.from(base64, "base64")
      .toString("utf8")
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
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
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });


    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = Array.isArray(errData.message)
        ? errData.message.join(", ")
        : (errData.message || "Invalid email or password.");
      return { error: message };

    }


    const { accessToken } = await response.json();
    const decoded = decodeJwt(accessToken);

    // Map decoded JWT payload to SessionPayload
    const payload = {
      id: decoded.sub,
      name: `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() || decoded.email,
      email: decoded.email,
      role: mapProfileToRole(decoded.profile),
      accessToken,
    };


    await createSession(payload);
    shouldRedirect = true;
  } catch (err: any) {
    console.error("[loginAction] backend authentication error:", err);
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



