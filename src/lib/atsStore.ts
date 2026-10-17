"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "recruiter" | "founder";
export type Tab = "pipeline" | "analytics" | "audit" | "jobs" | "permissions" | "applicants" | "assignments" | "users";
export type JobStatus = "OPEN" | "DRAFT" | "ON_HOLD" | "CLOSED";

export type WorkMode = "On-site" | "Remote" | "Hybrid";

export interface Job {
  id: string;
  title: string;
  description?: string;
  department: string;
  departmentId?: string;
  hiringManager: string;
  ownerId?: string;
  status: JobStatus;
  budgetLimit: number;
  workMode?: WorkMode | string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  createdAt: string;
}
export type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type Recommendation =
  | ""
  | "STRONG_HIRE"
  | "HIRE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";

export type PipelineStage =
  | "Applied"
  | "Screening"
  | "Interviewing"
  | "Offer";

export interface Scorecard {
  technicalScore: number;
  systemScore: number;
  cultureScore: number;
  pros: string;
  cons: string;
  recommendation: Recommendation;
}

export interface FounderApproval {
  status: ApprovalStatus;
  feedback: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  stage: PipelineStage;
  sourceTag: string;
  skills: string[];
  expectedSalary: number;
  proposedSalary: number;
  proposedEquity: number;
  scorecard: Scorecard;
  founderApproval: FounderApproval;
  jobId?: string;
  firstName?: string;
  lastName?: string;
  currentLocation?: string;
  totalExperience?: number;
  currentCompany?: string;
  currentDesignation?: string;
  linkedinUrl?: string;
  source?: string;
  candidateStatus?: string;
  resumeUrl?: string;
}

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  target: string;
  notes: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

export const INITIAL_JOBS: Job[] = [
  {
    id: "job-eng-104",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    hiringManager: "Rohan Verma",
    status: "OPEN",
    budgetLimit: 160000,
    createdAt: "2026-06-20",
  },
  {
    id: "job-eng-105",
    title: "Lead Data Scientist",
    department: "Engineering",
    hiringManager: "Neha Kapoor",
    status: "OPEN",
    budgetLimit: 180000,
    createdAt: "2026-06-22",
  },
  {
    id: "job-prd-201",
    title: "Principal Product Manager",
    department: "Product",
    hiringManager: "Arjun Mehta",
    status: "OPEN",
    budgetLimit: 175000,
    createdAt: "2026-06-25",
  },
];

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: "cnd-8921",
    name: "Alice Chen",
    email: "alice.chen@techmail.io",
    phone: "+1 555-0142",
    role: "Senior Frontend Engineer",
    department: "Engineering",
    stage: "Applied",
    sourceTag: "Manual PDF Upload",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Jest"],
    expectedSalary: 145000,
    proposedSalary: 0,
    proposedEquity: 0,
    jobId: "job-eng-104",
    scorecard: {
      technicalScore: 0,
      systemScore: 0,
      cultureScore: 0,
      pros: "",
      cons: "",
      recommendation: "",
    },
    founderApproval: { status: "NONE", feedback: "" },
  },
  {
    id: "cnd-4819",
    name: "Bob Smith",
    email: "bob.smith@datascience.net",
    phone: "+1 555-0189",
    role: "Lead Data Scientist",
    department: "Engineering",
    stage: "Screening",
    sourceTag: "Referral",
    skills: ["Python", "PyTorch", "SQL", "Pandas", "Scikit-Learn"],
    expectedSalary: 165000,
    proposedSalary: 0,
    proposedEquity: 0,
    jobId: "job-eng-105",
    scorecard: {
      technicalScore: 4,
      systemScore: 3,
      cultureScore: 5,
      pros: "Excellent research background.",
      cons: "Needs tooling adjustment.",
      recommendation: "HIRE",
    },
    founderApproval: { status: "NONE", feedback: "" },
  },
  {
    id: "cnd-2041",
    name: "Clara Rodriguez",
    email: "clara.rod@productco.org",
    phone: "+1 555-0199",
    role: "Principal Product Manager",
    department: "Product",
    stage: "Interviewing",
    sourceTag: "Manual PDF Ingest",
    skills: ["Product Strategy", "SQL", "Agile Roadmap", "A/B Testing", "Figma"],
    expectedSalary: 160000,
    proposedSalary: 160000,
    proposedEquity: 0.15,
    jobId: "job-prd-201",
    scorecard: {
      technicalScore: 5,
      systemScore: 4,
      cultureScore: 5,
      pros: "Exceptional startup scaling background.",
      cons: "Needs steering on infra constraints.",
      recommendation: "STRONG_HIRE",
    },
    founderApproval: { status: "PENDING", feedback: "" },
  },
];

export const INITIAL_AUDIT_LOGS: AuditEntry[] = [
  {
    timestamp: "10:24 AM",
    user: "HRRecruiter_01",
    action: "CREATED_JOB",
    target: "ENG-104 (Senior Frontend Engineer)",
    notes: "Initialized folder structures inside Company_ATS_Storage/.",
  },
  {
    timestamp: "10:28 AM",
    user: "HRRecruiter_01",
    action: "INGESTED_PROFILE",
    target: "Alice Chen",
    notes:
      "Manual resume PDF streamed to Google Drive. Skills parser complete.",
  },
  {
    timestamp: "11:02 AM",
    user: "HRRecruiter_01",
    action: "STAGE_TRANSITION",
    target: "Clara Rodriguez",
    notes:
      "Moved stage: Interviewing -> Offer Prep. Secure gate triggered.",
  },
];

export const PIPELINE_STAGES: PipelineStage[] = [
  "Applied",
  "Screening",
  "Interviewing",
  "Offer",
];

export const SKILLS_LEXICON: Record<string, string[]> = {
  "Senior Staff Platform Engineer": [
    "Kubernetes",
    "AWS",
    "Go",
    "Docker",
    "Terraform",
    "CI/CD Platforms",
    "Bash",
  ],
  "Principal Product Manager": [
    "Product Strategy",
    "SQL",
    "Figma",
    "User Empathy Metrics",
    "Agile Execution",
  ],
  "Senior Frontend Engineer": [
    "React",
    "TypeScript",
    "Next.js",
    "Tailwind CSS",
    "Jest",
    "State Managers",
  ],
  "Lead Data Scientist": [
    "Python",
    "PyTorch",
    "Pandas",
    "Scikit-Learn",
    "SQL",
    "Deep Learning",
  ],
};
