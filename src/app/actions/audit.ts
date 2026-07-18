"use server";

import { readDb, writeDb } from "@/db/local-db";
import { getSession } from "@/lib/auth";
import { AuditEntry } from "@/lib/atsStore";

export interface WriteAuditInput {
  action: string;
  targetTable: string;
  targetId: string;
  notes?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function writeAuditAction(input: WriteAuditInput): Promise<void> {
  const session = await getSession();
  if (!session) return;

  try {
    const db = readDb();
    const nextId = db.auditLogs.length > 0
      ? Math.max(...db.auditLogs.map((l) => l.id || 0)) + 1
      : 1;

    const newLog = {
      id: nextId,
      userId: session.id,
      action: input.action,
      targetTable: input.targetTable,
      targetId: input.targetId,
      notes: input.notes ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      timestamp: new Date(),
    };

    db.auditLogs.push(newLog);
    writeDb(db);
  } catch (err) {
    console.error("[writeAuditAction]", err);
  }
}

export async function fetchAuditLogsAction(): Promise<AuditEntry[]> {
  try {
    const db = readDb();
    // Sort logs ascending by timestamp and take up to 200 entries
    const logs = [...db.auditLogs]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, 200);

    return logs.map((l) => ({
      timestamp: l.timestamp instanceof Date
        ? l.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : String(l.timestamp),
      user: l.userId,
      action: l.action,
      target: l.targetId,
      notes: l.notes ?? "",
    }));
  } catch (err) {
    console.error("[fetchAuditLogsAction]", err);
    return [];
  }
}
