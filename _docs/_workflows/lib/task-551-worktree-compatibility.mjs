// TASK-551-11 private, pure compatibility and current-worktree contract.
// It intentionally has no filesystem, database, L02, or target-module import.

import { createHash } from "node:crypto";
import {
  SHA256,
  TASK551_PHASE_OWNED_CODE_TEST_PATHS,
  TASK551_PHASE_PROVENANCE,
  TASK551_PLANNED_BUN_PATHS,
  encoder,
  freeze,
  ownData,
  plainArray,
  requireTask551WorktreeCompatibilityIntegrity,
} from "./task-551-phase-provenance.mjs";
import {
  currentRegular,
  currentRegularDigests,
  currentWorktree,
  exactDigestPaths,
  pathDigests,
} from "./task-551-worktree-snapshot.mjs";
import { MANIFEST_PATH } from "./task-551-l01-barrier.mjs";

export {
  TASK551_05_L02_LINE_COUNT_PATHS,
  TASK551_05_L02_PROVENANCE,
  TASK551_05_L02_VALIDATION_PATHS,
  TASK551_DEFERRED_LITERAL_TARGETS,
  TASK551_DEFERRED_LITERAL_TARGET_PATHS,
  TASK551_L01_MATERIALIZATION_WORKTREE_PHASES,
  TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_LINE_COUNT_PATHS,
  TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS,
  TASK551_PHASE_OWNED_CODE_TEST_PATHS,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  TASK551_PHASE_VALIDATION_PATHS,
  TASK551_PLANNED_BUN_PATHS,
  deriveTask551ClosedWorktreeSet,
  deriveTask551L01MaterializationClosedSet,
  getTask55105L02LineCountPaths,
  getTask55105L02Provenance,
  getTask55105L02ValidationPaths,
  normalizeTask551RepoPath,
  requireExactClosedPaths,
  requireExactDiscoveredPaths,
  requireTask551LiteralUniquePaths,
  requireTask551WorktreeCompatibilityIntegrity,
  task551DependenciesThrough,
  task551FullProvenanceClosureForSpawn,
} from "./task-551-phase-provenance.mjs";
export {
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  createTask551TaskGraphSnapshot,
  requireExactActivePhaseSnapshotBeforeSpawn,
  requireNoForeignPathOrByteDrift,
  requirePhaseReadOnlyImportsInCurrentWorktree,
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn,
  requireTaskFilesAndGraphBytesEqual,
  task551CurrentWorktreeDigest,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
  task551TaskGraphDigest,
  task551WorktreeSnapshotDigest,
} from "./task-551-worktree-snapshot.mjs";
export {
  captureTask551L01MaterializationBarrier,
  captureTask551L01PreClassifierBarrier,
  requireTask551L01MaterializationBarrierBeforeL02,
} from "./task-551-l01-barrier.mjs";

// Descriptor-only bootstrap data. It has no target bytes, paths, or exports.
export const TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA =
  "coderso.task551.workflow-compatibility-bootstrap@v2";
export const TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA =
  "coderso.task551.workflow-capability-descriptor@v2";
export const TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE = "TASK-551-11:compatibility-bootstrap@v2";
const COMPATIBILITY_FRAME_MAGIC = "coderso.task551.workflow-compatibility-descriptor@v2";

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
