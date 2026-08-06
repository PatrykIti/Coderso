import { TONE_CONTENT_FILL_ACTION_CONFIG, TONE_CONTENT_FILL_ACTION_IDS } from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export function inspectToneContentFillRunCodeSource({
  actionId,
  assertNegative,
  assertSourceMutantsRejected,
  compiledSource,
  plan,
}) {
  const toneContentFillConfig = TONE_CONTENT_FILL_ACTION_CONFIG[actionId];
  if (toneContentFillConfig !== undefined) {
    const targetBlockId =
      plan.fixtureBlueprint.screen.blockIds[toneContentFillConfig.targetBlockKey];
    const expectedDraft = plan.fixtureBlueprint.entry[toneContentFillConfig.expectedDraftKey];
    invariant(
      typeof targetBlockId === "string" &&
        typeof expectedDraft === "string" &&
        expectedDraft.length > 0,
      actionId + " tone content fill fixture drift"
    );
    const textboxSelector = registeredSelector(plan, "contentEditable", [
      targetBlockId,
      toneContentFillConfig.fieldLabel,
    ]);
    const targetRootSelector = registeredSelector(plan, "blockRoot", [targetBlockId]);
    const selectionHandleSelector = registeredSelector(plan, "selectBlock", [targetBlockId]);
    const required = [
      "const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;",
      "const textbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
      "const targetRoot = page.locator(" + JSON.stringify(targetRootSelector) + ");",
      "const selectionHandle = page.locator(" + JSON.stringify(selectionHandleSelector) + ");",
      'await textbox.waitFor({ state: "visible", timeout: 30000 });',
      "const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;",
      "const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;",
      "const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;",
      "await textbox.count() !== 1",
      "!(await textbox.isVisible())",
      "!positive(textboxRect)",
      "await targetRoot.count() !== 1",
      "!(await targetRoot.isVisible())",
      "!positive(targetRootRect)",
      'await targetRoot.getAttribute("data-selected") !== "true"',
      "await selectionHandle.count() !== 1",
      "!(await selectionHandle.isVisible())",
      "!positive(selectionHandleRect)",
      'await selectionHandle.getAttribute("aria-pressed") !== "true"',
      "await textbox.fill(" + JSON.stringify(expectedDraft) + ");",
      "const filledText = await textbox.textContent();",
      "const filledTextboxFocused = await textbox.evaluate((node) => node === document.activeElement);",
      "if (filledText !== " + JSON.stringify(expectedDraft) + " || filledTextboxFocused !== true)",
      "await textbox.blur();",
      "const deadline = Date.now() + 30000;",
      "while (Date.now() < deadline)",
      "const settledTextbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
      "const settledTargetRoot = page.locator(" + JSON.stringify(targetRootSelector) + ");",
      "const settledSelectionHandle = page.locator(" +
        JSON.stringify(selectionHandleSelector) +
        ");",
      'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
      "const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;",
      "const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;",
      "const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;",
      "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
      "const settledText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
      "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
      "await settledTextbox.count() === 1",
      "await settledTextbox.isVisible()",
      "positive(settledTextboxRect)",
      "settledText === " + JSON.stringify(expectedDraft),
      "settledTextboxFocused === false",
      "await settledTargetRoot.count() === 1",
      "await settledTargetRoot.isVisible()",
      "positive(settledTargetRootRect)",
      'await settledTargetRoot.getAttribute("data-selected") === "true"',
      "await settledSelectionHandle.count() === 1",
      "await settledSelectionHandle.isVisible()",
      "positive(settledSelectionHandleRect)",
      'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
      "await contentDirty.count() === 1 &&",
      "await contentDirty.isVisible() &&",
      "positive(contentDirtyRect)",
      ") return true;",
      'throw new Error("wf540_tone_fill_dirty_settlement");',
    ];
    const orderedTokens = [
      "await textbox.fill(" + JSON.stringify(expectedDraft) + ");",
      "const filledText = await textbox.textContent();",
      "const filledTextboxFocused = await textbox.evaluate((node) => node === document.activeElement);",
      "if (filledText !== " + JSON.stringify(expectedDraft) + " || filledTextboxFocused !== true)",
      "await textbox.blur();",
      "const deadline = Date.now() + 30000;",
      "const settledTextbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
      'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
      "const settledText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
      "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
      "settledText === " + JSON.stringify(expectedDraft),
      "settledTextboxFocused === false",
      'await settledTargetRoot.getAttribute("data-selected") === "true"',
      'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
      "await contentDirty.count() === 1 &&",
      "await contentDirty.isVisible() &&",
      "positive(contentDirtyRect)",
      ") return true;",
    ];
    const validates = (source) => {
      if (
        !required.every((token) => source.includes(token)) ||
        source.includes("const locator=page.locator") ||
        source.split(".fill(").length - 1 !== 1 ||
        source.split(".blur(").length - 1 !== 1
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
    invariant(validates(compiledSource), actionId + " tone content fill source drift");
    assertSourceMutantsRejected(
      compiledSource,
      validates,
      required,
      actionId + " tone content fill settlement"
    );
    for (let index = 1; index < orderedTokens.length; index += 1) {
      const left = orderedTokens[index - 1];
      const right = orderedTokens[index];
      const marker = "__WF540_TONE_FILL_ORDER_MUTANT_" + index + "__";
      const mutant = compiledSource
        .replace(left, marker)
        .replace(right, left)
        .replace(marker, right);
      assertNegative(!validates(mutant), actionId + " tone content fill order mutant " + index);
    }
    return actionId;
  }
  return null;
}

export function assertToneContentFillRunCodeSourceOwnership({ observedToneContentFillActionIds }) {
  invariant(
    deepEqualJson(observedToneContentFillActionIds, TONE_CONTENT_FILL_ACTION_IDS),
    "tone content-fill specialization ownership drift"
  );
}
