// TASK-551-11 private, pure current-worktree snapshot contract.
// It intentionally has no filesystem, database, L02, or target-module import.

import {
  SHA256,
  TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE,
  TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS,
  TASK551_PHASE_PROVENANCE,
  deferred,
  digest,
  encoder,
  freeze,
  l11BarrierIncludesPath,
  l11BarrierInputPaths,
  normalizeTask551RepoPath,
  ownData,
  plainArray,
  requireExactDiscoveredPaths,
  requireTask551LiteralUniquePaths,
  sortUnique,
  task551FullProvenanceClosureForSpawn,
} from "./task-551-phase-provenance.mjs";

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
export function pathDigests(value, code) {
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
export function currentWorktree(value) {
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
export function snapshot(value) {
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
export function currentDigest(checked, includesPath = genericWorktreeDigestIncludesPath) {
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
export function exactDigestPaths(values, paths, code) {
  const expected = [...new Set(paths)].sort();
  if (
    values.length !== expected.length ||
    values.some((entry, index) => entry.path !== expected[index])
  )
    throw new Error(code);
}
export function currentRegular(paths, value) {
  const checked = currentWorktree(value);
  for (const path of paths)
    if (checked.files.get(path)?.kind !== "regular")
      throw new Error(`task551_current_worktree_file_not_regular:${path}`);
}
export function currentRegularDigests(paths, digests, value) {
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
export function phasePaths(checked, property, phaseId, allowlist, code) {
  const paths = checked[property][phaseId];
  if (paths === undefined) throw new Error(`${code}:${phaseId}`);
  requireExactDiscoveredPaths(paths, allowlist, phaseId);
}
export function predecessors(phaseId) {
  return phaseId === "l01"
    ? freeze(["sidecar"])
    : task551FullProvenanceClosureForSpawn(phaseId).filter((name) => name !== phaseId);
}

export function predecessorPaths(phaseId) {
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
