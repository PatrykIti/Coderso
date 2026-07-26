import {
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  TASK_FAILURE,
  projectRuntimeInvariantToken,
} from "../config.mjs";
import { canonicalJson, deepFreezeExact, invariant } from "../foundation.mjs";
import { PRE_AUTHORITY_FAILURE_COUNT } from "../failure-boundary.mjs";
import { sameArtifactIdentity } from "../private-workspace.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { cleanupDiagnostics } from "../../cleanup/diagnostics.mjs";

const { retainPrivateCleanupAggregateDiagnosticNeverThrow } = cleanupDiagnostics;

export async function runConstructionCleanupSelfTest({
  PRIVATE_CONSTRUCTION_AUTHORITY,
  PRIVATE_FAILURE_ACTION_TRACKERS,
  PendingFailureAttemptRegistry,
  appendRetainedGroupMembers,
  assertNegative,
  buildFakeCapabilities,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  createPrivateDirtyNavigationFailure,
  createPrivateFailureActionTracker,
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  diagnosticInput,
  diagnosticPrivateMarker,
  dirtyNavigationFailureAction,
  dirtyNavigationPrivateMarker,
  emitPrivateFailureActionDiagnosticNeverThrow,
  executeSmokePlanCore,
  executeTask540SmokePlanWithAuthorityFactory,
  expectAsyncFailure,
  incrementNegativeCases,
  plan,
  privateConstructionAuthorityProjection,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  trackerAtAction,
  validateBunExecutableAuthorityObservation,
  writePrivateFailureActionDiagnosticOnceNeverThrow,
}) {
  const artifactIdentity = Object.freeze({
    dev: "1",
    ino: "2",
    type: "file",
    mode: 0o600,
    size: 10,
  });
  invariant(
    sameArtifactIdentity(artifactIdentity, { ...artifactIdentity }, { includeSize: true }),
    "workspace identity equality drift"
  );
  const bunExecutableIdentity = deepFreezeExact({
    dev: "62",
    ino: "540",
    mode: 0o755,
    size: 1024,
    type: "file",
  });
  const bunRootIdentity = deepFreezeExact({
    dev: "62",
    ino: "541",
    mode: 0o755,
    size: 128,
    type: "directory",
  });
  const bunCoreIdentity = deepFreezeExact({
    dev: "62",
    ino: "542",
    mode: 0o755,
    size: 128,
    type: "directory",
  });
  const bunExecutableAuthority = deepFreezeExact({
    coreIdentity: bunCoreIdentity,
    corePath: "/task540-self-test-root/core",
    executableIdentity: bunExecutableIdentity,
    executablePath: "/task540-self-test-bin/bun",
    pathValue: "/task540-self-test-bin:/usr/bin",
    rootIdentity: bunRootIdentity,
    rootPath: "/task540-self-test-root",
    selectedAliasPath: "/task540-self-test-bin/bun",
  });
  const bunExecutableObservation = deepFreezeExact({
    coreIdentity: bunCoreIdentity,
    coreRealPath: bunExecutableAuthority.corePath,
    currentPath: bunExecutableAuthority.pathValue,
    executableIdentity: bunExecutableIdentity,
    executableRealPath: bunExecutableAuthority.executablePath,
    rootIdentity: bunRootIdentity,
    rootRealPath: bunExecutableAuthority.rootPath,
    selectedAliasPath: bunExecutableAuthority.selectedAliasPath,
    selectedExecutableRealPath: bunExecutableAuthority.executablePath,
  });
  invariant(
    validateBunExecutableAuthorityObservation(bunExecutableAuthority, bunExecutableObservation) ===
      bunExecutableAuthority,
    "Bun executable authority observation drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunExecutableAuthorityObservation(
        bunExecutableAuthority,
        deepFreezeExact({
          ...bunExecutableObservation,
          executableIdentity: { ...bunExecutableIdentity, ino: "543" },
        })
      ),
    "Bun executable inode drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunExecutableAuthorityObservation(
        bunExecutableAuthority,
        deepFreezeExact({ ...bunExecutableObservation, currentPath: "/attacker/bin:/usr/bin" })
      ),
    "Bun executable PATH drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunExecutableAuthorityObservation(
        bunExecutableAuthority,
        deepFreezeExact({
          ...bunExecutableObservation,
          selectedExecutableRealPath: "/task540-attacker-bin/bun",
        })
      ),
    "Bun executable PATH alias retarget"
  );
  assertNegative(
    !sameArtifactIdentity(
      artifactIdentity,
      { ...artifactIdentity, ino: "3" },
      { includeSize: true }
    ),
    "workspace inode replacement"
  );

  const fakeLeader = Object.freeze({ pid: 101, ppid: 1, pgid: 101, startTicks: "1001" });
  const fakeChild = Object.freeze({ pid: 102, ppid: 101, pgid: 101, startTicks: "1002" });
  const fakeGroup = {
    leader: fakeLeader,
    retainedMembers: new Map([[fakeLeader.pid, fakeLeader]]),
  };
  appendRetainedGroupMembers(fakeGroup, [fakeLeader, fakeChild], { requireLeader: true });
  invariant(fakeGroup.retainedMembers.size === 2, "retained process child acquisition drift");
  await expectAsyncFailure(
    async () =>
      appendRetainedGroupMembers(fakeGroup, [{ ...fakeChild, startTicks: "9999" }], {
        requireLeader: false,
      }),
    "retained process PID reuse"
  );
  await expectAsyncFailure(
    async () =>
      appendRetainedGroupMembers(
        fakeGroup,
        [{ pid: 103, ppid: 1, pgid: 101, startTicks: "1003" }],
        { requireLeader: false }
      ),
    "unretained process after termination"
  );

  let constructionCleanupCalls = 0;
  const constructionAuthority = createPrivateConstructionCleanupAuthority();
  constructionAuthority.bindCompleteCapabilities({
    async cleanup() {
      constructionCleanupCalls += 1;
      return deepFreezeExact({ absenceProven: true });
    },
  });
  const firstConstructionCleanup =
    await constructionAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const secondConstructionCleanup =
    await constructionAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const constructionProjection = privateConstructionAuthorityProjection(constructionAuthority);
  invariant(
    firstConstructionCleanup === secondConstructionCleanup &&
      constructionCleanupCalls === 1 &&
      constructionProjection.cleanupCalls === 2 &&
      constructionProjection.cleanupStarted,
    "construction cleanup once-state drift"
  );

  let failingConstructionCleanupCalls = 0;
  const failingConstructionAuthority = createPrivateConstructionCleanupAuthority();
  failingConstructionAuthority.bindCompleteCapabilities({
    async cleanup() {
      failingConstructionCleanupCalls += 1;
      throw new Error("private construction cleanup failure");
    },
  });
  const failedConstructionCleanup =
    await failingConstructionAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const repeatedFailedConstructionCleanup =
    await failingConstructionAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const failingConstructionDiagnostic = currentPrivateConstructionCleanupDiagnosticNeverThrow(
    failingConstructionAuthority
  );
  invariant(
    failedConstructionCleanup === repeatedFailedConstructionCleanup &&
      failedConstructionCleanup.absenceProven === false &&
      failingConstructionCleanupCalls === 1 &&
      deepEqualJson(failingConstructionDiagnostic, {
        cleanupPhase: 0,
        cleanupFailureClass: "cleanup_boundary_failed",
      }),
    "construction cleanup failure once-state drift"
  );

  const partialConstructionAuthority = createPrivateConstructionCleanupAuthority();
  partialConstructionAuthority.registerWorkspaceLedger(Object.freeze({}));
  const partialConstructionCleanup =
    await partialConstructionAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const partialConstructionDiagnostic = currentPrivateConstructionCleanupDiagnosticNeverThrow(
    partialConstructionAuthority
  );
  invariant(
    partialConstructionCleanup.absenceProven === false &&
      deepEqualJson(partialConstructionDiagnostic, {
        cleanupPhase: 0,
        cleanupFailureClass: "construction_cleanup_failed",
      }),
    "partial-construction cleanup failure attribution drift"
  );
  incrementNegativeCases(2);

  const coreSuccessCapabilities = buildFakeCapabilities();
  const coreSuccessAuthority = createPrivateConstructionCleanupAuthority();
  coreSuccessAuthority.bindCompleteCapabilities(coreSuccessCapabilities);
  const coreSuccessEvidence = await executeSmokePlanCore(
    plan,
    coreSuccessCapabilities,
    coreSuccessAuthority
  );
  const coreSuccessRepeatedCleanup =
    await coreSuccessAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  invariant(
    coreSuccessEvidence.pass === true &&
      coreSuccessRepeatedCleanup.lifecycle !== null &&
      coreSuccessCapabilities.cleanupExecutions === 1 &&
      privateConstructionAuthorityProjection(coreSuccessAuthority).cleanupCalls === 2,
    "core success/public cleanup once-state drift"
  );

  const coreFailureCapabilities = buildFakeCapabilities({ failOrdinal: 25 });
  const coreFailureAuthority = createPrivateConstructionCleanupAuthority();
  coreFailureAuthority.bindCompleteCapabilities(coreFailureCapabilities);
  let sealedCoreFailure = null;
  try {
    await executeSmokePlanCore(plan, coreFailureCapabilities, coreFailureAuthority);
  } catch (error) {
    sealedCoreFailure = error;
  }
  await coreFailureAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  invariant(
    sealedCoreFailure === TASK_FAILURE &&
      coreFailureCapabilities.cleanupExecutions === 1 &&
      privateConstructionAuthorityProjection(coreFailureAuthority).cleanupCalls === 2,
    "core failure/public cleanup once-state drift"
  );
  incrementNegativeCases(1);

  // The path that RECORDS a primary failure cause must never be the path that destroys one. The
  // real executor records the cause on the response-lost registry, and the real cleanup consumes
  // that registry in phase 3, so a cleanup failure in any LATER phase reaches the recorder with
  // the registry already consumed. That is the exact shape of a run that completes all 496
  // actions and then fails in terminal cleanup: the recorder raised its own invariant, the
  // meta-error escaped the failure handler before the real cause reached the only slot the
  // diagnostic sink reads, and the emitted line named the recorder with no failedActionId at all.
  // A real registry is supplied here — the fake used to stub the recorder to a no-op, which is the
  // only reason the expectation below ever passed.
  const cleanupFailureRegistry = new PendingFailureAttemptRegistry();
  const cleanupFailureCapabilities = buildFakeCapabilities({
    failCleanupLifecycle: true,
    pendingFailureAttempts: cleanupFailureRegistry,
  });
  const cleanupFailureAuthority = createPrivateConstructionCleanupAuthority();
  const cleanupFailureTracker = createPrivateFailureActionTracker(plan);
  cleanupFailureAuthority.bindCompleteCapabilities(cleanupFailureCapabilities);
  let sealedCleanupFailure = null;
  try {
    await executeSmokePlanCore(
      plan,
      cleanupFailureCapabilities,
      cleanupFailureAuthority,
      cleanupFailureTracker
    );
  } catch (error) {
    sealedCleanupFailure = error;
  }
  await cleanupFailureAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const cleanupAttributionLines = [];
  const cleanupAttributionSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    cleanupAttributionLines.push(line);
  });
  const cleanupTrackerState = PRIVATE_FAILURE_ACTION_TRACKERS.get(cleanupFailureTracker);
  // A cleanup-only failure carries no action attribution and no failure class, so the reason
  // fallback is the only thing that names it. The retained cause is the executor invariant the
  // lifecycle raised, and the runtime projection now maps it onto the frozen `wf540_` vocabulary
  // instead of collapsing it to "unclassified" — the token IS the diagnosis. The message-absence
  // invariant below still proves the token is not the raw message.
  const cleanupOnlyDiagnosticLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 3,
      cleanupFailureClass: "persistent_plan_failed",
      failureReason: "wf540_rt_cleanup_lifecycle_did_not_complete",
    }) + "\n";
  const malformedCleanupDiagnosticLine = cleanupOnlyDiagnosticLine + "{}\n";
  const overflowCleanupDiagnosticLine = "x".repeat(MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES) + "\n";
  invariant(
    sealedCleanupFailure === TASK_FAILURE &&
      cleanupFailureCapabilities.cleanupExecutions === 1 &&
      privateConstructionAuthorityProjection(cleanupFailureAuthority).cleanupCalls === 3 &&
      cleanupTrackerState.currentActionId === null &&
      cleanupTrackerState.nextIndex === plan.actionManifest.length &&
      cleanupTrackerState.sealed === true &&
      writePrivateFailureActionDiagnosticOnceNeverThrow(
        cleanupAttributionSink,
        malformedCleanupDiagnosticLine
      ) === false &&
      writePrivateFailureActionDiagnosticOnceNeverThrow(
        cleanupAttributionSink,
        overflowCleanupDiagnosticLine
      ) === false &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        cleanupFailureTracker,
        cleanupAttributionSink,
        cleanupFailureAuthority
      ) === true &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        cleanupFailureTracker,
        cleanupAttributionSink,
        cleanupFailureAuthority
      ) === false &&
      cleanupAttributionLines.length === 1 &&
      cleanupAttributionLines[0] === cleanupOnlyDiagnosticLine &&
      Buffer.byteLength(cleanupAttributionLines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      !cleanupAttributionLines[0].includes("private fake cleanup lifecycle failure"),
    "cleanup lifecycle failure/public cleanup once-state drift"
  );
  // The registry contract behind the line above, stated directly: after consumption the recorder
  // reports that it recorded nothing instead of throwing, because takeFrozenOnce has already
  // returned a deep-frozen snapshot that no later annotation could reach.
  assertNegative(
    cleanupFailureRegistry.retainPrimaryFailureObservation(
      new Error("private post-consumption observation")
    ) === false,
    "consumed pending-create registry tolerating a late primary failure observation"
  );
  // The structural half of the same guarantee, independent of any one recorder's preconditions:
  // whatever recorder a capability supplies, a throw inside it must not be able to displace the
  // cause. Everything else in the failure handler is already never-throw; this was the one call
  // that could escape it, so the handler is proven against a recorder that ALWAYS fails.
  const throwingRecorderCapabilities = buildFakeCapabilities({ failCleanupLifecycle: true });
  throwingRecorderCapabilities.retainPrimaryFailureObservation = () => {
    throw new Error("private failure recorder failure");
  };
  const throwingRecorderAuthority = createPrivateConstructionCleanupAuthority();
  throwingRecorderAuthority.bindCompleteCapabilities(throwingRecorderCapabilities);
  let throwingRecorderFailure = null;
  try {
    await executeSmokePlanCore(plan, throwingRecorderCapabilities, throwingRecorderAuthority);
  } catch (error) {
    throwingRecorderFailure = error;
  }
  const throwingRecorderLines = [];
  const throwingRecorderSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    throwingRecorderLines.push(line);
  });
  assertNegative(
    throwingRecorderFailure === TASK_FAILURE &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        null,
        throwingRecorderSink,
        throwingRecorderAuthority
      ) === true &&
      throwingRecorderLines.length === 1 &&
      throwingRecorderLines[0] === cleanupOnlyDiagnosticLine &&
      !throwingRecorderLines[0].includes("private failure recorder failure"),
    "throwing primary failure recorder displacing the cause it records"
  );

  const malformedCleanupAuthority = createPrivateConstructionCleanupAuthority();
  PRIVATE_CONSTRUCTION_AUTHORITY.get(malformedCleanupAuthority).cleanupDiagnostic = deepFreezeExact(
    {
      cleanupPhase: 3,
      cleanupFailureClass: diagnosticPrivateMarker,
    }
  );
  const malformedCleanupLines = [];
  const malformedCleanupSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    malformedCleanupLines.push(line);
  });
  assertNegative(
    emitPrivateFailureActionDiagnosticNeverThrow(
      cleanupFailureTracker,
      malformedCleanupSink,
      malformedCleanupAuthority
    ) === false && malformedCleanupLines.length === 0,
    "malformed cleanup diagnostic"
  );

  const combinedCleanupCapabilities = buildFakeCapabilities({
    failFailureCleanup: true,
    cleanupFailureClass: "admin_api_failed",
  });
  const combinedCleanupExecuteAction = combinedCleanupCapabilities.executeAction.bind(
    combinedCleanupCapabilities
  );
  combinedCleanupCapabilities.executeAction = async (context) => {
    if (context.action.id === dirtyNavigationFailureAction.id) {
      throw createPrivateDirtyNavigationFailure(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7], {
        cause: new Error(dirtyNavigationPrivateMarker),
      });
    }
    return combinedCleanupExecuteAction(context);
  };
  const combinedCleanupLines = [];
  const combinedCleanupSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      combinedCleanupCapabilities.cleaned &&
        combinedCleanupCapabilities.calls.at(-1) === "failure-cleanup",
      "combined primary/cleanup diagnostic preceded cleanup"
    );
    combinedCleanupLines.push(line);
  });
  let combinedCleanupFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => combinedCleanupCapabilities,
      combinedCleanupSink
    );
  } catch (error) {
    combinedCleanupFailure = error;
  }
  const combinedCleanupDiagnosticLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: dirtyNavigationFailureAction.id,
      failureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7],
      cleanupPhase: 3,
      cleanupFailureClass: "admin_api_failed",
    }) + "\n";
  invariant(
    combinedCleanupFailure === TASK_FAILURE &&
      combinedCleanupCapabilities.cleanupExecutions === 1 &&
      combinedCleanupLines.length === 1 &&
      combinedCleanupLines[0] === combinedCleanupDiagnosticLine &&
      Buffer.byteLength(combinedCleanupLines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      !combinedCleanupLines[0].includes(dirtyNavigationPrivateMarker) &&
      !combinedCleanupLines[0].includes("private fake failure cleanup detail"),
    "combined primary/cleanup diagnostic drift"
  );

  const phaseThreeCleanupPrivateMarker = "TASK540_PHASE3_CLEANUP_PRIVATE_DO_NOT_EGRESS";
  const emitTaggedCleanupDiagnostic = async (cleanupFailureClass, tracker = null) => {
    const authority = createPrivateConstructionCleanupAuthority();
    authority.bindCompleteCapabilities({
      async cleanup() {
        throw retainPrivateCleanupFailureDiagnosticNeverThrow(
          new Error(phaseThreeCleanupPrivateMarker),
          3,
          cleanupFailureClass
        );
      },
    });
    const outcome = await authority.cleanupWhateverWasAcquiredOnceNeverThrow();
    const lines = [];
    const sink = createPrivateBoundedFailureActionDiagnosticSink((line) => lines.push(line));
    invariant(
      outcome.absenceProven === false &&
        emitPrivateFailureActionDiagnosticNeverThrow(tracker, sink, authority) === true &&
        lines.length === 1 &&
        Buffer.byteLength(lines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
        !lines[0].includes(phaseThreeCleanupPrivateMarker),
      cleanupFailureClass + " bounded cleanup diagnostic drift"
    );
    return lines[0];
  };
  const persistentStageCleanupOnlyLine =
    await emitTaggedCleanupDiagnostic("persistent_stage_failed");
  const persistentStageCleanupOnlyExpected =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 3,
      cleanupFailureClass: "persistent_stage_failed",
    }) + "\n";
  const operationCleanupOnlyLines = [];
  for (const cleanupFailureClass of [
    "persistent_provenance_failed",
    "persistent_delete_failed",
    "persistent_absence_failed",
  ]) {
    const line = await emitTaggedCleanupDiagnostic(cleanupFailureClass);
    const expected =
      canonicalJson({
        code: TASK_FAILURE.code,
        cleanupPhase: 3,
        cleanupFailureClass,
      }) + "\n";
    invariant(
      line === expected && Buffer.byteLength(line) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
      cleanupFailureClass + " exact cleanup-only diagnostic bytes drift"
    );
    operationCleanupOnlyLines.push(line);
  }
  const persistentDependencyCombinedTracker = trackerAtAction(dirtyNavigationFailureAction.id);
  const persistentDependencyCombinedCause = createPrivateDirtyNavigationFailure(
    DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5],
    { cause: new Error(dirtyNavigationPrivateMarker) }
  );
  invariant(
    retainPrivateDirtyNavigationFailureClassNeverThrow(
      persistentDependencyCombinedTracker,
      persistentDependencyCombinedCause
    ) === true,
    "persistent dependency combined primary classification drift"
  );
  const persistentDependencyCombinedLine = await emitTaggedCleanupDiagnostic(
    "persistent_dependency_blocked",
    persistentDependencyCombinedTracker
  );
  const persistentDependencyCombinedExpected =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: dirtyNavigationFailureAction.id,
      failureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5],
      cleanupPhase: 3,
      cleanupFailureClass: "persistent_dependency_blocked",
    }) + "\n";
  invariant(
    persistentStageCleanupOnlyLine === persistentStageCleanupOnlyExpected &&
      operationCleanupOnlyLines.length === 3 &&
      persistentDependencyCombinedLine === persistentDependencyCombinedExpected &&
      Buffer.byteLength(persistentStageCleanupOnlyLine) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      Buffer.byteLength(persistentDependencyCombinedLine) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      !persistentDependencyCombinedLine.includes(dirtyNavigationPrivateMarker),
    "phase 3 cleanup exact diagnostic bytes drift"
  );
  incrementNegativeCases(9);

  // {cleanupPhase, cleanupFailureClass} states WHERE cleanup died and never WHAT it hit, so a
  // cleanup-only failure reached the operator as a bare phase number while the phase invariant's
  // own prose died with the process. The additive cleanupFailureReason names it. The messages
  // below are produced by the REAL invariant, so the projection stays bound to the prefix
  // `invariant` actually emits rather than to a copy of it that could drift.
  let phaseInvariantMessage = "";
  try {
    invariant(false, "a task-owned user session does not carry an exact task user-agent");
  } catch (error) {
    phaseInvariantMessage = error.message;
  }
  let maximalInvariantMessage = "";
  try {
    invariant(false, "x".repeat(64));
  } catch (error) {
    maximalInvariantMessage = error.message;
  }
  const phaseInvariantToken = projectRuntimeInvariantToken(phaseInvariantMessage);
  const maximalInvariantToken = projectRuntimeInvariantToken(maximalInvariantMessage);
  const emitCleanupOnlyDiagnostic = async (failure, phase, failureClass, primaryCause = null) => {
    const authority = createPrivateConstructionCleanupAuthority();
    authority.bindCompleteCapabilities({
      async cleanup() {
        throw retainPrivateCleanupFailureDiagnosticNeverThrow(failure, phase, failureClass);
      },
    });
    const outcome = await authority.cleanupWhateverWasAcquiredOnceNeverThrow();
    if (primaryCause !== null) {
      authority.retainFailureAndCleanupDiagnosticsNeverThrow(primaryCause, null);
    }
    const lines = [];
    const sink = createPrivateBoundedFailureActionDiagnosticSink((line) => lines.push(line));
    invariant(
      outcome.absenceProven === false &&
        emitPrivateFailureActionDiagnosticNeverThrow(null, sink, authority) === true &&
        lines.length === 1 &&
        Buffer.byteLength(lines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
        !lines[0].includes(phaseInvariantMessage) &&
        !lines[0].includes(phaseThreeCleanupPrivateMarker),
      "cleanup reason diagnostic drift: phase " + phase + " " + failureClass
    );
    return lines[0];
  };
  const namedCleanupOnlyLine = await emitCleanupOnlyDiagnostic(
    new Error(phaseInvariantMessage),
    5,
    "phase_failed"
  );
  const namedCleanupOnlyExpected =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 5,
      cleanupFailureClass: "phase_failed",
      cleanupFailureReason: phaseInvariantToken,
    }) + "\n";
  // The ten-phase lifecycle throws ONE AggregateError over every phase that failed, so the token
  // has to be inherited from the earliest phase in that set: the wrapper's own message is fixed
  // prose, and reporting the LATER phase would name a consequence instead of a cause.
  const aggregatePhaseFiveFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(phaseInvariantMessage),
    5,
    "phase_failed"
  );
  const aggregateLaterPhaseFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(phaseThreeCleanupPrivateMarker + ":phase-seven"),
    7,
    "phase_failed"
  );
  const aggregatePhaseFailures = [aggregatePhaseFiveFailure, aggregateLaterPhaseFailure];
  const aggregateCleanupOnlyLine = await emitCleanupOnlyDiagnostic(
    retainPrivateCleanupAggregateDiagnosticNeverThrow(
      new AggregateError(aggregatePhaseFailures, "TASK-540 deterministic cleanup failed"),
      aggregatePhaseFailures,
      0
    ),
    5,
    "phase_failed"
  );
  // A failure the frozen vocabulary cannot name abstains rather than guessing, so every diagnostic
  // that exists today keeps its exact bytes.
  const opaqueCleanupOnlyLine = await emitCleanupOnlyDiagnostic(
    new Error(phaseThreeCleanupPrivateMarker + ":unnameable"),
    5,
    "phase_failed"
  );
  const opaqueCleanupOnlyExpected =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 5,
      cleanupFailureClass: "phase_failed",
    }) + "\n";
  invariant(
    namedCleanupOnlyLine === namedCleanupOnlyExpected &&
      aggregateCleanupOnlyLine === namedCleanupOnlyExpected &&
      opaqueCleanupOnlyLine === opaqueCleanupOnlyExpected,
    "cleanup failure reason attribution drift"
  );
  // Naming the cleanup failure must never cost the diagnostic itself: where the annotated line
  // would exceed the sink's byte bound the ADDITIVE field is dropped and the line the sink could
  // already emit — base plus the wrapper reason — is still written, exactly once.
  const overflowCleanupClass = [...PHASE_EIGHT_CLEANUP_FAILURE_CLASSES].reduce(
    (longest, value) => (value.length > longest.length ? value : longest),
    ""
  );
  const overflowCleanupPrimaryReason = "wf540_" + "x".repeat(64);
  const overflowCleanupExpectedDiagnostic = {
    code: TASK_FAILURE.code,
    cleanupPhase: 8,
    cleanupFailureClass: overflowCleanupClass,
    failureReason: overflowCleanupPrimaryReason,
  };
  const overflowCleanupExpected = canonicalJson(overflowCleanupExpectedDiagnostic) + "\n";
  invariant(
    Buffer.byteLength(overflowCleanupExpected) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      Buffer.byteLength(
        canonicalJson({
          ...overflowCleanupExpectedDiagnostic,
          cleanupFailureReason: maximalInvariantToken,
        }) + "\n"
      ) > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
    "cleanup reason overflow case no longer exceeds the sink byte bound"
  );
  const overflowCleanupLine = await emitCleanupOnlyDiagnostic(
    new Error(maximalInvariantMessage),
    8,
    overflowCleanupClass,
    new Error(overflowCleanupPrimaryReason)
  );
  invariant(
    overflowCleanupLine === overflowCleanupExpected &&
      !overflowCleanupLine.includes("cleanupFailureReason"),
    "cleanup reason byte-bound fallback drift"
  );
  incrementNegativeCases(3);

  let inputTrapCalls = 0;
  const trappedInput = new Proxy(
    {},
    {
      getPrototypeOf() {
        inputTrapCalls += 1;
        throw new Error("input prototype trap");
      },
      ownKeys() {
        inputTrapCalls += 1;
        throw new Error("input ownKeys trap");
      },
    }
  );
  const preAuthorityFailuresBefore = PRE_AUTHORITY_FAILURE_COUNT;
  const constructorDiagnosticLines = [];
  const constructorDiagnosticSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    constructorDiagnosticLines.push(line);
  });
  let constructorFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      trappedInput,
      () => {
        throw new Error("private authority constructor failure");
      },
      async () => {
        throw new Error("private unreachable capability factory");
      },
      constructorDiagnosticSink
    );
  } catch (error) {
    constructorFailure = error;
  }
  invariant(
    constructorFailure === TASK_FAILURE &&
      inputTrapCalls === 0 &&
      PRE_AUTHORITY_FAILURE_COUNT === preAuthorityFailuresBefore + 1 &&
      constructorDiagnosticLines.length === 0,
    "construction authority was not created before input inspection"
  );
  incrementNegativeCases(1);
}
