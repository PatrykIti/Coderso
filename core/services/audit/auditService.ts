import { desc } from "drizzle-orm";

import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";

export type AuditEvent = {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export type AuditRecord = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

const redactedKeys = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

export function sanitizeMetadata(meta: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(meta).filter(
      ([key]) => !redactedKeys.has(key.toLowerCase())
    )
  );
}

export async function logAudit(event: AuditEvent) {
  const metadata = sanitizeMetadata({
    ...(event.metadata ?? {}),
    ...(event.ip ? { ip: event.ip } : {}),
    ...(event.userAgent ? { userAgent: event.userAgent } : {}),
  });

  const [row] = await db
    .insert(auditLogs)
    .values({
      actorId: event.actorId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata,
    })
    .returning();

  return row as AuditRecord;
}

export async function listAudit(limit = 50) {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
