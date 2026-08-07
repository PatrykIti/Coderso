import {
  DATABASE_OPERATION_TIMEOUT_MS,
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG,
  DIRTY_NAVIGATION_REQUEST_ACTION_IDS,
  unitFailureFrameClassesForAction,
  unitFailureFrameResultErrorTagForAction,
} from "../browser-contract.mjs";
import { deepFreezeExact, invariant } from "../../../shared/foundation.mjs";
import {
  expandRegisteredPath,
  registeredSelector,
  resolveExactRef,
} from "../reference-resolution.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const DIRTY_GUARD_BROWSER_ACTION_IDS = deepFreezeExact([
  "dg-003-builder",
  "dg-004-light-toggle",
  "dg-005-light-proof",
  "dg-006-resize",
  "dg-007-dirty-before",
  "dg-008-dirty-click",
  "dg-009-dirty-capture",
  "dg-010-dirty-fill",
  "dg-011-builder-before-cancel",
  "dg-012-builder-nav-cancel",
  "dg-013-builder-keep",
  "dg-014-builder-cancel-proof",
  "dg-015-builder-nav-confirm",
  "dg-016-builder-discard",
  "dg-017-builder-confirm-proof",
  "dg-018-entry-link",
  "dg-019-select-headline",
  "dg-020-headline-fill",
  "dg-021-tone-open",
  "dg-022-tone-muted",
  "dg-023-entry-before-cancel",
  "dg-024-entry-nav-cancel",
  "dg-025-entry-keep",
  "dg-026-entry-cancel-bytes",
  "dg-027-entry-cancel-url",
  "dg-028-save-route-setup",
  "dg-029-save-click",
  "dg-030-save-route-hit",
  "dg-030a-save-ui-settled",
  "dg-031-error-drafts",
  "dg-032-beforeunload",
  "dg-033-failure-shot",
  "dg-034-save-unroute",
  "dg-035-real-retry",
  "dg-036-retry-proof",
  "dg-037-entry-nav-confirm",
  "dg-038-entry-discard",
  "dg-039-entry-confirm-proof",
  "dg-040-dark-toggle",
  "dg-041-dark-proof",
  "dg-042-final-shot",
  "dg-043-log-agg-errors",
  "dg-044-log-pages-errors",
  "dg-045-log-agg-warnings",
  "dg-046-log-pages-warnings",
  "dg-047-log-agg-page-errors",
  "dg-048-log-pages-page-errors",
]);

const SHARED_DIRTY_NAVIGATION_ACTION_IDS = deepFreezeExact(["rc-037a-exit-navigation"]);

export function isDirtyGuardsBrowserCandidate(action) {
  return (
    action?.scenario === "dirty-guards" ||
    (typeof action?.id === "string" && action.id.startsWith("dg-")) ||
    SHARED_DIRTY_NAVIGATION_ACTION_IDS.includes(action?.id)
  );
}

function assertDirtyGuardsBrowserAction(action) {
  const isDirtyGuard = action?.scenario === "dirty-guards" || action?.id?.startsWith("dg-");
  if (isDirtyGuard) {
    invariant(
      action.scenario === "dirty-guards" &&
        DIRTY_GUARD_BROWSER_ACTION_IDS.includes(action.id) &&
        action.executable.type !== "runtime-operation",
      String(action?.id) + " dirty-guards browser action is not registered"
    );
    return;
  }
  invariant(
    action?.scenario === "related-retry-cache" &&
      SHARED_DIRTY_NAVIGATION_ACTION_IDS.includes(action.id) &&
      DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(action.id),
    String(action?.id) + " shared dirty-navigation action is not registered"
  );
}

// The one `unit` wrapper that lets a browser-computed failure verdict survive transport.
// `true` still becomes the unit contract's success literal; a two-key
// { failureClass, settled: false } frame carrying a REGISTERED class is returned verbatim
// so the executor can classify it; anything else throws, so an unexpected object can never
// be read as success. The emitted bytes are frozen: the dirty-navigation self-test pins
// this text, so keep the template's literal indentation exactly as written.
export function buildFailureFramePreservingUnitSource(source, failureClasses, resultErrorTag) {
  invariant(typeof source === "string" && source.length > 0, "unit source is absent");
  invariant(
    Array.isArray(failureClasses) &&
      failureClasses.length > 0 &&
      failureClasses.every((entry) => typeof entry === "string" && entry.length > 0),
    "unit failure classes are invalid"
  );
  invariant(
    typeof resultErrorTag === "string" && /^[a-z_]+$/u.test(resultErrorTag),
    "unit result error tag is invalid"
  );
  return `(async (page) => {
          const result = await (${source})(page);
          if (result === true) return { ok: true };
          const failureClasses = ${JSON.stringify(failureClasses)};
          const keys = result !== null && typeof result === "object" && !Array.isArray(result) && Object.getPrototypeOf(result) === Object.prototype ? Object.keys(result) : [];
          if (keys.length === 2 && keys.includes("failureClass") && keys.includes("settled") && result.settled === false && failureClasses.includes(result.failureClass)) return result;
          throw new Error("wf540_${resultErrorTag}_result");
        })`;
}

export function buildDiscardingUnitSource(source) {
  invariant(typeof source === "string" && source.length > 0, "unit source is absent");
  return `(async (page) => { await (${source})(page); return { ok: true }; })`;
}

export function createDirtyGuardsScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
  runCode,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function" &&
      typeof runCode === "function",
    "dirty-guards scenario dependencies are invalid"
  );

  function buildDirtyGuardsBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertDirtyGuardsBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered dirty-guards browser execution drift"
    );
    const parsed = executionSpec.builderAst;
    const resolvedArgs = executionSpec.refs.map((ref, index) =>
      resolveExactRef(ref, refContext, action.id + " executable Ref[" + index + "]")
    );

    if (action.id === "dg-003-builder") {
      invariant(parsed.args.length === 1, "goto arity");
      invariant(
        resolvedArgs[0] === expandRegisteredPath(plan, "builder", captures),
        "dg-003 builder path drift"
      );
      const url = JSON.stringify(resolvedArgs[0]);
      const canvas = JSON.stringify(registeredSelector(plan, "canvas"));
      return {
        args: runCode(`async (page) => {
              const dirtyIndicator = page.getByText("Unsaved changes", { exact: true });
              await dirtyIndicator.waitFor({ state: "visible", timeout: 30000 });
              if (await dirtyIndicator.count() !== 1) throw new Error("wf540_dg003_dirty_count");
              const retainedDialogListeners = page.listeners("dialog");
              if (retainedDialogListeners.length !== 1) throw new Error("wf540_dg003_listener_count");
              for (const listener of retainedDialogListeners) page.off("dialog", listener);
              const dialogTypes = [];
              const dialogSettlements = [];
              const handleDialog = (dialog) => {
                const type = dialog.type();
                dialogTypes.push(type);
                dialogSettlements.push(type === "beforeunload" ? dialog.accept() : dialog.dismiss());
              };
              page.on("dialog", handleDialog);
              let navigationFailed = false;
              let dialogSettlementFailed = false;
              try {
                await page.goto(${url}, { timeout: ${DATABASE_OPERATION_TIMEOUT_MS} });
              } catch {
                navigationFailed = true;
              } finally {
                const settlements = await Promise.allSettled(dialogSettlements);
                dialogSettlementFailed = settlements.some(({ status }) => status !== "fulfilled");
                page.off("dialog", handleDialog);
                for (const listener of retainedDialogListeners) page.on("dialog", listener);
              }
              const restoredDialogListeners = page.listeners("dialog");
              if (
                restoredDialogListeners.length !== retainedDialogListeners.length ||
                restoredDialogListeners.some((listener, index) => listener !== retainedDialogListeners[index])
              ) throw new Error("wf540_dg003_listener_restore");
              if (navigationFailed) throw new Error("wf540_dg003_navigation");
              if (dialogSettlementFailed) throw new Error("wf540_dg003_dialog_settlement");
              if (dialogTypes.length !== 1 || dialogTypes[0] !== "beforeunload") {
                throw new Error("wf540_dg003_beforeunload_cardinality");
              }
              if (page.url() !== ${url}) throw new Error("wf540_dg003_builder_url");
              const marker = page.locator(${canvas});
              await marker.waitFor({ state: "visible", timeout: 90000 });
              if (await marker.count() !== 1) throw new Error("wf540_dg003_builder_marker_count");
              return true;
            }`),
        displayArgs: null,
      };
    }

    if (action.id === "dg-035-real-retry") {
      invariant(parsed.args.length === 1, "click arity");
      const selector = JSON.stringify(resolvedArgs[0]);
      const writePath =
        "/admin/api/content/" +
        encodeURIComponent(plan.fixtureBlueprint.contentTypes.editable.slug) +
        "/entries/" +
        encodeURIComponent(captures.get("entry.id"));
      return {
        args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_entry_retry_target_count");
            const pathname = (href) => { const scheme = href.indexOf("://"); const start = href.indexOf("/", scheme === -1 ? 0 : scheme + 3); return (start === -1 ? "/" : href.slice(start)).split(/[?#]/u, 1)[0]; };
            const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && pathname(response.url()) === ${JSON.stringify(writePath)}, { timeout: 270000 });
            await locator.click();
            const response = await responsePromise;
            if (!response.ok()) throw new Error("wf540_entry_retry_response");
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
              const enabled = await locator.count() === 1 && await locator.isEnabled() && (await locator.textContent())?.trim() === "Save";
              const savingAbsent = await page.getByText("Saving...", { exact: true }).count() === 0;
              const contentClean = await page.getByText("Unsaved changes", { exact: true }).count() === 0;
              const presentationDirty = await page.getByText("Unsaved presentation", { exact: true }).count() === 1;
              if (enabled && savingAbsent && contentClean && presentationDirty) return true;
              await page.waitForTimeout(25);
            }
            throw new Error("wf540_entry_retry_settlement");
          }`),
        displayArgs: null,
      };
    }

    if (DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(action.id)) {
      invariant(parsed.args.length === 1, "click arity");
      const selector = JSON.stringify(resolvedArgs[0]);
      const dirtyNavigationConfig = DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG[action.id];
      if (dirtyNavigationConfig !== undefined) {
        const expectedCurrentUrl = JSON.stringify(
          expandRegisteredPath(plan, dirtyNavigationConfig.realm, captures)
        );
        const dialogDescription = JSON.stringify(dirtyNavigationConfig.dialogDescription);
        const dialogTitle = JSON.stringify(dirtyNavigationConfig.dialogTitle);
        return {
          args: runCode(`async (page) => {
            const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
            const fail = (failureClass) => ({ failureClass, settled: false });
            const dialog = page.getByRole("dialog", { name: ${dialogTitle}, exact: true });
            const dialogMultiplicityFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9])};
            const links = page.locator(${selector});
            let visibleLinkIndex = -1;
            let latestTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2])};
            const targetDeadline = Date.now() + 30000;
            while (Date.now() < targetDeadline) {
              let pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2])};
              const count = await links.count();
              if (count > 8) return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0])});
              let nextVisibleLinkIndex = -1;
              let visibleCount = 0;
              for (let index = 0; index < count; index += 1) {
                const candidate = links.nth(index);
                const rect = await candidate.boundingBox();
                if (await candidate.isVisible() && positive(rect)) {
                  nextVisibleLinkIndex = index;
                  visibleCount += 1;
                }
              }
              if (visibleCount > 1) return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[1])});
              if (visibleCount === 1) {
                const candidate = links.nth(nextVisibleLinkIndex);
                await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });
                const rect = await candidate.boundingBox();
                const candidateStillVisible = await candidate.isVisible();
                if (candidateStillVisible && positive(rect)) {
                  const body = page.locator("body");
                  const bodyInteraction = await body.count() === 1
                    ? await body.evaluate((node) => ({
                        computedPointerEvents: getComputedStyle(node).pointerEvents,
                        inlinePointerEvents: node.style.pointerEvents,
                        scrollLocked: node.hasAttribute("data-scroll-locked"),
                      }))
                    : null;
                  if (bodyInteraction !== null) {
                    const receivesPointerAtCenter = await candidate.evaluate((node, box) => {
                      const receiver = document.elementFromPoint(
                        box.x + box.width / 2,
                        box.y + box.height / 2
                      );
                      return receiver !== null && (receiver === node || node.contains(receiver));
                    }, rect);
                    if (receivesPointerAtCenter) {
                      visibleLinkIndex = nextVisibleLinkIndex;
                      break;
                    } else if (bodyInteraction.inlinePointerEvents === "none") {
                      pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5])};
                    } else if (bodyInteraction.computedPointerEvents === "none") {
                      pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[6])};
                    } else if (bodyInteraction.scrollLocked === true) {
                      pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[4])};
                    } else {
                      pollTargetFailureClass = ${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7])};
                    }
                  }
                }
              }
              latestTargetFailureClass = pollTargetFailureClass;
              await page.waitForTimeout(25);
            }
            if (visibleLinkIndex < 0) return fail(latestTargetFailureClass);
            const urlBefore = page.url();
            const navigationCountBefore = page.__wf540ReadNavigationCount();
            if (urlBefore !== ${expectedCurrentUrl}) return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[3])});
            if (await dialog.count() !== 0) return fail(dialogMultiplicityFailureClass);
            let clickFailed = false;
            try {
              await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });
            } catch {
              clickFailed = true;
            }
            let namedDialogObserved = false;
            const dialogDeadline = Date.now() + 30000;
            while (Date.now() < dialogDeadline) {
              const heading = dialog.getByRole("heading", { name: ${dialogTitle}, exact: true });
              const description = dialog.getByText(${dialogDescription}, { exact: true });
              const keepEditing = dialog.getByRole("button", { name: "Keep editing", exact: true });
              const discard = dialog.getByRole("button", { name: "Discard and continue", exact: true });
              const dialogCount = await dialog.count();
              const headingCount = await heading.count();
              const descriptionCount = await description.count();
              const keepEditingCount = await keepEditing.count();
              const discardCount = await discard.count();
              if (dialogCount > 1 || headingCount > 1 || descriptionCount > 1 || keepEditingCount > 1 || discardCount > 1) {
                return fail(dialogMultiplicityFailureClass);
              }
              if (dialogCount === 1) namedDialogObserved = true;
              const dialogRect = dialogCount === 1 ? await dialog.boundingBox() : null;
              const headingRect = headingCount === 1 ? await heading.boundingBox() : null;
              const descriptionRect = descriptionCount === 1 ? await description.boundingBox() : null;
              const keepEditingRect = keepEditingCount === 1 ? await keepEditing.boundingBox() : null;
              const discardRect = discardCount === 1 ? await discard.boundingBox() : null;
              const urlStable = page.url() === urlBefore;
              const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;
              if (!urlStable || !navigationStable) return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[10])});
              if (
                dialogCount === 1 &&
                await dialog.isVisible() &&
                positive(dialogRect) &&
                headingCount === 1 &&
                await heading.isVisible() &&
                positive(headingRect) &&
                descriptionCount === 1 &&
                await description.isVisible() &&
                positive(descriptionRect) &&
                keepEditingCount === 1 &&
                await keepEditing.isVisible() &&
                positive(keepEditingRect) &&
                discardCount === 1 &&
                await discard.isVisible() &&
                positive(discardRect)
              ) return true;
              await page.waitForTimeout(25);
            }
            if (clickFailed && !namedDialogObserved) return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8])});
            return fail(${JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[11])});
          }`),
          displayArgs: null,
        };
      }
      invariant(false, action.id + " dirty-navigation invocation is absent");
    }

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      invariant(ownership.scenario === "dirty-guards", action.id + " dirty screenshot owner drift");
    }

    const invocation =
      buildSharedSimpleBrowserInvocation(
        action,
        executionSpec,
        plan,
        captures,
        root,
        browserCwd,
        refContext
      ) ??
      buildSharedAdvancedBrowserInvocation(
        action,
        executionSpec,
        plan,
        captures,
        root,
        refContext,
        runtimeConfig
      );
    invariant(
      invocation !== null,
      "dirty-guards browser executable is not implemented: " + action.id
    );
    return invocation;
  }

  function normalizeDirtyGuardsUnitSource(action, source) {
    assertDirtyGuardsBrowserAction(action);
    invariant(typeof source === "string", action.id + " dirty-guards unit source is absent");
    const failureClasses = unitFailureFrameClassesForAction(action.id);
    if (failureClasses === null) return buildDiscardingUnitSource(source);
    return buildFailureFramePreservingUnitSource(
      source,
      failureClasses,
      unitFailureFrameResultErrorTagForAction(action.id)
    );
  }

  function dirtyGuardsOperationForAction(action) {
    return action.id === "dg-035-real-retry" ? "real-retry" : null;
  }

  function dirtyGuardsRouteKeyForAction(action) {
    return action.id === "dg-035-real-retry" ? "entry-save-failure" : null;
  }

  return deepFreezeExact({
    buildDirtyGuardsBrowserInvocation,
    dirtyGuardsOperationForAction,
    dirtyGuardsRouteKeyForAction,
    normalizeDirtyGuardsUnitSource,
  });
}
