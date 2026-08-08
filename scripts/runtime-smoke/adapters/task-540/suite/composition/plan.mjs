import { buildTask540SmokePlan } from "../contract/plan.mjs";
import { REQUIRED_ISOLATED_API_READ_EXPECTATIONS } from "../contract/requirements.mjs";

const EXPECTED_EXECUTABLE_COUNTS = Object.freeze({
  "runtime-operation": 76,
  "browser-run-code": 392,
  "browser-native": 14,
  "browser-screenshot": 13,
  "browser-global-list": 1,
});

export function buildTask540NativePlan(input) {
  const plan = buildTask540SmokePlan(input);
  if (
    !Object.isFrozen(plan) ||
    plan.actionManifest.length !== 496 ||
    plan.requiredScenarios.length !== 7 ||
    plan.requiredScreenshotPaths.length !== 13
  ) {
    throw new Error("TASK-540 native plan cardinality drifted");
  }
  for (const [type, expected] of Object.entries(EXPECTED_EXECUTABLE_COUNTS)) {
    if (
      plan.actionManifest.filter((action) => action.executable.type === type).length !== expected
    ) {
      throw new Error("TASK-540 native executable partition drifted");
    }
  }
  return Object.freeze({
    ...plan,
    requiredIsolatedApiReadExpectations: REQUIRED_ISOLATED_API_READ_EXPECTATIONS,
  });
}

export { EXPECTED_EXECUTABLE_COUNTS as TASK540_NATIVE_EXECUTABLE_COUNTS };
