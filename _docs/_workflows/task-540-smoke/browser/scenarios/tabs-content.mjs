import { deepFreezeExact, invariant } from "../../executor/foundation.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const TABS_CONTENT_BROWSER_ACTION_IDS = deepFreezeExact([
  "tc-003-builder",
  "tc-004-dark-toggle",
  "tc-005-dark-proof",
  "tc-006-resize",
  "tc-007-tabs-before",
  "tc-008-tabs-click",
  "tc-009-tabs-capture",
  "tc-010-label-one",
  "tc-011-label-two",
  "tc-012-add-tab",
  "tc-013-label-three",
  "tc-014-edit-overview",
  "tc-015-text-one-before",
  "tc-016-text-one-click",
  "tc-017-text-one-capture",
  "tc-018-text-one-fill",
  "tc-019-reselect-outer-one",
  "tc-020-edit-details",
  "tc-021-text-two-before",
  "tc-022-text-two-click",
  "tc-023-text-two-capture",
  "tc-024-text-two-fill",
  "tc-025-reselect-outer-two",
  "tc-026-edit-history",
  "tc-027-text-three-before",
  "tc-028-text-three-click",
  "tc-029-text-three-capture",
  "tc-030-text-three-fill",
  "tc-031-save",
  "tc-032-list",
  "tc-032a-auth-rate-window-barrier",
  "tc-033-reopen",
  "tc-034-three-tabs",
  "tc-035-click-details",
  "tc-036-details-state",
  "tc-037-click-history",
  "tc-038-history-state",
  "tc-039-one-panel",
  "tc-040-hidden-panels",
  "tc-041-armed-slot",
  "tc-042-shot",
  "tc-043-log-agg-errors",
  "tc-044-log-pages-errors",
  "tc-045-log-agg-warnings",
  "tc-046-log-pages-warnings",
  "tc-047-log-agg-page-errors",
  "tc-048-log-pages-page-errors",
]);

invariant(
  TABS_CONTENT_BROWSER_ACTION_IDS.length === 47 &&
    new Set(TABS_CONTENT_BROWSER_ACTION_IDS).size === 47,
  "tabs-content browser action registry drift"
);

export function isTabsContentBrowserCandidate(action) {
  return (
    action?.scenario === "tabs-content" ||
    (typeof action?.id === "string" && action.id.startsWith("tc-"))
  );
}

function assertTabsContentBrowserAction(action) {
  invariant(
    action?.scenario === "tabs-content" &&
      TABS_CONTENT_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " tabs-content browser action is not registered"
  );
}

export function createTabsContentScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function",
    "tabs-content scenario dependencies are invalid"
  );

  function buildTabsContentBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertTabsContentBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered tabs-content browser execution drift"
    );

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      invariant(
        action.id === "tc-042-shot" &&
          ownership.index === 3 &&
          ownership.scenario === "tabs-content",
        action.id + " tabs-content screenshot owner drift"
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
    invariant(invocation !== null, "tabs-content browser executable is not implemented: " + action.id);
    return invocation;
  }

  return deepFreezeExact({ buildTabsContentBrowserInvocation });
}
