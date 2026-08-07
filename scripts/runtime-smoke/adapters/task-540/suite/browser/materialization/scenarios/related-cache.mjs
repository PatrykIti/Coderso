import { deepFreezeExact, invariant } from "../../../shared/foundation.mjs";
import { registeredSelector, resolveExactRef } from "../reference-resolution.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const RELATED_CACHE_BROWSER_ACTION_IDS = deepFreezeExact([
  "rc-005-failure-route-setup",
  "rc-006-entry-link",
  "rc-007-failure-route-hit",
  "rc-008-failure-visible",
  "rc-009-failure-shot",
  "rc-010-failure-unroute",
  "rc-011-visible-retry",
  "rc-012-retry-proof",
  "rc-012a-records-remount",
  "rc-012b-entry-remount",
  "rc-012c-picker-warm-proof",
  "rc-013-select-note",
  "rc-014-unrelated-fill",
  "rc-015-tone-open",
  "rc-016-tone-muted",
  "rc-017-unrelated-before",
  "rc-017a-pre-route-a-baseline",
  "rc-017b-auth-rate-window-barrier",
  "rc-018-refresh-route-setup",
  "rc-019-related-tab-new",
  "rc-020-related-tab-edit",
  "rc-021-related-tab-save",
  "rc-021a-related-tab-save-settled",
  "rc-022-related-tab-origin",
  "rc-023-refresh-route-hit",
  "rc-024-same-target",
  "rc-025-clear-a1",
  "rc-026-clear-a2",
  "rc-027-target-empty",
  "rc-028-select-b1",
  "rc-029-select-b2",
  "rc-030-only-b",
  "rc-031-draft-proof",
  "rc-032-diff-proof",
  "rc-033-stale-shot",
  "rc-034-refresh-release",
  "rc-035-stale-proof",
  "rc-036-refresh-unroute",
  "rc-037-final-shot",
  "rc-037b-exit-discard",
  "rc-037c-exit-proof",
  "rc-038-log-agg-errors",
  "rc-039-log-pages-errors",
  "rc-040-log-agg-warnings",
  "rc-041-log-pages-warnings",
  "rc-042-log-agg-page-errors",
  "rc-043-log-pages-page-errors",
  "rc-044-close-second-tab",
  "rc-045-origin-proof",
]);

invariant(
  RELATED_CACHE_BROWSER_ACTION_IDS.length === 49 &&
    new Set(RELATED_CACHE_BROWSER_ACTION_IDS).size === 49,
  "related-cache browser action registry drift"
);

export function isRelatedCacheBrowserCandidate(action) {
  return RELATED_CACHE_BROWSER_ACTION_IDS.includes(action?.id);
}

function assertRelatedCacheBrowserAction(action) {
  invariant(
    action?.scenario === "related-retry-cache" &&
      RELATED_CACHE_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " related-cache browser action is not registered"
  );
}

export function createRelatedCacheScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
  runCode,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function" &&
      typeof runCode === "function",
    "related-cache scenario dependencies are invalid"
  );

  function buildRelatedCacheBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertRelatedCacheBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered related-cache browser execution drift"
    );
    const parsed = executionSpec.builderAst;
    const resolvedArgs = executionSpec.refs.map((ref, index) =>
      resolveExactRef(ref, refContext, action.id + " executable Ref[" + index + "]")
    );

    if (action.id === "rc-011-visible-retry") {
      invariant(parsed.args.length === 1, "click arity");
      const selector = JSON.stringify(resolvedArgs[0]);
      const readPath =
        "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedFailure.slug + "/entries";
      // The related-failure alert must be scoped, and the reason is narrow: this route mounts a
      // SECOND, unrelated [role="alert"] that nothing in this scenario ever removes. The retry
      // Screen declares no writable binding, so `supportsDedicatedEditor` is false and
      // CustomScreenEntryEditorLayout permanently renders a "Workspace upgrade required" Alert --
      // and the shared shadcn Alert primitive stamps role="alert" on every instance. A page-wide
      // absence check therefore counts 2 before the click and 1 after a fully successful retry.
      // That extra alert is the ONLY obstacle: the scenario's own subject is not implicated,
      // because the related-list surface is rendered from the same relatedEntries in both the
      // canvas and the preview branch and survives regardless. Measured against the frozen retry
      // fixture with the real engine: page-wide 2 -> 1, scoped 1 -> 0. rc-012 owns the settled
      // proof and scopes it the same way. assertBrowserSourceWidgetAbsenceScope() in
      // The legacy workflow self-test enforces the class over every
      // emitted source, so reverting this line fails the executor self-test.
      const alertSelector = JSON.stringify(registeredSelector(plan, "relatedAlert"));
      const expectedRowId = captures.get("related-entry-failure1.id");
      const rootSelector =
        '[data-screen-block-id="' + plan.fixtureBlueprint.retryScreen.relatedListBlockId + '"]';
      return {
        args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_related_retry_target_count");
            const pathname = (href) => { const scheme = href.indexOf("://"); const start = href.indexOf("/", scheme === -1 ? 0 : scheme + 3); return (start === -1 ? "/" : href.slice(start)).split(/[?#]/u, 1)[0]; };
            const responsePromise = page.waitForResponse((response) => response.request().method() === "GET" && pathname(response.url()) === ${JSON.stringify(readPath)}, { timeout: 270000 });
            await locator.click();
            const response = await responsePromise;
            if (!response.ok()) throw new Error("wf540_related_retry_response");
            const root = page.locator(${JSON.stringify(rootSelector)});
            const row = root.locator(${JSON.stringify('[data-screen-related-entry="' + expectedRowId + '"]')});
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
              const rect = await row.count() === 1 ? await row.boundingBox() : null;
              const retryAbsent = await page.locator(${selector}).count() === 0;
              const alertAbsent = await page.locator(${alertSelector}).count() === 0;
              if (rect && rect.width > 0 && rect.height > 0 && retryAbsent && alertAbsent) return true;
              await page.waitForTimeout(25);
            }
            throw new Error("wf540_related_retry_settlement");
          }`),
        displayArgs: null,
      };
    }

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      const expectedIndex =
        action.id === "rc-009-failure-shot"
          ? 8
          : action.id === "rc-033-stale-shot"
            ? 9
            : action.id === "rc-037-final-shot"
              ? 10
              : null;
      invariant(
        expectedIndex !== null &&
          ownership.index === expectedIndex &&
          ownership.scenario === "related-retry-cache",
        action.id + " related-cache screenshot owner drift"
      );
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
      "related-cache browser executable is not implemented: " + action.id
    );
    return invocation;
  }

  function relatedCacheOperationForAction(action) {
    return action.id === "rc-011-visible-retry" ? "real-retry" : null;
  }

  function relatedCacheRouteKeyForAction(action) {
    return action.id === "rc-011-visible-retry" ? "related-first-failure" : null;
  }

  return deepFreezeExact({
    buildRelatedCacheBrowserInvocation,
    relatedCacheOperationForAction,
    relatedCacheRouteKeyForAction,
  });
}
