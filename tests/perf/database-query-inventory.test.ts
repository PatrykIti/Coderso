import fs, { existsSync, readFileSync } from "node:fs";

import { describe, expect, test } from "bun:test";

import {
  CALLER_FAMILY_OPERATION_PAIRS,
  type CallerFamily,
  type CallerOperation,
  InventoryError,
  assertExactAdminPlannedRecordProjection,
  assertExactCurrentCallSiteCoverage,
  assertExactTask551BunTestPlan,
  assertExactPlannedFingerprintRegistry,
  assertExactPlannedSet,
  assertExactSanitizedReceipt,
  assertExactTelemetrySelectionAndFingerprintNullability,
  assertSanitizedInventoryArtifacts,
  assertSingleWriterOwnership,
  buildCanonicalReceipt,
  canonicalBunLaneRootsFromClassifier,
  canonicalRecordId,
  digestDiscoveredCallers,
  digestInventoryRecords,
  listCanonicalCoreFilesOrThrow,
  parseExactInventoryCliArgs,
  readRootPackageScript,
  runInventoryCheck,
  scanProductionDbCallers,
  scanSourceTextOrThrow,
  validateInventoryRecord,
} from "../../scripts/task-551-query-inventory";
import { scanIndexedSourcesOrThrow } from "../../scripts/task551QueryInventory/productionScan";
import {
  createTask551CallerPairRecord,
  createTask551CanonicalReceiptMutations,
  createTask551FixtureDiscoveredCallers,
  createTask551InvalidLifecycleSources,
  createTask551RequiredFieldRemovals,
  createTask551StoredReceiptIdentityMutations,
  createControlledInventoryScanIo,
  createInMemoryInventoryScanIo,
  PLANNED_QUERY_DELTAS,
  PLANNED_QUERY_FINGERPRINT_REGISTRY,
  TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
  TASK551_FIXTURE_REVIEW_VERSION,
  TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  TASK551_L01_BUN_TEST_PATHS,
  TASK551_L04_BUN_TEST_PATHS,
  TASK551_L02_FOLLOWUP_BUN_PATHS,
  TASK551_L02_FUTURE_BUN_PATHS,
  TASK551_L02_PREEXISTING_BUN_PATHS,
  TASK551_MUTABLE_CANONICAL_RECEIPT_FIELDS,
  TASK551_PLANNED_BUN_TEST_PATHS,
  TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS,
  TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
  TASK551_QUERY_INVENTORY,
  TASK551_QUERY_INVENTORY_RECEIPT,
  TASK551_SCANNER_REGRESSION_SOURCES,
} from "./fixtures/task551QueryInventory";
function expectInventoryError(action: () => void, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    const message = error instanceof Error ? error.message : "";
    expect(message.startsWith(`${code}:`)).toBe(true);
    expect(message).not.toMatch(/https?:\/\/|sk-|password=|secret=|token=|@example/i);
    return;
  }
  throw new Error(`Expected ${code}`);
}

async function expectAsyncInventoryError(
  action: () => Promise<unknown>,
  code: string
): Promise<void> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    const message = error instanceof Error ? error.message : "";
    expect(message.startsWith(`${code}:`)).toBe(true);
    expect(message).not.toMatch(/https?:\/\/|sk-|password=|secret=|token=|@example/i);
    return;
  }
  throw new Error(`Expected ${code}`);
}

const FULL_TREE_SCANNER_BUDGET_MS = 10_000;
// This per-test runner grace only permits failed strict runtime assertions to
// report their own diagnostics; it does not widen either <10-second contract.
const FULL_TREE_ASSERTION_REPORT_TIMEOUT_MS = 12_000;

async function scanProductionWithinRuntimeBudget() {
  const startedAt = performance.now();
  const discovered = await scanProductionDbCallers();
  // The runner grace period below only lets this monotonic assertion report a
  // breach cleanly; the scanner's contract remains strictly below 10 seconds.
  expect(performance.now() - startedAt).toBeLessThan(FULL_TREE_SCANNER_BUDGET_MS);
  return discovered;
}

describe("TASK-551 L01 reviewed inventory", () => {
  test(
    "matches every discovered production call site and immutable receipt",
    { timeout: FULL_TREE_ASSERTION_REPORT_TIMEOUT_MS },
    async () => {
      const discovered = await scanProductionWithinRuntimeBudget();
      expect(discovered).toHaveLength(1150);
      expect(TASK551_QUERY_INVENTORY).toHaveLength(1150);
      assertExactCurrentCallSiteCoverage({ discovered, current: TASK551_QUERY_INVENTORY });
      assertSingleWriterOwnership(TASK551_QUERY_INVENTORY);

      const computed = buildCanonicalReceipt({
        phase: "initial",
        discovered,
        current: TASK551_QUERY_INVENTORY,
        planned: PLANNED_QUERY_DELTAS,
        associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
        validatedAt: "reviewed-fixture-v1",
      });
      assertExactSanitizedReceipt({ actual: computed, expected: TASK551_QUERY_INVENTORY_RECEIPT });
      expect(TASK551_QUERY_INVENTORY_RECEIPT.validatedAt).toBe("reviewed-fixture-v1");
      expect(TASK551_FIXTURE_REVIEW_VERSION).toBe(1);
    }
  );

  test("covers every query class with positive current anchors and generated identifiers", () => {
    const kinds = new Set(TASK551_QUERY_INVENTORY.map((record) => record.kind));
    expect([...kinds].sort()).toEqual([
      "aggregate",
      "append",
      "list",
      "maintenance",
      "mutation",
      "point",
      "search",
    ]);
    for (const record of TASK551_QUERY_INVENTORY) {
      expect(record.recordState).toBe("current");
      expect(record.source.line).toBeGreaterThan(0);
      expect(record.source.column).toBeGreaterThan(0);
      expect(record.id).toContain(
        `${record.source.file}#${record.source.symbol}:L${record.source.line}:C${record.source.column}:`
      );
    }
  });

  test("has an exact selected fingerprint association and no external-handoff key", () => {
    assertExactTelemetrySelectionAndFingerprintNullability({
      records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
      associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
    });
    expect(PLANNED_QUERY_FINGERPRINT_REGISTRY).not.toBeNull();
    assertExactPlannedFingerprintRegistry({
      records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
      associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
      definitions: PLANNED_QUERY_FINGERPRINT_REGISTRY,
    });
    for (const record of TASK551_QUERY_INVENTORY) {
      if (record.disposition === "external-handoff")
        expect(record.telemetryFingerprintKey).toBeNull();
    }
    const mismatched = { ...TASK551_QUERY_FINGERPRINT_ASSOCIATIONS };
    const [firstId] = Object.keys(mismatched);
    mismatched[firstId!] = "task551_wrong";
    expectInventoryError(
      () =>
        assertExactTelemetrySelectionAndFingerprintNullability({
          records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
          associations: mismatched,
        }),
      "query_inventory_invalid"
    );
    const [firstDefinition] = Object.keys(PLANNED_QUERY_FINGERPRINT_REGISTRY);
    const mismatchedDefinition = {
      ...PLANNED_QUERY_FINGERPRINT_REGISTRY,
      [firstDefinition!]: "task551_wrong",
    };
    expectInventoryError(
      () =>
        assertExactPlannedFingerprintRegistry({
          records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
          associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
          definitions: mismatchedDefinition,
        }),
      "query_inventory_invalid"
    );
  });

  test("keeps the 34 closed planned deltas and L01-only Admin projection", () => {
    assertExactPlannedSet(PLANNED_QUERY_DELTAS, { total: 34, adminRead: 32, legacy: 2 });
    assertExactAdminPlannedRecordProjection({
      planned: PLANNED_QUERY_DELTAS,
      projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
    });
    expect(TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION).toHaveLength(32);
    expect(Object.isFrozen(TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION)).toBe(true);
    for (const row of TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION) {
      expect(row.id).toBe(row.plannedShapeId);
      expect(row.budgetId).toBe(row.id);
      expect(row.source.line).toBeNull();
      expect(row.source.column).toBeNull();
      expect(row.owner).toBe("TASK-551-03-L02");
    }
    const changed = PLANNED_QUERY_DELTAS.map((record) =>
      record.id === "admin-pages-page" ? { ...record, bound: 99 } : record
    );
    expectInventoryError(
      () =>
        assertExactAdminPlannedRecordProjection({
          planned: changed,
          projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
        }),
      "query_inventory_planned_delta_unresolved"
    );
  });

  test("rejects unknown, mismatched, duplicate, and incomplete record data", () => {
    const base = TASK551_QUERY_INVENTORY.find(
      (record) => record.disposition !== "external-handoff"
    )!;
    const external = TASK551_QUERY_INVENTORY.find(
      (record) => record.disposition === "external-handoff"
    )!;
    const externalWithoutBound = Object.fromEntries(
      Object.entries(external).filter(([field]) => field !== "bound")
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, unknown: true }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, source: { ...base.source, unknownNested: true } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, caller: { ...base.caller, unknownNested: true } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, source: { ...base.source, line: null } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        validateInventoryRecord({
          ...PLANNED_QUERY_DELTAS[0]!,
          source: { ...PLANNED_QUERY_DELTAS[0]!.source, line: 7 },
        }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        validateInventoryRecord({
          ...base,
          source: { ...base.source, file: "core/./services/example.ts" },
        }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        validateInventoryRecord({
          ...base,
          source: { ...base.source, file: "core/services//example.ts" },
        }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        validateInventoryRecord({
          ...base,
          source: { ...base.source, file: "core/services/../example.ts" },
        }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        validateInventoryRecord({ ...base, source: { ...base.source, symbol: "read/../write" } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, source: { ...base.source, symbol: "read//write" } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, caller: { ...base.caller, operation: "tag" } }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord({ ...base, bound: "missing" }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => validateInventoryRecord(externalWithoutBound),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () => digestInventoryRecords([externalWithoutBound]),
      "query_inventory_invalid"
    );
    for (const bound of [
      undefined,
      null,
      false,
      {},
      [],
      NaN,
      Infinity,
      -Infinity,
      0,
      -1,
      "missing",
    ]) {
      expectInventoryError(
        () => validateInventoryRecord({ ...external, bound }),
        "query_inventory_invalid"
      );
      expectInventoryError(
        () => digestInventoryRecords([{ ...external, bound }]),
        "query_inventory_invalid"
      );
    }
    for (const transactionMode of ["transaction", "session-client"] as const)
      expectInventoryError(
        () => validateInventoryRecord({ ...base, transactionMode, constraintOwner: "none" }),
        "query_inventory_invalid"
      );
    for (const constraintOwner of ["database-existing", "TASK-551-03-L03"] as const)
      validateInventoryRecord({ ...base, transactionMode: "transaction", constraintOwner });
    validateInventoryRecord({
      ...base,
      transactionMode: "session-client",
      constraintOwner: "TASK-551-03-L03",
    });
    expectInventoryError(
      () =>
        validateInventoryRecord({
          ...base,
          transactionMode: "none",
          constraintOwner: "database-existing",
        }),
      "query_inventory_invalid"
    );
    expectInventoryError(
      () =>
        assertExactTelemetrySelectionAndFingerprintNullability({
          records: [
            TASK551_QUERY_INVENTORY[0]!,
            {
              ...TASK551_QUERY_INVENTORY[1]!,
              telemetryFingerprintKey: TASK551_QUERY_INVENTORY[0]!.telemetryFingerprintKey,
            },
          ],
          associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
        }),
      "query_inventory_writer_conflict"
    );
    expectInventoryError(
      () => assertSingleWriterOwnership([base, base]),
      "query_inventory_writer_conflict"
    );
    expectInventoryError(
      () => assertExactCurrentCallSiteCoverage({ discovered: [], current: [base] }),
      "query_inventory_unowned"
    );
  });

  test("enumerates the exact 34 caller pairs and rejects every other enum cross-product", () => {
    const expected = {
      "drizzle-executor": [
        "select",
        "query",
        "execute",
        "insert",
        "update",
        "delete",
        "transaction",
        "batch",
      ],
      "postgres-client": ["query", "execute", "tag", "postgres"],
      "session-client": [
        "select",
        "query",
        "execute",
        "insert",
        "update",
        "delete",
        "transaction",
        "batch",
        "tag",
      ],
      "tagged-raw-sql": ["tag"],
      "transaction-executor": [
        "select",
        "query",
        "execute",
        "insert",
        "update",
        "delete",
        "transaction",
        "batch",
        "tag",
      ],
      "dynamic-db-import": ["import"],
      "client-construction": ["postgres", "drizzle"],
    } as const satisfies Readonly<Record<CallerFamily, readonly CallerOperation[]>>;
    expect(CALLER_FAMILY_OPERATION_PAIRS).toEqual(expected);
    const allowed = new Set(
      Object.entries(expected).flatMap(([family, operations]) =>
        operations.map((operation) => `${family}:${operation}`)
      )
    );
    expect(allowed.size).toBe(34);
    const families = Object.keys(expected) as CallerFamily[];
    const operations: readonly CallerOperation[] = [
      "select",
      "query",
      "execute",
      "insert",
      "update",
      "delete",
      "transaction",
      "batch",
      "tag",
      "import",
      "postgres",
      "drizzle",
    ];
    for (const family of families) {
      for (const operation of operations) {
        const key = `${family}:${operation}`;
        if (allowed.has(key))
          validateInventoryRecord(createTask551CallerPairRecord(family, operation));
        else
          expectInventoryError(
            () => validateInventoryRecord(createTask551CallerPairRecord(family, operation)),
            "query_inventory_invalid"
          );
      }
    }
  });

  test(
    "digest inputs and receipt identity are mutation-sensitive and clock-free",
    { timeout: FULL_TREE_ASSERTION_REPORT_TIMEOUT_MS },
    async () => {
      const discovered = await scanProductionWithinRuntimeBudget();
      const first = discovered[0]!;
      const shiftedSource = { ...first.source, column: first.source.column + 1 };
      const shifted = {
        ...first,
        source: shiftedSource,
        id: canonicalRecordId(shiftedSource, first.caller),
      };
      expect(digestDiscoveredCallers(discovered)).not.toBe(
        digestDiscoveredCallers([shifted, ...discovered.slice(1)])
      );
      const receipt = (validatedAt: `reviewed-fixture-v${number}`) =>
        buildCanonicalReceipt({
          phase: "initial",
          discovered: createTask551FixtureDiscoveredCallers(),
          current: TASK551_QUERY_INVENTORY,
          planned: PLANNED_QUERY_DELTAS,
          associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
          validatedAt,
        });
      const reviewed = receipt("reviewed-fixture-v1");
      const revalidated = receipt("reviewed-fixture-v2");
      expect({ ...reviewed, validatedAt: revalidated.validatedAt }).toEqual(revalidated);
      expectInventoryError(
        () => assertExactSanitizedReceipt({ actual: revalidated, expected: reviewed }),
        "query_inventory_final_receipt_missing"
      );
      for (const mutation of createTask551StoredReceiptIdentityMutations(reviewed)) {
        expect(
          Object.keys(mutation.actual).filter(
            (field) =>
              mutation.actual[field] !== (reviewed as Readonly<Record<string, unknown>>)[field]
          )
        ).toEqual([mutation.field]);
        expectInventoryError(
          () => assertExactSanitizedReceipt({ actual: mutation.actual, expected: reviewed }),
          mutation.code
        );
      }
      const mutations = createTask551CanonicalReceiptMutations();
      expect(new Set(mutations.flatMap((mutation) => mutation.fields))).toEqual(
        new Set(TASK551_MUTABLE_CANONICAL_RECEIPT_FIELDS)
      );
      for (const mutation of mutations) {
        const changed = buildCanonicalReceipt({
          phase: "initial",
          ...mutation,
          validatedAt: reviewed.validatedAt,
        });
        expect(changed).not.toEqual(reviewed);
        expectInventoryError(
          () => assertExactSanitizedReceipt({ actual: changed, expected: reviewed }),
          "query_inventory_final_receipt_missing"
        );
      }
      const removals = createTask551RequiredFieldRemovals();
      expect(removals.some((removal) => removal.field === "record.schemaVersion")).toBe(true);
      for (const removal of removals) {
        const action =
          removal.target === "record"
            ? () => validateInventoryRecord(removal.value)
            : removal.target === "discovered"
              ? () => digestDiscoveredCallers([removal.value])
              : () => assertExactSanitizedReceipt({ actual: removal.value, expected: reviewed });
        const code =
          removal.target === "discovered" &&
          /^discovered\.(?:id|source|caller)$/.test(removal.field)
            ? "query_inventory_scan_invalid"
            : "query_inventory_invalid";
        expectInventoryError(action, code);
      }
      const original = {
        date: globalThis.Date,
        performanceNow: performance.now,
        statSync: fs.statSync,
        hrtime: process.hrtime,
        uptime: process.uptime,
      };
      const throwClock = (): never => {
        throw new Error("receipt clock access");
      };
      try {
        globalThis.Date = class extends original.date {
          constructor() {
            super();
            throwClock();
          }
          static now(): number {
            return throwClock();
          }
        } as unknown as DateConstructor;
        performance.now = throwClock;
        fs.statSync = throwClock as typeof fs.statSync;
        process.hrtime = throwClock as unknown as typeof process.hrtime;
        process.uptime = throwClock;
        expect({ ...receipt("reviewed-fixture-v3"), validatedAt: reviewed.validatedAt }).toEqual(
          reviewed
        );
      } finally {
        globalThis.Date = original.date;
        performance.now = original.performanceNow;
        fs.statSync = original.statSync;
        process.hrtime = original.hrtime;
        process.uptime = original.uptime;
      }
    }
  );

  test("redacts secret-like input and preserves only fixed error roles", () => {
    expectInventoryError(
      () =>
        parseExactInventoryCliArgs(["--check", "--phase", "https://not-allowed.example/secret"]),
      "query_inventory_phase_invalid"
    );
    assertSanitizedInventoryArtifacts([
      TASK551_QUERY_INVENTORY,
      PLANNED_QUERY_DELTAS,
      TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
      TASK551_QUERY_INVENTORY_RECEIPT,
    ]);
  });

  test("accepts final grammar but stops at the fixed initial receipt boundary", async () => {
    await expectAsyncInventoryError(
      () => runInventoryCheck(["--check", "--phase", "final"]),
      "query_inventory_final_receipt_missing"
    );
  });
});

describe("TASK-551 L01 scanner seams", () => {
  test("finds multiple call sites in a function with stable ordered anchors", () => {
    const rows = scanSourceTextOrThrow({
      file: "core/services/example.ts",
      text: [
        'import { db } from "../db/client";',
        "export async function readAndWrite() {",
        "  await db.select();",
        "  await db.delete();",
        "  return db.transaction(async (tx) => tx.execute());",
        "}",
      ].join("\n"),
    });
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((row) => row.id)).size).toBe(4);
    expect(rows.map((row) => row.caller.operation).sort()).toEqual([
      "delete",
      "execute",
      "select",
      "transaction",
    ]);
    expect(
      rows.every(
        (row) =>
          row.source.symbol === "readAndWrite" && row.source.line > 0 && row.source.column > 0
      )
    ).toBe(true);
  });

  test("classifies constructors, raw client tags, session callbacks, and literal dynamic imports", () => {
    const constructed = scanSourceTextOrThrow({
      file: "core/services/constructed.ts",
      text: [
        'import postgres from "postgres";',
        'import { drizzle } from "drizzle-orm/postgres-js";',
        'const sql = postgres("connection");',
        "const database = drizzle(sql);",
        "export async function execute() { await database.select(); await sql`select 1`; }",
      ].join("\n"),
    });
    expect(constructed.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "postgres",
      "select",
      "tag",
    ]);

    const namespaces = scanSourceTextOrThrow({
      file: "core/server/namespaces.ts",
      text: [
        'import * as clientModule from "../db/client";',
        'import * as sessionModule from "../db/sessionClient";',
        'import * as postgresModule from "postgres";',
        'import * as drizzleModule from "drizzle-orm/postgres-js";',
        "const postgres = postgresModule.default;",
        "const drizzle = drizzleModule.drizzle;",
        "export async function execute() {",
        '  const sql = postgres("connection");',
        "  const database = drizzle(sql);",
        "  await database.select();",
        "  await clientModule.db.transaction(async (tx) => tx.delete());",
        '  return sessionModule.withSessionDatabaseClient("test", async (session) => session.execute());',
        "}",
      ].join("\n"),
    });
    expect(namespaces.map((row) => row.caller.operation).sort()).toEqual([
      "delete",
      "drizzle",
      "execute",
      "postgres",
      "select",
      "transaction",
    ]);

    const session = scanSourceTextOrThrow({
      file: "core/server/session.ts",
      text: [
        'import { withSessionDatabaseClient } from "../db/sessionClient";',
        'export async function execute() { return withSessionDatabaseClient("test", async (session) => session.execute()); }',
      ].join("\n"),
    });
    expect(session).toHaveLength(1);
    expect(session[0]!.caller).toEqual({ family: "session-client", operation: "execute" });

    const dynamic = scanSourceTextOrThrow({
      file: "core/server/dynamic.ts",
      text: [
        "export async function execute() {",
        '  const { db } = await import("../db/client");',
        "  return db.select();",
        "}",
      ].join("\n"),
    });
    expect(dynamic.map((row) => row.caller.operation).sort()).toEqual(["import", "select"]);

    const exactDynamicNamespaceAssignments = scanSourceTextOrThrow({
      file: "core/server/exactDynamicNamespaceAssignments.ts",
      text: [
        "export async function direct() {",
        '  const directModule = await import("../db/client");',
        "  let directExecutor; directExecutor = directModule.db; return directExecutor.select();",
        "}",
        "export async function namespaceDestructure() {",
        '  const namespaceModule = await import("../db/client");',
        "  const { db: namespaceExecutor } = namespaceModule; return namespaceExecutor.select();",
        "}",
        "export async function assignmentDestructure() {",
        '  const assignmentModule = await import("../db/client");',
        "  let assignmentExecutor; ({ db: assignmentExecutor } = assignmentModule); return assignmentExecutor.select();",
        "}",
        "export async function shorthandAssignment() {",
        '  const shorthandModule = await import("../db/client");',
        "  let db; ({ db } = shorthandModule); return db.select();",
        "}",
        "export async function promiseAll() {",
        '  const [{ db: promiseExecutor }] = await Promise.all([import("../db/client")]);',
        "  return promiseExecutor.select();",
        "}",
        "export async function promiseNamespace() {",
        '  const [promiseModule] = await Promise.all([import("../db/client")]);',
        "  return promiseModule.db.select();",
        "}",
        "export async function forwardClosure() {",
        "  const read = async () => { const forwardExecutor = forwardModule.db; return forwardExecutor.select(); };",
        '  const forwardModule = await import("../db/client");',
        "  return read();",
        "}",
      ].join("\n"),
    });
    expect(exactDynamicNamespaceAssignments.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "import",
      "import",
      "import",
      "import",
      "import",
      "import",
      "select",
      "select",
      "select",
      "select",
      "select",
      "select",
      "select",
    ]);

    const commentedDynamicFactory = scanSourceTextOrThrow({
      file: "core/server/commentedDynamicFactory.ts",
      text: 'export async function execute() { const load = async () => { const { db } = await import /* lazy */ ("../db/client"); return db; }; const executor = await load(); return executor.select(); }',
    });
    expect(commentedDynamicFactory.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "select",
    ]);

    const directIifeDynamicFactory = scanSourceTextOrThrow({
      file: "core/server/directIifeDynamicFactory.ts",
      text: 'export async function execute() { const executor = await (async () => { const { db } = await import("../db/client"); return db; })(); return executor.select(); }',
    });
    expect(directIifeDynamicFactory.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "select",
    ]);

    for (const lineEnding of ["\r", "\n", "\r\n", "\u2028", "\u2029"]) {
      const lineCommentDynamicFactory = scanSourceTextOrThrow({
        file: "core/server/lineCommentDynamicFactory.ts",
        text: `export async function execute() { const load = async () => { const { db } = await import // lazy${lineEnding} ("../db/client"); return db; }; const executor = await load(); return executor.select(); }`,
      });
      expect(lineCommentDynamicFactory.map((row) => row.caller.operation).sort()).toEqual([
        "import",
        "select",
      ]);
    }

    const dynamicThen = scanSourceTextOrThrow({
      file: "core/server/dynamicThen.ts",
      text: [
        "export async function direct() {",
        '  return import("../db/client").then((directModule) => directModule.db.select());',
        "}",
        "export async function destructured() {",
        '  return import("../db/client").then(({ db: thenExecutor }) => thenExecutor.select());',
        "}",
        "export async function aliased() {",
        '  return import("../db/client").then((aliasedModule) => { const aliasedExecutor = aliasedModule.db; return aliasedExecutor.select(); });',
        "}",
        "export async function fulfilledBeforeRejected() {",
        '  return import("../db/client").then((fulfilledModule) => fulfilledModule.db.select(), () => undefined);',
        "}",
      ].join("\n"),
    });
    expect(dynamicThen.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "import",
      "import",
      "import",
      "select",
      "select",
      "select",
      "select",
    ]);

    const scopedDynamicNames = scanSourceTextOrThrow({
      file: "core/server/scopedDynamicNames.ts",
      text: [
        'export async function directOne() { const module = await import("../db/client"); return module.db.select(); }',
        'export async function directTwo() { const module = await import("../db/client"); return module.db.select(); }',
        'export async function thenOne() { return import("../db/client").then((module) => module.db.select()); }',
        'export async function thenTwo() { return import("../db/client").then((module) => module.db.select()); }',
      ].join("\n"),
    });
    expect(scopedDynamicNames.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "import",
      "import",
      "import",
      "select",
      "select",
      "select",
      "select",
    ]);

    const scopedDynamicProvenance = scanSourceTextOrThrow({
      file: "core/server/scopedDynamicProvenance.ts",
      text: [
        'export async function unusedClient() { const clientModule = await import("../db/client"); return undefined; }',
        'export async function usedClient() { const clientModule = await import("../db/client"); return clientModule.db.select(); }',
        'export async function unusedPostgres() { const { default: postgres } = await import("postgres"); return undefined; }',
        'export async function usedPostgres() { const { default: postgres } = await import("postgres"); return postgres("connection"); }',
        'export async function unusedSession() { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return undefined; }',
        'export async function usedSession() { const { withSessionDatabaseClient } = await import("../db/sessionClient"); return withSessionDatabaseClient("test", async (session) => session.execute()); }',
      ].join("\n"),
    });
    expect(scopedDynamicProvenance.map((row) => row.caller.operation).sort()).toEqual([
      "execute",
      "import",
      "import",
      "import",
      "postgres",
      "select",
    ]);

    const scopedFactoryProvenance = scanSourceTextOrThrow({
      file: "core/server/scopedFactoryProvenance.ts",
      text: [
        'export async function dynamicFactory() { const load = async () => { const { db } = await import("../db/client"); return db; }; await load(); return undefined; }',
        "export async function ordinaryFactory() { const load = async () => ({}); const executor = await load(); return executor.select(); }",
      ].join("\n"),
    });
    expect(scopedFactoryProvenance).toEqual([]);

    const typedFactoryProvenance = scanSourceTextOrThrow({
      file: "core/server/typedFactoryProvenance.ts",
      text: [
        'import type { db } from "../db/client";',
        'const build = async () => { const { db } = await import("../db/client"); return { db }; };',
        "const query = async (runtimeDb: typeof db) => runtimeDb.select();",
        "export async function execute(supplied: unknown) { const deps = supplied ?? (await build()); return query((deps as { db: typeof db }).db); }",
      ].join("\n"),
    });
    expect(typedFactoryProvenance.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "select",
    ]);

    const precollectedDirectBindings = scanSourceTextOrThrow({
      file: "core/server/precollectedDirectBindings.ts",
      text: [
        'export async function direct() { const read = () => db.select(); const { db } = await import("../db/client"); return read(); }',
        'export async function promiseAll() { const read = () => db.select(); const [{ db }] = await Promise.all([import("../db/client")]); return read(); }',
        'export async function unusedDirect() { const { db } = await import("../db/client"); return 1; }',
        'export async function unusedPromiseAll() { const [{ db }] = await Promise.all([import("../db/client")]); return 1; }',
      ].join("\n"),
    });
    expect(precollectedDirectBindings.map((row) => row.caller.operation).sort()).toEqual([
      "import",
      "import",
      "select",
      "select",
    ]);

    const staticNamespaceAliases = scanSourceTextOrThrow({
      file: "core/server/staticNamespaceAliases.ts",
      text: [
        'import * as postgresModule from "postgres";',
        'import * as drizzleModule from "drizzle-orm/postgres-js";',
        'import * as sessionModule from "../db/sessionClient";',
        "const pg = postgresModule; const adapter = drizzleModule; const sessions = sessionModule;",
        'export async function run() { const sql = pg.default("connection"); const executor = adapter.drizzle(sql); await executor.select(); return sessions.withSessionDatabaseClient("test", async (session) => session.execute()); }',
      ].join("\n"),
    });
    expect(staticNamespaceAliases.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "execute",
      "postgres",
      "select",
    ]);

    const staticAssignments = scanSourceTextOrThrow({
      file: "core/server/staticAssignments.ts",
      text: TASK551_SCANNER_REGRESSION_SOURCES.staticAssignments,
    });
    expect(staticAssignments.map((row) => row.caller.operation).sort()).toEqual([
      "select",
      "select",
      "select",
    ]);
    expect(
      scanSourceTextOrThrow({
        file: "core/server/typedDependency.ts",
        text: TASK551_SCANNER_REGRESSION_SOURCES.typedDependency,
      }).map((row) => row.caller.operation)
    ).toEqual(["select"]);

    const dynamicConstructors = scanSourceTextOrThrow({
      file: "core/server/dynamicConstructors.ts",
      text: [
        "export async function construct() {",
        '  const postgresModule = await import("postgres");',
        '  const drizzleModule = await import("drizzle-orm/postgres-js");',
        '  const sql = postgresModule.default("connection");',
        "  return drizzleModule.drizzle(sql);",
        "}",
      ].join("\n"),
    });
    expect(dynamicConstructors.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "import",
      "import",
      "postgres",
    ]);

    const dynamicExtractedCapabilities = scanSourceTextOrThrow({
      file: "core/server/dynamicExtractedCapabilities.ts",
      text: [
        "export async function construct() {",
        '  const postgresModule = await import("postgres");',
        '  const drizzleModule = await import("drizzle-orm/postgres-js");',
        '  const sessionModule = await import("../db/sessionClient");',
        "  const postgres = postgresModule.default;",
        "  const drizzle = drizzleModule.drizzle;",
        "  const withSession = sessionModule.withSessionDatabaseClient;",
        '  const sql = postgres("connection");',
        "  const executor = drizzle(sql);",
        "  await executor.select();",
        '  return withSession("test", async (session) => session.execute());',
        "}",
      ].join("\n"),
    });
    expect(dynamicExtractedCapabilities.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "execute",
      "import",
      "import",
      "import",
      "postgres",
      "select",
    ]);

    const chainedDynamicOrigins = scanSourceTextOrThrow({
      file: "core/server/chainedDynamicOrigins.ts",
      text: [
        'export async function client() { const module = await import("../db/client"); const first = module.db; let second; second = first; return second.select(); }',
        'export async function constructors() { const postgresModule = await import("postgres"); const drizzleModule = await import("drizzle-orm/postgres-js"); const postgres = postgresModule.default; let postgresAgain; postgresAgain = postgres; const drizzle = drizzleModule.drizzle; const drizzleAgain = drizzle; const sql = postgresAgain("connection"); return drizzleAgain(sql); }',
        'export async function session() { const sessionModule = await import("../db/sessionClient"); const withSession = sessionModule.withSessionDatabaseClient; let run; run = withSession; return run("test", async (session) => session.execute()); }',
      ].join("\n"),
    });
    expect(chainedDynamicOrigins.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "execute",
      "import",
      "import",
      "import",
      "import",
      "postgres",
      "select",
    ]);

    const destructuredDynamicOrigins = scanSourceTextOrThrow({
      file: "core/server/destructuredDynamicOrigins.ts",
      text: [
        'export async function constructors() { const { default: postgres } = await import("postgres"); const { drizzle } = await import("drizzle-orm/postgres-js"); let pg; pg = postgres; let adapter; adapter = drizzle; const sql = pg("connection"); return adapter(sql); }',
        'export async function session() { const { withSessionDatabaseClient } = await import("../db/sessionClient"); let run; run = withSessionDatabaseClient; return run("test", async (session) => session.execute()); }',
      ].join("\n"),
    });
    expect(destructuredDynamicOrigins.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "execute",
      "import",
      "import",
      "import",
      "postgres",
    ]);

    const unusedDynamicConstructor = scanSourceTextOrThrow({
      file: "core/server/unusedDynamicConstructor.ts",
      text: [
        "export async function unused() {",
        '  const postgresModule = await import("postgres");',
        "  return postgresModule;",
        "}",
      ].join("\n"),
    });
    expect(unusedDynamicConstructor).toEqual([]);

    const safeNonliteralDynamic = scanSourceTextOrThrow({
      file: "core/services/safeNonliteralDynamic.ts",
      text: "export async function load(source: string) { const mod = await import(source); const forward = () => mod.default; return forward; }",
    });
    expect(safeNonliteralDynamic).toEqual([]);

    const assignedConstructors = scanSourceTextOrThrow({
      file: "core/server/assignedConstructors.ts",
      text: [
        'import postgres from "postgres";',
        'import { drizzle } from "drizzle-orm/postgres-js";',
        "export async function construct() {",
        '  let sql; sql = postgres("connection");',
        "  let executor; executor = drizzle(sql);",
        "  await executor.select();",
        "  return sql`select 1`;",
        "}",
      ].join("\n"),
    });
    expect(assignedConstructors.map((row) => row.caller.operation).sort()).toEqual([
      "drizzle",
      "postgres",
      "select",
      "tag",
    ]);
  });

  test("pins securitySettings runtime import, cache, and return provenance without counting its type import", async () => {
    const records = (await scanProductionDbCallers())
      .filter((record) => record.source.file === "core/services/settings/securitySettings.ts")
      .map((record) => ({ source: record.source, caller: record.caller }));
    expect(records).toEqual([
      {
        source: {
          file: "core/services/settings/securitySettings.ts",
          symbol: "getDb",
          line: 137,
          column: 26,
        },
        caller: { family: "dynamic-db-import", operation: "import" },
      },
      {
        source: {
          file: "core/services/settings/securitySettings.ts",
          symbol: "getSecuritySettings",
          line: 806,
          column: 23,
        },
        caller: { family: "drizzle-executor", operation: "select" },
      },
      {
        source: {
          file: "core/services/settings/securitySettings.ts",
          symbol: "getSecuritySettingsUpdatedAt",
          line: 852,
          column: 23,
        },
        caller: { family: "drizzle-executor", operation: "select" },
      },
      {
        source: {
          file: "core/services/settings/securitySettings.ts",
          symbol: "setSecuritySettings",
          line: 831,
          column: 9,
        },
        caller: { family: "drizzle-executor", operation: "insert" },
      },
    ]);
    const source = readFileSync("core/services/settings/securitySettings.ts", "utf8");
    for (const text of [
      source.replace("dbPromise ??=", "otherPromise ??="),
      source.replace("return db;", "return { db } as never;"),
      source.replace("return dbPromise;", "return null as never;"),
    ]) {
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/settings/securitySettings.ts", text }),
        "query_inventory_scan_invalid"
      );
    }
  });

  test("allows only transparent same-kind conditionals and the two lifecycle loaders", () => {
    const conditional = scanSourceTextOrThrow({
      file: "core/server/conditionalClient.ts",
      text: 'import { db } from "../db/client"; import postgres from "postgres"; export async function run(enabled: boolean) { const executor = enabled ? db : (db as typeof db); const sql = enabled ? postgres("a") : postgres("b"); await executor.select(); return sql; }',
    });
    expect(conditional.map((row) => row.caller.operation).sort()).toEqual([
      "postgres",
      "postgres",
      "select",
    ]);
    const client = scanSourceTextOrThrow({
      file: "core/db/client.ts",
      text: readFileSync("core/db/client.ts", "utf8"),
    });
    expect(client.map((row) => row.id)).toContain(
      "core/db/client.ts#<module>:L104:C7:client-construction:postgres"
    );
    const lifecycleSource = readFileSync("core/db/databaseLifecycle.ts", "utf8");
    expect(
      scanSourceTextOrThrow({ file: "core/db/databaseLifecycle.ts", text: lifecycleSource })
    ).toEqual([]);
    for (const loader of [
      '() => import("./other") as Promise<unknown>',
      '(value: unknown) => import("./client") as Promise<unknown>',
      '() => import("./client").then((value) => value) as Promise<unknown>',
      '() => Promise.resolve(import("./client")) as Promise<unknown>',
    ]) {
      expectInventoryError(
        () =>
          scanSourceTextOrThrow({
            file: "core/db/databaseLifecycle.ts",
            text: `let loader = ${loader}; function setDatabaseClientModuleForTests(next: (() => Promise<unknown>) | null) { loader = next ?? (() => import("./client") as Promise<unknown>); } async function loadClientModule() { return loader(); }`,
          }),
        "query_inventory_scan_invalid"
      );
    }
    for (const text of createTask551InvalidLifecycleSources(lifecycleSource))
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/db/databaseLifecycle.ts", text }),
        "query_inventory_scan_invalid"
      );
  });

  test("fails closed for malformed, unknown, nonliteral, and unsupported database forms", () => {
    expectInventoryError(
      () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text: "export function {" }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export function x() { return unknownDb.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    for (const text of [
      'import { db } from "../db/client"; import postgres from "postgres"; export async function x(enabled: boolean) { const executor = enabled ? db : postgres("x"); return executor.select(); }',
      'import { db } from "../db/client"; export async function x(enabled: boolean, unknown: unknown) { const executor = enabled ? db : unknown; return executor.select(); }',
      'import { db } from "../db/client"; export async function x(enabled: boolean, nested: boolean) { const executor = enabled ? db : nested ? db : db; return executor.select(); }',
      'import { db } from "../db/client"; export async function x(enabled: boolean) { return (enabled ? db : db).select(); }',
      ...TASK551_SCANNER_REGRESSION_SOURCES.staticFactoryEscapes,
      ...TASK551_SCANNER_REGRESSION_SOURCES.staticShadows,
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/server/badConditional.ts", text }),
        "query_inventory_scan_invalid"
      );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const db = await import(source); return db; }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const loader = await import(source); return loader.db.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const loader = await import(source); const { db: executor } = loader; return executor.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const loader = await import(source); const moduleAlias = loader; const { adapter: executor } = moduleAlias; return executor.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const loader = await import(source); let executor; ({ database: executor } = loader); return executor.query(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const client = mod.factory(); return client.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); return mod.factory().select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); return mod.factory((client) => client.select()); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const client = mod.factory(); return consume(client); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const forward = () => mod; const executor = forward(); return executor.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const alias = mod; function forward() { return alias; } return Promise.resolve().then(forward); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const forward = () => mod.factory(); const executor = forward(); return executor.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); const forward = () => ({ value: mod }).value; const executor = forward(); return executor.select(); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: "export async function x(source: string) { const mod = await import(source); function execute(executor: { select(): unknown }) { return executor.select(); } return Promise.resolve(mod).then(execute); }",
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { const handler = (module: unknown) => module; return import("../db/client").then(handler); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("../db/client").then(({ client: executor }) => executor.select()); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x(enabled: boolean, fallback: unknown) { return import("../db/client").then((module) => { const executor = enabled ? module.db : fallback; return executor.select(); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x(fallback: unknown) { return import("../db/client").then((module) => { const executor = module.db ?? fallback; return executor.select(); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("../db/client").then((module) => consume(module.db)); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("../db/client").then((module) => { function get() { return module; } const runner = get().db; return runner.select(); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("../db/client").then((module) => { const forward = (value = module) => value; const runner = forward(); return runner.select(); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("../db/client").then((module) => { const runner = identity(module).db; return runner.select(); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("postgres").then((module) => module.default("connection")); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return (import("drizzle-orm/postgres-js")).then(({ drizzle }) => drizzle(sql)); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'export async function x() { return import("postgres").then((module) => { const create = module.default; return create("connection"); }); }',
        }),
      "query_inventory_scan_invalid"
    );
    for (const text of [
      'export async function x() { return import("postgres")["then"]((module) => module.default("connection")); }',
      'export async function x() { return import("postgres").then.bind(null); }',
      'export async function x() { return Promise.resolve(import("postgres")).then((module) => module.default("connection")); }',
      'export async function x() { return import("../db/client")["then"]((module) => module.db.select()); }',
      'export async function x() { return import("../db/client").then.bind(null); }',
      'export async function x() { return Promise.resolve(import("../db/client")).then((module) => module.db.select()); }',
      'export async function x() { const { ...db } = await import("../db/client"); return db.select(); }',
      'export async function x() { return import("../db/client").then(({ ...db }) => db.select()); }',
      'export async function pg() { const { default: source } = await import("postgres"); const factory = source; return factory("connection"); } export async function drizzle() { const { drizzle: source } = await import("drizzle-orm/postgres-js"); const factory = source; return factory(sql); }',
      'export async function client() { const { db: source } = await import("../db/client"); return source(); } export async function postgres() { const { default: source } = await import("postgres"); return source("connection"); }',
      'export async function x() { return import("../db/client").then((module, executor = module.db) => executor.select()); }',
      'export async function x() { return import("../db/client").then(({ db }, executor = db) => executor.select()); }',
      'export async function x() { return import("../db/client").then((module) => module.db.wrapper.select()); }',
      'export async function x() { const pending = import("../db/client").then((module) => module.db); const executor = await pending; return executor.select(); }',
      'export async function x() { return import("../db/client").then((module) => module.db).then((executor) => executor.select()); }',
      'export async function x() { const loaders = { load: async () => { const { db } = await import("../db/client"); return db; } }; const executor = await loaders.load(); return executor.select(); }',
      'export async function x() { const module = await import("../db/client"); return module.db(); }',
      'export async function x() { const module = await import("../db/client"); const executor = module.db; return executor(); }',
      'export async function x() { return import("../db/client").then((module) => module.db()); }',
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text }),
        "query_inventory_scan_invalid"
      );
    for (const text of [
      "export async function x(source: string) { const mod = await import(source); const forward = (value = mod) => value; const executor = forward(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const forward = (value = mod.default) => value; return forward; }",
      "export async function x(source: string) { const mod = await import(source); const { value = mod } = {}; return value.select(); }",
      "export async function x(source: string) { const mod = await import(source); const [value = mod] = []; return value.select(); }",
      "export async function x(source: string) { const mod = await import(source); let executor; executor ||= mod; return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); let executor; executor &&= mod; return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); let executor; executor ??= mod; return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); let executor; ({ executor = mod } = {}); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); for (const executor of [mod]) return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); try { throw mod; } catch (executor) { return executor.select(); } }",
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; return load().db.select(); }",
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; const executor = await load(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; const executor = await load(); const alias = executor; return alias.select(); }",
      "export async function x(source: string) { const mod = await import(source); const loaders = { load: () => mod.default }; const executor = await loaders.load(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const loaders = { load() { return mod.default; } }; const executor = await loaders.load(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const executor = await (() => mod.default)(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const executor = await (function () { return mod.default; })(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; const invoke = load; const executor = await invoke(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; const executor = await load.bind(null)(); return executor.select(); }",
      "export async function x(source: string) { const mod = await import(source); return Promise.resolve().then(() => mod.default).then((executor) => executor.select()); }",
      'export async function x(source: string) { const mod = await import(source); const load = () => mod.default; return load()("connection"); }',
      "export async function x(source: string) { const mod = await import(source); const load = () => mod.default; return load()`select 1`; }",
      'export async function x() { const pending = import("../db/client"); const module = await pending; return module.db.select(); }',
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text }),
        "query_inventory_scan_invalid"
      );
    for (const text of [
      "export async function x(source: string) { const mod = await import(source); const runner = new Box(mod).value; return runner.select(); }",
      "export async function x(source: string) { const mod = await import(source); const runner = new mod.Box().value; return runner.select(); }",
      "export async function x(source: string) { const mod = await import(source); return new Box({ value: mod }).value.select(); }",
      "export async function x(source: string) { const mod = await import(source); return new Box(mod).value.select(); }",
      "export async function x(source: string) { const mod = await import(source); let runner; runner = new Box(mod).value; return runner.select(); }",
      "export async function x(source: string) { const mod = await import(source); const runner = new Box(...[mod]).value; return runner.select(); }",
      "export async function x(source: string) { const mod = await import(source); const runner = mod && mod; return runner.select(); }",
      "export async function x(source: string) { const mod = await import(source); const runner = (0, mod); return runner.select(); }",
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text }),
        "query_inventory_scan_invalid"
      );
    for (const text of [
      'export async function x(enabled: boolean, fallback: unknown) { const module = await import("../db/client"); const runner = enabled ? module.db : fallback; return runner.select(); }',
      'export async function x(fallback: unknown) { const module = await import("../db/client"); const runner = module.db ?? fallback; return runner.select(); }',
      'export async function x(fallback: unknown) { const module = await import("../db/client"); const runner = module.db || fallback; return runner.select(); }',
      'export async function x() { const module = await import("../db/client"); const runner = { value: module.db }.value; return runner.select(); }',
      'export async function x() { const module = await import("../db/client"); const runner = [module.db][0]; return runner.select(); }',
      'export async function x() { const module = await import("../db/client"); const runner = ({ value: { executor: module.db } }).value.executor; return runner.select(); }',
      'export async function x(enabled: boolean, fallback: unknown) { const module = await import("../db/client"); let runner; runner = enabled ? module.db : fallback; return runner.select(); }',
      'export async function x() { const module = await import("../db/client"); const alias = module; return alias.db.select(); }',
      'export async function x() { const module = await import("../db/client"); let alias; alias = module; return alias.db.select(); }',
      'export async function x() { const [module] = await Promise.all([import("../db/client")]); const runner = { value: module.db }.value; return runner.select(); }',
      'export async function x(enabled: boolean, fallback: unknown) { const [module] = await Promise.all([import("../db/client")]); let runner; runner = enabled ? module.db : fallback; return runner.select(); }',
      'export async function x() { const module = await import("../db/client"); return consume(module.db); }',
      'export async function x() { const module = await import("../db/client"); return module.db; }',
      'export async function x(enabled: boolean, fallback: unknown) { const module = await import("../db/client"); return (enabled ? module.db : fallback).select(); }',
      'export async function x() { const module = await import("../db/client"); return ({ value: module.db }).value.select(); }',
      'export async function x() { const module = await import("../db/client"); return [module.db][0].select(); }',
      'export async function x(fallback: unknown) { const module = await import("../db/client"); module.db ||= fallback; return module.db.select(); }',
      'export async function x() { const module = await import("../db/client"); return module.db.wrapper.select(); }',
      'export async function x(enabled: boolean, fallback: unknown) { const read = () => { const runner = enabled ? module.db : fallback; return runner.select(); }; const module = await import("../db/client"); return read(); }',
      'export async function x() { const [module] = await Promise.all([import("../db/client")]); return consume(module.db); }',
      'export async function x(fallback: unknown) { const [module] = await Promise.all([import("../db/client")]); return (module.db ?? fallback).select(); }',
      'export async function x(fallback: unknown) { const [module = fallback] = await Promise.all([import("../db/client")]); return module.db.select(); }',
      'export async function x() { const [...modules] = await Promise.all([import("../db/client")]); return modules[0].db.select(); }',
      'export async function x() { const module = await import("../db/client"); { const module = {}; return module; } }',
      'export async function one() { const { db } = await import("../db/client"); return db; } export function two(db: { select(): unknown }) { return db.select(); }',
      'export async function one() { const [{ db }] = await Promise.all([import("../db/client")]); return db; } export function two(db: { select(): unknown }) { return db.select(); }',
      'export async function one() { const { db } = await import("../db/client"); const executor = db; return executor; } export function two(executor: { select(): unknown }) { return executor.select(); }',
      'export async function one() { const [{ db }] = await Promise.all([import("../db/client")]); const executor = db; return executor; } export function two(executor: { select(): unknown }) { return executor.select(); }',
      ...TASK551_SCANNER_REGRESSION_SOURCES.literalDynamicCapabilityEscapes,
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text }),
        "query_inventory_scan_invalid"
      );
    for (const text of [
      'export async function one() { const module = await import("../db/client"); const executor = module.db; return executor; } export function two(executor: { select(): unknown }) { return executor.select(); }',
      'export async function one() { return import("../db/client").then(({ db: executor }) => executor.select()); } export function two(executor: { select(): unknown }) { return executor.select(); }',
      'export async function one() { const postgresModule = await import("postgres"); const pg = postgresModule; return pg.default("connection"); }',
      'export async function one() { const drizzleModule = await import("drizzle-orm/postgres-js"); const adapter = drizzleModule; return adapter.drizzle(sql); }',
      'export async function one() { const sessionModule = await import("../db/sessionClient"); const sessions = sessionModule; return sessions.withSessionDatabaseClient("test", async (session) => session.execute()); }',
      'export async function one() { const module = await import("postgres"); const make = () => module.default; return make()("connection"); }',
      'export async function one() { const module = await import("drizzle-orm/postgres-js"); const make = () => module.drizzle; return make()(sql); }',
      'export async function one() { const module = await import("../db/sessionClient"); const make = () => module.withSessionDatabaseClient; return make()("test", async (session) => session.execute()); }',
    ])
      expectInventoryError(
        () => scanSourceTextOrThrow({ file: "core/services/bad.ts", text }),
        "query_inventory_scan_invalid"
      );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { let executor; ({ other: executor } = clientModule); return executor.select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { db } from "../db/client"; export function x(value: unknown) { let executor; executor = db; executor = value; return executor.select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { db } from "../db/client"; export function x() { const select = db.select; return select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { drizzle } from "drizzle-orm/postgres-js"; export function x() { const select = drizzle(sql).select; return select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { drizzle } from "drizzle-orm/postgres-js"; export function x() { const { select } = drizzle(sql); return select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { const { db: { select } } = clientModule; return select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { let select; ({ db: { select } } = clientModule); return select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x(fallback: unknown) { const { db: executor = fallback } = clientModule; return executor.select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { const { ...rest } = clientModule; return rest.select(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { return clientModule.unsupported(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as clientModule from "../db/client"; export function x() { return clientModule.db.unsupported(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as sessionModule from "../db/sessionClient"; export function x() { return sessionModule.unsupported(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as postgresModule from "postgres"; export function x() { return postgresModule.unsupported(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import * as drizzleModule from "drizzle-orm/postgres-js"; export function x() { return drizzleModule.unsupported(); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { db } from "../db/client"; export function x() { return db["select"](); }',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () =>
        scanSourceTextOrThrow({
          file: "core/services/bad.ts",
          text: 'import { db } from "../db/client"; void (async () => db.select())();',
        }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () => scanSourceTextOrThrow({ file: "core/./services/bad.ts", text: "export const x = 1;" }),
      "query_inventory_scan_invalid"
    );
    expectInventoryError(
      () => scanSourceTextOrThrow({ file: "core/services/../bad.ts", text: "export const x = 1;" }),
      "query_inventory_scan_invalid"
    );
  });

  test("uses injected traversal and fails unreadable or symlinked entries", async () => {
    const io = createInMemoryInventoryScanIo({
      "core/services/example.ts":
        'import { db } from "../db/client"; export async function x() { return db.select(); }',
    });
    await expect(listCanonicalCoreFilesOrThrow({ io })).resolves.toEqual([
      "core/services/example.ts",
    ]);
    await expectAsyncInventoryError(
      () =>
        listCanonicalCoreFilesOrThrow({
          io: createInMemoryInventoryScanIo({ "core/link.ts": "" }, { symlink: true }),
        }),
      "query_inventory_scan_invalid"
    );
    await expectAsyncInventoryError(
      () =>
        listCanonicalCoreFilesOrThrow({
          io: createInMemoryInventoryScanIo({ "core/../escape.ts": "" }),
        }),
      "query_inventory_scan_invalid"
    );
    const unreadable = createInMemoryInventoryScanIo(
      { "core/services/example.ts": "" },
      { unreadable: true }
    );
    await expectAsyncInventoryError(
      () => scanProductionDbCallers({ io: unreadable }),
      "query_inventory_scan_invalid"
    );
    await expect(scanProductionDbCallers({ io, readConcurrency: 64 })).resolves.toHaveLength(1);
    await expectAsyncInventoryError(
      () => scanProductionDbCallers({ io, readConcurrency: 65 }),
      "query_inventory_scan_invalid"
    );
    await expect(
      scanProductionDbCallers({ io: createInMemoryInventoryScanIo({}), readConcurrency: 1 })
    ).resolves.toEqual([]);
    await expectAsyncInventoryError(
      () => scanProductionDbCallers({ io: createInMemoryInventoryScanIo({}), readConcurrency: 65 }),
      "query_inventory_scan_invalid"
    );
  });

  test("keeps concurrent reads bounded and caller output indexed", async () => {
    const controlled = createControlledInventoryScanIo({
      "core/services/a.ts":
        'import { db } from "../db/client"; export function a() { return db.select(); }',
      "core/services/b.ts":
        'import { db } from "../db/client"; export function b() { return db.delete(); }',
      "core/services/c.ts":
        'import { db } from "../db/client"; export function c() { return db.insert(); }',
    });
    const scanning = scanProductionDbCallers({ io: controlled.io, readConcurrency: 2 });
    await controlled.waitForReadStarts(2);
    controlled.release("core/services/b.ts");
    await controlled.waitForReadStarts(3);
    controlled.release("core/services/c.ts");
    controlled.release("core/services/a.ts");
    const callers = await scanning;
    expect(controlled.maxInFlight()).toBe(2);
    expect(callers.map((caller) => caller.source.file)).toEqual([
      "core/services/a.ts",
      "core/services/b.ts",
      "core/services/c.ts",
    ]);
  });

  test("caps the direct indexed-source seam at 64 workers and at the file count", async () => {
    const controlled = createControlledInventoryScanIo({
      "core/services/a.ts": "export const a = 1;",
    });
    const scanning = scanIndexedSourcesOrThrow({
      files: ["core/services/a.ts"],
      io: controlled.io,
      readConcurrency: 64,
      scanSource: () => Object.freeze([]),
    });
    await controlled.waitForReadStarts(1);
    expect(controlled.maxInFlight()).toBe(1);
    controlled.release("core/services/a.ts");
    await expect(scanning).resolves.toEqual([]);
    await expectAsyncInventoryError(
      () =>
        scanIndexedSourcesOrThrow({
          files: ["core/services/a.ts"],
          io: createInMemoryInventoryScanIo({ "core/services/a.ts": "" }),
          readConcurrency: 65,
          scanSource: () => Object.freeze([]),
        }),
      "query_inventory_scan_invalid"
    );
    await expectAsyncInventoryError(
      () =>
        scanIndexedSourcesOrThrow({
          files: [],
          io: createInMemoryInventoryScanIo({}),
          readConcurrency: 65,
          scanSource: () => Object.freeze([]),
        }),
      "query_inventory_scan_invalid"
    );
    await expect(
      scanIndexedSourcesOrThrow({
        files: [],
        io: createInMemoryInventoryScanIo({}),
        readConcurrency: 1,
        scanSource: () => Object.freeze([]),
      })
    ).resolves.toEqual([]);
  });

  test("selects the lowest indexed concurrent scan failure", async () => {
    const controlled = createControlledInventoryScanIo(
      {
        "core/services/a.ts": "export function {",
        "core/services/b.ts":
          'import { db } from "../db/client"; export function b() { return db.select(); }',
      },
      new Set(["core/services/b.ts"])
    );
    const scanning = scanProductionDbCallers({ io: controlled.io, readConcurrency: 2 });
    await controlled.waitForReadStarts(2);
    controlled.release("core/services/b.ts");
    controlled.release("core/services/a.ts");
    try {
      await scanning;
    } catch (error) {
      expect(error).toBeInstanceOf(InventoryError);
      expect(error instanceof Error ? error.message : "").toBe(
        "query_inventory_scan_invalid:parse-diagnostic"
      );
      expect(controlled.maxInFlight()).toBe(2);
      return;
    }
    throw new Error("Expected the earliest source failure");
  });

  test("retains production callers nested in dist, build, and node_modules while excluding migrations", async () => {
    const io = createInMemoryInventoryScanIo({
      "core/services/dist/read.ts":
        'import { db } from "../../db/client"; export async function read() { return db.select(); }',
      "core/services/build/write.ts":
        'import { db } from "../../db/client"; export async function write() { return db.insert(); }',
      "core/services/node_modules/package/erase.ts":
        'import { db } from "../../../db/client"; export async function erase() { return db.delete(); }',
      "core/db/migrations/ignored.ts":
        'import { db } from "../client"; export async function ignored() { return db.select(); }',
    });
    await expect(listCanonicalCoreFilesOrThrow({ io })).resolves.toEqual([
      "core/services/build/write.ts",
      "core/services/dist/read.ts",
      "core/services/node_modules/package/erase.ts",
    ]);
    const callers = await scanProductionDbCallers({ io });
    expect(callers.map((caller) => caller.caller.operation).sort()).toEqual([
      "delete",
      "insert",
      "select",
    ]);
  });
});

describe("TASK-551 L01 CLI and lane declarations", () => {
  test("accepts only one exact check and phase grammar", () => {
    expect(parseExactInventoryCliArgs(["--check", "--phase", "initial"])).toEqual({
      check: true,
      phase: "initial",
    });
    expect(parseExactInventoryCliArgs(["--check", "--phase", "final"])).toEqual({
      check: true,
      phase: "final",
    });
    for (const argv of [
      [],
      ["--phase", "initial"],
      ["--phase", "initial", "--check"],
      ["--phase", "final", "--check"],
      ["--check", "--check", "--phase", "initial"],
      ["--check", "--phase", "initial", "--phase", "final"],
      ["--check", "--phase=initial"],
      ["--check", "initial", "--phase", "initial"],
      ["--check", "--phase"],
    ]) {
      expectInventoryError(() => parseExactInventoryCliArgs(argv), "query_inventory_cli_invalid");
    }
    expectInventoryError(
      () => parseExactInventoryCliArgs(["--check"]),
      "query_inventory_phase_invalid"
    );
  });

  test("rejects an unknown CLI flag appended to an otherwise valid invocation", () => {
    expectInventoryError(
      () => parseExactInventoryCliArgs(["--check", "--phase", "initial", "--unknown"]),
      "query_inventory_cli_invalid"
    );
  });

  test("pins the exact recovery boundary and full nine-path plan", () => {
    expect(TASK551_INITIAL_DEPENDENT_BUN_PATHS).toEqual([
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
    ]);
    expect(TASK551_L01_BUN_TEST_PATHS).toEqual([
      "tests/perf/database-query-inventory.test.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
    ]);
    expect(TASK551_PLANNED_BUN_TEST_PATHS).toEqual([
      ...TASK551_L01_BUN_TEST_PATHS,
      ...TASK551_INITIAL_DEPENDENT_BUN_PATHS,
      ...TASK551_L04_BUN_TEST_PATHS,
      ...TASK551_L02_FOLLOWUP_BUN_PATHS,
    ]);
    expect(new Set(TASK551_INITIAL_DEPENDENT_BUN_PATHS).size).toBe(4);
    expect(TASK551_L02_FOLLOWUP_BUN_PATHS).toEqual([
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ]);
    expect(TASK551_L02_PREEXISTING_BUN_PATHS).toEqual([
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
    ]);
    expect(TASK551_L02_FUTURE_BUN_PATHS).toEqual([
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ]);
    expect(TASK551_L02_FOLLOWUP_BUN_PATHS).toEqual([
      ...TASK551_L02_PREEXISTING_BUN_PATHS,
      ...TASK551_L02_FUTURE_BUN_PATHS,
    ]);
    // Contract correction (2026-09-02, L11 classifier-materialization barrier): the L04 bootstrap path legally materialized, so the recovery-era absent pin flips to all nine planned paths present.
    for (const path of TASK551_PLANNED_BUN_TEST_PATHS) expect(existsSync(path)).toBe(true);
    expect(new Set(TASK551_PLANNED_BUN_TEST_PATHS).size).toBe(9);
    assertExactTask551BunTestPlan({
      planned: TASK551_PLANNED_BUN_TEST_PATHS,
      l01Owned: TASK551_L01_BUN_TEST_PATHS,
      initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
      l04: TASK551_L04_BUN_TEST_PATHS,
      l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
      l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
      l02Future: TASK551_L02_FUTURE_BUN_PATHS,
    });
    expect(canonicalBunLaneRootsFromClassifier()).toContain("tests/integration/toolchain");
    expect(readRootPackageScript("test:bun")).toContain("scripts/run-bun-parallel.ts");
  });

  test("guards grammar and exact lane state before one DB-free scan", async () => {
    const discovered = createTask551FixtureDiscoveredCallers();
    const materializedRows = TASK551_PLANNED_BUN_TEST_PATHS.map((file) => ({
      file,
      bucket: "perf" as const,
      conflictKeys: [],
      cWriteGlobal: false,
    }));
    const run = async (
      argv: readonly string[],
      present: readonly string[],
      rows = [] as readonly (typeof materializedRows)[number][]
    ) => {
      const calls = { exists: 0, manifest: 0, scan: 0 };
      const available = new Set(present);
      const result = runInventoryCheck(argv, {
        exists: (path) => {
          calls.exists += 1;
          return available.has(path);
        },
        readManifest: () => {
          calls.manifest += 1;
          return { rows };
        },
        scan: async () => {
          calls.scan += 1;
          return discovered;
        },
      });
      return { calls, result };
    };
    const final = await run(["--check", "--phase", "final"], []);
    await expectAsyncInventoryError(() => final.result, "query_inventory_final_receipt_missing");
    expect(final.calls).toEqual({ exists: 0, manifest: 0, scan: 0 });
    const illegal = await run(["--check", "--phase", "initial"], []);
    await expectAsyncInventoryError(() => illegal.result, "query_inventory_invalid");
    expect(illegal.calls.scan).toBe(0);
    const post = await run(
      ["--check", "--phase", "initial"],
      TASK551_PLANNED_BUN_TEST_PATHS,
      materializedRows
    );
    await expectAsyncInventoryError(() => post.result, "query_inventory_invalid");
    expect(post.calls.scan).toBe(0);
    for (const present of [
      [...TASK551_L01_BUN_TEST_PATHS, ...TASK551_L02_PREEXISTING_BUN_PATHS],
      [...TASK551_L01_BUN_TEST_PATHS, ...TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS],
    ]) {
      const initial = await run(["--check", "--phase", "initial"], present);
      await initial.result;
      expect(initial.calls.scan).toBe(1);
    }
  });
});
