// TASK-551-11 private, pure L01 classifier and materialization barrier contract.
// It intentionally has no filesystem, database, L02, or target-module import.

import {
  PREFIXED_NONZERO_SHA256,
  SHA256,
  TASK551_L01_MATERIALIZED_BARRIER_CLOSURE,
  TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE,
  TASK551_PLANNED_BUN_PATHS,
  freeze,
  l11BarrierIncludesPath,
  l11MaterializedBarrierClosure,
  ownData,
  plainArray,
  sortUnique,
} from "./task-551-phase-provenance.mjs";
import {
  createTask551TaskGraphSnapshot,
  currentDigest,
  currentRegular,
  currentRegularDigests,
  currentWorktree,
  exactDigestPaths,
  pathDigests,
  phasePaths,
  predecessorPaths,
  predecessors,
  requireNoForeignPathOrByteDrift,
  requirePhaseReadOnlyImportsInCurrentWorktree,
  requireTaskFilesAndGraphBytesEqual,
  snapshot,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
  task551TaskGraphDigest,
} from "./task-551-worktree-snapshot.mjs";

export const MANIFEST_PATH = "tests/bun-lane-manifest.json";
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
