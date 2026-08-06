import {
  OPEN_SELECT_CONTENT_SELECTOR,
  TONE_FLOW_ACTION_CONFIG,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  unitFailureFrameResultErrorTagForAction,
} from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

// The tone option is a Radix/shadcn SelectItem: its label is rendered inside a nested
// <SelectPrimitive.ItemText> span, so the [role="option"] host carries no direct text node
// and Playwright's :text-is() can never match it. The registry must reach the label through
// the child span. Both patterns below subsume the anchored `^[role="option"]:text-is(`
// form and also catch a scoped variant such as `<scope> [role="option"]:text-is("...")`.
const TONE_OPTION_SELECTOR = '[role="option"]:has(span:text-is("Muted"))';
const RADIX_OPTION_OWN_TEXT_PATTERNS = Object.freeze([
  /\[role="option"\]:text-is\(/u,
  /\[data-slot="select-item"\]:text-is\(/u,
]);

function addressesRadixOptionByOwnText(literal) {
  return RADIX_OPTION_OWN_TEXT_PATTERNS.some((pattern) => pattern.test(literal));
}

export function inspectToneFlowRunCodeSource({
  actionId,
  assertNegative,
  assertSourceMutantsRejected,
  compiledSource,
  plan,
}) {
  const toneFlowConfig = TONE_FLOW_ACTION_CONFIG[actionId];
  if (toneFlowConfig !== undefined) {
    const toneSelectPanelGeometryToken = "visiblePositive(panel) &&";
    const toneSelectTriggerGeometryToken = "visiblePositive(trigger) &&";
    const toneSelectUnlockedScrollToken = '!body.hasAttribute("data-scroll-locked")';
    const toneSelectResetSettlementBlock = [
      "const resetSettlement = () => {",
      "                settledSince = null;",
      "                settledSampleCount = 0;",
      "              };",
    ].join("\n");
    const commonRequired = [
      JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]'),
      JSON.stringify(OPEN_SELECT_CONTENT_SELECTOR),
      JSON.stringify(registeredSelector(plan, "toneTrigger")),
      JSON.stringify(
        registeredSelector(plan, "blockRoot", [
          plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
        ])
      ),
      JSON.stringify(
        registeredSelector(plan, "selectBlock", [
          plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
        ])
      ),
      JSON.stringify(
        registeredSelector(plan, "contentEditable", [
          plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
          toneFlowConfig.fieldLabel,
        ])
      ),
      "rect.width > 0 && rect.height > 0",
    ];
    const phaseRequired =
      toneFlowConfig.phase === "open"
        ? [
            "const fail = (failureClass) => ({ failureClass, settled: false });",
            "let failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[0]) + ";",
            "try {",
            "const initialPanel = page.locator(" +
              JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
              ");",
            'await initialPanel.waitFor({ state: "visible", timeout: 30000 });',
            "const initialTargetRoot = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "blockRoot", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const initialSelectionHandle = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "selectBlock", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const initialTextbox = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "contentEditable", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  toneFlowConfig.fieldLabel,
                ])
              ) +
              ");",
            "const targetPreconditionFailed =",
            "await initialPanel.count() !== 1",
            "await initialTargetRoot.count() !== 1",
            'await initialTargetRoot.getAttribute("data-selected") !== "true"',
            "await initialSelectionHandle.count() !== 1",
            'await initialSelectionHandle.getAttribute("aria-pressed") !== "true"',
            "await initialTextbox.count() !== 1",
            "if (targetPreconditionFailed) return fail(failureClass);",
            "return fail(failureClass);",
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const preconditionDeadline = Date.now() + 30000;",
            "while (Date.now() < preconditionDeadline)",
            "const settledPanel = page.locator(" +
              JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
              ");",
            "const settledTargetRoot = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "blockRoot", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const settledSelectionHandle = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "selectBlock", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const settledTextbox = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "contentEditable", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  toneFlowConfig.fieldLabel,
                ])
              ) +
              ");",
            'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
            "const settledPanelRect = await settledPanel.count() === 1 ? await settledPanel.boundingBox() : null;",
            "const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;",
            "const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;",
            "const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;",
            "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
            "const settledTextboxText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
            "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
            "await settledPanel.count() === 1",
            "await settledPanel.isVisible()",
            "positive(settledPanelRect)",
            "await settledTargetRoot.count() === 1",
            "await settledTargetRoot.isVisible()",
            "positive(settledTargetRootRect)",
            'await settledTargetRoot.getAttribute("data-selected") === "true"',
            "await settledSelectionHandle.count() === 1",
            "await settledSelectionHandle.isVisible()",
            "positive(settledSelectionHandleRect)",
            'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
            "await settledTextbox.count() === 1",
            "await settledTextbox.isVisible()",
            "positive(settledTextboxRect)",
            "settledTextboxText === " +
              JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
            "settledTextboxFocused === false",
            "await contentDirty.count() === 1 &&",
            "await contentDirty.isVisible() &&",
            "positive(contentDirtyRect)",
            "baselineColor = await settledTextbox.evaluate((node) => getComputedStyle(node).color);",
            "if (baselineColor.length > 0) break;",
            'if (typeof baselineColor !== "string" || baselineColor.length === 0)',
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[2]) + ";",
            "const panel = page.locator(" +
              JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
              ");",
            "const trigger = panel.locator(" +
              JSON.stringify(registeredSelector(plan, "toneTrigger")) +
              ");",
            "const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;",
            "await panel.count() !== 1 || await trigger.count() !== 1 || !(await trigger.isVisible()) || !positive(triggerRect)",
            "await trigger.click({ timeout: 30000 });",
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[3]) + ";",
            "const contentCount = await openContent.count();",
            "if (contentCount > 1)",
            "const option = openContent.locator(" +
              JSON.stringify(registeredSelector(plan, "muted")) +
              ");",
            "const optionCount = await option.count();",
            "if (optionCount > 1)",
            "const contentRect = await openContent.boundingBox();",
            "const optionRect = optionCount === 1 ? await option.boundingBox() : null;",
            'const menuId = await openContent.getAttribute("id");',
            'const controls = await trigger.getAttribute("aria-controls");',
            "optionCount === 1 &&",
            "await openContent.isVisible() &&",
            "await option.isVisible() &&",
            "positive(contentRect) &&",
            "positive(optionRect) &&",
            'typeof menuId === "string"',
            "menuId.length > 0 &&",
            "controls === menuId &&",
            'await trigger.getAttribute("aria-expanded") === "true"',
            "page.context().__wf540Remember(" + JSON.stringify(toneFlowConfig.stateKey),
            "{ baselineColor, menuId }",
            "} catch {",
          ]
        : [
            "const fail = (failureClass) => ({ failureClass, settled: false });",
            "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
            "const sampleAtomicTeardown = () => page.evaluate(",
            "const exactElement = (root, selector) => {",
            "const matches = root.querySelectorAll(selector);",
            "return matches.length === 1 ? matches[0] : null;",
            "const visiblePositive = (node) => {",
            "const rect = node.getBoundingClientRect();",
            "const style = getComputedStyle(node);",
            "const structuralClosed =",
            toneSelectPanelGeometryToken,
            toneSelectTriggerGeometryToken,
            'trigger.textContent.trim() === "Muted"',
            'trigger.getAttribute("aria-expanded") === "false"',
            "document.querySelectorAll(allContentSelector).length === 0",
            "const interactionHandoff =",
            toneSelectUnlockedScrollToken,
            'body.style.pointerEvents !== "none"',
            'getComputedStyle(body).pointerEvents !== "none"',
            "return { interactionHandoff, structuralClosed };",
            "try {",
            "const authority = page.context().__wf540Recall(" +
              JSON.stringify(toneFlowConfig.stateKey),
            "const panel = page.locator(" +
              JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
              ");",
            "const trigger = panel.locator(" +
              JSON.stringify(registeredSelector(plan, "toneTrigger")) +
              ");",
            "const openContent = page.locator(" +
              JSON.stringify(OPEN_SELECT_CONTENT_SELECTOR) +
              ");",
            "const option = openContent.locator(" +
              JSON.stringify(registeredSelector(plan, "muted")) +
              ");",
            "const panelRect = await panel.count() === 1 ? await panel.boundingBox() : null;",
            "const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;",
            "const contentRect = await openContent.count() === 1 ? await openContent.boundingBox() : null;",
            "const optionRect = await option.count() === 1 ? await option.boundingBox() : null;",
            'const menuId = await openContent.count() === 1 ? await openContent.getAttribute("id") : null;',
            "const authorityOptionPreconditionFailed =",
            'typeof authority.baselineColor !== "string"',
            "authority.baselineColor.length === 0",
            'typeof authority.menuId !== "string"',
            "authority.menuId.length === 0",
            "await panel.count() !== 1",
            "!(await panel.isVisible())",
            "!positive(panelRect)",
            "await trigger.count() !== 1",
            "!(await trigger.isVisible())",
            "!positive(triggerRect)",
            "await openContent.count() !== 1",
            "!(await openContent.isVisible())",
            "!positive(contentRect)",
            "await option.count() !== 1",
            "!(await option.isVisible())",
            "!positive(optionRect)",
            "menuId !== authority.menuId",
            'await trigger.getAttribute("aria-controls") !== authority.menuId',
            'await trigger.getAttribute("aria-expanded") !== "true"',
            "if (authorityOptionPreconditionFailed) return fail(failureClass);",
            "await option.click({ timeout: 30000 });",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const stabilityHorizonMs = 600;",
            "let settledSince = null;",
            "let settledSampleCount = 0;",
            toneSelectResetSettlementBlock,
            "const deadline = Date.now() + 30000;",
            "while (Date.now() < deadline)",
            "const currentPanel = page.locator(" +
              JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
              ");",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const teardownSample = await sampleAtomicTeardown();",
            "if (!teardownSample.structuralClosed)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
            "if (!teardownSample.interactionHandoff)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[3]) + ";",
            'const presentationDirty = currentPanel.getByText("Unsaved presentation", { exact: true });',
            'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
            "const presentationDirtyRect = await presentationDirty.count() === 1 ? await presentationDirty.boundingBox() : null;",
            "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
            "const dirtyBadges =",
            "await presentationDirty.count() === 1",
            "await presentationDirty.isVisible()",
            "positive(presentationDirtyRect)",
            "await contentDirty.count() === 1",
            "await contentDirty.isVisible()",
            "positive(contentDirtyRect)",
            "if (!dirtyBadges)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[4]) + ";",
            "const targetRoot = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "blockRoot", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const selectionHandle = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "selectBlock", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                ])
              ) +
              ");",
            "const textbox = page.locator(" +
              JSON.stringify(
                registeredSelector(plan, "contentEditable", [
                  plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  toneFlowConfig.fieldLabel,
                ])
              ) +
              ");",
            "const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;",
            "const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;",
            "const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;",
            "const textboxText = await textbox.count() === 1 ? await textbox.textContent() : null;",
            "const textboxFocused = await textbox.count() === 1 ? await textbox.evaluate((node) => node === document.activeElement) : true;",
            "const selectionOverride =",
            "await targetRoot.count() === 1",
            "await targetRoot.isVisible()",
            "positive(targetRootRect)",
            'await targetRoot.getAttribute("data-selected") === "true"',
            'await targetRoot.getAttribute("data-screen-presentation-override") === "true"',
            "await selectionHandle.count() === 1",
            "await selectionHandle.isVisible()",
            "positive(selectionHandleRect)",
            'await selectionHandle.getAttribute("aria-pressed") === "true"',
            "await textbox.count() === 1",
            "await textbox.isVisible()",
            "positive(textboxRect)",
            "textboxText === " +
              JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
            "textboxFocused === false",
            "if (!selectionOverride)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[5]) + ";",
            'const textboxClassName = (await textbox.getAttribute("class")) ?? "";',
            'const mutedClass = textboxClassName.split(/\\s+/u).includes("text-muted-foreground");',
            "if (!mutedClass)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) + ";",
            "const currentColor = await textbox.evaluate((node) => getComputedStyle(node).color);",
            "const completePostcondition =",
            'typeof currentColor === "string"',
            "currentColor.length > 0",
            "currentColor !== authority.baselineColor",
            "if (!completePostcondition)",
            "const sampledAt = Date.now();",
            "if (settledSince === null) settledSince = sampledAt;",
            "settledSampleCount += 1;",
            "sampledAt - settledSince < stabilityHorizonMs",
            "settledSampleCount < 2",
            "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
            "!finalAtomicTeardownSample.structuralClosed",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "!finalAtomicTeardownSample.interactionHandoff",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
            "return true;",
            "return fail(failureClass);",
            "} catch {",
          ];
    // The compiled source is the POST-normalization source, so it must carry the
    // frame-preserving unit wrapper: without these pins the discarding wrapper — which
    // awaits the source and emits the unit success literal — satisfies every other token.
    const wrapperFailureClasses =
      toneFlowConfig.phase === "open"
        ? TONE_OPEN_BROWSER_FAILURE_CLASSES
        : TONE_SELECT_BROWSER_FAILURE_CLASSES;
    const wrapperRequired = [
      "const result = await (",
      "if (result === true) return { ok: true };",
      "const failureClasses = " + JSON.stringify(wrapperFailureClasses) + ";",
      'keys.length === 2 && keys.includes("failureClass") && keys.includes("settled")',
      "result.settled === false",
      "failureClasses.includes(result.failureClass)",
      "return result;",
      'throw new Error("wf540_' + unitFailureFrameResultErrorTagForAction(actionId) + '_result");',
    ];
    const required = [...commonRequired, ...phaseRequired, ...wrapperRequired];
    const orderedTokens =
      toneFlowConfig.phase === "open"
        ? [
            "let failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[0]) + ";",
            "const initialPanel = page.locator(",
            "const targetPreconditionFailed =",
            "if (targetPreconditionFailed) return fail(failureClass);",
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const preconditionDeadline = Date.now() + 30000;",
            "const settledPanel = page.locator(",
            'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
            "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
            "const settledTextboxText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
            "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
            "await settledTargetRoot.isVisible() &&",
            "positive(settledTargetRootRect) &&",
            "await settledSelectionHandle.isVisible() &&",
            "positive(settledSelectionHandleRect) &&",
            "settledTextboxText === " +
              JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
            "settledTextboxFocused === false",
            "await contentDirty.count() === 1 &&",
            "await contentDirty.isVisible() &&",
            "positive(contentDirtyRect)",
            "baselineColor = await settledTextbox.evaluate((node) => getComputedStyle(node).color);",
            'if (typeof baselineColor !== "string" || baselineColor.length === 0) return fail(failureClass);',
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[2]) + ";",
            "const panel = page.locator(",
            "if (await panel.count() !== 1 || await trigger.count() !== 1 || !(await trigger.isVisible()) || !positive(triggerRect)) return fail(failureClass);",
            "await trigger.click({ timeout: 30000 });",
            "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[3]) + ";",
            "const openContent = page.locator(",
            "page.context().__wf540Remember(",
          ]
        : [
            "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
            "const sampleAtomicTeardown = () => page.evaluate(",
            "const structuralClosed =",
            "const interactionHandoff =",
            "return { interactionHandoff, structuralClosed };",
            "const authority = page.context().__wf540Recall(",
            "const panel = page.locator(",
            "const trigger = panel.locator(",
            "const openContent = page.locator(",
            "const option = openContent.locator(",
            "const panelRect =",
            "const triggerRect =",
            "const contentRect =",
            "const optionRect =",
            "const authorityOptionPreconditionFailed =",
            "if (authorityOptionPreconditionFailed) return fail(failureClass);",
            "await option.click({ timeout: 30000 });",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const stabilityHorizonMs = 600;",
            "let settledSince = null;",
            "let settledSampleCount = 0;",
            "const resetSettlement = () => {",
            "const deadline = Date.now() + 30000;",
            "while (Date.now() < deadline)",
            "const currentPanel = page.locator(",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "const teardownSample = await sampleAtomicTeardown();",
            "if (!teardownSample.structuralClosed)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
            "if (!teardownSample.interactionHandoff)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[3]) + ";",
            "const presentationDirty =",
            "const contentDirty =",
            "const presentationDirtyRect =",
            "const contentDirtyRect =",
            "const dirtyBadges =",
            "if (!dirtyBadges)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[4]) + ";",
            "const targetRoot = page.locator(",
            "const selectionHandle = page.locator(",
            "const textbox = page.locator(",
            "const targetRootRect =",
            "const selectionHandleRect =",
            "const textboxRect =",
            "const textboxText =",
            "const textboxFocused =",
            "const selectionOverride =",
            "if (!selectionOverride)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[5]) + ";",
            "const textboxClassName =",
            "const mutedClass =",
            "if (!mutedClass)",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) + ";",
            "const currentColor =",
            "const completePostcondition =",
            "currentColor !== authority.baselineColor",
            "if (!completePostcondition)",
            "const sampledAt = Date.now();",
            "if (settledSince === null) settledSince = sampledAt;",
            "settledSampleCount += 1;",
            "sampledAt - settledSince < stabilityHorizonMs",
            "settledSampleCount < 2",
            "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
            "!finalAtomicTeardownSample.structuralClosed",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
            "!finalAtomicTeardownSample.interactionHandoff",
            "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
            "return true;",
            "return fail(failureClass);",
            "} catch {",
          ];
    const validates = (source) => {
      if (!required.every((token) => source.includes(token))) return false;
      if (
        source.split("return fail(failureClass);").length - 1 !==
          (toneFlowConfig.phase === "open" ? 7 : 3) ||
        source.includes('throw new Error("wf540_tone_') ||
        source.includes(".fill(") ||
        source.includes(".blur(") ||
        source.includes("catch (") ||
        source.includes("error.message") ||
        source.includes("String(error") ||
        (toneFlowConfig.phase === "select" &&
          (source.split("const deadline = Date.now() + 30000;").length - 1 !== 1 ||
            source.split("while (Date.now() < deadline)").length - 1 !== 1 ||
            source.includes("failureStage") ||
            source.includes("advance(") ||
            source.includes("nextFailureClass") ||
            source.split("sampleAtomicTeardown();").length - 1 !== 2 ||
            source.split("const finalAtomicTeardownSample = await sampleAtomicTeardown();").length -
              1 !==
              1 ||
            source.split("resetSettlement();").length - 1 !== 8 ||
            source.split("const stabilityHorizonMs = 600;").length - 1 !== 1 ||
            source.includes("MutationObserver") ||
            source.includes("__wf540LockOwnerTimeline_") ||
            source.includes("timelineInstalled") ||
            source.includes("const menuClosed =") ||
            source.includes("const bodyInteraction =") ||
            source.includes("currentSelectContent") ||
            source.includes("currentTrigger") ||
            source.includes("page.keyboard") ||
            source.includes('press("Escape")') ||
            // Each class gains exactly one occurrence from the preserving wrapper's
            // `const failureClasses = [...]` line, on top of its in-source occurrences.
            !TONE_SELECT_BROWSER_FAILURE_CLASSES.every(
              (currentFailureClass, index) =>
                source.split(JSON.stringify(currentFailureClass)).length - 1 ===
                (index === 1 ? 4 : index === 2 ? 3 : 2)
            )))
      ) {
        return false;
      }
      let previousIndex = -1;
      for (const token of orderedTokens) {
        const tokenIndex = source.indexOf(token, previousIndex + 1);
        if (tokenIndex <= previousIndex) return false;
        previousIndex = tokenIndex;
      }
      return true;
    };
    if (!validates(compiledSource)) {
      const missingRequired = required.flatMap((token, index) =>
        compiledSource.includes(token) ? [] : [index]
      );
      let previousIndex = -1;
      const brokenOrder = [];
      for (const [index, token] of orderedTokens.entries()) {
        const tokenIndex = compiledSource.indexOf(token, previousIndex + 1);
        if (tokenIndex <= previousIndex) brokenOrder.push(index);
        else previousIndex = tokenIndex;
      }
      throw new Error(
        actionId +
          " tone flow source contract drift required=" +
          missingRequired.join(",") +
          " order=" +
          brokenOrder.join(",")
      );
    }
    assertSourceMutantsRejected(
      compiledSource,
      validates,
      required,
      actionId + " tone flow settlement"
    );
    for (let index = 1; index < orderedTokens.length; index += 1) {
      const left = orderedTokens[index - 1];
      const right = orderedTokens[index];
      const marker = "__WF540_TONE_ORDER_MUTANT_" + index + "__";
      const mutant = compiledSource
        .replace(left, marker)
        .replace(right, left)
        .replace(marker, right);
      assertNegative(!validates(mutant), actionId + " tone flow order mutant " + index);
    }
    const boundCatchMutant = compiledSource.replace("} catch {", "} catch (error) {");
    assertNegative(!validates(boundCatchMutant), actionId + " tone flow bound catch mutant");
    if (toneFlowConfig.phase === "open") return { actionId, phase: "open" };
    else {
      for (const [label, mutant] of [
        [
          "short stability horizon",
          compiledSource.replace(
            "const stabilityHorizonMs = 600;",
            "const stabilityHorizonMs = 0;"
          ),
        ],
        [
          "missing final atomic teardown",
          compiledSource.replace(
            "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
            "const finalAtomicTeardownSample = teardownSample;"
          ),
        ],
        ["missing failed-condition reset", compiledSource.replace("resetSettlement();", "void 0;")],
        [
          "no-op reset helper",
          compiledSource.replace(
            toneSelectResetSettlementBlock,
            [
              "const resetSettlement = () => {",
              "                void settledSince;",
              "                void settledSampleCount;",
              "              };",
            ].join("\n")
          ),
        ],
        [
          "scroll-lock negation flip",
          compiledSource.replace(
            toneSelectUnlockedScrollToken,
            'body.hasAttribute("data-scroll-locked")'
          ),
        ],
        [
          "missing panel positive geometry",
          compiledSource.replace(toneSelectPanelGeometryToken, "true &&"),
        ],
        [
          "missing trigger positive geometry",
          compiledSource.replace(toneSelectTriggerGeometryToken, "true &&"),
        ],
        [
          "restored monotonic failure stage",
          compiledSource.replace(
            "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
            "let failureClass = " +
              JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) +
              "; let failureStage = 0;"
          ),
        ],
        [
          "stale unlock-to-relock classification",
          (() => {
            const exactHandoffAssignment =
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";";
            const finalAssignmentIndex = compiledSource.lastIndexOf(exactHandoffAssignment);
            invariant(
              finalAssignmentIndex >= 0,
              actionId + " tone-select final handoff assignment anchor drift"
            );
            return (
              compiledSource.slice(0, finalAssignmentIndex) +
              "failureClass = " +
              JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) +
              ";" +
              compiledSource.slice(finalAssignmentIndex + exactHandoffAssignment.length)
            );
          })(),
        ],
      ]) {
        assertNegative(!validates(mutant), actionId + " tone-select " + label + " mutant");
      }
      return { actionId, phase: "select" };
    }
  }
  return null;
}

export function assertToneOptionSelectorShape({ assertNegative, plan }) {
  // Driven off the BUILT PLAN — plan.registries.selectors, the value the tone sources
  // actually receive — never off a source literal, so a regression cannot hide behind a
  // stale expectation in this file.
  invariant(
    registeredSelector(plan, "muted") === TONE_OPTION_SELECTOR,
    "tone option selector literal drift"
  );
  invariant(
    !addressesRadixOptionByOwnText(TONE_OPTION_SELECTOR),
    "tone option delegated selector was rejected"
  );
  for (const [name, template] of Object.entries(plan.registries.selectors)) {
    invariant(
      template !== null &&
        typeof template === "object" &&
        Array.isArray(template.parts) &&
        template.parts.every((part) => typeof part === "string"),
      name + " registered selector template is invalid"
    );
    invariant(
      !addressesRadixOptionByOwnText(template.parts.join(" ")),
      name + " addresses a Radix Select option by the host's own text"
    );
  }
  for (const [label, literal] of [
    ["pre-fix option literal", '[role="option"]:text-is("Muted")'],
    ["select-item host literal", '[data-slot="select-item"]:text-is("Muted")'],
    ["scoped option literal", '[data-preview-shell="roomy"] [role="option"]:text-is("Muted")'],
  ]) {
    assertNegative(
      addressesRadixOptionByOwnText(literal),
      "tone option own-text rejection: " + label
    );
  }
}

export function assertToneFlowRunCodeSourceOwnership({
  assertNegative,
  observedToneMenuOpenActionIds,
  observedToneMutedActionIds,
  plan,
}) {
  invariant(
    deepEqualJson(observedToneMenuOpenActionIds, TONE_MENU_OPEN_ACTION_IDS),
    "tone-open specialization ownership drift"
  );
  invariant(
    deepEqualJson(observedToneMutedActionIds, TONE_MUTED_ACTION_IDS),
    "tone-muted specialization ownership drift"
  );
  assertToneOptionSelectorShape({ assertNegative, plan });
}
