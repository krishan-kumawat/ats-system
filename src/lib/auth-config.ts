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
}

export const SESSION_COOKIE = "ats_session";

export const USERS: AuthUser[] = [
  // ── Founder (all permissions, immutable) ──────────────────────────────
  {
    id: "usr-0001",
    name: "Arjun Mehta",
    email: "founder@orgats.com",
    password: "Founder@123",
    role: UserRole.FOUNDER,
  },

  // ── Recruiters (can ingest + pipeline; canAddJob ON by default) ───────
  {
    id: "usr-0002",
    name: "Priya Sharma",
    email: "recruiter@orgats.com",
    password: "Recruiter@123",
    role: UserRole.RECRUITER,
  },
  {
    id: "usr-0005",
    name: "Kiran Desai",
    email: "recruiter2@orgats.com",
    password: "Recruiter2@123",
    role: UserRole.RECRUITER,
  },

  // ── Admins (broad access but no offer approval) ───────────────────────
  {
    id: "usr-0003",
    name: "Rohan Verma",
    email: "admin@orgats.com",
    password: "Admin@123",
    role: UserRole.ADMIN,
  },
  {
    id: "usr-0006",
    name: "Samira Bose",
    email: "admin2@orgats.com",
    password: "Admin2@123",
    role: UserRole.ADMIN,
  },

  // ── Hiring Managers (scorecard only; no pipeline move / no job create) ─
  {
    id: "usr-0004",
    name: "Neha Kapoor",
    email: "hiring@orgats.com",
    password: "Hiring@123",
    role: UserRole.HIRING_MANAGER,
  },
  {
    id: "usr-0007",
    name: "Dev Anand",
    email: "hiring2@orgats.com",
    password: "Hiring2@123",
    role: UserRole.HIRING_MANAGER,
  },

  // ── Head of HR (can assign jobs to subordinates) ──────────────────────
  {
    id: "usr-0008",
    name: "Meera Iyer",
    email: "headofhr@orgats.com",
    password: "HeadHR@123",
    role: UserRole.HEAD_OF_HR,
  },
];
