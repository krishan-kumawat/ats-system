"use server";

import { getSession } from "@/lib/auth";

export async function fetchRecordAccessAction(recordId: string, objectType: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const res = await fetch(`http://localhost:3000/api/v1/sharing/record-access?recordId=${recordId}&objectType=${objectType}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load record access rights.");
  return res.json();
}

export async function fetchCollaboratorsAction(recordId: string, objectType: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const res = await fetch(`http://localhost:3000/api/v1/sharing/collaborators?recordId=${recordId}&objectType=${objectType}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load collaborators.");
  return res.json();
}

export async function addManualShareAction(
  recordId: string,
  objectType: string,
  targetUserId: string,
  accessLevel: "READ" | "EDIT"
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const res = await fetch(`http://localhost:3000/api/v1/sharing/share`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recordId, objectType, targetUserId, accessLevel }),
  });
  if (!res.ok) {
    let msg = "Failed to share record.";
    try {
      const errJson = await res.json();
      msg = errJson.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function removeManualShareAction(recordId: string, objectType: string, targetUserId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const res = await fetch(`http://localhost:3000/api/v1/sharing/share?recordId=${recordId}&objectType=${objectType}&targetUserId=${targetUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to revoke share.");
  return { success: true };
}

export async function fetchOwdAction() {
  const session = await getSession();
  if (!session) return { unauthorized: true };

  try {
    const res = await fetch("http://localhost:3000/api/v1/sharing/owd", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return { unauthorized: true };
      return { error: "Failed to fetch OWD settings" };
    }
    const data = await res.json();
    return { owds: data };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch OWD settings" };
  }
}

export async function updateOwdAction(input: {
  schemaObjectId: string;
  defaultAccessLevel: "PRIVATE" | "READ_ONLY" | "READ_WRITE";
  grantAccessUsingHierarchies: boolean;
}) {
  const session = await getSession();
  if (!session) return { unauthorized: true };

  try {
    const res = await fetch("http://localhost:3000/api/v1/sharing/owd", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        const text = await res.text();
        return { error: text || "Unauthorized or Forbidden" };
      }
      return { error: "Failed to update OWD settings" };
    }
    const data = await res.json();
    return { data };
  } catch (err: any) {
    return { error: err.message || "Failed to update OWD settings" };
  }
}
