import { deepFreezeExact, invariant } from "../../../shared/foundation.mjs";
import { resolveExactRef } from "../reference-resolution.mjs";
import { screenshotScenarioOwnershipForAction } from "./ownership.mjs";

export const BUTTON_IMAGE_BROWSER_ACTION_IDS = deepFreezeExact([
  "bi-001-light-proof",
  "bi-002-resize",
  "bi-003-button-before",
  "bi-004-button-click",
  "bi-005-button-capture",
  "bi-006-bound-open-primary",
  "bi-007-bound-primary",
  "bi-008-bound-open-secondary",
  "bi-009-bound-secondary",
  "bi-010-use-static",
  "bi-011-fill-static",
  "bi-012-bound-open-final",
  "bi-013-bound-final",
  "bi-014-builder-save",
  "bi-015-persisted-binding",
  "bi-016-list",
  "bi-016a-auth-rate-window-barrier",
  "bi-017-reopen",
  "bi-018-reopen-proof",
  "bi-019-cache-cold",
  "bi-020-media-route-setup",
  "bi-021-records-link",
  "bi-022-entry-link",
  "bi-023-media-route-hit",
  "bi-024-prior-resolution",
  "bi-025-select-race-image",
  "bi-026-clear-presentation",
  "bi-027-newer-presentation",
  "bi-028-media-pending-shot",
  "bi-029-media-count-before",
  "bi-030-media-release",
  "bi-031-stale-protected",
  "bi-032-media-count-after",
  "bi-033-media-unroute",
  "bi-034-browse-direct",
  "bi-035-select-direct-media",
  "bi-036-direct-safe",
  "bi-037-clear-direct",
  "bi-038-direct-missing",
  "bi-039-select-media-field",
  "bi-040-browse-field",
  "bi-041-select-field-media",
  "bi-042-save-presentation",
  "bi-043-media-uuid",
  "bi-044-builder-return",
  "bi-045-image-before",
  "bi-046-image-click",
  "bi-047-image-capture",
  "bi-048-image-bound-open",
  "bi-049-image-bound-media",
  "bi-050-field-before",
  "bi-051-field-click",
  "bi-052-field-capture",
  "bi-053-field-bound-open",
  "bi-054-field-bound-media",
  "bi-055-save-palette-media",
  "bi-056-entry-return",
  "bi-056a-safe-link-observe",
  "bi-057-safe-link-click",
  "bi-058-safe-link-proof",
  "bi-059-entry-after-front",
  "bi-061a-auth-rate-window-barrier",
  "bi-062-entry-unsafe-reload",
  "bi-063-unsafe-disabled",
  "bi-066-final-entry",
  "bi-067-final-shot",
  "bi-068-log-agg-errors",
  "bi-069-log-pages-errors",
  "bi-070-log-agg-warnings",
  "bi-071-log-pages-warnings",
  "bi-072-log-agg-page-errors",
  "bi-073-log-pages-page-errors",
]);

invariant(
  BUTTON_IMAGE_BROWSER_ACTION_IDS.length === 72 &&
    new Set(BUTTON_IMAGE_BROWSER_ACTION_IDS).size === 72,
  "button-image browser action registry drift"
);

export function isButtonImageBrowserCandidate(action) {
  return (
    action?.scenario === "button-image" ||
    (typeof action?.id === "string" && action.id.startsWith("bi-"))
  );
}

function assertButtonImageBrowserAction(action) {
  invariant(
    action?.scenario === "button-image" &&
      BUTTON_IMAGE_BROWSER_ACTION_IDS.includes(action.id) &&
      action.executable?.type !== "runtime-operation",
    String(action?.id) + " button-image browser action is not registered"
  );
}

export function createButtonImageScenarioRuntime({
  buildSharedAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation,
  runCode,
}) {
  invariant(
    typeof buildSharedAdvancedBrowserInvocation === "function" &&
      typeof buildSharedSimpleBrowserInvocation === "function" &&
      typeof runCode === "function",
    "button-image scenario dependencies are invalid"
  );

  function buildButtonImageBrowserInvocation({
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext,
    runtimeConfig,
  }) {
    assertButtonImageBrowserAction(action);
    invariant(
      executionSpec.builder === action.builder && executionSpec.kind === action.kind,
      "registered button-image browser execution drift"
    );
    const parsed = executionSpec.builderAst;
    const resolvedArgs = executionSpec.refs.map((ref, index) =>
      resolveExactRef(ref, refContext, action.id + " executable Ref[" + index + "]")
    );

    if (action.id === "bi-042-save-presentation") {
      invariant(parsed.args.length === 1, "click arity");
      const selector = JSON.stringify(resolvedArgs[0]);
      const writePath =
        "/admin/api/custom-screens/" +
        encodeURIComponent(captures.get("screen.id")) +
        "/entries/" +
        encodeURIComponent(captures.get("entry.id")) +
        "/overrides";
      return {
        args: runCode(`async (page) => {
            const locator = page.locator(${selector});
            await locator.waitFor({ state: "visible", timeout: 30000 });
            if (await locator.count() !== 1) throw new Error("wf540_presentation_save_target_count");
            const pathname = (href) => { const scheme = href.indexOf("://"); const start = href.indexOf("/", scheme === -1 ? 0 : scheme + 3); return (start === -1 ? "/" : href.slice(start)).split(/[?#]/u, 1)[0]; };
            const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && pathname(response.url()) === ${JSON.stringify(writePath)}, { timeout: 270000 });
            await locator.click();
            const response = await responsePromise;
            if (!response.ok()) throw new Error("wf540_presentation_save_response");
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
              const cleanDisabled = await locator.count() === 1 && !(await locator.isEnabled()) && (await locator.textContent())?.trim() === "Save presentation";
              const savingAbsent = await page.getByText("Saving...", { exact: true }).count() === 0;
              const dirtyAbsent = await page.getByText("Unsaved presentation", { exact: true }).count() === 0;
              if (cleanDisabled && savingAbsent && dirtyAbsent) return true;
              await page.waitForTimeout(25);
            }
            throw new Error("wf540_presentation_save_settlement");
          }`),
        displayArgs: null,
      };
    }

    if (action.executable.type === "browser-screenshot") {
      const expectedIndex =
        action.id === "bi-028-media-pending-shot"
          ? 1
          : action.id === "bi-067-final-shot"
            ? 2
            : null;
      const ownership = screenshotScenarioOwnershipForAction(action.id);
      invariant(
        expectedIndex !== null &&
          ownership.index === expectedIndex &&
          ownership.scenario === "button-image",
        action.id + " button-image screenshot owner drift"
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
      "button-image browser executable is not implemented: " + action.id
    );
    return invocation;
  }

  return deepFreezeExact({ buildButtonImageBrowserInvocation });
}
