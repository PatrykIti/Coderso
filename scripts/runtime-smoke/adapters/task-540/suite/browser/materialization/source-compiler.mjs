import { invariant } from "../../shared/foundation.mjs";
import { normalizeAuthRatePolicy } from "./browser-contract.mjs";
import {
  createBrowserInvocationRouter,
  createSharedBrowserInvocationRuntime,
} from "./generic-invocations.mjs";
import { createActionExecutionCompiler } from "./route-and-action-sources.mjs";
import { runCode } from "./run-code.mjs";
import {
  createButtonImageScenarioRuntime,
  isButtonImageBrowserCandidate,
} from "./scenarios/button-image.mjs";
import {
  createDirtyGuardsScenarioRuntime,
  isDirtyGuardsBrowserCandidate,
} from "./scenarios/dirty-guards.mjs";
import {
  createRelatedCacheScenarioRuntime,
  isRelatedCacheBrowserCandidate,
} from "./scenarios/related-cache.mjs";
import {
  createResponsiveUsersScenarioRuntime,
  isResponsiveUsersBrowserCandidate,
} from "./scenarios/responsive-users.mjs";
import {
  createSpaceSelectionScenarioRuntime,
  isSpaceSelectionBrowserCandidate,
} from "./scenarios/space-selection.mjs";
import {
  createTabsContentScenarioRuntime,
  isTabsContentBrowserCandidate,
} from "./scenarios/tabs-content.mjs";
import {
  createTabsKeyboardScenarioRuntime,
  isTabsKeyboardBrowserCandidate,
} from "./scenarios/tabs-keyboard.mjs";

const shared = createSharedBrowserInvocationRuntime({ normalizeAuthRatePolicy });
const buttonImage = createButtonImageScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
  runCode,
});
const tabsContent = createTabsContentScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
});
const tabsKeyboard = createTabsKeyboardScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
});
const spaceSelection = createSpaceSelectionScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
});
const relatedCache = createRelatedCacheScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
  runCode,
});
const responsiveUsers = createResponsiveUsersScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
});
const dirtyGuards = createDirtyGuardsScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
  runCode,
});

const router = createBrowserInvocationRouter({
  buildAdvancedBrowserInvocation: shared.buildAdvancedBrowserInvocation,
  buildButtonImageBrowserInvocation: buttonImage.buildButtonImageBrowserInvocation,
  buildDirtyGuardsBrowserInvocation: dirtyGuards.buildDirtyGuardsBrowserInvocation,
  buildRelatedCacheBrowserInvocation: relatedCache.buildRelatedCacheBrowserInvocation,
  buildResponsiveUsersBrowserInvocation: responsiveUsers.buildResponsiveUsersBrowserInvocation,
  buildSimpleBrowserInvocation: shared.buildSimpleBrowserInvocation,
  buildSpaceSelectionBrowserInvocation: spaceSelection.buildSpaceSelectionBrowserInvocation,
  buildTabsContentBrowserInvocation: tabsContent.buildTabsContentBrowserInvocation,
  buildTabsKeyboardBrowserInvocation: tabsKeyboard.buildTabsKeyboardBrowserInvocation,
  isButtonImageBrowserCandidate,
  isDirtyGuardsBrowserCandidate,
  isRelatedCacheBrowserCandidate,
  isResponsiveUsersBrowserCandidate,
  isSpaceSelectionBrowserCandidate,
  isTabsContentBrowserCandidate,
  isTabsKeyboardBrowserCandidate,
  normalizeDirtyGuardsUnitSource: dirtyGuards.normalizeDirtyGuardsUnitSource,
});

const compiler = createActionExecutionCompiler({
  dirtyGuardsOperationForAction: dirtyGuards.dirtyGuardsOperationForAction,
  dirtyGuardsRouteKeyForAction: dirtyGuards.dirtyGuardsRouteKeyForAction,
  relatedCacheOperationForAction: relatedCache.relatedCacheOperationForAction,
  relatedCacheRouteKeyForAction: relatedCache.relatedCacheRouteKeyForAction,
});

export function compileTask540BrowserExecutionSpec(action) {
  return compiler.compileActionExecutionSpec(action);
}

export function materializeTask540RunCodeSource({
  action,
  plan,
  captures,
  priorOutputs,
  variables,
  root,
  browserCwd,
  runtimeConfig,
}) {
  invariant(action.executable.type === "browser-run-code", action.id + " is not run-code");
  const registryId = action.executable.sourceId;
  const registered = plan.registries.browserRunCodeSources[registryId];
  invariant(
    registered?.actionId === action.id && registered.refCount === action.executable.refs.length,
    action.id + " run-code source identity drift"
  );
  const executionSpec = compiler.compileActionExecutionSpec(action);
  const invocation = router.buildBrowserInvocation(
    action,
    executionSpec,
    captures,
    root,
    browserCwd,
    plan,
    {
      plan,
      captures,
      priorOutputs,
      variables,
      currentOutput: null,
      root,
      actionId: action.id,
    },
    runtimeConfig
  );
  const sourceIndex = invocation.args.indexOf("run-code") + 1;
  invariant(
    sourceIndex > 0 &&
      sourceIndex === invocation.args.length - 1 &&
      typeof invocation.args[sourceIndex] === "string" &&
      invocation.args[sourceIndex].length > 0,
    action.id + " run-code source materialization drift"
  );
  return invocation.args[sourceIndex];
}
