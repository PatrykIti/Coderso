import { and, desc, eq, gte, ilike, inArray, lt, lte, not, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";
import {
  AdminQueryConventionError,
  decodeAdminCursor,
  encodeAdminCursor,
  normalizeAdminCursor,
  normalizeAdminDateRange,
  normalizeAdminIsoDateBoundary,
  normalizeAdminQueryLimit,
  normalizeAdminSearchQuery,
} from "../admin/adminQueryConventions";
import {
  contentAuditTargetTypes,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "./auditClassification";
import { sanitizeAuditMetadata } from "./auditRedaction";

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

export type AuditLogQueryInput = {
  limit?: string | number | null;
  query?: string | null;
  category?: string | null;
  severity?: string | null;
  from?: string | Date | null;
  to?: string | Date | null;
  cursor?: string | null;
};

export type NormalizedAuditLogQuery = {
  limit: number;
  query?: string;
  category?: AuditLogCategory;
  severity?: AuditLogSeverity;
  from?: Date;
  to?: Date;
  cursor?: string;
};

export type AuditListResult = {
  items: AuditRecord[];
  nextCursor: string | null;
};

const auditCategoryValues = ["authentication", "content", "system"] as const;
const auditSeverityValues = ["info", "warning", "error"] as const;
const auditCategories = new Set<AuditLogCategory>(auditCategoryValues);
const auditSeverities = new Set<AuditLogSeverity>(auditSeverityValues);

export function sanitizeMetadata(meta: Record<string, unknown>) {
  return sanitizeAuditMetadata(meta);
}

const normalizeAuditCategory = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (auditCategories.has(value as AuditLogCategory)) return value as AuditLogCategory;
  throw new AdminQueryConventionError(
    "admin_query_text_invalid",
    "Audit category is invalid.",
    "category"
  );
};

const normalizeAuditSeverity = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (auditSeverities.has(value as AuditLogSeverity)) return value as AuditLogSeverity;
  throw new AdminQueryConventionError(
    "admin_query_text_invalid",
    "Audit severity is invalid.",
    "severity"
  );
};

export function normalizeAuditLogQuery(input: AuditLogQueryInput = {}): NormalizedAuditLogQuery {
  const fromIso = normalizeAdminIsoDateBoundary(input.from, "start");
  const toIso = normalizeAdminIsoDateBoundary(input.to, "end");
  const { from, to } = normalizeAdminDateRange({ from: fromIso, to: toIso });
  const query = normalizeAdminSearchQuery(input.query);
  const category = normalizeAuditCategory(input.category);
  const severity = normalizeAuditSeverity(input.severity);
  const cursor = normalizeAdminCursor(input.cursor);
  if (cursor) decodeAdminCursor(cursor);

  return {
    limit: normalizeAdminQueryLimit(input.limit, {
      defaultLimit: 50,
      maxLimit: 200,
    }),
    ...(query ? { query } : {}),
    ...(category ? { category } : {}),
    ...(severity ? { severity } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(cursor ? { cursor } : {}),
  };
}

const loweredAction = () => sql<string>`lower(${auditLogs.action})`;
const loweredTargetType = () => sql<string>`lower(${auditLogs.targetType})`;

const authenticationCategoryCondition = () =>
  or(
    eq(loweredTargetType(), "session"),
    sql`${loweredAction()} LIKE ${"auth.%"}`,
    sql`${loweredAction()} LIKE ${"session.%"}`,
    sql`${loweredAction()} LIKE ${"sessions.%"}`
  );

const contentTargetTypeCondition = () => inArray(loweredTargetType(), [...contentAuditTargetTypes]);

const categoryCondition = (category: AuditLogCategory) => {
  const authentication = authenticationCategoryCondition() as SQL;
  const contentTarget = contentTargetTypeCondition();
  if (category === "authentication") return authentication;
  if (category === "content") return and(not(authentication), contentTarget);

  return and(not(authentication), not(contentTarget));
};

const metadataSeverity = () => sql<string>`coalesce(${auditLogs.metadata}->>'severity', '')`;
const knownMetadataSeverityCondition = () => inArray(metadataSeverity(), [...auditSeverityValues]);

const actionErrorCondition = () =>
  or(ilike(auditLogs.action, "%error%"), ilike(auditLogs.action, "%fail%"));

const actionWarningCondition = () =>
  or(ilike(auditLogs.action, "%warn%"), ilike(auditLogs.action, "%denied%"));

const severityCondition = (severity: AuditLogSeverity) => {
  const explicitSeverity = eq(metadataSeverity(), severity);
  const fallbackSeverity = not(knownMetadataSeverityCondition());
  const errorAction = actionErrorCondition();
  const warningAction = actionWarningCondition();

  if (severity === "error") {
    return errorAction
      ? or(explicitSeverity, and(fallbackSeverity, errorAction))
      : explicitSeverity;
  }
  if (severity === "warning") {
    return warningAction
      ? or(
          explicitSeverity,
          and(fallbackSeverity, ...(errorAction ? [not(errorAction)] : []), warningAction)
        )
      : explicitSeverity;
  }

  return or(
    explicitSeverity,
    and(
      fallbackSeverity,
      ...(errorAction ? [not(errorAction)] : []),
      ...(warningAction ? [not(warningAction)] : [])
    )
  );
};

const searchCondition = (query: string) => {
  const value = `%${query.toLowerCase()}%`;
  return or(
    ilike(auditLogs.action, value),
    ilike(auditLogs.targetType, value),
    ilike(auditLogs.targetId, value),
    sql`${auditLogs.actorId}::text ILIKE ${value}`,
    sql`${auditLogs.metadata}::text ILIKE ${value}`
  );
};

const auditCursorCreatedAtExpression = () =>
  sql<string>`to_char(${auditLogs.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

type AuditListRow = AuditRecord & {
  cursorCreatedAt: string;
};

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

export async function listAudit(input: AuditLogQueryInput = {}): Promise<AuditListResult> {
  const query = normalizeAuditLogQuery(input);
  const conditions: SQL[] = [];

  if (query.query) {
    const condition = searchCondition(query.query);
    if (condition) conditions.push(condition);
  }
  if (query.category) {
    const condition = categoryCondition(query.category);
    if (condition) conditions.push(condition);
  }
  if (query.severity) {
    const condition = severityCondition(query.severity);
    if (condition) conditions.push(condition);
  }
  if (query.from) conditions.push(gte(auditLogs.createdAt, query.from));
  if (query.to) conditions.push(lte(auditLogs.createdAt, query.to));
  if (query.cursor) {
    const cursor = decodeAdminCursor(query.cursor);
    const cursorCreatedAt = sql<Date>`${cursor.createdAt}::timestamp`;
    conditions.push(
      or(
        lt(auditLogs.createdAt, cursorCreatedAt),
        and(eq(auditLogs.createdAt, cursorCreatedAt), lt(auditLogs.id, cursor.id))
      ) as SQL
    );
  }

  const rows = (await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      cursorCreatedAt: auditCursorCreatedAtExpression(),
    })
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(query.limit + 1)) as AuditListRow[];

  const visibleRows = rows.slice(0, query.limit);
  const items = visibleRows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata,
    createdAt: row.createdAt,
  }));
  const lastVisible = visibleRows.at(-1);
  return {
    items,
    nextCursor:
      rows.length > query.limit && lastVisible
        ? encodeAdminCursor({
            createdAt: lastVisible.cursorCreatedAt,
            id: lastVisible.id,
          })
        : null,
  };
}
