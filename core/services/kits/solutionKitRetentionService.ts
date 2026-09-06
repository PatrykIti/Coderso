// TASK-551-06-L01: bounded, fail-closed retention graph for the Solution Kit
// install/rollback family. Family row (policy matrix): env prefix
// `RETENTION_SOLUTION_KIT_RUNS_`, DISABLED by default, 365-day age bound within
// `[30, 3650]`, and no plain age cutoff — eligibility is the graph predicate
// below, and the delete order is `progress/owner/evidence/items and rollback
// children before source runs`.
//
// One graph predicate, not a newest-anchor heuristic: a candidate source run is
// deletable only when its COMPLETE connected graph re-verifies — no unreleased
// `solution_kit_starter_apply_owners` row references it; no running rollback
// owner references it, and the terminal owner carries the typed proof columns
// plus a matching independently recomputed combined-progress digest (`zero_net`
// for a failed owner, `complete` for the sole successful rollback); the
// normalized legacy template evidence/progress, the source core items, and the
// mutation/compensation invalidation receipts are no longer needed to resume,
// prove zero net, or replay the terminal response; and no newer same-package
// successful apply can still change the restored-predecessor eligibility of this
// source.
//
// Bounding: one batch starts from at most `batchSize` age candidates, classifies
// them with indexed existence/count probes plus `LIMIT 2001` physical-row
// sentinels (never an unbounded descendant graph), and deletes AT MOST ONE fully
// reverified atomic unit. Repeated batches drain arbitrarily many terminal
// failed retries one owner at a time; the hard 2,000-row cap bounds every
// transaction. Every delete is child-first and every proof row dies in the same
// transaction as its owner, so a crash leaves either the complete verifiable
// owner or no owner; the self-FK stays `ON DELETE RESTRICT`, so no partial
// transaction can make a source eligible. A missing, oversized, contradictory,
// or digest-mismatched graph is skipped without deletion.
//
// Ownership: NO inline/request-path trigger — install and rollback runs persist
// and return. The maintenance scheduler (TASK-551-06-L03) owns invocation; this
// module owns the transaction boundary of its one atomic unit. Direct calls
// never acquire the scheduler's advisory lock. Historical `options` are never
// inspected for authority and no query filters on a JSON column.

import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db } from "../../db/client";
import {
  solutionKitInstallItems,
  solutionKitInstallRuns,
  solutionKitLegacyRollbackProgress,
  solutionKitLegacyTemplateEvidence,
  solutionKitStarterApplyOwners,
} from "../../db/schema";
import {
  LEGACY_COMBINED_OPERATION_LIMIT,
  LegacyRollbackProgressDigestError,
  buildLegacyCombinedPositionMap,
  buildLegacyRollbackCombinedProgressDigest,
  buildLegacyRollbackInstallItemDigest,
  buildLegacyTemplateRollbackProgressDigest,
  buildLegacyTemplateSourceEvidenceDigest,
  buildLegacyTemplateStateDigest,
  type LegacyRollbackCombinedProgressMemberV1,
  type StrictJsonObject,
} from "./legacyRollbackProgressDigest";

// --- Stable codes + family identity ---

const RETENTION_POLICY_INVALID = "retention_policy_invalid";
const RETENTION_BATCH_FAILED = "retention_batch_failed";

export const SOLUTION_KIT_RETENTION_PROOF_INVALID = "solution_kit_retention_proof_invalid";
export const SOLUTION_KIT_RETENTION_GRAPH_LIMIT_EXCEEDED =
  "solution_kit_retention_graph_limit_exceeded";

/** A classified candidate that is not deletable right now (fail closed). */
export const SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED = "solution_kit_retention_graph_unresolved";

export const SOLUTION_KIT_RUNS_RETENTION_FAMILY = "solution_kit_runs" as const;
export const SOLUTION_KIT_RUNS_RETENTION_ENV_PREFIX = "RETENTION_SOLUTION_KIT_RUNS_";

const DEFAULT_MAX_AGE_DAYS = 365;
const MIN_MAX_AGE_DAYS = 30;
const MAX_MAX_AGE_DAYS = 3_650;
const DEFAULT_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 2_000;
const DEFAULT_MAX_BATCHES_PER_RUN = 10;
const MIN_MAX_BATCHES_PER_RUN = 1;
const MAX_MAX_BATCHES_PER_RUN = 100;

/**
 * `LIMIT 2001` sentinel: one more physical row than the hard 2,000-row cap can
 * ever delete. Observing it means the graph exceeds the contract: corruption,
 * skipped, never truncated.
 */
const GRAPH_SENTINEL_LIMIT = 2_001;
const HARD_DELETE_CAP = 2_000;
// Local spelling of the oversized-graph skip code; the identical string value.
const GRAPH_LIMIT_EXCEEDED = SOLUTION_KIT_RETENTION_GRAPH_LIMIT_EXCEEDED;

export const SOLUTION_KIT_RETENTION_GRAPH_SENTINEL_LIMIT = GRAPH_SENTINEL_LIMIT;
export const SOLUTION_KIT_RETENTION_HARD_DELETE_CAP = HARD_DELETE_CAP;
export const SOLUTION_KIT_RETENTION_COMBINED_OPERATION_LIMIT = LEGACY_COMBINED_OPERATION_LIMIT;

// Only the two documented family knobs exist; anything else under the family
// prefix fails closed instead of winning by rename.
const KNOWN_FAMILY_ENV_SUFFIXES = new Set(["ENABLED", "MAX_AGE_DAYS"]);

// --- Types ---

export type SolutionKitRunsRetentionPolicy = Readonly<{
  family: typeof SOLUTION_KIT_RUNS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  batchSize: number;
  maxBatchesPerRun: number;
}>;

/** The one atomic unit a batch may delete. */
export type SolutionKitRetentionUnitKind =
  "failed_rollback_owner" | "completed_source_graph" | "terminal_source_only";

export type SolutionKitRetentionCandidateOutcome = Readonly<{
  sourceRunId: string;
  action: "deleted" | "skipped" | "planned";
  unitKind?: SolutionKitRetentionUnitKind;
  /** Skip/limit code (`solution_kit_retention_*`); absent when actionable. */
  code?: string;
  /** Physical rows the unit deletes (or would delete when observational). */
  rows?: number;
}>;

export type SolutionKitRetentionBatchResult = Readonly<{
  family: typeof SOLUTION_KIT_RUNS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  candidates: number;
  units: number;
  rows: number;
  outcomes: readonly SolutionKitRetentionCandidateOutcome[];
}>;

export type SolutionKitRetentionRunSummary = Readonly<{
  family: typeof SOLUTION_KIT_RUNS_RETENTION_FAMILY;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  candidates: number;
  units: number;
  rows: number;
}>;

// Shared delete/select/transaction capability so `db` and a drizzle transaction
// handle both satisfy it; lock, recheck, and delete are one atomic unit here.
export type SolutionKitRetentionExecutor = Pick<typeof db, "select" | "delete" | "transaction">;

type RetentionEnv = Readonly<Record<string, string | undefined>>;

type RunRow = Readonly<{
  id: string;
  kitId: string;
  mode: string;
  status: string;
  rollbackOfRunId: string | null;
  rollbackProofVersion: number | null;
  rollbackProofKind: string | null;
  rollbackProofDigest: string | null;
  createdAt: Date;
}>;

type ItemRow = typeof solutionKitInstallItems.$inferSelect;
type EvidenceRow = typeof solutionKitLegacyTemplateEvidence.$inferSelect;
type ProgressRow = typeof solutionKitLegacyRollbackProgress.$inferSelect;

/** A fully reverified, bounded atomic delete unit. */
type VerifiedUnit = Readonly<{
  sourceRunId: string;
  /** `null` only for a terminal source with no rollback relation. */
  rollbackRunId: string | null;
  unitKind: SolutionKitRetentionUnitKind;
  rows: number;
  sourceItemIds: readonly string[];
  rollbackItemIds: readonly string[];
}>;

// --- Strict, fail-closed configuration ---

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

// The [min, max] bound pair of each integer knob, spread into its strict read.
const AGE_BOUNDS = [MIN_MAX_AGE_DAYS, MAX_MAX_AGE_DAYS] as const;
const BATCH_BOUNDS = [MIN_BATCH_SIZE, MAX_BATCH_SIZE] as const;
const BATCHES_BOUNDS = [MIN_MAX_BATCHES_PER_RUN, MAX_MAX_BATCHES_PER_RUN] as const;
const MAX_AGE_KEY = `${SOLUTION_KIT_RUNS_RETENTION_ENV_PREFIX}MAX_AGE_DAYS`;

export function resolveSolutionKitRunsRetentionPolicy(
  env: RetentionEnv = process.env
): SolutionKitRunsRetentionPolicy {
  rejectUnknownFamilyKeys(env, SOLUTION_KIT_RUNS_RETENTION_ENV_PREFIX);
  return Object.freeze({
    family: SOLUTION_KIT_RUNS_RETENTION_FAMILY,
    // Disabled by contract: nothing is deleted until explicitly enabled.
    enabled: readStrictBoolean(env, `${SOLUTION_KIT_RUNS_RETENTION_ENV_PREFIX}ENABLED`, false),
    // Sole dry-run source: the global strict boolean. No family override.
    dryRun: readStrictBoolean(env, "RETENTION_DRY_RUN", false),
    maxAgeDays: readBoundedInteger(env, MAX_AGE_KEY, DEFAULT_MAX_AGE_DAYS, ...AGE_BOUNDS),
    batchSize: readBoundedInteger(env, "RETENTION_BATCH_SIZE", DEFAULT_BATCH_SIZE, ...BATCH_BOUNDS),
    maxBatchesPerRun: readBoundedInteger(
      env,
      "RETENTION_MAX_BATCHES_PER_RUN",
      DEFAULT_MAX_BATCHES_PER_RUN,
      ...BATCHES_BOUNDS
    ),
  });
}

// Defense in depth for direct callers that hand-build a policy.
const assertValidSolutionKitPolicy = (policy: SolutionKitRunsRetentionPolicy): void => {
  const inRange = (value: number, min: number, max: number): boolean =>
    Number.isSafeInteger(value) && value >= min && value <= max;
  if (
    policy.family !== SOLUTION_KIT_RUNS_RETENTION_FAMILY ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.dryRun !== "boolean" ||
    !inRange(policy.maxAgeDays, MIN_MAX_AGE_DAYS, MAX_MAX_AGE_DAYS) ||
    !inRange(policy.batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE) ||
    !inRange(policy.maxBatchesPerRun, MIN_MAX_BATCHES_PER_RUN, MAX_MAX_BATCHES_PER_RUN)
  ) {
    throw new Error(RETENTION_POLICY_INVALID);
  }
};

// --- Bounded probe primitives — indexed reads plus LIMIT 2001 sentinels only ---

const runColumns = {
  id: solutionKitInstallRuns.id,
  kitId: solutionKitInstallRuns.kitId,
  mode: solutionKitInstallRuns.mode,
  status: solutionKitInstallRuns.status,
  rollbackOfRunId: solutionKitInstallRuns.rollbackOfRunId,
  rollbackProofVersion: solutionKitInstallRuns.rollbackProofVersion,
  rollbackProofKind: solutionKitInstallRuns.rollbackProofKind,
  rollbackProofDigest: solutionKitInstallRuns.rollbackProofDigest,
  createdAt: solutionKitInstallRuns.createdAt,
};

const selectAgeCandidateRuns = async (
  exec: SolutionKitRetentionExecutor,
  cutoff: Date,
  limit: number
): Promise<readonly RunRow[]> =>
  exec
    .select(runColumns)
    .from(solutionKitInstallRuns)
    // Only apply runs are roots: a rollback run is a graph child that dies with
    // its own source and can never be aged out on its own.
    .where(
      and(eq(solutionKitInstallRuns.mode, "apply"), lt(solutionKitInstallRuns.createdAt, cutoff))
    )
    .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id))
    .limit(limit);

const lockSourceRun = async (
  exec: SolutionKitRetentionExecutor,
  sourceRunId: string
): Promise<RunRow | null> => {
  const [row] = await exec
    .select(runColumns)
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.id, sourceRunId))
    .for("update", { skipLocked: true })
    .limit(1);
  return row ?? null;
};

const hasOwner = async (
  exec: SolutionKitRetentionExecutor,
  sourceRunId: string,
  released: boolean
): Promise<boolean> => {
  const rows = await exec
    .select({ sourceRunId: solutionKitStarterApplyOwners.sourceRunId })
    .from(solutionKitStarterApplyOwners)
    .where(
      and(
        eq(solutionKitStarterApplyOwners.sourceRunId, sourceRunId),
        released
          ? isNotNull(solutionKitStarterApplyOwners.releasedAt)
          : isNull(solutionKitStarterApplyOwners.releasedAt)
      )
    )
    .limit(1);
  return rows.length > 0;
};

const selectRollbackRuns = async (
  exec: SolutionKitRetentionExecutor,
  sourceRunId: string
): Promise<readonly RunRow[]> =>
  exec
    .select(runColumns)
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.rollbackOfRunId, sourceRunId))
    .orderBy(asc(solutionKitInstallRuns.createdAt), asc(solutionKitInstallRuns.id))
    .limit(GRAPH_SENTINEL_LIMIT);

const selectItemsByRun = async (
  exec: SolutionKitRetentionExecutor,
  runId: string
): Promise<readonly ItemRow[]> =>
  exec
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
    .limit(GRAPH_SENTINEL_LIMIT);

const selectEvidenceBySource = async (
  exec: SolutionKitRetentionExecutor,
  sourceRunId: string
): Promise<readonly EvidenceRow[]> =>
  exec
    .select()
    .from(solutionKitLegacyTemplateEvidence)
    .where(eq(solutionKitLegacyTemplateEvidence.sourceRunId, sourceRunId))
    .orderBy(asc(solutionKitLegacyTemplateEvidence.sourcePosition))
    .limit(GRAPH_SENTINEL_LIMIT);

const selectProgressByRollback = async (
  exec: SolutionKitRetentionExecutor,
  rollbackRunId: string
): Promise<readonly ProgressRow[]> =>
  exec
    .select()
    .from(solutionKitLegacyRollbackProgress)
    .where(eq(solutionKitLegacyRollbackProgress.rollbackRunId, rollbackRunId))
    .orderBy(asc(solutionKitLegacyRollbackProgress.sourcePosition))
    .limit(GRAPH_SENTINEL_LIMIT);

const hasNewerSuccessfulApply = async (
  exec: SolutionKitRetentionExecutor,
  candidate: RunRow
): Promise<boolean> => {
  // A newer same-package successful apply can still change which historical
  // state is the active source or the restored predecessor, so this source is
  // not yet eligible (served by `solution_kit_runs_successful_apply_order_idx`).
  const rows = await exec
    .select({ id: solutionKitInstallRuns.id })
    .from(solutionKitInstallRuns)
    .where(
      and(
        eq(solutionKitInstallRuns.kitId, candidate.kitId),
        eq(solutionKitInstallRuns.mode, "apply"),
        eq(solutionKitInstallRuns.status, "success"),
        isNotNull(solutionKitInstallRuns.finishedAt),
        sql`(${solutionKitInstallRuns.createdAt}, ${solutionKitInstallRuns.id}) > (${candidate.createdAt}::timestamp, ${candidate.id}::uuid)`
      )
    )
    .orderBy(desc(solutionKitInstallRuns.createdAt), desc(solutionKitInstallRuns.id))
    .limit(1);
  return rows.length > 0;
};

// --- Proof recomputation — never trusted from a column: rebuilt, then compared ---

const strictJsonObject = (value: unknown): StrictJsonObject | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new LegacyRollbackProgressDigestError("legacy_rollback_digest_value_invalid");
  }
  return value as StrictJsonObject;
};

const INSTALL_ITEM_CONTRACT = "coderso.legacy-rollback-install-item@v1";

const itemDigest = (row: ItemRow, runId: string): string => {
  const beforeSnapshot = strictJsonObject(row.beforeSnapshot);
  const afterSnapshot = strictJsonObject(row.afterSnapshot);
  const rollbackAction = strictJsonObject(row.rollbackAction);
  return buildLegacyRollbackInstallItemDigest({
    contract: INSTALL_ITEM_CONTRACT,
    id: row.id,
    runId,
    position: row.position,
    resourceType: row.resourceType as "content_type" | "form" | "page" | "menu",
    resourceKey: row.resourceKey,
    operation: row.operation as "create" | "update" | "noop" | "delete" | "restore",
    status: row.status as "planned" | "success" | "failed" | "skipped",
    beforeSnapshot,
    afterSnapshot,
    rollbackAction,
  });
};

/**
 * One tagged legacy template state digest, rebuilt from a locked projection:
 * the absent state, or the present state of one strict snapshot. Same
 * jsonb-to-strict handoff as the builders below: the builder re-validates the
 * snapshot grammar, so asserting the narrowed input view is safe.
 */
const templateStateDigest = (snapshot: StrictJsonObject | null): string =>
  buildLegacyTemplateStateDigest({
    contract: "coderso.legacy-template-state@v1",
    state: snapshot === null ? { present: false } : { present: true, snapshot },
  } as unknown as Parameters<typeof buildLegacyTemplateStateDigest>[0]);

/**
 * Recomputes the two state digests a progress row's preimage carries, from the
 * locked source-evidence projection: the successful source's after-state, and
 * the rollback-restored state (absent for a create, the before-snapshot for an
 * update; a noop has no mutation target and may only pair with
 * `failed_no_mutation`). Persisted digest columns are never read here.
 */
const recomputeProgressStateDigests = (
  evidence: EvidenceRow,
  progress: ProgressRow
): { sourceAfterDigest: string; rollbackTargetDigest: string | null } => {
  if (evidence.status !== "success" || progress.sourceStatus !== "success") {
    throw new LegacyRollbackProgressDigestError("legacy_rollback_digest_value_invalid");
  }
  const sourceAfterDigest = templateStateDigest(strictJsonObject(evidence.afterSnapshot));
  if (progress.state === "failed_no_mutation") {
    return { sourceAfterDigest, rollbackTargetDigest: null };
  }
  if (evidence.operation === "create") {
    return { sourceAfterDigest, rollbackTargetDigest: templateStateDigest(null) };
  }
  if (evidence.operation === "update") {
    return {
      sourceAfterDigest,
      rollbackTargetDigest: templateStateDigest(strictJsonObject(evidence.beforeSnapshot)),
    };
  }
  // A noop source has no mutation to commit or restore: a mutation-state
  // progress row over noop evidence is a contradiction.
  throw new LegacyRollbackProgressDigestError("legacy_rollback_digest_value_invalid");
};

/**
 * Rebuilds the terminal combined-progress input from the normalized rows of one
 * source/rollback pair and returns the digest to compare with the typed run
 * proof. Members exist only where both sides of a position exist — a source item
 * with its terminal rollback item, or template evidence with its progress row —
 * and the combined builder itself enforces the grammar, contiguity, and
 * uniqueness that make the reconstruction exact; any contradiction therefore
 * surfaces as a digest mismatch (or a builder rejection), never as a delete.
 */
const recomputeCombinedProgressDigest = (
  sourceRunId: string,
  rollbackRunId: string,
  sourceItems: readonly ItemRow[],
  rollbackItems: readonly ItemRow[],
  evidence: readonly EvidenceRow[],
  progress: readonly ProgressRow[]
): string => {
  const map = buildLegacyCombinedPositionMap({
    coreCount: sourceItems.length,
    templateCount: evidence.length,
  });

  const rollbackByPosition = new Map<number, ItemRow>();
  for (const row of rollbackItems) rollbackByPosition.set(row.position, row);
  const progressBySourcePosition = new Map<number, ProgressRow>();
  for (const row of progress) progressBySourcePosition.set(row.sourcePosition, row);

  const members: LegacyRollbackCombinedProgressMemberV1[] = [];
  for (const entry of map.core) {
    const sourceItem = sourceItems[entry.sourcePosition];
    const rollbackItem = rollbackByPosition.get(entry.rollbackPosition);
    if (!sourceItem || !rollbackItem) continue;
    if (rollbackItem.resourceKey !== sourceItem.resourceKey) continue;
    members.push({
      kind: "core",
      sourcePosition: entry.sourcePosition,
      rollbackPosition: entry.rollbackPosition,
      sourceItemId: sourceItem.id,
      sourceItemDigest: itemDigest(sourceItem, sourceRunId),
      rollbackItemId: rollbackItem.id,
      rollbackItemDigest: itemDigest(rollbackItem, rollbackRunId),
    });
  }

  for (const entry of map.template) {
    const evidenceRow = evidence.find((row) => row.sourcePosition === entry.sourcePosition);
    if (!evidenceRow) continue;
    const progressRow = progressBySourcePosition.get(entry.sourcePosition);
    if (!progressRow) continue;
    if (
      progressRow.rollbackPosition !== entry.rollbackPosition ||
      progressRow.sourceEvidenceId !== evidenceRow.id ||
      progressRow.sourceEvidenceDigest !== evidenceRow.evidenceDigest
    ) {
      continue;
    }
    // Both template member digests are RECOMPUTED from the persisted row
    // projections: a changed snapshot/progress/event/position must surface as a
    // combined mismatch (proof_invalid), never as a delete — the persisted
    // `evidence_digest`/`progress_digest` columns are comparison data only.
    const evidenceDigest = buildLegacyTemplateSourceEvidenceDigest({
      contract: "coderso.legacy-template-evidence@v1",
      sourceRunId: evidenceRow.sourceRunId,
      sourcePosition: evidenceRow.sourcePosition,
      templateKey: evidenceRow.templateKey,
      planDigest: evidenceRow.planDigest,
      templateId: evidenceRow.templateId,
      operation: evidenceRow.operation as "create" | "update" | "noop",
      status: evidenceRow.status as "success" | "failed" | "skipped",
      beforeSnapshot: strictJsonObject(evidenceRow.beforeSnapshot),
      afterSnapshot: strictJsonObject(evidenceRow.afterSnapshot),
      rollbackAction: strictJsonObject(evidenceRow.rollbackAction),
      safeErrorCode: evidenceRow.safeErrorCode,
      // The jsonb projections arrive untyped; the builder re-validates the full
      // state/operation matrix itself, so the narrowed view is safe to assert.
    } as unknown as Parameters<typeof buildLegacyTemplateSourceEvidenceDigest>[0]);
    const state = recomputeProgressStateDigests(evidenceRow, progressRow);
    const progressDigest = buildLegacyTemplateRollbackProgressDigest({
      contract: "coderso.legacy-template-rollback-progress@v1",
      rollbackRunId: progressRow.rollbackRunId,
      sourceRunId: progressRow.sourceRunId,
      sourceEvidenceId: progressRow.sourceEvidenceId,
      sourcePosition: progressRow.sourcePosition,
      rollbackPosition: progressRow.rollbackPosition,
      sourceStatus: progressRow.sourceStatus as "success",
      sourceEvidenceDigest: evidenceDigest,
      sourceAfterDigest: state.sourceAfterDigest,
      state: progressRow.state as "failed_no_mutation" | "rollback_committed" | "source_restored",
      rollbackTargetDigest: state.rollbackTargetDigest,
      mutationInvalidationEventKey: progressRow.mutationInvalidationEventKey,
      compensationInvalidationEventKey: progressRow.compensationInvalidationEventKey,
      // Same jsonb-to-strict handoff: the builder owns the state matrix check.
    } as unknown as Parameters<typeof buildLegacyTemplateRollbackProgressDigest>[0]);
    members.push({
      kind: "template",
      sourcePosition: entry.sourcePosition,
      rollbackPosition: entry.rollbackPosition,
      sourceEvidenceId: evidenceRow.id,
      sourceEvidenceDigest: evidenceDigest,
      progressDigest,
    });
  }

  members.sort((left, right) => left.sourcePosition - right.sourcePosition);
  return buildLegacyRollbackCombinedProgressDigest({
    contract: "coderso.legacy-rollback-combined-progress@v1",
    sourceRunId,
    rollbackRunId,
    members,
  });
};

// Terminality vocabularies of the delete-eligibility predicate. A `planned`
// item and a `planned`/`running` run have not happened yet, so hashing them is
// never terminal proof authority (doc L209-211, L424-427).
const TERMINAL_RUN_STATUSES = new Set<string>(["success", "failed"]);
const TERMINAL_ITEM_STATUSES = new Set<string>(["success", "failed", "skipped"]);

/** The row projections the graph predicate re-checks for terminality. */
export type SolutionKitRetentionGraphTerminalityInput = Readonly<{
  sourceStatus: string;
  sourceItemStatuses: readonly string[];
  rollbackStatuses: readonly string[];
  rollbackItemStatuses: readonly string[];
}>;

/**
 * The terminality gate: a graph is delete-eligible only while its source run is
 * terminal, every core source item has finished (never `planned`), and every
 * rollback receipt — the child run and its items — is terminal. A non-terminal
 * graph is NOT delete-eligible: the predicate skips it, it never deletes.
 */
export const solutionKitRetentionGraphIsTerminal = (
  graph: SolutionKitRetentionGraphTerminalityInput
): boolean =>
  TERMINAL_RUN_STATUSES.has(graph.sourceStatus) &&
  graph.rollbackStatuses.every((status) => TERMINAL_RUN_STATUSES.has(status)) &&
  graph.sourceItemStatuses.every((status) => TERMINAL_ITEM_STATUSES.has(status)) &&
  graph.rollbackItemStatuses.every((status) => TERMINAL_ITEM_STATUSES.has(status));

/**
 * Verifies one terminal rollback owner against its typed proof columns and the
 * rows it owns, returning the bounded unit to delete — or a stable skip code.
 * A nullable rollback receipt is never a nonterminal shorthand: a failed owner
 * must prove `zero_net`, a successful one `complete`.
 */
const verifyRollbackOwner = (
  rollbackRun: RunRow,
  source: RunRow,
  expectedKind: "zero_net" | "complete",
  sourceItems: readonly ItemRow[],
  evidence: readonly EvidenceRow[],
  rollbackItems: readonly ItemRow[],
  progress: readonly ProgressRow[]
): { ok: true; unit: VerifiedUnit } | { ok: false; code: string } => {
  // Terminality first: a digest written over planned (non-terminal) rows never
  // verifies its way into a delete, so the gate decides before any recompute.
  if (
    !solutionKitRetentionGraphIsTerminal({
      sourceStatus: source.status,
      sourceItemStatuses: sourceItems.map((row) => row.status),
      rollbackStatuses: [rollbackRun.status],
      rollbackItemStatuses: rollbackItems.map((row) => row.status),
    })
  ) {
    return { ok: false, code: SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED };
  }
  if (rollbackRun.rollbackProofVersion !== 1) {
    return { ok: false, code: SOLUTION_KIT_RETENTION_PROOF_INVALID };
  }
  if (rollbackRun.rollbackProofKind !== expectedKind || !rollbackRun.rollbackProofDigest) {
    return { ok: false, code: SOLUTION_KIT_RETENTION_PROOF_INVALID };
  }
  // Physical-row sentinels: more graph than the contract can delete atomically
  // is corruption, not a truncated delete.
  if (
    sourceItems.length > LEGACY_COMBINED_OPERATION_LIMIT ||
    rollbackItems.length > LEGACY_COMBINED_OPERATION_LIMIT ||
    evidence.length > LEGACY_COMBINED_OPERATION_LIMIT ||
    progress.length > LEGACY_COMBINED_OPERATION_LIMIT
  ) {
    return { ok: false, code: SOLUTION_KIT_RETENTION_GRAPH_LIMIT_EXCEEDED };
  }
  let digest: string;
  try {
    digest = recomputeCombinedProgressDigest(
      source.id,
      rollbackRun.id,
      sourceItems,
      rollbackItems,
      evidence,
      progress
    );
  } catch (error) {
    if (error instanceof LegacyRollbackProgressDigestError) {
      return { ok: false, code: SOLUTION_KIT_RETENTION_PROOF_INVALID };
    }
    throw error;
  }
  if (digest !== rollbackRun.rollbackProofDigest) {
    return { ok: false, code: SOLUTION_KIT_RETENTION_PROOF_INVALID };
  }
  const rollbackItemIds = rollbackItems.map((row) => row.id);
  const sourceItemIds = sourceItems.map((row) => row.id);
  const unitKind: SolutionKitRetentionUnitKind =
    expectedKind === "zero_net" ? "failed_rollback_owner" : "completed_source_graph";
  // Failed-owner units delete only their own progress/items plus the owner run;
  // the final graph unit additionally deletes the released owner, the
  // normalized evidence, the source items, and the source run itself.
  const rows =
    progress.length +
    rollbackItemIds.length +
    1 +
    (expectedKind === "zero_net" ? 0 : 1 + evidence.length + sourceItemIds.length + 1);
  if (rows > HARD_DELETE_CAP) return { ok: false, code: GRAPH_LIMIT_EXCEEDED };
  return {
    ok: true,
    unit: {
      sourceRunId: source.id,
      rollbackRunId: rollbackRun.id,
      unitKind,
      rows,
      sourceItemIds,
      rollbackItemIds,
    },
  };
};

// --- Child-first deletes: every proof row dies in its owner's transaction ---

/**
 * Deletes one verified unit child-first. A failed owner unit removes only its
 * own progress, rollback items, and owner run; the final graph unit additionally
 * removes the released owner, the normalized evidence, the source items, and the
 * source run itself. Owner and evidence reference the source run with ON DELETE
 * RESTRICT, so both die before the source run itself.
 */
const deleteVerifiedUnit = async (
  exec: SolutionKitRetentionExecutor,
  unit: VerifiedUnit
): Promise<void> => {
  const rollbackRunId = unit.rollbackRunId;
  if (rollbackRunId) {
    await exec
      .delete(solutionKitLegacyRollbackProgress)
      .where(eq(solutionKitLegacyRollbackProgress.rollbackRunId, rollbackRunId));
    if (unit.rollbackItemIds.length > 0) {
      await exec
        .delete(solutionKitInstallItems)
        .where(inArray(solutionKitInstallItems.id, [...unit.rollbackItemIds]));
    }
    await exec.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, rollbackRunId));
  }
  if (unit.unitKind === "failed_rollback_owner") return;
  await exec
    .delete(solutionKitStarterApplyOwners)
    .where(eq(solutionKitStarterApplyOwners.sourceRunId, unit.sourceRunId));
  await exec
    .delete(solutionKitLegacyTemplateEvidence)
    .where(eq(solutionKitLegacyTemplateEvidence.sourceRunId, unit.sourceRunId));
  if (unit.sourceItemIds.length > 0) {
    await exec
      .delete(solutionKitInstallItems)
      .where(inArray(solutionKitInstallItems.id, [...unit.sourceItemIds]));
  }
  await exec.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, unit.sourceRunId));
};

// --- Classification of one locked candidate ---

const classifyCandidate = async (
  exec: SolutionKitRetentionExecutor,
  candidate: RunRow,
  cutoff: Date
): Promise<VerifiedUnit | { skipped: string }> => {
  const skipped = (code: string) => ({ skipped: code });

  if (candidate.mode !== "apply") return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);

  // Canonical package/source lock: the recheck below runs against the locked
  // row, so a concurrent claim/release cannot race the delete.
  const source = await lockSourceRun(exec, candidate.id);
  if (!source || source.createdAt.getTime() >= cutoff.getTime()) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  if (!TERMINAL_RUN_STATUSES.has(source.status)) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  if (await hasOwner(exec, source.id, false)) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }

  const rollbackRuns = await selectRollbackRuns(exec, source.id);
  if (rollbackRuns.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
  if (rollbackRuns.some((row) => row.status === "running")) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  if (rollbackRuns.some((row) => row.status !== "success" && row.status !== "failed")) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  const successful = rollbackRuns.filter((row) => row.status === "success");
  const failed = rollbackRuns.filter((row) => row.status === "failed");
  if (successful.length > 1) return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);

  const sourceItems = await selectItemsByRun(exec, source.id);
  if (sourceItems.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
  const evidence = await selectEvidenceBySource(exec, source.id);
  if (evidence.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);

  // Drain the OLDEST terminal failed owner first, one atomic unit per batch.
  const oldestFailed = failed[0];
  if (oldestFailed) {
    const rollbackItems = await selectItemsByRun(exec, oldestFailed.id);
    if (rollbackItems.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
    const progress = await selectProgressByRollback(exec, oldestFailed.id);
    if (progress.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
    const verified = verifyRollbackOwner(
      oldestFailed,
      source,
      "zero_net",
      sourceItems,
      evidence,
      rollbackItems,
      progress
    );
    return verified.ok ? verified.unit : skipped(verified.code);
  }

  // No failed child remains: the complete source/sole-successful-rollback graph
  // may only go once its proof re-verifies and no newer apply can still claim
  // restored-predecessor eligibility.
  if (successful.length === 1) {
    if (await hasNewerSuccessfulApply(exec, source)) {
      return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
    }
    const rollbackRun = successful[0];
    const rollbackItems = await selectItemsByRun(exec, rollbackRun.id);
    if (rollbackItems.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
    const progress = await selectProgressByRollback(exec, rollbackRun.id);
    if (progress.length >= GRAPH_SENTINEL_LIMIT) return skipped(GRAPH_LIMIT_EXCEEDED);
    const verified = verifyRollbackOwner(
      rollbackRun,
      source,
      "complete",
      sourceItems,
      evidence,
      rollbackItems,
      progress
    );
    return verified.ok ? verified.unit : skipped(verified.code);
  }

  // A terminal source with no rollback relation at all: only its own items and
  // (at most) its released owner can go with it. Same terminality gate: a
  // source still carrying `planned` items is not deletable, rollback or not.
  if (await hasNewerSuccessfulApply(exec, source)) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  if (
    !solutionKitRetentionGraphIsTerminal({
      sourceStatus: source.status,
      sourceItemStatuses: sourceItems.map((row) => row.status),
      rollbackStatuses: [],
      rollbackItemStatuses: [],
    })
  ) {
    return skipped(SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED);
  }
  const releasedOwner = (await hasOwner(exec, source.id, true)) ? 1 : 0;
  // `deleteVerifiedUnit` removes the evidence rows beside the released owner, so
  // they count toward the hard cap like the complete path.
  const rows = sourceItems.length + evidence.length + releasedOwner + 1;
  if (rows > HARD_DELETE_CAP) return skipped(GRAPH_LIMIT_EXCEEDED);
  return {
    sourceRunId: source.id,
    rollbackRunId: null,
    unitKind: "terminal_source_only",
    rows,
    sourceItemIds: sourceItems.map((row) => row.id),
    rollbackItemIds: [],
  };
};

// --- Public API: one atomic batch, then the bounded run loop ---

/**
 * One bounded batch. Disabled mode and dry-run execute the same sentinel
 * classification (candidates, probes, proof recompute) with zero writes: the
 * actionable unit is reported as `planned` and nothing is deleted until the
 * family is explicitly enabled.
 */
export async function pruneSolutionKitRunsBatch(
  policy: SolutionKitRunsRetentionPolicy,
  now: Date,
  exec: SolutionKitRetentionExecutor = db
): Promise<SolutionKitRetentionBatchResult> {
  assertValidSolutionKitPolicy(policy);
  const cutoff = new Date(now.getTime() - policy.maxAgeDays * 24 * 60 * 60 * 1000);
  try {
    return await exec.transaction(async (tx) => {
      const candidates = await selectAgeCandidateRuns(tx, cutoff, policy.batchSize);
      const outcomes: SolutionKitRetentionCandidateOutcome[] = [];
      let units = 0;
      let rows = 0;
      for (const candidate of candidates) {
        // At most one atomic unit per batch: the oldest eligible candidate.
        if (units > 0) break;
        let verified: VerifiedUnit | { skipped: string };
        try {
          verified = await classifyCandidate(tx, candidate, cutoff);
        } catch (error) {
          if (
            error instanceof LegacyRollbackProgressDigestError ||
            (error instanceof Error &&
              (error.message === SOLUTION_KIT_RETENTION_PROOF_INVALID ||
                error.message === SOLUTION_KIT_RETENTION_GRAPH_LIMIT_EXCEEDED))
          ) {
            verified = { skipped: SOLUTION_KIT_RETENTION_PROOF_INVALID };
          } else {
            throw error;
          }
        }
        if ("skipped" in verified) {
          outcomes.push({
            sourceRunId: candidate.id,
            action: "skipped",
            code: verified.skipped,
          });
          continue;
        }
        units += 1;
        rows += verified.rows;
        // Disabled mode and dry-run run the same sentinel classification with
        // zero writes: the unit is reported as planned, never deleted.
        const observational = policy.dryRun || !policy.enabled;
        const action: "deleted" | "planned" = observational ? "planned" : "deleted";
        outcomes.push({
          sourceRunId: candidate.id,
          action,
          unitKind: verified.unitKind,
          rows: verified.rows,
        });
        if (observational) continue;
        await deleteVerifiedUnit(tx, verified);
      }
      return Object.freeze({
        family: policy.family,
        enabled: policy.enabled,
        dryRun: policy.dryRun,
        candidates: candidates.length,
        units,
        rows,
        outcomes: Object.freeze(outcomes),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === RETENTION_POLICY_INVALID) throw error;
    throw new Error(RETENTION_BATCH_FAILED);
  }
}

export async function runSolutionKitRunsRetention(
  now: Date = new Date(),
  exec: SolutionKitRetentionExecutor = db
): Promise<SolutionKitRetentionRunSummary> {
  const policy = resolveSolutionKitRunsRetentionPolicy();
  // The scheduler-facing loop keeps the disabled fast path: a disabled family
  // is never probed on a timer. The batch API above still classifies disabled
  // graphs with zero writes.
  if (!policy.enabled) {
    return Object.freeze({
      family: policy.family,
      enabled: false,
      dryRun: policy.dryRun,
      batches: 0,
      candidates: 0,
      units: 0,
      rows: 0,
    });
  }
  let batches = 0;
  let candidates = 0;
  let units = 0;
  let rows = 0;
  while (batches < policy.maxBatchesPerRun) {
    const result = await pruneSolutionKitRunsBatch(policy, now, exec);
    batches += 1;
    candidates += result.candidates;
    units += result.units;
    rows += result.rows;
    // A batch with no actionable unit means the graph is fully drained.
    if (result.units === 0) break;
  }
  return Object.freeze({
    family: policy.family,
    enabled: true,
    dryRun: policy.dryRun,
    batches,
    candidates,
    units,
    rows,
  });
}
