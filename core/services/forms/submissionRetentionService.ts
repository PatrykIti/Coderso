// TASK-551-06-L01: bounded retention pruner for the form-submission family
// (`form_submissions`, `form_action_runs`).
//
// Family row (TASK-551-06-L01 policy matrix): env prefix
// `RETENTION_FORM_SUBMISSIONS_`, **disabled by default** (submission payloads
// are legal/business records and only an explicit operator decision starts
// pruning them), 365-day age bound within `[1, 3650]` once enabled, cutoff
// `created_at < now - maxAgeDays` (the boundary row is retained), delete order
// `created_at ASC, id ASC` (served by the `form_submissions_retention_idx` and
// `form_action_runs_retention_idx` indexes from TASK-551-05-L01).
//
// Child-first contract: action runs go before the submissions they belong to.
// One batch therefore (1) sweeps the oldest aged action runs, (2) selects the
// oldest aged submissions with the remaining family budget, (3) deletes the
// action runs that still reference those submissions, and only then (4)
// deletes the submissions themselves. All three deletes draw on ONE family
// batch budget of `batchSize` rows (global `RETENTION_BATCH_SIZE`, default
// 500, bounds `1..2000`): the child sweep is capped at that budget and the
// submission/aged-run plans take only what the children leave, so a batch can
// never exceed `batchSize` rows however many runs a single submission carries.
// One run executes at most `maxBatchesPerRun` batches (global
// `RETENTION_MAX_BATCHES_PER_RUN`, default 10, bounds `1..100`). Apply mode
// locks candidates with `FOR UPDATE SKIP LOCKED` and deletes by primary key;
// dry-run runs the same bounded candidate reads without any row lock,
// publishes no write, and reports `deleted: 0`.
//
// Ownership: there is NO inline/request-path trigger in this module, and the
// submission write path stays in `submissionService.ts` (TASK-551-03). The
// maintenance scheduler (TASK-551-06-L03) owns invocation and transaction
// scope — a batch runs inside whichever executor the caller passes, so the
// scheduler can wrap it in its dedicated maintenance session while direct
// callers (DB-lane suites) may pass `db` or a drizzle transaction handle.
// Direct calls never acquire the scheduler's advisory lock.

import { asc, inArray, lt } from "drizzle-orm";

import { db } from "../../db/client";
import { formActionRuns, formSubmissions } from "../../db/schema";

// ---------------------------------------------------------------------------
// Stable codes + family identity
// ---------------------------------------------------------------------------

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

export const FORM_SUBMISSIONS_RETENTION_FAMILY = "form_submissions" as const;
export const FORM_SUBMISSIONS_RETENTION_ENV_PREFIX = "RETENTION_FORM_SUBMISSIONS_";

const DEFAULT_MAX_AGE_DAYS = 365;
const MIN_MAX_AGE_DAYS = 1;
const MAX_MAX_AGE_DAYS = 3_650;
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

export type FormSubmissionsRetentionPolicy = Readonly<{
  family: typeof FORM_SUBMISSIONS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

export type FormSubmissionsRetentionBatchResult = Readonly<{
  family: typeof FORM_SUBMISSIONS_RETENTION_FAMILY;
  matched: number;
  deleted: number;
  dryRun: boolean;
}>;

export type FormSubmissionsRetentionRunSummary = Readonly<{
  family: typeof FORM_SUBMISSIONS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

// Shared delete/select capability so both `db` and a drizzle transaction
// handle satisfy it (a raw `typeof db` excludes the tx handle, which lacks
// `$client`) — same pattern as trafficRepository.ts.
export type FormSubmissionsRetentionExecutor = Pick<typeof db, "select" | "delete">;

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

export function resolveFormSubmissionsRetentionPolicy(
  env: RetentionEnv = process.env
): FormSubmissionsRetentionPolicy {
  rejectUnknownFamilyKeys(env, FORM_SUBMISSIONS_RETENTION_ENV_PREFIX);
  return Object.freeze({
    family: FORM_SUBMISSIONS_RETENTION_FAMILY,
    // Legal/business records: the family stays off until it is enabled
    // explicitly; absence never enables it.
    enabled: readStrictBoolean(env, `${FORM_SUBMISSIONS_RETENTION_ENV_PREFIX}ENABLED`, false),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(
      env,
      `${FORM_SUBMISSIONS_RETENTION_ENV_PREFIX}MAX_AGE_DAYS`,
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
const assertValidPolicy = (policy: FormSubmissionsRetentionPolicy): void => {
  const inRange = (value: number, min: number, max: number): boolean =>
    Number.isSafeInteger(value) && value >= min && value <= max;
  if (
    policy.family !== FORM_SUBMISSIONS_RETENTION_FAMILY ||
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
const cutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Bounded batch primitives (action runs before the submissions they serve)
// ---------------------------------------------------------------------------

const selectAgedRunIds = async (
  exec: FormSubmissionsRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (limit <= 0) return [];
  const candidateQuery = exec
    .select({ id: formActionRuns.id })
    .from(formActionRuns)
    .where(lt(formActionRuns.createdAt, cutoff))
    .orderBy(asc(formActionRuns.createdAt), asc(formActionRuns.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

const selectAgedSubmissionIds = async (
  exec: FormSubmissionsRetentionExecutor,
  cutoff: Date,
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (limit <= 0) return [];
  const candidateQuery = exec
    .select({ id: formSubmissions.id })
    .from(formSubmissions)
    .where(lt(formSubmissions.createdAt, cutoff))
    .orderBy(asc(formSubmissions.createdAt), asc(formSubmissions.id))
    .limit(limit);
  const rows = lockForDelete
    ? await candidateQuery.for("update", { skipLocked: true })
    : await candidateQuery;
  return rows.map((row) => row.id);
};

// Children of the selected submissions, in the family delete order and capped
// at `limit`. The cap is what keeps a fan-out of many runs per submission from
// blowing the family batch budget; a capped-out read simply defers the rest of
// the child sweep (and the submissions behind it) to a later batch.
const selectChildRunIds = async (
  exec: FormSubmissionsRetentionExecutor,
  submissionIds: readonly string[],
  limit: number,
  lockForDelete: boolean
): Promise<string[]> => {
  if (submissionIds.length === 0 || limit <= 0) return [];
  const childQuery = exec
    .select({ id: formActionRuns.id })
    .from(formActionRuns)
    .where(inArray(formActionRuns.submissionId, [...submissionIds]))
    .orderBy(asc(formActionRuns.createdAt), asc(formActionRuns.id))
    .limit(limit);
  const rows = lockForDelete
    ? await childQuery.for("update", { skipLocked: true })
    : await childQuery;
  return rows.map((row) => row.id);
};

const deleteRunIds = async (
  exec: FormSubmissionsRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec.delete(formActionRuns).where(inArray(formActionRuns.id, [...ids]));
  return deletedCountOf(result);
};

const deleteSubmissionIds = async (
  exec: FormSubmissionsRetentionExecutor,
  ids: readonly string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await exec.delete(formSubmissions).where(inArray(formSubmissions.id, [...ids]));
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

// One batch: (1) oldest aged action runs, (2) oldest aged submissions with the
// remaining family budget, (3) the runs that still reference those
// submissions, then (4) the submissions themselves. Every delete is priced
// into one family ledger: the child sweep is capped at the full `batchSize`,
// and because a short child read is a complete child read, the submissions
// behind it are provably run-free before any of them is deleted. Children
// count toward the per-batch cap, so `matched`/`deleted` never exceed
// `batchSize`.
const runBatchInExecutor = async (
  policy: FormSubmissionsRetentionPolicy,
  now: Date,
  exec: FormSubmissionsRetentionExecutor
): Promise<FormSubmissionsRetentionBatchResult> => {
  const cutoff = cutoffFor(now, policy.maxAgeDays);
  const lockForDelete = !policy.dryRun;

  const agedRunIds = await selectAgedRunIds(exec, cutoff, policy.batchSize, lockForDelete);
  const submissionBudget = policy.batchSize - agedRunIds.length;
  const submissionIds = await selectAgedSubmissionIds(
    exec,
    cutoff,
    submissionBudget,
    lockForDelete
  );
  const childRunIds = await selectChildRunIds(exec, submissionIds, policy.batchSize, lockForDelete);

  // The ledger: children spend the head of the budget, submissions the next
  // slice (empty whenever the child read filled the batch, i.e. exactly when
  // some of their runs are still pending), and standalone aged runs whatever
  // is left.
  const submissionAllowance = policy.batchSize - childRunIds.length;
  const submissionPlan = submissionIds.slice(0, submissionAllowance);
  const agedRunAllowance = policy.batchSize - childRunIds.length - submissionPlan.length;
  const agedRunPlan = agedRunIds.slice(0, agedRunAllowance);

  let deleted = 0;
  if (!policy.dryRun) {
    deleted += await deleteRunIds(exec, agedRunPlan);
    // Child-first: a submission is only deleted after every run that still
    // points at it is gone.
    deleted += await deleteRunIds(exec, childRunIds);
    deleted += await deleteSubmissionIds(exec, submissionPlan);
  }

  return Object.freeze({
    family: policy.family,
    matched: agedRunPlan.length + submissionPlan.length + childRunIds.length,
    deleted,
    dryRun: policy.dryRun,
  });
};

// ---------------------------------------------------------------------------
// Public API: one bounded batch, then the bounded run loop
// ---------------------------------------------------------------------------

export async function pruneFormSubmissionsBatch(
  policy: FormSubmissionsRetentionPolicy,
  now: Date,
  exec: FormSubmissionsRetentionExecutor = db
): Promise<FormSubmissionsRetentionBatchResult> {
  assertValidPolicy(policy);
  try {
    return await runBatchInExecutor(policy, now, exec);
  } catch (error) {
    if (error instanceof Error && error.message === RETENTION_POLICY_INVALID) throw error;
    throw new Error(RETENTION_BATCH_FAILED);
  }
}

export async function runFormSubmissionsRetention(
  now: Date = new Date(),
  exec: FormSubmissionsRetentionExecutor = db
): Promise<FormSubmissionsRetentionRunSummary> {
  const policy = resolveFormSubmissionsRetentionPolicy();
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
    const result = await pruneFormSubmissionsBatch(policy, now, exec);
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
