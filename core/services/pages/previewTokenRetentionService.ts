// TASK-551-06-L01: bounded retention pruner for the preview-token family
// (`preview_tokens`, `post_preview_tokens`).
//
// Family row (TASK-551-06-L01 policy matrix): env prefix
// `RETENTION_PREVIEW_TOKENS_`, enabled by default, 1-day age after expiry
// within `[1, 30]`, and only already-expired tokens qualify: the cutoff is
// `expires_at < now - maxAgeDays` (a token expiring exactly at the boundary
// second is retained), ordered `expires_at ASC, id ASC` per table (served by
// the `preview_tokens_retention_idx` / `post_preview_tokens_retention_idx`
// indexes from TASK-551-05-L01).
//
// The two tables share one family batch budget in the documented fixed order —
// page tokens (`preview_tokens`) first, then post tokens
// (`post_preview_tokens`): the page sweep takes up to `batchSize` candidates
// and the post sweep takes only the remainder, so one batch never deletes more
// than `batchSize` rows (global `RETENTION_BATCH_SIZE`, default 500, bounds
// `1..2000`) and one run executes at most `maxBatchesPerRun` batches (global
// `RETENTION_MAX_BATCHES_PER_RUN`, default 10, bounds `1..100`). Apply mode
// locks candidates with `FOR UPDATE SKIP LOCKED` and deletes by primary key;
// dry-run runs the same bounded candidate reads without any row lock,
// publishes no write, and reports `deleted: 0`.
//
// Ownership: there is NO inline/request-path trigger in this module, and the
// preview-token mint/verify paths stay in their owning services. The
// maintenance scheduler (TASK-551-06-L03) owns invocation and transaction
// scope — a batch runs inside whichever executor the caller passes, so the
// scheduler can wrap it in its dedicated maintenance session while direct
// callers (DB-lane suites) may pass `db` or a drizzle transaction handle.
// Direct calls never acquire the scheduler's advisory lock.

import { asc, inArray, lt } from "drizzle-orm";

import { db } from "../../db/client";
import { postPreviewTokens, previewTokens } from "../../db/schema";

// ---------------------------------------------------------------------------
// Stable codes + family identity
// ---------------------------------------------------------------------------

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

export const PREVIEW_TOKENS_RETENTION_FAMILY = "preview_tokens" as const;
export const PREVIEW_TOKENS_RETENTION_ENV_PREFIX = "RETENTION_PREVIEW_TOKENS_";

const DEFAULT_MAX_AGE_DAYS = 1;
const MIN_MAX_AGE_DAYS = 1;
const MAX_MAX_AGE_DAYS = 30;
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreviewTokensRetentionPolicy = Readonly<{
  family: typeof PREVIEW_TOKENS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type PreviewTokensRetentionBatchResult = Readonly<{
  family: typeof PREVIEW_TOKENS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type PreviewTokensRetentionRunSummary = Readonly<{
  family: typeof PREVIEW_TOKENS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

// Shared delete/select capability so both `db` and a drizzle transaction
// handle satisfy it (a raw `typeof db` excludes the tx handle, which lacks
// `$client`) — same pattern as trafficRepository.ts.
export type PreviewTokensRetentionExecutor = Pick<typeof db, "select" | "delete">;

type RetentionEnv = Readonly<Record<string, string | undefined>>;

// ---------------------------------------------------------------------------
// Strict, fail-closed configuration
// ---------------------------------------------------------------------------

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
  // Absent (or empty, the canonical retention-policy convention) resolves to
  // the documented default; anything present must be a canonical integer.
  if (raw === undefined || raw === "") return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw new Error(RETENTION_POLICY_INVALID);
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

export function resolvePreviewTokensRetentionPolicy(
  env: RetentionEnv = process.env
): PreviewTokensRetentionPolicy {
  rejectUnknownFamilyKeys(env, PREVIEW_TOKENS_RETENTION_ENV_PREFIX);
  return Object.freeze({
    family: PREVIEW_TOKENS_RETENTION_FAMILY,
    enabled: readStrictBoolean(env, `${PREVIEW_TOKENS_RETENTION_ENV_PREFIX}ENABLED`, true),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(
      env,
      `${PREVIEW_TOKENS_RETENTION_ENV_PREFIX}MAX_AGE_DAYS`,
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
const assertValidPolicy = (policy: PreviewTokensRetentionPolicy): void => {
  const inRange = (value: number, min: number, max: number): boolean =>
    Number.isSafeInteger(value) && value >= min && value <= max;
  if (
    policy.family !== PREVIEW_TOKENS_RETENTION_FAMILY ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.dryRun !== "boolean" ||
    !inRange(policy.maxAgeDays, MIN_MAX_AGE_DAYS, MAX_MAX_AGE_DAYS) ||
    !inRange(policy.batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE) ||
    !inRange(policy.maxBatchesPerRun, MIN_MAX_BATCHES_PER_RUN, MAX_MAX_BATCHES_PER_RUN)
  ) {
    throw new Error(RETENTION_POLICY_INVALID);
  }
};

// `cutoff` means `expires_at < now - age`: the boundary token is retained.
const cutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Bounded batch primitives (page tokens first, then post tokens)
// ---------------------------------------------------------------------------

const selectExpiredPageTokenIds = async (
  exec: PreviewTokensRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (limit <= 0) return [];
  const candidateQuery = exec
    .select({ id: previewTokens.id })
    .from(previewTokens)
    .where(lt(previewTokens.expiresAt, cutoff))
    .orderBy(asc(previewTokens.expiresAt), asc(previewTokens.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const selectExpiredPostTokenIds = async (
  exec: PreviewTokensRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (limit <= 0) return [];
  const candidateQuery = exec
    .select({ id: postPreviewTokens.id })
    .from(postPreviewTokens)
    .where(lt(postPreviewTokens.expiresAt, cutoff))
    .orderBy(asc(postPreviewTokens.expiresAt), asc(postPreviewTokens.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const deletePageTokenIds = async (
  exec: PreviewTokensRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec.delete(previewTokens).where(inArray(previewTokens.id, [...ids]));
  return deletedCountOf(result);
};

const deletePostTokenIds = async (
  exec: PreviewTokensRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec
    .delete(postPreviewTokens)
    .where(inArray(postPreviewTokens.id, [...ids]));
  return deletedCountOf(result);
};

// drizzle's postgres-js driver resolves a `delete` without `RETURNING` to the
// raw postgres.js `RowList`, which reports the affected row count as `count`
// (`rowCount` is the node-postgres shape and is never present here, so reading
// it would report zero deletes and stop every drain check after batch 1).
function deletedCountOf(result: unknown): number {
  if (result && typeof result === "object" && "count" in result) {
    const count = (result as { count: unknown }).count;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}

// One batch = page tokens first, then post tokens with whatever family budget
// remains. Each table runs its own candidate read and scoped delete so the
// page-then-post ordering contract holds.
const runBatchInExecutor = async (
  policy: PreviewTokensRetentionPolicy,
  now: Date,
  exec: PreviewTokensRetentionExecutor
): Promise<PreviewTokensRetentionBatchResult> => {
  const cutoff = cutoffFor(now, policy.maxAgeDays);
  const lockForDelete = !policy.dryRun;

  const pageIds = await selectExpiredPageTokenIds(exec, cutoff, policy.batchSize, lockForDelete);
  const pageDeleted = policy.dryRun ? 0 : await deletePageTokenIds(exec, pageIds);

  const postBudget = policy.batchSize - pageIds.length;
  const postIds = await selectExpiredPostTokenIds(exec, cutoff, postBudget, lockForDelete);
  const postDeleted = policy.dryRun ? 0 : await deletePostTokenIds(exec, postIds);

  return Object.freeze({
    family: policy.family,
    matched: pageIds.length + postIds.length,
    deleted: pageDeleted + postDeleted,
    dryRun: policy.dryRun,
  });
};

// ---------------------------------------------------------------------------
// Public API: one bounded batch, then the bounded run loop
// ---------------------------------------------------------------------------

export async function prunePreviewTokensBatch(
  policy: PreviewTokensRetentionPolicy,
  now: Date,
  exec: PreviewTokensRetentionExecutor = db
): Promise<PreviewTokensRetentionBatchResult> {
  assertValidPolicy(policy);
  try {
    return await runBatchInExecutor(policy, now, exec);
  } catch (error) {
    if (error instanceof Error && error.message === RETENTION_POLICY_INVALID) throw error;
    throw new Error(RETENTION_BATCH_FAILED);
  }
}

export async function runPreviewTokensRetention(
  now: Date = new Date(),
  exec: PreviewTokensRetentionExecutor = db
): Promise<PreviewTokensRetentionRunSummary> {
  const policy = resolvePreviewTokensRetentionPolicy();
  if (!policy.enabled) {
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
  while (batches < policy.maxBatchesPerRun) {
    const result = await prunePreviewTokensBatch(policy, now, exec);
    batches += 1;
    matched += result.matched;
    deleted += result.deleted;
    // A short batch means the family is drained for this run; dry-run drains
    // on observed candidates because it never deletes.
    const drained = policy.dryRun
      ? result.matched < policy.batchSize
      : result.deleted < policy.batchSize;
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
