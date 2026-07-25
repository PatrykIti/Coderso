import { TASK_FAILURE } from "../config.mjs";
import { canonicalJson, deepFreezeExact, invariant } from "../foundation.mjs";

export function createSettlementDiagnosticHarness({
  LocalCommandAuthority,
  bootstrapSettlementAction,
  buildFakeCapabilities,
  compileActionExecutionSpec,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  diagnosticInput,
  executeTask540SmokePlanWithAuthorityFactory,
  incrementNegativeCases,
  plan,
}) {
  const settlementTwinAction = plan.actionManifest.find(({ id }) => id === "set-011-login-submit");
  invariant(settlementTwinAction !== undefined, "auth settlement non-auth twin is absent");
  const settlementPrivateMarker = "TASK540_SETTLEMENT_PRIVATE_DO_NOT_EGRESS";
  const createSensitiveScanProbe = (...values) => {
    let calls = 0;
    const sensitiveValues = [...values];
    Object.defineProperty(sensitiveValues, "some", {
      value(predicate, thisArg) {
        calls += 1;
        return Array.prototype.some.call(values, predicate, thisArg);
      },
    });
    return Object.freeze({
      sensitiveValues,
      calls: () => calls,
    });
  };
  const runSettlementDiagnosticCase = async ({
    label,
    actionId = bootstrapSettlementAction.id,
    expectedFailureClass = null,
    operationMustReject = true,
    operation,
  }) => {
    const capabilities = buildFakeCapabilities();
    const executeAction = capabilities.executeAction.bind(capabilities);
    let operationCalls = 0;
    let operationRejected = false;
    capabilities.executeAction = async (context) => {
      if (context.action.id !== actionId) return executeAction(context);
      operationCalls += 1;
      try {
        await operation(context);
      } catch (error) {
        operationRejected = true;
        throw error;
      }
      throw new Error(settlementPrivateMarker);
    };
    const lines = [];
    const sink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
      invariant(
        capabilities.cleaned && capabilities.calls.at(-1) === "failure-cleanup",
        label + " diagnostic preceded cleanup"
      );
      lines.push(line);
    });
    let publicFailure = null;
    try {
      await executeTask540SmokePlanWithAuthorityFactory(
        diagnosticInput,
        createPrivateConstructionCleanupAuthority,
        async () => capabilities,
        sink
      );
    } catch (error) {
      publicFailure = error;
    }
    const expectedLine =
      canonicalJson({
        code: TASK_FAILURE.code,
        failedActionId: actionId,
        ...(expectedFailureClass === null ? {} : { failureClass: expectedFailureClass }),
      }) + "\n";
    invariant(
      publicFailure === TASK_FAILURE &&
        operationCalls === 1 &&
        operationRejected === operationMustReject &&
        capabilities.cleanupExecutions === 1 &&
        lines.length === 1 &&
        lines[0] === expectedLine &&
        !lines[0].includes(settlementPrivateMarker),
      label + " settlement diagnostic pipeline drift"
    );
    incrementNegativeCases();
  };
  const cleanRepositorySnapshot = deepFreezeExact({ paths: [], hashes: {} });
  const changedRepositorySnapshot = deepFreezeExact({
    paths: ["private-stage-change"],
    hashes: { "private-stage-change": "changed" },
  });
  const createRetainedExecution = ({
    stdout = Buffer.from('{"ok":true}\n'),
    stderr = Buffer.alloc(0),
    stdoutExceeded = false,
    stderrExceeded = false,
    timedOut = false,
    spawnError = false,
    code = 0,
    terminationAbsent = true,
  } = {}) =>
    Object.freeze({
      completion: Object.freeze({ code, signal: null }),
      timedOut,
      spawnError,
      stdout: Object.freeze({ bytes: Buffer.from(stdout), exceeded: stdoutExceeded }),
      stderr: Object.freeze({ bytes: Buffer.from(stderr), exceeded: stderrExceeded }),
      termination: Object.freeze({ absent: terminationAbsent }),
    });
  const runLocalAuthority = async (
    { action },
    {
      program = "playwright-cli",
      args = ["--raw", "self-test"],
      displayArgs = args,
      stdoutDiscarded = false,
      sequence = 1,
      execution = createRetainedExecution(),
      runnerThrows = false,
      preSnapshotThrows = false,
      postSnapshotThrows = false,
      changedRepository = false,
      sensitiveValues = [settlementPrivateMarker],
      receiptThrows = false,
      assertAfter = null,
    } = {}
  ) => {
    let snapshotCalls = 0;
    let runnerCalls = 0;
    const authority = new LocalCommandAuthority(
      {
        root: "/task540-self-test-root",
        assertSafeEvidence() {
          if (receiptThrows) throw new Error(settlementPrivateMarker);
        },
        async snapshotRepository() {
          snapshotCalls += 1;
          if (preSnapshotThrows && snapshotCalls === 1) {
            throw new Error(settlementPrivateMarker);
          }
          if (postSnapshotThrows && snapshotCalls === 2) {
            throw new Error(settlementPrivateMarker);
          }
          return changedRepository && snapshotCalls === 2
            ? changedRepositorySnapshot
            : cleanRepositorySnapshot;
        },
        sensitiveValues,
      },
      async () => {
        runnerCalls += 1;
        if (runnerThrows) throw new Error(settlementPrivateMarker);
        return execution;
      }
    );
    try {
      return await authority.executeProgram({
        action,
        program,
        args,
        displayArgs,
        stdoutDiscarded,
        sequence,
        operation: compileActionExecutionSpec(action).operation,
        routeKey: null,
        assertionName: null,
        cwd: "/task540-self-test-root",
        env: Object.freeze({}),
      });
    } finally {
      if (assertAfter !== null) assertAfter({ snapshotCalls, runnerCalls });
    }
  };

  return {
    settlementTwinAction,
    settlementPrivateMarker,
    createSensitiveScanProbe,
    runSettlementDiagnosticCase,
    createRetainedExecution,
    runLocalAuthority,
  };
}
