import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  CLEANUP_FAILURE_CLASS_PRIORITY,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  TASK_FAILURE,
} from "../config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import {
  EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS,
  expectedIdenticalScreenshotGroupOrdinals,
  validateSuccessfulScreenshotSet,
} from "../finalization.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { assertExactCleanupTupleSet } from "../resource-ledger.mjs";
import { cleanupDiagnostics } from "../../cleanup/diagnostics.mjs";

export async function runCleanupStagesSelfTest({
  assertCleanupReceiptBijection,
  assertNegative,
  assertSourceMutantsRejected,
  createCleanupPhaseScheduler,
  createExecuteCleanupLifecycleCore,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  emitPrivateFailureActionDiagnosticNeverThrow,
  exactGraph,
  exactGraphRecords,
  executeCleanupPlanStage,
  expectAsyncFailure,
  graphAccessCore,
  graphIndependentCore,
  graphSessionCore,
  graphUserCore,
  plan,
  runIndependentCleanupStepsNeverSkip,
  runPrivateCleanupAdminApiBoundary,
  terminalCapabilities,
  terminalEvidence,
  terminalFinalPlan,
}) {
  const {
    privateCleanupFailureDiagnosticNeverThrow,
    privateCleanupFailureReasonNeverThrow,
    retainPrivateCleanupAggregateDiagnosticNeverThrow,
    retainPrivateCleanupFailureDiagnosticNeverThrow,
    selectPrivateCleanupFailureDiagnosticNeverThrow,
  } = cleanupDiagnostics;

  const mixedPhaseThreeRecords = deepFreezeExact(
    [
      ["phase3-override", "presentation-override"],
      ["phase3-seo", "seo-document-entry"],
      ["phase3-setting", "setting-user-a"],
      ["phase3-screen", "screen"],
    ].map(([resourceKey, kind]) => ({ resourceKey, kind }))
  );
  const mixedPhaseThreeResourceKeys = deepFreezeExact(
    mixedPhaseThreeRecords.map(({ resourceKey }) => resourceKey)
  );
  const mixedPhaseThreeGraph = deepFreezeExact(
    Object.fromEntries(mixedPhaseThreeResourceKeys.map((resourceKey) => [resourceKey, []]))
  );
  const mixedPhaseThreePlan = deepFreezeExact({ resourceKeys: mixedPhaseThreeResourceKeys });
  const mixedPhaseThreeView = deepFreezeExact({
    ledger: mixedPhaseThreeRecords,
    dependencyGraph: mixedPhaseThreeGraph,
    failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
  });
  const mixedPhaseThreeKinds = new Set(mixedPhaseThreeRecords.map(({ kind }) => kind));
  const phaseThreeScreenBoundaryPrivateMarker =
    "TASK540_PHASE3_SCREEN_BOUNDARY_PRIVATE_DO_NOT_EGRESS";
  const mixedPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const mixedPhaseThreeCalls = [];
  const mixedPhaseThreeResult = await executeCleanupPlanStage(
    mixedPhaseThreeState,
    mixedPhaseThreePlan,
    mixedPhaseThreeView,
    mixedPhaseThreeKinds,
    3,
    async (_state, record, operationKind) => {
      mixedPhaseThreeCalls.push(record.kind + ":" + operationKind);
      if (record.kind === "screen" && operationKind === "provenance") {
        throw new Error(phaseThreeScreenBoundaryPrivateMarker);
      }
      return deepFreezeExact({ kind: record.kind, operationKind });
    }
  );
  const mixedPhaseThreeDiagnostic = privateCleanupFailureDiagnosticNeverThrow(
    mixedPhaseThreeResult.failures[0]
  );
  invariant(
    mixedPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(mixedPhaseThreeDiagnostic, {
        cleanupPhase: 3,
        cleanupFailureClass: "persistent_provenance_failed",
      }) &&
      deepEqualJson(mixedPhaseThreeCalls, [
        "presentation-override:provenance",
        "presentation-override:delete",
        "presentation-override:absence",
        "seo-document-entry:provenance",
        "seo-document-entry:delete",
        "seo-document-entry:absence",
        "setting-user-a:provenance",
        "setting-user-a:delete",
        "setting-user-a:absence",
        "screen:provenance",
      ]) &&
      mixedPhaseThreeResourceKeys
        .slice(0, 3)
        .every((resourceKey) => mixedPhaseThreeState.cleanupAbsenceKeys.has(resourceKey)) &&
      mixedPhaseThreeState.cleanupFailedKeys.has("phase3-screen") &&
      !canonicalJson(mixedPhaseThreeDiagnostic).includes(phaseThreeScreenBoundaryPrivateMarker),
    "mixed phase 3 early-success/screen-boundary attribution drift"
  );

  const taggedAdminPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const taggedAdminPhaseThreeResult = await executeCleanupPlanStage(
    taggedAdminPhaseThreeState,
    mixedPhaseThreePlan,
    mixedPhaseThreeView,
    mixedPhaseThreeKinds,
    3,
    async (_state, record, operationKind) => {
      if (record.kind === "screen" && operationKind === "provenance") {
        throw retainPrivateCleanupFailureDiagnosticNeverThrow(
          new Error(phaseThreeScreenBoundaryPrivateMarker),
          3,
          "admin_api_failed"
        );
      }
      return deepFreezeExact({ kind: record.kind, operationKind });
    }
  );
  invariant(
    taggedAdminPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(taggedAdminPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "admin_api_failed" }
      ),
    "tagged admin API phase 3 priority drift"
  );

  const genericOperationRecord = deepFreezeExact({
    resourceKey: "phase3-generic-operation",
    kind: "screen",
  });
  const genericOperationPlan = deepFreezeExact({
    resourceKeys: deepFreezeExact([genericOperationRecord.resourceKey]),
  });
  const genericOperationView = deepFreezeExact({
    ledger: deepFreezeExact([genericOperationRecord]),
    dependencyGraph: deepFreezeExact({ [genericOperationRecord.resourceKey]: [] }),
    failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
  });
  for (const [failedOperation, expectedFailureClass] of [
    ["provenance", "persistent_provenance_failed"],
    ["delete", "persistent_delete_failed"],
    ["absence", "persistent_absence_failed"],
  ]) {
    const state = { cleanupAbsenceKeys: new Set(), cleanupFailedKeys: new Set() };
    const result = await executeCleanupPlanStage(
      state,
      genericOperationPlan,
      genericOperationView,
      new Set([genericOperationRecord.kind]),
      3,
      async (_state, record, operationKind) => {
        if (operationKind === failedOperation) {
          throw new Error(phaseThreeScreenBoundaryPrivateMarker);
        }
        return deepFreezeExact({ kind: record.kind, operationKind });
      }
    );
    invariant(
      result.failures.length === 1 &&
        deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(result.failures[0]), {
          cleanupPhase: 3,
          cleanupFailureClass: expectedFailureClass,
        }),
      failedOperation + " generic phase 3 operation attribution drift"
    );
  }

  const missingPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const missingPhaseThreeResult = await executeCleanupPlanStage(
    missingPhaseThreeState,
    deepFreezeExact({ resourceKeys: deepFreezeExact(["phase3-missing-record"]) }),
    deepFreezeExact({
      ledger: deepFreezeExact([]),
      dependencyGraph: deepFreezeExact({}),
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["screen"]),
    3,
    async () => deepFreezeExact({ unreachable: true })
  );
  const dependencyPhaseThreeRecord = deepFreezeExact({
    resourceKey: "phase3-dependent-parent",
    kind: "screen",
  });
  const dependencyPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const dependencyPhaseThreeResult = await executeCleanupPlanStage(
    dependencyPhaseThreeState,
    deepFreezeExact({ resourceKeys: deepFreezeExact([dependencyPhaseThreeRecord.resourceKey]) }),
    deepFreezeExact({
      ledger: deepFreezeExact([dependencyPhaseThreeRecord]),
      dependencyGraph: deepFreezeExact({
        [dependencyPhaseThreeRecord.resourceKey]: ["phase3-unproved-child"],
      }),
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set([dependencyPhaseThreeRecord.kind]),
    3,
    async () => deepFreezeExact({ unreachable: true })
  );
  invariant(
    missingPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(missingPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "persistent_stage_failed" }
      ) &&
      dependencyPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(dependencyPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "persistent_dependency_blocked" }
      ),
    "phase 3 stage/dependency attribution drift"
  );

  const cleanupStageSource = executeCleanupPlanStage.toString();
  const cleanupStageSourceRequired = [
    'phaseThreeFailureClass = "persistent_stage_failed"',
    'cleanupPhase === 3 ? phaseThreeFailureClass : "phase_failed"',
    '"persistent_dependency_blocked"',
    '"persistent_provenance_failed"',
    '"persistent_delete_failed"',
    '"persistent_absence_failed"',
    "finalPlan.failureDiscoveryBlockedParentKeys.includes(resourceKey)",
    "!state.cleanupAbsenceKeys.has(childKey) || state.cleanupFailedKeys.has(childKey)",
  ];
  const validatesCleanupStageSource = (source) =>
    cleanupStageSourceRequired.every((token) => source.includes(token));
  invariant(validatesCleanupStageSource(cleanupStageSource), "cleanup stage source contract drift");
  assertSourceMutantsRejected(
    cleanupStageSource,
    validatesCleanupStageSource,
    cleanupStageSourceRequired,
    "cleanup stage guards/classes"
  );

  const branchCleanupState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const branchOperationCalls = [];
  const branchResult = await executeCleanupPlanStage(
    branchCleanupState,
    deepFreezeExact({
      resourceKeys: deepFreezeExact([
        graphAccessCore.resourceKey,
        graphSessionCore.resourceKey,
        graphUserCore.resourceKey,
        graphIndependentCore.resourceKey,
      ]),
    }),
    deepFreezeExact({
      ledger: exactGraphRecords,
      dependencyGraph: exactGraph,
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["access-log-task-ua", "session-task", "user-a", "content-type"]),
    6,
    async (_state, record, operationKind) => {
      branchOperationCalls.push(record.resourceKey + ":" + operationKind);
      if (record.resourceKey === graphAccessCore.resourceKey && operationKind === "absence") {
        throw new Error("private branch absence failure");
      }
      return deepFreezeExact({ resourceKey: record.resourceKey, operationKind });
    }
  );
  invariant(
    branchResult.failures.length === 3 &&
      branchResult.failures.every((failure) =>
        deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(failure), {
          cleanupPhase: 6,
          cleanupFailureClass: "phase_failed",
        })
      ) &&
      branchOperationCalls.length === 6 &&
      branchCleanupState.cleanupFailedKeys.has(graphAccessCore.resourceKey) &&
      branchCleanupState.cleanupFailedKeys.has(graphSessionCore.resourceKey) &&
      branchCleanupState.cleanupFailedKeys.has(graphUserCore.resourceKey) &&
      branchCleanupState.cleanupAbsenceKeys.has(graphIndependentCore.resourceKey) &&
      !branchOperationCalls.some((value) => value.startsWith(graphSessionCore.resourceKey + ":")) &&
      !branchOperationCalls.some((value) => value.startsWith(graphUserCore.resourceKey + ":")),
    "cleanup branch/transitive blocker continuation drift"
  );

  const phase7CleanupState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const phase7Result = await executeCleanupPlanStage(
    phase7CleanupState,
    deepFreezeExact({ resourceKeys: deepFreezeExact([graphIndependentCore.resourceKey]) }),
    deepFreezeExact({
      ledger: exactGraphRecords,
      dependencyGraph: exactGraph,
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["content-type"]),
    7,
    async () => {
      throw new Error("private phase 7 returned stage failure");
    }
  );
  invariant(
    phase7Result.failures.length === 1 &&
      deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(phase7Result.failures[0]), {
        cleanupPhase: 7,
        cleanupFailureClass: "phase_failed",
      }) &&
      phase7CleanupState.cleanupFailedKeys.has(graphIndependentCore.resourceKey),
    "phase 7 returned cleanup-stage failure attribution drift"
  );

  const scheduledFailures = [];
  const scheduledTrace = [];
  const scheduledCalls = [];
  const testScheduler = createCleanupPhaseScheduler(scheduledFailures, scheduledTrace);
  for (let phase = 1; phase <= 10; phase += 1) {
    await testScheduler.run(phase, async () => {
      scheduledCalls.push(phase);
      if (phase === 3 || phase === 9) throw new Error("private scheduled phase failure");
    });
  }
  testScheduler.seal();
  invariant(
    deepEqualJson(scheduledCalls, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) &&
      scheduledFailures.length === 2 &&
      deepEqualJson(
        scheduledFailures.map((failure) => privateCleanupFailureDiagnosticNeverThrow(failure)),
        [
          { cleanupPhase: 3, cleanupFailureClass: "phase_failed" },
          { cleanupPhase: 9, cleanupFailureClass: "phase_failed" },
        ]
      ) &&
      scheduledTrace[2].completed === false &&
      scheduledTrace[8].completed === false &&
      scheduledTrace[9].completed === true,
    "cleanup scheduler skipped phase 10 after prior failures"
  );

  const cleanupPrecedenceFailures = [
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 7 failure"),
      7,
      "phase_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 generic failure"),
      3,
      "phase_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 admin failure"),
      3,
      "admin_api_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 provenance failure"),
      3,
      "persistent_provenance_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 delete failure"),
      3,
      "persistent_delete_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 absence failure"),
      3,
      "persistent_absence_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 stage failure"),
      3,
      "persistent_stage_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 dependency failure"),
      3,
      "persistent_dependency_blocked"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 plan failure"),
      3,
      "persistent_plan_failed"
    ),
  ];
  const selectedCleanupPrecedence = selectPrivateCleanupFailureDiagnosticNeverThrow(
    cleanupPrecedenceFailures,
    0
  );
  const boundaryClassPrecedence = selectPrivateCleanupFailureDiagnosticNeverThrow(
    [
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new Error("private cleanup boundary failure"),
        0,
        "cleanup_boundary_failed"
      ),
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new Error("private construction cleanup failure"),
        0,
        "construction_cleanup_failed"
      ),
    ],
    0
  );
  const expectedPhaseEightPriority = [
    "bootstrap_reconciliation_failed",
    "bootstrap_cas_failed",
    "bootstrap_uncertain_baseline_failed",
    "bootstrap_post_restore_proof_failed",
    "bootstrap_restore_receipt_failed",
  ];
  const phaseEightPrioritySelectionsAreExact = expectedPhaseEightPriority
    .slice(0, -1)
    .every((expectedClass, index) => {
      const selected = selectPrivateCleanupFailureDiagnosticNeverThrow(
        [
          retainPrivateCleanupFailureDiagnosticNeverThrow(
            new Error("private lower-priority phase 8 failure"),
            8,
            expectedPhaseEightPriority[index + 1]
          ),
          retainPrivateCleanupFailureDiagnosticNeverThrow(
            new Error("private higher-priority phase 8 failure"),
            8,
            expectedClass
          ),
        ],
        0
      );
      return selected?.cleanupPhase === 8 && selected.cleanupFailureClass === expectedClass;
    });
  invariant(
    deepEqualJson(PHASE_THREE_CLEANUP_FAILURE_CLASSES, [
      "admin_api_failed",
      "persistent_plan_failed",
      "persistent_stage_failed",
      "persistent_dependency_blocked",
      "persistent_provenance_failed",
      "persistent_delete_failed",
      "persistent_absence_failed",
    ]) &&
      deepEqualJson(CLEANUP_FAILURE_CLASS_PRIORITY.slice(0, 7), [
        "persistent_plan_failed",
        "admin_api_failed",
        "persistent_provenance_failed",
        "persistent_delete_failed",
        "persistent_absence_failed",
        "persistent_stage_failed",
        "persistent_dependency_blocked",
      ]) &&
      deepEqualJson(PHASE_EIGHT_CLEANUP_FAILURE_CLASSES, expectedPhaseEightPriority) &&
      deepEqualJson(CLEANUP_FAILURE_CLASS_PRIORITY.slice(7, 12), expectedPhaseEightPriority) &&
      phaseEightPrioritySelectionsAreExact &&
      deepEqualJson(selectedCleanupPrecedence, {
        cleanupPhase: 3,
        cleanupFailureClass: "persistent_plan_failed",
      }) &&
      deepEqualJson(boundaryClassPrecedence, {
        cleanupPhase: 0,
        cleanupFailureClass: "construction_cleanup_failed",
      }),
    "cleanup phase/class diagnostic precedence drift"
  );

  const cleanupProductionSeamPrivateMarker =
    "TASK540_CLEANUP_PRODUCTION_SEAM_PRIVATE_DO_NOT_EGRESS";
  let cleanupAdminBoundaryFailure = null;
  try {
    await runPrivateCleanupAdminApiBoundary(async () => {
      throw new Error(cleanupProductionSeamPrivateMarker + ":admin");
    });
  } catch (error) {
    cleanupAdminBoundaryFailure = error;
  }
  invariant(
    cleanupAdminBoundaryFailure !== null &&
      deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(cleanupAdminBoundaryFailure), {
        cleanupPhase: 3,
        cleanupFailureClass: "admin_api_failed",
      }),
    "cleanup Admin API production boundary attribution drift"
  );

  const cleanupPlanBoundaryFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(cleanupProductionSeamPrivateMarker + ":plan"),
    3,
    "persistent_plan_failed"
  );
  const cleanupPhaseThreeAggregate = retainPrivateCleanupAggregateDiagnosticNeverThrow(
    new AggregateError(
      [cleanupAdminBoundaryFailure, cleanupPlanBoundaryFailure],
      cleanupProductionSeamPrivateMarker + ":phase-three"
    ),
    [cleanupAdminBoundaryFailure, cleanupPlanBoundaryFailure],
    3
  );
  const cleanupLaterPhaseFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(cleanupProductionSeamPrivateMarker + ":later-phase"),
    7,
    "phase_failed"
  );
  const cleanupFinalAggregate = retainPrivateCleanupAggregateDiagnosticNeverThrow(
    new AggregateError(
      [cleanupPhaseThreeAggregate, cleanupLaterPhaseFailure],
      cleanupProductionSeamPrivateMarker + ":final"
    ),
    [cleanupPhaseThreeAggregate, cleanupLaterPhaseFailure],
    0
  );
  const cleanupProductionSeamAuthority = createPrivateConstructionCleanupAuthority();
  cleanupProductionSeamAuthority.bindCompleteCapabilities({
    async cleanup() {
      throw cleanupFinalAggregate;
    },
  });
  const cleanupProductionSeamOutcome =
    await cleanupProductionSeamAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const cleanupProductionSeamLines = [];
  const cleanupProductionSeamSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    cleanupProductionSeamLines.push(line);
  });
  const cleanupProductionSeamExpectedLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 3,
      cleanupFailureClass: "persistent_plan_failed",
    }) + "\n";
  invariant(
    cleanupProductionSeamOutcome.absenceProven === false &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        null,
        cleanupProductionSeamSink,
        cleanupProductionSeamAuthority
      ) === true &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        null,
        cleanupProductionSeamSink,
        cleanupProductionSeamAuthority
      ) === false &&
      deepEqualJson(cleanupProductionSeamLines, [cleanupProductionSeamExpectedLine]) &&
      Buffer.byteLength(cleanupProductionSeamLines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      !cleanupProductionSeamLines[0].includes(cleanupProductionSeamPrivateMarker),
    "cleanup production seam bounded diagnostic drift"
  );

  const cleanupAdminBoundarySource = runPrivateCleanupAdminApiBoundary.toString();
  const cleanupLifecycleSource = createExecuteCleanupLifecycleCore.toString();
  const assertCleanupProductionSeamMutantRejected = (
    source,
    productionToken,
    mutantToken,
    label
  ) => {
    const validatesProductionSeam = (candidate) => candidate.split(productionToken).length === 2;
    invariant(validatesProductionSeam(source), label + " production source anchor drift");
    const mutant = source.replace(productionToken, mutantToken);
    assertNegative(!validatesProductionSeam(mutant), label + " source mutant");
  };
  assertCleanupProductionSeamMutantRejected(
    cleanupAdminBoundarySource,
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "admin_api_failed")',
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_provenance_failed")',
    "cleanup Admin API class"
  );
  assertCleanupProductionSeamMutantRejected(
    cleanupLifecycleSource,
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_plan_failed")',
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_stage_failed")',
    "persistent plan class"
  );
  assertCleanupProductionSeamMutantRejected(
    cleanupLifecycleSource,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
            new AggregateError(phaseFailures, "phase 3 response-lost/persistent cleanup failed"),
            phaseFailures,
            3
          )`,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
            new AggregateError(phaseFailures, "phase 3 response-lost/persistent cleanup failed"),
            [],
            3
          )`,
    "phase 3 cleanup aggregate input"
  );
  assertCleanupProductionSeamMutantRejected(
    cleanupLifecycleSource,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
          new AggregateError(failures, "TASK-540 deterministic cleanup failed"),
          failures,
          0
        )`,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
          new AggregateError(failures, "TASK-540 deterministic cleanup failed"),
          [],
          0
        )`,
    "final cleanup aggregate input"
  );
  let independentStepMask = 0;
  await expectAsyncFailure(
    async () =>
      runIndependentCleanupStepsNeverSkip(
        [
          async () => {
            independentStepMask |= 1;
            throw new Error("private first branch failure");
          },
          async () => {
            independentStepMask |= 2;
          },
          async () => {
            independentStepMask |= 4;
          },
        ],
        "self-test independent branches"
      ),
    "independent cleanup branch aggregate"
  );
  invariant(independentStepMask === 7, "independent cleanup branch was skipped");

  // A phase that runs its steps through the never-skip helper throws the HELPER's AggregateError,
  // never the step's own invariant, so the phase scheduler retains its diagnostic against an object
  // whose message belongs to no vocabulary. Run 1640c86416da ended on exactly this shape and could
  // report only `cleanupPhase: 9`. These cases pin the nested walk in both directions: an inner
  // failure that names itself is inherited, an outer cause that names itself is never displaced,
  // and anything the vocabulary cannot name still leaves the emitted line byte-identical.
  let namedStepAggregate = null;
  await expectAsyncFailure(
    async () => {
      try {
        await runIndependentCleanupStepsNeverSkip(
          [
            async () => invariant(false, "undeclared duplicate screenshot content hash"),
            async () => {},
          ],
          "phase 9 final baselines"
        );
      } catch (error) {
        namedStepAggregate = error;
        throw error;
      }
    },
    "named phase 9 step aggregate"
  );
  invariant(
    privateCleanupFailureReasonNeverThrow(
      retainPrivateCleanupFailureDiagnosticNeverThrow(namedStepAggregate, 9, "phase_failed")
    ) === "wf540_rt_undeclared_duplicate_screenshot_content_hash",
    "phase step aggregate did not inherit its step token"
  );
  invariant(
    privateCleanupFailureReasonNeverThrow(
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new Error("TASK-540 cleanup failed", {
          cause: new Error(
            "TASK-540 smoke executor: final storage and database baseline drift"
          ),
        }),
        9,
        "phase_failed"
      )
    ) === "wf540_rt_final_storage_and_database_baseline_drift",
    "chained cleanup cause token was lost"
  );
  invariant(
    privateCleanupFailureReasonNeverThrow(
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new AggregateError(
          [new Error("TASK-540 smoke executor: final storage and database baseline drift")],
          "TASK-540 smoke executor: cleanup lifecycle did not complete"
        ),
        9,
        "phase_failed"
      )
    ) === "wf540_rt_cleanup_lifecycle_did_not_complete",
    "nested walk displaced the cause token"
  );
  invariant(
    privateCleanupFailureReasonNeverThrow(
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new AggregateError(
          [new Error("third party branch failure")],
          "phase 9 final baselines cleanup branches failed"
        ),
        9,
        "phase_failed"
      )
    ) === null,
    "unnameable cleanup aggregate gained a reason"
  );
  const cyclicCleanupFailure = new Error("cyclic cleanup failure");
  cyclicCleanupFailure.cause = cyclicCleanupFailure;
  invariant(
    privateCleanupFailureReasonNeverThrow(
      retainPrivateCleanupFailureDiagnosticNeverThrow(cyclicCleanupFailure, 9, "phase_failed")
    ) === null,
    "cyclic cleanup cause walk did not terminate"
  );

  // Cleanup phase 9 validates the screenshot set. Its uniqueness claim had NO coverage at all,
  // which is how a claim the flow's own semantics forbid survived every negative case: rc-033 and
  // rc-037 photograph the same visible state on purpose, so their PNGs are byte-identical whenever
  // stale-response rejection works. The declared group is permitted to collide; every other
  // duplicate, a reused file identity and an acquisition-count mismatch must still refuse.
  const screenshotFixtureRoot = await mkdtemp(path.join(tmpdir(), "wf540-screenshot-set-"));
  try {
    const [declaredFirstPath, declaredSecondPath] = EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS[0];
    const contractOrdinals = expectedIdenticalScreenshotGroupOrdinals(
      plan.requiredScreenshotPaths
    );
    invariant(
      contractOrdinals.size === 2 &&
        contractOrdinals.get(declaredFirstPath) === 0 &&
        contractOrdinals.get(declaredSecondPath) === 0,
      "contract screenshot identical group declaration drift"
    );
    const undeclaredPaths = plan.requiredScreenshotPaths.filter(
      (candidate) => !contractOrdinals.has(candidate)
    );
    invariant(undeclaredPaths.length >= 2, "undeclared screenshot path fixtures are absent");
    const [firstUndeclaredPath, secondUndeclaredPath] = undeclaredPaths;
    const acquireScreenshotFixture = async (name, payload) => {
      const absolute = path.join(screenshotFixtureRoot, name);
      const bytes = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from(payload, "utf8"),
      ]);
      await writeFile(absolute, bytes, { mode: 0o600 });
      const info = await stat(absolute);
      return deepFreezeExact({
        absolute,
        dev: String(info.dev),
        ino: String(info.ino),
        mode: info.mode & 0o777,
        size: info.size,
        sha256: hashBytes(bytes),
      });
    };
    const screenshotSetState = (entries) =>
      Object.freeze({
        plan: deepFreezeExact({ requiredScreenshotPaths: entries.map(([relative]) => relative) }),
        screenshots: new Map(entries),
      });
    // Every negative case below names the invariant it must trip, so a case can never pass by
    // failing somewhere else - and every state keeps BOTH declared paths present, because the
    // declaration guard legitimately refuses a set that has stopped carrying the pair.
    const expectScreenshotRefusal = async (phrase, label, callback) => {
      let observed = null;
      await expectAsyncFailure(async () => {
        try {
          await callback();
        } catch (error) {
          observed = error;
          throw error;
        }
      }, label);
      invariant(
        observed instanceof Error &&
          observed.message === "TASK-540 smoke executor: " + phrase,
        label + " refused for the wrong reason"
      );
    };
    const identicalDeclaredFirst = await acquireScreenshotFixture(
      "declared-first-identical.png",
      "same-visible-state"
    );
    const identicalDeclaredSecond = await acquireScreenshotFixture(
      "declared-second-identical.png",
      "same-visible-state"
    );
    const distinctDeclaredFirst = await acquireScreenshotFixture(
      "declared-first-distinct.png",
      "declared-first-view"
    );
    const distinctDeclaredSecond = await acquireScreenshotFixture(
      "declared-second-distinct.png",
      "declared-second-view"
    );
    const firstUndeclared = await acquireScreenshotFixture("undeclared-first.png", "other-view");
    const secondUndeclared = await acquireScreenshotFixture("undeclared-second.png", "other-view");
    const permitted = await validateSuccessfulScreenshotSet(
      screenshotSetState([
        [declaredFirstPath, identicalDeclaredFirst],
        [declaredSecondPath, identicalDeclaredSecond],
        [firstUndeclaredPath, firstUndeclared],
      ])
    );
    invariant(
      permitted.length === 3 &&
        identicalDeclaredFirst.sha256 === identicalDeclaredSecond.sha256 &&
        identicalDeclaredFirst.ino !== identicalDeclaredSecond.ino &&
        permitted.filter(({ sha256 }) => sha256 === identicalDeclaredFirst.sha256).length === 2,
      "declared identical screenshot pair was refused"
    );
    await expectScreenshotRefusal(
      "undeclared duplicate screenshot content hash",
      "undeclared duplicate screenshot content",
      async () =>
        validateSuccessfulScreenshotSet(
          screenshotSetState([
            [declaredFirstPath, distinctDeclaredFirst],
            [declaredSecondPath, distinctDeclaredSecond],
            [firstUndeclaredPath, firstUndeclared],
            [secondUndeclaredPath, secondUndeclared],
          ])
        )
    );
    const declaredCrossGroup = await acquireScreenshotFixture(
      "declared-cross-group.png",
      "other-view"
    );
    await expectScreenshotRefusal(
      "undeclared duplicate screenshot content hash",
      "declared screenshot duplicating an undeclared view",
      async () =>
        validateSuccessfulScreenshotSet(
          screenshotSetState([
            [declaredFirstPath, declaredCrossGroup],
            [declaredSecondPath, distinctDeclaredSecond],
            [firstUndeclaredPath, firstUndeclared],
          ])
        )
    );
    await expectScreenshotRefusal(
      "screenshot file identity is not unique",
      "reused screenshot file identity",
      async () =>
        validateSuccessfulScreenshotSet(
          screenshotSetState([
            [declaredFirstPath, distinctDeclaredFirst],
            [declaredSecondPath, distinctDeclaredSecond],
            [firstUndeclaredPath, firstUndeclared],
            [secondUndeclaredPath, firstUndeclared],
          ])
        )
    );
    await expectScreenshotRefusal(
      "screenshot acquisition count drift",
      "screenshot acquisition count",
      async () =>
        validateSuccessfulScreenshotSet(
          Object.freeze({
            plan: deepFreezeExact({
              requiredScreenshotPaths: [declaredFirstPath, declaredSecondPath],
            }),
            screenshots: new Map([[declaredFirstPath, distinctDeclaredFirst]]),
          })
        )
    );
    for (const [label, groups] of [
      [
        "identical group path is not required",
        [[declaredFirstPath, "_docs/_workflows/_smoke/task-540-wf540smoke-absent.png"]],
      ],
      ["identical group has one member", [[declaredFirstPath]]],
      ["identical group repeats a member", [[declaredFirstPath, declaredFirstPath]]],
      [
        "two identical groups claim one path",
        [
          [declaredFirstPath, declaredSecondPath],
          [declaredFirstPath, firstUndeclaredPath],
        ],
      ],
    ]) {
      await expectScreenshotRefusal("expected identical screenshot group drift", label, async () =>
        expectedIdenticalScreenshotGroupOrdinals(plan.requiredScreenshotPaths, groups)
      );
    }
  } finally {
    await rm(screenshotFixtureRoot, { recursive: true, force: true });
  }

  const reorderedCleanupReceipts = [...terminalEvidence.cleanupReceipts];
  [reorderedCleanupReceipts[0], reorderedCleanupReceipts[1]] = [
    reorderedCleanupReceipts[1],
    reorderedCleanupReceipts[0],
  ];
  await expectAsyncFailure(
    async () => assertCleanupReceiptBijection(terminalFinalPlan, reorderedCleanupReceipts),
    "reordered final cleanup receipts"
  );
  for (const [label, keys, tuples] of [
    [
      "real persistent tuple",
      terminalCapabilities.lastPersistentPlan.resourceKeys,
      terminalCapabilities.lastPersistentPlan.tuples,
    ],
    [
      "real terminal tuple",
      terminalCapabilities.lastTerminalPlan.resourceKeys,
      terminalCapabilities.lastTerminalPlan.tuples,
    ],
    ["real final tuple", terminalFinalPlan.resourceKeys, terminalFinalPlan.actionTuples],
  ]) {
    await expectAsyncFailure(
      async () => assertExactCleanupTupleSet(tuples.slice(1), keys, label),
      label + " omission"
    );
  }

  return Object.freeze({ explicitNegativeCases: 11 });
}
