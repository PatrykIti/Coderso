import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "../../db/client";
import { accessLogs, sessions, users } from "../../db/schema";
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
import { hashEmail, isLikelyEmail, normalizeEmail, resolveEmailValue } from "../security/piiEmail";
import { isAccessLogMethod } from "./accessLogQueryContract";

export type AccessLogInput = {
  method: string;
  path: string;
  status: number;
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  durationMs?: number | null;
};

export type AccessLogQueryInput = {
  limit?: string | number | null;
  status?: string | null;
  query?: string | null;
  userId?: string | null;
  method?: string | null;
  ip?: string | null;
  from?: string | Date | null;
  to?: string | Date | null;
  cursor?: string | null;
};

export type NormalizedAccessLogQuery = {
  limit: number;
  status?: AccessLogStatus;
  query?: string;
  userId?: string;
  method?: string;
  ip?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
};

export type AccessLogStatus = "success" | "failed";

export type AccessLogRecord = {
  id: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  durationMs: number | null;
  createdAt: Date;
  matchContext?: AccessLogMatchContext | null;
  session: AccessLogSessionContext;
};

export type AccessLogListResult = {
  items: AccessLogRecord[];
  nextCursor: string | null;
};

export type AccessLogListOptions = {
  currentSessionId?: string | null;
  canViewSession?: boolean;
  canRevokeSession?: boolean;
  now?: Date;
};

export type AccessLogMatchField = "path" | "ip" | "user" | "email";

export type AccessLogMatchContext = {
  field: AccessLogMatchField;
  label: string;
};

export type AccessLogSessionState =
  "none" | "missing" | "active" | "current" | "revoked" | "expired";

export type AccessLogSessionReason =
  "historical" | "failed_attempt" | "system" | "missing_relation";

export type AccessLogSessionAction = {
  enabled: boolean;
  reason?: string;
};

export type AccessLogSessionContext = {
  state: AccessLogSessionState;
  label: string;
  reason?: AccessLogSessionReason;
  sessionId?: string;
  userId?: string;
  current?: boolean;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  view: AccessLogSessionAction;
  revoke: AccessLogSessionAction;
};

export type AccessLogRevokeReason = "admin_manual_revoke";

export type AccessLogRevokeInput = {
  accessLogId: string;
  currentSessionId?: string | null;
  reason: AccessLogRevokeReason;
  now?: Date;
};

export type AccessLogRevokeResult = {
  ok: true;
  accessLogId: string;
  revokedSessionRef: string;
  targetUserRef: string | null;
  sessionState: "revoked";
  alreadyRevoked: boolean;
};

export class AccessLogDomainError extends Error {
  constructor(
    public readonly code:
      | "access_log_not_found"
      | "access_log_session_not_found"
      | "access_log_session_expired"
      | "access_log_current_session_revoke_blocked"
      | "access_log_revoke_invalid",
    message: string
  ) {
    super(message);
    this.name = "AccessLogDomainError";
  }
}

const accessLogStatuses = new Set<AccessLogStatus>(["success", "failed"]);

const normalizeAccessLogStatus = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (accessLogStatuses.has(value as AccessLogStatus)) return value as AccessLogStatus;
  throw new AdminQueryConventionError(
    "admin_query_text_invalid",
    "Access log status is invalid.",
    "status"
  );
};

const normalizeAccessLogUserId = (value: string | null | undefined) => {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > 128) {
    throw new AdminQueryConventionError(
      "admin_query_text_invalid",
      "Access log user filter is invalid.",
      "userId"
    );
  }
  return normalized;
};

const normalizeAccessLogMethod = (value: string | null | undefined) => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (!isAccessLogMethod(normalized)) {
    throw new AdminQueryConventionError(
      "admin_query_text_invalid",
      "Access log method is invalid.",
      "method"
    );
  }
  return normalized;
};

const normalizeAccessLogIp = (value: string | null | undefined) => {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > 128) {
    throw new AdminQueryConventionError(
      "admin_query_text_invalid",
      "Access log IP filter is invalid.",
      "ip"
    );
  }
  return normalized;
};

const includesQuery = (value: string | null | undefined, query: string) =>
  Boolean(value?.toLowerCase().includes(query));

export function resolveAccessLogMatchContext(
  query: string | null | undefined,
  values: {
    path: string;
    ip: string | null;
    userName: string | null;
    userEmail: string | null;
  }
): AccessLogMatchContext | null {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return null;
  if (includesQuery(values.path, normalizedQuery)) {
    return { field: "path", label: "Matched request path" };
  }
  if (includesQuery(values.ip, normalizedQuery)) {
    return { field: "ip", label: "Matched IP address" };
  }
  if (includesQuery(values.userName, normalizedQuery)) {
    return { field: "user", label: "Matched user name" };
  }
  if (includesQuery(values.userEmail, normalizedQuery)) {
    return { field: "email", label: "Matched user email" };
  }
  return null;
}

type AccessLogSessionStateInput = {
  status: number;
  userId: string | null;
  sessionId: string | null;
  sessionFound: boolean;
  sessionExpiresAt: Date | null;
  sessionRevokedAt: Date | null;
};

const resolveUnavailableSessionReason = (
  row: Pick<AccessLogSessionStateInput, "status" | "userId">
) => {
  if (row.status >= 400) return "failed_attempt";
  if (!row.userId) return "system";
  return "historical";
};

const sessionAction = (enabled: boolean, reason?: string): AccessLogSessionAction => ({
  enabled,
  ...(enabled ? {} : { reason }),
});

export function resolveAccessLogSessionContext(
  row: AccessLogSessionStateInput,
  options: AccessLogListOptions = {}
): AccessLogSessionContext {
  const now = options.now ?? new Date();
  const canViewSession = options.canViewSession ?? false;
  const canRevokeSession = options.canRevokeSession ?? false;

  if (!row.sessionId) {
    const reason = resolveUnavailableSessionReason(row);
    const label =
      reason === "failed_attempt"
        ? "No active session for failed request"
        : reason === "system"
          ? "No user session"
          : "Historical log without session link";
    return {
      state: "none",
      label,
      reason,
      view: sessionAction(false, label),
      revoke: sessionAction(false, label),
    };
  }

  if (!row.sessionFound) {
    return {
      state: "missing",
      label: "Session record is no longer available",
      reason: "missing_relation",
      view: sessionAction(false, "Session record is no longer available."),
      revoke: sessionAction(false, "Session record is no longer available."),
    };
  }

  const current = row.sessionId === options.currentSessionId;
  const visibleSessionDetails = canViewSession
    ? {
        sessionId: row.sessionId,
        userId: row.userId ?? undefined,
        current,
        expiresAt: row.sessionExpiresAt,
        revokedAt: row.sessionRevokedAt,
      }
    : {};

  if (row.sessionRevokedAt) {
    return {
      ...visibleSessionDetails,
      state: "revoked",
      label: "Session already revoked",
      view: sessionAction(false, "Session is already revoked."),
      revoke: sessionAction(false, "Session is already revoked."),
    };
  }

  if (row.sessionExpiresAt && row.sessionExpiresAt <= now) {
    return {
      ...visibleSessionDetails,
      state: "expired",
      label: "Session expired",
      view: sessionAction(false, "Session is expired."),
      revoke: sessionAction(false, "Session is expired."),
    };
  }

  if (current) {
    return {
      ...visibleSessionDetails,
      state: "current",
      label: "Current session",
      view: sessionAction(canViewSession, "Full session details require settings:read permission."),
      revoke: sessionAction(false, "Current session cannot be revoked from access logs."),
    };
  }

  return {
    ...visibleSessionDetails,
    state: "active",
    label: "Active session",
    view: sessionAction(canViewSession, "Full session details require settings:read permission."),
    revoke: sessionAction(canRevokeSession, "Revoke requires settings:write permission."),
  };
}

export function normalizeAccessLogQuery(input: AccessLogQueryInput = {}): NormalizedAccessLogQuery {
  const fromIso = normalizeAdminIsoDateBoundary(input.from, "start");
  const toIso = normalizeAdminIsoDateBoundary(input.to, "end");
  const { from, to } = normalizeAdminDateRange({ from: fromIso, to: toIso });
  const query = normalizeAdminSearchQuery(input.query);
  const status = normalizeAccessLogStatus(input.status);
  const userId = normalizeAccessLogUserId(input.userId);
  const method = normalizeAccessLogMethod(input.method);
  const ip = normalizeAccessLogIp(input.ip);
  const cursor = normalizeAdminCursor(input.cursor);
  if (cursor) decodeAdminCursor(cursor);

  return {
    limit: normalizeAdminQueryLimit(input.limit, {
      defaultLimit: 100,
      maxLimit: 200,
    }),
    ...(status ? { status } : {}),
    ...(query ? { query } : {}),
    ...(userId ? { userId } : {}),
    ...(method ? { method } : {}),
    ...(ip ? { ip } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(cursor ? { cursor } : {}),
  };
}

export async function logAccess(entry: AccessLogInput) {
  const [row] = await db
    .insert(accessLogs)
    .values({
      method: entry.method,
      path: entry.path,
      status: entry.status,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      userId: entry.userId ?? null,
      sessionId: entry.sessionId ?? null,
      durationMs: entry.durationMs ?? null,
    })
    .returning();

  return row;
}

const accessLogCursorCreatedAtExpression = () =>
  sql<string>`to_char(${accessLogs.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

type AccessLogListRow = AccessLogRecord & {
  userEmailEncrypted: string | null;
  sessionId: string | null;
  sessionFound: string | null;
  sessionExpiresAt: Date | null;
  sessionRevokedAt: Date | null;
  cursorCreatedAt: string;
};

export async function listAccessLogs(
  input: AccessLogQueryInput = {},
  options: AccessLogListOptions = {}
): Promise<AccessLogListResult> {
  const filters = normalizeAccessLogQuery(input);
  const conditions: SQL[] = [];

  if (filters.status === "success") {
    conditions.push(lt(accessLogs.status, 400));
  }
  if (filters.status === "failed") {
    conditions.push(gte(accessLogs.status, 400));
  }
  if (filters.userId) {
    conditions.push(eq(accessLogs.userId, filters.userId));
  }
  if (filters.method) {
    conditions.push(eq(accessLogs.method, filters.method));
  }
  if (filters.ip) {
    conditions.push(ilike(accessLogs.ip, `%${filters.ip.toLowerCase()}%`));
  }
  if (filters.from) {
    conditions.push(gte(accessLogs.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(accessLogs.createdAt, filters.to));
  }

  if (filters.query) {
    const rawQuery = filters.query.toLowerCase();
    const value = `%${rawQuery}%`;
    const queryFilters = [
      ilike(accessLogs.path, value),
      ilike(accessLogs.ip, value),
      ilike(users.name, value),
    ];
    if (isLikelyEmail(rawQuery)) {
      const normalized = normalizeEmail(rawQuery);
      const emailHash = hashEmail(normalized);
      queryFilters.push(eq(users.emailHash, emailHash));
      queryFilters.push(eq(users.email, normalized));
    }
    const queryFilter = or(...queryFilters);
    if (queryFilter) {
      conditions.push(queryFilter);
    }
  }

  if (filters.cursor) {
    const cursor = decodeAdminCursor(filters.cursor);
    const cursorCreatedAt = sql<Date>`${cursor.createdAt}::timestamp`;
    conditions.push(
      or(
        lt(accessLogs.createdAt, cursorCreatedAt),
        and(eq(accessLogs.createdAt, cursorCreatedAt), lt(accessLogs.id, cursor.id))
      ) as SQL
    );
  }

  const rows = (await db
    .select({
      id: accessLogs.id,
      method: accessLogs.method,
      path: accessLogs.path,
      status: accessLogs.status,
      ip: accessLogs.ip,
      userAgent: accessLogs.userAgent,
      userId: accessLogs.userId,
      userName: users.name,
      userEmail: users.email,
      userEmailEncrypted: users.emailEncrypted,
      sessionId: accessLogs.sessionId,
      sessionFound: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      sessionRevokedAt: sessions.revokedAt,
      durationMs: accessLogs.durationMs,
      createdAt: accessLogs.createdAt,
      cursorCreatedAt: accessLogCursorCreatedAtExpression(),
    })
    .from(accessLogs)
    .leftJoin(users, eq(accessLogs.userId, users.id))
    .leftJoin(sessions, eq(accessLogs.sessionId, sessions.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(accessLogs.createdAt), desc(accessLogs.id))
    .limit(filters.limit + 1)) as AccessLogListRow[];

  const visibleRows = rows.slice(0, filters.limit);
  const items = visibleRows.map((row) => {
    const userEmail = resolveEmailValue({
      emailEncrypted: row.userEmailEncrypted,
      email: row.userEmail,
    });
    return {
      id: row.id,
      method: row.method,
      path: row.path,
      status: row.status,
      ip: row.ip,
      userAgent: row.userAgent,
      userId: row.userId,
      userName: row.userName,
      userEmail,
      durationMs: row.durationMs,
      createdAt: row.createdAt,
      session: resolveAccessLogSessionContext(
        {
          status: row.status,
          userId: row.userId,
          sessionId: row.sessionId,
          sessionFound: Boolean(row.sessionFound),
          sessionExpiresAt: row.sessionExpiresAt,
          sessionRevokedAt: row.sessionRevokedAt,
        },
        options
      ),
      matchContext: resolveAccessLogMatchContext(filters.query, {
        path: row.path,
        ip: row.ip,
        userName: row.userName,
        userEmail,
      }),
    };
  });
  const lastVisible = visibleRows.at(-1);

  return {
    items,
    nextCursor:
      rows.length > filters.limit && lastVisible
        ? encodeAdminCursor({
            createdAt: lastVisible.cursorCreatedAt,
            id: lastVisible.id,
          })
        : null,
  };
}

export async function revokeAccessLogSession(
  input: AccessLogRevokeInput
): Promise<AccessLogRevokeResult> {
  if (input.reason !== "admin_manual_revoke") {
    throw new AccessLogDomainError(
      "access_log_revoke_invalid",
      "Access log revoke reason is invalid."
    );
  }

  const [row] = await db
    .select({
      accessLogId: accessLogs.id,
      accessLogSessionId: accessLogs.sessionId,
      accessLogUserId: accessLogs.userId,
      sessionId: sessions.id,
      sessionUserId: sessions.userId,
      sessionExpiresAt: sessions.expiresAt,
      sessionRevokedAt: sessions.revokedAt,
    })
    .from(accessLogs)
    .leftJoin(sessions, eq(accessLogs.sessionId, sessions.id))
    .where(eq(accessLogs.id, input.accessLogId))
    .limit(1);

  if (!row) {
    throw new AccessLogDomainError("access_log_not_found", "Access log was not found.");
  }

  if (!row.accessLogSessionId || !row.sessionId) {
    throw new AccessLogDomainError(
      "access_log_session_not_found",
      "Access log has no resolvable session."
    );
  }

  if (row.sessionId === input.currentSessionId) {
    throw new AccessLogDomainError(
      "access_log_current_session_revoke_blocked",
      "Current session cannot be revoked from access logs."
    );
  }

  if (row.sessionRevokedAt) {
    return {
      ok: true,
      accessLogId: row.accessLogId,
      revokedSessionRef: row.sessionId,
      targetUserRef: row.sessionUserId ?? row.accessLogUserId,
      sessionState: "revoked",
      alreadyRevoked: true,
    };
  }

  const now = input.now ?? new Date();
  if (!row.sessionExpiresAt || row.sessionExpiresAt <= now) {
    throw new AccessLogDomainError(
      "access_log_session_expired",
      "Expired session cannot be revoked from access logs."
    );
  }

  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.id, row.sessionId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id, userId: sessions.userId });

  return {
    ok: true,
    accessLogId: row.accessLogId,
    revokedSessionRef: revoked?.id ?? row.sessionId,
    targetUserRef: revoked?.userId ?? row.sessionUserId ?? row.accessLogUserId,
    sessionState: "revoked",
    alreadyRevoked: !revoked,
  };
}

// ---------------------------------------------------------------------------
// Bounded retention pruner (TASK-551-06-L01)
// ---------------------------------------------------------------------------
//
// Family row (TASK-551-06-L01 policy matrix): env prefix
// `RETENTION_ACCESS_LOGS_`, enabled by default, 90-day age bound within
// `[7, 365]`, cutoff `created_at < now - maxAgeDays` (the boundary row is
// retained), delete order `created_at ASC, id ASC` — served by the
// `access_logs_retention_idx` index from TASK-551-05-L01.
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
// `logAccess` only ever inserts. The maintenance scheduler (TASK-551-06-L03)
// owns invocation and transaction scope: a batch runs inside whichever
// executor the caller passes, so the scheduler can wrap it in its dedicated
// maintenance session while direct callers may pass `db` or a drizzle
// transaction handle. Direct calls never acquire the scheduler's advisory
// lock.

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

export const ACCESS_LOGS_RETENTION_FAMILY = "access_logs" as const;
export const ACCESS_LOGS_RETENTION_ENV_PREFIX = "RETENTION_ACCESS_LOGS_";

const DEFAULT_MAX_AGE_DAYS = 90;
const MIN_MAX_AGE_DAYS = 7;
const MAX_MAX_AGE_DAYS = 365;
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

export type AccessLogsRetentionPolicy = Readonly<{
  family: typeof ACCESS_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type AccessLogsRetentionBatchResult = Readonly<{
  family: typeof ACCESS_LOGS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type AccessLogsRetentionRunBudget = Readonly<{
  family: typeof ACCESS_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batchBudget: number;
  rowsPerBatch: number;
  maxRows: number;
}>;

export type AccessLogsRetentionRunSummary = Readonly<{
  family: typeof ACCESS_LOGS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

// Shared delete/select capability so both `db` and a drizzle transaction
// handle satisfy it (a raw `typeof db` excludes the tx handle, which lacks
// `$client`) — same pattern as trafficRepository.ts.
export type AccessLogsRetentionExecutor = Pick<typeof db, "select" | "delete">;

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

export function resolveAccessLogsRetentionPolicy(
  env: RetentionEnv = process.env
): AccessLogsRetentionPolicy {
  rejectUnknownFamilyKeys(env, ACCESS_LOGS_RETENTION_ENV_PREFIX);
  return Object.freeze({
    family: ACCESS_LOGS_RETENTION_FAMILY,
    enabled: readStrictBoolean(env, `${ACCESS_LOGS_RETENTION_ENV_PREFIX}ENABLED`, true),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(
      env,
      `${ACCESS_LOGS_RETENTION_ENV_PREFIX}MAX_AGE_DAYS`,
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
const assertValidAccessLogsPolicy = (policy: AccessLogsRetentionPolicy): void => {
  const inRange = (value: number, min: number, max: number): boolean =>
    Number.isSafeInteger(value) && value >= min && value <= max;
  if (
    policy.family !== ACCESS_LOGS_RETENTION_FAMILY ||
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
const accessLogsCutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

/**
 * The one bounded candidate read, shared by both modes and exported for
 * DB-free pinning of the emitted SQL: cutoff strictness, the immutable
 * `created_at ASC, id ASC` order, and the batch `LIMIT`.
 */
export function buildAccessLogsRetentionCandidateQuery(
  exec: AccessLogsRetentionExecutor,
  cutoff: Date,
  limit: number
) {
  return exec
    .select({ id: accessLogs.id })
    .from(accessLogs)
    .where(lt(accessLogs.createdAt, cutoff))
    .orderBy(asc(accessLogs.createdAt), asc(accessLogs.id))
    .limit(limit);
}

const selectAgedAccessLogIds = async (
  exec: AccessLogsRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  const candidateQuery = buildAccessLogsRetentionCandidateQuery(exec, cutoff, limit);
  // Dry-run observes without taking a destructive row lock; apply mode locks
  // the candidates so a concurrent pruner skips them (FOR UPDATE SKIP LOCKED).
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const deleteAccessLogIds = async (
  exec: AccessLogsRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec.delete(accessLogs).where(inArray(accessLogs.id, [...ids]));
  return deletedCountOfAccessLogs(result);
};

/**
 * Affected-row count of one scoped DELETE. The postgres-js driver behind
 * drizzle resolves the statement to its raw postgres.js Result, which reports
 * the deleted rows only as `count` (beside `command`/`state`/`statement`/
 * `columns`) — there is no `rowCount` field, so that shape reads as zero. A
 * zero therefore means "nothing deleted", the batch reports short, and the run
 * loop drains instead of spinning.
 */
function deletedCountOfAccessLogs(result: unknown): number {
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
export function accessLogsRetentionRunBudget(
  policy: AccessLogsRetentionPolicy
): AccessLogsRetentionRunBudget {
  assertValidAccessLogsPolicy(policy);
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

export async function pruneAccessLogsBatch(
  policy: AccessLogsRetentionPolicy,
  now: Date,
  exec: AccessLogsRetentionExecutor = db
): Promise<AccessLogsRetentionBatchResult> {
  assertValidAccessLogsPolicy(policy);
  const cutoff = accessLogsCutoffFor(now, policy.maxAgeDays);
  try {
    if (policy.dryRun) {
      const matched = await selectAgedAccessLogIds(exec, cutoff, policy.batchSize, false);
      return Object.freeze({
        family: policy.family,
        matched: matched.length,
        deleted: 0,
        dryRun: true,
      });
    }
    const candidates = await selectAgedAccessLogIds(exec, cutoff, policy.batchSize, true);
    const deleted = await deleteAccessLogIds(exec, candidates);
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

export async function runAccessLogsRetention(
  now: Date = new Date(),
  exec: AccessLogsRetentionExecutor = db
): Promise<AccessLogsRetentionRunSummary> {
  const policy = resolveAccessLogsRetentionPolicy();
  const budget = accessLogsRetentionRunBudget(policy);
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
    const result = await pruneAccessLogsBatch(policy, now, exec);
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
