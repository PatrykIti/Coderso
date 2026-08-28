// TASK-551-11 sequential implementation workflow module (single owner: TASK-551-11 sidecar).
//
// Orchestrates sequential product subtask dispatch in the declared land order
// with phase-scoped gates, single-writer ownership enforcement via the contract
// library's provenance/closed-allowlist projections, pre-spawn tracked/HEAD
// fences over INJECTED git snapshots, a bounded fix loop, runtime-output
// validation immediately after its producing operation, and evidence writing
// only through the library's no-replace durable writer.
//
// This module owns no evidence writer, recovery protocol, phase list, command
// alias for canonical registry forms, source parser, or owner-capability
// substitute. Gate argvs are orchestration-owned only where they are not part of
// the library's canonical logical-command registry.

import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  materializeTask551Command,
  requireExactClosedPaths,
  requireNoUnexpectedDirtyOrUntrackedRequiredPath,
  requireTask551ContractIntegrity,
  requireTask551PhaseProvenanceImmediatelyBeforeSpawn,
  requireTrackedRegularNonSymlinkFilesAtHead,
  validateTask551EvidenceValue,
  writeTask551EvidenceFileIfAbsent,
} from "./lib/task-551-contract.mjs";
import { runTask551FixLoop } from "./task-551-fix.mjs";

/** Hard ceiling mandated by the task contract: at most three fix rounds. */
export const TASK551_IMPLEMENT_MAX_FIX_ROUNDS = 3;

export const TASK551_IMPLEMENT_TERMINAL_CODES = Object.freeze({
  gateFailedNoFixer: "task551_implement_gate_failed_no_fixer",
  fixLoopFailed: "task551_implement_fix_loop_failed",
  runtimeObserverMissing: "task551_implement_runtime_observer_missing",
});

const DISPATCHABLE_PHASES = Object.freeze(["l01", "l03", "l02", "05-l02"]);
const TEST_SEAM_PHASE = Symbol("task551-implement-test-seam");

/** Evidence phases owned by each dispatch phase; values are canonical manifest phases. */
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

const RUNTIME_OUTPUT_PRODUCERS = Object.freeze({
  l01: "leaf-dispatch",
  "05-l02": "05-l02-explain-large",
});

const L03_GATE_TEMPLATES = Object.freeze([
  Object.freeze({
    gateId: "l03-focused-test",
    commandId: "l03-focused-test",
    kind: "test",
    operation: "l03-focused-test",
    requiresSource: false,
    evidencePhase: null,
  }),
  Object.freeze({
    gateId: "l03-initialize",
    commandId: "l03-initialize",
    kind: "command",
    operation: "l03-initialize",
    requiresSource: true,
    evidencePhase: "l03-initialize",
  }),
  Object.freeze({
    gateId: "l03-check",
    commandId: "l03-check",
    kind: "command",
    operation: "l03-check",
    requiresSource: true,
    evidencePhase: "l03-check",
  }),
]);

/**
 * The dispatch land order is a projection of the one canonical phase array in
 * library order. The sidecar is this module and is never dispatched as a leaf.
 */
export function deriveTask551ImplementLandOrder() {
  return Object.freeze(
    TASK551_PHASE_PROVENANCE.map((phase) => phase.phase).filter((phase) => phase !== "sidecar")
  );
}

function requireDispatchablePhase(phase, label = "phase") {
  if (!DISPATCHABLE_PHASES.includes(phase)) {
    throw new Error(`task551_implement_${label}_unknown:${String(phase)}`);
  }
}

/**
 * Lane selection by dependency shape per the testing strategy: tests/unit/*
 * is the Bun-free Vitest lane by default; every runtime/DB/integration path
 * (tests/perf, tests/integration) is Bun-owned.
 */
export function laneForTask551TestPath(testPath) {
  if (typeof testPath !== "string" || !testPath.startsWith("tests/")) {
    throw new Error(`task551_gate_test_path_unknown:${String(testPath)}`);
  }
  if (!testPath.endsWith(".test.ts")) {
    throw new Error(`task551_gate_test_path_not_test:${testPath}`);
  }
  return testPath.startsWith("tests/unit/") ? "vitest" : "bun";
}

const STATIC_GATE_TEMPLATES = Object.freeze([
  Object.freeze({
    gateId: "core-lint-types",
    kind: "static",
    operation: "core-lint-types",
    argv: Object.freeze(["bun", "--cwd", "core", "lint:types"]),
  }),
  Object.freeze({
    gateId: "core-lint",
    kind: "static",
    operation: "core-lint",
    argv: Object.freeze(["bun", "--cwd", "core", "lint"]),
  }),
]);

const FIVE_L02_COMMAND_TEMPLATES = Object.freeze([
  Object.freeze({
    gateId: "05-l02-explain-large",
    kind: "command",
    commandId: "05-l02-explain-large",
    operation: "05-l02-explain-large",
  }),
]);

function materializeL03Gate(template) {
  return Object.freeze({
    gateId: template.gateId,
    kind: template.kind,
    operation: template.operation,
    commandId: template.commandId,
    requiresSource: template.requiresSource,
    evidencePhase: template.evidencePhase,
    argv: Object.freeze(materializeTask551Command(template.commandId)),
  });
}

/**
 * Ordered, phase-scoped gate plan. L03 is intentionally not the generic core
 * gate plan: it has exactly focused-test -> initialize -> check, using the
 * canonical registry argv for every operation.
 */
export function buildTask551SubtaskGates(phase) {
  requireDispatchablePhase(phase, "gate_phase");
  if (phase === "l03") {
    return Object.freeze(L03_GATE_TEMPLATES.map(materializeL03Gate));
  }
  const entry = TASK551_PHASE_PROVENANCE.find((candidate) => candidate.phase === phase);
  if (entry === undefined) {
    throw new Error(`task551_gate_phase_unknown:${String(phase)}`);
  }
  const gates = [...STATIC_GATE_TEMPLATES];
  for (const ownedTest of entry.ownedTests) {
    const lane = laneForTask551TestPath(ownedTest);
    const argv = lane === "bun" ? ["bun", "test", ownedTest] : ["bunx", "vitest", "run", ownedTest];
    gates.push(
      Object.freeze({
        gateId: `test:${ownedTest}`,
        kind: "test",
        lane,
        operation: `test:${ownedTest}`,
        argv: Object.freeze(argv),
      })
    );
  }
  if (phase === "05-l02") {
    for (const template of FIVE_L02_COMMAND_TEMPLATES) {
      gates.push(
        Object.freeze({
          gateId: template.gateId,
          kind: template.kind,
          operation: template.operation,
          commandId: template.commandId,
          argv: Object.freeze(materializeTask551Command(template.commandId)),
        })
      );
    }
  }
  return Object.freeze(gates);
}

/**
 * Pre-dispatch tracked/HEAD fence over an injected git snapshot. L03/L02/05-L02
 * use the library's full immediate pre-spawn fence; L01 uses the same library
 * primitives directly because its dispatch precedes any fixture child spawn.
 */
export function requireTask551LeafDispatchFence(phase, head) {
  requireDispatchablePhase(phase, "dispatch_phase");
  if (phase === "l03" || phase === "l02" || phase === "05-l02") {
    return requireTask551PhaseProvenanceImmediatelyBeforeSpawn(phase, head);
  }
  requireTrackedRegularNonSymlinkFilesAtHead(TASK551_PHASE_IMPORT_CLOSURE.get("l01"), head);
  requireNoUnexpectedDirtyOrUntrackedRequiredPath(head);
  return true;
}

/**
 * Single-writer enforcement: every changed path of a dispatched leaf must sit
 * inside its owning phase's closed allowlist exactly once.
 */
export function requireTask551SingleWriterChangeSet(phase, changedPaths) {
  requireDispatchablePhase(phase, "dispatch_phase");
  const allowlist = TASK551_PHASE_CLOSED_ALLOWLIST.get(phase);
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
    if (!allowed.has(path)) {
      throw new Error(`task551_single_writer_violation:${phase}:${path}`);
    }
  }
  return true;
}

/**
 * Gate outcome evaluation over an injected runner result. Test gates require
 * positive discovery; canonical CLI gates require an explicit null discovery
 * marker. Unknown keys are rejected and only redacted identity is returned.
 */
export function evaluateTask551GateOutcome(gate, raw) {
  if (!gate || typeof gate.gateId !== "string") {
    throw new Error("task551_gate_descriptor_missing");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`task551_gate_result_not_object:${gate.gateId}`);
  }
  const knownKeys = new Set([
    "exitCode",
    "signalCode",
    "timedOut",
    "overflowed",
    "discoveredTestCount",
  ]);
  for (const key of Object.keys(raw)) {
    if (!knownKeys.has(key)) {
      throw new Error(`task551_gate_result_unknown_key:${gate.gateId}:${key}`);
    }
  }
  const {
    exitCode,
    signalCode = null,
    timedOut = false,
    overflowed = false,
    discoveredTestCount,
  } = raw;
  if (!Number.isInteger(exitCode)) {
    throw new Error(`task551_gate_exit_code_invalid:${gate.gateId}`);
  }
  if (signalCode !== null && signalCode !== undefined && typeof signalCode !== "string") {
    throw new Error(`task551_gate_signal_invalid:${gate.gateId}`);
  }
  const discoveryInvalid =
    gate.kind === "test"
      ? !Number.isInteger(discoveredTestCount) || discoveredTestCount <= 0
      : gate.kind === "command" && discoveredTestCount !== null;
  const pass =
    exitCode === 0 &&
    !signalCode &&
    timedOut === false &&
    overflowed === false &&
    !discoveryInvalid;
  let code = null;
  if (!pass) {
    code = timedOut
      ? "task551_gate_timeout"
      : overflowed
        ? "task551_gate_overflow"
        : signalCode
          ? "task551_gate_signalled"
          : discoveryInvalid
            ? "task551_gate_discovery_metadata_invalid"
            : "task551_gate_nonzero_exit";
  }
  return Object.freeze({
    pass,
    gateId: gate.gateId,
    exitCode,
    signalCode: signalCode ?? null,
    code,
  });
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

/** Combined pre-dispatch plan for one phase: fence, exact scope, and gates. */
export function planTask551PhaseDispatch(phase, head) {
  requireTask551LeafDispatchFence(phase, head);
  const allowedPaths = TASK551_PHASE_CLOSED_ALLOWLIST.get(phase);
  return Object.freeze({
    phase,
    allowedPaths,
    gates: buildTask551SubtaskGates(phase),
  });
}

function canonicalManifestRow(row) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return null;
  return TASK551_DURABLE_EVIDENCE_MANIFEST.find((candidate) => candidate === row) ?? null;
}

function phaseManifestRows(phase) {
  const phases = PHASE_EVIDENCE_PHASES[phase];
  return TASK551_DURABLE_EVIDENCE_MANIFEST.filter((row) => phases.includes(row.phase));
}

function bindEvidenceRequests(phase, requests) {
  if (requests === undefined) return Object.freeze([]);
  if (!Array.isArray(requests)) {
    throw new Error(`task551_implement_evidence_requests_not_array:${phase}`);
  }
  const rows = phaseManifestRows(phase);
  const allowedRows = new Set(rows);
  const seen = new Set();
  return Object.freeze(
    requests.map((request) => {
      if (request === null || typeof request !== "object" || Array.isArray(request)) {
        throw new Error(`task551_implement_evidence_request_invalid:${phase}`);
      }
      const row = canonicalManifestRow(request.manifestRow);
      if (row === null || !allowedRows.has(row)) {
        throw new Error(`task551_implement_evidence_manifest_phase_mismatch:${phase}`);
      }
      if (seen.has(row.path)) {
        throw new Error(`task551_implement_evidence_duplicate:${row.path}`);
      }
      seen.add(row.path);
      if ("phase" in request && request.phase !== phase && request.phase !== row.phase) {
        throw new Error(`task551_implement_evidence_request_phase_mismatch:${phase}`);
      }
      const validationError = validateTask551EvidenceValue(row, request.value);
      if (validationError !== null) throw new Error(validationError);
      return Object.freeze({ ...request, manifestRow: row });
    })
  );
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

function requireReceipt(receipt, phase, operation) {
  if (
    receipt === null ||
    typeof receipt !== "object" ||
    typeof receipt.path !== "string" ||
    typeof receipt.digest !== "string" ||
    typeof receipt.action !== "string"
  ) {
    throw new Error(`task551_implement_evidence_receipt_invalid:${phase}:${operation}`);
  }
  return Object.freeze({
    path: receipt.path,
    digest: receipt.digest,
    action: receipt.action,
  });
}

/** Sole evidence-writing seam: the library no-replace writer with canonical-row binding. */
export function publishTask551PhaseEvidence(request) {
  const row = canonicalManifestRow(request?.manifestRow);
  if (row === null) throw new Error("task551_implement_evidence_manifest_not_canonical");
  return writeTask551EvidenceFileIfAbsent({ ...request, manifestRow: row });
}

function requireMaxFixRounds(value) {
  if (!Number.isInteger(value) || value < 1 || value > TASK551_IMPLEMENT_MAX_FIX_ROUNDS) {
    throw new Error("task551_implement_max_fix_rounds_invalid");
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
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
  // The callback receives the producing operation and phase in the same turn
  // as production; it cannot be deferred to phase completion.
  const observed = await runtimeOutputObserver({ phase, operation });
  requireTask551RuntimeOutputsAfterProduction(phase, observed);
  return Object.freeze([...observed].sort());
}

/**
 * Sequential implementation workflow. All non-library injections are accepted
 * only through the explicit test seam. L03 source/map acquisition is skipped
 * for focused-test and fresh for initialize/check; each operation has its own
 * capture, cleanup, and evidence binding lifetime.
 */
async function runTask551ImplementWorkflowInternal(input, testSeamValue) {
  const config = input ?? {};
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("task551_implement_input_invalid");
  }
  const testSeam = testSeamValue === TEST_SEAM_PHASE;
  const requestedPhase = phaseSelection(config, testSeam);
  const {
    headSnapshotProvider,
    leafDispatcher,
    gateRunner,
    fixAgent = null,
    runtimeOutputObserver = null,
    evidenceWriter = publishTask551PhaseEvidence,
    evidenceByPhase = {},
    maxFixRounds = TASK551_IMPLEMENT_MAX_FIX_ROUNDS,
    timeoutMs = 600_000,
    phaseSourceProvider = null,
    phaseMapBuilder = null,
    phaseResourceDisposer = null,
  } = config;
  requireTask551ContractIntegrity();
  requireMaxFixRounds(maxFixRounds);
  requireRunner(headSnapshotProvider, "headSnapshotProvider");
  requireRunner(leafDispatcher, "leafDispatcher");
  requireRunner(gateRunner, "gateRunner");
  if (evidenceWriter !== publishTask551PhaseEvidence && !testSeam) {
    throw new Error("task551_implement_evidence_writer_requires_test_seam");
  }
  if (typeof phaseSourceProvider !== "function" && phaseSourceProvider !== null) {
    throw new Error("task551_implement_runner_missing:phaseSourceProvider");
  }
  if (typeof phaseMapBuilder !== "function" && phaseMapBuilder !== null) {
    throw new Error("task551_implement_runner_missing:phaseMapBuilder");
  }
  if (typeof phaseResourceDisposer !== "function" && phaseResourceDisposer !== null) {
    throw new Error("task551_implement_runner_missing:phaseResourceDisposer");
  }
  const phases =
    requestedPhase === null ? deriveTask551ImplementLandOrder() : Object.freeze([requestedPhase]);
  if (phases.includes("l03")) {
    requireRunner(phaseSourceProvider, "phaseSourceProvider");
    requireRunner(phaseMapBuilder, "phaseMapBuilder");
    requireRunner(phaseResourceDisposer, "phaseResourceDisposer");
  }
  requireEvidenceByPhaseShape(evidenceByPhase);
  const boundEvidence = new Map();
  for (const phase of Object.keys(evidenceByPhase)) {
    boundEvidence.set(phase, bindEvidenceRequests(phase, evidenceByPhase[phase]));
  }

  const phaseReports = [];
  for (const phase of phases) {
    const head = await headSnapshotProvider({ phase });
    const plan = planTask551PhaseDispatch(phase, head);
    const leaf = await leafDispatcher({ phase, allowedPaths: plan.allowedPaths });
    requireTask551SingleWriterChangeSet(phase, leaf?.changedPaths);

    let fixRoundsUsed = 0;
    let runtimeOutputs = null;
    const evidenceReceipts = [];
    const phaseEvidence = boundEvidence.get(phase) ?? Object.freeze([]);
    const consumedEvidence = new Set();

    // L01 produces its runtime artifact in the leaf dispatch itself. Observe it
    // before the first gate, not after the whole phase.
    if (RUNTIME_OUTPUT_PRODUCERS[phase] === "leaf-dispatch") {
      runtimeOutputs = await observeRuntimeOutputs({
        phase,
        operation: "leaf-dispatch",
        runtimeOutputObserver,
      });
      if (runtimeOutputs?.missing) {
        return failClosed({
          terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
          phase,
          gateId: null,
          code: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
          fixRoundsUsed,
          phaseReports,
        });
      }
    }

    const writeEvidenceForOperation = async (gate) => {
      if (phaseEvidence.length === 0) return;
      const matching = phaseEvidence.filter(
        (request) => request.manifestRow.phase === gate.evidencePhase
      );
      for (const request of matching) {
        if (consumedEvidence.has(request.manifestRow.path)) {
          throw new Error(`task551_implement_evidence_duplicate:${request.manifestRow.path}`);
        }
        const receipt = await evidenceWriter({
          ...request,
          manifestRow: request.manifestRow,
          workflowPhase: phase,
          operation: gate.operation,
        });
        consumedEvidence.add(request.manifestRow.path);
        evidenceReceipts.push(requireReceipt(receipt, phase, gate.operation));
      }
    };

    const invokeGate = async (gate) => {
      let source;
      let sourceMap;
      try {
        if (phase === "l03" && gate.requiresSource) {
          source = await phaseSourceProvider({ phase, operation: gate.operation });
          sourceMap = await phaseMapBuilder({ phase, operation: gate.operation, source });
        }
        const raw = await gateRunner({ phase, gate, source, sourceMap });
        return evaluateTask551GateOutcome(gate, raw);
      } finally {
        if (phase === "l03" && gate.requiresSource) {
          await phaseResourceDisposer({ phase, operation: gate.operation, source, sourceMap });
        }
        // Drop operation-bound references before any later operation begins.
        source = undefined;
        sourceMap = undefined;
      }
    };

    for (let index = 0; index < plan.gates.length; index += 1) {
      const gate = plan.gates[index];
      let outcome = await invokeGate(gate);
      if (!outcome.pass) {
        if (fixAgent === null) {
          return failClosed({
            terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.gateFailedNoFixer,
            phase,
            gateId: gate.gateId,
            code: outcome.code,
            fixRoundsUsed,
            phaseReports,
          });
        }
        const fixOutcome = await runTask551FixLoop({
          failedGate: {
            gateId: gate.gateId,
            scope: phase,
            exitCode: outcome.exitCode,
            signalCode: outcome.signalCode,
          },
          allowedPaths: plan.allowedPaths,
          fixAgent: (invocation) => fixAgent({ ...invocation, phase, gate }),
          verifyRunner: async () => ({ pass: (await invokeGate(gate)).pass }),
          maxRounds: maxFixRounds,
          timeoutMs,
        });
        fixRoundsUsed += fixOutcome.rounds;
        if (!fixOutcome.pass) {
          return failClosed({
            terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.fixLoopFailed,
            phase,
            gateId: gate.gateId,
            code: fixOutcome.terminalCode,
            fixRoundsUsed,
            phaseReports,
          });
        }
        // A successful fix verification is the gate's producing operation for
        // downstream evidence/output binding.
        outcome = Object.freeze({ ...outcome, pass: true, code: null });
      }
      if (!outcome.pass) continue;

      if (RUNTIME_OUTPUT_PRODUCERS[phase] === gate.operation) {
        runtimeOutputs = await observeRuntimeOutputs({
          phase,
          operation: gate.operation,
          runtimeOutputObserver,
        });
        if (runtimeOutputs?.missing) {
          return failClosed({
            terminalCode: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
            phase,
            gateId: gate.gateId,
            code: TASK551_IMPLEMENT_TERMINAL_CODES.runtimeObserverMissing,
            fixRoundsUsed,
            phaseReports,
          });
        }
      }

      // L03 writes initialize/check evidence immediately after its own command;
      // later phases retain their existing post-gates write boundary.
      if (phase === "l03") await writeEvidenceForOperation(gate);
    }

    if (phase !== "l03") {
      for (const request of phaseEvidence) {
        if (consumedEvidence.has(request.manifestRow.path)) continue;
        const receipt = await evidenceWriter({
          ...request,
          manifestRow: request.manifestRow,
          workflowPhase: phase,
          operation: "phase-complete",
        });
        consumedEvidence.add(request.manifestRow.path);
        evidenceReceipts.push(requireReceipt(receipt, phase, "phase-complete"));
      }
    }

    phaseReports.push(
      Object.freeze({
        phase,
        gatesRun: plan.gates.length,
        fixRoundsUsed,
        runtimeOutputs,
        evidenceReceipts: Object.freeze(evidenceReceipts),
      })
    );
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

export async function runTask551ImplementWorkflow(input) {
  return runTask551ImplementWorkflowInternal(input, undefined);
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
