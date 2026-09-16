// TASK-551-06-L02: concurrency-safe, bounded revision retention.
//
// Owns the five-family revision pruner that discharges the `revisions`
// exemption in `appendHeavyRetentionRegistry.ts` — the "count-plus-age"
// policy: a row is eligible only when it is BOTH older than the age cutoff
// AND outside the newest-count floor. Family -> table:
//   page            -> page_revisions             (core/db/tables/pages.ts)
//   widget_template -> widget_template_revisions  (core/db/tables/widgets.ts)
//   detail_page     -> detail_page_revisions      (core/db/tables/pages.ts)
//   entry           -> content_revisions          (core/db/tables/content.ts)
//   post            -> post_revisions             (core/db/tables/posts.ts)
// The widget-template member is legacy-table retention-only (no live writer
// remains after TASK-580); entry/post adoption is TASK-551-09. This module
// only prunes: it never allocates and never acquires L03's scheduler advisory
// lock — scheduled use is serialized once by TASK-551-06-L03, which consumes
// `runRevisionFamilyRetention` as-is (export shapes are frozen for it).
//
// Anchors (always survive). The page/detail parents carry the live document
// inline (`pages.current_data`/`published_data`,
// `detail_page_documents.current_document`/`published_document`), not a
// revision-ID pointer column, and no revision table has a protected flag —
// verified across core/db/tables/{pages,content,posts,widgets}.ts and the page
// read path — so the anchor set is structural, not pointer-based:
//  1. keep-newest floor — the newest `keepNewestPerParent` rows per parent
//     (`version DESC, id DESC`) are never candidates, so the row standing for
//     the current document lineage survives for every family;
//  2. published anchor — on the kind-bearing families (page, detail_page) a
//     row is protected by this anchor exactly when no same-parent
//     `kind='publish'` row is strictly newer in `(version, id)` order; i.e.
//     the entire lineage from the newest publish row upward survives (the
//     published-snapshot lineage the parent's
//     `published_data`/`published_document` mirrors), even when history
//     outgrows the floor;
//  3. age boundary — a row exactly at the cutoff is retained (`column < now -
//     age`, via L01's `computeRetentionCutoff`). Other parents' rows are out
//     of scope by construction.
//
// Ordering. The contract order `version ASC, id ASC` governs the per-parent
// drain (`pruneParentRevisions`, served by the per-parent version indexes);
// the whole-family drain orders `created_at ASC, id ASC` — the TASK-551-05
// `*_revisions_retention_idx` scan order — because a global `(version, id)`
// order is not index-servable and would full scan. Eligibility is
// order-invariant; both orders are deterministic.
//
// Batching. Batch size/budget come only from L01's `resolveRetentionBatchSize`
// /`resolveRetentionMaxBatchesPerRun` (500/2,000 and 10/100). Each apply batch
// takes one `FOR UPDATE SKIP LOCKED` bounded candidate read and deletes exactly
// the locked IDs; the driver-accurate count is the `.returning()` row-list
// length (`rowCount` is never read — the only `count(*)` in play is the
// in-SQL keep-newest probe, compared in SQL, never in JS). The drain loop ends
// on an empty batch, a batch that deletes nothing, or budget exhaustion.
//
// Dry-run. No revision-family dry-run env key exists: the sole global source
// is L01's strict `RETENTION_DRY_RUN` (via `resolveRetentionDryRun`), plus a
// typed direct-service override. Dry-run executes only the LIMIT-bounded
// candidate read — no row lock, no delete, no persisted change — reporting the
// bounded candidate count as `matched` with `deleted = 0`.
//
// Env keys: `RETENTION_{PAGE,WIDGET_TEMPLATE,DETAIL_PAGE,ENTRY,POST}_REVISIONS_
// {ENABLED,MAX_AGE_DAYS,KEEP_NEWEST_PER_PARENT}` — ENABLED is exact lowercase
// `true|false`, numeric keys are canonical integers, out-of-range rejects
// (never clamps), any other key under the prefix fails closed. Defaults:
// enabled true, maxAgeDays 180 in [30, 2555], keepNewestPerParent 50 in
// [1, 500]. These five families are NOT members of L01's closed 14-member
// `RetentionPolicy.family` set, so nothing here passes them through
// `normalizeRetentionPolicy`; the leaf-local normalizer mirrors its shape.

import { and, asc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import {
  contentRevisions,
  detailPageRevisions,
  pageRevisions,
  postRevisions,
  widgetTemplateRevisions,
} from "../../db/schema";
import type { RevisionFamily } from "../database/revisionAllocation";
import {
  RETENTION_BATCH_SIZE_MAX,
  RETENTION_BATCH_SIZE_MIN,
  RETENTION_MAX_BATCHES_PER_RUN_MAX,
  RETENTION_MAX_BATCHES_PER_RUN_MIN,
  RetentionPolicyError,
  computeRetentionCutoff,
  resolveRetentionBatchSize,
  resolveRetentionDryRun,
  resolveRetentionMaxBatchesPerRun,
  type RuntimeEnv,
} from "../maintenance/retentionPolicy";

/** Machine-readable failure code for a failed retention batch. */
export const REVISION_RETENTION_BATCH_FAILED = "retention_batch_failed";

export const REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS = 180;
export const REVISION_RETENTION_MIN_MAX_AGE_DAYS = 30;
export const REVISION_RETENTION_MAX_MAX_AGE_DAYS = 2_555;
export const REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT = 50;
export const REVISION_RETENTION_MIN_KEEP_NEWEST_PER_PARENT = 1;
export const REVISION_RETENTION_MAX_KEEP_NEWEST_PER_PARENT = 500;

const DAY_BOUNDS = [
  REVISION_RETENTION_MIN_MAX_AGE_DAYS,
  REVISION_RETENTION_MAX_MAX_AGE_DAYS,
] as const;
const KEEP_BOUNDS = [
  REVISION_RETENTION_MIN_KEEP_NEWEST_PER_PARENT,
  REVISION_RETENTION_MAX_KEEP_NEWEST_PER_PARENT,
] as const;

/** Closed five-family order (contract-pinned identifiers, frozen for L03). */
export const REVISION_RETENTION_FAMILY_ORDER = [
  "page",
  "widget_template",
  "detail_page",
  "entry",
  "post",
] as const;

// --- Family -> table map ---------------------------------------------------

type RevisionFamilySpec = Readonly<{
  table: PgTable;
  parentColumn: PgColumn;
  /** Physical parent column name, referenced inside the aliased probes. */
  parentColumnSql: string;
  versionColumn: PgColumn;
  createdAtColumn: PgColumn;
  idColumn: PgColumn;
  /** Present only on the page/detail tables that carry a publish marker. */
  kindColumn: PgColumn | null;
  envPrefix: string;
}>;

/** Every revision table shares the `id`/`version`/`created_at` column shape. */
type RevisionTableColumns = { id: PgColumn; version: PgColumn; createdAt: PgColumn };

const defineFamilySpec = (
  table: PgTable & RevisionTableColumns,
  parentColumn: PgColumn,
  parentColumnSql: string,
  kindColumn: PgColumn | null,
  envPrefix: string
): RevisionFamilySpec => ({
  table,
  parentColumn,
  parentColumnSql,
  versionColumn: table.version,
  createdAtColumn: table.createdAt,
  idColumn: table.id,
  kindColumn,
  envPrefix,
});

const REVISION_FAMILY_SPECS: Readonly<Record<RevisionFamily, RevisionFamilySpec>> = {
  page: defineFamilySpec(
    pageRevisions,
    pageRevisions.pageId,
    "page_id",
    pageRevisions.kind,
    "RETENTION_PAGE_REVISIONS_"
  ),
  widget_template: defineFamilySpec(
    widgetTemplateRevisions,
    widgetTemplateRevisions.templateId,
    "template_id",
    null,
    "RETENTION_WIDGET_TEMPLATE_REVISIONS_"
  ),
  detail_page: defineFamilySpec(
    detailPageRevisions,
    detailPageRevisions.detailPageId,
    "detail_page_id",
    detailPageRevisions.kind,
    "RETENTION_DETAIL_PAGE_REVISIONS_"
  ),
  entry: defineFamilySpec(
    contentRevisions,
    contentRevisions.entryId,
    "entry_id",
    null,
    "RETENTION_ENTRY_REVISIONS_"
  ),
  post: defineFamilySpec(
    postRevisions,
    postRevisions.postId,
    "post_id",
    null,
    "RETENTION_POST_REVISIONS_"
  ),
};

/** True only for the five closed revision family identifiers. */
export function isRevisionRetentionFamily(value: unknown): value is RevisionFamily {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(REVISION_FAMILY_SPECS, value)
  );
}

// --- Leaf-local policy normalizer -----------------------------------------

export type RevisionRetentionPolicyInput = Readonly<{
  /** Accepted only so a normalized policy re-feeds as input; must match `family`. */
  family?: RevisionFamily;
  enabled?: boolean;
  /** Typed direct-service dry-run; no env key exists for this. */
  dryRun?: boolean;
  maxAgeDays?: number;
  keepNewestPerParent?: number;
  batchSize?: number;
  maxBatchesPerRun?: number;
  /** Cutoff clock bookkeeping (frozen fixtures pin it); not a knob. */
  now?: Date;
}>;

export type RevisionRetentionPolicy = Readonly<{
  family: RevisionFamily;
  enabled: boolean;
  dryRun: boolean;
  maxAgeDays: number;
  keepNewestPerParent: number;
  batchSize: number;
  maxBatchesPerRun: number;
  now: Date;
}>;

const POLICY_INPUT_KEYS: readonly string[] = [
  "family",
  "enabled",
  "dryRun",
  "maxAgeDays",
  "keepNewestPerParent",
  "batchSize",
  "maxBatchesPerRun",
  "now",
];

const FAMILY_ENV_SUFFIXES: ReadonlySet<string> = new Set([
  "ENABLED",
  "MAX_AGE_DAYS",
  "KEEP_NEWEST_PER_PARENT",
]);

const CANONICAL_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function fail(reason: string): never {
  throw new RetentionPolicyError(reason);
}

function normalizeBooleanValue(value: unknown, reason: string): boolean {
  if (value !== true && value !== false) fail(reason);
  return value;
}

function normalizeIntegerValue(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail(reason);
  if (value < minimum || value > maximum) fail(reason);
  return value;
}

/** Strict family boolean grammar: absent falls back, else exact `true|false`. */
function readEnvBoolean(env: RuntimeEnv, key: string, fallback: boolean, reason: string): boolean {
  const raw = env[key];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  fail(reason);
}

/** Bounded integer knob: absent/empty falls back; out-of-range rejects. */
function readEnvBoundedInteger(
  env: RuntimeEnv,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
  reason: string
): number {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  if (!CANONICAL_INTEGER_PATTERN.test(raw)) fail(reason);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(reason);
  return value;
}

/** No alias, rename, or family-scoped dry-run key wins under a family prefix. */
function assertNoUnsupportedFamilyEnvKeys(env: RuntimeEnv, prefix: string): void {
  for (const key of Object.keys(env)) {
    if (!key.startsWith(prefix)) continue;
    if (!FAMILY_ENV_SUFFIXES.has(key.slice(prefix.length))) {
      fail("unsupported_retention_env_key");
    }
  }
}

function normalizeNow(value: unknown): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) fail("policy_now_invalid");
  return value;
}

/**
 * Leaf-local normalization for one revision family: exact keys only, no
 * coercion, no clamping. Typed inputs win over the environment; absent keys
 * fall back to the strict family env keys, then to the contract defaults. The
 * global knobs (`batchSize`, `maxBatchesPerRun`, `dryRun`) are never reparsed
 * here — they come from L01's resolvers.
 */
export function normalizeRevisionRetentionPolicy(
  family: RevisionFamily,
  input?: RevisionRetentionPolicyInput,
  env: RuntimeEnv = process.env
): RevisionRetentionPolicy {
  if (!isRevisionRetentionFamily(family)) fail("family_unknown");
  const spec = REVISION_FAMILY_SPECS[family];
  if (input !== undefined) {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      fail("policy_input_invalid");
    }
    for (const key of Object.keys(input)) {
      if (!POLICY_INPUT_KEYS.includes(key)) fail("policy_input_invalid");
    }
  }
  assertNoUnsupportedFamilyEnvKeys(env, spec.envPrefix);
  const record = (input ?? {}) as Readonly<Record<string, unknown>>;
  // A normalized policy may be re-fed as input (idempotent round-trip), but a
  // family tag inside it can never redirect the pass to another family.
  if (record.family !== undefined && record.family !== family) fail("family_unknown");
  // The family env keys and L01's global knobs are parsed strictly even when a
  // typed input overrides them: a set-but-invalid knob must never be silently
  // ignored (the L01 discipline), so the parse happens before the override.
  const envEnabled = readEnvBoolean(
    env,
    `${spec.envPrefix}ENABLED`,
    true,
    "family_enabled_invalid"
  );
  const envMaxAgeDays = readEnvBoundedInteger(
    env,
    `${spec.envPrefix}MAX_AGE_DAYS`,
    REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS,
    ...DAY_BOUNDS,
    "family_age_invalid"
  );
  const envKeepNewest = readEnvBoundedInteger(
    env,
    `${spec.envPrefix}KEEP_NEWEST_PER_PARENT`,
    REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT,
    ...KEEP_BOUNDS,
    "family_keep_newest_invalid"
  );
  return Object.freeze({
    family,
    enabled:
      record.enabled === undefined
        ? envEnabled
        : normalizeBooleanValue(record.enabled, "policy_enabled_invalid"),
    dryRun:
      record.dryRun === undefined
        ? resolveRetentionDryRun(env)
        : normalizeBooleanValue(record.dryRun, "policy_dry_run_invalid"),
    maxAgeDays:
      record.maxAgeDays === undefined
        ? envMaxAgeDays
        : normalizeIntegerValue(record.maxAgeDays, ...DAY_BOUNDS, "policy_age_invalid"),
    keepNewestPerParent:
      record.keepNewestPerParent === undefined
        ? envKeepNewest
        : normalizeIntegerValue(
            record.keepNewestPerParent,
            ...KEEP_BOUNDS,
            "policy_keep_newest_invalid"
          ),
    batchSize:
      record.batchSize === undefined
        ? resolveRetentionBatchSize(env)
        : normalizeIntegerValue(
            record.batchSize,
            RETENTION_BATCH_SIZE_MIN,
            RETENTION_BATCH_SIZE_MAX,
            "policy_batch_size_invalid"
          ),
    maxBatchesPerRun:
      record.maxBatchesPerRun === undefined
        ? resolveRetentionMaxBatchesPerRun(env)
        : normalizeIntegerValue(
            record.maxBatchesPerRun,
            RETENTION_MAX_BATCHES_PER_RUN_MIN,
            RETENTION_MAX_BATCHES_PER_RUN_MAX,
            "policy_max_batches_invalid"
          ),
    now: record.now === undefined ? new Date() : normalizeNow(record.now),
  });
}

/** Defense in depth for direct callers that hand-build a policy. */
function assertPolicyForFamily(family: RevisionFamily, policy: RevisionRetentionPolicy): void {
  const inRange = (value: number, minimum: number, maximum: number): boolean =>
    Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  if (
    !isRevisionRetentionFamily(family) ||
    policy.family !== family ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.dryRun !== "boolean" ||
    !inRange(policy.maxAgeDays, ...DAY_BOUNDS) ||
    !inRange(policy.keepNewestPerParent, ...KEEP_BOUNDS) ||
    !inRange(policy.batchSize, RETENTION_BATCH_SIZE_MIN, RETENTION_BATCH_SIZE_MAX) ||
    !inRange(
      policy.maxBatchesPerRun,
      RETENTION_MAX_BATCHES_PER_RUN_MIN,
      RETENTION_MAX_BATCHES_PER_RUN_MAX
    ) ||
    Number.isNaN(policy.now.getTime())
  ) {
    fail("policy_input_invalid");
  }
}

// --- Bounded candidate reads and deletes -----------------------------------

/** Shared select/delete/execute capability so `db` and a tx handle both fit. */
export type RevisionRetentionExecutor = Pick<typeof db, "select" | "delete" | "execute">;

/** One bounded batch: matched candidates and driver-accurate deletes. */
export type RevisionRetentionBatchResult = Readonly<{ matched: number; deleted: number }>;

const PARENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NEWER_ORDER = sql.raw("newer.version, newer.id");
const PUBLISHED_ORDER = sql.raw("published.version, published.id");

/**
 * Keep-newest floor probe: the candidate survives unless its parent owns at
 * least `keepNewest` strictly newer rows (`version ASC, id ASC` tuple order,
 * LIMIT-bounded probe over the per-parent version indexes). The `count(*)` is
 * compared in SQL and never read into JS.
 */
const keepNewestFloorProbe = (spec: RevisionFamilySpec, keepNewest: number): SQL =>
  sql`(select count(*) from (
        select 1 from ${spec.table} newer
        where newer.${sql.raw(spec.parentColumnSql)} = ${spec.parentColumn}
          and (${NEWER_ORDER}) > (${spec.versionColumn}, ${spec.idColumn})
        limit ${keepNewest}
      ) newer_rows) = ${keepNewest}`;

/**
 * Published anchor probe (kind-bearing families only): the newest
 * `kind='publish'` row per parent — the published-snapshot lineage the parent
 * document mirrors — is never a candidate.
 */
const publishedAnchorProbe = (spec: RevisionFamilySpec): SQL | undefined =>
  spec.kindColumn === null
    ? undefined
    : sql`not exists (select 1 from ${spec.table} published
        where published.${sql.raw(spec.parentColumnSql)} = ${spec.parentColumn}
          and ${spec.kindColumn} = 'publish'
          and (${PUBLISHED_ORDER}) > (${spec.versionColumn}, ${spec.idColumn})
        limit 1)`;

const buildEligibilityWhere = (
  spec: RevisionFamilySpec,
  cutoff: Date,
  policy: RevisionRetentionPolicy,
  parentId: string | null
): SQL | undefined =>
  and(
    parentId === null ? undefined : eq(spec.parentColumn, parentId),
    lt(spec.createdAtColumn, cutoff),
    keepNewestFloorProbe(spec, policy.keepNewestPerParent),
    publishedAnchorProbe(spec)
  );

async function selectCandidateIds(
  exec: RevisionRetentionExecutor,
  spec: RevisionFamilySpec,
  where: SQL | undefined,
  order: "age" | "version",
  limit: number,
  lock: boolean
): Promise<readonly string[]> {
  let query = exec
    .select({ id: spec.idColumn })
    .from(spec.table)
    .where(where)
    .orderBy(
      ...(order === "version"
        ? [asc(spec.versionColumn), asc(spec.idColumn)]
        : [asc(spec.createdAtColumn), asc(spec.idColumn)])
    )
    .limit(limit)
    .$dynamic();
  if (lock) query = query.for("update", { skipLocked: true });
  const rows = await query;
  return rows.map((row) => String(row.id));
}

async function deleteCandidateIds(
  exec: RevisionRetentionExecutor,
  spec: RevisionFamilySpec,
  ids: readonly string[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const deleted = await exec
    .delete(spec.table)
    .where(inArray(spec.idColumn, [...ids]))
    .returning({ id: spec.idColumn });
  return deleted.length;
}

/**
 * One bounded batch. Dry-run executes only the LIMIT-bounded candidate read —
 * no `FOR UPDATE` row lock and zero deletes — and reports `matched`
 * observationally.
 */
async function runRetentionBatch(
  exec: RevisionRetentionExecutor,
  spec: RevisionFamilySpec,
  policy: RevisionRetentionPolicy,
  order: "age" | "version",
  parentId: string | null
): Promise<RevisionRetentionBatchResult> {
  const cutoff = computeRetentionCutoff(policy.now, policy.maxAgeDays);
  try {
    const candidates = await selectCandidateIds(
      exec,
      spec,
      buildEligibilityWhere(spec, cutoff, policy, parentId),
      order,
      policy.batchSize,
      !policy.dryRun
    );
    if (policy.dryRun) return { matched: candidates.length, deleted: 0 };
    if (candidates.length === 0) return { matched: 0, deleted: 0 };
    const deleted = await deleteCandidateIds(exec, spec, candidates);
    return { matched: candidates.length, deleted };
  } catch (error) {
    if (error instanceof RetentionPolicyError) throw error;
    throw new Error(REVISION_RETENTION_BATCH_FAILED);
  }
}

/** Aggregated drain bookkeeping (ledger and per-parent results project it). */
type DrainSummary = Readonly<{ batches: number; matched: number; deleted: number }>;

/** Drain loop: terminates on empty batch, zero-deleted batch, or the budget. */
async function drainRetentionBatches(
  exec: RevisionRetentionExecutor,
  spec: RevisionFamilySpec,
  policy: RevisionRetentionPolicy,
  order: "age" | "version",
  parentId: string | null
): Promise<DrainSummary> {
  let batches = 0;
  let matched = 0;
  let deleted = 0;
  while (batches < policy.maxBatchesPerRun) {
    const outcome = await runRetentionBatch(exec, spec, policy, order, parentId);
    batches += 1;
    matched += outcome.matched;
    deleted += outcome.deleted;
    // An empty batch drained the family; a batch that deleted nothing means
    // every candidate was locked away or anchored — stop, never spin.
    if (outcome.matched === 0 || outcome.deleted === 0) break;
  }
  return { batches, matched, deleted };
}

// --- Public API — frozen for TASK-551-06-L03 and the request-path wrapper ---

/** Per-run ledger: the L01 {family, matched, deleted, dryRun} shape plus bookkeeping. */
export type RevisionRetentionLedger = Readonly<{
  family: RevisionFamily;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

export type RevisionRetentionRunOptions = Readonly<{
  /** Explicit typed policy input; wins over the environment. */
  policy?: RevisionRetentionPolicyInput;
  /** Injected environment (defaults to `process.env`). */
  env?: RuntimeEnv;
}>;

const ledger = (
  family: RevisionFamily,
  enabled: boolean,
  dryRun: boolean,
  batches: number,
  matched: number,
  deleted: number
): RevisionRetentionLedger => Object.freeze({ family, enabled, dryRun, batches, matched, deleted });

/**
 * Whole-family bounded retention pass over one revision table. This is the
 * entry point TASK-551-06-L03's scheduler calls (direct calls never acquire
 * the scheduler advisory lock). Disabled families do zero work and zero SQL;
 * dry-run does exactly one bounded candidate read (`batches: 1`).
 */
export async function runRevisionFamilyRetention(
  family: RevisionFamily,
  executor: RevisionRetentionExecutor = db,
  options?: RevisionRetentionRunOptions
): Promise<RevisionRetentionLedger> {
  const policy = normalizeRevisionRetentionPolicy(family, options?.policy, options?.env);
  const spec = REVISION_FAMILY_SPECS[family];
  if (!policy.enabled) return ledger(family, false, policy.dryRun, 0, 0, 0);
  if (policy.dryRun) {
    const observed = await runRetentionBatch(executor, spec, policy, "age", null);
    return ledger(family, true, true, 1, observed.matched, 0);
  }
  const drained = await drainRetentionBatches(executor, spec, policy, "age", null);
  return ledger(family, true, false, drained.batches, drained.matched, drained.deleted);
}

/** Per-parent prune result; `deleted` is driver-accurate, never assumed. */
export type RevisionParentPruneResult = Readonly<{ matched: number; deleted: number }>;

/**
 * Bounded per-parent prune inside the caller's transaction — the request-path
 * wrapper (pages/revisionService.ts) delegates here. Drains oldest-first in
 * the contract's `version ASC, id ASC` order, `FOR UPDATE SKIP LOCKED`,
 * protected by the same anchors as the family pass. Dry-run performs only the
 * LIMIT-bounded candidate read and reports `{matched, deleted: 0}`.
 */
export async function pruneParentRevisions(
  tx: RevisionRetentionExecutor,
  family: RevisionFamily,
  parentId: string,
  policy: RevisionRetentionPolicy
): Promise<RevisionParentPruneResult> {
  assertPolicyForFamily(family, policy);
  if (!PARENT_ID_PATTERN.test(parentId)) fail("parent_id_invalid");
  if (!policy.enabled) return { matched: 0, deleted: 0 };
  const spec = REVISION_FAMILY_SPECS[family];
  if (policy.dryRun) {
    const observed = await runRetentionBatch(tx, spec, policy, "version", parentId);
    return { matched: observed.matched, deleted: 0 };
  }
  const drained = await drainRetentionBatches(tx, spec, policy, "version", parentId);
  return { matched: drained.matched, deleted: drained.deleted };
}
