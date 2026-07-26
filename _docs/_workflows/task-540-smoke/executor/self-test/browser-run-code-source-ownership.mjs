import { Script } from "node:vm";

import {
  UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID,
  unitFailureFrameClassesForAction,
  unitFailureFrameResultErrorTagForAction,
} from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { expandRegisteredPath, registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR } from "../../browser/run-code.mjs";
import { buildFailureFramePreservingUnitSource } from "../../browser/scenarios/dirty-guards.mjs";
import {
  assertBrowserAuthSettlementSourceOwnership,
  inspectBrowserAuthSettlementSource,
} from "./browser-auth-settlement-source.mjs";
import {
  assertDirtyNavigationRunCodeSourceOwnership,
  inspectDirtyNavigationRunCodeSource,
} from "./browser-dirty-navigation-source.mjs";
import { runBrowserSourceContextSelfTest } from "./browser-source-context.mjs";
import {
  assertToneContentFillRunCodeSourceOwnership,
  inspectToneContentFillRunCodeSource,
} from "./browser-tone-content-fill-source.mjs";
import {
  assertToneFlowRunCodeSourceOwnership,
  inspectToneFlowRunCodeSource,
} from "./browser-tone-flow-source.mjs";
import {
  assertBrowserSourceWidgetAbsenceScope,
  runBrowserWidgetAbsenceScopeSelfTest,
} from "./browser-widget-absence-scope.mjs";

const PRESERVING_UNIT_WRAPPER_MARKER = "if (result === true) return { ok: true };";
const UNIT_WRAPPER_PROBE_INNER_SOURCE = "__WF540_UNIT_WRAPPER_PROBE__";
// Two mutation carriers: rc-011 spells the alert selector as a literal, rc-012 reads it out of the
// embedded config object, which is the idiom 108 sources use and the one the literal-only guard was
// blind to.
const WIDGET_ABSENCE_MUTATION_ACTION_ID = "rc-011-visible-retry";
const WIDGET_ABSENCE_REGISTRY_ACTION_ID = "rc-012-retry-proof";

// Behavioural round-trip against the REAL builder output. The inner source is a trivial
// probe: an action's own inner source drives a live page and must never be executed here.
async function runWrappedUnitSource(failureClasses, resultErrorTag, innerLiteral) {
  const source = buildFailureFramePreservingUnitSource(
    "async () => (" + innerLiteral + ")",
    failureClasses,
    resultErrorTag
  );
  const wrapper = new Script("(" + source + ")", {
    filename: "unit-frame-roundtrip.self-test.js",
  }).runInThisContext();
  return await wrapper(null);
}

export async function runBrowserRunCodeSourceOwnershipSelfTest({
  assertNegative,
  buildBrowserInvocation,
  compileActionExecutionSpec,
  expectAsyncFailure,
  plan,
  sourceCaptures,
}) {
  const browserSourceContext = await runBrowserSourceContextSelfTest({
    assertNegative,
    expectAsyncFailure,
    plan,
    sourceCaptures,
  });
  let compiledRunCodeSources = browserSourceContext.compiledRunCodeSources;
  const {
    sourceContext,
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
  } = browserSourceContext;
  const observedUnitFailureFrameActionIds = [];
  let widgetAbsenceMutationSource = null;
  let widgetAbsenceRegistrySource = null;
  for (const action of plan.actionManifest) {
    if (action.executable.type === "runtime-operation") continue;
    const executionSpec = compileActionExecutionSpec(action);
    const invocation = buildBrowserInvocation(
      action,
      executionSpec,
      sourceCaptures,
      "/task540-self-test-root",
      "/task540-self-test-root/private",
      plan,
      { ...sourceContext, actionId: action.id },
      {
        csrfHeaderName: "x-self-test-csrf",
        authRatePolicy: {
          enabled: true,
          maxRequests: 10,
          windowSeconds: 60,
        },
      }
    );
    if (action.executable.type !== "browser-run-code") continue;
    const sourceIndex = invocation.args.indexOf("run-code") + 1;
    invariant(
      sourceIndex > 0 && typeof invocation.args[sourceIndex] === "string",
      action.id + " run-code source is absent"
    );
    const compiledSource = invocation.args[sourceIndex];
    invariant(
      !compiledSource.includes(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR),
      action.id + " retained the legacy runtime-root selector"
    );
    // Applied to every emitted source, not to a literal in one scenario file: an absence check on
    // a shared widget class has to be narrowed to a container, or it silently becomes
    // unsatisfiable the moment the route mounts an unrelated instance of that class.
    assertBrowserSourceWidgetAbsenceScope(action.id, compiledSource);
    if (action.id === WIDGET_ABSENCE_MUTATION_ACTION_ID) widgetAbsenceMutationSource = compiledSource;
    if (action.id === WIDGET_ABSENCE_REGISTRY_ACTION_ID) widgetAbsenceRegistrySource = compiledSource;
    if (compiledSource.includes("await page.goto(")) {
      invariant(
        compiledSource.includes("{ timeout: 540000 }"),
        action.id + " explicit navigation timeout drift"
      );
    }
    new Script("(" + compiledSource + ")", { filename: action.id + ".self-test.js" });
    if (action.outputSchemaId === "unit") {
      const unitFailureClasses = unitFailureFrameClassesForAction(action.id);
      if (unitFailureClasses === null) {
        // Complement: no unregistered unit source may carry the preserving form, so the
        // registry stays the only way an action's verdict survives transport.
        invariant(
          !compiledSource.includes(PRESERVING_UNIT_WRAPPER_MARKER),
          action.id + " unregistered unit source is frame-preserving"
        );
      } else {
        observedUnitFailureFrameActionIds.push(action.id);
        const resultErrorTag = unitFailureFrameResultErrorTagForAction(action.id);
        const [expectedWrapperHead, expectedWrapperTail] = buildFailureFramePreservingUnitSource(
          UNIT_WRAPPER_PROBE_INNER_SOURCE,
          unitFailureClasses,
          resultErrorTag
        ).split(UNIT_WRAPPER_PROBE_INNER_SOURCE);
        invariant(
          compiledSource.startsWith(expectedWrapperHead) &&
            compiledSource.endsWith(expectedWrapperTail),
          action.id + " preserving unit wrapper byte drift"
        );
        invariant(
          deepEqualJson(await runWrappedUnitSource(unitFailureClasses, resultErrorTag, "true"), {
            ok: true,
          }),
          action.id + " unit success frame drift"
        );
        for (const failureClass of unitFailureClasses) {
          const frame = { failureClass, settled: false };
          invariant(
            deepEqualJson(
              await runWrappedUnitSource(unitFailureClasses, resultErrorTag, JSON.stringify(frame)),
              frame
            ),
            action.id + " " + failureClass + " frame was not preserved"
          );
        }
        await expectAsyncFailure(
          () =>
            runWrappedUnitSource(
              unitFailureClasses,
              resultErrorTag,
              JSON.stringify({ failureClass: "zz_unknown", settled: false })
            ),
          action.id + " unregistered failure class"
        );
        await expectAsyncFailure(
          () =>
            runWrappedUnitSource(unitFailureClasses, resultErrorTag, JSON.stringify({ ok: true })),
          action.id + " unrecognised unit return shape"
        );
      }
    }
    inspectBrowserAuthSettlementSource({
      action,
      assertNegative,
      assertSourceMutantsRejected,
      authSettlementCompiledSources,
      authSettlementSourceSpecs,
      compiledSource,
      observedAuthSettlementActionIds,
    });
    if (previewRuntimeActionSelectors.has(action.id)) {
      const expectedSelector = previewRuntimeActionSelectors.get(action.id);
      const selectorMatches = ["focus", "press", "type"].includes(action.kind)
        ? readDataBearingRunCodePayload(compiledSource, action.id).selector === expectedSelector
        : compiledSource.includes("page.locator(" + JSON.stringify(expectedSelector) + ")");
      invariant(
        selectorMatches &&
          !compiledSource.includes("scopedRuntimeTab") &&
          !compiledSource.includes("previewRuntimeTab"),
        action.id + " preview runtime selector exact bytes drift"
      );
      observedPreviewRuntimeActionIds.push(action.id);
    }
    const observedDirtyNavigationRequestActionId = inspectDirtyNavigationRunCodeSource({
      actionId: action.id,
      assertNegative,
      assertSourceMutantsRejected,
      compiledSource,
      expectedDirtyNavigationRequestActionConfig,
      plan,
      sourceCaptures,
    });
    if (observedDirtyNavigationRequestActionId !== null) {
      observedDirtyNavigationRequestActionIds.push(observedDirtyNavigationRequestActionId);
    }
    const observedToneContentFillActionId = inspectToneContentFillRunCodeSource({
      actionId: action.id,
      assertNegative,
      assertSourceMutantsRejected,
      compiledSource,
      plan,
    });
    if (observedToneContentFillActionId !== null) {
      observedToneContentFillActionIds.push(observedToneContentFillActionId);
    }
    const observedToneFlowAction = inspectToneFlowRunCodeSource({
      actionId: action.id,
      assertNegative,
      assertSourceMutantsRejected,
      compiledSource,
      plan,
    });
    if (observedToneFlowAction !== null) {
      if (observedToneFlowAction.phase === "open") {
        observedToneMenuOpenActionIds.push(observedToneFlowAction.actionId);
      } else {
        observedToneMutedActionIds.push(observedToneFlowAction.actionId);
      }
    }
    if (action.id === "tk-011-preview-proof") {
      const required = [
        '"paletteSelectors":' + encodedPaletteSelectors,
        "const shell = await exactVisibleWithin(page, config.selectors.previewShell",
        "const outer = await exactVisibleWithin(shell, config.paletteSelectors.outerTabs",
        "await exactVisibleWithin(outer, config.paletteSelectors.innerTabs",
        "if (await locator.count() !== 1) return null",
        "return positive(rect) && await locator.isVisible() ? locator : null",
        "output = { shellVisible: true, device, outerTabsVisible: true, innerTabsVisible: true }",
      ];
      const validates = (source) =>
        required.every((token) => source.includes(token)) &&
        source.includes(JSON.stringify(registeredSelector(plan, "previewShell"))) &&
        source.includes(JSON.stringify(registeredSelector(plan, "canvasScroller"))) &&
        !source.includes("config.palette.outerTabs") &&
        !source.includes("config.palette.innerTabs");
      invariant(validates(compiledSource), "tk-011 preview/entry observation scope drift");
      assertSourceMutantsRejected(compiledSource, validates, required.slice(0, 6), "tk-011");
    }
    if (action.id === "tk-027-ids-proof") {
      const required = [
        '"paletteSelectors":' + encodedPaletteSelectors,
        "const surface = await exactVisibleWithin(page, surfaceSelector",
        "const outer = await exactVisibleWithin(surface, config.paletteSelectors.outerTabs",
        "const inner = await exactVisibleWithin(outer, config.paletteSelectors.innerTabs",
        "return { outer: await ownedTabs(outer), inner: await ownedTabs(inner) }",
        "const builderRealm = await readRendererRealm(config.selectors.canvas)",
        "const previewRealm = await readRendererRealm(config.selectors.previewShell)",
        "const ids = collectRendererIds([builderRealm, previewRealm])",
        "function collectRendererIdsExact(realms)",
      ];
      const validates = (source) =>
        required.every((token) => source.includes(token)) &&
        source.includes(JSON.stringify(registeredSelector(plan, "canvas"))) &&
        source.includes(JSON.stringify(registeredSelector(plan, "previewShell"))) &&
        !source.includes("config.palette.outerTabs") &&
        !source.includes("config.palette.innerTabs");
      invariant(validates(compiledSource), "tk-027 renderer/entry assertion scope drift");
      assertSourceMutantsRejected(compiledSource, validates, required.slice(1, 4), "tk-027");
    }
    if (action.id === "tc-041-armed-slot") {
      invariant(
        compiledSource.includes('"name":"armed-slot-equals-active-tab"') &&
          compiledSource.includes("const canvas = await one(config.selectors.canvas)") &&
          compiledSource.includes("exactVisibleWithin(canvas, config.paletteSelectors.outerTabs"),
        "tc-041 canvas-only armed-slot scope drift"
      );
    }
    if (action.id === "dg-003-builder") {
      const builderUrl = expandRegisteredPath(plan, "builder", sourceCaptures);
      const navigationToken =
        "await page.goto(" + JSON.stringify(builderUrl) + ", { timeout: 540000 });";
      const exactUrlToken = "if (page.url() !== " + JSON.stringify(builderUrl) + ")";
      const required = [
        'const dirtyIndicator = page.getByText("Unsaved changes", { exact: true });',
        'await dirtyIndicator.waitFor({ state: "visible", timeout: 30000 });',
        "if (await dirtyIndicator.count() !== 1)",
        'const retainedDialogListeners = page.listeners("dialog");',
        "if (retainedDialogListeners.length !== 1)",
        'for (const listener of retainedDialogListeners) page.off("dialog", listener);',
        'page.on("dialog", handleDialog);',
        'dialogSettlements.push(type === "beforeunload" ? dialog.accept() : dialog.dismiss());',
        "let navigationFailed = false;",
        navigationToken,
        "} finally {",
        "const settlements = await Promise.allSettled(dialogSettlements);",
        'dialogSettlementFailed = settlements.some(({ status }) => status !== "fulfilled");',
        'page.off("dialog", handleDialog);',
        'for (const listener of retainedDialogListeners) page.on("dialog", listener);',
        'const restoredDialogListeners = page.listeners("dialog");',
        "restoredDialogListeners.length !== retainedDialogListeners.length",
        "listener !== retainedDialogListeners[index]",
        'if (navigationFailed) throw new Error("wf540_dg003_navigation");',
        'if (dialogSettlementFailed) throw new Error("wf540_dg003_dialog_settlement");',
        'if (dialogTypes.length !== 1 || dialogTypes[0] !== "beforeunload")',
        exactUrlToken,
        'await marker.waitFor({ state: "visible", timeout: 90000 });',
        "if (await marker.count() !== 1)",
      ];
      const validates = (source) => {
        const dirtyReadIndex = source.indexOf(required[0]);
        const listenerReadIndex = source.indexOf(required[3]);
        const listenerRemoveIndex = source.indexOf(required[5]);
        const handlerInstallIndex = source.indexOf(required[6]);
        const navigationIndex = source.indexOf(navigationToken);
        const finallyIndex = source.indexOf(required[10], navigationIndex);
        const handlerRemoveIndex = source.indexOf(required[13]);
        const listenerRestoreIndex = source.indexOf(required[14]);
        const restoredListenerReadIndex = source.indexOf(required[15]);
        const navigationFailureIndex = source.indexOf(required[18]);
        const dialogCardinalityIndex = source.indexOf(required[20]);
        const markerWaitIndex = source.indexOf(required[22]);
        return (
          required.every((token) => source.includes(token)) &&
          dirtyReadIndex >= 0 &&
          listenerReadIndex > dirtyReadIndex &&
          listenerRemoveIndex > listenerReadIndex &&
          handlerInstallIndex > listenerRemoveIndex &&
          navigationIndex > handlerInstallIndex &&
          finallyIndex > navigationIndex &&
          handlerRemoveIndex > navigationIndex &&
          listenerRestoreIndex > handlerRemoveIndex &&
          restoredListenerReadIndex > listenerRestoreIndex &&
          navigationFailureIndex > restoredListenerReadIndex &&
          dialogCardinalityIndex > navigationFailureIndex &&
          markerWaitIndex > dialogCardinalityIndex
        );
      };
      invariant(validates(compiledSource), "dg-003 exact beforeunload handoff source drift");
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        required,
        "dg-003 exact beforeunload handoff"
      );
    }
    if (action.id === "tk-022-aria-proof") {
      invariant(
        compiledSource.includes('"name":"aria-reciprocal"') &&
          compiledSource.includes("exactVisibleWithin(page, config.selectors.previewShell") &&
          compiledSource.includes(
            "exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs"
          ),
        "tk-022 preview-only ARIA scope drift"
      );
    }
    if (action.id === "dg-017-builder-confirm-proof") {
      invariant(
        compiledSource.includes(
          JSON.stringify(expandRegisteredPath(plan, "records", sourceCaptures))
        ) &&
          compiledSource.includes(JSON.stringify(registeredSelector(plan, "recordActions"))) &&
          compiledSource.includes("const deadline = Date.now() + 90000") &&
          compiledSource.includes("page.url() === expectedRecordsUrl") &&
          compiledSource.includes("await recordActions.isVisible()") &&
          compiledSource.includes("positive(recordActionsRect)") &&
          compiledSource.includes("builderCanvasCount === 0") &&
          compiledSource.includes("builderDirtyBadgeCount === 0") &&
          !compiledSource.includes("!page.url().includes(config.screenId)"),
        "dg-017 settled records-workspace proof source drift"
      );
    }
    if (action.id === "tk-026-nested-proof") {
      invariant(
        compiledSource.includes('"name":"nested-tabs-isolated"') &&
          compiledSource.includes("exactVisibleWithin(page, config.selectors.previewShell") &&
          compiledSource.includes(
            "exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs"
          ) &&
          compiledSource.includes("exactVisibleWithin(outer, config.paletteSelectors.innerTabs"),
        "tk-026 preview-only nested scope drift"
      );
    }
    if (action.id === "set-006-logger") {
      invariant(
        compiledSource.includes(
          "const freezeTree = function freezeJsonTreeExact(value, seen = new WeakSet())"
        ) &&
          compiledSource.includes(
            "for (const child of Object.values(value)) freezeJsonTreeExact(child, seen)"
          ) &&
          compiledSource.includes(
            "const frozenCopy = (value) => freezeTree(JSON.parse(JSON.stringify(value)))"
          ),
        "private sample deep-freeze authority drift"
      );
    }
    if (action.id === "rc-012c-picker-warm-proof") {
      invariant(
        compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")') &&
          compiledSource.includes('context.__wf540Remember("rc-002-private-authority"') &&
          compiledSource.includes("validateResetDraftAuthority(resetAuthority") &&
          compiledSource.includes("changedJsonPointers(config.entryBaseline, persisted.data)") &&
          !compiledSource.includes("config.selectors.relationA1") &&
          !compiledSource.includes("config.selectors.relationB2"),
        "rc-012c exhaustive reset authority source drift"
      );
    }
    if (action.id === "rc-017-unrelated-before") {
      invariant(
        compiledSource.includes('context.__wf540Recall("rc-002-private-authority")') &&
          compiledSource.includes('context.__wf540Remember("rc-017-private-authority"') &&
          compiledSource.includes(
            'const expectedDiff = ["/controls/unrelatedNote", "/presentation/tone"]'
          ) &&
          compiledSource.includes("changedJsonPointers(resetAuthority.draft, currentDraft)") &&
          compiledSource.includes("validateCurrentDraftAuthority(currentAuthority") &&
          compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")'),
        "rc-017 private full-draft authority drift"
      );
    }
    if (action.id === "rc-032-diff-proof") {
      invariant(
        compiledSource.includes('context.__wf540Recall("rc-017-private-authority")') &&
          compiledSource.includes("validateResetDraftAuthority(before.resetAuthority") &&
          compiledSource.includes("validateCurrentDraftAuthority(before") &&
          compiledSource.includes("changedJsonPointers(before.draft, currentDraft)") &&
          compiledSource.includes(
            'const relationRoots = ["/relations/relationA", "/relations/relationB"]'
          ) &&
          compiledSource.includes("const relationBefore = before.resetAuthority.draft.relations") &&
          compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")') &&
          !compiledSource.includes('context.__wf540Recall("rc-002-private-authority")'),
        "rc-032 exact reset/current union-leaf authority drift"
      );
    }
    if (compiledSource.includes("context.__wf540ArmExpectedAuthChallenge({")) {
      authArmSourceActionIds.push(action.id);
    }
    if (compiledSource.includes("context.__wf540CloseExpectedAuthChallenge({")) {
      authCloseSourceActionIds.push(action.id);
    }
    if (action.kind === "authRateWindowBarrier") {
      authRateBarrierSourceActionIds.push(action.id);
      invariant(
        compiledSource.includes("if (61000 > 0)") &&
          compiledSource.includes('context.on("request", onRequest)') &&
          compiledSource.includes('context.off("request", onRequest)') &&
          compiledSource.includes("const parseHttpUrl = (value) =>") &&
          compiledSource.includes('parsedUrl.pathname.startsWith("/admin/api/auth/")') &&
          compiledSource.includes("invalidRequestUrl") &&
          !compiledSource.includes("new URL(") &&
          compiledSource.indexOf("const after = await sample()") <
            compiledSource.indexOf('context.off("request", onRequest)') &&
          compiledSource.includes("before.navigationCount !== after.navigationCount"),
        action.id + " auth rate barrier source contract drift"
      );
    }
    if (action.kind === "blocksBefore") {
      blockBaselineSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "insertPanel"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(registeredSelector(plan, "blockLibrary"))
          ) &&
          invocation.args[sourceIndex].includes("await insertPanel.click()") &&
          invocation.args[sourceIndex].includes('getAttribute("aria-pressed")') &&
          invocation.args[sourceIndex].includes("wf540_insert_panel_state") &&
          invocation.args[sourceIndex].includes("wf540_block_library_count"),
        action.id + " Insert-panel preparation source contract drift"
      );
    }
    if (action.id === "bi-020-media-route-setup") {
      mediaIsolationSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes("function assertTaskOwnedMediaListTransport") &&
          invocation.args[sourceIndex].includes("function isolateTaskOwnedMediaList") &&
          invocation.args[sourceIndex].includes('mediaType !== "application/json"') &&
          invocation.args[sourceIndex].includes('fail("fixture_cardinality")') &&
          invocation.args[sourceIndex].includes("responseBodyOverride") &&
          invocation.args[sourceIndex].includes('contentType: "application/json"') &&
          invocation.args[sourceIndex].includes(JSON.stringify(sourceCaptures.get("media.id"))) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(sourceCaptures.get("media.storage-key"))
          ),
        action.id + " task-owned media isolation source contract drift"
      );
    }
    if (invocation.args[sourceIndex].includes("wf540_record_actions_target")) {
      recordEntryMenuSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "recordActions"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(registeredSelector(plan, "editRecord"))
          ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(expandRegisteredPath(plan, "entry", sourceCaptures))
          ) &&
          invocation.args[sourceIndex].includes('[data-custom-screen-entry-document="true"]'),
        action.id + " record-entry source contract drift"
      );
    }
    if (invocation.args[sourceIndex].includes("wf540_record_actions_wait_empty_body")) {
      recordsWorkspaceSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "recordActions"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(expandRegisteredPath(plan, "records", sourceCaptures))
          ),
        action.id + " records-workspace source contract drift"
      );
    }
    compiledRunCodeSources += 1;
  }
  invariant(compiledRunCodeSources === 392, "generated run-code source count drift");
  runBrowserWidgetAbsenceScopeSelfTest({
    assertNegative,
    configuredSelectorSource: widgetAbsenceRegistrySource,
    retrySettlementSource: widgetAbsenceMutationSource,
  });
  invariant(
    observedUnitFailureFrameActionIds.length ===
      Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).length &&
      Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).every((actionId) =>
        observedUnitFailureFrameActionIds.includes(actionId)
      ),
    "unit failure-frame action coverage drift"
  );
  assertDirtyNavigationRunCodeSourceOwnership({
    expectedDirtyNavigationRequestActionConfig,
    observedDirtyNavigationRequestActionIds,
  });
  assertToneContentFillRunCodeSourceOwnership({
    observedToneContentFillActionIds,
  });
  assertToneFlowRunCodeSourceOwnership({
    assertNegative,
    observedToneMenuOpenActionIds,
    observedToneMutedActionIds,
    plan,
  });
  assertBrowserAuthSettlementSourceOwnership({
    authSettlementActionIds,
    observedAuthSettlementActionIds,
  });
  return browserSourceContext;
}
