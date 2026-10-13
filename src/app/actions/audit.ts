"use server";


import { getSession } from "@/lib/auth";
import { AuditEntry } from "@/lib/atsStore";
import { API_BASE_URL } from "@/lib/api";


export interface WriteAuditInput {
  action: string;
  resource: string;
  targetId: string;
  notes?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}


export async function writeAuditAction(input: WriteAuditInput): Promise<void> {
  // Client-side direct logging is no-op as all auditing actions are done
  // automatically by backend services when processing resource requests.
  return;
}


export async function fetchAuditLogsAction(): Promise<AuditEntry[]> {
  const session = await getSession();
  if (!session || !session.accessToken) return [];


  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/audit-logs`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });


    if (!response.ok) return [];


    const backendAuditLogs = await response.json();


    return backendAuditLogs.map((l: any) => ({
      timestamp: l.createdAt
        ? new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      user: l.user ? `${l.user.firstName} ${l.user.lastName}` : "System",
      action: l.action,
      target: l.resourceId ?? "",
      notes: l.payload?.notes || l.action,
    }));
  } catch (err) {
    console.error("[fetchAuditLogsAction]", err);
    return [];
  }
}



