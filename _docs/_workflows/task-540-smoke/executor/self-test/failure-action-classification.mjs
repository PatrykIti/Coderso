import {
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  TASK_FAILURE,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";

export function runFailureActionClassificationSelfTest({
  assertNegative,
  createPrivateBoundedFailureActionDiagnosticSink,
  emitPrivateFailureActionDiagnosticNeverThrow,
  executionFixtures,
  failureBoundary,
  plan,
}) {
  const {
    PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS,
    PRIVATE_TONE_OPEN_FAILURE_DETAILS,
    PRIVATE_TONE_SELECT_FAILURE_CLASSES,
    beginPrivateFailureAction,
    completePrivateFailureAction,
    createPrivateAuthSettlementFailure,
    createPrivateDirtyNavigationFailure,
    createPrivateFailureActionTracker,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    retainPrivateAuthSettlementFailureClassNeverThrow,
    retainPrivateDirtyNavigationFailureClassNeverThrow,
    retainPrivateToneOpenFailureClassNeverThrow,
    retainPrivateToneSelectFailureClassNeverThrow,
  } = failureBoundary;
  const {
    classifiedFailureActionId,
    diagnosticPrivateMarker,
    dirtyNavigationFailureAction,
    dirtyNavigationPrivateMarker,
    expectedClassifiedLine,
    toneOpenFailureAction,
    toneOpenPrivateMarker,
    toneSelectFailureAction,
    toneSelectPrivateMarker,
  } = executionFixtures;

  const trackerAtAction = (actionId) => {
    const tracker = createPrivateFailureActionTracker(plan);
    for (const action of plan.actionManifest) {
      beginPrivateFailureAction(tracker, action);
      if (action.id === actionId) return tracker;
      completePrivateFailureAction(tracker, action);
    }
    throw new Error("TASK-540 smoke executor: classified diagnostic action is absent");
  };
  const classifiedTracker = trackerAtAction(classifiedFailureActionId);
  const classifiedCause = createPrivateAuthSettlementFailure("login_route");
  invariant(
    retainPrivateAuthSettlementFailureClassNeverThrow(classifiedTracker, classifiedCause) ===
      true &&
      retainPrivateAuthSettlementFailureClassNeverThrow(classifiedTracker, classifiedCause) ===
        false,
    "classified auth settlement failure retention drift"
  );
  const classifiedLines = [];
  const classifiedSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    classifiedLines.push(line);
  });
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(classifiedTracker, classifiedSink) === true &&
      classifiedLines.length === 1 &&
      classifiedLines[0] === expectedClassifiedLine,
    "classified auth settlement diagnostic exact bytes drift"
  );
  const unclassifiedTracker = trackerAtAction(classifiedFailureActionId);
  invariant(
    retainPrivateAuthSettlementFailureClassNeverThrow(
      unclassifiedTracker,
      new Error(diagnosticPrivateMarker)
    ) === false,
    "unbranded auth settlement failure was classified"
  );
  const unclassifiedLines = [];
  const unclassifiedSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    unclassifiedLines.push(line);
  });
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(unclassifiedTracker, unclassifiedSink) === true &&
      unclassifiedLines.length === 1 &&
      unclassifiedLines[0] ===
        '{"code":"task540_smoke_failed","failedActionId":"' + classifiedFailureActionId + '"}\n' &&
      !unclassifiedLines[0].includes(diagnosticPrivateMarker),
    "unclassified auth settlement diagnostic containment drift"
  );
  let invalidFailureClassRejected = false;
  try {
    createPrivateAuthSettlementFailure("TASK540_PRIVATE_CLASS_DO_NOT_EGRESS");
  } catch {
    invalidFailureClassRejected = true;
  }
  assertNegative(invalidFailureClassRejected, "invalid auth settlement failure class");

  const classifiedToneTracker = trackerAtAction(toneOpenFailureAction.id);
  const classifiedToneCause = createPrivateToneOpenFailure(TONE_OPEN_BROWSER_FAILURE_CLASSES[2], {
    cause: new Error(toneOpenPrivateMarker),
  });
  invariant(
    PRIVATE_TONE_OPEN_FAILURE_DETAILS.get(classifiedToneCause)?.cause?.message ===
      toneOpenPrivateMarker &&
      retainPrivateToneOpenFailureClassNeverThrow(classifiedToneTracker, classifiedToneCause) ===
        true &&
      retainPrivateToneOpenFailureClassNeverThrow(classifiedToneTracker, classifiedToneCause) ===
        false,
    "classified tone-open failure retention drift"
  );
  const retainedToneLines = [];
  const retainedToneSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    retainedToneLines.push(line);
  });
  const expectedRetainedToneLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: toneOpenFailureAction.id,
      failureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[2],
    }) + "\n";
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(classifiedToneTracker, retainedToneSink) ===
      true &&
      retainedToneLines.length === 1 &&
      retainedToneLines[0] === expectedRetainedToneLine &&
      !retainedToneLines[0].includes(toneOpenPrivateMarker),
    "classified tone-open diagnostic exact bytes drift"
  );
  const unclassifiedToneTracker = trackerAtAction(toneOpenFailureAction.id);
  invariant(
    retainPrivateToneOpenFailureClassNeverThrow(
      unclassifiedToneTracker,
      new Error(toneOpenPrivateMarker)
    ) === false &&
      retainPrivateAuthSettlementFailureClassNeverThrow(
        unclassifiedToneTracker,
        createPrivateAuthSettlementFailure("login_route")
      ) === false,
    "unclassified tone-open failure was classified"
  );
  const unclassifiedToneLines = [];
  const unclassifiedToneSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    unclassifiedToneLines.push(line);
  });
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(unclassifiedToneTracker, unclassifiedToneSink) ===
      true &&
      unclassifiedToneLines.length === 1 &&
      unclassifiedToneLines[0] ===
        canonicalJson({
          code: TASK_FAILURE.code,
          failedActionId: toneOpenFailureAction.id,
        }) +
          "\n" &&
      !unclassifiedToneLines[0].includes(toneOpenPrivateMarker),
    "unclassified tone-open diagnostic containment drift"
  );
  let invalidToneFailureClassRejected = false;
  try {
    createPrivateToneOpenFailure(toneOpenPrivateMarker);
  } catch {
    invalidToneFailureClassRejected = true;
  }
  assertNegative(invalidToneFailureClassRejected, "invalid tone-open failure class");

  const classifiedToneSelectTracker = trackerAtAction(toneSelectFailureAction.id);
  const classifiedToneSelectCause = createPrivateToneSelectFailure(
    TONE_SELECT_BROWSER_FAILURE_CLASSES[4]
  );
  invariant(
    PRIVATE_TONE_SELECT_FAILURE_CLASSES.get(classifiedToneSelectCause) ===
      TONE_SELECT_BROWSER_FAILURE_CLASSES[4] &&
      retainPrivateToneSelectFailureClassNeverThrow(
        classifiedToneSelectTracker,
        classifiedToneSelectCause
      ) === true &&
      retainPrivateToneSelectFailureClassNeverThrow(
        classifiedToneSelectTracker,
        classifiedToneSelectCause
      ) === false,
    "classified tone-select failure retention drift"
  );
  const retainedToneSelectLines = [];
  const retainedToneSelectSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    retainedToneSelectLines.push(line);
  });
  const expectedRetainedToneSelectLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: toneSelectFailureAction.id,
      failureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[4],
    }) + "\n";
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(
      classifiedToneSelectTracker,
      retainedToneSelectSink
    ) === true &&
      retainedToneSelectLines.length === 1 &&
      retainedToneSelectLines[0] === expectedRetainedToneSelectLine &&
      !retainedToneSelectLines[0].includes(toneSelectPrivateMarker),
    "classified tone-select diagnostic exact bytes drift"
  );
  const unclassifiedToneSelectTracker = trackerAtAction(toneSelectFailureAction.id);
  invariant(
    retainPrivateToneSelectFailureClassNeverThrow(
      unclassifiedToneSelectTracker,
      new Error(toneSelectPrivateMarker)
    ) === false &&
      retainPrivateToneOpenFailureClassNeverThrow(
        unclassifiedToneSelectTracker,
        createPrivateToneOpenFailure(TONE_OPEN_BROWSER_FAILURE_CLASSES[0])
      ) === false &&
      retainPrivateAuthSettlementFailureClassNeverThrow(
        unclassifiedToneSelectTracker,
        createPrivateAuthSettlementFailure("login_route")
      ) === false &&
      retainPrivateToneSelectFailureClassNeverThrow(
        trackerAtAction(toneOpenFailureAction.id),
        createPrivateToneSelectFailure(TONE_SELECT_BROWSER_FAILURE_CLASSES[0])
      ) === false,
    "unclassified tone-select failure was classified"
  );
  const unclassifiedToneSelectLines = [];
  const unclassifiedToneSelectSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    unclassifiedToneSelectLines.push(line);
  });
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(
      unclassifiedToneSelectTracker,
      unclassifiedToneSelectSink
    ) === true &&
      unclassifiedToneSelectLines.length === 1 &&
      unclassifiedToneSelectLines[0] ===
        canonicalJson({
          code: TASK_FAILURE.code,
          failedActionId: toneSelectFailureAction.id,
        }) +
          "\n" &&
      !unclassifiedToneSelectLines[0].includes(toneSelectPrivateMarker),
    "unclassified tone-select diagnostic containment drift"
  );
  let invalidToneSelectFailureClassRejected = false;
  try {
    createPrivateToneSelectFailure(toneSelectPrivateMarker);
  } catch {
    invalidToneSelectFailureClassRejected = true;
  }
  assertNegative(invalidToneSelectFailureClassRejected, "invalid tone-select failure class");

  const classifiedDirtyNavigationTracker = trackerAtAction(dirtyNavigationFailureAction.id);
  const classifiedDirtyNavigationCause = createPrivateDirtyNavigationFailure(
    DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8],
    { cause: new Error(dirtyNavigationPrivateMarker) }
  );
  invariant(
    PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS.get(classifiedDirtyNavigationCause)?.cause?.message ===
      dirtyNavigationPrivateMarker &&
      retainPrivateDirtyNavigationFailureClassNeverThrow(
        classifiedDirtyNavigationTracker,
        classifiedDirtyNavigationCause
      ) === true &&
      retainPrivateDirtyNavigationFailureClassNeverThrow(
        classifiedDirtyNavigationTracker,
        classifiedDirtyNavigationCause
      ) === false,
    "classified dirty-navigation failure retention drift"
  );
  const retainedDirtyNavigationLines = [];
  const retainedDirtyNavigationSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    retainedDirtyNavigationLines.push(line);
  });
  const expectedRetainedDirtyNavigationLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: dirtyNavigationFailureAction.id,
      failureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8],
    }) + "\n";
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(
      classifiedDirtyNavigationTracker,
      retainedDirtyNavigationSink
    ) === true &&
      retainedDirtyNavigationLines.length === 1 &&
      retainedDirtyNavigationLines[0] === expectedRetainedDirtyNavigationLine &&
      !retainedDirtyNavigationLines[0].includes(dirtyNavigationPrivateMarker),
    "classified dirty-navigation diagnostic exact bytes drift"
  );
  const unclassifiedDirtyNavigationTracker = trackerAtAction(dirtyNavigationFailureAction.id);
  invariant(
    retainPrivateDirtyNavigationFailureClassNeverThrow(
      unclassifiedDirtyNavigationTracker,
      new Error(dirtyNavigationPrivateMarker)
    ) === false &&
      retainPrivateToneOpenFailureClassNeverThrow(
        unclassifiedDirtyNavigationTracker,
        createPrivateToneOpenFailure(TONE_OPEN_BROWSER_FAILURE_CLASSES[0])
      ) === false &&
      retainPrivateToneSelectFailureClassNeverThrow(
        unclassifiedDirtyNavigationTracker,
        createPrivateToneSelectFailure(TONE_SELECT_BROWSER_FAILURE_CLASSES[0])
      ) === false &&
      retainPrivateAuthSettlementFailureClassNeverThrow(
        unclassifiedDirtyNavigationTracker,
        createPrivateAuthSettlementFailure("login_route")
      ) === false &&
      retainPrivateDirtyNavigationFailureClassNeverThrow(
        trackerAtAction(toneOpenFailureAction.id),
        createPrivateDirtyNavigationFailure(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0])
      ) === false,
    "unclassified dirty-navigation failure was classified"
  );
  const unclassifiedDirtyNavigationLines = [];
  const unclassifiedDirtyNavigationSink = createPrivateBoundedFailureActionDiagnosticSink(
    (line) => {
      unclassifiedDirtyNavigationLines.push(line);
    }
  );
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(
      unclassifiedDirtyNavigationTracker,
      unclassifiedDirtyNavigationSink
    ) === true &&
      unclassifiedDirtyNavigationLines.length === 1 &&
      unclassifiedDirtyNavigationLines[0] ===
        canonicalJson({
          code: TASK_FAILURE.code,
          failedActionId: dirtyNavigationFailureAction.id,
        }) +
          "\n" &&
      !unclassifiedDirtyNavigationLines[0].includes(dirtyNavigationPrivateMarker),
    "unclassified dirty-navigation diagnostic containment drift"
  );
  let invalidDirtyNavigationFailureClassRejected = false;
  try {
    createPrivateDirtyNavigationFailure(dirtyNavigationPrivateMarker);
  } catch {
    invalidDirtyNavigationFailureClassRejected = true;
  }
  assertNegative(
    invalidDirtyNavigationFailureClassRejected,
    "invalid dirty-navigation failure class"
  );

  return Object.freeze({
    explicitNegativeCases: 8,
    trackerAtAction,
  });
}
