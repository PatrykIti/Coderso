// Search-history retention batch (TASK-551-06-L01).
//
// Owns the `search_history` bounded pruner contract: the age cutoff applies
// first, then excess rows per user (the newest `SEARCH_HISTORY_KEEP_NEWEST_PER_USER`
// rows per user are always preserved), candidates are selected oldest-first with
// the immutable `created_at ASC, id ASC` order, and one batch locks and deletes at
// most `policy.batchSize` exact IDs. Inline pruning was removed from
// `recordSearch`; the scheduler (TASK-551-06-L03) owns the cadence and the
// advisory lock, and direct calls to this service never take it.

import { and, asc, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { searchHistory } from "../../db/schema";
import {
  SEARCH_HISTORY_KEEP_NEWEST_PER_USER,
  type RetentionPolicy,
} from "../maintenance/retentionPolicy";

/** Machine-readable failure codes emitted by this service (TASK-551-06-L01). */
export const SEARCH_HISTORY_RETENTION_ERROR_CODES = {
  policyInvalid: "retention_policy_invalid",
  batchFailed: "retention_batch_failed",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Global hard cap on one batch's candidate IDs (TASK-551-06-L01 policy). */
const BATCH_SIZE_HARD_CAP = 2_000;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SearchHistoryRetentionBatchResult = Readonly<{
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

/** Deterministic `cutoff`: rows with `created_at < now - maxAgeDays` age out. */
export function resolveSearchHistoryRetentionCutoff(now: Date, maxAgeDays: number): Date {
  return new Date(now.getTime() - maxAgeDays * DAY_MS);
}

function requireSupportedPolicy(policy: RetentionPolicy): void {
  if (policy.family !== "search_history") {
    throw new Error(SEARCH_HISTORY_RETENTION_ERROR_CODES.policyInvalid);
  }
  if (
    !Number.isInteger(policy.batchSize) ||
    policy.batchSize < 1 ||
    policy.batchSize > BATCH_SIZE_HARD_CAP
  ) {
    throw new Error(SEARCH_HISTORY_RETENTION_ERROR_CODES.policyInvalid);
  }
  if (!Number.isInteger(policy.maxAgeDays) || policy.maxAgeDays < 1) {
    throw new Error(SEARCH_HISTORY_RETENTION_ERROR_CODES.policyInvalid);
  }
}

/**
 * One bounded retention batch over `search_history`. Runs inside the caller's
 * transaction so the candidate lock and the scoped delete stay atomic.
 *
 * A row is deletable when it is past the cutoff AND the user owns at least
 * `SEARCH_HISTORY_KEEP_NEWEST_PER_USER` newer rows (the keep-newest
 * preservation probe uses the `(user_id, created_at DESC, id DESC)` index and
 * is bounded per candidate).
 * Dry-run executes the identical cutoff/preservation/ordering/limit candidate
 * read with no row lock and zero deletes; `matched` is observational.
 */
export async function pruneSearchHistoryBatch(
  policy: RetentionPolicy,
  tx: DbTransaction,
  now: Date = new Date()
): Promise<SearchHistoryRetentionBatchResult> {
  requireSupportedPolicy(policy);
  // Disabled families do zero work until explicitly enabled.
  if (!policy.enabled) return { matched: 0, deleted: 0, dryRun: policy.dryRun };

  const cutoff = resolveSearchHistoryRetentionCutoff(now, policy.maxAgeDays);

  try {
    const candidates = tx
      .select({ id: searchHistory.id })
      .from(searchHistory)
      .where(
        and(
          lt(searchHistory.createdAt, cutoff),
          // Preservation probe: the candidate survives unless the user has a
          // full keep-newest set strictly newer than it (`created_at`, then `id`).
          sql`(select count(*) from (
                select 1 from ${searchHistory} newer
                where newer.user_id = ${searchHistory.userId}
                  and (newer.created_at, newer.id) > (${searchHistory.createdAt}, ${searchHistory.id})
                limit ${SEARCH_HISTORY_KEEP_NEWEST_PER_USER}
              ) newer_rows) = ${SEARCH_HISTORY_KEEP_NEWEST_PER_USER}`
        )
      )
      .orderBy(asc(searchHistory.createdAt), asc(searchHistory.id))
      .limit(policy.batchSize);

    const batch = policy.dryRun
      ? await candidates
      : await candidates.for("update", { skipLocked: true });

    if (policy.dryRun) {
      return { matched: batch.length, deleted: 0, dryRun: true };
    }

    if (batch.length === 0) return { matched: 0, deleted: 0, dryRun: false };

    const deleted = await tx
      .delete(searchHistory)
      .where(
        inArray(
          searchHistory.id,
          batch.map((row) => row.id)
        )
      )
      .returning({ id: searchHistory.id });

    return { matched: batch.length, deleted: deleted.length, dryRun: false };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === SEARCH_HISTORY_RETENTION_ERROR_CODES.policyInvalid
    ) {
      throw error;
    }
    throw new Error(SEARCH_HISTORY_RETENTION_ERROR_CODES.batchFailed);
  }
}
