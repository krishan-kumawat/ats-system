"use server";

import { getSession } from "@/lib/auth";
import { UserRole } from "@/lib/enums";

export async function fetchOwdAction() {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return { unauthorized: true };
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/sharing/owd", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { error: `Failed to fetch OWD settings. Backend status: ${res.status}` };
    }

    const data = await res.json();
    return { owds: data };
  } catch (err: any) {
    console.error("[fetchOwdAction] error:", err);
    return { error: err.message || "Network error fetching OWD settings." };
  }
}

export async function updateOwdAction(dto: {
  schemaObjectId: string;
  defaultAccessLevel: "PRIVATE" | "READ_ONLY" | "READ_WRITE";
  grantAccessUsingHierarchies?: boolean;
}) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return { unauthorized: true };
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/sharing/owd", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `Failed to update OWD settings: ${text || res.statusText}` };
    }

    const data = await res.json();
    return { success: true, owd: data };
  } catch (err: any) {
    console.error("[updateOwdAction] error:", err);
    return { error: err.message || "Network error updating OWD settings." };
  }
}
