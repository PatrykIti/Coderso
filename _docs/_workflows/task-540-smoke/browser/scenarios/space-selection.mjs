import { deepFreezeExact, invariant } from "../../executor/foundation.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const SPACE_SELECTION_BROWSER_ACTION_IDS = deepFreezeExact([
  "ss-007-entry",
  "ss-008-dark-toggle",
  "ss-009-dark-proof",
  "ss-010-resize",
  "ss-011-selection-before",
  "ss-012-editor-click",
  "ss-013-select-all",
  "ss-014-type-alpha",
  "ss-015-space-one",
  "ss-016-type-beta",
  "ss-017-space-two",
  "ss-018-type-gamma",
  "ss-019-space-three",
  "ss-020-type-delta",
  "ss-021-space-proof",
  "ss-022-selection-after-input",
  "ss-023-nested-link",
  "ss-024-selection-after-link",
  "ss-025-refocus-input",
  "ss-026-nested-proof",
  "ss-027-selection-handle",
  "ss-028-handle-proof",
  "ss-029-shot",
  "ss-030-log-agg-errors",
  "ss-031-log-pages-errors",
  "ss-032-log-agg-warnings",
  "ss-033-log-pages-warnings",
  "ss-034-log-agg-page-errors",
  "ss-035-log-pages-page-errors",
]);

invariant(
  SPACE_SELECTION_BROWSER_ACTION_IDS.length === 29 &&
    new Set(SPACE_SELECTION_BROWSER_ACTION_IDS).size === 29,
  "space-selection browser action registry drift"
);

export function isSpaceSelectionBrowserCandidate(action) {
  return (
    action?.scenario === "space-selection" ||
    (typeof action?.id === "string" && action.id.startsWith("ss-"))
  );
}

function assertSpaceSelectionBrowserAction(action) {
  invariant(
    action?.scenario === "space-selection" &&
      SPACE_SELECTION_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " space-selection browser action is not registered"
  );
}

export function createSpaceSelectionScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function",
    "space-selection scenario dependencies are invalid"
  );

  function buildSpaceSelectionBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertSpaceSelectionBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered space-selection browser execution drift"
    );

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      invariant(
        action.id === "ss-029-shot" &&
          ownership.index === 5 &&
          ownership.scenario === "space-selection",
        action.id + " space-selection screenshot owner drift"
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
      "space-selection browser executable is not implemented: " + action.id
    );
    return invocation;
  }

  return deepFreezeExact({ buildSpaceSelectionBrowserInvocation });
}
