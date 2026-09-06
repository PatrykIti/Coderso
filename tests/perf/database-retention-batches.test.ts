/**
 * TASK-551-06-L01 bounded-batch ceilings across the retention family (bun lane).
 *
 * From the PURE modules only (no database driver, no socket, no ambient URL)
 * this verifies the batch-size ceilings shared by the policy owner, the
 * registry and TASK-551-01-L02's frozen pins (`TASK551_RETENTION_BATCH_PINS`:
 * default 500, hard max 2,000, sentinel edges 499/500/501/2,000/2,001); the
 * `retentionPolicy.ts` truth table's ordering discipline (immutable `id ASC`
 * finish, child-first table order, the boundary row always retained); the
 * Solution Kit `LIMIT 2001` corruption sentinel, its terminality graph gate and
 * its zero-write disabled/dry-run classification (that service is imported for
 * its pure functions only -- its pool is never dialed); and the frozen
 * `2036-01-01` retention scenarios of the scale fixture.
 *
 * The two real-PostgreSQL legs register through `test.skipIf` on TASK-551-11's
 * owner-injected `task551-db-test` map (the canonical presence-only gate of
 * tests/perf/database-pool-telemetry.test.ts): without that map -- the airtight
 * run (`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null
 * test tests/perf/database-retention-batches.test.ts`) -- they skip by name
 * rather than dial an ambient URL, and with it they run unchanged against the
 * fixture database. No `.env` source is ever loaded, no map value is read,
 * mapped, asserted or printed (only key presence is probed, once), the legs
 * touch only their own session-scoped TEMP tables, and they publish stable
 * codes and integer counts only: URL, statements and binds never reach a log
 * line.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import type { Sql } from "postgres";

import {
  pruneSolutionKitRunsBatch,
  resolveSolutionKitRunsRetentionPolicy,
  solutionKitRetentionGraphIsTerminal,
  SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED,
  SOLUTION_KIT_RETENTION_PROOF_INVALID,
  type SolutionKitRetentionExecutor,
  type SolutionKitRetentionGraphTerminalityInput,
} from "../../core/services/kits/solutionKitRetentionService";
import {
  APPEND_HEAVY_RETENTION_BATCH_BOUNDS,
  APPEND_HEAVY_RETENTION_FAMILIES,
  classifyAppendHeavyTable,
} from "../../core/services/maintenance/appendHeavyRetentionRegistry";
import {
  RETENTION_BATCH_SIZE_DEFAULT,
  RETENTION_BATCH_SIZE_MAX,
  RETENTION_BATCH_SIZE_MIN,
  RETENTION_FAMILY_ORDER,
  RETENTION_FAMILY_SPECS,
  RETENTION_MAX_BATCHES_PER_RUN_DEFAULT,
  RETENTION_MAX_BATCHES_PER_RUN_MAX,
  RETENTION_MAX_BATCHES_PER_RUN_MIN,
  RetentionPolicyError,
  assertNoUnsupportedRetentionEnvKeys,
  assertRetentionFamilySpecInvariants,
  computeRetentionCutoff,
  isEligibleForRetentionCutoff,
  loadRetentionPolicies,
  normalizeRetentionPolicy,
  resolveRetentionRuntimeOptions,
  type RetentionFamily,
} from "../../core/services/maintenance/retentionPolicy";
import {
  TASK551_RETENTION_BATCH_PINS,
  TASK551_RETENTION_CLOCK_MS,
  TASK551_RETENTION_SCENARIOS,
  retentionTs,
  type ScaleProfile,
} from "./fixtures/task551DatabaseScale";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map,
 * transcribed from tests/perf/database-pool-telemetry.test.ts: only the map's
 * presence -- never its values -- may authorize dialing the real database.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/** Closed failure codes of this leaf; no driver detail, URL or statement text. */
const RETENTION_BATCH_TEST_CODES = {
  probeRowShape: "task551_l06_retention_probe_row_shape",
  boundaryRetained: "task551_l06_retention_boundary_retained",
  sentinelObserved: "task551_l06_retention_sentinel_observed",
  convergenceIncomplete: "task551_l06_retention_convergence_incomplete",
} as const;

/** The frozen TASK-551-01-L02 retention clock, pinned to its literal source. */
const FROZEN_CLOCK_ISO = "2036-01-01T00:00:00.000Z";

/** The fixture's three retention buckets, read off the frozen clock. */
const OLD_BUCKET_ISO = new Date(TASK551_RETENTION_CLOCK_MS - 1).toISOString();
const BOUNDARY_BUCKET_ISO = new Date(TASK551_RETENTION_CLOCK_MS).toISOString();
const RECENT_BUCKET_ISO = new Date(TASK551_RETENTION_CLOCK_MS + 1).toISOString();

const perProfile = (value: { small: number; large: number }, profile: ScaleProfile): number =>
  value[profile];

/** The kit service source, read once for the two static source-text legs. */
const KIT_SERVICE_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../../core/services/kits/solutionKitRetentionService.ts", import.meta.url)
  ),
  "utf8"
);

/** A raw policy candidate holding exactly the keys the normalizer accepts. */
const policyInput = (
  family: string,
  overrides: Readonly<Record<string, unknown>> = {}
): Record<string, unknown> => ({
  family,
  enabled: true,
  dryRun: false,
  maxAgeDays: 90,
  batchSize: 500,
  maxBatchesPerRun: 10,
  ...overrides,
});

// --- Batch-size ceilings: fixture pins <-> policy owner <-> registry ---

describe("retention batch ceilings", () => {
  test("the frozen fixture pins equal the policy owner and registry bounds", () => {
    expect(TASK551_RETENTION_BATCH_PINS).toEqual({
      defaultBatch: 500,
      maxBatch: 2_000,
      edges: [499, 500, 501, 2_000, 2_001],
    });
    expect(RETENTION_BATCH_SIZE_DEFAULT).toBe(TASK551_RETENTION_BATCH_PINS.defaultBatch);
    expect(RETENTION_BATCH_SIZE_MAX).toBe(TASK551_RETENTION_BATCH_PINS.maxBatch);
    expect(APPEND_HEAVY_RETENTION_BATCH_BOUNDS).toEqual({
      defaultBatchSize: 500,
      minBatchSize: 1,
      maxBatchSize: 2_000,
      defaultMaxBatchesPerRun: 10,
      minMaxBatchesPerRun: 1,
      maxMaxBatchesPerRun: 100,
    });
  });

  test("defaults are 500 rows in 10 batches; the per-run ceiling derives from them", () => {
    expect(resolveRetentionRuntimeOptions({})).toEqual({
      batchSize: 500,
      maxBatchesPerRun: 10,
      dryRun: false,
    });
    expect(RETENTION_BATCH_SIZE_DEFAULT * RETENTION_MAX_BATCHES_PER_RUN_DEFAULT).toBe(5_000);
    expect(RETENTION_BATCH_SIZE_MAX * RETENTION_MAX_BATCHES_PER_RUN_MAX).toBe(200_000);
  });

  test.each(TASK551_RETENTION_BATCH_PINS.edges)(
    "batch edge %i normalizes exactly as its ceiling position demands",
    (edge) => {
      const bounds = RETENTION_FAMILY_SPECS.access_logs;
      const policy = (batchSize: number): Record<string, unknown> =>
        policyInput("access_logs", { batchSize, maxAgeDays: bounds.defaultAgeDays });
      // 499/500/501 are legal candidate counts below the hard cap, 2,000 is the
      // cap itself, and 2,001 is the corruption sentinel: never a batch size.
      if (edge === 2_001) {
        expect(() => normalizeRetentionPolicy(policy(edge), bounds)).toThrow(RetentionPolicyError);
      } else {
        expect(normalizeRetentionPolicy(policy(edge), bounds).batchSize).toBe(edge);
      }
    }
  );

  test("the batch knob validates its closed bounds without clamping", () => {
    const batchOf = (value: string): number =>
      resolveRetentionRuntimeOptions({ RETENTION_BATCH_SIZE: value }).batchSize;
    const batchesOf = (value: string): number =>
      resolveRetentionRuntimeOptions({ RETENTION_MAX_BATCHES_PER_RUN: value }).maxBatchesPerRun;
    expect(batchOf(String(RETENTION_BATCH_SIZE_MIN))).toBe(1);
    expect(batchOf(String(RETENTION_BATCH_SIZE_MAX))).toBe(2_000);
    for (const rejected of ["2001", "0", "-1", "01", "1.0", " 500", "500 ", "abc", "1e3"]) {
      expect(() => resolveRetentionRuntimeOptions({ RETENTION_BATCH_SIZE: rejected })).toThrow(
        RetentionPolicyError
      );
    }
    expect(batchesOf(String(RETENTION_MAX_BATCHES_PER_RUN_MIN))).toBe(1);
    expect(batchesOf(String(RETENTION_MAX_BATCHES_PER_RUN_MAX))).toBe(100);
    for (const rejected of ["0", "101", "10.0", "010", "ten"]) {
      expect(() =>
        resolveRetentionRuntimeOptions({ RETENTION_MAX_BATCHES_PER_RUN: rejected })
      ).toThrow(RetentionPolicyError);
    }
  });

  test("the batch shape is family-invariant and no family key can re-shape it", () => {
    const maxed = loadRetentionPolicies({
      RETENTION_BATCH_SIZE: "2000",
      RETENTION_MAX_BATCHES_PER_RUN: "100",
    });
    const defaults = loadRetentionPolicies({});
    for (const family of RETENTION_FAMILY_ORDER) {
      expect(maxed[family].batchSize).toBe(2_000);
      expect(maxed[family].maxBatchesPerRun).toBe(100);
      expect(defaults[family].batchSize).toBe(500);
      expect(defaults[family].maxBatchesPerRun).toBe(10);
    }
    expect(() =>
      assertNoUnsupportedRetentionEnvKeys({ RETENTION_ACCESS_LOGS_BATCH_SIZE: "2000" })
    ).toThrow(RetentionPolicyError);
    expect(() =>
      assertNoUnsupportedRetentionEnvKeys({ RETENTION_ACCESS_LOGS_MAX_BATCHES_PER_RUN: "100" })
    ).toThrow(RetentionPolicyError);
  });

  test("the global dry-run is parsed once and cannot be overridden per family", () => {
    for (const policy of Object.values(loadRetentionPolicies({ RETENTION_DRY_RUN: "true" }))) {
      expect(policy.dryRun).toBe(true);
    }
    expect(() =>
      assertNoUnsupportedRetentionEnvKeys({
        RETENTION_DRY_RUN: "true",
        RETENTION_AUDIT_LOGS_DRY_RUN: "false",
      })
    ).toThrow(RetentionPolicyError);
  });

  test("a family policy absent from the closed matrix rejects instead of defaulting", () => {
    const bounds = RETENTION_FAMILY_SPECS.email_delivery_logs;
    expect(() =>
      normalizeRetentionPolicy(
        policyInput("not_a_family", { maxAgeDays: bounds.defaultAgeDays }),
        bounds
      )
    ).toThrow(RetentionPolicyError);
    expect(() =>
      normalizeRetentionPolicy(
        policyInput("access_logs", { maxAgeDays: 90, unknownField: true }),
        RETENTION_FAMILY_SPECS.access_logs
      )
    ).toThrow(RetentionPolicyError);
  });

  test("policy failures carry the one stable code plus a stable reason", () => {
    try {
      normalizeRetentionPolicy(
        policyInput("access_logs", { batchSize: 2_001 }),
        RETENTION_FAMILY_SPECS.access_logs
      );
      throw new Error("unreachable");
    } catch (error) {
      expect(error).toBeInstanceOf(RetentionPolicyError);
      const policyError = error as RetentionPolicyError;
      expect(policyError.code).toBe("retention_policy_invalid");
      expect(policyError.reason).toBe("policy_batch_size_invalid");
      expect(policyError.message).not.toContain("2001");
    }
  });
});

// --- Ordering-column discipline: the retentionPolicy truth table ---

/** One exact row of the leaf's policy matrix, transcribed as data. */
type TruthTableRow = readonly [
  family: RetentionFamily,
  envPrefix: string | null,
  defaultEnabled: boolean,
  defaultAgeDays: number,
  minAgeDays: number,
  maxAgeDays: number,
  tables: readonly (readonly [
    table: string,
    cutoffColumn: string | null,
    rowFilter: string,
    orderColumns: readonly string[],
  ])[],
];

/** Positional row builder: one line of scalars, then the hugged table list. */
const truthRow = (
  family: RetentionFamily,
  prefix: string | null,
  enabled: boolean,
  defaultAge: number,
  minAge: number,
  maxAge: number,
  tables: TruthTableRow[6]
): TruthTableRow => [family, prefix, enabled, defaultAge, minAge, maxAge, tables];

const TRUTH_TABLE: readonly TruthTableRow[] = [
  truthRow("access_logs", "RETENTION_ACCESS_LOGS_", true, 90, 7, 365, [
    ["access_logs", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("audit_logs", "RETENTION_AUDIT_LOGS_", true, 365, 30, 2_555, [
    ["audit_logs", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("email_delivery_logs", "RETENTION_EMAIL_DELIVERY_LOGS_", true, 90, 7, 365, [
    ["email_delivery_logs", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("search_history", "RETENTION_SEARCH_HISTORY_", true, 90, 7, 365, [
    ["search_history", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("integration_requests", "RETENTION_INTEGRATION_REQUESTS_", true, 90, 7, 365, [
    ["integration_requests", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("password_resets", "RETENTION_PASSWORD_RESETS_", true, 7, 1, 30, [
    ["password_resets", "expires_at", "expired_only", ["expires_at", "id"]],
  ]),
  truthRow("preview_tokens", "RETENTION_PREVIEW_TOKENS_", true, 1, 1, 30, [
    ["preview_tokens", "expires_at", "expired_only", ["expires_at", "id"]],
    ["post_preview_tokens", "expires_at", "expired_only", ["expires_at", "id"]],
  ]),
  truthRow("assistant_ingest_runs", "RETENTION_ASSISTANT_INGEST_RUNS_", true, 90, 7, 365, [
    ["assistant_doc_ingest_runs", "started_at", "all", ["started_at", "id"]],
  ]),
  truthRow("assistant_actions", "RETENTION_ASSISTANT_ACTIONS_", true, 180, 30, 730, [
    ["assistant_action_undo_items", "created_at", "all", ["created_at", "id"]],
    ["assistant_action_executions", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("analytics", null, true, 365, 30, 1_095, [
    ["analytics_pageviews", "created_at", "all", ["created_at", "id"]],
    ["analytics_sessions", "last_seen_at", "all", ["last_seen_at", "id"]],
  ]),
  truthRow("form_submissions", "RETENTION_FORM_SUBMISSIONS_", false, 365, 1, 3_650, [
    ["form_action_runs", "created_at", "all", ["created_at", "id"]],
    ["form_submissions", "created_at", "all", ["created_at", "id"]],
  ]),
  truthRow("webhook_deliveries", "RETENTION_WEBHOOK_DELIVERIES_", true, 30, 1, 365, [
    ["webhook_deliveries", "created_at", "terminal_deliveries_only", ["created_at", "id"]],
  ]),
  truthRow("sessions", "RETENTION_SESSIONS_", true, 30, 1, 365, [
    ["sessions", "expires_at", "expired_or_revoked_only", ["expires_at", "id"]],
  ]),
  truthRow("solution_kit_runs", "RETENTION_SOLUTION_KIT_RUNS_", false, 365, 30, 3_650, [
    ["solution_kit_legacy_rollback_progress", null, "all", ["id"]],
    ["solution_kit_install_items", null, "all", ["id"]],
    ["solution_kit_starter_apply_owners", null, "all", ["id"]],
    ["solution_kit_legacy_template_evidence", null, "all", ["id"]],
    ["solution_kit_install_runs", "created_at", "all", ["created_at", "id"]],
  ]),
];

describe("ordering-column discipline per the retentionPolicy truth table", () => {
  test("the encoded matrix self-check passes and lists exactly the 14 families in order", () => {
    expect(() => assertRetentionFamilySpecInvariants()).not.toThrow();
    expect(RETENTION_FAMILY_ORDER).toEqual(TRUTH_TABLE.map(([family]) => family));
  });

  test.each(TRUTH_TABLE)("%s: prefix, bounds, enablement and table order", (...row) => {
    const [family, envPrefix, defaultEnabled, defaultAge, minAge, maxAge, tables] = row;
    const spec = RETENTION_FAMILY_SPECS[family];
    expect(spec.envPrefix).toBe(envPrefix);
    expect(spec.defaultEnabled).toBe(defaultEnabled);
    expect(spec.defaultAgeDays).toBe(defaultAge);
    expect(spec.minAgeDays).toBe(minAge);
    expect(spec.maxAgeDays).toBe(maxAge);
    const proj = spec.tables.map((entry) => [
      entry.table,
      entry.cutoffColumn,
      entry.rowFilter,
      entry.orderBy.map((order) => order.column),
    ]);
    expect(proj).toEqual(tables);
    // Child-first order is the declared order, and every phase ends `id ASC`
    // with no descending leg anywhere.
    expect(spec.tables.length).toBeGreaterThan(0);
    for (const entry of spec.tables) {
      expect(entry.orderBy.length).toBeGreaterThan(0);
      const last = entry.orderBy[entry.orderBy.length - 1];
      expect(last?.column).toBe("id");
      expect(last?.direction).toBe("asc");
      for (const order of entry.orderBy) expect(order.direction).toBe("asc");
    }
  });

  test("child-first and anchored families keep their exact preservation knobs", () => {
    const spec = RETENTION_FAMILY_SPECS;
    expect(spec.search_history.keepNewestPerUser).toBe(10);
    expect(spec.assistant_ingest_runs.preserveNewestSuccessfulPerSource).toBe(1);
    expect(spec.assistant_actions.tables[0]?.table).toBe("assistant_action_undo_items");
    expect(spec.assistant_actions.tables[1]?.table).toBe("assistant_action_executions");
    expect(spec.form_submissions.tables[0]?.table).toBe("form_action_runs");
    expect(spec.form_submissions.tables[1]?.table).toBe("form_submissions");
    expect(spec.preview_tokens.tables.map((entry) => entry.table)).toEqual([
      "preview_tokens",
      "post_preview_tokens",
    ]);
    // Graph children are never age-selected; only the source run carries the
    // cutoff, and it is the last table of the child-first order.
    const kit = spec.solution_kit_runs;
    for (const entry of kit.tables.slice(0, -1)) expect(entry.cutoffColumn).toBeNull();
    expect(kit.tables[kit.tables.length - 1]?.cutoffColumn).toBe("created_at");
    expect(spec.analytics.tables[0]?.cutoffColumn).toBe("created_at");
    expect(spec.analytics.tables[1]?.cutoffColumn).toBe("last_seen_at");
  });

  test("the registry echoes the same tables, prefixes and ordering phrases", () => {
    expect(Object.keys(APPEND_HEAVY_RETENTION_FAMILIES)).toHaveLength(
      RETENTION_FAMILY_ORDER.length
    );
    for (const family of RETENTION_FAMILY_ORDER) {
      const spec = RETENTION_FAMILY_SPECS[family];
      const policyTables = spec.tables.map((entry) => entry.table).sort();
      // Registry families are keyed by name, so match structurally: exactly one
      // registry family owns exactly this family's table set.
      const matches = Object.values(APPEND_HEAVY_RETENTION_FAMILIES).filter((definition) => {
        const registryTables = [...definition.tables].sort();
        return (
          registryTables.length === policyTables.length &&
          registryTables.every((table, index) => table === policyTables[index])
        );
      });
      expect(matches, `registry family missing for ${family}`).toHaveLength(1);
      const definition = matches[0]!;
      if (spec.envPrefix === null) {
        expect(definition.ageEnvKey).toBe("ANALYTICS_RETENTION_DAYS");
        expect(definition.enabledEnvKey).toBe("RETENTION_ANALYTICS_ENABLED");
      } else {
        expect(definition.envPrefix).toBe(spec.envPrefix);
      }
      expect(definition.defaultMaxAgeDays).toBe(spec.defaultAgeDays);
      expect(definition.minMaxAgeDays).toBe(spec.minAgeDays);
      expect(definition.maxMaxAgeDays).toBe(spec.maxAgeDays);
      expect(definition.enabledByDefault).toBe(spec.defaultEnabled);
    }
    const ordered = Object.values(APPEND_HEAVY_RETENTION_FAMILIES).map(
      (definition) => definition.deleteOrder[definition.deleteOrder.length - 1]
    );
    expect(ordered.filter((phrase) => !phrase.includes("id ASC"))).toEqual([
      "progress/owner/evidence/items and rollback children before source runs",
    ]);
  });

  test("every policy table is classified by the registry; no classification is exempt", () => {
    for (const family of RETENTION_FAMILY_ORDER) {
      for (const entry of RETENTION_FAMILY_SPECS[family].tables) {
        expect(classifyAppendHeavyTable(entry.table).kind).toBe("family");
      }
    }
  });
});

// --- Solution Kit `LIMIT 2001` sentinel guard ---

describe("solution kit LIMIT 2001 sentinel guard", () => {
  test("declares exactly the sentinel and hard-cap pair the fixture pins", () => {
    const [edge499, edge500, edge501, edge2000, sentinel] = TASK551_RETENTION_BATCH_PINS.edges;
    expect([edge499, edge500, edge501, edge2000, sentinel]).toEqual([499, 500, 501, 2_000, 2_001]);
    expect(KIT_SERVICE_SOURCE).toContain("const GRAPH_SENTINEL_LIMIT = 2_001;");
    expect(KIT_SERVICE_SOURCE).toContain("const HARD_DELETE_CAP = 2_000;");
    expect(KIT_SERVICE_SOURCE).toContain(
      "export const SOLUTION_KIT_RETENTION_GRAPH_SENTINEL_LIMIT = GRAPH_SENTINEL_LIMIT;"
    );
    expect(KIT_SERVICE_SOURCE).toContain(
      "export const SOLUTION_KIT_RETENTION_HARD_DELETE_CAP = HARD_DELETE_CAP;"
    );
    expect(sentinel).toBe(TASK551_RETENTION_BATCH_PINS.maxBatch + 1);
  });

  test("probes read at most the sentinel and every over-read skips as corruption", () => {
    expect(KIT_SERVICE_SOURCE.split(".limit(GRAPH_SENTINEL_LIMIT)").length - 1).toBe(4);
    expect(KIT_SERVICE_SOURCE.split(">= GRAPH_SENTINEL_LIMIT").length - 1).toBe(7);
    expect(KIT_SERVICE_SOURCE.split("> HARD_DELETE_CAP").length - 1).toBe(2);
    // No numeric limit literal exceeds the sentinel, so no probe can read past
    // the one-row overflow that marks an oversized graph.
    const numericLimits = [...KIT_SERVICE_SOURCE.matchAll(/\.limit\((\d+)\)/g)].map(
      (match) => match[1]
    );
    for (const literal of numericLimits) expect(Number(literal)).toBeLessThanOrEqual(2_001);
  });

  test("the registry pins the same sentinel as a fail-closed preservation rule", () => {
    const kit = APPEND_HEAVY_RETENTION_FAMILIES.solutionKitRuns;
    expect(kit.cutoffMode).toBe("graph_predicate");
    expect(kit.cutoffColumns).toEqual([]);
    expect(kit.preservation).toContain("LIMIT 2001");
  });
});

// --- Solution Kit graph predicate: terminality gate + zero-write classification ---

/** The shared terminal `success` item vocabulary of the projections below. */
const KIT_SUCCESS_ITEMS = ["success"];

/** One terminality projection: the closed status vocabularies of one graph. */
type KitGraphSpec = readonly [
  sourceStatus: string,
  sourceItemStatuses: string[],
  rollbackStatuses: string[],
  rollbackItemStatuses: string[],
];

/** Asserts one projection of that spec, keeping one expect() per call. */
const expectTerminal = (
  [sourceStatus, sourceItemStatuses, rollbackStatuses, rollbackItemStatuses]: KitGraphSpec,
  expected: boolean
): void => {
  const graph: SolutionKitRetentionGraphTerminalityInput = {
    sourceStatus,
    sourceItemStatuses,
    rollbackStatuses,
    rollbackItemStatuses,
  };
  expect(solutionKitRetentionGraphIsTerminal(graph)).toBe(expected);
};

const KIT_SOURCE_RUN_ID = "1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const KIT_ROLLBACK_RUN_ID = "2f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const KIT_ITEM_ID = "3f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const KIT_NOW = new Date(TASK551_RETENTION_CLOCK_MS);
const kitRunRow = (id: string, mode: string, status: string, proof: boolean) => ({
  id,
  kitId: "kit",
  mode,
  status,
  rollbackOfRunId: mode === "apply" ? null : KIT_SOURCE_RUN_ID,
  rollbackProofVersion: proof ? 1 : null,
  rollbackProofKind: proof ? "zero_net" : null,
  rollbackProofDigest: proof ? "a".repeat(64) : null,
  createdAt: new Date(0),
});
const kitItemRow = (status: string) => ({
  id: KIT_ITEM_ID,
  runId: KIT_SOURCE_RUN_ID,
  position: 0,
  resourceType: "page",
  resourceKey: "legacy-page",
  operation: "create",
  status,
  beforeSnapshot: null,
  afterSnapshot: null,
  rollbackAction: null,
  error: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

/**
 * One driver-accurate no-write executor over that graph. Probe dispatch is the
 * contract's own: the lock (`FOR UPDATE`) answers the source row, the sentinel
 * probe the rollback children, `LIMIT 1` the newer-successful-apply probe, the
 * batch read the age candidate, and the two item reads source items then the
 * rollback child's. Deletes are only recorded and resolve to the postgres.js
 * zero-count RowList shape (`count`, never `rowCount`). `null` seeds no graph.
 */
const kitExecutor = (
  sourceItemStatus: string | null
): SolutionKitRetentionExecutor & { writes: string[] } => {
  const writes: string[] = [];
  let itemReads = 0;
  const rowsFor = (table: string, limit: number, locked: boolean): unknown[] => {
    if (sourceItemStatus === null) return [];
    if (locked) return [kitRunRow(KIT_SOURCE_RUN_ID, "apply", "failed", false)];
    if (table === "solution_kit_install_items")
      return [kitItemRow(itemReads++ === 0 ? sourceItemStatus : "success")];
    if (table === "solution_kit_install_runs") {
      if (limit === 2_001) return [kitRunRow(KIT_ROLLBACK_RUN_ID, "rollback", "failed", true)];
      return limit === 1 ? [] : [kitRunRow(KIT_SOURCE_RUN_ID, "apply", "failed", false)];
    }
    return [];
  };
  const read = () => {
    let table = "";
    let limit = 0;
    let locked = false;
    const node: Record<string, unknown> = {
      from: (target: unknown) => {
        table = getTableName(target as never);
        return node;
      },
      where: () => node,
      orderBy: () => node,
      for: () => {
        locked = true;
        return node;
      },
      limit: (value: number) => {
        limit = value;
        return node;
      },
    };
    node.then = (
      onFulfilled: (rows: unknown[]) => unknown,
      onRejected: (error: unknown) => unknown
    ) => Promise.resolve(rowsFor(table, limit, locked)).then(onFulfilled, onRejected);
    return node;
  };
  const remove = (target: unknown) => {
    writes.push(getTableName(target as never));
    return Promise.resolve(
      Object.assign([], { count: 0, command: "DELETE", statement: null, state: null })
    );
  };
  return {
    writes,
    select: read,
    delete: remove,
    transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> =>
      callback({ select: read, delete: remove }),
  } as unknown as SolutionKitRetentionExecutor & { writes: string[] };
};

describe("solution kit graph predicate terminality (pure, driver-free)", () => {
  test("terminal zero-net, complete and source-only graphs stay delete-eligible", () => {
    // A drained terminal failed retry, the complete source/rollback graph and a
    // rollback-free source: every receipt terminal, so all stay actionable.
    expectTerminal(
      ["failed", ["success", "failed", "skipped"], ["failed"], ["success", "skipped"]],
      true
    );
    expectTerminal(["success", KIT_SUCCESS_ITEMS, KIT_SUCCESS_ITEMS, KIT_SUCCESS_ITEMS], true);
    expectTerminal(["success", ["success", "skipped"], [], []], true);
  });

  test("a non-terminal graph is never delete-eligible: it is skipped, not deleted", () => {
    // A planned or running run has not happened yet, on either graph side.
    for (const nonTerminal of ["planned", "running"]) {
      expectTerminal([nonTerminal, KIT_SUCCESS_ITEMS, KIT_SUCCESS_ITEMS, KIT_SUCCESS_ITEMS], false);
      expectTerminal(["failed", KIT_SUCCESS_ITEMS, [nonTerminal], KIT_SUCCESS_ITEMS], false);
    }
    // Hashing a planned row does not make it terminal proof authority: one
    // planned item anywhere vetoes the delete, and a status outside the closed
    // planned/success/failed/skipped vocabulary fails closed too.
    expectTerminal(["failed", ["success", "planned"], ["failed"], KIT_SUCCESS_ITEMS], false);
    expectTerminal(["failed", KIT_SUCCESS_ITEMS, ["failed"], ["planned"]], false);
    expectTerminal(["success", KIT_SUCCESS_ITEMS, [], ["planned"]], false);
    expectTerminal(["failed", ["rolled_back"], ["failed"], KIT_SUCCESS_ITEMS], false);
  });

  test("the gate decides before the digest compare and both skip codes stay closed", () => {
    // Two call sites: the rollback-owner verifier and the source-only leaf.
    expect(KIT_SERVICE_SOURCE.split("solutionKitRetentionGraphIsTerminal(").length - 1).toBe(2);
    const verifier = KIT_SERVICE_SOURCE.slice(
      KIT_SERVICE_SOURCE.indexOf("const verifyRollbackOwner"),
      KIT_SERVICE_SOURCE.indexOf("rollbackProofVersion !== 1")
    );
    expect(verifier).toContain("solutionKitRetentionGraphIsTerminal(");
    expect(verifier).toContain("SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED");
    // A caller-supplied digest is comparison data only: version, kind, builder
    // rejection and mismatch all stay `proof_invalid`.
    expect(
      KIT_SERVICE_SOURCE.split("return { ok: false, code: SOLUTION_KIT_RETENTION_PROOF_INVALID };")
        .length - 1
    ).toBe(4);
    expect(KIT_SERVICE_SOURCE).toContain("if (digest !== rollbackRun.rollbackProofDigest)");
    // Both delete ledgers keep the 2,000-row cap and every probe its sentinel.
    expect(KIT_SERVICE_SOURCE.split("if (rows > HARD_DELETE_CAP)").length - 1).toBe(2);
    expect(KIT_SERVICE_SOURCE.split(".limit(GRAPH_SENTINEL_LIMIT)").length - 1).toBe(4);
  });

  test("disabled and dry-run classification resolve the family policy with zero writes", async () => {
    expect(resolveSolutionKitRunsRetentionPolicy({})).toEqual({
      family: "solution_kit_runs",
      enabled: false,
      dryRun: false,
      maxAgeDays: 365,
      batchSize: 500,
      maxBatchesPerRun: 10,
    });
    const exec = kitExecutor(null);
    expect(
      await pruneSolutionKitRunsBatch(resolveSolutionKitRunsRetentionPolicy({}), KIT_NOW, exec)
    ).toEqual({
      family: "solution_kit_runs",
      enabled: false,
      dryRun: false,
      candidates: 0,
      units: 0,
      rows: 0,
      outcomes: [],
    });
    const dryRun = await pruneSolutionKitRunsBatch(
      { ...resolveSolutionKitRunsRetentionPolicy({}), enabled: true, dryRun: true },
      KIT_NOW,
      exec
    );
    expect([dryRun.units, dryRun.rows]).toEqual([0, 0]);
    expect(exec.writes).toEqual([]);
  });

  test("a zero_net proof over planned source rows skips unresolved and never deletes", async () => {
    const enabled = { ...resolveSolutionKitRunsRetentionPolicy({}), enabled: true };
    const plannedExec = kitExecutor("planned");
    const planned = await pruneSolutionKitRunsBatch(enabled, KIT_NOW, plannedExec);
    expect([planned.candidates, planned.units, planned.rows]).toEqual([1, 0, 0]);
    expect(planned.outcomes).toEqual([
      {
        sourceRunId: KIT_SOURCE_RUN_ID,
        action: "skipped",
        code: SOLUTION_KIT_RETENTION_GRAPH_UNRESOLVED,
      },
    ]);
    expect(plannedExec.writes).toEqual([]);
    // Counterfactual: the identical graph with terminal source items reaches
    // the digest compare and fails it as proof_invalid — the terminality gate
    // above is exactly what held the delete back, and neither batch wrote.
    const terminalExec = kitExecutor("success");
    const terminal = await pruneSolutionKitRunsBatch(enabled, KIT_NOW, terminalExec);
    expect(terminal.outcomes).toEqual([
      {
        sourceRunId: KIT_SOURCE_RUN_ID,
        action: "skipped",
        code: SOLUTION_KIT_RETENTION_PROOF_INVALID,
      },
    ]);
    expect(terminalExec.writes).toEqual([]);
  });
});

// --- Frozen 2036-01-01 retention scenarios ---

describe("frozen 2036-01-01 retention scenarios", () => {
  test("the fixture clock is the frozen instant and its buckets straddle it", () => {
    expect(TASK551_RETENTION_CLOCK_MS).toBe(Date.parse(FROZEN_CLOCK_ISO));
    expect(OLD_BUCKET_ISO).toBe("2035-12-31T23:59:59.999Z");
    expect(BOUNDARY_BUCKET_ISO).toBe(FROZEN_CLOCK_ISO);
    expect(RECENT_BUCKET_ISO).toBe("2036-01-01T00:00:00.001Z");
  });

  test("the fixture bucket rule agrees with the strict strict-older-than cutoff", () => {
    const cutoff = computeRetentionCutoff(new Date(TASK551_RETENTION_CLOCK_MS), 0);
    expect(cutoff.toISOString()).toBe(FROZEN_CLOCK_ISO);
    expect(isEligibleForRetentionCutoff(retentionTs(59), cutoff)).toBe(true);
    expect(isEligibleForRetentionCutoff(retentionTs(60), cutoff)).toBe(false);
    expect(isEligibleForRetentionCutoff(retentionTs(79), cutoff)).toBe(false);
    expect(isEligibleForRetentionCutoff(retentionTs(80), cutoff)).toBe(false);
    // Age 90 at the frozen clock retains a row exactly on the cutoff.
    const agedCutoff = computeRetentionCutoff(new Date(TASK551_RETENTION_CLOCK_MS), 90);
    expect(isEligibleForRetentionCutoff(agedCutoff, agedCutoff)).toBe(false);
    expect(isEligibleForRetentionCutoff(new Date(agedCutoff.getTime() - 1), agedCutoff)).toBe(true);
  });

  test("scenario counts are the frozen, reviewed integers for both profiles", () => {
    const profiles: readonly ScaleProfile[] = ["small", "large"];
    // [frozen population, small, large] — the reviewed integers, as data; the
    // trailing anchors row is the one population that is not an eligible count.
    const counts = [
      [TASK551_RETENTION_SCENARIOS.passwordResetsExpired.eligible, 3_000, 60_000],
      [TASK551_RETENTION_SCENARIOS.previewTokensExpired.eligiblePerTable, 1_500, 30_000],
      [TASK551_RETENTION_SCENARIOS.assistantIngestOld.eligible, 3_000, 60_000],
      [TASK551_RETENTION_SCENARIOS.formRunsChildFirst.childEligible, 3_600, 180_000],
      [TASK551_RETENTION_SCENARIOS.formRunsChildFirst.parentEligible, 1_200, 60_000],
      [TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.itemEligible, 3_000, 300_000],
      [TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.runEligible, 600, 60_000],
      [TASK551_RETENTION_SCENARIOS.assistantIngestOld.anchors, 100, 1_000],
    ] as const;
    for (const [population, small, large] of counts) {
      expect(perProfile(population, "small")).toBe(small);
      expect(perProfile(population, "large")).toBe(large);
    }
    // Every eligible population (all rows but the trailing anchors row) is a
    // positive safe integer on both profiles, i.e. a real bounded-batch
    // workload the ten-batch loop converges on.
    for (const profile of profiles) {
      for (const [population] of counts.slice(0, -1)) {
        const count = perProfile(population, profile);
        expect(Number.isSafeInteger(count)).toBe(true);
        expect(count).toBeGreaterThan(0);
      }
    }
    expect(TASK551_RETENTION_SCENARIOS.formRunsChildFirst.runsPerSubmission).toBe(3);
    expect(TASK551_RETENTION_SCENARIOS.formRunsChildFirst.disabledByDefault).toBe(true);
    expect(TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.itemsPerRun).toBe(5);
    expect(TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.anchorsPerKit).toBe(2);
    expect(TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.disabledByDefault).toBe(true);
  });

  test("every scenario table is classified and keeps the policy cutoff column", () => {
    const kitScenario = TASK551_RETENTION_SCENARIOS.solutionKitChildFirst;
    const scenarioTables = [
      ["passwordResetsExpired", ["password_resets", "expires_at"]],
      [
        "previewTokensExpired",
        ["preview_tokens", "expires_at"],
        ["post_preview_tokens", "expires_at"],
      ],
      ["assistantIngestOld", ["assistant_doc_ingest_runs", "started_at"]],
      [
        "formRunsChildFirst",
        ["form_action_runs", "created_at"],
        ["form_submissions", "created_at"],
      ],
      [
        "solutionKitChildFirst",
        ["solution_kit_install_items", null],
        ["solution_kit_install_runs", "created_at"],
      ],
    ] as const;
    for (const [scenario, ...tables] of scenarioTables) {
      for (const [table, expectedCutoff] of tables) {
        expect(classifyAppendHeavyTable(table).kind).toBe("family");
        const owner = RETENTION_FAMILY_ORDER.map((family) => RETENTION_FAMILY_SPECS[family]).find(
          (spec) => spec.tables.some((entry) => entry.table === table)
        );
        expect(owner, `no policy family owns ${table}`).toBeDefined();
        const entry = owner?.tables.find((candidate) => candidate.table === table);
        expect(entry?.cutoffColumn, `${scenario}: ${table} cutoff column`).toBe(expectedCutoff);
      }
    }
    // The scenario timestamp columns are the policy cutoff columns verbatim.
    expect(TASK551_RETENTION_SCENARIOS.passwordResetsExpired.timestampColumn).toBe("expires_at");
    expect(TASK551_RETENTION_SCENARIOS.previewTokensExpired.timestampColumn).toBe("expires_at");
    expect(TASK551_RETENTION_SCENARIOS.assistantIngestOld.timestampColumn).toBe("started_at");
    // Graph children carry no cutoff; only the source run does.
    expect(kitScenario.runFamily).toBe("solutionKitInstallRuns");
    expect(kitScenario.itemFamily).toBe("solutionKitInstallItems");
    // The anchor-driven ingest family preserves exactly the newest successful
    // run per source, matching the fixture's anchor populations.
    expect(RETENTION_FAMILY_SPECS.assistant_ingest_runs.preserveNewestSuccessfulPerSource).toBe(1);
  });
});

// --- Real-PostgreSQL batch ceilings (needs the owner-injected task551-db-test map) ---

describe("bounded batch ceilings on real PostgreSQL (requires the owner-injected task551-db-test map)", () => {
  // Named gate: both real-PostgreSQL legs register through `test.skipIf` on the
  // owner map above and skip when it is absent. The static core above never
  // needs a reachable database and keeps running unchanged.
  const ownerMapTest = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

  /**
   * One bounded candidate read, exactly the shape the pure contract pins:
   * indexed strict-older-than cutoff, `created_at ASC, id ASC`, `LIMIT <= n`.
   */
  type ProbeRow = { readonly id: number; readonly createdAt: string };

  const readCandidates = async (
    sql: Sql,
    cutoffIso: string,
    limit: number
  ): Promise<ProbeRow[]> => {
    const rows = (await sql.unsafe(
      `SELECT id, created_at::text AS created_at
         FROM retention_batch_probe
        WHERE created_at < $1::timestamptz
        ORDER BY created_at ASC, id ASC
        LIMIT $2::int`,
      [cutoffIso, limit] as never
    )) as unknown as { id: number; created_at: string }[];
    return rows.map((row) => {
      if (!Number.isFinite(row.id) || typeof row.created_at !== "string") {
        throw new Error(RETENTION_BATCH_TEST_CODES.probeRowShape);
      }
      return { id: Number(row.id), createdAt: row.created_at };
    });
  };

  /** The probe table's live row count, as one integer (-1 when unreadable). */
  const probeCount = async (sql: Sql): Promise<number> => {
    const rows = (await sql`SELECT count(*)::int AS n FROM retention_batch_probe`) as {
      n: number;
    }[];
    return rows[0]?.n ?? -1;
  };

  /** Session-scoped TEMP probe table seeded with the given [iso, count] buckets. */
  const seedProbeBuckets = async (
    sql: Sql,
    buckets: readonly (readonly [string, number])[]
  ): Promise<void> => {
    await sql`CREATE TEMP TABLE retention_batch_probe (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL
    )`;
    for (const [iso, count] of buckets) {
      await sql.unsafe(
        `INSERT INTO retention_batch_probe (created_at)
         SELECT $1::timestamptz FROM generate_series(1, $2::int)`,
        [iso, count] as never
      );
    }
  };

  /** One owner-map connection, always closed, handing its session to `run`. */
  const withOwnerSql = async (run: (sql: Sql) => Promise<void>): Promise<void> => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.TASK551_FIXTURE_DATABASE_URL!, { max: 1 });
    try {
      await run(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  };

  ownerMapTest(
    "batch edges 499/500/501/2000/2001 bound the candidate read at the frozen clock",
    async () => {
      await withOwnerSql(async (sql) => {
        // 2,001 physical rows: 1,200 old, 400 exactly on the cutoff, 401
        // recent. The whole graph exceeds the 2,000-row hard cap by exactly
        // one, which is what makes the sentinel edge observable below.
        await seedProbeBuckets(sql, [
          [OLD_BUCKET_ISO, 1_200],
          [BOUNDARY_BUCKET_ISO, 400],
          [RECENT_BUCKET_ISO, 401],
        ]);
        expect(await probeCount(sql)).toBe(2_001);

        // Every edge read stays inside its limit, never crosses the cutoff and
        // never exceeds the eligible population.
        for (const edge of [499, 500, 501, 2_000]) {
          const candidates = await readCandidates(sql, BOUNDARY_BUCKET_ISO, edge);
          expect(candidates.length).toBe(Math.min(edge, 1_200));
          expect(candidates.every((row) => row.createdAt === OLD_BUCKET_ISO)).toBe(true);
          for (let index = 1; index < candidates.length; index += 1) {
            expect(candidates[index]!.id).toBeGreaterThan(candidates[index - 1]!.id);
          }
        }

        // LIMIT 2001 with a cutoff past every bucket observes exactly the
        // sentinel on all 2,001 physical rows: under the kit contract that
        // observation is corruption and the candidate is skipped, never
        // truncated.
        const pastEveryBucket = new Date(TASK551_RETENTION_CLOCK_MS + 2).toISOString();
        const sentinelRows = await readCandidates(sql, pastEveryBucket, 2_001);
        expect(sentinelRows.length, RETENTION_BATCH_TEST_CODES.sentinelObserved).toBe(2_001);
        // With the age filter applied the same LIMIT 2001 reads 1,200 rows,
        // strictly below the sentinel, so the candidate is safe to act on.
        const filteredSentinel = await readCandidates(sql, BOUNDARY_BUCKET_ISO, 2_001);
        expect(filteredSentinel.length).toBe(1_200);
        expect(filteredSentinel.length).toBeLessThan(2_001);
        // The boundary bucket is retained: no candidate row carries its stamp.
        expect(
          filteredSentinel.some((row) => row.createdAt !== OLD_BUCKET_ISO),
          RETENTION_BATCH_TEST_CODES.boundaryRetained
        ).toBe(false);

        // Candidate reads are read-only: nothing was deleted, updated, or
        // reordered by any read above.
        expect(await probeCount(sql)).toBe(2_001);
        expect(RETENTION_BATCH_TEST_CODES.boundaryRetained).toBeDefined();
      });
    }
  );

  ownerMapTest(
    "ten batches of 500 converge 5,000 eligible rows and the eleventh read is empty",
    async () => {
      await withOwnerSql(async (sql) => {
        await seedProbeBuckets(sql, [[OLD_BUCKET_ISO, 5_000]]);
        const cutoff = BOUNDARY_BUCKET_ISO;
        const batchSize = RETENTION_BATCH_SIZE_DEFAULT;
        const batchesAllowed = RETENTION_MAX_BATCHES_PER_RUN_DEFAULT;
        let drained = 0;
        let batchesRun = 0;
        let lastBatchRows = 0;
        while (batchesRun < batchesAllowed) {
          const candidates = await readCandidates(sql, cutoff, batchSize);
          if (candidates.length === 0) break;
          expect(candidates.length).toBeLessThanOrEqual(batchSize);
          const ids = candidates.map((row) => row.id);
          const deleted = (await sql.unsafe(
            `DELETE FROM retention_batch_probe WHERE id = ANY($1::bigint[]) RETURNING id`,
            [ids] as never
          )) as unknown as { id: number }[];
          expect(deleted.length).toBe(candidates.length);
          drained += deleted.length;
          lastBatchRows = deleted.length;
          batchesRun += 1;
        }
        expect(batchesRun).toBe(batchesAllowed);
        expect(drained).toBe(5_000);
        expect(lastBatchRows).toBe(batchSize);
        if ((await probeCount(sql)) !== 0)
          throw new Error(RETENTION_BATCH_TEST_CODES.convergenceIncomplete);
        // Repeated completed runs delete zero: the converged state is stable.
        expect(await readCandidates(sql, cutoff, batchSize)).toEqual([]);
      });
    }
  );
});
