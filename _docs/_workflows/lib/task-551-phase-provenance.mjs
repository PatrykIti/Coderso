// TASK-551-11 private, pure phase provenance and ownership projections.
// It intentionally has no filesystem, database, L02, or target-module import.

import { createHash } from "node:crypto";
import { TextEncoder } from "node:util";

export const encoder = new TextEncoder();
export const SHA256 = /^[a-f0-9]{64}$/u;
export const PREFIXED_NONZERO_SHA256 = /^sha256:(?!0{64}$)[a-f0-9]{64}$/u;
const READ_ONLY_MAPS = new WeakSet();
export const freeze = (value) => Object.freeze(value);
export const sortUnique = (paths) => freeze([...new Set(paths)].sort());
export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function ownData(value, keys, code) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    throw new Error(code);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key, index) => key !== keys[index]))
    throw new Error(code);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      throw new Error(code);
  }
  return value;
}

export function plainArray(value, code) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    throw new Error(code);
  if (Reflect.ownKeys(value).length !== value.length + 1) throw new Error(code);
  return value;
}

function readOnlyMap(entries) {
  const rows = freeze(entries.map(([key, value]) => freeze([key, value])));
  const values = new Map(rows);
  const projection = Object.create(null);
  const forbidden = (operation) => () => {
    throw new Error(`task551_projection_${operation}_forbidden`);
  };
  Object.defineProperties(projection, {
    size: { enumerable: true, get: () => rows.length },
    get: { enumerable: true, value: (key) => values.get(key) },
    has: { enumerable: true, value: (key) => values.has(key) },
    keys: { enumerable: true, value: () => rows.map(([key]) => key).values() },
    values: { enumerable: true, value: () => rows.map(([, value]) => value).values() },
    entries: { enumerable: true, value: () => rows.values() },
    forEach: {
      enumerable: true,
      value: (callback, thisArg) => {
        if (typeof callback !== "function")
          throw new TypeError("task551_projection_for_each_callback_invalid");
        for (const [key, value] of rows) callback.call(thisArg, value, key, projection);
      },
    },
    set: { enumerable: true, value: forbidden("set") },
    delete: { enumerable: true, value: forbidden("delete") },
    clear: { enumerable: true, value: forbidden("clear") },
    [Symbol.iterator]: { enumerable: false, value: () => rows.values() },
    [Symbol.toStringTag]: { enumerable: false, value: "ReadonlyMap" },
  });
  READ_ONLY_MAPS.add(projection);
  return freeze(projection);
}

function phase(entry) {
  return freeze({
    ...entry,
    ownedFiles: freeze(entry.ownedFiles),
    ownedTests: freeze(entry.ownedTests),
    readOnlyImports: freeze(entry.readOnlyImports),
    materializedWorktreeOutputs: freeze(entry.materializedWorktreeOutputs),
    ephemeralPostOperationOutputs: freeze(entry.ephemeralPostOperationOutputs),
  });
}

/** One canonical ownership list. Deferred targets remain here for owner sizing only. */
export const TASK551_PHASE_PROVENANCE = freeze([
  phase({
    phase: "sidecar",
    taskId: "TASK-551-11",
    ownedFiles: [
      "_docs/_workflows/lib/task-551-contract.mjs",
      "_docs/_workflows/lib/task-551-evidence-contract.mjs",
      "_docs/_workflows/lib/task-551-evidence-filesystem.mjs",
      "_docs/_workflows/lib/task-551-worktree-compatibility.mjs",
      "_docs/_workflows/lib/task-551-l02-subgate-executor.mjs",
      "_docs/_workflows/lib/task-551-dispatch-contract.mjs",
      "_docs/_workflows/lib/task-551-contract.d.mts",
      "_docs/_workflows/task-551-author-audit.mjs",
      "_docs/_workflows/task-551-implement.mjs",
      "_docs/_workflows/task-551-fix.mjs",
      "_docs/_workflows/task-551-author-audit.d.mts",
      "_docs/_workflows/task-551-implement.d.mts",
      "_docs/_workflows/task-551-fix.d.mts",
      "_docs/_workflows/lib/task-551-evidence-contract.d.mts",
      "_docs/_workflows/lib/task-551-dispatch-primitives.mjs",
      "_docs/_workflows/lib/task-551-dispatch-envelope.mjs",
      "_docs/_workflows/lib/task-551-phase-provenance.mjs",
      "_docs/_workflows/lib/task-551-worktree-snapshot.mjs",
      "_docs/_workflows/lib/task-551-l01-barrier.mjs",
    ],
    ownedTests: [
      "tests/unit/workflows/task551AuthorAudit.test.ts",
      "tests/unit/workflows/task551WorkflowContracts.test.ts",
      "tests/unit/workflows/task551EvidenceContract.test.ts",
      "tests/unit/workflows/dispatchContractCaps.test.ts",
    ],
    readOnlyImports: [],
    materializedWorktreeOutputs: [],
    ephemeralPostOperationOutputs: [],
  }),
  phase({
    phase: "l01",
    taskId: "TASK-551-01-L01",
    ownedFiles: [
      "scripts/task-551-query-inventory.ts",
      "scripts/task551QueryInventory/bunLane.ts",
      "scripts/task551QueryInventory/canonical.ts",
      "scripts/task551QueryInventory/check.ts",
      "scripts/task551QueryInventory/clientExpressions.ts",
      "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
      "scripts/task551QueryInventory/contracts.ts",
      "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
      "scripts/task551QueryInventory/dynamicImportOrigins.ts",
      "scripts/task551QueryInventory/dynamicImportProvenance.ts",
      "scripts/task551QueryInventory/fileDiscovery.ts",
      "scripts/task551QueryInventory/literalDynamicClientImports.ts",
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
      "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
      "scripts/task551QueryInventory/productionScan.ts",
      "scripts/task551QueryInventory/scan.ts",
      "tests/perf/fixtures/task551QueryInventory.ts",
    ],
    ownedTests: [
      "tests/perf/database-query-inventory.test.ts",
      "tests/perf/database-query-inventory-capability-routes.test.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
    ],
    readOnlyImports: [
      "scripts/bun-lane-classify.ts",
      "tests/unit/toolchain/bunLaneManifest.test.ts",
    ],
    materializedWorktreeOutputs: ["tests/bun-lane-manifest.json"],
    ephemeralPostOperationOutputs: [],
  }),
  phase({
    phase: "l03",
    taskId: "TASK-551-01-L03",
    ownedFiles: ["scripts/task-551-fixture-target-bootstrap.ts"],
    ownedTests: ["tests/perf/task551FixtureTargetBootstrap.test.ts"],
    readOnlyImports: [],
    materializedWorktreeOutputs: [],
    ephemeralPostOperationOutputs: [],
  }),
  phase({
    phase: "l04",
    taskId: "TASK-551-01-L04",
    ownedFiles: ["scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts"],
    ownedTests: ["tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
    readOnlyImports: [],
    materializedWorktreeOutputs: [],
    ephemeralPostOperationOutputs: [],
  }),
  phase({
    phase: "l02",
    taskId: "TASK-551-01-L02",
    ownedFiles: [
      "scripts/task-551-database-baseline.ts",
      "scripts/task551DatabaseBaseline/catalog.ts",
      "scripts/task551DatabaseBaseline/digestContract.ts",
      "scripts/task551DatabaseBaseline/fixtureTarget.ts",
      "scripts/task551DatabaseBaseline/fixtureValidation.ts",
      "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
      "scripts/task551DatabaseBaseline/metrics.ts",
      "scripts/task551DatabaseBaseline/postgresTransport.ts",
      "scripts/task551DatabaseBaseline/receiptContract.ts",
      "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts",
      "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
      "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
      "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
      "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
      "scripts/task551DatabaseBaseline/runner.ts",
      "scripts/task551DatabaseBaseline/runtimeProvenance.ts",
      "tests/perf/fixtures/task551DatabaseScale.ts",
      "tests/perf/fixtures/task551DatabaseBudgets.ts",
      "tests/perf/fixtures/task551AdminReadStatementShapes.ts",
      "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
      "tests/perf/task551DatabaseBaseline/contractTestHelpers.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts",
    ],
    ownedTests: [
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ],
    readOnlyImports: [
      "tests/perf/fixtures/task551QueryInventory.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
      "tests/unit/toolchain/bunLaneManifest.test.ts",
    ],
    materializedWorktreeOutputs: [],
    ephemeralPostOperationOutputs: [],
  }),
  phase({
    phase: "05-l02",
    taskId: "TASK-551-05-L02",
    ownedFiles: [
      "scripts/task-551-explain-plans.ts",
      "tests/perf/fixtures/task551QueryPlanContracts.ts",
    ],
    ownedTests: [
      "tests/perf/database-explain-plans.test.ts",
      "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts",
    ],
    readOnlyImports: [
      "scripts/task551DatabaseBaseline/digestContract.ts",
      "scripts/task551DatabaseBaseline/fixtureTarget.ts",
      "scripts/task551DatabaseBaseline/receiptContract.ts",
    ],
    materializedWorktreeOutputs: [],
    ephemeralPostOperationOutputs: [".tmp/task-551/task489-predecessor-v1.json"],
  }),
]);

export const TASK551_DEFERRED_LITERAL_TARGETS = freeze([
  freeze({
    id: "l03-bootstrap",
    path: "scripts/task-551-fixture-target-bootstrap.ts",
    eligibleAfter: "l03-closure",
    seam: "adaptTask551L03ClosureV2",
  }),
  freeze({
    id: "l04-bootstrap",
    path: "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts",
    eligibleAfter: "l04-closure",
    seam: "adaptTask551L04ClosureV2",
  }),
  freeze({
    id: "l02-persistence",
    path: "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
    eligibleAfter: "l02-code-test-materialization",
    seam: "adaptTask551L02ClosureV2",
  }),
  freeze({
    id: "l02-owner-host",
    path: "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
    eligibleAfter: "l02-code-test-materialization",
    seam: "runTask551ImplementWorkflow",
  }),
  freeze({
    id: "05-l02-predecessor",
    path: "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
    eligibleAfter: "05-l02-predecessor-seam",
    seam: "readTask55105L02PredecessorAtNamedSeam",
  }),
]);
export const TASK551_DEFERRED_LITERAL_TARGET_PATHS = freeze(
  TASK551_DEFERRED_LITERAL_TARGETS.map((target) => target.path)
);
export const deferred = (path) => TASK551_DEFERRED_LITERAL_TARGET_PATHS.includes(path);
const ownedCodeTests = (entry) => [...entry.ownedFiles, ...entry.ownedTests];
const genericPaths = (entry) =>
  [...ownedCodeTests(entry), ...entry.readOnlyImports].filter((path) => !deferred(path));
const project = (select) =>
  readOnlyMap(TASK551_PHASE_PROVENANCE.map((entry) => [entry.phase, sortUnique(select(entry))]));

// The standalone capability-routes regression is L01-owned and directly gated,
// but never becomes an L11 barrier input or receipt byte.
const TASK551_L01_BARRIER_EXCLUDED_DIRECT_AUXILIARY_PATHS = freeze([
  "tests/perf/database-query-inventory-capability-routes.test.ts",
]);
const TASK551_L01_BARRIER_INPUT_PATHS = freeze([
  "scripts/bun-lane-classify.ts",
  "scripts/task-551-query-inventory.ts",
  "scripts/task551QueryInventory/bunLane.ts",
  "scripts/task551QueryInventory/canonical.ts",
  "scripts/task551QueryInventory/check.ts",
  "scripts/task551QueryInventory/clientExpressions.ts",
  "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
  "scripts/task551QueryInventory/contracts.ts",
  "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
  "scripts/task551QueryInventory/dynamicImportOrigins.ts",
  "scripts/task551QueryInventory/dynamicImportProvenance.ts",
  "scripts/task551QueryInventory/fileDiscovery.ts",
  "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
  "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
  "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
  "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
  "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
  "scripts/task551QueryInventory/literalDynamicClientImports.ts",
  "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
  "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
  "scripts/task551QueryInventory/productionScan.ts",
  "scripts/task551QueryInventory/scan.ts",
  "tests/integration/server/task551BunLaneMembership.test.ts",
  "tests/perf/database-query-inventory.test.ts",
  "tests/perf/fixtures/task551QueryInventory.ts",
  "tests/unit/toolchain/bunLaneManifest.test.ts",
]);
export const l11BarrierIncludesPath = (path) =>
  !deferred(path) && !TASK551_L01_BARRIER_EXCLUDED_DIRECT_AUXILIARY_PATHS.includes(path);

export const TASK551_PHASE_IMPORT_CLOSURE = project(genericPaths);
export const TASK551_PHASE_DISCOVERY_ALLOWLIST = project(genericPaths);
export const TASK551_PHASE_CLOSED_ALLOWLIST = project((entry) =>
  ownedCodeTests(entry).filter((path) => !deferred(path))
);
export const TASK551_PHASE_VALIDATION_PATHS = project(genericPaths);
export const TASK551_PHASE_OWNED_CODE_TEST_PATHS = project(ownedCodeTests);
export const TASK551_PHASE_LINE_COUNT_PATHS = project(ownedCodeTests);
export const TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS = project(
  (entry) => entry.materializedWorktreeOutputs
);
export const TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS = project(
  (entry) => entry.ephemeralPostOperationOutputs
);
export const TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE = project((entry) => [
  ...genericPaths(entry),
  ...entry.materializedWorktreeOutputs,
]);
export const TASK551_PHASE_RUNTIME_OUTPUTS = project((entry) => [
  ...entry.materializedWorktreeOutputs,
  ...entry.ephemeralPostOperationOutputs,
]);
export const TASK551_L01_MATERIALIZATION_WORKTREE_PHASES = freeze(["l01"]);
export const TASK551_L01_MATERIALIZED_BARRIER_CLOSURE = sortUnique([
  ...TASK551_L01_BARRIER_INPUT_PATHS,
  ...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01"),
]);
export const TASK551_05_L02_PROVENANCE = TASK551_PHASE_PROVENANCE.find(
  (entry) => entry.phase === "05-l02"
);
export const TASK551_05_L02_VALIDATION_PATHS = TASK551_PHASE_VALIDATION_PATHS.get("05-l02");
export const TASK551_05_L02_LINE_COUNT_PATHS = TASK551_PHASE_LINE_COUNT_PATHS.get("05-l02");

export function l11BarrierInputPaths(phaseId) {
  if (phaseId === "l01") return TASK551_L01_BARRIER_INPUT_PATHS;
  const paths = TASK551_PHASE_IMPORT_CLOSURE.get(phaseId);
  if (paths === undefined) throw new Error(`task551_l11_barrier_phase_unknown:${String(phaseId)}`);
  return paths;
}
export function l11MaterializedBarrierClosure(phaseId) {
  if (phaseId === "l01") return TASK551_L01_MATERIALIZED_BARRIER_CLOSURE;
  const paths = TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get(phaseId);
  if (paths === undefined) throw new Error(`task551_l11_barrier_phase_unknown:${String(phaseId)}`);
  return paths;
}

export function deriveTask551ClosedWorktreeSet(phases) {
  if (!Array.isArray(phases)) throw new Error("task551_closed_worktree_phases_not_array");
  return sortUnique(
    phases.flatMap((name) => [
      ...(TASK551_PHASE_CLOSED_ALLOWLIST.get(name) ?? []),
      ...(TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get(name) ?? []),
    ])
  );
}
export const deriveTask551L01MaterializationClosedSet = () =>
  deriveTask551ClosedWorktreeSet(TASK551_L01_MATERIALIZATION_WORKTREE_PHASES);
export const getTask55105L02Provenance = () => TASK551_05_L02_PROVENANCE;
export const getTask55105L02ValidationPaths = () => TASK551_05_L02_VALIDATION_PATHS;
export const getTask55105L02LineCountPaths = () => TASK551_05_L02_LINE_COUNT_PATHS;

function hasControl(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) return true;
  }
  return false;
}
export function normalizeTask551RepoPath(input) {
  if (typeof input !== "string" || input.length === 0)
    throw new Error("task551_path_not_literal_string");
  if (hasControl(input) || input.includes("\\"))
    throw new Error(`task551_path_control_or_backslash:${input}`);
  const segments = input.split("/");
  if (
    input.startsWith("/") ||
    input.endsWith("/") ||
    segments.some((part) => part === "" || part === "." || part === "..")
  )
    throw new Error(`task551_path_traversal_or_relative:${input}`);
  return segments.join("/");
}
export function requireTask551LiteralUniquePaths(paths, label) {
  if (!Array.isArray(paths)) throw new Error(`task551_paths_not_array:${label}`);
  const seen = new Set();
  return paths.map((path) => {
    const normalized = normalizeTask551RepoPath(path);
    if (seen.has(normalized)) throw new Error(`task551_duplicate_path:${normalized}`);
    seen.add(normalized);
    return normalized;
  });
}

export function requireTask551WorktreeCompatibilityIntegrity() {
  for (const item of TASK551_PHASE_PROVENANCE) {
    for (const key of [
      "ownedFiles",
      "ownedTests",
      "readOnlyImports",
      "materializedWorktreeOutputs",
      "ephemeralPostOperationOutputs",
    ])
      requireTask551LiteralUniquePaths(item[key], `${item.phase}:${key}`);
  }
  const sources = new Set([...TASK551_PHASE_IMPORT_CLOSURE.values()].flat());
  for (const outputs of TASK551_PHASE_RUNTIME_OUTPUTS.values())
    for (const output of outputs)
      if (sources.has(output)) throw new Error(`task551_runtime_output_in_source_set:${output}`);
  for (const target of TASK551_DEFERRED_LITERAL_TARGETS) {
    if (
      sources.has(target.path) ||
      [...TASK551_PHASE_CLOSED_ALLOWLIST.values()].flat().includes(target.path)
    )
      throw new Error("task551_deferred_target_in_generic_projection");
  }
  const l01Inputs = TASK551_PHASE_IMPORT_CLOSURE.get("l01");
  if (TASK551_L01_BARRIER_EXCLUDED_DIRECT_AUXILIARY_PATHS.some((path) => !l01Inputs.includes(path)))
    throw new Error("task551_l01_barrier_exclusion_invalid");
  exactSorted(
    TASK551_L01_BARRIER_INPUT_PATHS,
    l01Inputs.filter(l11BarrierIncludesPath),
    "task551_l01_barrier_input_projection_invalid"
  );
  exactSorted(
    TASK551_L01_MATERIALIZED_BARRIER_CLOSURE,
    [...TASK551_L01_BARRIER_INPUT_PATHS, ...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01")],
    "task551_l01_barrier_closure_invalid"
  );
  return true;
}

const DEPENDENCIES = new Map([
  ["l03", ["sidecar", "l01"]],
  ["l04", ["sidecar", "l01", "l03"]],
  ["l02", ["sidecar", "l01", "l03", "l04"]],
  ["05-l02", ["sidecar", "l01", "l03", "l04", "l02"]],
]);
export function task551DependenciesThrough(phaseId) {
  return DEPENDENCIES.get(phaseId) ?? ["sidecar"];
}
export function task551FullProvenanceClosureForSpawn(phaseId) {
  if (!DEPENDENCIES.has(phaseId))
    throw new Error(`task551_pre_spawn_phase_unknown:${String(phaseId)}`);
  return freeze([...new Set([...task551DependenciesThrough(phaseId), phaseId])]);
}
function exactSorted(actual, expected, code) {
  if (!Array.isArray(actual) || !Array.isArray(expected))
    throw new Error(`task551_allowlist_not_array:${code}`);
  const left = [...actual].sort(),
    right = [...expected].sort();
  if (left.length !== right.length || left.some((item, index) => item !== right[index]))
    throw new Error(`task551_allowlist_mismatch:${code}:${left.join(",")}`);
}
export function requireExactDiscoveredPaths(paths, allowlist, phaseId) {
  exactSorted(
    paths,
    READ_ONLY_MAPS.has(allowlist) || allowlist instanceof Map ? allowlist.get(phaseId) : allowlist,
    phaseId
  );
}
export function requireExactClosedPaths(paths, allowlist, phaseId) {
  exactSorted(
    paths,
    READ_ONLY_MAPS.has(allowlist) || allowlist instanceof Map ? allowlist.get(phaseId) : allowlist,
    phaseId
  );
}

export const TASK551_PLANNED_BUN_PATHS = freeze([
  "tests/perf/database-query-inventory.test.ts",
  "tests/integration/server/task551BunLaneMembership.test.ts",
  "tests/perf/task551FixtureTargetBootstrap.test.ts",
  "tests/perf/database-query-baseline.test.ts",
  "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
  "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
  "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
  "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
  "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
]);

/** Presence-only generic classifier inputs; no deferred target may occur here. */
export const TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS = TASK551_PLANNED_BUN_PATHS;
