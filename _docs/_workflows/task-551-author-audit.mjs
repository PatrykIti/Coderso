// TASK-551-11 author-audit workflow module (single owner: TASK-551-11 sidecar).
/* global setTimeout, clearTimeout, process, Bun, Buffer -- Bun-runtime workflow tooling */
// Orchestrates injected audit agents and child spawners. Evidence/recovery,
// provenance, and task-source parsing remain in dedicated contract helpers.
// A round passes only with no HIGH/MEDIUM findings and complete well-formed results.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  createTask551TaskGraphSnapshot,
  requireExactClosedPaths,
  requireExactDiscoveredPaths,
  requireTaskFilesAndGraphBytesEqual,
  requireTask551ContractIntegrity,
} from "./lib/task-551-contract.mjs";
import { preflightTask551DispatchSnapshot } from "./lib/task-551-dispatch-contract.mjs";

export const TASK551_RECONCILE_SCOPE = "reconcile";
export const TASK551_AUDIT_SEVERITIES = Object.freeze(["HIGH", "MEDIUM", "LOW"]);
export const TASK551_BLOCKING_SEVERITIES = Object.freeze(["HIGH", "MEDIUM"]);
const TASK551_AUTHOR_AUDIT_MAX_ROUNDS = 3;
const TASK551_AUDIT_RESULT_KEYS = Object.freeze(["status", "findings"]);
const TASK551_NORMALIZED_RESULT_KEYS = Object.freeze(["scope", "status", "findings"]);
const TASK551_AUDIT_FINDING_KEYS = Object.freeze(["severity", "area", "finding", "evidence"]);
const TASK551_GROUNDING_TASK_SNAPSHOT_KEYS = Object.freeze(["taskGraphDigest", "taskFileDigests"]);
const TASK551_TASK_FILE_PATH = /^_docs\/_TASKS\/TASK-551(?:[-_][A-Za-z0-9._-]+)?\.md$/u;
const TASK551_TASK_FILE_NAME = /^TASK-551(?:[-_][A-Za-z0-9._-]+)?\.md$/u;
const TASK551_SHA256 = /^[0-9a-f]{64}$/u;
const TASK551_GIT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const TASK551_GIT_RESULT_KEYS = Object.freeze(["exitCode", "stdout", "stderr"]);
const TASK551_AUTHOR_WORKFLOW_KEYS = Object.freeze([
  "discoveredByPhase",
  "auditAgent",
  "reconcileAgent",
  "changedScopes",
  "timeoutMs",
  "maxRounds",
]);
const TASK551_AUTHOR_TEST_WORKFLOW_KEYS = Object.freeze([
  ...TASK551_AUTHOR_WORKFLOW_KEYS,
  "gitCommandTransport",
  "testRepoRoot",
]);
const TEST_SEAM_GIT_TRANSPORT = Symbol("task551-author-audit-git-transport");
const TASK551_GIT_EXECUTABLE =
  process.platform === "win32" ? "C:\\Program Files\\Git\\cmd\\git.exe" : "/usr/bin/git";
const TASK551_GIT_PREFIX = Object.freeze([
  "--no-pager",
  "-c",
  "core.pager=cat",
  "-c",
  "credential.helper=",
  "-c",
  "core.askPass=",
]);
const TASK551_GIT_ENV = Object.freeze(
  Object.assign(Object.create(null), {
    HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    PAGER: "cat",
    GIT_PAGER: "cat",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_COUNT: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  })
);
const TASK551_WORKFLOW_REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const TASK551_PRODUCTION_PERMITS = new WeakMap();
const TASK551_TEST_PERMITS = new WeakMap();
const TASK551_PRODUCTION_PERMIT_STATE = { generation: 0 };
const TASK551_TEST_PERMIT_STATE = { generation: 0 };

/**
 * Accept only a normal object whose complete own enumerable surface is made of
 * data properties. This is deliberately stricter than Object.keys: symbols,
 * inherited values, accessors, and hidden fields are all rejected.
 */
function isPlainOwnDataRecord(value, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    const ownKeys = Reflect.ownKeys(value);
    if (
      expectedKeys !== undefined &&
      (ownKeys.length !== expectedKeys.length ||
        ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key)))
    ) {
      return false;
    }
    if (ownKeys.some((key) => typeof key !== "string")) return false;
    const keys = expectedKeys ?? ownKeys;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

function requireScopeSnapshot(scopes, label, { allowEmpty = false, allowReconcile = true } = {}) {
  if (!Array.isArray(scopes) || (!allowEmpty && scopes.length === 0)) {
    throw new Error(`${label}_missing`);
  }
  const seen = new Set();
  for (const scope of scopes) {
    if (typeof scope !== "string" || scope.length === 0) {
      throw new Error(`${label}_invalid`);
    }
    if (!allowReconcile && scope === TASK551_RECONCILE_SCOPE) {
      throw new Error(`${label}_reserved_scope`);
    }
    if (seen.has(scope)) throw new Error(`${label}_duplicate:${scope}`);
    seen.add(scope);
  }
  return Object.freeze([...scopes]);
}

function requireFinitePositive(value, code) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(code);
  return value;
}

function requireTask551TaskSnapshot(snapshot) {
  if (!isPlainOwnDataRecord(snapshot, TASK551_GROUNDING_TASK_SNAPSHOT_KEYS)) {
    throw new Error("task551_grounding_task_snapshot_invalid");
  }
  if (
    !Array.isArray(snapshot.taskFileDigests) ||
    typeof snapshot.taskGraphDigest !== "string" ||
    !TASK551_SHA256.test(snapshot.taskGraphDigest)
  ) {
    throw new Error("task551_grounding_task_snapshot_invalid");
  }
  const seen = new Set();
  let prior = "";
  const taskFileDigests = snapshot.taskFileDigests.map((entry) => {
    if (
      !isPlainOwnDataRecord(entry, ["path", "sha256"]) ||
      !TASK551_TASK_FILE_PATH.test(entry.path) ||
      typeof entry.sha256 !== "string" ||
      !TASK551_SHA256.test(entry.sha256) ||
      seen.has(entry.path) ||
      entry.path < prior
    ) {
      throw new Error("task551_grounding_task_snapshot_invalid");
    }
    seen.add(entry.path);
    prior = entry.path;
    return Object.freeze({ path: entry.path, sha256: entry.sha256 });
  });
  if (
    taskFileDigests.length === 0 ||
    createTask551TaskGraphSnapshot(taskFileDigests).taskGraphDigest !== snapshot.taskGraphDigest
  ) {
    throw new Error("task551_grounding_task_snapshot_invalid");
  }
  return Object.freeze({
    taskGraphDigest: snapshot.taskGraphDigest,
    taskFileDigests: Object.freeze(taskFileDigests),
  });
}

function requireTask551SnapshotCurrentBinding(sourceHead, dispatch, taskSnapshot, currentWorktree) {
  if (typeof sourceHead !== "string" || sourceHead !== dispatch.sourceHead) {
    throw new Error("task551_author_audit_snapshot_provenance_invalid");
  }
  const captured = requireTask551TaskSnapshot(taskSnapshot);
  requireTaskFilesAndGraphBytesEqual(
    captured.taskFileDigests,
    captured.taskGraphDigest,
    currentWorktree
  );
}

function requireAuthorAuditInput(input, testSeam) {
  if (!isPlainOwnDataRecord(input)) throw new Error("task551_author_audit_input_invalid");
  if (Object.hasOwn(input, "head") || Object.hasOwn(input, "taskSnapshot"))
    throw new Error("task551_author_audit_snapshot_authority_forbidden");
  const allowed = testSeam ? TASK551_AUTHOR_TEST_WORKFLOW_KEYS : TASK551_AUTHOR_WORKFLOW_KEYS;
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.includes(key)))
    throw new Error("task551_author_audit_input_unknown_key");
  if (
    Object.hasOwn(input, "gitCommandTransport") &&
    typeof input.gitCommandTransport !== "function"
  )
    throw new Error("task551_author_audit_git_transport_invalid");
  if (
    testSeam &&
    (!Object.hasOwn(input, "testRepoRoot") ||
      typeof input.testRepoRoot !== "string" ||
      !path.isAbsolute(input.testRepoRoot) ||
      input.testRepoRoot.includes("\0") ||
      input.testRepoRoot.includes("\n"))
  ) {
    throw new Error("task551_author_audit_test_repo_root_invalid");
  }
  return input;
}
function decodeTask551GitBytes(bytes, code) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > TASK551_GIT_MAX_OUTPUT_BYTES)
    throw new Error(`task551_author_audit_capture_${code}_bytes_invalid`);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`task551_author_audit_capture_${code}_utf8_invalid`);
  }
}

function defaultTask551GitCommandTransport({ argv, cwd, env, shell }) {
  return new Promise((resolve) =>
    execFile(
      argv[0],
      argv.slice(1),
      {
        cwd,
        env,
        shell: false,
        encoding: "buffer",
        maxBuffer: TASK551_GIT_MAX_OUTPUT_BYTES,
      },
      (error, stdout, stderr) =>
        resolve({
          exitCode: error === null ? 0 : Number.isInteger(error?.code) ? error.code : -1,
          stdout: Buffer.from(stdout ?? []),
          stderr: Buffer.from(stderr ?? []),
        })
    )
  );
}

function requireTask551AbsolutePath(value, code) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    value.includes("\0") ||
    value.includes("\n")
  ) {
    throw new Error(`task551_author_audit_capture_${code}`);
  }
  return value;
}

async function resolveTask551ProductionGitRuntime() {
  const [repoRoot, executable] = await Promise.all([
    realpath(TASK551_WORKFLOW_REPO_ROOT),
    realpath(TASK551_GIT_EXECUTABLE),
  ]).catch(() => {
    throw new Error("task551_author_audit_capture_trusted_git_unavailable");
  });
  let executableStats;
  try {
    executableStats = await stat(executable);
  } catch {
    throw new Error("task551_author_audit_capture_trusted_git_unavailable");
  }
  if (
    !path.isAbsolute(executable) ||
    !executableStats.isFile() ||
    (executableStats.mode & 0o111) === 0
  ) {
    throw new Error("task551_author_audit_capture_trusted_git_invalid");
  }
  return Object.freeze({
    executable,
    repoRoot,
    env: TASK551_GIT_ENV,
    transport: defaultTask551GitCommandTransport,
    requireExpectedRoot: true,
  });
}

function createTask551TestGitRuntime(transport, repoRoot) {
  return Object.freeze({
    executable: TASK551_GIT_EXECUTABLE,
    repoRoot,
    env: TASK551_GIT_ENV,
    transport,
    requireExpectedRoot: true,
  });
}

async function runTask551Git(args, runtime, cwd, label) {
  let result;
  try {
    result = await runtime.transport({
      argv: Object.freeze([runtime.executable, ...TASK551_GIT_PREFIX, ...args]),
      cwd,
      env: runtime.env,
      shell: false,
    });
  } catch {
    throw new Error(`task551_author_audit_capture_git_failed:${label}`);
  }
  if (!isPlainOwnDataRecord(result, TASK551_GIT_RESULT_KEYS) || !Number.isInteger(result.exitCode))
    throw new Error(`task551_author_audit_capture_git_result_invalid:${label}`);
  if (result.exitCode !== 0) throw new Error(`task551_author_audit_capture_git_failed:${label}`);
  return decodeTask551GitBytes(result.stdout, label);
}

function requireTask551CurrentRegularFile(stats, repoPath) {
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`task551_author_audit_capture_task_file_not_regular:${repoPath}`);
  }
}

function task551TaskFileIdentity(stats) {
  return [stats.dev, stats.ino, stats.mode, stats.size, stats.mtimeMs, stats.ctimeMs].join(":");
}

function decodeTask551TaskFileBytes(bytes, repoPath) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error(`task551_author_audit_capture_task_file_utf8_invalid:${repoPath}`);
  }
}

async function readTask551CurrentTaskFiles(repoRoot) {
  const taskDirectory = path.join(repoRoot, "_docs", "_TASKS");
  let directoryStats;
  let names;
  try {
    [directoryStats, names] = await Promise.all([lstat(taskDirectory), readdir(taskDirectory)]);
  } catch {
    throw new Error("task551_author_audit_capture_task_directory_unavailable");
  }
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    throw new Error("task551_author_audit_capture_task_directory_not_directory");
  }
  const taskNames = names.filter((name) => TASK551_TASK_FILE_NAME.test(name)).sort();
  if (taskNames.length === 0 || new Set(taskNames).size !== taskNames.length) {
    throw new Error("task551_author_audit_capture_task_files_invalid");
  }
  const files = [];
  for (const name of taskNames) {
    const repoPath = `_docs/_TASKS/${name}`;
    const filePath = path.join(taskDirectory, name);
    let before;
    let bytes;
    let after;
    try {
      before = await lstat(filePath);
      requireTask551CurrentRegularFile(before, repoPath);
      bytes = await readFile(filePath);
      after = await lstat(filePath);
      requireTask551CurrentRegularFile(after, repoPath);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("task551_author_audit_capture_"))
        throw error;
      throw new Error(`task551_author_audit_capture_task_file_missing:${repoPath}`);
    }
    if (task551TaskFileIdentity(before) !== task551TaskFileIdentity(after)) {
      throw new Error(`task551_author_audit_capture_task_file_race:${repoPath}`);
    }
    files.push(
      Object.freeze({
        path: repoPath,
        text: decodeTask551TaskFileBytes(bytes, repoPath),
        sha256: createHash("sha256").update(bytes).digest("hex"),
      })
    );
  }
  const taskFileDigests = files.map(({ path: repoPath, sha256 }) => ({ path: repoPath, sha256 }));
  const graphSnapshot = createTask551TaskGraphSnapshot(taskFileDigests);
  const taskSnapshot = Object.freeze({
    taskGraphDigest: graphSnapshot.taskGraphDigest,
    taskFileDigests: graphSnapshot.taskFileDigests,
  });
  const currentWorktree = Object.freeze({
    taskGraphDigest: graphSnapshot.taskGraphDigest,
    taskFileDigests: graphSnapshot.taskFileDigests,
    files: Object.freeze(
      graphSnapshot.taskFileDigests.map(({ path: repoPath, sha256 }) =>
        Object.freeze({
          path: repoPath,
          sha256,
          kind: "regular",
        })
      )
    ),
    discoveredByPhase: Object.freeze({}),
    closedByPhase: Object.freeze({}),
    deltaPaths: Object.freeze([]),
  });
  requireTaskFilesAndGraphBytesEqual(
    taskSnapshot.taskFileDigests,
    taskSnapshot.taskGraphDigest,
    currentWorktree
  );
  return Object.freeze({
    taskFiles: Object.freeze(
      files.map(({ path: repoPath, text }) => Object.freeze({ path: repoPath, text }))
    ),
    taskSnapshot,
    currentWorktree,
  });
}

async function revalidateTask551AuthoritativeSnapshot(capture) {
  const current = await readTask551CurrentTaskFiles(capture.repoRoot);
  requireTask551SnapshotCurrentBinding(
    capture.sourceHead,
    capture.dispatch,
    capture.taskSnapshot,
    current.currentWorktree
  );
}

async function captureTask551AuthoritativeSnapshot(runtime) {
  const initialRoot = requireTask551AbsolutePath(
    (
      await runTask551Git(["rev-parse", "--show-toplevel"], runtime, runtime.repoRoot, "root")
    ).trim(),
    "root_invalid"
  );
  if (runtime.requireExpectedRoot && initialRoot !== runtime.repoRoot)
    throw new Error("task551_author_audit_capture_root_mismatch");
  const repoRoot = initialRoot;
  const sourceHead = (
    await runTask551Git(["rev-parse", "--verify", "HEAD^{commit}"], runtime, repoRoot, "head")
  ).trim();
  if (!/^[0-9a-f]{40,64}$/u.test(sourceHead))
    throw new Error("task551_author_audit_capture_head_invalid");
  const current = await readTask551CurrentTaskFiles(repoRoot);
  // The dispatch parser retains sourceHead for compatibility/provenance only.
  // Task content authority is exclusively the strict current-worktree snapshot.
  const snapshot = { sourceHead, taskFiles: current.taskFiles };
  const dispatch = preflightTask551AuthorAuditDispatch(snapshot);
  requireTask551SnapshotCurrentBinding(
    sourceHead,
    dispatch,
    current.taskSnapshot,
    current.currentWorktree
  );
  const capture = Object.freeze({
    repoRoot,
    sourceHead,
    dispatch,
    taskSnapshot: current.taskSnapshot,
    graphDigest: current.taskSnapshot.taskGraphDigest,
  });
  return Object.freeze({ taskSnapshot: current.taskSnapshot, dispatch, capture });
}

function isAuditFinding(value) {
  return (
    isPlainOwnDataRecord(value, TASK551_AUDIT_FINDING_KEYS) &&
    TASK551_AUDIT_SEVERITIES.includes(value.severity) &&
    typeof value.area === "string" &&
    value.area.length > 0 &&
    typeof value.finding === "string" &&
    value.finding.length > 0 &&
    findingEvidenceHasFileLine(value.evidence)
  );
}

function requireNormalizedAuditResult(result) {
  if (!isPlainOwnDataRecord(result, TASK551_NORMALIZED_RESULT_KEYS)) {
    throw new Error("task551_round_result_shape_invalid");
  }
  if (typeof result.scope !== "string" || !Array.isArray(result.findings)) {
    throw new Error("task551_round_result_shape_invalid");
  }
  for (const finding of result.findings) {
    if (!isAuditFinding(finding)) throw new Error("task551_round_finding_shape_invalid");
  }
  return result;
}

function deepFreezeTask551Snapshot(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreezeTask551Snapshot(value[key], seen);
  }
  return Object.freeze(value);
}

function snapshotTask551AuditResults(results) {
  const snapshot = results.map((result) => ({
    scope: result.scope,
    status: result.status,
    findings: result.findings.map((finding) => ({
      severity: finding.severity,
      area: finding.area,
      finding: finding.finding,
      evidence: finding.evidence,
    })),
  }));
  return deepFreezeTask551Snapshot(snapshot);
}

// The parser is intentionally reached only through this author-audit adapter.
// A source-free projection is usable only while it remains in its private realm.
export function preflightTask551AuthorAuditDispatch(snapshot) {
  return preflightTask551DispatchSnapshot(snapshot);
}

function permitBinding(record) {
  return Object.freeze({ sourceHead: record.sourceHead, graphDigest: record.graphDigest });
}

function requirePermit(value, permits, state, code) {
  if (value === null || typeof value !== "object") throw new Error(code);
  const record = permits.get(value);
  if (record === undefined) throw new Error(code);
  if (record.generation !== state.generation) throw new Error(`${code}_stale`);
  return record;
}

function copyTask551PermitTaskSnapshot(record, dispatch, code) {
  const capture = record.capture;
  if (
    capture === null ||
    typeof capture !== "object" ||
    Object.getPrototypeOf(capture) !== Object.prototype ||
    !Object.isFrozen(capture) ||
    capture.dispatch !== dispatch ||
    capture.sourceHead !== record.sourceHead ||
    capture.graphDigest !== record.graphDigest
  ) {
    throw new Error(`${code}_stale`);
  }
  let snapshot;
  try {
    snapshot = requireTask551TaskSnapshot(capture.taskSnapshot);
  } catch {
    throw new Error(`${code}_stale`);
  }
  if (snapshot.taskGraphDigest !== record.graphDigest) throw new Error(`${code}_stale`);
  return Object.freeze({
    taskGraphDigest: snapshot.taskGraphDigest,
    taskFileDigests: Object.freeze(
      snapshot.taskFileDigests.map(({ path: taskPath, sha256 }) =>
        Object.freeze({ path: taskPath, sha256 })
      )
    ),
  });
}

function requireTask551PermitTaskSnapshot(value, permits, state, code) {
  return copyTask551PermitTaskSnapshot(requirePermit(value, permits, state, code), value, code);
}

function issueTask551Permit(dispatch, capture, permits, state) {
  state.generation += 1;
  permits.set(
    dispatch,
    Object.freeze({
      sourceHead: capture.sourceHead,
      graphDigest: capture.graphDigest,
      capture,
      generation: state.generation,
    })
  );
}

/** Realm-agnostic planning check only; execution verifies one realm explicitly. */
export const isTask551AuthorAuditDispatchProjection = (value) =>
  value !== null &&
  typeof value === "object" &&
  [
    [TASK551_PRODUCTION_PERMITS, TASK551_PRODUCTION_PERMIT_STATE],
    [TASK551_TEST_PERMITS, TASK551_TEST_PERMIT_STATE],
  ].some(([permits, state]) => permits.get(value)?.generation === state.generation);

/** Verifier-only production edge for the implementation workflow; never an issuer. */
export function requireTask551ProductionDispatchPermit(value) {
  return permitBinding(
    requirePermit(
      value,
      TASK551_PRODUCTION_PERMITS,
      TASK551_PRODUCTION_PERMIT_STATE,
      "task551_implement_author_audit_dispatch_untrusted"
    )
  );
}

/** Test-realm verifier; a normal executor never calls this path. */
export function requireTask551TestDispatchPermitForTests(value) {
  return permitBinding(
    requirePermit(
      value,
      TASK551_TEST_PERMITS,
      TASK551_TEST_PERMIT_STATE,
      "task551_implement_test_author_audit_dispatch_untrusted"
    )
  );
}

/** Production-only audited graph snapshot; raw task text never crosses this boundary. */
export function requireTask551ProductionDispatchTaskSnapshot(value) {
  return requireTask551PermitTaskSnapshot(
    value,
    TASK551_PRODUCTION_PERMITS,
    TASK551_PRODUCTION_PERMIT_STATE,
    "task551_implement_author_audit_task_snapshot_untrusted"
  );
}

/** Test-realm equivalent of the production snapshot accessor. */
export function requireTask551TestDispatchTaskSnapshotForTests(value) {
  return requireTask551PermitTaskSnapshot(
    value,
    TASK551_TEST_PERMITS,
    TASK551_TEST_PERMIT_STATE,
    "task551_implement_test_author_audit_task_snapshot_untrusted"
  );
}

// ---------------------------------------------------------------------------
// Research grounding and authoring-input validation (library projections only)
// ---------------------------------------------------------------------------

/** The full read-only audit universe: every tracked TASK-551 closure path. */
export function deriveTask551AuditScopes() {
  const paths = new Set();
  for (const pathsOfPhase of TASK551_PHASE_IMPORT_CLOSURE.values()) {
    for (const path of pathsOfPhase) paths.add(path);
  }
  for (const outputsOfPhase of TASK551_PHASE_RUNTIME_OUTPUTS.values()) {
    for (const output of outputsOfPhase) {
      if (paths.has(output)) {
        throw new Error(`task551_audit_scope_runtime_output_tracked:${output}`);
      }
    }
  }
  return [...paths].sort();
}

/**
 * Validates read-only research grounding before any authoring: contract
 * integrity, a current task-file graph snapshot, and per-phase exact
 * discovery-allowlist membership. Product source paths intentionally remain
 * outside this audit fence: active leaves validate their own current-worktree
 * inputs when they are ready to dispatch.
 */
export function requireTask551ResearchGrounding({ taskSnapshot, discoveredByPhase }) {
  requireTask551ContractIntegrity();
  requireTask551TaskSnapshot(taskSnapshot);
  if (!isPlainOwnDataRecord(discoveredByPhase)) {
    throw new Error("task551_grounding_discoveries_missing");
  }
  const phases = TASK551_PHASE_PROVENANCE.map((entry) => entry.phase);
  const keys = Object.keys(discoveredByPhase);
  for (const phase of phases) {
    if (!Object.hasOwn(discoveredByPhase, phase)) {
      throw new Error(`task551_grounding_discovery_missing:${phase}`);
    }
  }
  if (keys.some((phase) => !phases.includes(phase))) {
    throw new Error("task551_grounding_discovery_keys_invalid");
  }
  for (const phase of TASK551_PHASE_PROVENANCE) {
    if (!Object.hasOwn(discoveredByPhase, phase.phase)) {
      throw new Error(`task551_grounding_discovery_missing:${phase.phase}`);
    }
    const discovered = discoveredByPhase[phase.phase];
    if (!Array.isArray(discovered))
      throw new Error(`task551_grounding_discovery_missing:${phase.phase}`);
    requireExactDiscoveredPaths(discovered, TASK551_PHASE_DISCOVERY_ALLOWLIST, phase.phase);
  }
  return true;
}

/**
 * Authoring-input gate: an author's materialized file set must equal its
 * owning phase's closed allowlist exactly (no extra, missing, duplicate, or
 * foreign path). Single-writer ownership stays a library projection.
 */
export function requireTask551AuthoredScope(phase, materializedPaths) {
  if (TASK551_PHASE_CLOSED_ALLOWLIST.get(phase) === undefined) {
    throw new Error(`task551_authored_scope_phase_unknown:${String(phase)}`);
  }
  requireExactClosedPaths(materializedPaths, TASK551_PHASE_CLOSED_ALLOWLIST, phase);
  return true;
}

// ---------------------------------------------------------------------------
// Drift-audit round evaluation (pure encoding of the clean-round rule)
// ---------------------------------------------------------------------------

function findingEvidenceHasFileLine(evidence) {
  return typeof evidence === "string" && /[^\s:]+:\d+/.test(evidence);
}

/** Normalizes one agent result into a strict shape; returns status "malformed"
 *  instead of throwing so a bad agent can never silently vanish. */
export function normalizeTask551AuditResult(raw, expectedScope) {
  const malformed = () =>
    Object.freeze({
      scope: expectedScope,
      status: "malformed",
      findings: Object.freeze([]),
    });
  if (!isPlainOwnDataRecord(raw, TASK551_AUDIT_RESULT_KEYS)) return malformed();
  if (raw.status !== "completed") {
    const status = raw.status === "timeout" ? "timeout" : "malformed";
    return Object.freeze({ scope: expectedScope, status, findings: Object.freeze([]) });
  }
  if (!Array.isArray(raw.findings)) return malformed();
  const findings = [];
  for (const candidate of raw.findings) {
    if (!isAuditFinding(candidate)) return malformed();
    findings.push(
      Object.freeze({
        severity: candidate.severity,
        area: candidate.area,
        finding: candidate.finding,
        evidence: candidate.evidence,
      })
    );
  }
  return Object.freeze({
    scope: expectedScope,
    status: "completed",
    findings: Object.freeze(findings),
  });
}

/**
 * Pure clean-round evaluation over normalized results. Expected scopes must
 * each have exactly one COMPLETED result; anything else is invalid.
 */
export function evaluateTask551DriftRound(expectedScopes, results) {
  const expectedSnapshot = requireScopeSnapshot(expectedScopes, "task551_round_expected_scopes");
  if (!Array.isArray(results)) throw new Error("task551_round_results_not_array");
  const expectedSet = new Set(expectedSnapshot);
  const byScope = new Map();
  for (const result of results) {
    requireNormalizedAuditResult(result);
    if (!expectedSet.has(result.scope)) {
      throw new Error(`task551_round_unexpected_scope_result:${result.scope}`);
    }
    if (byScope.has(result.scope)) {
      throw new Error(`task551_round_duplicate_scope_result:${result.scope}`);
    }
    byScope.set(result.scope, result);
  }
  if (results.length > expectedSnapshot.length) {
    throw new Error("task551_round_results_exceed_expected");
  }
  /*
   * Keep this explicit guard after the shape check so a future refactor cannot
   * accidentally move duplicate detection ahead of validation and read an
   * accessor-backed scope while indexing the map.
   */
  for (const result of byScope.values()) {
    if (typeof result.scope !== "string") {
      throw new Error("task551_round_result_scope_invalid");
    }
  }
  /*
   * The duplicate check above is intentionally the only map insertion path.
   * This return is replaced below by the normal evaluation body.
   */
  const missing = [];
  const invalid = [];
  for (const scope of expectedSnapshot) {
    const result = byScope.get(scope);
    if (result === undefined) {
      missing.push(scope);
      continue;
    }
    if (result.status !== "completed") invalid.push(`${scope}:${result.status}`);
  }
  const valid = missing.length === 0 && invalid.length === 0;
  const blockingFindings = [];
  const lowFindings = [];
  for (const result of byScope.values()) {
    if (result.status !== "completed") continue;
    for (const finding of result.findings) {
      if (TASK551_BLOCKING_SEVERITIES.includes(finding.severity)) {
        blockingFindings.push(Object.freeze({ scope: result.scope, ...finding }));
      } else {
        lowFindings.push(Object.freeze({ scope: result.scope, ...finding }));
      }
    }
  }
  const pass = valid && blockingFindings.length === 0;
  return Object.freeze({
    valid,
    pass,
    missingScopes: Object.freeze(missing),
    invalidScopes: Object.freeze(invalid),
    blockingFindings: Object.freeze(blockingFindings),
    lowFindings: Object.freeze(lowFindings),
  });
}

/**
 * Validates the caller-configured loop bound before any grounding or agent
 * dispatch. The bound is a contract, not an operational tuning knob.
 */
function requireTask551AuthorAuditMaxRounds(value) {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > TASK551_AUTHOR_AUDIT_MAX_ROUNDS
  ) {
    throw new Error("task551_author_audit_max_rounds_invalid");
  }
}

/**
 * Targeted re-audit planner: after a VERIFIED HIGH/MEDIUM finding, rerun only
 * the affected scopes (finding scopes plus caller-declared changed scopes)
 * plus ONE fresh reconcile; clean receipts whose inputs did not change are
 * retained, never replayed for ceremony.
 */
export function planTask551Reaudit(evaluation, changedScopes = []) {
  if (!evaluation || typeof evaluation !== "object" || !Array.isArray(evaluation.blockingFindings))
    throw new Error("task551_reaudit_plan_evaluation_missing");
  const changedSnapshot = requireScopeSnapshot(
    changedScopes,
    "task551_reaudit_plan_changed_scopes",
    {
      allowEmpty: true,
      allowReconcile: false,
    }
  );
  if (evaluation.valid && evaluation.blockingFindings.length === 0)
    return Object.freeze({ rerunScopes: Object.freeze([]), requireFreshReconcile: false });
  const rerun = new Set(changedSnapshot);
  for (const finding of evaluation.blockingFindings) {
    if (
      !isPlainOwnDataRecord(finding, ["scope", "severity", "area", "finding", "evidence"]) ||
      typeof finding.scope !== "string" ||
      finding.scope.length === 0 ||
      finding.scope === TASK551_RECONCILE_SCOPE
    ) {
      throw new Error("task551_reaudit_plan_finding_scope_invalid");
    }
    rerun.add(finding.scope);
  }
  rerun.add(TASK551_RECONCILE_SCOPE);
  return Object.freeze({
    rerunScopes: Object.freeze([...rerun].sort()),
    requireFreshReconcile: true,
  });
}

// ---------------------------------------------------------------------------
// Drift-round orchestration over INJECTED audit agents (never spawned here)
// ---------------------------------------------------------------------------

function awaitBounded(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function agentStatusFromError(error) {
  return error && error.message === "task551_agent_timeout" ? "timeout" : "error";
}

async function invokeAgent(agent, argument, timeoutMs, scope) {
  if (typeof agent !== "function") {
    return Object.freeze({ scope, status: "malformed", findings: [] });
  }
  try {
    const raw = await awaitBounded(
      Promise.resolve().then(() => agent(argument)),
      timeoutMs,
      scope
    );
    if (raw === undefined) {
      return Object.freeze({ scope, status: "timeout", findings: [] });
    }
    return normalizeTask551AuditResult(raw, scope);
  } catch (error) {
    return Object.freeze({
      scope,
      status: agentStatusFromError(error),
      findings: [],
    });
  }
}

/**
 * Runs ONE complete drift-audit round: one audit agent per scope, then the
 * single cross-file reconcile agent. Every agent is awaited under a bounded
 * timeout; a throw, timeout, or malformed payload becomes a captured invalid
 * result so the round fails loudly instead of passing silently.
 */
export async function runTask551DriftAuditRound({
  scopes,
  auditAgent,
  reconcileAgent,
  timeoutMs = 600_000,
}) {
  // Close the caller's scope set before the first callback. A callback is
  // untrusted and must not be able to remove later work from this round.
  const scopeSnapshot = requireScopeSnapshot(scopes, "task551_round_scopes", {
    allowReconcile: false,
  });
  const results = [];
  for (const scope of scopeSnapshot) {
    results.push(await invokeAgent(auditAgent, scope, timeoutMs, scope));
  }
  // This is a detached, deeply frozen projection, not the mutable result
  // records returned by agents. Reconcile therefore cannot rewrite the state
  // that is evaluated below (or affect a later retry).
  const reconcileInput = snapshotTask551AuditResults(results);
  results.push(
    await invokeAgent(reconcileAgent, reconcileInput, timeoutMs, TASK551_RECONCILE_SCOPE)
  );
  return evaluateTask551DriftRound([...scopeSnapshot, TASK551_RECONCILE_SCOPE], results);
}

/**
 * Full author-audit loop: grounding -> drift rounds with targeted re-audits.
 * Unaffected clean results are retained between rounds; only planned re-run
 * scopes plus a fresh reconcile are recomputed. Fails closed after maxRounds.
 */
async function runTask551AuthorAuditWorkflowInternal(input, testSeam) {
  const config = requireAuthorAuditInput(input ?? {}, testSeam === TEST_SEAM_GIT_TRANSPORT);
  const {
    discoveredByPhase,
    auditAgent,
    reconcileAgent,
    changedScopes = [],
    timeoutMs = 600_000,
    maxRounds = TASK551_AUTHOR_AUDIT_MAX_ROUNDS,
  } = config;
  requireTask551AuthorAuditMaxRounds(maxRounds);
  const testing = testSeam === TEST_SEAM_GIT_TRANSPORT;
  if (testing && typeof config.gitCommandTransport !== "function") {
    throw new Error("task551_author_audit_git_transport_missing");
  }
  const runtime = testing
    ? createTask551TestGitRuntime(config.gitCommandTransport, config.testRepoRoot)
    : await resolveTask551ProductionGitRuntime();
  // Capture completes before the first agent callback; callers cannot inject authority.
  const { taskSnapshot, dispatch, capture } = await captureTask551AuthoritativeSnapshot(runtime);
  requireTask551ResearchGrounding({ taskSnapshot, discoveredByPhase });
  const scopes = deriveTask551AuditScopes();
  if (changedScopes.some((scope) => typeof scope !== "string" || !scopes.includes(scope))) {
    throw new Error("task551_author_audit_changed_scope_invalid");
  }
  let results = [];
  let rerunSet = null;
  for (let round = 1; round <= maxRounds; round += 1) {
    // This is the last awaited operation before agents receive task-derived
    // scopes. sourceHead remains parser/dispatch compatibility only; current
    // task-file bytes and their graph digest are the authority.
    await revalidateTask551AuthoritativeSnapshot(capture);
    const retained = new Map(results.map((result) => [result.scope, result]));
    if ([...retained.values()].some((result) => result.status !== "completed"))
      rerunSet = new Set(scopes);
    const roundResults = [];
    for (const scope of scopes) {
      const mustRerun =
        round === 1 || rerunSet === null || rerunSet.has(scope) || !retained.has(scope);
      if (!mustRerun) {
        // clean receipt whose inputs did not change is retained, never replayed
        roundResults.push(retained.get(scope));
        continue;
      }
      roundResults.push(await invokeAgent(auditAgent, scope, timeoutMs, scope));
    }
    const reconcileInput = snapshotTask551AuditResults(roundResults);
    roundResults.push(
      await invokeAgent(reconcileAgent, reconcileInput, timeoutMs, TASK551_RECONCILE_SCOPE)
    );
    results = roundResults;
    const evaluation = evaluateTask551DriftRound([...scopes, TASK551_RECONCILE_SCOPE], results);
    if (evaluation.pass) {
      // Agents may have awaited for a long time. Revalidate task-file bytes and
      // graph immediately before issuing either realm permit.
      await revalidateTask551AuthoritativeSnapshot(capture);
      const permits = testing ? TASK551_TEST_PERMITS : TASK551_PRODUCTION_PERMITS;
      const permitState = testing ? TASK551_TEST_PERMIT_STATE : TASK551_PRODUCTION_PERMIT_STATE;
      issueTask551Permit(dispatch, capture, permits, permitState);
      return Object.freeze({
        pass: true,
        dispatch,
        rounds: round,
        evaluation,
        results: Object.freeze(results),
      });
    }
    const plan = planTask551Reaudit(evaluation, changedScopes);
    if (!plan.requireFreshReconcile || round === maxRounds) {
      return Object.freeze({
        pass: false,
        dispatch,
        rounds: round,
        evaluation,
        results: Object.freeze(results),
      });
    }
    rerunSet = new Set(plan.rerunScopes);
    rerunSet.delete(TASK551_RECONCILE_SCOPE);
  }
  return Object.freeze({
    pass: false,
    dispatch,
    rounds: maxRounds,
    evaluation: null,
    results: Object.freeze([]),
  });
}

export async function runTask551AuthorAuditWorkflow(input) {
  return runTask551AuthorAuditWorkflowInternal(input, undefined);
}

/** Test-only seam: raw local Git command transport, never a completed snapshot. */
export async function runTask551AuthorAuditWorkflowForTests(input) {
  return runTask551AuthorAuditWorkflowInternal(input, TEST_SEAM_GIT_TRANSPORT);
}
