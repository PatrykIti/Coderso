import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

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

// ---------------------------------------------------------------------------
// Bounded retention pruner (TASK-551-06-L01)
// ---------------------------------------------------------------------------
//
// Family row (TASK-551-06-L01 policy matrix): env prefix
// `RETENTION_AUDIT_LOGS_`, enabled by default, 365-day age bound within
// `[30, 2555]`, cutoff `created_at < now - maxAgeDays` (the boundary row is
// retained), delete order `created_at ASC, id ASC` — served by the
// `audit_logs_retention_idx` index from TASK-551-05-L01.
//
// Batching: one batch deletes at most `batchSize` oldest eligible rows (global
// `RETENTION_BATCH_SIZE`, default 500, bounds `1..2000`) and one run executes
// at most `maxBatchesPerRun` batches (global `RETENTION_MAX_BATCHES_PER_RUN`,
// default 10, bounds `1..100`). Apply mode locks the candidate rows with
// `FOR UPDATE SKIP LOCKED` and then issues one scoped delete by primary key;
// dry-run executes the same bounded candidate read without any row lock,
// publishes no write, and reports `deleted: 0`.
//
// Ownership: there is NO inline/request-path trigger in this module —
// `logAudit` only ever inserts, so the audit trail stays append-only on the
// request path. The maintenance scheduler (TASK-551-06-L03) owns invocation
// and transaction scope: a batch runs inside whichever executor the caller
// passes, so the scheduler can wrap it in its dedicated maintenance session
// while direct callers may pass `db` or a drizzle transaction handle. Direct
// calls never acquire the scheduler's advisory lock.

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

export const AUDIT_LOGS_RETENTION_FAMILY = "audit_logs" as const;
export const AUDIT_LOGS_RETENTION_ENV_PREFIX = "RETENTION_AUDIT_LOGS_";

const DEFAULT_MAX_AGE_DAYS = 365;
const MIN_MAX_AGE_DAYS = 30;
const MAX_MAX_AGE_DAYS = 2_555;
const DEFAULT_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 2_000;
const DEFAULT_MAX_BATCHES_PER_RUN = 10;
const MIN_MAX_BATCHES_PER_RUN = 1;
const MAX_MAX_BATCHES_PER_RUN = 100;

// Only the two documented family knobs exist. Anything else under the family
// prefix — an age/enabled alias, a family-level dry-run, or a family override
// of a global knob — fails closed instead of winning by rename.
const KNOWN_FAMILY_ENV_SUFFIXES = new Set(["ENABLED", "MAX_AGE_DAYS"]);

export type AuditLogsRetentionPolicy = Readonly<{
  family: typeof AUDIT_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type AuditLogsRetentionBatchResult = Readonly<{
  family: typeof AUDIT_LOGS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type AuditLogsRetentionRunBudget = Readonly<{
  family: typeof AUDIT_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batchBudget: number;
  rowsPerBatch: number;
  maxRows: number;
}>;

export type AuditLogsRetentionRunSummary = Readonly<{
  family: typeof AUDIT_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

// Shared delete/select capability so both `db` and a drizzle transaction
// handle satisfy it (a raw `typeof db` excludes the tx handle, which lacks
// `$client`) — same pattern as trafficRepository.ts.
export type AuditLogsRetentionExecutor = Pick<typeof db, "select" | "delete">;

type RetentionEnv = Readonly<Record<string, string | undefined>>;

const readStrictBoolean = (env: RetentionEnv, key: string, fallback: boolean): boolean => {
  const raw = env[key];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(RETENTION_POLICY_INVALID);
};

const readBoundedInteger = (
  env: RetentionEnv,
  key: string,
  fallback: number,
  min: number,
  max: number
): number => {
  const raw = env[key];
  if (raw === undefined) return fallback;
  if (!/^-?\d+$/.test(raw)) throw new Error(RETENTION_POLICY_INVALID);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(RETENTION_POLICY_INVALID);
  }
  return parsed;
};

const rejectUnknownFamilyKeys = (env: RetentionEnv, prefix: string): void => {
  for (const key of Object.keys(env)) {
    if (!key.startsWith(prefix)) continue;
    if (!KNOWN_FAMILY_ENV_SUFFIXES.has(key.slice(prefix.length))) {
      throw new Error(RETENTION_POLICY_INVALID);
    }
  }
};

export function resolveAuditLogsRetentionPolicy(
  env: RetentionEnv = process.env
): AuditLogsRetentionPolicy {
  rejectUnknownFamilyKeys(env, AUDIT_LOGS_RETENTION_ENV_PREFIX);
  return Object.freeze({
    family: AUDIT_LOGS_RETENTION_FAMILY,
    enabled: readStrictBoolean(env, `${AUDIT_LOGS_RETENTION_ENV_PREFIX}ENABLED`, true),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(
      env,
      `${AUDIT_LOGS_RETENTION_ENV_PREFIX}MAX_AGE_DAYS`,
      DEFAULT_MAX_AGE_DAYS,
      MIN_MAX_AGE_DAYS,
      MAX_MAX_AGE_DAYS
    ),
    batchSize: readBoundedInteger(
      env,
      "RETENTION_BATCH_SIZE",
      DEFAULT_BATCH_SIZE,
      MIN_BATCH_SIZE,
      MAX_BATCH_SIZE
    ),
    maxBatchesPerRun: readBoundedInteger(
      env,
      "RETENTION_MAX_BATCHES_PER_RUN",
      DEFAULT_MAX_BATCHES_PER_RUN,
      MIN_MAX_BATCHES_PER_RUN,
      MAX_MAX_BATCHES_PER_RUN
    ),
  });
}

// Defense in depth for direct callers that hand-build a policy: the same
// bounds the resolver enforces are re-checked before any statement runs.
const assertValidAuditLogsPolicy = (policy: AuditLogsRetentionPolicy): void => {
  const inRange = (value: number, min: number, max: number): boolean =>
    Number.isSafeInteger(value) && value >= min && value <= max;
  if (
    policy.family !== AUDIT_LOGS_RETENTION_FAMILY ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.dryRun !== "boolean" ||
    !inRange(policy.maxAgeDays, MIN_MAX_AGE_DAYS, MAX_MAX_AGE_DAYS) ||
    !inRange(policy.batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE) ||
    !inRange(policy.maxBatchesPerRun, MIN_MAX_BATCHES_PER_RUN, MAX_MAX_BATCHES_PER_RUN)
  ) {
    throw new Error(RETENTION_POLICY_INVALID);
  }
};

// `cutoff` means `created_at < now - age`: the boundary row is always retained.
const auditLogsCutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

/**
 * The one bounded candidate read, shared by both modes and exported for
 * DB-free pinning of the emitted SQL: cutoff strictness, the immutable
 * `created_at ASC, id ASC` order, and the batch `LIMIT`.
 */
export function buildAuditLogsRetentionCandidateQuery(
  exec: AuditLogsRetentionExecutor,
  cutoff: Date,
  limit: number
) {
  return exec
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(lt(auditLogs.createdAt, cutoff))
    .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id))
    .limit(limit);
}

const selectAgedAuditLogIds = async (
  exec: AuditLogsRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  const candidateQuery = buildAuditLogsRetentionCandidateQuery(exec, cutoff, limit);
  // Dry-run observes without taking a destructive row lock; apply mode locks
  // the candidates so a concurrent pruner skips them (FOR UPDATE SKIP LOCKED).
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const deleteAuditLogIds = async (
  exec: AuditLogsRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec.delete(auditLogs).where(inArray(auditLogs.id, [...ids]));
  return deletedCountOfAuditLogs(result);
};

/**
 * Affected-row count of one scoped DELETE. The postgres-js driver behind
 * drizzle resolves the statement to its raw postgres.js Result, which reports
 * the deleted rows only as `count` (beside `command`/`state`/`statement`/
 * `columns`) — there is no `rowCount` field, so that shape reads as zero. A
 * zero therefore means "nothing deleted", the batch reports short, and the run
 * loop drains instead of spinning.
 */
function deletedCountOfAuditLogs(result: unknown): number {
  if (result && typeof result === "object" && "count" in result) {
    const count = (result as { count: unknown }).count;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}

/**
 * The bounded-batch arithmetic of one invocation, derived once from the policy
 * and consumed by the run loop: how many batches it may execute, how many rows
 * each batch may touch, and therefore the hard per-run row ceiling.
 */
export function auditLogsRetentionRunBudget(
  policy: AuditLogsRetentionPolicy
): AuditLogsRetentionRunBudget {
  assertValidAuditLogsPolicy(policy);
  const batchBudget = policy.enabled ? policy.maxBatchesPerRun : 0;
  return Object.freeze({
    family: policy.family,
    enabled: policy.enabled,
    dryRun: policy.dryRun,
    batchBudget,
    rowsPerBatch: policy.batchSize,
    maxRows: batchBudget * policy.batchSize,
  });
}

export async function pruneAuditLogsBatch(
  policy: AuditLogsRetentionPolicy,
  now: Date,
  exec: AuditLogsRetentionExecutor = db
): Promise<AuditLogsRetentionBatchResult> {
  assertValidAuditLogsPolicy(policy);
  const cutoff = auditLogsCutoffFor(now, policy.maxAgeDays);
  try {
    if (policy.dryRun) {
      const matched = await selectAgedAuditLogIds(exec, cutoff, policy.batchSize, false);
      return Object.freeze({
        family: policy.family,
        matched: matched.length,
        deleted: 0,
        dryRun: true,
      });
    }
    const candidates = await selectAgedAuditLogIds(exec, cutoff, policy.batchSize, true);
    const deleted = await deleteAuditLogIds(exec, candidates);
    return Object.freeze({
      family: policy.family,
      matched: candidates.length,
      deleted,
      dryRun: false,
    });
  } catch (error) {
    if (error instanceof Error && error.message === RETENTION_POLICY_INVALID) throw error;
    throw new Error(RETENTION_BATCH_FAILED);
  }
}

export async function runAuditLogsRetention(
  now: Date = new Date(),
  exec: AuditLogsRetentionExecutor = db
): Promise<AuditLogsRetentionRunSummary> {
  const policy = resolveAuditLogsRetentionPolicy();
  const budget = auditLogsRetentionRunBudget(policy);
  if (!budget.enabled) {
    return Object.freeze({
      family: policy.family,
      enabled: false,
      dryRun: policy.dryRun,
      batches: 0,
      matched: 0,
      deleted: 0,
    });
  }
  let batches = 0;
  let matched = 0;
  let deleted = 0;
  while (batches < budget.batchBudget) {
    const result = await pruneAuditLogsBatch(policy, now, exec);
    batches += 1;
    matched += result.matched;
    deleted += result.deleted;
    // A short batch means the family is drained for this run; dry-run drains
    // on observed candidates because it never deletes.
    const drained = policy.dryRun
      ? result.matched < budget.rowsPerBatch
      : result.deleted < budget.rowsPerBatch;
    if (drained) break;
  }
  return Object.freeze({
    family: policy.family,
    enabled: true,
    dryRun: policy.dryRun,
    batches,
    matched,
    deleted,
  });
}
