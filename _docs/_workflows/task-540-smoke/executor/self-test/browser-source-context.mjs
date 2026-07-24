import { Script } from "node:vm";

import { DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG } from "../config.mjs";
import { canonicalJson, deepFreezeExact, invariant } from "../foundation.mjs";
import { registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import {
  LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR,
  buildDataBearingRunCodeInvocation,
  buildDataBearingRunCodeSource,
  canonicalRunCodePayloadEncoding,
  codeQlSafeJavaScriptStringLiteral,
} from "../../browser/run-code.mjs";

export async function runBrowserSourceContextSelfTest({
  assertNegative,
  expectAsyncFailure,
  plan,
  sourceCaptures,
}) {
  const sourceContext = {
    plan,
    captures: sourceCaptures,
    priorOutputs: new Map(),
    variables: new Map(),
    currentOutput: null,
    root: "/task540-self-test-root",
    actionId: "source-compile",
  };
  let legacyRuntimeRootRejected = false;
  try {
    buildDataBearingRunCodeInvocation("focus", {
      selector: LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR,
    });
  } catch {
    legacyRuntimeRootRejected = true;
  }
  assertNegative(legacyRuntimeRootRejected, "legacy runtime-root selector compile rejection");
  const hostileRunCodeValue =
    `""''\`\`\\\\\r\n\u2028\u2029</script>;&|$() ` + `);globalThis.__wf540Injected=true;//`;
  const runCodeOperationInputs = {
    "goto-ready": { url: "https://example.test/" + hostileRunCodeValue },
    fill: { selector: "[data-hostile='" + hostileRunCodeValue + "']", value: hostileRunCodeValue },
    type: { selector: "[data-type='" + hostileRunCodeValue + "']", value: hostileRunCodeValue },
    press: { selector: "[data-press='" + hostileRunCodeValue + "']", key: hostileRunCodeValue },
    focus: { selector: "[data-focus='" + hostileRunCodeValue + "']" },
  };
  const runCodeCalls = [];
  const runCodeFakePage = {
    async evaluate(callback, value) {
      return callback(value);
    },
    async goto(url, options) {
      runCodeCalls.push(["goto", url, options]);
    },
    async waitForFunction() {
      runCodeCalls.push(["waitForFunction"]);
    },
    locator(selector) {
      runCodeCalls.push(["locator", selector]);
      return {
        async waitFor(options) {
          runCodeCalls.push(["waitFor", options]);
        },
        async count() {
          return 1;
        },
        async fill(value) {
          runCodeCalls.push(["fill", value]);
        },
        async pressSequentially(value) {
          runCodeCalls.push(["type", value]);
        },
        async press(key) {
          runCodeCalls.push(["press", key]);
        },
        async focus() {
          runCodeCalls.push(["focus"]);
        },
      };
    },
  };
  globalThis.__wf540Injected = false;
  for (const [operation, input] of Object.entries(runCodeOperationInputs)) {
    runCodeCalls.length = 0;
    const invocation = buildDataBearingRunCodeInvocation(operation, input);
    const source = invocation.args[invocation.args.indexOf("run-code") + 1];
    invariant(
      invocation.unitResultAlreadyNormalized === true &&
        typeof source === "string" &&
        !source.includes(hostileRunCodeValue) &&
        !source.includes(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR) &&
        source.split("const encoded =").length === 2,
      operation + " safe run-code source drift"
    );
    const execute = new Script("(" + source + ")", {
      filename: "task-540-" + operation + ".data-channel.self-test.js",
    }).runInThisContext();
    const output = await execute(runCodeFakePage);
    invariant(
      deepEqualJson(output, { ok: true }) && globalThis.__wf540Injected === false,
      operation + " safe run-code execution drift"
    );
    if (operation === "goto-ready") {
      invariant(
        deepEqualJson(runCodeCalls[0], ["goto", input.url, { timeout: 540000 }]),
        "goto-ready explicit navigation timeout drift"
      );
    }
    const observed = runCodeCalls.flatMap((call) => call.slice(1));
    for (const value of Object.values(input)) {
      invariant(observed.includes(value), operation + " run-code value did not round-trip");
    }
  }
  delete globalThis.__wf540Injected;
  for (const [label, operation, input] of [
    ["unknown key", "focus", { selector: "[data-safe]", unknown: true }],
    ["NUL", "fill", { selector: "[data-safe]", value: "bad\0value" }],
    ["oversize", "type", { selector: "[data-safe]", value: "x".repeat(32_769) }],
  ]) {
    await expectAsyncFailure(
      async () => buildDataBearingRunCodeInvocation(operation, input),
      "run-code host " + label
    );
  }
  const safeFocusInput = { selector: "[data-safe-focus]" };
  const safeFocusEncoding = canonicalRunCodePayloadEncoding("focus", safeFocusInput);
  const safeFocusSource = buildDataBearingRunCodeSource("focus", safeFocusInput);
  const executeMutatedRunCode = async (encoded, label) => {
    runCodeCalls.length = 0;
    const mutantSource = safeFocusSource.replace(
      codeQlSafeJavaScriptStringLiteral(safeFocusEncoding),
      codeQlSafeJavaScriptStringLiteral(encoded)
    );
    const execute = new Script("(" + mutantSource + ")", {
      filename: "task-540-" + label + ".data-channel.self-test.js",
    }).runInThisContext();
    await expectAsyncFailure(async () => execute(runCodeFakePage), label);
    invariant(runCodeCalls.length === 0, label + " reached the fake page");
  };
  await executeMutatedRunCode("A", "run-code noncanonical base64url");
  await executeMutatedRunCode(
    Buffer.from('{"operation":"focus", "selector":"[data-safe-focus]"}', "utf8").toString(
      "base64url"
    ),
    "run-code noncanonical JSON"
  );
  await executeMutatedRunCode(
    Buffer.from(
      canonicalJson({ operation: "focus", selector: LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR }),
      "utf8"
    ).toString("base64url"),
    "run-code decoded legacy selector"
  );
  let compiledRunCodeSources = 0;
  const authArmSourceActionIds = [];
  const authCloseSourceActionIds = [];
  const authRateBarrierSourceActionIds = [];
  const blockBaselineSourceActionIds = [];
  const mediaIsolationSourceActionIds = [];
  const recordEntryMenuSourceActionIds = [];
  const recordsWorkspaceSourceActionIds = [];
  const observedDirtyNavigationRequestActionIds = [];
  const observedToneContentFillActionIds = [];
  const observedToneMenuOpenActionIds = [];
  const observedToneMutedActionIds = [];
  const expectedDirtyNavigationRequestActionConfig = deepFreezeExact({
    "dg-012-builder-nav-cancel": {
      dialogDescription: "The Screen document or bindings have local changes.",
      dialogTitle: "Discard unsaved Screen changes?",
      realm: "builder",
    },
    "dg-015-builder-nav-confirm": {
      dialogDescription: "The Screen document or bindings have local changes.",
      dialogTitle: "Discard unsaved Screen changes?",
      realm: "builder",
    },
    "dg-024-entry-nav-cancel": {
      dialogDescription: "Content or presentation changes have not been saved.",
      dialogTitle: "Discard unsaved entry changes?",
      realm: "entry",
    },
    "dg-037-entry-nav-confirm": {
      dialogDescription: "Content or presentation changes have not been saved.",
      dialogTitle: "Discard unsaved entry changes?",
      realm: "entry",
    },
    "rc-037a-exit-navigation": {
      dialogDescription: "Content or presentation changes have not been saved.",
      dialogTitle: "Discard unsaved entry changes?",
      realm: "entry",
    },
  });
  const validatesDirtyNavigationRequestActionConfig = (candidate) =>
    deepEqualJson(candidate, expectedDirtyNavigationRequestActionConfig);
  invariant(
    validatesDirtyNavigationRequestActionConfig(DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG),
    "dirty-navigation literal config drift"
  );
  for (const actionId of Object.keys(expectedDirtyNavigationRequestActionConfig)) {
    const removed = { ...DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG };
    delete removed[actionId];
    assertNegative(
      !validatesDirtyNavigationRequestActionConfig(removed),
      actionId + " dirty-navigation missing literal mapping"
    );
  }
  assertNegative(
    !validatesDirtyNavigationRequestActionConfig({
      ...DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG,
      "zz-999-unowned-dirty-navigation": {
        dialogDescription: "Content or presentation changes have not been saved.",
        dialogTitle: "Discard unsaved entry changes?",
        realm: "entry",
      },
    }),
    "dirty-navigation sixth action mutant"
  );
  for (const [field, value] of [
    ["realm", "builder"],
    ["dialogTitle", "Wrong dirty-navigation title"],
    ["dialogDescription", "Wrong dirty-navigation description"],
  ]) {
    assertNegative(
      !validatesDirtyNavigationRequestActionConfig({
        ...DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG,
        "dg-024-entry-nav-cancel": {
          ...DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG["dg-024-entry-nav-cancel"],
          [field]: value,
        },
      }),
      "dirty-navigation wrong " + field + " mutant"
    );
  }
  const authSettlementSourceSpecs = new Map(
    plan.stateMachines.auth.transitions
      .filter(({ to }) => to !== "anonymous")
      .map(({ actionId, to }) => {
        const sourceSpec = {
          bootstrap: {
            observationName: "bootstrap-auth-identity-settled",
            invocationToken: "output = await settleAuthRealm(config.selectors.bootstrapUserMenu);",
          },
          "user-a": {
            observationName: "auth-identity-settled-users-a",
            invocationToken:
              "output = await settleAuthRealm(config.selectors.userA, config.userAName, config.userAId);",
          },
          "user-b": {
            observationName: "auth-identity-settled-users-b",
            invocationToken:
              "output = await settleAuthRealm(config.selectors.userB, config.userBName, config.userBId);",
          },
        }[to];
        invariant(sourceSpec !== undefined, actionId + " auth settlement target drift");
        return [actionId, sourceSpec];
      })
  );
  const authSettlementActionIds = [...authSettlementSourceSpecs.keys()];
  const observedAuthSettlementActionIds = [];
  const authSettlementCompiledSources = new Map();
  const encodedPaletteSelectors = JSON.stringify({
    button: registeredSelector(plan, "blockRoot", [sourceCaptures.get("palette.button")]),
    outerTabs: registeredSelector(plan, "blockRoot", [sourceCaptures.get("palette.outer-tabs")]),
    innerTabs: registeredSelector(plan, "blockRoot", [sourceCaptures.get("palette.inner-tabs")]),
  });
  const previewRuntimeActionSelectors = new Map(
    [
      ["tk-012-focus-overview", "palette.outer-tabs", "Overview"],
      ["tk-013-arrow-left", "palette.outer-tabs", "Overview"],
      ["tk-015-arrow-right", "palette.outer-tabs", "History"],
      ["tk-017-home", "palette.outer-tabs", "Overview"],
      ["tk-019-end", "palette.outer-tabs", "Overview"],
      ["tk-022a-restore-overview", "palette.outer-tabs", "Overview"],
      ["tk-023-inner-second", "palette.inner-tabs", "Tab 2"],
      ["tk-024-outer-details", "palette.outer-tabs", "Details"],
      ["tk-025-outer-overview", "palette.outer-tabs", "Overview"],
    ].map(([actionId, captureName, label]) => [
      actionId,
      registeredSelector(plan, "previewRuntimeTab", [sourceCaptures.get(captureName), label]),
    ])
  );
  const observedPreviewRuntimeActionIds = [];
  const readDataBearingRunCodePayload = (source, label) => {
    const match = source.match(/const encoded = ("(?:\\.|[^"\\])*");/u);
    invariant(match !== null, label + " encoded payload is absent");
    const encoded = JSON.parse(match[1]);
    invariant(
      typeof encoded === "string" && /^[A-Za-z0-9_-]+$/u.test(encoded),
      label + " encoded payload token drift"
    );
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  };
  const assertSourceMutantsRejected = (source, validator, tokens, label) => {
    for (const [index, token] of tokens.entries()) {
      invariant(source.includes(token), label + " mutant anchor " + index + " drift");
      const mutant = source.replaceAll(token, "__WF540_SOURCE_MUTANT_" + index + "__");
      assertNegative(!validator(mutant), label + " mutant " + index);
    }
  };
  return {
    sourceContext,
    compiledRunCodeSources,
    authArmSourceActionIds,
    authCloseSourceActionIds,
    authRateBarrierSourceActionIds,
    blockBaselineSourceActionIds,
    mediaIsolationSourceActionIds,
    recordEntryMenuSourceActionIds,
    recordsWorkspaceSourceActionIds,
    observedDirtyNavigationRequestActionIds,
    observedToneContentFillActionIds,
    observedToneMenuOpenActionIds,
    observedToneMutedActionIds,
    expectedDirtyNavigationRequestActionConfig,
    authSettlementSourceSpecs,
    authSettlementActionIds,
    observedAuthSettlementActionIds,
    authSettlementCompiledSources,
    encodedPaletteSelectors,
    previewRuntimeActionSelectors,
    observedPreviewRuntimeActionIds,
    readDataBearingRunCodePayload,
    assertSourceMutantsRejected,
  };
}
