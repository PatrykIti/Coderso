import {
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG,
  DIRTY_NAVIGATION_REQUEST_ACTION_IDS,
  resolveDirtyNavigationTargetTimeline,
} from "../config.mjs";
import { invariant } from "../foundation.mjs";
import { expandRegisteredPath, registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export function inspectDirtyNavigationRunCodeSource({
  actionId,
  assertNegative,
  assertSourceMutantsRejected,
  compiledSource,
  expectedDirtyNavigationRequestActionConfig,
  plan,
  sourceCaptures,
}) {
  const dirtyNavigationConfig = DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG[actionId];
  if (dirtyNavigationConfig !== undefined) {
    const expectedDirtyNavigationConfig = expectedDirtyNavigationRequestActionConfig[actionId];
    invariant(
      expectedDirtyNavigationConfig !== undefined &&
        deepEqualJson(dirtyNavigationConfig, expectedDirtyNavigationConfig),
      actionId + " dirty-navigation literal mapping drift"
    );
    const expectedSelector = registeredSelector(plan, "recordsLink", [
      sourceCaptures.get("screen.id"),
    ]);
    const expectedCurrentUrl = expandRegisteredPath(
      plan,
      expectedDirtyNavigationConfig.realm,
      sourceCaptures
    );
    const namedDialogLocatorToken =
      'const dialog = page.getByRole("dialog", { name: ' +
      JSON.stringify(expectedDirtyNavigationConfig.dialogTitle) +
      ", exact: true });";
    const dialogMultiplicityFailureClassToken =
      "const dialogMultiplicityFailureClass = " +
      JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9]) +
      ";";
    const latestTargetFailureAssignmentBlock =
      "\n              latestTargetFailureClass = pollTargetFailureClass;" +
      "\n              await page.waitForTimeout(25);";
    const required = [
      "const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;",
      "const fail = (failureClass) => ({ failureClass, settled: false });",
      namedDialogLocatorToken,
      dialogMultiplicityFailureClassToken,
      "const links = page.locator(" + JSON.stringify(expectedSelector) + ");",
      "let visibleLinkIndex = -1;",
      "let latestTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
        ";",
      "const targetDeadline = Date.now() + 30000;",
      "while (Date.now() < targetDeadline)",
      "let pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
        ";",
      "const count = await links.count();",
      "if (count > 8) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]) +
        ");",
      "let nextVisibleLinkIndex = -1;",
      "let visibleCount = 0;",
      "for (let index = 0; index < count; index += 1)",
      "const candidate = links.nth(index);",
      "const rect = await candidate.boundingBox();",
      "if (await candidate.isVisible() && positive(rect))",
      "nextVisibleLinkIndex = index;",
      "visibleCount += 1;",
      "if (visibleCount > 1) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[1]) +
        ");",
      "if (visibleCount === 1)",
      "const candidate = links.nth(nextVisibleLinkIndex);",
      "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
      "const candidateStillVisible = await candidate.isVisible();",
      "if (candidateStillVisible && positive(rect))",
      'const body = page.locator("body");',
      "const bodyInteraction = await body.count() === 1",
      "computedPointerEvents: getComputedStyle(node).pointerEvents,",
      "inlinePointerEvents: node.style.pointerEvents,",
      'scrollLocked: node.hasAttribute("data-scroll-locked"),',
      "if (bodyInteraction !== null)",
      "if (bodyInteraction.scrollLocked === true)",
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[4]) +
        ";",
      'else if (bodyInteraction.inlinePointerEvents === "none")',
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5]) +
        ";",
      'else if (bodyInteraction.computedPointerEvents === "none")',
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[6]) +
        ";",
      "const receivesPointerAtCenter = await candidate.evaluate((node, box) =>",
      "const receiver = document.elementFromPoint(",
      "box.x + box.width / 2,",
      "box.y + box.height / 2",
      "receiver !== null && (receiver === node || node.contains(receiver))",
      "if (receivesPointerAtCenter)",
      "visibleLinkIndex = nextVisibleLinkIndex;",
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7]) +
        ";",
      latestTargetFailureAssignmentBlock,
      "if (visibleLinkIndex < 0) return fail(latestTargetFailureClass);",
      "const urlBefore = page.url();",
      "const navigationCountBefore = page.__wf540ReadNavigationCount();",
      "if (urlBefore !== " +
        JSON.stringify(expectedCurrentUrl) +
        ") return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[3]) +
        ");",
      "if (await dialog.count() !== 0) return fail(dialogMultiplicityFailureClass);",
      "let clickFailed = false;",
      "try {",
      "await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });",
      "} catch {",
      "clickFailed = true;",
      "let namedDialogObserved = false;",
      "const dialogDeadline = Date.now() + 30000;",
      "while (Date.now() < dialogDeadline)",
      'const heading = dialog.getByRole("heading", { name: ' +
        JSON.stringify(expectedDirtyNavigationConfig.dialogTitle) +
        ", exact: true });",
      "const description = dialog.getByText(" +
        JSON.stringify(expectedDirtyNavigationConfig.dialogDescription) +
        ", { exact: true });",
      'const keepEditing = dialog.getByRole("button", { name: "Keep editing", exact: true });',
      'const discard = dialog.getByRole("button", { name: "Discard and continue", exact: true });',
      "const dialogCount = await dialog.count();",
      "const headingCount = await heading.count();",
      "const descriptionCount = await description.count();",
      "const keepEditingCount = await keepEditing.count();",
      "const discardCount = await discard.count();",
      "return fail(dialogMultiplicityFailureClass);",
      "if (dialogCount === 1) namedDialogObserved = true;",
      "const dialogRect = dialogCount === 1 ? await dialog.boundingBox() : null;",
      "const headingRect = headingCount === 1 ? await heading.boundingBox() : null;",
      "const descriptionRect = descriptionCount === 1 ? await description.boundingBox() : null;",
      "const keepEditingRect = keepEditingCount === 1 ? await keepEditing.boundingBox() : null;",
      "const discardRect = discardCount === 1 ? await discard.boundingBox() : null;",
      "const urlStable = page.url() === urlBefore;",
      "const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;",
      "if (!urlStable || !navigationStable) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[10]) +
        ");",
      "dialogCount === 1 &&",
      "await dialog.isVisible() &&",
      "positive(dialogRect) &&",
      "headingCount === 1 &&",
      "await heading.isVisible() &&",
      "positive(headingRect) &&",
      "descriptionCount === 1 &&",
      "await description.isVisible() &&",
      "positive(descriptionRect) &&",
      "keepEditingCount === 1 &&",
      "await keepEditing.isVisible() &&",
      "positive(keepEditingRect) &&",
      "discardCount === 1 &&",
      "await discard.isVisible() &&",
      "positive(discardRect)",
      ") return true;",
      "if (clickFailed && !namedDialogObserved) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8]) +
        ");",
      "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[11]) + ");",
      "if (result === true) return { ok: true };",
      "const failureClasses = " + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES) + ";",
      'keys.length === 2 && keys.includes("failureClass") && keys.includes("settled")',
      "result.settled === false",
      "failureClasses.includes(result.failureClass)",
      "return result;",
      'throw new Error("wf540_dirty_navigation_result");',
    ];
    const orderedTokens = [
      "const fail = (failureClass) =>",
      namedDialogLocatorToken,
      dialogMultiplicityFailureClassToken,
      "const links = page.locator(",
      "let visibleLinkIndex = -1;",
      "let latestTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
        ";",
      "const targetDeadline = Date.now() + 30000;",
      "let pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
        ";",
      "const count = await links.count();",
      "if (count > 8) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]) +
        ");",
      "let visibleCount = 0;",
      "if (await candidate.isVisible() && positive(rect))",
      "if (visibleCount > 1) return fail(" +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[1]) +
        ");",
      "if (visibleCount === 1)",
      "const candidate = links.nth(nextVisibleLinkIndex);",
      "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
      "const candidateStillVisible = await candidate.isVisible();",
      "if (candidateStillVisible && positive(rect))",
      'const body = page.locator("body");',
      "const bodyInteraction = await body.count() === 1",
      "if (bodyInteraction !== null)",
      "const receivesPointerAtCenter = await candidate.evaluate(",
      "const receiver = document.elementFromPoint(",
      "if (receivesPointerAtCenter)",
      "visibleLinkIndex = nextVisibleLinkIndex;",
      'else if (bodyInteraction.inlinePointerEvents === "none")',
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5]) +
        ";",
      'else if (bodyInteraction.computedPointerEvents === "none")',
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[6]) +
        ";",
      "if (bodyInteraction.scrollLocked === true)",
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[4]) +
        ";",
      "pollTargetFailureClass = " +
        JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7]) +
        ";",
      "latestTargetFailureClass = pollTargetFailureClass;",
      "if (visibleLinkIndex < 0) return fail(latestTargetFailureClass);",
      "const urlBefore = page.url();",
      "const navigationCountBefore = page.__wf540ReadNavigationCount();",
      "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[3]) + ");",
      "if (await dialog.count() !== 0) return fail(dialogMultiplicityFailureClass);",
      "let clickFailed = false;",
      "await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });",
      "clickFailed = true;",
      "let namedDialogObserved = false;",
      "const dialogDeadline = Date.now() + 30000;",
      "const heading = dialog.getByRole(",
      "const description = dialog.getByText(",
      "const keepEditing = dialog.getByRole(",
      "const discard = dialog.getByRole(",
      "return fail(dialogMultiplicityFailureClass);",
      "if (dialogCount === 1) namedDialogObserved = true;",
      "const urlStable = page.url() === urlBefore;",
      "const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;",
      "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[10]) + ");",
      "dialogCount === 1 &&",
      "positive(discardRect)",
      ") return true;",
      "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8]) + ");",
      "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[11]) + ");",
      "if (result === true) return { ok: true };",
      "const failureClasses = ",
      "result.settled === false",
      "return result;",
    ];
    const validates = (source) => {
      if (
        !required.every((token) => source.includes(token)) ||
        source.includes("while (Date.now() < deadline && await locator.count() !== 1)") ||
        source.includes("if (count !== 1)") ||
        source.includes('const dialog = page.getByRole("dialog");') ||
        source.includes("targetBlocker") ||
        source.includes("pointerUnlocked") ||
        source.includes('"pointer_locked"') ||
        source.split(latestTargetFailureAssignmentBlock).length - 1 !== 1 ||
        source.split(".click({ timeout: 30000, noWaitAfter: true });").length - 1 !== 1 ||
        source.split(".scrollIntoViewIfNeeded({ timeout: 30000 });").length - 1 !== 1 ||
        source.includes("force: true") ||
        source.split("return fail(").length - 1 !== 9 ||
        source.split("} catch {").length - 1 !== 1 ||
        source.includes("catch (") ||
        source.includes("error.message") ||
        source.includes("String(error") ||
        !DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES.every(
          (failureClass) =>
            source.split(JSON.stringify(failureClass)).length - 1 ===
            (failureClass === "target_missing" ? 3 : 2)
        )
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
    invariant(validates(compiledSource), actionId + " dirty-navigation source drift");
    assertSourceMutantsRejected(
      compiledSource,
      validates,
      required,
      actionId + " dirty-navigation settlement"
    );
    for (const [label, replacement] of [
      ["global dialog", 'const dialog = page.getByRole("dialog");'],
      ["inexact dialog", namedDialogLocatorToken.replace("exact: true", "exact: false")],
      [
        "wrong-name dialog",
        namedDialogLocatorToken.replace(
          JSON.stringify(expectedDirtyNavigationConfig.dialogTitle),
          JSON.stringify("Wrong dirty-navigation dialog")
        ),
      ],
    ]) {
      assertNegative(
        !validates(compiledSource.replace(namedDialogLocatorToken, replacement)),
        actionId + " dirty-navigation " + label + " mutant"
      );
    }
    const stickyBlockerMutant = compiledSource.replace(
      latestTargetFailureAssignmentBlock,
      "\n              if (visibleCount === 1) latestTargetFailureClass = pollTargetFailureClass;" +
        "\n              await page.waitForTimeout(25);"
    );
    assertNegative(
      !validates(stickyBlockerMutant),
      actionId + " dirty-navigation sticky blocker mutant"
    );
    for (let index = 1; index < orderedTokens.length; index += 1) {
      const left = orderedTokens[index - 1];
      const right = orderedTokens[index];
      const marker = "__WF540_DIRTY_NAV_ORDER_MUTANT_" + index + "__";
      const mutant = compiledSource
        .replace(left, marker)
        .replace(right, left)
        .replace(marker, right);
      assertNegative(!validates(mutant), actionId + " dirty-navigation order mutant " + index);
    }
    return actionId;
  }
  return null;
}

export function assertDirtyNavigationRunCodeSourceOwnership({
  expectedDirtyNavigationRequestActionConfig,
  observedDirtyNavigationRequestActionIds,
}) {
  invariant(
    deepEqualJson(
      observedDirtyNavigationRequestActionIds,
      Object.keys(expectedDirtyNavigationRequestActionConfig)
    ),
    "dirty-navigation specialization ownership drift"
  );
  for (const actionId of DIRTY_NAVIGATION_REQUEST_ACTION_IDS) {
    invariant(
      resolveDirtyNavigationTargetTimeline(["scroll_locked", "target_missing"]) ===
        "target_missing" &&
        resolveDirtyNavigationTargetTimeline(["scroll_locked", "target_intercepted"]) ===
          "target_intercepted" &&
        resolveDirtyNavigationTargetTimeline(["target_intercepted", "inline_pointer_locked"]) ===
          "inline_pointer_locked" &&
        resolveDirtyNavigationTargetTimeline(["computed_pointer_locked", "hittable"]) === "click",
      actionId + " dirty-navigation latest-poll timeline drift"
    );
  }
}
