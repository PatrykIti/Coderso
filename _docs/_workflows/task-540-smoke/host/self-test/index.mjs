import { deepFreezeExact, exactOrderedDataObject, invariant } from "../validation.mjs";
import { runCliDirectEntrySelfTest } from "./cli-direct-entry.mjs";
import { runDescriptorsViteSelfTest } from "./descriptors-vite.mjs";
import { runEnvironmentPreflightStartupSelfTest } from "./environment-preflight-startup.mjs";
import { runStopServeSelfTest } from "./stop-serve.mjs";
import { createSelfTestSupport } from "./support.mjs";

export function createHostSelfTest(configuration) {
  const configurationKeys = [
    "ADMIN_VITE_SOURCE",
    "BACKEND_SOURCE",
    "CHILD_READY_MARKERS",
    "READY_TIMEOUT_MS",
    "SITE_VITE_SOURCE",
    "childDescriptors",
    "createBoundedDrain",
    "createDescendantStopController",
    "freezeStopProof",
    "isDirectModuleExecution",
    "runHostCli",
    "serve",
    "validateChildDescriptors",
  ];
  exactOrderedDataObject(configuration, configurationKeys, "host self-test configuration");
  invariant(
    configurationKeys
      .filter((key) => /^[a-z]/u.test(key))
      .every((key) => typeof configuration[key] === "function"),
    "host self-test callback dependency drift"
  );
  const support = createSelfTestSupport({
    CHILD_READY_MARKERS: configuration.CHILD_READY_MARKERS,
    READY_TIMEOUT_MS: configuration.READY_TIMEOUT_MS,
    createDescendantStopController: configuration.createDescendantStopController,
  });

  return async function runTask540SmokeHostSelfTest() {
    const root = "/canonical/task540-root";
    const descriptorsVite = await runDescriptorsViteSelfTest(
      {
        ADMIN_VITE_SOURCE: configuration.ADMIN_VITE_SOURCE,
        BACKEND_SOURCE: configuration.BACKEND_SOURCE,
        CHILD_READY_MARKERS: configuration.CHILD_READY_MARKERS,
        READY_TIMEOUT_MS: configuration.READY_TIMEOUT_MS,
        SITE_VITE_SOURCE: configuration.SITE_VITE_SOURCE,
        childDescriptors: configuration.childDescriptors,
        createBoundedDrain: configuration.createBoundedDrain,
        root,
        validateChildDescriptors: configuration.validateChildDescriptors,
      },
      support
    );
    const cliDirectEntry = await runCliDirectEntrySelfTest(
      {
        isDirectModuleExecution: configuration.isDirectModuleExecution,
        root,
        runHostCli: configuration.runHostCli,
      },
      support
    );
    const environmentPreflightStartup = await runEnvironmentPreflightStartupSelfTest(
      { root },
      support
    );
    const stopServe = await runStopServeSelfTest(
      {
        READY_TIMEOUT_MS: configuration.READY_TIMEOUT_MS,
        environment: environmentPreflightStartup.environment,
        freezeStopProof: configuration.freezeStopProof,
        root,
        serve: configuration.serve,
      },
      support
    );

    return deepFreezeExact({
      pass: true,
      cliForms: cliDirectEntry.cliForms,
      negativeCliCases: cliDirectEntry.negativeCliCases,
      childDescriptors: descriptorsVite.childDescriptors,
      ports: environmentPreflightStartup.ports,
      environmentKeys: environmentPreflightStartup.environmentKeys,
      processProofChildren: environmentPreflightStartup.processProofChildren,
      environmentNegativeCases: environmentPreflightStartup.environmentNegativeCases,
      preflightNegativeCases: environmentPreflightStartup.preflightNegativeCases,
      startupNegativeCases: environmentPreflightStartup.startupNegativeCases,
      shutdownCases: stopServe.shutdownCases,
      stopProofNegativeCases: stopServe.stopProofNegativeCases,
      descriptorNegativeCases: descriptorsVite.descriptorNegativeCases,
      viteReadinessPositiveCases: descriptorsVite.viteReadinessPositiveCases,
      viteReadinessNegativeCases: descriptorsVite.viteReadinessNegativeCases,
      viteWarmRestartPositiveCases: descriptorsVite.viteWarmRestartPositiveCases,
      viteWarmRestartNegativeCases: descriptorsVite.viteWarmRestartNegativeCases,
      viteCacheAuthorityNegativeCases:
        environmentPreflightStartup.viteCacheAuthorityNegativeCases,
      startupDeadlineCases: stopServe.startupDeadlineCases,
      secondObservationCycles: stopServe.secondObservationCycles,
      injectedServeCases: stopServe.injectedServeCases,
      runtimeTrapCalls: cliDirectEntry.runtimeTrapCalls,
      directEntryCases: cliDirectEntry.directEntryCases,
      serveRuntimeFactoryCalls: cliDirectEntry.serveRuntimeFactoryCalls,
    });
  };
}
