// TASK-551-11 private, pure compatibility and current-worktree contract.
// It intentionally has no filesystem, database, L02, or target-module import.

import { createHash } from "node:crypto";
import { TextEncoder } from "node:util";

const encoder = new TextEncoder();
const SHA256 = /^[a-f0-9]{64}$/u;
const PREFIXED_NONZERO_SHA256 = /^sha256:(?!0{64}$)[a-f0-9]{64}$/u;
const READ_ONLY_MAPS = new WeakSet();
const freeze = (value) => Object.freeze(value);
const sortUnique = (paths) => freeze([...new Set(paths)].sort());
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function ownData(value, keys, code) {
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

function plainArray(value, code) {
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
    ],
    ownedTests: [
      "tests/unit/workflows/task551AuthorAudit.test.ts",
      "tests/unit/workflows/task551WorkflowContracts.test.ts",
      "tests/unit/workflows/task551EvidenceContract.test.ts",
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
const deferred = (path) => TASK551_DEFERRED_LITERAL_TARGET_PATHS.includes(path);
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
const l11BarrierIncludesPath = (path) =>
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
const TASK551_L01_MATERIALIZED_BARRIER_CLOSURE = sortUnique([
  ...TASK551_L01_BARRIER_INPUT_PATHS,
  ...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01"),
]);
export const TASK551_05_L02_PROVENANCE = TASK551_PHASE_PROVENANCE.find(
  (entry) => entry.phase === "05-l02"
);
export const TASK551_05_L02_VALIDATION_PATHS = TASK551_PHASE_VALIDATION_PATHS.get("05-l02");
export const TASK551_05_L02_LINE_COUNT_PATHS = TASK551_PHASE_LINE_COUNT_PATHS.get("05-l02");

function l11BarrierInputPaths(phaseId) {
  if (phaseId === "l01") return TASK551_L01_BARRIER_INPUT_PATHS;
  const paths = TASK551_PHASE_IMPORT_CLOSURE.get(phaseId);
  if (paths === undefined) throw new Error(`task551_l11_barrier_phase_unknown:${String(phaseId)}`);
  return paths;
}
function l11MaterializedBarrierClosure(phaseId) {
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

// Descriptor-only bootstrap data. It has no target bytes, paths, or exports.
export const TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA =
  "coderso.task551.workflow-compatibility-bootstrap@v2";
export const TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA =
  "coderso.task551.workflow-capability-descriptor@v2";
export const TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE = "TASK-551-11:compatibility-bootstrap@v2";
const COMPATIBILITY_FRAME_MAGIC = "coderso.task551.workflow-compatibility-descriptor@v2";
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
export const TASK551_L02_SUBGATE_KINDS = freeze([
  "classifier-materialization",
  "reviewed-pair-transition",
]);
const COMPATIBILITY_DESCRIPTOR_KEYS = freeze([
  "schema",
  "phase",
  "descriptorSchema",
  "sidecarPaths",
  "plannedBunPaths",
  "l02Subgates",
  "workflowPrerequisite",
  "l04Phase",
]);
const COMPATIBILITY_RECEIPT_KEYS = freeze([
  "schema",
  "phase",
  "descriptorSchema",
  "sidecarClosureSha256",
  "sidecarPaths",
  "plannedBunPaths",
  "l02Subgates",
  "workflowPrerequisite",
  "l04Phase",
]);
const COMPATIBILITY_DESCRIPTOR = freeze({
  schema: TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA,
  phase: "compatibility-bootstrap",
  descriptorSchema: TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA,
  sidecarPaths: freeze([...TASK551_PHASE_PROVENANCE[0].ownedFiles]),
  plannedBunPaths: TASK551_PLANNED_BUN_PATHS,
  l02Subgates: TASK551_L02_SUBGATE_KINDS,
  workflowPrerequisite: TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE,
  l04Phase: true,
});

function frozenExactStrings(value, expected, code) {
  const list = plainArray(value, code);
  if (
    !Object.isFrozen(list) ||
    list.length !== expected.length ||
    list.some((entry, index) => entry !== expected[index])
  )
    throw new Error(code);
  return list;
}
function frameHash(strings) {
  const hash = createHash("sha256");
  for (const value of strings) {
    const bytes = encoder.encode(value);
    if (bytes.byteLength > 0xffffffff)
      throw new Error("task551_workflow_compatibility_bootstrap_invalid");
    const frame = new Uint8Array(bytes.byteLength + 4);
    new DataView(frame.buffer).setUint32(0, bytes.byteLength, false);
    frame.set(bytes, 4);
    hash.update(frame);
  }
  return hash.digest("hex");
}
function requireCompatibilityDescriptor(value, code) {
  ownData(value, COMPATIBILITY_DESCRIPTOR_KEYS, code);
  if (
    !Object.isFrozen(value) ||
    value.schema !== COMPATIBILITY_DESCRIPTOR.schema ||
    value.phase !== COMPATIBILITY_DESCRIPTOR.phase ||
    value.descriptorSchema !== COMPATIBILITY_DESCRIPTOR.descriptorSchema ||
    value.workflowPrerequisite !== COMPATIBILITY_DESCRIPTOR.workflowPrerequisite ||
    value.l04Phase !== true
  )
    throw new Error(code);
  frozenExactStrings(value.sidecarPaths, COMPATIBILITY_DESCRIPTOR.sidecarPaths, code);
  frozenExactStrings(value.plannedBunPaths, COMPATIBILITY_DESCRIPTOR.plannedBunPaths, code);
  frozenExactStrings(value.l02Subgates, COMPATIBILITY_DESCRIPTOR.l02Subgates, code);
  return value;
}
export function getTask551WorkflowCompatibilityDescriptorV2() {
  return COMPATIBILITY_DESCRIPTOR;
}
export function task551WorkflowCompatibilityDescriptorSha256V2(value = COMPATIBILITY_DESCRIPTOR) {
  const descriptor = requireCompatibilityDescriptor(
    value,
    "task551_workflow_compatibility_bootstrap_invalid"
  );
  return frameHash([
    COMPATIBILITY_FRAME_MAGIC,
    descriptor.schema,
    descriptor.phase,
    descriptor.descriptorSchema,
    ...descriptor.sidecarPaths,
    ...descriptor.plannedBunPaths,
    ...descriptor.l02Subgates,
    descriptor.workflowPrerequisite,
    "true",
  ]);
}
export function createTask551WorkflowCompatibilityReceiptV2() {
  const descriptor = COMPATIBILITY_DESCRIPTOR;
  return freeze({
    schema: descriptor.schema,
    phase: descriptor.phase,
    descriptorSchema: descriptor.descriptorSchema,
    sidecarClosureSha256: task551WorkflowCompatibilityDescriptorSha256V2(descriptor),
    sidecarPaths: descriptor.sidecarPaths,
    plannedBunPaths: descriptor.plannedBunPaths,
    l02Subgates: descriptor.l02Subgates,
    workflowPrerequisite: descriptor.workflowPrerequisite,
    l04Phase: true,
  });
}
export function requireTask551WorkflowCompatibilityReceiptV2(value) {
  ownData(value, COMPATIBILITY_RECEIPT_KEYS, "task551_workflow_compatibility_bootstrap_invalid");
  if (
    !Object.isFrozen(value) ||
    typeof value.sidecarClosureSha256 !== "string" ||
    !SHA256.test(value.sidecarClosureSha256)
  )
    throw new Error("task551_workflow_compatibility_bootstrap_invalid");
  const descriptor = freeze({
    schema: value.schema,
    phase: value.phase,
    descriptorSchema: value.descriptorSchema,
    sidecarPaths: value.sidecarPaths,
    plannedBunPaths: value.plannedBunPaths,
    l02Subgates: value.l02Subgates,
    workflowPrerequisite: value.workflowPrerequisite,
    l04Phase: value.l04Phase,
  });
  if (value.sidecarClosureSha256 !== task551WorkflowCompatibilityDescriptorSha256V2(descriptor))
    throw new Error("task551_workflow_compatibility_bootstrap_invalid");
  return value;
}

const PATH_DIGEST_KEYS = freeze(["path", "sha256"]);
const WORKTREE_FILE_KEYS = freeze(["path", "sha256", "kind"]);
const WORKTREE_KEYS = freeze([
  "taskGraphDigest",
  "taskFileDigests",
  "files",
  "discoveredByPhase",
  "closedByPhase",
  "deltaPaths",
]);
const SNAPSHOT_KEYS = freeze([
  "taskGraphDigest",
  "taskFileDigests",
  "predecessorDigests",
  "activeDigests",
]);
function pathDigests(value, code) {
  const values = plainArray(value, code),
    seen = new Set();
  let prior = "";
  return values.map((entry) => {
    ownData(entry, PATH_DIGEST_KEYS, code);
    const path = normalizeTask551RepoPath(entry.path);
    if (
      typeof entry.sha256 !== "string" ||
      !SHA256.test(entry.sha256) ||
      seen.has(path) ||
      path < prior
    )
      throw new Error(code);
    seen.add(path);
    prior = path;
    return freeze({ path, sha256: entry.sha256 });
  });
}
export function task551TaskGraphDigest(taskFileDigests) {
  const entries = pathDigests(taskFileDigests, "task551_task_graph_digest_inputs_invalid");
  if (entries.some(({ path }) => deferred(path)))
    throw new Error("task551_deferred_target_in_generic_snapshot");
  return digest(encoder.encode(entries.map(({ path, sha256 }) => `${path}\0${sha256}\0`).join("")));
}
function currentWorktree(value) {
  ownData(value, WORKTREE_KEYS, "task551_worktree_snapshot_invalid");
  const taskFileDigests = pathDigests(value.taskFileDigests, "task551_worktree_task_files_invalid");
  if (
    typeof value.taskGraphDigest !== "string" ||
    !SHA256.test(value.taskGraphDigest) ||
    value.taskGraphDigest !== task551TaskGraphDigest(taskFileDigests)
  )
    throw new Error("task551_worktree_task_graph_invalid");
  const files = new Map();
  for (const entry of plainArray(value.files, "task551_worktree_files_invalid")) {
    ownData(entry, WORKTREE_FILE_KEYS, "task551_worktree_files_invalid");
    const path = normalizeTask551RepoPath(entry.path);
    if (
      (entry.kind !== "regular" && entry.kind !== "symlink") ||
      typeof entry.sha256 !== "string" ||
      !SHA256.test(entry.sha256) ||
      files.has(path)
    )
      throw new Error("task551_worktree_files_invalid");
    files.set(path, freeze({ path, sha256: entry.sha256, kind: entry.kind }));
  }
  const names = new Set(TASK551_PHASE_PROVENANCE.map(({ phase }) => phase));
  const phaseLists = (record, code) => {
    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.getPrototypeOf(record) !== Object.prototype
    )
      throw new Error(code);
    const copy = Object.create(null);
    for (const [name, paths] of Object.entries(record)) {
      if (!names.has(name)) throw new Error(code);
      copy[name] = freeze(requireTask551LiteralUniquePaths(paths, code).sort());
    }
    return freeze(copy);
  };
  return freeze({
    taskGraphDigest: value.taskGraphDigest,
    taskFileDigests: freeze(taskFileDigests),
    files,
    discoveredByPhase: phaseLists(value.discoveredByPhase, "task551_worktree_discovery_invalid"),
    closedByPhase: phaseLists(value.closedByPhase, "task551_worktree_closed_invalid"),
    deltaPaths: freeze(
      requireTask551LiteralUniquePaths(value.deltaPaths, "task551_worktree_delta_invalid").sort()
    ),
  });
}
function snapshot(value) {
  ownData(value, SNAPSHOT_KEYS, "task551_current_worktree_snapshot_invalid");
  const taskFileDigests = pathDigests(
    value.taskFileDigests,
    "task551_current_worktree_task_files_invalid"
  );
  if (
    typeof value.taskGraphDigest !== "string" ||
    !SHA256.test(value.taskGraphDigest) ||
    value.taskGraphDigest !== task551TaskGraphDigest(taskFileDigests)
  )
    throw new Error("task551_current_worktree_task_graph_invalid");
  const predecessorDigests = pathDigests(
      value.predecessorDigests,
      "task551_current_worktree_predecessors_invalid"
    ),
    activeDigests = pathDigests(value.activeDigests, "task551_current_worktree_active_invalid");
  if ([...predecessorDigests, ...activeDigests].some(({ path }) => deferred(path)))
    throw new Error("task551_deferred_target_in_generic_snapshot");
  return freeze({
    taskGraphDigest: value.taskGraphDigest,
    taskFileDigests: freeze(taskFileDigests),
    predecessorDigests: freeze(predecessorDigests),
    activeDigests: freeze(activeDigests),
  });
}
const genericWorktreeDigestIncludesPath = (path) => !deferred(path);
function currentDigest(checked, includesPath = genericWorktreeDigestIncludesPath) {
  // Generic worktree receipts deliberately cannot fingerprint deferred literal
  // targets. Named owner closures validate those bytes separately.
  const files = [...checked.files.values()]
    .filter(({ path }) => includesPath(path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const phases = TASK551_PHASE_PROVENANCE.flatMap(({ phase }) => [
    `discovery:${phase}:${JSON.stringify(checked.discoveredByPhase[phase]?.filter(includesPath) ?? null)}`,
    `closed:${phase}:${JSON.stringify(checked.closedByPhase[phase]?.filter(includesPath) ?? null)}`,
  ]);
  return digest(
    encoder.encode(
      [
        `graph:${checked.taskGraphDigest}`,
        ...checked.taskFileDigests.map(({ path, sha256 }) => `task:${path}:${sha256}`),
        ...files.map(({ path, sha256, kind }) => `file:${path}:${kind}:${sha256}`),
        ...phases,
        ...checked.deltaPaths.filter(includesPath).map((path) => `delta:${path}`),
      ].join("\n")
    )
  );
}
export function task551CurrentWorktreeDigest(value) {
  return currentDigest(currentWorktree(value));
}
export function task551L11BarrierCurrentWorktreeDigest(value) {
  return currentDigest(currentWorktree(value), l11BarrierIncludesPath);
}
export function task551WorktreeSnapshotDigest(value) {
  const checked = snapshot(value);
  return digest(
    encoder.encode(
      [
        `graph:${checked.taskGraphDigest}`,
        ...checked.taskFileDigests.map(({ path, sha256 }) => `task:${path}:${sha256}`),
        ...checked.predecessorDigests.map(({ path, sha256 }) => `predecessor:${path}:${sha256}`),
        ...checked.activeDigests.map(({ path, sha256 }) => `active:${path}:${sha256}`),
      ].join("\n")
    )
  );
}
export function task551L11BarrierSnapshotDigest(value) {
  const checked = snapshot(value);
  return digest(
    encoder.encode(
      [
        `graph:${checked.taskGraphDigest}`,
        ...checked.taskFileDigests.map(({ path, sha256 }) => `task:${path}:${sha256}`),
        ...checked.predecessorDigests
          .filter(({ path }) => l11BarrierIncludesPath(path))
          .map(({ path, sha256 }) => `predecessor:${path}:${sha256}`),
        ...checked.activeDigests
          .filter(({ path }) => l11BarrierIncludesPath(path))
          .map(({ path, sha256 }) => `active:${path}:${sha256}`),
      ].join("\n")
    )
  );
}
export function createTask551TaskGraphSnapshot(taskFileDigests) {
  const entries = pathDigests(taskFileDigests, "task551_task_graph_snapshot_inputs_invalid");
  return freeze({
    taskGraphDigest: task551TaskGraphDigest(entries),
    taskFileDigests: freeze(entries),
    predecessorDigests: freeze([]),
    activeDigests: freeze([]),
  });
}
function exactDigestPaths(values, paths, code) {
  const expected = [...new Set(paths)].sort();
  if (
    values.length !== expected.length ||
    values.some((entry, index) => entry.path !== expected[index])
  )
    throw new Error(code);
}
function currentRegular(paths, value) {
  const checked = currentWorktree(value);
  for (const path of paths)
    if (checked.files.get(path)?.kind !== "regular")
      throw new Error(`task551_current_worktree_file_not_regular:${path}`);
}
function currentRegularDigests(paths, digests, value) {
  const checked = currentWorktree(value),
    expected = pathDigests(digests, "task551_current_worktree_digest_invalid");
  exactDigestPaths(expected, paths, "task551_current_worktree_digest_paths_invalid");
  for (const entry of expected) {
    const file = checked.files.get(entry.path);
    if (file?.kind !== "regular")
      throw new Error(`task551_current_worktree_file_not_regular:${entry.path}`);
    if (file.sha256 !== entry.sha256)
      throw new Error(`task551_current_worktree_byte_drift:${entry.path}`);
  }
}
export function requireTaskFilesAndGraphBytesEqual(taskFileDigests, taskGraphDigest, value) {
  const checked = currentWorktree(value),
    expected = pathDigests(taskFileDigests, "task551_task_graph_task_files_invalid");
  if (
    typeof taskGraphDigest !== "string" ||
    !SHA256.test(taskGraphDigest) ||
    taskGraphDigest !== task551TaskGraphDigest(expected)
  )
    throw new Error("task551_task_graph_digest_invalid");
  if (
    checked.taskGraphDigest !== taskGraphDigest ||
    checked.taskFileDigests.length !== expected.length ||
    checked.taskFileDigests.some(
      (entry, index) =>
        entry.path !== expected[index].path || entry.sha256 !== expected[index].sha256
    )
  )
    throw new Error("task551_task_graph_byte_drift");
  return true;
}
function phasePaths(checked, property, phaseId, allowlist, code) {
  const paths = checked[property][phaseId];
  if (paths === undefined) throw new Error(`${code}:${phaseId}`);
  requireExactDiscoveredPaths(paths, allowlist, phaseId);
}
function predecessors(phaseId) {
  return phaseId === "l01"
    ? freeze(["sidecar"])
    : task551FullProvenanceClosureForSpawn(phaseId).filter((name) => name !== phaseId);
}

/** Presence-only generic classifier inputs; no deferred target may occur here. */
export const TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS = TASK551_PLANNED_BUN_PATHS;
const MANIFEST_PATH = "tests/bun-lane-manifest.json";
const FOUR_TEST_ARGV = freeze([
  "bun",
  "--env-file=/dev/null",
  "test",
  "tests/perf/task551FixtureTargetBootstrap.test.ts",
  "tests/perf/database-query-baseline.test.ts",
  "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
  "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
]);
const CLASSIFIER_ARGV = freeze(["bun", "scripts/bun-lane-classify.ts"]);
const POST_RECEIPTS = freeze([
  freeze(["l11-post-generator-manifest-test", "tests/unit/toolchain/bunLaneManifest.test.ts"]),
  freeze([
    "l11-post-generator-membership-test",
    "tests/integration/server/task551BunLaneMembership.test.ts",
  ]),
]);
const L03_ROW = freeze({
  path: "_docs/_workflows/_smoke/task-551/audit-evidence/l03-check.json",
  schema: "coderso.task551.l03-check-evidence@v1",
  phase: "l03-check",
});
function predecessorPaths(phaseId) {
  const paths = predecessors(phaseId).flatMap((name) => l11BarrierInputPaths(name));
  if (phaseId === "l02" || phaseId === "05-l02")
    paths.push(...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get("l01"));
  if (phaseId === "l02") paths.push(...TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS);
  return sortUnique(paths);
}
function allowedDelta(phaseId, value) {
  return sortUnique([
    ...value.taskFileDigests.map(({ path }) => path),
    ...predecessorPaths(phaseId),
    ...TASK551_PHASE_IMPORT_CLOSURE.get(phaseId),
    ...TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get(phaseId),
    ...TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS.get(phaseId),
  ]);
}
export function requirePhaseReadOnlyImportsInCurrentWorktree(phaseId, value) {
  const paths = TASK551_PHASE_PROVENANCE.find(({ phase }) => phase === phaseId)?.readOnlyImports;
  if (paths === undefined)
    throw new Error(`task551_current_worktree_phase_unknown:${String(phaseId)}`);
  currentRegular(
    paths.filter((path) => !deferred(path)),
    value
  );
  return true;
}
export function requireNoForeignPathOrByteDrift(value, current, allowedPaths) {
  const checkedSnapshot = snapshot(value),
    checkedCurrent = currentWorktree(current);
  requireTaskFilesAndGraphBytesEqual(
    checkedSnapshot.taskFileDigests,
    checkedSnapshot.taskGraphDigest,
    current
  );
  const byPath = new Map();
  for (const entry of [...checkedSnapshot.predecessorDigests, ...checkedSnapshot.activeDigests]) {
    const previous = byPath.get(entry.path);
    if (previous !== undefined && previous !== entry.sha256)
      throw new Error(`task551_current_worktree_snapshot_conflict:${entry.path}`);
    byPath.set(entry.path, entry.sha256);
  }
  const digests = [...byPath]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, sha256]) => ({ path, sha256 }));
  currentRegularDigests(
    digests.map(({ path }) => path),
    digests,
    current
  );
  const allowed = new Set(
    requireTask551LiteralUniquePaths(allowedPaths, "task551_current_worktree_allowed_delta_invalid")
  );
  for (const path of checkedCurrent.deltaPaths) {
    if (deferred(path)) continue;
    if (!allowed.has(path)) throw new Error(`task551_current_worktree_foreign_delta:${path}`);
  }
  return true;
}
export function captureTask551PreSpawnWorktreeSnapshot(phaseId, auditSnapshot, value) {
  const audit = snapshot(auditSnapshot),
    checked = currentWorktree(value);
  requireTaskFilesAndGraphBytesEqual(audit.taskFileDigests, audit.taskGraphDigest, value);
  for (const member of predecessors(phaseId)) {
    phasePaths(
      checked,
      "discoveredByPhase",
      member,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      member,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  requirePhaseReadOnlyImportsInCurrentWorktree(phaseId, value);
  const paths = predecessorPaths(phaseId);
  currentRegular(paths, value);
  const predecessorDigests = freeze(
    paths.map((path) => freeze({ path, sha256: checked.files.get(path).sha256 }))
  );
  const result = freeze({
    taskGraphDigest: audit.taskGraphDigest,
    taskFileDigests: audit.taskFileDigests,
    predecessorDigests,
    activeDigests: freeze([]),
  });
  requireNoForeignPathOrByteDrift(result, value, allowedDelta(phaseId, result));
  return result;
}
export function captureTask551MaterializedWorktreeSnapshot(phaseId, predecessorSnapshot, value) {
  const predecessor = snapshot(predecessorSnapshot),
    checked = currentWorktree(value);
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn(phaseId, predecessor, value);
  phasePaths(
    checked,
    "discoveredByPhase",
    phaseId,
    TASK551_PHASE_DISCOVERY_ALLOWLIST,
    "task551_current_worktree_discovery_missing"
  );
  phasePaths(
    checked,
    "closedByPhase",
    phaseId,
    TASK551_PHASE_CLOSED_ALLOWLIST,
    "task551_current_worktree_closed_missing"
  );
  const paths = TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get(phaseId);
  currentRegular(paths, value);
  const activeDigests = freeze(
    paths.map((path) => freeze({ path, sha256: checked.files.get(path).sha256 }))
  );
  const result = freeze({ ...predecessor, activeDigests });
  requireNoForeignPathOrByteDrift(result, value, allowedDelta(phaseId, result));
  return result;
}
export function requireTask551PredecessorWorktreeSnapshotBeforeSpawn(phaseId, value, current) {
  const checkedSnapshot = snapshot(value),
    checked = currentWorktree(current);
  for (const member of predecessors(phaseId)) {
    phasePaths(
      checked,
      "discoveredByPhase",
      member,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      member,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  const paths = predecessorPaths(phaseId);
  exactDigestPaths(
    checkedSnapshot.predecessorDigests,
    paths,
    "task551_current_worktree_predecessor_paths_invalid"
  );
  currentRegularDigests(paths, checkedSnapshot.predecessorDigests, current);
  requirePhaseReadOnlyImportsInCurrentWorktree(phaseId, current);
  requireNoForeignPathOrByteDrift(checkedSnapshot, current, allowedDelta(phaseId, checkedSnapshot));
  return true;
}
export function requireExactActivePhaseSnapshotBeforeSpawn(
  phaseId,
  activeDigests,
  value,
  previous = null
) {
  const checked = currentWorktree(value),
    expected = TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get(phaseId);
  const active = pathDigests(activeDigests, "task551_current_worktree_active_invalid");
  exactDigestPaths(active, expected, "task551_current_worktree_active_paths_invalid");
  phasePaths(
    checked,
    "discoveredByPhase",
    phaseId,
    TASK551_PHASE_DISCOVERY_ALLOWLIST,
    "task551_current_worktree_discovery_missing"
  );
  phasePaths(
    checked,
    "closedByPhase",
    phaseId,
    TASK551_PHASE_CLOSED_ALLOWLIST,
    "task551_current_worktree_closed_missing"
  );
  currentRegularDigests(expected, active, value);
  if (previous !== null)
    requireNoForeignPathOrByteDrift(previous, value, allowedDelta(phaseId, snapshot(previous)));
  return true;
}

function exactStrings(value, expected, code) {
  const list = plainArray(value, code);
  if (list.length !== expected.length || list.some((entry, index) => entry !== expected[index]))
    throw new Error(code);
  return freeze([...list]);
}
function barrierReceipt(value, id, argv, discovery, code, worktreeDigest, manifestSha256 = null) {
  const keys =
    manifestSha256 === null
      ? [
          "id",
          "argv",
          "exitCode",
          "signalCode",
          "timedOut",
          "overflowed",
          "discoveredTestCount",
          "worktreeDigest",
        ]
      : [
          "id",
          "argv",
          "exitCode",
          "signalCode",
          "timedOut",
          "overflowed",
          "discoveredTestCount",
          "worktreeDigest",
          "manifestSha256",
        ];
  ownData(value, keys, code);
  if (
    value.id !== id ||
    value.exitCode !== 0 ||
    value.signalCode !== null ||
    value.timedOut !== false ||
    value.overflowed !== false ||
    value.worktreeDigest !== worktreeDigest
  )
    throw new Error(code);
  exactStrings(value.argv, argv, code);
  if (
    discovery
      ? !Number.isSafeInteger(value.discoveredTestCount) || value.discoveredTestCount < 1
      : value.discoveredTestCount !== null
  )
    throw new Error(code);
  if (manifestSha256 !== null && value.manifestSha256 !== manifestSha256) throw new Error(code);
}
function l03Proof(value, worktreeDigest) {
  ownData(
    value,
    ["path", "schema", "phase", "taskId", "accepted", "acceptedEvidenceDigest", "worktreeDigest"],
    "task551_l11_l03_evidence_proof_invalid"
  );
  if (
    value.path !== L03_ROW.path ||
    value.schema !== L03_ROW.schema ||
    value.phase !== L03_ROW.phase ||
    value.taskId !== "TASK-551-01-L03" ||
    value.accepted !== true ||
    value.worktreeDigest !== worktreeDigest ||
    typeof value.acceptedEvidenceDigest !== "string" ||
    !PREFIXED_NONZERO_SHA256.test(value.acceptedEvidenceDigest)
  )
    throw new Error("task551_l11_l03_evidence_proof_invalid");
  return freeze({ ...value });
}
function barrierSnapshot(phaseId, audit, value, active) {
  const checked = currentWorktree(value);
  for (const member of predecessors(phaseId)) {
    phasePaths(
      checked,
      "discoveredByPhase",
      member,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      member,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  if (active) {
    phasePaths(
      checked,
      "discoveredByPhase",
      phaseId,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      phaseId,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  const before = predecessorPaths(phaseId),
    own = active ? l11MaterializedBarrierClosure(phaseId) : [];
  currentRegular([...before, ...own], value);
  const row = (path) => freeze({ path, sha256: checked.files.get(path).sha256 });
  const result = freeze({
    taskGraphDigest: audit.taskGraphDigest,
    taskFileDigests: audit.taskFileDigests,
    predecessorDigests: freeze(before.map(row)),
    activeDigests: freeze(own.map(row)),
  });
  requireNoForeignPathOrByteDrift(result, value, barrierAllowedDelta(audit));
  return result;
}
function barrierAllowedDelta(audit) {
  return sortUnique([
    ...audit.taskFileDigests.map(({ path }) => path),
    ...TASK551_PHASE_IMPORT_CLOSURE.get("sidecar"),
    ...TASK551_L01_MATERIALIZED_BARRIER_CLOSURE,
    ...TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l03"),
    ...TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE.get("l04"),
    ...TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  ]);
}
function manifest(value, after) {
  ownData(value, ["path", "sha256", "task551Paths"], "task551_l11_manifest_invalid");
  if (
    value.path !== MANIFEST_PATH ||
    typeof value.sha256 !== "string" ||
    !SHA256.test(value.sha256)
  )
    throw new Error("task551_l11_manifest_invalid");
  exactStrings(value.task551Paths, TASK551_PLANNED_BUN_PATHS, "task551_l11_manifest_invalid");
  const file = after.files.get(value.path);
  if (file?.kind !== "regular" || file.sha256 !== value.sha256)
    throw new Error("task551_l11_manifest_invalid");
  return freeze({
    path: value.path,
    sha256: value.sha256,
    task551Paths: freeze([...value.task551Paths]),
  });
}
function barrierChangedPaths(before, after) {
  const left = currentWorktree(before).files,
    right = currentWorktree(after).files;
  return sortUnique(
    [...new Set([...left.keys(), ...right.keys()])]
      .filter(l11BarrierIncludesPath)
      .filter(
        (path) =>
          left.get(path)?.sha256 !== right.get(path)?.sha256 ||
          left.get(path)?.kind !== right.get(path)?.kind
      )
  );
}
function captureL11BarrierPredecessorSnapshot(phaseId, audit, value) {
  const checked = currentWorktree(value);
  for (const member of predecessors(phaseId)) {
    phasePaths(
      checked,
      "discoveredByPhase",
      member,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      member,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  requirePhaseReadOnlyImportsInCurrentWorktree(phaseId, value);
  const paths = predecessorPaths(phaseId);
  currentRegular(paths, value);
  const predecessorDigests = freeze(
    paths.map((path) => freeze({ path, sha256: checked.files.get(path).sha256 }))
  );
  const result = freeze({
    taskGraphDigest: audit.taskGraphDigest,
    taskFileDigests: audit.taskFileDigests,
    predecessorDigests,
    activeDigests: freeze([]),
  });
  requireNoForeignPathOrByteDrift(result, value, barrierAllowedDelta(audit));
  return result;
}
function requireL11BarrierPredecessorSnapshotBeforeL02(value, current) {
  const checkedSnapshot = snapshot(value),
    checked = currentWorktree(current);
  for (const member of predecessors("l02")) {
    phasePaths(
      checked,
      "discoveredByPhase",
      member,
      TASK551_PHASE_DISCOVERY_ALLOWLIST,
      "task551_current_worktree_discovery_missing"
    );
    phasePaths(
      checked,
      "closedByPhase",
      member,
      TASK551_PHASE_CLOSED_ALLOWLIST,
      "task551_current_worktree_closed_missing"
    );
  }
  const paths = predecessorPaths("l02");
  exactDigestPaths(
    checkedSnapshot.predecessorDigests,
    paths,
    "task551_current_worktree_predecessor_paths_invalid"
  );
  currentRegularDigests(paths, checkedSnapshot.predecessorDigests, current);
  requirePhaseReadOnlyImportsInCurrentWorktree("l02", current);
  requireNoForeignPathOrByteDrift(checkedSnapshot, current, barrierAllowedDelta(checkedSnapshot));
  return true;
}
function requireL11BarrierSnapshotPaths(value, phaseId, active) {
  exactDigestPaths(
    value.predecessorDigests,
    predecessorPaths(phaseId),
    "task551_l11_barrier_state_invalid"
  );
  exactDigestPaths(
    value.activeDigests,
    active ? l11MaterializedBarrierClosure(phaseId) : [],
    "task551_l11_barrier_state_invalid"
  );
}
function barrierState(value) {
  ownData(
    value,
    [
      "taskGraphDigest",
      "taskFileDigests",
      "beforeWorktreeDigest",
      "afterWorktreeDigest",
      "l03WorktreeSnapshotDigest",
      "l03EvidenceProof",
      "l03ActiveSnapshot",
      "l04ActiveSnapshot",
      "l01ActiveSnapshot",
      "l02PredecessorSnapshot",
      "manifest",
    ],
    "task551_l11_barrier_state_invalid"
  );
  if (
    !Object.isFrozen(value) ||
    typeof value.beforeWorktreeDigest !== "string" ||
    !SHA256.test(value.beforeWorktreeDigest) ||
    typeof value.afterWorktreeDigest !== "string" ||
    !SHA256.test(value.afterWorktreeDigest)
  )
    throw new Error("task551_l11_barrier_state_invalid");
  const taskFileDigests = pathDigests(value.taskFileDigests, "task551_l11_barrier_state_invalid");
  if (value.taskGraphDigest !== task551TaskGraphDigest(taskFileDigests))
    throw new Error("task551_l11_barrier_state_invalid");
  const l03 = snapshot(value.l03ActiveSnapshot),
    l04 = snapshot(value.l04ActiveSnapshot),
    l01 = snapshot(value.l01ActiveSnapshot),
    l02 = snapshot(value.l02PredecessorSnapshot);
  requireL11BarrierSnapshotPaths(l03, "l03", true);
  requireL11BarrierSnapshotPaths(l04, "l04", true);
  requireL11BarrierSnapshotPaths(l01, "l01", true);
  requireL11BarrierSnapshotPaths(l02, "l02", false);
  if (value.l03WorktreeSnapshotDigest !== task551L11BarrierSnapshotDigest(l03))
    throw new Error("task551_l11_barrier_state_invalid");
  const proof = l03Proof(value.l03EvidenceProof, value.l03WorktreeSnapshotDigest);
  for (const item of [l03, l04, l01, l02])
    if (item.taskGraphDigest !== value.taskGraphDigest)
      throw new Error("task551_l11_barrier_state_invalid");
  const normalizedManifest = manifest(value.manifest, {
    files: new Map([[value.manifest.path, { kind: "regular", sha256: value.manifest.sha256 }]]),
  });
  return freeze({
    taskGraphDigest: value.taskGraphDigest,
    taskFileDigests: freeze(taskFileDigests),
    beforeWorktreeDigest: value.beforeWorktreeDigest,
    afterWorktreeDigest: value.afterWorktreeDigest,
    l03WorktreeSnapshotDigest: value.l03WorktreeSnapshotDigest,
    l03EvidenceProof: proof,
    l03,
    l04,
    l01,
    l02,
    manifest: normalizedManifest,
  });
}
/** Generic, target-free pre-classifier fence. Planned paths are presence-only. */
export function captureTask551L01PreClassifierBarrier(input) {
  ownData(
    input,
    ["auditSnapshot", "currentWorktree", "l03EvidenceProof"],
    "task551_l11_pre_classifier_input_invalid"
  );
  const audit = snapshot(input.auditSnapshot),
    checked = currentWorktree(input.currentWorktree);
  barrierSnapshot("l01", audit, input.currentWorktree, false);
  const l03 = barrierSnapshot("l03", audit, input.currentWorktree, true);
  const l04 = barrierSnapshot("l04", audit, input.currentWorktree, true);
  const l03WorktreeSnapshotDigest = task551L11BarrierSnapshotDigest(l03);
  const proof = l03Proof(input.l03EvidenceProof, l03WorktreeSnapshotDigest);
  currentRegular(TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS, input.currentWorktree);
  return freeze({
    taskGraphDigest: audit.taskGraphDigest,
    taskFileDigests: audit.taskFileDigests,
    beforeWorktreeDigest: currentDigest(checked, l11BarrierIncludesPath),
    l03WorktreeSnapshotDigest,
    l03EvidenceProof: proof,
    l03ActiveSnapshot: l03,
    l04ActiveSnapshot: l04,
  });
}
/** The sole L01 classifier materialization boundary; only its grouped receipt is green. */
export function captureTask551L01MaterializationBarrier(input) {
  ownData(
    input,
    [
      "auditSnapshot",
      "beforeClassifierWorktree",
      "afterClassifierWorktree",
      "fourTestReceipt",
      "classifierReceipt",
      "manifest",
      "postGeneratorReceipts",
      "l03EvidenceProof",
    ],
    "task551_l11_barrier_input_invalid"
  );
  const pre = captureTask551L01PreClassifierBarrier({
    auditSnapshot: input.auditSnapshot,
    currentWorktree: input.beforeClassifierWorktree,
    l03EvidenceProof: input.l03EvidenceProof,
  });
  const audit = createTask551TaskGraphSnapshot(pre.taskFileDigests),
    after = currentWorktree(input.afterClassifierWorktree),
    afterDigest = currentDigest(after, l11BarrierIncludesPath);
  barrierReceipt(
    input.fourTestReceipt,
    "l01-four-test-prerequisite",
    FOUR_TEST_ARGV,
    true,
    "task551_l11_four_test_receipt_invalid",
    pre.beforeWorktreeDigest
  );
  barrierReceipt(
    input.classifierReceipt,
    "l01-classifier",
    CLASSIFIER_ARGV,
    false,
    "task551_l11_classifier_receipt_invalid",
    afterDigest
  );
  exactStrings(
    barrierChangedPaths(input.beforeClassifierWorktree, input.afterClassifierWorktree),
    [MANIFEST_PATH],
    "task551_l11_classifier_delta_invalid"
  );
  requireTaskFilesAndGraphBytesEqual(
    audit.taskFileDigests,
    audit.taskGraphDigest,
    input.beforeClassifierWorktree
  );
  requireTaskFilesAndGraphBytesEqual(
    audit.taskFileDigests,
    audit.taskGraphDigest,
    input.afterClassifierWorktree
  );
  const acceptedManifest = manifest(input.manifest, after),
    post = plainArray(input.postGeneratorReceipts, "task551_l11_post_generator_receipts_invalid");
  if (post.length !== POST_RECEIPTS.length)
    throw new Error("task551_l11_post_generator_receipts_invalid");
  for (let index = 0; index < POST_RECEIPTS.length; index += 1) {
    const [id, path] = POST_RECEIPTS[index];
    barrierReceipt(
      post[index],
      id,
      ["bun", "test", path],
      true,
      "task551_l11_post_generator_receipts_invalid",
      afterDigest,
      acceptedManifest.sha256
    );
  }
  const l03 = barrierSnapshot("l03", audit, input.afterClassifierWorktree, true);
  const l04 = barrierSnapshot("l04", audit, input.afterClassifierWorktree, true);
  const l01 = barrierSnapshot("l01", audit, input.afterClassifierWorktree, true);
  const l02 = captureL11BarrierPredecessorSnapshot("l02", audit, input.afterClassifierWorktree);
  const result = freeze({
    taskGraphDigest: pre.taskGraphDigest,
    taskFileDigests: pre.taskFileDigests,
    beforeWorktreeDigest: pre.beforeWorktreeDigest,
    afterWorktreeDigest: afterDigest,
    l03WorktreeSnapshotDigest: pre.l03WorktreeSnapshotDigest,
    l03EvidenceProof: pre.l03EvidenceProof,
    l03ActiveSnapshot: l03,
    l04ActiveSnapshot: l04,
    l01ActiveSnapshot: l01,
    l02PredecessorSnapshot: l02,
    manifest: acceptedManifest,
  });
  barrierState(result);
  return result;
}
export function requireTask551L01MaterializationBarrierBeforeL02(value, current) {
  const state = barrierState(value);
  requireTaskFilesAndGraphBytesEqual(state.taskFileDigests, state.taskGraphDigest, current);
  requireL11BarrierPredecessorSnapshotBeforeL02(state.l02, current);
  requireNoForeignPathOrByteDrift(state.l02, current, barrierAllowedDelta(state));
  for (const item of [state.l03, state.l04, state.l01])
    currentRegularDigests(
      item.activeDigests.map(({ path }) => path),
      item.activeDigests,
      current
    );
  const file = currentWorktree(current).files.get(state.manifest.path);
  if (
    file?.kind !== "regular" ||
    file.sha256 !== state.manifest.sha256 ||
    task551L11BarrierCurrentWorktreeDigest(current) !== state.afterWorktreeDigest
  )
    throw new Error("task551_l11_barrier_current_worktree_drift");
  return true;
}

const NAMED_CLOSURE_KEYS = freeze(["schema", "phase", "taskId", "taskGraphDigest", "files"]);
const L02_MATERIALIZATION_KEYS = freeze(["schema", "phase", "taskId", "taskGraphDigest", "files"]);
const phaseById = (phaseId) => TASK551_PHASE_PROVENANCE.find(({ phase }) => phase === phaseId);
function closureFiles(value, paths, code) {
  const entries = pathDigests(value, code);
  exactDigestPaths(entries, paths, code);
  return freeze(entries);
}
export function createTask551NamedPhaseClosureV2(phaseId, value) {
  const item = phaseById(phaseId),
    checked = currentWorktree(value);
  if (item === undefined) throw new Error("task551_named_phase_closure_invalid");
  const paths = TASK551_PHASE_OWNED_CODE_TEST_PATHS.get(phaseId);
  currentRegular(paths, value);
  return freeze({
    schema: "coderso.task551.named-phase-closure@v2",
    phase: phaseId,
    taskId: item.taskId,
    taskGraphDigest: checked.taskGraphDigest,
    files: freeze(paths.map((path) => freeze({ path, sha256: checked.files.get(path).sha256 }))),
  });
}
export function requireTask551NamedPhaseClosureV2(value, phaseId, current = null) {
  ownData(value, NAMED_CLOSURE_KEYS, "task551_named_phase_closure_invalid");
  const item = phaseById(phaseId),
    paths = TASK551_PHASE_OWNED_CODE_TEST_PATHS.get(phaseId);
  if (
    !Object.isFrozen(value) ||
    item === undefined ||
    value.schema !== "coderso.task551.named-phase-closure@v2" ||
    value.phase !== phaseId ||
    value.taskId !== item.taskId ||
    typeof value.taskGraphDigest !== "string" ||
    !SHA256.test(value.taskGraphDigest)
  )
    throw new Error("task551_named_phase_closure_invalid");
  const files = closureFiles(value.files, paths, "task551_named_phase_closure_invalid");
  if (current !== null) {
    const checked = currentWorktree(current);
    if (checked.taskGraphDigest !== value.taskGraphDigest)
      throw new Error("task551_named_phase_closure_invalid");
    currentRegularDigests(paths, files, current);
  }
  return freeze({ ...value, files });
}
export function createTask551L02CodeTestMaterializationClosureV1(value) {
  const checked = currentWorktree(value),
    paths = TASK551_PHASE_OWNED_CODE_TEST_PATHS.get("l02");
  currentRegular(paths, value);
  return freeze({
    schema: "coderso.task551.l02-code-test-materialization-closure@v1",
    phase: "l02-code-test-materialization",
    taskId: "TASK-551-01-L02",
    taskGraphDigest: checked.taskGraphDigest,
    files: freeze(paths.map((path) => freeze({ path, sha256: checked.files.get(path).sha256 }))),
  });
}
export function requireTask551L02CodeTestMaterializationClosureV1(value, current = null) {
  ownData(value, L02_MATERIALIZATION_KEYS, "task551_l02_code_test_materialization_closure_invalid");
  if (
    !Object.isFrozen(value) ||
    value.schema !== "coderso.task551.l02-code-test-materialization-closure@v1" ||
    value.phase !== "l02-code-test-materialization" ||
    value.taskId !== "TASK-551-01-L02" ||
    typeof value.taskGraphDigest !== "string" ||
    !SHA256.test(value.taskGraphDigest)
  )
    throw new Error("task551_l02_code_test_materialization_closure_invalid");
  const paths = TASK551_PHASE_OWNED_CODE_TEST_PATHS.get("l02"),
    files = closureFiles(
      value.files,
      paths,
      "task551_l02_code_test_materialization_closure_invalid"
    );
  if (current !== null) {
    if (currentWorktree(current).taskGraphDigest !== value.taskGraphDigest)
      throw new Error("task551_l02_code_test_materialization_closure_invalid");
    currentRegularDigests(paths, files, current);
  }
  return freeze({ ...value, files });
}

// Dispatch passes its own frozen descriptor here; this pure helper never parses task text.
const L02_PREREQUISITE = freeze([TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE]);
const CLASSIFIER_AFTER = freeze([
  "projection-static-test",
  "digest-static-test",
  "fixture-target-static-test",
  "reviewed-pair-persistence-static-test",
  "runner-lifecycle-static-test",
]);
const REVIEW_AFTER = freeze([
  ...CLASSIFIER_AFTER,
  "core-lint-types",
  "core-lint",
  "performance-gate",
  "isolated-projection-static-small",
  "isolated-digest-static-small",
  "isolated-projection-static-large",
  "isolated-digest-static-large",
  "freeze-small",
  "freeze-large",
]);
const CLASSIFIER_BARRIER = freeze({
  exactFourTestPrerequisite: true,
  classifierManifestDeltaPath: MANIFEST_PATH,
  exactNinePathManifestMembershipPostchecks: true,
  currentByteState: true,
});
const REVIEW_BARRIER = freeze({
  validatedSnapshotRegistrationHook:
    "registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition",
  publicTransition: "runL02OwnedReviewedTransition",
  activeStateTransitionReceiptSchema: "coderso.task551.l02-active-state-transition-receipt@v2",
  activeStateTransitionReceiptNormalizer: "parseTask551L02ActiveStateTransitionReceiptV2",
  reviewedStateAttestationNormalizer: "parseTask551L02ReviewedStateAttestationV2",
  inMemoryExpectedStateDigestRebase: true,
  l02CodeTestMaterializationClosure: "coderso.task551.l02-code-test-materialization-closure@v1",
  materializationClosureTiming: "after-l04-adaptation-before-single",
  finalLeafClosureTiming: "after-check-small-and-check-large",
  sourceFree: true,
  zeroCheckDispatchesOnFailure: true,
});
export const TASK551_L02_REQUIRED_SUBGATES = freeze([
  freeze({
    id: "l11-classifier-materialization",
    kind: "classifier-materialization",
    ordinal: 1,
    ownerTaskId: "TASK-551-11",
    occurrenceId: "single",
    afterCommandIds: CLASSIFIER_AFTER,
    beforeCommandId: "core-lint-types",
    barrier: CLASSIFIER_BARRIER,
  }),
  freeze({
    id: "l11-reviewed-pair-transition",
    kind: "reviewed-pair-transition",
    ordinal: 2,
    ownerTaskId: "TASK-551-11",
    occurrenceId: "single",
    afterCommandIds: REVIEW_AFTER,
    beforeCommandId: "check-small",
    barrier: REVIEW_BARRIER,
  }),
]);
function equivalent(value, expected, code) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  )
    throw new Error(code);
  const keys = Reflect.ownKeys(expected);
  if (
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key, index) => Reflect.ownKeys(value)[index] !== key)
  )
    throw new Error(code);
  for (const key of keys) {
    const left = value[key],
      right = expected[key];
    if (Array.isArray(right)) frozenExactStrings(left, right, code);
    else if (right !== null && typeof right === "object") equivalent(left, right, code);
    else if (left !== right) throw new Error(code);
  }
}
export function requireTask551L02WorkflowCompatibilityExtensions(descriptor) {
  ownData(
    descriptor,
    ["taskId", "workflowPrerequisites", "subgates", "commandIds"],
    "task551_dispatch_l02_compatibility_invalid"
  );
  if (!Object.isFrozen(descriptor) || descriptor.taskId !== "TASK-551-01-L02")
    throw new Error("task551_dispatch_l02_compatibility_invalid");
  frozenExactStrings(
    descriptor.workflowPrerequisites,
    L02_PREREQUISITE,
    "task551_dispatch_l02_compatibility_invalid"
  );
  if (
    !Array.isArray(descriptor.subgates) ||
    !Object.isFrozen(descriptor.subgates) ||
    descriptor.subgates.length !== 2
  )
    throw new Error("task551_dispatch_l02_compatibility_invalid");
  for (let index = 0; index < TASK551_L02_REQUIRED_SUBGATES.length; index += 1)
    equivalent(
      descriptor.subgates[index],
      TASK551_L02_REQUIRED_SUBGATES[index],
      "task551_dispatch_l02_compatibility_invalid"
    );
  frozenExactStrings(
    descriptor.commandIds,
    descriptor.commandIds,
    "task551_dispatch_l02_compatibility_invalid"
  );
  for (const gate of TASK551_L02_REQUIRED_SUBGATES) {
    const before = descriptor.commandIds.indexOf(gate.beforeCommandId),
      after = gate.afterCommandIds.map((id) => descriptor.commandIds.indexOf(id));
    if (
      before !== gate.afterCommandIds.length ||
      after.some((position, index) => position !== index)
    )
      throw new Error("task551_dispatch_l02_compatibility_invalid");
  }
  return freeze({
    workflowPrerequisites: L02_PREREQUISITE,
    subgates: TASK551_L02_REQUIRED_SUBGATES,
  });
}

requireTask551WorktreeCompatibilityIntegrity();
