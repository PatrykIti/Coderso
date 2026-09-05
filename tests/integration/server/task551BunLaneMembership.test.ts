import { describe, expect, test } from "bun:test";

import { LANE_DIRS } from "../../../scripts/bun-lane-classify";
import {
  InventoryError,
  type BunLaneManifest,
  assertCanonicalBunLaneMembership,
  assertExactInitialDependentBunMembership,
  assertExactMaterializedTask551BunLaneMembership,
  assertExactTask551BunTestPlan,
  assertTask551BunLaneMembershipState,
  canonicalBunLaneRootsFromClassifier,
  parseBunLaneManifest,
  parseShippedTestBunCommand,
  readBunLaneManifest,
  readRootPackageScript,
  TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS,
} from "../../../scripts/task-551-query-inventory";
import {
  TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  TASK551_L01_AUXILIARY_FOCUSED_TEST_PATHS,
  TASK551_L01_BUN_TEST_PATHS,
  TASK551_L04_BUN_TEST_PATHS,
  TASK551_L02_FOLLOWUP_BUN_PATHS,
  TASK551_L02_FUTURE_BUN_PATHS,
  TASK551_L02_PREEXISTING_BUN_PATHS,
  TASK551_PLANNED_BUN_TEST_PATHS,
  TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS,
} from "../../perf/fixtures/task551QueryInventory";

function expectInventoryError(action: () => void, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    expect((error as Error).message.startsWith(`${code}:`)).toBe(true);
    return;
  }
  throw new Error(`Expected ${code}`);
}

const materializedManifest = Object.freeze({
  rows: Object.freeze(
    TASK551_PLANNED_BUN_TEST_PATHS.map((file) =>
      Object.freeze({
        file,
        bucket: "perf" as const,
        conflictKeys: Object.freeze([]),
        cWriteGlobal: false,
      })
    )
  ),
});
const preL02Manifest = Object.freeze({ rows: Object.freeze([]) });

function existsFor(paths: readonly string[]): (relativePath: string) => boolean {
  const present = new Set(paths);
  return (relativePath) => present.has(relativePath);
}

function task551StateInput(manifest: BunLaneManifest, exists: (relativePath: string) => boolean) {
  return {
    planned: TASK551_PLANNED_BUN_TEST_PATHS,
    l01Owned: TASK551_L01_BUN_TEST_PATHS,
    initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
    l04: TASK551_L04_BUN_TEST_PATHS,
    l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
    l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
    l02Future: TASK551_L02_FUTURE_BUN_PATHS,
    manifest,
    exists,
  };
}

describe("TASK-551 L01 Bun-lane membership", () => {
  test("derives the exact accepted roots from the classifier export", () => {
    const roots = canonicalBunLaneRootsFromClassifier();
    expect(roots).toEqual([...LANE_DIRS].sort());
    expect(roots).toEqual([
      "tests/integration/analytics",
      "tests/integration/plugins",
      "tests/integration/routes",
      "tests/integration/runtime",
      "tests/integration/server",
      "tests/integration/store",
      "tests/integration/toolchain",
      "tests/perf",
      "tests/security",
      "tests/unit",
    ]);
  });

  test("pins the exact nine-path plan and six-path recovery boundary", () => {
    assertExactInitialDependentBunMembership(TASK551_INITIAL_DEPENDENT_BUN_PATHS, [
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
    ]);
    assertExactTask551BunTestPlan({
      planned: TASK551_PLANNED_BUN_TEST_PATHS,
      l01Owned: TASK551_L01_BUN_TEST_PATHS,
      initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
      l04: TASK551_L04_BUN_TEST_PATHS,
      l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
      l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
      l02Future: TASK551_L02_FUTURE_BUN_PATHS,
    });
    expect(TASK551_L01_BUN_TEST_PATHS).toHaveLength(2);
    expect(TASK551_INITIAL_DEPENDENT_BUN_PATHS).toHaveLength(4);
    expect(TASK551_L02_FOLLOWUP_BUN_PATHS).toEqual([
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ]);
    expect(TASK551_L04_BUN_TEST_PATHS).toEqual([
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
    ]);
    expect(TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS).toEqual([
      ...TASK551_INITIAL_DEPENDENT_BUN_PATHS,
      ...TASK551_L02_FOLLOWUP_BUN_PATHS,
    ]);
    expect(TASK551_PLANNED_BUN_TEST_PATHS).toHaveLength(9);
    expect(new Set(TASK551_PLANNED_BUN_TEST_PATHS).size).toBe(9);
  });

  test("keeps the capability-routes regression as a direct L01 auxiliary gate", () => {
    const auxiliary = "tests/perf/database-query-inventory-capability-routes.test.ts";
    expect(TASK551_L01_AUXILIARY_FOCUSED_TEST_PATHS).toEqual([
      "tests/perf/database-query-inventory-capability-routes.test.ts",
    ]);
    expect(canonicalBunLaneRootsFromClassifier()).toContain("tests/perf");
    expect([...TASK551_L01_BUN_TEST_PATHS]).not.toContain(auxiliary);
    expect([...TASK551_PLANNED_BUN_TEST_PATHS]).not.toContain(auxiliary);
    expect([...TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS]).not.toContain(auxiliary);
  });

  test("classifies the live lane as the exact post-materialization boundary", () => {
    const script = readRootPackageScript("test:bun");
    expect(parseShippedTestBunCommand(script).invokesParallelOrchestrator).toBe(true);
    assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
      script,
      requireFiles: false,
    });
    expect(TASK551_L02_FOLLOWUP_BUN_PATHS).toEqual([
      ...TASK551_L02_PREEXISTING_BUN_PATHS,
      ...TASK551_L02_FUTURE_BUN_PATHS,
    ]);
    // Contract correction (2026-09-02, L11 classifier-materialization barrier): the
    // exactly-once classifier has materialized the lane, so the live pin flips from
    // the recovery-initial pending state to the exact post-finalization equality.
    const manifest = readBunLaneManifest();
    expect(manifest.rows.length).toBeGreaterThan(0);
    expect(manifest.rows.every((row) => ["A", "B", "C", "perf"].includes(row.bucket))).toBe(true);
    expect(
      assertTask551BunLaneMembershipState(
        task551StateInput(manifest, existsFor([...TASK551_PLANNED_BUN_TEST_PATHS]))
      )
    ).toBe("post-finalization");
    assertExactMaterializedTask551BunLaneMembership({
      planned: TASK551_PLANNED_BUN_TEST_PATHS,
      manifest,
    });
  });

  test("keeps the five contracted non-planned task551 lane tests outside the slice and strays failing", () => {
    const manifest = readBunLaneManifest();
    for (const contractedPath of TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS) {
      expect(manifest.rows.some((row) => row.file === contractedPath)).toBe(true);
    }
    const contractedRows = TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS.map((contractedPath) => {
      const contractedRow = manifest.rows.find((row) => row.file === contractedPath);
      if (contractedRow === undefined) throw new Error(`Missing contracted row: ${contractedPath}`);
      return contractedRow;
    });
    for (const contractedPath of TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS) {
      expect(manifest.rows.filter((row) => row.file === contractedPath)).toHaveLength(1);
    }
    expect(contractedRows.every((row) => ["A", "B", "C", "perf"].includes(row.bucket))).toBe(true);
    const contractedManifest = Object.freeze({
      rows: Object.freeze([...materializedManifest.rows, ...contractedRows]),
    });
    expect(
      assertTask551BunLaneMembershipState(
        task551StateInput(contractedManifest, existsFor(TASK551_PLANNED_BUN_TEST_PATHS))
      )
    ).toBe("post-finalization");
    for (const strayFile of [
      "tests/perf/task551StrayProbe.test.ts",
      "tests/perf/Task551StrayProbe.test.ts",
    ] as const) {
      const strayManifest = Object.freeze({
        rows: Object.freeze([
          ...contractedManifest.rows,
          Object.freeze({
            file: strayFile,
            bucket: "perf" as const,
            conflictKeys: Object.freeze([]),
            cWriteGlobal: false,
          }),
        ]),
      });
      expectInventoryError(
        () =>
          assertTask551BunLaneMembershipState(
            task551StateInput(strayManifest, existsFor(TASK551_PLANNED_BUN_TEST_PATHS))
          ),
        "query_inventory_final_receipt_missing"
      );
    }
  });

  test("accepts only exact legal, recovery, and post-finalization states", () => {
    const legalInitialExists = existsFor([
      ...TASK551_L01_BUN_TEST_PATHS,
      ...TASK551_L02_PREEXISTING_BUN_PATHS,
    ]);
    const recoveryInitialExists = existsFor([
      ...TASK551_L01_BUN_TEST_PATHS,
      ...TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS,
    ]);
    expect(
      assertTask551BunLaneMembershipState(task551StateInput(preL02Manifest, legalInitialExists))
    ).toBe("legal-initial");
    expect(
      assertTask551BunLaneMembershipState(task551StateInput(preL02Manifest, recoveryInitialExists))
    ).toBe("recovery-initial");
    expect(
      assertTask551BunLaneMembershipState(
        task551StateInput(materializedManifest, existsFor(TASK551_PLANNED_BUN_TEST_PATHS))
      )
    ).toBe("post-finalization");
    expectInventoryError(
      () =>
        assertTask551BunLaneMembershipState(
          task551StateInput(
            preL02Manifest,
            existsFor([
              ...TASK551_L01_BUN_TEST_PATHS,
              ...TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS,
              ...TASK551_L04_BUN_TEST_PATHS,
            ])
          )
        ),
      "query_inventory_final_receipt_missing"
    );
    for (const [manifest, exists] of [
      [
        preL02Manifest,
        existsFor([
          ...TASK551_L01_BUN_TEST_PATHS,
          ...TASK551_INITIAL_DEPENDENT_BUN_PATHS.slice(1),
          ...TASK551_L02_FOLLOWUP_BUN_PATHS,
        ]),
      ],
      [
        Object.freeze({ rows: Object.freeze([materializedManifest.rows[0]!]) }),
        recoveryInitialExists,
      ],
    ] as const) {
      expectInventoryError(
        () => assertTask551BunLaneMembershipState(task551StateInput(manifest, exists)),
        "query_inventory_invalid"
      );
    }
  });

  test("requires the shipped default command to execute exactly lane all", () => {
    const allLane = "bun scripts/run-bun-parallel.ts --lane all";
    expect(parseShippedTestBunCommand(allLane).invokesParallelOrchestrator).toBe(true);
    expect(
      parseShippedTestBunCommand(readRootPackageScript("test:bun")).invokesParallelOrchestrator
    ).toBe(true);
    for (const narrowedPackageScript of [
      "bun scripts/run-bun-parallel.ts --lane b",
      "bun scripts/run-bun-parallel.ts --lane c",
      "bun scripts/run-bun-parallel.ts --lane perf",
      "bun scripts/run-bun-parallel.ts --lane all --lane b",
      "bun scripts/run-bun-parallel.ts",
      "bun scripts/run-bun-parallel.ts --lane all && false || bun scripts/run-bun-parallel.ts --lane b",
      "bun scripts/run-bun-parallel.ts --lane all; bun scripts/run-bun-parallel.ts --lane b",
      "bun scripts/run-bun-parallel.ts --lane all; false",
      "bun scripts/run-bun-parallel.ts --lane all --unexpected",
      "bun scripts/run-bun-parallel.ts --lane all &&",
      "bun scripts/run-bun-parallel.ts --lane all &",
      "bun scripts/run-bun-parallel.ts --lane all |",
      "& bun scripts/run-bun-parallel.ts --lane all",
      "| bun scripts/run-bun-parallel.ts --lane all",
      "sh -c 'bun scripts/run-bun-parallel.ts --lane all'",
    ]) {
      expect(parseShippedTestBunCommand(narrowedPackageScript).invokesParallelOrchestrator).toBe(
        false
      );
      expectInventoryError(
        () =>
          assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
            script: narrowedPackageScript,
            requireFiles: false,
          }),
        "query_inventory_invalid"
      );
    }
    for (const separator of ["\r", "\n", "\r\n", "\v", "\f", "\u0085", "\u2028", "\u2029"]) {
      const splitCommand = `bun${separator}scripts/run-bun-parallel.ts --lane all`;
      expect(parseShippedTestBunCommand(splitCommand).invokesParallelOrchestrator).toBe(false);
      expectInventoryError(
        () =>
          assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
            script: splitCommand,
            requireFiles: false,
          }),
        "query_inventory_invalid"
      );
    }
    for (const separator of ["\u00a0", "\u2009"]) {
      const splitCommand = `bun${separator}scripts/run-bun-parallel.ts --lane all`;
      expect(parseShippedTestBunCommand(splitCommand).invokesParallelOrchestrator).toBe(false);
      expectInventoryError(
        () =>
          assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
            script: splitCommand,
            requireFiles: false,
          }),
        "query_inventory_invalid"
      );
    }
  });

  test("rejects targeted-only paths even when a focused command could run them", () => {
    const script = readRootPackageScript("test:bun");
    for (const path of [
      "tests/integration/database/task551Synthetic.test.ts",
      "tests/integration/assistant/task551Synthetic.test.ts",
      "tests/integration/integrations/task551Synthetic.test.ts",
      "tests/perf/../../core/task551Synthetic.test.ts",
    ]) {
      expectInventoryError(
        () => assertCanonicalBunLaneMembership([path], { script, requireFiles: false }),
        "query_inventory_invalid"
      );
    }
  });

  test("requires strict duplicate-free equality after every TASK-551 suite materializes", () => {
    assertExactMaterializedTask551BunLaneMembership({
      planned: TASK551_PLANNED_BUN_TEST_PATHS,
      manifest: materializedManifest,
      exists: () => true,
    });
    const wrongBucket = Object.freeze({
      rows: Object.freeze(
        materializedManifest.rows.map((row) =>
          row.file === TASK551_INITIAL_DEPENDENT_BUN_PATHS[0]
            ? Object.freeze({ ...row, bucket: "A" as const })
            : row
        )
      ),
    });
    expectInventoryError(
      () =>
        assertExactMaterializedTask551BunLaneMembership({
          planned: TASK551_PLANNED_BUN_TEST_PATHS,
          manifest: wrongBucket,
          exists: () => true,
        }),
      "query_inventory_final_receipt_missing"
    );
    const missing = Object.freeze({ rows: Object.freeze(materializedManifest.rows.slice(1)) });
    expectInventoryError(
      () =>
        assertExactMaterializedTask551BunLaneMembership({
          planned: TASK551_PLANNED_BUN_TEST_PATHS,
          manifest: missing,
          exists: () => true,
        }),
      "query_inventory_final_receipt_missing"
    );
    expectInventoryError(
      () =>
        assertExactMaterializedTask551BunLaneMembership({
          planned: TASK551_PLANNED_BUN_TEST_PATHS,
          manifest: materializedManifest,
          exists: existsFor(TASK551_PLANNED_BUN_TEST_PATHS.slice(1)),
        }),
      "query_inventory_final_receipt_missing"
    );
    const extra = Object.freeze({
      rows: Object.freeze([
        ...materializedManifest.rows,
        Object.freeze({
          file: "tests/perf/task551Unexpected.test.ts",
          bucket: "perf" as const,
          conflictKeys: Object.freeze([]),
          cWriteGlobal: false,
        }),
      ]),
    });
    expectInventoryError(
      () =>
        assertExactMaterializedTask551BunLaneMembership({
          planned: TASK551_PLANNED_BUN_TEST_PATHS,
          manifest: extra,
          exists: () => true,
        }),
      "query_inventory_final_receipt_missing"
    );
    const duplicate = Object.freeze({
      rows: Object.freeze([...materializedManifest.rows, materializedManifest.rows[0]!]),
    });
    expectInventoryError(
      () =>
        assertExactMaterializedTask551BunLaneMembership({
          planned: TASK551_PLANNED_BUN_TEST_PATHS,
          manifest: duplicate,
          exists: () => true,
        }),
      "query_inventory_final_receipt_missing"
    );
  });

  test("strictly parses the current v2 row shape", () => {
    const row = {
      file: "tests/perf/database-query-inventory.test.ts",
      bucket: "perf" as const,
      conflictKeys: ["site.contentRoutes"],
      cWriteGlobal: false,
    };
    expect(
      parseBunLaneManifest({ generatedAt: "2026-08-22T00:00:00.000Z", rows: [row] }).rows
    ).toEqual([row]);
    for (const malformed of [
      { ...row, extra: true },
      { file: row.file, bucket: row.bucket, conflictKeys: row.conflictKeys },
      { ...row, conflictKeys: ["", "site.contentRoutes"] },
      { ...row, conflictKeys: ["site.contentRoutes", "site.contentRoutes"] },
      { ...row, cWriteGlobal: "false" },
      { ...row, file: "tests/perf/../../core/task551Synthetic.test.ts" },
    ]) {
      expectInventoryError(
        () => parseBunLaneManifest({ generatedAt: "2026-08-22T00:00:00.000Z", rows: [malformed] }),
        "query_inventory_invalid"
      );
    }
    expectInventoryError(
      () =>
        parseBunLaneManifest({ generatedAt: "2026-08-22T00:00:00.000Z", rows: [row], extra: true }),
      "query_inventory_invalid"
    );
  });
});
