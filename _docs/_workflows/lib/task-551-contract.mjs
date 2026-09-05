// TASK-551-11 public workflow facade.
// Cold bootstrap is descriptor-only: target modules are reachable only by the
// three named post-closure seams below.

import { TextEncoder } from "node:util";

import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID,
  TASK551_EVIDENCE_ROW_IDS,
  TASK551_EVIDENCE_VALUE_DESCRIPTORS,
  bootstrapTask551EvidenceStorageForOwnerWorkflowHost as bootstrapTask551EvidenceStorageForOwnerWorkflowHostPrivate,
  recoverTask551EvidenceRoot as recoverTask551EvidenceRootPrivate,
  sha256Task551Bytes,
  validateTask551EvidenceValue,
  writeTask551EvidenceFileIfAbsent as writeTask551EvidenceFileIfAbsentPrivate,
} from "./task-551-evidence-contract.mjs";
import * as worktree from "./task-551-worktree-compatibility.mjs";

export {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID,
  TASK551_EVIDENCE_ROW_IDS,
  TASK551_EVIDENCE_VALUE_DESCRIPTORS,
};
export {
  TASK551_CANONICAL_EVIDENCE_ROOT,
  TASK551_CONSUMER_FIELDS,
  TASK551_L10_PROJECTION_KEYS,
  TASK551_L10_PROJECTION_MATRIX,
  TASK551_L10_RESULT_FIELDS,
  TASK551_PARENT_IMPL_FILE,
  TASK551_TERMINAL_HANDOFF_PATHS,
  buildTask551L10EvidenceProjection,
  recoverTask551EvidenceRoot,
  requireTask551EvidenceWriteReceiptDigest,
  requireTask551TerminalEvidenceHandoffBinding,
  sha256Task551Bytes,
  validateTask551EvidenceBytes,
  validateTask551EvidenceValue,
  verifyTask551TerminalCommittedHeadHandoff,
} from "./task-551-evidence-contract.mjs";
export {
  TASK551_05_L02_LINE_COUNT_PATHS,
  TASK551_05_L02_PROVENANCE,
  TASK551_05_L02_VALIDATION_PATHS,
  TASK551_DEFERRED_LITERAL_TARGET_PATHS,
  TASK551_DEFERRED_LITERAL_TARGETS,
  TASK551_L01_MATERIALIZATION_WORKTREE_PHASES,
  TASK551_L02_REQUIRED_SUBGATES,
  TASK551_L02_SUBGATE_KINDS,
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
  TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA,
  TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE,
  TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA,
  captureTask551L01MaterializationBarrier,
  captureTask551L01PreClassifierBarrier,
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  createTask551L02CodeTestMaterializationClosureV1,
  createTask551NamedPhaseClosureV2,
  createTask551TaskGraphSnapshot,
  deriveTask551ClosedWorktreeSet,
  deriveTask551L01MaterializationClosedSet,
  getTask55105L02LineCountPaths,
  getTask55105L02Provenance,
  getTask55105L02ValidationPaths,
  normalizeTask551RepoPath,
  requireExactActivePhaseSnapshotBeforeSpawn,
  requireExactClosedPaths,
  requireExactDiscoveredPaths,
  requireNoForeignPathOrByteDrift,
  requirePhaseReadOnlyImportsInCurrentWorktree,
  requireTask551L01MaterializationBarrierBeforeL02,
  requireTask551L02CodeTestMaterializationClosureV1,
  requireTask551L02WorkflowCompatibilityExtensions,
  requireTaskFilesAndGraphBytesEqual,
  requireTask551LiteralUniquePaths,
  requireTask551NamedPhaseClosureV2,
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn,
  requireTask551WorktreeCompatibilityIntegrity,
  task551CurrentWorktreeDigest,
  task551DependenciesThrough,
  task551FullProvenanceClosureForSpawn,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
  task551TaskGraphDigest,
  task551WorktreeSnapshotDigest,
} from "./task-551-worktree-compatibility.mjs";

const COMPATIBILITY_INVALID = "task551_workflow_compatibility_bootstrap_invalid";
const L03_IDENTITY_KEYS = Object.freeze([
  "schema",
  "taskId",
  "checkRecordSchema",
  "checkMode",
  "checkMarkerCount",
  "checkTargetProof",
  "checkNoLeak",
]);
const L04_IDENTITY_KEYS = Object.freeze(["schema", "version", "generationId", "archive", "state"]);
const L04_ARCHIVE_KEYS = Object.freeze(["path", "sha256"]);
const L02_PROJECTION_KEYS = Object.freeze([
  "runL02OwnedReviewedTransition",
  "parseTask551L02ActiveStateTransitionReceiptV2",
  "parseTask551L02ReviewedStateAttestationV2",
  "registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition",
]);
const compatibilityHolders = new WeakMap();
const compatibilityStageResults = new WeakMap();
const canonicalPredecessorTokens = new WeakMap();
const canonicalPredecessorPromotions = new WeakMap();
const l02MaterializationClosures = new WeakMap();
const predecessorNamedClosures = new WeakSet();
let compatibilityEpoch = 0;
let currentCompatibilityReceipt = null;

function exactOwnData(value, keys, code) {
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

export function requireTask551EvidenceRecoveryClearBeforePhase(summary) {
  const code = "task551_evidence_recovery_blocked";
  try {
    exactOwnData(summary, ["rows", "blockers", "clear"], code);
    if (
      !Object.isFrozen(summary) ||
      summary.clear !== true ||
      !Array.isArray(summary.rows) ||
      !Object.isFrozen(summary.rows) ||
      !Array.isArray(summary.blockers) ||
      !Object.isFrozen(summary.blockers) ||
      summary.blockers.length !== 0 ||
      summary.rows.length !== TASK551_EVIDENCE_ROW_IDS.length
    )
      throw new Error(code);
    for (const [index, row] of summary.rows.entries())
      if (
        !Object.isFrozen(row) ||
        exactOwnData(row, ["rowId", "terminalResult", "telemetry"], code).rowId !==
          TASK551_EVIDENCE_ROW_IDS[index] ||
        !["empty", "committed", "discarded_retryable"].includes(row.terminalResult)
      )
        throw new Error(code);
  } catch {
    throw new Error(code);
  }
  return true;
}
export async function awaitTask551EvidenceRecoveryPreflightBeforePhase() {
  return requireTask551EvidenceRecoveryClearBeforePhase(await recoverTask551EvidenceRootPrivate());
}

/** Owner-only composition bridge; deliberately absent from the declaration facade. */
export async function bootstrapTask551EvidenceStorageForOwnerWorkflowHost() {
  return bootstrapTask551EvidenceStorageForOwnerWorkflowHostPrivate();
}

function requireCompatibilityHolder(receipt, position) {
  try {
    worktree.requireTask551WorkflowCompatibilityReceiptV2(receipt);
    const holder = compatibilityHolders.get(receipt);
    if (
      receipt !== currentCompatibilityReceipt ||
      holder === undefined ||
      holder.epoch !== compatibilityEpoch ||
      holder.position !== position
    )
      throw new Error(COMPATIBILITY_INVALID);
    return holder;
  } catch {
    throw new Error(COMPATIBILITY_INVALID);
  }
}

function admitCompatibilityStage(receipt, position, predecessor, operation) {
  const holder = requireCompatibilityHolder(receipt, position);
  if (typeof operation !== "function" || holder.inFlight === true)
    throw new Error(COMPATIBILITY_INVALID);
  if (position > 0) {
    const previous = compatibilityStageResults.get(predecessor);
    if (
      previous === undefined ||
      previous.receipt !== receipt ||
      previous.epoch !== holder.epoch ||
      previous.stage !== position - 1 ||
      holder.results[position - 1] !== predecessor
    )
      throw new Error(COMPATIBILITY_INVALID);
  } else if (predecessor !== undefined) {
    throw new Error(COMPATIBILITY_INVALID);
  }
  const epoch = holder.epoch;
  const result = Object.freeze(Object.create(null));
  let completed = false;
  const complete = () => {
    if (completed) throw new Error(COMPATIBILITY_INVALID);
    completed = true;
    return result;
  };
  holder.inFlight = true;
  try {
    if (operation(complete) !== result || !completed) throw new Error(COMPATIBILITY_INVALID);
    // The operation is owner-controlled and can synchronously bootstrap a new
    // epoch. Never persist an old-stage success after that replacement.
    if (requireCompatibilityHolder(receipt, position) !== holder || holder.epoch !== epoch)
      throw new Error(COMPATIBILITY_INVALID);
    if (position > 0) {
      const previous = compatibilityStageResults.get(predecessor);
      if (
        previous === undefined ||
        previous.receipt !== receipt ||
        previous.epoch !== epoch ||
        previous.stage !== position - 1 ||
        holder.results[position - 1] !== predecessor
      )
        throw new Error(COMPATIBILITY_INVALID);
    }
  } catch {
    // Failure leaves this exact stage retryable and does not leak a result.
    throw new Error(COMPATIBILITY_INVALID);
  } finally {
    holder.inFlight = false;
  }
  compatibilityStageResults.set(result, { receipt, epoch, stage: position });
  holder.position += 1;
  holder.results[position] = result;
  if (position === 2) {
    compatibilityHolders.delete(receipt);
    currentCompatibilityReceipt = null;
  }
  return result;
}

/** Mints a fresh receipt without graph, evidence, source, or target access. */
export function runTask551WorkflowCompatibilityBootstrapV2() {
  const receipt = worktree.createTask551WorkflowCompatibilityReceiptV2();
  worktree.requireTask551WorkflowCompatibilityReceiptV2(receipt);
  compatibilityEpoch += 1;
  currentCompatibilityReceipt = receipt;
  compatibilityHolders.set(receipt, {
    epoch: compatibilityEpoch,
    position: 0,
    results: [],
    inFlight: false,
  });
  return receipt;
}
export function admitTask551WorkflowCompatibilityAuthorAuditV2(receipt, operation) {
  return admitCompatibilityStage(receipt, 0, undefined, operation);
}
export function admitTask551WorkflowCompatibilityGraphV2(receipt, authorAuditResult, operation) {
  return admitCompatibilityStage(receipt, 1, authorAuditResult, operation);
}
export function admitTask551WorkflowCompatibilityL02V2(receipt, graphResult, operation) {
  return admitCompatibilityStage(receipt, 2, graphResult, operation);
}

function canonicalL03Identity(identity) {
  const code = "task551_implement_l03_tool_contract_digest_invalid";
  exactOwnData(identity, L03_IDENTITY_KEYS, code);
  if (!Object.isFrozen(identity)) throw new Error(code);
  for (const key of L03_IDENTITY_KEYS)
    if (!["string", "number", "boolean"].includes(typeof identity[key])) throw new Error(code);
  return JSON.stringify(
    Object.fromEntries([...L03_IDENTITY_KEYS].sort().map((key) => [key, identity[key]]))
  );
}
function requireL03Projection(identity, helperDigest) {
  const code = "task551_implement_l03_tool_contract_digest_invalid";
  try {
    const digest = `sha256:${sha256Task551Bytes(new TextEncoder().encode(canonicalL03Identity(identity)))}`;
    if (
      typeof helperDigest !== "string" ||
      !/^sha256:(?!0{64}$)[a-f0-9]{64}$/u.test(helperDigest) ||
      helperDigest !== digest
    )
      throw new Error(code);
    return Object.freeze({ identity: Object.freeze({ ...identity }), toolContractDigest: digest });
  } catch {
    throw new Error(code);
  }
}
/** Literal L03 seam; no target resolution precedes owner-closure validation. */
export async function adaptTask551L03ClosureV2(closure, currentWorktree) {
  try {
    if (currentWorktree === null || currentWorktree === undefined) throw new Error("invalid");
    worktree.requireTask551NamedPhaseClosureV2(closure, "l03", currentWorktree);
    const target = await import("../../../scripts/task-551-fixture-target-bootstrap.ts");
    if (
      typeof target.getTask551FixtureBootstrapToolContractIdentity !== "function" ||
      typeof target.getTask551FixtureBootstrapToolContractDigest !== "function"
    )
      throw new Error("invalid");
    return requireL03Projection(
      target.getTask551FixtureBootstrapToolContractIdentity(),
      target.getTask551FixtureBootstrapToolContractDigest()
    );
  } catch {
    throw new Error("task551_implement_l03_tool_contract_digest_invalid");
  }
}

function requireL04Projection(value) {
  const code = "task551_l04_bootstrap_provenance_invalid";
  try {
    exactOwnData(value, L04_IDENTITY_KEYS, code);
    exactOwnData(value.archive, L04_ARCHIVE_KEYS, code);
    if (
      !Object.isFrozen(value) ||
      !Object.isFrozen(value.archive) ||
      value.schema !== "coderso.task551.freeze-candidate-generation-bootstrap@v2" ||
      value.version !== 2 ||
      value.generationId !== "task551-freeze-candidate-generation-v2" ||
      value.archive.path !== "tests/perf/task551DatabaseBaseline/freezeReceipts.ts" ||
      value.archive.sha256 !== "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f" ||
      value.state !== "awaiting-small"
    )
      throw new Error(code);
    return Object.freeze({
      schema: value.schema,
      version: value.version,
      generationId: value.generationId,
      archive: Object.freeze({ ...value.archive }),
      state: value.state,
    });
  } catch {
    throw new Error(code);
  }
}
/** Literal L04 seam; it never reads archive or active-state bytes. */
export async function adaptTask551L04ClosureV2(closure, currentWorktree) {
  try {
    if (currentWorktree === null || currentWorktree === undefined) throw new Error("invalid");
    worktree.requireTask551NamedPhaseClosureV2(closure, "l04", currentWorktree);
    const target =
      await import("../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts");
    if (typeof target.getTask551FreezeCandidateGenerationBootstrapV2 !== "function")
      throw new Error("invalid");
    return requireL04Projection(target.getTask551FreezeCandidateGenerationBootstrapV2());
  } catch {
    throw new Error("task551_l04_bootstrap_provenance_invalid");
  }
}
/** Literal L02 seam; only a full L02 code/test materialization closure opens it. */
export async function adaptTask551L02ClosureV2(closure, currentWorktree) {
  try {
    if (currentWorktree === null || currentWorktree === undefined) throw new Error("invalid");
    worktree.requireTask551L02CodeTestMaterializationClosureV1(closure, currentWorktree);
    const target =
      await import("../../../scripts/task551DatabaseBaseline/reviewedPairPersistence.ts");
    const projection = Object.create(null);
    for (const key of L02_PROJECTION_KEYS) {
      if (typeof target[key] !== "function") throw new Error("invalid");
      projection[key] = target[key];
    }
    return Object.freeze(projection);
  } catch {
    throw new Error("task551_l02_code_test_materialization_closure_invalid");
  }
}

function freezeTask551PredecessorValue(value) {
  const copy = (entry) => {
    if (Array.isArray(entry)) return Object.freeze(entry.map(copy));
    if (entry !== null && typeof entry === "object") {
      const result = {};
      for (const [key, child] of Object.entries(entry)) result[key] = copy(child);
      return Object.freeze(result);
    }
    return entry;
  };
  return copy(value);
}

function requireTask551CanonicalPredecessor(value) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  exactOwnData(value, ["predecessorValue", "digest", "token"], code);
  const bound = canonicalPredecessorTokens.get(value.predecessorValue);
  if (
    !Object.isFrozen(value) ||
    bound === undefined ||
    value.token !== bound.token ||
    value.digest !== bound.sourceDigest
  )
    throw new Error(code);
  return bound;
}

function requireTask551TerminalWriteReceipt(value) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  exactOwnData(value, ["path", "digest", "action"], code);
  if (
    !Object.isFrozen(value) ||
    value.path !== TASK551_DURABLE_EVIDENCE_MANIFEST[9].path ||
    !/^sha256:(?!0{64}$)[a-f0-9]{64}$/u.test(value.digest) ||
    !["committed_no_replace", "destination_eexist_race_committed"].includes(value.action)
  )
    throw new Error(code);
  return value;
}

function requireTask551CommitAForTerminal(value) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  exactOwnData(
    value,
    ["sourceHead", "createdAt", "reviewedAt", "promotedAt", "ownerCapabilityReceiptDigest"],
    code
  );
  if (
    !Object.isFrozen(value) ||
    !/^(?!0{40,64}$)[a-f0-9]{40,64}$/u.test(value.sourceHead) ||
    typeof value.createdAt !== "string" ||
    typeof value.reviewedAt !== "string" ||
    typeof value.promotedAt !== "string" ||
    !/^(?!0{64}$)[a-f0-9]{64}$/u.test(value.ownerCapabilityReceiptDigest)
  )
    throw new Error(code);
  return value;
}
/**
 * Private 05-L02 literal seam. Both closures prove the producer and the
 * L02-owned parser target before the temporary LF file is read exactly once.
 */
export async function readTask55105L02PredecessorAtNamedSeam(
  closure,
  l02Materialization,
  currentWorktree
) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  let bytes, handle;
  try {
    if (currentWorktree === null || currentWorktree === undefined) throw new Error(code);
    worktree.requireTask551NamedPhaseClosureV2(closure, "05-l02", currentWorktree);
    worktree.requireTask551L02CodeTestMaterializationClosureV1(l02Materialization, currentWorktree);
    if (!predecessorNamedClosures.delete(closure)) throw new Error(code);
    const target = worktree.TASK551_DEFERRED_LITERAL_TARGETS.find(
      ({ id }) => id === "05-l02-predecessor"
    );
    if (target?.path !== "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts")
      throw new Error(code);
    const fs = await import("node:fs/promises"),
      { constants } = await import("node:fs"),
      path = await import("node:path");
    const temporaryDirectory = path.resolve(".tmp/task-551"),
      temporary = path.resolve(".tmp/task-551/task489-predecessor-v1.json");
    if (path.relative(temporaryDirectory, temporary) !== "task489-predecessor-v1.json")
      throw new Error(code);
    const [directory, before] = await Promise.all([
      fs.lstat(temporaryDirectory),
      fs.lstat(temporary),
    ]);
    if (
      !directory.isDirectory() ||
      directory.isSymbolicLink() ||
      !before.isFile() ||
      before.isSymbolicLink()
    )
      throw new Error(code);
    const [realDirectory, realTemporary] = await Promise.all([
      fs.realpath(temporaryDirectory),
      fs.realpath(temporary),
    ]);
    if (path.relative(realDirectory, realTemporary) !== "task489-predecessor-v1.json")
      throw new Error(code);
    handle = await fs.open(temporary, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error(code);
    bytes = await handle.readFile();
    const after = await fs.lstat(temporary);
    if (
      !after.isFile() ||
      after.isSymbolicLink() ||
      after.dev !== opened.dev ||
      after.ino !== opened.ino
    )
      throw new Error(code);
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.at(-1) !== 0x0a)
      throw new Error(code);
    const digest = sha256Task551Bytes(bytes);
    const parser = await import("../../../tests/perf/fixtures/task489SolutionKitRunPredecessor.ts");
    if (typeof parser.parseTask489PredecessorReceiptV1 !== "function") throw new Error(code);
    const parsed = parser.parseTask489PredecessorReceiptV1(bytes);
    const predecessorValue = freezeTask551PredecessorValue({
      schema: parsed.schema,
      pass: parsed.pass,
      noLeak: true,
      companionIds: parsed.companionIds,
      fixtureCounts: parsed.fixtureCounts,
      logicalCases: parsed.logicalCases,
      statementReceipts: parsed.statementReceipts,
    });
    if (
      validateTask551EvidenceValue(TASK551_DURABLE_EVIDENCE_MANIFEST[9], predecessorValue) !== null
    )
      throw new Error(code);
    const token = Object.freeze(Object.create(null));
    canonicalPredecessorTokens.set(
      predecessorValue,
      Object.freeze({ token, sourceDigest: digest })
    );
    return Object.freeze({ predecessorValue, digest, token });
  } catch {
    throw new Error(code);
  } finally {
    try {
      await handle?.close();
    } catch {
      /* descriptor cleanup cannot broaden the result */
    }
    if (bytes instanceof Uint8Array) bytes.fill(0);
  }
}

/** Records the L02 owner closure privately; only a later 05-L02 seam can consume it. */
export function recordTask551L02MaterializationForWorkflow(permit, graphDigest, currentWorktree) {
  const code = "task551_l02_code_test_materialization_closure_invalid";
  try {
    if (
      permit === null ||
      (typeof permit !== "object" && typeof permit !== "function") ||
      typeof graphDigest !== "string" ||
      !/^[a-f0-9]{64}$/u.test(graphDigest) ||
      l02MaterializationClosures.has(permit)
    )
      throw new Error(code);
    const closure = worktree.createTask551L02CodeTestMaterializationClosureV1(currentWorktree);
    if (closure.taskGraphDigest !== graphDigest) throw new Error(code);
    l02MaterializationClosures.set(permit, Object.freeze({ graphDigest, closure }));
    return closure;
  } catch {
    throw new Error(code);
  }
}

/** Retrieves only the opaque private closure recorded before L02 command dispatch. */
export function requireTask551RecordedL02MaterializationForWorkflow(permit, graphDigest) {
  const code = "task551_l02_code_test_materialization_closure_invalid";
  try {
    const stored =
      permit !== null && (typeof permit === "object" || typeof permit === "function")
        ? l02MaterializationClosures.get(permit)
        : undefined;
    if (stored === undefined || stored.graphDigest !== graphDigest) throw new Error(code);
    return worktree.requireTask551L02CodeTestMaterializationClosureV1(stored.closure);
  } catch {
    throw new Error(code);
  }
}

/** The 05-L02 workflow obtains its predecessor only through the stored L02 closure. */
export async function prepareTask55105L02PredecessorEvidenceAtNamedSeam(
  permit,
  graphDigest,
  currentWorktree,
  privateL02Materialization = null
) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  try {
    const stored =
      permit !== null && (typeof permit === "object" || typeof permit === "function")
        ? l02MaterializationClosures.get(permit)
        : undefined;
    if (
      stored === undefined ||
      stored.graphDigest !== graphDigest ||
      (privateL02Materialization !== null && privateL02Materialization !== stored.closure)
    )
      throw new Error(code);
    const materialization = worktree.requireTask551L02CodeTestMaterializationClosureV1(
      stored.closure,
      currentWorktree
    );
    const closure = worktree.createTask551NamedPhaseClosureV2("05-l02", currentWorktree);
    predecessorNamedClosures.add(closure);
    return await readTask55105L02PredecessorAtNamedSeam(closure, materialization, currentWorktree);
  } catch {
    throw new Error(code);
  }
}

/** Builds the metadata-only row eleven after the branded row ten has a durable receipt. */
export function buildTask55105L02PromotionAtNamedSeam(predecessor, commitA, predecessorReceipt) {
  const code = "task551_05_l02_predecessor_seam_invalid";
  try {
    const bound = requireTask551CanonicalPredecessor(predecessor),
      commit = requireTask551CommitAForTerminal(commitA),
      receipt = requireTask551TerminalWriteReceipt(predecessorReceipt);
    const promotionValue = freezeTask551PredecessorValue({
      schemaVersion: "coderso.task551.task489-predecessor-promotion@v1",
      sourceTask: "TASK-551-05-L02",
      sourcePhase: "05-l02",
      sourceProfile: null,
      sourceScenario: "task489-predecessor",
      sourceHead: commit.sourceHead,
      sourceDigest: bound.sourceDigest,
      predecessor: {
        sourcePath: ".tmp/task-551/task489-predecessor-v1.json",
        durablePath: TASK551_DURABLE_EVIDENCE_MANIFEST[9].path,
        schemaVersion: "coderso.task551.task489-predecessor@v1",
        digest: receipt.digest.slice("sha256:".length),
      },
      promotionState: "promoted",
      promotionDecision: "accept",
      promotionReason: "exact-byte-match-after-owner-review",
      validationSummaries: {
        sourceIdentity: "passed",
        predecessorBytes: "passed",
        atomicNoReplace: "passed",
        terminalHead: "passed",
      },
      createdAt: commit.createdAt,
      reviewedAt: commit.reviewedAt,
      promotedAt: commit.promotedAt,
      ownerCapabilityReceiptDigest: commit.ownerCapabilityReceiptDigest,
    });
    if (
      validateTask551EvidenceValue(TASK551_DURABLE_EVIDENCE_MANIFEST[10], promotionValue) !== null
    )
      throw new Error(code);
    canonicalPredecessorPromotions.set(promotionValue, bound);
    return Object.freeze({
      predecessorValue: predecessor.predecessorValue,
      sourceDigest: bound.sourceDigest,
      promotionValue,
      token: bound.token,
    });
  } catch {
    throw new Error(code);
  }
}

/** Row ten is accepted only from the facade's one-read/one-parser seam. */
export async function writeTask551EvidenceFileIfAbsent(rowId, value) {
  if (arguments.length !== 2) throw new Error("task551_evidence_write_request_invalid");
  const index =
    typeof rowId === "string" ? TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID[rowId] : undefined;
  const row = Number.isInteger(index) ? TASK551_DURABLE_EVIDENCE_MANIFEST[index] : undefined;
  if (row === undefined) throw new Error("task551_evidence_row_id_invalid");
  if (row === TASK551_DURABLE_EVIDENCE_MANIFEST[9] && !canonicalPredecessorTokens.has(value))
    throw new Error("task551_canonical_predecessor_value_invalid");
  if (row === TASK551_DURABLE_EVIDENCE_MANIFEST[10] && !canonicalPredecessorPromotions.has(value))
    throw new Error("task551_canonical_predecessor_value_invalid");
  return writeTask551EvidenceFileIfAbsentPrivate(rowId, value);
}

function requireEvidenceDescriptorBindings() {
  const taskIds = new Set(worktree.TASK551_PHASE_PROVENANCE.map((item) => item.taskId));
  if (
    TASK551_DURABLE_EVIDENCE_MANIFEST.length !== 11 ||
    TASK551_EVIDENCE_VALUE_DESCRIPTORS.length !== TASK551_DURABLE_EVIDENCE_MANIFEST.length
  )
    throw new Error("task551_evidence_descriptor_cardinality");
  for (let index = 0; index < TASK551_DURABLE_EVIDENCE_MANIFEST.length; index += 1) {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[index],
      descriptor = TASK551_EVIDENCE_VALUE_DESCRIPTORS[index];
    if (
      descriptor?.manifestRow !== row ||
      descriptor.path !== row.path ||
      descriptor.keys !== row.keys ||
      !taskIds.has(descriptor.expectedTaskId)
    )
      throw new Error("task551_evidence_descriptor_owner_binding");
  }
}
export function requireTask551ContractIntegrity() {
  worktree.requireTask551WorktreeCompatibilityIntegrity();
  requireEvidenceDescriptorBindings();
  return true;
}

export const TASK551_PROFILE_VALUES = Object.freeze(["small", "large"]);
export const TASK551_CHILD_TIMEOUT_MS = 120_000;
export const TASK551_CHILD_MAX_OUTPUT_BYTES = 1_048_576;
export const TASK551_CHILD_KILL_GRACE_MS = 2_000;
export const TASK551_CHILD_DIAGNOSTIC_MAX_BYTES = 8_192;
export const TASK551_CHILD_FAILURE_CODES = Object.freeze({
  stdout_reader: "task551_child_stdout_reader_failed",
  stderr_reader: "task551_child_stderr_reader_failed",
  reducer: "task551_child_reducer_failed",
  parser: "task551_child_parser_failed",
  timeout: "task551_child_timeout",
  overflow: "task551_child_overflow",
  abort: "task551_child_abort",
  spawn: "task551_child_spawn_failed",
});
requireTask551ContractIntegrity();
