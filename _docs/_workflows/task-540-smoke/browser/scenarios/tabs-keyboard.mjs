import { deepFreezeExact, invariant } from "../../executor/foundation.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const TABS_KEYBOARD_BROWSER_ACTION_IDS = deepFreezeExact([
  "tk-001-light-toggle",
  "tk-002-light-proof",
  "tk-003-resize",
  "tk-004-select-outer",
  "tk-005-edit-overview",
  "tk-006-inner-before",
  "tk-007-inner-click",
  "tk-008-inner-capture",
  "tk-009-save",
  "tk-010-preview",
  "tk-011-preview-proof",
  "tk-012-focus-overview",
  "tk-013-arrow-left",
  "tk-014-observe-left",
  "tk-015-arrow-right",
  "tk-016-observe-right",
  "tk-017-home",
  "tk-018-observe-home",
  "tk-019-end",
  "tk-020-observe-end",
  "tk-021-keyboard-proof",
  "tk-022-aria-proof",
  "tk-022a-restore-overview",
  "tk-023-inner-second",
  "tk-024-outer-details",
  "tk-025-outer-overview",
  "tk-026-nested-proof",
  "tk-027-ids-proof",
  "tk-028-shot",
  "tk-029-preview-close",
  "tk-030-log-agg-errors",
  "tk-031-log-pages-errors",
  "tk-032-log-agg-warnings",
  "tk-033-log-pages-warnings",
  "tk-034-log-agg-page-errors",
  "tk-035-log-pages-page-errors",
]);

invariant(
  TABS_KEYBOARD_BROWSER_ACTION_IDS.length === 36 &&
    new Set(TABS_KEYBOARD_BROWSER_ACTION_IDS).size === 36,
  "tabs-keyboard browser action registry drift"
);

export function isTabsKeyboardBrowserCandidate(action) {
  return (
    action?.scenario === "tabs-keyboard-aria" ||
    (typeof action?.id === "string" && action.id.startsWith("tk-"))
  );
}

function assertTabsKeyboardBrowserAction(action) {
  invariant(
    action?.scenario === "tabs-keyboard-aria" &&
      TABS_KEYBOARD_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " tabs-keyboard browser action is not registered"
  );
}

export function createTabsKeyboardScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function",
    "tabs-keyboard scenario dependencies are invalid"
  );

  function buildTabsKeyboardBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertTabsKeyboardBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered tabs-keyboard browser execution drift"
    );

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      invariant(
        action.id === "tk-028-shot" &&
          ownership.index === 4 &&
          ownership.scenario === "tabs-keyboard-aria",
        action.id + " tabs-keyboard screenshot owner drift"
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
      "tabs-keyboard browser executable is not implemented: " + action.id
    );
    return invocation;
  }

  return deepFreezeExact({ buildTabsKeyboardBrowserInvocation });
}
