export enum UserRole {
  ADMIN = "Admin",
  RECRUITER = "Recruiter",
  HIRING_MANAGER = "Hiring Manager",
  READ_ONLY = "Read Only",
}

export enum JobStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  ON_HOLD = "ON_HOLD",
  CLOSED = "CLOSED",
}

export enum ApplicationStage {
  APPLIED = "APPLIED",
  SCREENING = "SCREENING",
  INTERVIEWING = "INTERVIEWING",
  OFFER_PREP = "OFFER_PREP",
  OFFER_APPROVED = "OFFER_APPROVED",
  HIRED = "HIRED",
  ARCHIVED = "ARCHIVED",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum Recommendation {
  STRONG_HIRE = "STRONG_HIRE",
  HIRE = "HIRE",
  NO_HIRE = "NO_HIRE",
  STRONG_NO_HIRE = "STRONG_NO_HIRE",
}
