import { deepFreezeExact, invariant } from "../../executor/foundation.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const RESPONSIVE_USERS_BROWSER_ACTION_IDS = deepFreezeExact([
  "ru-007-builder",
  "ru-008-resize-320",
  "ru-009-hide-320",
  "ru-010-closed-320",
  "ru-011-show-320",
  "ru-012-open-320",
  "ru-013-resize-390",
  "ru-014-hide-390",
  "ru-015-closed-390",
  "ru-016-show-390",
  "ru-017-open-390",
  "ru-018-resize-480",
  "ru-019-hide-480",
  "ru-020-closed-480",
  "ru-021-show-480",
  "ru-022-open-480",
  "ru-023-resize-1024",
  "ru-024-hide-1024",
  "ru-025-closed-1024",
  "ru-026-show-1024",
  "ru-027-open-1024",
  "ru-028-resize-1280",
  "ru-029-hide-1280",
  "ru-030-closed-1280",
  "ru-031-show-1280",
  "ru-032-open-1280",
  "ru-033-narrow-proof",
  "ru-034-wide-proof",
  "ru-035-panel-proof",
  "ru-036-light-toggle",
  "ru-037-light-proof",
  "ru-038-entry",
  "ru-039-bootstrap-menu",
  "ru-040-bootstrap-signout",
  "ru-040a-bootstrap-signout-settled",
  "ru-041-a-email",
  "ru-042-a-password",
  "ru-043-a-submit",
  "ru-043a-a-identity-settled",
  "ru-044-a-entry",
  "ru-045-a-light-capture",
  "ru-046-a-metadata-enable",
  "ru-047-a-write-settle",
  "ru-048-a-first-shot",
  "ru-049-a-away",
  "ru-052-a-return",
  "ru-053-a-authoritative",
  "ru-053a-a-nondefault-toggle",
  "ru-053b-a-nondefault-write-settled",
  "ru-054-a-away-again",
  "ru-055-read-route-setup",
  "ru-056-a-remount-pending",
  "ru-057-read-route-hit",
  "ru-058-retained-pending",
  "ru-059-new-local-toggle",
  "ru-059a-new-local-browser-write-settled",
  "ru-060-new-local-pending",
  "ru-061-read-release",
  "ru-062-new-local-wins",
  "ru-063-read-unroute",
  "ru-064-legacy-storage",
  "ru-065-a-menu",
  "ru-066-a-signout",
  "ru-066a-a-signout-settled",
  "ru-067-b-email",
  "ru-068-b-password",
  "ru-069-b-submit",
  "ru-069a-b-identity-settled",
  "ru-070-b-entry",
  "ru-071-b-dark-toggle",
  "ru-072-b-dark-capture",
  "ru-073-light-dark-proof",
  "ru-074-b-shot",
  "ru-075-b-menu",
  "ru-076-b-signout",
  "ru-076a-b-signout-settled",
  "ru-076b-auth-rate-window-barrier",
  "ru-077-a2-email",
  "ru-078-a2-password",
  "ru-079-a2-submit",
  "ru-079a-a2-identity-settled",
  "ru-080-a2-entry",
  "ru-081-a2-light-toggle",
  "ru-082-isolation-proof",
  "ru-083-write-route-setup",
  "ru-084-first-a-toggle",
  "ru-085-write-route-hit",
  "ru-086-second-a-toggle",
  "ru-087-second-intent",
  "ru-088-hit-before-release",
  "ru-089-a-exit-menu",
  "ru-090-a-exit-signout",
  "ru-090a-a-exit-signout-settled",
  "ru-091-b2-email",
  "ru-092-b2-password",
  "ru-093-b2-submit",
  "ru-093a-b2-identity-settled",
  "ru-094-b2-entry",
  "ru-095-b-before-release",
  "ru-096-write-release",
  "ru-097-hit-after-release",
  "ru-098-queued-zero",
  "ru-099-b-unchanged",
  "ru-100-write-unroute",
  "ru-100a-auth-rate-window-barrier",
  "ru-101-b2-menu",
  "ru-102-b2-signout",
  "ru-102a-b2-signout-settled",
  "ru-103-a3-email",
  "ru-104-a3-password",
  "ru-105-a3-submit",
  "ru-105a-a3-identity-settled",
  "ru-106-a3-entry",
  "ru-106a-a3-fresh-read-settled",
  "ru-107-fresh-a-toggle",
  "ru-108-convergence",
  "ru-109-converged-shot",
  "ru-110-log-agg-errors",
  "ru-111-log-pages-errors",
  "ru-112-log-agg-warnings",
  "ru-113-log-pages-warnings",
  "ru-114-log-agg-page-errors",
  "ru-115-log-pages-page-errors",
]);

invariant(
  RESPONSIVE_USERS_BROWSER_ACTION_IDS.length === 123 &&
    new Set(RESPONSIVE_USERS_BROWSER_ACTION_IDS).size === 123,
  "responsive-users browser action registry drift"
);

export function isResponsiveUsersBrowserCandidate(action) {
  return RESPONSIVE_USERS_BROWSER_ACTION_IDS.includes(action?.id);
}

function assertResponsiveUsersBrowserAction(action) {
  invariant(
    action?.scenario === "responsive-users" &&
      RESPONSIVE_USERS_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " responsive-users browser action is not registered"
  );
}

export function createResponsiveUsersScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function",
    "responsive-users scenario dependencies are invalid"
  );

  function buildResponsiveUsersBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertResponsiveUsersBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered responsive-users browser execution drift"
    );

    if (action.executable.type === "browser-screenshot") {
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      const expectedIndex =
        action.id === "ru-048-a-first-shot"
          ? 11
          : action.id === "ru-074-b-shot"
            ? 12
            : action.id === "ru-109-converged-shot"
              ? 13
              : null;
      invariant(
        expectedIndex !== null &&
          ownership.index === expectedIndex &&
          ownership.scenario === "responsive-users",
        action.id + " responsive-users screenshot owner drift"
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
    invariant(invocation !== null, "responsive-users browser executable is not implemented: " + action.id);
    return invocation;
  }

  return deepFreezeExact({ buildResponsiveUsersBrowserInvocation });
}
