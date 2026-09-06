// TASK-551-06-L01: bounded retention pruners for the two assistant
// append-heavy families (`assistant_doc_ingest_runs`,
// `assistant_action_executions` + their undo items).
//
// Family rows (TASK-551-06-L01 policy matrix):
//
//   `assistant_doc_ingest_runs` — env prefix
//   `RETENTION_ASSISTANT_INGEST_RUNS_`, enabled by default, 90-day age bound
//   within `[7, 365]`, cutoff `started_at < now - maxAgeDays` (the boundary row
//   is retained), delete order `started_at ASC, id ASC`, and the doc-mandated
//   preservation anchor: the newest SUCCESSFUL run per `source_root` always
//   survives however old it is. That anchor is a policy contract, not an
//   optimization for a reader — the only production read of this table is
//   `getAssistantDocsDbStatus` in `docsIngestService.ts`, which is global and
//   status-agnostic (`started_at DESC LIMIT 1` over every run, no `source_root`
//   and no status filter), so there is no per-source read for retention to
//   serve. `assistant_ingest_retention_idx` plus the partial
//   `assistant_ingest_source_success_idx` from TASK-551-05-L01 still serve the
//   scan and the anchor check.
//
//   `assistant_action_executions` + undo items — env prefix
//   `RETENTION_ASSISTANT_ACTIONS_`, enabled by default, 180-day age bound
//   within `[30, 730]`, cutoff `created_at < now - maxAgeDays`, delete order
//   `created_at ASC, id ASC` with undo children deleted before their
//   execution (`assistant_action_executions_retention_idx`).
//
// Batching: one batch deletes at most `batchSize` oldest eligible rows
// (global `RETENTION_BATCH_SIZE`, default 500, bounds `1..2000`) and one run
// executes at most `maxBatchesPerRun` batches (global
// `RETENTION_MAX_BATCHES_PER_RUN`, default 10, bounds `1..100`). Child sweeps
// (undo items) are budgeted inside that same per-batch total, so a parent plus
// its children can never push a batch past `batchSize`. Apply mode locks the
// candidate rows with `FOR UPDATE SKIP LOCKED` and then issues scoped deletes
// by primary key; dry-run executes the same bounded candidate reads without any
// row lock, publishes no write, and reports `deleted: 0`.
//
// Ownership: there is NO inline/request-path trigger in this module. Execution
// + undo persistence stays in `actionExecutionStore.ts`, and the doc ingest
// write path stays in `docsIngestService.ts`. The maintenance scheduler
// (TASK-551-06-L03) owns invocation and transaction scope — a batch runs
// inside whichever executor the caller passes, so the scheduler can wrap it in
// its dedicated maintenance session while direct callers (DB-lane suites) may
// pass `db` or a drizzle transaction handle. Direct calls never acquire the
// scheduler's advisory lock.

import { and, asc, eq, gt, inArray, lt, not, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import {
  assistantActionExecutions,
  assistantActionUndoItems,
  assistantDocIngestRuns,
} from "../../db/schema";

// ---------------------------------------------------------------------------
// Stable codes + shared strict configuration helpers
// ---------------------------------------------------------------------------

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

const DEFAULT_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 2_000;
const DEFAULT_MAX_BATCHES_PER_RUN = 10;
const MIN_MAX_BATCHES_PER_RUN = 1;
const MAX_MAX_BATCHES_PER_RUN = 100;

// Only the two documented family knobs exist per family. Anything else under a
// family prefix — an age/enabled alias, a family-level dry-run, or a family
// override of a global knob — fails closed instead of winning by rename.
const KNOWN_FAMILY_ENV_SUFFIXES = new Set(["ENABLED", "MAX_AGE_DAYS"]);

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

// `cutoff` means `column < now - age`: the boundary row is always retained.
const cutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

// Shared delete/select capability so both `db` and a drizzle transaction
// handle satisfy it (a raw `typeof db` excludes the tx handle, which lacks
// `$client`) — same pattern as trafficRepository.ts.
export type AssistantRetentionExecutor = Pick<typeof db, "select" | "delete">;

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

// Shared policy shape/fields so both families parse identically; only the
// prefix, default age, and bounds differ.
type FamilyPolicyInput<F extends string> = Readonly<{
  env: RetentionEnv;
  prefix: string;
  family: F;
  defaultMaxAgeDays: number;
  minMaxAgeDays: number;
  maxMaxAgeDays: number;
}>;

const resolveFamilyPolicy = <F extends string>(
  input: FamilyPolicyInput<F>
): Readonly<{
  family: F;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}> => {
  rejectUnknownFamilyKeys(input.env, input.prefix);
  return Object.freeze({
    family: input.family,
    enabled: readStrictBoolean(input.env, `${input.prefix}ENABLED`, true),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(input.env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(
      input.env,
      `${input.prefix}MAX_AGE_DAYS`,
      input.defaultMaxAgeDays,
      input.minMaxAgeDays,
      input.maxMaxAgeDays
    ),
    batchSize: readBoundedInteger(
      input.env,
      "RETENTION_BATCH_SIZE",
      DEFAULT_BATCH_SIZE,
      MIN_BATCH_SIZE,
      MAX_BATCH_SIZE
    ),
    maxBatchesPerRun: readBoundedInteger(
      input.env,
      "RETENTION_MAX_BATCHES_PER_RUN",
      DEFAULT_MAX_BATCHES_PER_RUN,
      MIN_MAX_BATCHES_PER_RUN,
      MAX_MAX_BATCHES_PER_RUN
    ),
  });
};

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isSafeInteger(value) && value >= min && value <= max;

// Defense in depth for direct callers that hand-build a policy: the same
// bounds the resolvers enforce are re-checked before any statement runs.
const assertValidPolicy = (
  policy: Readonly<{
    family: string;
    enabled: boolean;
    dryRun: boolean;
    maxAgeDays: number;
    batchSize: number;
    maxBatchesPerRun: number;
  }>,
  family: string,
  minMaxAgeDays: number,
  maxMaxAgeDays: number
): void => {
  if (
    policy.family !== family ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.dryRun !== "boolean" ||
    !inRange(policy.maxAgeDays, minMaxAgeDays, maxMaxAgeDays) ||
    !inRange(policy.batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE) ||
    !inRange(policy.maxBatchesPerRun, MIN_MAX_BATCHES_PER_RUN, MAX_MAX_BATCHES_PER_RUN)
  ) {
    throw new Error(RETENTION_POLICY_INVALID);
  }
};

// ===========================================================================
// Family 1: assistant_doc_ingest_runs
// ===========================================================================

// Family identity matches the canonical `RetentionFamily` union in
// core/services/maintenance/retentionPolicy.ts (`assistant_ingest_runs`), whose
// single member table is `assistant_doc_ingest_runs`.
export const ASSISTANT_INGEST_RUNS_RETENTION_FAMILY = "assistant_ingest_runs" as const;
export const ASSISTANT_INGEST_RUNS_RETENTION_ENV_PREFIX = "RETENTION_ASSISTANT_INGEST_RUNS_";

const INGEST_RUNS_DEFAULT_MAX_AGE_DAYS = 90;
const INGEST_RUNS_MIN_MAX_AGE_DAYS = 7;
const INGEST_RUNS_MAX_MAX_AGE_DAYS = 365;

export type AssistantIngestRunsRetentionPolicy = Readonly<{
  family: typeof ASSISTANT_INGEST_RUNS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type AssistantIngestRunsRetentionBatchResult = Readonly<{
  family: typeof ASSISTANT_INGEST_RUNS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type AssistantIngestRunsRetentionRunSummary = Readonly<{
  family: typeof ASSISTANT_INGEST_RUNS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

export function resolveAssistantIngestRunsRetentionPolicy(
  env: RetentionEnv = process.env
): AssistantIngestRunsRetentionPolicy {
  return resolveFamilyPolicy({
    env,
    prefix: ASSISTANT_INGEST_RUNS_RETENTION_ENV_PREFIX,
    family: ASSISTANT_INGEST_RUNS_RETENTION_FAMILY,
    defaultMaxAgeDays: INGEST_RUNS_DEFAULT_MAX_AGE_DAYS,
    minMaxAgeDays: INGEST_RUNS_MIN_MAX_AGE_DAYS,
    maxMaxAgeDays: INGEST_RUNS_MAX_MAX_AGE_DAYS,
  });
}

const assertValidIngestRunsPolicy = (policy: AssistantIngestRunsRetentionPolicy): void => {
  assertValidPolicy(
    policy,
    ASSISTANT_INGEST_RUNS_RETENTION_FAMILY,
    INGEST_RUNS_MIN_MAX_AGE_DAYS,
    INGEST_RUNS_MAX_MAX_AGE_DAYS
  );
};

// Doc-mandated anchor, kept because the policy matrix locks it: the newest
// successful run per `source_root` is retained however old it is, and every
// other aged row (older successes, failed/partial runs) is a deletion
// candidate. This predicate mirrors no consumer — the single production read of
// the table (`getAssistantDocsDbStatus` in `docsIngestService.ts`) is a global,
// status-agnostic newest-run read, not a per-source one.
const newerSuccessfulRun = alias(assistantDocIngestRuns, "newer_successful_run");

const selectAgedNonAnchorRunIds = async (
  exec: AssistantRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  const candidateQuery = exec
    .select({ id: assistantDocIngestRuns.id })
    .from(assistantDocIngestRuns)
    .where(
      and(
        lt(assistantDocIngestRuns.startedAt, cutoff),
        not(
          // Both fragments are statically defined, so `and()` never actually
          // returns undefined here; the fallback only satisfies `not()`'s
          // non-optional SQLWrapper operand.
          and(
            eq(assistantDocIngestRuns.status, "success"),
            notExists(
              exec
                .select({ one: sql`1`.as("one") })
                .from(newerSuccessfulRun)
                .where(
                  and(
                    eq(newerSuccessfulRun.sourceRoot, assistantDocIngestRuns.sourceRoot),
                    eq(newerSuccessfulRun.status, "success"),
                    or(
                      gt(newerSuccessfulRun.startedAt, assistantDocIngestRuns.startedAt),
                      and(
                        eq(newerSuccessfulRun.startedAt, assistantDocIngestRuns.startedAt),
                        gt(newerSuccessfulRun.id, assistantDocIngestRuns.id)
                      )
                    )
                  )
                )
            )
          ) ?? sql`true`
        )
      )
    )
    .orderBy(asc(assistantDocIngestRuns.startedAt), asc(assistantDocIngestRuns.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const deleteIngestRunIds = async (
  exec: AssistantRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec
    .delete(assistantDocIngestRuns)
    .where(inArray(assistantDocIngestRuns.id, [...ids]));
  return deletedCountOf(result);
};

export async function pruneAssistantIngestRunsBatch(
  policy: AssistantIngestRunsRetentionPolicy,
  now: Date,
  exec: AssistantRetentionExecutor = db
): Promise<AssistantIngestRunsRetentionBatchResult> {
  assertValidIngestRunsPolicy(policy);
  const cutoff = cutoffFor(now, policy.maxAgeDays);
  try {
    if (policy.dryRun) {
      const matched = await selectAgedNonAnchorRunIds(exec, cutoff, policy.batchSize, false);
      return Object.freeze({
        family: policy.family,
        matched: matched.length,
        deleted: 0,
        dryRun: true,
      });
    }
    const candidates = await selectAgedNonAnchorRunIds(exec, cutoff, policy.batchSize, true);
    const deleted = await deleteIngestRunIds(exec, candidates);
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

export async function runAssistantIngestRunsRetention(
  now: Date = new Date(),
  exec: AssistantRetentionExecutor = db
): Promise<AssistantIngestRunsRetentionRunSummary> {
  const policy = resolveAssistantIngestRunsRetentionPolicy();
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
    const result = await pruneAssistantIngestRunsBatch(policy, now, exec);
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

// ===========================================================================
// Family 2: assistant_action_executions + undo items
// ===========================================================================

// Family identity matches the canonical `RetentionFamily` union in
// core/services/maintenance/retentionPolicy.ts (`assistant_actions`), whose
// member tables are `assistant_action_undo_items` (child) then
// `assistant_action_executions`.
export const ASSISTANT_ACTIONS_RETENTION_FAMILY = "assistant_actions" as const;
export const ASSISTANT_ACTIONS_RETENTION_ENV_PREFIX = "RETENTION_ASSISTANT_ACTIONS_";

const ACTIONS_DEFAULT_MAX_AGE_DAYS = 180;
const ACTIONS_MIN_MAX_AGE_DAYS = 30;
const ACTIONS_MAX_MAX_AGE_DAYS = 730;

export type AssistantActionsRetentionPolicy = Readonly<{
  family: typeof ASSISTANT_ACTIONS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type AssistantActionsRetentionBatchResult = Readonly<{
  family: typeof ASSISTANT_ACTIONS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type AssistantActionsRetentionRunSummary = Readonly<{
  family: typeof ASSISTANT_ACTIONS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

export function resolveAssistantActionsRetentionPolicy(
  env: RetentionEnv = process.env
): AssistantActionsRetentionPolicy {
  return resolveFamilyPolicy({
    env,
    prefix: ASSISTANT_ACTIONS_RETENTION_ENV_PREFIX,
    family: ASSISTANT_ACTIONS_RETENTION_FAMILY,
    defaultMaxAgeDays: ACTIONS_DEFAULT_MAX_AGE_DAYS,
    minMaxAgeDays: ACTIONS_MIN_MAX_AGE_DAYS,
    maxMaxAgeDays: ACTIONS_MAX_MAX_AGE_DAYS,
  });
}

const assertValidActionsPolicy = (policy: AssistantActionsRetentionPolicy): void => {
  assertValidPolicy(
    policy,
    ASSISTANT_ACTIONS_RETENTION_FAMILY,
    ACTIONS_MIN_MAX_AGE_DAYS,
    ACTIONS_MAX_MAX_AGE_DAYS
  );
};

const selectAgedExecutionIds = async (
  exec: AssistantRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  const candidateQuery = exec
    .select({ id: assistantActionExecutions.id })
    .from(assistantActionExecutions)
    .where(lt(assistantActionExecutions.createdAt, cutoff))
    .orderBy(asc(assistantActionExecutions.createdAt), asc(assistantActionExecutions.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

// Child read of the batch: undo items of the selected executions, in the
// family delete order, capped at `limit`. The cap is what keeps a fan-out of
// many undo items per execution from blowing the family batch budget.
const selectUndoItemIdsForExecutions = async (
  exec: AssistantRetentionExecutor,
  executionIds: readonly string[],
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (executionIds.length === 0 || limit <= 0) return [];
  const childQuery = exec
    .select({ id: assistantActionUndoItems.id })
    .from(assistantActionUndoItems)
    .where(inArray(assistantActionUndoItems.executionId, [...executionIds]))
    .orderBy(asc(assistantActionUndoItems.createdAt), asc(assistantActionUndoItems.id))
    .limit(limit);
  // Apply mode locks the children too, so a concurrent pruner skips them while
  // dry-run observes without any destructive row lock.
  const rows = lockForDelete
    ? await childQuery.for("update", { skipLocked: true })
    : await childQuery;
  return rows.map((row) => row.id);
};

const deleteUndoItemIds = async (
  exec: AssistantRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec
    .delete(assistantActionUndoItems)
    .where(inArray(assistantActionUndoItems.id, [...ids]));
  return deletedCountOf(result);
};

const deleteExecutionIds = async (
  exec: AssistantRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec
    .delete(assistantActionExecutions)
    .where(inArray(assistantActionExecutions.id, [...ids]));
  return deletedCountOf(result);
};

// One batch = the oldest aged executions plus, child-first, their undo items,
// with BOTH sweeps drawing on one family batch budget. Undo items are read (and
// deleted) against the full `batchSize` first; executions then only take the
// budget the children did not consume. Because the child read is capped at
// `batchSize`, a short child read is a complete child read — so every execution
// in the execution plan is provably childless, no undo row survives its
// execution, and one batch deletes at most `batchSize` rows no matter how many
// undo items a single execution carries (children count toward the cap).
const runActionsBatchInExecutor = async (
  policy: AssistantActionsRetentionPolicy,
  now: Date,
  exec: AssistantRetentionExecutor
): Promise<AssistantActionsRetentionBatchResult> => {
  const cutoff = cutoffFor(now, policy.maxAgeDays);
  const lockForDelete = !policy.dryRun;

  const executionIds = await selectAgedExecutionIds(exec, cutoff, policy.batchSize, lockForDelete);
  const undoItemIds = await selectUndoItemIdsForExecutions(
    exec,
    executionIds,
    policy.batchSize,
    lockForDelete
  );
  // The children consumed the head of the budget; the remainder goes to their
  // executions. When the child read filled the batch the remainder is zero and
  // the executions wait for a later batch.
  const executionBudget = policy.batchSize - undoItemIds.length;
  const executionPlan = executionIds.slice(0, executionBudget);

  let deleted = 0;
  if (!policy.dryRun) {
    deleted += await deleteUndoItemIds(exec, undoItemIds);
    deleted += await deleteExecutionIds(exec, executionPlan);
  }

  return Object.freeze({
    family: policy.family,
    matched: undoItemIds.length + executionPlan.length,
    deleted,
    dryRun: policy.dryRun,
  });
};

export async function pruneAssistantActionsBatch(
  policy: AssistantActionsRetentionPolicy,
  now: Date,
  exec: AssistantRetentionExecutor = db
): Promise<AssistantActionsRetentionBatchResult> {
  assertValidActionsPolicy(policy);
  try {
    return await runActionsBatchInExecutor(policy, now, exec);
  } catch (error) {
    if (error instanceof Error && error.message === RETENTION_POLICY_INVALID) throw error;
    throw new Error(RETENTION_BATCH_FAILED);
  }
}

export async function runAssistantActionsRetention(
  now: Date = new Date(),
  exec: AssistantRetentionExecutor = db
): Promise<AssistantActionsRetentionRunSummary> {
  const policy = resolveAssistantActionsRetentionPolicy();
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
    const result = await pruneAssistantActionsBatch(policy, now, exec);
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
