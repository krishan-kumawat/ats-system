"use server";


import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { Candidate } from "@/lib/atsStore";
import { API_BASE_URL } from "@/lib/api";


// ─── Save scorecard ───────────────────────────────────────────────────────────


export interface SaveScorecardInput {
  applicationId: string;
  technicalScore: number;
  systemScore: number;
  cultureScore: number;
  pros: string;
  cons: string;
  recommendation: string;
}


export async function saveScorecardAction(input: SaveScorecardInput): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };


  try {
    const [candidateId, jobId] = input.applicationId.split("::");
    if (!candidateId || !jobId) throw new Error("Invalid application structure.");


    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // Update candidate job scorecard fields
    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        technicalScore: input.technicalScore,
        systemScore: input.systemScore,
        cultureScore: input.cultureScore,
        pros: input.pros || "",
        cons: input.cons || "",
        recommendation: input.recommendation,
      }),
    });


    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Backend error: ${res.status} ${errText}`);
    }


    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[saveScorecardAction]", err);
    return { error: "Failed to save scorecard." };
  }
}


// ─── Approve offer ────────────────────────────────────────────────────────────


export async function approveOfferAction(applicationId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };


  try {
    const [candidateId, jobId] = applicationId.split("::");
    if (!candidateId || !jobId) throw new Error("Invalid application structure.");


    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // Approve offer and transition stage to offered
    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        approvalStatus: "APPROVED",
        status: "Offered",
      }),
    });


    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Backend error: ${res.status} ${errText}`);
    }


    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[approveOfferAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to approve offer." };
  }
}


// ─── Reject offer ─────────────────────────────────────────────────────────────


export async function rejectOfferAction(
  applicationId: string,
  feedback?: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };


  try {
    const [candidateId, jobId] = applicationId.split("::");
    if (!candidateId || !jobId) throw new Error("Invalid application structure.");


    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // Reject offer and revert status back to interviewing
    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        approvalStatus: "REJECTED",
        approvalFeedback: feedback || "Returned by founder.",
        status: "Interviewing",
      }),
    });


    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Backend error: ${res.status} ${errText}`);
    }


    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[rejectOfferAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to reject offer." };
  }
}


// ─── Move pipeline stage ──────────────────────────────────────────────────────


export async function movePipelineAction(
  applicationId: string,
  targetStage: Candidate["stage"],
  proposedSalary?: number,
  proposedEquity?: number
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { error: "Unauthorized" };


  try {
    const [candidateId, jobId] = applicationId.split("::");
    if (!candidateId || !jobId) throw new Error("Invalid application structure.");


    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    const statusMap: Record<Candidate["stage"], string> = {
      Applied: "Applied",
      Screening: "Screening",
      Interviewing: "Interviewing",
      Offer: "Offered",
    };


    const updatePayload: any = {
      status: statusMap[targetStage],
    };


    if (proposedSalary !== undefined) {
      updatePayload.proposedSalary = Number(proposedSalary);
    }
    if (proposedEquity !== undefined) {
      updatePayload.proposedEquity = Number(proposedEquity);
    }
    if (targetStage === "Offer") {
      updatePayload.approvalStatus = "PENDING";
    }


    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/jobs/${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updatePayload),
    });


    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Backend error: ${res.status} ${errText}`);
    }


    revalidatePath("/");
    return {};
  } catch (err) {
    console.error("[movePipelineAction]", err);
    return { error: err instanceof Error ? err.message : "Failed to move stage." };
  }
}


// ─── Ingest candidate ─────────────────────────────────────────────────────────


export interface IngestCandidateInput {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  totalExperience?: number;
  currentCompany?: string;
  currentDesignation?: string;
  linkedinUrl?: string;
  source?: string;
  candidateStatus?: string;
  jobId: string;
  name?: string;
  role?: string;
  department?: string;
  skills?: string[];
  expectedSalary?: number;
  sourceTag?: string;
}

export interface JobOption {
  id: string;
  title: string;
  department?: string;
  status?: string;
}

export async function fetchJobsListAction(): Promise<JobOption[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.jobs || data.data || [];
    return list.map((j: any) => ({
      id: j.id,
      title: j.title || "Untitled Job",
      department: typeof j.department === "object" ? j.department?.name : j.department || "",
      status: j.status || "OPEN",
    }));
  } catch {
    return [];
  }
}

export async function ingestCandidateAction(
  input: IngestCandidateInput | FormData
): Promise<{ applicationId: string; candidateId?: string; candidate?: any; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { applicationId: "", error: "Unauthorized" };

  try {
    const isFormData = typeof FormData !== "undefined" && input instanceof FormData;
    let res: Response;
    let targetJobId = "";

    if (isFormData) {
      targetJobId = (input.get("jobId") as string)?.trim() || "";
      res = await fetch(`${API_BASE_URL}/api/v1/candidates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: input,
      });
    } else {
      const headers = {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      };

      // 1. Resolve first name and last name
      let firstName = input.firstName?.trim();
      let lastName = input.lastName?.trim();
      if (!firstName && input.name) {
        const parts = input.name.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "Candidate";
      }

      targetJobId = input.jobId?.trim() || "";
      const candidatePayload: Record<string, any> = {
        firstName: firstName || "",
        lastName: lastName || "",
        email: input.email.toLowerCase().trim(),
        jobId: targetJobId,
      };

      if (input.phone?.trim()) candidatePayload.phone = input.phone.trim();
      if (input.currentLocation?.trim()) candidatePayload.currentLocation = input.currentLocation.trim();
      if (input.totalExperience !== undefined && !isNaN(Number(input.totalExperience))) {
        candidatePayload.totalExperience = Number(input.totalExperience);
      }
      if (input.currentCompany?.trim()) candidatePayload.currentCompany = input.currentCompany.trim();
      if (input.currentDesignation?.trim()) candidatePayload.currentDesignation = input.currentDesignation.trim();
      if (input.linkedinUrl?.trim()) candidatePayload.linkedinUrl = input.linkedinUrl.trim();
      if (input.source?.trim()) candidatePayload.source = input.source.trim();
      if (input.candidateStatus?.trim()) candidatePayload.candidateStatus = input.candidateStatus.trim();
      if (Array.isArray(input.skills) && input.skills.length > 0) {
        candidatePayload.skills = input.skills;
      }

      // 2. Create Candidate profile with jobId in payload (backend handles job linking)
      res = await fetch(`${API_BASE_URL}/api/v1/candidates`, {
        method: "POST",
        headers,
        body: JSON.stringify(candidatePayload),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = Array.isArray(errData.message)
        ? errData.message.join(", ")
        : errData.message || `Failed to create candidate profile on backend (${res.status}).`;
      return { applicationId: "", error: msg };
    }

    const candidate = await res.json();

    revalidatePath("/");
    revalidatePath("/candidates");
    revalidatePath("/[objectApiName]");
    return {
      applicationId: targetJobId ? `${candidate.id}::${targetJobId}` : candidate.id,
      candidateId: candidate.id,
      candidate,
    };
  } catch (err: any) {
    console.error("[ingestCandidateAction]", err);
    return { applicationId: "", error: err.message || "Failed to ingest candidate." };
  }
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentLocation?: string;
  totalExperience?: number;
  currentCompany?: string;
  currentDesignation?: string;
  linkedinUrl?: string;
  source?: string;
  candidateStatus?: string;
  resumeUrl?: string;
  skills?: string[];
}

export async function updateCandidateAction(
  candidateId: string,
  input: UpdateCandidateInput
): Promise<{ success: boolean; candidate?: any; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };

    const updatePayload: Record<string, any> = {};
    if (input.firstName !== undefined) updatePayload.firstName = input.firstName.trim();
    if (input.lastName !== undefined) updatePayload.lastName = input.lastName.trim();
    if (input.email !== undefined) updatePayload.email = input.email.toLowerCase().trim();
    if (input.phone !== undefined) updatePayload.phone = input.phone.trim();
    if (input.currentLocation !== undefined) updatePayload.currentLocation = input.currentLocation.trim();
    if (input.totalExperience !== undefined && !isNaN(Number(input.totalExperience))) {
      updatePayload.totalExperience = Number(input.totalExperience);
    }
    if (input.currentCompany !== undefined) updatePayload.currentCompany = input.currentCompany.trim();
    if (input.currentDesignation !== undefined) updatePayload.currentDesignation = input.currentDesignation.trim();
    if (input.linkedinUrl !== undefined) updatePayload.linkedinUrl = input.linkedinUrl.trim();
    if (input.resumeUrl !== undefined) updatePayload.resumeUrl = input.resumeUrl.trim();
    if (input.source !== undefined) updatePayload.source = input.source.trim();
    if (input.candidateStatus !== undefined) updatePayload.candidateStatus = input.candidateStatus.trim();
    if (Array.isArray(input.skills)) updatePayload.skills = input.skills;

    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = Array.isArray(errData.message)
        ? errData.message.join(", ")
        : errData.message || "Failed to update candidate profile.";
      return { success: false, error: msg };
    }

    const candidate = await res.json();
    revalidatePath("/");
    revalidatePath("/[objectApiName]");
    return { success: true, candidate };
  } catch (err) {
    console.error("[updateCandidateAction]", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update candidate." };
  }
}

export async function deleteCandidateAction(
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { success: false, error: "Unauthorized" };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = Array.isArray(errData.message)
        ? errData.message.join(", ")
        : errData.message || "Failed to delete candidate.";
      return { success: false, error: msg };
    }

    revalidatePath("/");
    revalidatePath("/[objectApiName]");
    return { success: true };
  } catch (err) {
    console.error("[deleteCandidateAction]", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete candidate." };
  }
}





