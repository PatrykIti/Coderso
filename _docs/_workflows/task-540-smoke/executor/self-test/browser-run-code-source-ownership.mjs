import { Script } from "node:vm";

import {
  EXTENDED_CLICK_BUDGET_BY_ACTION_ID,
  GENERIC_CLICK_BUDGET_MS,
  UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID,
  clickBudgetMsForAction,
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
// Identifies the shared single-target click template, whose only per-action variable is the
// wait budget. The throw pair is unique to that template.
const GENERIC_CLICK_SOURCE_MARKER =
  'throw new Error(count === 0 ? "wf540_target_missing" : "wf540_target_duplicate");';
const UNIT_WRAPPER_PROBE_INNER_SOURCE = "__WF540_UNIT_WRAPPER_PROBE__";
// Two mutation carriers: rc-011 spells the alert selector as a literal, rc-012 reads it out of the
// embedded config object, which is the idiom 108 sources use and the one the literal-only guard was
// blind to.
const WIDGET_ABSENCE_MUTATION_ACTION_ID = "rc-011-visible-retry";
const WIDGET_ABSENCE_REGISTRY_ACTION_ID = "rc-012-retry-proof";
// The admin declares its themed background on `body` (core/admin/styles/globals.css), never on
// the root element, and CSS background propagation paints the canvas from there. So
// getComputedStyle(document.documentElement).backgroundColor is rgba(0, 0, 0, 0) in EVERY colour
// mode: it is a constant, and a constant is not evidence. ru-073-light-dark-proof and
// ru-082-isolation-proof each compared two such constants for inequality, which made them
// unsatisfiable for any correct implementation and ended a run at 88% with no cause named.
// Nothing may reintroduce the read; the root-scoped `--background` token is what actually flips.
const THEME_INVARIANT_ROOT_BACKGROUND_READ =
  "getComputedStyle(document.documentElement).backgroundColor";
// Both actions above prove the colour mode changed AT THE DOCUMENT ROOT, independently of body.
// Pinning them keeps the retarget from later being "fixed" by deleting the inequality instead.
const ROOT_THEME_DISCRIMINATOR_FIELD = "rootColor";
const ROOT_THEME_DISCRIMINATOR_ACTION_IDS = ["ru-073-light-dark-proof", "ru-082-isolation-proof"];

export function assertThemeDiscriminatorShape(actionId, compiledSource) {
  invariant(
    !compiledSource.includes(THEME_INVARIANT_ROOT_BACKGROUND_READ),
    actionId + " reads the theme-invariant root element background"
  );
}

function terminalRefField(ref) {
  const path = ref === null || typeof ref !== "object" ? null : ref.path;
  return Array.isArray(path) && typeof path[path.length - 1] === "string"
    ? path[path.length - 1]
    : null;
}

// Collects the field names a predicate compares for INEQUALITY on both sides. Those fields carry
// the whole discriminating power of an assertion, so they are exactly the ones that must never be
// sourced from a value the platform guarantees to be constant.
function collectInequalityDiscriminatorFields(predicate, fields = new Set()) {
  if (predicate === null || typeof predicate !== "object") return fields;
  if (predicate.op === "not" && predicate.item !== undefined && predicate.item.op === "deepEqual") {
    const leftField = terminalRefField(predicate.item.left);
    if (leftField !== null && leftField === terminalRefField(predicate.item.right)) {
      fields.add(leftField);
    }
  }
  for (const item of Array.isArray(predicate.items) ? predicate.items : []) {
    collectInequalityDiscriminatorFields(item, fields);
  }
  if (predicate.item !== undefined) collectInequalityDiscriminatorFields(predicate.item, fields);
  if (predicate.predicate !== undefined) {
    collectInequalityDiscriminatorFields(predicate.predicate, fields);
  }
  return fields;
}

function actionsComparingFieldForInequality(plan, field) {
  return plan.actionManifest
    .filter(({ outputSchemaId }) => {
      const contract = plan.registries.outputs[outputSchemaId];
      if (contract === undefined || contract === null || contract.predicate === null) return false;
      return collectInequalityDiscriminatorFields(contract.predicate).has(field);
    })
    .map(({ id }) => id);
}

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
  const observedGenericClickBudgets = new Map();
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
    // Same lane, same reason: an observation sourced from a platform-constant value is silently
    // vacuous everywhere it is only required to be non-empty, and unsatisfiable the moment two
    // samples of it are compared. Reject the read at build time rather than at action 438/496.
    assertThemeDiscriminatorShape(action.id, compiledSource);
    if (action.id === WIDGET_ABSENCE_MUTATION_ACTION_ID) widgetAbsenceMutationSource = compiledSource;
    if (action.id === WIDGET_ABSENCE_REGISTRY_ACTION_ID) widgetAbsenceRegistrySource = compiledSource;
    if (compiledSource.includes("await page.goto(")) {
      invariant(
        compiledSource.includes("{ timeout: 540000 }"),
        action.id + " explicit navigation timeout drift"
      );
    }
    // The generic single-target click source carries a per-action WAIT budget. Pin both
    // occurrences to that action's registered budget and forbid any other budget appearing in
    // the same source, so an extended budget can neither leak into a sibling click nor be
    // silently dropped from the action it was granted to.
    if (compiledSource.includes(GENERIC_CLICK_SOURCE_MARKER)) {
      const expectedBudget = clickBudgetMsForAction(action.id);
      const otherBudget =
        expectedBudget === GENERIC_CLICK_BUDGET_MS ? 90000 : GENERIC_CLICK_BUDGET_MS;
      invariant(
        compiledSource.includes("const deadline = Date.now() + " + expectedBudget + ";") &&
          compiledSource.includes("await locator.click({ timeout: " + expectedBudget + " });") &&
          !compiledSource.includes(String(otherBudget)),
        action.id + " generic click wait budget drift"
      );
      observedGenericClickBudgets.set(action.id, expectedBudget);
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
  // Both directions of the budget registry: every extended entry must belong to an action that
  // really compiled the generic click source with that budget (no dead entries), and at least
  // one sibling click must still compile the default, so the extension stays scoped.
  assertNegative(
    Object.entries(EXTENDED_CLICK_BUDGET_BY_ACTION_ID).every(
      ([actionId, budget]) => observedGenericClickBudgets.get(actionId) === budget
    ) &&
      [...observedGenericClickBudgets.values()].filter(
        (budget) => budget === GENERIC_CLICK_BUDGET_MS
      ).length > 0,
    "extended click budget registry coverage"
  );
  // The check above derives its expectation from the registry, so it cannot notice the registry
  // itself losing an entry. This literal is that independent witness: rc-021-related-tab-save
  // was tripled from 30 s to 90 s under the owner's 2026-07-26 undetermined-cause rule, and
  // dropping the accommodation must break a pin rather than pass quietly.
  assertNegative(
    observedGenericClickBudgets.get("rc-021-related-tab-save") === 90000,
    "rc-021 tripled click budget pin"
  );
  // The guard above is silent when it holds, so prove it is live: a synthetic source that
  // reintroduces the constant read must be rejected, exactly as assertSelectorTextEngineShape
  // is paired with a source that reintroduces its unsatisfiable selector shape.
  let themeDiscriminatorGuardRejected = false;
  try {
    assertThemeDiscriminatorShape(
      "self-test-synthetic",
      "rootColor: " + THEME_INVARIANT_ROOT_BACKGROUND_READ + ","
    );
  } catch {
    themeDiscriminatorGuardRejected = true;
  }
  assertNegative(
    themeDiscriminatorGuardRejected,
    "theme discriminator guard rejects the root element background read"
  );
  // Anti-softening pin. The retarget kept the ROOT-scoped half of the light/dark proof rather
  // than deleting it, and that half is the only clause that can still catch a :root.dark token
  // regression or a component painting body while the root tokens stay light. If a later change
  // drops the inequality instead of keeping it satisfiable, this fails rather than passing quietly.
  const rootThemeDiscriminatorActionIds = actionsComparingFieldForInequality(
    plan,
    ROOT_THEME_DISCRIMINATOR_FIELD
  );
  assertNegative(
    ROOT_THEME_DISCRIMINATOR_ACTION_IDS.every((actionId) =>
      rootThemeDiscriminatorActionIds.includes(actionId)
    ),
    "root theme discriminator inequality coverage"
  );
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
