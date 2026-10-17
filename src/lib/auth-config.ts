import { UserRole } from "@/lib/enums";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface SessionPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accessToken?: string;
}

export const SESSION_COOKIE = "ats_session";

export const USERS: AuthUser[] = [];
