import { desc } from "drizzle-orm";

import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import { normalizeAdminQueryLimit } from "../admin/adminQueryConventions";

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
  "apikey",
  "api_key",
  "authorization",
  "cookie",
]);

const redactionPatterns = [
  /\bsk-or-v1-[a-zA-Z0-9]{8,}\b/g,
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /Bearer\s+[a-zA-Z0-9\-_.=]{8,}/gi,
  /\beyJ[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\.[a-zA-Z0-9_-]+=*\b/g,
] as const;

const redactString = (value: string) => {
  let output = value;
  for (const pattern of redactionPatterns) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
};

const sanitizeUnknown = (value: unknown): unknown => {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeUnknown(entry));
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const entries: Array<[string, unknown]> = [];
  for (const [key, entry] of Object.entries(source)) {
    if (redactedKeys.has(key.toLowerCase())) continue;
    entries.push([key, sanitizeUnknown(entry)]);
  }
  return Object.fromEntries(entries);
};

export function sanitizeMetadata(meta: Record<string, unknown>) {
  return sanitizeUnknown(meta) as Record<string, unknown>;
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
  const normalizedLimit = normalizeAdminQueryLimit(limit, {
    defaultLimit: 50,
    maxLimit: 200,
  });

  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(normalizedLimit);
}
