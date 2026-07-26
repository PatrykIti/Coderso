import path from "node:path";

import {
  ALL_SELECT_CONTENT_SELECTOR,
  DATABASE_OPERATION_TIMEOUT_MS,
  EXPECTED_AUTH_CHALLENGE_PHASES,
  OPEN_SELECT_CONTENT_SELECTOR,
  RECORDS_WORKSPACE_ACTION_IDS,
  RECORD_ENTRY_MENU_ACTION_IDS,
  TONE_CONTENT_FILL_ACTION_CONFIG,
  TONE_FLOW_ACTION_CONFIG,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  clickBudgetMsForAction,
} from "../executor/config.mjs";
import { invariant } from "../executor/foundation.mjs";
import {
  expandRegisteredPath,
  registeredSelector,
  resolveExactRef,
} from "../executor/ref-dsl.mjs";

export function buildSimpleBrowserInvocation(
  { buildDataBearingRunCodeInvocation, playwrightArgs, runCode },
  action,
  executionSpec,
  plan,
  captures,
  root,
  browserCwd,
  refContext
) {
  invariant(
    typeof buildDataBearingRunCodeInvocation === "function" &&
      typeof playwrightArgs === "function" &&
      typeof runCode === "function",
    "simple browser invocation dependencies are invalid"
  );
  invariant(
    executionSpec.builder === action.builder && executionSpec.kind === action.kind,
    "registered browser execution drift"
  );
  const parsed = executionSpec.builderAst;
  const resolvedArgs = executionSpec.refs.map((ref, index) =>
    resolveExactRef(ref, refContext, action.id + " executable Ref[" + index + "]")
  );
  switch (action.kind) {
    case "open":
      invariant(parsed.args.length === 1, "open arity");
      return { args: playwrightArgs("open", resolvedArgs[0]), displayArgs: null };
    case "goto": {
      invariant(parsed.args.length === 1, "goto arity");
      const url = JSON.stringify(resolvedArgs[0]);
      if (action.id === "set-007-goto-login") {
        const email = JSON.stringify(registeredSelector(plan, "loginEmail"));
        const password = JSON.stringify(registeredSelector(plan, "loginPassword"));
        const submit = JSON.stringify(registeredSelector(plan, "loginSubmit"));
        const loginUrl = JSON.stringify(
          plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login
        );
        return {
          args: runCode(`async (page) => {
            const context = page.context();
            const pageId = page.__wf540PageIdentity?.pageId;
            context.__wf540ArmExpectedAuthChallenge({
              phaseId: "set-007-goto-login",
              pageId,
              navigationBaseline: page.__wf540ReadNavigationCount(),
            });
            await page.goto(${url}, { timeout: ${DATABASE_OPERATION_TIMEOUT_MS} });
            const targets = [page.locator(${email}), page.locator(${password}), page.locator(${submit})];
            for (const [index, target] of targets.entries()) {
              try {
                await target.waitFor({ state: "visible", timeout: 180000 });
              } catch {
                const currentUrl = page.url();
                const bodyText = ((await page.locator("body").innerText().catch(() => "")) ?? "").trim();
                const failureClass = currentUrl.includes("/setup")
                  ? "setup_route"
                  : !currentUrl.startsWith(${loginUrl})
                    ? "wrong_route"
                    : bodyText.length === 0
                      ? "empty_body"
                      : "selector_" + index;
                throw new Error("wf540_login_wait_" + failureClass);
              }
              if (await target.count() !== 1) throw new Error("wf540_login_target_count");
            }
            if (page.url() !== ${loginUrl}) throw new Error("wf540_login_url");
            context.__wf540CloseExpectedAuthChallenge({
              closeActionId: "set-007-goto-login",
              pageId,
              navigationEpoch: page.__wf540ReadNavigationCount(),
              url: page.url(),
            });
            return true;
          }`),
          displayArgs: null,
        };
      }
      if (resolvedArgs[0] === expandRegisteredPath(plan, "builder", captures)) {
        const canvas = JSON.stringify(registeredSelector(plan, "canvas"));
        return {
          args: runCode(`async (page) => {
            await page.goto(${url}, { timeout: ${DATABASE_OPERATION_TIMEOUT_MS} });
            const marker = page.locator(${canvas});
            try {
              await marker.waitFor({ state: "visible", timeout: 90000 });
            } catch {
              const bodyText = ((await page.locator("body").innerText().catch(() => "")) ?? "").trim();
              throw new Error(
                !page.url().startsWith(${url})
                  ? "wf540_builder_wait_wrong_route"
                  : bodyText.length === 0
                    ? "wf540_builder_wait_empty_body"
                    : "wf540_builder_wait_marker"
              );
            }
            if (await marker.count() !== 1) throw new Error("wf540_builder_marker_count");
            return true;
          }`),
          displayArgs: null,
        };
      }
      return buildDataBearingRunCodeInvocation("goto-ready", { url: resolvedArgs[0] });
    }
    case "resize": {
      invariant(parsed.args.length === 2, "resize arity");
      const width = Number(resolvedArgs[0]);
      const height = Number(resolvedArgs[1]);
      invariant(
        Number.isSafeInteger(width) && Number.isSafeInteger(height),
        "resize dimensions drift"
      );
      return {
        args: runCode(
          `async (page) => { await page.setViewportSize({width:${width},height:${height}}); return true; }`
        ),
        displayArgs: null,
      };
    }
    case "click": {
      const isRecordEntryMenuAction = RECORD_ENTRY_MENU_ACTION_IDS.includes(action.id);
      invariant(parsed.args.length === (isRecordEntryMenuAction ? 2 : 1), "click arity");
      const selector = JSON.stringify(resolvedArgs[0]);
      if (isRecordEntryMenuAction) {
        const menuItemSelector = JSON.stringify(resolvedArgs[1]);
        const expectedEntryUrl = JSON.stringify(expandRegisteredPath(plan, "entry", captures));
        return {
          args: runCode(`async (page) => {
            const trigger = page.locator(${selector});
            await trigger.waitFor({ state: "visible", timeout: 60000 });
            if (await trigger.count() !== 1 || !(await trigger.isVisible())) throw new Error("wf540_record_actions_target");
            await trigger.click({ timeout: 30000 });
            const menuItem = page.locator(${menuItemSelector});
            await menuItem.waitFor({ state: "visible", timeout: 30000 });
            if (await menuItem.count() !== 1 || !(await menuItem.isVisible())) throw new Error("wf540_edit_record_target");
            await menuItem.click({ timeout: 30000 });
            const realm = page.locator('[data-custom-screen-entry-document="true"]');
            const deadline = Date.now() + 90000;
            while (Date.now() < deadline) {
              const rect = await realm.count() === 1 ? await realm.boundingBox() : null;
              if (page.url() === ${expectedEntryUrl} && rect && rect.width > 0 && rect.height > 0 && await realm.isVisible()) return true;
              await page.waitForTimeout(25);
            }
            if (page.url() !== ${expectedEntryUrl}) throw new Error("wf540_entry_navigation_url");
            throw new Error("wf540_entry_navigation_realm");
          }`),
          displayArgs: null,
        };
      }
      const toneFlowConfig = TONE_FLOW_ACTION_CONFIG[action.id];
      if (toneFlowConfig !== undefined) {
        const panelSelector = '[data-custom-screen-entry-presentation-panel="true"]';
        const allContentSelector = JSON.stringify(ALL_SELECT_CONTENT_SELECTOR);
        const openContentSelector = JSON.stringify(OPEN_SELECT_CONTENT_SELECTOR);
        const mutedSelector = JSON.stringify(registeredSelector(plan, "muted"));
        const triggerSelector = JSON.stringify(registeredSelector(plan, "toneTrigger"));
        const targetBlockId = plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey];
        invariant(
          typeof targetBlockId === "string" && targetBlockId.length > 0,
          "tone target drift"
        );
        const targetRootSelector = JSON.stringify(
          registeredSelector(plan, "blockRoot", [targetBlockId])
        );
        const selectionHandleSelector = JSON.stringify(
          registeredSelector(plan, "selectBlock", [targetBlockId])
        );
        const textboxSelector = JSON.stringify(
          registeredSelector(plan, "contentEditable", [targetBlockId, toneFlowConfig.fieldLabel])
        );
        const expectedDraft = plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey];
        invariant(
          typeof expectedDraft === "string" && expectedDraft.length > 0,
          "tone expected draft drift"
        );
        const stateKey = JSON.stringify(toneFlowConfig.stateKey);
        if (toneFlowConfig.phase === "open") {
          invariant(TONE_MENU_OPEN_ACTION_IDS.includes(action.id), "tone-open ownership drift");
          return {
            args: runCode(`async (page) => {
              const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
              const fail = (failureClass) => ({ failureClass, settled: false });
              let failureClass = ${JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[0])};
              try {
                const initialPanel = page.locator(${JSON.stringify(panelSelector)});
                await initialPanel.waitFor({ state: "visible", timeout: 30000 });
                const initialTargetRoot = page.locator(${targetRootSelector});
                const initialSelectionHandle = page.locator(${selectionHandleSelector});
                const initialTextbox = page.locator(${textboxSelector});
                const targetPreconditionFailed =
                  await initialPanel.count() !== 1 ||
                  await initialTargetRoot.count() !== 1 ||
                  await initialTargetRoot.getAttribute("data-selected") !== "true" ||
                  await initialSelectionHandle.count() !== 1 ||
                  await initialSelectionHandle.getAttribute("aria-pressed") !== "true" ||
                  await initialTextbox.count() !== 1;
                if (targetPreconditionFailed) return fail(failureClass);
                failureClass = ${JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[1])};
                let baselineColor = null;
                const preconditionDeadline = Date.now() + 30000;
                while (Date.now() < preconditionDeadline) {
                  const settledPanel = page.locator(${JSON.stringify(panelSelector)});
                  const settledTargetRoot = page.locator(${targetRootSelector});
                  const settledSelectionHandle = page.locator(${selectionHandleSelector});
                  const settledTextbox = page.locator(${textboxSelector});
                  const contentDirty = page.getByText("Unsaved changes", { exact: true });
                  const settledPanelRect = await settledPanel.count() === 1 ? await settledPanel.boundingBox() : null;
                  const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;
                  const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;
                  const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;
                  const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;
                  const settledTextboxText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;
                  const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;
                  if (
                    await settledPanel.count() === 1 &&
                    await settledPanel.isVisible() &&
                    positive(settledPanelRect) &&
                    await settledTargetRoot.count() === 1 &&
                    await settledTargetRoot.isVisible() &&
                    positive(settledTargetRootRect) &&
                    await settledTargetRoot.getAttribute("data-selected") === "true" &&
                    await settledSelectionHandle.count() === 1 &&
                    await settledSelectionHandle.isVisible() &&
                    positive(settledSelectionHandleRect) &&
                    await settledSelectionHandle.getAttribute("aria-pressed") === "true" &&
                    await settledTextbox.count() === 1 &&
                    await settledTextbox.isVisible() &&
                    positive(settledTextboxRect) &&
                    settledTextboxText === ${JSON.stringify(expectedDraft)} &&
                    settledTextboxFocused === false &&
                    await contentDirty.count() === 1 &&
                    await contentDirty.isVisible() &&
                    positive(contentDirtyRect)
                  ) {
                    baselineColor = await settledTextbox.evaluate((node) => getComputedStyle(node).color);
                    if (baselineColor.length > 0) break;
                  }
                  await page.waitForTimeout(25);
                }
                if (typeof baselineColor !== "string" || baselineColor.length === 0) return fail(failureClass);
                failureClass = ${JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[2])};
                const panel = page.locator(${JSON.stringify(panelSelector)});
                const trigger = panel.locator(${triggerSelector});
                const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;
                if (await panel.count() !== 1 || await trigger.count() !== 1 || !(await trigger.isVisible()) || !positive(triggerRect)) return fail(failureClass);
                await trigger.click({ timeout: 30000 });
                failureClass = ${JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[3])};
                const deadline = Date.now() + 30000;
                while (Date.now() < deadline) {
                  const openContent = page.locator(${openContentSelector});
                  const contentCount = await openContent.count();
                  if (contentCount > 1) return fail(failureClass);
                  if (contentCount === 1) {
                    const option = openContent.locator(${mutedSelector});
                    const optionCount = await option.count();
                    if (optionCount > 1) return fail(failureClass);
                    const contentRect = await openContent.boundingBox();
                    const optionRect = optionCount === 1 ? await option.boundingBox() : null;
                    const menuId = await openContent.getAttribute("id");
                    const controls = await trigger.getAttribute("aria-controls");
                    if (
                      optionCount === 1 &&
                      await openContent.isVisible() &&
                      await option.isVisible() &&
                      positive(contentRect) &&
                      positive(optionRect) &&
                      typeof menuId === "string" &&
                      menuId.length > 0 &&
                      controls === menuId &&
                      await trigger.getAttribute("aria-expanded") === "true"
                    ) {
                      page.context().__wf540Remember(${stateKey}, { baselineColor, menuId });
                      return true;
                    }
                  }
                  await page.waitForTimeout(25);
                }
                return fail(failureClass);
              } catch {
                return fail(failureClass);
              }
            }`),
            displayArgs: null,
          };
        }
        invariant(
          toneFlowConfig.phase === "select" && TONE_MUTED_ACTION_IDS.includes(action.id),
          "tone-muted ownership drift"
        );
        return {
          args: runCode(`async (page) => {
	            const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
	            const fail = (failureClass) => ({ failureClass, settled: false });
	            let failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0])};
		            const sampleAtomicTeardown = () => page.evaluate(
		              ({ allContentSelector, panelSelector, triggerSelector }) => {
		                const exactElement = (root, selector) => {
		                  const matches = root.querySelectorAll(selector);
		                  return matches.length === 1 ? matches[0] : null;
		                };
                const visiblePositive = (node) => {
                  if (node === null) return false;
                  const rect = node.getBoundingClientRect();
	                  const style = getComputedStyle(node);
	                  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse";
	                };
		                const panel = exactElement(document, panelSelector);
		                const trigger = panel === null ? null : exactElement(panel, triggerSelector);
		                const body = document.body;
		                const structuralClosed =
		                  visiblePositive(panel) &&
                  visiblePositive(trigger) &&
                  trigger.textContent.trim() === "Muted" &&
                  trigger.getAttribute("aria-expanded") === "false" &&
                  document.querySelectorAll(allContentSelector).length === 0;
                const interactionHandoff =
                  body !== null &&
	                  !body.hasAttribute("data-scroll-locked") &&
	                  body.style.pointerEvents !== "none" &&
	                  getComputedStyle(body).pointerEvents !== "none";
		                return { interactionHandoff, structuralClosed };
		              },
		              {
		                allContentSelector: ${allContentSelector},
		                panelSelector: ${JSON.stringify(panelSelector)},
		                triggerSelector: ${triggerSelector},
		              }
	            );
            try {
              const authority = page.context().__wf540Recall(${stateKey});
              const panel = page.locator(${JSON.stringify(panelSelector)});
              const trigger = panel.locator(${triggerSelector});
              const openContent = page.locator(${openContentSelector});
              const option = openContent.locator(${selector});
              const panelRect = await panel.count() === 1 ? await panel.boundingBox() : null;
              const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;
              const contentRect = await openContent.count() === 1 ? await openContent.boundingBox() : null;
              const optionRect = await option.count() === 1 ? await option.boundingBox() : null;
              const menuId = await openContent.count() === 1 ? await openContent.getAttribute("id") : null;
              const authorityOptionPreconditionFailed =
                authority === null ||
                typeof authority !== "object" ||
                typeof authority.baselineColor !== "string" ||
                authority.baselineColor.length === 0 ||
                typeof authority.menuId !== "string" ||
                authority.menuId.length === 0 ||
                await panel.count() !== 1 ||
                !(await panel.isVisible()) ||
                !positive(panelRect) ||
                await trigger.count() !== 1 ||
                !(await trigger.isVisible()) ||
                !positive(triggerRect) ||
                await openContent.count() !== 1 ||
                !(await openContent.isVisible()) ||
                !positive(contentRect) ||
                await option.count() !== 1 ||
                !(await option.isVisible()) ||
                !positive(optionRect) ||
                menuId !== authority.menuId ||
                await trigger.getAttribute("aria-controls") !== authority.menuId ||
                await trigger.getAttribute("aria-expanded") !== "true";
              if (authorityOptionPreconditionFailed) return fail(failureClass);
              await option.click({ timeout: 30000 });
              failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1])};
              const stabilityHorizonMs = 600;
              let settledSince = null;
              let settledSampleCount = 0;
              const resetSettlement = () => {
                settledSince = null;
                settledSampleCount = 0;
              };
              const deadline = Date.now() + 30000;
              while (Date.now() < deadline) {
                const currentPanel = page.locator(${JSON.stringify(panelSelector)});
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1])};
                const teardownSample = await sampleAtomicTeardown();
                if (!teardownSample.structuralClosed) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2])};
                if (!teardownSample.interactionHandoff) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[3])};
                const presentationDirty = currentPanel.getByText("Unsaved presentation", { exact: true });
                const contentDirty = page.getByText("Unsaved changes", { exact: true });
                const presentationDirtyRect = await presentationDirty.count() === 1 ? await presentationDirty.boundingBox() : null;
                const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;
                const dirtyBadges =
                  await presentationDirty.count() === 1 &&
                  await presentationDirty.isVisible() &&
                  positive(presentationDirtyRect) &&
                  await contentDirty.count() === 1 &&
                  await contentDirty.isVisible() &&
                  positive(contentDirtyRect);
                if (!dirtyBadges) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[4])};
                const targetRoot = page.locator(${targetRootSelector});
                const selectionHandle = page.locator(${selectionHandleSelector});
                const textbox = page.locator(${textboxSelector});
                const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;
                const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;
                const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;
                const textboxText = await textbox.count() === 1 ? await textbox.textContent() : null;
                const textboxFocused = await textbox.count() === 1 ? await textbox.evaluate((node) => node === document.activeElement) : true;
                const selectionOverride =
                  await targetRoot.count() === 1 &&
                  await targetRoot.isVisible() &&
                  positive(targetRootRect) &&
                  await targetRoot.getAttribute("data-selected") === "true" &&
                  await targetRoot.getAttribute("data-screen-presentation-override") === "true" &&
                  await selectionHandle.count() === 1 &&
                  await selectionHandle.isVisible() &&
                  positive(selectionHandleRect) &&
                  await selectionHandle.getAttribute("aria-pressed") === "true" &&
                  await textbox.count() === 1 &&
                  await textbox.isVisible() &&
                  positive(textboxRect) &&
                  textboxText === ${JSON.stringify(expectedDraft)} &&
                  textboxFocused === false;
                if (!selectionOverride) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[5])};
                const textboxClassName = (await textbox.getAttribute("class")) ?? "";
                const mutedClass = textboxClassName.split(/\\s+/u).includes("text-muted-foreground");
                if (!mutedClass) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6])};
                const currentColor = await textbox.evaluate((node) => getComputedStyle(node).color);
                const completePostcondition =
                  typeof currentColor === "string" &&
                  currentColor.length > 0 &&
                  currentColor !== authority.baselineColor;
                if (!completePostcondition) {
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
                const sampledAt = Date.now();
                if (settledSince === null) settledSince = sampledAt;
                settledSampleCount += 1;
                if (
                  sampledAt - settledSince < stabilityHorizonMs ||
                  settledSampleCount < 2
                ) {
                  await page.waitForTimeout(25);
                  continue;
                }
	                const finalAtomicTeardownSample = await sampleAtomicTeardown();
                if (!finalAtomicTeardownSample.structuralClosed) {
                  failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1])};
                  resetSettlement();
                  await page.waitForTimeout(25);
                  continue;
                }
	                if (!finalAtomicTeardownSample.interactionHandoff) {
                  failureClass = ${JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2])};
                  resetSettlement();
                  await page.waitForTimeout(25);
	                  continue;
	                }
	                return true;
              }
              return fail(failureClass);
            } catch {
              return fail(failureClass);
            }
          }`),
          displayArgs: null,
        };
      }
      const authPhase = EXPECTED_AUTH_CHALLENGE_PHASES.find(
        ({ armActionId }) => armActionId === action.id
      );
      if (authPhase && action.id !== "set-007-goto-login") {
        return {
          args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_signout_target_count");
            const context = page.context();
            const pageId = page.__wf540PageIdentity?.pageId;
            context.__wf540ArmExpectedAuthChallenge({
              phaseId: ${JSON.stringify(authPhase.armActionId)},
              pageId,
              navigationBaseline: page.__wf540ReadNavigationCount(),
            });
            await locator.click({ timeout: 30000 });
            return true;
          }`),
          displayArgs: null,
        };
      }
      if (RECORDS_WORKSPACE_ACTION_IDS.includes(action.id)) {
        const recordActionsSelector = JSON.stringify(registeredSelector(plan, "recordActions"));
        const expectedRecordsUrl = JSON.stringify(expandRegisteredPath(plan, "records", captures));
        return {
          args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_records_link_count");
            await locator.click();
            const recordActions = page.locator(${recordActionsSelector});
            try {
              await recordActions.waitFor({ state: "visible", timeout: 90000 });
            } catch {
              const bodyText = ((await page.locator("body").innerText().catch(() => "")) ?? "").trim();
              throw new Error(
                bodyText.length === 0
                  ? "wf540_record_actions_wait_empty_body"
                  : "wf540_record_actions_wait_missing_target"
              );
            }
            if (page.url() !== ${expectedRecordsUrl}) throw new Error("wf540_records_navigation_url");
            if (await recordActions.count() !== 1 || !(await recordActions.isVisible())) throw new Error("wf540_record_actions_count");
            return true;
          }`),
          displayArgs: null,
        };
      }
      if (
        ["bi-014-builder-save", "bi-055-save-palette-media", "tc-031-save", "tk-009-save"].includes(
          action.id
        )
      ) {
        const writePath =
          "/admin/api/custom-screens/" + encodeURIComponent(captures.get("screen.id"));
        return {
          args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_save_target_count");
            const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(${JSON.stringify(writePath)}), { timeout: 270000 });
            await locator.click();
            const response = await responsePromise;
            if (!response.ok()) throw new Error("wf540_builder_save_response");
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
              if (await locator.count() === 1 && await locator.isEnabled() && (await locator.textContent())?.trim() === "Save" && await page.getByText("Saving...", { exact: true }).count() === 0) return true;
              await page.waitForTimeout(25);
            }
            throw new Error("wf540_builder_save_settlement");
          }`),
          displayArgs: null,
        };
      }
      // Only the WAIT budget is per-action; the emitted check is one shared template, so an
      // action with the generic budget keeps byte-identical source.
      const clickBudgetMs = clickBudgetMsForAction(action.id);
      return {
        args: runCode(`async (page) => {
          const locator = page.locator(${selector});
          const deadline = Date.now() + ${clickBudgetMs};
          while (Date.now() < deadline && await locator.count() !== 1) await page.waitForTimeout(25);
          const count = await locator.count();
          if (count !== 1) {
            throw new Error(count === 0 ? "wf540_target_missing" : "wf540_target_duplicate");
          }
          await locator.click({ timeout: ${clickBudgetMs} });
          return true;
        }`),
        displayArgs: null,
      };
    }
    case "fill": {
      invariant(parsed.args.length === 2, "fill arity");
      const selector = resolvedArgs[0];
      const value = resolvedArgs[1];
      const toneContentFillConfig = TONE_CONTENT_FILL_ACTION_CONFIG[action.id];
      if (toneContentFillConfig !== undefined) {
        const targetBlockId =
          plan.fixtureBlueprint.screen.blockIds[toneContentFillConfig.targetBlockKey];
        const expectedDraft = plan.fixtureBlueprint.entry[toneContentFillConfig.expectedDraftKey];
        invariant(
          typeof targetBlockId === "string" &&
            targetBlockId.length > 0 &&
            typeof expectedDraft === "string" &&
            expectedDraft.length > 0 &&
            value === expectedDraft &&
            selector ===
              registeredSelector(plan, "contentEditable", [
                targetBlockId,
                toneContentFillConfig.fieldLabel,
              ]),
          "tone content fill contract drift"
        );
        const targetRootSelector = registeredSelector(plan, "blockRoot", [targetBlockId]);
        const selectionHandleSelector = registeredSelector(plan, "selectBlock", [targetBlockId]);
        return {
          args: runCode(`async (page) => {
            const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
            const textbox = page.locator(${JSON.stringify(selector)});
            const targetRoot = page.locator(${JSON.stringify(targetRootSelector)});
            const selectionHandle = page.locator(${JSON.stringify(selectionHandleSelector)});
            await textbox.waitFor({ state: "visible", timeout: 30000 });
            const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;
            const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;
            const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;
            if (
              await textbox.count() !== 1 ||
              !(await textbox.isVisible()) ||
              !positive(textboxRect) ||
              await targetRoot.count() !== 1 ||
              !(await targetRoot.isVisible()) ||
              !positive(targetRootRect) ||
              await targetRoot.getAttribute("data-selected") !== "true" ||
              await selectionHandle.count() !== 1 ||
              !(await selectionHandle.isVisible()) ||
              !positive(selectionHandleRect) ||
              await selectionHandle.getAttribute("aria-pressed") !== "true"
            ) throw new Error("wf540_tone_fill_precondition");
            await textbox.fill(${JSON.stringify(expectedDraft)});
            const filledText = await textbox.textContent();
            const filledTextboxFocused = await textbox.evaluate((node) => node === document.activeElement);
            if (filledText !== ${JSON.stringify(expectedDraft)} || filledTextboxFocused !== true) throw new Error("wf540_tone_fill_focus");
            await textbox.blur();
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
              const settledTextbox = page.locator(${JSON.stringify(selector)});
              const settledTargetRoot = page.locator(${JSON.stringify(targetRootSelector)});
              const settledSelectionHandle = page.locator(${JSON.stringify(selectionHandleSelector)});
              const contentDirty = page.getByText("Unsaved changes", { exact: true });
              const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;
              const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;
              const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;
              const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;
              const settledText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;
              const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;
              if (
                await settledTextbox.count() === 1 &&
                await settledTextbox.isVisible() &&
                positive(settledTextboxRect) &&
                settledText === ${JSON.stringify(expectedDraft)} &&
                settledTextboxFocused === false &&
                await settledTargetRoot.count() === 1 &&
                await settledTargetRoot.isVisible() &&
                positive(settledTargetRootRect) &&
                await settledTargetRoot.getAttribute("data-selected") === "true" &&
                await settledSelectionHandle.count() === 1 &&
                await settledSelectionHandle.isVisible() &&
                positive(settledSelectionHandleRect) &&
                await settledSelectionHandle.getAttribute("aria-pressed") === "true" &&
                await contentDirty.count() === 1 &&
                await contentDirty.isVisible() &&
                positive(contentDirtyRect)
              ) return true;
              await page.waitForTimeout(25);
            }
            throw new Error("wf540_tone_fill_dirty_settlement");
          }`),
          displayArgs: null,
        };
      }
      const credential =
        action.executable.type === "browser-native" &&
        action.executable.operationId === "fill-secret";
      if (!credential) {
        return buildDataBearingRunCodeInvocation("fill", { selector, value });
      }
      return {
        args: playwrightArgs("fill", selector, value),
        displayArgs: playwrightArgs("fill", selector, credential ? parsed.args[1] : value),
        stdoutDiscarded: credential,
      };
    }
    case "type": {
      invariant(parsed.args.length === 2, "type arity");
      return buildDataBearingRunCodeInvocation("type", {
        selector: resolvedArgs[0],
        value: resolvedArgs[1],
      });
    }
    case "press": {
      invariant(parsed.args.length === 2, "press arity");
      return buildDataBearingRunCodeInvocation("press", {
        selector: resolvedArgs[0],
        key: resolvedArgs[1],
      });
    }
    case "focus": {
      invariant(parsed.args.length === 1, "focus arity");
      return buildDataBearingRunCodeInvocation("focus", { selector: resolvedArgs[0] });
    }
    case "tab-new":
      invariant(parsed.args.length === 1, "tab-new arity");
      return { args: playwrightArgs("tab-new", resolvedArgs[0]), displayArgs: null };
    case "tab-select":
      invariant(parsed.args.length === 1, "tab-select arity");
      return { args: playwrightArgs("tab-select", resolvedArgs[0]), displayArgs: null };
    case "tab-close":
      invariant(parsed.args.length === 1, "tab-close arity");
      return { args: playwrightArgs("tab-close", resolvedArgs[0]), displayArgs: null };
    case "screen": {
      invariant(parsed.args.length === 1, "screen arity");
      const registeredPath = plan.registries.screenshotPaths[action.executable.screenshotId];
      invariant(
        typeof registeredPath === "string" &&
          action.repositoryMutationPolicy.paths[0] === registeredPath,
        "screenshot path is not registered exactly once"
      );
      return {
        args: playwrightArgs(
          "screenshot",
          "--filename",
          path.relative(browserCwd, path.join(root, registeredPath)).split(path.sep).join("/"),
          "--full-page"
        ),
        displayArgs: null,
      };
    }
    default:
      return null;
  }
}
