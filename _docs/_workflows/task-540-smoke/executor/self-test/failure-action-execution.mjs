import {
  AUTH_SETTLEMENT_ACTION_IDS,
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  TASK_FAILURE,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";

export async function runFailureActionExecutionSelfTest({
  buildFakeCapabilities,
  createPrivateAuthSettlementFailure,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  createPrivateDirtyNavigationFailure,
  createPrivateToneOpenFailure,
  createPrivateToneSelectFailure,
  executeTask540SmokePlanWithAuthorityFactory,
  plan,
}) {
  const diagnosticPrivateMarker = "TASK540_PRIVATE_DIAGNOSTIC_DO_NOT_EGRESS";
  const diagnosticFailureAction = plan.actionManifest[24];
  const diagnosticCapabilities = buildFakeCapabilities();
  const diagnosticExecuteAction = diagnosticCapabilities.executeAction.bind(diagnosticCapabilities);
  diagnosticCapabilities.executeAction = async (context) => {
    if (context.action.id === diagnosticFailureAction.id) throw new Error(diagnosticPrivateMarker);
    return diagnosticExecuteAction(context);
  };
  const diagnosticLines = [];
  const diagnosticSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      diagnosticCapabilities.cleaned && diagnosticCapabilities.calls.at(-1) === "failure-cleanup",
      "failure action diagnostic preceded cleanup"
    );
    diagnosticLines.push(line);
    throw new Error("private diagnostic sink failure");
  });
  const diagnosticInput = {
    root: "/task540-self-test-root",
    nonce: "0123456789ab",
    assertSafeEvidence() {},
    snapshotRepository() {},
  };
  let diagnosticFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => diagnosticCapabilities,
      diagnosticSink
    );
  } catch (error) {
    diagnosticFailure = error;
  }
  const expectedDiagnosticLine =
    '{"code":"task540_smoke_failed","failedActionId":"' + diagnosticFailureAction.id + '"}\n';
  invariant(diagnosticFailure === TASK_FAILURE, "failure action diagnostic changed public error");
  invariant(diagnosticLines.length === 1, "failure action diagnostic write cardinality drift");
  invariant(
    diagnosticLines[0] === expectedDiagnosticLine,
    "failure action diagnostic exact bytes drift"
  );
  invariant(
    !diagnosticLines[0].includes(diagnosticPrivateMarker),
    "failure action diagnostic leaked a private marker"
  );

  const classifiedFailureActionId = AUTH_SETTLEMENT_ACTION_IDS[0];
  const classifiedCapabilities = buildFakeCapabilities();
  const classifiedExecuteAction = classifiedCapabilities.executeAction.bind(classifiedCapabilities);
  classifiedCapabilities.executeAction = async (context) => {
    if (context.action.id === classifiedFailureActionId) {
      throw createPrivateAuthSettlementFailure("login_route");
    }
    return classifiedExecuteAction(context);
  };
  const classifiedExecutionLines = [];
  const classifiedExecutionSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      classifiedCapabilities.cleaned && classifiedCapabilities.calls.at(-1) === "failure-cleanup",
      "classified failure diagnostic preceded cleanup"
    );
    classifiedExecutionLines.push(line);
  });
  let classifiedPublicFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => classifiedCapabilities,
      classifiedExecutionSink
    );
  } catch (error) {
    classifiedPublicFailure = error;
  }
  const expectedClassifiedLine =
    '{"code":"task540_smoke_failed","failedActionId":"' +
    classifiedFailureActionId +
    '","failureClass":"login_route"}\n';
  invariant(
    classifiedPublicFailure === TASK_FAILURE &&
      classifiedExecutionLines.length === 1 &&
      classifiedExecutionLines[0] === expectedClassifiedLine,
    "classified auth settlement execution diagnostic drift"
  );

  const toneOpenFailureAction = plan.actionManifest.find(
    ({ id }) => id === TONE_MENU_OPEN_ACTION_IDS[0]
  );
  invariant(toneOpenFailureAction !== undefined, "classified tone-open action is absent");
  const toneOpenPrivateMarker = "TASK540_TONE_OPEN_PRIVATE_DO_NOT_EGRESS";
  const classifiedToneCapabilities = buildFakeCapabilities();
  const classifiedToneExecuteAction = classifiedToneCapabilities.executeAction.bind(
    classifiedToneCapabilities
  );
  classifiedToneCapabilities.executeAction = async (context) => {
    if (context.action.id === toneOpenFailureAction.id) {
      throw createPrivateToneOpenFailure(TONE_OPEN_BROWSER_FAILURE_CLASSES[1], {
        cause: new Error(toneOpenPrivateMarker),
      });
    }
    return classifiedToneExecuteAction(context);
  };
  const classifiedToneLines = [];
  const classifiedToneSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      classifiedToneCapabilities.cleaned &&
        classifiedToneCapabilities.calls.at(-1) === "failure-cleanup",
      "classified tone-open diagnostic preceded cleanup"
    );
    classifiedToneLines.push(line);
  });
  let classifiedTonePublicFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => classifiedToneCapabilities,
      classifiedToneSink
    );
  } catch (error) {
    classifiedTonePublicFailure = error;
  }
  const expectedClassifiedToneLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: toneOpenFailureAction.id,
      failureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[1],
    }) + "\n";
  invariant(
    classifiedTonePublicFailure === TASK_FAILURE &&
      classifiedToneCapabilities.cleanupExecutions === 1 &&
      classifiedToneLines.length === 1 &&
      classifiedToneLines[0] === expectedClassifiedToneLine &&
      !classifiedToneLines[0].includes(toneOpenPrivateMarker),
    "classified tone-open execution diagnostic drift"
  );

  const toneSelectFailureAction = plan.actionManifest.find(
    ({ id }) => id === TONE_MUTED_ACTION_IDS[0]
  );
  invariant(toneSelectFailureAction !== undefined, "classified tone-select action is absent");
  const toneSelectPrivateMarker = "TASK540_TONE_SELECT_PRIVATE_DO_NOT_EGRESS";
  const classifiedToneSelectCapabilities = buildFakeCapabilities();
  const classifiedToneSelectExecuteAction = classifiedToneSelectCapabilities.executeAction.bind(
    classifiedToneSelectCapabilities
  );
  classifiedToneSelectCapabilities.executeAction = async (context) => {
    if (context.action.id === toneSelectFailureAction.id) {
      throw createPrivateToneSelectFailure(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]);
    }
    return classifiedToneSelectExecuteAction(context);
  };
  const classifiedToneSelectLines = [];
  const classifiedToneSelectSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      classifiedToneSelectCapabilities.cleaned &&
        classifiedToneSelectCapabilities.calls.at(-1) === "failure-cleanup",
      "classified tone-select diagnostic preceded cleanup"
    );
    classifiedToneSelectLines.push(line);
  });
  let classifiedToneSelectPublicFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => classifiedToneSelectCapabilities,
      classifiedToneSelectSink
    );
  } catch (error) {
    classifiedToneSelectPublicFailure = error;
  }
  const expectedClassifiedToneSelectLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: toneSelectFailureAction.id,
      failureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[2],
    }) + "\n";
  invariant(
    classifiedToneSelectPublicFailure === TASK_FAILURE &&
      classifiedToneSelectCapabilities.cleanupExecutions === 1 &&
      classifiedToneSelectLines.length === 1 &&
      classifiedToneSelectLines[0] === expectedClassifiedToneSelectLine &&
      !classifiedToneSelectLines[0].includes(toneSelectPrivateMarker),
    "classified tone-select execution diagnostic drift"
  );

  const dirtyNavigationFailureAction = plan.actionManifest.find(
    ({ id }) => id === "dg-024-entry-nav-cancel"
  );
  invariant(
    dirtyNavigationFailureAction !== undefined,
    "classified dirty-navigation action is absent"
  );
  const dirtyNavigationPrivateMarker = "TASK540_DIRTY_NAVIGATION_PRIVATE_DO_NOT_EGRESS";
  const classifiedDirtyNavigationCapabilities = buildFakeCapabilities();
  const classifiedDirtyNavigationExecuteAction =
    classifiedDirtyNavigationCapabilities.executeAction.bind(classifiedDirtyNavigationCapabilities);
  classifiedDirtyNavigationCapabilities.executeAction = async (context) => {
    if (context.action.id === dirtyNavigationFailureAction.id) {
      throw createPrivateDirtyNavigationFailure(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7], {
        cause: new Error(dirtyNavigationPrivateMarker),
      });
    }
    return classifiedDirtyNavigationExecuteAction(context);
  };
  const classifiedDirtyNavigationLines = [];
  const classifiedDirtyNavigationSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      classifiedDirtyNavigationCapabilities.cleaned &&
        classifiedDirtyNavigationCapabilities.calls.at(-1) === "failure-cleanup",
      "classified dirty-navigation diagnostic preceded cleanup"
    );
    classifiedDirtyNavigationLines.push(line);
  });
  let classifiedDirtyNavigationPublicFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => classifiedDirtyNavigationCapabilities,
      classifiedDirtyNavigationSink
    );
  } catch (error) {
    classifiedDirtyNavigationPublicFailure = error;
  }
  const expectedClassifiedDirtyNavigationLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      failedActionId: dirtyNavigationFailureAction.id,
      failureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7],
    }) + "\n";
  invariant(
    classifiedDirtyNavigationPublicFailure === TASK_FAILURE &&
      classifiedDirtyNavigationCapabilities.cleanupExecutions === 1 &&
      classifiedDirtyNavigationLines.length === 1 &&
      classifiedDirtyNavigationLines[0] === expectedClassifiedDirtyNavigationLine &&
      !classifiedDirtyNavigationLines[0].includes(dirtyNavigationPrivateMarker),
    "classified dirty-navigation execution diagnostic drift"
  );

  return Object.freeze({
    classifiedFailureActionId,
    diagnosticInput,
    diagnosticPrivateMarker,
    dirtyNavigationFailureAction,
    dirtyNavigationPrivateMarker,
    expectedClassifiedLine,
    explicitNegativeCases: 5,
    toneOpenFailureAction,
    toneOpenPrivateMarker,
    toneSelectFailureAction,
    toneSelectPrivateMarker,
  });
}
