import { Script } from "node:vm";

import {
  EXPECTED_AUTH_CHALLENGE_PHASES,
  RECORD_ENTRY_MENU_ACTION_IDS,
  RECORDS_WORKSPACE_ACTION_IDS,
} from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runSourceOwnershipAuthRateSelfTest({
  authArmSourceActionIds,
  authCloseSourceActionIds,
  authRateBarrierSourceActionIds,
  blockBaselineSourceActionIds,
  buildAuthRateWindowBarrierSource,
  buildBrowserInvocation,
  compileActionExecutionSpec,
  disabledAuthRatePolicy,
  enabledAuthRatePolicy,
  expectAsyncFailure,
  mediaIsolationSourceActionIds,
  observedPreviewRuntimeActionIds,
  plan,
  previewRuntimeActionSelectors,
  recordEntryMenuSourceActionIds,
  recordsWorkspaceSourceActionIds,
  sourceCaptures,
  sourceContext,
}) {
  invariant(
    deepEqualJson(observedPreviewRuntimeActionIds, [...previewRuntimeActionSelectors.keys()]),
    "nine preview runtime selector actions drift"
  );
  const requiredAuthRateBarrierIds = plan.requiredAuthRatePlan.epochs.flatMap(
    ({ endsAtBarrierActionId }) => (endsAtBarrierActionId === null ? [] : [endsAtBarrierActionId])
  );
  invariant(
    deepEqualJson(authRateBarrierSourceActionIds, requiredAuthRateBarrierIds),
    "auth rate barrier source ownership drift"
  );
  const disabledBarrierAction = plan.actionManifest.find(
    ({ id }) => id === requiredAuthRateBarrierIds[0]
  );
  invariant(disabledBarrierAction !== undefined, "disabled auth rate barrier fixture is absent");
  const disabledBarrierInvocation = buildBrowserInvocation(
    disabledBarrierAction,
    compileActionExecutionSpec(disabledBarrierAction),
    sourceCaptures,
    "/task540-self-test-root",
    "/task540-self-test-root/private",
    plan,
    { ...sourceContext, actionId: disabledBarrierAction.id },
    {
      csrfHeaderName: "x-self-test-csrf",
      authRatePolicy: disabledAuthRatePolicy,
    }
  );
  const disabledBarrierSource =
    disabledBarrierInvocation.args[disabledBarrierInvocation.args.indexOf("run-code") + 1];
  invariant(
    typeof disabledBarrierSource === "string" &&
      disabledBarrierSource.includes("if (0 > 0)") &&
      !disabledBarrierSource.includes("if (61000 > 0)"),
    "disabled auth rate barrier fast path drift"
  );
  const compileBarrierFunction = (policy, label) => {
    const source = buildAuthRateWindowBarrierSource(policy, plan);
    return new Script("(" + source + ")", { filename: label + ".self-test.js" }).runInThisContext();
  };
  const createBarrierHarness = (options = {}) => {
    const requestListeners = new Set();
    const waits = [];
    let rawUrl = plan.fixtureBlueprint.origins.admin + "/admin/custom-screens";
    let navigationCount = 4;
    let sampleIndex = 0;
    let onCalls = 0;
    let offCalls = 0;
    const rects = options.rects ?? [
      { x: 0, y: 0, width: 1280, height: 900 },
      { x: 0, y: 0, width: 1280, height: 900 },
    ];
    const harness = {
      emitAuthRequest() {
        this.emitRequestUrl(plan.fixtureBlueprint.origins.admin + "/admin/api/auth/install/status");
      },
      emitRequestUrl(value) {
        for (const listener of requestListeners) {
          listener({
            url: () => value,
          });
        }
      },
      setUrl(value) {
        rawUrl = value;
      },
      incrementNavigation() {
        navigationCount += 1;
      },
      get state() {
        return {
          listeners: requestListeners.size,
          offCalls,
          onCalls,
          sampleIndex,
          waits: [...waits],
        };
      },
    };
    const context = {
      on(event, listener) {
        invariant(event === "request" && typeof listener === "function", "barrier fake on drift");
        onCalls += 1;
        requestListeners.add(listener);
      },
      off(event, listener) {
        invariant(event === "request" && requestListeners.has(listener), "barrier fake off drift");
        offCalls += 1;
        requestListeners.delete(listener);
      },
    };
    const page = {
      context: () => context,
      locator(selector) {
        invariant(selector === "html", "barrier fake selector drift");
        const index = sampleIndex;
        return {
          count: async () => options.rootCount ?? 1,
          isVisible: async () => options.rootVisible ?? true,
          boundingBox: async () => {
            sampleIndex += 1;
            return rects[index] ?? rects.at(-1);
          },
        };
      },
      url: () => rawUrl,
      __wf540ReadNavigationCount: () => navigationCount,
      async waitForTimeout(milliseconds) {
        waits.push(milliseconds);
        if (options.onWait) await options.onWait(harness);
      },
    };
    return { harness, page };
  };
  const enabledBarrierFunction = compileBarrierFunction(
    enabledAuthRatePolicy,
    "enabled-auth-rate-barrier"
  );
  const enabledBarrierHarness = createBarrierHarness();
  const enabledBarrierOutput = await enabledBarrierFunction(enabledBarrierHarness.page);
  invariant(
    deepEqualJson(enabledBarrierOutput, { barrierSatisfied: true }) &&
      deepEqualJson(enabledBarrierHarness.harness.state.waits, [61_000]) &&
      enabledBarrierHarness.harness.state.sampleIndex === 2 &&
      enabledBarrierHarness.harness.state.onCalls === 1 &&
      enabledBarrierHarness.harness.state.offCalls === 1 &&
      enabledBarrierHarness.harness.state.listeners === 0,
    "enabled auth rate barrier execution drift"
  );
  const crossOriginBarrierHarness = createBarrierHarness({
    onWait: async (harness) =>
      harness.emitRequestUrl("https://assets.example.test:8443/app.js?theme=dark#bundle"),
  });
  invariant(
    deepEqualJson(await enabledBarrierFunction(crossOriginBarrierHarness.page), {
      barrierSatisfied: true,
    }) &&
      deepEqualJson(crossOriginBarrierHarness.harness.state.waits, [61_000]) &&
      crossOriginBarrierHarness.harness.state.listeners === 0 &&
      crossOriginBarrierHarness.harness.state.offCalls === 1,
    "valid cross-origin auth rate barrier request drift"
  );
  const disabledBarrierFunction = compileBarrierFunction(
    disabledAuthRatePolicy,
    "disabled-auth-rate-barrier"
  );
  const disabledExecutionHarness = createBarrierHarness();
  invariant(
    deepEqualJson(await disabledBarrierFunction(disabledExecutionHarness.page), {
      barrierSatisfied: true,
    }) &&
      disabledExecutionHarness.harness.state.waits.length === 0 &&
      disabledExecutionHarness.harness.state.sampleIndex === 2 &&
      disabledExecutionHarness.harness.state.listeners === 0,
    "disabled auth rate barrier execution drift"
  );
  for (const [label, options] of [
    ["barrier auth traffic", { onWait: async (harness) => harness.emitAuthRequest() }],
    ...[
      "not-an-http-url",
      "http://%/x",
      "http://[::1/x",
      "http://:80/x",
      "http://host:bad/x",
      "http://host:99999/x",
    ].map((value, index) => [
      "barrier invalid request URL " + (index + 1),
      { onWait: async (harness) => harness.emitRequestUrl(value) },
    ]),
    [
      "barrier URL drift",
      {
        onWait: async (harness) =>
          harness.setUrl(plan.fixtureBlueprint.origins.admin + "/admin/custom-screens/changed"),
      },
    ],
    [
      "barrier malformed page URL",
      { onWait: async (harness) => harness.setUrl("not-an-http-url") },
    ],
    ["barrier navigation drift", { onWait: async (harness) => harness.incrementNavigation() }],
    [
      "barrier after geometry",
      {
        rects: [
          { x: 0, y: 0, width: 1280, height: 900 },
          { x: 0, y: 0, width: 0, height: 900 },
        ],
      },
    ],
    [
      "barrier wait failure",
      {
        onWait: async () => {
          throw new Error("self-test wait");
        },
      },
    ],
  ]) {
    const failureHarness = createBarrierHarness(options);
    await expectAsyncFailure(async () => enabledBarrierFunction(failureHarness.page), label);
    invariant(
      failureHarness.harness.state.listeners === 0 &&
        failureHarness.harness.state.onCalls === 1 &&
        failureHarness.harness.state.offCalls === 1,
      label + " listener cleanup drift"
    );
  }
  invariant(
    deepEqualJson(
      authArmSourceActionIds.sort(),
      EXPECTED_AUTH_CHALLENGE_PHASES.map(({ armActionId }) => armActionId).sort()
    ),
    "expected auth arm source ownership drift"
  );
  invariant(
    deepEqualJson(
      authCloseSourceActionIds.sort(),
      EXPECTED_AUTH_CHALLENGE_PHASES.map(({ closeActionId }) => closeActionId).sort()
    ),
    "expected auth close source ownership drift"
  );
  invariant(
    blockBaselineSourceActionIds.length === 9 &&
      deepEqualJson(
        blockBaselineSourceActionIds,
        plan.actionManifest.filter(({ kind }) => kind === "blocksBefore").map(({ id }) => id)
      ),
    "block baseline Insert-panel source ownership drift"
  );
  invariant(
    deepEqualJson(mediaIsolationSourceActionIds, ["bi-020-media-route-setup"]),
    "task-owned media isolation source ownership drift"
  );
  invariant(
    deepEqualJson(recordEntryMenuSourceActionIds.sort(), [...RECORD_ENTRY_MENU_ACTION_IDS].sort()),
    "record-entry menu source ownership drift"
  );
  invariant(
    deepEqualJson(recordsWorkspaceSourceActionIds.sort(), [...RECORDS_WORKSPACE_ACTION_IDS].sort()),
    "records-workspace source ownership drift"
  );
}
