"use server";

import { withDb } from "@/db/data-source";
import { IAuditLog } from "@/db/schemas";
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
  if (!session || !process.env.DATABASE_URL) return;

  try {
    await withDb(async (ds) => {
      const auditRepo = ds.getRepository<IAuditLog>("AuditLog");
      await auditRepo.save(
        auditRepo.create({
          userId: session.id,
          action: input.action,
          targetTable: input.targetTable,
          targetId: input.targetId,
          notes: input.notes ?? null,
          oldValues: input.oldValues ?? null,
          newValues: input.newValues ?? null,
        })
      );
    });
  } catch (err) {
    console.error("[writeAuditAction]", err);
  }
}

export async function fetchAuditLogsAction(): Promise<AuditEntry[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const logs = await withDb((ds) =>
      ds.getRepository<IAuditLog>("AuditLog").find({
        order: { timestamp: "ASC" },
        take: 200,
      })
    );

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
