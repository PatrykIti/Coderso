import { Script } from "node:vm";

import {
  AUTH_SETTLEMENT_ACTION_IDS,
  AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES,
  AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES,
  AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES,
  AUTH_SETTLEMENT_FAILURE_FRAMES,
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES,
  DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES,
  DIRTY_NAVIGATION_FAILURE_FRAMES,
  DIRTY_NAVIGATION_REQUEST_ACTION_IDS,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  SAFE_IDENTIFIER_PATTERN,
  TASK_FAILURE,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_OPEN_FAILURE_FRAMES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_FAILURE_FRAMES,
  dirtyNavigationBrowserFailureClassesForAction,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";
import { parseRegisteredOutput } from "../output-parser.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runFailureFramesSelfTest({
  authSettlementCompiledSources,
  buildFakeCapabilities,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  executeTask540SmokePlanWithAuthorityFactory,
  executionFixtures,
  failureBoundary,
  normalizeBrowserCommandOutput,
  plan,
  selfTestContext,
}) {
  const {
    classifyPrivateAuthSettlementFailureFrame,
    classifyPrivateDirtyNavigationFailureFrame,
    classifyPrivateToneOpenFailureFrame,
    classifyPrivateToneSelectFailureFrame,
    createPrivateAuthSettlementFailure,
  } = failureBoundary;
  const {
    diagnosticInput,
    dirtyNavigationFailureAction,
    dirtyNavigationPrivateMarker,
    expectedClassifiedLine,
    toneOpenFailureAction,
    toneOpenPrivateMarker,
    toneSelectFailureAction,
    toneSelectPrivateMarker,
  } = executionFixtures;

  const bootstrapSettlementAction = plan.actionManifest.find(
    ({ id }) => id === AUTH_SETTLEMENT_ACTION_IDS[0]
  );
  const bootstrapSettlementSource = authSettlementCompiledSources.get(
    AUTH_SETTLEMENT_ACTION_IDS[0]
  );
  invariant(
    bootstrapSettlementAction !== undefined && typeof bootstrapSettlementSource === "string",
    "bootstrap auth settlement behavioral source is absent"
  );
  const runGeneratedBootstrapSettlement = async ({
    url = plan.fixtureBlueprint.origins.admin + "/admin/",
    menuCount = 0,
    loadingVisible = false,
    labelCount = 1,
    userName = "Bootstrap Admin",
    menuRect = { x: 10, y: 10, width: 120, height: 36 },
    menuVisible = true,
    runtimeFailure = false,
    domReadFailure = false,
    closeDuringWait = false,
  } = {}) => {
    let clock = 0;
    let closed = false;
    const context = {
      __wf540ReadLogProjection: () => ({
        firstUnexpected: runtimeFailure ? { channel: "pageErrors", code: "page_other" } : null,
      }),
      __wf540Remember: () => true,
    };
    const label = {
      count: async () => labelCount,
      textContent: async () => userName,
    };
    const menu = {
      count: async () => {
        if (domReadFailure) throw new Error("TASK540_PRIVATE_DOM_FAILURE_DO_NOT_EGRESS");
        return menuCount;
      },
      locator: () => label,
      boundingBox: async () => menuRect,
      isVisible: async () => menuVisible,
    };
    const loading = {
      count: async () => (loadingVisible ? 1 : 0),
      first: () => ({ isVisible: async () => loadingVisible }),
    };
    const page = {
      context: () => context,
      getByText: () => loading,
      isClosed: () => closed,
      locator: () => menu,
      url: () => url,
      waitForTimeout: async () => {
        clock = 180000;
        if (closeDuringWait) {
          closed = true;
          throw new Error("TASK540_PRIVATE_PAGE_CLOSE_DO_NOT_EGRESS");
        }
      },
    };
    const executableSource = new Script("(" + bootstrapSettlementSource + ")", {
      filename: "task-540-bootstrap-auth-settlement.behavioral-self-test.js",
    }).runInNewContext({ Date: Object.freeze({ now: () => clock }) });
    return executableSource(page);
  };
  const successfulGeneratedSettlement = await runGeneratedBootstrapSettlement({ menuCount: 1 });
  const successfulGeneratedFrame = Buffer.from(
    JSON.stringify(successfulGeneratedSettlement) + "\n"
  );
  invariant(
    deepEqualJson(successfulGeneratedSettlement, {
      url: plan.fixtureBlueprint.origins.admin + "/admin/",
      userMenuVisible: true,
      userName: "Bootstrap Admin",
    }) &&
      classifyPrivateAuthSettlementFailureFrame(
        bootstrapSettlementAction.id,
        successfulGeneratedFrame
      ) === null,
    "generated bootstrap auth settlement success behavior drift"
  );
  parseRegisteredOutput(
    plan.registries.outputs[bootstrapSettlementAction.outputSchemaId],
    successfulGeneratedFrame,
    bootstrapSettlementAction.id,
    selfTestContext(plan, bootstrapSettlementAction.id)
  );
  const generatedFailureCases = [
    [
      "login_route",
      { url: plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login },
    ],
    ["loading_view", { loadingVisible: true }],
    ["menu_absent", {}],
    ["runtime_failure", { runtimeFailure: true }],
    ["dom_read_failed", { domReadFailure: true }],
    [
      "page_closed",
      {
        closeDuringWait: true,
        url: plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login,
      },
    ],
  ];
  const generatedFailureFrames = new Map();
  for (const [expectedFailureClass, options] of generatedFailureCases) {
    const generatedOutput = await runGeneratedBootstrapSettlement(options);
    const frame = Buffer.from(JSON.stringify(generatedOutput) + "\n");
    invariant(
      deepEqualJson(generatedOutput, { settled: false, failureClass: expectedFailureClass }) &&
        frame.equals(Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES[expectedFailureClass], "utf8")) &&
        classifyPrivateAuthSettlementFailureFrame(bootstrapSettlementAction.id, frame) ===
          expectedFailureClass,
      expectedFailureClass + " generated auth settlement behavior drift"
    );
    generatedFailureFrames.set(expectedFailureClass, frame);
  }
  const generatedDiagnosticCapabilities = buildFakeCapabilities();
  const generatedDiagnosticExecuteAction = generatedDiagnosticCapabilities.executeAction.bind(
    generatedDiagnosticCapabilities
  );
  generatedDiagnosticCapabilities.executeAction = async (context) => {
    if (context.action.id !== bootstrapSettlementAction.id) {
      return generatedDiagnosticExecuteAction(context);
    }
    const normalizedFrame = await normalizeBrowserCommandOutput(
      {},
      context.action,
      context.action.executable,
      generatedFailureFrames.get("login_route"),
      {}
    );
    const failureClass = classifyPrivateAuthSettlementFailureFrame(
      context.action.id,
      normalizedFrame
    );
    invariant(failureClass !== null, "generated auth settlement frame was not classified");
    throw createPrivateAuthSettlementFailure(failureClass);
  };
  const generatedDiagnosticLines = [];
  const generatedDiagnosticSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    invariant(
      generatedDiagnosticCapabilities.cleaned &&
        generatedDiagnosticCapabilities.calls.at(-1) === "failure-cleanup",
      "generated auth settlement diagnostic preceded cleanup"
    );
    generatedDiagnosticLines.push(line);
  });
  let generatedPublicFailure = null;
  try {
    await executeTask540SmokePlanWithAuthorityFactory(
      diagnosticInput,
      createPrivateConstructionCleanupAuthority,
      async () => generatedDiagnosticCapabilities,
      generatedDiagnosticSink
    );
  } catch (error) {
    generatedPublicFailure = error;
  }
  invariant(
    generatedPublicFailure === TASK_FAILURE &&
      generatedDiagnosticLines.length === 1 &&
      generatedDiagnosticLines[0] === expectedClassifiedLine,
    "generated auth settlement frame-to-diagnostic pipeline drift"
  );

  for (const actionId of AUTH_SETTLEMENT_ACTION_IDS) {
    for (const failureClass of AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES) {
      invariant(
        classifyPrivateAuthSettlementFailureFrame(
          actionId,
          Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES[failureClass], "utf8")
        ) === failureClass,
        actionId + " " + failureClass + " classified frame drift"
      );
    }
  }
  const untrustedAuthSettlementFrames = [
    canonicalJson({ failureClass: "not_allowlisted", settled: false }) + "\n",
    canonicalJson({
      failureClass: AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES[0],
      rawUrl: "TASK540_PRIVATE_URL_DO_NOT_EGRESS",
      settled: false,
    }) + "\n",
    canonicalJson({
      body: "TASK540_PRIVATE_BODY_DO_NOT_EGRESS",
      failureClass: AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES[0],
      settled: false,
    }) + "\n",
    canonicalJson({ failureClass: AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES[0], settled: true }) +
      "\n",
  ];
  for (const frame of untrustedAuthSettlementFrames) {
    invariant(
      classifyPrivateAuthSettlementFailureFrame(
        AUTH_SETTLEMENT_ACTION_IDS[0],
        Buffer.from(frame, "utf8")
      ) === null,
      "untrusted auth settlement frame was classified"
    );
  }
  invariant(
    classifyPrivateAuthSettlementFailureFrame(
      "set-011-login-submit",
      Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8")
    ) === null,
    "non-settlement action accepted a classified frame"
  );


  invariant(
    deepEqualJson(TONE_OPEN_BROWSER_FAILURE_CLASSES, [
      "tone_target_precondition",
      "tone_draft_dirty_precondition",
      "tone_trigger_open",
      "tone_portal_settlement",
    ]) &&
      TONE_MENU_OPEN_ACTION_IDS.length === 2 &&
      new Set(TONE_MENU_OPEN_ACTION_IDS).size === TONE_MENU_OPEN_ACTION_IDS.length &&
      TONE_OPEN_BROWSER_FAILURE_CLASSES.length === 4 &&
      new Set(TONE_OPEN_BROWSER_FAILURE_CLASSES).size ===
        TONE_OPEN_BROWSER_FAILURE_CLASSES.length &&
      TONE_MENU_OPEN_ACTION_IDS.every(
        (actionId) => !AUTH_SETTLEMENT_ACTION_IDS.includes(actionId)
      ) &&
      TONE_OPEN_BROWSER_FAILURE_CLASSES.every(
        (failureClass) =>
          SAFE_IDENTIFIER_PATTERN.test(failureClass) &&
          !AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass) &&
          Buffer.byteLength(TONE_OPEN_FAILURE_FRAMES[failureClass]) <=
            MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
      ),
    "tone-open diagnostic allowlist drift"
  );
  for (const actionId of TONE_MENU_OPEN_ACTION_IDS) {
    for (const failureClass of TONE_OPEN_BROWSER_FAILURE_CLASSES) {
      invariant(
        classifyPrivateToneOpenFailureFrame(
          actionId,
          Buffer.from(TONE_OPEN_FAILURE_FRAMES[failureClass], "utf8")
        ) === failureClass,
        actionId + " " + failureClass + " classified frame drift"
      );
    }
  }
  const untrustedToneOpenFrames = [
    canonicalJson({ failureClass: "not_allowlisted", settled: false }) + "\n",
    canonicalJson({
      failureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[0],
      privateMarker: toneOpenPrivateMarker,
      settled: false,
    }) + "\n",
    canonicalJson({
      failureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[0],
      settled: true,
    }) + "\n",
    TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]] + "{}\n",
  ];
  for (const frame of untrustedToneOpenFrames) {
    invariant(
      classifyPrivateToneOpenFailureFrame(toneOpenFailureAction.id, Buffer.from(frame, "utf8")) ===
        null,
      "untrusted tone-open frame was classified"
    );
  }
  invariant(
    classifyPrivateToneOpenFailureFrame(
      TONE_MUTED_ACTION_IDS[0],
      Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]], "utf8")
    ) === null &&
      classifyPrivateToneOpenFailureFrame(
        AUTH_SETTLEMENT_ACTION_IDS[0],
        Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]], "utf8")
      ) === null &&
      classifyPrivateToneOpenFailureFrame(
        toneOpenFailureAction.id,
        Buffer.alloc(MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES + 1, 0x61)
      ) === null &&
      classifyPrivateToneOpenFailureFrame(toneOpenFailureAction.id, "not-a-buffer") === null &&
      classifyPrivateAuthSettlementFailureFrame(
        toneOpenFailureAction.id,
        Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8")
      ) === null,
    "tone-open classified frame boundary drift"
  );


  invariant(
    deepEqualJson(TONE_MUTED_ACTION_IDS, ["dg-022-tone-muted", "rc-016-tone-muted"]) &&
      deepEqualJson(TONE_SELECT_BROWSER_FAILURE_CLASSES, [
        "tone_select_authority_option_precondition",
        "tone_select_menu_close",
        "tone_select_interaction_handoff",
        "tone_select_dirty_badges",
        "tone_select_selection_override",
        "tone_select_muted_class",
        "tone_select_computed_color_delta",
      ]) &&
      new Set(TONE_MUTED_ACTION_IDS).size === 2 &&
      new Set(TONE_SELECT_BROWSER_FAILURE_CLASSES).size === 7 &&
      TONE_MUTED_ACTION_IDS.every(
        (actionId) =>
          !AUTH_SETTLEMENT_ACTION_IDS.includes(actionId) &&
          !TONE_MENU_OPEN_ACTION_IDS.includes(actionId)
      ) &&
      TONE_SELECT_BROWSER_FAILURE_CLASSES.every(
        (failureClass) =>
          SAFE_IDENTIFIER_PATTERN.test(failureClass) &&
          !AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass) &&
          !TONE_OPEN_BROWSER_FAILURE_CLASSES.includes(failureClass) &&
          Buffer.byteLength(TONE_SELECT_FAILURE_FRAMES[failureClass]) <=
            MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
      ),
    "tone-select diagnostic allowlist drift"
  );
  let classifiedToneSelectFramePairs = 0;
  for (const actionId of TONE_MUTED_ACTION_IDS) {
    for (const failureClass of TONE_SELECT_BROWSER_FAILURE_CLASSES) {
      invariant(
        classifyPrivateToneSelectFailureFrame(
          actionId,
          Buffer.from(TONE_SELECT_FAILURE_FRAMES[failureClass], "utf8")
        ) === failureClass,
        actionId + " " + failureClass + " classified frame drift"
      );
      classifiedToneSelectFramePairs += 1;
    }
  }
  invariant(classifiedToneSelectFramePairs === 14, "tone-select 2x7 frame matrix drift");
  const firstToneSelectFailureClass = TONE_SELECT_BROWSER_FAILURE_CLASSES[0];
  const untrustedToneSelectFrames = [
    canonicalJson({ failureClass: "not_allowlisted", settled: false }) + "\n",
    canonicalJson({
      failureClass: firstToneSelectFailureClass,
      privateMarker: toneSelectPrivateMarker,
      settled: false,
    }) + "\n",
    canonicalJson({ failureClass: firstToneSelectFailureClass, settled: true }) + "\n",
    '{"settled":false,"failureClass":' + JSON.stringify(firstToneSelectFailureClass) + "}\n",
    TONE_SELECT_FAILURE_FRAMES[firstToneSelectFailureClass] + "{}\n",
  ];
  for (const frame of untrustedToneSelectFrames) {
    invariant(
      classifyPrivateToneSelectFailureFrame(
        toneSelectFailureAction.id,
        Buffer.from(frame, "utf8")
      ) === null,
      "untrusted tone-select frame was classified"
    );
  }
  invariant(
    classifyPrivateToneSelectFailureFrame(
      TONE_MENU_OPEN_ACTION_IDS[0],
      Buffer.from(TONE_SELECT_FAILURE_FRAMES[firstToneSelectFailureClass], "utf8")
    ) === null &&
      classifyPrivateToneSelectFailureFrame(
        AUTH_SETTLEMENT_ACTION_IDS[0],
        Buffer.from(TONE_SELECT_FAILURE_FRAMES[firstToneSelectFailureClass], "utf8")
      ) === null &&
      classifyPrivateToneSelectFailureFrame(
        toneSelectFailureAction.id,
        Buffer.alloc(MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES + 1, 0x61)
      ) === null &&
      classifyPrivateToneSelectFailureFrame(toneSelectFailureAction.id, "not-a-buffer") === null &&
      classifyPrivateToneOpenFailureFrame(
        toneSelectFailureAction.id,
        Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]], "utf8")
      ) === null &&
      classifyPrivateAuthSettlementFailureFrame(
        toneSelectFailureAction.id,
        Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8")
      ) === null,
    "tone-select classified frame boundary drift"
  );


  invariant(
    deepEqualJson(DIRTY_NAVIGATION_REQUEST_ACTION_IDS, [
      "dg-012-builder-nav-cancel",
      "dg-015-builder-nav-confirm",
      "dg-024-entry-nav-cancel",
      "dg-037-entry-nav-confirm",
      "rc-037a-exit-navigation",
    ]) &&
      deepEqualJson(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES, [
        "target_bound",
        "target_duplicate",
        "target_missing",
        "source_url",
        "scroll_locked",
        "inline_pointer_locked",
        "computed_pointer_locked",
        "target_intercepted",
        "click_failed",
        "dialog_duplicate",
        "not_suspended",
        "dialog_settlement",
      ]) &&
      deepEqualJson(
        DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES,
        AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES
      ) &&
      new Set(DIRTY_NAVIGATION_REQUEST_ACTION_IDS).size === 5 &&
      new Set(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES).size === 12 &&
      new Set(DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES).size ===
        DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES.length &&
      DIRTY_NAVIGATION_REQUEST_ACTION_IDS.every(
        (actionId) =>
          !AUTH_SETTLEMENT_ACTION_IDS.includes(actionId) &&
          !TONE_MENU_OPEN_ACTION_IDS.includes(actionId) &&
          !TONE_MUTED_ACTION_IDS.includes(actionId)
      ) &&
      DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES.every(
        (failureClass) =>
          SAFE_IDENTIFIER_PATTERN.test(failureClass) &&
          !AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass) &&
          !TONE_OPEN_BROWSER_FAILURE_CLASSES.includes(failureClass) &&
          !TONE_SELECT_BROWSER_FAILURE_CLASSES.includes(failureClass) &&
          Buffer.byteLength(DIRTY_NAVIGATION_FAILURE_FRAMES[failureClass]) <=
            MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
      ),
    "dirty-navigation diagnostic allowlist drift"
  );
  let classifiedDirtyNavigationFramePairs = 0;
  for (const actionId of DIRTY_NAVIGATION_REQUEST_ACTION_IDS) {
    for (const failureClass of dirtyNavigationBrowserFailureClassesForAction(actionId)) {
      invariant(
        classifyPrivateDirtyNavigationFailureFrame(
          actionId,
          Buffer.from(DIRTY_NAVIGATION_FAILURE_FRAMES[failureClass], "utf8")
        ) === failureClass,
        actionId + " " + failureClass + " classified frame drift"
      );
      classifiedDirtyNavigationFramePairs += 1;
    }
  }
  invariant(classifiedDirtyNavigationFramePairs === 60, "dirty-navigation 5x12 frame matrix drift");
  const firstDirtyNavigationFailureClass = DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0];
  const untrustedDirtyNavigationFrames = [
    canonicalJson({ failureClass: "not_allowlisted", settled: false }) + "\n",
    canonicalJson({
      failureClass: firstDirtyNavigationFailureClass,
      privateMarker: dirtyNavigationPrivateMarker,
      settled: false,
    }) + "\n",
    canonicalJson({ failureClass: firstDirtyNavigationFailureClass, settled: true }) + "\n",
    '{"settled":false,"failureClass":' + JSON.stringify(firstDirtyNavigationFailureClass) + "}\n",
    DIRTY_NAVIGATION_FAILURE_FRAMES[firstDirtyNavigationFailureClass] + "{}\n",
  ];
  for (const frame of untrustedDirtyNavigationFrames) {
    invariant(
      classifyPrivateDirtyNavigationFailureFrame(
        dirtyNavigationFailureAction.id,
        Buffer.from(frame, "utf8")
      ) === null,
      "untrusted dirty-navigation frame was classified"
    );
  }
  invariant(
    classifyPrivateDirtyNavigationFailureFrame(
      TONE_MENU_OPEN_ACTION_IDS[0],
      Buffer.from(DIRTY_NAVIGATION_FAILURE_FRAMES[firstDirtyNavigationFailureClass], "utf8")
    ) === null &&
      classifyPrivateDirtyNavigationFailureFrame(
        AUTH_SETTLEMENT_ACTION_IDS[0],
        Buffer.from(DIRTY_NAVIGATION_FAILURE_FRAMES[firstDirtyNavigationFailureClass], "utf8")
      ) === null &&
      classifyPrivateDirtyNavigationFailureFrame(
        dirtyNavigationFailureAction.id,
        Buffer.alloc(MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES + 1, 0x61)
      ) === null &&
      classifyPrivateDirtyNavigationFailureFrame(
        dirtyNavigationFailureAction.id,
        "not-a-buffer"
      ) === null &&
      classifyPrivateToneOpenFailureFrame(
        dirtyNavigationFailureAction.id,
        Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]], "utf8")
      ) === null &&
      classifyPrivateToneSelectFailureFrame(
        dirtyNavigationFailureAction.id,
        Buffer.from(TONE_SELECT_FAILURE_FRAMES[TONE_SELECT_BROWSER_FAILURE_CLASSES[0]], "utf8")
      ) === null &&
      classifyPrivateAuthSettlementFailureFrame(
        dirtyNavigationFailureAction.id,
        Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8")
      ) === null,
    "dirty-navigation classified frame boundary drift"
  );


  invariant(
    new Set(AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES).size ===
      AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.length &&
      AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES.every(
        (failureClass) => !AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES.includes(failureClass)
      ),
    "auth settlement diagnostic class partitions overlap"
  );

  return Object.freeze({
    bootstrapSettlementAction,
    explicitNegativeCases: 126,
    successfulGeneratedFrame,
  });
}
