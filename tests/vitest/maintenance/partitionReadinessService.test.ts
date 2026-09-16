/**
 * TASK-551-06-L03 vitest lane: `core/services/maintenance/partitionReadinessService.ts`.
 *
 * PURE lane: zero database, zero network, zero owner-map legs. The service's
 * one executor seam (`Pick<typeof db, "execute">`) is injected with recording
 * stand-ins that answer catalog/aggregate reads from in-memory rows, so the
 * suite needs neither the `task551-db-test` capability nor `.env`; the
 * airtight invocation pins a non-routable `DATABASE_URL` only so the service's
 * default-executor import evaluates inertly (it dials nothing, and no leg
 * below ever runs without an injected executor). Real-PostgreSQL inspection
 * legs belong to the bun-test lane
 * (`tests/perf/database-partition-readiness.test.ts`) and are deliberately not
 * mirrored here.
 *
 * Pinned below, per the contract's Testing Requirements (:238-240) and
 * Quantified Acceptance (:301-303):
 * - the closed 15-table registry with schema-owned identifiers, and the
 *   fail-closed rejection of arbitrary tables (and of arbitrary SQL/output
 *   paths in the options contract) with ZERO statements issued to the
 *   executor on the reject path;
 * - evidence sanitization: hostile-shaped catalog/aggregate rows reduce to
 *   identifiers, aggregate numbers and ISO timestamps only — no row samples,
 *   PII, binds, URLs or driver text anywhere in the serialized report;
 * - threshold classification (`observe` unless every gate is evidenced) with
 *   exact `>=` boundary semantics, and the full recommendation block on every
 *   `plan` result;
 * - the SQL guard: zero partition/destructive statement tokens anywhere in
 *   the service source, and every issued statement rendered as a bare SELECT
 *   whose relations and quoted identifiers come only from the allowlisted
 *   catalog set and the schema-owned registry;
 * - the executor seam: a minimal execute-only stand-in satisfies the injected
 *   path; stand-ins without the seam fail closed at compile time.
 */

import { readFileSync } from "node:fs";

import { describe, expect, expectTypeOf, test } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  PARTITION_READINESS_ERROR_CODES,
  PARTITION_READINESS_GROWTH_WINDOW_BOUNDS,
  PARTITION_READINESS_TABLE_IDS,
  PARTITION_READINESS_TABLE_REGISTRY,
  PARTITION_READINESS_THRESHOLDS,
  PartitionReadinessError,
  inspectPartitionReadiness,
  inspectPartitionTableReadiness,
  resolveAllowlistedPartitionTable,
  type PartitionReadinessExecutor,
  type PartitionReadinessOptions,
  type PartitionReadinessReport,
} from "../../../core/services/maintenance/partitionReadinessService";

// ---------------------------------------------------------------------------
// Fixture vocabulary: closed output shapes and reason tokens
// ---------------------------------------------------------------------------

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const EXPECTED_REPORT_KEYS = Object.freeze([
  "durationMs",
  "generatedAt",
  "growthWindowDays",
  "observeCount",
  "planCount",
  "tables",
  "tablesInspected",
]);

const EXPECTED_TABLE_REPORT_KEYS = Object.freeze([
  "design",
  "evidence",
  "physicalTable",
  "reasons",
  "recommendation",
  "status",
  "table",
]);

const EXPECTED_EVIDENCE_KEYS = Object.freeze([
  "avgRowBytes",
  "deadRatio",
  "deadRows",
  "growthWindowDays",
  "heapBytes",
  "indexBytes",
  "insertsTotal",
  "lastAutovacuumAt",
  "lastVacuumAt",
  "liveRows",
  "newestAt",
  "oldestAt",
  "projectedGrowthBytesPerYear",
  "recentRows",
  "removalsTotal",
  "rowsPerDay",
  "totalBytes",
  "updatesTotal",
]);

const EXPECTED_RECOMMENDATION_KEYS = Object.freeze([
  "backupRestore",
  "dualWriteBackfillValidation",
  "onlineMigration",
  "retentionIntegration",
  "rollback",
  "separateTask",
]);

const CLASSIFICATION_REASON_TOKENS = Object.freeze([
  "bytes_above_plan_threshold",
  "bytes_below_plan_threshold",
  "range_key_design_viable",
  "rows_above_plan_threshold",
  "rows_below_plan_threshold",
  "vacuum_pressure_absent",
  "vacuum_pressure_evidenced",
]);

/**
 * Values that must never surface in a report: a connection URL with
 * credentials, an email, a private key header, an API token, script markup,
 * a destructive phrase and a driver error fragment.
 */
const HOSTILE_TOKENS: readonly string[] = Object.freeze([
  "postgres://sa:hunter2@10.0.0.9:5432/secret_db",
  "root@tenant.example",
  "BEGIN RSA PRIVATE KEY",
  "AKIAIOSFODNN7EXAMPLE",
  "<script>alert(1)</script>",
  "drop table users",
  "ECONNREFUSED",
]);

// ---------------------------------------------------------------------------
// Recording executor stand-ins over in-memory catalog rows
// ---------------------------------------------------------------------------

type CatalogRow = Record<string, unknown>;
type RenderedQuery = Readonly<{ text: string; params: unknown[] }>;
type RecordingExecutor = PartitionReadinessExecutor & {
  readonly calls: readonly RenderedQuery[];
};

const DIALECT = new PgDialect();
const NOW = new Date("2026-09-16T10:15:00.000Z");
const ISO_ANCHOR = "2026-09-16T10:15:00.000Z";
const CUTOFF_DEFAULT = "2026-09-09T10:15:00.000Z";

const renderQuery = (query: unknown): RenderedQuery => {
  // Documented cast: the service hands its executor drizzle `sql` templates
  // only, so the render below sees exactly that closed shape. The cutoff bind
  // arrives as a real Date instance; recording normalizes it to its ISO text
  // so every assertion below compares values, never driver wrappers.
  const rendered = DIALECT.sqlToQuery(query as SQL);
  const params = rendered.params.map((param) =>
    param instanceof Date ? param.toISOString() : param
  );
  return { text: rendered.sql, params: [...params] };
};

const makeRecordingExecutor = (
  respond: (query: RenderedQuery, callIndex: number) => unknown
): RecordingExecutor => {
  const calls: RenderedQuery[] = [];
  const execute = async (query: unknown): Promise<unknown> => {
    const rendered = renderQuery(query);
    calls.push(rendered);
    return respond(rendered, calls.length);
  };
  // Documented cast: the stand-in narrows the injected executor to the one
  // `execute(query)` seam the service may use; nothing else exists here.
  return { calls, execute } as unknown as RecordingExecutor;
};

/** Catalog reads walk pg_class; aggregate reads target one physical table. */
const isCatalogQuery = (query: RenderedQuery): boolean => /from\s+pg_class\b/.test(query.text);

const aggregateTargetOf = (query: RenderedQuery): string => {
  const target = query.text.match(/from\s+"([a-z_]+)"/)?.[1];
  if (target === undefined) throw new Error(`unrecognized aggregate statement: ${query.text}`);
  return target;
};

const catalogRow = (table: string, overrides: CatalogRow = {}): CatalogRow => ({
  table_name: table,
  total_bytes: 16_384,
  heap_bytes: 8_192,
  index_bytes: 8_192,
  live_rows: 25,
  dead_rows: 0,
  inserts_total: 25,
  updates_total: 0,
  removals_total: 0,
  last_vacuum_at: null,
  last_autovacuum_at: null,
  ...overrides,
});

const aggregateRow = (overrides: CatalogRow = {}): CatalogRow => ({
  oldest_at: new Date("2026-09-16T09:00:00.000Z"),
  newest_at: new Date("2026-09-16T09:59:00.000Z"),
  recent_rows: 25,
  ...overrides,
});

const makeScriptedExecutor = (
  catalogFor: (table: string) => CatalogRow | null = (table) => catalogRow(table),
  aggregateFor: (table: string) => CatalogRow[] = () => [aggregateRow()]
): RecordingExecutor =>
  makeRecordingExecutor((query) => {
    if (isCatalogQuery(query)) {
      const rows: CatalogRow[] = [];
      for (const id of PARTITION_READINESS_TABLE_IDS) {
        const row = catalogFor(id);
        if (row !== null) rows.push(row);
      }
      return rows;
    }
    return aggregateFor(aggregateTargetOf(query));
  });

const hostileCatalogRow = (table: string): CatalogRow => ({
  table_name: table,
  total_bytes: "not-a-number",
  heap_bytes: -12,
  index_bytes: Number.NaN,
  live_rows: "25; drop table users",
  dead_rows: -7,
  inserts_total: Number.POSITIVE_INFINITY,
  updates_total: "1e999",
  removals_total: null,
  last_vacuum_at: "2026-09-16T00:00:00.000Z",
  last_autovacuum_at: "postgres://sa:hunter2@10.0.0.9:5432/secret_db",
  email: "root@tenant.example",
  password_hash: "BEGIN RSA PRIVATE KEY",
  session_token: "AKIAIOSFODNN7EXAMPLE",
  payload: "<script>alert(1)</script>",
  binds: ["postgres://sa:hunter2@10.0.0.9:5432/secret_db"],
});

const hostileAggregateRow = (): CatalogRow => ({
  oldest_at: "2026-09-16T09:00:00.000Z",
  newest_at: new Date("not-a-date"),
  recent_rows: "twenty-five",
  email: "root@tenant.example",
  bind_values: ["<script>alert(1)</script>"],
  raw_driver_message: "ECONNREFUSED postgres://sa:hunter2@10.0.0.9:5432/secret_db",
});

const expectReadinessError = async (
  run: () => Promise<unknown>,
  code: string,
  reason: string
): Promise<PartitionReadinessError> => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(PartitionReadinessError);
    const readinessError = error as PartitionReadinessError;
    expect(readinessError.code).toBe(code);
    expect(readinessError.reason).toBe(reason);
    expect(readinessError.message).toBe(`${code} (${reason})`);
    return readinessError;
  }
  throw new Error(`expected ${code} (${reason})`);
};

const stabilizedReportJson = (report: PartitionReadinessReport): string =>
  JSON.stringify({ ...report, durationMs: 0 });

// ---------------------------------------------------------------------------
// Closed table registry and arbitrary-table rejection
// ---------------------------------------------------------------------------

describe("closed table registry", () => {
  test("pins the fifteen contract tables with schema-owned identifiers", () => {
    expect(PARTITION_READINESS_TABLE_IDS).toHaveLength(15);
    expect(Object.isFrozen(PARTITION_READINESS_TABLE_IDS)).toBe(true);
    expect(Object.isFrozen(PARTITION_READINESS_TABLE_REGISTRY)).toBe(true);
    expect(new Set(PARTITION_READINESS_TABLE_IDS).size).toBe(PARTITION_READINESS_TABLE_IDS.length);
    for (const spec of PARTITION_READINESS_TABLE_REGISTRY) {
      // Physical names are read from the schema objects, never restated.
      expect(spec.id).toBe(getTableName(spec.table));
      expect(spec.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(spec.design.key).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(spec.design.strategy).toBe("range_monthly");
      for (const note of [
        spec.design.uniqueness,
        spec.design.foreignKeys,
        spec.design.retentionIntegration,
      ]) {
        expect(note.length).toBeGreaterThan(0);
      }
      expect(Object.isFrozen(spec)).toBe(true);
      expect(Object.isFrozen(spec.design)).toBe(true);
    }
  });

  test("resolves allowlisted identifiers through the single resolution path", () => {
    for (const id of PARTITION_READINESS_TABLE_IDS) {
      expect(resolveAllowlistedPartitionTable(id).id).toBe(id);
      // Lookup trims surrounding whitespace; it never widens the key set.
      expect(resolveAllowlistedPartitionTable(`  ${id}  `).id).toBe(id);
    }
  });

  test("the resolver itself throws the typed error for off-registry keys", () => {
    let thrown: unknown;
    try {
      resolveAllowlistedPartitionTable("pg_stat_user_tables");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(PartitionReadinessError);
    expect((thrown as PartitionReadinessError).code).toBe(
      PARTITION_READINESS_ERROR_CODES.tableUnknown
    );
    expect((thrown as PartitionReadinessError).reason).toBe("table_not_allowlisted");
  });

  test("rejects arbitrary tables fail-closed with the stable code and zero SQL", async () => {
    const executor = makeScriptedExecutor();
    const hostileInputs: readonly string[] = [
      "users",
      "posts",
      "pg_class",
      "pg_stat_user_tables",
      "access_logs;drop table users",
      "access_logs--",
      "ACCESS_LOGS",
      "access logs",
      "",
      "   ",
      "postgres://sa:hunter2@10.0.0.9:5432/secret_db",
      "a".repeat(400),
    ];
    for (const input of hostileInputs) {
      const error = await expectReadinessError(
        () => inspectPartitionTableReadiness(input, executor, { now: NOW }),
        PARTITION_READINESS_ERROR_CODES.tableUnknown,
        "table_not_allowlisted"
      );
      // The rejected identifier never reaches the error, a query or a report.
      if (input.length > 0) expect(error.message).not.toContain(input);
    }
    expect(executor.calls).toHaveLength(0);
  });

  test("gates the allowlist before any executor dial or option parsing", async () => {
    const executor = makeScriptedExecutor();
    await expectReadinessError(
      () =>
        inspectPartitionTableReadiness("nope", executor, {
          now: new Date("not-a-date"),
          growthWindowDays: 0,
        }),
      PARTITION_READINESS_ERROR_CODES.tableUnknown,
      "table_not_allowlisted"
    );
    expect(executor.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Catalog evidence sanitization
// ---------------------------------------------------------------------------

describe("catalog evidence sanitization", () => {
  test("reduces hostile catalog and aggregate values to sanitized aggregates", async () => {
    const executor = makeScriptedExecutor(
      (table) => hostileCatalogRow(table),
      () => [hostileAggregateRow()]
    );
    const report = await inspectPartitionTableReadiness("access_logs", executor, { now: NOW });
    const evidence = report.evidence;
    expect(evidence.totalBytes).toBe(0);
    expect(evidence.heapBytes).toBe(0);
    expect(evidence.indexBytes).toBe(0);
    expect(evidence.liveRows).toBe(0);
    expect(evidence.deadRows).toBe(0);
    expect(evidence.deadRatio).toBe(0);
    expect(evidence.insertsTotal).toBe(0);
    expect(evidence.updatesTotal).toBe(0);
    expect(evidence.removalsTotal).toBe(0);
    expect(evidence.recentRows).toBe(0);
    expect(evidence.rowsPerDay).toBe(0);
    expect(evidence.avgRowBytes).toBe(0);
    expect(evidence.projectedGrowthBytesPerYear).toBe(0);
    expect(evidence.oldestAt).toBeNull();
    expect(evidence.newestAt).toBeNull();
    expect(evidence.lastVacuumAt).toBeNull();
    expect(evidence.lastAutovacuumAt).toBeNull();
    expect(report.status).toBe("observe");
    expect(report.recommendation).toBeNull();
  });

  test("leaks none of the hostile row content into the serialized report", async () => {
    const executor = makeScriptedExecutor(
      (table) => hostileCatalogRow(table),
      () => [hostileAggregateRow()]
    );
    const report = await inspectPartitionReadiness(executor, { now: NOW });
    const serialized = JSON.stringify(report);
    expect(typeof serialized).toBe("string");
    for (const token of HOSTILE_TOKENS) {
      expect(serialized).not.toContain(token);
    }
    // Closed output shapes only: no sample, payload or bind field can exist.
    expect(Object.keys(report).sort()).toEqual([...EXPECTED_REPORT_KEYS]);
    expect(report.tables).toHaveLength(PARTITION_READINESS_TABLE_IDS.length);
    for (const table of report.tables) {
      expect(Object.keys(table).sort()).toEqual([...EXPECTED_TABLE_REPORT_KEYS]);
      expect(Object.keys(table.evidence).sort()).toEqual([...EXPECTED_EVIDENCE_KEYS]);
      expect(PARTITION_READINESS_TABLE_IDS.includes(table.table)).toBe(true);
      expect(table.physicalTable).toBe(table.table);
      expect(table.recommendation).toBeNull();
      expect(table.reasons.every((reason) => CLASSIFICATION_REASON_TOKENS.includes(reason))).toBe(
        true
      );
      // Evidence strings are ISO timestamps and nothing else.
      for (const value of Object.values(table.evidence)) {
        if (typeof value === "string") expect(value).toMatch(ISO_PATTERN);
      }
    }
  });

  test("keeps well-formed evidence intact while still dropping hostile columns", async () => {
    const executor = makeScriptedExecutor(
      (table) =>
        catalogRow(table, {
          total_bytes: 3_221_225_472,
          live_rows: 2_500_000,
          dead_rows: 600_000,
          removals_total: 150_000,
          email: "root@tenant.example",
          session_token: "AKIAIOSFODNN7EXAMPLE",
        }),
      (table) => [
        aggregateRow({
          recent_rows: table === "access_logs" ? 400_000 : 25,
          email: "root@tenant.example",
          raw: "<script>alert(1)</script>",
        }),
      ]
    );
    const report = await inspectPartitionTableReadiness("access_logs", executor, { now: NOW });
    expect(report.status).toBe("plan");
    expect(report.evidence.totalBytes).toBe(3_221_225_472);
    expect(report.evidence.liveRows).toBe(2_500_000);
    expect(report.evidence.deadRows).toBe(600_000);
    expect(report.evidence.removalsTotal).toBe(150_000);
    expect(report.evidence.recentRows).toBe(400_000);
    expect(report.evidence.oldestAt).toBe("2026-09-16T09:00:00.000Z");
    expect(report.evidence.newestAt).toBe("2026-09-16T09:59:00.000Z");
    for (const token of HOSTILE_TOKENS) {
      expect(JSON.stringify(report)).not.toContain(token);
    }
  });

  test("accepts both driver result shapes (bare rows and rows wrapper)", async () => {
    const bare = makeScriptedExecutor();
    const wrapped = makeRecordingExecutor((query) =>
      isCatalogQuery(query)
        ? { rows: PARTITION_READINESS_TABLE_IDS.map((id) => catalogRow(id)) }
        : { rows: [aggregateRow()] }
    );
    const fromBare = await inspectPartitionReadiness(bare, { now: NOW });
    const fromWrapped = await inspectPartitionReadiness(wrapped, { now: NOW });
    expect(stabilizedReportJson(fromWrapped)).toBe(stabilizedReportJson(fromBare));
  });
});

// ---------------------------------------------------------------------------
// Threshold classification
// ---------------------------------------------------------------------------

describe("threshold classification", () => {
  const planLevelCatalog: CatalogRow = {
    total_bytes: 3_221_225_472,
    live_rows: 2_500_000,
    dead_rows: 600_000,
    removals_total: 150_000,
  };

  test("classifies quiet evidence as observe with the missed-gate tokens and no recommendation", async () => {
    const executor = makeScriptedExecutor();
    const report = await inspectPartitionTableReadiness("sessions", executor, { now: NOW });
    expect(report.table).toBe("sessions");
    expect(report.physicalTable).toBe("sessions");
    expect(report.status).toBe("observe");
    expect(report.reasons).toEqual([
      "rows_below_plan_threshold",
      "bytes_below_plan_threshold",
      "vacuum_pressure_absent",
      "range_key_design_viable",
    ]);
    expect(report.recommendation).toBeNull();
  });

  test("classifies multi-million-row churn evidence as plan with the full recommendation block", async () => {
    const executor = makeScriptedExecutor(
      (table) => catalogRow(table, table === "access_logs" ? planLevelCatalog : {}),
      (table) => [aggregateRow({ recent_rows: table === "access_logs" ? 400_000 : 25 })]
    );
    const report = await inspectPartitionTableReadiness("access_logs", executor, { now: NOW });
    expect(report.status).toBe("plan");
    expect(report.reasons).toEqual([
      "rows_above_plan_threshold",
      "bytes_above_plan_threshold",
      "vacuum_pressure_evidenced",
      "range_key_design_viable",
    ]);
    const recommendation = report.recommendation;
    if (recommendation === null) throw new Error("expected a plan recommendation");
    expect(Object.keys(recommendation).sort()).toEqual([...EXPECTED_RECOMMENDATION_KEYS]);
    const texts = Object.values(recommendation);
    for (const text of texts) expect(text.length).toBeGreaterThan(0);
    expect(new Set(texts).size).toBe(texts.length);
    expect(recommendation.separateTask).toContain("task");
    expect(recommendation.onlineMigration).toContain("online");
    expect(recommendation.dualWriteBackfillValidation).toContain("backfill");
    expect(recommendation.backupRestore.toLowerCase()).toContain("restore");
    expect(recommendation.retentionIntegration).toBe(report.design.retentionIntegration);
    expect(Object.isFrozen(recommendation)).toBe(true);
    // The plan-level evidence math itself: rounded ratio, per-day and size averages.
    expect(report.evidence.deadRatio).toBe(0.194);
    expect(report.evidence.rowsPerDay).toBe(57_142.86);
    expect(report.evidence.avgRowBytes).toBe(1_288);
    expect(report.evidence.projectedGrowthBytesPerYear).toBe(26_864_001_343);
    expect(report.evidence.growthWindowDays).toBe(PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.default);
  });

  test("plans on size alone when cumulative removal churn is evidenced", async () => {
    const executor = makeScriptedExecutor(
      (table) =>
        catalogRow(table, {
          total_bytes: PARTITION_READINESS_THRESHOLDS.planBytes,
          live_rows: 500,
          removals_total: PARTITION_READINESS_THRESHOLDS.removalsSinceReset,
        }),
      () => [aggregateRow()]
    );
    const report = await inspectPartitionTableReadiness("webhook_deliveries", executor, {
      now: NOW,
    });
    expect(report.status).toBe("plan");
    expect(report.reasons).toEqual([
      "rows_below_plan_threshold",
      "bytes_above_plan_threshold",
      "vacuum_pressure_evidenced",
      "range_key_design_viable",
    ]);
    expect(report.recommendation).not.toBeNull();
  });

  test("stays observe when size and rows are above threshold but vacuum pressure is absent", async () => {
    const executor = makeScriptedExecutor(
      (table) =>
        catalogRow(table, {
          total_bytes: 4_294_967_296,
          live_rows: 3_000_000,
          removals_total: PARTITION_READINESS_THRESHOLDS.removalsSinceReset - 1,
        }),
      () => [aggregateRow()]
    );
    const report = await inspectPartitionTableReadiness("analytics_pageviews", executor, {
      now: NOW,
    });
    expect(report.status).toBe("observe");
    expect(report.reasons).toEqual([
      "rows_above_plan_threshold",
      "bytes_above_plan_threshold",
      "vacuum_pressure_absent",
      "range_key_design_viable",
    ]);
    expect(report.recommendation).toBeNull();
  });

  test("honors the >= boundary of the row threshold exactly at the plan floor", async () => {
    const executor = makeScriptedExecutor(
      (table) =>
        catalogRow(table, {
          live_rows: PARTITION_READINESS_THRESHOLDS.planRows,
          dead_rows: 500_000,
        }),
      () => [aggregateRow()]
    );
    const report = await inspectPartitionTableReadiness("form_submissions", executor, { now: NOW });
    expect(report.status).toBe("plan");
    expect(report.reasons).toEqual([
      "rows_above_plan_threshold",
      "bytes_below_plan_threshold",
      "vacuum_pressure_evidenced",
      "range_key_design_viable",
    ]);
  });

  test("honors the dead-row ratio boundary including its three-decimal rounding", async () => {
    // 498_000 / 2_498_000 stays below the gate even at the evidence's rounding.
    const belowRounding = makeScriptedExecutor(
      (table) => catalogRow(table, { live_rows: 2_000_000, dead_rows: 498_000 }),
      () => [aggregateRow()]
    );
    const below = await inspectPartitionTableReadiness("audit_logs", belowRounding, { now: NOW });
    expect(below.status).toBe("observe");
    expect(below.evidence.deadRatio).toBe(0.199);
    expect(below.recommendation).toBeNull();

    // 499_000 / 2_499_000 rounds to 0.2 at the evidence's three decimals.
    const atRounding = makeScriptedExecutor(
      (table) => catalogRow(table, { live_rows: 2_000_000, dead_rows: 499_000 }),
      () => [aggregateRow()]
    );
    const at = await inspectPartitionTableReadiness("audit_logs", atRounding, { now: NOW });
    expect(at.status).toBe("plan");
    expect(at.evidence.deadRatio).toBe(0.2);
    expect(at.recommendation).not.toBeNull();
  });

  test("classifies the full registry in one pass with consistent counters", async () => {
    const executor = makeScriptedExecutor(
      (table) => catalogRow(table, table === "audit_logs" ? planLevelCatalog : {}),
      (table) => [aggregateRow({ recent_rows: table === "audit_logs" ? 400_000 : 25 })]
    );
    const report = await inspectPartitionReadiness(executor, { now: NOW });
    expect(report.tablesInspected).toBe(PARTITION_READINESS_TABLE_IDS.length);
    expect(report.planCount).toBe(1);
    expect(report.observeCount).toBe(PARTITION_READINESS_TABLE_IDS.length - 1);
    expect(report.tables.map((entry) => entry.table)).toEqual([...PARTITION_READINESS_TABLE_IDS]);
    expect(report.tables.filter((entry) => entry.status === "plan").map((e) => e.table)).toEqual([
      "audit_logs",
    ]);
    expect(report.generatedAt).toBe(ISO_ANCHOR);
    expect(report.growthWindowDays).toBe(PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.default);
    expect(Number.isSafeInteger(report.durationMs)).toBe(true);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.tables)).toBe(true);
    expect(Object.isFrozen(report.tables[0].evidence)).toBe(true);
    expect(Object.isFrozen(report.tables[0].reasons)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Growth window, clock, and failure reductions
// ---------------------------------------------------------------------------

describe("growth window and clock", () => {
  test("drives the cutoff bind and the per-day projection", async () => {
    const executor = makeScriptedExecutor();
    const report = await inspectPartitionTableReadiness("access_logs", executor, {
      now: NOW,
      growthWindowDays: 30,
    });
    const aggregateCalls = executor.calls.slice(1);
    expect(aggregateCalls).toHaveLength(1);
    expect(aggregateCalls[0].params).toEqual([
      new Date(NOW.getTime() - 30 * 86_400_000).toISOString(),
    ]);
    expect(report.evidence.growthWindowDays).toBe(30);
    expect(report.evidence.rowsPerDay).toBe(0.83);
    // The default window pins the seven-day cutoff used everywhere else.
    await inspectPartitionTableReadiness("audit_logs", executor, { now: NOW });
    expect(executor.calls[3].params).toEqual([CUTOFF_DEFAULT]);
  });

  test("enforces the closed window bounds fail-closed without dialing the executor", async () => {
    const executor = makeScriptedExecutor();
    for (const invalid of [0, -1, 1.5, Number.NaN, 366, 10_000]) {
      await expectReadinessError(
        () =>
          inspectPartitionTableReadiness("access_logs", executor, {
            now: NOW,
            growthWindowDays: invalid,
          }),
        PARTITION_READINESS_ERROR_CODES.unavailable,
        "growth_window_invalid"
      );
    }
    expect(executor.calls).toHaveLength(0);
    for (const edge of [
      PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.min,
      PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.max,
    ]) {
      const report = await inspectPartitionTableReadiness("access_logs", executor, {
        now: NOW,
        growthWindowDays: edge,
      });
      expect(report.evidence.growthWindowDays).toBe(edge);
    }
  });

  test("rejects an invalid pinned clock fail-closed without dialing the executor", async () => {
    const executor = makeScriptedExecutor();
    await expectReadinessError(
      () => inspectPartitionTableReadiness("access_logs", executor, { now: new Date("nope") }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "clock_invalid"
    );
    expect(executor.calls).toHaveLength(0);
  });
});

describe("failure reductions", () => {
  test("reduces a failed catalog read to the unavailable code without driver text", async () => {
    const executor = makeRecordingExecutor(() => {
      throw new Error("ECONNREFUSED postgres://sa:hunter2@10.0.0.9:5432/secret_db");
    });
    const error = await expectReadinessError(
      () => inspectPartitionTableReadiness("access_logs", executor, { now: NOW }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "catalog_read_failed"
    );
    expect(error.message).not.toContain("ECONNREFUSED");
    expect(error.message).not.toContain("postgres://");
    expect(executor.calls).toHaveLength(1);
  });

  test("reduces a failed aggregate read to the unavailable code without driver text", async () => {
    const executor = makeRecordingExecutor((query) => {
      if (isCatalogQuery(query)) {
        return PARTITION_READINESS_TABLE_IDS.map((id) => catalogRow(id));
      }
      throw new Error("canceling statement due to statement timeout secret_token");
    });
    const error = await expectReadinessError(
      () => inspectPartitionTableReadiness("access_logs", executor, { now: NOW }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "aggregate_read_failed"
    );
    expect(error.message).not.toContain("canceling");
    expect(error.message).not.toContain("secret_token");
    expect(executor.calls).toHaveLength(2);
  });

  test("fails closed when the catalog answers without the inspected table", async () => {
    const executor = makeScriptedExecutor(
      (table) => (table === "access_logs" ? null : catalogRow(table)),
      () => [aggregateRow()]
    );
    await expectReadinessError(
      () => inspectPartitionTableReadiness("access_logs", executor, { now: NOW }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "catalog_row_missing"
    );
    const fullExecutor = makeScriptedExecutor(
      (table) => (table === "sessions" ? null : catalogRow(table)),
      () => [aggregateRow()]
    );
    await expectReadinessError(
      () => inspectPartitionReadiness(fullExecutor, { now: NOW }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "catalog_row_missing"
    );
    // The missing row short-circuits before that table's aggregate read: one
    // catalog read plus one aggregate per table ahead of it in registry order.
    expect(fullExecutor.calls).toHaveLength(1 + PARTITION_READINESS_TABLE_IDS.indexOf("sessions"));
  });

  test("fails closed when the aggregate read returns no row", async () => {
    const executor = makeScriptedExecutor(
      (table) => catalogRow(table),
      (table) => (table === "sessions" ? [] : [aggregateRow()])
    );
    await expectReadinessError(
      () => inspectPartitionTableReadiness("sessions", executor, { now: NOW }),
      PARTITION_READINESS_ERROR_CODES.unavailable,
      "aggregate_row_missing"
    );
    expect(executor.calls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// SQL guard
// ---------------------------------------------------------------------------

const SERVICE_SOURCE = readFileSync(
  new URL("../../../core/services/maintenance/partitionReadinessService.ts", import.meta.url),
  "utf8"
);

/** The contract's mandated zero set, plus the row-level DML and DCL family. */
const DESTRUCTIVE_STATEMENT_SCAN =
  /\b(create|attach|detach|drop|truncate|alter|insert|update|delete|grant|revoke|reindex|cluster|copy)\b/i;

const ALLOWLISTED_CATALOG_RELATIONS = Object.freeze([
  "pg_class",
  "pg_namespace",
  "pg_stat_user_tables",
]);

describe("SQL guard", () => {
  test("carries zero partition or destructive statement tokens anywhere in its source", () => {
    expect(SERVICE_SOURCE.match(/\b(create|attach|detach|drop|truncate|alter)\b/i)).toBeNull();
    // The raw-SQL escape hatch is equally absent: statements are `sql` templates.
    expect(SERVICE_SOURCE).not.toContain("sql.raw");
  });

  test("touches the global client only as the default executor seam", () => {
    const clientImports = SERVICE_SOURCE.match(/from "\.\.\/\.\.\/db\/client"/g) ?? [];
    expect(clientImports).toHaveLength(1);
    expect(
      SERVICE_SOURCE.match(/\bdb\.(select|insert|update|delete|transaction|execute)\b/g)
    ).toBeNull();
  });

  test("issues exactly one catalog read plus one aggregate read per allowlisted table", async () => {
    const executor = makeScriptedExecutor();
    await inspectPartitionReadiness(executor, { now: NOW });
    expect(executor.calls).toHaveLength(1 + PARTITION_READINESS_TABLE_IDS.length);
    expect(executor.calls.filter((call) => isCatalogQuery(call))).toHaveLength(1);
  });

  test("renders every issued statement as a bare SELECT over allowlisted relations only", async () => {
    const executor = makeScriptedExecutor();
    await inspectPartitionReadiness(executor, { now: NOW });
    const allowlistedRelations = new Set<string>([
      ...ALLOWLISTED_CATALOG_RELATIONS,
      ...PARTITION_READINESS_TABLE_IDS,
    ]);
    for (const call of executor.calls) {
      expect(call.text.trim().toLowerCase().startsWith("select")).toBe(true);
      expect(DESTRUCTIVE_STATEMENT_SCAN.test(call.text)).toBe(false);
      const relations = [
        ...call.text.toLowerCase().matchAll(/\b(?:from|join)\s+("?)([a-z_]+)\1/g),
      ].map((match) => match[2]);
      expect(relations.length).toBeGreaterThan(0);
      for (const relation of relations) {
        expect(allowlistedRelations.has(relation)).toBe(true);
      }
    }
  });

  test("binds the registry names instead of concatenating them into the catalog read", async () => {
    const executor = makeScriptedExecutor();
    await inspectPartitionReadiness(executor, { now: NOW });
    const [catalog] = executor.calls;
    expect(catalog.params).toEqual([...PARTITION_READINESS_TABLE_IDS]);
    expect(catalog.text).toContain("current_schema()");
    // Names travel as binds: no registry identifier appears in the statement text.
    expect(catalog.text).not.toContain("access_logs");
  });

  test("targets each aggregate read at exactly its schema-owned table and lifecycle column", async () => {
    const executor = makeScriptedExecutor();
    await inspectPartitionReadiness(executor, { now: NOW });
    const aggregateCalls = executor.calls.slice(1);
    expect(aggregateCalls.map((call) => aggregateTargetOf(call))).toEqual([
      ...PARTITION_READINESS_TABLE_IDS,
    ]);
    const quotedIdentifiers = new Set<string>();
    for (const call of aggregateCalls) {
      for (const match of call.text.matchAll(/"([a-z_]+)"/g)) {
        quotedIdentifiers.add(match[1]);
      }
    }
    const allowed = new Set<string>([
      ...PARTITION_READINESS_TABLE_IDS,
      ...PARTITION_READINESS_TABLE_REGISTRY.map((spec) => spec.design.key),
    ]);
    for (const identifier of quotedIdentifiers) {
      expect(allowed.has(identifier)).toBe(true);
    }
    for (const call of aggregateCalls) {
      expect(call.params).toEqual([CUTOFF_DEFAULT]);
    }
  });
});

// ---------------------------------------------------------------------------
// Executor seam
// ---------------------------------------------------------------------------

describe("executor seam", () => {
  test('exposes exactly the Pick<db, "execute"> surface', () => {
    type DatabaseClientModule = typeof import("../../../core/db/client");
    expectTypeOf<PartitionReadinessExecutor>().toEqualTypeOf<
      Pick<DatabaseClientModule["db"], "execute">
    >();
  });

  test("options carry only the pinned clock and growth window, never SQL or output paths", () => {
    // @ts-expect-error - arbitrary output paths are not part of the options contract
    const withOutputPath: PartitionReadinessOptions = { now: NOW, outputPath: "/tmp/report.json" };
    // @ts-expect-error - caller-authored SQL is not part of the options contract
    const withSql: PartitionReadinessOptions = { sql: "select 1" };
    void withOutputPath;
    void withSql;
  });

  test("rejects stand-ins without the execute seam at compile time", () => {
    const queryOnly = { query: async () => [] };
    // @ts-expect-error - without `execute` the stand-in fails closed: the
    // Pick<"execute"> surface is the whole injected contract.
    const rejected: PartitionReadinessExecutor = queryOnly;
    void rejected;
  });

  test("satisfies the injected path with a minimal execute-only stand-in", async () => {
    const executor = makeScriptedExecutor();
    const report = await inspectPartitionTableReadiness("webhook_deliveries", executor, {
      now: NOW,
    });
    expect(report.table).toBe("webhook_deliveries");
    expect(report.physicalTable).toBe("webhook_deliveries");
    expect(executor.calls).toHaveLength(2);
    expect(aggregateTargetOf(executor.calls[1])).toBe("webhook_deliveries");
    expect(executor.calls[1].params).toEqual([CUTOFF_DEFAULT]);
  });
});
