// TASK-551-11 sequential implementation workflow module.
import {
  isTask551AuthorAuditDispatchProjection,
  requireTask551ProductionDispatchPermit,
  requireTask551TestDispatchTaskSnapshotForTests,
  requireTask551TestDispatchPermitForTests,
} from "./task-551-author-audit.mjs";
import {
  admitTask551WorkflowCompatibilityAuthorAuditV2,
  admitTask551WorkflowCompatibilityGraphV2,
  admitTask551WorkflowCompatibilityL02V2,
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_ROW_IDS,
  TASK551_L02_REQUIRED_SUBGATES,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  awaitTask551EvidenceRecoveryPreflightBeforePhase,
  bootstrapTask551EvidenceStorageForOwnerWorkflowHost,
  captureTask551L01PreClassifierBarrier,
  captureTask551L01MaterializationBarrier,
  captureTask551MaterializedWorktreeSnapshot,
  captureTask551PreSpawnWorktreeSnapshot,
  buildTask55105L02PromotionAtNamedSeam,
  createTask551TaskGraphSnapshot,
  prepareTask55105L02PredecessorEvidenceAtNamedSeam,
  recordTask551L02MaterializationForWorkflow,
  requireExactClosedPaths,
  requireTask551ContractIntegrity,
  requireTask551EvidenceRecoveryClearBeforePhase,
  requireTask551EvidenceWriteReceiptDigest,
  requireExactActivePhaseSnapshotBeforeSpawn,
  requireTask551L01MaterializationBarrierBeforeL02,
  requireTask551RecordedL02MaterializationForWorkflow,
  requireTask551L02CodeTestMaterializationClosureV1,
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn,
  requireTask551TerminalEvidenceHandoffBinding,
  runTask551WorkflowCompatibilityBootstrapV2,
  sha256Task551Bytes,
  task551L11BarrierCurrentWorktreeDigest,
  task551L11BarrierSnapshotDigest,
  validateTask551EvidenceBytes,
  validateTask551EvidenceValue,
  verifyTask551TerminalCommittedHeadHandoff,
  writeTask551EvidenceFileIfAbsent,
} from "./lib/task-551-contract.mjs";
import {
  requireTask551CommandReceiptV1,
  runTask551FixLoop,
  runTask551SourceBoundChild,
} from "./task-551-fix.mjs";
import { createTask551L02SubgateExecutorV2 } from "./lib/task-551-l02-subgate-executor.mjs";
export const TASK551_IMPLEMENT_MAX_FIX_ROUNDS = 3;
export const TASK551_IMPLEMENT_TERMINAL_CODES = Object.freeze({
  gateFailedNoFixer: "task551_implement_gate_failed_no_fixer",
  fixLoopFailed: "task551_implement_fix_loop_failed",
  runtimeObserverMissing: "task551_implement_runtime_observer_missing",
});
const TEST_SEAM_PHASE = Symbol("task551-implement-test-seam");
const TASK551_DISPATCH_KEYS = Object.freeze([
  "sourceHead",
  "inventory",
  "taskFiles",
  "dispatchOrder",
]);
const TASK551_DISPATCH_NODE_KEYS = Object.freeze([
  "id",
  "taskId",
  "occurrenceId",
  "dependsOn",
  "allowlist",
  "forbiddenPaths",
  "artifactPolicy",
  "workflowPrerequisites",
  "commands",
  "subgates",
]);
const TASK551_DISPATCH_COMMAND_KEYS = Object.freeze([
  "id",
  "lane",
  "environmentProfile",
  "argv",
  "positiveDiscovery",
]);
const TASK551_L02_PREFIX_IDS = Object.freeze([
  "projection-static-test",
  "digest-static-test",
  "fixture-target-static-test",
  "reviewed-pair-persistence-static-test",
  "runner-lifecycle-static-test",
]);
const TASK551_PREFIXED_NONZERO_SHA256 = /^sha256:(?!0{64}$)[a-f0-9]{64}$/u;
const TASK551_GATE_RESULT_KEYS = Object.freeze([
  "exitCode",
  "signalCode",
  "timedOut",
  "overflowed",
  "discoveredTestCount",
]);
const TASK551_05_L02_OUTCOME_KEYS = Object.freeze(["schema", "group", "postCleanupTargetProof"]);
const TASK551_05_L02_GROUP_KEYS = Object.freeze(["schema", "context", "commandReceipt"]);
const TASK551_05_L02_PROOF_KEYS = Object.freeze([
  "rolledBack",
  "currentDatabaseMatched",
  "exactSingleMarkerMatched",
  "boundSentinelByteMatched",
]);
const TASK551_05_L02_COMMANDS = Object.freeze({
  "database-explain-plans-test": "05-l02-explain-plans-test",
  "task489-predecessor-plans-test": "05-l02-predecessor-test",
  "explain-plan-small-check": "05-l02-explain-small",
  "explain-plan-large-check": "05-l02-explain-large",
});
const TASK551_05_L02_COMMAND_IDS = Object.freeze(Object.keys(TASK551_05_L02_COMMANDS));
const TASK551_IMPLEMENT_PRODUCTION_INPUT_KEYS = Object.freeze([
  "authorAuditDispatch",
  "scheduledOccurrenceIds",
]);
const TASK551_IMPLEMENT_TEST_INPUT_KEYS = Object.freeze([
  "authorAuditDispatch",
  "scheduledOccurrenceIds",
  "currentWorktreeSnapshotProvider",
  "leafDispatcher",
  "gateRunner",
  "fixAgent",
  "runtimeOutputObserver",
  "evidenceWriter",
  "evidenceByPhase",
  "evidencePreflight",
  "maxFixRounds",
  "timeoutMs",
  "phaseSourceProvider",
  "phaseChildStarter",
  "phaseResourceDisposer",
  "l02PreBarrierMaterializer",
  "classifierBarrierRunner",
  "l02ReviewedTransitionRunner",
  "commitAObserver",
  "terminalFenceObserver",
  "phase",
  "testExecutionSession",
]);
const TASK551_TEST_EXECUTION_SESSIONS = new WeakMap();
const TASK551_DEPENDENCY_AUTHORIZATIONS = new WeakMap();
const TASK551_L03_COMPLETIONS = new WeakMap();
const TASK551_TEST_EVIDENCE_CLEAR = Object.freeze({
  rows: Object.freeze(
    TASK551_DURABLE_EVIDENCE_MANIFEST.map((_, index) =>
      Object.freeze({
        rowId: TASK551_EVIDENCE_ROW_IDS[index],
        terminalResult: "empty",
        telemetry: "recovery_empty",
      })
    )
  ),
  blockers: Object.freeze([]),
  clear: true,
});
const TASK551_GIT_SHA = /^(?!0{40,64}$)[a-f0-9]{40,64}$/u;
const PHASE_EVIDENCE_PHASES = Object.freeze({
  l01: Object.freeze([]),
  l03: Object.freeze(["l03-initialize", "l03-check"]),
  l02: Object.freeze([
    "l02-static",
    "l02-freeze-candidate",
    "l02-reviewed-candidates",
    "l02-check",
  ]),
  "05-l02": Object.freeze(["task489-predecessor", "task489-predecessor-promotion"]),
});
function task551ImplementPhaseEntries() {
  return TASK551_PHASE_PROVENANCE.filter((entry) => entry.phase !== "sidecar");
}
function phaseForTask551DispatchTask(taskId) {
  return task551ImplementPhaseEntries().find((entry) => entry.taskId === taskId)?.phase ?? null;
}
function requireDispatchablePhase(phase, label = "phase") {
  if (!task551ImplementPhaseEntries().some((entry) => entry.phase === phase)) {
    throw new Error(`task551_implement_${label}_unknown:${String(phase)}`);
  }
}
function task551OwnDataRecord(value, allowedKeys, requiredKeys, code) {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      throw new Error(code);
    const keys = Reflect.ownKeys(value),
      copy = {};
    if (keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key)))
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
      copy[key] = descriptor.value;
    }
    if (requiredKeys.some((key) => !Object.hasOwn(copy, key))) throw new Error(code);
    return Object.freeze(copy);
  } catch {
    throw new Error(code);
  }
}
function requireFrozenOwnData(value, expectedKeys, code) {
  task551OwnDataRecord(value, expectedKeys, expectedKeys, code);
  if (!Object.isFrozen(value)) throw new Error(code);
  return value;
}
function requireFrozenStrings(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    !Object.isFrozen(value) ||
    value.some((item) => typeof item !== "string")
  )
    throw new Error(code);
  return value;
}
function requireTask551FrozenExact(value, expected, code) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
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
    const actual = value[key],
      required = expected[key];
    if (Array.isArray(required)) {
      if (
        !Object.isFrozen(actual) ||
        actual.length !== required.length ||
        actual.some((item, index) => item !== required[index])
      )
        throw new Error(code);
    } else if (required !== null && typeof required === "object")
      requireTask551FrozenExact(actual, required, code);
    else if (actual !== required) throw new Error(code);
  }
  return value;
}
function requireTask551DispatchSubgates(value, taskId) {
  const code = "task551_implement_dispatch_projection_subgate_invalid";
  if (!Array.isArray(value) || !Object.isFrozen(value)) throw new Error(code);
  if (taskId !== "TASK-551-01-L02") {
    if (value.length !== 0) throw new Error(code);
    return value;
  }
  if (value.length !== TASK551_L02_REQUIRED_SUBGATES.length) throw new Error(code);
  for (let index = 0; index < value.length; index += 1)
    requireTask551FrozenExact(value[index], TASK551_L02_REQUIRED_SUBGATES[index], code);
  return value;
}
function requireTask551DispatchProjection(value) {
  if (!isTask551AuthorAuditDispatchProjection(value))
    throw new Error("task551_implement_author_audit_dispatch_untrusted");
  requireFrozenOwnData(
    value,
    TASK551_DISPATCH_KEYS,
    "task551_implement_dispatch_projection_invalid"
  );
  if (typeof value.sourceHead !== "string" || !/^[0-9a-f]{40,64}$/u.test(value.sourceHead))
    throw new Error("task551_implement_dispatch_projection_head_invalid");
  requireFrozenOwnData(
    value.inventory,
    ["taskFileCount", "childTaskCount", "leafTaskCount", "occurrenceCount"],
    "task551_implement_dispatch_projection_inventory_invalid"
  );
  if (!Object.values(value.inventory).every((count) => Number.isSafeInteger(count) && count > 0))
    throw new Error("task551_implement_dispatch_projection_inventory_invalid");
  if (
    !Array.isArray(value.taskFiles) ||
    !Object.isFrozen(value.taskFiles) ||
    !Array.isArray(value.dispatchOrder) ||
    !Object.isFrozen(value.dispatchOrder)
  )
    throw new Error("task551_implement_dispatch_projection_invalid");
  if (
    value.inventory.taskFileCount !== value.taskFiles.length ||
    value.inventory.occurrenceCount !== value.dispatchOrder.length
  )
    throw new Error("task551_implement_dispatch_projection_inventory_invalid");
  const taskPaths = new Set();
  for (const taskFile of value.taskFiles) {
    const keys = Object.hasOwn(taskFile ?? {}, "parentSubtaskId")
      ? ["path", "taskId", "status", "kind", "parentSubtaskId"]
      : ["path", "taskId", "status", "kind"];
    requireFrozenOwnData(taskFile, keys, "task551_implement_dispatch_projection_task_file_invalid");
    if (
      typeof taskFile.path !== "string" ||
      typeof taskFile.taskId !== "string" ||
      !taskPaths.add(taskFile.path)
    )
      throw new Error("task551_implement_dispatch_projection_task_file_invalid");
  }
  const ids = new Set();
  return Object.freeze(
    value.dispatchOrder.map((node) => {
      requireFrozenOwnData(
        node,
        TASK551_DISPATCH_NODE_KEYS,
        "task551_implement_dispatch_projection_node_invalid"
      );
      if (
        typeof node.id !== "string" ||
        typeof node.taskId !== "string" ||
        typeof node.occurrenceId !== "string" ||
        typeof node.artifactPolicy !== "string" ||
        !ids.add(node.id)
      )
        throw new Error("task551_implement_dispatch_projection_node_invalid");
      requireFrozenStrings(node.dependsOn, "task551_implement_dispatch_projection_node_invalid");
      requireFrozenStrings(node.allowlist, "task551_implement_dispatch_projection_node_invalid");
      requireFrozenStrings(
        node.forbiddenPaths,
        "task551_implement_dispatch_projection_node_invalid"
      );
      requireFrozenStrings(
        node.workflowPrerequisites,
        "task551_implement_dispatch_projection_node_invalid"
      );
      if (
        node.taskId === "TASK-551-01-L02"
          ? node.workflowPrerequisites.length !== 1 ||
            node.workflowPrerequisites[0] !== "TASK-551-11:compatibility-bootstrap@v2"
          : node.workflowPrerequisites.length !== 0
      )
        throw new Error("task551_implement_dispatch_projection_node_invalid");
      requireTask551DispatchSubgates(node.subgates, node.taskId);
      if (
        !Array.isArray(node.commands) ||
        !Object.isFrozen(node.commands) ||
        node.commands.length === 0
      )
        throw new Error("task551_implement_dispatch_projection_command_invalid");
      const commandIds = new Set();
      for (const command of node.commands) {
        const keys = Object.hasOwn(command ?? {}, "environmentOverrides")
          ? [...TASK551_DISPATCH_COMMAND_KEYS, "environmentOverrides"]
          : TASK551_DISPATCH_COMMAND_KEYS;
        requireFrozenOwnData(
          command,
          keys,
          "task551_implement_dispatch_projection_command_invalid"
        );
        if (
          typeof command.id !== "string" ||
          typeof command.lane !== "string" ||
          typeof command.environmentProfile !== "string" ||
          !commandIds.add(command.id)
        )
          throw new Error("task551_implement_dispatch_projection_command_invalid");
        requireFrozenStrings(command.argv, "task551_implement_dispatch_projection_command_invalid");
        const discovery = command.positiveDiscovery;
        const discoveryKeys =
          discovery?.kind === "test-paths" ? ["kind", "paths", "minimum"] : ["kind"];
        requireFrozenOwnData(
          discovery,
          discoveryKeys,
          "task551_implement_dispatch_projection_command_invalid"
        );
        if (discovery.kind === "test-paths") {
          requireFrozenStrings(
            discovery.paths,
            "task551_implement_dispatch_projection_command_invalid"
          );
          if (!Number.isSafeInteger(discovery.minimum) || discovery.minimum < 1)
            throw new Error("task551_implement_dispatch_projection_command_invalid");
        } else if (discovery.kind !== "not-applicable")
          throw new Error("task551_implement_dispatch_projection_command_invalid");
      }
      return Object.freeze({
        ...node,
        sourceHead: value.sourceHead,
        phase: phaseForTask551DispatchTask(node.taskId),
      });
    })
  );
}
/** Selects one graph occurrence; phase labels never select a substitute node. */
export function deriveTask551ImplementLandOrder(authorAuditDispatch, scheduledOccurrenceIds) {
  const graphOrder = requireTask551DispatchProjection(authorAuditDispatch);
  if (!Array.isArray(scheduledOccurrenceIds) || scheduledOccurrenceIds.length === 0)
    throw new Error("task551_implement_scheduled_occurrences_missing");
  if (scheduledOccurrenceIds.length !== 1)
    throw new Error("task551_implement_scheduled_occurrence_excess");
  const [id] = scheduledOccurrenceIds;
  if (typeof id !== "string") throw new Error("task551_implement_scheduled_occurrence_invalid");
  const node = graphOrder.find((candidate) => candidate.id === id);
  if (node === undefined) throw new Error("task551_implement_scheduled_occurrence_invalid");
  if (node.phase === null)
    throw new Error(`task551_implement_scheduled_occurrence_non_sidecar:${node.id}`);
  return Object.freeze([node]);
}
function l03EvidencePhase(command, phase) {
  if (phase !== "l03" || command.environmentProfile !== "task551-phase-l03") return null;
  if (command.argv.at(-1) === "--initialize") return "l03-initialize";
  if (command.argv.at(-1) === "--check") return "l03-check";
  throw new Error("task551_implement_l03_source_command_invalid");
}
/** Uses the graph envelope's occurrence-specific command list without aliases. */
export function buildTask551SubtaskGates(dispatch) {
  if (dispatch === null || typeof dispatch !== "object" || typeof dispatch.phase !== "string")
    throw new Error("task551_implement_gate_dispatch_invalid");
  requireDispatchablePhase(dispatch.phase, "gate_phase");
  const commands =
    dispatch.phase === "05-l02"
      ? dispatch.commands.filter((command) => TASK551_05_L02_COMMAND_IDS.includes(command.id))
      : dispatch.commands;
  if (
    dispatch.phase === "05-l02" &&
    (commands.length !== TASK551_05_L02_COMMAND_IDS.length ||
      commands.some((command, index) => command.id !== TASK551_05_L02_COMMAND_IDS[index]))
  )
    throw new Error("task551_05_l02_command_sequence_invalid");
  return Object.freeze(
    commands.map((command) => {
      const evidencePhase = l03EvidencePhase(command, dispatch.phase);
      return Object.freeze({
        gateId: `command:${command.id}`,
        commandId: command.id,
        lane: command.lane,
        kind: command.positiveDiscovery.kind === "test-paths" ? "test" : "command",
        operation: command.id,
        argv: command.argv,
        requiresSource: evidencePhase !== null,
        evidencePhase,
      });
    })
  );
}
export function requireTask551SingleWriterChangeSet(dispatch, changedPaths) {
  if (dispatch === null || typeof dispatch !== "object" || typeof dispatch.phase !== "string")
    throw new Error("task551_implement_dispatch_invalid");
  const { phase, allowlist, forbiddenPaths } = dispatch;
  requireDispatchablePhase(phase, "dispatch_phase");
  if (!Array.isArray(allowlist) || !Array.isArray(forbiddenPaths))
    throw new Error(`task551_change_allowlist_invalid:${phase}`);
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    throw new Error(`task551_change_set_empty_or_not_array:${phase}`);
  }
  const allowed = new Set(allowlist);
  const seen = new Set();
  for (const path of changedPaths) {
    if (typeof path !== "string" || path.length === 0) {
      throw new Error(`task551_change_path_invalid:${phase}`);
    }
    if (seen.has(path)) throw new Error(`task551_duplicate_path:${path}`);
    seen.add(path);
    if (forbiddenPaths.includes(path) || !allowed.has(path)) {
      throw new Error(`task551_single_writer_violation:${phase}:${path}`);
    }
  }
  return true;
}
function task551GateResult(gate, raw) {
  if (!gate || typeof gate.gateId !== "string") throw new Error("task551_gate_descriptor_missing");
  return task551OwnDataRecord(
    raw,
    TASK551_GATE_RESULT_KEYS,
    TASK551_GATE_RESULT_KEYS,
    `task551_gate_result_invalid:${gate.gateId}`
  );
}
export function evaluateTask551GateOutcome(gate, raw) {
  const { exitCode, signalCode, timedOut, overflowed, discoveredTestCount } = task551GateResult(
    gate,
    raw
  );
  if (!Number.isSafeInteger(exitCode) || exitCode < 0)
    throw new Error(`task551_gate_exit_code_invalid:${gate.gateId}`);
  if (signalCode !== null && (typeof signalCode !== "string" || signalCode.length === 0))
    throw new Error(`task551_gate_signal_invalid:${gate.gateId}`);
  if (
    typeof timedOut !== "boolean" ||
    typeof overflowed !== "boolean" ||
    (gate.kind !== "test" && gate.kind !== "command")
  )
    throw new Error(`task551_gate_result_invalid:${gate.gateId}`);
  const discoveryInvalid =
    gate.kind === "test"
      ? !Number.isSafeInteger(discoveredTestCount) || discoveredTestCount <= 0
      : discoveredTestCount !== null;
  const pass =
    exitCode === 0 &&
    !signalCode &&
    timedOut === false &&
    overflowed === false &&
    !discoveryInvalid;
  const code = pass
    ? null
    : timedOut
      ? "task551_gate_timeout"
      : overflowed
        ? "task551_gate_overflow"
        : signalCode
          ? "task551_gate_signalled"
          : discoveryInvalid
            ? "task551_gate_discovery_metadata_invalid"
            : "task551_gate_nonzero_exit";
  return Object.freeze({ pass, gateId: gate.gateId, exitCode, signalCode, code });
}
function requireTask55105L02Outcome(dispatch, gate, raw) {
  const code = "task551_05_l02_post_cleanup_target_proof_invalid";
  try {
    requireFrozenOwnData(raw, ["gateResult", "terminalOutcome"], code);
    const outcome = requireTask55105L02TerminalOutcome(dispatch, gate, raw.terminalOutcome);
    const result = evaluateTask551GateOutcome(gate, raw.gateResult);
    if (!result.pass) throw new Error(code);
    return Object.freeze({ ...result, terminalOutcome: outcome });
  } catch {
    throw new Error(code);
  }
}
function requireTask55105L02TerminalOutcome(dispatch, gate, value) {
  const code = "task551_05_l02_post_cleanup_target_proof_invalid",
    logicalCommandId = TASK551_05_L02_COMMANDS[gate?.operation];
  const outcome = requireFrozenOwnData(value, TASK551_05_L02_OUTCOME_KEYS, code),
    group = requireFrozenOwnData(outcome.group, TASK551_05_L02_GROUP_KEYS, code);
  requireFrozenOwnData(group.context, ["dispatchId", "logicalCommandId"], code);
  requireFrozenOwnData(outcome.postCleanupTargetProof, TASK551_05_L02_PROOF_KEYS, code);
  if (
    logicalCommandId === undefined ||
    outcome.schema !== "coderso.task551.05-l02-child-outcome@v1" ||
    group.schema !== "coderso.task551.redacted-command-group@v1" ||
    group.context.dispatchId !== dispatch.id ||
    group.context.logicalCommandId !== logicalCommandId ||
    Object.values(outcome.postCleanupTargetProof).some((entry) => entry !== true)
  )
    throw new Error(code);
  requireTask551CommandReceiptV1(group.commandReceipt);
  const receipt = group.commandReceipt;
  if (
    receipt.commandContextId !== `${dispatch.id}/${gate.operation}` ||
    receipt.logicalCommandId !== logicalCommandId ||
    receipt.process.status !== "passed" ||
    receipt.process.result !== "zero_exit" ||
    receipt.process.exitCode !== 0 ||
    receipt.process.signalCode !== null ||
    receipt.process.killStrategy !== "none"
  )
    throw new Error(code);
  return outcome;
}
function requireTask55105L02Outcomes(dispatch, plan, outcomes) {
  const code = "task551_05_l02_post_cleanup_target_proof_invalid";
  if (!Array.isArray(outcomes) || plan.gates.length !== 4 || outcomes.length !== 4)
    throw new Error(code);
  for (let index = 0; index < plan.gates.length; index += 1)
    requireTask55105L02TerminalOutcome(dispatch, plan.gates[index], outcomes[index]);
  return true;
}
/** Runtime output paths are checked only after, and at, their producing operation. */
export function requireTask551RuntimeOutputsAfterProduction(phase, observedOutputs) {
  requireDispatchablePhase(phase, "runtime_outputs_phase");
  const declared = TASK551_PHASE_RUNTIME_OUTPUTS.get(phase);
  if (!Array.isArray(observedOutputs)) {
    throw new Error(`task551_runtime_outputs_observed_not_array:${phase}`);
  }
  requireExactClosedPaths(observedOutputs, declared, `${phase}:runtime-outputs`);
  return true;
}
/** Combined dispatch plan: current-worktree fences run at each spawn boundary. */
export function planTask551PhaseDispatch(dispatch) {
  if (dispatch === null || typeof dispatch !== "object" || typeof dispatch.phase !== "string") {
    throw new Error("task551_implement_dispatch_invalid");
  }
  requireDispatchablePhase(dispatch.phase, "dispatch_phase");
  return Object.freeze({
    phase: dispatch.phase,
    occurrenceId: dispatch.occurrenceId,
    allowedPaths: dispatch.allowlist,
    forbiddenPaths: dispatch.forbiddenPaths,
    commands: dispatch.commands,
    workflowPrerequisites: dispatch.workflowPrerequisites,
    subgates: dispatch.subgates,
    gates: buildTask551SubtaskGates(dispatch),
  });
}
function requireTask551L02SubgatePlan(plan) {
  const code = "task551_implement_l02_classifier_subgate_invalid";
  if (
    plan.phase !== "l02" ||
    plan.workflowPrerequisites.length !== 1 ||
    plan.workflowPrerequisites[0] !== "TASK-551-11:compatibility-bootstrap@v2" ||
    plan.subgates.length !== 2
  )
    throw new Error(code);
  const [classifier, review] = plan.subgates;
  const boundary = classifier.afterCommandIds.length;
  if (
    classifier.id !== "l11-classifier-materialization" ||
    classifier.kind !== "classifier-materialization" ||
    classifier.ordinal !== 1 ||
    classifier.beforeCommandId !== "core-lint-types" ||
    classifier.afterCommandIds.some((id, index) => id !== TASK551_L02_PREFIX_IDS[index]) ||
    review.id !== "l11-reviewed-pair-transition" ||
    review.kind !== "reviewed-pair-transition" ||
    review.ordinal !== 2 ||
    review.beforeCommandId !== "check-small" ||
    plan.gates
      .slice(0, boundary)
      .some((gate, index) => gate.operation !== TASK551_L02_PREFIX_IDS[index]) ||
    plan.gates[boundary]?.operation !== classifier.beforeCommandId
  )
    throw new Error(code);
  return Object.freeze({ classifier, review, boundary });
}
function requireTask551L02BarrierResult(value, keys, code) {
  return requireFrozenOwnData(value, keys, code);
}
function task551PrefixReceipt(gate, raw, worktreeDigest) {
  const result = task551GateResult(gate, raw),
    outcome = evaluateTask551GateOutcome(gate, result);
  return Object.freeze({
    outcome,
    receipt: outcome.pass
      ? Object.freeze({
          id: gate.operation,
          argv: Object.freeze([...gate.argv]),
          ...result,
          worktreeDigest,
        })
      : null,
  });
}
function requireTask551L03CheckDigest(evidence) {
  const code = "task551_implement_l02_l03_check_evidence_invalid",
    row = TASK551_DURABLE_EVIDENCE_MANIFEST[1];
  requireFrozenOwnData(evidence, ["receipt", "bytes"], code);
  requireFrozenOwnData(evidence.receipt, ["path", "phase", "digest", "bytes", "action"], code);
  if (!(evidence.bytes instanceof Uint8Array)) throw new Error(code);
  const bytes = new Uint8Array(evidence.bytes),
    receipt = evidence.receipt;
  if (
    validateTask551EvidenceBytes(row, bytes) !== null ||
    receipt.path !== row.path ||
    receipt.phase !== row.phase ||
    receipt.bytes !== bytes.byteLength ||
    receipt.digest !== `sha256:${sha256Task551Bytes(bytes)}` ||
    !["committed_no_replace", "destination_eexist_race_committed"].includes(receipt.action)
  )
    throw new Error(code);
  return receipt.digest;
}
function task551L03CheckProof(completion) {
  const row = TASK551_DURABLE_EVIDENCE_MANIFEST[1];
  return Object.freeze({
    path: row.path,
    schema: row.schema,
    phase: "l03-check",
    taskId: "TASK-551-01-L03",
    accepted: true,
    acceptedEvidenceDigest: completion.acceptedEvidenceDigest,
    worktreeDigest: task551L11BarrierSnapshotDigest(completion.activeSnapshot),
  });
}
function task551SameL02Precheck(left, right) {
  return (
    left.digest === right.digest &&
    left.l03EvidenceProof.acceptedEvidenceDigest === right.l03EvidenceProof.acceptedEvidenceDigest
  );
}
function requireTask551AuditSnapshotBinding(auditSnapshot, binding) {
  if (auditSnapshot?.taskGraphDigest !== binding.graphDigest) {
    throw new Error("task551_implement_audit_task_graph_mismatch");
  }
  return createTask551TaskGraphSnapshot(auditSnapshot.taskFileDigests);
}
async function readTask551CurrentWorktree(provider, dispatch, stage, operation = null) {
  return provider({
    phase: dispatch.phase,
    taskId: dispatch.taskId,
    occurrenceId: dispatch.occurrenceId,
    id: dispatch.id,
    stage,
    operation,
  });
}
function currentTask551FileDigestMap(current) {
  return new Map(current.files.map(({ path, sha256 }) => [path, sha256]));
}
function changedTask551CurrentPaths(before, after) {
  const previous = currentTask551FileDigestMap(before);
  const next = currentTask551FileDigestMap(after);
  return Object.freeze(
    [
      ...new Set(
        [...previous.keys(), ...next.keys()].filter((path) => previous.get(path) !== next.get(path))
      ),
    ].sort()
  );
}
function requireTask551ObservedLeafChangeSet(dispatch, reported, before, after) {
  const observed = changedTask551CurrentPaths(before, after);
  if (
    dispatch.phase === "l02" &&
    Array.isArray(reported) &&
    reported.length === 0 &&
    observed.length === 0
  )
    return observed;
  requireTask551SingleWriterChangeSet(dispatch, reported);
  requireTask551SingleWriterChangeSet(dispatch, observed);
  if (
    reported.length !== observed.length ||
    [...reported].sort().some((path, index) => path !== observed[index])
  ) {
    throw new Error(`task551_implement_change_set_observation_mismatch:${dispatch.phase}`);
  }
  return observed;
}
function requireTask551CurrentWorktreeFence(phase, predecessorSnapshot, activeSnapshot, current) {
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn(phase, predecessorSnapshot, current);
  if (activeSnapshot !== null) {
    requireExactActivePhaseSnapshotBeforeSpawn(
      phase,
      activeSnapshot.activeDigests,
      current,
      activeSnapshot
    );
  } else if (phase !== "l01") {
    throw new Error(`task551_implement_active_snapshot_missing:${phase}`);
  }
  return true;
}
function canonicalManifestRow(row) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return null;
  return TASK551_DURABLE_EVIDENCE_MANIFEST.find((candidate) => candidate === row) ?? null;
}
function phaseManifestRows(phase) {
  const phases = PHASE_EVIDENCE_PHASES[phase];
  return TASK551_DURABLE_EVIDENCE_MANIFEST.filter((row) => phases.includes(row.phase));
}
function task551SnapshotEvidenceValue(row, value) {
  const error = validateTask551EvidenceValue(row, value);
  if (error !== null) throw new Error(error);
  try {
    value = JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error("task551_evidence_value_invalid");
  }
  if (validateTask551EvidenceValue(row, value) !== null)
    throw new Error("task551_evidence_value_invalid");
  const freeze = (entry) => {
    if (entry !== null && typeof entry === "object" && !Object.isFrozen(entry)) {
      for (const child of Object.values(entry)) freeze(child);
      Object.freeze(entry);
    }
    return entry;
  };
  return freeze(value);
}
function bindEvidenceRequests(phase, requests) {
  if (phase === "05-l02") {
    if (requests !== undefined) throw new Error("task551_implement_terminal_evidence_injected");
    return Object.freeze([]);
  }
  const rows = phaseManifestRows(phase);
  if (requests === undefined) {
    if (rows.length === 0) return Object.freeze([]);
    throw new Error(`task551_implement_evidence_required:${phase}`);
  }
  if (!Array.isArray(requests)) {
    throw new Error(`task551_implement_evidence_requests_not_array:${phase}`);
  }
  const allowedRows = new Set(rows);
  const seen = new Set();
  const bound = Object.freeze(
    requests.map((request) => {
      const boundRequest = task551OwnDataRecord(
        request,
        ["manifestRow", "value", "phase"],
        ["manifestRow", "value"],
        `task551_implement_evidence_request_invalid:${phase}`
      );
      const row = canonicalManifestRow(boundRequest.manifestRow);
      if (row === null || !allowedRows.has(row)) {
        throw new Error(`task551_implement_evidence_manifest_phase_mismatch:${phase}`);
      }
      if (seen.has(row.path)) {
        throw new Error(`task551_implement_evidence_duplicate:${row.path}`);
      }
      seen.add(row.path);
      if (
        Object.hasOwn(boundRequest, "phase") &&
        boundRequest.phase !== phase &&
        boundRequest.phase !== row.phase
      ) {
        throw new Error(`task551_implement_evidence_request_phase_mismatch:${phase}`);
      }
      const value = task551SnapshotEvidenceValue(row, boundRequest.value);
      return Object.freeze(
        Object.hasOwn(boundRequest, "phase")
          ? { manifestRow: row, value, phase: boundRequest.phase }
          : { manifestRow: row, value }
      );
    })
  );
  if (seen.size !== rows.length) {
    throw new Error(`task551_implement_evidence_missing:${phase}`);
  }
  return bound;
}
function requireEvidenceByPhaseShape(evidenceByPhase) {
  if (
    evidenceByPhase === null ||
    typeof evidenceByPhase !== "object" ||
    Array.isArray(evidenceByPhase)
  ) {
    throw new Error("task551_implement_evidence_by_phase_invalid");
  }
  for (const phase of Object.keys(evidenceByPhase)) {
    requireDispatchablePhase(phase, "evidence_phase");
  }
}
function requireReceipt(receipt, phase, operation, manifestRow) {
  const code = `task551_implement_evidence_receipt_invalid:${phase}:${operation}`;
  requireFrozenOwnData(receipt, ["path", "phase", "digest", "bytes", "action"], code);
  if (
    receipt.path !== manifestRow.path ||
    receipt.phase !== manifestRow.phase ||
    typeof receipt.digest !== "string" ||
    !TASK551_PREFIXED_NONZERO_SHA256.test(receipt.digest) ||
    !Number.isSafeInteger(receipt.bytes) ||
    receipt.bytes < 1 ||
    !["committed_no_replace", "destination_eexist_race_committed"].includes(receipt.action)
  ) {
    throw new Error(`task551_implement_evidence_receipt_path_mismatch:${phase}:${operation}`);
  }
  return Object.freeze({
    path: receipt.path,
    digest: receipt.digest,
    action: receipt.action,
  });
}
function recordTask551L03Completion(permit, binding, activeSnapshot, evidenceReceipts) {
  const receipt = evidenceReceipts.find(
    ({ path }) => path === TASK551_DURABLE_EVIDENCE_MANIFEST[1].path
  );
  if (activeSnapshot === null || receipt === undefined || TASK551_L03_COMPLETIONS.has(permit)) {
    throw new Error("task551_implement_l03_completion_invalid");
  }
  TASK551_L03_COMPLETIONS.set(
    permit,
    Object.freeze({
      graphDigest: binding.graphDigest,
      activeSnapshot,
      acceptedEvidenceDigest: receipt.digest,
    })
  );
}
function requireTask551L03Completion(permit, binding) {
  const completion = TASK551_L03_COMPLETIONS.get(permit);
  if (completion === undefined || completion.graphDigest !== binding.graphDigest) {
    throw new Error("task551_implement_l03_completion_missing_or_stale");
  }
  return completion;
}
function requireTask551CommitAObservation(value) {
  requireFrozenOwnData(
    value,
    ["sourceHead", "createdAt", "reviewedAt", "promotedAt", "ownerCapabilityReceiptDigest"],
    "task551_implement_commit_a_invalid"
  );
  if (
    typeof value.sourceHead !== "string" ||
    !TASK551_GIT_SHA.test(value.sourceHead) ||
    [value.createdAt, value.reviewedAt, value.promotedAt].some(
      (value) => typeof value !== "string"
    ) ||
    typeof value.ownerCapabilityReceiptDigest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.ownerCapabilityReceiptDigest)
  ) {
    throw new Error("task551_implement_commit_a_invalid");
  }
  return value;
}
function requireExactEvidenceReceiptCoverage(phase, requests, receipts) {
  const expectedPaths = phaseManifestRows(phase)
    .map((row) => row.path)
    .sort();
  const requestPaths = requests.map((request) => request.manifestRow.path).sort();
  const receiptPaths = receipts.map((receipt) => receipt.path).sort();
  if (
    requestPaths.length !== expectedPaths.length ||
    receiptPaths.length !== expectedPaths.length ||
    new Set(receiptPaths).size !== receiptPaths.length ||
    expectedPaths.some(
      (path, index) => requestPaths[index] !== path || receiptPaths[index] !== path
    )
  ) {
    throw new Error(`task551_implement_evidence_receipt_coverage_invalid:${phase}`);
  }
}
/** Sole evidence-writing seam: the library no-replace writer with canonical-row binding. */
export function publishTask551PhaseEvidence(request) {
  const row = canonicalManifestRow(request?.manifestRow);
  if (row === null) throw new Error("task551_implement_evidence_manifest_not_canonical");
  return writeTask551EvidenceFileIfAbsent(
    TASK551_EVIDENCE_ROW_IDS[TASK551_DURABLE_EVIDENCE_MANIFEST.indexOf(row)],
    request.value
  );
}
async function awaitTask551EvidencePreflight(testSeam, testPreflight) {
  if (!testSeam) return awaitTask551EvidenceRecoveryPreflightBeforePhase();
  return requireTask551EvidenceRecoveryClearBeforePhase(
    await (testPreflight ?? (() => TASK551_TEST_EVIDENCE_CLEAR))()
  );
}
function requireMaxFixRounds(value) {
  if (!Number.isInteger(value) || value < 1 || value > TASK551_IMPLEMENT_MAX_FIX_ROUNDS) {
    throw new Error("task551_implement_max_fix_rounds_invalid");
  }
}
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function requireTask551ImplementInput(input, testSeam) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new Error("task551_implement_input_invalid");
  }
  const allowed = testSeam
    ? TASK551_IMPLEMENT_TEST_INPUT_KEYS
    : TASK551_IMPLEMENT_PRODUCTION_INPUT_KEYS;
  for (const key of Reflect.ownKeys(input)) {
    const descriptor =
      typeof key === "string" ? Object.getOwnPropertyDescriptor(input, key) : undefined;
    if (
      typeof key !== "string" ||
      !allowed.includes(key) ||
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      throw new Error("task551_implement_input_unknown_key");
    }
  }
  return input;
}
function requireTask551TestSessionFixture(value) {
  const keys = ["targetOccurrenceId", "seededCompletedOccurrenceIds"];
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error("task551_implement_test_session_fixture_invalid");
  }
  if (
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      );
    })
  )
    throw new Error("task551_implement_test_session_fixture_invalid");
  if (
    typeof value.targetOccurrenceId !== "string" ||
    !Array.isArray(value.seededCompletedOccurrenceIds)
  ) {
    throw new Error("task551_implement_test_session_fixture_invalid");
  }
  const seeded = new Set();
  for (const occurrenceId of value.seededCompletedOccurrenceIds) {
    if (typeof occurrenceId !== "string")
      throw new Error("task551_implement_test_session_fixture_invalid");
    if (seeded.has(occurrenceId))
      throw new Error(`task551_implement_test_session_seed_duplicate:${occurrenceId}`);
    seeded.add(occurrenceId);
  }
  return Object.freeze({
    targetOccurrenceId: value.targetOccurrenceId,
    seededCompletedOccurrenceIds: Object.freeze([...seeded]),
  });
}
export function createTask551TestExecutionSession(authorAuditDispatch, fixture) {
  const binding = requireTask551TestDispatchPermitForTests(authorAuditDispatch);
  const config = requireTask551TestSessionFixture(fixture);
  const dispatches = requireTask551DispatchProjection(authorAuditDispatch);
  const targetIndex = dispatches.findIndex((dispatch) => dispatch.id === config.targetOccurrenceId);
  const target = dispatches[targetIndex];
  if (target === undefined || target.phase === null) {
    throw new Error("task551_implement_test_session_target_invalid");
  }
  for (const occurrenceId of config.seededCompletedOccurrenceIds) {
    const seedIndex = dispatches.findIndex((dispatch) => dispatch.id === occurrenceId);
    if (seedIndex < 0 || seedIndex >= targetIndex) {
      throw new Error(`task551_implement_test_session_seed_not_earlier:${occurrenceId}`);
    }
    if (!target.dependsOn.includes(occurrenceId)) {
      throw new Error(`task551_implement_test_session_seed_not_dependency:${occurrenceId}`);
    }
  }
  const session = Object.freeze({});
  TASK551_TEST_EXECUTION_SESSIONS.set(
    session,
    Object.freeze({
      permit: authorAuditDispatch,
      sourceHead: binding.sourceHead,
      graphDigest: binding.graphDigest,
      targetOccurrenceId: target.id,
      seededFixtureCompleted: new Set(config.seededCompletedOccurrenceIds),
      completed: new Set(),
      running: new Set(),
    })
  );
  return session;
}
function requireTask551TestExecutionSession(session, permit, binding, dispatch) {
  const ledger =
    session !== null && typeof session === "object"
      ? TASK551_TEST_EXECUTION_SESSIONS.get(session)
      : undefined;
  if (ledger === undefined) throw new Error("task551_implement_test_session_untrusted");
  if (ledger.permit !== permit) throw new Error("task551_implement_test_session_foreign");
  if (ledger.sourceHead !== binding.sourceHead || ledger.graphDigest !== binding.graphDigest) {
    throw new Error("task551_implement_test_session_stale");
  }
  if (ledger.targetOccurrenceId !== dispatch.id) {
    throw new Error("task551_implement_test_session_target_mismatch");
  }
  return ledger;
}
function requireTask551OccurrenceDependencies(dispatch, ledger) {
  const missing = dispatch.dependsOn.filter(
    (id) => !ledger.completed.has(id) && !ledger.seededFixtureCompleted.has(id)
  );
  if (missing.length !== 0) throw new Error(`task551_implement_dependency_missing:${missing[0]}`);
}
function beginTask551Occurrence({ permit, binding, dispatch, ledger }) {
  if (ledger.completed.has(dispatch.id) || ledger.running.has(dispatch.id)) {
    throw new Error(`task551_implement_occurrence_duplicate:${dispatch.id}`);
  }
  requireTask551OccurrenceDependencies(dispatch, ledger);
  ledger.running.add(dispatch.id);
  const authorization = Object.freeze({});
  TASK551_DEPENDENCY_AUTHORIZATIONS.set(
    authorization,
    Object.freeze({
      permit,
      ledger,
      sourceHead: binding.sourceHead,
      graphDigest: binding.graphDigest,
      occurrenceId: dispatch.id,
    })
  );
  return authorization;
}
function completeTask551Occurrence(authorization, ledger, dispatch) {
  const record = TASK551_DEPENDENCY_AUTHORIZATIONS.get(authorization);
  if (
    record === undefined ||
    record.ledger !== ledger ||
    record.occurrenceId !== dispatch.id ||
    !ledger.running.delete(dispatch.id)
  ) {
    throw new Error("task551_implement_dependency_authorization_invalid");
  }
  ledger.completed.add(dispatch.id);
}
function abandonTask551Occurrence(ledger, dispatch) {
  ledger.running.delete(dispatch.id);
}
function phaseSelection(input, testSeam) {
  if (!hasOwn(input, "phase") || input.phase === undefined) return null;
  if (!testSeam) throw new Error("task551_implement_phase_request_requires_test_seam");
  requireDispatchablePhase(input.phase, "requested_phase");
  return input.phase;
}
async function observeRuntimeOutputs({ phase, operation, runtimeOutputObserver }) {
  const declared = TASK551_PHASE_RUNTIME_OUTPUTS.get(phase);
  if (declared.length === 0) return null;
  if (typeof runtimeOutputObserver !== "function") {
    return { missing: true };
  }
  const observed = await runtimeOutputObserver({ phase, operation });
  requireTask551RuntimeOutputsAfterProduction(phase, observed);
  return Object.freeze([...observed].sort());
}
function producesTask551RuntimeOutput(dispatch, gate = null) {
  if (dispatch.phase !== "05-l02" || gate === null) return false;
  const scale = gate.argv.indexOf("--scale");
  return scale >= 0 && gate.argv[scale + 1] === "large" && gate.argv.includes("--check");
}

async function runTask551ImplementWorkflowInternal(
  input,
  testSeamValue,
  privateL02Materialization = null
) {
  const testSeam = testSeamValue === TEST_SEAM_PHASE;
  const config = requireTask551ImplementInput(input ?? {}, testSeam);
  const requestedPhase = phaseSelection(config, testSeam);
  const { authorAuditDispatch, scheduledOccurrenceIds } = config;
  requireTask551ContractIntegrity();
  const binding = testSeam
    ? requireTask551TestDispatchPermitForTests(authorAuditDispatch)
    : requireTask551ProductionDispatchPermit(authorAuditDispatch);
  const dispatches = deriveTask551ImplementLandOrder(authorAuditDispatch, scheduledOccurrenceIds);
  if (requestedPhase !== null && dispatches[0].phase !== requestedPhase) {
    throw new Error("task551_implement_requested_occurrence_absent");
  }
  if (!testSeam) throw new Error("task551_implement_production_adapters_unavailable");
  const auditSnapshot = requireTask551AuditSnapshotBinding(
    requireTask551TestDispatchTaskSnapshotForTests(authorAuditDispatch),
    binding
  );
  const {
    currentWorktreeSnapshotProvider,
    leafDispatcher,
    gateRunner,
    fixAgent = null,
    runtimeOutputObserver = null,
    evidenceWriter = null,
    evidenceByPhase = {},
    evidencePreflight = null,
    maxFixRounds = TASK551_IMPLEMENT_MAX_FIX_ROUNDS,
    timeoutMs = 600_000,
    phaseSourceProvider = null,
    phaseChildStarter = null,
    phaseResourceDisposer = null,
    l02PreBarrierMaterializer = null,
    classifierBarrierRunner = null,
    l02ReviewedTransitionRunner = null,
    commitAObserver = null,
    terminalFenceObserver = null,
    testExecutionSession,
  } = config;
  requireMaxFixRounds(maxFixRounds);
  const ledger = requireTask551TestExecutionSession(
    testExecutionSession,
    authorAuditDispatch,
    binding,
    dispatches[0]
  );
  requireRunner(currentWorktreeSnapshotProvider, "currentWorktreeSnapshotProvider");
  requireRunner(leafDispatcher, "leafDispatcher");
  requireRunner(gateRunner, "gateRunner");
  if (typeof evidencePreflight !== "function" && evidencePreflight !== null)
    throw new Error("task551_implement_runner_missing:evidencePreflight");
  if (typeof phaseSourceProvider !== "function" && phaseSourceProvider !== null) {
    throw new Error("task551_implement_runner_missing:phaseSourceProvider");
  }
  if (typeof phaseChildStarter !== "function" && phaseChildStarter !== null) {
    throw new Error("task551_implement_runner_missing:phaseChildStarter");
  }
  if (typeof phaseResourceDisposer !== "function" && phaseResourceDisposer !== null) {
    throw new Error("task551_implement_runner_missing:phaseResourceDisposer");
  }
  if (dispatches.some((dispatch) => dispatch.phase === "l03")) {
    requireRunner(phaseSourceProvider, "phaseSourceProvider");
    requireRunner(phaseChildStarter, "phaseChildStarter");
    requireRunner(phaseResourceDisposer, "phaseResourceDisposer");
  }
  if (dispatches.some((dispatch) => dispatch.phase === "l02")) {
    requireRunner(l02PreBarrierMaterializer, "l02PreBarrierMaterializer");
    requireRunner(classifierBarrierRunner, "classifierBarrierRunner");
    requireRunner(l02ReviewedTransitionRunner, "l02ReviewedTransitionRunner");
  }
  if (dispatches.some((dispatch) => dispatch.phase === "05-l02")) {
    requireRunner(commitAObserver, "commitAObserver");
    requireRunner(terminalFenceObserver, "terminalFenceObserver");
  }
  requireEvidenceByPhaseShape(evidenceByPhase);
  const boundEvidence = new Map();
  const selectedPhases = new Set(dispatches.map((dispatch) => dispatch.phase));
  for (const phase of Object.keys(evidenceByPhase)) {
    if (!selectedPhases.has(phase)) {
      throw new Error(`task551_implement_evidence_unrequested_phase:${phase}`);
    }
  }
  for (const dispatch of dispatches)
    boundEvidence.set(
      dispatch.phase,
      bindEvidenceRequests(dispatch.phase, evidenceByPhase[dispatch.phase])
    );
  if (
    testSeam &&
    ([...boundEvidence.values()].some((requests) => requests.length !== 0) ||
      dispatches.some((dispatch) => dispatch.phase === "05-l02"))
  ) {
    requireRunner(evidenceWriter, "evidenceWriter");
  }

  const phaseReports = [];
  for (const dispatch of dispatches) {
    const { phase } = dispatch;
    const dependencyAuthorization = beginTask551Occurrence({
      permit: authorAuditDispatch,
      binding,
      dispatch,
      ledger,
    });
    let occurrenceComplete = false;
    try {
      const plan = planTask551PhaseDispatch(dispatch);
      const startLeaf = async () => {
        await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
        return leafDispatcher({
          phase,
          taskId: dispatch.taskId,
          occurrenceId: dispatch.occurrenceId,
          id: dispatch.id,
          allowedPaths: plan.allowedPaths,
          forbiddenPaths: plan.forbiddenPaths,
          commands: plan.commands,
          dependencyAuthorization,
        });
      };
      let predecessorSnapshot,
        activeSnapshot,
        gateStart = 0,
        fixRoundsUsed = 0,
        l02SubgateExecutor = null,
        terminalOutcomes = [],
        commitA = null;
      if (phase === "l02") {
        const { classifier: subgate, boundary } = requireTask551L02SubgatePlan(plan);
        const l03Completion = requireTask551L03Completion(authorAuditDispatch, binding);
        {
          await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
          const materialized = requireTask551L02BarrierResult(
            await l02PreBarrierMaterializer({ phase, subgate, dependencyAuthorization }),
            ["l03CheckEvidence"],
            "task551_implement_l02_materializer_invalid"
          );
          if (
            requireTask551L03CheckDigest(materialized.l03CheckEvidence) !==
            l03Completion.acceptedEvidenceDigest
          ) {
            throw new Error("task551_implement_l02_l03_check_evidence_stale");
          }
        }
        const l03EvidenceProof = task551L03CheckProof(l03Completion);
        const precheck = async (stage, operation = null) => {
          const current = await readTask551CurrentWorktree(
            currentWorktreeSnapshotProvider,
            dispatch,
            stage,
            operation
          );
          const state = captureTask551L01PreClassifierBarrier({
            auditSnapshot,
            currentWorktree: current,
            l03EvidenceProof,
          });
          return Object.freeze({
            current,
            digest: task551L11BarrierCurrentWorktreeDigest(current),
            l03EvidenceProof: state.l03EvidenceProof,
          });
        };
        let before = await precheck("before-classifier"),
          prefixFailure = null,
          barrier = null;
        const runClassifierPrefixCommand = Object.freeze(async (operation) => {
          const gate = plan.gates.find((candidate) => candidate.operation === operation);
          if (gate === undefined) return false;
          const attempt = await precheck("before-prefix-gate", gate.operation);
          if (!task551SameL02Precheck(attempt, before))
            throw new Error("task551_implement_l02_pre_classifier_byte_drift");
          await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
          const result = task551PrefixReceipt(
            gate,
            await gateRunner({ phase, gate }),
            attempt.digest
          );
          if (result.outcome.pass) return true;
          if (fixAgent === null) {
            prefixFailure = failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
              phase,
              gateId: gate.gateId,
              code: result.outcome.code,
              fixRoundsUsed,
              phaseReports,
            });
            return false;
          }
          if (fixRoundsUsed >= maxFixRounds) {
            prefixFailure = failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.fixLoopFailed,
              phase,
              gateId: gate.gateId,
              code: "task551_fix_rounds_exhausted",
              fixRoundsUsed,
              phaseReports,
            });
            return false;
          }
          let repaired = null;
          const fixOutcome = await runTask551FixLoop({
            failedGate: {
              gateId: gate.gateId,
              scope: phase,
              exitCode: result.outcome.exitCode,
              signalCode: result.outcome.signalCode,
            },
            allowedPaths: plan.allowedPaths,
            fixAgent: async (invocation) => {
              await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
              return fixAgent({ ...invocation, phase, gate });
            },
            maxRounds: maxFixRounds - fixRoundsUsed,
            timeoutMs,
            verifyRunner: async () => {
              const retry = await precheck("prefix-fix-verify", gate.operation);
              if (repaired === null || !task551SameL02Precheck(retry, repaired))
                throw new Error("task551_implement_l02_pre_classifier_byte_drift");
              await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
              return {
                pass: task551PrefixReceipt(gate, await gateRunner({ phase, gate }), retry.digest)
                  .outcome.pass,
              };
            },
            authoritativeSnapshotProvider: async ({ phase: fixStage }) => {
              const observed = await precheck(`prefix-fix-${fixStage}`, gate.operation);
              if (fixStage === "before" && !task551SameL02Precheck(observed, before))
                throw new Error("task551_implement_l02_pre_classifier_byte_drift");
              if (fixStage === "after") repaired = observed;
              return {
                files: observed.current.files.map(({ path, sha256 }) => ({ path, digest: sha256 })),
              };
            },
          });
          fixRoundsUsed += fixOutcome.rounds;
          if (!fixOutcome.pass) {
            prefixFailure = failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.fixLoopFailed,
              phase,
              gateId: gate.gateId,
              code: fixOutcome.terminalCode,
              fixRoundsUsed,
              phaseReports,
            });
            return false;
          }
          if (repaired === null) throw new Error("task551_implement_l02_fix_snapshot_missing");
          before = repaired;
          return "restart";
        });
        const runClassifierMaterialization = Object.freeze(async (injectedSubgate) => {
          await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
          const classifier = requireTask551L02BarrierResult(
            await classifierBarrierRunner({
              phase,
              subgate: injectedSubgate,
              dependencyAuthorization,
              l03EvidenceProof: before.l03EvidenceProof,
            }),
            ["fourTestReceipt", "classifierReceipt", "manifest", "postGeneratorReceipts"],
            "task551_implement_l02_classifier_invalid"
          );
          const afterClassifierWorktree = await readTask551CurrentWorktree(
            currentWorktreeSnapshotProvider,
            dispatch,
            "after-classifier"
          );
          barrier = captureTask551L01MaterializationBarrier({
            auditSnapshot,
            beforeClassifierWorktree: before.current,
            afterClassifierWorktree,
            ...classifier,
            l03EvidenceProof: before.l03EvidenceProof,
          });
          return true;
        });
        const runReviewedPairTransition = Object.freeze(async (injectedSubgate) => {
          await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
          return (
            (await l02ReviewedTransitionRunner({
              phase,
              subgate: injectedSubgate,
              dependencyAuthorization,
            })) === true
          );
        });
        l02SubgateExecutor = createTask551L02SubgateExecutorV2(
          Object.freeze({
            commandIds: Object.freeze(plan.gates.map((gate) => gate.operation)),
            subgates: plan.subgates,
          }),
          Object.freeze({
            runClassifierPrefixCommand,
            runClassifierMaterialization,
            runReviewedPairTransition,
          })
        );
        if ((await l02SubgateExecutor.runClassifierPrefix()) !== true) {
          return (
            prefixFailure ??
            failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
              phase,
              gateId: subgate.id,
              code: "task551_l02_classifier_materialization_failed",
              fixRoundsUsed,
              phaseReports,
            })
          );
        }
        const settled = await precheck("before-classifier");
        if (!task551SameL02Precheck(settled, before))
          throw new Error("task551_implement_l02_pre_classifier_byte_drift");
        before = settled;
        if (
          (await l02SubgateExecutor.runClassifierMaterialization()) !== true ||
          barrier === null
        ) {
          return failClosed({
            terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
            phase,
            gateId: subgate.id,
            code: "task551_l02_classifier_materialization_failed",
            fixRoundsUsed,
            phaseReports,
          });
        }
        const beforeLeaf = await readTask551CurrentWorktree(
          currentWorktreeSnapshotProvider,
          dispatch,
          "before-l02-leaf"
        );
        requireTask551L01MaterializationBarrierBeforeL02(barrier, beforeLeaf);
        predecessorSnapshot = captureTask551PreSpawnWorktreeSnapshot(
          phase,
          auditSnapshot,
          beforeLeaf
        );
        recordTask551L02MaterializationForWorkflow(
          authorAuditDispatch,
          binding.graphDigest,
          beforeLeaf
        );
        const leaf = await startLeaf(),
          afterLeaf = await readTask551CurrentWorktree(
            currentWorktreeSnapshotProvider,
            dispatch,
            "after-leaf"
          );
        requireTask551PredecessorWorktreeSnapshotBeforeSpawn(phase, predecessorSnapshot, afterLeaf);
        activeSnapshot = captureTask551MaterializedWorktreeSnapshot(
          phase,
          predecessorSnapshot,
          afterLeaf
        );
        requireTask551ObservedLeafChangeSet(dispatch, leaf?.changedPaths, beforeLeaf, afterLeaf);
        gateStart = boundary;
      } else {
        const beforeLeaf = await readTask551CurrentWorktree(
          currentWorktreeSnapshotProvider,
          dispatch,
          "before-leaf"
        );
        predecessorSnapshot = captureTask551PreSpawnWorktreeSnapshot(
          phase,
          auditSnapshot,
          beforeLeaf
        );
        if (phase === "05-l02")
          commitA = requireTask551CommitAObservation(
            await commitAObserver({ phase, auditSourceHead: binding.sourceHead })
          );
        const leaf = await startLeaf(),
          afterLeaf = await readTask551CurrentWorktree(
            currentWorktreeSnapshotProvider,
            dispatch,
            "after-leaf"
          );
        requireTask551PredecessorWorktreeSnapshotBeforeSpawn(phase, predecessorSnapshot, afterLeaf);
        activeSnapshot =
          phase === "l01"
            ? null
            : captureTask551MaterializedWorktreeSnapshot(phase, predecessorSnapshot, afterLeaf);
        requireTask551ObservedLeafChangeSet(dispatch, leaf?.changedPaths, beforeLeaf, afterLeaf);
      }
      let runtimeOutputs = null,
        terminalEvidence = null;
      const evidenceReceipts = [];
      let phaseEvidence = boundEvidence.get(phase) ?? Object.freeze([]);
      const consumedEvidence = new Set();
      const writeBoundEvidence = async (request, operation) => {
        const writer = testSeam ? evidenceWriter : publishTask551PhaseEvidence;
        await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
        const receipt = await writer({
          ...request,
          manifestRow: request.manifestRow,
          workflowPhase: phase,
          operation,
        });
        consumedEvidence.add(request.manifestRow.path);
        const boundReceipt = requireReceipt(receipt, phase, operation, request.manifestRow);
        evidenceReceipts.push(boundReceipt);
        return boundReceipt;
      };
      const writeEvidenceForOperation = async (gate) => {
        if (phaseEvidence.length === 0) return;
        const matching = phaseEvidence.filter(
          (request) => request.manifestRow.phase === gate.evidencePhase
        );
        for (const request of matching) {
          if (consumedEvidence.has(request.manifestRow.path)) {
            throw new Error(`task551_implement_evidence_duplicate:${request.manifestRow.path}`);
          }
          await writeBoundEvidence(request, gate.operation);
        }
      };
      const invokeGate = async (gate) => {
        const gateCurrent = await readTask551CurrentWorktree(
          currentWorktreeSnapshotProvider,
          dispatch,
          "before-gate",
          gate.operation
        );
        requireTask551CurrentWorktreeFence(phase, predecessorSnapshot, activeSnapshot, gateCurrent);
        let child;
        if (phase === "l03" && gate.requiresSource) {
          await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
          child = await runTask551SourceBoundChild({
            phase,
            operation: gate.operation,
            phaseSourceProvider,
            phaseChildStarter,
            phaseResourceDisposer,
          });
        }
        await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
        const raw = await gateRunner({ phase, gate, child });
        return phase === "05-l02"
          ? requireTask55105L02Outcome(dispatch, gate, raw)
          : evaluateTask551GateOutcome(gate, raw);
      };
      for (let index = gateStart; index < plan.gates.length; index += 1) {
        const gate = plan.gates[index];
        if (
          l02SubgateExecutor !== null &&
          (await l02SubgateExecutor.beforeCommand(gate.operation)) !== true
        ) {
          return failClosed({
            terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
            phase,
            gateId: gate.gateId,
            code: "task551_l02_reviewed_transition_failed",
            fixRoundsUsed,
            phaseReports,
          });
        }
        let outcome = await invokeGate(gate);
        if (!outcome.pass) {
          if (fixAgent === null)
            return failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
              phase,
              gateId: gate.gateId,
              code: outcome.code,
              fixRoundsUsed,
              phaseReports,
            });
          if (fixRoundsUsed >= maxFixRounds)
            return failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.fixLoopFailed,
              phase,
              gateId: gate.gateId,
              code: "task551_fix_rounds_exhausted",
              fixRoundsUsed,
              phaseReports,
            });
          const fixOutcome = await runTask551FixLoop({
            failedGate: {
              gateId: gate.gateId,
              scope: phase,
              exitCode: outcome.exitCode,
              signalCode: outcome.signalCode,
            },
            allowedPaths: plan.allowedPaths,
            fixAgent: async (invocation) => {
              await awaitTask551EvidencePreflight(testSeam, evidencePreflight);
              return fixAgent({ ...invocation, phase, gate });
            },
            verifyRunner: async () => ({ pass: (await invokeGate(gate)).pass }),
            authoritativeSnapshotProvider: async ({ phase: fixStage }) => {
              const current = await readTask551CurrentWorktree(
                currentWorktreeSnapshotProvider,
                dispatch,
                `fix-${fixStage}`,
                gate.operation
              );
              if (activeSnapshot === null)
                throw new Error(`task551_implement_fix_before_materialization:${phase}`);
              activeSnapshot =
                fixStage === "after"
                  ? captureTask551MaterializedWorktreeSnapshot(phase, predecessorSnapshot, current)
                  : (requireTask551CurrentWorktreeFence(
                      phase,
                      predecessorSnapshot,
                      activeSnapshot,
                      current
                    ),
                    activeSnapshot);
              return { files: current.files.map(({ path, sha256 }) => ({ path, digest: sha256 })) };
            },
            maxRounds: maxFixRounds - fixRoundsUsed,
            timeoutMs,
          });
          fixRoundsUsed += fixOutcome.rounds;
          if (!fixOutcome.pass)
            return failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.fixLoopFailed,
              phase,
              gateId: gate.gateId,
              code: fixOutcome.terminalCode,
              fixRoundsUsed,
              phaseReports,
            });
          outcome =
            phase === "05-l02"
              ? await invokeGate(gate)
              : Object.freeze({ ...outcome, pass: true, code: null });
        }
        if (!outcome.pass) continue;
        if (l02SubgateExecutor !== null) l02SubgateExecutor.completeCommand(gate.operation);
        if (producesTask551RuntimeOutput(dispatch, gate)) {
          runtimeOutputs = await observeRuntimeOutputs({
            phase,
            operation: gate.operation,
            runtimeOutputObserver,
          });
          if (runtimeOutputs?.missing)
            return failClosed({
              terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
              phase,
              gateId: gate.gateId,
              code: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
              fixRoundsUsed,
              phaseReports,
            });
        }
        if (phase === "05-l02") terminalOutcomes.push(outcome.terminalOutcome);
        if (phase === "l03") await writeEvidenceForOperation(gate);
      }
      if (l02SubgateExecutor !== null) {
        l02SubgateExecutor.requireFinalLeafClosure();
        const current = await readTask551CurrentWorktree(
          currentWorktreeSnapshotProvider,
          dispatch,
          "after-l02-final-closure"
        );
        requireTask551CurrentWorktreeFence(phase, predecessorSnapshot, activeSnapshot, current);
      }
      if (phase === "05-l02") {
        requireTask55105L02Outcomes(dispatch, plan, terminalOutcomes);
        terminalOutcomes = [];
        const current = await readTask551CurrentWorktree(
          currentWorktreeSnapshotProvider,
          dispatch,
          "before-predecessor-seam"
        );
        requireTask551CurrentWorktreeFence(phase, predecessorSnapshot, activeSnapshot, current);
        const predecessor = await prepareTask55105L02PredecessorEvidenceAtNamedSeam(
          authorAuditDispatch,
          binding.graphDigest,
          current,
          privateL02Materialization
        );
        const predecessorRequest = Object.freeze({
          manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[9],
          value: predecessor.predecessorValue,
        });
        const predecessorReceipt = await writeBoundEvidence(
          predecessorRequest,
          "task489-predecessor"
        );
        requireTask551EvidenceWriteReceiptDigest(
          predecessorRequest.manifestRow,
          predecessorRequest.value,
          predecessorReceipt
        );
        const terminal = buildTask55105L02PromotionAtNamedSeam(
          predecessor,
          commitA,
          predecessorReceipt
        );
        const promotionRequest = Object.freeze({
          manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[10],
          value: terminal.promotionValue,
        });
        const promotionReceipt = await writeBoundEvidence(
          promotionRequest,
          "task489-predecessor-promotion"
        );
        terminalEvidence = Object.freeze([predecessorRequest, promotionRequest]);
        terminalEvidence = Object.freeze({
          requests: terminalEvidence,
          terminal,
          predecessorReceipt,
          promotionReceipt,
        });
      }
      if (phase !== "l03") {
        for (const request of phaseEvidence) {
          if (consumedEvidence.has(request.manifestRow.path)) continue;
          await writeBoundEvidence(request, "phase-complete");
        }
      }
      requireExactEvidenceReceiptCoverage(
        phase,
        terminalEvidence?.requests ?? phaseEvidence,
        evidenceReceipts
      );
      if (phase === "l03")
        recordTask551L03Completion(authorAuditDispatch, binding, activeSnapshot, evidenceReceipts);
      if (commitA !== null) {
        const terminalHandoff = await terminalFenceObserver({
          phase,
          sourceHead: commitA.sourceHead,
          sourceDigest: terminalEvidence.terminal.sourceDigest,
          predecessorEvidenceDigest: terminalEvidence.predecessorReceipt.digest,
          promotionEvidenceDigest: terminalEvidence.promotionReceipt.digest,
        });
        await verifyTask551TerminalCommittedHeadHandoff(terminalHandoff);
        requireTask551TerminalEvidenceHandoffBinding(
          terminalHandoff,
          terminalEvidence.terminal,
          terminalEvidence.predecessorReceipt,
          terminalEvidence.promotionReceipt
        );
        if (terminalHandoff.sourceHead !== commitA.sourceHead)
          throw new Error("task551_implement_terminal_source_head_mismatch");
      }
      phaseReports.push(
        Object.freeze({
          phase,
          id: dispatch.id,
          occurrenceId: dispatch.occurrenceId,
          gatesRun: plan.gates.length,
          fixRoundsUsed,
          runtimeOutputs,
          evidenceReceipts: Object.freeze(evidenceReceipts),
        })
      );
      completeTask551Occurrence(dependencyAuthorization, ledger, dispatch);
      occurrenceComplete = true;
    } finally {
      if (!occurrenceComplete) abandonTask551Occurrence(ledger, dispatch);
    }
  }
  return Object.freeze({
    pass: true,
    phases: Object.freeze(phaseReports),
    phase: null,
    gateId: null,
    code: null,
    fixRoundsUsed: 0,
    terminalCode: null,
  });
}
async function runTask551PreL02ClosureWork(input, receipt) {
  const config = requireTask551ImplementInput(input ?? {}, false);
  requireTask551ProductionDispatchPermit(config.authorAuditDispatch);
  const authorAudit = admitTask551WorkflowCompatibilityAuthorAuditV2(receipt, (complete) =>
    complete()
  );
  const graph = admitTask551WorkflowCompatibilityGraphV2(receipt, authorAudit, (complete) => {
    deriveTask551ImplementLandOrder(config.authorAuditDispatch, config.scheduledOccurrenceIds);
    return complete();
  });
  await runTask551ImplementWorkflowInternal(input, undefined);
  const l02Materialization = requireTask551RecordedL02MaterializationForWorkflow(
    config.authorAuditDispatch,
    requireTask551ProductionDispatchPermit(config.authorAuditDispatch).graphDigest
  );
  admitTask551WorkflowCompatibilityL02V2(receipt, graph, (complete) => complete());
  return l02Materialization;
}
async function runTask551L02WorkflowEvidence(input, l02Materialization) {
  return runTask551ImplementWorkflowInternal(input, undefined, l02Materialization);
}
export async function runTask551ImplementWorkflow(input) {
  const receipt = runTask551WorkflowCompatibilityBootstrapV2();
  const config = requireTask551ImplementInput(input ?? {}, false);
  requireTask551ProductionDispatchPermit(config.authorAuditDispatch);
  await bootstrapTask551EvidenceStorageForOwnerWorkflowHost();
  await awaitTask551EvidencePreflight(false, null);
  const l02Materialization = requireTask551L02CodeTestMaterializationClosureV1(
    await runTask551PreL02ClosureWork(input, receipt)
  );
  const { runTask551L02OwnerHostInSameRealm } =
    await import("../../scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts");
  if (typeof runTask551L02OwnerHostInSameRealm !== "function")
    throw new Error("task551_implement_l02_owner_host_invalid");
  return runTask551L02OwnerHostInSameRealm(() =>
    runTask551L02WorkflowEvidence(input, l02Materialization)
  );
}
export async function runTask551ImplementWorkflowForTests(input) {
  return runTask551ImplementWorkflowInternal(input, TEST_SEAM_PHASE);
}
function requireRunner(value, label) {
  if (typeof value !== "function") {
    throw new Error(`task551_implement_runner_missing:${label}`);
  }
}

function failClosed({ terminalCode, phase, gateId, code, fixRoundsUsed, phaseReports }) {
  return Object.freeze({
    pass: false,
    phases: Object.freeze([...phaseReports]),
    phase,
    gateId,
    code,
    fixRoundsUsed,
    terminalCode,
  });
}
