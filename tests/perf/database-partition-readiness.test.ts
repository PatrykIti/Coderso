/**
 * TASK-551-06-L03 partition-readiness suite (bun lane; DB legs owner-map gated).
 *
 * Covers the leaf's partition-readiness half (contract :238-240): threshold
 * classification of the closed allowlisted table registry, the zero-partition /
 * zero-destructive SQL guard over BOTH production sources
 * (`core/services/maintenance/partitionReadinessService.ts` and
 * `scripts/task-551-partition-readiness.ts`), the `--check` CLI dispatch
 * envelope (:367-372), and the sanitization of hostile catalog values.
 *
 * Execution contract: every database leg registers through `test.skipIf` on
 * TASK-551-11's owner-injected `task551-db-test` map, gated on BOTH halves of
 * the sibling idiom in tests/perf/database-retention-jobs.test.ts: the map's
 * presence plus -- only when present -- one real `select 1` probe of the
 * owner URL. Without the map -- the airtight run (`env
 * DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test
 * tests/perf/database-partition-readiness.test.ts`) -- the probe never dials
 * and the real-catalog and CLI-smoke legs skip by name instead of dialing an
 * ambient URL, while every pure leg (registry pins, source guards,
 * injected-evidence classification, sanitization, argv grammar, exit codes)
 * still runs unchanged. No `.env` source is ever loaded and no map value is
 * read, mapped, asserted or printed; presence is probed once and the probe is
 * reduced to the two booleans below.
 *
 * Real aggregates are read through the service's injectable executor, bound to
 * the owner-map database -- never the global-pool default. Plan-classification
 * evidence is injected (scripted catalog/aggregate rows) because multi-million
 * row / multi-GB fixtures are out of scope for a shared database; the
 * real-catalog legs assert that the aggregation queries return sane, sanitized
 * values and that the pinned thresholds decide the observed status.
 *
 * Sanitization: assertions carry stable codes, reason tokens, integers and ISO
 * timestamps only. Hostile values, driver error text, URLs and binds never
 * reach an assertion message.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

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
  type PartitionReadinessTableReport,
} from "../../core/services/maintenance/partitionReadinessService";
import {
  PARTITION_READINESS_EXIT_CODES,
  PartitionReadinessCheckError,
  parsePartitionReadinessArgv,
  readClassifiedTables,
} from "../../scripts/task-551-partition-readiness";

/**
 * Presence half of the gate for TASK-551-11's owner-injected `task551-db-test`
 * map (exact-own child fixture map `TASK551_FIXTURE_DATABASE_URL`/`_NAME`/
 * `_SENTINEL` plus fixed OS keys, with no inherited environment). Only the
 * map's presence -- never its values -- may authorize dialing the real
 * database.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/**
 * Routability half of the gate (mirrors tests/perf/database-retention-jobs.test.ts):
 * with the owner map present, the owner URL must answer a real `select 1`
 * before any DB leg may run. Under the airtight local form the map is absent,
 * so this probe never dials anything and every DB leg skips.
 */
let OWNER_DATABASE_ROUTABLE = false;
if (OWNER_DB_TEST_MAP_PRESENT) {
  try {
    const { default: postgres } = await import("postgres");
    const probe = postgres(process.env.TASK551_FIXTURE_DATABASE_URL as string, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 5,
    });
    try {
      const rows = (await probe`select 1 as one`) as { one: number }[];
      OWNER_DATABASE_ROUTABLE = rows[0]?.one === 1;
    } finally {
      await probe.end({ timeout: 5 });
    }
  } catch {
    OWNER_DATABASE_ROUTABLE = false;
  }
}

/** Named gate: exactly the real-database legs register through `test.skipIf`. */
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT || !OWNER_DATABASE_ROUTABLE);

/** Non-routable stand-in for the failure-arm CLI leg (no database is dialed). */
const UNROUTABLE_DATABASE_URL = "postgresql://127.0.0.1:1/none";

/** Wall-clock budget for one spawned `--check` child process. */
const CHECK_CLI_BUDGET_MS = 60_000;

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CHECK_SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/task-551-partition-readiness.ts", import.meta.url)
);

/** The two production sources this suite guards, read once. */
const SERVICE_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../../core/services/maintenance/partitionReadinessService.ts", import.meta.url)
  ),
  "utf8"
);
const CLI_SOURCE = readFileSync(CHECK_SCRIPT_PATH, "utf8");

// ---------------------------------------------------------------------------
// Shared fixtures and expectations (pure)
// ---------------------------------------------------------------------------

/** Pinned clock so injected evidence has a deterministic growth window. */
const FIXED_NOW = new Date("2026-09-16T00:00:00.000Z");

/** The pinned default window, reused by every classification leg. */
const DEFAULT_WINDOW_DAYS = 7;

/** The closed reason vocabulary `classify` may emit, per the landed service. */
const CLASSIFICATION_REASON_TOKENS = [
  "rows_above_plan_threshold",
  "rows_below_plan_threshold",
  "bytes_above_plan_threshold",
  "bytes_below_plan_threshold",
  "vacuum_pressure_evidenced",
  "vacuum_pressure_absent",
  "range_key_design_viable",
] as const;

/** The six recommendation keys every `plan` result must embed verbatim. */
const RECOMMENDATION_KEYS = [
  "separateTask",
  "onlineMigration",
  "dualWriteBackfillValidation",
  "rollback",
  "backupRestore",
  "retentionIntegration",
] as const;

/** The sanitized evidence fields that must always be finite, non-negative. */
const EVIDENCE_COUNT_FIELDS = [
  "totalBytes",
  "heapBytes",
  "indexBytes",
  "liveRows",
  "deadRows",
  "recentRows",
  "rowsPerDay",
  "avgRowBytes",
  "projectedGrowthBytesPerYear",
  "insertsTotal",
  "updatesTotal",
  "removalsTotal",
] as const;

type CatalogCell = string | number | Date | null;

/** One catalog row in the exact shape the service's driver coercion accepts. */
const catalogRow = (
  overrides: Readonly<Record<string, CatalogCell>> = {}
): Record<string, CatalogCell> => ({
  table_name: "sessions",
  total_bytes: 4096,
  heap_bytes: 2048,
  index_bytes: 2048,
  live_rows: 10,
  dead_rows: 0,
  inserts_total: 25,
  updates_total: 0,
  removals_total: 0,
  last_vacuum_at: null,
  last_autovacuum_at: null,
  ...overrides,
});

/** One aggregate row: oldest/newest lifecycle timestamp plus window count. */
const aggregateRow = (
  overrides: Readonly<Record<string, CatalogCell>> = {}
): Record<string, CatalogCell> => ({
  oldest_at: new Date("2026-08-01T00:00:00.000Z"),
  newest_at: new Date("2026-09-15T23:59:59.000Z"),
  recent_rows: 7,
  ...overrides,
});

/**
 * Executor stand-in that replays one scripted result per `execute` call, in
 * call order (call 1 = the catalog read, then one aggregate read per table).
 * An `Error` entry is thrown instead, scripting a failed read. Documented
 * cast: the stand-in proves the service's `Pick<typeof db, "execute">` surface.
 */
const scriptedExecutor = (script: readonly unknown[]): PartitionReadinessExecutor => {
  let cursor = 0;
  return {
    execute: async () => {
      const next = script[cursor];
      cursor += 1;
      if (next instanceof Error) throw next;
      if (next === undefined) throw new Error("partition_readiness_script_exhausted");
      return next;
    },
  } as unknown as PartitionReadinessExecutor;
};

/**
 * One inspection of one table against a scripted executor and pinned clock.
 * Each script entry is one `execute` result: a bare row object is normalized
 * to the one-row list the driver hands back, an array passes through (so `[]`
 * scripts a missing aggregate row) and an `Error` entry stays a failed read.
 */
const inspectOne = async (
  table: string,
  script: readonly unknown[],
  options: Readonly<{ now?: Date; growthWindowDays?: number }> = {}
): Promise<PartitionReadinessTableReport> =>
  inspectPartitionTableReadiness(
    table,
    scriptedExecutor(
      script.map((entry) => (Array.isArray(entry) || entry instanceof Error ? entry : [entry]))
    ),
    {
      now: options.now ?? FIXED_NOW,
      growthWindowDays: options.growthWindowDays ?? DEFAULT_WINDOW_DAYS,
    }
  );

/** Captures a fail-closed inspection outcome as the service's typed error. */
const captureReadinessError = async (
  run: () => Promise<unknown>
): Promise<PartitionReadinessError> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof PartitionReadinessError) return error;
    throw error;
  }
  throw new Error("expected the inspection to fail closed");
};

/** Recomputes the contracted status from evidence and the pinned thresholds. */
const expectedStatus = (
  evidence: PartitionReadinessTableReport["evidence"]
): "observe" | "plan" => {
  const rowsAbove = evidence.liveRows >= PARTITION_READINESS_THRESHOLDS.planRows;
  const bytesAbove = evidence.totalBytes >= PARTITION_READINESS_THRESHOLDS.planBytes;
  const pressure =
    evidence.deadRatio >= PARTITION_READINESS_THRESHOLDS.deadRowRatio ||
    evidence.removalsTotal >= PARTITION_READINESS_THRESHOLDS.removalsSinceReset;
  return (rowsAbove || bytesAbove) && pressure ? "plan" : "observe";
};

const isIsoTimestampOrNull = (value: string | null): boolean =>
  value === null || (value.endsWith("Z") && !Number.isNaN(Date.parse(value)));

/**
 * Full sanitized-entry expectation, shared by injected-evidence and
 * real-catalog legs: identifiers, tokens, design notes, numeric sanity,
 * timestamp shape and the evidence-driven classification.
 */
const expectSanitizedTableEntry = (
  entry: PartitionReadinessTableReport,
  growthWindowDays: number
): void => {
  expect(entry.table.length).toBeGreaterThan(0);
  expect(entry.physicalTable).toBe(entry.table);
  expect(entry.status === "observe" || entry.status === "plan").toBe(true);
  expect(entry.reasons).toHaveLength(4);
  for (const reason of entry.reasons) {
    expect(CLASSIFICATION_REASON_TOKENS).toContain(reason);
  }
  expect(entry.reasons).toContain("range_key_design_viable");
  expect(entry.design.strategy).toBe("range_monthly");
  expect(entry.design.key.length).toBeGreaterThan(0);
  expect(entry.design.uniqueness.length).toBeGreaterThan(0);
  expect(entry.design.foreignKeys.length).toBeGreaterThan(0);
  expect(entry.design.retentionIntegration.length).toBeGreaterThan(0);

  const evidence = entry.evidence;
  expect(evidence.growthWindowDays).toBe(growthWindowDays);
  for (const field of EVIDENCE_COUNT_FIELDS) {
    expect(Number.isFinite(evidence[field])).toBe(true);
    expect(evidence[field]).toBeGreaterThanOrEqual(0);
  }
  expect(evidence.deadRatio).toBeGreaterThanOrEqual(0);
  expect(evidence.deadRatio).toBeLessThanOrEqual(1);
  for (const timestamp of [
    evidence.oldestAt,
    evidence.newestAt,
    evidence.lastVacuumAt,
    evidence.lastAutovacuumAt,
  ]) {
    expect(isIsoTimestampOrNull(timestamp)).toBe(true);
  }
  expect(entry.status).toBe(expectedStatus(evidence));

  if (entry.status === "observe") return;
  const block = entry.recommendation as unknown as Record<string, unknown>;
  for (const key of RECOMMENDATION_KEYS) {
    expect(typeof block[key]).toBe("string");
    expect((block[key] as string).length).toBeGreaterThan(0);
  }
  expect(block.retentionIntegration).toBe(entry.design.retentionIntegration);
};

// ---------------------------------------------------------------------------
// Allowlist and threshold pins (pure)
// ---------------------------------------------------------------------------

describe("partition readiness allowlist and thresholds", () => {
  test("pins the contract threshold table and growth-window bounds", () => {
    expect(PARTITION_READINESS_THRESHOLDS).toEqual({
      planRows: 2_000_000,
      planBytes: 2_147_483_648,
      deadRowRatio: 0.2,
      removalsSinceReset: 100_000,
    });
    expect(PARTITION_READINESS_GROWTH_WINDOW_BOUNDS).toEqual({ default: 7, min: 1, max: 365 });
  });

  test("declares exactly the contract table set, in order, without duplicates", () => {
    expect(PARTITION_READINESS_TABLE_IDS).toEqual([
      "access_logs",
      "audit_logs",
      "assistant_action_executions",
      "assistant_action_undo_items",
      "analytics_sessions",
      "analytics_pageviews",
      "form_submissions",
      "form_action_runs",
      "webhook_deliveries",
      "sessions",
      "page_revisions",
      "detail_page_revisions",
      "content_revisions",
      "post_revisions",
      "widget_template_revisions",
    ]);
    expect(new Set(PARTITION_READINESS_TABLE_IDS).size).toBe(PARTITION_READINESS_TABLE_IDS.length);
  });

  test("resolves every registry id to the schema-owned table and a viable range design", () => {
    for (const spec of PARTITION_READINESS_TABLE_REGISTRY) {
      // Schema drift fails closed at import inside the service; this pins the
      // same invariant from the suite side: the id IS the physical name.
      expect(getTableName(spec.table)).toBe(spec.id);
      expect(spec.design.key).toBe(spec.timeColumn.name);
      expect(spec.design.strategy).toBe("range_monthly");
      expect(spec.design.uniqueness).toContain("range key");
      expect(spec.design.foreignKeys).toContain("range key");
      expect(spec.design.retentionIntegration).toContain("range layout");
    }
  });

  test("resolves allowlisted ids and fails closed on anything else without echoing it", () => {
    const sessions = PARTITION_READINESS_TABLE_REGISTRY.find((spec) => spec.id === "sessions");
    expect(sessions).toBeDefined();
    expect(resolveAllowlistedPartitionTable("sessions")).toBe(sessions);
    expect(resolveAllowlistedPartitionTable("  sessions  ")).toBe(sessions);

    for (const candidate of ["", "   "]) {
      let whitespaceError: unknown;
      try {
        resolveAllowlistedPartitionTable(candidate);
      } catch (error) {
        whitespaceError = error;
      }
      expect(whitespaceError).toBeInstanceOf(PartitionReadinessError);
    }

    const hostile = [
      "pg_class",
      "pg_catalog.pg_class",
      "access_logs; drop table access_logs",
      "sessions -- 1=1",
      "information_schema.tables",
      "../../core/db/schema",
    ];
    for (const candidate of hostile) {
      let error: unknown;
      try {
        resolveAllowlistedPartitionTable(candidate);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(PartitionReadinessError);
      const readinessError = error as PartitionReadinessError;
      expect(readinessError.code).toBe(PARTITION_READINESS_ERROR_CODES.tableUnknown);
      expect(readinessError.reason).toBe("table_not_allowlisted");
      expect(readinessError.message).not.toContain(candidate);
    }
  });
});

// ---------------------------------------------------------------------------
// Source guards: zero partition/destructive statements (pure)
// ---------------------------------------------------------------------------

/** Labelled statement vocabulary neither production source may carry. */
const BANNED_STATEMENT_PATTERNS: readonly (readonly [string, RegExp])[] = [
  [
    "a CREATE statement",
    /\bcreate\s+(?:or\s+replace\s+)?(?:global\s+|local\s+)?(?:temp(?:orary)?\s+)?(?:table|index|schema|view|materialized|partition|sequence|policy|type|function|owner|extension|trigger|domain)\b/i,
  ],
  [
    "an ALTER statement",
    /\balter\s+(?:table|index|schema|view|partition|sequence|type|column|constraint|function|owner|extension|trigger|domain)\b/i,
  ],
  [
    "a DROP statement",
    /\bdrop\s+(?:table|index|schema|view|partition|sequence|database|column|constraint|policy|owned|function|owner|extension|trigger|domain)\b/i,
  ],
  ["a TRUNCATE statement", /\btruncate\b/i],
  ["an ATTACH PARTITION statement", /\battach\s+partition\b/i],
  ["a DETACH PARTITION statement", /\bdetach\s+(?:partition|default)\b/i],
  ["partition layout syntax", /\bpartition\s+(?:of|by)\b/i],
  ["a REINDEX statement", /\breindex\b/i],
  ["a COMMENT ON statement", /\bcomment\s+on\b/i],
  ["a privilege statement", /\b(?:grant|revoke)\b/i],
  ["a DML write statement", /\b(?:insert\s+into|delete\s+from|update\s+\S+\s+set)\b/i],
  ["a VACUUM command", /\bvacuum\s*\(/i],
];

/**
 * Broad bare-token negative over the CLI source: the facade must carry no
 * structural-migration vocabulary in any form, so any one of these nouns as a
 * standalone word refuses it outright.
 */
const CLI_BARE_DDL_TOKENS = /\b(create|attach|detach|drop|truncate|alter)\b/i;

describe("SQL guard: zero partition or destructive statements", () => {
  test("carries no partition or destructive statement token in either source", () => {
    for (const [label, pattern] of BANNED_STATEMENT_PATTERNS) {
      expect(pattern.test(SERVICE_SOURCE), `partition readiness service contains ${label}`).toBe(
        false
      );
      expect(pattern.test(CLI_SOURCE), `partition readiness CLI contains ${label}`).toBe(false);
    }
    expect(
      CLI_BARE_DDL_TOKENS.test(CLI_SOURCE),
      "partition readiness CLI contains a bare DDL token"
    ).toBe(false);
  });

  test("issues exactly the two catalog/aggregate select templates and nothing else", () => {
    // Two of the four `sql` templates are the read statements; the other two
    // are the identifier fragments `sql.join` renders into the catalog filter.
    expect(SERVICE_SOURCE.match(/sql`/g) ?? []).toHaveLength(4);
    expect(SERVICE_SOURCE.match(/sql`select\b/g) ?? []).toHaveLength(2);
    expect(SERVICE_SOURCE).toContain("pg_class");
    expect(SERVICE_SOURCE).toContain("pg_stat_user_tables");
  });

  test("keeps the CLI free of SQL, drivers and output sinks", () => {
    expect(CLI_SOURCE).not.toMatch(/sql`/);
    expect(CLI_SOURCE).not.toMatch(/drizzle-orm/);
    expect(CLI_SOURCE).not.toMatch(/node:fs|node:path|node:child_process/);
    expect(CLI_SOURCE).not.toMatch(/writeFile|appendFile|createWriteStream/);
    // The stdout/stderr pair is the only presentation surface.
    expect(CLI_SOURCE).toContain("process.stdout.write");
    expect(CLI_SOURCE).toContain("process.stderr.write");
  });

  test("declares the registry once, by literal id, in contract order", () => {
    const declaredIds = [...SERVICE_SOURCE.matchAll(/allowlisted\(\s*"([a-z0-9_]+)"/g)].map(
      (match) => match[1]
    );
    expect(declaredIds).toEqual([...PARTITION_READINESS_TABLE_IDS]);
  });
});

// ---------------------------------------------------------------------------
// Threshold classification from injected evidence (pure)
// ---------------------------------------------------------------------------

describe("threshold classification from injected evidence", () => {
  test("classifies a table below every gate as observe with the missed-gate reasons", async () => {
    const report = await inspectOne("sessions", [catalogRow(), aggregateRow()]);
    expect(report.status).toBe("observe");
    expect(report.recommendation).toBeNull();
    expect(report.reasons).toEqual([
      "rows_below_plan_threshold",
      "bytes_below_plan_threshold",
      "vacuum_pressure_absent",
      "range_key_design_viable",
    ]);
    expect(report.table).toBe("sessions");
    expect(report.physicalTable).toBe("sessions");
    expect(report.evidence.growthWindowDays).toBe(DEFAULT_WINDOW_DAYS);
    expectSanitizedTableEntry(report, DEFAULT_WINDOW_DAYS);
  });

  test("classifies size plus pressure evidence as plan with the full recommendation", async () => {
    const report = await inspectOne("sessions", [
      catalogRow({
        total_bytes: 3_221_225_472, // 3 GiB, above the 2 GiB gate
        heap_bytes: 2_147_483_648,
        index_bytes: 1_073_741_824,
        live_rows: 150_000,
        dead_rows: 40_000, // dead ratio 0.211 at 3-decimal rounding
        removals_total: 250_000,
      }),
      aggregateRow({ oldest_at: new Date("2025-01-01T00:00:00.000Z"), recent_rows: 7_000 }),
    ]);
    expect(report.status).toBe("plan");
    expect(report.reasons).toEqual([
      "rows_below_plan_threshold",
      "bytes_above_plan_threshold",
      "vacuum_pressure_evidenced",
      "range_key_design_viable",
    ]);
    expect(report.evidence.deadRatio).toBe(0.211);
    expect(report.evidence.rowsPerDay).toBe(1000);
    expect(report.evidence.avgRowBytes).toBe(Math.round(3_221_225_472 / 150_000));
    expect(report.evidence.projectedGrowthBytesPerYear).toBe(
      Math.round(1000 * 365 * Math.round(3_221_225_472 / 150_000))
    );
    const block = report.recommendation as unknown as Record<string, unknown>;
    for (const key of RECOMMENDATION_KEYS) {
      expect(typeof block[key]).toBe("string");
      expect((block[key] as string).length).toBeGreaterThan(0);
    }
    expect(block.retentionIntegration).toBe(report.design.retentionIntegration);
  });

  test("treats both size gates as inclusive lower bounds", async () => {
    const atRowThreshold = await inspectOne("sessions", [
      catalogRow({ total_bytes: 1024, live_rows: 2_000_000, dead_rows: 500_000 }),
      aggregateRow(),
    ]);
    expect(atRowThreshold.status).toBe("plan");
    expect(atRowThreshold.reasons).toContain("rows_above_plan_threshold");

    const belowByteThreshold = await inspectOne("sessions", [
      catalogRow({ total_bytes: 2_147_483_647, live_rows: 10, dead_rows: 5 }),
      aggregateRow(),
    ]);
    expect(belowByteThreshold.status).toBe("observe");
    expect(belowByteThreshold.reasons).toContain("bytes_below_plan_threshold");
  });

  test("accepts the removal counter as the pressure arm at its inclusive floor", async () => {
    const atRemovalFloor = await inspectOne("sessions", [
      catalogRow({
        total_bytes: 1024,
        live_rows: 2_000_000,
        dead_rows: 0,
        removals_total: 100_000,
      }),
      aggregateRow(),
    ]);
    expect(atRemovalFloor.status).toBe("plan");
    expect(atRemovalFloor.reasons).toContain("vacuum_pressure_evidenced");

    const underRemovalFloor = await inspectOne("sessions", [
      catalogRow({ total_bytes: 1024, live_rows: 2_000_000, dead_rows: 0, removals_total: 99_999 }),
      aggregateRow(),
    ]);
    expect(underRemovalFloor.status).toBe("observe");
    expect(underRemovalFloor.reasons).toContain("vacuum_pressure_absent");
  });

  test("never plans on vacuum pressure alone", async () => {
    const pressureOnly = await inspectOne("sessions", [
      catalogRow({ total_bytes: 1024, live_rows: 10, dead_rows: 1_000 }),
      aggregateRow(),
    ]);
    expect(pressureOnly.status).toBe("observe");
    expect(pressureOnly.reasons).toContain("vacuum_pressure_evidenced");
    expect(pressureOnly.reasons).toContain("rows_below_plan_threshold");
    expect(pressureOnly.reasons).toContain("bytes_below_plan_threshold");
    expect(pressureOnly.recommendation).toBeNull();
  });

  test("inspects the whole registry in order from one catalog read plus aggregates", async () => {
    const catalog = PARTITION_READINESS_TABLE_REGISTRY.map((spec, index) =>
      catalogRow({
        table_name: spec.id,
        total_bytes: 4096 * (index + 1),
        live_rows: 10 * (index + 1),
      })
    );
    const aggregates = PARTITION_READINESS_TABLE_REGISTRY.map(() => [aggregateRow()]);
    const report = await inspectPartitionReadiness(scriptedExecutor([catalog, ...aggregates]), {
      now: FIXED_NOW,
      growthWindowDays: DEFAULT_WINDOW_DAYS,
    });
    expect(report.tablesInspected).toBe(PARTITION_READINESS_TABLE_IDS.length);
    expect(report.planCount).toBe(0);
    expect(report.observeCount).toBe(PARTITION_READINESS_TABLE_IDS.length);
    expect(report.tables.map((entry) => entry.table)).toEqual([...PARTITION_READINESS_TABLE_IDS]);
    expect(report.generatedAt).toBe(FIXED_NOW.toISOString());
    expect(report.growthWindowDays).toBe(DEFAULT_WINDOW_DAYS);
    expect(Number.isFinite(report.durationMs)).toBe(true);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    for (const [index, entry] of report.tables.entries()) {
      expect(entry.evidence.totalBytes).toBe(4096 * (index + 1));
      expect(entry.evidence.liveRows).toBe(10 * (index + 1));
      expect(entry.evidence.recentRows).toBe(7);
      // 7 rows over a 7-day window: one row per day, rounded to 2 decimals.
      expect(entry.evidence.rowsPerDay).toBe(1);
      expect(entry.evidence.avgRowBytes).toBe(410);
      expect(entry.evidence.projectedGrowthBytesPerYear).toBe(149_650);
      expectSanitizedTableEntry(entry, DEFAULT_WINDOW_DAYS);
    }
  });

  test("sanitizes hostile catalog values instead of propagating them", async () => {
    const report = await inspectOne("sessions", [
      catalogRow({
        total_bytes: Number.NaN,
        heap_bytes: "not-a-number",
        index_bytes: Number.POSITIVE_INFINITY,
        live_rows: -25,
        dead_rows: 12,
        inserts_total: "175",
        updates_total: 1e15,
        removals_total: Number.NaN,
        last_vacuum_at: new Date("1999-12-31T23:59:59.000Z"),
        last_autovacuum_at: "2020-06-01T12:00:00.000Z",
      }),
      aggregateRow({
        oldest_at: new Date("2020-01-01T00:00:00.000Z"),
        newest_at: new Date("not-a-date"),
        recent_rows: "400",
      }),
    ]);
    const evidence = report.evidence;
    expect(evidence.totalBytes).toBe(0);
    expect(evidence.heapBytes).toBe(0);
    expect(evidence.indexBytes).toBe(0);
    expect(evidence.liveRows).toBe(0);
    expect(evidence.deadRows).toBe(12);
    expect(evidence.insertsTotal).toBe(175);
    expect(evidence.updatesTotal).toBe(1e15);
    expect(evidence.removalsTotal).toBe(0);
    expect(evidence.deadRatio).toBe(1);
    expect(evidence.avgRowBytes).toBe(0);
    expect(evidence.recentRows).toBe(400);
    expect(evidence.rowsPerDay).toBe(57.14);
    expect(evidence.projectedGrowthBytesPerYear).toBe(0);
    expect(evidence.oldestAt).toBe("2020-01-01T00:00:00.000Z");
    expect(evidence.newestAt).toBeNull();
    expect(evidence.lastVacuumAt).toBe("1999-12-31T23:59:59.000Z");
    expect(evidence.lastAutovacuumAt).toBeNull();
    expect(report.status).toBe("observe");
    expect(report.reasons).toContain("vacuum_pressure_evidenced");
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("NaN");
    expect(serialized).not.toContain("Infinity");
  });

  test("reduces read failures to sanitized unavailable codes", async () => {
    const rawDriverText = "connection refused to 10.9.8.7:5432 (secret-host.internal)";

    const catalogFailure = await captureReadinessError(() =>
      inspectOne("sessions", [new Error(rawDriverText), aggregateRow()])
    );
    expect(catalogFailure.code).toBe(PARTITION_READINESS_ERROR_CODES.unavailable);
    expect(catalogFailure.reason).toBe("catalog_read_failed");
    expect(catalogFailure.message).not.toContain("10.9.8.7");
    expect(catalogFailure.message).not.toContain("secret-host");

    const aggregateFailure = await captureReadinessError(() =>
      inspectOne("sessions", [catalogRow(), new Error(rawDriverText)])
    );
    expect(aggregateFailure.code).toBe(PARTITION_READINESS_ERROR_CODES.unavailable);
    expect(aggregateFailure.reason).toBe("aggregate_read_failed");
    expect(aggregateFailure.message).not.toContain("secret-host");

    const missingCatalogRow = await captureReadinessError(() =>
      inspectOne("sessions", [catalogRow({ table_name: "some_other_table" }), aggregateRow()])
    );
    expect(missingCatalogRow.reason).toBe("catalog_row_missing");

    const missingAggregateRow = await captureReadinessError(() =>
      inspectOne("sessions", [catalogRow(), []])
    );
    expect(missingAggregateRow.reason).toBe("aggregate_row_missing");
  });

  test("bounds the growth window and rejects an unusable clock", async () => {
    for (const growthWindowDays of [0, -1, 366, Number.NaN]) {
      const failure = await captureReadinessError(() =>
        inspectOne("sessions", [catalogRow(), aggregateRow()], { growthWindowDays })
      );
      expect(failure.code).toBe(PARTITION_READINESS_ERROR_CODES.unavailable);
      expect(failure.reason).toBe("growth_window_invalid");
    }

    const maxWindow = await inspectOne("sessions", [catalogRow(), aggregateRow()], {
      growthWindowDays: PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.max,
    });
    expect(maxWindow.evidence.growthWindowDays).toBe(365);
    // 7 rows across 365 days: 0.01917... rows/day, rounded to 0.02.
    expect(maxWindow.evidence.rowsPerDay).toBe(0.02);

    const clockFailure = await captureReadinessError(() =>
      inspectOne("sessions", [catalogRow(), aggregateRow()], { now: new Date("not-a-date") })
    );
    expect(clockFailure.reason).toBe("clock_invalid");
  });
});

// ---------------------------------------------------------------------------
// CLI facade grammar, seam and exit codes (pure)
// ---------------------------------------------------------------------------

describe("partition readiness check CLI facade", () => {
  test("pins the stable exit-code map and the typed-failure catch mapping", () => {
    expect(PARTITION_READINESS_EXIT_CODES).toEqual({
      observe: 0,
      argvInvalid: 1,
      plan: 2,
      unavailable: 3,
      unexpected: 4,
    });
    // The catch maps BOTH typed failures (the service's `PartitionReadinessError`
    // and this facade's own guard refusal `PartitionReadinessCheckError`) to
    // the unavailable pair; only genuinely untyped errors reach exit 4.
    expect(
      CLI_SOURCE.includes(
        "error instanceof PartitionReadinessError || error instanceof PartitionReadinessCheckError"
      )
    ).toBe(true);
    expect(CLI_SOURCE.includes("unavailable ? CODE_UNAVAILABLE : CODE_UNEXPECTED")).toBe(true);
  });

  test("accepts exactly one --check and refuses every other token", () => {
    expect(parsePartitionReadinessArgv(["--check"])).toEqual({ check: true });
    const refusals = [
      [],
      ["--check", "--check"],
      ["--json"],
      ["--help"],
      ["--check", "--help"],
      ["--check", "access_logs"],
      ["--check", "drop table access_logs"],
      ["--check", "/tmp/partition-readiness.json"],
      ["--check", "--output", "/tmp/partition-readiness.json"],
    ];
    for (const argv of refusals) {
      let error: unknown;
      try {
        parsePartitionReadinessArgv(argv);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(PartitionReadinessCheckError);
      expect((error as PartitionReadinessCheckError).reason).toBe(
        "partition_readiness_argv_invalid"
      );
    }
  });

  test("reads the service's real emitted row shape and fails closed otherwise", async () => {
    // One representative row per classification, produced by the service's own
    // exported inspection path: the seam must accept the exact shape the
    // service emits (keyed `status`), not a hand-built twin.
    const observeRow = await inspectOne("access_logs", [
      catalogRow({ table_name: "access_logs" }),
      aggregateRow(),
    ]);
    const planRow = await inspectOne("sessions", [
      catalogRow({
        total_bytes: 3_221_225_472,
        live_rows: 150_000,
        dead_rows: 40_000,
        removals_total: 250_000,
      }),
      aggregateRow(),
    ]);
    expect(observeRow.status).toBe("observe");
    expect(planRow.status).toBe("plan");
    const classified = readClassifiedTables({ tables: [observeRow, planRow] });
    expect(classified.map((row) => row.table)).toEqual(["access_logs", "sessions"]);
    expect(classified.map((row) => row.classification)).toEqual(["observe", "plan"]);

    const refusals: unknown[] = [
      null,
      undefined,
      "observe",
      {},
      { tables: [] },
      { tables: "observe" },
      { tables: [null] },
      { tables: [{ table: "", status: "observe" }] },
      { tables: [{ table: "pg_class", status: "observe" }] },
      { tables: [{ table: "sessions", status: "detach" }] },
      { tables: [{ table: "sessions" }] },
      // The pre-fix `classification`-keyed row is exactly the shape the seam
      // must refuse: only the service's `status` key projects.
      { tables: [{ table: "sessions", classification: "plan" }] },
    ];
    for (const shape of refusals) {
      let error: unknown;
      try {
        readClassifiedTables(shape);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(PartitionReadinessCheckError);
      expect((error as PartitionReadinessCheckError).reason).toBe(
        "partition_readiness_report_invalid"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Real catalog and CLI smoke (requires the owner-injected task551-db-test map)
// ---------------------------------------------------------------------------

type CheckCliResult = Readonly<{ stdout: string; stderr: string; exitCode: number }>;

/**
 * Spawns the `--check` facade exactly as the dispatch envelope does
 * (`bun --env-file=/dev/null scripts/task-551-partition-readiness.ts --check`)
 * and hands it the environment the runner provided -- never a sourced `.env`.
 * The optional override exists for the failure arm, which pins a dead URL.
 */
const runCheckCli = async (
  args: readonly string[],
  env?: Record<string, string | undefined>
): Promise<CheckCliResult> => {
  const proc = Bun.spawn({
    cmd: [process.execPath, CHECK_SCRIPT_PATH, ...args],
    cwd: REPO_ROOT,
    // Documented cast: pin the coalesced env to the spawn contract's exact
    // `Record<string, string | undefined>` shape (no runtime change).
    env: (env ?? process.env) as Record<string, string | undefined>,
    stdout: "pipe",
    stderr: "pipe",
    timeout: CHECK_CLI_BUDGET_MS,
    // Documented cast: runtime bun supports spawn timeout; the ambient
    // SpawnOptions type does not.
  } as { cmd: string[] } & { timeout: number });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, exitCode: await proc.exited };
};

/**
 * One owner-map binding for the real-catalog legs. The executor is injected,
 * so the service never falls back to the global-pool default, and the client
 * always reaches a terminal closed state.
 */
const withOwnerExecutor = async (
  run: (executor: PartitionReadinessExecutor) => Promise<void>
): Promise<void> => {
  const { default: postgres } = await import("postgres");
  // Presence guaranteed by the gate above; the URL value is never printed.
  const client = postgres(process.env.TASK551_FIXTURE_DATABASE_URL!, { max: 1 });
  try {
    // Documented cast: a schema-less drizzle binding over the owner-map client
    // proves the service's `Pick<typeof db, "execute">` executor surface.
    await run(drizzle(client) as unknown as PartitionReadinessExecutor);
  } finally {
    await client.end({ timeout: 5 });
  }
};

describe("partition readiness on the real catalog (requires the owner-injected task551-db-test map)", () => {
  testIfDb("classifies the whole allowlisted catalog from real aggregates", async () => {
    await withOwnerExecutor(async (executor) => {
      const report = await inspectPartitionReadiness(executor, {
        now: new Date(),
        growthWindowDays: PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.default,
      });
      expect(report.tablesInspected).toBe(PARTITION_READINESS_TABLE_IDS.length);
      expect(report.tables.map((entry) => entry.table)).toEqual([...PARTITION_READINESS_TABLE_IDS]);
      expect(report.planCount + report.observeCount).toBe(report.tablesInspected);
      expect(report.growthWindowDays).toBe(PARTITION_READINESS_GROWTH_WINDOW_BOUNDS.default);
      expect(Number.isFinite(report.durationMs)).toBe(true);
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
      for (const entry of report.tables) {
        expectSanitizedTableEntry(entry, report.growthWindowDays);
      }
    });
  });

  testIfDb("inspects one allowlisted table by id against the real catalog", async () => {
    await withOwnerExecutor(async (executor) => {
      const single = await inspectPartitionTableReadiness("sessions", executor, {
        now: new Date(),
        growthWindowDays: DEFAULT_WINDOW_DAYS,
      });
      expect(single.table).toBe("sessions");
      expect(single.physicalTable).toBe("sessions");
      expectSanitizedTableEntry(single, DEFAULT_WINDOW_DAYS);
    });
  });

  /**
   * Dispatch envelope (:367-372), end to end: a completed check prints exactly
   * one JSON line on stdout and exits 0 (every table observe) or 2 (at least
   * one plan). The relayed `report` is the service's own sanitized output --
   * rows keyed `status`, the shape the facade now accepts.
   */
  testIfDb("relays one stable observe or plan JSON line with the matching exit code", async () => {
    const result = await runCheckCli(["--check"]);
    expect(result.stderr).toBe("");
    const lines = result.stdout.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(result.stdout).not.toMatch(/postgres(ql)?:\/\//);
    const report = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(report.schema).toBe("coderso.task551.partition-readiness-check@v1");
    expect(report.taskId).toBe("TASK-551-06-L03");
    expect(report.check).toBe("partition-readiness-check");
    expect(report.status === "observe" || report.status === "plan").toBe(true);
    expect(report.tableCount).toBe(PARTITION_READINESS_TABLE_IDS.length);
    type RelayedTableRow = Readonly<{ table: string; status: string }>;
    const nested = report.report as {
      tablesInspected?: unknown;
      planCount?: unknown;
      observeCount?: unknown;
      tables?: readonly RelayedTableRow[];
    };
    expect(nested.tablesInspected).toBe(PARTITION_READINESS_TABLE_IDS.length);
    const planCount = nested.planCount as number;
    expect(planCount + (nested.observeCount as number)).toBe(PARTITION_READINESS_TABLE_IDS.length);
    const planTables = report.planTables as readonly string[];
    expect(planTables).toHaveLength(planCount);
    // The relayed rows are the service's real status-keyed rows, in registry
    // order, and they alone decide the derived status and exit code.
    expect(nested.tables?.map((row) => row.table)).toEqual([...PARTITION_READINESS_TABLE_IDS]);
    expect(nested.tables?.filter((row) => row.status === "plan").map((row) => row.table)).toEqual([
      ...planTables,
    ]);
    for (const id of planTables) {
      expect(PARTITION_READINESS_TABLE_IDS).toContain(id);
    }
    expect(report.status === "plan").toBe(planCount > 0);
    if (report.status === "plan") {
      expect(result.exitCode).toBe(PARTITION_READINESS_EXIT_CODES.plan);
    } else {
      expect(result.exitCode).toBe(PARTITION_READINESS_EXIT_CODES.observe);
      expect(planTables).toEqual([]);
    }
  });

  testIfDb("reduces a service-thrown unavailable to one sanitized failure line", async () => {
    const result = await runCheckCli(["--check"], {
      ...process.env,
      DATABASE_URL: UNROUTABLE_DATABASE_URL,
    });
    expect(result.stdout).toBe("");
    const lines = result.stderr.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/postgres(ql)?:\/\/|127\.0\.0\.1|econnrefused/i);
    const failure = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(failure.schema).toBe("coderso.task551.partition-readiness-check@v1");
    expect(failure.taskId).toBe("TASK-551-06-L03");
    expect(failure.check).toBe("partition-readiness-check");
    expect(failure.status).toBe("failed");
    // The dead URL fails inside the service's catalog read, so its typed
    // inspection failure must map to the stable unavailable code/exit pair,
    // with the service's reason token relayed WHOLE -- never truncated to a
    // leading slug, never driver text.
    expect(failure.code).toBe(PARTITION_READINESS_ERROR_CODES.unavailable);
    expect(result.exitCode).toBe(PARTITION_READINESS_EXIT_CODES.unavailable);
    expect(failure.reason).toBe("catalog_read_failed");
  });

  testIfDb("refuses unknown flags on stderr with exit 1 before any database contact", async () => {
    const result = await runCheckCli(["--check", "--output", "/tmp/partition-readiness.json"]);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(PARTITION_READINESS_EXIT_CODES.argvInvalid);
    expect(result.stderr.startsWith("usage: ")).toBe(true);
    expect(result.stderr).toContain("--check");
    expect(result.stderr).not.toMatch(/postgres(ql)?:\/\//);
  });
});
