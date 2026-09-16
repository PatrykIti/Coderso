/**
 * TASK-551-06-L03: partition readiness inspection — evidence only, never a
 * schema change.
 *
 * Answers one operational question per allowlisted append-heavy table: is the
 * live size/churn profile approaching the point where a future range layout
 * (a separate, human-scheduled migration task) would pay for itself? The
 * service is read-only by construction:
 *
 * - the inspected table set is a compile-time allowlist of exactly the schema
 *   objects the Partition Decision Contract names (access/audit logs,
 *   assistant executions/undo, analytics sessions/pageviews, form
 *   submissions/action runs, webhook deliveries, sessions, revision tables);
 *   physical names are taken from the schema objects themselves, so registry
 *   and schema cannot drift silently. A table identifier outside the closed
 *   id set fails closed with `partition_readiness_table_unknown` and the
 *   unknown identifier never reaches a query or a report;
 * - the only statements issued are catalog reads (sizes, live/dead row
 *   estimates, cumulative change counters, vacuum bookkeeping, all via
 *   pg_class / pg_stat_user_tables / pg_namespace) and the per-table
 *   aggregate reads authored in this file (min/max lifecycle timestamp and a
 *   growth-window count). Callers pass no SQL, no table list and no output
 *   path: the report is returned in memory and the CLI script owns
 *   presentation;
 * - no schema-changing statement text exists anywhere in this file — its
 *   statements and its comments alike — so the suite's source guard over the
 *   file contents stays green by construction.
 *
 * Classification is `observe` unless every contract gate is met by evidence:
 * row count or total size at/above the plan threshold AND measurable
 * prune/vacuum pressure AND a viable range key with the unique-index and
 * foreign-key notes a future design must satisfy. Every `plan` result embeds
 * the full recommendation block (separate task, online migration,
 * dual-write/backfill validation, rollback, backup/restore, retention
 * integration); every `observe` result carries the gates it missed.
 *
 * Sanitization: reports carry table identifiers, aggregate counts/sizes, ISO
 * timestamps, durations, stable codes and stable reason tokens — never row
 * samples, binds, URLs, credentials or driver messages. A failed catalog or
 * aggregate read reduces to `partition_readiness_unavailable` plus a stable
 * reason token; the underlying error text never propagates.
 *
 * This service is deliberately NOT part of the one-PID retention job: it runs
 * through the injectable read executor (default the global `db`), reserves no
 * dedicated session, takes no advisory lock, and is safe to call from the
 * scheduler, the CLI script or a test at any time.
 */

import { getTableName, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/client";
import {
  accessLogs,
  analyticsPageviews,
  analyticsSessions,
  assistantActionExecutions,
  assistantActionUndoItems,
  auditLogs,
  contentRevisions,
  detailPageRevisions,
  formActionRuns,
  formSubmissions,
  pageRevisions,
  postRevisions,
  sessions,
  webhookDeliveries,
  widgetTemplateRevisions,
} from "../../db/schema";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * The two stable codes this module raises. `unavailable` is the closed-set
 * contract code for a readiness inspection that could not be produced;
 * `tableUnknown` is the fail-closed rejection of any identifier outside the
 * allowlist. Reason tokens narrow the rule without echoing caller input.
 */
export const PARTITION_READINESS_ERROR_CODES = Object.freeze({
  unavailable: "partition_readiness_unavailable",
  tableUnknown: "partition_readiness_table_unknown",
} as const);

export type PartitionReadinessErrorCode =
  | typeof PARTITION_READINESS_ERROR_CODES.unavailable
  | typeof PARTITION_READINESS_ERROR_CODES.tableUnknown;

/**
 * Typed inspection failure. `code` is stable and machine-readable, `reason`
 * is a second stable token; neither embeds a table name, SQL or driver text.
 */
export class PartitionReadinessError extends Error {
  readonly code: PartitionReadinessErrorCode;
  readonly reason: string;

  constructor(code: PartitionReadinessErrorCode, reason: string) {
    super(`${code} (${reason})`);
    this.name = "PartitionReadinessError";
    this.code = code;
    this.reason = reason;
  }
}

function fail(code: PartitionReadinessErrorCode, reason: string): never {
  throw new PartitionReadinessError(code, reason);
}

// ---------------------------------------------------------------------------
// Thresholds and knobs
// ---------------------------------------------------------------------------

/**
 * Evidence-backed `plan` gates, frozen for suites: sustained multi-million
 * rows OR multi-GB total size, plus measurable prune/vacuum pressure (a dead
 * share of the threshold ratio, or cumulative removals since the statistics
 * reset at/above the churn floor). Both size gates are lower bounds, not
 * predictions; the recommendation block carries the rest of the decision.
 */
export const PARTITION_READINESS_THRESHOLDS = Object.freeze({
  planRows: 2_000_000,
  planBytes: 2_147_483_648,
  deadRowRatio: 0.2,
  removalsSinceReset: 100_000,
});

/** Growth window used for the projected-growth evidence, in days. */
export const PARTITION_READINESS_GROWTH_WINDOW_BOUNDS = Object.freeze({
  default: 7,
  min: 1,
  max: 365,
});

// ---------------------------------------------------------------------------
// Allowlisted table registry
// ---------------------------------------------------------------------------

export type PartitionDesign = Readonly<{
  /** Viable range key: the lifecycle timestamp column, monotonic in practice. */
  key: string;
  /** Range granularity the future design should start from. */
  strategy: "range_monthly";
  /** Unique-index note: identity becomes range-scoped under a range layout. */
  uniqueness: string;
  /** Foreign-key note for the tables that reference this one. */
  foreignKeys: string;
  /** How the bounded retention sweeps map onto the future range layout. */
  retentionIntegration: string;
}>;

export type PartitionReadinessTableSpec = Readonly<{
  /** Closed logical identifier; the only table name a caller may pass. */
  id: string;
  /** Schema-owned table object; its physical name is read from it, never restated. */
  table: PgTable;
  /** Lifecycle timestamp column for oldest/newest and growth-window evidence. */
  timeColumn: PgColumn;
  /** Viable range-key design notes a future migration task must satisfy. */
  design: PartitionDesign;
}>;

const UNIQUE_INDEX_NOTE =
  "row identity is a plain uuid primary key today; a future range design must restate it as (range key, id) because identity becomes range-scoped";
const FOREIGN_KEY_NOTE =
  "referencing tables point at parent identifiers; a future range design must carry the range key in each reference or resolve it within a single range";
const RETENTION_INTEGRATION_NOTE =
  "bounded RETENTION_ candidate reads order by this key, so a future range layout can serve them without a full-table probe; range archival must stay behind the family cutoff";

function rangeDesign(timeColumn: PgColumn): PartitionDesign {
  return Object.freeze({
    key: timeColumn.name,
    strategy: "range_monthly",
    uniqueness: UNIQUE_INDEX_NOTE,
    foreignKeys: FOREIGN_KEY_NOTE,
    retentionIntegration: RETENTION_INTEGRATION_NOTE,
  });
}

function allowlisted(
  id: string,
  table: PgTable,
  timeColumn: PgColumn
): PartitionReadinessTableSpec {
  return Object.freeze({ id, table, timeColumn, design: rangeDesign(timeColumn) });
}

/**
 * The closed registry: every table the Partition Decision Contract covers, in
 * contract order, and nothing else. Physical names come from the schema
 * objects; the id set below is the whole key space callers can address.
 */
export const PARTITION_READINESS_TABLE_REGISTRY: readonly PartitionReadinessTableSpec[] =
  Object.freeze([
    allowlisted("access_logs", accessLogs, accessLogs.createdAt),
    allowlisted("audit_logs", auditLogs, auditLogs.createdAt),
    allowlisted(
      "assistant_action_executions",
      assistantActionExecutions,
      assistantActionExecutions.createdAt
    ),
    allowlisted(
      "assistant_action_undo_items",
      assistantActionUndoItems,
      assistantActionUndoItems.createdAt
    ),
    allowlisted("analytics_sessions", analyticsSessions, analyticsSessions.startedAt),
    allowlisted("analytics_pageviews", analyticsPageviews, analyticsPageviews.createdAt),
    allowlisted("form_submissions", formSubmissions, formSubmissions.createdAt),
    allowlisted("form_action_runs", formActionRuns, formActionRuns.createdAt),
    allowlisted("webhook_deliveries", webhookDeliveries, webhookDeliveries.createdAt),
    allowlisted("sessions", sessions, sessions.createdAt),
    allowlisted("page_revisions", pageRevisions, pageRevisions.createdAt),
    allowlisted("detail_page_revisions", detailPageRevisions, detailPageRevisions.createdAt),
    allowlisted("content_revisions", contentRevisions, contentRevisions.createdAt),
    allowlisted("post_revisions", postRevisions, postRevisions.createdAt),
    allowlisted(
      "widget_template_revisions",
      widgetTemplateRevisions,
      widgetTemplateRevisions.createdAt
    ),
  ]);

const PARTITION_READINESS_TABLES_BY_ID: ReadonlyMap<string, PartitionReadinessTableSpec> = new Map(
  PARTITION_READINESS_TABLE_REGISTRY.map((spec) => [spec.id, spec])
);

/** Frozen id list of the closed registry, for suites and CLI help text. */
export const PARTITION_READINESS_TABLE_IDS: readonly string[] = Object.freeze(
  PARTITION_READINESS_TABLE_REGISTRY.map((spec) => spec.id)
);

// Validates once at module evaluation: every id is non-empty, matches the
// physical name its schema object carries, and is unique (registry/schema
// drift fails closed at import instead of mislabeling a report).
for (const spec of PARTITION_READINESS_TABLE_REGISTRY) {
  if (spec.id === "" || spec.id !== getTableName(spec.table)) {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "registry_identifier_drift");
  }
}
if (PARTITION_READINESS_TABLES_BY_ID.size !== PARTITION_READINESS_TABLE_REGISTRY.length) {
  fail(PARTITION_READINESS_ERROR_CODES.unavailable, "registry_identifier_duplicate");
}

/**
 * The only table resolution path: anything outside the closed id set —
 * including arbitrary caller strings — fails closed, and the rejected
 * identifier never reaches a query, a report or an error message.
 */
export function resolveAllowlistedPartitionTable(table: string): PartitionReadinessTableSpec {
  const spec = table.trim() === "" ? undefined : PARTITION_READINESS_TABLES_BY_ID.get(table.trim());
  if (spec === undefined) {
    fail(PARTITION_READINESS_ERROR_CODES.tableUnknown, "table_not_allowlisted");
  }
  return spec;
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

/** Catalog/aggregate evidence for one table: counts, sizes, timestamps only. */
export type PartitionTableEvidence = Readonly<{
  totalBytes: number;
  heapBytes: number;
  indexBytes: number;
  liveRows: number;
  deadRows: number;
  /** dead / (live + dead), 0 when the table is empty. */
  deadRatio: number;
  oldestAt: string | null;
  newestAt: string | null;
  /** Rows with a lifecycle timestamp inside the growth window. */
  recentRows: number;
  growthWindowDays: number;
  rowsPerDay: number;
  avgRowBytes: number;
  /** rowsPerDay * 365 * avgRowBytes, rounded — an extrapolation, not a promise. */
  projectedGrowthBytesPerYear: number;
  /** Cumulative change counters since the statistics reset. */
  insertsTotal: number;
  updatesTotal: number;
  removalsTotal: number;
  lastVacuumAt: string | null;
  lastAutovacuumAt: string | null;
}>;

export type PartitionRecommendation = Readonly<{
  separateTask: string;
  onlineMigration: string;
  dualWriteBackfillValidation: string;
  rollback: string;
  backupRestore: string;
  retentionIntegration: string;
}>;

export type PartitionReadinessStatus = "observe" | "plan";

export type PartitionReadinessTableReport = Readonly<{
  /** Closed logical identifier from the registry. */
  table: string;
  /** Physical schema table the identifier resolves to. */
  physicalTable: string;
  status: PartitionReadinessStatus;
  /** Stable tokens recording which evidence gates were met or missed. */
  reasons: readonly string[];
  evidence: PartitionTableEvidence;
  design: PartitionDesign;
  /** Full recommendation block for `plan`; null while `observe`. */
  recommendation: PartitionRecommendation | null;
}>;

export type PartitionReadinessReport = Readonly<{
  generatedAt: string;
  durationMs: number;
  growthWindowDays: number;
  tablesInspected: number;
  planCount: number;
  observeCount: number;
  tables: readonly PartitionReadinessTableReport[];
}>;

export type PartitionReadinessOptions = Readonly<{
  /** Pins the report timestamp; defaults to the current instant. */
  now?: Date;
  /** Growth window in days; bounded by PARTITION_READINESS_GROWTH_WINDOW_BOUNDS. */
  growthWindowDays?: number;
}>;

/**
 * Read-only executor surface: catalog and aggregate reads only. The default
 * is the global `db`; tests inject a `Pick<typeof db, "execute">` stand-in.
 * There is deliberately no surface here for caller-authored SQL.
 */
export type PartitionReadinessExecutor = Pick<typeof db, "execute">;

// ---------------------------------------------------------------------------
// Read helpers (catalog + aggregate; driver output coerced defensively)
// ---------------------------------------------------------------------------

type CatalogRow = Record<string, unknown>;

/** postgres.js returns a RowList; other drivers may wrap rows. Accept both. */
function readRows(result: unknown): CatalogRow[] {
  if (Array.isArray(result)) return result as CatalogRow[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as CatalogRow[]) : [];
}

// pg counts arrive as bigint-typed columns; drivers may hand over number,
// string or bigint — Number() normalizes all three.
function toCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.round(parsed);
  return rounded < 0 ? 0 : rounded;
}

function toTimestamp(value: unknown): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

/**
 * One catalog read for all requested tables (single round trip): total/heap/
 * index size, live/dead row estimates, cumulative change counters and vacuum
 * bookkeeping. Plain relations only, in the current schema.
 */
async function readCatalog(
  executor: PartitionReadinessExecutor,
  specs: readonly PartitionReadinessTableSpec[]
): Promise<ReadonlyMap<string, CatalogRow>> {
  const names = specs.map((spec) => getTableName(spec.table));
  const nameList = sql.join(
    names.map((name) => sql`${name}`),
    sql`, `
  );
  const query = sql`select c.relname as table_name,
         pg_total_relation_size(c.oid) as total_bytes,
         pg_relation_size(c.oid) as heap_bytes,
         pg_indexes_size(c.oid) as index_bytes,
         coalesce(s.n_live_tup, 0) as live_rows,
         coalesce(s.n_dead_tup, 0) as dead_rows,
         coalesce(s.n_tup_ins, 0) as inserts_total,
         coalesce(s.n_tup_upd, 0) as updates_total,
         coalesce(s.n_tup_del, 0) as removals_total,
         s.last_vacuum as last_vacuum_at,
         s.last_autovacuum as last_autovacuum_at
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = current_schema()
      and c.relkind in ('r', 'p')
      and c.relname in (${nameList})`;
  let rows: CatalogRow[];
  try {
    rows = readRows(await executor.execute(query));
  } catch {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "catalog_read_failed");
  }
  const byName = new Map<string, CatalogRow>();
  for (const row of rows) {
    const name = row.table_name;
    if (typeof name === "string" && name !== "") byName.set(name, row);
  }
  return byName;
}

/**
 * One aggregate read per allowlisted table: oldest/newest lifecycle timestamp
 * and the growth-window row count. The table and column objects come from the
 * registry, so the rendered identifiers are schema-owned, never caller text.
 */
async function readAggregate(
  executor: PartitionReadinessExecutor,
  spec: PartitionReadinessTableSpec,
  cutoff: Date
): Promise<CatalogRow> {
  const query = sql`select min(${spec.timeColumn}) as oldest_at,
         max(${spec.timeColumn}) as newest_at,
         count(*) filter (where ${spec.timeColumn} >= ${cutoff}) as recent_rows
    from ${spec.table}`;
  let rows: CatalogRow[];
  try {
    rows = readRows(await executor.execute(query));
  } catch {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "aggregate_read_failed");
  }
  const row = rows[0];
  if (row === undefined) fail(PARTITION_READINESS_ERROR_CODES.unavailable, "aggregate_row_missing");
  return row;
}

function buildEvidence(
  row: CatalogRow,
  aggregate: CatalogRow,
  growthWindowDays: number
): PartitionTableEvidence {
  const totalBytes = toCount(row.total_bytes);
  const liveRows = toCount(row.live_rows);
  const deadRows = toCount(row.dead_rows);
  const recentRows = toCount(aggregate.recent_rows);
  const rowsPerDay = Math.round((recentRows / growthWindowDays) * 100) / 100;
  const avgRowBytes = liveRows > 0 ? Math.round(totalBytes / liveRows) : 0;
  return Object.freeze({
    totalBytes,
    heapBytes: toCount(row.heap_bytes),
    indexBytes: toCount(row.index_bytes),
    liveRows,
    deadRows,
    deadRatio:
      liveRows + deadRows > 0 ? Math.round((deadRows / (liveRows + deadRows)) * 1_000) / 1_000 : 0,
    oldestAt: toTimestamp(aggregate.oldest_at),
    newestAt: toTimestamp(aggregate.newest_at),
    recentRows,
    growthWindowDays,
    rowsPerDay,
    avgRowBytes,
    projectedGrowthBytesPerYear: Math.round(rowsPerDay * 365 * avgRowBytes),
    insertsTotal: toCount(row.inserts_total),
    updatesTotal: toCount(row.updates_total),
    removalsTotal: toCount(row.removals_total),
    lastVacuumAt: toTimestamp(row.last_vacuum_at),
    lastAutovacuumAt: toTimestamp(row.last_autovacuum_at),
  });
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classify(evidence: PartitionTableEvidence): {
  status: PartitionReadinessStatus;
  reasons: readonly string[];
} {
  const thresholds = PARTITION_READINESS_THRESHOLDS;
  const rowsAbove = evidence.liveRows >= thresholds.planRows;
  const bytesAbove = evidence.totalBytes >= thresholds.planBytes;
  const pressure =
    evidence.deadRatio >= thresholds.deadRowRatio ||
    evidence.removalsTotal >= thresholds.removalsSinceReset;
  const reasons: string[] = [
    rowsAbove ? "rows_above_plan_threshold" : "rows_below_plan_threshold",
    bytesAbove ? "bytes_above_plan_threshold" : "bytes_below_plan_threshold",
    pressure ? "vacuum_pressure_evidenced" : "vacuum_pressure_absent",
    "range_key_design_viable",
  ];
  return Object.freeze({
    status: (rowsAbove || bytesAbove) && pressure ? "plan" : "observe",
    reasons: Object.freeze(reasons),
  });
}

/**
 * The contract recommendation block, embedded verbatim into every `plan`
 * result: a separate task owns the change, the move runs online with
 * dual-write/backfill validation, rollback and restore are proven first, and
 * the retention sweeps keep working unchanged.
 */
function planRecommendation(design: PartitionDesign): PartitionRecommendation {
  return Object.freeze({
    separateTask:
      "carry the change in a dedicated follow-up task with its own review and gates; this inspection never touches schema state",
    onlineMigration:
      "move rows with a bounded online copy that takes short per-range locks and keeps writers serving throughout",
    dualWriteBackfillValidation:
      "dual-write to the new layout, backfill in bounded chunks, then reconcile row counts and content fingerprints before any read switch",
    rollback:
      "keep the original table as the source of record until reconciliation passes; reversing is a write-path flip back to it",
    backupRestore:
      "prove a fresh backup restores into both layouts before and after the switch, and keep the restore drill receipt",
    retentionIntegration: design.retentionIntegration,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type NormalizedOptions = Readonly<{ now: Date; cutoff: Date; growthWindowDays: number }>;

function normalizeOptions(options: PartitionReadinessOptions): NormalizedOptions {
  const now = options.now ?? new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "clock_invalid");
  }
  const bounds = PARTITION_READINESS_GROWTH_WINDOW_BOUNDS;
  const growthWindowDays = options.growthWindowDays ?? bounds.default;
  if (!Number.isSafeInteger(growthWindowDays) || growthWindowDays < bounds.min) {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "growth_window_invalid");
  }
  if (growthWindowDays > bounds.max) {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "growth_window_invalid");
  }
  return Object.freeze({
    now,
    cutoff: new Date(now.getTime() - growthWindowDays * 86_400_000),
    growthWindowDays,
  });
}

function buildTableReport(
  spec: PartitionReadinessTableSpec,
  catalogRow: CatalogRow,
  aggregate: CatalogRow,
  growthWindowDays: number
): PartitionReadinessTableReport {
  const evidence = buildEvidence(catalogRow, aggregate, growthWindowDays);
  const { status, reasons } = classify(evidence);
  return Object.freeze({
    table: spec.id,
    physicalTable: getTableName(spec.table),
    status,
    reasons,
    evidence,
    design: spec.design,
    recommendation: status === "plan" ? planRecommendation(spec.design) : null,
  });
}

/**
 * Inspect one allowlisted table by identifier. Any identifier outside the
 * closed registry fails closed with `partition_readiness_table_unknown`; a
 * failed read fails closed with `partition_readiness_unavailable`.
 */
export async function inspectPartitionTableReadiness(
  table: string,
  executor: PartitionReadinessExecutor = db,
  options: PartitionReadinessOptions = {}
): Promise<PartitionReadinessTableReport> {
  const spec = resolveAllowlistedPartitionTable(table);
  const normalized = normalizeOptions(options);
  const catalog = await readCatalog(executor, [spec]);
  const catalogRow = catalog.get(getTableName(spec.table));
  if (catalogRow === undefined) {
    fail(PARTITION_READINESS_ERROR_CODES.unavailable, "catalog_row_missing");
  }
  const aggregate = await readAggregate(executor, spec, normalized.cutoff);
  return buildTableReport(spec, catalogRow, aggregate, normalized.growthWindowDays);
}

/**
 * Inspect the whole allowlisted set: one catalog read, then one aggregate
 * read per table, in registry order. Every identifier, statement and output
 * field this function produces is allowlisted and sanitized by construction.
 */
export async function inspectPartitionReadiness(
  executor: PartitionReadinessExecutor = db,
  options: PartitionReadinessOptions = {}
): Promise<PartitionReadinessReport> {
  const normalized = normalizeOptions(options);
  const startedAt = Date.now();
  const catalog = await readCatalog(executor, PARTITION_READINESS_TABLE_REGISTRY);
  const tables: PartitionReadinessTableReport[] = [];
  for (const spec of PARTITION_READINESS_TABLE_REGISTRY) {
    const catalogRow = catalog.get(getTableName(spec.table));
    if (catalogRow === undefined) {
      fail(PARTITION_READINESS_ERROR_CODES.unavailable, "catalog_row_missing");
    }
    const aggregate = await readAggregate(executor, spec, normalized.cutoff);
    tables.push(buildTableReport(spec, catalogRow, aggregate, normalized.growthWindowDays));
  }
  return Object.freeze({
    generatedAt: normalized.now.toISOString(),
    durationMs: Date.now() - startedAt,
    growthWindowDays: normalized.growthWindowDays,
    tablesInspected: tables.length,
    planCount: tables.filter((entry) => entry.status === "plan").length,
    observeCount: tables.filter((entry) => entry.status === "observe").length,
    tables: Object.freeze(tables),
  });
}
