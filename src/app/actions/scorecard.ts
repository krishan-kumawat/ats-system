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
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  skills: string[];
  expectedSalary: number;
  jobId?: string;
  sourceTag?: string;
}


export async function ingestCandidateAction(
  input: IngestCandidateInput
): Promise<{ applicationId: string; error?: string }> {
  const session = await getSession();
  if (!session || !session.accessToken) return { applicationId: "", error: "Unauthorized" };


  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    };


    // 1. Split name into first and last name
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "Candidate";


    // 2. Create Candidate profile
    const createCandRes = await fetch(`${API_BASE_URL}/api/v1/candidates`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstName,
        lastName,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || undefined,
        skills: input.skills || [],
      }),
    });


    if (!createCandRes.ok) {
      const errData = await createCandRes.json().catch(() => ({}));
      return { applicationId: "", error: errData.message || "Failed to create candidate profile on backend." };
    }


    const candidate = await createCandRes.json();
    const targetJobId = input.jobId || "unassigned";


    // 3. Link candidate to job
    const linkRes = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidate.id}/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobId: targetJobId,
        status: "Applied",
      }),
    });


    if (!linkRes.ok) {
      const errData = await linkRes.json().catch(() => ({}));
      return { applicationId: "", error: errData.message || "Failed to link candidate to job." };
    }


    // 4. Update expectedSalary and sourceTag on the linked CandidateJob record
    await fetch(`${API_BASE_URL}/api/v1/candidates/${candidate.id}/jobs/${targetJobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        expectedSalary: Number(input.expectedSalary) || 0,
        sourceTag: input.sourceTag || "Manual PDF Upload",
      }),
    });


    revalidatePath("/");
    return { applicationId: `${candidate.id}::${targetJobId}` };
  } catch (err) {
    console.error("[ingestCandidateAction]", err);
    return { applicationId: "", error: "Failed to ingest candidate." };
  }
}



