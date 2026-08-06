import { buildTask540SmokePlan } from "../plan.mjs";
import {
  REQUIRED_FLOW_ACTION_COUNT,
  REQUIRED_SETUP_ACTION_COUNT,
  REQUIRED_TERMINAL_ACTION_COUNT,
} from "../requirements.mjs";
import { expectContractFailure } from "./helpers.mjs";
import { runLoopIntegritySelfTestSuite } from "./loop-integrity.mjs";
import { runManifestFailClosedSelfTestSuite } from "./manifest-fail-closed.mjs";
import { runPlanContractSelfTestSuite } from "./plan-contract.mjs";
import { runRegistriesFixturesSelfTestSuite } from "./registries-fixtures.mjs";

export function runTask540SmokeContractSelfTest() {
  const plan = buildTask540SmokePlan({ nonce: "0123456789ab" });
  let negativeCases = 0;
  const negative = (callback, label) => {
    negativeCases += 1;
    expectContractFailure(callback, label);
  };
  const { executableCounts, oneLoopTrace, cleanup } = runPlanContractSelfTestSuite(
    plan,
    negative
  );
  const { runtimeIndex } = runManifestFailClosedSelfTestSuite(plan, negative);
  runRegistriesFixturesSelfTestSuite(plan, negative);
  runLoopIntegritySelfTestSuite(plan, negative, runtimeIndex);
  return Object.freeze({
    pass: true,
    actions: plan.actionManifest.length,
    setupActions: REQUIRED_SETUP_ACTION_COUNT,
    flowActions: REQUIRED_FLOW_ACTION_COUNT,
    cleanupActions: REQUIRED_TERMINAL_ACTION_COUNT,
    fixtures: plan.requiredFixtureSubjectKeys.length,
    captures: plan.requiredCaptureNames.length,
    screenshots: plan.requiredScreenshotPaths.length,
    assertions: Object.values(plan.requiredAssertions).flat().length,
    expandedCleanupActions: cleanup.length,
    executableTypeCounts: executableCounts,
    oneLoopReceipts: oneLoopTrace.actionReceipts.length,
    negativeCases,
  });
}
