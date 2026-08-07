import { deepFreezeExact, invariant } from "../../../shared/foundation.mjs";

export const SCREENSHOT_SCENARIO_OWNERSHIP = deepFreezeExact([
  { index: 1, actionId: "bi-028-media-pending-shot", scenario: "button-image" },
  { index: 2, actionId: "bi-067-final-shot", scenario: "button-image" },
  { index: 3, actionId: "tc-042-shot", scenario: "tabs-content" },
  { index: 4, actionId: "tk-028-shot", scenario: "tabs-keyboard-aria" },
  { index: 5, actionId: "ss-029-shot", scenario: "space-selection" },
  { index: 6, actionId: "dg-033-failure-shot", scenario: "dirty-guards" },
  { index: 7, actionId: "dg-042-final-shot", scenario: "dirty-guards" },
  { index: 8, actionId: "rc-009-failure-shot", scenario: "related-retry-cache" },
  { index: 9, actionId: "rc-033-stale-shot", scenario: "related-retry-cache" },
  { index: 10, actionId: "rc-037-final-shot", scenario: "related-retry-cache" },
  { index: 11, actionId: "ru-048-a-first-shot", scenario: "responsive-users" },
  { index: 12, actionId: "ru-074-b-shot", scenario: "responsive-users" },
  { index: 13, actionId: "ru-109-converged-shot", scenario: "responsive-users" },
]);

export function screenshotScenarioOwnershipForAction(actionId) {
  const ownership = SCREENSHOT_SCENARIO_OWNERSHIP.find(
    (candidate) => candidate.actionId === actionId
  );
  invariant(ownership !== undefined, actionId + " screenshot scenario owner is not registered");
  return ownership;
}

export function assertScreenshotScenarioOwnership(plan, action) {
  const ownership = screenshotScenarioOwnershipForAction(action.id);
  const screenshotActions = plan.actionManifest.filter(
    (candidate) => candidate.executable.type === "browser-screenshot"
  );
  invariant(
    screenshotActions.length === SCREENSHOT_SCENARIO_OWNERSHIP.length &&
      screenshotActions[ownership.index - 1]?.id === action.id &&
      action.scenario === ownership.scenario,
    action.id + " screenshot scenario ownership drift"
  );
  return ownership;
}
