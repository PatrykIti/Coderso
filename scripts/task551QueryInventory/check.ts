/** CLI-independent verification for the initial DB-free inventory occurrence. */
import {
  PLANNED_QUERY_DELTAS,
  PLANNED_QUERY_FINGERPRINT_REGISTRY,
  TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
  TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  TASK551_L01_BUN_TEST_PATHS,
  TASK551_L04_BUN_TEST_PATHS,
  TASK551_L02_FOLLOWUP_BUN_PATHS,
  TASK551_L02_FUTURE_BUN_PATHS,
  TASK551_L02_PREEXISTING_BUN_PATHS,
  TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
  TASK551_QUERY_INVENTORY,
  TASK551_QUERY_INVENTORY_RECEIPT,
  TASK551_PLANNED_BUN_TEST_PATHS,
} from "../../tests/perf/fixtures/task551QueryInventory";
import {
  assertCanonicalBunLaneMembership,
  assertExactTask551BunTestPlan,
  assertTask551BunLaneMembershipState,
  readBunLaneManifest,
  readRootPackageScript,
} from "./bunLane";
import {
  assertExactAdminPlannedRecordProjection,
  assertExactAdminPlannedRecordSemantics,
  assertExactCurrentCallSiteCoverage,
  assertExactPlannedFingerprintRegistry,
  assertExactPlannedSet,
  assertExactSanitizedReceipt,
  assertExactTelemetrySelectionAndFingerprintNullability,
  assertSanitizedInventoryArtifacts,
  assertSingleWriterOwnership,
  buildCanonicalReceipt,
} from "./canonical";
import { type DiscoveredCaller, type InventoryPhase, fail } from "./contracts";
import { scanProductionDbCallers } from "./scan";

export type ParsedInventoryCliArgs = Readonly<{ check: true; phase: InventoryPhase }>;
export type RunInventoryCheckDependencies = Readonly<{
  exists?: (relativePath: string) => boolean;
  readManifest?: () => ReturnType<typeof readBunLaneManifest>;
  scan?: () => Promise<readonly DiscoveredCaller[]>;
}>;

export function parseExactInventoryCliArgs(argv: readonly string[]): ParsedInventoryCliArgs {
  if (argv.length === 1 && argv[0] === "--check")
    fail("query_inventory_phase_invalid", "cli-phase");
  if (argv.length !== 3 || argv[0] !== "--check" || argv[1] !== "--phase")
    fail("query_inventory_cli_invalid", "cli-grammar");
  const phase = argv[2];
  if (phase !== "initial" && phase !== "final") fail("query_inventory_phase_invalid", "cli-phase");
  return Object.freeze({ check: true, phase });
}

/**
 * The initial occurrence deliberately accepts the final grammar but stops
 * before scanning, reading a receipt, or loading a future module. A later
 * redispatch replaces this boundary after its owning dependency has landed.
 */
export async function runInventoryCheck(
  argv: readonly string[],
  dependencies: RunInventoryCheckDependencies = {}
): Promise<void> {
  const { phase } = parseExactInventoryCliArgs(argv);
  if (phase === "final") fail("query_inventory_final_receipt_missing", "initial-final-phase");

  assertExactTask551BunTestPlan({
    planned: TASK551_PLANNED_BUN_TEST_PATHS,
    l01Owned: TASK551_L01_BUN_TEST_PATHS,
    initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
    l04: TASK551_L04_BUN_TEST_PATHS,
    l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
    l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
    l02Future: TASK551_L02_FUTURE_BUN_PATHS,
  });
  const state = assertTask551BunLaneMembershipState({
    planned: TASK551_PLANNED_BUN_TEST_PATHS,
    l01Owned: TASK551_L01_BUN_TEST_PATHS,
    initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
    l04: TASK551_L04_BUN_TEST_PATHS,
    l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
    l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
    l02Future: TASK551_L02_FUTURE_BUN_PATHS,
    manifest: (dependencies.readManifest ?? readBunLaneManifest)(),
    exists: dependencies.exists,
  });
  if (state === "post-finalization") fail("query_inventory_invalid", "initial-inventory-state");

  const discovered = await (dependencies.scan ?? scanProductionDbCallers)();
  assertExactCurrentCallSiteCoverage({ discovered, current: TASK551_QUERY_INVENTORY });
  assertSingleWriterOwnership(TASK551_QUERY_INVENTORY);
  assertExactTelemetrySelectionAndFingerprintNullability({
    records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
    associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
  });
  assertExactPlannedSet(PLANNED_QUERY_DELTAS, { total: 34, adminRead: 32, legacy: 2 });
  assertExactAdminPlannedRecordSemantics(PLANNED_QUERY_DELTAS);
  assertExactAdminPlannedRecordProjection({
    planned: PLANNED_QUERY_DELTAS,
    projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
  });
  assertExactPlannedFingerprintRegistry({
    records: [...TASK551_QUERY_INVENTORY, ...PLANNED_QUERY_DELTAS],
    associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
    definitions: PLANNED_QUERY_FINGERPRINT_REGISTRY,
  });
  const computed = buildCanonicalReceipt({
    phase,
    discovered,
    current: TASK551_QUERY_INVENTORY,
    planned: PLANNED_QUERY_DELTAS,
    associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
    validatedAt: TASK551_QUERY_INVENTORY_RECEIPT.validatedAt,
  });
  assertExactSanitizedReceipt({ actual: computed, expected: TASK551_QUERY_INVENTORY_RECEIPT });
  assertSanitizedInventoryArtifacts([
    TASK551_QUERY_INVENTORY,
    PLANNED_QUERY_DELTAS,
    TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
    TASK551_QUERY_INVENTORY_RECEIPT,
  ]);
  assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
    script: readRootPackageScript("test:bun"),
    requireFiles: false,
  });
}
