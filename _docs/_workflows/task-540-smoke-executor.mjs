import { constants as fsConstants } from "node:fs";
import {
  lstat,
  open,
  readFile,
  readdir,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Script } from "node:vm";

import { buildTask540SmokePlan } from "./task-540-smoke-contract.mjs";
import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./task-540-smoke/executor/foundation.mjs";
import {
  BROWSER_FIXED_TIMEOUT_ENV,
  BROWSER_OPTIONAL_INHERITED_ENV,
  applyFixedBrowserTimeoutEnvironment,
  assertStorageFallbackEnvironmentAbsent,
  buildExactHostEnvironment,
  ownString,
} from "./task-540-smoke/executor/environment.mjs";
import {
  assertNoSymlinkAncestors,
  createPrivateBrowserWorkspace,
  privateWorkspaceRootDevice,
  projectArtifactIdentity,
  readOwnedRegularFileNoFollow,
  readStableArtifactIdentity,
  readStrictRepoEnvironment,
  registerWorkspaceArtifact,
  removePrivateWorkspaceLedger,
  requireMissingPath,
  sameArtifactIdentity,
} from "./task-540-smoke/executor/private-workspace.mjs";
import {
  ALL_SELECT_CONTENT_SELECTOR,
  AUTH_SETTLEMENT_ACTION_IDS,
  AUTH_SETTLEMENT_FAILURE_FRAMES,
  BUN_BRIDGE_EXECUTION_AUTHORITY,
  CLEANUP_FAILURE_CLASS_PRIORITY,
  DATABASE_OPERATION_TIMEOUT_MS,
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  DIRTY_NAVIGATION_FAILURE_FRAMES,
  DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG,
  DIRTY_NAVIGATION_REQUEST_ACTION_IDS,
  EMPTY_SHA256,
  EXPECTED_AUTH_CHALLENGE_PHASES,
  INPUT_KEYS,
  LF_SHA256,
  MAX_COMPLETE_SESSION_ROWS,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  MAX_NATURAL_KEY_CANDIDATES,
  MAX_STREAM_BYTES,
  MAX_TASK_TRAFFIC_ROWS,
  NONCE_PATTERN,
  OPEN_SELECT_CONTENT_SELECTOR,
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  RECORDS_WORKSPACE_ACTION_IDS,
  RECORD_ENTRY_MENU_ACTION_IDS,
  SESSION_NAME,
  TASK_FAILURE,
  TASK_FIXTURE_ENTRY_SEMANTICS,
  TONE_CONTENT_FILL_ACTION_CONFIG,
  TONE_CONTENT_FILL_ACTION_IDS,
  TONE_FLOW_ACTION_CONFIG,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_OPEN_FAILURE_FRAMES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_FAILURE_FRAMES,
  resolveDirtyNavigationTargetTimeline,
  seoDocumentResourceSemantic,
} from "./task-540-smoke/executor/config.mjs";
import {
  BROWSER_RECEIPT_KEYS,
  CLEANUP_OPERATION_KINDS,
  INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS,
  RESOURCE_BUN_BRIDGE_PARTICIPATION,
  RESOURCE_DELTA_KEYS,
  RESOURCE_EDGE_KEYS,
  RESOURCE_KIND_CONTRACTS,
  RESOURCE_RECORD_INPUT_KEYS,
  RESOURCE_RECORD_KEYS,
  RUNTIME_RECEIPT_KEYS,
  TERMINAL_RESOURCE_KINDS,
  assertResourceBunParticipationExhaustive,
  deepEqualJson,
} from "./task-540-smoke/executor/resource-contracts.mjs";
import {
  ResourceCleanupPlanner,
  ResourceLedgerBuilder,
  RESOURCE_IDENTIFIER_TYPES,
  actionOrdinal,
  assertExactCleanupTupleSet,
  cartesianCleanupTuples,
  compileBlockedParentClosure,
  createResourceCore,
  destructiveResourceEdge,
  emptyResourceDelta,
  lengthPrefixedTuple,
} from "./task-540-smoke/executor/resource-ledger.mjs";
import {
  PROVEN_RESOURCE_ACTIONS,
  deriveActionResourceDelta,
  registerSuccessfulActionResourcesAfterLedgerAppend,
} from "./task-540-smoke/executor/action-resources.mjs";
import { createResponseLostRegistry } from "./task-540-smoke/runtime/response-lost-registry.mjs";
import { createResponseLostBaselines } from "./task-540-smoke/runtime/response-lost-baselines.mjs";
import { createResponseLostDiscovery } from "./task-540-smoke/runtime/response-lost-discovery.mjs";
import { cleanupDiagnostics } from "./task-540-smoke/cleanup/diagnostics.mjs";
import { createConstructionAuthorityRuntime } from "./task-540-smoke/cleanup/construction-authority.mjs";
import { createFinalBaselinesRuntime } from "./task-540-smoke/cleanup/final-baselines.mjs";
import { createCleanupSubjectAuthorityRuntime } from "./task-540-smoke/cleanup/subject-authority.mjs";
import { runExpectedAuthChallengeSelfTest } from "./task-540-smoke/executor/self-test/auth-challenge.mjs";
import { runBrowserCaptureFrontierSelfTest } from "./task-540-smoke/executor/self-test/browser-capture-frontier.mjs";
import { runBrowserSourceContextSelfTest } from "./task-540-smoke/executor/self-test/browser-source-context.mjs";
import { runConstructionCleanupSelfTest } from "./task-540-smoke/executor/self-test/construction-cleanup.mjs";
import { runFailureActionClassificationSelfTest } from "./task-540-smoke/executor/self-test/failure-action-classification.mjs";
import { runFailureActionExecutionSelfTest } from "./task-540-smoke/executor/self-test/failure-action-execution.mjs";
import { runFailureActionSinksSelfTest } from "./task-540-smoke/executor/self-test/failure-action-sinks.mjs";
import { runFailureFramesSelfTest } from "./task-540-smoke/executor/self-test/failure-frames.mjs";
import { runHostReadinessPolicySelfTest } from "./task-540-smoke/executor/self-test/host-readiness-policy.mjs";
import { runMediaIsolationSelfTest } from "./task-540-smoke/executor/self-test/media-isolation.mjs";
import { runMediaUploadSelfTest } from "./task-540-smoke/executor/self-test/media-upload.mjs";
import { createSettlementDiagnosticHarness } from "./task-540-smoke/executor/self-test/settlement-diagnostic-harness.mjs";
import {
  createFailureBoundaryRuntime,
  retainOrDiscardPreAuthorityCauseNeverThrow,
} from "./task-540-smoke/executor/failure-boundary.mjs";
import { createDiagnosticSinkRuntime } from "./task-540-smoke/executor/diagnostic-sink.mjs";
import { SingleAssignmentCaptureMap } from "./task-540-smoke/executor/captures.mjs";
import { createAdminApiSessionRuntime } from "./task-540-smoke/runtime/admin-api-session.mjs";
import { createBootstrapLoginRuntime } from "./task-540-smoke/runtime/bootstrap-login.mjs";
import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "./task-540-smoke/runtime/bun-child-protocol.mjs";
import {
  BUN_BRIDGE_ENV_PROFILES,
  createBunBridgeTransport,
} from "./task-540-smoke/runtime/bun-bridge-transport.mjs";
import { createBoundedStreamRuntime } from "./task-540-smoke/runtime/bounded-stream.mjs";
import { createCommandAuthorityRuntime } from "./task-540-smoke/runtime/command-authority.mjs";
import {
  TASK540_MEDIA_UPLOAD_SHA256,
  TASK540_PNG_SIGNATURE_HEX,
  createMediaOperationsRuntime,
  decodeCanonicalMediaUploadFixtureExact,
} from "./task-540-smoke/runtime/media-operations.mjs";
import { createMissingMediaProofRuntime } from "./task-540-smoke/runtime/missing-media-proof.mjs";
import { createMediaStorageOwnershipRuntime } from "./task-540-smoke/runtime/media-storage-ownership.mjs";
import {
  canonicalManifestRuntimeOperation,
  createRuntimeOperationRouter,
} from "./task-540-smoke/runtime/operation-router.mjs";
import { createOwnedHostRuntime } from "./task-540-smoke/runtime/owned-host.mjs";
import { createStorageManifestRuntime } from "./task-540-smoke/runtime/storage-manifest.mjs";
import { createStoragePreflightRuntime } from "./task-540-smoke/runtime/storage-preflight.mjs";
import {
  assertOrderedManifestCallsExact,
  assertPlainJsonValue,
  isSafeRepositoryRelativePath,
  validateExactJsonSchema,
} from "./task-540-smoke/executor/json-schema.mjs";
import {
  BOOTSTRAP_RAW_USER_ROW_KEYS,
  bootstrapTimestampPair,
  isNullableIsoTimestamp,
  validateBootstrapPrivateBaseline,
} from "./task-540-smoke/executor/bootstrap-contracts.mjs";
import {
  changedJsonPointers,
  evaluateExactPredicate,
  expandRegisteredPath,
  registeredSelector,
  resolveExactRef,
  resolveFixtureValue,
} from "./task-540-smoke/executor/ref-dsl.mjs";
import {
  consumeExactTabRow,
  decodeBoundedUtf8,
  decodeExactNativeUtf8,
  expectedNativeTabRows,
  parseRegisteredOutput,
} from "./task-540-smoke/executor/output-parser.mjs";
import {
  createDirtyGuardsScenarioRuntime,
  isDirtyGuardsBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/dirty-guards.mjs";
import {
  createButtonImageScenarioRuntime,
  isButtonImageBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/button-image.mjs";
import {
  createTabsContentScenarioRuntime,
  isTabsContentBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/tabs-content.mjs";
import {
  createTabsKeyboardScenarioRuntime,
  isTabsKeyboardBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/tabs-keyboard.mjs";
import {
  createSpaceSelectionScenarioRuntime,
  isSpaceSelectionBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/space-selection.mjs";
import {
  createRelatedCacheScenarioRuntime,
  isRelatedCacheBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/related-cache.mjs";
import {
  createResponsiveUsersScenarioRuntime,
  isResponsiveUsersBrowserCandidate,
} from "./task-540-smoke/browser/scenarios/responsive-users.mjs";
import {
  LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR,
  playwrightArgs,
  runCode,
} from "./task-540-smoke/browser/run-code.mjs";
import {
  createBrowserInvocationRouter,
  createSharedBrowserInvocationRuntime,
} from "./task-540-smoke/browser/generic-invocations.mjs";
import {
  parseBuilder,
  resolveLiteral,
} from "./task-540-smoke/browser/expression-and-capture-sources.mjs";
import {
  buildFailureCleanupRoutesSource,
  createActionExecutionCompiler,
  expandedRoute,
} from "./task-540-smoke/browser/route-and-action-sources.mjs";
import { assertScreenshotScenarioOwnership } from "./task-540-smoke/browser/scenarios/ownership.mjs";

const {
  buildSimpleBrowserInvocation,
  buildAuthRateWindowBarrierSource,
  buildAdvancedBrowserInvocation,
} = createSharedBrowserInvocationRuntime({ normalizeAuthRatePolicy });

const { buildButtonImageBrowserInvocation } = createButtonImageScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
  runCode,
});
const { buildTabsContentBrowserInvocation } = createTabsContentScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
});
const { buildTabsKeyboardBrowserInvocation } = createTabsKeyboardScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
});
const { buildSpaceSelectionBrowserInvocation } = createSpaceSelectionScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
});
const {
  buildRelatedCacheBrowserInvocation,
  relatedCacheOperationForAction,
  relatedCacheRouteKeyForAction,
} = createRelatedCacheScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
  runCode,
});
const { buildResponsiveUsersBrowserInvocation } = createResponsiveUsersScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
});
const {
  buildDirtyGuardsBrowserInvocation,
  dirtyGuardsOperationForAction,
  dirtyGuardsRouteKeyForAction,
  normalizeDirtyGuardsUnitSource,
} = createDirtyGuardsScenarioRuntime({
  buildSharedAdvancedBrowserInvocation: buildAdvancedBrowserInvocation,
  buildSharedSimpleBrowserInvocation: buildSimpleBrowserInvocation,
  runCode,
});

const { buildBrowserInvocation } = createBrowserInvocationRouter({
  buildAdvancedBrowserInvocation,
  buildButtonImageBrowserInvocation,
  buildDirtyGuardsBrowserInvocation,
  buildRelatedCacheBrowserInvocation,
  buildResponsiveUsersBrowserInvocation,
  buildSimpleBrowserInvocation,
  buildSpaceSelectionBrowserInvocation,
  buildTabsContentBrowserInvocation,
  buildTabsKeyboardBrowserInvocation,
  isButtonImageBrowserCandidate,
  isDirtyGuardsBrowserCandidate,
  isRelatedCacheBrowserCandidate,
  isResponsiveUsersBrowserCandidate,
  isSpaceSelectionBrowserCandidate,
  isTabsContentBrowserCandidate,
  isTabsKeyboardBrowserCandidate,
  normalizeDirtyGuardsUnitSource,
});

const { compileActionExecutionSpec, routeReceiptMetadata } = createActionExecutionCompiler({
  dirtyGuardsOperationForAction,
  dirtyGuardsRouteKeyForAction,
  relatedCacheOperationForAction,
  relatedCacheRouteKeyForAction,
});

const responseLostRegistry = createResponseLostRegistry({
  assertPlainJsonValue,
  runBunBridgeOperation,
});
const {
  PendingFailureAttemptRegistry,
  RESPONSE_LOST_CREATE_ACTION_IDS,
  RESPONSE_LOST_CREATE_DESCRIPTORS,
  RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
  discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
  responseLostStorageRoot,
  validateBoundedNaturalCandidateResult,
} = responseLostRegistry;
const { scanExactLocalStorageManifest } = createStorageManifestRuntime({
  readStableArtifactIdentity,
  responseLostStorageRoot,
  sameArtifactIdentity,
});
const {
  captureCanonicalMediaStorageOwnership,
  restoreIdentitySafeMediaAncestorDirectories,
} = createMediaStorageOwnershipRuntime({
  assertNoSymlinkAncestors,
  readStableArtifactIdentity,
  requireMissingPath,
  responseLostStorageRoot,
  sameArtifactIdentity,
});
const {
  armResponseLostCreateBeforeWrite,
  captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
} = createResponseLostBaselines({
  assertPlainJsonValue,
  contentSchemaFromFields,
  materializeScreenBody,
  registry: responseLostRegistry,
  resolveFixtureValue,
  runBunBridgeOperation,
});
const {
  discoverOneResponseLostCreate,
  registerFailureDiscoveredResourceAfterLedgerAppend,
} = createResponseLostDiscovery({
  assertPlainJsonValue,
  captureCanonicalMediaStorageOwnership,
  readOwnedRegularFileNoFollow,
  registry: responseLostRegistry,
});

const {
  createPrivateCleanupFailureDiagnostic,
  privateCleanupFailureDiagnosticNeverThrow,
  retainPrivateCleanupAggregateDiagnosticNeverThrow,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateCleanupOutcomeDiagnosticNeverThrow,
  selectPrivateCleanupFailureDiagnosticNeverThrow,
} = cleanupDiagnostics;
const {
  PRIVATE_CONSTRUCTION_AUTHORITY,
  PrivateConstructionCleanupAuthority,
  createPrivateConstructionCleanupAuthority,
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  privateConstructionAuthorityProjection,
} = createConstructionAuthorityRuntime({
  cleanupConstructionStateOnce,
  removePrivateWorkspaceLedger,
});

const failureBoundary = createFailureBoundaryRuntime({
  decodeExactNativeUtf8,
  validateCapabilityResult,
});
const {
  PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS,
  PRIVATE_FAILURE_ACTION_TRACKERS,
  PRIVATE_TONE_OPEN_FAILURE_DETAILS,
  PRIVATE_TONE_SELECT_FAILURE_CLASSES,
  beginPrivateFailureAction,
  buildPrivateBrowserInvocationWithAuthSettlementBoundary,
  classifyPrivateAuthSettlementFailureFrame,
  classifyPrivateDirtyNavigationFailureFrame,
  classifyPrivateToneOpenFailureFrame,
  classifyPrivateToneSelectFailureFrame,
  completePrivateFailureAction,
  createPrivateAuthSettlementFailure,
  createPrivateDirtyNavigationFailure,
  createPrivateFailureActionTracker,
  createPrivateToneOpenFailure,
  createPrivateToneSelectFailure,
  failPrivateAuthSettlementStage,
  finalizePrivateBrowserResultWithAuthSettlementBoundary,
  isExactAuthSettlementSuccessFrame,
  normalizePrivateBrowserOutputWithAuthSettlementBoundary,
  parsePrivateBrowserSuccessWithAuthSettlementBoundary,
  retainPrivateAuthSettlementFailureClassNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  retainPrivateToneOpenFailureClassNeverThrow,
  retainPrivateToneSelectFailureClassNeverThrow,
  sealPrivateFailureActionTracker,
} = failureBoundary;
const {
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateSynchronousFailureActionDiagnosticSink,
  createRealFailureActionDiagnosticSink,
  emitPrivateFailureActionDiagnosticNeverThrow,
  writePrivateFailureActionDiagnosticOnceNeverThrow,
} = createDiagnosticSinkRuntime({
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  failureBoundary,
});

const {
  PROCESS_KILL_GRACE_MS,
  runRetainedProcessGroup,
} = createBoundedStreamRuntime({
  delayMilliseconds,
  proveOwnedGroupAbsentStable,
  readFreshProcessIdentityWithRetry,
  terminateRetainedProcessGroup,
});

const {
  PRIVATE_BUN_EXECUTABLE_AUTHORITY,
  assertPreparedBunBridgeFrameExact,
  dryDispatchBunBridgeDescriptor,
  encodeBoundedBunBridgeCanonicalFrame,
  prepareBunBridgeDispatch,
  resolveValidatedBunExecutable,
  runBunBridge,
  validateBunExecutableAuthorityObservation,
} = createBunBridgeTransport({
  assertNoSymlinkAncestors,
  readStableArtifactIdentity,
  sameArtifactIdentity,
  validateBunBridgeInput,
  validateBunBridgeOperationDescriptor,
  runRetainedProcessGroup,
});

const {
  LocalCommandAuthority,
  buildBrowserStreamIntegrity,
  configuredSensitiveValues,
  rawBytesAreSensitive,
  shellDisplay,
} = createCommandAuthorityRuntime({
  failureBoundary,
  runRetainedProcessGroup,
});

const PRIVATE_CORE = new WeakMap();
const {
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  initializeBootstrapLoginAuthority,
  reconcileBootstrapLoginAuthority,
  runObservedBootstrapLoginAttempt,
  settleBootstrapLoginAttempt,
  validateBootstrapLoginObservation,
} = createBootstrapLoginRuntime({ delayMilliseconds, runBunBridgeOperation });
const PRIVATE_BUN_RESOURCE_DESCRIPTORS = new WeakMap();
const PRIVATE_BUN_OPERATION_DESCRIPTORS = new WeakMap();
const BROWSER_KINDS = new Set([
  "open",
  "logger-install",
  "goto",
  "resize",
  "fill",
  "click",
  "observe",
  "blocksBefore",
  "captureNew",
  "assert",
  "route",
  "screen",
  "media-count-before-release",
  "media-count-after-release",
  "logs",
  "focus",
  "press",
  "type",
  "dispatchAndCaptureSelectionHandle",
  "tab-new",
  "tab-select",
  "tab-close",
  "authRateWindowBarrier",
  "cleanup-release-unroute",
  "cleanup-route-list",
  "cleanup-console-errors",
  "cleanup-console-warnings",
  "cleanup-page-errors",
  "cleanup-close",
  "cleanup-session-absence",
]);

const RUNTIME_KINDS = new Set([
  "storage",
  "host",
  "health",
  "apiPublicRead",
  "settingsRead",
  "isolatedApiSessionLogin",
  "isolatedApiSessionCsrfCapture",
  "fixture",
  "fixtureRead",
  "api",
  "apiRead",
  "isolatedApiSessionApiReadAs",
  "isolatedApiSessionApiAs",
]);

function assertExecutionInput(input) {
  exactOwnKeys(input, INPUT_KEYS, "execution input", { plain: true });
  invariant(
    typeof input.root === "string" &&
      input.root.length > 1 &&
      !input.root.includes("\0") &&
      path.isAbsolute(input.root) &&
      path.resolve(input.root) === input.root,
    "root must be a canonical absolute repository path"
  );
  invariant(
    typeof input.nonce === "string" && NONCE_PATTERN.test(input.nonce),
    "nonce must be 12 lowercase hex characters"
  );
  invariant(
    typeof input.assertSafeEvidence === "function",
    "assertSafeEvidence must be a function"
  );
  invariant(
    typeof input.snapshotRepository === "function",
    "snapshotRepository must be a function"
  );
}

function assertRegisteredExecutable(plan, action) {
  const executable = action.executable;
  invariant(executable && typeof executable === "object", action.id + " executable is missing");
  if (executable.type === "runtime-operation") {
    const descriptor = plan.registries.runtimeOperations[executable.operationId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " runtime registry mismatch"
    );
  } else if (executable.type === "browser-run-code") {
    const descriptor = plan.registries.browserRunCodeSources[executable.sourceId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " run-code registry mismatch"
    );
  } else if (executable.type === "browser-native") {
    const descriptor = plan.registries.browserNativeOperations[executable.operationId];
    invariant(
      descriptor?.operationId === executable.operationId &&
        descriptor.actionIds.includes(action.id),
      action.id + " native registry mismatch"
    );
  } else if (executable.type === "browser-screenshot") {
    assertScreenshotScenarioOwnership(plan, action);
    const registeredPath = plan.registries.screenshotPaths[executable.screenshotId];
    invariant(
      typeof registeredPath === "string" &&
        action.repositoryMutationPolicy.mode === "allowlist" &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        action.repositoryMutationPolicy.paths[0] === registeredPath &&
        isSafeRepositoryRelativePath(registeredPath),
      action.id + " screenshot registry mismatch"
    );
  } else {
    invariant(
      executable.type === "browser-global-list" && action.id === "end-007-session-absence",
      action.id + " global-list registry mismatch"
    );
  }
  invariant(
    plan.registries.outputs[action.outputSchemaId] !== undefined,
    action.id + " output schema is missing"
  );
  return executable;
}

function fixtureCaptureValue(name, plan) {
  const numeric = String(plan.requiredCaptureNames.indexOf(name) + 1).padStart(12, "0");
  if (name === "media.resolved-url")
    return plan.fixtureBlueprint.origins.front + "/media/task-540/" + plan.prefix + ".png";
  if (name === "media.storage-key") return "task-540/" + plan.prefix + ".png";
  return "54000000-0000-4000-8000-" + numeric;
}

function buildFakeCapabilities({
  failOrdinal = null,
  terminalMatrix = false,
  failCleanupLifecycle = false,
  failFailureCleanup = false,
  cleanupFailureClass = "persistent_plan_failed",
} = {}) {
  invariant(
    PHASE_THREE_CLEANUP_FAILURE_CLASSES.includes(cleanupFailureClass),
    "fake cleanup failure class drift"
  );
  const calls = [];
  let cleaned = false;
  let browserSequence = 0;
  let runtimeSequence = 0;
  let fakeState = null;
  let coreCleanupContext = null;
  let lastFinalPlan = null;
  let lastFinalization = null;
  let lastPersistentPlan = null;
  let lastTerminalPlan = null;
  let cleanupPromise = null;
  let cleanupExecutions = 0;
  const capabilities = {
    calls,
    get cleaned() {
      return cleaned;
    },
    get cleanupExecutions() {
      return cleanupExecutions;
    },
    get lastFinalPlan() {
      return lastFinalPlan;
    },
    get lastFinalization() {
      return lastFinalization;
    },
    get lastPersistentPlan() {
      return lastPersistentPlan;
    },
    get lastTerminalPlan() {
      return lastTerminalPlan;
    },
    bindCoreCleanupAuthority(context) {
      invariant(coreCleanupContext === null, "fake core cleanup authority was assigned twice");
      coreCleanupContext = context;
    },
    registerActionResourcesAfterLedgerAppend(action, delta) {
      invariant(fakeState !== null, "fake post-ledger acquisition state is absent");
      registerSuccessfulActionResourcesAfterLedgerAppend(fakeState, action, delta);
    },
    settleResponseLostCreateAfterLedgerAppend(actionId) {
      invariant(
        RESPONSE_LOST_CREATE_DESCRIPTORS[actionId] !== undefined,
        "fake response-lost settlement origin drift"
      );
    },
    retainPrimaryFailureObservation() {},
    async executeAction({ action, plan, captures }) {
      calls.push(action.id);
      if (action.ordinal === failOrdinal) throw new Error("private fake failure detail");
      if (fakeState === null) {
        fakeState = {
          plan,
          bootstrapBaseline: { id: "54000000-0000-4000-8000-000000009999" },
          host: { identity: { pgid: 54000 } },
          browserWorkspace: { root: "/tmp/wf540-self-test-private" },
          fixtureIds: new Map(),
          resourceKeys: new Map(),
          resourceOwners: new Map(),
          syntheticOwnerEdgeKeys: new Set(),
        };
        initializeBunBridgeOperationAuthority(fakeState);
      }
      const captureBindings = {};
      for (const name of plan.fixtureCaptureBindings[action.id] ?? []) {
        captureBindings[name] = fixtureCaptureValue(name, plan);
      }
      for (const name of plan.runtimeCaptureBindings[action.id] ?? []) {
        captureBindings[name] = plan.prefix + "-" + name.replaceAll(".", "-");
      }
      const isRuntime = action.executable.type === "runtime-operation";
      const executionSpec = isRuntime ? null : compileActionExecutionSpec(action);
      const routeMetadata = isRuntime
        ? null
        : routeReceiptMetadata(action, executionSpec, plan, captures, {
            csrfHeaderName: "x-self-test-csrf",
          });
      const receipt = isRuntime
        ? {
            runnerVersion: 1,
            sequence: ++runtimeSequence,
            operation: canonicalManifestRuntimeOperation(action),
            operationDescriptor:
              action.id === "set-032-storage-post-setup"
                ? "db+storage:missing-media-absence"
                : action.id === "set-040-override-proof"
                  ? "admin-api:media-race-projection"
                  : action.executable.operationId,
            status: 0,
            evidenceSha256: hashBytes(Buffer.from("fake:" + action.id)),
            subjectKind:
              action.id === "set-032-storage-post-setup"
                ? "media-race-missing-media"
                : action.id === "set-040-override-proof"
                  ? "screen"
                  : null,
            subjectIdentifier:
              action.id === "set-032-storage-post-setup"
                ? plan.fixtureBlueprint.media.missingBoundMediaId
                : action.id === "set-040-override-proof"
                  ? fixtureCaptureValue("screen.id", plan)
                  : null,
            sanitizedOutput:
              action.id === "set-032-storage-post-setup"
                ? canonicalJson({ rowCount: 0, storageMatches: 0 })
                : action.id === "set-040-override-proof"
                  ? canonicalJson({
                      bindingCount: 1,
                      overrideCount: 1,
                      entryValueMatches: true,
                      safeUrlMatches: true,
                    })
                  : "{}",
          }
        : {
            runnerVersion: 1,
            sequence: ++browserSequence,
            kind: action.kind,
            scenario: action.scenario,
            operation: executionSpec.operation,
            routeKey: routeMetadata.routeKey,
            method: routeMetadata.method,
            pattern: routeMetadata.pattern,
            assertionName: action.kind === "assert" ? parseBuilder(action.builder).args[0] : null,
            command:
              action.executable.type === "browser-global-list"
                ? "playwright-cli --raw list"
                : "fake:" + action.id,
            status: 0,
            stdoutBytes: 0,
            stderrBytes: 0,
            stdoutSha256: hashBytes(Buffer.alloc(0)),
            stderrSha256: hashBytes(Buffer.alloc(0)),
            stdoutTruncated: false,
            stderrTruncated: false,
            sanitizedOutput: "{}",
            stdoutDiscarded: false,
            pageId: action.pageId,
            tabIndex: action.tabIndex,
          };
      const acquisitionDelta = deriveActionResourceDelta(
        fakeState,
        action,
        { captureBindings },
        captures
      );
      return deepFreezeExact({
        receipt: deepFreezeExact(receipt),
        captureBindings,
        acquisitionDelta,
        settledCreateOrigin: PROVEN_RESOURCE_ACTIONS[action.id]?.origin ?? null,
      });
    },
    async executeCleanupLifecycle({ plan, resourceLedger, cleanupPlanner }) {
      if (failCleanupLifecycle) {
        throw retainPrivateCleanupFailureDiagnosticNeverThrow(
          new Error("private fake cleanup lifecycle failure"),
          3,
          cleanupFailureClass
        );
      }
      for (const entrySemantic of TASK_FIXTURE_ENTRY_SEMANTICS) {
        const targetId = fixtureCaptureValue(plan.fixtureSubjectCapture[entrySemantic], plan);
        invariant(
          typeof fakeState.resourceKeys.get(entrySemantic) === "string",
          "fake SEO parent entry is absent"
        );
        fakeState.fixtureIds.set(entrySemantic, targetId);
      }
      const fakeSeoCandidates = deepFreezeExact(
        TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => ({
          id: `54000000-0000-4000-8000-${String(8004 + index).padStart(12, "0")}`,
          targetId: fakeState.fixtureIds.get(entrySemantic),
          targetType: "entry",
        })).sort(
          (left, right) =>
            left.targetId.localeCompare(right.targetId) || left.id.localeCompare(right.id)
        )
      );
      const fakeSeoTargetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) =>
        fakeState.fixtureIds.get(entrySemantic)
      );
      const fakeSeoCores = await discoverExactSeoEntryResources(
        fakeState,
        resourceLedger,
        async (targetIds) => {
          invariant(
            deepEqualJson(targetIds, fakeSeoTargetIds),
            "fake SEO exact target inventory drift"
          );
          return deepFreezeExact({ candidates: fakeSeoCandidates });
        },
        async () => {}
      );
      invariant(fakeSeoCores.length === 6, "fake SEO cleanup inventory drift");
      const persistentLedger = resourceLedger.compileResourceRecords("persistent");
      const persistentPlan = cleanupPlanner.freezePersistent(persistentLedger, []);
      lastPersistentPlan = persistentPlan;
      if (terminalMatrix) {
        const userAId = fixtureCaptureValue("user-a.id", plan);
        const userAKey = fakeState.resourceKeys.get("user-a");
        invariant(typeof userAKey === "string", "terminal matrix user parent is absent");
        const audit = createResourceCore({
          kind: "audit-log-task-ua",
          identifier: ["54000000-0000-4000-8000-000000008001"],
          ownerSubjectIdentifier: userAId,
          acquisitionSourceId: "terminal-task-ua-discovery",
          sourceActionOrdinal: null,
          acquisitionChannel: "terminal-db-delta",
        });
        const session = createResourceCore({
          kind: "session-task",
          identifier: ["54000000-0000-4000-8000-000000008002"],
          ownerSubjectIdentifier: userAId,
          acquisitionSourceId: "terminal-task-ua-discovery",
          sourceActionOrdinal: null,
          acquisitionChannel: "terminal-db-delta",
        });
        const access = createResourceCore({
          kind: "access-log-task-ua",
          identifier: ["54000000-0000-4000-8000-000000008003"],
          ownerSubjectIdentifier: session.identifier[0],
          acquisitionSourceId: "terminal-task-ua-discovery",
          sourceActionOrdinal: null,
          acquisitionChannel: "terminal-db-delta",
        });
        resourceLedger.appendValidatedDelta(
          deepFreezeExact({
            cores: deepFreezeExact([audit, access, session]),
            dependencyEdges: deepFreezeExact([
              destructiveResourceEdge(userAKey, audit.resourceKey),
              destructiveResourceEdge(userAKey, session.resourceKey),
              destructiveResourceEdge(session.resourceKey, access.resourceKey),
            ]),
          })
        );
      }
      const terminalLedger = resourceLedger.compileResourceRecords("terminal");
      const terminalPlan = cleanupPlanner.freezeTerminal(terminalLedger);
      lastTerminalPlan = terminalPlan;
      const finalLedger = resourceLedger.compileResourceRecords("final");
      const finalPlan = cleanupPlanner.freezeFinal(finalLedger);
      lastFinalPlan = finalPlan;
      invariant(
        finalPlan.persistentActionPlan === persistentPlan,
        "fake lifecycle persistent plan identity drift"
      );
      const recordByKey = finalRecordByKey(finalLedger);
      const fakeRuntimeReceipt = (
        operation,
        operationDescriptor,
        subjectKind,
        subjectIdentifier,
        output
      ) => {
        const bytes = Buffer.from(canonicalJson(output) + "\n");
        return deepFreezeExact({
          runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
          sequence: ++runtimeSequence,
          operation,
          operationDescriptor,
          status: 0,
          evidenceSha256: hashBytes(bytes),
          subjectKind,
          subjectIdentifier,
          sanitizedOutput: canonicalJson(output),
        });
      };
      const userKeys = new Set(
        finalLedger
          .filter(({ kind }) => kind === "user-a" || kind === "user-b")
          .map(({ resourceKey }) => resourceKey)
      );
      const orderedTuples = [
        ...persistentPlan.tuples.filter(([resourceKey]) => !userKeys.has(resourceKey)),
        ...terminalPlan.tuples,
        ...persistentPlan.tuples.filter(([resourceKey]) => userKeys.has(resourceKey)),
      ];
      assertExactCleanupTupleSet(orderedTuples, finalPlan.resourceKeys, "fake execution");
      const cleanupReceipts = orderedTuples.map(([resourceKey, operationKind]) => {
        const record = recordByKey.get(resourceKey);
        return fakeRuntimeReceipt(
          "cleanup-" + operationKind,
          record[
            operationKind === "provenance"
              ? "provenanceOpId"
              : operationKind === "delete"
                ? "cleanupOpId"
                : "absenceOpId"
          ],
          record.kind,
          record.identifier.length === 1
            ? record.identifier[0]
            : lengthPrefixedTuple(record.identifier),
          { ok: true }
        );
      });
      const phaseProofReceipts = [
        "api-contexts-close-and-prove",
        "terminal-task-ua-stable-delta",
        "bootstrap-login-state-restore",
        "media-race-missing-absence-cleanup",
        "final-storage-database-screenshot-proof",
        "host-runner-stop",
      ].map((operation) => {
        if (operation === "media-race-missing-absence-cleanup") {
          return fakeRuntimeReceipt(
            operation,
            "db+storage:missing-media-absence",
            "media-race-missing-media",
            plan.fixtureBlueprint.media.missingBoundMediaId,
            { rowCount: 0, storageMatches: 0 }
          );
        }
        if (operation === "host-runner-stop") {
          return fakeRuntimeReceipt(
            operation,
            "owned-process-group-and-ports-absence-v1",
            "host-runner",
            "54000",
            { termSent: true, killSent: false }
          );
        }
        return fakeRuntimeReceipt(operation, operation + "-v1", null, null, { ok: true });
      });
      for (const phase of ["before-delete", "after-delete"]) {
        for (const poll of [1, 2]) {
          for (const kind of ["audit", "access", "session"]) {
            phaseProofReceipts.push(
              fakeRuntimeReceipt(
                "terminal-" + kind + "-stable-poll",
                "terminal-task-ua-bounded-stable-poll-v1",
                "task-ua-" + kind,
                phase + ":" + poll,
                { phase, poll, rowCount: phase === "before-delete" && terminalMatrix ? 1 : 0 }
              )
            );
          }
        }
      }
      for (const processSubject of [
        { kind: "runner", pid: 54000 },
        { kind: "backend", pid: 54001 },
        { kind: "admin", pid: 54002 },
        { kind: "site", pid: 54003 },
      ]) {
        const subject =
          processSubject.kind === "runner"
            ? String(processSubject.pid)
            : processSubject.kind + ":" + processSubject.pid;
        phaseProofReceipts.push(
          fakeRuntimeReceipt(
            "pid-lineage",
            "owned-process-group-and-ports-absence-v1",
            "host-process",
            subject,
            { lineageValid: true }
          )
        );
        phaseProofReceipts.push(
          fakeRuntimeReceipt(
            "process-absence",
            "owned-process-group-and-ports-absence-v1",
            "host-process",
            subject,
            { absent: true, stableObservations: 2 }
          )
        );
      }
      for (const port of [3000, 5173, 5174]) {
        phaseProofReceipts.push(
          fakeRuntimeReceipt(
            "port-absence",
            "owned-process-group-and-ports-absence-v1",
            "host-port",
            String(port),
            { absent: true, stableObservations: 2 }
          )
        );
      }
      const phaseTrace = deepFreezeExact(
        Array.from({ length: 10 }, (_, index) => ({ phase: index + 1, completed: true }))
      );
      const fakeScreenshots = deepFreezeExact(
        plan.requiredScreenshotPaths.map((relative, index) => ({
          path: relative,
          size: 1024 + index,
          sha256: hashBytes(Buffer.from("fake-screenshot:" + relative)),
          dev: "540",
          ino: String(1000 + index),
        }))
      );
      const setupMissingSequence =
        plan.actionManifest
          .filter(({ executable }) => executable.type === "runtime-operation")
          .findIndex(({ id }) => id === "set-032-storage-post-setup") + 1;
      const cleanupMissingSequence = phaseProofReceipts.find(
        ({ operation }) => operation === "media-race-missing-absence-cleanup"
      ).sequence;
      calls.push(
        ...orderedTuples.map(([resourceKey, operationKind]) => operationKind + ":" + resourceKey)
      );
      calls.push("finalize");
      const lifecycle = deepFreezeExact({
        cleanupReceipts,
        mediaRace: deepFreezeExact({
          acquiredMedia: deepFreezeExact({
            id: fixtureCaptureValue("media.id", plan),
            canonicalSafeUrl: "/media/2026/07/54000000-0000-4000-8000-000000000777.png",
          }),
          missingBoundMediaId: plan.fixtureBlueprint.media.missingBoundMediaId,
          screenId: fixtureCaptureValue("screen.id", plan),
          entryId: fixtureCaptureValue("entry.id", plan),
          directImageBlockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          boundField: "raceImageId",
          override: deepFreezeExact({
            screenId: fixtureCaptureValue("screen.id", plan),
            entryId: fixtureCaptureValue("entry.id", plan),
            blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
            propPath: "mediaAssetId",
            mediaId: fixtureCaptureValue("media.id", plan),
          }),
        }),
        finalization: deepFreezeExact({
          apiContexts: deepFreezeExact({
            names: deepFreezeExact(["bootstrap", "user-a"]),
            closed: true,
            absenceProven: true,
          }),
          browserSession: deepFreezeExact({
            name: SESSION_NAME,
            closeReceiptSequence: 419,
            absenceReceiptSequence: 420,
            terminalListSha256: hashBytes(Buffer.from("  (no browsers)\n")),
            closed: true,
            absent: true,
          }),
          privateRoot: deepFreezeExact({
            outsideRepository: true,
            mode: "0700",
            identityRemoved: true,
            absent: true,
          }),
          host: deepFreezeExact({
            runnerPid: 54000,
            pgid: 54000,
            children: deepFreezeExact([
              { kind: "backend", pid: 54001 },
              { kind: "admin", pid: 54002 },
              { kind: "site", pid: 54003 },
            ]),
            listeners: deepFreezeExact([
              { kind: "backend", port: 3000, pid: 54001 },
              { kind: "admin", port: 5173, pid: 54002 },
              { kind: "site", port: 5174, pid: 54003 },
            ]),
            ports: deepFreezeExact([3000, 5173, 5174]),
            listenerOwnershipStableObservations: 2,
            termSent: true,
            killSent: false,
            processesAbsent: true,
            processAbsenceStableObservations: 2,
            portsAbsent: deepFreezeExact([3000, 5173, 5174]),
            portAbsenceStableObservations: 2,
          }),
          bootstrap: deepFreezeExact({
            id: "54000000-0000-4000-8000-000000009999",
            setupCompletedBeforeStart: true,
            casRestored: true,
            completeRowByteIdentical: true,
            roleTuplesByteIdentical: true,
          }),
          contentRoutes: deepFreezeExact({
            key: "site.contentRoutes",
            taskSlugsAbsentAtBaseline: true,
            byteIdenticalBeforeEachDelete: true,
            byteIdenticalAfterCleanup: true,
          }),
          settings: deepFreezeExact({ userAAbsent: true, userBAbsent: true }),
          storage: deepFreezeExact({
            driver: "local",
            rootIdentityByteIdentical: true,
            baselineManifestByteIdentical: true,
            acquiredMediaRowAbsent: true,
            acquiredStorageKeyAbsent: true,
            missingMedia: deepFreezeExact({
              id: plan.fixtureBlueprint.media.missingBoundMediaId,
              rowCount: 0,
              storageMatches: 0,
              setupReceiptSequence: setupMissingSequence,
              cleanupReceiptSequence: cleanupMissingSequence,
            }),
          }),
          taskTraffic: deepFreezeExact({
            baselineCounts: deepFreezeExact({ audit: 0, access: 0, session: 0 }),
            deltaCounts: deepFreezeExact({
              audit: terminalMatrix ? 1 : 0,
              access: terminalMatrix ? 1 : 0,
              session: terminalMatrix ? 1 : 0,
            }),
            deletedCounts: deepFreezeExact({
              audit: terminalMatrix ? 1 : 0,
              access: terminalMatrix ? 1 : 0,
              session: terminalMatrix ? 1 : 0,
            }),
            stablePollsBeforeDelete: 2,
            stablePollsAfterDelete: 2,
            returnedToBaseline: true,
          }),
          screenshots: fakeScreenshots,
          phaseProofReceipts: deepFreezeExact(phaseProofReceipts),
          phaseTrace,
        }),
        terminalLedger,
        terminalPlan,
        finalLedger,
        finalPlan,
        persistentLedger,
        persistentPlan,
        phaseTrace,
      });
      lastFinalization = lifecycle.finalization;
      return lifecycle;
    },
    cleanup(request) {
      if (cleanupPromise === null) {
        cleanupPromise = (async () => {
          cleanupExecutions += 1;
          cleaned = true;
          if (request?.failure === true) {
            calls.push("failure-cleanup");
            if (failFailureCleanup) {
              throw retainPrivateCleanupFailureDiagnosticNeverThrow(
                new Error("private fake failure cleanup detail"),
                3,
                cleanupFailureClass
              );
            }
            return deepFreezeExact({ absenceProven: true, lifecycle: null });
          }
          const lifecycle = await capabilities.executeCleanupLifecycle(request);
          return deepFreezeExact({ absenceProven: true, lifecycle });
        })();
      }
      return cleanupPromise;
    },
  };
  return capabilities;
}

function validateCapabilityResult(result, action, executable, plan) {
  exactOwnKeys(
    result,
    ["receipt", "captureBindings", "acquisitionDelta", "settledCreateOrigin"],
    action.id + " result"
  );
  assertRecursivelyFrozen(result);
  invariant(result.receipt.status === 0, action.id + " receipt mismatch");
  if (executable.type === "runtime-operation") {
    exactOwnKeys(result.receipt, RUNTIME_RECEIPT_KEYS, action.id + " runtime receipt", {
      plain: true,
    });
    const expectedOperation = canonicalManifestRuntimeOperation(action);
    invariant(
      result.receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        Number.isSafeInteger(result.receipt.sequence) &&
        result.receipt.sequence > 0 &&
        result.receipt.operation === expectedOperation &&
        typeof result.receipt.operationDescriptor === "string" &&
        result.receipt.operationDescriptor.length > 0 &&
        typeof result.receipt.evidenceSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.evidenceSha256) &&
        (result.receipt.subjectKind === null || typeof result.receipt.subjectKind === "string") &&
        (result.receipt.subjectIdentifier === null ||
          typeof result.receipt.subjectIdentifier === "string") &&
        typeof result.receipt.sanitizedOutput === "string" &&
        result.receipt.sanitizedOutput.length <= 4096,
      action.id + " runtime receipt contract drift"
    );
  } else {
    exactOwnKeys(result.receipt, BROWSER_RECEIPT_KEYS, action.id + " browser receipt", {
      plain: true,
    });
    invariant(
      result.receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        Number.isSafeInteger(result.receipt.sequence) &&
        result.receipt.sequence > 0 &&
        result.receipt.kind === action.kind &&
        result.receipt.scenario === action.scenario &&
        typeof result.receipt.operation === "string" &&
        result.receipt.operation.length > 0 &&
        (result.receipt.routeKey === null || typeof result.receipt.routeKey === "string") &&
        (result.receipt.method === null || typeof result.receipt.method === "string") &&
        (result.receipt.pattern === null || typeof result.receipt.pattern === "string") &&
        (result.receipt.assertionName === null ||
          typeof result.receipt.assertionName === "string") &&
        typeof result.receipt.command === "string" &&
        result.receipt.command.length > 0 &&
        Number.isSafeInteger(result.receipt.stdoutBytes) &&
        result.receipt.stdoutBytes >= 0 &&
        Number.isSafeInteger(result.receipt.stderrBytes) &&
        result.receipt.stderrBytes >= 0 &&
        typeof result.receipt.stdoutSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.stdoutSha256) &&
        typeof result.receipt.stderrSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(result.receipt.stderrSha256) &&
        result.receipt.stdoutTruncated === false &&
        result.receipt.stderrTruncated === false &&
        typeof result.receipt.sanitizedOutput === "string" &&
        typeof result.receipt.stdoutDiscarded === "boolean" &&
        (result.receipt.pageId === null ||
          /^wf540-page-[1-9][0-9]*$/u.test(result.receipt.pageId)) &&
        (result.receipt.tabIndex === null ||
          (Number.isSafeInteger(result.receipt.tabIndex) && result.receipt.tabIndex >= 0)),
      action.id + " browser receipt contract drift"
    );
    invariant(
      executable.type === "browser-global-list"
        ? result.receipt.pageId === null && result.receipt.tabIndex === null
        : result.receipt.pageId !== null && result.receipt.tabIndex !== null,
      action.id + " browser page identity drift"
    );
    if (executable.type === "browser-global-list") {
      invariant(
        result.receipt.command === "playwright-cli --raw list" &&
          result.receipt.operation === "cleanup-session-absence",
        action.id + " global-list receipt command drift"
      );
    }
  }
  exactOwnKeys(
    result.captureBindings,
    Object.keys(result.captureBindings),
    action.id + " captures",
    {
      plain: true,
    }
  );
  const allowed = [
    ...(plan.fixtureCaptureBindings[action.id] ?? []),
    ...(plan.runtimeCaptureBindings[action.id] ?? []),
  ];
  invariant(
    Object.keys(result.captureBindings).length === allowed.length &&
      Object.keys(result.captureBindings).every((name) => allowed.includes(name)),
    action.id + " returned an unauthorized capture"
  );
  exactOwnKeys(result.acquisitionDelta, RESOURCE_DELTA_KEYS, action.id + " acquisition delta", {
    plain: true,
  });
  const expectedSettledOrigin = PROVEN_RESOURCE_ACTIONS[action.id]?.origin ?? null;
  invariant(
    result.settledCreateOrigin === expectedSettledOrigin,
    action.id + " response-lost settlement drift"
  );
}

function acquiredSubjects(plan, captures) {
  return plan.requiredFixtureSubjectKeys.map((kind) => ({
    kind,
    id: captures.get(plan.fixtureSubjectCapture[kind]),
  }));
}

function assertCanonicalMediaRaceProjection(mediaRace, plan, captures) {
  exactOwnKeys(
    mediaRace,
    [
      "acquiredMedia",
      "missingBoundMediaId",
      "screenId",
      "entryId",
      "directImageBlockId",
      "boundField",
      "override",
    ],
    "media-race projection",
    { plain: true }
  );
  exactOwnKeys(mediaRace.acquiredMedia, ["id", "canonicalSafeUrl"], "media-race acquired media", {
    plain: true,
  });
  exactOwnKeys(
    mediaRace.override,
    ["screenId", "entryId", "blockId", "propPath", "mediaId"],
    "media-race override",
    { plain: true }
  );
  for (const [label, value] of [
    ["acquired media", mediaRace.acquiredMedia.id],
    ["missing media", mediaRace.missingBoundMediaId],
    ["screen", mediaRace.screenId],
    ["entry", mediaRace.entryId],
    ["override media", mediaRace.override.mediaId],
  ]) {
    invariant(
      typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value),
      label + " UUID drift"
    );
  }
  invariant(
    mediaRace.acquiredMedia.id === captures.get("media.id") &&
      mediaRace.missingBoundMediaId === plan.fixtureBlueprint.media.missingBoundMediaId &&
      mediaRace.screenId === captures.get("screen.id") &&
      mediaRace.entryId === captures.get("entry.id") &&
      mediaRace.directImageBlockId === plan.fixtureBlueprint.screen.blockIds.raceImage &&
      mediaRace.boundField === "raceImageId" &&
      mediaRace.override.screenId === mediaRace.screenId &&
      mediaRace.override.entryId === mediaRace.entryId &&
      mediaRace.override.blockId === mediaRace.directImageBlockId &&
      mediaRace.override.propPath === "mediaAssetId" &&
      mediaRace.override.mediaId === mediaRace.acquiredMedia.id &&
      mediaRace.acquiredMedia.id !== mediaRace.missingBoundMediaId &&
      captures.get("retry-screen.id") !== mediaRace.screenId,
    "media-race projection cross-binding drift"
  );
  invariant(
    /^\/media\/[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$/u.test(
      mediaRace.acquiredMedia.canonicalSafeUrl
    ) &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("..") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("\\") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("?") &&
      !mediaRace.acquiredMedia.canonicalSafeUrl.includes("#"),
    "media-race canonical safe URL drift"
  );
  assertRecursivelyFrozen(mediaRace);
  return mediaRace;
}

function assertCanonicalFinalization(finalization, plan) {
  exactOwnKeys(
    finalization,
    [
      "apiContexts",
      "browserSession",
      "privateRoot",
      "host",
      "bootstrap",
      "contentRoutes",
      "settings",
      "storage",
      "taskTraffic",
      "screenshots",
      "phaseProofReceipts",
      "phaseTrace",
    ],
    "canonical finalization",
    { plain: true }
  );
  exactOwnKeys(
    finalization.apiContexts,
    ["names", "closed", "absenceProven"],
    "final API contexts",
    { plain: true }
  );
  exactOwnKeys(
    finalization.browserSession,
    [
      "name",
      "closeReceiptSequence",
      "absenceReceiptSequence",
      "terminalListSha256",
      "closed",
      "absent",
    ],
    "final browser session",
    { plain: true }
  );
  exactOwnKeys(
    finalization.privateRoot,
    ["outsideRepository", "mode", "identityRemoved", "absent"],
    "final private root",
    { plain: true }
  );
  exactOwnKeys(
    finalization.host,
    [
      "runnerPid",
      "pgid",
      "children",
      "listeners",
      "ports",
      "listenerOwnershipStableObservations",
      "termSent",
      "killSent",
      "processesAbsent",
      "processAbsenceStableObservations",
      "portsAbsent",
      "portAbsenceStableObservations",
    ],
    "final host",
    { plain: true }
  );
  exactOwnKeys(
    finalization.bootstrap,
    [
      "id",
      "setupCompletedBeforeStart",
      "casRestored",
      "completeRowByteIdentical",
      "roleTuplesByteIdentical",
    ],
    "final bootstrap",
    { plain: true }
  );
  exactOwnKeys(
    finalization.contentRoutes,
    [
      "key",
      "taskSlugsAbsentAtBaseline",
      "byteIdenticalBeforeEachDelete",
      "byteIdenticalAfterCleanup",
    ],
    "final content routes",
    { plain: true }
  );
  exactOwnKeys(finalization.settings, ["userAAbsent", "userBAbsent"], "final settings", {
    plain: true,
  });
  exactOwnKeys(
    finalization.storage,
    [
      "driver",
      "rootIdentityByteIdentical",
      "baselineManifestByteIdentical",
      "acquiredMediaRowAbsent",
      "acquiredStorageKeyAbsent",
      "missingMedia",
    ],
    "final storage",
    { plain: true }
  );
  exactOwnKeys(
    finalization.storage.missingMedia,
    ["id", "rowCount", "storageMatches", "setupReceiptSequence", "cleanupReceiptSequence"],
    "final missing media",
    { plain: true }
  );
  exactOwnKeys(
    finalization.taskTraffic,
    [
      "baselineCounts",
      "deltaCounts",
      "deletedCounts",
      "stablePollsBeforeDelete",
      "stablePollsAfterDelete",
      "returnedToBaseline",
    ],
    "final task traffic",
    { plain: true }
  );
  for (const key of ["baselineCounts", "deltaCounts", "deletedCounts"]) {
    exactOwnKeys(
      finalization.taskTraffic[key],
      ["audit", "access", "session"],
      "final task traffic " + key,
      { plain: true }
    );
    invariant(
      Object.values(finalization.taskTraffic[key]).every(
        (value) => Number.isSafeInteger(value) && value >= 0
      ),
      "final task traffic count drift"
    );
  }
  for (const [index, row] of finalization.host.children.entries()) {
    exactOwnKeys(row, ["kind", "pid"], "final host child[" + index + "]", { plain: true });
  }
  for (const [index, row] of finalization.host.listeners.entries()) {
    exactOwnKeys(row, ["kind", "pid", "port"], "final host listener[" + index + "]", {
      plain: true,
    });
  }
  for (const [index, row] of finalization.screenshots.entries()) {
    exactOwnKeys(row, ["dev", "ino", "path", "sha256", "size"], "final screenshot[" + index + "]", {
      plain: true,
    });
  }
  for (const [index, row] of finalization.phaseTrace.entries()) {
    exactOwnKeys(row, ["completed", "phase"], "final phase trace[" + index + "]", { plain: true });
  }
  for (const [index, receipt] of finalization.phaseProofReceipts.entries()) {
    exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, "final phase proof receipt[" + index + "]", {
      plain: true,
    });
  }
  invariant(
    deepEqualJson(finalization.apiContexts.names, ["bootstrap", "user-a"]) &&
      finalization.apiContexts.closed === true &&
      finalization.apiContexts.absenceProven === true &&
      finalization.browserSession.name === SESSION_NAME &&
      finalization.browserSession.closeReceiptSequence === 419 &&
      finalization.browserSession.absenceReceiptSequence === 420 &&
      finalization.browserSession.terminalListSha256 ===
        hashBytes(Buffer.from("  (no browsers)\n")) &&
      finalization.browserSession.closed === true &&
      finalization.browserSession.absent === true &&
      deepEqualJson(finalization.privateRoot, {
        outsideRepository: true,
        mode: "0700",
        identityRemoved: true,
        absent: true,
      }) &&
      finalization.bootstrap.setupCompletedBeforeStart === true &&
      finalization.bootstrap.casRestored === true &&
      finalization.bootstrap.completeRowByteIdentical === true &&
      finalization.bootstrap.roleTuplesByteIdentical === true &&
      finalization.contentRoutes.key === "site.contentRoutes" &&
      finalization.contentRoutes.taskSlugsAbsentAtBaseline === true &&
      finalization.contentRoutes.byteIdenticalBeforeEachDelete === true &&
      finalization.contentRoutes.byteIdenticalAfterCleanup === true &&
      finalization.settings.userAAbsent === true &&
      finalization.settings.userBAbsent === true &&
      finalization.storage.driver === "local" &&
      finalization.storage.rootIdentityByteIdentical === true &&
      finalization.storage.baselineManifestByteIdentical === true &&
      finalization.storage.acquiredMediaRowAbsent === true &&
      finalization.storage.acquiredStorageKeyAbsent === true &&
      finalization.storage.missingMedia.id === plan.fixtureBlueprint.media.missingBoundMediaId &&
      finalization.storage.missingMedia.rowCount === 0 &&
      finalization.storage.missingMedia.storageMatches === 0 &&
      deepEqualJson(finalization.taskTraffic.deltaCounts, finalization.taskTraffic.deletedCounts) &&
      Number.isSafeInteger(finalization.taskTraffic.stablePollsBeforeDelete) &&
      finalization.taskTraffic.stablePollsBeforeDelete >= 2 &&
      finalization.taskTraffic.stablePollsBeforeDelete <= 80 &&
      finalization.taskTraffic.stablePollsAfterDelete === 2 &&
      finalization.taskTraffic.returnedToBaseline === true,
    "canonical finalization proof drift"
  );
  const expectedChildren = ["backend", "admin", "site"];
  invariant(
    Number.isSafeInteger(finalization.host.runnerPid) &&
      finalization.host.runnerPid > 1 &&
      finalization.host.pgid === finalization.host.runnerPid &&
      finalization.host.children.length === 3 &&
      finalization.host.children.every(
        (row, index) =>
          row.kind === expectedChildren[index] && Number.isSafeInteger(row.pid) && row.pid > 1
      ) &&
      finalization.host.listeners.length === 3 &&
      finalization.host.listeners.every(
        (row, index) =>
          row.kind === expectedChildren[index] &&
          row.pid === finalization.host.children[index].pid &&
          row.port === SMOKE_PORTS[index]
      ) &&
      deepEqualJson(finalization.host.ports, SMOKE_PORTS) &&
      deepEqualJson(finalization.host.portsAbsent, SMOKE_PORTS) &&
      finalization.host.listenerOwnershipStableObservations === 2 &&
      finalization.host.processesAbsent === true &&
      finalization.host.processAbsenceStableObservations === 2 &&
      finalization.host.portAbsenceStableObservations === 2 &&
      typeof finalization.host.termSent === "boolean" &&
      typeof finalization.host.killSent === "boolean",
    "canonical host finalization drift"
  );
  invariant(
    finalization.screenshots.length === plan.requiredScreenshotPaths.length &&
      finalization.phaseTrace.length === 10 &&
      finalization.phaseTrace.every(
        ({ phase, completed }, index) => phase === index + 1 && completed === true
      ),
    "canonical finalization matrix drift"
  );
  const expectedProcessSubjects = [
    String(finalization.host.runnerPid),
    ...finalization.host.children.map(({ kind, pid }) => kind + ":" + pid),
  ];
  const hostStopReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "host-runner-stop"
  );
  const lineageReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "pid-lineage"
  );
  const processAbsenceReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "process-absence"
  );
  const portAbsenceReceipts = finalization.phaseProofReceipts.filter(
    ({ operation }) => operation === "port-absence"
  );
  invariant(
    hostStopReceipts.length === 1 &&
      hostStopReceipts[0].subjectIdentifier === String(finalization.host.runnerPid) &&
      deepEqualJson(
        lineageReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        expectedProcessSubjects
      ) &&
      deepEqualJson(
        processAbsenceReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        expectedProcessSubjects
      ) &&
      deepEqualJson(
        portAbsenceReceipts.map(({ subjectIdentifier }) => subjectIdentifier),
        SMOKE_PORTS.map(String)
      ),
    "canonical host proof receipt set drift"
  );
  assertRecursivelyFrozen(finalization);
  return finalization;
}

function assertCanonicalMediaRuntimeReceipts(runtimeReceipts, mediaRace, finalization) {
  const byOperation = (operation) =>
    runtimeReceipts.filter((receipt) => receipt.operation === operation);
  const setup = byOperation("media-race-missing-absence-setup");
  const projection = byOperation("media-race-projection-provenance");
  const cleanup = byOperation("media-race-missing-absence-cleanup");
  invariant(
    setup.length === 1 && projection.length === 1 && cleanup.length === 1,
    "media-race runtime receipt cardinality drift"
  );
  const expectedMissingOutput = canonicalJson({ rowCount: 0, storageMatches: 0 });
  invariant(
    setup[0].operationDescriptor === "db+storage:missing-media-absence" &&
      cleanup[0].operationDescriptor === "db+storage:missing-media-absence" &&
      setup[0].subjectKind === "media-race-missing-media" &&
      cleanup[0].subjectKind === "media-race-missing-media" &&
      setup[0].subjectIdentifier === mediaRace.missingBoundMediaId &&
      cleanup[0].subjectIdentifier === mediaRace.missingBoundMediaId &&
      setup[0].sanitizedOutput === expectedMissingOutput &&
      cleanup[0].sanitizedOutput === expectedMissingOutput &&
      setup[0].evidenceSha256 !== cleanup[0].evidenceSha256 &&
      projection[0].operationDescriptor === "admin-api:media-race-projection" &&
      projection[0].subjectKind === "screen" &&
      projection[0].subjectIdentifier === mediaRace.screenId &&
      projection[0].sanitizedOutput ===
        canonicalJson({
          bindingCount: 1,
          overrideCount: 1,
          entryValueMatches: true,
          safeUrlMatches: true,
        }) &&
      projection[0].evidenceSha256 !== hashBytes(Buffer.from(projection[0].sanitizedOutput)) &&
      finalization.storage.missingMedia.setupReceiptSequence === setup[0].sequence &&
      finalization.storage.missingMedia.cleanupReceiptSequence === cleanup[0].sequence &&
      setup[0].sequence < projection[0].sequence &&
      projection[0].sequence < cleanup[0].sequence,
    "media-race runtime receipt binding drift"
  );
}

function assertCanonicalPrimaryRuntimeInventory(runtimeReceipts, finalization, finalPlan) {
  const byOperation = (operation) =>
    runtimeReceipts.filter((receipt) => receipt.operation === operation);
  for (const operation of [
    "fixture-setup",
    "host-runner-launch",
    "admin-health",
    "front-health",
    "host-runner-stop",
  ]) {
    invariant(
      byOperation(operation).length === 1,
      operation + " primary runtime receipt cardinality drift"
    );
  }
  for (const kind of ["audit", "access", "session"]) {
    const receipts = byOperation("terminal-" + kind + "-stable-poll");
    const before = receipts.filter(({ subjectIdentifier }) =>
      subjectIdentifier.startsWith("before-delete:")
    );
    const after = receipts.filter(({ subjectIdentifier }) =>
      subjectIdentifier.startsWith("after-delete:")
    );
    invariant(
      before.length === finalization.taskTraffic.stablePollsBeforeDelete &&
        after.length === 2 &&
        before.every(
          (receipt, index) => receipt.subjectIdentifier === "before-delete:" + (index + 1)
        ) &&
        after.every(
          (receipt, index) => receipt.subjectIdentifier === "after-delete:" + (index + 1)
        ),
      kind + " terminal poll runtime receipt drift"
    );
  }
  invariant(
    byOperation("cleanup-provenance").length === finalPlan.resourceKeys.length &&
      byOperation("cleanup-absence").length === finalPlan.resourceKeys.length &&
      runtimeReceipts.every(
        ({ sanitizedOutput, evidenceSha256 }) =>
          typeof sanitizedOutput === "string" &&
          sanitizedOutput.length <= 4096 &&
          evidenceSha256 !== hashBytes(Buffer.from(sanitizedOutput))
      ),
    "primary cleanup runtime receipt inventory/hash drift"
  );
}

function assertCleanupReceiptBijection(finalPlan, cleanupReceipts) {
  invariant(
    cleanupReceipts.length === finalPlan.actionTuples.length,
    "cleanup receipt/final tuple cardinality drift"
  );
  const actual = cleanupReceipts.map((receipt) => {
    exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, "cleanup receipt", { plain: true });
    invariant(
      receipt.runnerVersion === ORCHESTRATOR_EVIDENCE_RUNNER_VERSION &&
        receipt.status === 0 &&
        Number.isSafeInteger(receipt.sequence) &&
        receipt.sequence > 0 &&
        receipt.operation.startsWith("cleanup-") &&
        typeof receipt.subjectIdentifier === "string",
      "cleanup receipt contract drift"
    );
    const operationKind = receipt.operation.slice("cleanup-".length);
    invariant(CLEANUP_OPERATION_KINDS.includes(operationKind), "cleanup receipt operation drift");
    const operationField =
      operationKind === "provenance"
        ? "provenanceOpId"
        : operationKind === "delete"
          ? "cleanupOpId"
          : "absenceOpId";
    const matches = finalPlan.ledger.filter(
      (record) => record[operationField] === receipt.operationDescriptor
    );
    invariant(matches.length === 1, "cleanup receipt operation descriptor is not bijective");
    const [record] = matches;
    const expectedSubject =
      record.identifier.length === 1
        ? record.identifier[0]
        : lengthPrefixedTuple(record.identifier);
    invariant(
      receipt.subjectKind === record.kind && receipt.subjectIdentifier === expectedSubject,
      "cleanup receipt exact subject drift"
    );
    return [record.resourceKey, operationKind];
  });
  const encode = (tuple) => lengthPrefixedTuple(tuple);
  const expectedSet = new Set(finalPlan.actionTuples.map(encode));
  const actualKeys = actual.map(encode);
  invariant(
    new Set(actualKeys).size === actualKeys.length &&
      actualKeys.length === expectedSet.size &&
      actualKeys.every((key) => expectedSet.has(key)) &&
      deepEqualJson(actual, finalPlan.actionTuples),
    "cleanup receipt/final tuple bijection drift"
  );
}

function buildCanonicalRouteEvidence(plan, actionReceiptPairs, captures) {
  const rows = [];
  for (const [routeKey, descriptor] of Object.entries(plan.registries.routes)) {
    const expected = expandedRoute(plan, routeKey, captures, {
      csrfHeaderName: "x-redacted-csrf-name",
    });
    const routePairs = actionReceiptPairs.filter(({ receipt }) => receipt.routeKey === routeKey);
    const pairs = routePairs.filter(({ receipt }) =>
      descriptor.operations.includes(receipt.operation)
    );
    invariant(
      pairs.length === descriptor.operations.length,
      routeKey + " route operation receipt set is not exact"
    );
    const requiredOperations = pairs;
    invariant(
      requiredOperations.length === descriptor.operations.length &&
        descriptor.operations.every(
          (operation) =>
            requiredOperations.filter(({ receipt }) => receipt.operation === operation).length === 1
        ),
      routeKey + " route operation set drift"
    );
    for (const { receipt } of routePairs) {
      invariant(
        receipt.method === expected.method && receipt.pattern === expected.pattern,
        routeKey + " route receipt metadata drift"
      );
    }
    const retryActionId =
      routeKey === "entry-save-failure"
        ? "dg-035-real-retry"
        : routeKey === "related-first-failure"
          ? "rc-011-visible-retry"
          : null;
    const retryPair =
      retryActionId === null
        ? null
        : actionReceiptPairs.find(({ action }) => action.id === retryActionId);
    invariant(
      retryActionId === null || retryPair !== undefined,
      routeKey + " real retry receipt is absent"
    );
    const operations = pairs.map(({ action, receipt }) =>
      deepFreezeExact({
        actionId: action.id,
        sequence: receipt.sequence,
        operation: receipt.operation,
        sanitizedOutput: receipt.sanitizedOutput,
      })
    );
    if (retryPair !== null) {
      operations.push(
        deepFreezeExact({
          actionId: retryPair.action.id,
          sequence: retryPair.receipt.sequence,
          operation: "real-retry",
          sanitizedOutput: retryPair.receipt.sanitizedOutput,
        })
      );
    }
    rows.push(
      deepFreezeExact({
        key: routeKey,
        mode: descriptor.mode,
        method: expected.method,
        pattern: expected.pattern,
        hitCount: 1,
        operations: deepFreezeExact(operations),
      })
    );
  }
  invariant(rows.length === 6, "route evidence cardinality drift");
  return deepFreezeExact(rows);
}

function buildCanonicalScenarioEvidence(plan, actionReceiptPairs, finalization) {
  const screenshotByPath = new Map(finalization.screenshots.map((row) => [row.path, row]));
  const assertionsSeen = [];
  const themesByScenario = {
    "button-image": ["light"],
    "tabs-content": ["dark"],
    "tabs-keyboard-aria": ["light"],
    "space-selection": ["dark"],
    "dirty-guards": ["light", "dark"],
    "related-retry-cache": ["dark"],
    "responsive-users": ["light", "dark"],
  };
  const viewportReceiptBindings = {
    "button-image": [{ actionId: "bi-002-resize", width: 1280, height: 900 }],
    "tabs-content": [{ actionId: "tc-006-resize", width: 1280, height: 900 }],
    "tabs-keyboard-aria": [{ actionId: "tk-003-resize", width: 1024, height: 900 }],
    "space-selection": [{ actionId: "ss-010-resize", width: 1024, height: 900 }],
    "dirty-guards": [{ actionId: "dg-006-resize", width: 1280, height: 900 }],
    "related-retry-cache": [{ actionId: "dg-006-resize", width: 1280, height: 900 }],
    "responsive-users": [
      { actionId: "ru-008-resize-320", width: 320, height: 844 },
      { actionId: "ru-013-resize-390", width: 390, height: 844 },
      { actionId: "ru-018-resize-480", width: 480, height: 844 },
      { actionId: "ru-023-resize-1024", width: 1024, height: 900 },
      { actionId: "ru-028-resize-1280", width: 1280, height: 900 },
    ],
  };
  const scenarios = plan.requiredScenarios.map((scenarioId) => {
    const pairs = actionReceiptPairs.filter(({ action }) => action.scenario === scenarioId);
    const expectedAssertions = plan.requiredAssertions[scenarioId];
    invariant(Array.isArray(expectedAssertions), scenarioId + " assertion registry is absent");
    const visibleAssertions = expectedAssertions.map((assertionName) => {
      const matches = pairs.filter(({ receipt }) => receipt.assertionName === assertionName);
      invariant(
        matches.length === 1,
        scenarioId + ":" + assertionName + " receipt cardinality drift"
      );
      const [{ action, receipt }] = matches;
      assertionsSeen.push(assertionName);
      return deepFreezeExact({
        name: assertionName,
        actionId: action.id,
        sequence: receipt.sequence,
        sanitizedOutput: receipt.sanitizedOutput,
      });
    });
    const screenshots = pairs
      .filter(({ action }) => action.executable.type === "browser-screenshot")
      .map(({ action, receipt }) => {
        const relative = plan.registries.screenshotPaths[action.executable.screenshotId];
        const identity = screenshotByPath.get(relative);
        invariant(identity !== undefined, scenarioId + " screenshot identity is absent");
        return deepFreezeExact({ actionId: action.id, sequence: receipt.sequence, ...identity });
      });
    const logs = pairs
      .filter(({ action }) => action.kind === "logs")
      .map(({ action, receipt }) => {
        const ast = parseBuilder(action.builder);
        invariant(ast.callee === "logs" && ast.args.length === 2, action.id + " log builder drift");
        return deepFreezeExact({
          actionId: action.id,
          sequence: receipt.sequence,
          scope: ast.args[0],
          channel: ast.args[1],
          sanitizedOutput: receipt.sanitizedOutput,
        });
      });
    invariant(logs.length === 6, scenarioId + " log evidence cardinality drift");
    const linkedReceipts = pairs.map(({ action, receipt, lane }) =>
      deepFreezeExact({
        actionId: action.id,
        lane,
        sequence: receipt.sequence,
      })
    );
    const viewports = viewportReceiptBindings[scenarioId].map(({ actionId, width, height }) => {
      const matches = actionReceiptPairs.filter(({ action }) => action.id === actionId);
      invariant(matches.length === 1, scenarioId + " exact viewport receipt cardinality drift");
      const [pair] = matches;
      const ast = parseBuilder(pair.action.builder);
      invariant(
        pair.action.kind === "resize" &&
          ast.callee === "resize" &&
          deepEqualJson(ast.args.map(resolveLiteral), [width, height]) &&
          pair.receipt.operation === "resize" &&
          pair.action.executable.sourceId === "run-code/" + actionId &&
          (pair.action.scenario === scenarioId ||
            (scenarioId === "related-retry-cache" && pair.action.scenario === "dirty-guards")),
        scenarioId + " exact viewport receipt binding drift"
      );
      return deepFreezeExact({ actionId, width, height, sequence: pair.receipt.sequence });
    });
    const routeHits = pairs
      .filter(({ receipt }) => receipt.routeKey !== null && receipt.operation === "route-hit-read")
      .map(({ receipt }) =>
        deepFreezeExact({ key: receipt.routeKey, count: 1, sequence: receipt.sequence })
      );
    return deepFreezeExact({
      id: scenarioId,
      themes: deepFreezeExact(themesByScenario[scenarioId]),
      viewports: deepFreezeExact(viewports),
      linkedReceipts: deepFreezeExact(linkedReceipts),
      routeHits: deepFreezeExact(routeHits),
      visibleAssertions: deepFreezeExact(visibleAssertions),
      logs: deepFreezeExact(logs),
      screenshots: deepFreezeExact(screenshots),
    });
  });
  invariant(
    scenarios.length === 7 && assertionsSeen.length === 55 && new Set(assertionsSeen).size === 55,
    "scenario/assertion evidence cardinality drift"
  );
  return deepFreezeExact(scenarios);
}

async function executeSmokePlanCore(
  plan,
  capabilities,
  constructionCleanupAuthority = null,
  failureActionTracker = null
) {
  assertRecursivelyFrozen(plan);
  const captures = new SingleAssignmentCaptureMap();
  const resourceLedger = new ResourceLedgerBuilder();
  const cleanupPlanner = new ResourceCleanupPlanner();
  const completed = new Set();
  const browserReceipts = [];
  const runtimeReceipts = [];
  const actionReceiptPairs = [];
  const state = { route: "absent", terminalCleanupStarted: false };
  PRIVATE_CORE.set(state, { capabilities, captures });
  invariant(
    typeof capabilities.bindCoreCleanupAuthority === "function",
    "core cleanup authority binder is missing"
  );
  capabilities.bindCoreCleanupAuthority({
    plan,
    captures,
    resourceLedger,
    cleanupPlanner,
  });
  try {
    for (const action of plan.actionManifest) {
      if (failureActionTracker !== null) beginPrivateFailureAction(failureActionTracker, action);
      const executable = assertRegisteredExecutable(plan, action);
      invariant(
        action.assertionDependencies.every((dependency) => completed.has(dependency)),
        action.id + " dependency not completed"
      );
      if (action.routeStateBefore !== "all terminal") {
        invariant(action.routeStateBefore === state.route, action.id + " route state mismatch");
      }
      const result = await capabilities.executeAction({ action, executable, plan, captures });
      validateCapabilityResult(result, action, executable, plan);
      resourceLedger.appendValidatedDelta(result.acquisitionDelta);
      invariant(
        typeof capabilities.registerActionResourcesAfterLedgerAppend === "function",
        "post-ledger acquisition registrar is missing"
      );
      capabilities.registerActionResourcesAfterLedgerAppend(action, result.acquisitionDelta);
      if (result.settledCreateOrigin !== null) {
        invariant(
          typeof capabilities.settleResponseLostCreateAfterLedgerAppend === "function",
          "response-lost settlement authority is missing"
        );
        capabilities.settleResponseLostCreateAfterLedgerAppend(result.settledCreateOrigin);
      }
      for (const [name, value] of Object.entries(result.captureBindings))
        captures.bind(name, value);
      state.route = action.routeStateAfter;
      completed.add(action.id);
      if (executable.type === "runtime-operation") {
        runtimeReceipts.push(result.receipt);
        actionReceiptPairs.push({ action, receipt: result.receipt, lane: "runtime" });
      } else {
        browserReceipts.push(result.receipt);
        actionReceiptPairs.push({ action, receipt: result.receipt, lane: "browser" });
      }
      if (failureActionTracker !== null) {
        completePrivateFailureAction(failureActionTracker, action);
      }
    }
    if (failureActionTracker !== null) sealPrivateFailureActionTracker(failureActionTracker);
    invariant(state.route === "absent", "static manifest left an active route");
    invariant(
      completed.size === 496 && browserReceipts.length === 420 && runtimeReceipts.length === 76,
      "manifest receipt partition cardinality drift"
    );
    invariant(
      browserReceipts.every((receipt, index) => receipt.sequence === index + 1) &&
        runtimeReceipts.every((receipt, index) => receipt.sequence === index + 1),
      "browser/runtime receipt sequence is not separately contiguous"
    );
    invariant(
      browserReceipts[0].operation === "open" &&
        browserReceipts[1].operation === "logger-install" &&
        browserReceipts.at(-1).sequence === 420 &&
        browserReceipts.at(-1).operation === "cleanup-session-absence",
      "browser receipt terminal anchors drift"
    );
    const cleanupRequest = deepFreezeExact({
      plan,
      captures,
      resourceLedger,
      cleanupPlanner,
      failure: false,
    });
    const cleanupOutcome =
      constructionCleanupAuthority !== null
        ? await constructionCleanupAuthority.cleanupWhateverWasAcquiredOnceNeverThrow(
            cleanupRequest
          )
        : await capabilities.cleanup(cleanupRequest);
    exactOwnKeys(cleanupOutcome, ["absenceProven", "lifecycle"], "cleanup once outcome", {
      plain: true,
    });
    invariant(
      cleanupOutcome.absenceProven === true && cleanupOutcome.lifecycle !== null,
      "cleanup lifecycle did not complete"
    );
    const lifecycle = cleanupOutcome.lifecycle;
    exactOwnKeys(
      lifecycle,
      [
        "cleanupReceipts",
        "mediaRace",
        "finalization",
        "persistentLedger",
        "persistentPlan",
        "terminalLedger",
        "terminalPlan",
        "finalLedger",
        "finalPlan",
        "phaseTrace",
      ],
      "cleanup lifecycle result",
      { plain: true }
    );
    invariant(
      lifecycle.finalPlan.persistentActionPlan === lifecycle.persistentPlan &&
        lifecycle.finalPlan.terminalActionPlan === lifecycle.terminalPlan,
      "cleanup lifecycle substituted a stage plan"
    );
    assertCleanupReceiptBijection(lifecycle.finalPlan, lifecycle.cleanupReceipts);
    const canonicalRuntimeReceipts = deepFreezeExact(
      [
        ...runtimeReceipts,
        ...lifecycle.cleanupReceipts,
        ...lifecycle.finalization.phaseProofReceipts,
      ].sort((left, right) => left.sequence - right.sequence)
    );
    invariant(
      canonicalRuntimeReceipts.every((receipt, index) => receipt.sequence === index + 1) &&
        canonicalRuntimeReceipts
          .slice(0, runtimeReceipts.length)
          .every((receipt, index) => receipt === runtimeReceipts[index]),
      "canonical runtime receipt sequence is not contiguous from the 76-row manifest prefix"
    );
    const subjects = acquiredSubjects(plan, captures);
    const routes = buildCanonicalRouteEvidence(plan, actionReceiptPairs, captures);
    const canonicalFinalization = assertCanonicalFinalization(lifecycle.finalization, plan);
    const canonicalMediaRace = assertCanonicalMediaRaceProjection(
      lifecycle.mediaRace,
      plan,
      captures
    );
    assertCanonicalMediaRuntimeReceipts(
      canonicalRuntimeReceipts,
      canonicalMediaRace,
      canonicalFinalization
    );
    assertCanonicalPrimaryRuntimeInventory(
      canonicalRuntimeReceipts,
      canonicalFinalization,
      lifecycle.finalPlan
    );
    const scenarios = buildCanonicalScenarioEvidence(
      plan,
      actionReceiptPairs,
      canonicalFinalization
    );
    const safeResources = lifecycle.finalLedger.map((record) =>
      deepFreezeExact({
        resourceKey: record.resourceKey,
        kind: record.kind,
        class: record.class,
        acquisitionOrdinal: record.acquisitionOrdinal,
        sourceActionOrdinal: record.sourceActionOrdinal,
        cleanupPhase: record.cleanupPhase,
        cleanupPolicy: record.cleanupPolicy,
        dependsOn: record.dependsOn,
      })
    );
    const evidence = deepFreezeExact({
      schemaVersion: 1,
      pass: true,
      prefix: plan.prefix,
      manifestSha256: hashBytes(Buffer.from(canonicalJson(plan.actionManifest))),
      browserReceipts,
      runtimeReceipts: canonicalRuntimeReceipts,
      routes,
      fixtureSubjects: subjects,
      mediaRace: canonicalMediaRace,
      cleanupReceipts: lifecycle.cleanupReceipts,
      resources: safeResources,
      scenarios,
      finalization: canonicalFinalization,
      captureProjection: captures.safeProjection([
        ...plan.requiredCaptureNames,
        ...plan.requiredRuntimeBlockCaptures,
      ]),
    });
    exactOwnKeys(
      evidence,
      [
        "schemaVersion",
        "pass",
        "prefix",
        "manifestSha256",
        "browserReceipts",
        "runtimeReceipts",
        "routes",
        "fixtureSubjects",
        "mediaRace",
        "cleanupReceipts",
        "resources",
        "scenarios",
        "finalization",
        "captureProjection",
      ],
      "canonical smoke evidence",
      { plain: true }
    );
    assertRecursivelyFrozen(evidence);
    return evidence;
  } catch (cause) {
    PRIVATE_CORE.get(state).cause = cause;
    if (failureActionTracker !== null) {
      retainPrivateAuthSettlementFailureClassNeverThrow(failureActionTracker, cause);
      retainPrivateToneOpenFailureClassNeverThrow(failureActionTracker, cause);
      retainPrivateToneSelectFailureClassNeverThrow(failureActionTracker, cause);
      retainPrivateDirtyNavigationFailureClassNeverThrow(failureActionTracker, cause);
    }
    if (typeof capabilities.retainPrimaryFailureObservation === "function") {
      capabilities.retainPrimaryFailureObservation(cause);
    }
    state.terminalCleanupStarted = true;
    if (constructionCleanupAuthority !== null) {
      const cleanupDiagnostics =
        await constructionCleanupAuthority.cleanupWhateverWasAcquiredOnceNeverThrow(
          deepFreezeExact({ plan, captures, resourceLedger, cleanupPlanner, failure: true })
        );
      constructionCleanupAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(
        cause,
        cleanupDiagnostics
      );
    } else {
      await capabilities.cleanup(
        deepFreezeExact({ plan, captures, resourceLedger, cleanupPlanner, failure: true })
      );
    }
    throw TASK_FAILURE;
  }
}

const PRIVATE_RUNTIME = new WeakMap();
const {
  PRIVATE_API_REQUEST_CONTEXT,
  PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT,
  adminApiRequest,
  bootstrapApiSession,
  captureApiCsrf,
  disposeApiRequestContextAndProveAbsent,
  disposeOwnedApiRequestContextAndProveAbsent,
  loginApiSession,
  privateApiContextRegistry,
  privateEphemeralApiContextRegistry,
  readPublicApiExactlyOnce,
  retainedApiLifecycleFailure,
  validateApiSessionObservation,
  validateExactApiLoginResponse,
} = createAdminApiSessionRuntime({
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  PRIVATE_RUNTIME,
  runBunBridgeOperation,
});
const {
  deleteCleanupSubject,
  hashCleanupAuthoritativeBytes,
  proveCleanupSubjectAbsent,
  proveCleanupSubjectPresent,
  runPrivateCleanupAdminApiBoundary,
} = createCleanupSubjectAuthorityRuntime({
  adminApiRequest,
  bootstrapApiSession,
  readStableArtifactIdentity,
  requireMissingPath,
  responseLostStorageRoot,
  restoreIdentitySafeMediaAncestorDirectories,
  runBunBridgeOperation,
  sameArtifactIdentity,
});
const { runtimeProveMedia, runtimeUploadMedia, sendCanonicalMediaMultipart } =
  createMediaOperationsRuntime({
    adminApiRequest,
    assertRecordIdentity,
    bootstrapApiSession,
    captureCanonicalMediaStorageOwnership,
    runtimeSafeProjection,
  });

function parseProcIdentity(text, expectedPid) {
  const close = text.lastIndexOf(")");
  invariant(close > 0, "process stat is malformed");
  const pid = Number(text.slice(0, text.indexOf(" ")));
  const fields = text
    .slice(close + 2)
    .trim()
    .split(/\s+/u);
  const value = { pid, ppid: Number(fields[1]), pgid: Number(fields[2]), startTicks: fields[19] };
  invariant(
    pid === expectedPid &&
      Number.isSafeInteger(value.ppid) &&
      Number.isSafeInteger(value.pgid) &&
      value.pgid > 0 &&
      /^[1-9][0-9]*$/u.test(value.startTicks ?? ""),
    "process identity is invalid"
  );
  return value;
}

async function readProcIdentity(pid) {
  return parseProcIdentity(await readFile(`/proc/${pid}/stat`, "utf8"), pid);
}

function sameProcessIdentity(left, right) {
  return Boolean(
    left &&
    right &&
    left.pid === right.pid &&
    left.ppid === right.ppid &&
    left.pgid === right.pgid &&
    left.startTicks === right.startTicks
  );
}

async function readProcessGroupMembers(pgid) {
  const members = [];
  for (const name of await readdir("/proc")) {
    if (!/^[1-9][0-9]*$/u.test(name)) continue;
    const pid = Number(name);
    try {
      const identity = await readProcIdentity(pid);
      if (identity.pgid === pgid) members.push(identity);
    } catch (error) {
      if (!error || !["ENOENT", "ESRCH"].includes(error.code)) throw error;
    }
  }
  return members.sort((left, right) => left.pid - right.pid);
}

const PROCESS_TERM_GRACE_MS = 40_000;
const PROCESS_ABSENCE_STABILITY_MS = 40;

const {
  SMOKE_PORTS,
  portsAreAbsent,
  readHostReadyLine,
  readHostReadyLineWithTimerAuthority,
  startOwnedHost,
  stopOwnedHost,
} = createOwnedHostRuntime({
  PROCESS_ABSENCE_STABILITY_MS,
  appendRetainedGroupMembers,
  delayMilliseconds,
  proveOwnedGroupAbsentStable,
  readFreshProcessIdentityWithRetry,
  readProcIdentity,
  readProcessGroupMembers,
  sameProcessIdentity,
  terminateRetainedProcessGroup,
});
const { proveMissingMediaDbAndStorageAbsence, runtimeStoragePostSetup } =
  createMissingMediaProofRuntime({
    PROCESS_ABSENCE_STABILITY_MS,
    delayMilliseconds,
    runBunBridgeOperation,
    runtimeSafeProjection,
    scanExactLocalStorageManifest,
  });
const {
  assertFinalStorageDatabaseBaseline,
  proveFinalStorageAndDatabaseBaselines,
} = createFinalBaselinesRuntime({
  PROCESS_ABSENCE_STABILITY_MS,
  delayMilliseconds,
  runBunBridgeOperation,
  scanExactLocalStorageManifest,
  taskUserAgents,
});

function delayMilliseconds(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readFreshProcessIdentityWithRetry(pid) {
  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await readProcIdentity(pid);
    } catch (error) {
      lastError = error;
      await delayMilliseconds(5);
    }
  }
  throw lastError ?? new Error("process identity is unavailable");
}

function appendRetainedGroupMembers(record, members, { requireLeader = true } = {}) {
  invariant(
    record && record.leader && record.retainedMembers instanceof Map && Array.isArray(members),
    "retained process-group record is invalid"
  );
  const leader = members.find(({ pid }) => pid === record.leader.pid) ?? null;
  if (requireLeader) {
    invariant(
      sameProcessIdentity(leader, record.leader),
      "owned process-group leader identity drift"
    );
  } else if (leader !== null) {
    invariant(sameProcessIdentity(leader, record.leader), "owned process-group leader was reused");
  }
  for (const member of members) {
    invariant(
      member.pgid === record.leader.pgid,
      "owned process escaped its retained process group"
    );
    const retained = record.retainedMembers.get(member.pid);
    if (retained === undefined) {
      invariant(requireLeader, "an unretained process appeared after group termination began");
      record.retainedMembers.set(member.pid, Object.freeze({ ...member }));
    } else {
      invariant(sameProcessIdentity(retained, member), "retained process identity was reused");
    }
  }
}

async function waitForOwnedGroupAbsence(record, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const members = await readProcessGroupMembers(record.leader.pgid);
    if (members.length === 0) return true;
    appendRetainedGroupMembers(record, members, { requireLeader: false });
    await delayMilliseconds(25);
  }
  return false;
}

async function proveOwnedGroupAbsentStable(record) {
  invariant(
    (await readProcessGroupMembers(record.leader.pgid)).length === 0,
    "owned process group remains present"
  );
  await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
  invariant(
    (await readProcessGroupMembers(record.leader.pgid)).length === 0,
    "owned process group reappeared"
  );
  return true;
}

async function terminateRetainedProcessGroup(record) {
  if (record.terminationPromise !== null) return record.terminationPromise;
  record.terminationPromise = (async () => {
    const initialMembers = await readProcessGroupMembers(record.leader.pgid);
    if (initialMembers.length === 0) {
      await proveOwnedGroupAbsentStable(record);
      return deepFreezeExact({ termSent: false, killSent: false, absent: true });
    }
    const leaderPresent = initialMembers.some(({ pid }) => pid === record.leader.pid);
    appendRetainedGroupMembers(record, initialMembers, {
      requireLeader: leaderPresent && record.membershipSealed !== true,
    });
    try {
      process.kill(-record.leader.pgid, "SIGTERM");
    } catch (error) {
      invariant(
        error?.code === "ESRCH" && (await readProcessGroupMembers(record.leader.pgid)).length === 0,
        "owned process group SIGTERM failed"
      );
    }
    if (await waitForOwnedGroupAbsence(record, PROCESS_TERM_GRACE_MS)) {
      await proveOwnedGroupAbsentStable(record);
      return deepFreezeExact({ termSent: true, killSent: false, absent: true });
    }
    const survivors = await readProcessGroupMembers(record.leader.pgid);
    appendRetainedGroupMembers(record, survivors, { requireLeader: false });
    try {
      process.kill(-record.leader.pgid, "SIGKILL");
    } catch (error) {
      invariant(
        error?.code === "ESRCH" && (await readProcessGroupMembers(record.leader.pgid)).length === 0,
        "owned process group SIGKILL failed"
      );
    }
    invariant(
      await waitForOwnedGroupAbsence(record, PROCESS_KILL_GRACE_MS),
      "owned process group survived SIGKILL"
    );
    await proveOwnedGroupAbsentStable(record);
    return deepFreezeExact({ termSent: true, killSent: true, absent: true });
  })();
  return record.terminationPromise;
}

async function resolveValidatedBundledPlaywrightRequest(pathValue) {
  invariant(
    typeof pathValue === "string" && !pathValue.includes("\0"),
    "Playwright CLI PATH authority is invalid"
  );
  const directories = pathValue.split(path.delimiter).filter((entry) => path.isAbsolute(entry));
  invariant(
    directories.length > 0 && directories.length <= 128,
    "Playwright CLI PATH search bound drift"
  );
  let cliRealPath = null;
  for (const directory of directories) {
    try {
      cliRealPath = await realpath(path.join(directory, "playwright-cli"));
      break;
    } catch (error) {
      if (!error || !["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) throw error;
    }
  }
  invariant(
    cliRealPath !== null && path.basename(cliRealPath) === "playwright-cli.js",
    "validated Playwright CLI realpath is absent"
  );
  await assertNoSymlinkAncestors(cliRealPath);
  await readStableArtifactIdentity(cliRealPath, { expectedType: "file" });
  const cliPackageRoot = path.dirname(cliRealPath);
  const cliPackagePath = path.join(cliPackageRoot, "package.json");
  const cliPackage = JSON.parse(
    decodeBoundedUtf8(await readFile(cliPackagePath), "Playwright CLI package", 64 * 1024)
  );
  invariant(
    cliPackage.name === "@playwright/cli" &&
      cliPackage.bin?.["playwright-cli"] === path.basename(cliRealPath) &&
      typeof cliPackage.dependencies?.playwright === "string",
    "Playwright CLI package identity drift"
  );
  const playwrightRoot = await realpath(path.join(cliPackageRoot, "node_modules", "playwright"));
  invariant(
    playwrightRoot.startsWith(cliPackageRoot + path.sep) &&
      path.dirname(playwrightRoot) === path.join(cliPackageRoot, "node_modules"),
    "bundled Playwright package escaped the validated CLI package"
  );
  await assertNoSymlinkAncestors(playwrightRoot);
  const playwrightPackage = JSON.parse(
    decodeBoundedUtf8(
      await readFile(path.join(playwrightRoot, "package.json")),
      "bundled Playwright package",
      64 * 1024
    )
  );
  invariant(
    playwrightPackage.name === "playwright" &&
      playwrightPackage.version === cliPackage.dependencies.playwright &&
      playwrightPackage.exports?.["."]?.import === "./index.mjs",
    "bundled Playwright package identity drift"
  );
  const entryPath = await realpath(path.join(playwrightRoot, "index.mjs"));
  invariant(
    path.dirname(entryPath) === playwrightRoot,
    "bundled Playwright entry escaped its package"
  );
  await readStableArtifactIdentity(entryPath, { expectedType: "file" });
  const playwrightModule = await import(pathToFileURL(entryPath).href);
  invariant(
    playwrightModule.request && typeof playwrightModule.request.newContext === "function",
    "bundled Playwright API request factory is absent"
  );
  return {
    cliRealPath,
    entryPath,
    request: playwrightModule.request,
    version: playwrightPackage.version,
  };
}

async function runPrivateProcess({ file, args, cwd, env, stdin, timeoutMs = 90_000 }) {
  const execution = await runRetainedProcessGroup({
    file,
    args,
    cwd,
    env,
    stdinBytes: stdin,
    timeoutMs,
  });
  invariant(
    !execution.timedOut &&
      !execution.spawnError &&
      execution.completion.code === 0 &&
      !execution.stdout.exceeded &&
      !execution.stderr.exceeded &&
      execution.stderr.bytes.length === 0 &&
      execution.termination.absent === true,
    "private child failed"
  );
  return execution.stdout.bytes;
}

const USER_PROVISION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-provision-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
import { createUser } from "./services/admin/usersService.ts";
import { getAdminRoleIds } from "./services/admin/rolesService.ts";
import { hashPassword } from "./services/auth/password.ts";
import { updatePassword } from "./services/auth/userService.ts";
import { normalizeEmail, resolveEmailValue } from "./services/security/piiEmail.ts";
if (Object.keys(input).sort().join(",") !== "email,name" || normalizeEmail(input.email) !== input.email) throw new Error("wf540_input");
const roleIds = await getAdminRoleIds();
if (roleIds.length !== 1) throw new Error("wf540_admin_role");
const adminRoles = await db.select({id:roles.id,name:roles.name,description:roles.description,permissions:roles.permissions,createdAt:roles.createdAt}).from(roles).where(eq(roles.id,roleIds[0])).limit(2);
if (adminRoles.length !== 1 || adminRoles[0].name !== "admin" || canonical(adminRoles[0].permissions) !== canonical(["*"])) throw new Error("wf540_admin_role_tuple");
const user = await createUser({ name: input.name, email: input.email, roleIds, status: "active" });
if (!user) throw new Error("wf540_user_create");
const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD);
const updated = await updatePassword(user.id, { passwordHash, activatePending: true });
if (!updated || updated.id !== user.id || updated.passwordHash !== passwordHash) throw new Error("wf540_user_password_exact_id");
const storedUsers = await db.select().from(users).where(eq(users.id,user.id)).limit(2);
const storedRoles = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,user.id)).limit(2);
if (storedUsers.length !== 1 || storedRoles.length !== 1 || storedRoles[0].roleId !== roleIds[0] || storedRoles[0].roleName !== "admin" || canonical(storedRoles[0].rolePermissions) !== canonical(["*"]) || normalizeEmail(resolveEmailValue(storedUsers[0]) ?? "") !== input.email) throw new Error("wf540_user_complete_proof");
const output = {
  adminRoleTupleCount:1,exactIdPasswordUpdate:true,normalizedEmailMatches:true,
  userEmail:input.email,userId:user.id,
};` +
  BRIDGE_OUTPUT_WRITER;
const USER_PROOF_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-identity-input-v1") +
  String.raw`
import { getUser } from "./services/admin/usersService.ts";
import { getAdminRoleIds } from "./services/admin/rolesService.ts";
if (Object.keys(input).sort().join(",") !== "email,userId") throw new Error("wf540_input");
const user = await getUser(input.userId); const adminRoleIds = await getAdminRoleIds();
if (!user || user.email !== input.email || user.status !== "active" || adminRoleIds.length !== 1 || user.roleIds.length !== 1 || user.roleIds[0] !== adminRoleIds[0]) throw new Error("wf540_user_proof");
const output = { ok: true };` +
  BRIDGE_OUTPUT_WRITER;
const USER_DELETE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { deleteUser, getUser } from "./services/admin/usersService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const before = await getUser(input.userId); if (!before) throw new Error("wf540_user_missing");
const deleted = await deleteUser(input.userId); if (!deleted) throw new Error("wf540_user_delete");
const output = { ok: (await getUser(input.userId)) === null };` +
  BRIDGE_OUTPUT_WRITER;
const USER_ABSENCE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { getUser } from "./services/admin/usersService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const output = { absent: (await getUser(input.userId)) === null };` +
  BRIDGE_OUTPUT_WRITER;
const PREFERENCE_SET_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("preference-write-input-v1") +
  String.raw`
import { setUserSetting } from "./services/settings/userSettingsService.ts";
if (Object.keys(input).sort().join(",") !== "showFieldMetadata,userId" || typeof input.showFieldMetadata !== "boolean") throw new Error("wf540_input");
const row = await setUserSetting(input.userId, "customScreens.entry.preferences", { version: 1, showFieldMetadata: input.showFieldMetadata });
const output = { ok: row.userId === input.userId };` +
  BRIDGE_OUTPUT_WRITER;
const PREFERENCE_GET_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { getUserSetting } from "./services/settings/userSettingsService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const value = await getUserSetting(input.userId, "customScreens.entry.preferences");
if (!value || Object.keys(value).sort().join(",") !== "showFieldMetadata,version" || value.version !== 1 || typeof value.showFieldMetadata !== "boolean") throw new Error("wf540_preference");
const output = { showFieldMetadata: value.showFieldMetadata };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("email-input-v1") +
  String.raw`
import { eq, or } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
import { hashEmail, normalizeEmail, resolveEmailValue } from "./services/security/piiEmail.ts";
if (Object.keys(input).join(",") !== "email" || typeof input.email !== "string") throw new Error("wf540_input");
const normalizedEmail = normalizeEmail(input.email);
const rows = await db.select({
  id: users.id, email: users.email, emailEncrypted: users.emailEncrypted,
  name: users.name, status: users.status, passwordHash: users.passwordHash,
  roleId: userRoles.roleId, roleName: roles.name, rolePermissions: roles.permissions,
}).from(users)
  .leftJoin(userRoles, eq(userRoles.userId, users.id))
  .leftJoin(roles, eq(roles.id, userRoles.roleId))
  .where(or(eq(users.emailHash, hashEmail(normalizedEmail)), eq(users.email, normalizedEmail))).limit(65);
const overflow = rows.length > 64;
const byId = new Map();
for (const row of rows.slice(0, 64)) {
  let candidate = byId.get(row.id);
  if (!candidate) {
    candidate = { id: row.id, normalizedEmailMatches: normalizeEmail(resolveEmailValue(row) ?? "") === normalizedEmail, name: row.name, status: row.status, passwordHashPresent: typeof row.passwordHash === "string" && row.passwordHash.length > 0, adminWildcardPermissionCount: 0, adminRoleTupleCount: 0 };
    byId.set(row.id, candidate);
  }
  if (row.roleId && row.roleName === "admin" && canonical(row.rolePermissions) === canonical(["*"])) {
    candidate.adminWildcardPermissionCount += 1;
    candidate.adminRoleTupleCount += 1;
  }
}
const output = { candidates: [...byId.values()].sort((a,b)=>a.id.localeCompare(b.id)), overflow };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("slug-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentTypes } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "slug" || typeof input.slug !== "string") throw new Error("wf540_input");
const rows = await db.select({ id: contentTypes.id, name: contentTypes.name, slug: contentTypes.slug, schema: contentTypes.schema, status: contentTypes.status, config: contentTypes.config }).from(contentTypes).where(eq(contentTypes.slug,input.slug)).limit(65);
const output = { candidates: rows.slice(0,64).sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("entry-discovery-input-v1") +
  String.raw`
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentEntries } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "slug,typeId" || typeof input.slug !== "string" || typeof input.typeId !== "string") throw new Error("wf540_input");
const rows = await db.select({ id: contentEntries.id, typeId: contentEntries.typeId, authorId: contentEntries.authorId, title: contentEntries.title, slug: contentEntries.slug, status: contentEntries.status, visibility: contentEntries.visibility, accessPasswordAbsent: isNull(contentEntries.accessPassword), tags: contentEntries.tags, data: contentEntries.data, publishedAt: contentEntries.publishedAt, scheduledAt: contentEntries.scheduledAt }).from(contentEntries).where(and(eq(contentEntries.typeId,input.typeId),eq(contentEntries.slug,input.slug))).limit(65);
const output = { candidates: rows.slice(0,64).map((row)=>({ ...row, publishedAt: row.publishedAt?.toISOString() ?? null, scheduledAt: row.scheduledAt?.toISOString() ?? null })).sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("screen-discovery-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { customScreens } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "contentTypeId,name" || typeof input.contentTypeId !== "string" || typeof input.name !== "string") throw new Error("wf540_input");
const rows = await db.select({ id: customScreens.id, name: customScreens.name, contentTypeId: customScreens.contentTypeId, status: customScreens.status, collectionRole: customScreens.collectionRole, compositionKey: customScreens.compositionKey, showInSidebar: customScreens.showInSidebar, sidebarLabel: customScreens.sidebarLabel, schemaVersion: customScreens.schemaVersion, definition: customScreens.definition }).from(customScreens).where(and(eq(customScreens.name,input.name),eq(customScreens.contentTypeId,input.contentTypeId))).limit(65);
const output = { candidates: rows.slice(0,64).sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("media-natural-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { media } from "./db/schema.ts";
import { assertCanonicalStorageKey } from "./services/media/storage/adapter.ts";
if (Object.keys(input).sort().join(",") !== "mimeType,originalName,size" || typeof input.originalName !== "string" || typeof input.mimeType !== "string" || !Number.isSafeInteger(input.size)) throw new Error("wf540_input");
const rows = await db.select({ id: media.id, key: media.key, url: media.url, originalName: media.originalName, type: media.type, mimeType: media.mimeType, size: media.size, width: media.width, height: media.height, alt: media.alt, title: media.title, caption: media.caption, folderId: media.folderId, tags: media.tags, focalX: media.focalX, focalY: media.focalY, description: media.description, credit: media.credit, createdBy: media.createdBy }).from(media).where(and(eq(media.originalName,input.originalName),eq(media.mimeType,input.mimeType),eq(media.size,input.size))).limit(65);
const candidates = rows.slice(0,64);
for (const candidate of candidates) {
  assertCanonicalStorageKey(candidate.key);
  if (candidate.url !== "/media/" + candidate.key) throw new Error("wf540_media_url");
}
const output = { candidates: candidates.sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("override-discovery-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { customScreenEntryPresentationOverrides } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "blockId,entryId,propPath,screenId" || input.propPath !== "mediaAssetId") throw new Error("wf540_input");
const rows = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId, entryId: customScreenEntryPresentationOverrides.entryId, blockId: customScreenEntryPresentationOverrides.blockId, propPath: customScreenEntryPresentationOverrides.propPath, value: customScreenEntryPresentationOverrides.value, updatedBy: customScreenEntryPresentationOverrides.updatedBy }).from(customScreenEntryPresentationOverrides).where(and(eq(customScreenEntryPresentationOverrides.screenId,input.screenId),eq(customScreenEntryPresentationOverrides.entryId,input.entryId),eq(customScreenEntryPresentationOverrides.blockId,input.blockId),eq(customScreenEntryPresentationOverrides.propPath,input.propPath))).limit(65);
const output = { candidates: rows.slice(0,64), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { userSettings } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "userId" || typeof input.userId !== "string") throw new Error("wf540_input");
const key = "customScreens.entry.preferences";
const rows = await db.select({ userId: userSettings.userId, key: userSettings.key, value: userSettings.value }).from(userSettings).where(and(eq(userSettings.userId,input.userId),eq(userSettings.key,key))).limit(65);
const output = { candidates: rows.slice(0,64), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("entry-preflight-input-v1") +
  String.raw`
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentEntries, contentTypes } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "entrySlug,typeSlug") throw new Error("wf540_input");
const rows = await db.select({ id: contentEntries.id, typeId: contentEntries.typeId, authorId: contentEntries.authorId, title: contentEntries.title, slug: contentEntries.slug, status: contentEntries.status, visibility: contentEntries.visibility, accessPasswordAbsent: isNull(contentEntries.accessPassword), tags: contentEntries.tags, data: contentEntries.data, publishedAt: contentEntries.publishedAt, scheduledAt: contentEntries.scheduledAt }).from(contentEntries).innerJoin(contentTypes,eq(contentTypes.id,contentEntries.typeId)).where(and(eq(contentTypes.slug,input.typeSlug),eq(contentEntries.slug,input.entrySlug))).limit(65);
const output = { candidates: rows.slice(0,64).map((row)=>({ ...row, publishedAt: row.publishedAt?.toISOString() ?? null, scheduledAt: row.scheduledAt?.toISOString() ?? null })).sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("screen-preflight-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentTypes, customScreens } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "contentTypeSlug,name") throw new Error("wf540_input");
const rows = await db.select({ id: customScreens.id, name: customScreens.name, contentTypeId: customScreens.contentTypeId, status: customScreens.status, collectionRole: customScreens.collectionRole, compositionKey: customScreens.compositionKey, showInSidebar: customScreens.showInSidebar, sidebarLabel: customScreens.sidebarLabel, schemaVersion: customScreens.schemaVersion, definition: customScreens.definition }).from(customScreens).innerJoin(contentTypes,eq(contentTypes.id,customScreens.contentTypeId)).where(and(eq(customScreens.name,input.name),eq(contentTypes.slug,input.contentTypeSlug))).limit(65);
const output = { candidates: rows.slice(0,64).sort((a,b)=>a.id.localeCompare(b.id)), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("override-preflight-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentEntries, contentTypes, customScreenEntryPresentationOverrides, customScreens } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "blockId,contentTypeSlug,entrySlug,propPath,screenName" || input.propPath !== "mediaAssetId") throw new Error("wf540_input");
const rows = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId, entryId: customScreenEntryPresentationOverrides.entryId, blockId: customScreenEntryPresentationOverrides.blockId, propPath: customScreenEntryPresentationOverrides.propPath, value: customScreenEntryPresentationOverrides.value, updatedBy: customScreenEntryPresentationOverrides.updatedBy }).from(customScreenEntryPresentationOverrides).innerJoin(customScreens,eq(customScreens.id,customScreenEntryPresentationOverrides.screenId)).innerJoin(contentEntries,eq(contentEntries.id,customScreenEntryPresentationOverrides.entryId)).innerJoin(contentTypes,eq(contentTypes.id,contentEntries.typeId)).where(and(eq(customScreens.name,input.screenName),eq(contentTypes.slug,input.contentTypeSlug),eq(contentEntries.slug,input.entrySlug),eq(customScreenEntryPresentationOverrides.blockId,input.blockId),eq(customScreenEntryPresentationOverrides.propPath,input.propPath))).limit(65);
const output = { candidates: rows.slice(0,64), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("email-input-v1") +
  String.raw`
import { and, eq, or } from "drizzle-orm";
import { db } from "./db/client.ts";
import { userSettings, users } from "./db/schema.ts";
import { hashEmail, normalizeEmail } from "./services/security/piiEmail.ts";
if (Object.keys(input).join(",") !== "email") throw new Error("wf540_input");
const email = normalizeEmail(input.email); const key = "customScreens.entry.preferences";
const rows = await db.select({ userId:userSettings.userId,key:userSettings.key,value:userSettings.value }).from(userSettings).innerJoin(users,eq(users.id,userSettings.userId)).where(and(or(eq(users.emailHash,hashEmail(email)),eq(users.email,email)),eq(userSettings.key,key))).limit(65);
const output = { candidates: rows.slice(0,64), overflow: rows.length > 64 };` +
  BRIDGE_OUTPUT_WRITER;
const MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("media-id-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { media } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "mediaId" || !/^[0-9a-f-]{36}$/.test(input.mediaId)) throw new Error("wf540_input");
const rows = await db.select({ id: media.id }).from(media).where(eq(media.id,input.mediaId)).limit(2);
const output = { rowCount: rows.length };` +
  BRIDGE_OUTPUT_WRITER;
const CONTENT_ROUTES_EXACT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("empty-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { settings } from "./db/schema.ts";
if (Object.keys(input).length !== 0) throw new Error("wf540_input");
const rows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"site.contentRoutes")).limit(2);
if (rows.length > 1) throw new Error("wf540_content_routes_cardinality");
const [row] = rows;
const output = row ? { exists:true,value:row.value,updatedAt:row.updatedAt.toISOString() } : { exists:false,value:null,updatedAt:null };` +
  BRIDGE_OUTPUT_WRITER;
const SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("seo-entry-targets-input-v1") +
  String.raw`
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db/client.ts";
import { seoDocuments } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "targetIds" || !Array.isArray(input.targetIds) || input.targetIds.length !== 6 || new Set(input.targetIds).size !== 6) throw new Error("wf540_input");
const candidates = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(and(eq(seoDocuments.targetType,"entry"),inArray(seoDocuments.targetId,input.targetIds))).orderBy(seoDocuments.targetId,seoDocuments.id).limit(7);
const output = { candidates };` +
  BRIDGE_OUTPUT_WRITER;

function assertSeoEntryDiscoveryBridgeFailClosedSource(source = SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE) {
  invariant(typeof source === "string", "SEO discovery bridge source authority drift");
  const required = [
    'validateInput("seo-entry-targets-input-v1",input);/*wf540-bound-input*/',
    'Object.keys(input).join(",") !== "targetIds"',
    "input.targetIds.length !== 6",
    "new Set(input.targetIds).size !== 6",
    "db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType })",
    'where(and(eq(seoDocuments.targetType,"entry"),inArray(seoDocuments.targetId,input.targetIds)))',
    ".orderBy(seoDocuments.targetId,seoDocuments.id).limit(7)",
    "const output = { candidates };",
  ];
  invariant(
    required.every((token) => source.includes(token)) &&
      !source.includes("like(") &&
      !source.includes("ilike(") &&
      !source.includes("ownerSubjectIdentifier"),
    "SEO discovery bridge lost exact bounded entry-target authority"
  );
  return true;
}
const CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("resource-owner-input-v2") +
  String.raw`
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db/client.ts";
import { contentEntries, customScreenEntryPresentationOverrides, media } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "entryIds,mediaId,override,overrideExpectedPresent" || !Array.isArray(input.entryIds) || input.entryIds.length !== 6 || new Set(input.entryIds).size !== 6 || Object.keys(input.override).sort().join(",") !== "blockId,entryId,propPath,screenId" || typeof input.overrideExpectedPresent !== "boolean") throw new Error("wf540_input");
const entries = (await db.select({ id:contentEntries.id,ownerSubjectIdentifier:contentEntries.authorId }).from(contentEntries).where(inArray(contentEntries.id,input.entryIds)).limit(7)).sort((a,b)=>a.id.localeCompare(b.id));
const mediaRows = await db.select({ id:media.id,ownerSubjectIdentifier:media.createdBy }).from(media).where(eq(media.id,input.mediaId)).limit(2);
const overrideRows = await db.select({ ownerSubjectIdentifier:customScreenEntryPresentationOverrides.updatedBy }).from(customScreenEntryPresentationOverrides).where(and(eq(customScreenEntryPresentationOverrides.screenId,input.override.screenId),eq(customScreenEntryPresentationOverrides.entryId,input.override.entryId),eq(customScreenEntryPresentationOverrides.blockId,input.override.blockId),eq(customScreenEntryPresentationOverrides.propPath,input.override.propPath))).limit(2);
if (entries.length !== 6 || mediaRows.length !== 1 || (input.overrideExpectedPresent ? overrideRows.length !== 1 : overrideRows.length !== 0)) throw new Error("wf540_owner_rows");
const [mediaRow] = mediaRows; const override = overrideRows[0] ?? null;
const output = { entries, media:mediaRow, override, overrideAbsent:override === null };` +
  BRIDGE_OUTPUT_WRITER;

function assertCurrentResourceOwnerBridgeFailClosedSource(
  source = CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE
) {
  invariant(typeof source === "string", "current owner bridge source authority drift");
  const required = [
    'validateInput("resource-owner-input-v2",input);/*wf540-bound-input*/',
    ".limit(7)).sort((a,b)=>a.id.localeCompare(b.id));",
    ".limit(2);\nif (entries.length !== 6 || mediaRows.length !== 1 || (input.overrideExpectedPresent ? overrideRows.length !== 1 : overrideRows.length !== 0))",
    "const [mediaRow] = mediaRows; const override = overrideRows[0] ?? null;",
    "overrideAbsent:override === null",
  ];
  invariant(
    required.every((token) => source.includes(token)),
    "current owner bridge lost exact present/authorized-absence cardinality"
  );
  return true;
}
const STORAGE_PREFLIGHT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-agents-input-v1") +
  String.raw`
import path from "node:path";
import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { accessLogs, auditLogs, roles, sessions, settings, userRoles, users } from "./db/schema.ts";
import { getStorageSettingsInternal } from "./services/settings/storageSettings.ts";
import { decryptEmail, hashEmail, isEncryptedEmail, normalizeEmail } from "./services/security/piiEmail.ts";
if (Object.keys(input).join(",") !== "userAgents" || !Array.isArray(input.userAgents) || input.userAgents.length !== 4 || new Set(input.userAgents).size !== 4) throw new Error("wf540_input");
const setupRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"setup.completed")).limit(2);
const driverRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"storage.driver")).limit(2);
const localDirRows = await db.select({ key:settings.key,value:settings.value,updatedAt:settings.updatedAt }).from(settings).where(eq(settings.key,"storage.local.dir")).limit(2);
if (setupRows.length !== 1 || setupRows[0].value !== true || driverRows.length !== 1 || driverRows[0].value !== "local" || localDirRows.length !== 1 || typeof localDirRows[0].value !== "string" || localDirRows[0].value.length === 0 || Object.hasOwn(process.env,"MEDIA_STORAGE") || Object.hasOwn(process.env,"MEDIA_DIR")) throw new Error("wf540_preflight");
const storage = await getStorageSettingsInternal();
if (storage.driver !== driverRows[0].value || storage.localDir !== localDirRows[0].value) throw new Error("wf540_preflight");
const storageRoot = path.resolve(process.cwd(),localDirRows[0].value);
const normalizedEmail = normalizeEmail(process.env.ADMIN_EMAIL);
const bootstrapEmailHash = hashEmail(normalizedEmail);
const bootstrapRows = await db.select().from(users).where(or(eq(users.emailHash,bootstrapEmailHash),inArray(users.email,[bootstrapEmailHash,normalizedEmail]))).limit(2);
if (bootstrapRows.length !== 1) throw new Error("wf540_bootstrap_cardinality");
const bootstrap = bootstrapRows[0];
if (bootstrap.status !== "active" || bootstrap.emailHash !== bootstrapEmailHash || bootstrap.email !== bootstrapEmailHash || !isEncryptedEmail(bootstrap.emailEncrypted) || decryptEmail(bootstrap.emailEncrypted) !== normalizedEmail) throw new Error("wf540_bootstrap_canonical_identity");
const roleRows = await db.select({
  userId:userRoles.userId, roleId:userRoles.roleId, roleName:roles.name,
  roleDescription:roles.description, rolePermissions:roles.permissions, roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,bootstrap.id)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_role_cardinality");
const normalizedPermissions = Array.isArray(roleRows[0].rolePermissions) ? [...new Set(roleRows[0].rolePermissions)].sort() : [];
if (roleRows[0].roleName !== "admin" || canonical(normalizedPermissions) !== canonical(["*"])) throw new Error("wf540_bootstrap_role");
const contentRouteRows = await db.select().from(settings).where(eq(settings.key,"site.contentRoutes")).limit(2);
if (contentRouteRows.length > 1) throw new Error("wf540_content_routes_cardinality");
const contentRoutes = contentRouteRows[0];
const auditRows = await db.select({ id:auditLogs.id }).from(auditLogs).where(inArray(sql.raw("metadata->>'userAgent'"),input.userAgents)).orderBy(auditLogs.id).limit(4097);
const accessRows = await db.select({ id:accessLogs.id }).from(accessLogs).where(inArray(accessLogs.userAgent,input.userAgents)).orderBy(accessLogs.id).limit(4097);
const sessionRows = await db.select({ id:sessions.id }).from(sessions).orderBy(sessions.id).limit(4097);
if (auditRows.length > 4096 || accessRows.length > 4096 || sessionRows.length > 4096) throw new Error("wf540_task_traffic_baseline_overflow");
const rawUserRow = {
  id:bootstrap.id,email:bootstrap.email,emailHash:bootstrap.emailHash,emailEncrypted:bootstrap.emailEncrypted,
  passwordHash:bootstrap.passwordHash,name:bootstrap.name,status:bootstrap.status,
  createdAt:bootstrap.createdAt.toISOString(),updatedAt:bootstrap.updatedAt.toISOString(),
  lastLoginAt:bootstrap.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((row)=>({
  userId:row.userId,roleId:row.roleId,roleName:row.roleName,roleDescription:row.roleDescription,
  rolePermissions:row.rolePermissions,roleCreatedAt:row.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = {
  bootstrap: {
    id:bootstrap.id,lastLoginAt:rawUserRow.lastLoginAt,updatedAt:rawUserRow.updatedAt,
    normalizedEmailProof:true,emailHashProof:true,encryptedEmailProof:true,decryptEmailProof:true,
    rawUserRow,roleTuples,
  },
  contentRoutes: contentRoutes ? { exists: true, value: contentRoutes.value, updatedAt: contentRoutes.updatedAt.toISOString() } : { exists: false, value: null, updatedAt: null },
  local: true,
  requiredSettings: {
    setup: { ...setupRows[0], updatedAt: setupRows[0].updatedAt.toISOString() },
    driver: { ...driverRows[0], updatedAt: driverRows[0].updatedAt.toISOString() },
    localDir: { ...localDirRows[0], updatedAt: localDirRows[0].updatedAt.toISOString() },
  },
  setupComplete: true,
  storageRoot,
  taskTrafficBaseline: { auditIds:auditRows.map((row)=>row.id), accessIds:accessRows.map((row)=>row.id), sessionIds:sessionRows.map((row)=>row.id) },
};` +
  BRIDGE_OUTPUT_WRITER;
function securityBridgeSource(mode) {
  invariant(mode === "session" || mode === "rate", "security bridge mode is invalid");
  const projection =
    mode === "session"
      ? String.raw`const output = { csrfHeaderName: value.csrf.headerName.toLowerCase(), effectiveMaxPerUserAtLeast2: value.session.maxPerUser >= 2, singleSession: value.session.singleSession };`
      : String.raw`const output = { enabled: value.rateLimit.enabled, maxRequests: value.rateLimit.buckets.auth.maxRequests, windowSeconds: value.rateLimit.buckets.auth.windowSeconds };`;
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("empty-input-v1") +
    String.raw`
import { getSecuritySettings } from "./services/settings/securitySettings.ts";
if (Object.keys(input).length !== 0) throw new Error("wf540_input");
const value = await getSecuritySettings();
` +
    projection +
    BRIDGE_OUTPUT_WRITER
  );
}
const SECURITY_SESSION_BRIDGE_SOURCE = securityBridgeSource("session");
const SECURITY_RATE_BRIDGE_SOURCE = securityBridgeSource("rate");
const SCREEN_MATERIALIZE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("screen-materialize-input-v1") +
  String.raw`
import { buildDefaultListViewDefinition, normalizeCustomScreenDefinitionForWrite, customScreenCreateSchema } from "./services/customScreens/customScreenSchemas.ts";
import { validate } from "./server/validation/schemaValidator.ts";
if (Object.keys(input).sort().join(",") !== "bodyWithoutDefinition,contentType,definitionWithoutListView") throw new Error("wf540_input");
const definition = { ...input.definitionWithoutListView, listView: buildDefaultListViewDefinition(input.contentType) };
const normalized = normalizeCustomScreenDefinitionForWrite({ definition }, { contentType: input.contentType });
if (canonical(normalized) !== canonical(definition)) throw new Error("wf540_normalizer_delta");
const output = { ...input.bodyWithoutDefinition, schemaVersion: 4, definition };
validate(customScreenCreateSchema, output);` +
  BRIDGE_OUTPUT_WRITER;
function presentationOverrideExactBridgeSource(operation) {
  invariant(
    CLEANUP_OPERATION_KINDS.includes(operation),
    "presentation override bridge operation drift"
  );
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(customScreenEntryPresentationOverrides).where(predicate).returning({ screenId: customScreenEntryPresentationOverrides.screenId })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_override_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_override_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_override_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-override-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { customScreenEntryPresentationOverrides } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 4) throw new Error("wf540_input");
const [screenId,entryId,blockId,propPath] = input.identifier;
const predicate = and(eq(customScreenEntryPresentationOverrides.screenId,screenId),eq(customScreenEntryPresentationOverrides.entryId,entryId),eq(customScreenEntryPresentationOverrides.blockId,blockId),eq(customScreenEntryPresentationOverrides.propPath,propPath));
const before = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId }).from(customScreenEntryPresentationOverrides).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ screenId: customScreenEntryPresentationOverrides.screenId }).from(customScreenEntryPresentationOverrides).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      presentationOverrideExactBridgeSource(operation),
    ])
  )
);

function seoEntryDocumentExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "SEO entry bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(seoDocuments).where(predicate).returning({ id: seoDocuments.id })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_seo_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_seo_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_seo_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-seo-entry-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { seoDocuments } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 3) throw new Error("wf540_input");
const [id,targetType,targetId] = input.identifier;
if (targetType !== "entry") throw new Error("wf540_target_type");
const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));
const before = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent:after.length === 0,affected,present:before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      seoEntryDocumentExactBridgeSource(operation),
    ])
  )
);

function assertSeoEntryDocumentExactBridgeSourcesFailClosed(
  sources = SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES
) {
  exactOwnKeys(sources, CLEANUP_OPERATION_KINDS, "SEO entry P/C/A source registry", {
    plain: true,
  });
  const exactPredicate =
    "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));";
  const sharedRequired = [
    'validateInput("identifier-seo-entry-input-v1",input);/*wf540-bound-input*/',
    'if (targetType !== "entry") throw new Error("wf540_target_type");',
    exactPredicate,
    "const before = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
    "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
    "const output = { absent:after.length === 0,affected,present:before.length === 1 };",
  ];
  const operationRequired = {
    provenance: [
      "const affected = 0;",
      'if (before.length !== 1) throw new Error("wf540_seo_provenance");',
    ],
    delete: [
      "const affected = (await db.delete(seoDocuments).where(predicate).returning({ id: seoDocuments.id })).length;",
      'if (affected !== 1 || after.length !== 0) throw new Error("wf540_seo_delete");',
    ],
    absence: [
      "const affected = 0;",
      'if (after.length !== 0) throw new Error("wf540_seo_absence");',
    ],
  };
  const expectedPredicateUses = { provenance: 2, delete: 3, absence: 2 };
  for (const operation of CLEANUP_OPERATION_KINDS) {
    const source = sources[operation];
    invariant(typeof source === "string", "SEO entry " + operation + " source is absent");
    invariant(
      [...sharedRequired, ...operationRequired[operation]].every((token) =>
        source.includes(token)
      ) &&
        source.split(".where(predicate)").length - 1 === expectedPredicateUses[operation] &&
        !source.includes("like(") &&
        !source.includes("ilike("),
      "SEO entry " + operation + " source lost exact ID/type/target predicate authority"
    );
  }
  return true;
}

function userSettingExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "user setting bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(userSettings).where(predicate).returning({ userId: userSettings.userId })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_setting_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_setting_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_setting_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-setting-input-v1") +
    String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { userSettings } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 2) throw new Error("wf540_input");
const [userId,key] = input.identifier;
const predicate = and(eq(userSettings.userId,userId),eq(userSettings.key,key));
const before = await db.select({ userId: userSettings.userId }).from(userSettings).where(predicate).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ userId: userSettings.userId }).from(userSettings).where(predicate).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const USER_SETTING_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, userSettingExactBridgeSource(operation)])
  )
);

function userExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "user exact bridge operation drift");
  const mutation =
    operation === "delete"
      ? "const affected = (await db.delete(users).where(eq(users.id,userId)).returning({ id: users.id })).length;"
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_user_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_user_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_user_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { users } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [userId] = input.identifier;
const before = await db.select({ id: users.id }).from(users).where(eq(users.id,userId)).limit(2);
` +
    mutation +
    String.raw`
const after = await db.select({ id: users.id }).from(users).where(eq(users.id,userId)).limit(2);
` +
    assertion +
    String.raw`
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const USER_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, userExactBridgeSource(operation)])
  )
);
const TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-agents-input-v1") +
  String.raw`
import { inArray, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { accessLogs, auditLogs, sessions } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "userAgents" || !Array.isArray(input.userAgents) || input.userAgents.length !== 4 || new Set(input.userAgents).size !== 4) throw new Error("wf540_input");
const auditRows = await db.select({ id:auditLogs.id,actorId:auditLogs.actorId,metadata:auditLogs.metadata }).from(auditLogs).where(inArray(sql.raw("metadata->>'userAgent'"),input.userAgents)).orderBy(auditLogs.id).limit(4097);
const access = await db.select({ id:accessLogs.id,sessionId:accessLogs.sessionId,userId:accessLogs.userId,userAgent:accessLogs.userAgent }).from(accessLogs).where(inArray(accessLogs.userAgent,input.userAgents)).orderBy(accessLogs.id).limit(4097);
const session = await db.select({ id:sessions.id,userId:sessions.userId,userAgent:sessions.userAgent }).from(sessions).where(inArray(sessions.userAgent,input.userAgents)).orderBy(sessions.id).limit(4097);
const completeSession = await db.select({ id:sessions.id,userId:sessions.userId,userAgent:sessions.userAgent }).from(sessions).orderBy(sessions.id).limit(4097);
if ([auditRows,access,session,completeSession].some((rows)=>rows.length > 4096)) throw new Error("wf540_task_traffic_overflow");
const audit = auditRows.map(({id,actorId,metadata})=>{
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !input.userAgents.includes(metadata.userAgent)) throw new Error("wf540_task_audit_projection");
  return {id,actorId,userAgent:metadata.userAgent};
});
const output = { access, audit, completeSession, session };` +
  BRIDGE_OUTPUT_WRITER;

function exactTaskTrafficBridgeSource(kind, operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "task traffic bridge operation drift");
  const table =
    kind === "audit-log-task-ua"
      ? "auditLogs"
      : kind === "access-log-task-ua"
        ? "accessLogs"
        : "sessions";
  const importName = table;
  const mutation =
    operation === "delete"
      ? `const affected = (await db.delete(${table}).where(eq(${table}.id,id)).returning({ id: ${table}.id })).length;`
      : "const affected = 0;";
  const assertion =
    operation === "provenance"
      ? 'if (before.length !== 1) throw new Error("wf540_terminal_provenance");'
      : operation === "delete"
        ? 'if (affected !== 1 || after.length !== 0) throw new Error("wf540_terminal_delete");'
        : 'if (after.length !== 0) throw new Error("wf540_terminal_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    `
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { ${importName} } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [id] = input.identifier;
const before = await db.select({ id: ${table}.id }).from(${table}).where(eq(${table}.id,id)).limit(2);
${mutation}
const after = await db.select({ id: ${table}.id }).from(${table}).where(eq(${table}.id,id)).limit(2);
${assertion}
const output = { absent: after.length === 0, affected, present: before.length === 1 };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const TASK_TRAFFIC_EXACT_BRIDGE_SOURCES = deepFreezeExact({
  "audit-log-task-ua": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("audit-log-task-ua", operation),
    ])
  ),
  "access-log-task-ua": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("access-log-task-ua", operation),
    ])
  ),
  "session-task": Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [
      operation,
      exactTaskTrafficBridgeSource("session-task", operation),
    ])
  ),
});

function entityIdProvenanceBridgeSource(tableExport) {
  invariant(
    ["contentTypes", "contentEntries", "customScreens"].includes(tableExport),
    "entity provenance table is not registered"
  );
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-uuid-input-v1") +
    `
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { ${tableExport} } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 1) throw new Error("wf540_input");
const [id] = input.identifier;
const rows = await db.select({ id: ${tableExport}.id }).from(${tableExport}).where(eq(${tableExport}.id,id)).limit(2);
if (rows.length !== 1) throw new Error("wf540_entity_provenance");
const output = { present: true };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("contentTypes");
const CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("contentEntries");
const CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE = entityIdProvenanceBridgeSource("customScreens");

function mediaExactBridgeSource(operation) {
  invariant(CLEANUP_OPERATION_KINDS.includes(operation), "media bridge operation drift");
  const assertion =
    operation === "provenance"
      ? 'if (rows.length !== 1 || rows[0].key !== storageKey || rows[0].url !== "/media/" + storageKey) throw new Error("wf540_media_provenance");'
      : 'if (rows.length !== 0) throw new Error("wf540_media_absence");';
  return (
    BRIDGE_INPUT_READER +
    bridgeInputSchemaGuard("identifier-media-input-v1") +
    String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { media } from "./db/schema.ts";
if (Object.keys(input).join(",") !== "identifier" || !Array.isArray(input.identifier) || input.identifier.length !== 2) throw new Error("wf540_input");
const [mediaId,storageKey] = input.identifier;
const rows = await db.select({ id:media.id,key:media.key,url:media.url }).from(media).where(eq(media.id,mediaId)).limit(2);
const stage = ` +
    JSON.stringify(operation) +
    String.raw`;
` +
    assertion +
    String.raw`
const output = { absent: rows.length === 0, present: rows.length === 1, stage };` +
    BRIDGE_OUTPUT_WRITER
  );
}
const MEDIA_EXACT_BRIDGE_SOURCES = deepFreezeExact(
  Object.fromEntries(
    CLEANUP_OPERATION_KINDS.map((operation) => [operation, mediaExactBridgeSource(operation)])
  )
);
const API_SESSION_OBSERVATION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-session-observation-input-v1") +
  String.raw`
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { sessions } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userAgent,userId" || typeof input.userAgent !== "string" || !input.userAgent || typeof input.userId !== "string") throw new Error("wf540_input");
const sessionRows = await db.select({
  id:sessions.id,userId:sessions.userId,tokenHash:sessions.tokenHash,csrfTokenHash:sessions.csrfTokenHash,
  ip:sessions.ip,userAgent:sessions.userAgent,expiresAt:sessions.expiresAt,
  createdAt:sessions.createdAt,revokedAt:sessions.revokedAt,
}).from(sessions).where(and(eq(sessions.userId,input.userId),eq(sessions.userAgent,input.userAgent))).limit(2);
if (sessionRows.length > 1) throw new Error("wf540_api_session_cardinality");
const rows = sessionRows.map((row)=>({
  id:row.id,userId:row.userId,tokenHash:row.tokenHash,csrfTokenHash:row.csrfTokenHash,
  ip:row.ip,userAgent:row.userAgent,expiresAt:row.expiresAt.toISOString(),
  createdAt:row.createdAt.toISOString(),revokedAt:row.revokedAt?.toISOString() ?? null,
}));
const output = { rows };` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-session-observation-input-v1") +
  String.raw`
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { auditLogs, roles, sessions, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userAgent,userId" || typeof input.userAgent !== "string" || !input.userAgent || typeof input.userId !== "string") throw new Error("wf540_input");
const userRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
if (userRows.length !== 1) throw new Error("wf540_bootstrap_observation_cardinality");
const roleRows = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_observation_roles");
const sessionRows = await db.select({id:sessions.id}).from(sessions).where(and(eq(sessions.userId,input.userId),eq(sessions.userAgent,input.userAgent))).orderBy(sessions.id).limit(4097);
const auditRows = await db.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.actorId,input.userId),eq(auditLogs.action,"auth.login"),eq(sql.raw("metadata->>'userAgent'"),input.userAgent))).orderBy(auditLogs.id).limit(4097);
if (sessionRows.length > 4096 || auditRows.length > 4096) throw new Error("wf540_bootstrap_observation_overflow");
const row = userRows[0];
const rawUserRow = {
  id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
  passwordHash:row.passwordHash,name:row.name,status:row.status,
  createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
  lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((role)=>({
  userId:role.userId,roleId:role.roleId,roleName:role.roleName,roleDescription:role.roleDescription,
  rolePermissions:role.rolePermissions,roleCreatedAt:role.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = {
  auditIds:auditRows.map(({id})=>id),id:row.id,lastLoginAt:rawUserRow.lastLoginAt,rawUserRow,roleTuples,
  sessionIds:sessionRows.map(({id})=>id),updatedAt:rawUserRow.updatedAt,
};` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "userId") throw new Error("wf540_input");
const userRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
if (userRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_cardinality");
const row = userRows[0];
if (Object.keys(row).sort().join(",") !== "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt") throw new Error("wf540_bootstrap_baseline_read_columns");
const roleRows = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
if (roleRows.length !== 1) throw new Error("wf540_bootstrap_baseline_read_roles");
const rawUserRow = {
  id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
  passwordHash:row.passwordHash,name:row.name,status:row.status,
  createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
  lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
};
const roleTuples = roleRows.map((role)=>({
  userId:role.userId,roleId:role.roleId,roleName:role.roleName,roleDescription:role.roleDescription,
  rolePermissions:role.rolePermissions,roleCreatedAt:role.roleCreatedAt.toISOString(),
})).sort((a,b)=>a.roleId.localeCompare(b.roleId));
const output = { id:row.id,rawUserRow,roleTuples };` +
  BRIDGE_OUTPUT_WRITER;
const BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("bootstrap-restore-input-v1") +
  `
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
if (Object.keys(input).sort().join(",") !== "baseline,newestOwnedPair,userId") throw new Error("wf540_input");
const timestamp = (value) => value === null ? null : new Date(value);
const notDistinct = (column,value) => sql\`\${column} IS NOT DISTINCT FROM \${value}\`;
const knownRollback = Object.freeze({ kind:"wf540_bootstrap_known_rollback" });
const rollbackKnown = () => { throw knownRollback; };
const serializeUser = (row) => {
  if (Object.keys(row).sort().join(",") !== "createdAt,email,emailEncrypted,emailHash,id,lastLoginAt,name,passwordHash,status,updatedAt") return null;
  return {
    id:row.id,email:row.email,emailHash:row.emailHash,emailEncrypted:row.emailEncrypted,
    passwordHash:row.passwordHash,name:row.name,status:row.status,
    createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
    lastLoginAt:row.lastLoginAt?.toISOString() ?? null,
  };
};
const selectRoles = async (executor,lock) => {
  let query = executor.select({
    userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
    roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
  }).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,input.userId)).limit(2);
  if (lock) query = query.for("share");
  return (await query).map((row)=>({
    userId:row.userId,roleId:row.roleId,roleName:row.roleName,roleDescription:row.roleDescription,
    rolePermissions:row.rolePermissions,roleCreatedAt:row.roleCreatedAt.toISOString(),
  })).sort((a,b)=>a.roleId.localeCompare(b.roleId));
};
let transactionProof = null;
try {
  transactionProof = await db.transaction(async (tx) => {
    const lockedRows = await tx.select().from(users).where(eq(users.id,input.userId)).limit(2).for("update");
    const lockedRoles = await selectRoles(tx,true);
    if (lockedRows.length !== 1 || lockedRoles.length !== 1) rollbackKnown();
    const locked = serializeUser(lockedRows[0]);
    if (locked === null) rollbackKnown();
    const pairMatches = locked.lastLoginAt === input.newestOwnedPair.lastLoginAt && locked.updatedAt === input.newestOwnedPair.updatedAt;
    const unchangedMatches = canonical({...locked,lastLoginAt:input.baseline.rawUserRow.lastLoginAt,updatedAt:input.baseline.rawUserRow.updatedAt}) === canonical(input.baseline.rawUserRow);
    const roleTuplesByteIdentical = canonical(lockedRoles) === canonical(input.baseline.roleTuples);
    if (!pairMatches || !unchangedMatches || !roleTuplesByteIdentical) rollbackKnown();
    const predicates = [
      notDistinct(users.id,input.userId),notDistinct(users.email,input.baseline.rawUserRow.email),
      notDistinct(users.emailHash,input.baseline.rawUserRow.emailHash),
      notDistinct(users.emailEncrypted,input.baseline.rawUserRow.emailEncrypted),
      notDistinct(users.passwordHash,input.baseline.rawUserRow.passwordHash),
      notDistinct(users.name,input.baseline.rawUserRow.name),notDistinct(users.status,input.baseline.rawUserRow.status),
      notDistinct(users.createdAt,new Date(input.baseline.rawUserRow.createdAt)),
      notDistinct(users.updatedAt,new Date(input.newestOwnedPair.updatedAt)),
      notDistinct(users.lastLoginAt,timestamp(input.newestOwnedPair.lastLoginAt)),
    ];
    const updated = await tx.update(users).set({
      lastLoginAt:timestamp(input.baseline.rawUserRow.lastLoginAt),
      updatedAt:new Date(input.baseline.rawUserRow.updatedAt),
    }).where(and(...predicates)).returning();
    if (updated.length !== 1) rollbackKnown();
    const conditionalUpdateAffectedOne = true;
    const inTransactionRows = await tx.select().from(users).where(eq(users.id,input.userId)).limit(2);
    const inTransactionUser = inTransactionRows.length === 1 ? serializeUser(inTransactionRows[0]) : null;
    const inTransactionByteIdentical = inTransactionUser !== null &&
      canonical(inTransactionUser) === canonical(input.baseline.rawUserRow);
    const rolesAfter = await selectRoles(tx,false);
    const rolesInTransactionByteIdentical = rolesAfter.length === 1 &&
      canonical(rolesAfter) === canonical(input.baseline.roleTuples);
    if (!inTransactionByteIdentical || !rolesInTransactionByteIdentical) rollbackKnown();
    return {
      conditionalUpdateAffectedOne, inTransactionByteIdentical, roleTuplesByteIdentical,
      rolesInTransactionByteIdentical, rolesShareLocked:true, transactionLocked:true,
    };
  });
} catch (error) {
  if (error !== knownRollback) throw error;
}
let output;
if (transactionProof === null) {
  output = { kind:"rolled-back",proof:null };
} else {
  const afterRows = await db.select().from(users).where(eq(users.id,input.userId)).limit(2);
  const afterRoles = await selectRoles(db,false);
  const afterUser = afterRows.length === 1 ? serializeUser(afterRows[0]) : null;
  const afterCommitByteIdentical = afterUser !== null &&
    canonical(afterUser) === canonical(input.baseline.rawUserRow);
  const completeRowByteIdentical = afterCommitByteIdentical;
  const roleTuplesByteIdentical = afterRoles.length === 1 &&
    transactionProof.roleTuplesByteIdentical &&
    canonical(afterRoles) === canonical(input.baseline.roleTuples);
  const restored = completeRowByteIdentical && roleTuplesByteIdentical;
  const proof = {
    ...transactionProof,afterCommitByteIdentical,completeRowByteIdentical,restored,
    roleTuplesByteIdentical,
  };
  output = { kind:restored ? "committed" : "committed-proof-failed",proof };
}` +
  BRIDGE_OUTPUT_WRITER;

function validateExactBridgeKeys(value, keys, label) {
  exactOwnKeys(value, keys, label, { plain: true });
  assertPlainJsonValue(value, label);
  return value;
}

function validateBooleanBridgeProjection(value, key, label) {
  validateExactBridgeKeys(value, [key], label);
  invariant(typeof value[key] === "boolean", label + " boolean drift");
  return value;
}

function validateContentRoutesBridgeProjection(value, label) {
  validateExactBridgeKeys(value, ["exists", "updatedAt", "value"], label);
  invariant(
    typeof value.exists === "boolean" &&
      (value.updatedAt === null || isNullableIsoTimestamp(value.updatedAt)) &&
      (value.exists ? value.updatedAt !== null : value.updatedAt === null && value.value === null),
    label + " projection drift"
  );
  return value;
}

function responseLostCandidateFamilyForDescriptor(descriptor) {
  const source = descriptor.source;
  if (source === RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE) return "user";
  if (source === RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE) return "contentType";
  if (
    source === RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "entry";
  }
  if (
    source === RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "screen";
  }
  if (source === RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE) return "media";
  if (
    source === RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "override";
  }
  if (
    source === RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "setting";
  }
  invariant(false, "bounded candidate descriptor source is not registered");
}

const RESPONSE_LOST_CANDIDATE_KEYS_BY_FAMILY = deepFreezeExact({
  user: [
    "adminRoleTupleCount",
    "adminWildcardPermissionCount",
    "id",
    "name",
    "normalizedEmailMatches",
    "passwordHashPresent",
    "status",
  ],
  contentType: ["config", "id", "name", "schema", "slug", "status"],
  entry: [
    "accessPasswordAbsent",
    "authorId",
    "data",
    "id",
    "publishedAt",
    "scheduledAt",
    "slug",
    "status",
    "tags",
    "title",
    "typeId",
    "visibility",
  ],
  screen: [
    "collectionRole",
    "compositionKey",
    "contentTypeId",
    "definition",
    "id",
    "name",
    "schemaVersion",
    "showInSidebar",
    "sidebarLabel",
    "status",
  ],
  media: [
    "alt",
    "caption",
    "createdBy",
    "credit",
    "description",
    "focalX",
    "focalY",
    "folderId",
    "height",
    "id",
    "key",
    "mimeType",
    "originalName",
    "size",
    "tags",
    "title",
    "type",
    "url",
    "width",
  ],
  override: ["blockId", "entryId", "propPath", "screenId", "updatedBy", "value"],
  setting: ["key", "userId", "value"],
});

function validateBridgeNullableUuid(value, label) {
  if (value !== null) requireBridgeUuid(value, label);
}

function validateBridgeNullableString(value, label, maximum = 1024) {
  if (value !== null) requireBoundedBridgeString(value, label, maximum);
}

function validateBridgeJsonObject(value, label) {
  exactOwnKeys(value, Object.keys(value ?? {}), label, { plain: true });
  assertPlainJsonValue(value, label);
  return value;
}

function validateBridgeStringArray(value, label, maximumItems = 64, maximumLength = 256) {
  invariant(Array.isArray(value) && value.length <= maximumItems, label + " array bound drift");
  value.forEach((item, index) =>
    requireBoundedBridgeString(item, label + "[" + index + "]", maximumLength)
  );
  invariant(new Set(value).size === value.length, label + " contains duplicates");
  return value;
}

function validateResponseLostContentSchema(schema, label) {
  exactOwnKeys(schema, ["additionalProperties", "properties", "type"], label, { plain: true });
  invariant(
    schema.type === "object" && schema.additionalProperties === false,
    label + " root drift"
  );
  validateBridgeJsonObject(schema.properties, label + " properties");
  const fieldOrders = [];
  invariant(
    Object.keys(schema.properties).length <= MAX_NATURAL_KEY_CANDIDATES,
    label + " property bound drift"
  );
  for (const [field, property] of Object.entries(schema.properties)) {
    requireBoundedBridgeString(field, label + " field name", 128);
    validateBridgeJsonObject(property, label + " property " + field);
    requireBoundedBridgeString(property.title, label + " title " + field, 256);
    invariant(
      ["media", "relation", "text"].includes(property.xFieldType),
      label + " field discriminator drift: " + field
    );
    validateBridgeJsonObject(property.xFieldConfig, label + " field config " + field);
    invariant(
      Number.isSafeInteger(property.xFieldConfig.order) && property.xFieldConfig.order >= 0,
      label + " field order drift: " + field
    );
    fieldOrders.push(property.xFieldConfig.order);
    const validateStringItems = () => {
      exactOwnKeys(property.items, ["type"], label + " items " + field, { plain: true });
      invariant(property.items.type === "string", label + " items drift: " + field);
    };
    if (property.xFieldType === "text") {
      exactOwnKeys(
        property,
        ["title", "type", "xFieldConfig", "xFieldType"],
        label + " text property " + field,
        { plain: true }
      );
      exactOwnKeys(property.xFieldConfig, ["order"], label + " text config " + field, {
        plain: true,
      });
      invariant(property.type === "string", label + " text type drift: " + field);
      continue;
    }
    if (property.xFieldType === "media") {
      const mediaIsMultiple = property.type === "array";
      invariant(
        mediaIsMultiple || property.type === "string",
        label + " media type drift: " + field
      );
      exactOwnKeys(
        property,
        mediaIsMultiple
          ? ["items", "title", "type", "xFieldConfig", "xFieldType"]
          : ["title", "type", "xFieldConfig", "xFieldType"],
        label + " media property " + field,
        { plain: true }
      );
      exactOwnKeys(property.xFieldConfig, ["media", "order"], label + " media config " + field, {
        plain: true,
      });
      exactOwnKeys(property.xFieldConfig.media, ["accept"], label + " media " + field, {
        plain: true,
      });
      validateBridgeStringArray(
        property.xFieldConfig.media.accept,
        label + " media accept " + field,
        32,
        128
      );
      if (mediaIsMultiple) validateStringItems();
      continue;
    }
    exactOwnKeys(
      property.xFieldConfig,
      ["order", "relation"],
      label + " relation config " + field,
      { plain: true }
    );
    exactOwnKeys(
      property.xFieldConfig.relation,
      ["multiple", "target"],
      label + " relation " + field,
      { plain: true }
    );
    const relationIsMultiple = property.xFieldConfig.relation.multiple;
    invariant(
      typeof relationIsMultiple === "boolean" &&
        property.type === (relationIsMultiple ? "array" : "string"),
      label + " relation multiplicity/type drift: " + field
    );
    exactOwnKeys(
      property,
      relationIsMultiple
        ? ["items", "title", "type", "xFieldConfig", "xFieldType", "xRelationTarget"]
        : ["title", "type", "xFieldConfig", "xFieldType", "xRelationTarget"],
      label + " relation property " + field,
      { plain: true }
    );
    requireBoundedBridgeString(
      property.xFieldConfig.relation.target,
      label + " relation config target " + field,
      256
    );
    requireBoundedBridgeString(property.xRelationTarget, label + " relation target " + field, 256);
    invariant(
      property.xRelationTarget === property.xFieldConfig.relation.target,
      label + " relation target correlation drift: " + field
    );
    if (relationIsMultiple) validateStringItems();
  }
  invariant(
    deepEqualJson(
      [...fieldOrders].sort((left, right) => left - right),
      Array.from({ length: fieldOrders.length }, (_value, index) => index)
    ),
    label + " field order sequence drift"
  );
}

function validateResponseLostContentConfig(config, label) {
  validateBridgeJsonObject(config, label);
  const allowed = ["draftsEnabled", "permissions", "pluralName", "singularName", "versioning"];
  invariant(
    Object.keys(config).every((key) => allowed.includes(key)),
    label + " has unknown keys"
  );
  for (const key of ["singularName", "pluralName"]) {
    if (Object.hasOwn(config, key)) requireBoundedBridgeString(config[key], label + " " + key, 256);
  }
  for (const key of ["draftsEnabled", "versioning"]) {
    if (Object.hasOwn(config, key))
      invariant(typeof config[key] === "boolean", label + " " + key + " drift");
  }
  if (Object.hasOwn(config, "permissions")) {
    validateBridgeJsonObject(config.permissions, label + " permissions");
    invariant(Object.keys(config.permissions).length <= 50, label + " permission role bound drift");
    for (const [role, grants] of Object.entries(config.permissions)) {
      requireBoundedBridgeString(role, label + " role", 128);
      validateBridgeJsonObject(grants, label + " grants " + role);
      invariant(
        Object.keys(grants).every((key) =>
          ["create", "delete", "publish", "read", "update"].includes(key)
        ),
        label + " grant key drift"
      );
      invariant(
        Object.values(grants).every((grant) => typeof grant === "boolean"),
        label + " grant scalar drift"
      );
    }
  }
}

function responseLostActionIdForOperation(operationId) {
  return (
    Object.entries(RESPONSE_LOST_QUERY_OPERATION_BINDINGS).find(
      ([, binding]) =>
        binding.baselineOperationId === operationId || binding.discoveryOperationId === operationId
    )?.[0] ?? null
  );
}

function validateResponseLostCandidateFamily(state, descriptor, input, family, candidate, label) {
  requireBridgeUuid(candidate.id ?? candidate.userId ?? candidate.screenId, label + " primary ID");
  if (family === "user") {
    validateBridgeNullableString(candidate.name, label + " name", 256);
    invariant(
      [candidate.adminRoleTupleCount, candidate.adminWildcardPermissionCount].every(
        (count) => Number.isSafeInteger(count) && count >= 0 && count <= MAX_NATURAL_KEY_CANDIDATES
      ) &&
        typeof candidate.normalizedEmailMatches === "boolean" &&
        typeof candidate.passwordHashPresent === "boolean" &&
        candidate.adminRoleTupleCount === candidate.adminWildcardPermissionCount &&
        ["active", "inactive", "pending"].includes(candidate.status),
      label + " user scalar drift"
    );
    return;
  }
  if (family === "contentType") {
    requireBoundedBridgeString(candidate.name, label + " name", 256);
    requireBoundedBridgeString(candidate.slug, label + " slug", 256);
    invariant(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(candidate.slug) &&
        ["draft", "published"].includes(candidate.status) &&
        (!Object.hasOwn(input, "slug") || candidate.slug === input.slug),
      label + " slug/status correlation drift"
    );
    validateResponseLostContentSchema(candidate.schema, label + " schema");
    validateResponseLostContentConfig(candidate.config, label + " config");
    return;
  }
  if (family === "entry") {
    requireBridgeUuid(candidate.typeId, label + " type ID");
    validateBridgeNullableUuid(candidate.authorId, label + " author ID");
    requireBoundedBridgeString(candidate.title, label + " title", 512);
    requireBoundedBridgeString(candidate.slug, label + " slug", 256);
    invariant(
      ["draft", "published", "scheduled", "archived"].includes(candidate.status) &&
        ["public", "private", "password"].includes(candidate.visibility) &&
        typeof candidate.accessPasswordAbsent === "boolean" &&
        candidate.slug === (Object.hasOwn(input, "slug") ? input.slug : input.entrySlug) &&
        (!Object.hasOwn(input, "typeId") || candidate.typeId === input.typeId),
      label + " entry scalar drift"
    );
    validateBridgeStringArray(candidate.tags, label + " tags", 20, 24);
    validateBridgeJsonObject(candidate.data, label + " data");
    invariant(
      isNullableIsoTimestamp(candidate.publishedAt) &&
        isNullableIsoTimestamp(candidate.scheduledAt),
      label + " timestamp drift"
    );
    return;
  }
  if (family === "screen") {
    requireBridgeUuid(candidate.contentTypeId, label + " content-type ID");
    requireBoundedBridgeString(candidate.name, label + " name", 160);
    validateBridgeNullableString(candidate.compositionKey, label + " composition key", 160);
    validateBridgeNullableString(candidate.sidebarLabel, label + " sidebar label", 160);
    invariant(
      ["draft", "active"].includes(candidate.status) &&
        (candidate.collectionRole === null ||
          ["canonical-admin-screen", "secondary-admin-screen"].includes(
            candidate.collectionRole
          )) &&
        typeof candidate.showInSidebar === "boolean" &&
        candidate.schemaVersion === 4 &&
        candidate.name === input.name &&
        (!Object.hasOwn(input, "contentTypeId") ||
          candidate.contentTypeId === input.contentTypeId) &&
        (candidate.compositionKey === null || /^[a-zA-Z0-9_.-]+$/u.test(candidate.compositionKey)),
      label + " Screen scalar drift"
    );
    validateBridgeJsonObject(candidate.definition, label + " definition");
    exactOwnKeys(
      candidate.definition,
      ["editorView", "listView", "schemaVersion"],
      label + " definition",
      { plain: true }
    );
    invariant(candidate.definition.schemaVersion === 4, label + " definition version drift");
    validateBridgeJsonObject(candidate.definition.editorView, label + " editor view");
    validateBridgeJsonObject(candidate.definition.listView, label + " list view");
    const screenActionId = responseLostActionIdForOperation(descriptor.operationId);
    const intendedScreen =
      screenActionId === null
        ? null
        : state?.responseLostIntents?.get(screenActionId)?.preparedBody;
    if (intendedScreen?.definition)
      invariant(
        deepEqualJson(candidate.definition, intendedScreen.definition),
        label + " authored Screen definition drift"
      );
    return;
  }
  if (family === "media") {
    requireBoundedBridgeString(candidate.key, label + " storage key", 1024);
    invariant(
      /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u.test(candidate.key) &&
        candidate.url === "/media/" + candidate.key,
      label + " media path drift"
    );
    requireBoundedBridgeString(candidate.originalName, label + " original name", 255);
    requireBoundedBridgeString(candidate.type, label + " type", 64);
    requireBoundedBridgeString(candidate.mimeType, label + " MIME", 128);
    invariant(
      ["file", "image"].includes(candidate.type) &&
        Number.isSafeInteger(candidate.size) &&
        candidate.size > 0 &&
        candidate.size <= MAX_STREAM_BYTES &&
        candidate.originalName === input.originalName &&
        candidate.mimeType === input.mimeType &&
        candidate.size === input.size,
      label + " media scalar/correlation drift"
    );
    for (const key of ["width", "height"]) {
      invariant(
        candidate[key] === null || (Number.isSafeInteger(candidate[key]) && candidate[key] > 0),
        label + " " + key + " drift"
      );
    }
    for (const key of ["focalX", "focalY"]) {
      invariant(
        candidate[key] === null ||
          (typeof candidate[key] === "number" &&
            Number.isFinite(candidate[key]) &&
            candidate[key] >= 0 &&
            candidate[key] <= 1),
        label + " " + key + " drift"
      );
    }
    for (const key of ["alt", "title", "caption"])
      validateBridgeNullableString(candidate[key], label + " " + key, 2048);
    validateBridgeNullableString(candidate.description, label + " description", 2000);
    validateBridgeNullableString(candidate.credit, label + " credit", 300);
    validateBridgeNullableUuid(candidate.folderId, label + " folder ID");
    validateBridgeNullableUuid(candidate.createdBy, label + " creator ID");
    validateBridgeStringArray(candidate.tags, label + " tags", 30, 40);
    invariant(
      candidate.tags.every((tag) => tag === tag.trim()),
      label + " tags are not trimmed"
    );
    return;
  }
  if (family === "override") {
    requireBridgeUuid(candidate.entryId, label + " entry ID");
    requireBoundedBridgeString(candidate.blockId, label + " block ID", 160);
    invariant(
      /^[a-zA-Z0-9_.-]+$/u.test(candidate.blockId) &&
        candidate.propPath === "mediaAssetId" &&
        candidate.blockId === input.blockId &&
        candidate.propPath === input.propPath &&
        (!Object.hasOwn(input, "screenId") || candidate.screenId === input.screenId) &&
        (!Object.hasOwn(input, "entryId") || candidate.entryId === input.entryId),
      label + " override natural-key drift"
    );
    requireBridgeUuid(candidate.value, label + " value media ID");
    validateBridgeNullableUuid(candidate.updatedBy, label + " updater ID");
    return;
  }
  invariant(family === "setting", label + " family drift");
  invariant(candidate.key === "customScreens.entry.preferences", label + " setting key drift");
  if (Object.hasOwn(input, "userId"))
    invariant(candidate.userId === input.userId, label + " setting user correlation drift");
  exactOwnKeys(candidate.value, ["showFieldMetadata", "version"], label + " setting value", {
    plain: true,
  });
  invariant(
    candidate.value.version === 1 && typeof candidate.value.showFieldMetadata === "boolean",
    label + " setting value drift"
  );
}

function validateBoundedCandidatesBridgeOutput(state, descriptor, input, value) {
  validateExactBridgeKeys(value, ["candidates", "overflow"], descriptor.operationId + " output");
  invariant(
    Array.isArray(value.candidates) &&
      value.candidates.length <= MAX_NATURAL_KEY_CANDIDATES &&
      typeof value.overflow === "boolean",
    descriptor.operationId + " candidate envelope drift"
  );
  const family = responseLostCandidateFamilyForDescriptor(descriptor);
  const candidateKeys = RESPONSE_LOST_CANDIDATE_KEYS_BY_FAMILY[family];
  for (const candidate of value.candidates) {
    validateExactBridgeKeys(candidate, candidateKeys, descriptor.operationId + " candidate");
    validateResponseLostCandidateFamily(
      state,
      descriptor,
      input,
      family,
      candidate,
      descriptor.operationId + " candidate"
    );
  }
  return value;
}

function validateRequiredSmokeSettingsProjection(value, label) {
  validateExactBridgeKeys(value, ["driver", "localDir", "setup"], label);
  const expected = {
    driver: ["storage.driver", "local"],
    localDir: ["storage.local.dir", null],
    setup: ["setup.completed", true],
  };
  for (const [name, row] of Object.entries(value)) {
    validateExactBridgeKeys(row, ["key", "updatedAt", "value"], label + " " + name);
    const [expectedKey, expectedValue] = expected[name];
    invariant(
      row.key === expectedKey &&
        isNullableIsoTimestamp(row.updatedAt) &&
        row.updatedAt !== null &&
        (expectedValue === null
          ? typeof row.value === "string" && row.value.length > 0
          : row.value === expectedValue),
      label + " " + name + " row drift"
    );
  }
  return value;
}

function validateStoragePreflightBridgeOutput(state, descriptor, _input, value) {
  validateExactBridgeKeys(
    value,
    [
      "bootstrap",
      "contentRoutes",
      "local",
      "requiredSettings",
      "setupComplete",
      "storageRoot",
      "taskTrafficBaseline",
    ],
    descriptor.operationId + " output"
  );
  validateBootstrapPrivateBaseline(value.bootstrap, descriptor.operationId + " bootstrap");
  validateContentRoutesBridgeProjection(
    value.contentRoutes,
    descriptor.operationId + " content routes"
  );
  validateRequiredSmokeSettingsProjection(
    value.requiredSettings,
    descriptor.operationId + " required settings"
  );
  validateExactBridgeKeys(
    value.taskTrafficBaseline,
    ["accessIds", "auditIds", "sessionIds"],
    descriptor.operationId + " task traffic baseline"
  );
  invariant(
    value.local === true &&
      value.setupComplete === true &&
      typeof value.storageRoot === "string" &&
      value.storageRoot.length > 0 &&
      path.isAbsolute(value.storageRoot) &&
      path.resolve(value.storageRoot) === value.storageRoot &&
      value.storageRoot ===
        path.resolve(state.root, "core", value.requiredSettings.localDir.value) &&
      [
        value.taskTrafficBaseline.accessIds,
        value.taskTrafficBaseline.auditIds,
        value.taskTrafficBaseline.sessionIds,
      ].every(
        (ids) =>
          Array.isArray(ids) &&
          ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/u.test(id))
      ),
    descriptor.operationId + " storage preflight projection drift"
  );
  return value;
}

function validateTaskTrafficBridgeOutput(_state, descriptor, input, value) {
  validateExactBridgeKeys(
    value,
    ["access", "audit", "completeSession", "session"],
    descriptor.operationId + " output"
  );
  const rowContracts = [
    ["access", value.access, ["id", "sessionId", "userAgent", "userId"]],
    ["audit", value.audit, ["actorId", "id", "userAgent"]],
    ["completeSession", value.completeSession, ["id", "userAgent", "userId"]],
    ["session", value.session, ["id", "userAgent", "userId"]],
  ];
  const nullableUuid = (candidate, label) => {
    if (candidate !== null) requireBridgeUuid(candidate, label);
  };
  for (const [kind, rows, keys] of rowContracts) {
    invariant(
      Array.isArray(rows) && rows.length <= MAX_COMPLETE_SESSION_ROWS,
      descriptor.operationId + " row bound drift"
    );
    for (const row of rows) {
      validateExactBridgeKeys(row, keys, descriptor.operationId + " " + kind + " row");
      requireBridgeUuid(row.id, descriptor.operationId + " " + kind + " row ID");
      if (kind === "access") {
        nullableUuid(row.sessionId, descriptor.operationId + " access session ID");
        nullableUuid(row.userId, descriptor.operationId + " access user ID");
      } else if (kind === "audit") {
        nullableUuid(row.actorId, descriptor.operationId + " audit actor ID");
      } else {
        requireBridgeUuid(row.userId, descriptor.operationId + " " + kind + " user ID");
      }
      if (kind === "completeSession") {
        invariant(
          row.userAgent === null ||
            (typeof row.userAgent === "string" && Buffer.byteLength(row.userAgent) <= 512),
          descriptor.operationId + " complete-session user-agent drift"
        );
      } else {
        invariant(
          typeof row.userAgent === "string" && input.userAgents.includes(row.userAgent),
          descriptor.operationId + " " + kind + " user-agent drift"
        );
      }
    }
  }
  return value;
}

function validateBootstrapRestoreBridgeOutput(_state, descriptor, _input, value) {
  validateExactBridgeKeys(value, ["kind", "proof"], descriptor.operationId + " output");
  invariant(
    ["committed", "committed-proof-failed", "rolled-back"].includes(value.kind),
    descriptor.operationId + " closed restore outcome kind drift"
  );
  if (value.kind === "rolled-back") {
    invariant(value.proof === null, descriptor.operationId + " rollback proof drift");
    return value;
  }
  const proofKeys = [
    "afterCommitByteIdentical",
    "completeRowByteIdentical",
    "conditionalUpdateAffectedOne",
    "inTransactionByteIdentical",
    "restored",
    "roleTuplesByteIdentical",
    "rolesInTransactionByteIdentical",
    "rolesShareLocked",
    "transactionLocked",
  ];
  validateExactBridgeKeys(value.proof, proofKeys, descriptor.operationId + " proof");
  invariant(
    proofKeys.every((key) => typeof value.proof[key] === "boolean"),
    descriptor.operationId + " restore boolean drift"
  );
  const transactionKeys = [
    "conditionalUpdateAffectedOne",
    "inTransactionByteIdentical",
    "rolesInTransactionByteIdentical",
    "rolesShareLocked",
    "transactionLocked",
  ];
  invariant(
    transactionKeys.every((key) => value.proof[key] === true) &&
      value.proof.completeRowByteIdentical === value.proof.afterCommitByteIdentical,
    descriptor.operationId + " committed transaction proof drift"
  );
  if (value.kind === "committed") {
    invariant(
      proofKeys.every((key) => value.proof[key] === true),
      descriptor.operationId + " committed restore proof failed"
    );
  } else {
    invariant(
      value.proof.restored === false &&
        (value.proof.afterCommitByteIdentical === false ||
          value.proof.roleTuplesByteIdentical === false),
      descriptor.operationId + " committed proof-failure outcome drift"
    );
  }
  return value;
}

function validateBootstrapBaselineReadBridgeOutput(state, descriptor, input, value) {
  validateExactBridgeKeys(
    value,
    ["id", "rawUserRow", "roleTuples"],
    descriptor.operationId + " output"
  );
  exactOwnKeys(
    value.rawUserRow,
    BOOTSTRAP_RAW_USER_ROW_KEYS,
    descriptor.operationId + " raw user row",
    { plain: true }
  );
  invariant(
    value.id === input.userId &&
      state.bootstrapBaseline !== null &&
      value.id === state.bootstrapBaseline.id &&
      deepEqualJson(value.rawUserRow, state.bootstrapBaseline.rawUserRow) &&
      deepEqualJson(value.roleTuples, state.bootstrapBaseline.roleTuples),
    descriptor.operationId + " immutable baseline byte identity drift"
  );
  assertPlainJsonValue(value.rawUserRow, descriptor.operationId + " raw user row");
  assertPlainJsonValue(value.roleTuples, descriptor.operationId + " role tuples");
  return value;
}

function validateStrictResourceBridgeOutput(state, descriptor, input, value) {
  const source = descriptor.source;
  if (
    [
      ...Object.values(PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES),
      ...Object.values(SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES),
      ...Object.values(USER_SETTING_EXACT_BRIDGE_SOURCES),
      ...Object.values(USER_EXACT_BRIDGE_SOURCES),
      ...Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES).flatMap((sources) =>
        Object.values(sources)
      ),
    ].includes(source)
  ) {
    validateExactBridgeKeys(
      value,
      ["absent", "affected", "present"],
      descriptor.operationId + " output"
    );
    invariant(
      typeof value.absent === "boolean" &&
        Number.isSafeInteger(value.affected) &&
        typeof value.present === "boolean",
      descriptor.operationId + " resource result drift"
    );
    return value;
  }
  if (Object.values(MEDIA_EXACT_BRIDGE_SOURCES).includes(source)) {
    validateExactBridgeKeys(
      value,
      ["absent", "present", "stage"],
      descriptor.operationId + " output"
    );
    invariant(
      typeof value.absent === "boolean" &&
        typeof value.present === "boolean" &&
        typeof value.stage === "string",
      descriptor.operationId + " media result drift"
    );
    return value;
  }
  if (
    [
      CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
      CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
      CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
    ].includes(source)
  ) {
    return validateBooleanBridgeProjection(value, "present", descriptor.operationId + " output");
  }
  if (source === BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE)
    return validateBootstrapRestoreBridgeOutput(state, descriptor, input, value);
  if (source === BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE)
    return validateBootstrapBaselineReadBridgeOutput(state, descriptor, input, value);
  if (source === BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE)
    return validateBootstrapLoginObservation(state, value, descriptor.operationId + " output");
  if (source === CONTENT_ROUTES_EXACT_BRIDGE_SOURCE)
    return validateContentRoutesBridgeProjection(value, descriptor.operationId + " output");
  if (source === STORAGE_PREFLIGHT_BRIDGE_SOURCE)
    return validateStoragePreflightBridgeOutput(state, descriptor, input, value);
  if (source === MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE) {
    validateExactBridgeKeys(value, ["rowCount"], descriptor.operationId + " output");
    invariant(
      Number.isSafeInteger(value.rowCount) && value.rowCount >= 0 && value.rowCount <= 1,
      descriptor.operationId + " missing media count drift"
    );
    return value;
  }
  invariant(false, "strict resource bridge output source is not registered");
}

const BUN_BRIDGE_OUTPUT_VALIDATORS = deepFreezeExact({
  "api-session-observation-private-v1": (state, descriptor, input, value) => {
    validateApiSessionObservation(
      value,
      input.userId,
      input.userAgent,
      descriptor.operationId + " output"
    );
    return value;
  },
  "auth-rate-private-v1": (_state, descriptor, _input, value) => {
    validateExactBridgeKeys(
      value,
      ["enabled", "maxRequests", "windowSeconds"],
      descriptor.operationId + " output"
    );
    invariant(
      typeof value.enabled === "boolean" &&
        Number.isSafeInteger(value.maxRequests) &&
        Number.isSafeInteger(value.windowSeconds),
      descriptor.operationId + " rate projection drift"
    );
    return value;
  },
  "bootstrap-login-observation-private-v1": (state, descriptor, _input, value) =>
    validateBootstrapLoginObservation(state, value, descriptor.operationId + " output"),
  "bootstrap-baseline-read-private-v1": validateBootstrapBaselineReadBridgeOutput,
  "bootstrap-restore-private-v2": validateBootstrapRestoreBridgeOutput,
  "bounded-natural-candidates-v1": validateBoundedCandidatesBridgeOutput,
  "content-routes-private-v1": (_state, descriptor, _input, value) =>
    validateContentRoutesBridgeProjection(value, descriptor.operationId + " output"),
  "legacy-user-absence-private-v1": (_state, descriptor, _input, value) =>
    validateBooleanBridgeProjection(value, "absent", descriptor.operationId + " output"),
  "legacy-user-delete-private-v1": (_state, descriptor, _input, value) =>
    validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output"),
  "missing-media-row-count-v1": (_state, descriptor, _input, value) => {
    validateExactBridgeKeys(value, ["rowCount"], descriptor.operationId + " output");
    invariant(
      Number.isSafeInteger(value.rowCount) && value.rowCount >= 0 && value.rowCount <= 1,
      descriptor.operationId + " missing media count drift"
    );
    return value;
  },
  "preference-read-private-v1": (_state, descriptor, _input, value) =>
    validateBooleanBridgeProjection(value, "showFieldMetadata", descriptor.operationId + " output"),
  "preference-write-private-v1": (_state, descriptor, _input, value) =>
    validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output"),
  "resource-owner-private-v2": (_state, descriptor, input, value) => {
    validateExactBridgeKeys(
      value,
      ["entries", "media", "override", "overrideAbsent"],
      descriptor.operationId + " output"
    );
    invariant(Array.isArray(value.entries), descriptor.operationId + " owner entries drift");
    for (const entry of value.entries)
      validateExactBridgeKeys(
        entry,
        ["id", "ownerSubjectIdentifier"],
        descriptor.operationId + " owner entry"
      );
    validateExactBridgeKeys(
      value.media,
      ["id", "ownerSubjectIdentifier"],
      descriptor.operationId + " media owner"
    );
    invariant(
      typeof value.overrideAbsent === "boolean" &&
        value.overrideAbsent === !input.overrideExpectedPresent,
      descriptor.operationId + " override absence drift"
    );
    if (input.overrideExpectedPresent) {
      validateExactBridgeKeys(
        value.override,
        ["ownerSubjectIdentifier"],
        descriptor.operationId + " override owner"
      );
    } else invariant(value.override === null, descriptor.operationId + " absent override drift");
    return value;
  },
  "seo-entry-discovery-private-v1": (_state, descriptor, input, value) => {
    validateExactBridgeKeys(value, ["candidates"], descriptor.operationId + " output");
    invariant(
      Array.isArray(value.candidates) && value.candidates.length <= 6,
      descriptor.operationId + " SEO candidate bound drift"
    );
    const documentIds = new Set();
    const targetIds = new Set();
    let previousCorrelation = null;
    for (const candidate of value.candidates) {
      validateExactBridgeKeys(
        candidate,
        ["id", "targetId", "targetType"],
        descriptor.operationId + " SEO candidate"
      );
      requireBridgeUuid(candidate.id, descriptor.operationId + " SEO document ID");
      requireBridgeUuid(candidate.targetId, descriptor.operationId + " SEO target ID");
      const correlation = candidate.targetId + "\0" + candidate.id;
      invariant(
        candidate.targetType === "entry" &&
          input.targetIds.includes(candidate.targetId) &&
          !documentIds.has(candidate.id) &&
          !targetIds.has(candidate.targetId) &&
          (previousCorrelation === null || previousCorrelation < correlation),
        descriptor.operationId + " SEO target correlation drift"
      );
      documentIds.add(candidate.id);
      targetIds.add(candidate.targetId);
      previousCorrelation = correlation;
    }
    return value;
  },
  "screen-materialize-private-v1": (_state, descriptor, input, value) => {
    validateExactBridgeKeys(
      value,
      [...Object.keys(input.bodyWithoutDefinition), "definition", "schemaVersion"],
      descriptor.operationId + " output"
    );
    invariant(
      value.schemaVersion === 4 &&
        value.definition &&
        typeof value.definition === "object" &&
        !Array.isArray(value.definition),
      descriptor.operationId + " screen projection drift"
    );
    return value;
  },
  "session-policy-private-v1": (_state, descriptor, _input, value) => {
    validateExactBridgeKeys(
      value,
      ["csrfHeaderName", "effectiveMaxPerUserAtLeast2", "singleSession"],
      descriptor.operationId + " output"
    );
    invariant(
      typeof value.csrfHeaderName === "string" &&
        typeof value.effectiveMaxPerUserAtLeast2 === "boolean" &&
        typeof value.singleSession === "boolean",
      descriptor.operationId + " session policy drift"
    );
    return value;
  },
  "storage-preflight-private-v2": validateStoragePreflightBridgeOutput,
  "strict-resource-operation-v1": validateStrictResourceBridgeOutput,
  "task-traffic-complete-private-v2": validateTaskTrafficBridgeOutput,
  "user-identity-private-v2": (_state, descriptor, _input, value) => {
    validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output");
    invariant(value.ok === true, descriptor.operationId + " user identity proof drift");
    return value;
  },
  "user-provision-private-v2": (_state, descriptor, _input, value) => {
    validateExactBridgeKeys(
      value,
      [
        "adminRoleTupleCount",
        "exactIdPasswordUpdate",
        "normalizedEmailMatches",
        "userEmail",
        "userId",
      ],
      descriptor.operationId + " output"
    );
    invariant(
      Number.isSafeInteger(value.adminRoleTupleCount) &&
        typeof value.exactIdPasswordUpdate === "boolean" &&
        typeof value.normalizedEmailMatches === "boolean" &&
        typeof value.userEmail === "string" &&
        typeof value.userId === "string",
      descriptor.operationId + " user provision drift"
    );
    return value;
  },
});

function validateBunBridgeOutput(state, descriptor, input, value) {
  const validator = BUN_BRIDGE_OUTPUT_VALIDATORS[descriptor.outputSchemaId];
  invariant(
    typeof validator === "function",
    "Bun bridge output schema is not registered: " + descriptor.outputSchemaId
  );
  return validator(state, descriptor, input, value);
}

function bunBridgeInputSchema(inputKeys, validator) {
  invariant(
    Array.isArray(inputKeys) && typeof validator === "function",
    "Bun bridge input schema declaration drift"
  );
  return deepFreezeExact({ inputKeys: [...inputKeys].sort(), validator });
}

function requireBoundedBridgeString(value, label, maximum = 512) {
  invariant(
    typeof value === "string" &&
      value.length > 0 &&
      !value.includes("\0") &&
      Buffer.byteLength(value) <= maximum,
    label + " bounded string drift"
  );
  return value;
}

function requireBridgeUuid(value, label) {
  invariant(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value),
    label + " UUID drift"
  );
  return value;
}

function validateBridgeIdentifierTuple(input, length, label) {
  invariant(
    Array.isArray(input.identifier) && input.identifier.length === length,
    label + " tuple bound drift"
  );
  input.identifier.forEach((value, index) =>
    requireBoundedBridgeString(value, label + "[" + index + "]", 1024)
  );
  return input.identifier;
}

const BUN_BRIDGE_INPUT_VALIDATORS = deepFreezeExact({
  "bootstrap-restore-input-v1": bunBridgeInputSchema(
    ["baseline", "newestOwnedPair", "userId"],
    (_state, _descriptor, input) => {
      validateBootstrapPrivateBaseline(input.baseline, "Bun bootstrap restore baseline");
      exactOwnKeys(
        input.newestOwnedPair,
        ["lastLoginAt", "updatedAt"],
        "Bun bootstrap newest pair",
        { plain: true }
      );
      invariant(
        input.userId === input.baseline.id &&
          isNullableIsoTimestamp(input.newestOwnedPair.lastLoginAt) &&
          isNullableIsoTimestamp(input.newestOwnedPair.updatedAt),
        "Bun bootstrap restore identity/timestamp drift"
      );
    }
  ),
  "email-input-v1": bunBridgeInputSchema(["email"], (_state, _descriptor, input) => {
    requireBoundedBridgeString(input.email, "Bun email", 320);
    invariant(
      input.email === input.email.toLowerCase() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
      "Bun email normalization drift"
    );
  }),
  "empty-input-v1": bunBridgeInputSchema([], () => {}),
  "entry-discovery-input-v1": bunBridgeInputSchema(
    ["slug", "typeId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.typeId, "Bun entry type ID");
      requireBoundedBridgeString(input.slug, "Bun entry slug", 256);
    }
  ),
  "entry-preflight-input-v1": bunBridgeInputSchema(
    ["entrySlug", "typeSlug"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.entrySlug, "Bun entry preflight slug", 256);
      requireBoundedBridgeString(input.typeSlug, "Bun type preflight slug", 256);
    }
  ),
  "identifier-media-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [mediaId, storageKey] = validateBridgeIdentifierTuple(input, 2, "Bun media identifier");
      requireBridgeUuid(mediaId, "Bun media identifier ID");
      invariant(
        /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u.test(storageKey),
        "Bun media storage-key drift"
      );
    }
  ),
  "identifier-override-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [screenId, entryId, blockId, propPath] = validateBridgeIdentifierTuple(
        input,
        4,
        "Bun override identifier"
      );
      requireBridgeUuid(screenId, "Bun override Screen ID");
      requireBridgeUuid(entryId, "Bun override entry ID");
      requireBoundedBridgeString(blockId, "Bun override block ID", 256);
      invariant(propPath === "mediaAssetId", "Bun override propPath drift");
    }
  ),
  "identifier-setting-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [userId, key] = validateBridgeIdentifierTuple(input, 2, "Bun setting identifier");
      requireBridgeUuid(userId, "Bun setting user ID");
      invariant(key === "customScreens.entry.preferences", "Bun setting key drift");
    }
  ),
  "identifier-uuid-input-v1": bunBridgeInputSchema(["identifier"], (_state, _descriptor, input) => {
    const [id] = validateBridgeIdentifierTuple(input, 1, "Bun UUID identifier");
    requireBridgeUuid(id, "Bun UUID identifier");
  }),
  "media-id-input-v1": bunBridgeInputSchema(["mediaId"], (_state, _descriptor, input) => {
    requireBridgeUuid(input.mediaId, "Bun media ID");
  }),
  "media-natural-input-v1": bunBridgeInputSchema(
    ["mimeType", "originalName", "size"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.mimeType, "Bun media MIME", 128);
      requireBoundedBridgeString(input.originalName, "Bun media filename", 512);
      invariant(
        Number.isSafeInteger(input.size) && input.size > 0 && input.size <= MAX_STREAM_BYTES,
        "Bun media size drift"
      );
    }
  ),
  "override-discovery-input-v1": bunBridgeInputSchema(
    ["blockId", "entryId", "propPath", "screenId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.screenId, "Bun override Screen ID");
      requireBridgeUuid(input.entryId, "Bun override entry ID");
      requireBoundedBridgeString(input.blockId, "Bun override block ID", 256);
      invariant(input.propPath === "mediaAssetId", "Bun override propPath drift");
    }
  ),
  "override-preflight-input-v1": bunBridgeInputSchema(
    ["blockId", "contentTypeSlug", "entrySlug", "propPath", "screenName"],
    (_state, _descriptor, input) => {
      for (const key of ["blockId", "contentTypeSlug", "entrySlug", "screenName"])
        requireBoundedBridgeString(input[key], "Bun override " + key, 256);
      invariant(input.propPath === "mediaAssetId", "Bun override preflight propPath drift");
    }
  ),
  "preference-write-input-v1": bunBridgeInputSchema(
    ["showFieldMetadata", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun preference user ID");
      invariant(typeof input.showFieldMetadata === "boolean", "Bun preference boolean drift");
    }
  ),
  "resource-owner-input-v2": bunBridgeInputSchema(
    ["entryIds", "mediaId", "override", "overrideExpectedPresent"],
    (_state, _descriptor, input) => {
      invariant(
        Array.isArray(input.entryIds) &&
          input.entryIds.length === 6 &&
          new Set(input.entryIds).size === 6,
        "Bun owner entry tuple drift"
      );
      input.entryIds.forEach((id) => requireBridgeUuid(id, "Bun owner entry ID"));
      requireBridgeUuid(input.mediaId, "Bun owner media ID");
      exactOwnKeys(
        input.override,
        ["blockId", "entryId", "propPath", "screenId"],
        "Bun owner override",
        { plain: true }
      );
      requireBridgeUuid(input.override.entryId, "Bun owner override entry ID");
      requireBridgeUuid(input.override.screenId, "Bun owner override Screen ID");
      requireBoundedBridgeString(input.override.blockId, "Bun owner override block ID", 256);
      invariant(
        input.override.propPath === "mediaAssetId" &&
          typeof input.overrideExpectedPresent === "boolean",
        "Bun owner override expectation drift"
      );
    }
  ),
  "seo-entry-targets-input-v1": bunBridgeInputSchema(
    ["targetIds"],
    (_state, _descriptor, input) => {
      invariant(
        Array.isArray(input.targetIds) &&
          input.targetIds.length === 6 &&
          new Set(input.targetIds).size === 6,
        "Bun SEO entry target tuple drift"
      );
      input.targetIds.forEach((targetId) => requireBridgeUuid(targetId, "Bun SEO entry target ID"));
    }
  ),
  "identifier-seo-entry-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [id, targetType, targetId] = validateBridgeIdentifierTuple(
        input,
        3,
        "Bun SEO entry identifier"
      );
      requireBridgeUuid(id, "Bun SEO document ID");
      invariant(targetType === "entry", "Bun SEO target type drift");
      requireBridgeUuid(targetId, "Bun SEO target ID");
    }
  ),
  "screen-discovery-input-v1": bunBridgeInputSchema(
    ["contentTypeId", "name"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.contentTypeId, "Bun Screen content-type ID");
      requireBoundedBridgeString(input.name, "Bun Screen name", 256);
    }
  ),
  "screen-materialize-input-v1": bunBridgeInputSchema(
    ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
    (state, descriptor, input) => {
      exactOwnKeys(
        input.bodyWithoutDefinition,
        ["contentTypeId", "name", "showInSidebar", "sidebarLabel", "status"],
        "Bun Screen body",
        { plain: true }
      );
      requireBridgeUuid(
        input.bodyWithoutDefinition.contentTypeId,
        "Bun Screen body content-type ID"
      );
      requireBoundedBridgeString(input.bodyWithoutDefinition.name, "Bun Screen body name", 256);
      requireBoundedBridgeString(
        input.bodyWithoutDefinition.sidebarLabel,
        "Bun Screen sidebar label",
        256
      );
      invariant(
        input.bodyWithoutDefinition.status === "active" &&
          typeof input.bodyWithoutDefinition.showInSidebar === "boolean",
        "Bun Screen body scalar drift"
      );
      exactOwnKeys(input.contentType, ["id", "name", "schema", "slug"], "Bun Screen content type", {
        plain: true,
      });
      requireBridgeUuid(input.contentType.id, "Bun Screen content-type ID");
      requireBoundedBridgeString(input.contentType.name, "Bun Screen content-type name", 256);
      requireBoundedBridgeString(input.contentType.slug, "Bun Screen content-type slug", 256);
      validateBridgeJsonObject(input.contentType.schema, "Bun Screen content-type schema");
      exactOwnKeys(
        input.definitionWithoutListView,
        ["editorView", "schemaVersion"],
        "Bun Screen definition",
        { plain: true }
      );
      invariant(
        input.definitionWithoutListView.schemaVersion === 4,
        "Bun Screen definition version drift"
      );
      validateBridgeJsonObject(
        input.definitionWithoutListView.editorView,
        "Bun Screen editor definition"
      );
      if (state?.editableContentTypeDetail)
        invariant(
          deepEqualJson(input.contentType, state.editableContentTypeDetail),
          "Bun Screen content-type authority drift"
        );
      const blueprint =
        descriptor.operationId === "runtime/set-035-screen-create"
          ? state?.plan?.fixtureBlueprint?.screen
          : state?.plan?.fixtureBlueprint?.retryScreen;
      if (blueprint) {
        const { listView: ignoredListView, ...expectedDefinition } = blueprint.definitionTemplate;
        void ignoredListView;
        invariant(
          deepEqualJson(input.definitionWithoutListView, expectedDefinition),
          "Bun Screen definition authority drift"
        );
      }
    }
  ),
  "screen-preflight-input-v1": bunBridgeInputSchema(
    ["contentTypeSlug", "name"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.contentTypeSlug, "Bun Screen content-type slug", 256);
      requireBoundedBridgeString(input.name, "Bun Screen name", 256);
    }
  ),
  "slug-input-v1": bunBridgeInputSchema(["slug"], (_state, _descriptor, input) => {
    requireBoundedBridgeString(input.slug, "Bun slug", 256);
  }),
  "user-agents-input-v1": bunBridgeInputSchema(["userAgents"], (_state, _descriptor, input) => {
    invariant(
      Array.isArray(input.userAgents) &&
        input.userAgents.length === 4 &&
        new Set(input.userAgents).size === 4,
      "Bun user-agent tuple drift"
    );
    input.userAgents.forEach((value) => requireBoundedBridgeString(value, "Bun user agent", 512));
  }),
  "user-id-input-v1": bunBridgeInputSchema(["userId"], (_state, _descriptor, input) => {
    requireBridgeUuid(input.userId, "Bun user ID");
  }),
  "user-identity-input-v1": bunBridgeInputSchema(
    ["email", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun identity user ID");
      requireBoundedBridgeString(input.email, "Bun identity email", 320);
      invariant(
        input.email === input.email.toLowerCase() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
        "Bun identity email drift"
      );
    }
  ),
  "user-provision-input-v1": bunBridgeInputSchema(
    ["email", "name"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.email, "Bun provision email", 320);
      requireBoundedBridgeString(input.name, "Bun provision name", 256);
      invariant(
        input.email === input.email.toLowerCase() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
        "Bun provision email drift"
      );
    }
  ),
  "user-session-observation-input-v1": bunBridgeInputSchema(
    ["userAgent", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun observed user ID");
      requireBoundedBridgeString(input.userAgent, "Bun observed user agent", 512);
    }
  ),
});

function bunBridgeInputSchemaId(source, inputKeys) {
  const signature = [...inputKeys].sort().join(",");
  const direct = {
    "": "empty-input-v1",
    "baseline,newestOwnedPair,userId": "bootstrap-restore-input-v1",
    "blockId,contentTypeSlug,entrySlug,propPath,screenName": "override-preflight-input-v1",
    "blockId,entryId,propPath,screenId": "override-discovery-input-v1",
    "bodyWithoutDefinition,contentType,definitionWithoutListView": "screen-materialize-input-v1",
    "contentTypeId,name": "screen-discovery-input-v1",
    "contentTypeSlug,name": "screen-preflight-input-v1",
    email: "email-input-v1",
    "email,name": "user-provision-input-v1",
    "email,userId": "user-identity-input-v1",
    "entryIds,mediaId,override,overrideExpectedPresent": "resource-owner-input-v2",
    "entrySlug,typeSlug": "entry-preflight-input-v1",
    mediaId: "media-id-input-v1",
    "mimeType,originalName,size": "media-natural-input-v1",
    "showFieldMetadata,userId": "preference-write-input-v1",
    slug: "slug-input-v1",
    "slug,typeId": "entry-discovery-input-v1",
    "userAgent,userId": "user-session-observation-input-v1",
    userAgents: "user-agents-input-v1",
    userId: "user-id-input-v1",
    targetIds: "seo-entry-targets-input-v1",
  }[signature];
  if (direct) return direct;
  invariant(signature === "identifier", "Bun bridge input signature is unregistered: " + signature);
  if (Object.values(PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-override-input-v1";
  if (Object.values(SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-seo-entry-input-v1";
  if (Object.values(USER_SETTING_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-setting-input-v1";
  if (Object.values(MEDIA_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-media-input-v1";
  if (
    [
      ...Object.values(USER_EXACT_BRIDGE_SOURCES),
      ...Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES).flatMap((sources) =>
        Object.values(sources)
      ),
      CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
      CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
      CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
    ].includes(source)
  )
    return "identifier-uuid-input-v1";
  invariant(false, "Bun bridge identifier input source is unregistered");
}

function validateBunBridgeInput(state, descriptor, input) {
  const schema = BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId];
  invariant(
    schema && typeof schema.validator === "function",
    "Bun bridge input schema is not registered: " + descriptor.inputSchemaId
  );
  exactOwnKeys(input, schema.inputKeys, descriptor.operationId + " Bun bridge input", {
    plain: true,
  });
  assertPlainJsonValue(input, descriptor.operationId + " Bun bridge input");
  schema.validator(state, descriptor, input);
  return input;
}

const BUN_BRIDGE_BASE_DESCRIPTOR_KEYS = deepFreezeExact([
  "argvShape",
  "cwdShape",
  "envProfileId",
  "file",
  "inputKeys",
  "inputSchemaId",
  "maxStderrBytes",
  "maxStdinBytes",
  "maxStdoutBytes",
  "operationId",
  "outputSchemaId",
  "source",
  "sourceSha256",
  "timeoutMs",
]);
const BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS = deepFreezeExact([
  "acquisitionChannel",
  "participationMode",
  "resourceKey",
  "resourceKind",
  "resourceSlot",
]);

function validateBunBridgeOperationDescriptor(
  descriptor,
  expectedOperationId = descriptor?.operationId
) {
  const resourceKeyCount = BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS.filter(
    (key) => descriptor && Object.hasOwn(descriptor, key)
  ).length;
  invariant(
    resourceKeyCount === 0 || resourceKeyCount === BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS.length,
    "Bun bridge resource descriptor binding is partial"
  );
  exactOwnKeys(
    descriptor,
    resourceKeyCount === 0
      ? BUN_BRIDGE_BASE_DESCRIPTOR_KEYS
      : [...BUN_BRIDGE_BASE_DESCRIPTOR_KEYS, ...BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS],
    "Bun bridge operation descriptor",
    { plain: true }
  );
  invariant(
    Object.isFrozen(descriptor) &&
      Object.isFrozen(descriptor.argvShape) &&
      Object.isFrozen(descriptor.cwdShape) &&
      Object.isFrozen(descriptor.inputKeys) &&
      typeof expectedOperationId === "string" &&
      expectedOperationId.length > 0 &&
      descriptor.operationId === expectedOperationId &&
      descriptor.file === BUN_BRIDGE_EXECUTION_AUTHORITY.file &&
      deepEqualJson(descriptor.argvShape, BUN_BRIDGE_EXECUTION_AUTHORITY.argvShape) &&
      deepEqualJson(descriptor.cwdShape, BUN_BRIDGE_EXECUTION_AUTHORITY.cwdShape) &&
      typeof descriptor.source === "string" &&
      descriptor.source.length > 0 &&
      !descriptor.source.includes("\0") &&
      Buffer.byteLength(descriptor.source) <= MAX_STREAM_BYTES &&
      typeof descriptor.sourceSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(descriptor.sourceSha256) &&
      descriptor.sourceSha256 === hashBytes(Buffer.from(descriptor.source)) &&
      descriptor.source.startsWith(
        BRIDGE_INPUT_READER + bridgeInputSchemaGuard(descriptor.inputSchemaId)
      ) &&
      BUN_BRIDGE_ENV_PROFILES[descriptor.envProfileId] !== undefined &&
      descriptor.inputSchemaId ===
        bunBridgeInputSchemaId(descriptor.source, descriptor.inputKeys) &&
      BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId] !== undefined &&
      Array.isArray(descriptor.inputKeys) &&
      descriptor.inputKeys.every((key) => typeof key === "string" && key.length > 0) &&
      new Set(descriptor.inputKeys).size === descriptor.inputKeys.length &&
      deepEqualJson(descriptor.inputKeys, [...descriptor.inputKeys].sort()) &&
      deepEqualJson(
        descriptor.inputKeys,
        BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId].inputKeys
      ) &&
      typeof descriptor.outputSchemaId === "string" &&
      typeof BUN_BRIDGE_OUTPUT_VALIDATORS[descriptor.outputSchemaId] === "function" &&
      descriptor.timeoutMs === BUN_BRIDGE_EXECUTION_AUTHORITY.timeoutMs &&
      descriptor.maxStdinBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes &&
      descriptor.maxStdoutBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes &&
      descriptor.maxStderrBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStderrBytes,
    "Bun bridge descriptor source/schema/argv/cwd/limit authority drift"
  );
  if (resourceKeyCount > 0) {
    invariant(
      [
        descriptor.acquisitionChannel,
        descriptor.participationMode,
        descriptor.resourceKey,
        descriptor.resourceKind,
      ].every((value) => typeof value === "string" && value.length > 0) &&
        ["absence", "cleanup", "provenance"].includes(descriptor.resourceSlot) &&
        ["bun-one-shot", "node+bun-one-shot"].includes(descriptor.participationMode),
      "Bun bridge resource descriptor binding drift"
    );
  }
  return descriptor;
}

const REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE = deepFreezeExact({
  "bootstrap-preflight": ["runtime/set-001-storage-preflight"],
  database: [
    "runtime/set-004b-session-policy-preflight",
    "runtime/set-004c-auth-rate-budget-preflight",
    "runtime/set-032-storage-post-setup",
    "runtime/set-041-preference-a",
    "runtime/set-042-preference-a-proof",
    "runtime/set-043-preference-b",
    "runtime/set-044-preference-b-proof",
  ],
  "user-identity-proof": ["runtime/set-013-user-a-proof", "runtime/set-015-user-b-proof"],
  "user-provisioning": ["runtime/set-012-user-a-create", "runtime/set-014-user-b-create"],
  "schema-only": ["runtime/set-035-screen-create", "runtime/set-037-retry-screen-create"],
});

function bunBridgeOperationDescriptor(
  operationId,
  source,
  envProfileId,
  inputKeys,
  outputSchemaId
) {
  invariant(
    typeof operationId === "string" &&
      operationId.length > 0 &&
      typeof source === "string" &&
      source.length > 0 &&
      BUN_BRIDGE_ENV_PROFILES[envProfileId] !== undefined &&
      Array.isArray(inputKeys) &&
      inputKeys.every((key) => typeof key === "string") &&
      new Set(inputKeys).size === inputKeys.length &&
      typeof BUN_BRIDGE_OUTPUT_VALIDATORS[outputSchemaId] === "function",
    "Bun bridge descriptor input drift"
  );
  const descriptor = deepFreezeExact({
    operationId,
    file: BUN_BRIDGE_EXECUTION_AUTHORITY.file,
    argvShape: BUN_BRIDGE_EXECUTION_AUTHORITY.argvShape,
    cwdShape: BUN_BRIDGE_EXECUTION_AUTHORITY.cwdShape,
    source,
    sourceSha256: hashBytes(Buffer.from(source)),
    envProfileId,
    inputSchemaId: bunBridgeInputSchemaId(source, inputKeys),
    inputKeys: deepFreezeExact([...inputKeys].sort()),
    outputSchemaId,
    timeoutMs: BUN_BRIDGE_EXECUTION_AUTHORITY.timeoutMs,
    maxStdinBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes,
    maxStdoutBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes,
    maxStderrBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStderrBytes,
  });
  return validateBunBridgeOperationDescriptor(descriptor, operationId);
}

const BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS = deepFreezeExact({
  "runtime/set-001-storage-preflight": bunBridgeOperationDescriptor(
    "runtime/set-001-storage-preflight",
    STORAGE_PREFLIGHT_BRIDGE_SOURCE,
    "bootstrap-preflight",
    ["userAgents"],
    "storage-preflight-private-v2"
  ),
  "runtime/set-004b-session-policy-preflight": bunBridgeOperationDescriptor(
    "runtime/set-004b-session-policy-preflight",
    SECURITY_SESSION_BRIDGE_SOURCE,
    "database",
    [],
    "session-policy-private-v1"
  ),
  "runtime/set-004c-auth-rate-budget-preflight": bunBridgeOperationDescriptor(
    "runtime/set-004c-auth-rate-budget-preflight",
    SECURITY_RATE_BRIDGE_SOURCE,
    "database",
    [],
    "auth-rate-private-v1"
  ),
  "runtime/set-032-storage-post-setup": bunBridgeOperationDescriptor(
    "runtime/set-032-storage-post-setup",
    MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
    "database",
    ["mediaId"],
    "missing-media-row-count-v1"
  ),
  "runtime/set-041-preference-a": bunBridgeOperationDescriptor(
    "runtime/set-041-preference-a",
    PREFERENCE_SET_BRIDGE_SOURCE,
    "database",
    ["showFieldMetadata", "userId"],
    "preference-write-private-v1"
  ),
  "runtime/set-042-preference-a-proof": bunBridgeOperationDescriptor(
    "runtime/set-042-preference-a-proof",
    PREFERENCE_GET_BRIDGE_SOURCE,
    "database",
    ["userId"],
    "preference-read-private-v1"
  ),
  "runtime/set-043-preference-b": bunBridgeOperationDescriptor(
    "runtime/set-043-preference-b",
    PREFERENCE_SET_BRIDGE_SOURCE,
    "database",
    ["showFieldMetadata", "userId"],
    "preference-write-private-v1"
  ),
  "runtime/set-044-preference-b-proof": bunBridgeOperationDescriptor(
    "runtime/set-044-preference-b-proof",
    PREFERENCE_GET_BRIDGE_SOURCE,
    "database",
    ["userId"],
    "preference-read-private-v1"
  ),
  "runtime/set-013-user-a-proof": bunBridgeOperationDescriptor(
    "runtime/set-013-user-a-proof",
    USER_PROOF_BRIDGE_SOURCE,
    "user-identity-proof",
    ["email", "userId"],
    "user-identity-private-v2"
  ),
  "runtime/set-015-user-b-proof": bunBridgeOperationDescriptor(
    "runtime/set-015-user-b-proof",
    USER_PROOF_BRIDGE_SOURCE,
    "user-identity-proof",
    ["email", "userId"],
    "user-identity-private-v2"
  ),
  "runtime/set-012-user-a-create": bunBridgeOperationDescriptor(
    "runtime/set-012-user-a-create",
    USER_PROVISION_BRIDGE_SOURCE,
    "user-provisioning",
    ["email", "name"],
    "user-provision-private-v2"
  ),
  "runtime/set-014-user-b-create": bunBridgeOperationDescriptor(
    "runtime/set-014-user-b-create",
    USER_PROVISION_BRIDGE_SOURCE,
    "user-provisioning",
    ["email", "name"],
    "user-provision-private-v2"
  ),
  "runtime/set-035-screen-create": bunBridgeOperationDescriptor(
    "runtime/set-035-screen-create",
    SCREEN_MATERIALIZE_BRIDGE_SOURCE,
    "schema-only",
    ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
    "screen-materialize-private-v1"
  ),
  "runtime/set-037-retry-screen-create": bunBridgeOperationDescriptor(
    "runtime/set-037-retry-screen-create",
    SCREEN_MATERIALIZE_BRIDGE_SOURCE,
    "schema-only",
    ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
    "screen-materialize-private-v1"
  ),
});

const RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID = deepFreezeExact({
  "set-012-user-a-create": "user",
  "set-014-user-b-create": "user",
  "set-016-editable-type-create": "content-type",
  "set-018-related-a-type-create": "content-type",
  "set-020-related-b-type-create": "content-type",
  "set-021a-related-failure-type-create": "content-type",
  "set-022-related-a1-create": "entry",
  "set-024-related-a2-create": "entry",
  "set-026-related-b1-create": "entry",
  "set-028-related-b2-create": "entry",
  "set-029a-related-failure1-create": "entry",
  "set-033-entry-create": "entry",
  "set-030-media-upload": "media",
  "set-035-screen-create": "screen",
  "set-037-retry-screen-create": "screen",
  "set-039-override-create": "override",
  "set-041-preference-a": "setting",
  "set-043-preference-b": "setting",
});
const RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY = deepFreezeExact({
  user: {
    preflight: RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
    profile: "user-identity-proof",
    preflightKeys: ["email"],
  },
  "content-type": {
    preflight: RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["slug"],
  },
  entry: {
    preflight: RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["entrySlug", "typeSlug"],
  },
  media: {
    preflight: RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["mimeType", "originalName", "size"],
  },
  screen: {
    preflight: RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["contentTypeSlug", "name"],
  },
  override: {
    preflight: RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["blockId", "contentTypeSlug", "entrySlug", "propPath", "screenName"],
  },
  setting: {
    preflight: RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
    profile: "user-identity-proof",
    preflightKeys: ["email"],
  },
});
const BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS = deepFreezeExact(
  Object.fromEntries(
    Object.entries(RESPONSE_LOST_QUERY_OPERATION_BINDINGS).flatMap(([actionId, binding]) => {
      const family =
        RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY[RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID[actionId]];
      invariant(family !== undefined, "response-lost descriptor family is absent");
      return [
        [
          binding.baselineOperationId,
          bunBridgeOperationDescriptor(
            binding.baselineOperationId,
            family.preflight,
            family.profile,
            family.preflightKeys,
            "bounded-natural-candidates-v1"
          ),
        ],
        [
          binding.discoveryOperationId,
          bunBridgeOperationDescriptor(
            binding.discoveryOperationId,
            family.discovery,
            family.profile,
            binding.inputKeys,
            "bounded-natural-candidates-v1"
          ),
        ],
      ];
    })
  )
);

const BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS = deepFreezeExact({
  "terminal/task-traffic-snapshot": bunBridgeOperationDescriptor(
    "terminal/task-traffic-snapshot",
    TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
    "database",
    ["userAgents"],
    "task-traffic-complete-private-v2"
  ),
  "resource/content-routes-exact": bunBridgeOperationDescriptor(
    "resource/content-routes-exact",
    CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
    "database",
    [],
    "content-routes-private-v1"
  ),
  "resource/current-owner-exact": bunBridgeOperationDescriptor(
    "resource/current-owner-exact",
    CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
    "database",
    ["entryIds", "mediaId", "override", "overrideExpectedPresent"],
    "resource-owner-private-v2"
  ),
  "resource/seo-entry-discovery": bunBridgeOperationDescriptor(
    "resource/seo-entry-discovery",
    SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
    "database",
    ["targetIds"],
    "seo-entry-discovery-private-v1"
  ),
  "resource/api-session-observation": bunBridgeOperationDescriptor(
    "resource/api-session-observation",
    API_SESSION_OBSERVATION_BRIDGE_SOURCE,
    "database",
    ["userAgent", "userId"],
    "api-session-observation-private-v1"
  ),
  "resource/bootstrap-login-observation": bunBridgeOperationDescriptor(
    "resource/bootstrap-login-observation",
    BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
    "database",
    ["userAgent", "userId"],
    "bootstrap-login-observation-private-v1"
  ),
  "resource/bootstrap-cas-restore": bunBridgeOperationDescriptor(
    "resource/bootstrap-cas-restore",
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
    "database",
    ["baseline", "newestOwnedPair", "userId"],
    "bootstrap-restore-private-v2"
  ),
  "resource/bootstrap-baseline-read": bunBridgeOperationDescriptor(
    "resource/bootstrap-baseline-read",
    BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
    "database",
    ["userId"],
    "bootstrap-baseline-read-private-v1"
  ),
  "resource/storage-final-preflight": bunBridgeOperationDescriptor(
    "resource/storage-final-preflight",
    STORAGE_PREFLIGHT_BRIDGE_SOURCE,
    "bootstrap-preflight",
    ["userAgents"],
    "storage-preflight-private-v2"
  ),
  "resource/missing-media-db-absence": bunBridgeOperationDescriptor(
    "resource/missing-media-db-absence",
    MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
    "database",
    ["mediaId"],
    "missing-media-row-count-v1"
  ),
  "legacy/user-delete-exact": bunBridgeOperationDescriptor(
    "legacy/user-delete-exact",
    USER_DELETE_BRIDGE_SOURCE,
    "user-identity-proof",
    ["userId"],
    "legacy-user-delete-private-v1"
  ),
  "legacy/user-absence-exact": bunBridgeOperationDescriptor(
    "legacy/user-absence-exact",
    USER_ABSENCE_BRIDGE_SOURCE,
    "user-identity-proof",
    ["userId"],
    "legacy-user-absence-private-v1"
  ),
});

const BUN_BRIDGE_OPERATION_DESCRIPTORS = deepFreezeExact({
  ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  ...BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  ...BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
});
const BUN_BRIDGE_RESOURCE_OPERATION_DESCRIPTORS = PRIVATE_BUN_RESOURCE_DESCRIPTORS;

function buildResourceBunSourceSpecs() {
  const specs = Object.create(null);
  const add = (key, source, envProfileId = "database", inputKeys = ["identifier"]) => {
    invariant(!Object.hasOwn(specs, key), "resource Bun source spec duplicate: " + key);
    specs[key] = {
      source,
      envProfileId,
      inputKeys,
      outputSchemaId: "strict-resource-operation-v1",
    };
  };
  add(
    "presentation-override/provenance/failure-discovery",
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.provenance
  );
  add("presentation-override/cleanup", PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.delete);
  add("presentation-override/absence", PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.absence);
  add(
    "seo-document-entry/provenance/cleanup-discovery",
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance
  );
  add("seo-document-entry/cleanup", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete);
  add("seo-document-entry/absence", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence);
  for (const kind of ["setting-user-a", "setting-user-b"]) {
    add(kind + "/provenance/failure-discovery", USER_SETTING_EXACT_BRIDGE_SOURCES.provenance);
    add(kind + "/cleanup", USER_SETTING_EXACT_BRIDGE_SOURCES.delete);
    add(kind + "/absence", USER_SETTING_EXACT_BRIDGE_SOURCES.absence);
  }
  for (const kind of ["screen-main", "screen-retry"]) {
    add(kind + "/provenance/failure-discovery", CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE);
  }
  for (const kind of ["entry-editable", "entry-related"]) {
    add(kind + "/provenance/failure-discovery", CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE);
  }
  add("content-type/provenance/failure-discovery", CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE);
  for (const channel of ["admin-api", "failure-discovery"]) {
    add("media-row-key/provenance/" + channel, MEDIA_EXACT_BRIDGE_SOURCES.provenance);
  }
  add("media-row-key/cleanup", MEDIA_EXACT_BRIDGE_SOURCES.delete);
  add("media-row-key/absence", MEDIA_EXACT_BRIDGE_SOURCES.absence);
  for (const kind of ["audit-log-task-ua", "access-log-task-ua", "session-task"]) {
    add(kind + "/provenance/terminal-db-delta", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].provenance);
    add(kind + "/cleanup", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].delete);
    add(kind + "/absence", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].absence);
  }
  for (const kind of ["user-a", "user-b"]) {
    add(
      kind + "/provenance/failure-discovery",
      USER_EXACT_BRIDGE_SOURCES.provenance,
      "user-identity-proof"
    );
    add(kind + "/cleanup", USER_EXACT_BRIDGE_SOURCES.delete);
    add(kind + "/absence", USER_EXACT_BRIDGE_SOURCES.absence);
  }
  add("bootstrap-user-login-state/cleanup", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE, "database", [
    "baseline",
    "newestOwnedPair",
    "userId",
  ]);
  add("bootstrap-user-login-state/absence", BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE, "database", [
    "userAgent",
    "userId",
  ]);
  add("site-content-routes-baseline/absence", CONTENT_ROUTES_EXACT_BRIDGE_SOURCE, "database", []);
  add("storage-baseline/absence", STORAGE_PREFLIGHT_BRIDGE_SOURCE, "bootstrap-preflight", [
    "userAgents",
  ]);
  add("missing-media-baseline/absence", MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE, "database", [
    "mediaId",
  ]);
  return deepFreezeExact(specs);
}
const RESOURCE_BUN_SOURCE_SPECS = buildResourceBunSourceSpecs();

function resourceBunParticipationSlot(core, slot) {
  const participation = RESOURCE_BUN_BRIDGE_PARTICIPATION[core.kind];
  invariant(participation !== undefined, "resource Bun participation kind is absent");
  if (slot === "provenance") return participation.provenance[core.acquisitionChannel];
  return participation[slot];
}

function resourceBunSourceSpecKey(core, slot) {
  return slot === "provenance"
    ? core.kind + "/provenance/" + core.acquisitionChannel
    : core.kind + "/" + slot;
}

function promoteResourceBunDescriptorsAfterLedgerAppend(state, delta) {
  const resourceRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state);
  const unionRegistry = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(state);
  invariant(
    resourceRegistry instanceof Map && unionRegistry instanceof Map,
    "resource Bun descriptor authority is absent"
  );
  for (const core of delta.cores) {
    for (const [slot, operationId] of [
      ["provenance", core.provenanceOpId],
      ["cleanup", core.cleanupOpId],
      ["absence", core.absenceOpId],
    ]) {
      const participation = resourceBunParticipationSlot(core, slot);
      if (participation === null) {
        invariant(operationId === null, "null resource Bun slot has an operation ID");
        continue;
      }
      if (
        participation.mode === "bound-runtime-bridge" ||
        participation.mode === "node+bound-runtime-bridge"
      ) {
        invariant(
          slot === "provenance" &&
            BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS[participation.operationId] !== undefined,
          "bound runtime resource descriptor drift"
        );
        continue;
      }
      if (participation.mode === "node-local") continue;
      invariant(
        participation.mode === "bun-one-shot" || participation.mode === "node+bun-one-shot",
        "resource Bun descriptor mode is not executable"
      );
      const specKey = resourceBunSourceSpecKey(core, slot);
      const spec = RESOURCE_BUN_SOURCE_SPECS[specKey];
      invariant(
        spec !== undefined && spec.envProfileId === participation.envProfileId,
        "resource Bun source spec drift: " + specKey
      );
      invariant(
        typeof operationId === "string" &&
          !resourceRegistry.has(operationId) &&
          !unionRegistry.has(operationId),
        "resource Bun operation ID collision"
      );
      const descriptor = validateBunBridgeOperationDescriptor(
        deepFreezeExact({
          ...bunBridgeOperationDescriptor(
            operationId,
            spec.source,
            spec.envProfileId,
            spec.inputKeys,
            spec.outputSchemaId
          ),
          resourceKey: core.resourceKey,
          resourceKind: core.kind,
          resourceSlot: slot,
          acquisitionChannel: core.acquisitionChannel,
          participationMode: participation.mode,
        }),
        operationId
      );
      resourceRegistry.set(operationId, descriptor);
      unionRegistry.set(operationId, descriptor);
    }
  }
}

function expectedResourceBunOperationIds(records) {
  const expected = [];
  for (const record of records) {
    for (const [slot, operationId] of [
      ["provenance", record.provenanceOpId],
      ["cleanup", record.cleanupOpId],
      ["absence", record.absenceOpId],
    ]) {
      const participation = resourceBunParticipationSlot(record, slot);
      if (
        participation !== null &&
        (participation.mode === "bun-one-shot" || participation.mode === "node+bun-one-shot")
      ) {
        expected.push(operationId);
      }
    }
  }
  invariant(
    new Set(expected).size === expected.length,
    "derived resource Bun operation IDs contain duplicates"
  );
  return expected.sort();
}

function assertResourceBunDescriptorSetExact(state, records) {
  const resourceRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state);
  invariant(resourceRegistry instanceof Map, "resource Bun registry is absent");
  const expected = expectedResourceBunOperationIds(records);
  const actual = [...resourceRegistry.keys()].sort();
  invariant(deepEqualJson(actual, expected), "resource Bun descriptor/ledger set equality drift");
  for (const record of records) {
    const perResourceSourceHashes = [];
    for (const [slot, operationId] of [
      ["provenance", record.provenanceOpId],
      ["cleanup", record.cleanupOpId],
      ["absence", record.absenceOpId],
    ]) {
      const participation = resourceBunParticipationSlot(record, slot);
      if (
        participation === null ||
        !["bun-one-shot", "node+bun-one-shot"].includes(participation.mode)
      )
        continue;
      const descriptor = resourceRegistry.get(operationId);
      const spec = RESOURCE_BUN_SOURCE_SPECS[resourceBunSourceSpecKey(record, slot)];
      validateBunBridgeOperationDescriptor(descriptor, operationId);
      invariant(
        descriptor?.operationId === operationId &&
          descriptor.resourceKey === record.resourceKey &&
          descriptor.resourceKind === record.kind &&
          descriptor.resourceSlot === slot &&
          descriptor.acquisitionChannel === record.acquisitionChannel &&
          descriptor.participationMode === participation.mode &&
          descriptor.source === spec?.source &&
          descriptor.sourceSha256 === hashBytes(Buffer.from(spec.source)),
        "resource Bun P/C/A descriptor binding drift"
      );
      perResourceSourceHashes.push(descriptor.sourceSha256);
    }
    invariant(
      new Set(perResourceSourceHashes).size === perResourceSourceHashes.length,
      "resource Bun P/C/A sources are not independently immutable"
    );
  }
}

async function runBoundResourceBunOperation(state, record, operationKind) {
  const slot =
    operationKind === "provenance"
      ? "provenance"
      : operationKind === "delete"
        ? "cleanup"
        : "absence";
  const operationId =
    record[
      slot === "provenance" ? "provenanceOpId" : slot === "cleanup" ? "cleanupOpId" : "absenceOpId"
    ];
  const descriptor = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state)?.get(operationId);
  invariant(
    descriptor !== undefined &&
      descriptor.resourceKey === record.resourceKey &&
      descriptor.resourceSlot === slot,
    "bound resource Bun descriptor lookup drift"
  );
  return runBunBridgeOperation(state, operationId, { identifier: record.identifier });
}

function validateStaticBunBridgeDescriptorRegistries({
  runtimeRegistry = BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  operationRegistry = BUN_BRIDGE_OPERATION_DESCRIPTORS,
} = {}) {
  assertCurrentResourceOwnerBridgeFailClosedSource();
  assertSeoEntryDiscoveryBridgeFailClosedSource();
  assertSeoEntryDocumentExactBridgeSourcesFailClosed();
  assertResourceBunParticipationExhaustive();
  const requiredRuntimeIds = Object.values(
    REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE
  ).flat();
  invariant(
    requiredRuntimeIds.length === 14 && new Set(requiredRuntimeIds).size === 14,
    "required runtime Bun descriptor count drift"
  );
  invariant(
    deepEqualJson(Object.keys(runtimeRegistry).sort(), [...requiredRuntimeIds].sort()),
    "runtime Bun descriptor key-set drift"
  );
  invariant(
    deepEqualJson(
      Object.keys(BUN_BRIDGE_ENV_PROFILES).sort(),
      Object.keys(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).sort()
    ),
    "Bun descriptor environment profile-set drift"
  );
  invariant(
    Object.entries(BUN_BRIDGE_ENV_PROFILES).every(
      ([profileId, profile]) =>
        profile.requiredRepo.includes("ADMIN_PASSWORD") === (profileId === "user-provisioning") &&
        !profile.optionalRepo.includes("ADMIN_PASSWORD")
    ),
    "ADMIN_PASSWORD may enter only the exact user-provisioning Bun profile"
  );
  const expectedStaticIds = [
    ...Object.keys(runtimeRegistry),
    ...Object.keys(BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS),
    ...Object.keys(BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS),
  ].sort();
  invariant(
    deepEqualJson(Object.keys(operationRegistry).sort(), expectedStaticIds) &&
      new Set(expectedStaticIds).size === expectedStaticIds.length,
    "static Bun operation descriptor union drift"
  );
  const expectedOutputSchemaIds = [
    ...new Set([
      ...Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS).map(
        ({ outputSchemaId }) => outputSchemaId
      ),
      ...Object.values(RESOURCE_BUN_SOURCE_SPECS).map(({ outputSchemaId }) => outputSchemaId),
    ]),
  ].sort();
  invariant(
    deepEqualJson(Object.keys(BUN_BRIDGE_OUTPUT_VALIDATORS).sort(), expectedOutputSchemaIds),
    "Bun bridge output validator registry is not exhaustive"
  );
  const expectedInputSchemaIds = [
    ...new Set([
      ...Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS).map(({ inputSchemaId }) => inputSchemaId),
      ...Object.values(RESOURCE_BUN_SOURCE_SPECS).map(({ inputKeys, source }) =>
        bunBridgeInputSchemaId(source, inputKeys)
      ),
    ]),
  ].sort();
  invariant(
    deepEqualJson(Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort(), expectedInputSchemaIds),
    "Bun bridge input validator registry is not exhaustive"
  );
  const expectedProfileByRuntimeId = new Map(
    Object.entries(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flatMap(
      ([profile, operationIds]) => operationIds.map((operationId) => [operationId, profile])
    )
  );
  for (const [operationId, descriptor] of Object.entries(operationRegistry)) {
    validateBunBridgeOperationDescriptor(descriptor, operationId);
    invariant(
      deepEqualJson(descriptor, BUN_BRIDGE_OPERATION_DESCRIPTORS[operationId]) &&
        (expectedProfileByRuntimeId.get(operationId) === undefined ||
          expectedProfileByRuntimeId.get(operationId) === descriptor.envProfileId),
      "Bun descriptor canonical source/profile/schema/argv/cwd/limit identity drift"
    );
  }
}

function initializeBunBridgeOperationAuthority(state) {
  invariant(
    !PRIVATE_BUN_RESOURCE_DESCRIPTORS.has(state) && !PRIVATE_BUN_OPERATION_DESCRIPTORS.has(state),
    "Bun operation authority was assigned twice"
  );
  PRIVATE_BUN_RESOURCE_DESCRIPTORS.set(state, new Map());
  PRIVATE_BUN_OPERATION_DESCRIPTORS.set(
    state,
    new Map(Object.entries(BUN_BRIDGE_OPERATION_DESCRIPTORS))
  );
}

function bunBridgeDescriptorForOperation(state, operationId) {
  invariant(
    typeof operationId === "string" && operationId.length > 0,
    "Bun bridge operation ID is invalid"
  );
  const privateRegistry = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(state);
  invariant(privateRegistry instanceof Map, "private Bun bridge operation registry is absent");
  const descriptor = privateRegistry.get(operationId);
  const staticDescriptor = BUN_BRIDGE_OPERATION_DESCRIPTORS[operationId];
  const resourceDescriptor = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state)?.get(operationId);
  invariant(
    descriptor !== undefined &&
      (descriptor === staticDescriptor || descriptor === resourceDescriptor),
    "Bun bridge operation is not registered by canonical identity: " + operationId
  );
  return validateBunBridgeOperationDescriptor(descriptor, operationId);
}

async function runBunBridgeOperation(state, operationId, input, executionBoundaryObserver = null) {
  const descriptor = bunBridgeDescriptorForOperation(state, operationId);
  exactOwnKeys(input, descriptor.inputKeys, operationId + " Bun bridge input", { plain: true });
  const value = await runBunBridge(state, descriptor, input, executionBoundaryObserver);
  return validateBunBridgeOutput(state, descriptor, input, value);
}

function contentSchemaFromFields(fields) {
  const properties = {};
  fields.forEach((field, order) => {
    const common = { title: field.label, xFieldType: field.type };
    if (field.type === "relation") {
      properties[field.name] = {
        type: field.relation.multiple ? "array" : "string",
        ...(field.relation.multiple ? { items: { type: "string" } } : {}),
        ...common,
        xRelationTarget: field.relation.target,
        xFieldConfig: { relation: field.relation, order },
      };
    } else if (field.type === "media") {
      properties[field.name] = {
        type: field.media.multiple ? "array" : "string",
        ...(field.media.multiple ? { items: { type: "string" } } : {}),
        ...common,
        xFieldConfig: { media: { accept: field.media.accept }, order },
      };
    } else {
      properties[field.name] = { type: "string", ...common, xFieldConfig: { order } };
    }
  });
  return { type: "object", additionalProperties: false, properties };
}


function runtimeSafeProjection(observation, captureBindings = {}) {
  return {
    captureBindings,
    observationSha256: hashBytes(Buffer.from(canonicalJson(observation))),
  };
}

function assertRecordIdentity(value, expected, label) {
  invariant(value && typeof value === "object" && !Array.isArray(value), label + " is missing");
  for (const [key, expectedValue] of Object.entries(expected)) {
    invariant(deepEqualJson(value[key], expectedValue), label + " " + key + " drift");
  }
}

function readExactEntryAuthorId(value, expectedAuthorId, label) {
  invariant(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof expectedAuthorId === "string" &&
      /^[0-9a-f-]{36}$/u.test(expectedAuthorId),
    label + " authority is invalid"
  );
  const author = value.author;
  exactOwnKeys(author, ["id", "name", "email"], label + " author", { plain: true });
  invariant(
    author.id === expectedAuthorId &&
      (author.name === null || typeof author.name === "string") &&
      typeof author.email === "string",
    label + " author identity drift"
  );
  return author.id;
}

const { runtimeStoragePreflight } = createStoragePreflightRuntime({
  assertNoSymlinkAncestors,
  assertRecordIdentity,
  captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
  initializeBootstrapLoginAuthority,
  readStableArtifactIdentity,
  responseLostStorageRoot,
  runBunBridgeOperation,
  runtimeSafeProjection,
  scanExactLocalStorageManifest,
});

async function runtimeHostLaunch({ state }) {
  const ready = await startOwnedHost(state);
  return runtimeSafeProjection({ runnerPid: ready.runnerPid, ports: ready.ports });
}

async function runtimeHealth({ state }, kind) {
  const url =
    kind === "admin"
      ? "http://coderso-a.localhost:5173/admin/advanced/custom-screens"
      : "http://coderso-a.localhost:3000/";
  const environment = Object.create(null);
  environment.PATH = ownString(process.env, "PATH", { required: true });
  const bytes = await runPrivateProcess({
    file: "curl",
    args: ["--fail", "--silent", "--show-error", url],
    cwd: state.root,
    env: Object.freeze(environment),
    stdin: Buffer.alloc(0),
    timeoutMs: 90_000,
  });
  invariant(bytes.length > 0, kind + " health response is empty");
  return runtimeSafeProjection({ kind, bytes: bytes.length, sha256: hashBytes(bytes) });
}

async function runtimeBotProtection({ state, plan }) {
  const value = await readPublicApiExactlyOnce(
    state,
    "/auth/bot-protection",
    plan.fixtureBlueprint.userAgents.publicPreflight
  );
  exactOwnKeys(value, ["enabled", "provider", "siteKey", "enforceOnLocalhost"], "bot protection", {
    plain: true,
  });
  invariant(value.enabled === false, "bot protection must be disabled for the smoke");
  return runtimeSafeProjection({ enabled: false });
}

function normalizeAuthRatePolicy(value, requiredPlan) {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "auth rate policy is absent or invalid"
  );
  exactOwnKeys(value, ["enabled", "maxRequests", "windowSeconds"], "auth rate policy", {
    plain: true,
  });
  invariant(
    requiredPlan !== null &&
      typeof requiredPlan === "object" &&
      Number.isSafeInteger(requiredPlan.requiredEnabledMaxRequests) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMin) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMax) &&
      typeof value.enabled === "boolean" &&
      Number.isSafeInteger(value.maxRequests) &&
      Number.isSafeInteger(value.windowSeconds) &&
      (!value.enabled ||
        (value.maxRequests >= requiredPlan.requiredEnabledMaxRequests &&
          value.windowSeconds >= requiredPlan.requiredEnabledWindowSecondsMin &&
          value.windowSeconds <= requiredPlan.requiredEnabledWindowSecondsMax)),
    "auth rate policy is absent or invalid"
  );
  return deepFreezeExact({
    enabled: value.enabled,
    maxRequests: value.maxRequests,
    windowSeconds: value.windowSeconds,
  });
}

async function runtimeSecurity({ state, plan }, mode, operationId) {
  invariant(
    (mode === "session" && operationId === "runtime/set-004b-session-policy-preflight") ||
      (mode === "rate" && operationId === "runtime/set-004c-auth-rate-budget-preflight"),
    "security runtime descriptor binding drift"
  );
  const value = await runBunBridgeOperation(state, operationId, {});
  if (mode === "session") {
    invariant(
      value.singleSession === false &&
        value.effectiveMaxPerUserAtLeast2 === true &&
        typeof value.csrfHeaderName === "string" &&
        /^[a-z0-9][a-z0-9-]{0,127}$/u.test(value.csrfHeaderName),
      "session policy is incompatible with the smoke"
    );
    const runtime = PRIVATE_RUNTIME.get(state);
    invariant(runtime.csrfHeaderName === null, "CSRF header authority may be assigned only once");
    runtime.csrfHeaderName = value.csrfHeaderName;
    return runtimeSafeProjection({
      singleSession: false,
      effectiveMaxPerUserAtLeast2: true,
    });
  } else {
    const policy = normalizeAuthRatePolicy(value, plan.requiredAuthRatePlan);
    const runtime = PRIVATE_RUNTIME.get(state);
    invariant(runtime.authRatePolicy === null, "auth rate policy may be assigned only once");
    runtime.authRatePolicy = policy;
  }
  return runtimeSafeProjection(value);
}

async function runtimeLogin({ state, plan }, key) {
  const blueprint = plan.fixtureBlueprint;
  const email =
    key === "bootstrap"
      ? ownString(state.repoEnvironment, "ADMIN_EMAIL", { required: true })
      : blueprint.users.a.email;
  const userAgent =
    key === "bootstrap" ? blueprint.userAgents.apiBootstrap : blueprint.userAgents.apiUserA;
  const session =
    key === "bootstrap"
      ? await runObservedBootstrapLoginAttempt(state, "api-bootstrap", userAgent, () =>
          loginApiSession(state, key, email, userAgent)
        )
      : await loginApiSession(state, key, email, userAgent);
  if (key === "user-a")
    invariant(session.userId === state.ids.userA, "user-A isolated login identity drift");
  return runtimeSafeProjection({ authenticated: true, identityMatches: true });
}

async function runtimeCsrf({ state }, key) {
  await captureApiCsrf(state, key);
  return runtimeSafeProjection({ captured: true });
}

async function runtimeProvisionUser({ state, plan, action }, key, operationId) {
  const user = plan.fixtureBlueprint.users[key];
  const captureName = key === "a" ? "user-a.id" : "user-b.id";
  invariant(state.responseLostIntents.has(action.id), "user create lacks its pre-write intent");
  const result = await runBunBridgeOperation(state, operationId, {
    email: user.email,
    name: user.displayName,
  });
  exactOwnKeys(
    result,
    [
      "adminRoleTupleCount",
      "exactIdPasswordUpdate",
      "normalizedEmailMatches",
      "userEmail",
      "userId",
    ],
    "provisioned user proof",
    { plain: true }
  );
  invariant(
    result.userEmail === user.email &&
      /^[0-9a-f-]{36}$/u.test(result.userId) &&
      result.adminRoleTupleCount === 1 &&
      result.exactIdPasswordUpdate === true &&
      result.normalizedEmailMatches === true,
    "provisioned user drift"
  );
  state.ids[key === "a" ? "userA" : "userB"] = result.userId;
  return runtimeSafeProjection(
    { userId: result.userId, userEmail: result.userEmail },
    { [captureName]: result.userId }
  );
}

async function runtimeProveUser({ state, plan }, key, operationId) {
  const user = plan.fixtureBlueprint.users[key];
  const userId = state.ids[key === "a" ? "userA" : "userB"];
  const proof = await runBunBridgeOperation(state, operationId, {
    email: user.email,
    userId,
  });
  invariant(proof.ok === true, "user proof failed");
  return runtimeSafeProjection({ active: true, admin: true, userId });
}

async function runtimeCreateContentType({ state, plan, action }, blueprintKey, captureName) {
  const contentType = plan.fixtureBlueprint.contentTypes[blueprintKey];
  const body = state.preparedCreateBodies.get(action.id);
  invariant(
    body !== undefined &&
      deepEqualJson(body, {
        name: contentType.name,
        slug: contentType.slug,
        schema: contentSchemaFromFields(contentType.fields),
      }),
    "content type prepared request drift"
  );
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "POST",
    "/content-types",
    { json: body }
  );
  assertRecordIdentity(
    response.value,
    { name: body.name, slug: body.slug, schema: body.schema },
    "content type create"
  );
  invariant(/^[0-9a-f-]{36}$/u.test(response.value.id), "content type ID drift");
  state.contentTypeBodies[blueprintKey] = body;
  state.ids[captureName] = response.value.id;
  return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
}

async function runtimeProveContentType(
  { state, plan, captures },
  blueprintKey,
  captureName,
  editable = false
) {
  const id = captures.get(captureName);
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/content-types/" + encodeURIComponent(id),
    { csrf: false }
  );
  const expected = state.contentTypeBodies[blueprintKey];
  assertRecordIdentity(
    response.value,
    { id, name: expected.name, slug: expected.slug, schema: expected.schema },
    "content type proof"
  );
  if (editable) {
    const projection = { id, slug: expected.slug, name: expected.name, schema: expected.schema };
    state.editableContentTypeDetail = deepFreezeExact(projection);
    return projection;
  }
  return runtimeSafeProjection({
    id,
    slug: expected.slug,
    schemaSha256: hashBytes(Buffer.from(canonicalJson(expected.schema))),
  });
}

async function runtimeCreateRelatedEntry(
  { state, plan, action },
  entryKey,
  contentTypeKey,
  captureName
) {
  const entry = plan.fixtureBlueprint.relatedEntries[entryKey];
  const type = plan.fixtureBlueprint.contentTypes[contentTypeKey];
  const body = state.preparedCreateBodies.get(action.id);
  invariant(
    body !== undefined &&
      deepEqualJson(body, { title: entry.title, slug: entry.slug, data: entry.data }),
    "related entry prepared request drift"
  );
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "POST",
    "/content/" + encodeURIComponent(type.slug) + "/entries",
    { json: body }
  );
  assertRecordIdentity(response.value, body, "related entry create");
  invariant(/^[0-9a-f-]{36}$/u.test(response.value.id), "related entry ID drift");
  state.entryBodies[entryKey] = { ...body, typeSlug: type.slug };
  return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
}

async function runtimeProveRelatedEntry({ state, captures }, entryKey, captureName) {
  const id = captures.get(captureName);
  const body = state.entryBodies[entryKey];
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/content/" + encodeURIComponent(body.typeSlug) + "/entries/" + encodeURIComponent(id),
    { csrf: false }
  );
  assertRecordIdentity(
    response.value,
    { id, title: body.title, slug: body.slug, data: body.data },
    "related entry proof"
  );
  const semanticByEntryKey = {
    a1: "related-entry-a1",
    a2: "related-entry-a2",
    b1: "related-entry-b1",
    b2: "related-entry-b2",
    failure1: "related-entry-failure1",
  };
  const authorId = readExactEntryAuthorId(
    response.value,
    state.bootstrapBaseline.id,
    "related entry proof"
  );
  state.resourceOwners.set(semanticByEntryKey[entryKey], authorId);
  return runtimeSafeProjection({
    id,
    title: body.title,
    slug: body.slug,
    dataSha256: hashBytes(Buffer.from(canonicalJson(body.data))),
  });
}

async function runtimeCreateEditableEntry({ state, plan, action, captures }) {
  const entry = plan.fixtureBlueprint.entry;
  const body = state.preparedCreateBodies.get(action.id);
  invariant(
    body !== undefined &&
      deepEqualJson(body, {
        title: entry.title,
        slug: entry.slug,
        data: resolveFixtureValue(entry.baseline, captures),
      }),
    "editable entry prepared request drift"
  );
  const typeSlug = plan.fixtureBlueprint.contentTypes.editable.slug;
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "POST",
    "/content/" + encodeURIComponent(typeSlug) + "/entries",
    { json: body }
  );
  assertRecordIdentity(response.value, body, "editable entry create");
  state.editableEntryBody = deepFreezeExact(body);
  return runtimeSafeProjection(response.value, { "entry.id": response.value.id });
}

async function runtimeProveEditableEntry({ state, plan, captures }) {
  const id = captures.get("entry.id");
  const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
    { csrf: false, retainAuthoritativeBytes: true }
  );
  assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "editable entry proof");
  const authorId = readExactEntryAuthorId(
    response.value,
    state.bootstrapBaseline.id,
    "editable entry proof"
  );
  state.resourceOwners.set("editable-entry", authorId);
  state.mediaRaceAdminEvidence.entry = response.authoritativeBytes;
  return runtimeSafeProjection({
    id,
    bodySha256: hashBytes(Buffer.from(canonicalJson(state.editableEntryBody))),
  });
}

async function materializeScreenBody(state, blueprint, captures, operationId) {
  invariant(state.editableContentTypeDetail !== null, "editable content-type projection is absent");
  const { listView: descriptor, ...definitionWithoutListView } = blueprint.definitionTemplate;
  invariant(
    descriptor.materializerId === "buildDefaultListViewDefinition" &&
      descriptor.privateProjectionAuthorityId === "editable-content-type-detail",
    "screen list-view descriptor drift"
  );
  const bodyWithoutDefinition = {
    name: blueprint.name,
    contentTypeId: captures.get("content-type-editable.id"),
    status: blueprint.status,
    showInSidebar: blueprint.showInSidebar,
    sidebarLabel: blueprint.sidebarLabel,
  };
  const body = await runBunBridgeOperation(state, operationId, {
    bodyWithoutDefinition,
    contentType: state.editableContentTypeDetail,
    definitionWithoutListView,
  });
  invariant(
    body.contentTypeId === state.editableContentTypeDetail.id && body.schemaVersion === 4,
    "materialized Screen body drift"
  );
  return deepFreezeExact(body);
}

async function runtimeCreateScreen({ state, plan, action, captures }, key, captureName) {
  const blueprint =
    key === "main" ? plan.fixtureBlueprint.screen : plan.fixtureBlueprint.retryScreen;
  const body = state.preparedCreateBodies.get(action.id);
  invariant(body !== undefined && body.name === blueprint.name, "Screen prepared request drift");
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "POST",
    "/custom-screens",
    { json: body }
  );
  assertRecordIdentity(
    response.value,
    { name: body.name, contentTypeId: body.contentTypeId, definition: body.definition },
    "Screen create"
  );
  state.screenBodies[key] = body;
  return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
}

async function runtimeProveScreen({ state, captures }, key, captureName) {
  const id = captures.get(captureName);
  const body = state.screenBodies[key];
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/custom-screens/" + encodeURIComponent(id),
    { csrf: false, retainAuthoritativeBytes: key === "main" }
  );
  assertRecordIdentity(
    response.value,
    { id, name: body.name, contentTypeId: body.contentTypeId, definition: body.definition },
    "Screen proof"
  );
  if (key === "main") state.mediaRaceAdminEvidence.screen = response.authoritativeBytes;
  return runtimeSafeProjection({
    id,
    definitionSha256: hashBytes(Buffer.from(canonicalJson(body.definition))),
  });
}

async function runtimeReplaceOverrides({ state, plan, action, captures }, empty) {
  const screenId = captures.get("screen.id");
  const entryId = captures.get("entry.id");
  const overrides = empty
    ? []
    : [
        {
          blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          propPath: "mediaAssetId",
          value: captures.get("media.id"),
        },
      ];
  if (!empty && action.id === "set-039-override-create") {
    const intent = state.responseLostIntents.get(action.id);
    invariant(
      intent !== undefined &&
        deepEqualJson(intent.authoredProjection, {
          screenId,
          entryId,
          blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          propPath: "mediaAssetId",
          value: captures.get("media.id"),
          updatedBy: state.bootstrapBaseline.id,
        }),
      "override prepared request drift"
    );
  }
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "PATCH",
    "/custom-screens/" +
      encodeURIComponent(screenId) +
      "/entries/" +
      encodeURIComponent(entryId) +
      "/overrides",
    {
      json: { overrides },
      retainAuthoritativeBytes:
        action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.reset,
    }
  );
  invariant(
    deepEqualJson(
      response.value?.overrides?.map(({ blockId, propPath, value }) => ({
        blockId,
        propPath,
        value,
      })),
      overrides
    ),
    "override write drift"
  );
  if (action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.reset) {
    stageIntentionalPresentationOverrideObservation(
      state,
      action,
      captures,
      response.authoritativeBytes
    );
  }
  state.expectedOverrides = overrides;
  return runtimeSafeProjection({ count: overrides.length });
}

function parseMediaRaceAuthoritativeAdminEvidence(state) {
  const sources = state.mediaRaceAdminEvidence;
  const ordered = [
    sources.screen,
    sources.entry,
    sources.media,
    sources.override,
    sources.retryOverride,
  ];
  invariant(
    ordered.every(
      (bytes) => Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_STREAM_BYTES
    ),
    "media-race authoritative Admin byte set is incomplete"
  );
  const values = ordered.map((bytes, index) => {
    let value;
    try {
      value = JSON.parse(decodeBoundedUtf8(bytes, "media-race Admin response " + index));
    } catch {
      invariant(false, "media-race authoritative Admin response is unparseable");
    }
    assertPlainJsonValue(value, "media-race authoritative Admin response");
    return value;
  });
  const [screen, entry, media, overrideResponse, retryOverrideResponse] = values;
  const blockId = state.plan.fixtureBlueprint.screen.blockIds.raceImage;
  const blocks = [];
  const visit = (block) => {
    blocks.push(block);
    for (const slot of Object.values(block.slots ?? {})) for (const child of slot) visit(child);
  };
  for (const section of screen.definition.editorView.document.sections) {
    for (const block of section.blocks) visit(block);
  }
  const imageBlocks = blocks.filter((block) => block.id === blockId && block.type === "image");
  const bindings = screen.definition.editorView.bindings.filter(
    (binding) =>
      binding.blockId === blockId &&
      binding.propPath === "src" &&
      binding.source === "entry" &&
      binding.mode === "read"
  );
  const overrideRows = overrideResponse.overrides;
  const screenId = state.currentCaptures.get("screen.id");
  const retryScreenId = state.currentCaptures.get("retry-screen.id");
  const entryId = state.currentCaptures.get("entry.id");
  const mediaId = state.currentCaptures.get("media.id");
  invariant(
    imageBlocks.length === 1 &&
      bindings.length === 1 &&
      Array.isArray(overrideRows) &&
      overrideRows.length === 1 &&
      Array.isArray(retryOverrideResponse.overrides) &&
      retryOverrideResponse.overrides.length === 0 &&
      screen.id === screenId &&
      entry.id === entryId &&
      media.id === mediaId &&
      retryScreenId !== screenId &&
      bindings[0].field === "raceImageId" &&
      overrideRows[0].screenId === screenId &&
      overrideRows[0].entryId === entryId &&
      overrideRows[0].blockId === blockId &&
      overrideRows[0].propPath === "mediaAssetId" &&
      overrideRows[0].value === mediaId,
    "media-race authoritative Admin cardinality drift"
  );
  const projection = deepFreezeExact({
    bindingCount: bindings.length,
    overrideCount: overrideRows.length,
    entryValueMatches:
      entry.data?.[bindings[0].field] === state.plan.fixtureBlueprint.media.missingBoundMediaId,
    safeUrlMatches:
      media.id === state.mediaRecord.id &&
      media.url === state.mediaCanonicalSafeUrl &&
      media.url === "/media/" + media.key,
  });
  exactOwnKeys(
    projection,
    ["bindingCount", "overrideCount", "entryValueMatches", "safeUrlMatches"],
    "media-race authoritative projection",
    { plain: true }
  );
  invariant(
    deepEqualJson(projection, {
      bindingCount: 1,
      overrideCount: 1,
      entryValueMatches: true,
      safeUrlMatches: true,
    }),
    "media-race authoritative projection drift"
  );
  const frames = [];
  for (const bytes of ordered) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    frames.push(length, bytes);
  }
  const authoritativeBytes = Buffer.concat(frames);
  const evidenceSha256 = hashBytes(authoritativeBytes);
  invariant(
    evidenceSha256 !== hashBytes(Buffer.from(canonicalJson(projection))),
    "media-race evidence hash used the sanitized summary"
  );
  return deepFreezeExact({ evidenceSha256, projection });
}

function exactPresentationOverrideIdentifier(state, captures) {
  return deepFreezeExact([
    captures.get("screen.id"),
    captures.get("entry.id"),
    state.plan.fixtureBlueprint.screen.blockIds.raceImage,
    "mediaAssetId",
  ]);
}

function stageIntentionalPresentationOverrideObservation(
  state,
  action,
  captures,
  authoritativeBytes,
  ownerSubjectIdentifier = null
) {
  if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
  invariant(
    Buffer.isBuffer(authoritativeBytes) &&
      authoritativeBytes.length > 0 &&
      authoritativeBytes.length <= MAX_STREAM_BYTES &&
      (ownerSubjectIdentifier === null || typeof ownerSubjectIdentifier === "string") &&
      !state.intentionalPresentationOverrideObservations.has(action.id),
    action.id + " intentional override observation drift"
  );
  state.intentionalPresentationOverrideObservations.set(
    action.id,
    deepFreezeExact({
      actionId: action.id,
      identifier: exactPresentationOverrideIdentifier(state, captures),
      ownerSubjectIdentifier,
      responseSha256: hashBytes(authoritativeBytes),
    })
  );
}

function stageIntentionalPresentationOverrideActionReceipt(state, action, receipt) {
  if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
  const observation = state.intentionalPresentationOverrideObservations.get(action.id);
  exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, action.id + " intentional override receipt", {
    plain: true,
  });
  invariant(
    observation !== undefined &&
      receipt.status === 0 &&
      Number.isSafeInteger(receipt.sequence) &&
      receipt.sequence > 0 &&
      typeof receipt.evidenceSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(receipt.evidenceSha256) &&
      !state.pendingIntentionalPresentationOverrideReceipts.has(action.id),
    action.id + " intentional override receipt staging drift"
  );
  state.pendingIntentionalPresentationOverrideReceipts.set(
    action.id,
    deepFreezeExact({
      ...observation,
      actionOrdinal: action.ordinal,
      receiptEvidenceSha256: receipt.evidenceSha256,
      receiptSequence: receipt.sequence,
    })
  );
}

function commitIntentionalPresentationOverrideActionAfterLedgerAppend(state, action, delta) {
  if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
  const staged = state.pendingIntentionalPresentationOverrideReceipts.get(action.id);
  invariant(staged !== undefined, action.id + " intentional override receipt is not staged");
  state.pendingIntentionalPresentationOverrideReceipts.delete(action.id);
  const actions = INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS;
  if (action.id === actions.acquisition) {
    const cores = delta.cores.filter(({ kind }) => kind === "presentation-override");
    invariant(
      state.intentionalPresentationOverrideAuthority === null &&
        delta.cores.length === 1 &&
        cores.length === 1 &&
        deepEqualJson(cores[0].identifier, staged.identifier) &&
        cores[0].ownerSubjectIdentifier === staged.ownerSubjectIdentifier &&
        state.resourceKeys.get("presentation-override") === cores[0].resourceKey,
      "intentional override acquisition authority drift"
    );
    state.intentionalPresentationOverrideAuthority = deepFreezeExact({
      acquisition: deepFreezeExact({ ...staged, resourceKey: cores[0].resourceKey }),
      proof: null,
      reset: null,
    });
    return;
  }
  invariant(delta.cores.length === 0, action.id + " unexpectedly acquired a resource");
  const current = state.intentionalPresentationOverrideAuthority;
  invariant(
    current !== null &&
      deepEqualJson(current.acquisition.identifier, staged.identifier) &&
      current.acquisition.receiptSequence < staged.receiptSequence,
    action.id + " intentional override authority lineage drift"
  );
  if (action.id === actions.reset) {
    invariant(
      current.reset === null && current.proof === null,
      "override reset authority repeated"
    );
    state.intentionalPresentationOverrideAuthority = deepFreezeExact({
      acquisition: current.acquisition,
      proof: null,
      reset: staged,
    });
    return;
  }
  invariant(
    action.id === actions.proof &&
      current.reset !== null &&
      current.proof === null &&
      current.reset.receiptSequence < staged.receiptSequence,
    "override absence proof authority order drift"
  );
  state.intentionalPresentationOverrideAuthority = deepFreezeExact({
    acquisition: current.acquisition,
    proof: staged,
    reset: current.reset,
  });
}

function completeIntentionalPresentationOverrideAbsenceAuthority(state, record = null) {
  const authority = state.intentionalPresentationOverrideAuthority;
  if (authority === null || authority.reset === null || authority.proof === null) return null;
  exactOwnKeys(
    authority,
    ["acquisition", "proof", "reset"],
    "intentional presentation override absence authority",
    { plain: true }
  );
  const actions = INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS;
  invariant(
    authority.acquisition.actionId === actions.acquisition &&
      authority.reset.actionId === actions.reset &&
      authority.proof.actionId === actions.proof &&
      deepEqualJson(authority.acquisition.identifier, authority.reset.identifier) &&
      deepEqualJson(authority.reset.identifier, authority.proof.identifier) &&
      authority.acquisition.receiptSequence < authority.reset.receiptSequence &&
      authority.reset.receiptSequence < authority.proof.receiptSequence &&
      authority.acquisition.resourceKey === state.resourceKeys.get("presentation-override") &&
      [authority.acquisition, authority.reset, authority.proof].every(
        ({ receiptEvidenceSha256, responseSha256 }) =>
          /^[a-f0-9]{64}$/u.test(receiptEvidenceSha256) && /^[a-f0-9]{64}$/u.test(responseSha256)
      ),
    "intentional presentation override absence authority is incomplete"
  );
  if (record !== null) {
    invariant(
      record.kind === "presentation-override" &&
        record.resourceKey === authority.acquisition.resourceKey &&
        deepEqualJson(record.identifier, authority.acquisition.identifier) &&
        record.ownerSubjectIdentifier === authority.acquisition.ownerSubjectIdentifier,
      "intentional presentation override cleanup record drift"
    );
  }
  return authority;
}

async function runtimeProveOverrides({ state, action, captures }, empty) {
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/custom-screens/" +
      encodeURIComponent(captures.get("screen.id")) +
      "/entries/" +
      encodeURIComponent(captures.get("entry.id")) +
      "/overrides",
    {
      csrf: false,
      retainAuthoritativeBytes:
        !empty || action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.proof,
    }
  );
  const overrideRows = response.value?.overrides;
  const overrides = overrideRows?.map(({ blockId, propPath, value }) => ({
    blockId,
    propPath,
    value,
  }));
  invariant(
    Array.isArray(overrides) &&
      (empty ? overrides.length === 0 : deepEqualJson(overrides, state.expectedOverrides)),
    "override proof drift"
  );
  if (!empty) {
    invariant(
      Buffer.isBuffer(response.authoritativeBytes) && response.authoritativeBytes.length > 0,
      "override authoritative bytes are absent"
    );
    invariant(overrideRows.length === 1, "media-race override cardinality drift");
    const row = overrideRows[0];
    invariant(row.updatedBy === null || typeof row.updatedBy === "string", "override owner drift");
    state.resourceOwners.set("presentation-override", row.updatedBy ?? null);
    stageIntentionalPresentationOverrideObservation(
      state,
      action,
      captures,
      response.authoritativeBytes,
      row.updatedBy ?? null
    );
    const retryResponse = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" +
        encodeURIComponent(captures.get("retry-screen.id")) +
        "/entries/" +
        encodeURIComponent(captures.get("entry.id")) +
        "/overrides",
      { csrf: false, retainAuthoritativeBytes: true }
    );
    invariant(
      Array.isArray(retryResponse.value?.overrides) && retryResponse.value.overrides.length === 0,
      "retry Screen unexpectedly owns an override"
    );
    state.mediaRaceAdminEvidence.override = response.authoritativeBytes;
    state.mediaRaceAdminEvidence.retryOverride = retryResponse.authoritativeBytes;
    const blockId = state.plan.fixtureBlueprint.screen.blockIds.raceImage;
    const sections = state.screenBodies.main.definition.editorView.document.sections;
    const blocks = [];
    const visit = (block) => {
      blocks.push(block);
      for (const slot of Object.values(block.slots ?? {})) for (const child of slot) visit(child);
    };
    for (const section of sections) for (const block of section.blocks) visit(block);
    const matchingBlocks = blocks.filter((block) => block.id === blockId && block.type === "image");
    invariant(matchingBlocks.length === 1, "media-race image block cardinality drift");
    const bindings = state.screenBodies.main.definition.editorView.bindings.filter(
      (binding) =>
        binding.blockId === blockId &&
        binding.propPath === "src" &&
        binding.source === "entry" &&
        binding.mode === "read"
    );
    invariant(
      bindings.length === 1 && typeof bindings[0].field === "string",
      "media-race src binding cardinality drift"
    );
    const boundField = bindings[0].field;
    const missingBoundMediaId = state.plan.fixtureBlueprint.media.missingBoundMediaId;
    invariant(
      state.editableEntryBody.data[boundField] === missingBoundMediaId,
      "media-race entry value drift"
    );
    invariant(
      typeof state.mediaCanonicalSafeUrl === "string" &&
        state.mediaCanonicalSafeUrl === state.mediaRecord.url &&
        state.mediaCanonicalSafeUrl === "/media/" + state.mediaRecord.key,
      "media-race safe URL provenance drift"
    );
    const projection = deepFreezeExact({
      acquiredMedia: deepFreezeExact({
        id: captures.get("media.id"),
        canonicalSafeUrl: state.mediaCanonicalSafeUrl,
      }),
      missingBoundMediaId,
      screenId: captures.get("screen.id"),
      entryId: captures.get("entry.id"),
      directImageBlockId: blockId,
      boundField,
      override: deepFreezeExact({
        screenId: captures.get("screen.id"),
        entryId: captures.get("entry.id"),
        blockId,
        propPath: "mediaAssetId",
        mediaId: captures.get("media.id"),
      }),
    });
    invariant(
      projection.acquiredMedia.id !== projection.missingBoundMediaId,
      "media-race IDs are not distinct"
    );
    invariant(
      captures.get("retry-screen.id") !== projection.screenId,
      "retry Screen substituted the main Screen"
    );
    const authoritative = parseMediaRaceAuthoritativeAdminEvidence(state);
    state.mediaRaceProjection = projection;
    state.mediaRaceReceiptHash = authoritative.evidenceSha256;
  } else if (action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.proof) {
    stageIntentionalPresentationOverrideObservation(
      state,
      action,
      captures,
      response.authoritativeBytes
    );
  }
  return runtimeSafeProjection({ count: overrides.length });
}

async function runtimeSetPreference({ state, action }, key, showFieldMetadata, operationId) {
  const userId = state.ids[key === "a" ? "userA" : "userB"];
  invariant(state.responseLostIntents.has(action.id), "setting write lacks its pre-write intent");
  const result = await runBunBridgeOperation(state, operationId, { showFieldMetadata, userId });
  invariant(result.ok === true, "preference write failed");
  return runtimeSafeProjection({ key, showFieldMetadata });
}

async function runtimeProvePreference({ state }, key, expected, operationId) {
  const userId = state.ids[key === "a" ? "userA" : "userB"];
  const result = await runBunBridgeOperation(state, operationId, { userId });
  invariant(result.showFieldMetadata === expected, "preference proof drift");
  return runtimeSafeProjection({ key, showFieldMetadata: result.showFieldMetadata });
}

async function runtimePatchUnsafeBinding({ state, captures }) {
  const screenId = captures.get("screen.id");
  const current = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/custom-screens/" + encodeURIComponent(screenId),
    { csrf: false }
  );
  const buttonId = captures.get("palette.button");
  let changed = 0;
  const definition = structuredClone(current.value.definition);
  definition.editorView.bindings = definition.editorView.bindings.map((binding) => {
    if (binding.blockId === buttonId && binding.propPath === "href") {
      changed += 1;
      return { ...binding, field: "secondaryUrl" };
    }
    return binding;
  });
  invariant(changed === 1, "unsafe button binding target drift");
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "PATCH",
    "/custom-screens/" + encodeURIComponent(screenId),
    { json: { schemaVersion: 4, definition } }
  );
  state.latestUnsafeDefinition = response.value.definition;
  return runtimeSafeProjection({ changed });
}

async function runtimeProveUnsafeBinding({ state, captures }) {
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/custom-screens/" + encodeURIComponent(captures.get("screen.id")),
    { csrf: false }
  );
  const buttonId = captures.get("palette.button");
  const bindings = response.value.definition.editorView.bindings.filter(
    (binding) => binding.blockId === buttonId && binding.propPath === "href"
  );
  invariant(
    bindings.length === 1 && bindings[0].field === "secondaryUrl",
    "unsafe binding proof drift"
  );
  return runtimeSafeProjection({ bindingCount: 1, field: "secondaryUrl" });
}

async function runtimeResetScreen({ state, captures }) {
  const id = captures.get("screen.id");
  const definition = state.screenBodies.main.definition;
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "PATCH",
    "/custom-screens/" + encodeURIComponent(id),
    { json: { schemaVersion: 4, definition } }
  );
  invariant(deepEqualJson(response.value.definition, definition), "Screen baseline reset drift");
  return runtimeSafeProjection({ reset: true });
}

async function runtimeProveScreenBaseline({ state, captures }) {
  const id = captures.get("screen.id");
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/custom-screens/" + encodeURIComponent(id),
    { csrf: false }
  );
  invariant(
    deepEqualJson(response.value.definition, state.screenBodies.main.definition),
    "Screen baseline proof drift"
  );
  return runtimeSafeProjection({ baseline: true });
}

async function runtimeResetEntry({ state, plan, captures }) {
  const id = captures.get("entry.id");
  const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "PATCH",
    "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
    { json: state.editableEntryBody }
  );
  assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "entry reset");
  return runtimeSafeProjection({ reset: true });
}

async function runtimeProveEntryBaseline({ state, plan, captures }) {
  const id = captures.get("entry.id");
  const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
  const response = await adminApiRequest(
    state,
    bootstrapApiSession(state),
    "GET",
    "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
    { csrf: false }
  );
  assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "entry baseline proof");
  return runtimeSafeProjection({ baseline: true });
}

async function runtimeUserAPreferenceRead({ state }, expected) {
  const session = state.sessions.get("user-a");
  invariant(session && session.userId === state.ids.userA, "user-A API session is unavailable");
  const response = await adminApiRequest(
    state,
    session,
    "GET",
    "/user-settings/customScreens.entry.preferences",
    { csrf: false }
  );
  exactOwnKeys(response.value, ["key", "value"], "isolated preference response", { plain: true });
  invariant(
    response.value.key === "customScreens.entry.preferences" &&
      response.value.value.version === 1 &&
      response.value.value.showFieldMetadata === expected,
    "isolated preference read drift"
  );
  return runtimeSafeProjection({ showFieldMetadata: expected });
}

async function runtimeUserAPreferenceFalse({ state }) {
  const session = state.sessions.get("user-a");
  const response = await adminApiRequest(
    state,
    session,
    "PATCH",
    "/user-settings/customScreens.entry.preferences",
    {
      expectedUserId: state.ids.userA,
      json: { value: { version: 1, showFieldMetadata: false } },
    }
  );
  invariant(response.value?.value?.showFieldMetadata === false, "isolated preference write drift");
  return runtimeSafeProjection({ showFieldMetadata: false });
}

const { buildRuntimeOperationHandlers } = createRuntimeOperationRouter({
  sendCanonicalMediaMultipart,
  runtimeResetScreen,
  runtimeProveScreenBaseline,
  runtimeResetEntry,
  runtimeProveEntryBaseline,
  runtimeReplaceOverrides,
  runtimeProveOverrides,
  runtimeStoragePreflight,
  runtimeHostLaunch,
  runtimeHealth,
  runtimeBotProtection,
  runtimeSecurity,
  runtimeLogin,
  runtimeCsrf,
  runtimeProvisionUser,
  runtimeProveUser,
  runtimeCreateContentType,
  runtimeProveContentType,
  runtimeCreateRelatedEntry,
  runtimeProveRelatedEntry,
  runtimeUploadMedia,
  runtimeProveMedia,
  runtimeStoragePostSetup,
  runtimeCreateEditableEntry,
  runtimeProveEditableEntry,
  runtimeCreateScreen,
  runtimeProveScreen,
  runtimeSetPreference,
  runtimeProvePreference,
  runtimePatchUnsafeBinding,
  runtimeProveUnsafeBinding,
  runtimeUserAPreferenceRead,
  runtimeUserAPreferenceFalse,
});

function privateNativeSnapshotSizeIsValid(size, allowEmpty) {
  return (
    Number.isSafeInteger(size) &&
    typeof allowEmpty === "boolean" &&
    size >= (allowEmpty ? 0 : 1) &&
    size <= MAX_STREAM_BYTES
  );
}

async function registerPrivateNativeSnapshot(state, token, label, { allowEmpty = false } = {}) {
  invariant(
    /^\.\.\/output\/page-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z\.yml$/u.test(
      token
    ) &&
      !token.includes("%") &&
      !token.includes("\\"),
    label + " snapshot token is invalid"
  );
  const absolute = path.resolve(state.browserWorkspace.cwd, token);
  invariant(
    absolute.startsWith(state.browserWorkspace.outputDir + path.sep) &&
      path.dirname(absolute) === state.browserWorkspace.outputDir,
    label + " snapshot escaped the private output directory"
  );
  const identity = await readStableArtifactIdentity(absolute, {
    expectedType: "file",
    expectedDev: privateWorkspaceRootDevice(state.browserWorkspace.ledger),
  });
  invariant(
    privateNativeSnapshotSizeIsValid(identity.size, allowEmpty),
    label + " snapshot size is invalid"
  );
  registerWorkspaceArtifact(state.browserWorkspace.ledger, absolute, identity);
  invariant(!state.nativeSnapshots.has(absolute), label + " snapshot path was reused");
  state.nativeSnapshots.set(absolute, identity);
  return token;
}

const NATIVE_OUTPUT_DESCRIPTOR_REGISTRY = deepFreezeExact({
  "open-about-blank": {
    actionIds: ["set-005-open"],
    async parse({ state, action, text }) {
      const prefix = "### Browser `wf540smoke` opened with pid ";
      const middle = ".\n### Page\n- Page URL: about:blank\n### Snapshot\n- [Snapshot](";
      invariant(
        text.startsWith(prefix) && text.endsWith(")\n"),
        action.id + " native open frame drift"
      );
      const middleIndex = text.indexOf(middle, prefix.length);
      invariant(
        middleIndex !== -1 && text.indexOf(middle, middleIndex + 1) === -1,
        action.id + " native open section drift"
      );
      const pidText = text.slice(prefix.length, middleIndex);
      invariant(/^[1-9][0-9]*$/u.test(pidText), action.id + " browser PID token drift");
      const pid = Number(pidText);
      invariant(Number.isSafeInteger(pid) && pid > 1, action.id + " browser PID is invalid");
      const snapshot = text.slice(middleIndex + middle.length, -2);
      await registerPrivateNativeSnapshot(state, snapshot, action.id, { allowEmpty: true });
      const identity = await readProcIdentity(pid);
      const environmentBytes = await readFile(`/proc/${pid}/environ`);
      invariant(
        environmentBytes.includes(
          Buffer.from(`XDG_CACHE_HOME=${path.join(state.browserWorkspace.root, "xdg", "cache")}\0`)
        ),
        action.id + " browser process is outside the private authority root"
      );
      invariant(!state.browserProcessIdentities.has(pid), action.id + " browser PID was reused");
      state.browserProcessIdentities.set(pid, deepFreezeExact(identity));
      return Buffer.from('{"ok":true}\n');
    },
  },
  "fill-secret": {
    actionIds: [
      "set-009-login-email",
      "set-010-login-password",
      "ru-042-a-password",
      "ru-068-b-password",
      "ru-078-a2-password",
      "ru-092-b2-password",
      "ru-104-a3-password",
    ],
    async parse({ action, text }) {
      invariant(text === "\n", action.id + " native secret fill stdout drift");
      return Buffer.from('{"ok":true}\n');
    },
  },
  "tab-new": {
    actionIds: ["rc-019-related-tab-new"],
    async parse({ state, action, text }) {
      let offset = 0;
      for (const expected of expectedNativeTabRows(action, state)) {
        offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
      }
      const snapshotPrefix = "- [Snapshot](";
      invariant(
        text.startsWith(snapshotPrefix, offset) && text.endsWith(")\n"),
        action.id + " tab-new snapshot row drift"
      );
      const snapshot = text.slice(offset + snapshotPrefix.length, -2);
      await registerPrivateNativeSnapshot(state, snapshot, action.id);
      return Buffer.from('{"ok":true}\n');
    },
  },
  "tab-select": {
    actionIds: ["rc-022-related-tab-origin", "rc-045-origin-proof"],
    async parse({ state, action, text }) {
      let offset = 0;
      for (const expected of expectedNativeTabRows(action, state)) {
        offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
      }
      invariant(offset === text.length, action.id + " tab-select has extra bytes");
      return Buffer.from('{"ok":true}\n');
    },
  },
  "tab-close": {
    actionIds: ["rc-044-close-second-tab"],
    async parse({ state, action, text }) {
      let offset = 0;
      for (const expected of expectedNativeTabRows(action, state)) {
        offset = consumeExactTabRow(text, offset, expected, action.id).nextOffset;
      }
      invariant(offset === text.length, action.id + " tab-close has extra bytes");
      return Buffer.from('{"ok":true}\n');
    },
  },
  "route-list": {
    actionIds: ["end-002-route-list"],
    async parse({ action, text, bytes }) {
      invariant(text === "No active routes\n", action.id + " route-list stdout drift");
      return bytes;
    },
  },
  close: {
    actionIds: ["end-006-close"],
    async parse({ action, text, bytes }) {
      invariant(text === "Browser 'wf540smoke' closed\n\n", action.id + " close stdout drift");
      return bytes;
    },
  },
});

function validateNativeDescriptorRegistry(plan) {
  invariant(
    deepEqualJson(
      Object.keys(NATIVE_OUTPUT_DESCRIPTOR_REGISTRY).sort(),
      Object.keys(plan.registries.browserNativeOperations).sort()
    ),
    "native parser registry key-set drift"
  );
  for (const [operationId, descriptor] of Object.entries(NATIVE_OUTPUT_DESCRIPTOR_REGISTRY)) {
    invariant(
      deepEqualJson(
        [...descriptor.actionIds].sort(),
        [...plan.registries.browserNativeOperations[operationId].actionIds].sort()
      ),
      operationId + " native parser action-set drift"
    );
  }
}

async function normalizeBrowserCommandOutput(state, action, executable, bytes, invocation) {
  const text = decodeExactNativeUtf8(bytes, action.id + " browser output");
  invariant(
    !text.startsWith("### Error\n") && !text.includes("\n### Error\n"),
    action.id + " browser command reported an error"
  );
  if (executable.type === "browser-run-code") {
    invariant(
      text.endsWith("\n") && text.length > 1 && !text.slice(0, -1).includes("\n"),
      action.id + " run-code output frame drift"
    );
    return bytes;
  }
  if (executable.type === "browser-global-list") {
    invariant(
      action.id === "end-007-session-absence" && text === "  (no browsers)\n",
      action.id + " global list stdout drift"
    );
    invariant(
      state.terminalSessionAbsenceSha256 === null,
      "terminal session absence was assigned twice"
    );
    state.terminalSessionAbsenceSha256 = hashBytes(bytes);
    return bytes;
  }
  if (executable.type === "browser-screenshot") {
    const expectedPath = invocation.args[invocation.args.indexOf("--filename") + 1];
    invariant(
      typeof expectedPath === "string" &&
        !expectedPath.includes("%") &&
        !expectedPath.includes("\\"),
      action.id + " screenshot argv path drift"
    );
    invariant(
      text === "- [Screenshot of full page](" + expectedPath + ")\n" &&
        executable.fullPage === true,
      action.id + " screenshot stdout drift"
    );
    return Buffer.from("true\n");
  }
  invariant(executable.type === "browser-native", action.id + " browser output type drift");
  const descriptor = NATIVE_OUTPUT_DESCRIPTOR_REGISTRY[executable.operationId];
  invariant(
    descriptor !== undefined && descriptor.actionIds.includes(action.id),
    action.id + " native descriptor binding drift"
  );
  return descriptor.parse({ state, action, executable, bytes, text, invocation });
}

async function acquireScreenshotIdentity(state, action, plan) {
  const relative = plan.registries.screenshotPaths[action.executable.screenshotId];
  const absolute = path.resolve(state.root, relative);
  invariant(
    absolute.startsWith(state.root + path.sep) && path.relative(state.root, absolute) === relative,
    action.id + " screenshot path escaped the repository"
  );
  const handle = await open(absolute, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let descriptorIdentity;
  let bytes;
  try {
    descriptorIdentity = projectArtifactIdentity(await handle.stat());
    invariant(
      descriptorIdentity.type === "file" &&
        descriptorIdentity.size > 8 &&
        descriptorIdentity.size <= MAX_STREAM_BYTES,
      action.id + " screenshot descriptor identity drift"
    );
    bytes = await handle.readFile();
    const after = projectArtifactIdentity(await handle.stat());
    invariant(
      sameArtifactIdentity(descriptorIdentity, after, { includeSize: true }) &&
        bytes.length === after.size,
      action.id + " screenshot changed during read"
    );
  } finally {
    await handle.close();
  }
  const pathIdentity = await readStableArtifactIdentity(absolute, {
    expectedType: "file",
    expectedDev: descriptorIdentity.dev,
  });
  invariant(
    sameArtifactIdentity(descriptorIdentity, pathIdentity, { includeSize: true }),
    action.id + " screenshot path/descriptor identity drift"
  );
  invariant(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    action.id + " screenshot is not PNG"
  );
  invariant(!state.screenshots.has(relative), action.id + " screenshot was acquired twice");
  state.screenshots.set(relative, {
    relative,
    absolute,
    dev: descriptorIdentity.dev,
    ino: descriptorIdentity.ino,
    mode: descriptorIdentity.mode,
    size: descriptorIdentity.size,
    sha256: hashBytes(bytes),
  });
}

async function removeAcquiredScreenshots(state) {
  for (const relative of state.plan.requiredScreenshotPaths) {
    if (state.screenshots.has(relative)) continue;
    const absolute = path.resolve(state.root, relative);
    try {
      await lstat(absolute);
      invariant(false, "unowned screenshot path remains after failed acquisition");
    } catch (error) {
      invariant(error && error.code === "ENOENT", "unowned screenshot identity cannot be removed");
    }
  }
  for (const record of [...state.screenshots.values()].reverse()) {
    const current = await readStableArtifactIdentity(record.absolute, {
      expectedType: "file",
      expectedDev: record.dev,
    });
    invariant(
      current.ino === record.ino && current.mode === record.mode && current.size === record.size,
      "acquired screenshot identity changed before failure removal"
    );
    await unlink(record.absolute);
    await requireMissingPath(record.absolute, "removed acquired screenshot");
  }
  state.screenshots.clear();
}

async function closeBrowserIfPresent(state) {
  if (!state.browserMayExist || state.browserClosed) return;
  try {
    const output = await runPrivateProcess({
      file: "playwright-cli",
      args: ["-s=" + SESSION_NAME, "--raw", "close"],
      cwd: state.browserWorkspace.cwd,
      env: state.browserWorkspace.environment,
      stdin: Buffer.alloc(0),
      timeoutMs: 90_000,
    });
    invariant(
      output.equals(Buffer.from("Browser '" + SESSION_NAME + "' closed\n\n")),
      "browser close stdout drift"
    );
  } finally {
    state.browserClosed = true;
  }
}

async function releaseFailureRoutesIfPresent(state) {
  if (!state.browserMayExist || state.browserClosed) return;
  const output = await runPrivateProcess({
    file: "playwright-cli",
    args: runCode(buildFailureCleanupRoutesSource()),
    cwd: state.browserWorkspace.cwd,
    env: state.browserWorkspace.environment,
    stdin: Buffer.alloc(0),
    timeoutMs: 90_000,
  });
  invariant(output.equals(Buffer.from("true\n")), "failure route cleanup stdout drift");
}

async function proveBrowserSessionAbsent(state) {
  const output = await runPrivateProcess({
    file: "playwright-cli",
    args: ["--raw", "list"],
    cwd: state.browserWorkspace.cwd,
    env: state.browserWorkspace.environment,
    stdin: Buffer.alloc(0),
    timeoutMs: 90_000,
  });
  invariant(
    output.equals(Buffer.from("  (no browsers)\n")),
    "browser session absence stdout drift"
  );
}

function taskUserAgents(state) {
  return [
    state.plan.fixtureBlueprint.userAgents.browser,
    state.plan.fixtureBlueprint.userAgents.publicPreflight,
    state.plan.fixtureBlueprint.userAgents.apiBootstrap,
    state.plan.fixtureBlueprint.userAgents.apiUserA,
  ];
}

async function readStableTaskTrafficDelta(state, onPoll = null) {
  invariant(
    state.apiContextsClosed === true &&
      state.sessions.size === 0 &&
      privateApiContextRegistry(state).size === 0 &&
      privateEphemeralApiContextRegistry(state).size === 0,
    "terminal discovery started before API contexts closed"
  );
  invariant(state.taskTrafficBaseline !== null, "task traffic baseline is absent");
  invariant(
    onPoll === null || typeof onPoll === "function",
    "task traffic poll receipt authority drift"
  );
  let previous = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const snapshot = await runBunBridgeOperation(state, "terminal/task-traffic-snapshot", {
      userAgents: taskUserAgents(state),
    });
    exactOwnKeys(
      snapshot,
      ["access", "audit", "completeSession", "session"],
      "task traffic snapshot",
      { plain: true }
    );
    const agents = taskUserAgents(state);
    const validateRows = (kind, rows, exactKeys, bound, allowArbitraryUserAgent = false) => {
      invariant(
        Array.isArray(rows) &&
          rows.length <= bound &&
          deepEqualJson(
            rows.map(({ id }) => id),
            rows.map(({ id }) => id).sort()
          ) &&
          new Set(rows.map(({ id }) => id)).size === rows.length,
        kind + " task traffic row inventory drift"
      );
      for (const row of rows) {
        exactOwnKeys(row, exactKeys, kind + " task traffic row", { plain: true });
        invariant(
          typeof row.id === "string" && /^[0-9a-f-]{36}$/u.test(row.id),
          kind + " task traffic row ID drift"
        );
        if (Object.hasOwn(row, "userAgent")) {
          invariant(
            allowArbitraryUserAgent
              ? row.userAgent === null || typeof row.userAgent === "string"
              : agents.includes(row.userAgent),
            kind + " task traffic user-agent drift"
          );
        }
      }
    };
    validateRows(
      "access",
      snapshot.access,
      ["id", "sessionId", "userId", "userAgent"],
      MAX_TASK_TRAFFIC_ROWS
    );
    validateRows("audit", snapshot.audit, ["actorId", "id", "userAgent"], MAX_TASK_TRAFFIC_ROWS);
    validateRows("session", snapshot.session, ["id", "userAgent", "userId"], MAX_TASK_TRAFFIC_ROWS);
    validateRows(
      "complete session",
      snapshot.completeSession,
      ["id", "userAgent", "userId"],
      MAX_COMPLETE_SESSION_ROWS,
      true
    );
    const baseline = state.taskTrafficBaseline;
    const completeIds = snapshot.completeSession.map(({ id }) => id);
    invariant(
      baseline.sessionIds.every((id) => completeIds.includes(id)),
      "a baseline session disappeared before task-owned cleanup"
    );
    const newCompleteSessions = snapshot.completeSession.filter(
      ({ id }) => !baseline.sessionIds.includes(id)
    );
    invariant(
      newCompleteSessions.every(({ userAgent }) => agents.includes(userAgent)),
      "a new session does not carry an exact task user-agent"
    );
    const taskSessionDelta = snapshot.session.filter(({ id }) => !baseline.sessionIds.includes(id));
    invariant(
      deepEqualJson(
        newCompleteSessions.map(({ id }) => id).sort(),
        taskSessionDelta.map(({ id }) => id).sort()
      ),
      "complete-session inventory does not equal the task-UA session inventory"
    );
    const bootstrapAuthority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    invariant(
      bootstrapAuthority === undefined ||
        [...bootstrapAuthority.ownedSessionIds].every((id) => {
          const row = newCompleteSessions.find((candidate) => candidate.id === id);
          return (
            row?.userId === state.bootstrapBaseline.id &&
            [
              state.plan.fixtureBlueprint.userAgents.browser,
              state.plan.fixtureBlueprint.userAgents.apiBootstrap,
            ].includes(row.userAgent)
          );
        }),
      "an early captured bootstrap session is absent from terminal complete inventory"
    );
    invariant(
      [...state.earlyApiSessionTuples.entries()].every(([key, tuple]) => {
        const expectedUserId = key === "bootstrap" ? state.bootstrapBaseline.id : state.ids.userA;
        const expectedUserAgent =
          key === "bootstrap"
            ? state.plan.fixtureBlueprint.userAgents.apiBootstrap
            : state.plan.fixtureBlueprint.userAgents.apiUserA;
        const row = newCompleteSessions.find(({ id }) => id === tuple.id);
        return (
          (key === "bootstrap" || key === "user-a") &&
          tuple.userId === expectedUserId &&
          tuple.userAgent === expectedUserAgent &&
          row?.userId === expectedUserId &&
          row?.userAgent === expectedUserAgent
        );
      }),
      "an early captured isolated API session is absent from terminal complete inventory"
    );
    const delta = deepFreezeExact({
      access: snapshot.access.filter(({ id }) => !baseline.accessIds.includes(id)),
      audit: snapshot.audit.filter(({ id }) => !baseline.auditIds.includes(id)),
      session: newCompleteSessions,
    });
    if (onPoll !== null) await onPoll(attempt + 1, delta);
    state.taskTrafficPollCount = attempt + 1;
    const encoded = canonicalJson(delta);
    if (encoded === previous) return delta;
    previous = encoded;
    await delayMilliseconds(50);
  }
  invariant(false, "task traffic delta did not reach two stable observations");
}

function appendTaskTrafficPollProofReceipts(state, receiptTarget, phase, poll, rowsByKind) {
  invariant(
    Array.isArray(receiptTarget) &&
      (phase === "before-delete" || phase === "after-delete") &&
      Number.isSafeInteger(poll) &&
      poll > 0,
    "task traffic poll proof input drift"
  );
  for (const kind of ["audit", "access", "session"]) {
    const rows = rowsByKind[kind];
    invariant(Array.isArray(rows), "task traffic poll rows are absent: " + kind);
    const output = deepFreezeExact({ phase, poll, rowCount: rows.length });
    const authoritativeBytes = Buffer.from(canonicalJson({ phase, poll, kind, rows }) + "\n");
    receiptTarget.push(
      authoritativeProofRuntimeReceipt(state, {
        operation: "terminal-" + kind + "-stable-poll",
        operationDescriptor: "terminal-task-ua-bounded-stable-poll-v1",
        evidenceSha256: hashBytes(authoritativeBytes),
        subjectKind: "task-ua-" + kind,
        subjectIdentifier: phase + ":" + poll,
        output,
      })
    );
  }
}

function terminalResourceDelta(state, delta) {
  const cores = [];
  const dependencyEdges = [];
  const keyByTerminal = new Map();
  const append = (kind, row, ownerSubjectIdentifier) => {
    invariant(
      row && typeof row.id === "string" && /^[0-9a-f-]{36}$/u.test(row.id),
      "terminal row identity is invalid"
    );
    const core = createResourceCore({
      kind,
      identifier: [row.id],
      ownerSubjectIdentifier,
      acquisitionSourceId: "terminal-task-ua-discovery",
      sourceActionOrdinal: null,
      acquisitionChannel: "terminal-db-delta",
    });
    cores.push(core);
    keyByTerminal.set(kind + ":" + row.id, core.resourceKey);
    return core;
  };
  for (const row of delta.audit) append("audit-log-task-ua", row, row.actorId ?? null);
  for (const row of delta.access)
    append("access-log-task-ua", row, row.sessionId ?? row.userId ?? null);
  for (const row of delta.session) append("session-task", row, row.userId);
  const taskUsers = new Map([
    [state.ids.userA, state.resourceKeys.get("user-a")],
    [state.ids.userB, state.resourceKeys.get("user-b")],
  ]);
  for (const row of delta.audit) {
    const userKey = taskUsers.get(row.actorId);
    if (userKey)
      dependencyEdges.push(
        destructiveResourceEdge(userKey, keyByTerminal.get("audit-log-task-ua:" + row.id))
      );
  }
  for (const row of delta.session) {
    const userKey = taskUsers.get(row.userId);
    if (userKey)
      dependencyEdges.push(
        destructiveResourceEdge(userKey, keyByTerminal.get("session-task:" + row.id))
      );
  }
  for (const row of delta.access) {
    const accessKey = keyByTerminal.get("access-log-task-ua:" + row.id);
    if (row.sessionId !== null) {
      const sessionKey = keyByTerminal.get("session-task:" + row.sessionId);
      invariant(sessionKey !== undefined, "terminal access row references a non-task session");
      dependencyEdges.push(destructiveResourceEdge(sessionKey, accessKey));
    } else {
      const userKey = taskUsers.get(row.userId);
      if (userKey) dependencyEdges.push(destructiveResourceEdge(userKey, accessKey));
    }
  }
  return deepFreezeExact({
    cores: deepFreezeExact(cores),
    dependencyEdges: deepFreezeExact(dependencyEdges),
  });
}

function registerTerminalResourcesAfterLedgerAppend(state, delta) {
  for (const core of delta.cores) {
    invariant(TERMINAL_RESOURCE_KINDS.has(core.kind), "post-append terminal core kind drift");
    const semantic = core.kind + ":" + core.identifier[0];
    invariant(
      !state.resourceKeys.has(semantic),
      "post-append terminal semantic was already assigned"
    );
    state.resourceKeys.set(semantic, core.resourceKey);
  }
}

function assertExactFinalResourceDependencyGraph(state, finalLedger, dependencyGraph) {
  invariant(
    Array.isArray(finalLedger) && finalLedger.length > 0,
    "final dependency ledger is absent"
  );
  const records = new Map(finalLedger.map((record) => [record.resourceKey, record]));
  invariant(records.size === finalLedger.length, "final dependency ledger repeats a key");
  exactOwnKeys(
    dependencyGraph,
    finalLedger.map(({ resourceKey }) => resourceKey),
    "final dependency graph",
    { plain: true }
  );
  const expected = new Map(finalLedger.map(({ resourceKey }) => [resourceKey, new Set()]));
  const semanticByResourceKey = new Map(
    [...state.resourceKeys.entries()].map(([semantic, resourceKey]) => [resourceKey, semantic])
  );
  const freshOwnerBySemantic = new Map(
    (state.currentResourceOwnerProof ?? []).map(({ semantic, owner }) => [semantic, owner])
  );
  const addKeys = (parentKey, childKey, label) => {
    invariant(
      typeof parentKey === "string" &&
        typeof childKey === "string" &&
        expected.has(parentKey) &&
        expected.has(childKey) &&
        parentKey !== childKey,
      label + " dependency endpoint drift"
    );
    expected.get(parentKey).add(childKey);
  };
  const addSemanticsWhenPresent = (parentSemantic, childSemantic, label) => {
    const parentKey = state.resourceKeys.get(parentSemantic);
    const childKey = state.resourceKeys.get(childSemantic);
    if (parentKey === undefined || childKey === undefined) return;
    addKeys(parentKey, childKey, label);
  };
  for (const [parentSemantic, childSemantic] of [
    ["content-type-editable", "screen"],
    ["content-type-editable", "retry-screen"],
    ["content-type-editable", "editable-entry"],
    ["content-type-related-a", "related-entry-a1"],
    ["content-type-related-a", "related-entry-a2"],
    ["content-type-related-b", "related-entry-b1"],
    ["content-type-related-b", "related-entry-b2"],
    ["content-type-related-failure", "related-entry-failure1"],
    ...TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) => [
      entrySemantic,
      seoDocumentResourceSemantic(entrySemantic),
    ]),
    ["screen", "presentation-override"],
    ["editable-entry", "presentation-override"],
    ["media", "presentation-override"],
    ["user-a", "setting-user-a"],
    ["user-b", "setting-user-b"],
  ]) {
    addSemanticsWhenPresent(parentSemantic, childSemantic, "structural");
  }
  const taskUserKeyById = new Map();
  for (const [idKey, semantic] of [
    ["userA", "user-a"],
    ["userB", "user-b"],
  ]) {
    const id = state.ids[idKey];
    const key = state.resourceKeys.get(semantic);
    if (typeof id === "string" && typeof key === "string") taskUserKeyById.set(id, key);
  }
  const taskSessionKeyById = new Map(
    finalLedger
      .filter(({ kind }) => kind === "session-task")
      .map((record) => [record.identifier[0], record.resourceKey])
  );
  const nullableOwnerKinds = new Set([
    "entry-editable",
    "entry-related",
    "media-row-key",
    "presentation-override",
    "session-task",
    "audit-log-task-ua",
    "access-log-task-ua",
  ]);
  for (const record of finalLedger) {
    if (record.kind === "setting-user-a" || record.kind === "setting-user-b") {
      invariant(
        record.ownerSubjectIdentifier === record.identifier[0],
        "setting owner correlation drift"
      );
      continue;
    }
    invariant(
      nullableOwnerKinds.has(record.kind) || record.ownerSubjectIdentifier === null,
      "non-owner resource carries an owner correlation"
    );
    const semantic = semanticByResourceKey.get(record.resourceKey);
    const authoritativeOwner = freshOwnerBySemantic.has(semantic)
      ? freshOwnerBySemantic.get(semantic)
      : record.ownerSubjectIdentifier;
    let parentKey = null;
    if (record.kind === "access-log-task-ua") {
      parentKey =
        taskSessionKeyById.get(authoritativeOwner) ??
        taskUserKeyById.get(authoritativeOwner) ??
        null;
    } else if (
      record.kind === "entry-editable" ||
      record.kind === "entry-related" ||
      record.kind === "media-row-key" ||
      record.kind === "presentation-override" ||
      record.kind === "session-task" ||
      record.kind === "audit-log-task-ua"
    ) {
      parentKey = taskUserKeyById.get(authoritativeOwner) ?? null;
    }
    if (parentKey !== null) addKeys(parentKey, record.resourceKey, "owner-correlated");
  }
  for (const record of finalLedger) {
    const expectedChildren = [...expected.get(record.resourceKey)].sort();
    invariant(
      deepEqualJson(dependencyGraph[record.resourceKey], expectedChildren) &&
        deepEqualJson(record.dependsOn, expectedChildren),
      "final dependency graph is not the exact structural/owner graph"
    );
  }
  return true;
}

async function discoverExactSeoEntryResources(
  state,
  resourceLedger,
  query = (targetIds) =>
    runBunBridgeOperation(state, "resource/seo-entry-discovery", { targetIds }),
  stabilityBarrier = () => delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS)
) {
  invariant(
    typeof query === "function" && typeof stabilityBarrier === "function",
    "SEO entry discovery authority drift"
  );
  const targets = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) => ({
    entrySemantic,
    parentKey: state.resourceKeys.get(entrySemantic),
    resourceSemantic: seoDocumentResourceSemantic(entrySemantic),
    targetId: state.fixtureIds.get(entrySemantic),
  }));
  invariant(
    targets.length === 6 &&
      targets.every(
        ({ parentKey, resourceSemantic, targetId }) =>
          typeof targetId === "string" &&
          typeof parentKey === "string" &&
          !state.resourceKeys.has(resourceSemantic)
      ) &&
      new Set(targets.map(({ targetId }) => targetId)).size === 6 &&
      new Set(targets.map(({ parentKey }) => parentKey)).size === 6,
    "SEO entry discovery exact parent authority is absent"
  );
  const targetIds = deepFreezeExact(targets.map(({ targetId }) => targetId));
  const targetById = new Map(targets.map((target) => [target.targetId, target]));
  const validatePoll = (poll, label) => {
    exactOwnKeys(poll, ["candidates"], label, { plain: true });
    invariant(
      Array.isArray(poll.candidates) && poll.candidates.length <= 6,
      label + " cardinality drift"
    );
    const documentIds = new Set();
    const candidateTargetIds = new Set();
    let previousCorrelation = null;
    for (const candidate of poll.candidates) {
      exactOwnKeys(candidate, ["id", "targetId", "targetType"], label + " candidate", {
        plain: true,
      });
      requireBridgeUuid(candidate.id, label + " SEO document ID");
      requireBridgeUuid(candidate.targetId, label + " SEO target ID");
      const correlation = candidate.targetId + "\0" + candidate.id;
      invariant(
        candidate.targetType === "entry" &&
          targetById.has(candidate.targetId) &&
          !documentIds.has(candidate.id) &&
          !candidateTargetIds.has(candidate.targetId) &&
          (previousCorrelation === null || previousCorrelation < correlation),
        label + " target correlation drift"
      );
      documentIds.add(candidate.id);
      candidateTargetIds.add(candidate.targetId);
      previousCorrelation = correlation;
    }
    return poll;
  };
  const first = validatePoll(await query(targetIds), "SEO entry discovery first poll");
  await stabilityBarrier();
  const second = validatePoll(await query(targetIds), "SEO entry discovery second poll");
  invariant(deepEqualJson(first, second), "SEO entry discovery did not reach a stable boundary");
  if (second.candidates.length === 0) return deepFreezeExact([]);
  const cores = second.candidates.map((candidate) =>
    createResourceCore({
      kind: "seo-document-entry",
      identifier: [candidate.id, candidate.targetType, candidate.targetId],
      acquisitionSourceId: "cleanup-seo-entry-discovery",
      sourceActionOrdinal: null,
      acquisitionChannel: "cleanup-discovery",
    })
  );
  const delta = deepFreezeExact({
    cores: deepFreezeExact(cores),
    dependencyEdges: deepFreezeExact(
      cores.map((core) =>
        destructiveResourceEdge(targetById.get(core.identifier[2]).parentKey, core.resourceKey)
      )
    ),
  });
  resourceLedger.appendValidatedDelta(delta);
  promoteResourceBunDescriptorsAfterLedgerAppend(state, delta);
  for (const core of cores) {
    const target = targetById.get(core.identifier[2]);
    state.resourceKeys.set(target.resourceSemantic, core.resourceKey);
  }
  return deepFreezeExact(cores);
}

async function refreshCurrentSyntheticOwnerDependencyEdges(state, resourceLedger) {
  const entryKinds = TASK_FIXTURE_ENTRY_SEMANTICS;
  const entryIds = entryKinds.map((kind) => state.fixtureIds.get(kind));
  invariant(
    entryIds.every((id) => typeof id === "string"),
    "owner refresh entry inventory is incomplete"
  );
  const input = {
    entryIds,
    mediaId: state.fixtureIds.get("media"),
    override: {
      screenId: state.fixtureIds.get("screen"),
      entryId: state.fixtureIds.get("editable-entry"),
      blockId: state.plan.fixtureBlueprint.screen.blockIds.raceImage,
      propPath: "mediaAssetId",
    },
    overrideExpectedPresent:
      completeIntentionalPresentationOverrideAbsenceAuthority(state) === null,
  };
  const proof = await runBunBridgeOperation(state, "resource/current-owner-exact", input);
  exactOwnKeys(
    proof,
    ["entries", "media", "override", "overrideAbsent"],
    "current resource owner proof",
    { plain: true }
  );
  invariant(
    Array.isArray(proof.entries) && proof.entries.length === 6,
    "current entry owner proof drift"
  );
  const absenceAuthority = completeIntentionalPresentationOverrideAbsenceAuthority(state);
  invariant(
    proof.overrideAbsent === (absenceAuthority !== null) &&
      (absenceAuthority === null ? proof.override !== null : proof.override === null),
    "current override owner/absence expectation drift"
  );
  if (absenceAuthority !== null) {
    invariant(
      state.intentionalPresentationOverrideCleanupProof === null,
      "intentional override cleanup proof was assigned twice"
    );
    state.intentionalPresentationOverrideCleanupProof = deepFreezeExact({
      absenceOutputSha256: hashBytes(Buffer.from(canonicalJson(proof))),
      identifier: absenceAuthority.acquisition.identifier,
      operationDescriptor: "resource/current-owner-exact",
      proofActionReceiptSha256: absenceAuthority.proof.receiptEvidenceSha256,
      resetActionReceiptSha256: absenceAuthority.reset.receiptEvidenceSha256,
    });
  }
  const semanticById = new Map(entryKinds.map((kind) => [state.fixtureIds.get(kind), kind]));
  const owned = [
    ...proof.entries.map((row) => ({
      semantic: semanticById.get(row.id),
      owner: row.ownerSubjectIdentifier,
    })),
    { semantic: "media", owner: proof.media.ownerSubjectIdentifier },
    {
      semantic: "presentation-override",
      owner:
        absenceAuthority === null
          ? proof.override.ownerSubjectIdentifier
          : absenceAuthority.acquisition.ownerSubjectIdentifier,
    },
  ];
  const dependencyEdges = [];
  const appendedCorrelations = [];
  for (const row of owned) {
    invariant(
      typeof row.semantic === "string" && (row.owner === null || typeof row.owner === "string"),
      "current owner correlation drift"
    );
    const userSemantic =
      row.owner === state.ids.userA ? "user-a" : row.owner === state.ids.userB ? "user-b" : null;
    if (userSemantic === null) continue;
    const correlation = userSemantic + "\0" + row.semantic;
    if (state.syntheticOwnerEdgeKeys.has(correlation)) continue;
    const parentKey = state.resourceKeys.get(userSemantic);
    const childKey = state.resourceKeys.get(row.semantic);
    invariant(parentKey && childKey, "current owner dependency endpoint is absent");
    dependencyEdges.push(destructiveResourceEdge(parentKey, childKey));
    appendedCorrelations.push(correlation);
  }
  resourceLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([]),
      dependencyEdges: deepFreezeExact(dependencyEdges),
    })
  );
  for (const correlation of appendedCorrelations) state.syntheticOwnerEdgeKeys.add(correlation);
  invariant(
    state.currentResourceOwnerProof === null,
    "current resource owner proof was assigned twice"
  );
  state.currentResourceOwnerProof = deepFreezeExact(owned);
  return deepFreezeExact(owned);
}

function legacySubjectForResource(state, record) {
  const id = record.identifier[0];
  const matched = [...state.fixtureIds.entries()].find(([, candidate]) => candidate === id);
  invariant(matched !== undefined, "persistent resource has no exact fixture identity mapping");
  return {
    kind: matched[0],
    id,
    storageKey: record.kind === "media-row-key" ? record.identifier[1] : null,
  };
}

function cleanupRuntimeReceipt(
  state,
  operation,
  operationDescriptor,
  record,
  output,
  observedBytesSha256 = null
) {
  invariant(
    observedBytesSha256 === null ||
      (typeof observedBytesSha256 === "string" && /^[a-f0-9]{64}$/u.test(observedBytesSha256)),
    "cleanup authoritative observation hash drift"
  );
  const subjectKind = record?.kind ?? null;
  const subjectIdentifier =
    record === null || record === undefined
      ? null
      : record.identifier.length === 1
        ? record.identifier[0]
        : lengthPrefixedTuple(record.identifier);
  const authoritativeBytes = Buffer.from(
    canonicalJson({
      operation,
      operationDescriptor,
      subjectKind,
      subjectIdentifier,
      observedBytesSha256,
      output,
    }) + "\n"
  );
  const receipt = deepFreezeExact({
    runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
    sequence: ++state.runtimeReceiptSequence,
    operation,
    operationDescriptor,
    status: 0,
    evidenceSha256: hashBytes(authoritativeBytes),
    subjectKind,
    subjectIdentifier,
    sanitizedOutput: canonicalJson(output),
  });
  state.assertSafeEvidence(receipt, "TASK-540 cleanup runtime receipt");
  return receipt;
}

async function proveContentRoutesBaselineIdentity(state, label) {
  const current = await runBunBridgeOperation(state, "resource/content-routes-exact", {});
  invariant(
    deepEqualJson(current, state.contentRoutesBaseline),
    label + " content routes baseline drift"
  );
  invariant(
    !canonicalJson(current).includes(state.plan.prefix),
    label + " content routes contains a task slug"
  );
  state.contentRoutesDeleteProofs += 1;
  return true;
}

function authoritativeProofRuntimeReceipt(
  state,
  { operation, operationDescriptor, evidenceSha256, subjectKind, subjectIdentifier, output }
) {
  invariant(
    typeof evidenceSha256 === "string" && /^[a-f0-9]{64}$/u.test(evidenceSha256),
    "authoritative runtime proof hash drift"
  );
  const receipt = deepFreezeExact({
    runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
    sequence: ++state.runtimeReceiptSequence,
    operation,
    operationDescriptor,
    status: 0,
    evidenceSha256,
    subjectKind,
    subjectIdentifier,
    sanitizedOutput: canonicalJson(output),
  });
  state.assertSafeEvidence(receipt, "TASK-540 authoritative runtime proof receipt");
  return receipt;
}

function createCleanupPhaseScheduler(failures, phaseTrace) {
  invariant(
    Array.isArray(failures) && Array.isArray(phaseTrace) && phaseTrace.length === 0,
    "cleanup phase scheduler inputs are invalid"
  );
  let nextPhase = 1;
  let sealed = false;
  return Object.freeze({
    async run(phase, operation) {
      invariant(
        !sealed && phase === nextPhase && phase >= 1 && phase <= 10,
        "cleanup phase order drift"
      );
      invariant(typeof operation === "function", "cleanup phase operation is absent");
      let completed = false;
      try {
        await operation();
        completed = true;
      } catch (error) {
        failures.push(
          retainPrivateCleanupFailureDiagnosticNeverThrow(error, phase, "phase_failed")
        );
      }
      phaseTrace.push(deepFreezeExact({ phase, completed }));
      nextPhase += 1;
    },
    seal() {
      invariant(
        !sealed && nextPhase === 11 && phaseTrace.length === 10,
        "cleanup phase scheduler ended early"
      );
      sealed = true;
      return deepFreezeExact([...phaseTrace]);
    },
  });
}

async function runIndependentCleanupStepsNeverSkip(steps, label) {
  invariant(
    Array.isArray(steps) && steps.length > 0 && steps.every((step) => typeof step === "function"),
    label + " cleanup step registry drift"
  );
  const failures = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, label + " cleanup branches failed");
}

async function executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
  state,
  record,
  operationKind,
  proveFreshAbsence = (currentState, currentRecord) =>
    runBoundResourceBunOperation(currentState, currentRecord, "absence")
) {
  invariant(
    CLEANUP_OPERATION_KINDS.includes(operationKind) && typeof proveFreshAbsence === "function",
    "intentional override cleanup operation authority drift"
  );
  const authority = completeIntentionalPresentationOverrideAbsenceAuthority(state, record);
  invariant(authority !== null, "intentional override cleanup lacks complete authority");
  const cleanupProof = state.intentionalPresentationOverrideCleanupProof;
  exactOwnKeys(
    cleanupProof,
    [
      "absenceOutputSha256",
      "identifier",
      "operationDescriptor",
      "proofActionReceiptSha256",
      "resetActionReceiptSha256",
    ],
    "intentional override fresh cleanup proof",
    { plain: true }
  );
  invariant(
    deepEqualJson(cleanupProof.identifier, record.identifier) &&
      cleanupProof.operationDescriptor === "resource/current-owner-exact" &&
      cleanupProof.proofActionReceiptSha256 === authority.proof.receiptEvidenceSha256 &&
      cleanupProof.resetActionReceiptSha256 === authority.reset.receiptEvidenceSha256,
    "intentional override fresh cleanup proof lineage drift"
  );
  const freshAbsence = await proveFreshAbsence(state, record);
  invariant(
    deepEqualJson(freshAbsence, { absent: true, affected: 0, present: false }),
    "intentional override cleanup absence drift"
  );
  const actionAuthority =
    operationKind === "provenance"
      ? authority.acquisition
      : operationKind === "delete"
        ? authority.reset
        : authority.proof;
  const output = {
    actionId: actionAuthority.actionId,
    actionReceiptSha256: actionAuthority.receiptEvidenceSha256,
    actionResponseSha256: actionAuthority.responseSha256,
    alreadyDeletedByExactReset: true,
    freshAbsence,
    freshOwnerRefreshAbsenceSha256: cleanupProof.absenceOutputSha256,
    proofOperationDescriptor: record.absenceOpId,
  };
  const observedBytesSha256 = hashBytes(
    Buffer.from(
      canonicalJson({
        identifier: record.identifier,
        operationDescriptor: record.absenceOpId,
        result: freshAbsence,
      }) + "\n"
    )
  );
  if (operationKind === "delete") state.overridesCleared = true;
  return cleanupRuntimeReceipt(
    state,
    "cleanup-" + operationKind,
    record[
      operationKind === "provenance"
        ? "provenanceOpId"
        : operationKind === "delete"
          ? "cleanupOpId"
          : "absenceOpId"
    ],
    record,
    output,
    observedBytesSha256
  );
}

async function executeResourceCleanupOperation(state, record, operationKind) {
  invariant(
    CLEANUP_OPERATION_KINDS.includes(operationKind),
    "resource cleanup operation is invalid"
  );
  let output;
  let observedBytesSha256 = null;
  const intentionalOverrideAbsenceAuthority =
    record.kind === "presentation-override"
      ? completeIntentionalPresentationOverrideAbsenceAuthority(state, record)
      : null;
  if (intentionalOverrideAbsenceAuthority !== null) {
    return executeIntentionalPresentationOverrideAlreadyAbsentCleanup(state, record, operationKind);
  }
  const slot =
    operationKind === "provenance"
      ? "provenance"
      : operationKind === "delete"
        ? "cleanup"
        : "absence";
  const participation = resourceBunParticipationSlot(record, slot);
  invariant(participation !== null, "cleanup attempted a null resource operation slot");
  if (
    participation.mode === "bound-runtime-bridge" ||
    participation.mode === "node+bound-runtime-bridge"
  ) {
    invariant(
      operationKind === "provenance" &&
        BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS[participation.operationId] !== undefined,
      "bound runtime resource cleanup receipt drift"
    );
    output = { boundRuntimeOperationId: participation.operationId, alreadyExecuted: true };
  } else if (participation.mode === "bun-one-shot") {
    output = await runBoundResourceBunOperation(state, record, operationKind);
    if (record.kind === "presentation-override" && operationKind === "delete")
      state.overridesCleared = true;
  } else {
    invariant(
      participation.mode === "node-local" || participation.mode === "node+bun-one-shot",
      "resource cleanup participation mode drift"
    );
    if (record.kind === "presentation-override") {
      invariant(
        operationKind === "provenance" && participation.mode === "node-local",
        "presentation override Node operation drift"
      );
      const [screenId, entryId, blockId, propPath] = record.identifier;
      const response = await runPrivateCleanupAdminApiBoundary(async () => {
        const result = await adminApiRequest(
          state,
          bootstrapApiSession(state),
          "GET",
          "/custom-screens/" +
            encodeURIComponent(screenId) +
            "/entries/" +
            encodeURIComponent(entryId) +
            "/overrides",
          { csrf: false, retainAuthoritativeBytes: true }
        );
        const responseSha256 = hashCleanupAuthoritativeBytes(
          result.authoritativeBytes,
          "presentation override cleanup provenance"
        );
        const matches = result.value?.overrides?.filter(
          (row) =>
            row.screenId === screenId &&
            row.entryId === entryId &&
            row.blockId === blockId &&
            row.propPath === propPath
        );
        invariant(
          Array.isArray(matches) && matches.length === 1,
          "presentation override Node provenance drift"
        );
        return { observedBytesSha256: responseSha256 };
      });
      output = { present: true };
      observedBytesSha256 = response.observedBytesSha256;
    } else {
      const subject = legacySubjectForResource(state, record);
      if (operationKind === "provenance") {
        invariant(
          state.fixtureIds.get(subject.kind) === subject.id,
          subject.kind + " cleanup provenance drift"
        );
        const proof = await proveCleanupSubjectPresent(state, subject);
        output = proof.output;
        observedBytesSha256 = proof.observedBytesSha256;
      } else if (operationKind === "delete") {
        if (record.kind === "content-type") {
          await proveContentRoutesBaselineIdentity(state, "before content-type delete");
        }
        const deleted = await deleteCleanupSubject(state, subject);
        observedBytesSha256 = deleted.observedBytesSha256;
        output = { deleted: true };
      } else {
        const absent = await proveCleanupSubjectAbsent(state, subject);
        observedBytesSha256 = absent.observedBytesSha256;
        output = { absent: true };
      }
    }
    if (participation.mode === "node+bun-one-shot") {
      const dbProof = await runBoundResourceBunOperation(state, record, operationKind);
      output = { node: output, bun: dbProof };
    }
  }
  if (operationKind === "absence" && TERMINAL_RESOURCE_KINDS.has(record.kind)) {
    state.terminalDeletedCounts[record.kind] += 1;
  }
  return cleanupRuntimeReceipt(
    state,
    "cleanup-" + operationKind,
    record[
      operationKind === "provenance"
        ? "provenanceOpId"
        : operationKind === "delete"
          ? "cleanupOpId"
          : "absenceOpId"
    ],
    record,
    output,
    observedBytesSha256
  );
}

function finalRecordByKey(finalLedger) {
  return new Map(finalLedger.map((record) => [record.resourceKey, record]));
}

async function executeCleanupPlanStage(
  state,
  actionPlan,
  finalPlan,
  allowedKinds,
  cleanupPhase,
  executeOperation = executeResourceCleanupOperation
) {
  invariant(
    [3, 6, 7].includes(cleanupPhase) && typeof executeOperation === "function",
    "cleanup stage phase/operation authority is absent"
  );
  const records = finalRecordByKey(finalPlan.ledger);
  const receipts = [];
  const failures = [];
  const retainStageFailure = (error, phaseThreeFailureClass = "persistent_stage_failed") => {
    invariant(
      PHASE_THREE_CLEANUP_FAILURE_CLASSES.includes(phaseThreeFailureClass),
      "phase 3 cleanup failure class drift"
    );
    const failure = retainPrivateCleanupFailureDiagnosticNeverThrow(
      error,
      cleanupPhase,
      cleanupPhase === 3 ? phaseThreeFailureClass : "phase_failed"
    );
    failures.push(failure);
    return failure;
  };
  for (const resourceKey of actionPlan.resourceKeys) {
    const record = records.get(resourceKey);
    if (record === undefined) {
      retainStageFailure(new Error("cleanup stage resource drift"));
      state.cleanupFailedKeys.add(resourceKey);
      continue;
    }
    if (!allowedKinds.has(record.kind)) continue;
    const childKeys = finalPlan.dependencyGraph[resourceKey];
    if (
      finalPlan.failureDiscoveryBlockedParentKeys.includes(resourceKey) ||
      childKeys.some(
        (childKey) =>
          !state.cleanupAbsenceKeys.has(childKey) || state.cleanupFailedKeys.has(childKey)
      )
    ) {
      retainStageFailure(
        new Error("destructive parent was blocked by an unproved child"),
        "persistent_dependency_blocked"
      );
      state.cleanupFailedKeys.add(resourceKey);
      continue;
    }
    let provenancePassed = false;
    try {
      receipts.push(await executeOperation(state, record, "provenance"));
      provenancePassed = true;
    } catch (error) {
      retainStageFailure(error, "persistent_provenance_failed");
      state.cleanupFailedKeys.add(resourceKey);
    }
    if (!provenancePassed) continue;
    let deletePassed = false;
    try {
      receipts.push(await executeOperation(state, record, "delete"));
      deletePassed = true;
    } catch (error) {
      retainStageFailure(error, "persistent_delete_failed");
      state.cleanupFailedKeys.add(resourceKey);
    }
    try {
      receipts.push(await executeOperation(state, record, "absence"));
      state.cleanupAbsenceKeys.add(resourceKey);
    } catch (error) {
      retainStageFailure(error, "persistent_absence_failed");
      state.cleanupFailedKeys.add(resourceKey);
    }
    if (!deletePassed) {
      state.cleanupFailedKeys.add(resourceKey);
    }
  }
  return deepFreezeExact({
    receipts: deepFreezeExact(receipts),
    failures: deepFreezeExact(failures),
  });
}

const BOOTSTRAP_RESTORE_PROOF_KEYS = deepFreezeExact([
  "afterCommitByteIdentical",
  "completeRowByteIdentical",
  "conditionalUpdateAffectedOne",
  "inTransactionByteIdentical",
  "restored",
  "roleTuplesByteIdentical",
  "rolesInTransactionByteIdentical",
  "rolesShareLocked",
  "transactionLocked",
]);

function requireValidatedBootstrapCasProof(value, label = "bootstrap CAS restore proof") {
  exactOwnKeys(value, BOOTSTRAP_RESTORE_PROOF_KEYS, label, { plain: true });
  invariant(
    BOOTSTRAP_RESTORE_PROOF_KEYS.every((key) => value[key] === true),
    label + " failed"
  );
  return value;
}

function retainPhaseEightFailure(error, failureClass) {
  invariant(
    PHASE_EIGHT_CLEANUP_FAILURE_CLASSES.includes(failureClass),
    "phase 8 failure class drift"
  );
  return retainPrivateCleanupFailureDiagnosticNeverThrow(error, 8, failureClass);
}

function classifyClosedBootstrapCasBridgeOutcome(outcome) {
  validateBootstrapRestoreBridgeOutput(
    null,
    { operationId: "resource/bootstrap-cas-restore" },
    null,
    outcome
  );
  if (outcome.kind === "rolled-back") {
    return Object.freeze({
      cause: new Error("bootstrap CAS closed with a known rollback"),
      kind: "rejected",
    });
  }
  if (outcome.kind === "committed-proof-failed") {
    return Object.freeze({ kind: "post-restore-proof-failed", proof: outcome.proof });
  }
  invariant(outcome.kind === "committed", "bootstrap CAS closed outcome drift");
  return Object.freeze({ kind: "validated", proof: outcome.proof });
}

function classifyBootstrapCasBridgeFailure(cause, executionBoundaryCrossed) {
  invariant(typeof executionBoundaryCrossed === "boolean", "bootstrap CAS boundary state drift");
  return Object.freeze({
    cause,
    kind: executionBoundaryCrossed ? "outcome-uncertain" : "rejected",
  });
}

async function attemptBootstrapCasBridgeOnce(state, input) {
  let executionBoundaryCrossed = false;
  let outcome;
  try {
    outcome = await runBunBridgeOperation(state, "resource/bootstrap-cas-restore", input, () => {
      invariant(!executionBoundaryCrossed, "bootstrap CAS execution boundary repeated");
      executionBoundaryCrossed = true;
    });
  } catch (cause) {
    return classifyBootstrapCasBridgeFailure(cause, executionBoundaryCrossed);
  }
  return classifyClosedBootstrapCasBridgeOutcome(outcome);
}

function validateBootstrapCasAttemptResult(result) {
  invariant(
    result !== null &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      Object.isFrozen(result),
    "bootstrap CAS attempt result drift"
  );
  if (result.kind === "validated") {
    exactOwnKeys(result, ["kind", "proof"], "bootstrap validated CAS result", {
      plain: true,
    });
    return result;
  }
  if (result.kind === "post-restore-proof-failed") {
    exactOwnKeys(result, ["kind", "proof"], "bootstrap failed post-commit proof result", {
      plain: true,
    });
    return result;
  }
  invariant(
    result.kind === "rejected" || result.kind === "outcome-uncertain",
    "bootstrap CAS attempt kind drift"
  );
  exactOwnKeys(result, ["cause", "kind"], "bootstrap failed CAS result", { plain: true });
  return result;
}

function buildBootstrapRestorationProof(authority, resolution) {
  invariant(
    resolution === "validated" || resolution === "already-restored-after-uncertain-outcome",
    "bootstrap restoration resolution drift"
  );
  return deepFreezeExact({
    casAttempts: authority.casAttempts,
    completeRowByteIdentical: true,
    resolution,
    restored: true,
    roleTuplesByteIdentical: true,
    uncertainReads: authority.uncertainReads,
    validatedInTransactionAndAfterCommit: resolution === "validated",
  });
}

async function executeBootstrapRestorationProtocol(state, operations) {
  exactOwnKeys(
    operations,
    ["readBaselineOnce", "reconcile", "runCasOnce"],
    "bootstrap restoration operations",
    { plain: true }
  );
  invariant(
    Object.values(operations).every((operation) => typeof operation === "function"),
    "bootstrap restoration operation drift"
  );
  const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
  try {
    invariant(
      authority &&
        authority.restorationStarted &&
        authority.restorationProof === null &&
        authority.validatedCasProof === null &&
        authority.uncertainBaselineProof === null &&
        authority.resolution === null &&
        authority.sealedNewestOwnedPair === null &&
        authority.casAttempts === 0 &&
        authority.uncertainReads === 0,
      "bootstrap restoration protocol authority drift"
    );
    if (!authority.reconciliationSealed) await operations.reconcile();
    invariant(
      authority.reconciliationSealed === true &&
        authority.reconciliationError === null &&
        authority.attempts.every(({ status }) => status === "settled"),
      "bootstrap reconciliation did not seal every attempt"
    );
    const latestSettledAttempt = authority.attempts.at(-1);
    invariant(
      latestSettledAttempt &&
        latestSettledAttempt.status === "settled" &&
        latestSettledAttempt.afterPair !== null &&
        deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair),
      "bootstrap newest owned pair does not match the latest settled attempt"
    );
    authority.sealedNewestOwnedPair = deepFreezeExact({
      lastLoginAt: authority.newestOwnedPair.lastLoginAt,
      updatedAt: authority.newestOwnedPair.updatedAt,
    });
  } catch (error) {
    throw retainPhaseEightFailure(error, "bootstrap_reconciliation_failed");
  }

  let casAttempt;
  try {
    const input = deepFreezeExact({
      baseline: state.bootstrapBaseline,
      newestOwnedPair: authority.sealedNewestOwnedPair,
      userId: state.bootstrapBaseline.id,
    });
    authority.casAttempts += 1;
    invariant(authority.casAttempts === 1, "bootstrap CAS attempt count drift");
    casAttempt = validateBootstrapCasAttemptResult(await operations.runCasOnce(input));
  } catch (error) {
    throw retainPhaseEightFailure(error, "bootstrap_cas_failed");
  }
  if (casAttempt.kind === "rejected") {
    throw retainPhaseEightFailure(casAttempt.cause, "bootstrap_cas_failed");
  }
  if (casAttempt.kind === "post-restore-proof-failed") {
    throw retainPhaseEightFailure(
      new Error("bootstrap CAS committed with an invalid post-restore proof"),
      "bootstrap_post_restore_proof_failed"
    );
  }

  let resolution;
  if (casAttempt.kind === "validated") {
    try {
      requireValidatedBootstrapCasProof(casAttempt.proof);
      authority.validatedCasProof = deepFreezeExact(casAttempt.proof);
      resolution = "validated";
    } catch (error) {
      throw retainPhaseEightFailure(error, "bootstrap_post_restore_proof_failed");
    }
  } else {
    try {
      invariant(
        casAttempt.kind === "outcome-uncertain",
        "bootstrap uncertain CAS outcome kind drift"
      );
      authority.uncertainReads += 1;
      invariant(authority.uncertainReads === 1, "bootstrap uncertain read count drift");
      const baselineRead = await operations.readBaselineOnce({
        userId: state.bootstrapBaseline.id,
      });
      validateBootstrapBaselineReadBridgeOutput(
        state,
        BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/bootstrap-baseline-read"],
        { userId: state.bootstrapBaseline.id },
        baselineRead
      );
      authority.uncertainBaselineProof = deepFreezeExact(baselineRead);
      resolution = "already-restored-after-uncertain-outcome";
    } catch (error) {
      throw retainPhaseEightFailure(error, "bootstrap_uncertain_baseline_failed");
    }
  }

  try {
    invariant(
      authority.casAttempts === 1 &&
        authority.uncertainReads ===
          (resolution === "already-restored-after-uncertain-outcome" ? 1 : 0) &&
        (resolution === "validated"
          ? authority.validatedCasProof !== null && authority.uncertainBaselineProof === null
          : authority.validatedCasProof === null && authority.uncertainBaselineProof !== null),
      "bootstrap restoration attempt/read/proof cardinality drift"
    );
    authority.resolution = resolution;
    authority.restorationProof = buildBootstrapRestorationProof(authority, resolution);
    state.bootstrapRestored = true;
    return authority.restorationProof;
  } catch (error) {
    throw retainPhaseEightFailure(error, "bootstrap_post_restore_proof_failed");
  }
}

async function restoreBootstrapLoginState(state) {
  const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
  invariant(authority, "bootstrap restoration authority is absent");
  if (authority.restorationPromise !== null) return authority.restorationPromise;
  invariant(!authority.restorationStarted, "bootstrap restoration authority drift");
  authority.restorationStarted = true;
  authority.restorationPromise = executeBootstrapRestorationProtocol(state, {
    readBaselineOnce: (input) =>
      runBunBridgeOperation(state, "resource/bootstrap-baseline-read", input),
    reconcile: () => reconcileBootstrapLoginAuthority(state, { restoration: true }),
    runCasOnce: (input) => attemptBootstrapCasBridgeOnce(state, input),
  });
  return authority.restorationPromise;
}

function createBootstrapRestoreReceiptOnce(state, restored) {
  const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
  try {
    invariant(
      authority &&
        authority.restorationProof === restored &&
        authority.resolution === restored.resolution &&
        authority.casAttempts === 1 &&
        authority.receiptAttempted === false &&
        authority.receipt === null,
      "bootstrap restore receipt authority drift"
    );
    authority.receiptAttempted = true;
    const receipt = cleanupRuntimeReceipt(
      state,
      "bootstrap-login-state-restore",
      "bootstrap-is-not-distinct-cas-and-complete-row-proof-v2",
      null,
      restored
    );
    authority.receipt = receipt;
    return receipt;
  } catch (error) {
    if (authority) authority.receiptAttempted = true;
    throw retainPhaseEightFailure(error, "bootstrap_restore_receipt_failed");
  }
}

function cleanupPlanView(ledger, blockedRoots = []) {
  return deepFreezeExact({
    ledger,
    dependencyGraph: deepFreezeExact(
      Object.fromEntries(ledger.map(({ resourceKey, dependsOn }) => [resourceKey, dependsOn]))
    ),
    failureDiscoveryBlockedParentKeys: deepFreezeExact([...blockedRoots]),
  });
}

async function validateSuccessfulScreenshotSet(state) {
  invariant(
    state.screenshots.size === state.plan.requiredScreenshotPaths.length,
    "screenshot acquisition count drift"
  );
  const identities = new Set();
  const hashes = new Set();
  const paths = [];
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const relative of state.plan.requiredScreenshotPaths) {
    const record = state.screenshots.get(relative);
    invariant(record !== undefined, "required screenshot identity is absent");
    const expectedIdentity = Object.freeze({
      dev: record.dev,
      ino: record.ino,
      type: "file",
      mode: record.mode,
      size: record.size,
    });
    const bytes = await readOwnedRegularFileNoFollow(
      record.absolute,
      expectedIdentity,
      MAX_STREAM_BYTES
    );
    invariant(
      bytes.subarray(0, pngSignature.length).equals(pngSignature),
      "screenshot PNG signature drift"
    );
    invariant(hashBytes(bytes) === record.sha256, "screenshot content identity drift");
    const identityKey = record.dev + ":" + record.ino;
    invariant(
      !identities.has(identityKey) && !hashes.has(record.sha256),
      "screenshot identity/hash is not unique"
    );
    identities.add(identityKey);
    hashes.add(record.sha256);
    paths.push(
      deepFreezeExact({
        path: relative,
        size: record.size,
        sha256: record.sha256,
        dev: record.dev,
        ino: record.ino,
      })
    );
  }
  return deepFreezeExact(paths);
}

function buildCanonicalFinalization(
  state,
  screenshots,
  phaseProofReceipts,
  phaseTrace,
  baselineProof
) {
  invariant(
    state.apiContextsClosedProof !== null &&
      state.privateRootFinalization !== null &&
      state.hostFinalization !== null &&
      state.taskTrafficDeltaCounts !== null &&
      state.missingMediaSetupProof !== null &&
      state.missingMediaCleanupProof !== null &&
      state.bootstrapRestored === true,
    "canonical finalization source is incomplete"
  );
  invariant(
    deepEqualJson(state.apiContextsClosedProof.inputContextNames, ["bootstrap", "user-a"]) &&
      state.apiContextsClosedProof.allAcquiredContextsAbsent === true &&
      state.apiContextsClosedProof.registryCleared === true &&
      state.apiContextsClosedProof.bootstrap?.acquired === true &&
      state.apiContextsClosedProof.bootstrap?.disposeCalled === true &&
      state.apiContextsClosedProof.bootstrap?.capabilityAbsent === true &&
      state.apiContextsClosedProof.userA?.acquired === true &&
      state.apiContextsClosedProof.userA?.disposeCalled === true &&
      state.apiContextsClosedProof.userA?.capabilityAbsent === true,
    "canonical API-context finalization drift"
  );
  const missingCleanupReceipt = phaseProofReceipts.find(
    ({ operation }) => operation === "media-race-missing-absence-cleanup"
  );
  invariant(
    Number.isSafeInteger(state.missingMediaSetupReceiptSequence) &&
      missingCleanupReceipt !== undefined &&
      state.missingMediaSetupProof.evidenceSha256 !== state.missingMediaCleanupProof.evidenceSha256,
    "missing media receipt finalization drift"
  );
  const deletedCounts = deepFreezeExact({
    audit: state.terminalDeletedCounts["audit-log-task-ua"],
    access: state.terminalDeletedCounts["access-log-task-ua"],
    session: state.terminalDeletedCounts["session-task"],
  });
  const finalization = deepFreezeExact({
    apiContexts: deepFreezeExact({
      names: deepFreezeExact(["bootstrap", "user-a"]),
      closed: true,
      absenceProven: true,
    }),
    browserSession: deepFreezeExact({
      name: SESSION_NAME,
      closeReceiptSequence: 419,
      absenceReceiptSequence: 420,
      terminalListSha256: state.terminalSessionAbsenceSha256,
      closed: true,
      absent: true,
    }),
    privateRoot: state.privateRootFinalization,
    host: state.hostFinalization,
    bootstrap: deepFreezeExact({
      id: state.bootstrapBaseline.id,
      setupCompletedBeforeStart: true,
      casRestored: true,
      completeRowByteIdentical: baselineProof.bootstrapByteIdentical,
      roleTuplesByteIdentical: baselineProof.bootstrapByteIdentical,
    }),
    contentRoutes: deepFreezeExact({
      key: "site.contentRoutes",
      taskSlugsAbsentAtBaseline: true,
      byteIdenticalBeforeEachDelete: state.contentRoutesDeleteProofs === 4,
      byteIdenticalAfterCleanup: baselineProof.contentRoutesByteIdentical,
    }),
    settings: deepFreezeExact({ userAAbsent: true, userBAbsent: true }),
    storage: deepFreezeExact({
      driver: "local",
      rootIdentityByteIdentical: baselineProof.storageRootByteIdentical,
      baselineManifestByteIdentical: baselineProof.storageManifestByteIdentical,
      acquiredMediaRowAbsent: baselineProof.acquiredMediaAbsent,
      acquiredStorageKeyAbsent: baselineProof.acquiredMediaAbsent,
      missingMedia: deepFreezeExact({
        id: state.plan.fixtureBlueprint.media.missingBoundMediaId,
        rowCount: 0,
        storageMatches: 0,
        setupReceiptSequence: state.missingMediaSetupReceiptSequence,
        cleanupReceiptSequence: missingCleanupReceipt.sequence,
      }),
    }),
    taskTraffic: deepFreezeExact({
      baselineCounts: deepFreezeExact({
        audit: state.taskTrafficBaseline.auditIds.length,
        access: state.taskTrafficBaseline.accessIds.length,
        session: state.taskTrafficBaseline.sessionIds.length,
      }),
      deltaCounts: state.taskTrafficDeltaCounts,
      deletedCounts,
      stablePollsBeforeDelete: state.taskTrafficPollCount,
      stablePollsAfterDelete: baselineProof.postDeleteStablePolls,
      returnedToBaseline: baselineProof.taskTrafficByteIdentical,
    }),
    screenshots,
    phaseProofReceipts: deepFreezeExact(phaseProofReceipts),
    phaseTrace: deepFreezeExact(phaseTrace),
  });
  exactOwnKeys(
    finalization,
    [
      "apiContexts",
      "browserSession",
      "privateRoot",
      "host",
      "bootstrap",
      "contentRoutes",
      "settings",
      "storage",
      "taskTraffic",
      "screenshots",
      "phaseProofReceipts",
      "phaseTrace",
    ],
    "canonical finalization",
    { plain: true }
  );
  invariant(
    finalization.browserSession.terminalListSha256 ===
      hashBytes(Buffer.from("  (no browsers)\n")) &&
      phaseTrace.length === 10 &&
      phaseTrace.every(({ phase, completed }, index) => phase === index + 1 && completed === true),
    "canonical finalization terminal proof drift"
  );
  return finalization;
}

async function cleanupConstructionStateOnce(state) {
  if (state.cleanupPromise) return state.cleanupPromise;
  state.cleanupPromise = (async () => {
    const failures = [];
    const attempt = async (callback) => {
      try {
        await callback();
      } catch (error) {
        failures.push(error);
      }
    };
    if (state.browserMayExist) {
      await attempt(() => releaseFailureRoutesIfPresent(state));
      await attempt(() => closeBrowserIfPresent(state));
      await attempt(() => proveBrowserSessionAbsent(state));
    }
    const ephemeralContexts = privateEphemeralApiContextRegistry(state);
    for (const [key, record] of [...ephemeralContexts.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      await attempt(async () => {
        await disposeOwnedApiRequestContextAndProveAbsent(record, key);
        const lifecycleError = retainedApiLifecycleFailure(record, key);
        if (lifecycleError !== null) throw lifecycleError;
      });
      if (record.disposeProof !== null) ephemeralContexts.delete(key);
    }
    const privateContexts = privateApiContextRegistry(state);
    for (const [key, record] of [...privateContexts.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      await attempt(async () => {
        await disposeApiRequestContextAndProveAbsent(state, record.capability, key);
        const lifecycleError = retainedApiLifecycleFailure(record, key);
        if (lifecycleError !== null) throw lifecycleError;
      });
      if (record.disposeProof !== null) {
        privateContexts.delete(key);
        state.sessions.delete(key);
      }
    }
    await attempt(() => removeAcquiredScreenshots(state));
    await attempt(() => removePrivateWorkspaceLedger(state.browserWorkspace.ledger));
    await attempt(() => stopOwnedHost(state));
    state.cleanupFailures = failures.length;
    return deepFreezeExact({ absenceProven: failures.length === 0 });
  })();
  return state.cleanupPromise;
}

async function createRealCapabilities(
  { root, assertSafeEvidence, snapshotRepository },
  plan,
  constructionCleanupAuthority
) {
  invariant((await realpath(root)) === root, "repository root is not canonical");
  await assertNoSymlinkAncestors(root);
  const rootInfo = await lstat(root);
  invariant(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), "repository root identity drift");
  const envPath = path.join(root, ".env");
  const envIdentity = await readStableArtifactIdentity(envPath, { expectedType: "file" });
  const repoEnvironment = await readStrictRepoEnvironment(root, envIdentity);
  assertStorageFallbackEnvironmentAbsent(repoEnvironment, process.env);
  const browserWorkspace = await createPrivateBrowserWorkspace(
    root,
    plan,
    repoEnvironment,
    constructionCleanupAuthority
  );
  const bundledPlaywright = await resolveValidatedBundledPlaywrightRequest(
    browserWorkspace.environment.PATH
  );
  const bundledBun = await resolveValidatedBunExecutable(browserWorkspace.environment.PATH, root);
  const state = {
    root,
    plan,
    assertSafeEvidence,
    repoEnvironment,
    hostEnvironment: buildExactHostEnvironment(repoEnvironment),
    browserWorkspace,
    playwrightRequest: bundledPlaywright.request,
    playwrightRequestProof: deepFreezeExact({
      cliRealPath: bundledPlaywright.cliRealPath,
      entryPath: bundledPlaywright.entryPath,
      version: bundledPlaywright.version,
    }),
    host: null,
    hostFinalization: null,
    sessions: new Map(),
    earlyApiSessionTuples: new Map(),
    ids: Object.create(null),
    fixtureIds: new Map(),
    contentTypeBodies: Object.create(null),
    entryBodies: Object.create(null),
    editableContentTypeDetail: null,
    editableEntryBody: null,
    mediaRecord: null,
    mediaStorageOwnership: null,
    mediaCanonicalSafeUrl: null,
    mediaRaceProjection: null,
    mediaRaceReceiptHash: null,
    mediaRaceAdminEvidence: {
      screen: null,
      entry: null,
      media: null,
      override: null,
      retryOverride: null,
    },
    missingMediaSetupProof: null,
    missingMediaCleanupProof: null,
    missingMediaSetupReceiptSequence: null,
    screenBodies: Object.create(null),
    latestUnsafeDefinition: null,
    expectedOverrides: [],
    overridesCleared: false,
    intentionalPresentationOverrideAuthority: null,
    intentionalPresentationOverrideCleanupProof: null,
    intentionalPresentationOverrideObservations: new Map(),
    pendingIntentionalPresentationOverrideReceipts: new Map(),
    browserOpened: false,
    browserClosed: false,
    browserMayExist: false,
    privateRootFinalization: null,
    terminalSessionAbsenceSha256: null,
    screenshots: new Map(),
    deletedSubjects: new Set(),
    cleanupPromise: null,
    cleanupFailures: 0,
    taskTrafficMayExist: false,
    bootstrapBaseline: null,
    bootstrapRestored: false,
    contentRoutesBaseline: null,
    requiredSettingsBaseline: null,
    storageRootBaseline: null,
    taskTrafficBaseline: null,
    taskTrafficDeltaCounts: null,
    taskTrafficPollCount: 0,
    terminalDeletedCounts: {
      "audit-log-task-ua": 0,
      "access-log-task-ua": 0,
      "session-task": 0,
    },
    storageRootIdentity: null,
    storageRootRealPath: null,
    storageBaselineManifest: null,
    contentRoutesDeleteProofs: 0,
    resourceKeys: new Map(),
    resourceOwners: new Map(),
    currentResourceOwnerProof: null,
    syntheticOwnerEdgeKeys: new Set(),
    responseLostBaselines: new Map(),
    responseLostIntents: new Map(),
    preparedCreateBodies: new Map(),
    nativeSnapshots: new Map(),
    browserProcessIdentities: new Map(),
    currentCaptures: null,
    browserReceiptSequence: 0,
    runtimeReceiptSequence: 0,
    apiContextsClosed: false,
    apiContextsClosedProof: null,
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
    coreCleanupContext: null,
    pendingFailureAttempts: new PendingFailureAttemptRegistry(),
  };
  PRIVATE_BUN_EXECUTABLE_AUTHORITY.set(state, bundledBun);
  PRIVATE_API_REQUEST_CONTEXT.set(state, new Map());
  PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT.set(state, new Map());
  constructionCleanupAuthority.registerCapabilityState(state);
  validateStaticBunBridgeDescriptorRegistries();
  initializeBunBridgeOperationAuthority(state);
  PRIVATE_RUNTIME.set(state, { repoEnvironment, csrfHeaderName: null, authRatePolicy: null });
  const authority = new LocalCommandAuthority({
    root,
    assertSafeEvidence,
    snapshotRepository,
    sensitiveValues: configuredSensitiveValues(repoEnvironment, process.env),
  });
  const runtimeHandlers = buildRuntimeOperationHandlers(plan);
  validateNativeDescriptorRegistry(plan);
  invariant(
    deepEqualJson(
      Object.keys(runtimeHandlers).sort(),
      Object.keys(plan.registries.runtimeOperations).sort()
    ),
    "runtime operation handler registry is not exhaustive"
  );
  const priorOutputs = new Map();
  const variables = new Map();
  const outputContext = (action, captures) => ({
    plan,
    captures,
    priorOutputs,
    variables,
    currentOutput: null,
    root,
    actionId: action.id,
  });
  const rememberFixtureBindings = (bindings) => {
    for (const [captureName, value] of Object.entries(bindings)) {
      const subject = Object.entries(plan.fixtureSubjectCapture).find(
        ([, name]) => name === captureName
      )?.[0];
      if (subject) state.fixtureIds.set(subject, value);
    }
  };
  const capabilities = {
    bindCoreCleanupAuthority(context) {
      invariant(state.coreCleanupContext === null, "core cleanup authority was assigned twice");
      exactOwnKeys(
        context,
        ["plan", "captures", "resourceLedger", "cleanupPlanner"],
        "core cleanup authority",
        { plain: true }
      );
      invariant(
        context.plan === plan &&
          context.resourceLedger instanceof ResourceLedgerBuilder &&
          context.cleanupPlanner instanceof ResourceCleanupPlanner,
        "core cleanup authority identity drift"
      );
      state.coreCleanupContext = context;
    },
    registerActionResourcesAfterLedgerAppend(action, delta) {
      promoteResourceBunDescriptorsAfterLedgerAppend(state, delta);
      registerSuccessfulActionResourcesAfterLedgerAppend(state, action, delta);
      commitIntentionalPresentationOverrideActionAfterLedgerAppend(state, action, delta);
    },
    settleResponseLostCreateAfterLedgerAppend(actionId) {
      invariant(
        RESPONSE_LOST_CREATE_DESCRIPTORS[actionId] !== undefined,
        "response-lost settlement origin drift"
      );
      state.pendingFailureAttempts.settle(actionId);
    },
    retainPrimaryFailureObservation(cause) {
      state.pendingFailureAttempts.retainPrimaryFailureObservation(cause);
    },
    async executeAction({ action, executable, captures }) {
      state.currentCaptures = captures;
      if (executable.type === "runtime-operation") {
        state.taskTrafficMayExist = true;
        const handler = runtimeHandlers[executable.operationId];
        invariant(typeof handler === "function", action.id + " runtime handler is absent");
        let result;
        try {
          result = await authority.executeLocal({
            action,
            sequence: ++state.runtimeReceiptSequence,
            operation: canonicalManifestRuntimeOperation(action),
            operationDescriptor: executable.operationId,
            subjectKind: null,
            subjectIdentifier: null,
            run: async () => {
              await armResponseLostCreateBeforeWrite(state, action, captures);
              return handler({ state, plan, action, executable, captures });
            },
          });
        } catch (error) {
          throw error;
        }
        const parsedOutput = parseRegisteredOutput(
          plan.registries.outputs[action.outputSchemaId],
          result.stdout,
          action.id,
          outputContext(action, captures)
        );
        const captureBindings =
          action.outputSchemaId === "runtime-safe-projection" ? parsedOutput.captureBindings : {};
        rememberFixtureBindings(captureBindings);
        const receipt = {
          ...result.receipt,
          sanitizedOutput:
            action.id === "set-017-editable-type-proof"
              ? "[private-projection-proven]"
              : canonicalJson(
                  action.outputSchemaId === "runtime-safe-projection"
                    ? {
                        captureBindings: Object.keys(captureBindings),
                        observationSha256: parsedOutput.observationSha256,
                      }
                    : { privateProjection: true }
                ),
        };
        if (action.id === "set-032-storage-post-setup") {
          invariant(
            state.missingMediaSetupProof !== null,
            "missing media setup receipt proof is absent"
          );
          Object.assign(receipt, {
            operation: "media-race-missing-absence-setup",
            operationDescriptor: "db+storage:missing-media-absence",
            evidenceSha256: state.missingMediaSetupProof.evidenceSha256,
            subjectKind: "media-race-missing-media",
            subjectIdentifier: plan.fixtureBlueprint.media.missingBoundMediaId,
            sanitizedOutput: canonicalJson(state.missingMediaSetupProof.projection),
          });
          state.missingMediaSetupReceiptSequence = receipt.sequence;
        } else if (action.id === "set-040-override-proof") {
          invariant(
            state.mediaRaceProjection !== null &&
              typeof state.mediaRaceReceiptHash === "string" &&
              /^[a-f0-9]{64}$/u.test(state.mediaRaceReceiptHash),
            "media-race projection receipt proof is absent"
          );
          Object.assign(receipt, {
            operation: "media-race-projection-provenance",
            operationDescriptor: "admin-api:media-race-projection",
            evidenceSha256: state.mediaRaceReceiptHash,
            subjectKind: "screen",
            subjectIdentifier: state.mediaRaceProjection.screenId,
            sanitizedOutput: canonicalJson({
              bindingCount: 1,
              overrideCount: 1,
              entryValueMatches: true,
              safeUrlMatches: true,
            }),
          });
        }
        stageIntentionalPresentationOverrideActionReceipt(state, action, receipt);
        assertSafeEvidence(receipt, "TASK-540 parsed runtime receipt");
        const acquisitionDelta = deriveActionResourceDelta(
          state,
          action,
          { captureBindings },
          captures
        );
        const provenDescriptor = PROVEN_RESOURCE_ACTIONS[action.id];
        return deepFreezeExact({
          receipt: deepFreezeExact(receipt),
          captureBindings,
          acquisitionDelta,
          settledCreateOrigin: provenDescriptor?.origin ?? null,
        });
      }

      let executionSpec;
      let routeMetadata;
      let invocation;
      ({ executionSpec, routeMetadata, invocation } =
        buildPrivateBrowserInvocationWithAuthSettlementBoundary(action, () => {
          executionSpec = compileActionExecutionSpec(action);
          routeMetadata = routeReceiptMetadata(
            action,
            executionSpec,
            plan,
            captures,
            PRIVATE_RUNTIME.get(state)
          );
          invocation = buildBrowserInvocation(
            action,
            executionSpec,
            captures,
            root,
            browserWorkspace.cwd,
            plan,
            outputContext(action, captures),
            PRIVATE_RUNTIME.get(state)
          );
          return { executionSpec, routeMetadata, invocation };
        }));
      let commandResult;
      if (executable.type === "browser-native" && executable.operationId === "open-about-blank") {
        state.browserMayExist = true;
        state.taskTrafficMayExist = true;
      }
      try {
        const executeBrowserProgram = () =>
          authority.executeProgram({
            action,
            program: "playwright-cli",
            args: invocation.args,
            sequence: ++state.browserReceiptSequence,
            operation: executionSpec.operation,
            routeKey: routeMetadata.routeKey,
            assertionName: action.kind === "assert" ? executionSpec.builderAst.args[0] : null,
            displayArgs:
              executable.type === "browser-global-list"
                ? ["--raw", "list"]
                : [
                    "-s=" + SESSION_NAME,
                    "--raw",
                    executable.type === "browser-run-code"
                      ? executable.sourceId
                      : executable.type === "browser-native"
                        ? executable.operationId
                        : executable.screenshotId,
                  ],
            stdoutDiscarded: invocation.stdoutDiscarded ?? false,
            cwd: browserWorkspace.cwd,
            env: browserWorkspace.environment,
          });
        commandResult =
          action.id === "set-011-login-submit"
            ? await runObservedBootstrapLoginAttempt(
                state,
                "ui",
                plan.fixtureBlueprint.userAgents.browser,
                executeBrowserProgram
              )
            : await executeBrowserProgram();
      } catch (error) {
        if (executable.type === "browser-screenshot") {
          try {
            await acquireScreenshotIdentity(state, action, plan);
          } catch (identityError) {
            throw new AggregateError(
              [error, identityError],
              "screenshot command and identity acquisition both failed"
            );
          }
        }
        throw error;
      }
      if (executable.type === "browser-screenshot") {
        await acquireScreenshotIdentity(state, action, plan);
      }
      const normalizedBytes = await normalizePrivateBrowserOutputWithAuthSettlementBoundary(
        action,
        commandResult,
        () =>
          normalizeBrowserCommandOutput(state, action, executable, commandResult.stdout, invocation)
      );
      const authSettlementFailureClass = classifyPrivateAuthSettlementFailureFrame(
        action.id,
        normalizedBytes
      );
      if (authSettlementFailureClass !== null) {
        throw createPrivateAuthSettlementFailure(authSettlementFailureClass);
      }
      const toneOpenFailureClass = classifyPrivateToneOpenFailureFrame(action.id, normalizedBytes);
      if (toneOpenFailureClass !== null) {
        throw createPrivateToneOpenFailure(toneOpenFailureClass);
      }
      const toneSelectFailureClass = classifyPrivateToneSelectFailureFrame(
        action.id,
        normalizedBytes
      );
      if (toneSelectFailureClass !== null) {
        throw createPrivateToneSelectFailure(toneSelectFailureClass);
      }
      const dirtyNavigationFailureClass = classifyPrivateDirtyNavigationFailureFrame(
        action.id,
        normalizedBytes
      );
      if (dirtyNavigationFailureClass !== null) {
        throw createPrivateDirtyNavigationFailure(dirtyNavigationFailureClass);
      }
      const parsedOutput = parsePrivateBrowserSuccessWithAuthSettlementBoundary(
        action,
        commandResult,
        normalizedBytes,
        () =>
          parseRegisteredOutput(
            plan.registries.outputs[action.outputSchemaId],
            normalizedBytes,
            action.id,
            outputContext(action, captures)
          )
      );
      return finalizePrivateBrowserResultWithAuthSettlementBoundary(
        action,
        executable,
        plan,
        commandResult,
        () => {
          if (
            executable.type === "browser-native" &&
            executable.operationId === "open-about-blank"
          ) {
            state.browserOpened = true;
          }
          if (executable.type === "browser-native" && executable.operationId === "close") {
            state.browserClosed = true;
          }
          const receipt = {
            ...commandResult.receipt,
            method: routeMetadata.method,
            pattern: routeMetadata.pattern,
            sanitizedOutput: executionSpec.discardOutput
              ? "[discarded]"
              : canonicalJson(parsedOutput),
          };
          const captureBindings = {};
          for (const name of plan.runtimeCaptureBindings[action.id] ?? []) {
            invariant(
              action.kind === "captureNew" && typeof parsedOutput?.id === "string",
              action.id + " capture output drift"
            );
            captureBindings[name] = parsedOutput.id;
          }
          assertSafeEvidence(receipt, "TASK-540 parsed browser receipt");
          const acquisitionDelta = deriveActionResourceDelta(
            state,
            action,
            { captureBindings },
            captures
          );
          const result = deepFreezeExact({
            receipt: deepFreezeExact(receipt),
            captureBindings,
            acquisitionDelta,
            settledCreateOrigin: null,
          });
          return result;
        }
      );
    },
    async executeCleanupLifecycleCore({ resourceLedger, cleanupPlanner, failure = false }) {
      invariant(
        resourceLedger instanceof ResourceLedgerBuilder &&
          cleanupPlanner instanceof ResourceCleanupPlanner &&
          typeof failure === "boolean",
        "cleanup lifecycle authority drift"
      );
      const cleanupReceipts = [];
      const phaseProofReceipts = [];
      const phaseTrace = [];
      const failures = [];
      let persistentLedger = null;
      let persistentPlan = null;
      let terminalLedger = null;
      let terminalPlan = null;
      let finalLedger = null;
      let finalPlan = null;
      let screenshots = null;
      let baselineProof = null;
      const phaseScheduler = createCleanupPhaseScheduler(failures, phaseTrace);
      const runPhase = (phase, operation) => phaseScheduler.run(phase, operation);

      await runPhase(1, async () => {
        const steps = [
          async () => {
            const privateRootIdentity = await readStableArtifactIdentity(browserWorkspace.root, {
              expectedType: "directory",
            });
            invariant(
              !browserWorkspace.root.startsWith(state.root + path.sep) &&
                browserWorkspace.root !== state.root &&
                (privateRootIdentity.mode & 0o777) === 0o700,
              "browser private root ownership drift"
            );
          },
        ];
        if (failure) {
          if (state.browserMayExist && !state.browserClosed) {
            steps.push(
              () => releaseFailureRoutesIfPresent(state),
              () => closeBrowserIfPresent(state)
            );
          }
          if (state.browserMayExist) {
            steps.push(async () => {
              await proveBrowserSessionAbsent(state);
              state.terminalSessionAbsenceSha256 = hashBytes(Buffer.from("  (no browsers)\n"));
            });
          }
        } else {
          steps.push(async () =>
            invariant(
              state.browserClosed === true &&
                state.terminalSessionAbsenceSha256 === hashBytes(Buffer.from("  (no browsers)\n")),
              "terminal browser/session absence proof is incomplete"
            )
          );
        }
        steps.push(async () => {
          await removePrivateWorkspaceLedger(browserWorkspace.ledger);
          await requireMissingPath(browserWorkspace.root, "browser private root");
          state.privateRootFinalization = deepFreezeExact({
            outsideRepository: true,
            mode: "0700",
            identityRemoved: true,
            absent: true,
          });
          state.browserMayExist = false;
        });
        await runIndependentCleanupStepsNeverSkip(steps, "phase 1 browser/root");
      });
      await runPhase(2, async () => {
        if (failure) await removeAcquiredScreenshots(state);
        else
          invariant(
            state.screenshots.size === plan.requiredScreenshotPaths.length,
            "success screenshot set is incomplete"
          );
      });
      await runPhase(3, async () => {
        const phaseFailures = [];
        const retainPersistentStageFailure = (error) =>
          retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_stage_failed");
        let pendingAttempts = deepFreezeExact([]);
        let attemptResults = deepFreezeExact([]);
        const blockerRoots = new Set();
        let discoveryRegistryUnavailable = false;
        try {
          pendingAttempts = state.pendingFailureAttempts.takeFrozenOnce();
          const discoveryBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
            pendingAttempts,
            (attempt) => discoverOneResponseLostCreate(state, attempt)
          );
          invariant(
            discoveryBatch.attemptResults.length === pendingAttempts.length,
            "failure discovery result cardinality drift"
          );
          attemptResults = discoveryBatch.attemptResults;
        } catch (error) {
          phaseFailures.push(retainPersistentStageFailure(error));
          discoveryRegistryUnavailable = pendingAttempts.length === 0;
          for (const attempt of pendingAttempts) {
            for (const parentKey of attempt.intendedParentBlockerKeys) blockerRoots.add(parentKey);
          }
        }
        for (let index = 0; index < attemptResults.length; index += 1) {
          const result = attemptResults[index];
          const attempt = pendingAttempts[index];
          try {
            invariant(
              result.pendingAttemptKey === attempt.pendingAttemptKey,
              "failure discovery result order drift"
            );
            resourceLedger.appendValidatedDelta(result.safeDelta);
            promoteResourceBunDescriptorsAfterLedgerAppend(state, result.safeDelta);
            registerFailureDiscoveredResourceAfterLedgerAppend(state, attempt, result.safeDelta);
          } catch (error) {
            phaseFailures.push(retainPersistentStageFailure(error));
            for (const parentKey of attempt.intendedParentBlockerKeys) blockerRoots.add(parentKey);
          }
          if (result.failure !== null) {
            phaseFailures.push(
              retainPersistentStageFailure(
                new Error("response-lost resource discovery remained ambiguous")
              )
            );
            for (const parentKey of result.intendedParentBlockerKeys) blockerRoots.add(parentKey);
          }
        }
        const acquiredSeoEntryParentSemantics = TASK_FIXTURE_ENTRY_SEMANTICS.filter(
          (entrySemantic) => state.resourceKeys.has(entrySemantic)
        );
        const exactSeoEntryInventoryReady = TASK_FIXTURE_ENTRY_SEMANTICS.every(
          (entrySemantic) =>
            state.fixtureIds.has(entrySemantic) && state.resourceKeys.has(entrySemantic)
        );
        if (exactSeoEntryInventoryReady) {
          try {
            await discoverExactSeoEntryResources(state, resourceLedger);
          } catch (error) {
            phaseFailures.push(retainPersistentStageFailure(error));
            for (const entrySemantic of TASK_FIXTURE_ENTRY_SEMANTICS) {
              blockerRoots.add(state.resourceKeys.get(entrySemantic));
            }
          }
        } else if (acquiredSeoEntryParentSemantics.length > 0) {
          phaseFailures.push(
            retainPersistentStageFailure(
              new Error("SEO entry discovery fixture inventory is incomplete")
            )
          );
          for (const entrySemantic of acquiredSeoEntryParentSemantics) {
            blockerRoots.add(state.resourceKeys.get(entrySemantic));
          }
        }
        if (plan.requiredFixtureSubjectKeys.every((kind) => state.fixtureIds.has(kind))) {
          try {
            await refreshCurrentSyntheticOwnerDependencyEdges(state, resourceLedger);
          } catch (error) {
            phaseFailures.push(retainPersistentStageFailure(error));
            for (const semantic of ["user-a", "user-b"]) {
              const userKey = state.resourceKeys.get(semantic);
              if (userKey) blockerRoots.add(userKey);
            }
          }
        }
        try {
          persistentLedger = resourceLedger.compileResourceRecords("persistent");
          assertResourceBunDescriptorSetExact(state, persistentLedger);
          if (discoveryRegistryUnavailable) {
            for (const record of persistentLedger) {
              if (record.class === "delete") blockerRoots.add(record.resourceKey);
            }
          }
          persistentPlan = cleanupPlanner.freezePersistent(persistentLedger, [...blockerRoots]);
        } catch (error) {
          phaseFailures.push(
            retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_plan_failed")
          );
        }
        if (persistentLedger !== null && persistentPlan !== null) {
          const nonUserPersistentKinds = new Set(
            Object.keys(RESOURCE_KIND_CONTRACTS).filter(
              (kind) =>
                RESOURCE_KIND_CONTRACTS[kind].class === "delete" &&
                !TERMINAL_RESOURCE_KINDS.has(kind) &&
                kind !== "user-a" &&
                kind !== "user-b"
            )
          );
          try {
            const persistentGraph = cleanupPlanView(persistentLedger).dependencyGraph;
            const phase3View = cleanupPlanView(
              persistentLedger,
              compileBlockedParentClosure(persistentGraph, [...blockerRoots])
            );
            const stageResult = await executeCleanupPlanStage(
              state,
              persistentPlan,
              phase3View,
              nonUserPersistentKinds,
              3
            );
            cleanupReceipts.push(...stageResult.receipts);
            phaseFailures.push(...stageResult.failures);
          } catch (error) {
            phaseFailures.push(retainPersistentStageFailure(error));
          }
        }
        if (phaseFailures.length > 0) {
          throw retainPrivateCleanupAggregateDiagnosticNeverThrow(
            new AggregateError(phaseFailures, "phase 3 response-lost/persistent cleanup failed"),
            phaseFailures,
            3
          );
        }
      });
      await runPhase(4, async () => {
        const phaseFailures = [];
        try {
          invariant(state.apiContextsClosedProof === null, "API context proof was assigned twice");
        } catch (error) {
          phaseFailures.push(error);
        }
        const ephemeralContexts = privateEphemeralApiContextRegistry(state);
        for (const [key, record] of [...ephemeralContexts.entries()].sort(([left], [right]) =>
          left.localeCompare(right)
        )) {
          try {
            await disposeOwnedApiRequestContextAndProveAbsent(record, key);
            const lifecycleError = retainedApiLifecycleFailure(record, key);
            if (lifecycleError !== null) phaseFailures.push(lifecycleError);
            ephemeralContexts.delete(key);
          } catch (error) {
            phaseFailures.push(error);
          }
        }
        try {
          invariant(
            ephemeralContexts.size === 0,
            "ephemeral API context cleanup authority remains live"
          );
        } catch (error) {
          phaseFailures.push(error);
        }
        const privateContexts = privateApiContextRegistry(state);
        const contextNames = [...privateContexts.keys()].sort();
        try {
          invariant(
            contextNames.every((name) => name === "bootstrap" || name === "user-a") &&
              (failure || deepEqualJson(contextNames, ["bootstrap", "user-a"])),
            "API context ownership set drift"
          );
        } catch (error) {
          phaseFailures.push(error);
        }
        const contextProofs = Object.create(null);
        for (const [key, userAgent] of [
          ["bootstrap", plan.fixtureBlueprint.userAgents.apiBootstrap],
          ["user-a", plan.fixtureBlueprint.userAgents.apiUserA],
        ]) {
          const record = privateContexts.get(key);
          if (record === undefined) {
            contextProofs[key] = deepFreezeExact({
              acquired: false,
              capabilityAbsent: true,
              disposeCalled: false,
              userAgent,
            });
            continue;
          }
          try {
            contextProofs[key] = await disposeApiRequestContextAndProveAbsent(
              state,
              record.capability,
              key
            );
            const lifecycleError = retainedApiLifecycleFailure(record, key);
            if (lifecycleError !== null) phaseFailures.push(lifecycleError);
            privateContexts.delete(key);
            state.sessions.delete(key);
          } catch (error) {
            phaseFailures.push(error);
          }
        }
        for (const [key, record] of [...privateContexts.entries()].sort(([left], [right]) =>
          left.localeCompare(right)
        )) {
          try {
            await disposeApiRequestContextAndProveAbsent(state, record.capability, key);
            const lifecycleError = retainedApiLifecycleFailure(record, key);
            if (lifecycleError !== null) phaseFailures.push(lifecycleError);
            privateContexts.delete(key);
            state.sessions.delete(key);
          } catch (error) {
            phaseFailures.push(error);
          }
        }
        const allAcquiredContextsAbsent =
          contextNames.every((key) => contextProofs[key]?.capabilityAbsent === true) &&
          privateContexts.size === 0;
        state.apiContextsClosed = allAcquiredContextsAbsent && state.sessions.size === 0;
        state.apiContextsClosedProof = deepFreezeExact({
          allAcquiredContextsAbsent,
          bootstrap: contextProofs.bootstrap,
          bundledPlaywright: state.playwrightRequestProof,
          inputContextNames: deepFreezeExact(contextNames),
          registryCleared:
            state.sessions.size === 0 && privateContexts.size === 0 && ephemeralContexts.size === 0,
          userA: contextProofs["user-a"],
        });
        try {
          phaseProofReceipts.push(
            cleanupRuntimeReceipt(
              state,
              "api-contexts-close-and-prove",
              "api-contexts-close-and-independent-absence-v1",
              null,
              state.apiContextsClosedProof
            )
          );
        } catch (error) {
          phaseFailures.push(error);
        }
        if (phaseFailures.length > 0)
          throw new AggregateError(phaseFailures, "phase 4 API disposal failed");
      });
      await runPhase(5, async () => {
        invariant(
          state.apiContextsClosed === true &&
            state.apiContextsClosedProof?.allAcquiredContextsAbsent === true &&
            state.apiContextsClosedProof?.registryCleared === true,
          "terminal discovery lacks the API-context absence proof"
        );
        let terminalRows =
          state.taskTrafficBaseline === null
            ? deepFreezeExact({ access: [], audit: [], session: [] })
            : null;
        if (state.bootstrapBaseline !== null) {
          invariant(
            state.taskTrafficBaseline !== null,
            "bootstrap authority lacks task-traffic baseline"
          );
          const ownsExactBootstrapBoundaries = (rows) => {
            const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
            const allowedUserAgents = [
              plan.fixtureBlueprint.userAgents.browser,
              plan.fixtureBlueprint.userAgents.apiBootstrap,
            ];
            return (
              [...authority.ownedSessionIds].every((id) => {
                const row = rows.session.find((candidate) => candidate.id === id);
                return (
                  row?.userId === state.bootstrapBaseline.id &&
                  allowedUserAgents.includes(row.userAgent)
                );
              }) &&
              [...authority.ownedAuditIds].every((id) => {
                const row = rows.audit.find((candidate) => candidate.id === id);
                return (
                  row?.actorId === state.bootstrapBaseline.id &&
                  allowedUserAgents.includes(row.userAgent)
                );
              })
            );
          };
          let coupledCandidate = null;
          for (
            let barrierRound = 0;
            barrierRound < 4 && coupledCandidate === null;
            barrierRound += 1
          ) {
            await readStableTaskTrafficDelta(state);
            await reconcileBootstrapLoginAuthority(state, { deferUnchanged: true, seal: false });
            const candidateRows = await readStableTaskTrafficDelta(state);
            const allSettled = await reconcileBootstrapLoginAuthority(state, {
              deferUnchanged: false,
              seal: false,
            });
            if (allSettled && ownsExactBootstrapBoundaries(candidateRows)) {
              coupledCandidate = candidateRows;
            }
          }
          invariant(
            coupledCandidate !== null,
            "bootstrap/terminal traffic coupled barrier did not converge"
          );
          terminalRows = await readStableTaskTrafficDelta(state, async (poll, rows) => {
            appendTaskTrafficPollProofReceipts(
              state,
              phaseProofReceipts,
              "before-delete",
              poll,
              rows
            );
          });
          await reconcileBootstrapLoginAuthority(state, { seal: true });
          const bootstrapAuthority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
          invariant(
            bootstrapAuthority.reconciliationSealed === true &&
              ownsExactBootstrapBoundaries(terminalRows),
            "sealed bootstrap login boundaries are absent from terminal cleanup authority"
          );
        } else if (state.taskTrafficBaseline !== null) {
          terminalRows = await readStableTaskTrafficDelta(state, async (poll, rows) => {
            appendTaskTrafficPollProofReceipts(
              state,
              phaseProofReceipts,
              "before-delete",
              poll,
              rows
            );
          });
        } else {
          state.taskTrafficPollCount = 2;
          for (const poll of [1, 2]) {
            appendTaskTrafficPollProofReceipts(
              state,
              phaseProofReceipts,
              "before-delete",
              poll,
              terminalRows
            );
          }
        }
        invariant(terminalRows !== null, "terminal traffic coupled barrier produced no rows");
        state.taskTrafficDeltaCounts = deepFreezeExact({
          audit: terminalRows.audit.length,
          access: terminalRows.access.length,
          session: terminalRows.session.length,
        });
        const terminalDelta = terminalResourceDelta(state, terminalRows);
        resourceLedger.appendValidatedDelta(terminalDelta);
        promoteResourceBunDescriptorsAfterLedgerAppend(state, terminalDelta);
        registerTerminalResourcesAfterLedgerAppend(state, terminalDelta);
        terminalLedger = resourceLedger.compileResourceRecords("terminal");
        terminalPlan = cleanupPlanner.freezeTerminal(terminalLedger);
        finalLedger = resourceLedger.compileResourceRecords("final");
        assertResourceBunDescriptorSetExact(state, finalLedger);
        finalPlan = cleanupPlanner.freezeFinal(finalLedger);
        invariant(
          finalPlan.persistentActionPlan === persistentPlan &&
            finalPlan.terminalActionPlan === terminalPlan,
          "final cleanup plan substituted a stage plan"
        );
        assertExactFinalResourceDependencyGraph(state, finalLedger, finalPlan.dependencyGraph);
        phaseProofReceipts.push(
          cleanupRuntimeReceipt(
            state,
            "terminal-task-ua-stable-delta",
            "terminal-task-ua-two-identical-polls-v1",
            null,
            {
              access: terminalRows.access.length,
              audit: terminalRows.audit.length,
              session: terminalRows.session.length,
            }
          )
        );
      });
      await runPhase(6, async () => {
        invariant(terminalPlan !== null && finalPlan !== null, "terminal cleanup plan is absent");
        const stageResult = await executeCleanupPlanStage(
          state,
          terminalPlan,
          finalPlan,
          TERMINAL_RESOURCE_KINDS,
          6
        );
        cleanupReceipts.push(...stageResult.receipts);
        failures.push(...stageResult.failures);
      });
      await runPhase(7, async () => {
        invariant(finalPlan !== null, "final cleanup plan is absent before user cleanup");
        const stageResult = await executeCleanupPlanStage(
          state,
          persistentPlan,
          finalPlan,
          new Set(["user-a", "user-b"]),
          7
        );
        cleanupReceipts.push(...stageResult.receipts);
        failures.push(...stageResult.failures);
      });
      await runPhase(8, async () => {
        const restored =
          state.bootstrapBaseline === null
            ? deepFreezeExact({ notAcquired: true })
            : await restoreBootstrapLoginState(state);
        phaseProofReceipts.push(
          state.bootstrapBaseline === null
            ? cleanupRuntimeReceipt(
                state,
                "bootstrap-login-state-restore",
                "bootstrap-not-acquired-proof-v1",
                null,
                restored
              )
            : createBootstrapRestoreReceiptOnce(state, restored)
        );
      });
      await runPhase(9, async () => {
        screenshots = deepFreezeExact([]);
        await runIndependentCleanupStepsNeverSkip(
          [
            async () => {
              if (!failure) screenshots = await validateSuccessfulScreenshotSet(state);
            },
            async () => {
              const missingMediaCleanup = await proveMissingMediaDbAndStorageAbsence(
                state,
                "cleanup"
              );
              phaseProofReceipts.push(
                authoritativeProofRuntimeReceipt(state, {
                  operation: "media-race-missing-absence-cleanup",
                  operationDescriptor: "db+storage:missing-media-absence",
                  evidenceSha256: missingMediaCleanup.evidenceSha256,
                  subjectKind: "media-race-missing-media",
                  subjectIdentifier: plan.fixtureBlueprint.media.missingBoundMediaId,
                  output: missingMediaCleanup.projection,
                })
              );
            },
            async () => {
              baselineProof =
                state.bootstrapBaseline === null
                  ? deepFreezeExact({ notAcquired: true })
                  : await proveFinalStorageAndDatabaseBaselines(state, async (poll, rows) => {
                      appendTaskTrafficPollProofReceipts(
                        state,
                        phaseProofReceipts,
                        "after-delete",
                        poll,
                        rows
                      );
                    });
              phaseProofReceipts.push(
                cleanupRuntimeReceipt(
                  state,
                  "final-storage-database-screenshot-proof",
                  "final-global-baseline-and-png-identity-proof-v1",
                  null,
                  { ...baselineProof, screenshotCount: screenshots.length }
                )
              );
            },
          ],
          "phase 9 final baselines"
        );
      });
      await runPhase(10, async () => {
        let portsAbsent = false;
        await runIndependentCleanupStepsNeverSkip(
          [
            () => stopOwnedHost(state),
            async () => {
              portsAbsent = await portsAreAbsent();
              invariant(portsAbsent, "smoke ports remain owned after finalization");
            },
            async () => {
              const host = state.hostFinalization;
              invariant(host !== null && portsAbsent, "host finalization projection is absent");
              const appendHostProof = (operation, subjectKind, subjectIdentifier, output) => {
                const bytes = Buffer.from(
                  canonicalJson({ operation, subjectKind, subjectIdentifier, output }) + "\n"
                );
                phaseProofReceipts.push(
                  authoritativeProofRuntimeReceipt(state, {
                    operation,
                    operationDescriptor: "owned-process-group-and-ports-absence-v1",
                    evidenceSha256: hashBytes(bytes),
                    subjectKind,
                    subjectIdentifier,
                    output,
                  })
                );
              };
              appendHostProof("host-runner-stop", "host-runner", String(host.runnerPid), {
                termSent: host.termSent,
                killSent: host.killSent,
                processesAbsent: host.processesAbsent,
                portsAbsent: true,
              });
              const processSubjects = [
                { kind: "runner", pid: host.runnerPid, parentPid: null },
                ...host.children.map(({ kind, pid }) => ({ kind, pid, parentPid: host.runnerPid })),
              ];
              for (const processSubject of processSubjects) {
                const subjectIdentifier =
                  processSubject.kind === "runner"
                    ? String(processSubject.pid)
                    : processSubject.kind + ":" + processSubject.pid;
                appendHostProof("pid-lineage", "host-process", subjectIdentifier, {
                  pid: processSubject.pid,
                  parentPid: processSubject.parentPid,
                  pgid: host.pgid,
                  lineageValid: true,
                });
                appendHostProof("process-absence", "host-process", subjectIdentifier, {
                  absent: true,
                  stableObservations: 2,
                });
              }
              for (const port of host.ports) {
                appendHostProof("port-absence", "host-port", String(port), {
                  absent: true,
                  stableObservations: 2,
                });
              }
            },
          ],
          "phase 10 host shutdown"
        );
      });

      phaseScheduler.seal();
      if (failures.length > 0) {
        throw retainPrivateCleanupAggregateDiagnosticNeverThrow(
          new AggregateError(failures, "TASK-540 deterministic cleanup failed"),
          failures,
          0
        );
      }
      invariant(
        persistentLedger !== null &&
          persistentPlan !== null &&
          terminalLedger !== null &&
          terminalPlan !== null &&
          finalLedger !== null &&
          finalPlan !== null &&
          screenshots !== null &&
          baselineProof !== null,
        "cleanup lifecycle result is incomplete"
      );
      return deepFreezeExact({
        cleanupReceipts: deepFreezeExact(cleanupReceipts),
        mediaRace: assertCanonicalMediaRaceProjection(
          state.mediaRaceProjection,
          plan,
          state.currentCaptures
        ),
        finalization: buildCanonicalFinalization(
          state,
          screenshots,
          phaseProofReceipts,
          phaseTrace,
          baselineProof
        ),
        terminalLedger,
        terminalPlan,
        finalLedger,
        finalPlan,
        persistentLedger,
        persistentPlan,
        phaseTrace: deepFreezeExact(phaseTrace),
      });
    },
    cleanup(request = null) {
      if (state.cleanupPromise === null) {
        state.cleanupPromise = (async () => {
          try {
            invariant(
              state.coreCleanupContext !== null,
              "failure cleanup lacks the core ledger authority"
            );
            const selected =
              request === null
                ? deepFreezeExact({ ...state.coreCleanupContext, failure: true })
                : request;
            exactOwnKeys(
              selected,
              ["plan", "captures", "resourceLedger", "cleanupPlanner", "failure"],
              "cleanup once request",
              { plain: true }
            );
            invariant(
              selected.plan === state.coreCleanupContext.plan &&
                selected.captures === state.coreCleanupContext.captures &&
                selected.resourceLedger === state.coreCleanupContext.resourceLedger &&
                selected.cleanupPlanner === state.coreCleanupContext.cleanupPlanner &&
                typeof selected.failure === "boolean",
              "cleanup once request identity drift"
            );
            const lifecycle = await capabilities.executeCleanupLifecycleCore(selected);
            return deepFreezeExact({ absenceProven: true, lifecycle });
          } catch (error) {
            state.cleanupFailures += 1;
            PRIVATE_RUNTIME.get(state).cleanupFailure = error;
            const outcome = deepFreezeExact({ absenceProven: false, lifecycle: null });
            const diagnostic =
              privateCleanupFailureDiagnosticNeverThrow(error) ??
              createPrivateCleanupFailureDiagnostic(0, "cleanup_boundary_failed");
            retainPrivateCleanupOutcomeDiagnosticNeverThrow(outcome, diagnostic);
            return outcome;
          }
        })();
      }
      return state.cleanupPromise;
    },
  };
  return capabilities;
}

async function executeTask540SmokePlanWithAuthorityFactory(
  input,
  authorityFactory = createPrivateConstructionCleanupAuthority,
  capabilitiesFactory = createRealCapabilities,
  failureActionDiagnosticSink = createRealFailureActionDiagnosticSink()
) {
  let constructionCleanupAuthority = null;
  let failureActionTracker = null;
  try {
    constructionCleanupAuthority = authorityFactory();
    invariant(
      constructionCleanupAuthority instanceof PrivateConstructionCleanupAuthority,
      "construction cleanup authority is invalid"
    );
    assertExecutionInput(input);
    const plan = buildTask540SmokePlan({ nonce: input.nonce });
    failureActionTracker = createPrivateFailureActionTracker(plan);
    const capabilities = await capabilitiesFactory(input, plan, constructionCleanupAuthority);
    constructionCleanupAuthority.bindCompleteCapabilities(capabilities);
    const evidence = await executeSmokePlanCore(
      plan,
      capabilities,
      constructionCleanupAuthority,
      failureActionTracker
    );
    input.assertSafeEvidence(evidence, "TASK-540 canonical smoke evidence");
    return evidence;
  } catch (cause) {
    if (constructionCleanupAuthority === null) {
      retainOrDiscardPreAuthorityCauseNeverThrow();
    } else {
      const cleanupDiagnostics =
        await constructionCleanupAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
      constructionCleanupAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(
        cause,
        cleanupDiagnostics
      );
      emitPrivateFailureActionDiagnosticNeverThrow(
        failureActionTracker,
        failureActionDiagnosticSink,
        constructionCleanupAuthority
      );
    }
    throw TASK_FAILURE;
  }
}

export async function executeTask540SmokePlan(input) {
  return executeTask540SmokePlanWithAuthorityFactory(input);
}

async function expectUncountedAsyncFailure(callback, label) {
  let failed = false;
  try {
    await callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

function selfTestStringSchema({
  minLength = 0,
  maxLength = 256,
  enumValues = null,
  format = null,
} = {}) {
  return {
    type: "string",
    minLength,
    maxLength,
    enum: enumValues,
    format,
  };
}

function selfTestNumberSchema({ minimum = null, maximum = null } = {}) {
  return { type: "number", minimum, maximum };
}

function selfTestContext(plan, actionId) {
  return {
    plan,
    captures: new SingleAssignmentCaptureMap(),
    priorOutputs: new Map(),
    variables: new Map(),
    currentOutput: null,
    root: "/task540-self-test-root",
    actionId,
  };
}

function selfTestJsonTransport(jsonLayers = 1) {
  return {
    encoding: "json",
    jsonLayers,
    nativeMode: null,
    exactText: null,
    sessionName: null,
    normalizedValue: null,
  };
}

function selfTestNativeTransport({
  nativeMode,
  exactText = null,
  sessionName = null,
  normalizedValue,
}) {
  return {
    encoding: "native",
    jsonLayers: 0,
    nativeMode,
    exactText,
    sessionName,
    normalizedValue,
  };
}

function selfTestBunBridgeInputForSchema(schemaId) {
  const uuid = (ordinal) => `54000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;
  const primaryId = uuid(7500);
  const roleId = uuid(7501);
  const timestamp = "2026-07-16T00:00:00.000Z";
  const bootstrap = {
    decryptEmailProof: true,
    emailHashProof: true,
    encryptedEmailProof: true,
    id: primaryId,
    lastLoginAt: null,
    normalizedEmailProof: true,
    rawUserRow: {
      createdAt: timestamp,
      email: "admin@example.test",
      emailEncrypted: "encrypted-email",
      emailHash: "a".repeat(64),
      id: primaryId,
      lastLoginAt: null,
      name: "Task 540 Admin",
      passwordHash: "private-hash",
      status: "active",
      updatedAt: timestamp,
    },
    roleTuples: [
      {
        roleCreatedAt: timestamp,
        roleDescription: null,
        roleId,
        roleName: "admin",
        rolePermissions: ["*"],
        userId: primaryId,
      },
    ],
    updatedAt: timestamp,
  };
  const fixtures = {
    "bootstrap-restore-input-v1": {
      baseline: bootstrap,
      newestOwnedPair: { lastLoginAt: timestamp, updatedAt: timestamp },
      userId: primaryId,
    },
    "email-input-v1": { email: "task-540@example.test" },
    "empty-input-v1": {},
    "entry-discovery-input-v1": { slug: "task-540-entry", typeId: uuid(7502) },
    "entry-preflight-input-v1": {
      entrySlug: "task-540-entry",
      typeSlug: "task-540-type",
    },
    "identifier-media-input-v1": {
      identifier: [uuid(7503), `2026/07/${uuid(7503)}.png`],
    },
    "identifier-override-input-v1": {
      identifier: [uuid(7504), uuid(7505), "task-540-block", "mediaAssetId"],
    },
    "identifier-seo-entry-input-v1": {
      identifier: [uuid(7533), "entry", uuid(7534)],
    },
    "identifier-setting-input-v1": {
      identifier: [uuid(7506), "customScreens.entry.preferences"],
    },
    "identifier-uuid-input-v1": { identifier: [uuid(7507)] },
    "media-id-input-v1": { mediaId: uuid(7508) },
    "media-natural-input-v1": {
      mimeType: "image/png",
      originalName: "task-540.png",
      size: 540,
    },
    "override-discovery-input-v1": {
      blockId: "task-540-block",
      entryId: uuid(7509),
      propPath: "mediaAssetId",
      screenId: uuid(7510),
    },
    "override-preflight-input-v1": {
      blockId: "task-540-block",
      contentTypeSlug: "task-540-type",
      entrySlug: "task-540-entry",
      propPath: "mediaAssetId",
      screenName: "Task 540 Screen",
    },
    "preference-write-input-v1": {
      showFieldMetadata: true,
      userId: uuid(7511),
    },
    "resource-owner-input-v2": {
      entryIds: Array.from({ length: 6 }, (_value, index) => uuid(7520 + index)),
      mediaId: uuid(7526),
      override: {
        blockId: "task-540-block",
        entryId: uuid(7520),
        propPath: "mediaAssetId",
        screenId: uuid(7527),
      },
      overrideExpectedPresent: true,
    },
    "seo-entry-targets-input-v1": {
      targetIds: Array.from({ length: 6 }, (_value, index) => uuid(7535 + index)),
    },
    "screen-discovery-input-v1": {
      contentTypeId: uuid(7528),
      name: "Task 540 Screen",
    },
    "screen-materialize-input-v1": {
      bodyWithoutDefinition: {
        contentTypeId: uuid(7529),
        name: "Task 540 Screen",
        showInSidebar: true,
        sidebarLabel: "Task 540",
        status: "active",
      },
      contentType: {
        id: uuid(7529),
        name: "Task 540 Type",
        schema: { type: "object" },
        slug: "task-540-type",
      },
      definitionWithoutListView: { editorView: {}, schemaVersion: 4 },
    },
    "screen-preflight-input-v1": {
      contentTypeSlug: "task-540-type",
      name: "Task 540 Screen",
    },
    "slug-input-v1": { slug: "task-540-type" },
    "user-agents-input-v1": {
      userAgents: Array.from(
        { length: 4 },
        (_value, index) => `TASK-540/self-test-bun-${index + 1}`
      ),
    },
    "user-id-input-v1": { userId: uuid(7530) },
    "user-identity-input-v1": {
      email: "task-540-user@example.test",
      userId: uuid(7531),
    },
    "user-provision-input-v1": {
      email: "task-540-user@example.test",
      name: "Task 540 User",
    },
    "user-session-observation-input-v1": {
      userAgent: "TASK-540/self-test-session",
      userId: uuid(7532),
    },
  };
  invariant(
    deepEqualJson(Object.keys(fixtures).sort(), Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort()),
    "self-test Bun input fixture registry is not exhaustive"
  );
  invariant(
    Object.hasOwn(fixtures, schemaId),
    "self-test Bun input schema is unknown: " + schemaId
  );
  return deepFreezeExact(fixtures[schemaId]);
}

async function selfTestExactBunChildInputSource(schemaId, input) {
  invariant(
    Object.hasOwn(BUN_BRIDGE_INPUT_VALIDATORS, schemaId),
    "self-test child Bun input schema is unknown: " + schemaId
  );
  assertPlainJsonValue(input, "self-test child Bun input");
  const runtimeFramingLine = "const raw = await new Response(Bun.stdin.stream()).text();\n";
  invariant(
    BRIDGE_INPUT_READER.startsWith(runtimeFramingLine),
    "Bun child input reader framing source drift"
  );
  const raw = canonicalJson(input) + "\n";
  const hermeticReader =
    "const raw = " +
    JSON.stringify(raw) +
    ";\n" +
    BRIDGE_INPUT_READER.slice(runtimeFramingLine.length);
  const program =
    "(async()=>{\n" +
    hermeticReader +
    "\nvalidateInput(" +
    JSON.stringify(schemaId) +
    ",input);\nreturn true;\n})()";
  const result = await new Script(program, {
    filename: "task-540-bun-child-" + schemaId + ".self-test.js",
  }).runInNewContext({ TextEncoder }, { timeout: 15_000 });
  invariant(result === true, schemaId + " child Bun input source did not return success");
  return input;
}

export async function runTask540SmokeExecutorSelfTest() {
  let negativeCases = 0;
  const expectAsyncFailure = async (callback, label) => {
    await expectUncountedAsyncFailure(callback, label);
    negativeCases += 1;
  };
  const assertNegative = (condition, label) => {
    invariant(condition, label + " negative case did not remain observable");
    negativeCases += 1;
  };
  const plan = buildTask540SmokePlan({ nonce: "0123456789ab" });
  const { enabledAuthRatePolicy, disabledAuthRatePolicy } =
    await runHostReadinessPolicySelfTest({
      BROWSER_FIXED_TIMEOUT_ENV,
      BROWSER_OPTIONAL_INHERITED_ENV,
      PROCESS_KILL_GRACE_MS,
      PROCESS_TERM_GRACE_MS,
      applyFixedBrowserTimeoutEnvironment,
      expectAsyncFailure,
      incrementNegativeCases: () => {
        negativeCases += 1;
      },
      normalizeAuthRatePolicy,
      plan,
      readHostReadyLine,
      readHostReadyLineWithTimerAuthority,
      selfTestContext,
    });

  const failureActionExecutionResult = await runFailureActionExecutionSelfTest({
    buildFakeCapabilities,
    createPrivateAuthSettlementFailure,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    createPrivateDirtyNavigationFailure,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    executeTask540SmokePlanWithAuthorityFactory,
    plan,
  });
  const {
    classifiedFailureActionId,
    diagnosticInput,
    diagnosticPrivateMarker,
    dirtyNavigationFailureAction,
    dirtyNavigationPrivateMarker,
    expectedClassifiedLine,
    toneOpenFailureAction,
    toneOpenPrivateMarker,
    toneSelectFailureAction,
    toneSelectPrivateMarker,
  } = failureActionExecutionResult;
  negativeCases += failureActionExecutionResult.explicitNegativeCases;

  const failureActionClassificationResult = runFailureActionClassificationSelfTest({
    assertNegative,
    createPrivateBoundedFailureActionDiagnosticSink,
    emitPrivateFailureActionDiagnosticNeverThrow,
    executionFixtures: failureActionExecutionResult,
    failureBoundary,
    plan,
  });
  const { trackerAtAction } = failureActionClassificationResult;
  negativeCases += failureActionClassificationResult.explicitNegativeCases;

  await runFailureActionSinksSelfTest({
    PRIVATE_FAILURE_ACTION_TRACKERS,
    assertNegative,
    beginPrivateFailureAction,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateFailureActionTracker,
    createPrivateSynchronousFailureActionDiagnosticSink,
    diagnosticPrivateMarker,
    emitPrivateFailureActionDiagnosticNeverThrow,
    expectAsyncFailure,
    plan,
  });

  const inheritedSecretCorpus = configuredSensitiveValues(
    { DATABASE_URL: "postgres://wf540:p%40ssword@localhost/example" },
    { INHERITED_SECRET: "sixteen-private", STORE_PUBLIC_KEY: "public-value" }
  );
  invariant(
    inheritedSecretCorpus.includes("postgres://wf540:p%40ssword@localhost/example") &&
      inheritedSecretCorpus.includes("p@ssword") &&
      inheritedSecretCorpus.includes("sixteen-private") &&
      !inheritedSecretCorpus.includes("public-value"),
    "inherited/URL secret corpus projection drift"
  );

  await runConstructionCleanupSelfTest({
    PRIVATE_CONSTRUCTION_AUTHORITY,
    PRIVATE_FAILURE_ACTION_TRACKERS,
    appendRetainedGroupMembers,
    assertNegative,
    buildFakeCapabilities,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    createPrivateDirtyNavigationFailure,
    createPrivateFailureActionTracker,
    currentPrivateConstructionCleanupDiagnosticNeverThrow,
    diagnosticInput,
    diagnosticPrivateMarker,
    dirtyNavigationFailureAction,
    dirtyNavigationPrivateMarker,
    emitPrivateFailureActionDiagnosticNeverThrow,
    executeSmokePlanCore,
    executeTask540SmokePlanWithAuthorityFactory,
    expectAsyncFailure,
    incrementNegativeCases: (count) => {
      negativeCases += count;
    },
    plan,
    privateConstructionAuthorityProjection,
    retainPrivateCleanupFailureDiagnosticNeverThrow,
    retainPrivateDirtyNavigationFailureClassNeverThrow,
    trackerAtAction,
    validateBunExecutableAuthorityObservation,
    writePrivateFailureActionDiagnosticOnceNeverThrow,
  });

  const sourceCaptures = await runBrowserCaptureFrontierSelfTest({
    buildBrowserInvocation,
    compileActionExecutionSpec,
    expectAsyncFailure,
    fixtureCaptureValue,
    plan,
  });

  await runMediaUploadSelfTest({
    TASK540_MEDIA_UPLOAD_SHA256,
    TASK540_PNG_SIGNATURE_HEX,
    buildRuntimeOperationHandlers,
    decodeCanonicalMediaUploadFixtureExact,
    expectAsyncFailure,
    plan,
    sourceCaptures,
  });

  runMediaIsolationSelfTest({ assertNegative, plan, sourceCaptures });

  const browserSourceContext = await runBrowserSourceContextSelfTest({
    assertNegative,
    expectAsyncFailure,
    plan,
    sourceCaptures,
  });
  let compiledRunCodeSources = browserSourceContext.compiledRunCodeSources;
  const {
    sourceContext,
    authArmSourceActionIds,
    authCloseSourceActionIds,
    authRateBarrierSourceActionIds,
    blockBaselineSourceActionIds,
    mediaIsolationSourceActionIds,
    recordEntryMenuSourceActionIds,
    recordsWorkspaceSourceActionIds,
    observedDirtyNavigationRequestActionIds,
    observedToneContentFillActionIds,
    observedToneMenuOpenActionIds,
    observedToneMutedActionIds,
    expectedDirtyNavigationRequestActionConfig,
    authSettlementSourceSpecs,
    authSettlementActionIds,
    observedAuthSettlementActionIds,
    authSettlementCompiledSources,
    encodedPaletteSelectors,
    previewRuntimeActionSelectors,
    observedPreviewRuntimeActionIds,
    readDataBearingRunCodePayload,
    assertSourceMutantsRejected,
  } = browserSourceContext;
  for (const action of plan.actionManifest) {
    if (action.executable.type === "runtime-operation") continue;
    const executionSpec = compileActionExecutionSpec(action);
    const invocation = buildBrowserInvocation(
      action,
      executionSpec,
      sourceCaptures,
      "/task540-self-test-root",
      "/task540-self-test-root/private",
      plan,
      { ...sourceContext, actionId: action.id },
      {
        csrfHeaderName: "x-self-test-csrf",
        authRatePolicy: {
          enabled: true,
          maxRequests: 10,
          windowSeconds: 60,
        },
      }
    );
    if (action.executable.type !== "browser-run-code") continue;
    const sourceIndex = invocation.args.indexOf("run-code") + 1;
    invariant(
      sourceIndex > 0 && typeof invocation.args[sourceIndex] === "string",
      action.id + " run-code source is absent"
    );
    const compiledSource = invocation.args[sourceIndex];
    invariant(
      !compiledSource.includes(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR),
      action.id + " retained the legacy runtime-root selector"
    );
    if (compiledSource.includes("await page.goto(")) {
      invariant(
        compiledSource.includes("{ timeout: 540000 }"),
        action.id + " explicit navigation timeout drift"
      );
    }
    new Script("(" + compiledSource + ")", { filename: action.id + ".self-test.js" });
    const authSettlementSourceSpec = authSettlementSourceSpecs.get(action.id);
    if (authSettlementSourceSpec !== undefined) {
      const expectedConfigNameToken =
        '"name":' + JSON.stringify(authSettlementSourceSpec.observationName);
      const finalUrlReadToken = "const observedUrl = page.url();";
      const labelTextReadToken = "await label.textContent({ timeout: remainingAuthTime() })";
      const menuBoxReadToken = "await menu.boundingBox({ timeout: remainingAuthTime() })";
      const menuVisibilityReadToken = "await menu.isVisible()";
      const urlGuardToken = "if (observedUrl !== config.adminRootUrl) {";
      const bindToken = "if (userId !== null) context.__wf540BindActiveUser";
      const returnToken = "return { url: observedUrl, userMenuVisible, userName };";
      const required = [
        '"adminRootUrl":"http://coderso-a.localhost:5173/admin/"',
        expectedConfigNameToken,
        "const deadline = Date.now() + 180000;",
        "const remainingAuthTime = () => {",
        "return Math.max(1, deadline - Date.now());",
        'let failureClass = "dom_read_failed";',
        "while (Date.now() < deadline)",
        "if (page.isClosed())",
        "const candidateUrl = page.url();",
        'candidateUrl === config.loginUrl ? "login_route" : "noncanonical_route"',
        "const menuCount = await menu.count();",
        'page.getByText("Loading...", { exact: true })',
        'failureClass = "menu_duplicate";',
        "const labelCount = await label.count();",
        'failureClass = "label_absent";',
        'failureClass = "label_duplicate";',
        "if (Object.values(result).some((item) => !Number.isFinite(item)))",
        labelTextReadToken,
        "const rawMenuRect = " + menuBoxReadToken + ";",
        "const menuRect = geometryIsFinite ? finiteRect(rawMenuRect) : null;",
        "const userMenuVisible = " + menuVisibilityReadToken + ";",
        "expectedName === null ? userName.length > 0 : userName === expectedName",
        'failureClass = "name_empty";',
        'failureClass = "name_mismatch";',
        'failureClass = "geometry_absent";',
        'failureClass = "geometry_nonfinite";',
        'failureClass = "geometry_nonpositive";',
        'failureClass = "menu_hidden";',
        finalUrlReadToken,
        urlGuardToken,
        'failureClass = "url_unstable";',
        bindToken,
        returnToken,
        "await page.waitForTimeout(Math.min(25, waitMs));",
        'failureClass = page.isClosed() ? "page_closed" : "dom_read_failed";',
        "break;",
        "const projection = context.__wf540ReadLogProjection();",
        'if (projection.firstUnexpected !== null) failureClass = "runtime_failure";',
        "return { settled: false, failureClass };",
        "const authSettlementFailureOutput = exactAuthSettlementFailureOutput(output);",
        "return { failureClass: value.failureClass, settled: false };",
        "if (authSettlementFailureOutput !== null) return authSettlementFailureOutput;",
        "output = exactOutput(output);",
        authSettlementSourceSpec.invocationToken,
      ];
      const validates = (source) => {
        const labelTextReadIndex = source.indexOf(labelTextReadToken);
        const menuBoxReadIndex = source.indexOf(menuBoxReadToken);
        const menuVisibilityReadIndex = source.indexOf(menuVisibilityReadToken);
        const finalUrlReadIndex = source.indexOf(finalUrlReadToken);
        const urlGuardIndex = source.indexOf(urlGuardToken);
        const bindIndex = source.indexOf(bindToken);
        const returnIndex = source.indexOf(returnToken);
        const failureEpilogIndex = source.indexOf(
          "if (authSettlementFailureOutput !== null) return authSettlementFailureOutput;"
        );
        const successEpilogIndex = source.indexOf("output = exactOutput(output);");
        const finalSettlementSource =
          finalUrlReadIndex >= 0 && returnIndex > finalUrlReadIndex
            ? source.slice(finalUrlReadIndex, returnIndex)
            : "";
        return (
          required.every((token) => source.includes(token)) &&
          !source.includes("const menu = await one(selector);") &&
          !source.includes("return { url: config.adminRootUrl, userMenuVisible, userName };") &&
          !source.includes(
            "const settled = { url: config.adminRootUrl, userMenuVisible, userName };"
          ) &&
          finalUrlReadIndex > labelTextReadIndex &&
          finalUrlReadIndex > menuBoxReadIndex &&
          finalUrlReadIndex > menuVisibilityReadIndex &&
          urlGuardIndex > finalUrlReadIndex &&
          bindIndex > urlGuardIndex &&
          returnIndex > bindIndex &&
          failureEpilogIndex > returnIndex &&
          successEpilogIndex > failureEpilogIndex &&
          !finalSettlementSource.includes("await ")
        );
      };
      invariant(validates(compiledSource), action.id + " auth settlement source contract drift");
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        required,
        action.id + " auth settlement"
      );
      const constantUrlMutant = compiledSource.replace(
        returnToken,
        "return { url: config.adminRootUrl, userMenuVisible, userName };"
      );
      assertNegative(
        !validates(constantUrlMutant),
        action.id + " auth settlement constant URL return"
      );
      const missingFinalUrlReadMutant = compiledSource.replace(finalUrlReadToken, "");
      assertNegative(
        !validates(missingFinalUrlReadMutant),
        action.id + " auth settlement missing final URL read"
      );
      const earlyFinalUrlReadMutant = compiledSource
        .replace(finalUrlReadToken, "")
        .replace(labelTextReadToken, finalUrlReadToken + "\n            " + labelTextReadToken);
      assertNegative(
        !validates(earlyFinalUrlReadMutant),
        action.id + " auth settlement final URL read ordering"
      );
      const awaitedAfterFinalUrlReadMutant = compiledSource.replace(
        finalUrlReadToken,
        finalUrlReadToken + "\n              await page.waitForTimeout(0);"
      );
      assertNegative(
        !validates(awaitedAfterFinalUrlReadMutant),
        action.id + " auth settlement await after final URL read"
      );
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        [expectedConfigNameToken, authSettlementSourceSpec.invocationToken],
        action.id + " auth settlement exact branch invocation"
      );
      observedAuthSettlementActionIds.push(action.id);
      authSettlementCompiledSources.set(action.id, compiledSource);
    }
    if (previewRuntimeActionSelectors.has(action.id)) {
      const expectedSelector = previewRuntimeActionSelectors.get(action.id);
      const selectorMatches = ["focus", "press", "type"].includes(action.kind)
        ? readDataBearingRunCodePayload(compiledSource, action.id).selector === expectedSelector
        : compiledSource.includes("page.locator(" + JSON.stringify(expectedSelector) + ")");
      invariant(
        selectorMatches &&
          !compiledSource.includes("scopedRuntimeTab") &&
          !compiledSource.includes("previewRuntimeTab"),
        action.id + " preview runtime selector exact bytes drift"
      );
      observedPreviewRuntimeActionIds.push(action.id);
    }
    const dirtyNavigationConfig = DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG[action.id];
    if (dirtyNavigationConfig !== undefined) {
      const expectedDirtyNavigationConfig = expectedDirtyNavigationRequestActionConfig[action.id];
      invariant(
        expectedDirtyNavigationConfig !== undefined &&
          deepEqualJson(dirtyNavigationConfig, expectedDirtyNavigationConfig),
        action.id + " dirty-navigation literal mapping drift"
      );
        const expectedSelector = registeredSelector(plan, "recordsLink", [
          sourceCaptures.get("screen.id"),
        ]);
        const expectedCurrentUrl = expandRegisteredPath(
          plan,
          expectedDirtyNavigationConfig.realm,
          sourceCaptures
        );
        const namedDialogLocatorToken =
          'const dialog = page.getByRole("dialog", { name: ' +
          JSON.stringify(expectedDirtyNavigationConfig.dialogTitle) +
          ", exact: true });";
        const dialogMultiplicityFailureClassToken =
          "const dialogMultiplicityFailureClass = " +
          JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9]) +
          ";";
        const latestTargetFailureAssignmentBlock =
          "\n              latestTargetFailureClass = pollTargetFailureClass;" +
          "\n              await page.waitForTimeout(25);";
        const required = [
          "const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;",
          "const fail = (failureClass) => ({ failureClass, settled: false });",
          namedDialogLocatorToken,
          dialogMultiplicityFailureClassToken,
          "const links = page.locator(" + JSON.stringify(expectedSelector) + ");",
          "let visibleLinkIndex = -1;",
          "let latestTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
            ";",
          "const targetDeadline = Date.now() + 30000;",
          "while (Date.now() < targetDeadline)",
          "let pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
            ";",
          "const count = await links.count();",
          "if (count > 8) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]) +
            ");",
          "let nextVisibleLinkIndex = -1;",
          "let visibleCount = 0;",
          "for (let index = 0; index < count; index += 1)",
          "const candidate = links.nth(index);",
          "const rect = await candidate.boundingBox();",
          "if (await candidate.isVisible() && positive(rect))",
          "nextVisibleLinkIndex = index;",
          "visibleCount += 1;",
          "if (visibleCount > 1) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[1]) +
            ");",
          "if (visibleCount === 1)",
          "const candidate = links.nth(nextVisibleLinkIndex);",
          "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
          "const candidateStillVisible = await candidate.isVisible();",
          "if (candidateStillVisible && positive(rect))",
          'const body = page.locator("body");',
          "const bodyInteraction = await body.count() === 1",
          "computedPointerEvents: getComputedStyle(node).pointerEvents,",
          "inlinePointerEvents: node.style.pointerEvents,",
          'scrollLocked: node.hasAttribute("data-scroll-locked"),',
          "if (bodyInteraction !== null)",
          "if (bodyInteraction.scrollLocked === true)",
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[4]) +
            ";",
          'else if (bodyInteraction.inlinePointerEvents === "none")',
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5]) +
            ";",
          'else if (bodyInteraction.computedPointerEvents === "none")',
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[6]) +
            ";",
          "const receivesPointerAtCenter = await candidate.evaluate((node, box) =>",
          "const receiver = document.elementFromPoint(",
          "box.x + box.width / 2,",
          "box.y + box.height / 2",
          "receiver !== null && (receiver === node || node.contains(receiver))",
          "if (receivesPointerAtCenter)",
          "visibleLinkIndex = nextVisibleLinkIndex;",
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7]) +
            ";",
          latestTargetFailureAssignmentBlock,
          "if (visibleLinkIndex < 0) return fail(latestTargetFailureClass);",
          "const urlBefore = page.url();",
          "const navigationCountBefore = page.__wf540ReadNavigationCount();",
          "if (urlBefore !== " +
            JSON.stringify(expectedCurrentUrl) +
            ") return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[3]) +
            ");",
          "if (await dialog.count() !== 0) return fail(dialogMultiplicityFailureClass);",
          "let clickFailed = false;",
          "try {",
          "await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });",
          "} catch {",
          "clickFailed = true;",
          "let namedDialogObserved = false;",
          "const dialogDeadline = Date.now() + 30000;",
          "while (Date.now() < dialogDeadline)",
          'const heading = dialog.getByRole("heading", { name: ' +
            JSON.stringify(expectedDirtyNavigationConfig.dialogTitle) +
            ", exact: true });",
          "const description = dialog.getByText(" +
            JSON.stringify(expectedDirtyNavigationConfig.dialogDescription) +
            ", { exact: true });",
          'const keepEditing = dialog.getByRole("button", { name: "Keep editing", exact: true });',
          'const discard = dialog.getByRole("button", { name: "Discard and continue", exact: true });',
          "const dialogCount = await dialog.count();",
          "const headingCount = await heading.count();",
          "const descriptionCount = await description.count();",
          "const keepEditingCount = await keepEditing.count();",
          "const discardCount = await discard.count();",
          "return fail(dialogMultiplicityFailureClass);",
          "if (dialogCount === 1) namedDialogObserved = true;",
          "const dialogRect = dialogCount === 1 ? await dialog.boundingBox() : null;",
          "const headingRect = headingCount === 1 ? await heading.boundingBox() : null;",
          "const descriptionRect = descriptionCount === 1 ? await description.boundingBox() : null;",
          "const keepEditingRect = keepEditingCount === 1 ? await keepEditing.boundingBox() : null;",
          "const discardRect = discardCount === 1 ? await discard.boundingBox() : null;",
          "const urlStable = page.url() === urlBefore;",
          "const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;",
          "if (!urlStable || !navigationStable) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[10]) +
            ");",
          "dialogCount === 1 &&",
          "await dialog.isVisible() &&",
          "positive(dialogRect) &&",
          "headingCount === 1 &&",
          "await heading.isVisible() &&",
          "positive(headingRect) &&",
          "descriptionCount === 1 &&",
          "await description.isVisible() &&",
          "positive(descriptionRect) &&",
          "keepEditingCount === 1 &&",
          "await keepEditing.isVisible() &&",
          "positive(keepEditingRect) &&",
          "discardCount === 1 &&",
          "await discard.isVisible() &&",
          "positive(discardRect)",
          ") return true;",
          "if (clickFailed && !namedDialogObserved) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8]) +
            ");",
          "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[11]) + ");",
          "if (result === true) return { ok: true };",
          "const failureClasses = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES) +
            ";",
          'keys.length === 2 && keys.includes("failureClass") && keys.includes("settled")',
          "result.settled === false",
          "failureClasses.includes(result.failureClass)",
          "return result;",
          'throw new Error("wf540_dirty_navigation_result");',
        ];
        const orderedTokens = [
          "const fail = (failureClass) =>",
          namedDialogLocatorToken,
          dialogMultiplicityFailureClassToken,
          "const links = page.locator(",
          "let visibleLinkIndex = -1;",
          "let latestTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
            ";",
          "const targetDeadline = Date.now() + 30000;",
          "let pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[2]) +
            ";",
          "const count = await links.count();",
          "if (count > 8) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]) +
            ");",
          "let visibleCount = 0;",
          "if (await candidate.isVisible() && positive(rect))",
          "if (visibleCount > 1) return fail(" +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[1]) +
            ");",
          "if (visibleCount === 1)",
          "const candidate = links.nth(nextVisibleLinkIndex);",
          "await candidate.scrollIntoViewIfNeeded({ timeout: 30000 });",
          "const candidateStillVisible = await candidate.isVisible();",
          "if (candidateStillVisible && positive(rect))",
          'const body = page.locator("body");',
          "const bodyInteraction = await body.count() === 1",
          "if (bodyInteraction !== null)",
          "const receivesPointerAtCenter = await candidate.evaluate(",
          "const receiver = document.elementFromPoint(",
          "if (receivesPointerAtCenter)",
          "visibleLinkIndex = nextVisibleLinkIndex;",
          'else if (bodyInteraction.inlinePointerEvents === "none")',
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[5]) +
            ";",
          'else if (bodyInteraction.computedPointerEvents === "none")',
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[6]) +
            ";",
          "if (bodyInteraction.scrollLocked === true)",
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[4]) +
            ";",
          "pollTargetFailureClass = " +
            JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[7]) +
            ";",
          "latestTargetFailureClass = pollTargetFailureClass;",
          "if (visibleLinkIndex < 0) return fail(latestTargetFailureClass);",
          "const urlBefore = page.url();",
          "const navigationCountBefore = page.__wf540ReadNavigationCount();",
          "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[3]) + ");",
          "if (await dialog.count() !== 0) return fail(dialogMultiplicityFailureClass);",
          "let clickFailed = false;",
          "await links.nth(visibleLinkIndex).click({ timeout: 30000, noWaitAfter: true });",
          "clickFailed = true;",
          "let namedDialogObserved = false;",
          "const dialogDeadline = Date.now() + 30000;",
          "const heading = dialog.getByRole(",
          "const description = dialog.getByText(",
          "const keepEditing = dialog.getByRole(",
          "const discard = dialog.getByRole(",
          "return fail(dialogMultiplicityFailureClass);",
          "if (dialogCount === 1) namedDialogObserved = true;",
          "const urlStable = page.url() === urlBefore;",
          "const navigationStable = page.__wf540ReadNavigationCount() === navigationCountBefore;",
          "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[10]) + ");",
          "dialogCount === 1 &&",
          "positive(discardRect)",
          ") return true;",
          "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[8]) + ");",
          "return fail(" + JSON.stringify(DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[11]) + ");",
          "if (result === true) return { ok: true };",
          "const failureClasses = ",
          "result.settled === false",
          "return result;",
        ];
        const validates = (source) => {
          if (
            !required.every((token) => source.includes(token)) ||
            source.includes("while (Date.now() < deadline && await locator.count() !== 1)") ||
            source.includes("if (count !== 1)") ||
            source.includes('const dialog = page.getByRole("dialog");') ||
            source.includes("targetBlocker") ||
            source.includes("pointerUnlocked") ||
            source.includes('"pointer_locked"') ||
            source.split(latestTargetFailureAssignmentBlock).length - 1 !== 1 ||
            source.split(".click({ timeout: 30000, noWaitAfter: true });").length - 1 !== 1 ||
            source.split(".scrollIntoViewIfNeeded({ timeout: 30000 });").length - 1 !== 1 ||
            source.includes("force: true") ||
            source.split("return fail(").length - 1 !== 9 ||
            source.split("} catch {").length - 1 !== 1 ||
            source.includes("catch (") ||
            source.includes("error.message") ||
            source.includes("String(error") ||
            !DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES.every(
              (failureClass) =>
                source.split(JSON.stringify(failureClass)).length - 1 ===
                (failureClass === "target_missing" ? 3 : 2)
            )
          ) {
            return false;
          }
          let previousIndex = -1;
          for (const token of orderedTokens) {
            const tokenIndex = source.indexOf(token, previousIndex + 1);
            if (tokenIndex <= previousIndex) return false;
            previousIndex = tokenIndex;
          }
          return true;
        };
        invariant(validates(compiledSource), action.id + " dirty-navigation source drift");
        assertSourceMutantsRejected(
          compiledSource,
          validates,
          required,
          action.id + " dirty-navigation settlement"
        );
        for (const [label, replacement] of [
          ["global dialog", 'const dialog = page.getByRole("dialog");'],
          ["inexact dialog", namedDialogLocatorToken.replace("exact: true", "exact: false")],
          [
            "wrong-name dialog",
            namedDialogLocatorToken.replace(
              JSON.stringify(expectedDirtyNavigationConfig.dialogTitle),
              JSON.stringify("Wrong dirty-navigation dialog")
            ),
          ],
        ]) {
          assertNegative(
            !validates(compiledSource.replace(namedDialogLocatorToken, replacement)),
            action.id + " dirty-navigation " + label + " mutant"
          );
        }
        const stickyBlockerMutant = compiledSource.replace(
          latestTargetFailureAssignmentBlock,
          "\n              if (visibleCount === 1) latestTargetFailureClass = pollTargetFailureClass;" +
            "\n              await page.waitForTimeout(25);"
        );
        assertNegative(
          !validates(stickyBlockerMutant),
          action.id + " dirty-navigation sticky blocker mutant"
        );
        for (let index = 1; index < orderedTokens.length; index += 1) {
          const left = orderedTokens[index - 1];
          const right = orderedTokens[index];
          const marker = "__WF540_DIRTY_NAV_ORDER_MUTANT_" + index + "__";
          const mutant = compiledSource
            .replace(left, marker)
            .replace(right, left)
            .replace(marker, right);
          assertNegative(!validates(mutant), action.id + " dirty-navigation order mutant " + index);
        }
        observedDirtyNavigationRequestActionIds.push(action.id);
    }
    const toneContentFillConfig = TONE_CONTENT_FILL_ACTION_CONFIG[action.id];
    if (toneContentFillConfig !== undefined) {
      const targetBlockId =
        plan.fixtureBlueprint.screen.blockIds[toneContentFillConfig.targetBlockKey];
      const expectedDraft = plan.fixtureBlueprint.entry[toneContentFillConfig.expectedDraftKey];
      invariant(
        typeof targetBlockId === "string" &&
          typeof expectedDraft === "string" &&
          expectedDraft.length > 0,
        action.id + " tone content fill fixture drift"
      );
      const textboxSelector = registeredSelector(plan, "contentEditable", [
        targetBlockId,
        toneContentFillConfig.fieldLabel,
      ]);
      const targetRootSelector = registeredSelector(plan, "blockRoot", [targetBlockId]);
      const selectionHandleSelector = registeredSelector(plan, "selectBlock", [targetBlockId]);
      const required = [
        "const positive = (rect) => rect !== null && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;",
        "const textbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
        "const targetRoot = page.locator(" + JSON.stringify(targetRootSelector) + ");",
        "const selectionHandle = page.locator(" + JSON.stringify(selectionHandleSelector) + ");",
        'await textbox.waitFor({ state: "visible", timeout: 30000 });',
        "const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;",
        "const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;",
        "const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;",
        "await textbox.count() !== 1",
        "!(await textbox.isVisible())",
        "!positive(textboxRect)",
        "await targetRoot.count() !== 1",
        "!(await targetRoot.isVisible())",
        "!positive(targetRootRect)",
        'await targetRoot.getAttribute("data-selected") !== "true"',
        "await selectionHandle.count() !== 1",
        "!(await selectionHandle.isVisible())",
        "!positive(selectionHandleRect)",
        'await selectionHandle.getAttribute("aria-pressed") !== "true"',
        "await textbox.fill(" + JSON.stringify(expectedDraft) + ");",
        "const filledText = await textbox.textContent();",
        "const filledTextboxFocused = await textbox.evaluate((node) => node === document.activeElement);",
        "if (filledText !== " +
          JSON.stringify(expectedDraft) +
          " || filledTextboxFocused !== true)",
        "await textbox.blur();",
        "const deadline = Date.now() + 30000;",
        "while (Date.now() < deadline)",
        "const settledTextbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
        "const settledTargetRoot = page.locator(" + JSON.stringify(targetRootSelector) + ");",
        "const settledSelectionHandle = page.locator(" +
          JSON.stringify(selectionHandleSelector) +
          ");",
        'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
        "const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;",
        "const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;",
        "const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;",
        "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
        "const settledText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
        "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
        "await settledTextbox.count() === 1",
        "await settledTextbox.isVisible()",
        "positive(settledTextboxRect)",
        "settledText === " + JSON.stringify(expectedDraft),
        "settledTextboxFocused === false",
        "await settledTargetRoot.count() === 1",
        "await settledTargetRoot.isVisible()",
        "positive(settledTargetRootRect)",
        'await settledTargetRoot.getAttribute("data-selected") === "true"',
        "await settledSelectionHandle.count() === 1",
        "await settledSelectionHandle.isVisible()",
        "positive(settledSelectionHandleRect)",
        'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
        "await contentDirty.count() === 1 &&",
        "await contentDirty.isVisible() &&",
        "positive(contentDirtyRect)",
        ") return true;",
        'throw new Error("wf540_tone_fill_dirty_settlement");',
      ];
      const orderedTokens = [
        "await textbox.fill(" + JSON.stringify(expectedDraft) + ");",
        "const filledText = await textbox.textContent();",
        "const filledTextboxFocused = await textbox.evaluate((node) => node === document.activeElement);",
        "if (filledText !== " +
          JSON.stringify(expectedDraft) +
          " || filledTextboxFocused !== true)",
        "await textbox.blur();",
        "const deadline = Date.now() + 30000;",
        "const settledTextbox = page.locator(" + JSON.stringify(textboxSelector) + ");",
        'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
        "const settledText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
        "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
        "settledText === " + JSON.stringify(expectedDraft),
        "settledTextboxFocused === false",
        'await settledTargetRoot.getAttribute("data-selected") === "true"',
        'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
        "await contentDirty.count() === 1 &&",
        "await contentDirty.isVisible() &&",
        "positive(contentDirtyRect)",
        ") return true;",
      ];
      const validates = (source) => {
        if (
          !required.every((token) => source.includes(token)) ||
          source.includes("const locator=page.locator") ||
          source.split(".fill(").length - 1 !== 1 ||
          source.split(".blur(").length - 1 !== 1
        ) {
          return false;
        }
        let previousIndex = -1;
        for (const token of orderedTokens) {
          const tokenIndex = source.indexOf(token, previousIndex + 1);
          if (tokenIndex <= previousIndex) return false;
          previousIndex = tokenIndex;
        }
        return true;
      };
      invariant(validates(compiledSource), action.id + " tone content fill source drift");
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        required,
        action.id + " tone content fill settlement"
      );
      for (let index = 1; index < orderedTokens.length; index += 1) {
        const left = orderedTokens[index - 1];
        const right = orderedTokens[index];
        const marker = "__WF540_TONE_FILL_ORDER_MUTANT_" + index + "__";
        const mutant = compiledSource
          .replace(left, marker)
          .replace(right, left)
          .replace(marker, right);
        assertNegative(!validates(mutant), action.id + " tone content fill order mutant " + index);
      }
      observedToneContentFillActionIds.push(action.id);
    }
    const toneFlowConfig = TONE_FLOW_ACTION_CONFIG[action.id];
    if (toneFlowConfig !== undefined) {
      const toneSelectPanelGeometryToken = "visiblePositive(panel) &&";
      const toneSelectTriggerGeometryToken = "visiblePositive(trigger) &&";
      const toneSelectUnlockedScrollToken = '!body.hasAttribute("data-scroll-locked")';
      const toneSelectResetSettlementBlock = [
        "const resetSettlement = () => {",
        "                settledSince = null;",
        "                settledSampleCount = 0;",
        "              };",
      ].join("\n");
      const commonRequired = [
        JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]'),
        JSON.stringify(OPEN_SELECT_CONTENT_SELECTOR),
        JSON.stringify(registeredSelector(plan, "toneTrigger")),
        JSON.stringify(
          registeredSelector(plan, "blockRoot", [
            plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
          ])
        ),
        JSON.stringify(
          registeredSelector(plan, "selectBlock", [
            plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
          ])
        ),
        JSON.stringify(
          registeredSelector(plan, "contentEditable", [
            plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
            toneFlowConfig.fieldLabel,
          ])
        ),
        "rect.width > 0 && rect.height > 0",
      ];
      const phaseRequired =
        toneFlowConfig.phase === "open"
          ? [
              "const fail = (failureClass) => ({ failureClass, settled: false });",
              "let failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[0]) + ";",
              "try {",
              "const initialPanel = page.locator(" +
                JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
                ");",
              'await initialPanel.waitFor({ state: "visible", timeout: 30000 });',
              "const initialTargetRoot = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "blockRoot", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const initialSelectionHandle = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "selectBlock", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const initialTextbox = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "contentEditable", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                    toneFlowConfig.fieldLabel,
                  ])
                ) +
                ");",
              "const targetPreconditionFailed =",
              "await initialPanel.count() !== 1",
              "await initialTargetRoot.count() !== 1",
              'await initialTargetRoot.getAttribute("data-selected") !== "true"',
              "await initialSelectionHandle.count() !== 1",
              'await initialSelectionHandle.getAttribute("aria-pressed") !== "true"',
              "await initialTextbox.count() !== 1",
              "if (targetPreconditionFailed) return fail(failureClass);",
              "return fail(failureClass);",
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const preconditionDeadline = Date.now() + 30000;",
              "while (Date.now() < preconditionDeadline)",
              "const settledPanel = page.locator(" +
                JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
                ");",
              "const settledTargetRoot = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "blockRoot", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const settledSelectionHandle = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "selectBlock", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const settledTextbox = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "contentEditable", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                    toneFlowConfig.fieldLabel,
                  ])
                ) +
                ");",
              'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
              "const settledPanelRect = await settledPanel.count() === 1 ? await settledPanel.boundingBox() : null;",
              "const settledTargetRootRect = await settledTargetRoot.count() === 1 ? await settledTargetRoot.boundingBox() : null;",
              "const settledSelectionHandleRect = await settledSelectionHandle.count() === 1 ? await settledSelectionHandle.boundingBox() : null;",
              "const settledTextboxRect = await settledTextbox.count() === 1 ? await settledTextbox.boundingBox() : null;",
              "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
              "const settledTextboxText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
              "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
              "await settledPanel.count() === 1",
              "await settledPanel.isVisible()",
              "positive(settledPanelRect)",
              "await settledTargetRoot.count() === 1",
              "await settledTargetRoot.isVisible()",
              "positive(settledTargetRootRect)",
              'await settledTargetRoot.getAttribute("data-selected") === "true"',
              "await settledSelectionHandle.count() === 1",
              "await settledSelectionHandle.isVisible()",
              "positive(settledSelectionHandleRect)",
              'await settledSelectionHandle.getAttribute("aria-pressed") === "true"',
              "await settledTextbox.count() === 1",
              "await settledTextbox.isVisible()",
              "positive(settledTextboxRect)",
              "settledTextboxText === " +
                JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
              "settledTextboxFocused === false",
              "await contentDirty.count() === 1 &&",
              "await contentDirty.isVisible() &&",
              "positive(contentDirtyRect)",
              "baselineColor = await settledTextbox.evaluate((node) => getComputedStyle(node).color);",
              "if (baselineColor.length > 0) break;",
              'if (typeof baselineColor !== "string" || baselineColor.length === 0)',
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[2]) + ";",
              "const panel = page.locator(" +
                JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
                ");",
              "const trigger = panel.locator(" +
                JSON.stringify(registeredSelector(plan, "toneTrigger")) +
                ");",
              "const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;",
              "await panel.count() !== 1 || await trigger.count() !== 1 || !(await trigger.isVisible()) || !positive(triggerRect)",
              "await trigger.click({ timeout: 30000 });",
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[3]) + ";",
              "const contentCount = await openContent.count();",
              "if (contentCount > 1)",
              "const option = openContent.locator(" +
                JSON.stringify(registeredSelector(plan, "muted")) +
                ");",
              "const optionCount = await option.count();",
              "if (optionCount > 1)",
              "const contentRect = await openContent.boundingBox();",
              "const optionRect = optionCount === 1 ? await option.boundingBox() : null;",
              'const menuId = await openContent.getAttribute("id");',
              'const controls = await trigger.getAttribute("aria-controls");',
              "optionCount === 1 &&",
              "await openContent.isVisible() &&",
              "await option.isVisible() &&",
              "positive(contentRect) &&",
              "positive(optionRect) &&",
              'typeof menuId === "string"',
              "menuId.length > 0 &&",
              "controls === menuId &&",
              'await trigger.getAttribute("aria-expanded") === "true"',
              "page.context().__wf540Remember(" + JSON.stringify(toneFlowConfig.stateKey),
              "{ baselineColor, menuId }",
              "} catch {",
            ]
          : [
              "const fail = (failureClass) => ({ failureClass, settled: false });",
              "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
              "const sampleAtomicTeardown = () => page.evaluate(",
              "const exactElement = (root, selector) => {",
              "const matches = root.querySelectorAll(selector);",
              "return matches.length === 1 ? matches[0] : null;",
              "const visiblePositive = (node) => {",
              "const rect = node.getBoundingClientRect();",
              "const style = getComputedStyle(node);",
              "const structuralClosed =",
              toneSelectPanelGeometryToken,
              toneSelectTriggerGeometryToken,
              'trigger.textContent.trim() === "Muted"',
              'trigger.getAttribute("aria-expanded") === "false"',
              "document.querySelectorAll(allContentSelector).length === 0",
              "const interactionHandoff =",
              toneSelectUnlockedScrollToken,
              'body.style.pointerEvents !== "none"',
              'getComputedStyle(body).pointerEvents !== "none"',
              "return { interactionHandoff, structuralClosed };",
              "try {",
              "const authority = page.context().__wf540Recall(" +
                JSON.stringify(toneFlowConfig.stateKey),
              "const panel = page.locator(" +
                JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
                ");",
              "const trigger = panel.locator(" +
                JSON.stringify(registeredSelector(plan, "toneTrigger")) +
                ");",
              "const openContent = page.locator(" +
                JSON.stringify(OPEN_SELECT_CONTENT_SELECTOR) +
                ");",
              "const option = openContent.locator(" +
                JSON.stringify(registeredSelector(plan, "muted")) +
                ");",
              "const panelRect = await panel.count() === 1 ? await panel.boundingBox() : null;",
              "const triggerRect = await trigger.count() === 1 ? await trigger.boundingBox() : null;",
              "const contentRect = await openContent.count() === 1 ? await openContent.boundingBox() : null;",
              "const optionRect = await option.count() === 1 ? await option.boundingBox() : null;",
              'const menuId = await openContent.count() === 1 ? await openContent.getAttribute("id") : null;',
              "const authorityOptionPreconditionFailed =",
              'typeof authority.baselineColor !== "string"',
              "authority.baselineColor.length === 0",
              'typeof authority.menuId !== "string"',
              "authority.menuId.length === 0",
              "await panel.count() !== 1",
              "!(await panel.isVisible())",
              "!positive(panelRect)",
              "await trigger.count() !== 1",
              "!(await trigger.isVisible())",
              "!positive(triggerRect)",
              "await openContent.count() !== 1",
              "!(await openContent.isVisible())",
              "!positive(contentRect)",
              "await option.count() !== 1",
              "!(await option.isVisible())",
              "!positive(optionRect)",
              "menuId !== authority.menuId",
              'await trigger.getAttribute("aria-controls") !== authority.menuId',
              'await trigger.getAttribute("aria-expanded") !== "true"',
              "if (authorityOptionPreconditionFailed) return fail(failureClass);",
              "await option.click({ timeout: 30000 });",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const stabilityHorizonMs = 600;",
              "let settledSince = null;",
              "let settledSampleCount = 0;",
              toneSelectResetSettlementBlock,
              "const deadline = Date.now() + 30000;",
              "while (Date.now() < deadline)",
              "const currentPanel = page.locator(" +
                JSON.stringify('[data-custom-screen-entry-presentation-panel="true"]') +
                ");",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const teardownSample = await sampleAtomicTeardown();",
              "if (!teardownSample.structuralClosed)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
              "if (!teardownSample.interactionHandoff)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[3]) + ";",
              'const presentationDirty = currentPanel.getByText("Unsaved presentation", { exact: true });',
              'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
              "const presentationDirtyRect = await presentationDirty.count() === 1 ? await presentationDirty.boundingBox() : null;",
              "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
              "const dirtyBadges =",
              "await presentationDirty.count() === 1",
              "await presentationDirty.isVisible()",
              "positive(presentationDirtyRect)",
              "await contentDirty.count() === 1",
              "await contentDirty.isVisible()",
              "positive(contentDirtyRect)",
              "if (!dirtyBadges)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[4]) + ";",
              "const targetRoot = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "blockRoot", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const selectionHandle = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "selectBlock", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                  ])
                ) +
                ");",
              "const textbox = page.locator(" +
                JSON.stringify(
                  registeredSelector(plan, "contentEditable", [
                    plan.fixtureBlueprint.screen.blockIds[toneFlowConfig.targetBlockKey],
                    toneFlowConfig.fieldLabel,
                  ])
                ) +
                ");",
              "const targetRootRect = await targetRoot.count() === 1 ? await targetRoot.boundingBox() : null;",
              "const selectionHandleRect = await selectionHandle.count() === 1 ? await selectionHandle.boundingBox() : null;",
              "const textboxRect = await textbox.count() === 1 ? await textbox.boundingBox() : null;",
              "const textboxText = await textbox.count() === 1 ? await textbox.textContent() : null;",
              "const textboxFocused = await textbox.count() === 1 ? await textbox.evaluate((node) => node === document.activeElement) : true;",
              "const selectionOverride =",
              "await targetRoot.count() === 1",
              "await targetRoot.isVisible()",
              "positive(targetRootRect)",
              'await targetRoot.getAttribute("data-selected") === "true"',
              'await targetRoot.getAttribute("data-screen-presentation-override") === "true"',
              "await selectionHandle.count() === 1",
              "await selectionHandle.isVisible()",
              "positive(selectionHandleRect)",
              'await selectionHandle.getAttribute("aria-pressed") === "true"',
              "await textbox.count() === 1",
              "await textbox.isVisible()",
              "positive(textboxRect)",
              "textboxText === " +
                JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
              "textboxFocused === false",
              "if (!selectionOverride)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[5]) + ";",
              'const textboxClassName = (await textbox.getAttribute("class")) ?? "";',
              'const mutedClass = textboxClassName.split(/\\s+/u).includes("text-muted-foreground");',
              "if (!mutedClass)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) + ";",
              "const currentColor = await textbox.evaluate((node) => getComputedStyle(node).color);",
              "const completePostcondition =",
              'typeof currentColor === "string"',
              "currentColor.length > 0",
              "currentColor !== authority.baselineColor",
              "if (!completePostcondition)",
              "const sampledAt = Date.now();",
              "if (settledSince === null) settledSince = sampledAt;",
              "settledSampleCount += 1;",
              "sampledAt - settledSince < stabilityHorizonMs",
              "settledSampleCount < 2",
              "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
              "!finalAtomicTeardownSample.structuralClosed",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "!finalAtomicTeardownSample.interactionHandoff",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
              "return true;",
              "return fail(failureClass);",
              "} catch {",
            ];
      const required = [...commonRequired, ...phaseRequired];
      const orderedTokens =
        toneFlowConfig.phase === "open"
          ? [
              "let failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[0]) + ";",
              "const initialPanel = page.locator(",
              "const targetPreconditionFailed =",
              "if (targetPreconditionFailed) return fail(failureClass);",
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const preconditionDeadline = Date.now() + 30000;",
              "const settledPanel = page.locator(",
              'const contentDirty = page.getByText("Unsaved changes", { exact: true });',
              "const contentDirtyRect = await contentDirty.count() === 1 ? await contentDirty.boundingBox() : null;",
              "const settledTextboxText = await settledTextbox.count() === 1 ? await settledTextbox.textContent() : null;",
              "const settledTextboxFocused = await settledTextbox.count() === 1 ? await settledTextbox.evaluate((node) => node === document.activeElement) : true;",
              "await settledTargetRoot.isVisible() &&",
              "positive(settledTargetRootRect) &&",
              "await settledSelectionHandle.isVisible() &&",
              "positive(settledSelectionHandleRect) &&",
              "settledTextboxText === " +
                JSON.stringify(plan.fixtureBlueprint.entry[toneFlowConfig.expectedDraftKey]),
              "settledTextboxFocused === false",
              "await contentDirty.count() === 1 &&",
              "await contentDirty.isVisible() &&",
              "positive(contentDirtyRect)",
              "baselineColor = await settledTextbox.evaluate((node) => getComputedStyle(node).color);",
              'if (typeof baselineColor !== "string" || baselineColor.length === 0) return fail(failureClass);',
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[2]) + ";",
              "const panel = page.locator(",
              "if (await panel.count() !== 1 || await trigger.count() !== 1 || !(await trigger.isVisible()) || !positive(triggerRect)) return fail(failureClass);",
              "await trigger.click({ timeout: 30000 });",
              "failureClass = " + JSON.stringify(TONE_OPEN_BROWSER_FAILURE_CLASSES[3]) + ";",
              "const openContent = page.locator(",
              "page.context().__wf540Remember(",
            ]
          : [
              "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
              "const sampleAtomicTeardown = () => page.evaluate(",
              "const structuralClosed =",
              "const interactionHandoff =",
              "return { interactionHandoff, structuralClosed };",
              "const authority = page.context().__wf540Recall(",
              "const panel = page.locator(",
              "const trigger = panel.locator(",
              "const openContent = page.locator(",
              "const option = openContent.locator(",
              "const panelRect =",
              "const triggerRect =",
              "const contentRect =",
              "const optionRect =",
              "const authorityOptionPreconditionFailed =",
              "if (authorityOptionPreconditionFailed) return fail(failureClass);",
              "await option.click({ timeout: 30000 });",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const stabilityHorizonMs = 600;",
              "let settledSince = null;",
              "let settledSampleCount = 0;",
              "const resetSettlement = () => {",
              "const deadline = Date.now() + 30000;",
              "while (Date.now() < deadline)",
              "const currentPanel = page.locator(",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "const teardownSample = await sampleAtomicTeardown();",
              "if (!teardownSample.structuralClosed)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
              "if (!teardownSample.interactionHandoff)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[3]) + ";",
              "const presentationDirty =",
              "const contentDirty =",
              "const presentationDirtyRect =",
              "const contentDirtyRect =",
              "const dirtyBadges =",
              "if (!dirtyBadges)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[4]) + ";",
              "const targetRoot = page.locator(",
              "const selectionHandle = page.locator(",
              "const textbox = page.locator(",
              "const targetRootRect =",
              "const selectionHandleRect =",
              "const textboxRect =",
              "const textboxText =",
              "const textboxFocused =",
              "const selectionOverride =",
              "if (!selectionOverride)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[5]) + ";",
              "const textboxClassName =",
              "const mutedClass =",
              "if (!mutedClass)",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) + ";",
              "const currentColor =",
              "const completePostcondition =",
              "currentColor !== authority.baselineColor",
              "if (!completePostcondition)",
              "const sampledAt = Date.now();",
              "if (settledSince === null) settledSince = sampledAt;",
              "settledSampleCount += 1;",
              "sampledAt - settledSince < stabilityHorizonMs",
              "settledSampleCount < 2",
              "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
              "!finalAtomicTeardownSample.structuralClosed",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[1]) + ";",
              "!finalAtomicTeardownSample.interactionHandoff",
              "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";",
              "return true;",
              "return fail(failureClass);",
              "} catch {",
            ];
      const validates = (source) => {
        if (!required.every((token) => source.includes(token))) return false;
        if (
          source.split("return fail(failureClass);").length - 1 !==
            (toneFlowConfig.phase === "open" ? 7 : 3) ||
          source.includes('throw new Error("wf540_tone_') ||
          source.includes(".fill(") ||
          source.includes(".blur(") ||
          source.includes("catch (") ||
          source.includes("error.message") ||
          source.includes("String(error") ||
          (toneFlowConfig.phase === "select" &&
            (source.split("const deadline = Date.now() + 30000;").length - 1 !== 1 ||
              source.split("while (Date.now() < deadline)").length - 1 !== 1 ||
              source.includes("failureStage") ||
              source.includes("advance(") ||
              source.includes("nextFailureClass") ||
              source.split("sampleAtomicTeardown();").length - 1 !== 2 ||
              source.split("const finalAtomicTeardownSample = await sampleAtomicTeardown();")
                .length -
                1 !==
                1 ||
              source.split("resetSettlement();").length - 1 !== 8 ||
              source.split("const stabilityHorizonMs = 600;").length - 1 !== 1 ||
              source.includes("MutationObserver") ||
              source.includes("__wf540LockOwnerTimeline_") ||
              source.includes("timelineInstalled") ||
              source.includes("const menuClosed =") ||
              source.includes("const bodyInteraction =") ||
              source.includes("currentSelectContent") ||
              source.includes("currentTrigger") ||
              source.includes("page.keyboard") ||
              source.includes('press("Escape")') ||
              !TONE_SELECT_BROWSER_FAILURE_CLASSES.every(
                (currentFailureClass, index) =>
                  source.split(JSON.stringify(currentFailureClass)).length - 1 ===
                  (index === 1 ? 3 : index === 2 ? 2 : 1)
              )))
        ) {
          return false;
        }
        let previousIndex = -1;
        for (const token of orderedTokens) {
          const tokenIndex = source.indexOf(token, previousIndex + 1);
          if (tokenIndex <= previousIndex) return false;
          previousIndex = tokenIndex;
        }
        return true;
      };
      if (!validates(compiledSource)) {
        const missingRequired = required.flatMap((token, index) =>
          compiledSource.includes(token) ? [] : [index]
        );
        let previousIndex = -1;
        const brokenOrder = [];
        for (const [index, token] of orderedTokens.entries()) {
          const tokenIndex = compiledSource.indexOf(token, previousIndex + 1);
          if (tokenIndex <= previousIndex) brokenOrder.push(index);
          else previousIndex = tokenIndex;
        }
        throw new Error(
          action.id +
            " tone flow source contract drift required=" +
            missingRequired.join(",") +
            " order=" +
            brokenOrder.join(",")
        );
      }
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        required,
        action.id + " tone flow settlement"
      );
      for (let index = 1; index < orderedTokens.length; index += 1) {
        const left = orderedTokens[index - 1];
        const right = orderedTokens[index];
        const marker = "__WF540_TONE_ORDER_MUTANT_" + index + "__";
        const mutant = compiledSource
          .replace(left, marker)
          .replace(right, left)
          .replace(marker, right);
        assertNegative(!validates(mutant), action.id + " tone flow order mutant " + index);
      }
      const boundCatchMutant = compiledSource.replace("} catch {", "} catch (error) {");
      assertNegative(!validates(boundCatchMutant), action.id + " tone flow bound catch mutant");
      if (toneFlowConfig.phase === "open") observedToneMenuOpenActionIds.push(action.id);
      else {
        for (const [label, mutant] of [
          [
            "short stability horizon",
            compiledSource.replace(
              "const stabilityHorizonMs = 600;",
              "const stabilityHorizonMs = 0;"
            ),
          ],
          [
            "missing final atomic teardown",
            compiledSource.replace(
              "const finalAtomicTeardownSample = await sampleAtomicTeardown();",
              "const finalAtomicTeardownSample = teardownSample;"
            ),
          ],
          [
            "missing failed-condition reset",
            compiledSource.replace("resetSettlement();", "void 0;"),
          ],
          [
            "no-op reset helper",
            compiledSource.replace(
              toneSelectResetSettlementBlock,
              [
                "const resetSettlement = () => {",
                "                void settledSince;",
                "                void settledSampleCount;",
                "              };",
              ].join("\n")
            ),
          ],
          [
            "scroll-lock negation flip",
            compiledSource.replace(
              toneSelectUnlockedScrollToken,
              'body.hasAttribute("data-scroll-locked")'
            ),
          ],
          [
            "missing panel positive geometry",
            compiledSource.replace(toneSelectPanelGeometryToken, "true &&"),
          ],
          [
            "missing trigger positive geometry",
            compiledSource.replace(toneSelectTriggerGeometryToken, "true &&"),
          ],
          [
            "restored monotonic failure stage",
            compiledSource.replace(
              "let failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) + ";",
              "let failureClass = " +
                JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[0]) +
                "; let failureStage = 0;"
            ),
          ],
          [
            "stale unlock-to-relock classification",
            (() => {
              const exactHandoffAssignment =
                "failureClass = " + JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[2]) + ";";
              const finalAssignmentIndex = compiledSource.lastIndexOf(exactHandoffAssignment);
              invariant(
                finalAssignmentIndex >= 0,
                action.id + " tone-select final handoff assignment anchor drift"
              );
              return (
                compiledSource.slice(0, finalAssignmentIndex) +
                "failureClass = " +
                JSON.stringify(TONE_SELECT_BROWSER_FAILURE_CLASSES[6]) +
                ";" +
                compiledSource.slice(finalAssignmentIndex + exactHandoffAssignment.length)
              );
            })(),
          ],
        ]) {
          assertNegative(!validates(mutant), action.id + " tone-select " + label + " mutant");
        }
        observedToneMutedActionIds.push(action.id);
      }
    }
    if (action.id === "tk-011-preview-proof") {
      const required = [
        '"paletteSelectors":' + encodedPaletteSelectors,
        "const shell = await exactVisibleWithin(page, config.selectors.previewShell",
        "const outer = await exactVisibleWithin(shell, config.paletteSelectors.outerTabs",
        "await exactVisibleWithin(outer, config.paletteSelectors.innerTabs",
        "if (await locator.count() !== 1) return null",
        "return positive(rect) && await locator.isVisible() ? locator : null",
        "output = { shellVisible: true, device, outerTabsVisible: true, innerTabsVisible: true }",
      ];
      const validates = (source) =>
        required.every((token) => source.includes(token)) &&
        source.includes(JSON.stringify(registeredSelector(plan, "previewShell"))) &&
        source.includes(JSON.stringify(registeredSelector(plan, "canvasScroller"))) &&
        !source.includes("config.palette.outerTabs") &&
        !source.includes("config.palette.innerTabs");
      invariant(validates(compiledSource), "tk-011 preview/entry observation scope drift");
      assertSourceMutantsRejected(compiledSource, validates, required.slice(0, 6), "tk-011");
    }
    if (action.id === "tk-027-ids-proof") {
      const required = [
        '"paletteSelectors":' + encodedPaletteSelectors,
        "const surface = await exactVisibleWithin(page, surfaceSelector",
        "const outer = await exactVisibleWithin(surface, config.paletteSelectors.outerTabs",
        "const inner = await exactVisibleWithin(outer, config.paletteSelectors.innerTabs",
        "return { outer: await ownedTabs(outer), inner: await ownedTabs(inner) }",
        "const builderRealm = await readRendererRealm(config.selectors.canvas)",
        "const previewRealm = await readRendererRealm(config.selectors.previewShell)",
        "const ids = collectRendererIds([builderRealm, previewRealm])",
        "function collectRendererIdsExact(realms)",
      ];
      const validates = (source) =>
        required.every((token) => source.includes(token)) &&
        source.includes(JSON.stringify(registeredSelector(plan, "canvas"))) &&
        source.includes(JSON.stringify(registeredSelector(plan, "previewShell"))) &&
        !source.includes("config.palette.outerTabs") &&
        !source.includes("config.palette.innerTabs");
      invariant(validates(compiledSource), "tk-027 renderer/entry assertion scope drift");
      assertSourceMutantsRejected(compiledSource, validates, required.slice(1, 4), "tk-027");
    }
    if (action.id === "tc-041-armed-slot") {
      invariant(
        compiledSource.includes('"name":"armed-slot-equals-active-tab"') &&
          compiledSource.includes("const canvas = await one(config.selectors.canvas)") &&
          compiledSource.includes("exactVisibleWithin(canvas, config.paletteSelectors.outerTabs"),
        "tc-041 canvas-only armed-slot scope drift"
      );
    }
    if (action.id === "dg-003-builder") {
      const builderUrl = expandRegisteredPath(plan, "builder", sourceCaptures);
      const navigationToken =
        "await page.goto(" + JSON.stringify(builderUrl) + ", { timeout: 540000 });";
      const exactUrlToken = "if (page.url() !== " + JSON.stringify(builderUrl) + ")";
      const required = [
        'const dirtyIndicator = page.getByText("Unsaved changes", { exact: true });',
        'await dirtyIndicator.waitFor({ state: "visible", timeout: 30000 });',
        "if (await dirtyIndicator.count() !== 1)",
        'const retainedDialogListeners = page.listeners("dialog");',
        "if (retainedDialogListeners.length !== 1)",
        'for (const listener of retainedDialogListeners) page.off("dialog", listener);',
        'page.on("dialog", handleDialog);',
        'dialogSettlements.push(type === "beforeunload" ? dialog.accept() : dialog.dismiss());',
        "let navigationFailed = false;",
        navigationToken,
        "} finally {",
        "const settlements = await Promise.allSettled(dialogSettlements);",
        'dialogSettlementFailed = settlements.some(({ status }) => status !== "fulfilled");',
        'page.off("dialog", handleDialog);',
        'for (const listener of retainedDialogListeners) page.on("dialog", listener);',
        'const restoredDialogListeners = page.listeners("dialog");',
        "restoredDialogListeners.length !== retainedDialogListeners.length",
        "listener !== retainedDialogListeners[index]",
        'if (navigationFailed) throw new Error("wf540_dg003_navigation");',
        'if (dialogSettlementFailed) throw new Error("wf540_dg003_dialog_settlement");',
        'if (dialogTypes.length !== 1 || dialogTypes[0] !== "beforeunload")',
        exactUrlToken,
        'await marker.waitFor({ state: "visible", timeout: 90000 });',
        "if (await marker.count() !== 1)",
      ];
      const validates = (source) => {
        const dirtyReadIndex = source.indexOf(required[0]);
        const listenerReadIndex = source.indexOf(required[3]);
        const listenerRemoveIndex = source.indexOf(required[5]);
        const handlerInstallIndex = source.indexOf(required[6]);
        const navigationIndex = source.indexOf(navigationToken);
        const finallyIndex = source.indexOf(required[10], navigationIndex);
        const handlerRemoveIndex = source.indexOf(required[13]);
        const listenerRestoreIndex = source.indexOf(required[14]);
        const restoredListenerReadIndex = source.indexOf(required[15]);
        const navigationFailureIndex = source.indexOf(required[18]);
        const dialogCardinalityIndex = source.indexOf(required[20]);
        const markerWaitIndex = source.indexOf(required[22]);
        return (
          required.every((token) => source.includes(token)) &&
          dirtyReadIndex >= 0 &&
          listenerReadIndex > dirtyReadIndex &&
          listenerRemoveIndex > listenerReadIndex &&
          handlerInstallIndex > listenerRemoveIndex &&
          navigationIndex > handlerInstallIndex &&
          finallyIndex > navigationIndex &&
          handlerRemoveIndex > navigationIndex &&
          listenerRestoreIndex > handlerRemoveIndex &&
          restoredListenerReadIndex > listenerRestoreIndex &&
          navigationFailureIndex > restoredListenerReadIndex &&
          dialogCardinalityIndex > navigationFailureIndex &&
          markerWaitIndex > dialogCardinalityIndex
        );
      };
      invariant(validates(compiledSource), "dg-003 exact beforeunload handoff source drift");
      assertSourceMutantsRejected(
        compiledSource,
        validates,
        required,
        "dg-003 exact beforeunload handoff"
      );
    }
    if (action.id === "tk-022-aria-proof") {
      invariant(
        compiledSource.includes('"name":"aria-reciprocal"') &&
          compiledSource.includes("exactVisibleWithin(page, config.selectors.previewShell") &&
          compiledSource.includes(
            "exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs"
          ),
        "tk-022 preview-only ARIA scope drift"
      );
    }
    if (action.id === "dg-017-builder-confirm-proof") {
      invariant(
        compiledSource.includes(
          JSON.stringify(expandRegisteredPath(plan, "records", sourceCaptures))
        ) &&
          compiledSource.includes(JSON.stringify(registeredSelector(plan, "recordActions"))) &&
          compiledSource.includes("const deadline = Date.now() + 90000") &&
          compiledSource.includes("page.url() === expectedRecordsUrl") &&
          compiledSource.includes("await recordActions.isVisible()") &&
          compiledSource.includes("positive(recordActionsRect)") &&
          compiledSource.includes("builderCanvasCount === 0") &&
          compiledSource.includes("builderDirtyBadgeCount === 0") &&
          !compiledSource.includes("!page.url().includes(config.screenId)"),
        "dg-017 settled records-workspace proof source drift"
      );
    }
    if (action.id === "tk-026-nested-proof") {
      invariant(
        compiledSource.includes('"name":"nested-tabs-isolated"') &&
          compiledSource.includes("exactVisibleWithin(page, config.selectors.previewShell") &&
          compiledSource.includes(
            "exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs"
          ) &&
          compiledSource.includes("exactVisibleWithin(outer, config.paletteSelectors.innerTabs"),
        "tk-026 preview-only nested scope drift"
      );
    }
    if (action.id === "set-006-logger") {
      invariant(
        compiledSource.includes(
          "const freezeTree = function freezeJsonTreeExact(value, seen = new WeakSet())"
        ) &&
          compiledSource.includes(
            "for (const child of Object.values(value)) freezeJsonTreeExact(child, seen)"
          ) &&
          compiledSource.includes(
            "const frozenCopy = (value) => freezeTree(JSON.parse(JSON.stringify(value)))"
          ),
        "private sample deep-freeze authority drift"
      );
    }
    if (action.id === "rc-012c-picker-warm-proof") {
      invariant(
        compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")') &&
          compiledSource.includes('context.__wf540Remember("rc-002-private-authority"') &&
          compiledSource.includes("validateResetDraftAuthority(resetAuthority") &&
          compiledSource.includes("changedJsonPointers(config.entryBaseline, persisted.data)") &&
          !compiledSource.includes("config.selectors.relationA1") &&
          !compiledSource.includes("config.selectors.relationB2"),
        "rc-012c exhaustive reset authority source drift"
      );
    }
    if (action.id === "rc-017-unrelated-before") {
      invariant(
        compiledSource.includes('context.__wf540Recall("rc-002-private-authority")') &&
          compiledSource.includes('context.__wf540Remember("rc-017-private-authority"') &&
          compiledSource.includes(
            'const expectedDiff = ["/controls/unrelatedNote", "/presentation/tone"]'
          ) &&
          compiledSource.includes("changedJsonPointers(resetAuthority.draft, currentDraft)") &&
          compiledSource.includes("validateCurrentDraftAuthority(currentAuthority") &&
          compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")'),
        "rc-017 private full-draft authority drift"
      );
    }
    if (action.id === "rc-032-diff-proof") {
      invariant(
        compiledSource.includes('context.__wf540Recall("rc-017-private-authority")') &&
          compiledSource.includes("validateResetDraftAuthority(before.resetAuthority") &&
          compiledSource.includes("validateCurrentDraftAuthority(before") &&
          compiledSource.includes("changedJsonPointers(before.draft, currentDraft)") &&
          compiledSource.includes(
            'const relationRoots = ["/relations/relationA", "/relations/relationB"]'
          ) &&
          compiledSource.includes("const relationBefore = before.resetAuthority.draft.relations") &&
          compiledSource.includes('root.locator("[data-screen-relation-option-id]")') &&
          compiledSource.includes('mediaRoot.locator("[data-media-picker-selected-id]")') &&
          !compiledSource.includes('context.__wf540Recall("rc-002-private-authority")'),
        "rc-032 exact reset/current union-leaf authority drift"
      );
    }
    if (compiledSource.includes("context.__wf540ArmExpectedAuthChallenge({")) {
      authArmSourceActionIds.push(action.id);
    }
    if (compiledSource.includes("context.__wf540CloseExpectedAuthChallenge({")) {
      authCloseSourceActionIds.push(action.id);
    }
    if (action.kind === "authRateWindowBarrier") {
      authRateBarrierSourceActionIds.push(action.id);
      invariant(
        compiledSource.includes("if (61000 > 0)") &&
          compiledSource.includes('context.on("request", onRequest)') &&
          compiledSource.includes('context.off("request", onRequest)') &&
          compiledSource.includes("const parseHttpUrl = (value) =>") &&
          compiledSource.includes('parsedUrl.pathname.startsWith("/admin/api/auth/")') &&
          compiledSource.includes("invalidRequestUrl") &&
          !compiledSource.includes("new URL(") &&
          compiledSource.indexOf("const after = await sample()") <
            compiledSource.indexOf('context.off("request", onRequest)') &&
          compiledSource.includes("before.navigationCount !== after.navigationCount"),
        action.id + " auth rate barrier source contract drift"
      );
    }
    if (action.kind === "blocksBefore") {
      blockBaselineSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "insertPanel"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(registeredSelector(plan, "blockLibrary"))
          ) &&
          invocation.args[sourceIndex].includes("await insertPanel.click()") &&
          invocation.args[sourceIndex].includes('getAttribute("aria-pressed")') &&
          invocation.args[sourceIndex].includes("wf540_insert_panel_state") &&
          invocation.args[sourceIndex].includes("wf540_block_library_count"),
        action.id + " Insert-panel preparation source contract drift"
      );
    }
    if (action.id === "bi-020-media-route-setup") {
      mediaIsolationSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes("function assertTaskOwnedMediaListTransport") &&
          invocation.args[sourceIndex].includes("function isolateTaskOwnedMediaList") &&
          invocation.args[sourceIndex].includes('mediaType !== "application/json"') &&
          invocation.args[sourceIndex].includes('fail("fixture_cardinality")') &&
          invocation.args[sourceIndex].includes("responseBodyOverride") &&
          invocation.args[sourceIndex].includes('contentType: "application/json"') &&
          invocation.args[sourceIndex].includes(JSON.stringify(sourceCaptures.get("media.id"))) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(sourceCaptures.get("media.storage-key"))
          ),
        action.id + " task-owned media isolation source contract drift"
      );
    }
    if (invocation.args[sourceIndex].includes("wf540_record_actions_target")) {
      recordEntryMenuSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "recordActions"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(registeredSelector(plan, "editRecord"))
          ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(expandRegisteredPath(plan, "entry", sourceCaptures))
          ) &&
          invocation.args[sourceIndex].includes('[data-custom-screen-entry-document="true"]'),
        action.id + " record-entry source contract drift"
      );
    }
    if (invocation.args[sourceIndex].includes("wf540_record_actions_wait_empty_body")) {
      recordsWorkspaceSourceActionIds.push(action.id);
      invariant(
        invocation.args[sourceIndex].includes(
          JSON.stringify(registeredSelector(plan, "recordActions"))
        ) &&
          invocation.args[sourceIndex].includes(
            JSON.stringify(expandRegisteredPath(plan, "records", sourceCaptures))
          ),
        action.id + " records-workspace source contract drift"
      );
    }
    compiledRunCodeSources += 1;
  }
  invariant(compiledRunCodeSources === 392, "generated run-code source count drift");
  invariant(
    deepEqualJson(
      observedDirtyNavigationRequestActionIds,
      Object.keys(expectedDirtyNavigationRequestActionConfig)
    ),
    "dirty-navigation specialization ownership drift"
  );
  for (const actionId of DIRTY_NAVIGATION_REQUEST_ACTION_IDS) {
    invariant(
      resolveDirtyNavigationTargetTimeline(["scroll_locked", "target_missing"]) ===
        "target_missing" &&
        resolveDirtyNavigationTargetTimeline(["scroll_locked", "target_intercepted"]) ===
          "target_intercepted" &&
        resolveDirtyNavigationTargetTimeline(["target_intercepted", "inline_pointer_locked"]) ===
          "inline_pointer_locked" &&
        resolveDirtyNavigationTargetTimeline(["computed_pointer_locked", "hittable"]) === "click",
      actionId + " dirty-navigation latest-poll timeline drift"
    );
  }
  invariant(
    deepEqualJson(observedToneContentFillActionIds, TONE_CONTENT_FILL_ACTION_IDS),
    "tone content-fill specialization ownership drift"
  );
  invariant(
    deepEqualJson(observedToneMenuOpenActionIds, TONE_MENU_OPEN_ACTION_IDS),
    "tone-open specialization ownership drift"
  );
  invariant(
    deepEqualJson(observedToneMutedActionIds, TONE_MUTED_ACTION_IDS),
    "tone-muted specialization ownership drift"
  );
  invariant(
    deepEqualJson(observedAuthSettlementActionIds, authSettlementActionIds),
    "auth realm settlement action ownership drift"
  );
  invariant(
    deepEqualJson(AUTH_SETTLEMENT_ACTION_IDS, authSettlementActionIds),
    "classified auth settlement action ownership drift"
  );
  const failureFramesResult = await runFailureFramesSelfTest({
    authSettlementCompiledSources,
    buildFakeCapabilities,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    executeTask540SmokePlanWithAuthorityFactory,
    executionFixtures: failureActionExecutionResult,
    failureBoundary,
    normalizeBrowserCommandOutput,
    plan,
    selfTestContext,
  });
  const { bootstrapSettlementAction, successfulGeneratedFrame } = failureFramesResult;
  negativeCases += failureFramesResult.explicitNegativeCases;
  const {
    settlementTwinAction,
    settlementPrivateMarker,
    createSensitiveScanProbe,
    runSettlementDiagnosticCase,
    createRetainedExecution,
    runLocalAuthority,
  } = createSettlementDiagnosticHarness({
    LocalCommandAuthority,
    bootstrapSettlementAction,
    buildFakeCapabilities,
    compileActionExecutionSpec,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    diagnosticInput,
    executeTask540SmokePlanWithAuthorityFactory,
    incrementNegativeCases: () => {
      negativeCases += 1;
    },
    plan,
  });
  const credentialReceiptAction = plan.actionManifest.find(
    ({ id }) => id === "set-010-login-password"
  );
  invariant(credentialReceiptAction !== undefined, "credential receipt action is absent");
  const credentialSelector = registeredSelector(plan, "loginPassword");
  const credentialArgs = playwrightArgs("fill", credentialSelector, "ADMIN_PASSWORD");
  const credentialDisplayArgs = playwrightArgs("fill-secret");
  const credentialOutcome = {
    stdoutBytes: Buffer.from("\n"),
    stderrBytes: Buffer.alloc(0),
  };
  const credentialAuthorityResult = await runLocalAuthority(
    { action: credentialReceiptAction },
    {
      args: credentialArgs,
      displayArgs: credentialDisplayArgs,
      stdoutDiscarded: true,
      execution: createRetainedExecution({ stdout: Buffer.from("\n") }),
      sensitiveValues: [],
    }
  );
  invariant(
    credentialAuthorityResult.receipt.command ===
      shellDisplay("playwright-cli", credentialDisplayArgs) &&
      credentialAuthorityResult.receipt.sequence === 1 &&
      credentialAuthorityResult.receipt.status === 0 &&
      credentialAuthorityResult.receipt.stdoutBytes === 1 &&
      credentialAuthorityResult.receipt.stderrBytes === 0 &&
      credentialAuthorityResult.receipt.stdoutSha256 === LF_SHA256 &&
      credentialAuthorityResult.receipt.stderrSha256 === EMPTY_SHA256 &&
      credentialAuthorityResult.receipt.stdoutDiscarded === true &&
      credentialAuthorityResult.receipt.sanitizedOutput === "[discarded]" &&
      credentialAuthorityResult.stdout.equals(Buffer.from("\n")) &&
      credentialAuthorityResult.stderr.length === 0,
    "credential authority receipt integration drift"
  );
  for (const [label, override] of [
    ["program", { program: "node" }],
    ["args", { args: [...credentialArgs.slice(0, -1), "ADMIN_EMAIL"] }],
    ["display", { displayArgs: [...credentialDisplayArgs.slice(0, -1), "fill"] }],
    ["discard", { stdoutDiscarded: false }],
    ["status", { execution: createRetainedExecution({ code: 1 }) }],
    ["stdout", { execution: createRetainedExecution({ stdout: Buffer.alloc(0) }) }],
    [
      "stderr",
      {
        execution: createRetainedExecution({
          stdout: Buffer.from("\n"),
          stderr: Buffer.from("drift"),
        }),
      },
    ],
  ]) {
    await expectAsyncFailure(
      async () =>
        runLocalAuthority(
          { action: credentialReceiptAction },
          {
            args: credentialArgs,
            displayArgs: credentialDisplayArgs,
            stdoutDiscarded: true,
            execution: createRetainedExecution({ stdout: Buffer.from("\n") }),
            sensitiveValues: [],
            ...override,
          }
        ),
      "credential authority " + label + " mutation"
    );
    negativeCases += 1;
  }
  let credentialReceiptDigestCalls = 0;
  const credentialStreamIntegrity = buildBrowserStreamIntegrity(
    {
      action: credentialReceiptAction,
      program: "playwright-cli",
      args: credentialArgs,
      displayArgs: credentialDisplayArgs,
      stdoutDiscarded: true,
      outcome: credentialOutcome,
    },
    () => {
      credentialReceiptDigestCalls += 1;
      return "0".repeat(64);
    }
  );
  const normalizedCredentialOutput = await normalizeBrowserCommandOutput(
    {},
    credentialReceiptAction,
    credentialReceiptAction.executable,
    credentialOutcome.stdoutBytes,
    { args: credentialArgs, displayArgs: credentialDisplayArgs, stdoutDiscarded: true }
  );
  invariant(
    credentialReceiptDigestCalls === 0 &&
      deepEqualJson(credentialStreamIntegrity, {
        stdoutBytes: 1,
        stderrBytes: 0,
        stdoutSha256: LF_SHA256,
        stderrSha256: EMPTY_SHA256,
      }) &&
      normalizedCredentialOutput.equals(Buffer.from('{"ok":true}\n')),
    "credential receipt fixed-integrity drift"
  );
  for (const [label, override] of [
    ["stdout", { outcome: { ...credentialOutcome, stdoutBytes: Buffer.alloc(0) } }],
    ["stderr", { outcome: { ...credentialOutcome, stderrBytes: Buffer.from("drift") } }],
    ["display", { displayArgs: [...credentialDisplayArgs.slice(0, -1), "fill"] }],
    ["discard", { stdoutDiscarded: false }],
  ]) {
    await expectAsyncFailure(
      async () =>
        buildBrowserStreamIntegrity({
          action: credentialReceiptAction,
          program: "playwright-cli",
          args: credentialArgs,
          displayArgs: credentialDisplayArgs,
          stdoutDiscarded: true,
          outcome: credentialOutcome,
          ...override,
        }),
      "credential receipt " + label
    );
  }
  let ordinaryReceiptDigestCalls = 0;
  const ordinaryOutcome = {
    stdoutBytes: Buffer.from('{"ok":true}\n'),
    stderrBytes: Buffer.alloc(0),
  };
  const ordinaryStreamIntegrity = buildBrowserStreamIntegrity(
    {
      action: settlementTwinAction,
      program: "playwright-cli",
      args: ["--raw", "self-test"],
      displayArgs: ["--raw", "self-test"],
      stdoutDiscarded: false,
      outcome: ordinaryOutcome,
    },
    (bytes) => {
      ordinaryReceiptDigestCalls += 1;
      return hashBytes(bytes);
    }
  );
  invariant(
    ordinaryReceiptDigestCalls === 2 &&
      ordinaryStreamIntegrity.stdoutSha256 === hashBytes(ordinaryOutcome.stdoutBytes) &&
      ordinaryStreamIntegrity.stderrSha256 === EMPTY_SHA256,
    "ordinary receipt evidence digest drift"
  );
  const exactLoginFrame = Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8");
  await runSettlementDiagnosticCase({
    label: "exact browser frame before secret scan",
    expectedFailureClass: "login_route",
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactLoginFrame }),
        sensitiveValues: ["login_route"],
      }),
  });
  const exactToneOpenFrame = Buffer.from(
    TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact tone-open frame before secret scan",
    actionId: toneOpenFailureAction.id,
    expectedFailureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneOpenFrame }),
        sensitiveValues: [TONE_OPEN_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const exactToneSelectFrame = Buffer.from(
    TONE_SELECT_FAILURE_FRAMES[TONE_SELECT_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact tone-select frame before secret scan",
    actionId: toneSelectFailureAction.id,
    expectedFailureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame }),
        sensitiveValues: [TONE_SELECT_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const exactDirtyNavigationFrame = Buffer.from(
    DIRTY_NAVIGATION_FAILURE_FRAMES[DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact dirty-navigation frame before secret scan",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
        sensitiveValues: [DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const executeProgramSource = LocalCommandAuthority.prototype.executeProgram.toString();
  const dirtyClassifierStart = executeProgramSource.indexOf(
    "const exactDirtyNavigationFailureClass ="
  );
  const dirtyClassifierEnd = executeProgramSource.indexOf(
    "const sensitiveOutput =",
    dirtyClassifierStart
  );
  invariant(
    dirtyClassifierStart >= 0 && dirtyClassifierEnd > dirtyClassifierStart,
    "dirty-navigation process classifier source boundary drift"
  );
  const dirtyClassifierSource = executeProgramSource.slice(
    dirtyClassifierStart,
    dirtyClassifierEnd
  );
  const dirtyClassifierGuardTokens = [
    'program === "playwright-cli" &&',
    "repositoryFailure === null &&",
    "outcome.successfulBoundedAndAbsent",
  ];
  const validatesDirtyClassifierSource = (source) => {
    const required = [
      "const exactDirtyNavigationFailureClass =",
      ...dirtyClassifierGuardTokens,
      "? classifyPrivateDirtyNavigationFailureFrame(action.id, outcome.stdoutBytes)",
      ": null;",
    ];
    let previousIndex = -1;
    for (const token of required) {
      const tokenIndex = source.indexOf(token, previousIndex + 1);
      if (tokenIndex <= previousIndex) return false;
      previousIndex = tokenIndex;
    }
    return (
      source.split("classifyPrivateDirtyNavigationFailureFrame").length - 1 === 1 &&
      dirtyClassifierGuardTokens.every((token) => source.split(token).length - 1 === 1)
    );
  };
  invariant(
    validatesDirtyClassifierSource(dirtyClassifierSource),
    "dirty-navigation exact-frame classifier guard drift"
  );
  for (const [index, guardToken] of dirtyClassifierGuardTokens.entries()) {
    const mutant = dirtyClassifierSource.replace(
      guardToken,
      index === dirtyClassifierGuardTokens.length - 1 ? "true" : ""
    );
    assertNegative(
      !validatesDirtyClassifierSource(mutant),
      "dirty-navigation classifier removed guard mutant " + index
    );
  }
  negativeCases += dirtyClassifierGuardTokens.length;

  await runSettlementDiagnosticCase({
    label: "non-playwright exact dirty-navigation frame remains generic",
    actionId: dirtyNavigationFailureAction.id,
    operationMustReject: false,
    operation: (context) =>
      runLocalAuthority(context, {
        program: "bun",
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
      }),
  });
  await runSettlementDiagnosticCase({
    label: "exact dirty-navigation frame repository boundary precedence",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: "repository_boundary_failed",
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-open frame repository boundary precedence",
    actionId: toneOpenFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneOpenFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-open process failure remains unclassified",
    actionId: toneOpenFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: Buffer.from("### Error\nsafe\n"), code: 1 }),
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-select frame repository boundary precedence",
    actionId: toneSelectFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-select process failure remains unclassified",
    actionId: toneSelectFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame, code: 1 }),
      }),
  });
  for (const [label, stdout] of [
    ["non-playwright exact browser frame", exactLoginFrame],
    ["non-playwright browser marker", Buffer.from("### Error\nsafe\n")],
  ]) {
    await runSettlementDiagnosticCase({
      label,
      operationMustReject: false,
      operation: (context) =>
        runLocalAuthority(context, {
          program: "bun",
          execution: createRetainedExecution({ stdout }),
        }),
    });
  }
  for (const [label, stdout, collidingSecret] of [
    ["non-playwright exact browser frame secret scan", exactLoginFrame, "login_route"],
    ["non-playwright browser marker secret scan", Buffer.from("### Error\nsafe\n"), "### Error"],
  ]) {
    const scanProbe = createSensitiveScanProbe(collidingSecret);
    await runSettlementDiagnosticCase({
      label,
      operation: (context) =>
        runLocalAuthority(context, {
          program: "bun",
          execution: createRetainedExecution({ stdout }),
          sensitiveValues: scanProbe.sensitiveValues,
        }),
    });
    invariant(scanProbe.calls() === 1, label + " did not execute the secret scan");
  }
  const processCases = [
    [
      "process output precedence",
      "process_output_limit",
      { stdoutExceeded: true, timedOut: true, spawnError: true, terminationAbsent: false },
    ],
    [
      "process timeout precedence",
      "process_timeout",
      { timedOut: true, spawnError: true, terminationAbsent: false },
    ],
    ["process spawn anomaly", "process_runner_failed", { spawnError: true }],
    ["process runner anomaly", "process_runner_failed", { terminationAbsent: false }],
    [
      "browser error precedence",
      "browser_error_frame",
      { stdout: Buffer.from("### Error\nsafe\n"), stderr: Buffer.from("safe stderr"), code: 1 },
    ],
    ["process stderr precedence", "process_stderr_rejected", { stderr: Buffer.from("safe") }],
    ["process exit precedence", "process_exit_failed", { code: 1 }],
  ];
  const exactDirtyNavigationProcessCases = [
    ["stdout output bound", "process_output_limit", { stdoutExceeded: true }],
    ["stderr output bound", "process_output_limit", { stderrExceeded: true }],
    ["timeout", "process_timeout", { timedOut: true }],
    ["spawn anomaly", "process_runner_failed", { spawnError: true }],
    ["termination anomaly", "process_runner_failed", { terminationAbsent: false }],
    ["stderr rejection", "process_stderr_rejected", { stderr: Buffer.from("safe") }],
    ["exit failure", "process_exit_failed", { code: 1 }],
    [
      "overlapping process flags",
      "process_output_limit",
      {
        stdoutExceeded: true,
        stderrExceeded: true,
        timedOut: true,
        spawnError: true,
        terminationAbsent: false,
        stderr: Buffer.from("safe"),
        code: 1,
      },
    ],
  ];
  for (const [label, expectedFailureClass, executionOptions] of exactDirtyNavigationProcessCases) {
    await runSettlementDiagnosticCase({
      label: "exact dirty-navigation frame plus " + label,
      actionId: dirtyNavigationFailureAction.id,
      expectedFailureClass,
      operation: (context) =>
        runLocalAuthority(context, {
          execution: createRetainedExecution({
            ...executionOptions,
            stdout: exactDirtyNavigationFrame,
          }),
        }),
    });
  }
  for (const [label, failureClass, executionOptions] of processCases) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, failureClass],
      [dirtyNavigationFailureAction.id, failureClass],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(executionOptions),
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "process_runner_failed"],
    [dirtyNavigationFailureAction.id, "process_runner_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "runner throw " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) => runLocalAuthority(context, { runnerThrows: true }),
    });
  }
  const cleanMalformedExecution = Object.freeze({
    ...createRetainedExecution(),
    completion: undefined,
  });
  const secretGetterMalformedExecution = Object.freeze({
    timedOut: false,
    spawnError: false,
    stdout: Object.freeze({
      bytes: Buffer.from(settlementPrivateMarker + "\n"),
      exceeded: false,
    }),
    stderr: Object.freeze({ bytes: Buffer.alloc(0), exceeded: false }),
    get completion() {
      throw new Error(settlementPrivateMarker);
    },
    termination: Object.freeze({ absent: true }),
  });
  for (const [label, execution, postSnapshotThrows] of [
    ["clean malformed process result", cleanMalformedExecution, false],
    ["secret getter malformed process result", secretGetterMalformedExecution, true],
  ]) {
    for (const actionId of [bootstrapSettlementAction.id, settlementTwinAction.id]) {
      const scanProbe =
        execution === secretGetterMalformedExecution
          ? createSensitiveScanProbe(settlementPrivateMarker)
          : null;
      await runSettlementDiagnosticCase({
        label: label + (actionId === settlementTwinAction.id ? " non-auth" : " auth"),
        actionId,
        operation: (context) =>
          runLocalAuthority(context, {
            execution,
            postSnapshotThrows,
            ...(scanProbe === null ? {} : { sensitiveValues: scanProbe.sensitiveValues }),
          }),
      });
      if (scanProbe !== null) {
        invariant(scanProbe.calls() === 1, label + " did not scan the retained secret buffer");
      }
    }
  }
  const overlappingProcessOptions = {
    stdoutExceeded: true,
    timedOut: true,
    spawnError: true,
    terminationAbsent: false,
    stderr: Buffer.from("safe"),
    code: 1,
  };
  const repositoryCases = [
    ["repository exact frame", { stdout: exactLoginFrame }],
    ...processCases.map(([label, , options]) => ["repository plus " + label, options]),
    ["repository plus overlapping process flags", overlappingProcessOptions],
  ];
  for (const [label, executionOptions] of repositoryCases) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "repository_boundary_failed"],
      [dirtyNavigationFailureAction.id, "repository_boundary_failed"],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(executionOptions),
            postSnapshotThrows: true,
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "repository_boundary_failed"],
    [dirtyNavigationFailureAction.id, "repository_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "pre-snapshot failure " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) =>
        runLocalAuthority(context, {
          preSnapshotThrows: true,
          assertAfter: ({ runnerCalls }) =>
            invariant(runnerCalls === 0, "pre-snapshot failure invoked process runner"),
        }),
    });
  }
  for (const [label, executionOptions] of [
    ...processCases.map(([caseLabel, , options]) => [caseLabel, options]),
    ["overlapping process flags", overlappingProcessOptions],
  ]) {
    for (const secretChannel of ["stdout", "stderr"]) {
      const secretExecutionOptions = {
        ...executionOptions,
        [secretChannel]: Buffer.from(settlementPrivateMarker + "\n"),
      };
      await runSettlementDiagnosticCase({
        label: label + " secret " + secretChannel,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(secretExecutionOptions),
          }),
      });
      await runSettlementDiagnosticCase({
        label: "repository plus " + label + " secret " + secretChannel,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(secretExecutionOptions),
            postSnapshotThrows: true,
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "receipt_boundary_failed"],
    [dirtyNavigationFailureAction.id, "receipt_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "command receipt " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) => runLocalAuthority(context, { receiptThrows: true }),
    });
  }

  const runBrowserOutputPipeline = async (
    context,
    bytes,
    {
      outputContract = plan.registries.outputs[context.action.outputSchemaId],
      onParseAttempt = () => {},
    } = {}
  ) => {
    const commandResult = Object.freeze({ stdout: bytes });
    const normalizedBytes = await normalizePrivateBrowserOutputWithAuthSettlementBoundary(
      context.action,
      commandResult,
      () => normalizeBrowserCommandOutput({}, context.action, context.action.executable, bytes, {})
    );
    const failureClass = classifyPrivateAuthSettlementFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (failureClass !== null) throw createPrivateAuthSettlementFailure(failureClass);
    const toneOpenFailureClass = classifyPrivateToneOpenFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (toneOpenFailureClass !== null) {
      throw createPrivateToneOpenFailure(toneOpenFailureClass);
    }
    const toneSelectFailureClass = classifyPrivateToneSelectFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (toneSelectFailureClass !== null) {
      throw createPrivateToneSelectFailure(toneSelectFailureClass);
    }
    const dirtyNavigationFailureClass = classifyPrivateDirtyNavigationFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (dirtyNavigationFailureClass !== null) {
      throw createPrivateDirtyNavigationFailure(dirtyNavigationFailureClass);
    }
    return parsePrivateBrowserSuccessWithAuthSettlementBoundary(
      context.action,
      commandResult,
      normalizedBytes,
      () => {
        onParseAttempt();
        return parseRegisteredOutput(
          outputContract,
          normalizedBytes,
          context.action.id,
          selfTestContext(plan, context.action.id)
        );
      }
    );
  };
  await runSettlementDiagnosticCase({
    label: "normalized tone-open frame pipeline",
    actionId: toneOpenFailureAction.id,
    expectedFailureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[3],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[3]], "utf8")
      ),
  });
  await runSettlementDiagnosticCase({
    label: "normalized tone-select frame pipeline",
    actionId: toneSelectFailureAction.id,
    expectedFailureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[5],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(TONE_SELECT_FAILURE_FRAMES[TONE_SELECT_BROWSER_FAILURE_CLASSES[5]], "utf8")
      ),
  });
  await runSettlementDiagnosticCase({
    label: "normalized dirty-navigation frame pipeline",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(
          DIRTY_NAVIGATION_FAILURE_FRAMES[DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9]],
          "utf8"
        )
      ),
  });
  for (const [label, bytes] of [
    ["invalid UTF-8", Buffer.from([0xc3, 0x28])],
    ["empty framing", Buffer.alloc(0)],
    ["multiline framing", Buffer.from("{}\n{}\n")],
  ]) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "output_normalization_failed"],
      [dirtyNavigationFailureAction.id, "output_normalization_failed"],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) => runBrowserOutputPipeline(context, bytes),
      });
    }
  }
  const genericSuccessFrames = [
    Buffer.from("{\n"),
    Buffer.from(
      canonicalJson({
        url: plan.fixtureBlueprint.origins.admin + "/admin/",
        userMenuVisible: "true",
        userName: "Bootstrap Admin",
      }) + "\n"
    ),
    Buffer.from(
      canonicalJson({
        rawUrl: "safe-value",
        url: plan.fixtureBlueprint.origins.admin + "/admin/",
        userMenuVisible: true,
        userName: "Bootstrap Admin",
      }) + "\n"
    ),
    Buffer.from(canonicalJson({ failureClass: "unknown", settled: false }) + "\n"),
    Buffer.from(canonicalJson({ failureClass: "process_timeout", settled: false }) + "\n"),
  ];
  for (const [index, bytes] of genericSuccessFrames.entries()) {
    await runSettlementDiagnosticCase({
      label: "ineligible success frame " + index,
      operation: (context) => runBrowserOutputPipeline(context, bytes),
    });
  }
  const semanticSuccessFrames = [
    {
      url: plan.fixtureBlueprint.origins.admin + "/admin/wrong",
      userMenuVisible: true,
      userName: "Bootstrap Admin",
    },
    {
      url: plan.fixtureBlueprint.origins.admin + "/admin/",
      userMenuVisible: false,
      userName: "Bootstrap Admin",
    },
    {
      url: plan.fixtureBlueprint.origins.admin + "/admin/",
      userMenuVisible: true,
      userName: "",
    },
  ];
  const authSettlementOutputContract =
    plan.registries.outputs[bootstrapSettlementAction.outputSchemaId];
  for (const [index, value] of semanticSuccessFrames.entries()) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "success_contract_failed"],
      [settlementTwinAction.id, null],
    ]) {
      let parseAttempts = 0;
      await runSettlementDiagnosticCase({
        label:
          "eligible semantic success failure " +
          index +
          (expectedFailureClass === null ? " non-auth" : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) =>
          runBrowserOutputPipeline(context, Buffer.from(canonicalJson(value) + "\n"), {
            outputContract: authSettlementOutputContract,
            onParseAttempt: () => {
              parseAttempts += 1;
            },
          }),
      });
      invariant(parseAttempts === 1, "semantic success twin did not reach the auth parser");
    }
  }
  invariant(
    isExactAuthSettlementSuccessFrame(bootstrapSettlementAction, successfulGeneratedFrame) &&
      !isExactAuthSettlementSuccessFrame(settlementTwinAction, successfulGeneratedFrame),
    "auth settlement exact success eligibility drift"
  );
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "invocation_boundary_failed"],
    [dirtyNavigationFailureAction.id, "invocation_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "invocation boundary " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: ({ action }) =>
        buildPrivateBrowserInvocationWithAuthSettlementBoundary(action, () =>
          compileActionExecutionSpec({ ...action, builder: "observe(" })
        ),
    });
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "receipt_boundary_failed"],
    [dirtyNavigationFailureAction.id, "receipt_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "final result validator " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: async (context) => {
        const commandResult = await runLocalAuthority(context);
        const receipt = deepFreezeExact({
          ...commandResult.receipt,
          method: null,
          pattern: null,
          sanitizedOutput: "{}",
        });
        return finalizePrivateBrowserResultWithAuthSettlementBoundary(
          context.action,
          context.action.executable,
          plan,
          commandResult,
          () =>
            deepFreezeExact({
              receipt,
              captureBindings: { unauthorized: "safe" },
              acquisitionDelta: emptyResourceDelta(),
              settledCreateOrigin: null,
            })
        );
      },
    });
  }
  invariant(
    deepEqualJson(observedPreviewRuntimeActionIds, [...previewRuntimeActionSelectors.keys()]),
    "nine preview runtime selector actions drift"
  );
  const requiredAuthRateBarrierIds = plan.requiredAuthRatePlan.epochs.flatMap(
    ({ endsAtBarrierActionId }) => (endsAtBarrierActionId === null ? [] : [endsAtBarrierActionId])
  );
  invariant(
    deepEqualJson(authRateBarrierSourceActionIds, requiredAuthRateBarrierIds),
    "auth rate barrier source ownership drift"
  );
  const disabledBarrierAction = plan.actionManifest.find(
    ({ id }) => id === requiredAuthRateBarrierIds[0]
  );
  invariant(disabledBarrierAction !== undefined, "disabled auth rate barrier fixture is absent");
  const disabledBarrierInvocation = buildBrowserInvocation(
    disabledBarrierAction,
    compileActionExecutionSpec(disabledBarrierAction),
    sourceCaptures,
    "/task540-self-test-root",
    "/task540-self-test-root/private",
    plan,
    { ...sourceContext, actionId: disabledBarrierAction.id },
    {
      csrfHeaderName: "x-self-test-csrf",
      authRatePolicy: disabledAuthRatePolicy,
    }
  );
  const disabledBarrierSource =
    disabledBarrierInvocation.args[disabledBarrierInvocation.args.indexOf("run-code") + 1];
  invariant(
    typeof disabledBarrierSource === "string" &&
      disabledBarrierSource.includes("if (0 > 0)") &&
      !disabledBarrierSource.includes("if (61000 > 0)"),
    "disabled auth rate barrier fast path drift"
  );
  const compileBarrierFunction = (policy, label) => {
    const source = buildAuthRateWindowBarrierSource(policy, plan);
    return new Script("(" + source + ")", { filename: label + ".self-test.js" }).runInThisContext();
  };
  const createBarrierHarness = (options = {}) => {
    const requestListeners = new Set();
    const waits = [];
    let rawUrl = plan.fixtureBlueprint.origins.admin + "/admin/custom-screens";
    let navigationCount = 4;
    let sampleIndex = 0;
    let onCalls = 0;
    let offCalls = 0;
    const rects = options.rects ?? [
      { x: 0, y: 0, width: 1280, height: 900 },
      { x: 0, y: 0, width: 1280, height: 900 },
    ];
    const harness = {
      emitAuthRequest() {
        this.emitRequestUrl(plan.fixtureBlueprint.origins.admin + "/admin/api/auth/install/status");
      },
      emitRequestUrl(value) {
        for (const listener of requestListeners) {
          listener({
            url: () => value,
          });
        }
      },
      setUrl(value) {
        rawUrl = value;
      },
      incrementNavigation() {
        navigationCount += 1;
      },
      get state() {
        return {
          listeners: requestListeners.size,
          offCalls,
          onCalls,
          sampleIndex,
          waits: [...waits],
        };
      },
    };
    const context = {
      on(event, listener) {
        invariant(event === "request" && typeof listener === "function", "barrier fake on drift");
        onCalls += 1;
        requestListeners.add(listener);
      },
      off(event, listener) {
        invariant(event === "request" && requestListeners.has(listener), "barrier fake off drift");
        offCalls += 1;
        requestListeners.delete(listener);
      },
    };
    const page = {
      context: () => context,
      locator(selector) {
        invariant(selector === "html", "barrier fake selector drift");
        const index = sampleIndex;
        return {
          count: async () => options.rootCount ?? 1,
          isVisible: async () => options.rootVisible ?? true,
          boundingBox: async () => {
            sampleIndex += 1;
            return rects[index] ?? rects.at(-1);
          },
        };
      },
      url: () => rawUrl,
      __wf540ReadNavigationCount: () => navigationCount,
      async waitForTimeout(milliseconds) {
        waits.push(milliseconds);
        if (options.onWait) await options.onWait(harness);
      },
    };
    return { harness, page };
  };
  const enabledBarrierFunction = compileBarrierFunction(
    enabledAuthRatePolicy,
    "enabled-auth-rate-barrier"
  );
  const enabledBarrierHarness = createBarrierHarness();
  const enabledBarrierOutput = await enabledBarrierFunction(enabledBarrierHarness.page);
  invariant(
    deepEqualJson(enabledBarrierOutput, { barrierSatisfied: true }) &&
      deepEqualJson(enabledBarrierHarness.harness.state.waits, [61_000]) &&
      enabledBarrierHarness.harness.state.sampleIndex === 2 &&
      enabledBarrierHarness.harness.state.onCalls === 1 &&
      enabledBarrierHarness.harness.state.offCalls === 1 &&
      enabledBarrierHarness.harness.state.listeners === 0,
    "enabled auth rate barrier execution drift"
  );
  const crossOriginBarrierHarness = createBarrierHarness({
    onWait: async (harness) =>
      harness.emitRequestUrl("https://assets.example.test:8443/app.js?theme=dark#bundle"),
  });
  invariant(
    deepEqualJson(await enabledBarrierFunction(crossOriginBarrierHarness.page), {
      barrierSatisfied: true,
    }) &&
      deepEqualJson(crossOriginBarrierHarness.harness.state.waits, [61_000]) &&
      crossOriginBarrierHarness.harness.state.listeners === 0 &&
      crossOriginBarrierHarness.harness.state.offCalls === 1,
    "valid cross-origin auth rate barrier request drift"
  );
  const disabledBarrierFunction = compileBarrierFunction(
    disabledAuthRatePolicy,
    "disabled-auth-rate-barrier"
  );
  const disabledExecutionHarness = createBarrierHarness();
  invariant(
    deepEqualJson(await disabledBarrierFunction(disabledExecutionHarness.page), {
      barrierSatisfied: true,
    }) &&
      disabledExecutionHarness.harness.state.waits.length === 0 &&
      disabledExecutionHarness.harness.state.sampleIndex === 2 &&
      disabledExecutionHarness.harness.state.listeners === 0,
    "disabled auth rate barrier execution drift"
  );
  for (const [label, options] of [
    ["barrier auth traffic", { onWait: async (harness) => harness.emitAuthRequest() }],
    ...[
      "not-an-http-url",
      "http://%/x",
      "http://[::1/x",
      "http://:80/x",
      "http://host:bad/x",
      "http://host:99999/x",
    ].map((value, index) => [
      "barrier invalid request URL " + (index + 1),
      { onWait: async (harness) => harness.emitRequestUrl(value) },
    ]),
    [
      "barrier URL drift",
      {
        onWait: async (harness) =>
          harness.setUrl(plan.fixtureBlueprint.origins.admin + "/admin/custom-screens/changed"),
      },
    ],
    [
      "barrier malformed page URL",
      { onWait: async (harness) => harness.setUrl("not-an-http-url") },
    ],
    ["barrier navigation drift", { onWait: async (harness) => harness.incrementNavigation() }],
    [
      "barrier after geometry",
      {
        rects: [
          { x: 0, y: 0, width: 1280, height: 900 },
          { x: 0, y: 0, width: 0, height: 900 },
        ],
      },
    ],
    [
      "barrier wait failure",
      {
        onWait: async () => {
          throw new Error("self-test wait");
        },
      },
    ],
  ]) {
    const failureHarness = createBarrierHarness(options);
    await expectAsyncFailure(async () => enabledBarrierFunction(failureHarness.page), label);
    invariant(
      failureHarness.harness.state.listeners === 0 &&
        failureHarness.harness.state.onCalls === 1 &&
        failureHarness.harness.state.offCalls === 1,
      label + " listener cleanup drift"
    );
  }
  invariant(
    deepEqualJson(
      authArmSourceActionIds.sort(),
      EXPECTED_AUTH_CHALLENGE_PHASES.map(({ armActionId }) => armActionId).sort()
    ),
    "expected auth arm source ownership drift"
  );
  invariant(
    deepEqualJson(
      authCloseSourceActionIds.sort(),
      EXPECTED_AUTH_CHALLENGE_PHASES.map(({ closeActionId }) => closeActionId).sort()
    ),
    "expected auth close source ownership drift"
  );
  invariant(
    blockBaselineSourceActionIds.length === 9 &&
      deepEqualJson(
        blockBaselineSourceActionIds,
        plan.actionManifest.filter(({ kind }) => kind === "blocksBefore").map(({ id }) => id)
      ),
    "block baseline Insert-panel source ownership drift"
  );
  invariant(
    deepEqualJson(mediaIsolationSourceActionIds, ["bi-020-media-route-setup"]),
    "task-owned media isolation source ownership drift"
  );
  invariant(
    deepEqualJson(recordEntryMenuSourceActionIds.sort(), [...RECORD_ENTRY_MENU_ACTION_IDS].sort()),
    "record-entry menu source ownership drift"
  );
  invariant(
    deepEqualJson(recordsWorkspaceSourceActionIds.sort(), [...RECORDS_WORKSPACE_ACTION_IDS].sort()),
    "records-workspace source ownership drift"
  );
  const successCapabilities = buildFakeCapabilities();
  const evidence = await executeSmokePlanCore(plan, successCapabilities);
  invariant(evidence.pass === true, "fake success evidence failed");
  const expectedManifestCallIds = plan.actionManifest.map(({ id }) => id);
  const observedManifestCallIds = successCapabilities.calls.slice(0, 496);
  invariant(
    assertOrderedManifestCallsExact(observedManifestCallIds, expectedManifestCallIds) === true,
    "one exact ordered action call per manifest row drift"
  );
  for (const [label, mutate] of [
    ["manifest call omission", (calls) => calls.splice(124, 1)],
    ["manifest call duplicate", (calls) => calls.splice(124, 0, calls[124])],
    [
      "manifest call reorder",
      (calls) => {
        [calls[124], calls[125]] = [calls[125], calls[124]];
      },
    ],
  ]) {
    await expectAsyncFailure(async () => {
      const calls = [...observedManifestCallIds];
      mutate(calls);
      assertOrderedManifestCallsExact(calls, expectedManifestCallIds);
    }, label);
  }
  invariant(
    deepEqualJson(
      successCapabilities.calls.slice(496, -1),
      successCapabilities.lastFinalPlan.actionTuples.map(
        ([resourceKey, operationKind]) => operationKind + ":" + resourceKey
      )
    ) && successCapabilities.calls.at(-1) === "finalize",
    "fake cleanup execution trace/order drift"
  );
  invariant(
    plan.requiredFixtureSubjectKeys.length * CLEANUP_OPERATION_KINDS.length === 45,
    "contract fixture cleanup cardinality drift"
  );
  invariant(
    evidence.cleanupReceipts.length === 72 &&
      evidence.cleanupReceipts.length ===
        evidence.resources.filter(
          ({ class: className, kind }) =>
            className === "delete" && !TERMINAL_RESOURCE_KINDS.has(kind)
        ).length *
          3,
    "ledger-derived persistent cleanup cardinality drift"
  );
  const lifecycleSeoRecords = successCapabilities.lastFinalPlan.ledger.filter(
    ({ kind }) => kind === "seo-document-entry"
  );
  const lifecycleSeoTargetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) =>
    fixtureCaptureValue(plan.fixtureSubjectCapture[entrySemantic], plan)
  ).sort();
  invariant(
    lifecycleSeoRecords.length === 6 &&
      deepEqualJson(
        lifecycleSeoRecords.map(({ identifier }) => identifier[2]).sort(),
        lifecycleSeoTargetIds
      ) &&
      evidence.resources.filter(({ kind }) => kind === "seo-document-entry").length === 6 &&
      evidence.cleanupReceipts.filter(({ subjectKind }) => subjectKind === "seo-document-entry")
        .length === 18,
    "full cleanup lifecycle did not cover all six exact SEO entry documents"
  );
  invariant(
    deepEqualJson(
      evidence.captureProjection.map(({ name }) => name),
      [...plan.requiredCaptureNames, ...plan.requiredRuntimeBlockCaptures]
    ) &&
      evidence.captureProjection.every(
        (row) =>
          deepEqualJson(Object.keys(row), ["name", "value"]) &&
          typeof row.name === "string" &&
          row.name.length > 0 &&
          typeof row.value === "string" &&
          row.value.length > 0
      ),
    "fake captures incomplete"
  );
  invariant(
    !canonicalJson(evidence).includes("private fake failure detail"),
    "private value leaked"
  );
  const nestedUnknownFinalization = structuredClone(successCapabilities.lastFinalization);
  nestedUnknownFinalization.host.children[0].unexpected = true;
  deepFreezeExact(nestedUnknownFinalization);
  await expectAsyncFailure(
    async () => assertCanonicalFinalization(nestedUnknownFinalization, plan),
    "nested finalization unknown property"
  );
  const rawMediaIds = {
    screen: fixtureCaptureValue("screen.id", plan),
    retryScreen: fixtureCaptureValue("retry-screen.id", plan),
    entry: fixtureCaptureValue("entry.id", plan),
    media: fixtureCaptureValue("media.id", plan),
  };
  const rawMediaKey = "2026/07/54000000-0000-4000-8000-000000000777.png";
  const rawMediaValues = [
    {
      id: rawMediaIds.screen,
      definition: {
        editorView: {
          document: {
            sections: [
              {
                blocks: [
                  { id: plan.fixtureBlueprint.screen.blockIds.raceImage, type: "image", slots: {} },
                ],
              },
            ],
          },
          bindings: [
            {
              blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
              propPath: "src",
              source: "entry",
              mode: "read",
              field: "raceImageId",
            },
          ],
        },
      },
    },
    {
      id: rawMediaIds.entry,
      data: { raceImageId: plan.fixtureBlueprint.media.missingBoundMediaId },
    },
    { id: rawMediaIds.media, key: rawMediaKey, url: "/media/" + rawMediaKey },
    {
      overrides: [
        {
          screenId: rawMediaIds.screen,
          entryId: rawMediaIds.entry,
          blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          propPath: "mediaAssetId",
          value: rawMediaIds.media,
        },
      ],
    },
    { overrides: [] },
  ];
  const makeRawMediaState = (values = rawMediaValues) => ({
    plan,
    currentCaptures: sourceCaptures,
    mediaRecord: { id: rawMediaIds.media },
    mediaCanonicalSafeUrl: "/media/" + rawMediaKey,
    mediaRaceAdminEvidence: {
      screen: Buffer.from(JSON.stringify(values[0])),
      entry: Buffer.from(JSON.stringify(values[1])),
      media: Buffer.from(JSON.stringify(values[2])),
      override: Buffer.from(JSON.stringify(values[3])),
      retryOverride: Buffer.from(JSON.stringify(values[4])),
    },
  });
  const rawMediaState = makeRawMediaState();
  const rawMediaProof = parseMediaRaceAuthoritativeAdminEvidence(rawMediaState);
  const rawMediaFrames = [];
  for (const bytes of Object.values(rawMediaState.mediaRaceAdminEvidence)) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    rawMediaFrames.push(length, bytes);
  }
  invariant(
    rawMediaProof.evidenceSha256 === hashBytes(Buffer.concat(rawMediaFrames)) &&
      rawMediaProof.evidenceSha256 !==
        hashBytes(Buffer.from(canonicalJson(rawMediaProof.projection))),
    "media-race proof was not hashed from retained authoritative Admin bytes"
  );
  for (const [label, mutate] of [
    [
      "media raw duplicate binding",
      (values) =>
        values[0].definition.editorView.bindings.push({
          ...values[0].definition.editorView.bindings[0],
        }),
    ],
    [
      "media raw entry mismatch",
      (values) => {
        values[1].data.raceImageId = rawMediaIds.media;
      },
    ],
    [
      "media raw unsafe URL",
      (values) => {
        values[2].url += "?private=1";
      },
    ],
    [
      "media raw override scope",
      (values) => {
        values[3].overrides[0].screenId = rawMediaIds.retryScreen;
      },
    ],
    [
      "media raw retry override",
      (values) => values[4].overrides.push({ ...values[3].overrides[0] }),
    ],
  ]) {
    const values = structuredClone(rawMediaValues);
    mutate(values);
    await expectAsyncFailure(
      async () => parseMediaRaceAuthoritativeAdminEvidence(makeRawMediaState(values)),
      label
    );
  }
  const unparseableMediaState = makeRawMediaState();
  unparseableMediaState.mediaRaceAdminEvidence.entry = Buffer.from("{");
  await expectAsyncFailure(
    async () => parseMediaRaceAuthoritativeAdminEvidence(unparseableMediaState),
    "media raw unparseable response"
  );
  invariant(
    RESPONSE_LOST_CREATE_ACTION_IDS.length === 18 &&
      deepEqualJson(
        RESPONSE_LOST_CREATE_ACTION_IDS,
        [...new Set(Object.values(PROVEN_RESOURCE_ACTIONS).map(({ origin }) => origin))].sort()
      ),
    "response-lost create action registry drift"
  );
  const baselineProbeState = {
    plan,
    responseLostBaselines: new Map(),
    responseLostIntents: new Map(),
  };
  const baselineProbeCalls = [];
  await captureAllResponseLostNaturalBaselinesBeforeFirstWrite(
    baselineProbeState,
    async (operationId, input) => {
      baselineProbeCalls.push(
        deepFreezeExact({ operationId, input: deepFreezeExact({ ...input }) })
      );
      return deepFreezeExact({ candidates: deepFreezeExact([]), overflow: false });
    }
  );
  invariant(
    baselineProbeCalls.length === 18 &&
      baselineProbeState.responseLostBaselines.size === 18 &&
      RESPONSE_LOST_CREATE_ACTION_IDS.every((actionId) =>
        baselineProbeState.responseLostBaselines.has(actionId)
      ) &&
      baselineProbeCalls.every(
        ({ operationId }) =>
          BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS[operationId]?.operationId === operationId
      ) &&
      new Set(baselineProbeCalls.map(({ operationId }) => operationId)).size === 18,
    "all response-lost natural baselines were not captured before the first write"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateBoundedNaturalCandidateResult(
          deepFreezeExact({ candidates: deepFreezeExact([]), overflow: true }),
          "response-lost overflow self-test"
        )
      ),
    "response-lost DB-side overflow sentinel"
  );
  invariant(
    RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes("roles.permissions") &&
      RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes('row.roleName === "admin"') &&
      RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes("adminRoleTupleCount") &&
      USER_PROVISION_BRIDGE_SOURCE.includes("wf540_user_password_exact_id") &&
      USER_PROVISION_BRIDGE_SOURCE.includes("normalizedEmailMatches:true") &&
      RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE.includes(
        "assertCanonicalStorageKey(candidate.key)"
      ) &&
      RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE.includes(
        'candidate.url !== "/media/" + candidate.key'
      ),
    "response-lost user/media provenance source drift"
  );
  invariant(
    API_SESSION_OBSERVATION_BRIDGE_SOURCE.includes(".limit(2)") &&
      API_SESSION_OBSERVATION_BRIDGE_SOURCE.includes("csrfTokenHash:sessions.csrfTokenHash") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("IS NOT DISTINCT FROM") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("const inTransactionRows = await tx.select()") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("const afterRows = await db.select()") &&
      !adminApiRequest.toString().includes("session.csrf") &&
      !adminApiRequest.toString().includes("session.context") &&
      disposeOwnedApiRequestContextAndProveAbsent.toString().includes("disposeAttemptPromise") &&
      disposeOwnedApiRequestContextAndProveAbsent.toString().includes("storageState") &&
      readPublicApiExactlyOnce.toString().indexOf("privateEphemeralApiContextRegistry") <
        readPublicApiExactlyOnce.toString().indexOf("await state.playwrightRequest.newContext") &&
      readPublicApiExactlyOnce.toString().indexOf("ephemeralRegistry.has") <
        readPublicApiExactlyOnce.toString().indexOf("await state.playwrightRequest.newContext"),
    "private API lifecycle or bootstrap CAS source drift"
  );

  const exactLoginProjection = deepFreezeExact({
    session: { expiresAt: "2026-07-17T00:00:00.000Z" },
    user: {
      email: "admin@example.test",
      id: "54000000-0000-4000-8000-000000007300",
      name: "Admin",
    },
  });
  invariant(
    validateExactApiLoginResponse(
      exactLoginProjection,
      exactLoginProjection.user.id,
      "ADMIN@example.test"
    ) === exactLoginProjection,
    "strict API login projection rejected the exact response"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateExactApiLoginResponse(
          deepFreezeExact({ ...exactLoginProjection, unexpected: true }),
          exactLoginProjection.user.id,
          exactLoginProjection.user.email
        )
      ),
    "API login top-level unknown key"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateExactApiLoginResponse(
          deepFreezeExact({
            ...exactLoginProjection,
            user: { ...exactLoginProjection.user, unexpected: true },
          }),
          exactLoginProjection.user.id,
          exactLoginProjection.user.email
        )
      ),
    "API login nested unknown key"
  );

  const makeApiDisposalProbe = ({ disposeThrows = false, probeRejects = true } = {}) => {
    const state = {};
    const capability = Object.freeze({
      key: "bootstrap",
      userAgent: "TASK-540/self-test",
      userId: null,
    });
    let disposeCalls = 0;
    let storageCalls = 0;
    const context = {
      async dispose() {
        disposeCalls += 1;
        if (disposeThrows) throw new Error("self-test dispose failure");
      },
      async storageState() {
        storageCalls += 1;
        if (typeof probeRejects === "function" ? probeRejects(disposeCalls) : probeRejects) {
          throw new Error("self-test closed context");
        }
        return { cookies: [], origins: [] };
      },
    };
    const registry = new Map([
      [
        "bootstrap",
        {
          capability,
          context,
          disposalErrors: [],
          disposeAttemptPromise: null,
          disposeProof: null,
          key: "bootstrap",
          userAgent: capability.userAgent,
        },
      ],
    ]);
    PRIVATE_API_REQUEST_CONTEXT.set(state, registry);
    return {
      capability,
      context,
      get disposeCalls() {
        return disposeCalls;
      },
      registry,
      get storageCalls() {
        return storageCalls;
      },
      state,
    };
  };
  const successfulApiDisposal = makeApiDisposalProbe();
  const [firstDisposalProof, secondDisposalProof] = await Promise.all([
    disposeApiRequestContextAndProveAbsent(
      successfulApiDisposal.state,
      successfulApiDisposal.capability,
      "bootstrap"
    ),
    disposeApiRequestContextAndProveAbsent(
      successfulApiDisposal.state,
      successfulApiDisposal.capability,
      "bootstrap"
    ),
  ]);
  invariant(
    firstDisposalProof === secondDisposalProof &&
      successfulApiDisposal.disposeCalls === 1 &&
      successfulApiDisposal.storageCalls === 1 &&
      successfulApiDisposal.registry.size === 1,
    "API context disposal was not once-only with an independent absence probe"
  );
  const phase4DisposalProof = await disposeApiRequestContextAndProveAbsent(
    successfulApiDisposal.state,
    successfulApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    phase4DisposalProof === firstDisposalProof &&
      successfulApiDisposal.disposeCalls === 1 &&
      successfulApiDisposal.storageCalls === 2 &&
      successfulApiDisposal.registry.has("bootstrap"),
    "eager API disposal did not retain acquired history for an independent phase-4 probe"
  );
  const throwingApiDisposal = makeApiDisposalProbe({ disposeThrows: true });
  const throwingDisposalProof = await disposeApiRequestContextAndProveAbsent(
    throwingApiDisposal.state,
    throwingApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    throwingDisposalProof.capabilityAbsent === true &&
      throwingApiDisposal.disposeCalls === 1 &&
      throwingApiDisposal.storageCalls === 1 &&
      throwingApiDisposal.registry.has("bootstrap") &&
      throwingApiDisposal.registry.get("bootstrap").disposalErrors.length === 1,
    "throwing-but-absent API disposal lost its proof or retained error"
  );
  const liveApiDisposal = makeApiDisposalProbe({
    probeRejects: (disposeCalls) => disposeCalls >= 2,
  });
  await expectAsyncFailure(
    () =>
      disposeApiRequestContextAndProveAbsent(
        liveApiDisposal.state,
        liveApiDisposal.capability,
        "bootstrap"
      ),
    "API context live post-dispose capability"
  );
  invariant(
    liveApiDisposal.disposeCalls === 1 &&
      liveApiDisposal.storageCalls === 1 &&
      liveApiDisposal.registry.has("bootstrap") &&
      liveApiDisposal.registry.get("bootstrap").disposeAttemptPromise === null,
    "live post-dispose capability was incorrectly removed from private authority"
  );
  const recoveredApiDisposal = await disposeApiRequestContextAndProveAbsent(
    liveApiDisposal.state,
    liveApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    recoveredApiDisposal.capabilityAbsent === true &&
      liveApiDisposal.disposeCalls === 2 &&
      liveApiDisposal.storageCalls === 2 &&
      liveApiDisposal.registry.has("bootstrap") &&
      liveApiDisposal.registry.get("bootstrap").disposalErrors.length === 1,
    "retained live API context did not recover through a fresh close/probe"
  );

  const makeBootstrapSettlementProbe = () => {
    const state = {};
    const beforePair = deepFreezeExact({
      lastLoginAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });
    const authority = {
      newestOwnedPair: beforePair,
      ownedAuditIds: new Set(),
      ownedSessionIds: new Set(),
    };
    const attempt = {
      beforeAuditIds: deepFreezeExact([]),
      beforePair,
      beforeSessionIds: deepFreezeExact([]),
      status: "pending-late",
    };
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.set(state, authority);
    return { attempt, authority, state };
  };
  const lateSettlement = makeBootstrapSettlementProbe();
  const lateSessionId = "54000000-0000-4000-8000-000000007301";
  const lateAuditId = "54000000-0000-4000-8000-000000007302";
  invariant(
    settleBootstrapLoginAttempt(
      lateSettlement.state,
      lateSettlement.authority,
      lateSettlement.attempt,
      {
        lastLoginAt: "2026-07-16T00:00:01.000Z",
        updatedAt: "2026-07-16T00:00:01.000Z",
        sessionIds: [lateSessionId],
        auditIds: [lateAuditId],
      }
    ) === true &&
      lateSettlement.attempt.status === "settled" &&
      lateSettlement.authority.ownedSessionIds.has(lateSessionId) &&
      lateSettlement.authority.ownedAuditIds.has(lateAuditId),
    "delayed exact bootstrap session/audit pair was not adopted"
  );
  const oneColumnSettlement = makeBootstrapSettlementProbe();
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        settleBootstrapLoginAttempt(
          oneColumnSettlement.state,
          oneColumnSettlement.authority,
          oneColumnSettlement.attempt,
          {
            lastLoginAt: "2026-07-16T00:00:01.000Z",
            updatedAt: "2026-07-16T00:00:00.000Z",
            sessionIds: [lateSessionId],
            auditIds: [lateAuditId],
          }
        )
      ),
    "one-column delayed bootstrap mutation"
  );

  const bootstrapProtocolFixture = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const bootstrapProtocolBaseline = bootstrapProtocolFixture.baseline;
  const validBootstrapCasProof = deepFreezeExact(
    Object.fromEntries(BOOTSTRAP_RESTORE_PROOF_KEYS.map((key) => [key, true]))
  );
  const validBootstrapBaselineRead = deepFreezeExact({
    id: bootstrapProtocolBaseline.id,
    rawUserRow: bootstrapProtocolBaseline.rawUserRow,
    roleTuples: bootstrapProtocolBaseline.roleTuples,
  });
  const bootstrapProtocolPairOne = deepFreezeExact({
    lastLoginAt: "2026-07-16T00:00:01.000Z",
    updatedAt: "2026-07-16T00:00:01.000Z",
  });
  const bootstrapProtocolPairTwo = deepFreezeExact({
    lastLoginAt: "2026-07-16T00:00:02.000Z",
    updatedAt: "2026-07-16T00:00:02.000Z",
  });
  invariant(
    bootstrapProtocolPairOne.lastLoginAt !== bootstrapProtocolBaseline.rawUserRow.lastLoginAt &&
      bootstrapProtocolPairOne.updatedAt !== bootstrapProtocolBaseline.rawUserRow.updatedAt &&
      bootstrapProtocolPairTwo.lastLoginAt !== bootstrapProtocolPairOne.lastLoginAt &&
      bootstrapProtocolPairTwo.updatedAt !== bootstrapProtocolPairOne.updatedAt,
    "bootstrap two-successive-pair fixture drift"
  );
  const bootstrapBoundaryFailure = new Error("TASK540_PRIVATE_CAS_BOUNDARY_FAILURE");
  const bootstrapPreDispatchFailure = classifyBootstrapCasBridgeFailure(
    bootstrapBoundaryFailure,
    false
  );
  const bootstrapPostDispatchFailure = classifyBootstrapCasBridgeFailure(
    bootstrapBoundaryFailure,
    true
  );
  invariant(
    bootstrapPreDispatchFailure.kind === "rejected" &&
      bootstrapPreDispatchFailure.cause === bootstrapBoundaryFailure &&
      bootstrapPostDispatchFailure.kind === "outcome-uncertain" &&
      bootstrapPostDispatchFailure.cause === bootstrapBoundaryFailure,
    "bootstrap CAS pre-dispatch/uncertain failure classification drift"
  );
  await expectAsyncFailure(
    async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "rolled-back", proof: validBootstrapCasProof })
      ),
    "closed bootstrap rollback carrying a proof"
  );
  const bootstrapProtocolTraffic = deepFreezeExact({
    auditOne: "54000000-0000-4000-8000-000000007411",
    auditTwo: "54000000-0000-4000-8000-000000007412",
    sessionOne: "54000000-0000-4000-8000-000000007401",
    sessionTwo: "54000000-0000-4000-8000-000000007402",
  });
  const makeBootstrapProtocolProbe = ({ reconciliationSealed = true } = {}) => {
    const state = {
      assertSafeEvidence: () => true,
      bootstrapBaseline: bootstrapProtocolBaseline,
      bootstrapRestored: false,
      runtimeReceiptSequence: 0,
    };
    initializeBootstrapLoginAuthority(state, bootstrapProtocolBaseline);
    const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    const makeEnteredAttempt = ({
      beforeAuditIds,
      beforePair,
      beforeSessionIds,
      channel,
      userAgent,
    }) => ({
      afterPair: null,
      beforeAuditIds: deepFreezeExact([...beforeAuditIds]),
      beforePair,
      beforeSessionIds: deepFreezeExact([...beforeSessionIds]),
      changed: null,
      channel,
      newAuditIds: null,
      newSessionIds: null,
      observationError: null,
      operationReturned: true,
      provisionalAfterPair: null,
      status: "entered",
      userAgent,
    });
    const firstAttempt = makeEnteredAttempt({
      beforeAuditIds: [],
      beforePair: bootstrapTimestampPair(bootstrapProtocolBaseline),
      beforeSessionIds: [],
      channel: "ui",
      userAgent: "TASK-540/self-test-bootstrap-ui",
    });
    authority.attempts.push(firstAttempt);
    const firstSettled = settleBootstrapLoginAttempt(
      state,
      authority,
      firstAttempt,
      {
        ...bootstrapProtocolPairOne,
        auditIds: [bootstrapProtocolTraffic.auditOne],
        sessionIds: [bootstrapProtocolTraffic.sessionOne],
      },
      { requireChanged: true }
    );
    const secondAttempt = makeEnteredAttempt({
      beforeAuditIds: [bootstrapProtocolTraffic.auditOne],
      beforePair: bootstrapTimestampPair(bootstrapProtocolPairOne),
      beforeSessionIds: [bootstrapProtocolTraffic.sessionOne],
      channel: "api-bootstrap",
      userAgent: "TASK-540/self-test-bootstrap-api",
    });
    authority.attempts.push(secondAttempt);
    const secondSettled = settleBootstrapLoginAttempt(
      state,
      authority,
      secondAttempt,
      {
        ...bootstrapProtocolPairTwo,
        auditIds: [bootstrapProtocolTraffic.auditOne, bootstrapProtocolTraffic.auditTwo],
        sessionIds: [bootstrapProtocolTraffic.sessionOne, bootstrapProtocolTraffic.sessionTwo],
      },
      { requireChanged: true }
    );
    invariant(
      firstSettled === true &&
        secondSettled === true &&
        firstAttempt.status === "settled" &&
        secondAttempt.status === "settled" &&
        firstAttempt.changed === true &&
        secondAttempt.changed === true &&
        deepEqualJson(firstAttempt.beforePair, bootstrapTimestampPair(bootstrapProtocolBaseline)) &&
        deepEqualJson(firstAttempt.afterPair, bootstrapProtocolPairOne) &&
        deepEqualJson(secondAttempt.beforePair, bootstrapProtocolPairOne) &&
        deepEqualJson(secondAttempt.afterPair, bootstrapProtocolPairTwo) &&
        deepEqualJson(authority.newestOwnedPair, bootstrapProtocolPairTwo) &&
        authority.ownedSessionIds.size === 2 &&
        authority.ownedAuditIds.size === 2,
      "bootstrap real baseline-to-pair1-to-pair2 settlement drift"
    );
    authority.reconciliationSealed = reconciliationSealed;
    authority.restorationStarted = true;
    return { authority, firstAttempt, secondAttempt, state };
  };
  const validatedProtocolProbe = makeBootstrapProtocolProbe({
    reconciliationSealed: false,
  });
  let validatedReconcileCalls = 0;
  let validatedCasCalls = 0;
  let validatedReadCalls = 0;
  let validatedCasInput = null;
  const validatedProtocolProof = await executeBootstrapRestorationProtocol(
    validatedProtocolProbe.state,
    {
      async readBaselineOnce() {
        validatedReadCalls += 1;
        return validBootstrapBaselineRead;
      },
      async reconcile() {
        validatedReconcileCalls += 1;
        validatedProtocolProbe.authority.reconciliationError = null;
        validatedProtocolProbe.authority.reconciliationSealed = true;
      },
      async runCasOnce(input) {
        validatedCasCalls += 1;
        validatedCasInput = input;
        return classifyClosedBootstrapCasBridgeOutcome(
          deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof })
        );
      },
    }
  );
  invariant(
    validatedReconcileCalls === 1 &&
      validatedCasCalls === 1 &&
      validatedReadCalls === 0 &&
      validatedCasInput.newestOwnedPair ===
        validatedProtocolProbe.authority.sealedNewestOwnedPair &&
      deepEqualJson(
        validatedCasInput.newestOwnedPair,
        validatedProtocolProbe.authority.newestOwnedPair
      ) &&
      deepEqualJson(validatedCasInput.newestOwnedPair, bootstrapProtocolPairTwo) &&
      deepEqualJson(validatedProtocolProbe.firstAttempt.newSessionIds, [
        bootstrapProtocolTraffic.sessionOne,
      ]) &&
      deepEqualJson(validatedProtocolProbe.firstAttempt.newAuditIds, [
        bootstrapProtocolTraffic.auditOne,
      ]) &&
      deepEqualJson(validatedProtocolProbe.secondAttempt.newSessionIds, [
        bootstrapProtocolTraffic.sessionTwo,
      ]) &&
      deepEqualJson(validatedProtocolProbe.secondAttempt.newAuditIds, [
        bootstrapProtocolTraffic.auditTwo,
      ]) &&
      validatedProtocolProof.resolution === "validated" &&
      validatedProtocolProof.casAttempts === 1 &&
      validatedProtocolProof.uncertainReads === 0 &&
      validatedProtocolProof.validatedInTransactionAndAfterCommit === true &&
      validatedProtocolProbe.state.bootstrapRestored === true,
    "validated bootstrap restoration protocol drift"
  );

  const uncertainCommittedProbe = makeBootstrapProtocolProbe();
  let uncertainCommittedCasCalls = 0;
  let uncertainCommittedReadCalls = 0;
  const uncertainCommittedProof = await executeBootstrapRestorationProtocol(
    uncertainCommittedProbe.state,
    {
      async readBaselineOnce() {
        uncertainCommittedReadCalls += 1;
        return validBootstrapBaselineRead;
      },
      async reconcile() {
        invariant(false, "sealed uncertain probe reconciled twice");
      },
      async runCasOnce() {
        uncertainCommittedCasCalls += 1;
        return Object.freeze({
          cause: new Error("TASK540_PRIVATE_LOST_CAS_OUTPUT"),
          kind: "outcome-uncertain",
        });
      },
    }
  );
  invariant(
    uncertainCommittedCasCalls === 1 &&
      uncertainCommittedReadCalls === 1 &&
      uncertainCommittedProof.resolution === "already-restored-after-uncertain-outcome" &&
      uncertainCommittedProof.casAttempts === 1 &&
      uncertainCommittedProof.uncertainReads === 1 &&
      uncertainCommittedProof.validatedInTransactionAndAfterCommit === false,
    "commit plus lost bridge output reconciliation drift"
  );

  const expectBootstrapProtocolFailure = async ({
    expectedFailureClass,
    probe = makeBootstrapProtocolProbe(),
    readBaselineOnce = async () => validBootstrapBaselineRead,
    reconcile = async () => {
      probe.authority.reconciliationError = null;
      probe.authority.reconciliationSealed = true;
    },
    runCasOnce = async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof })
      ),
  }) => {
    let caught = null;
    try {
      await executeBootstrapRestorationProtocol(probe.state, {
        readBaselineOnce,
        reconcile,
        runCasOnce,
      });
    } catch (error) {
      caught = error;
    }
    const diagnostic = privateCleanupFailureDiagnosticNeverThrow(caught);
    assertNegative(
      diagnostic?.cleanupPhase === 8 && diagnostic.cleanupFailureClass === expectedFailureClass,
      "bootstrap phase 8 " + expectedFailureClass
    );
    return { caught, probe };
  };

  let reconciliationFailureCasCalls = 0;
  const reconciliationFailureProbe = makeBootstrapProtocolProbe({
    reconciliationSealed: false,
  });
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_reconciliation_failed",
    probe: reconciliationFailureProbe,
    reconcile: async () => {
      throw new Error("TASK540_PRIVATE_RECONCILIATION_FAILURE");
    },
    runCasOnce: async () => {
      reconciliationFailureCasCalls += 1;
      return classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof })
      );
    },
  });
  invariant(
    reconciliationFailureCasCalls === 0 && reconciliationFailureProbe.authority.casAttempts === 0,
    "reconciliation failure did not prevent bootstrap CAS"
  );
  for (const [label, mutateProbe] of [
    [
      "first settlement only",
      (probe) => {
        probe.authority.attempts.pop();
      },
    ],
    [
      "stale newest-pair overwrite",
      (probe) => {
        probe.authority.newestOwnedPair = bootstrapProtocolPairOne;
      },
    ],
  ]) {
    const probe = makeBootstrapProtocolProbe();
    mutateProbe(probe);
    let casCalls = 0;
    await expectBootstrapProtocolFailure({
      expectedFailureClass: "bootstrap_reconciliation_failed",
      probe,
      runCasOnce: async () => {
        casCalls += 1;
        return classifyClosedBootstrapCasBridgeOutcome(
          deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof })
        );
      },
    });
    invariant(
      casCalls === 0 && probe.authority.casAttempts === 0,
      "bootstrap " + label + " mutant reached CAS"
    );
  }

  const rejectedCasProbe = makeBootstrapProtocolProbe();
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_cas_failed",
    probe: rejectedCasProbe,
    runCasOnce: async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "rolled-back", proof: null })
      ),
  });
  invariant(
    rejectedCasProbe.authority.casAttempts === 1 && rejectedCasProbe.authority.uncertainReads === 0,
    "known bootstrap CAS failure cardinality drift"
  );

  const invalidPostProof = deepFreezeExact({
    ...validBootstrapCasProof,
    afterCommitByteIdentical: false,
    completeRowByteIdentical: false,
    restored: false,
  });
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_post_restore_proof_failed",
    runCasOnce: async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed-proof-failed", proof: invalidPostProof })
      ),
  });

  for (const [label, invalidRead] of [
    [
      "lost output without commit",
      {
        ...validBootstrapBaselineRead,
        rawUserRow: {
          ...validBootstrapBaselineRead.rawUserRow,
          lastLoginAt: bootstrapProtocolPairTwo.lastLoginAt,
          updatedAt: bootstrapProtocolPairTwo.updatedAt,
        },
      },
    ],
    [
      "unknown user column",
      {
        ...validBootstrapBaselineRead,
        rawUserRow: { ...validBootstrapBaselineRead.rawUserRow, unknownColumn: true },
      },
    ],
    [
      "role drift",
      {
        ...validBootstrapBaselineRead,
        roleTuples: validBootstrapBaselineRead.roleTuples.map((role) => ({
          ...role,
          rolePermissions: [],
        })),
      },
    ],
    ["missing row", { id: null, rawUserRow: null, roleTuples: [] }],
    ["duplicate row projection", { ...validBootstrapBaselineRead, duplicateRowCount: 2 }],
  ]) {
    let readCalls = 0;
    const result = await expectBootstrapProtocolFailure({
      expectedFailureClass: "bootstrap_uncertain_baseline_failed",
      readBaselineOnce: async () => {
        readCalls += 1;
        return deepFreezeExact(invalidRead);
      },
      runCasOnce: async () =>
        Object.freeze({
          cause: new Error("TASK540_PRIVATE_UNCERTAIN_CAS"),
          kind: "outcome-uncertain",
        }),
    });
    invariant(
      readCalls === 1 &&
        result.probe.authority.casAttempts === 1 &&
        result.probe.authority.uncertainReads === 1 &&
        result.probe.authority.restorationProof === null,
      label + " uncertain baseline failure cardinality drift"
    );
  }

  const receiptFailureProbe = uncertainCommittedProbe;
  receiptFailureProbe.state.assertSafeEvidence = () => {
    throw new Error("TASK540_PRIVATE_RECEIPT_FAILURE");
  };
  let receiptFailure = null;
  try {
    createBootstrapRestoreReceiptOnce(
      receiptFailureProbe.state,
      receiptFailureProbe.authority.restorationProof
    );
  } catch (error) {
    receiptFailure = error;
  }
  const receiptFailureDiagnostic = privateCleanupFailureDiagnosticNeverThrow(receiptFailure);
  assertNegative(
    receiptFailureDiagnostic?.cleanupPhase === 8 &&
      receiptFailureDiagnostic.cleanupFailureClass === "bootstrap_restore_receipt_failed" &&
      receiptFailureProbe.authority.receiptAttempted === true &&
      receiptFailureProbe.authority.receipt === null &&
      receiptFailureProbe.authority.resolution === "already-restored-after-uncertain-outcome" &&
      receiptFailureProbe.authority.casAttempts === 1 &&
      receiptFailureProbe.authority.uncertainReads === 1 &&
      receiptFailureProbe.state.bootstrapRestored === true,
    "bootstrap receipt failure retained proven restoration"
  );

  const bootstrapProtocolSource = executeBootstrapRestorationProtocol.toString();
  const bootstrapProtocolRequired = [
    "const latestSettledAttempt = authority.attempts.at(-1);",
    "latestSettledAttempt.afterPair !== null",
    "deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair)",
    "authority.sealedNewestOwnedPair = deepFreezeExact({",
    "newestOwnedPair: authority.sealedNewestOwnedPair,",
    "authority.casAttempts += 1;",
    "authority.casAttempts === 1",
    "operations.runCasOnce(input)",
    'casAttempt.kind === "rejected"',
    'casAttempt.kind === "post-restore-proof-failed"',
    '"bootstrap_post_restore_proof_failed"',
    'casAttempt.kind === "validated"',
    "requireValidatedBootstrapCasProof(casAttempt.proof);",
    'casAttempt.kind === "outcome-uncertain"',
    "authority.uncertainReads += 1;",
    "authority.uncertainReads === 1",
    "operations.readBaselineOnce({",
    "validateBootstrapBaselineReadBridgeOutput(",
    'resolution = "already-restored-after-uncertain-outcome";',
    "authority.restorationProof = buildBootstrapRestorationProof(authority, resolution);",
  ];
  const validatesBootstrapProtocolSource = (source) =>
    bootstrapProtocolRequired.every((token) => source.includes(token)) &&
    source.split("operations.runCasOnce(input)").length - 1 === 1 &&
    source.split("operations.readBaselineOnce({").length - 1 === 1 &&
    source.split("authority.casAttempts += 1;").length - 1 === 1 &&
    source.split("authority.uncertainReads += 1;").length - 1 === 1 &&
    source.split("const latestSettledAttempt = authority.attempts.at(-1);").length - 1 === 1 &&
    source.indexOf("const latestSettledAttempt = authority.attempts.at(-1);") <
      source.indexOf("authority.sealedNewestOwnedPair = deepFreezeExact({") &&
    source.indexOf("authority.sealedNewestOwnedPair = deepFreezeExact({") <
      source.indexOf("operations.runCasOnce(input)") &&
    source.indexOf("operations.runCasOnce(input)") <
      source.indexOf("operations.readBaselineOnce({");
  invariant(
    validatesBootstrapProtocolSource(bootstrapProtocolSource),
    "bootstrap restoration protocol source drift"
  );
  assertSourceMutantsRejected(
    bootstrapProtocolSource,
    validatesBootstrapProtocolSource,
    bootstrapProtocolRequired,
    "bootstrap restoration protocol"
  );
  for (const [label, mutant] of [
    [
      "first settlement selected for seal",
      bootstrapProtocolSource.replace(
        "const latestSettledAttempt = authority.attempts.at(-1);",
        "const latestSettledAttempt = authority.attempts.at(0);"
      ),
    ],
    [
      "latest settlement correlation removed",
      bootstrapProtocolSource.replace(
        "deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair)",
        "authority.newestOwnedPair !== null"
      ),
    ],
    [
      "second CAS write",
      bootstrapProtocolSource.replace(
        "casAttempt = validateBootstrapCasAttemptResult(await operations.runCasOnce(input));",
        "await operations.runCasOnce(input); casAttempt = validateBootstrapCasAttemptResult(await operations.runCasOnce(input));"
      ),
    ],
    [
      "two uncertain reads",
      bootstrapProtocolSource.replace(
        "const baselineRead = await operations.readBaselineOnce({",
        "await operations.readBaselineOnce({ userId: state.bootstrapBaseline.id }); const baselineRead = await operations.readBaselineOnce({"
      ),
    ],
    [
      "zero uncertain reads",
      bootstrapProtocolSource.replace(
        "const baselineRead = await operations.readBaselineOnce({",
        "const baselineRead = validBootstrapBaselineRead ?? ({"
      ),
    ],
    [
      "accept without byte identity",
      bootstrapProtocolSource.replace("validateBootstrapBaselineReadBridgeOutput(", "void ("),
    ],
    [
      "stale pair substitution",
      bootstrapProtocolSource.replace(
        "newestOwnedPair: authority.sealedNewestOwnedPair,",
        "newestOwnedPair: authority.newestOwnedPair,"
      ),
    ],
  ]) {
    assertNegative(!validatesBootstrapProtocolSource(mutant), label + " protocol mutant");
  }
  const bootstrapReceiptSource = createBootstrapRestoreReceiptOnce.toString();
  invariant(
    bootstrapReceiptSource.includes("authority.receiptAttempted = true;") &&
      bootstrapReceiptSource.includes('"bootstrap_restore_receipt_failed"') &&
      !bootstrapReceiptSource.includes("restoreBootstrapLoginState") &&
      !bootstrapReceiptSource.includes("runCasOnce") &&
      !bootstrapReceiptSource.includes("runBunBridgeOperation"),
    "bootstrap receipt separation source drift"
  );
  const retainedProcessSource = runRetainedProcessGroup.toString();
  const retainedProcessOrder = [
    "const child = spawn(file, args, {",
    "const spawnSettlementPromise = new Promise((resolve) => {",
    "const spawnSucceeded = await spawnSettlementPromise;",
    'invariant(spawnSucceeded && !spawnError, "retained process spawn failed");',
    "invariant(Number.isSafeInteger(child.pid) && child.pid > 1",
    "const leader = await readFreshProcessIdentityWithRetry(child.pid);",
    'invariant(leader.pid === leader.pgid, "retained process is not its process-group leader");',
    "const record = {",
    "if (beforeStdinDispatch !== null) beforeStdinDispatch();",
    "child.stdin.end(stdinBytes);",
  ];
  const validatesRetainedProcessDispatchBoundary = (source) => {
    let previousIndex = -1;
    for (const token of retainedProcessOrder) {
      const tokenIndex = source.indexOf(token, previousIndex + 1);
      if (tokenIndex <= previousIndex) return false;
      previousIndex = tokenIndex;
    }
    return (
      source.includes("beforeStdinDispatch = null") &&
      source.includes(
        'beforeStdinDispatch === null || typeof beforeStdinDispatch === "function"'
      ) &&
      source.split("const spawnSucceeded = await spawnSettlementPromise;").length - 1 === 1 &&
      source.split('invariant(spawnSucceeded && !spawnError, "retained process spawn failed");')
        .length -
        1 ===
        1 &&
      source.split("if (beforeStdinDispatch !== null) beforeStdinDispatch();").length - 1 === 1 &&
      source.split("child.stdin.end(stdinBytes);").length - 1 === 1
    );
  };
  invariant(
    validatesRetainedProcessDispatchBoundary(retainedProcessSource),
    "retained process stdin dispatch boundary drift"
  );
  for (const [label, mutant] of [
    [
      "spawn settlement proof removed",
      retainedProcessSource.replace(
        'invariant(spawnSucceeded && !spawnError, "retained process spawn failed");',
        "void spawnSucceeded;"
      ),
    ],
    [
      "boundary before PID retention",
      retainedProcessSource
        .replace("if (beforeStdinDispatch !== null) beforeStdinDispatch();", "")
        .replace(
          "invariant(Number.isSafeInteger(child.pid) && child.pid > 1",
          "if (beforeStdinDispatch !== null) beforeStdinDispatch();\n  invariant(Number.isSafeInteger(child.pid) && child.pid > 1"
        ),
    ],
    [
      "boundary after stdin dispatch",
      retainedProcessSource
        .replace("if (beforeStdinDispatch !== null) beforeStdinDispatch();", "")
        .replace(
          "child.stdin.end(stdinBytes);",
          "child.stdin.end(stdinBytes);\n    if (beforeStdinDispatch !== null) beforeStdinDispatch();"
        ),
    ],
    [
      "process-group proof removed",
      retainedProcessSource.replace(
        'invariant(leader.pid === leader.pgid, "retained process is not its process-group leader");',
        "void leader.pgid;"
      ),
    ],
    [
      "retained record removed",
      retainedProcessSource.replace("const record = {", "const unretainedRecord = {"),
    ],
  ]) {
    assertNegative(
      !validatesRetainedProcessDispatchBoundary(mutant),
      "bootstrap CAS " + label + " mutant"
    );
  }
  const bunBridgeSource = runBunBridge.toString();
  const validatesBunBridgeDispatchBoundary = (source) =>
    source.includes("beforeStdinDispatch: executionBoundaryObserver,") &&
    source.includes("stdinBytes: frame,") &&
    source.split("beforeStdinDispatch: executionBoundaryObserver,").length - 1 === 1 &&
    !source.includes("executionBoundaryObserver();") &&
    source.indexOf("stdinBytes: frame,") <
      source.indexOf("beforeStdinDispatch: executionBoundaryObserver,");
  invariant(
    validatesBunBridgeDispatchBoundary(bunBridgeSource),
    "Bun bridge execution boundary forwarding drift"
  );
  for (const [label, mutant] of [
    [
      "boundary crossed before retained runner",
      bunBridgeSource.replace(
        "const execution = await runRetainedProcessGroup({",
        "if (executionBoundaryObserver !== null) executionBoundaryObserver();\n  const execution = await runRetainedProcessGroup({"
      ),
    ],
    [
      "boundary observer not forwarded",
      bunBridgeSource.replace(
        "beforeStdinDispatch: executionBoundaryObserver,",
        "beforeStdinDispatch: null,"
      ),
    ],
  ]) {
    assertNegative(!validatesBunBridgeDispatchBoundary(mutant), "Bun bridge " + label + " mutant");
  }
  const bootstrapAttemptSource = attemptBootstrapCasBridgeOnce.toString();
  const bootstrapAttemptRequired = [
    "let executionBoundaryCrossed = false;",
    "outcome = await runBunBridgeOperation(",
    '"resource/bootstrap-cas-restore"',
    'invariant(!executionBoundaryCrossed, "bootstrap CAS execution boundary repeated");',
    "executionBoundaryCrossed = true;",
    "classifyBootstrapCasBridgeFailure(cause, executionBoundaryCrossed)",
    "classifyClosedBootstrapCasBridgeOutcome(outcome)",
  ];
  const validatesBootstrapAttemptSource = (source) =>
    bootstrapAttemptRequired.every((token) => source.includes(token)) &&
    source.split("runBunBridgeOperation(").length - 1 === 1 &&
    source.split('"resource/bootstrap-cas-restore"').length - 1 === 1 &&
    source.split("executionBoundaryCrossed = true;").length - 1 === 1 &&
    source.split("classifyClosedBootstrapCasBridgeOutcome(outcome)").length - 1 === 1 &&
    source.indexOf("outcome = await runBunBridgeOperation(") <
      source.indexOf("executionBoundaryCrossed = true;") &&
    source.indexOf("executionBoundaryCrossed = true;") <
      source.indexOf("classifyClosedBootstrapCasBridgeOutcome(outcome)");
  invariant(
    validatesBootstrapAttemptSource(bootstrapAttemptSource),
    "bootstrap CAS exact attempt helper source drift"
  );
  assertSourceMutantsRejected(
    bootstrapAttemptSource,
    validatesBootstrapAttemptSource,
    bootstrapAttemptRequired,
    "bootstrap CAS exact attempt helper"
  );
  const restoreBootstrapSource = restoreBootstrapLoginState.toString();
  const validatesRestoreBootstrapAttemptPath = (source) =>
    source.includes("runCasOnce: (input) => attemptBootstrapCasBridgeOnce(state, input)") &&
    source.split("attemptBootstrapCasBridgeOnce(state, input)").length - 1 === 1;
  invariant(
    validatesRestoreBootstrapAttemptPath(restoreBootstrapSource),
    "bootstrap restoration production attempt path drift"
  );
  const duplicateAttemptPathMutant = restoreBootstrapSource.replace(
    "attemptBootstrapCasBridgeOnce(state, input)",
    "attemptBootstrapCasBridgeOnce(state, input).then(() => attemptBootstrapCasBridgeOnce(state, input))"
  );
  assertNegative(
    !validatesRestoreBootstrapAttemptPath(duplicateAttemptPathMutant),
    "bootstrap restoration duplicate attempt helper mutant"
  );
  const bootstrapCasPredicateTokens = [
    "notDistinct(users.id,input.userId)",
    "notDistinct(users.email,input.baseline.rawUserRow.email)",
    "notDistinct(users.emailHash,input.baseline.rawUserRow.emailHash)",
    "notDistinct(users.emailEncrypted,input.baseline.rawUserRow.emailEncrypted)",
    "notDistinct(users.passwordHash,input.baseline.rawUserRow.passwordHash)",
    "notDistinct(users.name,input.baseline.rawUserRow.name)",
    "notDistinct(users.status,input.baseline.rawUserRow.status)",
    "notDistinct(users.createdAt,new Date(input.baseline.rawUserRow.createdAt))",
    "notDistinct(users.updatedAt,new Date(input.newestOwnedPair.updatedAt))",
    "notDistinct(users.lastLoginAt,timestamp(input.newestOwnedPair.lastLoginAt))",
  ];
  const bootstrapCasSourceRequired = [
    'const knownRollback = Object.freeze({ kind:"wf540_bootstrap_known_rollback" });',
    "const rollbackKnown = () => { throw knownRollback; };",
    "let transactionProof = null;",
    "transactionProof = await db.transaction(async (tx) => {",
    "if (lockedRows.length !== 1 || lockedRoles.length !== 1) rollbackKnown();",
    "if (locked === null) rollbackKnown();",
    "if (!pairMatches || !unchangedMatches || !roleTuplesByteIdentical) rollbackKnown();",
    "const predicates = [",
    "const updated = await tx.update(users).set({",
    "}).where(and(...predicates)).returning();",
    "if (updated.length !== 1) rollbackKnown();",
    "if (!inTransactionByteIdentical || !rolesInTransactionByteIdentical) rollbackKnown();",
    "if (error !== knownRollback) throw error;",
    'output = { kind:"rolled-back",proof:null };',
    'output = { kind:restored ? "committed" : "committed-proof-failed",proof };',
  ];
  const validatesBootstrapCasSource = (source) =>
    bootstrapCasSourceRequired.every((token) => source.includes(token)) &&
    bootstrapCasPredicateTokens.every((token) => source.split(token).length - 1 === 1) &&
    new Set(bootstrapCasPredicateTokens).size === 10 &&
    source.split("notDistinct(users.").length - 1 === 10 &&
    source.split("tx.update(users)").length - 1 === 1 &&
    source.split("}).where(and(...predicates)).returning();").length - 1 === 1 &&
    source.split('output = { kind:"rolled-back",proof:null };').length - 1 === 1 &&
    source.split('"committed-proof-failed"').length - 1 === 1 &&
    source.includes("IS NOT DISTINCT FROM");
  invariant(
    validatesBootstrapCasSource(BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE),
    "bootstrap CAS bridge source drift"
  );
  assertSourceMutantsRejected(
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
    validatesBootstrapCasSource,
    bootstrapCasSourceRequired,
    "bootstrap CAS bridge closed outcome"
  );
  for (const [index, predicate] of bootstrapCasPredicateTokens.entries()) {
    const substitute =
      bootstrapCasPredicateTokens[(index + 1) % bootstrapCasPredicateTokens.length];
    for (const [mutation, mutant] of [
      ["deletion", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, "true")],
      ["substitution", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, substitute)],
      [
        "duplication",
        BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, predicate + "," + predicate),
      ],
    ]) {
      assertNegative(
        !validatesBootstrapCasSource(mutant),
        "bootstrap CAS predicate " + (index + 1) + " " + mutation + " mutant"
      );
    }
  }
  for (const [label, mutant] of [
    [
      "second update",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        "const updated = await tx.update(users).set({",
        "await tx.update(users).set({}); const updated = await tx.update(users).set({"
      ),
    ],
    [
      "zero-row rollback removed",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        "if (updated.length !== 1) rollbackKnown();",
        "void updated.length;"
      ),
    ],
    [
      "known rollback made uncertain",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'output = { kind:"rolled-back",proof:null };',
        'throw new Error("wf540_known_rollback_hidden");'
      ),
    ],
    [
      "invalid postcommit proof marked committed",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'output = { kind:restored ? "committed" : "committed-proof-failed",proof };',
        'output = { kind:"committed",proof };'
      ),
    ],
  ]) {
    assertNegative(!validatesBootstrapCasSource(mutant), "bootstrap CAS " + label + " mutant");
  }
  invariant(
    BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".limit(2)") &&
      BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(
        'throw new Error("wf540_bootstrap_baseline_read_columns")'
      ) &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".update(") &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".insert(") &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".delete("),
    "bootstrap CAS/read-only bridge source drift"
  );

  validateStaticBunBridgeDescriptorRegistries();
  const exactChildInputSchemaIds = Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort();
  invariant(exactChildInputSchemaIds.length === 26, "Bun child input schema count drift");
  for (const schemaId of exactChildInputSchemaIds) {
    const input = selfTestBunBridgeInputForSchema(schemaId);
    invariant(
      (await selfTestExactBunChildInputSource(schemaId, input)) === input,
      schemaId + " child Bun positive input parity drift"
    );
  }
  const dryResourceUuid = (ordinal) =>
    `54000000-0000-4000-8000-${String(7600 + ordinal).padStart(12, "0")}`;
  const dryResourceCoreSpecs = [
    [
      "presentation-override",
      "failure-discovery",
      [dryResourceUuid(1), dryResourceUuid(2), "task-540-block", "mediaAssetId"],
    ],
    ["seo-document-entry", "cleanup-discovery", [dryResourceUuid(19), "entry", dryResourceUuid(7)]],
    [
      "setting-user-a",
      "failure-discovery",
      [dryResourceUuid(3), "customScreens.entry.preferences"],
    ],
    [
      "setting-user-b",
      "failure-discovery",
      [dryResourceUuid(4), "customScreens.entry.preferences"],
    ],
    ["screen-main", "failure-discovery", [dryResourceUuid(5)]],
    ["screen-retry", "failure-discovery", [dryResourceUuid(6)]],
    ["entry-editable", "failure-discovery", [dryResourceUuid(7)]],
    ["entry-related", "failure-discovery", [dryResourceUuid(8)]],
    ["content-type", "failure-discovery", [dryResourceUuid(9)]],
    ["media-row-key", "admin-api", [dryResourceUuid(10), `2026/07/${dryResourceUuid(10)}.png`]],
    [
      "media-row-key",
      "failure-discovery",
      [dryResourceUuid(11), `2026/07/${dryResourceUuid(11)}.png`],
    ],
    ["audit-log-task-ua", "terminal-db-delta", [dryResourceUuid(12)]],
    ["access-log-task-ua", "terminal-db-delta", [dryResourceUuid(13)]],
    ["session-task", "terminal-db-delta", [dryResourceUuid(14)]],
    ["user-a", "failure-discovery", [dryResourceUuid(15)]],
    ["user-b", "failure-discovery", [dryResourceUuid(16)]],
    ["bootstrap-user-login-state", "preflight", [dryResourceUuid(17)]],
    ["site-content-routes-baseline", "preflight", ["site.contentRoutes"]],
    ["storage-baseline", "preflight", ["storage-baseline"]],
    ["missing-media-baseline", "preflight", [dryResourceUuid(18)]],
  ];
  const dryResourceCores = deepFreezeExact(
    dryResourceCoreSpecs.map(([kind, acquisitionChannel, identifier], index) =>
      createResourceCore({
        acquisitionChannel,
        acquisitionSourceId: "self-test-bun-resource-" + String(index + 1),
        identifier,
        kind,
        sourceActionOrdinal: index + 1,
      })
    )
  );
  const dryResourceDelta = deepFreezeExact({
    cores: dryResourceCores,
    dependencyEdges: [],
  });
  const dryResourceLedger = new ResourceLedgerBuilder();
  dryResourceLedger.appendValidatedDelta(dryResourceDelta);
  const dryPersistentResourceRecords = dryResourceLedger.compileResourceRecords("persistent");
  const dryTerminalResourceRecords = dryResourceLedger.compileResourceRecords("terminal");
  invariant(
    dryPersistentResourceRecords.length === 17 &&
      dryTerminalResourceRecords.length === 3 &&
      new Set(
        [...dryPersistentResourceRecords, ...dryTerminalResourceRecords].map(
          ({ resourceKey }) => resourceKey
        )
      ).size === dryResourceCores.length,
    "dry-dispatch resource cores did not cross the real ledger boundary"
  );
  const dryResourceDescriptorState = {};
  initializeBunBridgeOperationAuthority(dryResourceDescriptorState);
  promoteResourceBunDescriptorsAfterLedgerAppend(dryResourceDescriptorState, dryResourceDelta);
  assertResourceBunDescriptorSetExact(dryResourceDescriptorState, dryResourceCores);
  const staticDryDescriptors = Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS);
  const resourceDryDescriptors = [
    ...PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(dryResourceDescriptorState).values(),
  ];
  const seenResourceSpecKeys = new Set(
    resourceDryDescriptors.map((descriptor) =>
      descriptor.resourceSlot === "provenance"
        ? descriptor.resourceKind + "/provenance/" + descriptor.acquisitionChannel
        : descriptor.resourceKind + "/" + descriptor.resourceSlot
    )
  );
  invariant(
    staticDryDescriptors.length === 62 &&
      resourceDryDescriptors.length === 43 &&
      seenResourceSpecKeys.size === 41 &&
      Object.keys(RESOURCE_BUN_SOURCE_SPECS).length === 41 &&
      deepEqualJson(
        [...seenResourceSpecKeys].sort(),
        Object.keys(RESOURCE_BUN_SOURCE_SPECS).sort()
      ),
    "Bun dry-dispatch descriptor/spec matrix drift"
  );
  const dryResourceCoreByKey = new Map(dryResourceCores.map((core) => [core.resourceKey, core]));
  const dryExternalExecutionTrap = new Error("TASK-540 hermetic Bun external execution trap");
  let dryExternalExecutionTrapCalls = 0;
  const dryDispatchProjections = [];
  let credentialBearingDryDispatches = 0;
  for (const descriptor of [...staticDryDescriptors, ...resourceDryDescriptors]) {
    const core = Object.hasOwn(descriptor, "resourceKey")
      ? dryResourceCoreByKey.get(descriptor.resourceKey)
      : null;
    invariant(
      core !== undefined,
      descriptor.operationId + " dry-dispatch resource core binding is absent"
    );
    const genericInput = selfTestBunBridgeInputForSchema(descriptor.inputSchemaId);
    let input = genericInput;
    if (core !== null && descriptor.inputSchemaId.startsWith("identifier-")) {
      input = deepFreezeExact({ identifier: core.identifier });
    } else if (core !== null && descriptor.inputSchemaId === "user-session-observation-input-v1") {
      input = deepFreezeExact({ ...genericInput, userId: core.identifier[0] });
    } else if (core !== null && descriptor.inputSchemaId === "media-id-input-v1") {
      input = deepFreezeExact({ mediaId: core.identifier[0] });
    } else if (core !== null && descriptor.inputSchemaId === "bootstrap-restore-input-v1") {
      input = deepFreezeExact({
        ...genericInput,
        baseline: {
          ...genericInput.baseline,
          id: core.identifier[0],
          rawUserRow: {
            ...genericInput.baseline.rawUserRow,
            id: core.identifier[0],
          },
          roleTuples: genericInput.baseline.roleTuples.map((role) => ({
            ...role,
            userId: core.identifier[0],
          })),
        },
        userId: core.identifier[0],
      });
    }
    let trappedAtExternalBoundary = false;
    try {
      dryDispatchBunBridgeDescriptor({}, descriptor, input, (projection) => {
        dryExternalExecutionTrapCalls += 1;
        const credentialBearing = descriptor.inputSchemaId === "bootstrap-restore-input-v1";
        if (credentialBearing) credentialBearingDryDispatches += 1;
        invariant(
          projection.operationId === descriptor.operationId &&
            projection.sourceSha256 === descriptor.sourceSha256 &&
            projection.inputSchemaId === descriptor.inputSchemaId &&
            projection.outputSchemaId === descriptor.outputSchemaId &&
            Number.isSafeInteger(projection.frameBytes) &&
            projection.frameBytes > 0 &&
            !Object.hasOwn(projection, "frameSha256"),
          descriptor.operationId + " dry-dispatch projection drift"
        );
        dryDispatchProjections.push(projection);
        throw dryExternalExecutionTrap;
      });
    } catch (error) {
      trappedAtExternalBoundary = error === dryExternalExecutionTrap;
    }
    invariant(
      trappedAtExternalBoundary,
      descriptor.operationId + " did not reach the hermetic external-execution trap"
    );
  }
  invariant(
    dryExternalExecutionTrapCalls === 105 &&
      dryDispatchProjections.length === 105 &&
      credentialBearingDryDispatches === 2 &&
      new Set(dryDispatchProjections.map(({ operationId }) => operationId)).size === 105,
    "Bun static/resource dry-dispatch coverage drift"
  );
  const credentialDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/bootstrap-cas-restore"];
  const credentialInput = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const credentialPrepared = prepareBunBridgeDispatch({}, credentialDescriptor, credentialInput);
  const decodedCredentialFrame = JSON.parse(credentialPrepared.frame.toString("utf8"));
  invariant(
    !Object.hasOwn(credentialPrepared.projection, "frameSha256") &&
      decodedCredentialFrame.baseline.rawUserRow.passwordHash ===
        credentialInput.baseline.rawUserRow.passwordHash,
    "credential-bearing Bun frame projection drift"
  );
  const mutatedCredentialPrepared = prepareBunBridgeDispatch(
    {},
    credentialDescriptor,
    credentialInput
  );
  mutatedCredentialPrepared.frame[0] ^= 0x01;
  await expectAsyncFailure(
    async () =>
      assertPreparedBunBridgeFrameExact(
        {},
        credentialDescriptor,
        credentialInput,
        mutatedCredentialPrepared
      ),
    "mutated credential-bearing Bun frame"
  );
  const secretFreeDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-004b-session-policy-preflight"];
  const secretFreePrepared = prepareBunBridgeDispatch({}, secretFreeDescriptor, {});
  invariant(
    !Object.hasOwn(secretFreePrepared.projection, "frameSha256") &&
      secretFreePrepared.frame.equals(Buffer.from("{}\n")),
    "secret-free Bun frame projection drift"
  );
  const missingRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  delete missingRuntimeRegistry["runtime/set-001-storage-preflight"];
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({ runtimeRegistry: missingRuntimeRegistry }),
    "missing runtime Bun descriptor"
  );
  const extraOperationRegistry = {
    ...BUN_BRIDGE_OPERATION_DESCRIPTORS,
    "runtime/extra": BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-001-storage-preflight"],
  };
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({ operationRegistry: extraOperationRegistry }),
    "extra static Bun descriptor"
  );
  const reversedRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const reversedOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const reversedId = "runtime/set-001-storage-preflight";
  const reversedDescriptor = { ...reversedRuntimeRegistry[reversedId], envProfileId: "database" };
  reversedRuntimeRegistry[reversedId] = reversedDescriptor;
  reversedOperationRegistry[reversedId] = reversedDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: reversedOperationRegistry,
        runtimeRegistry: reversedRuntimeRegistry,
      }),
    "reversed runtime Bun environment profile"
  );
  const unknownOutputRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const unknownOutputOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const unknownOutputDescriptor = deepFreezeExact({
    ...unknownOutputRuntimeRegistry[reversedId],
    outputSchemaId: "unregistered-private-output-v1",
  });
  unknownOutputRuntimeRegistry[reversedId] = unknownOutputDescriptor;
  unknownOutputOperationRegistry[reversedId] = unknownOutputDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: unknownOutputOperationRegistry,
        runtimeRegistry: unknownOutputRuntimeRegistry,
      }),
    "unregistered Bun output schema"
  );
  const driftedLimitRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const driftedLimitOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const driftedLimitDescriptor = deepFreezeExact({
    ...driftedLimitRuntimeRegistry[reversedId],
    maxStdoutBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes + 1,
  });
  driftedLimitRuntimeRegistry[reversedId] = driftedLimitDescriptor;
  driftedLimitOperationRegistry[reversedId] = driftedLimitDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: driftedLimitOperationRegistry,
        runtimeRegistry: driftedLimitRuntimeRegistry,
      }),
    "drifted Bun descriptor stream bound"
  );
  const guardedDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-001-storage-preflight"];
  const exactChildGuard = bridgeInputSchemaGuard(guardedDescriptor.inputSchemaId);
  invariant(
    guardedDescriptor.source.startsWith(BRIDGE_INPUT_READER + exactChildGuard),
    "self-test child input guard fixture drift"
  );
  const sourceWithoutChildGuard =
    BRIDGE_INPUT_READER +
    guardedDescriptor.source.slice((BRIDGE_INPUT_READER + exactChildGuard).length);
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOperationDescriptor(
        deepFreezeExact({
          ...guardedDescriptor,
          source: sourceWithoutChildGuard,
          sourceSha256: hashBytes(Buffer.from(sourceWithoutChildGuard)),
        })
      ),
    "Bun child source without its independently bound input schema guard"
  );
  await expectAsyncFailure(
    async () =>
      encodeBoundedBunBridgeCanonicalFrame(
        { payload: "x".repeat(BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes) },
        BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes
      ),
    "over-limit Bun descriptor input frame"
  );
  const storageContractRoot = "/task540-self-test-root";
  const storageContractTimestamp = "2026-07-16T00:00:00.000Z";
  const storageContractRequiredSettings = deepFreezeExact({
    driver: {
      key: "storage.driver",
      updatedAt: storageContractTimestamp,
      value: "local",
    },
    localDir: {
      key: "storage.local.dir",
      updatedAt: storageContractTimestamp,
      value: "./storage/media",
    },
    setup: {
      key: "setup.completed",
      updatedAt: storageContractTimestamp,
      value: true,
    },
  });
  const storageContractOutput = deepFreezeExact({
    bootstrap: selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1").baseline,
    contentRoutes: { exists: false, updatedAt: null, value: null },
    local: true,
    requiredSettings: storageContractRequiredSettings,
    setupComplete: true,
    storageRoot: path.resolve(storageContractRoot, "core", "./storage/media"),
    taskTrafficBaseline: { accessIds: [], auditIds: [], sessionIds: [] },
  });
  const storageContractState = { root: storageContractRoot };
  invariant(
    validateBunBridgeOutput(storageContractState, guardedDescriptor, {}, storageContractOutput) ===
      storageContractOutput,
    "storage preflight exact positive contract drift"
  );
  invariant(
    responseLostStorageRoot({
      root: storageContractRoot,
      storageRootBaseline: storageContractOutput.storageRoot,
    }) === storageContractOutput.storageRoot,
    "storage response-lost absolute root guard drift"
  );
  const storageOutputWithoutSetting = structuredClone(storageContractOutput);
  delete storageOutputWithoutSetting.requiredSettings.localDir;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithoutSetting
      ),
    "storage preflight missing required setting"
  );
  const storageOutputWithUnknownSetting = structuredClone(storageContractOutput);
  storageOutputWithUnknownSetting.requiredSettings.unexpected = {
    key: "unexpected",
    updatedAt: storageContractTimestamp,
    value: "unexpected",
  };
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithUnknownSetting
      ),
    "storage preflight unknown required setting"
  );
  const storageOutputWithoutNestedField = structuredClone(storageContractOutput);
  delete storageOutputWithoutNestedField.requiredSettings.localDir.updatedAt;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithoutNestedField
      ),
    "storage preflight missing nested required-setting field"
  );
  const storageOutputWithUnknownNestedField = structuredClone(storageContractOutput);
  storageOutputWithUnknownNestedField.requiredSettings.localDir.unexpected = true;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithUnknownNestedField
      ),
    "storage preflight unknown nested required-setting field"
  );
  const storageOutputWithWrongKey = structuredClone(storageContractOutput);
  storageOutputWithWrongKey.requiredSettings.localDir.key = "storage.local.directory";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongKey
      ),
    "storage preflight wrong required setting key"
  );
  const storageOutputWithWrongValue = structuredClone(storageContractOutput);
  storageOutputWithWrongValue.requiredSettings.driver.value = "s3";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongValue
      ),
    "storage preflight wrong required setting value"
  );
  const storageOutputWithEmptyLocalDir = structuredClone(storageContractOutput);
  storageOutputWithEmptyLocalDir.requiredSettings.localDir.value = "";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithEmptyLocalDir
      ),
    "storage preflight empty local directory"
  );
  const storageOutputWithWrongTimestamp = structuredClone(storageContractOutput);
  storageOutputWithWrongTimestamp.requiredSettings.setup.updatedAt = null;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongTimestamp
      ),
    "storage preflight missing required setting timestamp"
  );
  const storageOutputWithMalformedTimestamp = structuredClone(storageContractOutput);
  storageOutputWithMalformedTimestamp.requiredSettings.setup.updatedAt = "not-an-iso-timestamp";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithMalformedTimestamp
      ),
    "storage preflight malformed required setting timestamp"
  );
  for (const [label, storageRoot] of [
    ["wrong core", path.resolve(storageContractRoot, "storage/media")],
    ["relative", "./storage/media"],
    ["noncanonical", storageContractRoot + "/core/storage/../storage/media"],
  ]) {
    const invalidStorageRootOutput = structuredClone(storageContractOutput);
    invalidStorageRootOutput.storageRoot = storageRoot;
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          storageContractState,
          guardedDescriptor,
          {},
          invalidStorageRootOutput
        ),
      "storage preflight " + label + " root"
    );
  }
  await expectAsyncFailure(
    async () =>
      responseLostStorageRoot({
        root: storageContractRoot,
        storageRootBaseline: "./storage/media",
      }),
    "response-lost relative storage root"
  );
  const emptyStorageEnvironment = Object.create(null);
  assertStorageFallbackEnvironmentAbsent(emptyStorageEnvironment, emptyStorageEnvironment);
  for (const key of ["MEDIA_STORAGE", "MEDIA_DIR"]) {
    await expectAsyncFailure(
      async () =>
        assertStorageFallbackEnvironmentAbsent(
          Object.assign(Object.create(null), { [key]: "" }),
          emptyStorageEnvironment
        ),
      "repo storage fallback presence " + key
    );
    await expectAsyncFailure(
      async () =>
        assertStorageFallbackEnvironmentAbsent(
          emptyStorageEnvironment,
          Object.assign(Object.create(null), { [key]: "" })
        ),
      "inherited storage fallback presence " + key
    );
  }
  const finalStorageContractState = {
    bootstrapBaseline: storageContractOutput.bootstrap,
    contentRoutesBaseline: storageContractOutput.contentRoutes,
    requiredSettingsBaseline: storageContractOutput.requiredSettings,
    storageRootBaseline: storageContractOutput.storageRoot,
    taskTrafficBaseline: storageContractOutput.taskTrafficBaseline,
  };
  assertFinalStorageDatabaseBaseline(
    finalStorageContractState,
    storageContractOutput,
    structuredClone(storageContractOutput)
  );
  const finalStorageTimestampDrift = structuredClone(storageContractOutput);
  finalStorageTimestampDrift.requiredSettings.localDir.updatedAt = "2026-07-16T00:00:00.001Z";
  await expectAsyncFailure(
    async () =>
      assertFinalStorageDatabaseBaseline(
        finalStorageContractState,
        finalStorageTimestampDrift,
        structuredClone(finalStorageTimestampDrift)
      ),
    "final storage required-setting timestamp drift"
  );
  const finalStorageByteDrift = structuredClone(storageContractOutput);
  finalStorageByteDrift.requiredSettings.localDir.value = "./storage/medib";
  await expectAsyncFailure(
    async () =>
      assertFinalStorageDatabaseBaseline(
        finalStorageContractState,
        finalStorageByteDrift,
        structuredClone(finalStorageByteDrift)
      ),
    "final storage required-setting byte drift"
  );
  const preferenceOutputDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-042-preference-a-proof"];
  invariant(
    validateBunBridgeOutput(
      {},
      preferenceOutputDescriptor,
      { userId: "54000000-0000-4000-8000-000000007401" },
      { showFieldMetadata: true }
    ).showFieldMetadata === true,
    "central Bun output validator selection drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        preferenceOutputDescriptor,
        { userId: "54000000-0000-4000-8000-000000007401" },
        { showFieldMetadata: true, unexpected: true }
      ),
    "unknown top-level Bun output field"
  );
  const apiSessionOutputDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/api-session-observation"];
  const apiSessionUserId = "54000000-0000-4000-8000-000000007402";
  const apiSessionUserAgent = "TASK-540/self-test-api-output";
  const apiSessionOutputRow = deepFreezeExact({
    createdAt: "2026-07-16T00:00:00.000Z",
    csrfTokenHash: "b".repeat(64),
    expiresAt: "2026-07-17T00:00:00.000Z",
    id: "54000000-0000-4000-8000-000000007403",
    ip: null,
    revokedAt: null,
    tokenHash: "a".repeat(64),
    userAgent: apiSessionUserAgent,
    userId: apiSessionUserId,
  });
  invariant(
    validateBunBridgeOutput(
      {},
      apiSessionOutputDescriptor,
      { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
      { rows: [apiSessionOutputRow] }
    ).rows.length === 1,
    "central nested Bun output validator drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, unexpected: true }] }
      ),
    "unknown nested Bun output field"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, id: [apiSessionOutputRow.id] }] }
      ),
    "array-coerced Bun output UUID"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, tokenHash: [apiSessionOutputRow.tokenHash] }] }
      ),
    "array-coerced Bun output hash"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput({}, preferenceOutputDescriptor, { userId: [apiSessionUserId] }),
    "array-coerced Bun input UUID"
  );
  const taskTrafficOutputDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["terminal/task-traffic-snapshot"];
  const taskTrafficUserAgents = [
    "TASK-540/self-test-terminal-one",
    "TASK-540/self-test-terminal-two",
    "TASK-540/self-test-terminal-three",
    "TASK-540/self-test-terminal-four",
  ];
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        taskTrafficOutputDescriptor,
        { userAgents: taskTrafficUserAgents },
        {
          access: [
            {
              id: ["54000000-0000-4000-8000-000000007404"],
              sessionId: null,
              userAgent: taskTrafficUserAgents[0],
              userId: null,
            },
          ],
          audit: [],
          completeSession: [],
          session: [],
        }
      ),
    "array-coerced terminal Bun output UUID"
  );
  const completeSessionBoundaryRows = Array.from(
    { length: MAX_COMPLETE_SESSION_ROWS },
    (_value, index) => ({
      id: `54000000-0000-4000-8000-${String(780000 + index).padStart(12, "0")}`,
      userAgent: null,
      userId: "54000000-0000-4000-8000-000000007406",
    })
  );
  invariant(
    validateBunBridgeOutput(
      {},
      taskTrafficOutputDescriptor,
      { userAgents: taskTrafficUserAgents },
      {
        access: [],
        audit: [],
        completeSession: completeSessionBoundaryRows,
        session: [],
      }
    ).completeSession.length === MAX_COMPLETE_SESSION_ROWS,
    "exact-limit complete-session Bun output inventory drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        taskTrafficOutputDescriptor,
        { userAgents: taskTrafficUserAgents },
        {
          access: [],
          audit: [],
          completeSession: [
            ...completeSessionBoundaryRows,
            {
              id: "54000000-0000-4000-8000-000000007405",
              userAgent: null,
              userId: "54000000-0000-4000-8000-000000007406",
            },
          ],
          session: [],
        }
      ),
    "over-limit complete-session Bun output inventory"
  );
  for (const [blueprintKey, blueprint] of Object.entries(plan.fixtureBlueprint.contentTypes)) {
    validateResponseLostContentSchema(
      contentSchemaFromFields(blueprint.fields),
      "self-test authored content schema " + blueprintKey
    );
  }
  const authoredEditableFields = plan.fixtureBlueprint.contentTypes.editable.fields;
  const authoredMediaField = authoredEditableFields.find(({ type }) => type === "media");
  const authoredRelationField = authoredEditableFields.find(({ type }) => type === "relation");
  invariant(
    authoredMediaField?.media && authoredRelationField?.relation,
    "self-test authored content union fixtures are absent"
  );
  const multipleMediaContentSchema = contentSchemaFromFields([
    {
      ...authoredMediaField,
      media: { ...authoredMediaField.media, multiple: true },
      name: "multipleMediaProof",
    },
  ]);
  const singleRelationContentSchema = contentSchemaFromFields([
    {
      ...authoredRelationField,
      name: "singleRelationProof",
      relation: { ...authoredRelationField.relation, multiple: false },
    },
  ]);
  validateResponseLostContentSchema(
    multipleMediaContentSchema,
    "self-test authored multiple-media content schema"
  );
  validateResponseLostContentSchema(
    singleRelationContentSchema,
    "self-test authored single-relation content schema"
  );
  const responseLostPreferredInputSchemaByFamily = {
    contentType: "slug-input-v1",
    entry: "entry-discovery-input-v1",
    media: "media-natural-input-v1",
    override: "override-discovery-input-v1",
    screen: "screen-discovery-input-v1",
    setting: "user-id-input-v1",
    user: "email-input-v1",
  };
  const responseLostCandidateDescriptorByFamily = Object.fromEntries(
    Object.keys(responseLostPreferredInputSchemaByFamily).map((family) => {
      const descriptor = Object.values(BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS).find(
        (candidateDescriptor) =>
          responseLostCandidateFamilyForDescriptor(candidateDescriptor) === family &&
          candidateDescriptor.inputSchemaId === responseLostPreferredInputSchemaByFamily[family]
      );
      invariant(descriptor !== undefined, family + " response-lost self-test descriptor is absent");
      return [family, descriptor];
    })
  );
  const responseLostCandidateInputByFamily = Object.fromEntries(
    Object.entries(responseLostCandidateDescriptorByFamily).map(([family, descriptor]) => [
      family,
      selfTestBunBridgeInputForSchema(descriptor.inputSchemaId),
    ])
  );
  const candidateUuid = (ordinal) =>
    `54000000-0000-4000-8000-${String(7700 + ordinal).padStart(12, "0")}`;
  const mediaCandidateKey = `2026/07/${candidateUuid(8)}.png`;
  const responseLostValidCandidateByFamily = {
    user: {
      adminRoleTupleCount: 1,
      adminWildcardPermissionCount: 1,
      id: candidateUuid(1),
      name: "Task 540 User",
      normalizedEmailMatches: true,
      passwordHashPresent: true,
      status: "active",
    },
    contentType: {
      config: {},
      id: candidateUuid(2),
      name: "Task 540 Type",
      schema: { additionalProperties: false, properties: {}, type: "object" },
      slug: responseLostCandidateInputByFamily.contentType.slug,
      status: "draft",
    },
    entry: {
      accessPasswordAbsent: true,
      authorId: null,
      data: {},
      id: candidateUuid(3),
      publishedAt: null,
      scheduledAt: null,
      slug: responseLostCandidateInputByFamily.entry.slug,
      status: "draft",
      tags: [],
      title: "Task 540 Entry",
      typeId: responseLostCandidateInputByFamily.entry.typeId,
      visibility: "public",
    },
    screen: {
      collectionRole: null,
      compositionKey: null,
      contentTypeId: responseLostCandidateInputByFamily.screen.contentTypeId,
      definition: { editorView: {}, listView: {}, schemaVersion: 4 },
      id: candidateUuid(4),
      name: responseLostCandidateInputByFamily.screen.name,
      schemaVersion: 4,
      showInSidebar: true,
      sidebarLabel: null,
      status: "active",
    },
    media: {
      alt: null,
      caption: null,
      createdBy: null,
      credit: null,
      description: null,
      focalX: null,
      focalY: null,
      folderId: null,
      height: null,
      id: candidateUuid(8),
      key: mediaCandidateKey,
      mimeType: responseLostCandidateInputByFamily.media.mimeType,
      originalName: responseLostCandidateInputByFamily.media.originalName,
      size: responseLostCandidateInputByFamily.media.size,
      tags: [],
      title: null,
      type: "image",
      url: "/media/" + mediaCandidateKey,
      width: null,
    },
    override: {
      blockId: responseLostCandidateInputByFamily.override.blockId,
      entryId: responseLostCandidateInputByFamily.override.entryId,
      propPath: responseLostCandidateInputByFamily.override.propPath,
      screenId: responseLostCandidateInputByFamily.override.screenId,
      updatedBy: null,
      value: candidateUuid(9),
    },
    setting: {
      key: "customScreens.entry.preferences",
      userId: responseLostCandidateInputByFamily.setting.userId,
      value: { showFieldMetadata: false, version: 1 },
    },
  };
  for (const family of Object.keys(responseLostValidCandidateByFamily)) {
    const candidate = responseLostValidCandidateByFamily[family];
    invariant(
      validateBunBridgeOutput(
        {},
        responseLostCandidateDescriptorByFamily[family],
        responseLostCandidateInputByFamily[family],
        { candidates: [candidate], overflow: false }
      ).candidates[0] === candidate,
      family + " response-lost candidate positive contract drift"
    );
  }
  const responseLostCandidateNegativeByFamily = {
    user: {
      ...responseLostValidCandidateByFamily.user,
      adminRoleTupleCount: [1],
    },
    contentType: {
      ...responseLostValidCandidateByFamily.contentType,
      config: { permissions: { admin: { read: "true" } } },
    },
    entry: {
      ...responseLostValidCandidateByFamily.entry,
      ["access" + "Password"]: "forbidden-self-test-value",
    },
    screen: {
      ...responseLostValidCandidateByFamily.screen,
      definition: {
        ...responseLostValidCandidateByFamily.screen.definition,
        schemaVersion: 3,
      },
    },
    media: {
      ...responseLostValidCandidateByFamily.media,
      tags: ["hero", 1],
    },
    override: {
      ...responseLostValidCandidateByFamily.override,
      value: [candidateUuid(9)],
    },
    setting: {
      ...responseLostValidCandidateByFamily.setting,
      value: {
        ...responseLostValidCandidateByFamily.setting.value,
        unexpected: true,
      },
    },
  };
  for (const family of Object.keys(responseLostCandidateNegativeByFamily)) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          {},
          responseLostCandidateDescriptorByFamily[family],
          responseLostCandidateInputByFamily[family],
          {
            candidates: [responseLostCandidateNegativeByFamily[family]],
            overflow: false,
          }
        ),
      family + " malformed response-lost candidate"
    );
  }
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        responseLostCandidateDescriptorByFamily.contentType,
        responseLostCandidateInputByFamily.contentType,
        {
          candidates: [
            {
              ...responseLostValidCandidateByFamily.contentType,
              schema: {
                additionalProperties: false,
                properties: {
                  impossibleTextArray: {
                    title: "Impossible text array",
                    type: "array",
                    xFieldConfig: { order: 0 },
                    xFieldType: "text",
                  },
                },
                type: "object",
              },
            },
          ],
          overflow: false,
        }
      ),
    "internally inconsistent content-type candidate schema"
  );
  const contentSchemaWithSingleProperty = (name, property) => ({
    additionalProperties: false,
    properties: { [name]: property },
    type: "object",
  });
  const multipleMediaProperty = multipleMediaContentSchema.properties.multipleMediaProof;
  const { items: ignoredMediaItems, ...multipleMediaWithoutItems } = multipleMediaProperty;
  void ignoredMediaItems;
  const singleRelationProperty = singleRelationContentSchema.properties.singleRelationProof;
  const twoTextContentSchema = contentSchemaFromFields(
    authoredEditableFields.filter(({ type }) => type === "text").slice(0, 2)
  );
  const twoTextNames = Object.keys(twoTextContentSchema.properties);
  invariant(twoTextNames.length === 2, "self-test text order fixture drift");
  const duplicateOrderContentSchema = {
    ...twoTextContentSchema,
    properties: {
      ...twoTextContentSchema.properties,
      [twoTextNames[1]]: {
        ...twoTextContentSchema.properties[twoTextNames[1]],
        xFieldConfig: {
          ...twoTextContentSchema.properties[twoTextNames[1]].xFieldConfig,
          order: 0,
        },
      },
    },
  };
  const contentSchemaInvariantNegatives = [
    [
      "foreign media branch key",
      contentSchemaWithSingleProperty("multipleMediaProof", {
        ...multipleMediaProperty,
        xRelationTarget: "forbidden-target",
      }),
    ],
    [
      "multiple media missing items",
      contentSchemaWithSingleProperty("multipleMediaProof", multipleMediaWithoutItems),
    ],
    [
      "single relation with array type",
      contentSchemaWithSingleProperty("singleRelationProof", {
        ...singleRelationProperty,
        items: { type: "string" },
        type: "array",
      }),
    ],
    [
      "relation target mismatch",
      contentSchemaWithSingleProperty("singleRelationProof", {
        ...singleRelationProperty,
        xRelationTarget: singleRelationProperty.xRelationTarget + "-drift",
      }),
    ],
    ["duplicate field order", duplicateOrderContentSchema],
  ];
  for (const [label, schema] of contentSchemaInvariantNegatives) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          {},
          responseLostCandidateDescriptorByFamily.contentType,
          responseLostCandidateInputByFamily.contentType,
          {
            candidates: [
              {
                ...responseLostValidCandidateByFamily.contentType,
                schema,
              },
            ],
            overflow: false,
          }
        ),
      "content-type schema " + label
    );
  }
  invariant(
    BRIDGE_INPUT_READER.includes("validateJsonBounds(input);") &&
      BRIDGE_INPUT_READER.includes("nodes > 100000 || current.depth > 64") &&
      BRIDGE_INPUT_READER.includes("value.length > 10000"),
    "Bun child recursive JSON input bound source drift"
  );
  const screenMaterializeInput = selfTestBunBridgeInputForSchema("screen-materialize-input-v1");
  const screenMaterializeDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-035-screen-create"];
  let overDepthScreenSchema = {};
  for (let depth = 0; depth < 65; depth += 1) {
    overDepthScreenSchema = { nested: overDepthScreenSchema };
  }
  const bootstrapRestoreInput = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const bunInputParityNegativeCases = [
    [
      "Screen content schema object root",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        contentType: { ...screenMaterializeInput.contentType, schema: "not-an-object" },
      },
    ],
    [
      "Screen editor object root",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        definitionWithoutListView: {
          ...screenMaterializeInput.definitionWithoutListView,
          editorView: [],
        },
      },
    ],
    [
      "Screen recursive JSON depth",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        contentType: {
          ...screenMaterializeInput.contentType,
          schema: overDepthScreenSchema,
        },
      },
    ],
    [
      "bootstrap role-permission array",
      "bootstrap-restore-input-v1",
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/bootstrap-cas-restore"],
      {
        ...bootstrapRestoreInput,
        baseline: {
          ...bootstrapRestoreInput.baseline,
          roleTuples: bootstrapRestoreInput.baseline.roleTuples.map((role) => ({
            ...role,
            rolePermissions: "*",
          })),
        },
      },
    ],
  ];
  for (const [label, schemaId, descriptor, malformedInput] of bunInputParityNegativeCases) {
    await expectAsyncFailure(
      async () => validateBunBridgeInput({}, descriptor, malformedInput),
      "Node " + label + " alignment"
    );
    await expectAsyncFailure(
      async () => selfTestExactBunChildInputSource(schemaId, malformedInput),
      "child " + label + " alignment"
    );
  }
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-041-preference-a"],
        { showFieldMetadata: "true", userId: apiSessionUserId }
      ),
    "wrong Bun input scalar"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["terminal/task-traffic-snapshot"],
        { userAgents: ["TASK-540/one", "TASK-540/two", "TASK-540/three"] }
      ),
    "wrong Bun input tuple bound"
  );
  const resourceOwnerInput = {
    entryIds: [
      "54000000-0000-4000-8000-000000007410",
      "54000000-0000-4000-8000-000000007411",
      "54000000-0000-4000-8000-000000007412",
      "54000000-0000-4000-8000-000000007413",
      "54000000-0000-4000-8000-000000007414",
      "54000000-0000-4000-8000-000000007415",
    ],
    mediaId: "54000000-0000-4000-8000-000000007416",
    override: {
      blockId: "task-540-block",
      entryId: "54000000-0000-4000-8000-000000007410",
      propPath: "mediaAssetId",
      screenId: "54000000-0000-4000-8000-000000007417",
    },
    overrideExpectedPresent: true,
  };
  invariant(
    validateBunBridgeInput(
      {},
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/current-owner-exact"],
      resourceOwnerInput
    ) === resourceOwnerInput,
    "nested Bun input validator drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/current-owner-exact"],
        { ...resourceOwnerInput, override: { ...resourceOwnerInput.override, unexpected: true } }
      ),
    "unknown nested Bun input field"
  );
  const descriptorSelectionState = {};
  initializeBunBridgeOperationAuthority(descriptorSelectionState);
  invariant(
    bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/set-001-storage-preflight")
      .source === STORAGE_PREFLIGHT_BRIDGE_SOURCE &&
      bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/set-012-user-a-create")
        .source === USER_PROVISION_BRIDGE_SOURCE,
    "Bun operation payload selection drift"
  );
  await expectAsyncFailure(
    async () => bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/not-registered"),
    "unregistered Bun operation payload selection"
  );
  const removedPrivateStaticDescriptor = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(
    descriptorSelectionState
  ).get("runtime/set-001-storage-preflight");
  PRIVATE_BUN_OPERATION_DESCRIPTORS.get(descriptorSelectionState).delete(
    "runtime/set-001-storage-preflight"
  );
  await expectAsyncFailure(
    async () =>
      bunBridgeDescriptorForOperation(
        descriptorSelectionState,
        "runtime/set-001-storage-preflight"
      ),
    "missing private static Bun operation descriptor"
  );
  PRIVATE_BUN_OPERATION_DESCRIPTORS.get(descriptorSelectionState).set(
    "runtime/set-001-storage-preflight",
    removedPrivateStaticDescriptor
  );
  await expectAsyncFailure(
    async () => bunBridgeDescriptorForOperation({}, "runtime/set-001-storage-preflight"),
    "missing private Bun operation registry"
  );
  const resourceDescriptorState = {};
  initializeBunBridgeOperationAuthority(resourceDescriptorState);
  const descriptorProbeCore = createResourceCore({
    kind: "media-row-key",
    identifier: ["54000000-0000-4000-8000-000000007777", "task-540/descriptor-probe.png"],
    ownerSubjectIdentifier: null,
    acquisitionSourceId: "descriptor-probe",
    sourceActionOrdinal: 1,
    acquisitionChannel: "admin-api",
  });
  const descriptorProbeDelta = deepFreezeExact({
    cores: [descriptorProbeCore],
    dependencyEdges: [],
  });
  promoteResourceBunDescriptorsAfterLedgerAppend(resourceDescriptorState, descriptorProbeDelta);
  assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]);
  const probeRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(resourceDescriptorState);
  invariant(
    probeRegistry.get(descriptorProbeCore.provenanceOpId).source ===
      MEDIA_EXACT_BRIDGE_SOURCES.provenance &&
      probeRegistry.get(descriptorProbeCore.cleanupOpId).source ===
        MEDIA_EXACT_BRIDGE_SOURCES.delete &&
      probeRegistry.get(descriptorProbeCore.absenceOpId).source ===
        MEDIA_EXACT_BRIDGE_SOURCES.absence &&
      new Set([
        probeRegistry.get(descriptorProbeCore.provenanceOpId).sourceSha256,
        probeRegistry.get(descriptorProbeCore.cleanupOpId).sourceSha256,
        probeRegistry.get(descriptorProbeCore.absenceOpId).sourceSha256,
      ]).size === 3,
    "resource Bun P/C/A payload identity drift"
  );
  const removedProbeDescriptor = probeRegistry.get(descriptorProbeCore.absenceOpId);
  probeRegistry.delete(descriptorProbeCore.absenceOpId);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "missing resource Bun descriptor"
  );
  probeRegistry.set(descriptorProbeCore.absenceOpId, removedProbeDescriptor);
  probeRegistry.set("resource/extra", removedProbeDescriptor);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "extra resource Bun descriptor"
  );
  probeRegistry.delete("resource/extra");
  const cleanupDescriptor = probeRegistry.get(descriptorProbeCore.cleanupOpId);
  const absenceDescriptor = probeRegistry.get(descriptorProbeCore.absenceOpId);
  probeRegistry.set(descriptorProbeCore.cleanupOpId, absenceDescriptor);
  probeRegistry.set(descriptorProbeCore.absenceOpId, cleanupDescriptor);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "reversed resource Bun cleanup/absence descriptors"
  );

  const mutablePendingRegistry = new PendingFailureAttemptRegistry();
  const mutablePendingAction = plan.actionManifest.find(
    ({ id }) => id === "set-016-editable-type-create"
  );
  await expectAsyncFailure(
    async () =>
      mutablePendingRegistry.arm(mutablePendingAction, [], {
        naturalKey: { slug: "mutable" },
        baseline: { candidates: [] },
        authoredRequestSha256: hashBytes(Buffer.from("mutable-request")),
      }),
    "mutable response-lost request/baseline"
  );

  const responseLostAction = mutablePendingAction;
  const responseLostBlueprint = plan.fixtureBlueprint.contentTypes.editable;
  const responseLostAuthoredProjection = deepFreezeExact({
    name: responseLostBlueprint.name,
    slug: responseLostBlueprint.slug,
    schema: contentSchemaFromFields(responseLostBlueprint.fields),
    status: "draft",
    config: deepFreezeExact({}),
  });
  const responseLostNaturalKey = deepFreezeExact({ slug: responseLostBlueprint.slug });
  const responseLostDigest = hashBytes(Buffer.from(canonicalJson(responseLostAuthoredProjection)));
  const responseLostBaselineCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007101",
    name: "Pre-existing natural-key row",
    slug: responseLostBlueprint.slug,
    schema: deepFreezeExact({ type: "object" }),
    status: "draft",
    config: deepFreezeExact({}),
  });
  const responseLostCreatedCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007102",
    ...responseLostAuthoredProjection,
  });
  const makeResponseLostState = () => ({
    plan,
    responseLostIntents: new Map([
      [
        responseLostAction.id,
        deepFreezeExact({
          naturalKey: responseLostNaturalKey,
          authoredProjection: responseLostAuthoredProjection,
          authoredRequestSha256: responseLostDigest,
          preparedBody: null,
        }),
      ],
    ]),
    resourceKeys: new Map(),
    resourceOwners: new Map(),
    syntheticOwnerEdgeKeys: new Set(),
    fixtureIds: new Map(),
    ids: Object.create(null),
  });
  const responseLostAttempt = deepFreezeExact({
    pendingAttemptKey: "pending:response-lost-real-path",
    actionId: responseLostAction.id,
    actionOrdinal: responseLostAction.ordinal,
    kind: "content-type",
    semantic: "content-type-editable",
    naturalKey: responseLostNaturalKey,
    baseline: deepFreezeExact({ candidates: deepFreezeExact([responseLostBaselineCandidate]) }),
    authoredRequestSha256: responseLostDigest,
    failureObservationSha256: hashBytes(
      Buffer.from(canonicalJson({ name: "Error", code: "response_lost" }))
    ),
    intendedParentBlockerKeys: deepFreezeExact([]),
  });
  const discoveredState = makeResponseLostState();
  let discoveredQueryCount = 0;
  const discoveredResult = await discoverOneResponseLostCreate(
    discoveredState,
    responseLostAttempt,
    async (actionId, naturalKey) => {
      discoveredQueryCount += 1;
      invariant(
        actionId === responseLostAction.id && naturalKey === responseLostNaturalKey,
        "response-lost query input identity drift"
      );
      return deepFreezeExact({
        candidates: deepFreezeExact([responseLostBaselineCandidate, responseLostCreatedCandidate]),
      });
    }
  );
  invariant(
    discoveredQueryCount === 1 &&
      discoveredResult.failure === null &&
      discoveredResult.safeDelta.cores.length === 1 &&
      discoveredState.resourceKeys.size === 0,
    "response-lost exact discovered-create path drift"
  );
  const discoveredLedger = new ResourceLedgerBuilder();
  discoveredLedger.appendValidatedDelta(discoveredResult.safeDelta);
  registerFailureDiscoveredResourceAfterLedgerAppend(
    discoveredState,
    responseLostAttempt,
    discoveredResult.safeDelta
  );
  invariant(
    discoveredState.fixtureIds.get("content-type-editable") === responseLostCreatedCandidate.id &&
      discoveredLedger.compileResourceRecords("persistent").length === 1,
    "response-lost discovered create did not atomically join cleanup inventory"
  );
  let absentQueryCount = 0;
  const absentResult = await discoverOneResponseLostCreate(
    makeResponseLostState(),
    responseLostAttempt,
    async () => {
      absentQueryCount += 1;
      return deepFreezeExact({ candidates: deepFreezeExact([responseLostBaselineCandidate]) });
    }
  );
  invariant(
    absentQueryCount === 1 &&
      absentResult.failure === null &&
      absentResult.safeDelta.cores.length === 0,
    "response-lost exact absence path drift"
  );
  let ambiguousQueryCount = 0;
  const ambiguousBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    deepFreezeExact([responseLostAttempt]),
    (attempt) =>
      discoverOneResponseLostCreate(makeResponseLostState(), attempt, async () => {
        ambiguousQueryCount += 1;
        return deepFreezeExact({
          candidates: deepFreezeExact([
            responseLostBaselineCandidate,
            responseLostCreatedCandidate,
            deepFreezeExact({
              ...responseLostCreatedCandidate,
              id: "54000000-0000-4000-8000-000000007103",
            }),
          ]),
        });
      })
  );
  invariant(
    ambiguousQueryCount === 1 &&
      ambiguousBatch.attemptResults[0].failure?.code === "failure_discovery_ambiguous" &&
      ambiguousBatch.attemptResults[0].safeDelta.cores.length === 0,
    "response-lost ambiguity did not fail per-attempt without delete authority"
  );
  const mixedAttempts = deepFreezeExact([
    deepFreezeExact({ ...responseLostAttempt, pendingAttemptKey: "pending:mixed-discovered" }),
    deepFreezeExact({ ...responseLostAttempt, pendingAttemptKey: "pending:mixed-absent" }),
    deepFreezeExact({
      ...responseLostAttempt,
      pendingAttemptKey: "pending:mixed-ambiguous",
      intendedParentBlockerKeys: deepFreezeExact(["mixed-parent"]),
    }),
  ]);
  const mixedBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    mixedAttempts,
    async (attempt) => {
      if (attempt.pendingAttemptKey === "pending:mixed-discovered") {
        return deepFreezeExact({
          ...discoveredResult,
          pendingAttemptKey: attempt.pendingAttemptKey,
        });
      }
      if (attempt.pendingAttemptKey === "pending:mixed-absent") {
        return deepFreezeExact({
          ...absentResult,
          pendingAttemptKey: attempt.pendingAttemptKey,
        });
      }
      throw new Error("private mixed ambiguous discovery");
    }
  );
  const mixedLedger = new ResourceLedgerBuilder();
  for (const result of mixedBatch.attemptResults)
    mixedLedger.appendValidatedDelta(result.safeDelta);
  const mixedBlocked = compileBlockedParentClosure(
    { "mixed-ancestor": ["mixed-parent"], "mixed-parent": [], "mixed-independent": [] },
    mixedBatch.attemptResults.flatMap(({ intendedParentBlockerKeys }) => intendedParentBlockerKeys)
  );
  invariant(
    mixedLedger.compileResourceRecords("persistent").length === 1 &&
      mixedBatch.attemptResults.filter(({ failure }) => failure !== null).length === 1 &&
      deepEqualJson(mixedBlocked, ["mixed-ancestor", "mixed-parent"]),
    "mixed discovered/absent/ambiguous response-lost batch drift"
  );
  negativeCases += 1;
  const pendingMatrix = new PendingFailureAttemptRegistry();
  const pendingActionA = plan.actionManifest.find(
    ({ id }) => id === RESPONSE_LOST_CREATE_ACTION_IDS[0]
  );
  const pendingActionB = plan.actionManifest.find(
    ({ id }) => id === RESPONSE_LOST_CREATE_ACTION_IDS[1]
  );
  pendingMatrix.arm(
    pendingActionA,
    [],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "pending-a" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("pending-a-authored-request")),
    })
  );
  pendingMatrix.arm(
    pendingActionB,
    ["existing-parent-key"],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "pending-b" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("pending-b-authored-request")),
    })
  );
  await expectAsyncFailure(
    async () =>
      pendingMatrix.arm(
        pendingActionA,
        [],
        deepFreezeExact({
          naturalKey: deepFreezeExact({ key: "duplicate" }),
          baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
          authoredRequestSha256: hashBytes(Buffer.from("duplicate-pending-request")),
        })
      ),
    "duplicate pending response-lost attempt"
  );
  const missingObservationRegistry = new PendingFailureAttemptRegistry();
  missingObservationRegistry.arm(
    pendingActionA,
    [],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "missing-observation" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("missing-observation-request")),
    })
  );
  await expectAsyncFailure(
    async () => missingObservationRegistry.takeFrozenOnce(),
    "pending response-lost attempt missing failure observation"
  );
  pendingMatrix.retainPrimaryFailureObservation(
    Object.assign(new Error("private pending failure"), {
      code: "response_lost",
    })
  );
  const pendingAttempts = pendingMatrix.takeFrozenOnce();
  const expectedFailureObservationHash = hashBytes(
    Buffer.from(canonicalJson({ name: "Error", code: "response_lost" }))
  );
  invariant(
    pendingAttempts.every(
      ({ failureObservationSha256 }) => failureObservationSha256 === expectedFailureObservationHash
    ) && expectedFailureObservationHash !== hashBytes(Buffer.from("private pending failure")),
    "pending failure observation hash was not derived from the real private observation projection"
  );
  const responseLostBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    pendingAttempts,
    async (attempt) => {
      if (attempt === pendingAttempts[0]) {
        return deepFreezeExact({
          pendingAttemptKey: attempt.pendingAttemptKey,
          safeDelta: emptyResourceDelta(),
          failure: null,
          intendedParentBlockerKeys: deepFreezeExact([]),
        });
      }
      throw new Error("private per-attempt adapter failure");
    }
  );
  invariant(
    responseLostBatch.attemptResults.length === 2 &&
      responseLostBatch.attemptResults[0].failure === null &&
      responseLostBatch.attemptResults[1].failure?.code === "failure_discovery_ambiguous" &&
      deepEqualJson(responseLostBatch.attemptResults[1].intendedParentBlockerKeys, [
        "existing-parent-key",
      ]),
    "response-lost mixed result batch drift"
  );
  await expectAsyncFailure(
    async () => pendingMatrix.takeFrozenOnce(),
    "pending attempt batch double consumption"
  );
  invariant(
    Object.keys(RESOURCE_KIND_CONTRACTS).length === 26 &&
      Object.keys(RESOURCE_KIND_CONTRACTS).every(
        (kind) =>
          RESOURCE_KIND_CONTRACTS[kind].identifierArity ===
          RESOURCE_IDENTIFIER_TYPES[RESOURCE_KIND_CONTRACTS[kind].identifierType]
      ),
    "resource kind contract exhaustiveness drift"
  );
  await expectAsyncFailure(
    async () => new ResourceLedgerBuilder({ ...RESOURCE_KIND_CONTRACTS }),
    "resource contract registry substitution"
  );
  const planBoundaryLedger = new ResourceLedgerBuilder();
  const planBoundaryCore = createResourceCore({
    kind: "user-a",
    identifier: ["54000000-0000-4000-8000-000000007001"],
    acquisitionSourceId: "set-012-user-a-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-012-user-a-create"),
    acquisitionChannel: "service",
  });
  planBoundaryLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([planBoundaryCore]),
      dependencyEdges: deepFreezeExact([]),
    })
  );
  const planBoundaryPlanner = new ResourceCleanupPlanner();
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezeTerminal([]),
    "terminal plan before persistent plan"
  );
  const planBoundaryPersistentLedger = planBoundaryLedger.compileResourceRecords("persistent");
  const planBoundaryPersistentPlan = planBoundaryPlanner.freezePersistent(
    planBoundaryPersistentLedger,
    []
  );
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezePersistent(planBoundaryPersistentLedger, []),
    "persistent plan double assignment"
  );
  const planBoundaryTerminalLedger = planBoundaryLedger.compileResourceRecords("terminal");
  const planBoundaryTerminalPlan = planBoundaryPlanner.freezeTerminal(planBoundaryTerminalLedger);
  const planBoundaryFinalLedger = planBoundaryLedger.compileResourceRecords("final");
  const planBoundaryFinalPlan = planBoundaryPlanner.freezeFinal(planBoundaryFinalLedger);
  invariant(
    planBoundaryFinalPlan.persistentActionPlan === planBoundaryPersistentPlan &&
      planBoundaryFinalPlan.terminalActionPlan === planBoundaryTerminalPlan,
    "plan boundary object identity drift"
  );
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezeFinal(planBoundaryFinalLedger),
    "final plan double assignment"
  );
  const tupleKeys = ["matrix-a", "matrix-b", "matrix-c"];
  const exactTuples = cartesianCleanupTuples(tupleKeys);
  for (let mutationIndex = 0; mutationIndex < 27; mutationIndex += 1) {
    const tupleIndex = mutationIndex % exactTuples.length;
    let mutated;
    if (mutationIndex < 9) {
      mutated = exactTuples.filter((_, index) => index !== tupleIndex);
    } else if (mutationIndex < 18) {
      mutated = [...exactTuples, exactTuples[tupleIndex]];
    } else {
      mutated = exactTuples.map((tuple, index) =>
        index === tupleIndex ? deepFreezeExact([tuple[0], "unknown-operation"]) : tuple
      );
    }
    await expectAsyncFailure(
      async () => assertExactCleanupTupleSet(mutated, tupleKeys, "tuple mutation " + mutationIndex),
      "cleanup tuple mutation " + mutationIndex
    );
  }
  for (const [label, bytes] of [
    ["native CR", Buffer.from("value\r\n")],
    ["native BOM", Buffer.from("\uFEFFvalue\n")],
    ["native NUL", Buffer.from("value\0\n")],
  ]) {
    await expectAsyncFailure(async () => decodeExactNativeUtf8(bytes, label), label);
  }
  await expectAsyncFailure(
    async () =>
      exactOwnKeys(
        { ...evidence, unexpected: true },
        Object.keys(evidence),
        "evidence unknown key",
        { plain: true }
      ),
    "canonical evidence unknown key"
  );
  invariant(
    rawBytesAreSensitive(Buffer.from("prefix-sixteen-private-suffix"), ["sixteen-private"]),
    "canonical evidence secret corpus detector drift"
  );

  const terminalCapabilities = buildFakeCapabilities({ terminalMatrix: true });
  const terminalEvidence = await executeSmokePlanCore(plan, terminalCapabilities);
  const terminalRecords = terminalEvidence.resources.filter(({ kind }) =>
    TERMINAL_RESOURCE_KINDS.has(kind)
  );
  const terminalCount = terminalRecords.length;
  invariant(
    terminalCount === 3 && terminalEvidence.cleanupReceipts.length === 72 + 3 * terminalCount,
    "dynamic terminal cleanup cardinality drift"
  );
  const terminalFinalPlan = terminalCapabilities.lastFinalPlan;
  invariant(
    terminalFinalPlan.persistentActionPlan === terminalCapabilities.lastPersistentPlan &&
      terminalFinalPlan.terminalActionPlan === terminalCapabilities.lastTerminalPlan,
    "terminal matrix stage-plan identity drift"
  );
  assertRecursivelyFrozen(terminalFinalPlan);
  const terminalSessionRecord = terminalFinalPlan.ledger.find(
    ({ kind }) => kind === "session-task"
  );
  const terminalAccessRecord = terminalFinalPlan.ledger.find(
    ({ kind }) => kind === "access-log-task-ua"
  );
  const userARecord = terminalFinalPlan.ledger.find(({ kind }) => kind === "user-a");
  invariant(
    terminalSessionRecord &&
      terminalAccessRecord &&
      userARecord &&
      terminalFinalPlan.dependencyGraph[userARecord.resourceKey].includes(
        terminalSessionRecord.resourceKey
      ) &&
      terminalFinalPlan.dependencyGraph[terminalSessionRecord.resourceKey].includes(
        terminalAccessRecord.resourceKey
      ),
    "terminal-to-user dependency graph drift"
  );
  const blockedClosure = compileBlockedParentClosure(terminalFinalPlan.dependencyGraph, [
    terminalAccessRecord.resourceKey,
  ]);
  invariant(
    blockedClosure.includes(terminalSessionRecord.resourceKey) &&
      blockedClosure.includes(userARecord.resourceKey),
    "terminal-child blocker did not propagate to user"
  );
  const terminalAbsenceSequence = terminalEvidence.cleanupReceipts.find(
    (receipt) =>
      receipt.operationDescriptor === terminalSessionRecord.absenceOpId &&
      receipt.operation === "cleanup-absence"
  )?.sequence;
  const userProvenanceSequence = terminalEvidence.cleanupReceipts.find(
    (receipt) =>
      receipt.operationDescriptor === userARecord.provenanceOpId &&
      receipt.operation === "cleanup-provenance"
  )?.sequence;
  invariant(
    Number.isSafeInteger(terminalAbsenceSequence) &&
      Number.isSafeInteger(userProvenanceSequence) &&
      terminalAbsenceSequence < userProvenanceSequence,
    "synthetic user cleanup ran before its terminal child absence proof"
  );

  const graphUserId = "54000000-0000-4000-8000-000000007201";
  const graphSessionId = "54000000-0000-4000-8000-000000007202";
  const graphAccessId = "54000000-0000-4000-8000-000000007203";
  const graphUserCore = createResourceCore({
    kind: "user-a",
    identifier: [graphUserId],
    acquisitionSourceId: "set-012-user-a-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-012-user-a-create"),
    acquisitionChannel: "service",
  });
  const graphIndependentCore = createResourceCore({
    kind: "content-type",
    identifier: ["54000000-0000-4000-8000-000000007204"],
    acquisitionSourceId: "set-018-related-a-type-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-018-related-a-type-create"),
    acquisitionChannel: "admin-api",
  });
  const graphSessionCore = createResourceCore({
    kind: "session-task",
    identifier: [graphSessionId],
    ownerSubjectIdentifier: graphUserId,
    acquisitionSourceId: "terminal-task-ua-discovery",
    sourceActionOrdinal: null,
    acquisitionChannel: "terminal-db-delta",
  });
  const graphAccessCore = createResourceCore({
    kind: "access-log-task-ua",
    identifier: [graphAccessId],
    ownerSubjectIdentifier: graphSessionId,
    acquisitionSourceId: "terminal-task-ua-discovery",
    sourceActionOrdinal: null,
    acquisitionChannel: "terminal-db-delta",
  });
  const exactGraphLedger = new ResourceLedgerBuilder();
  exactGraphLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([graphUserCore, graphIndependentCore]),
      dependencyEdges: deepFreezeExact([]),
    })
  );
  exactGraphLedger.compileResourceRecords("persistent");
  exactGraphLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([graphSessionCore, graphAccessCore]),
      dependencyEdges: deepFreezeExact([
        destructiveResourceEdge(graphUserCore.resourceKey, graphSessionCore.resourceKey),
        destructiveResourceEdge(graphSessionCore.resourceKey, graphAccessCore.resourceKey),
      ]),
    })
  );
  exactGraphLedger.compileResourceRecords("terminal");
  const exactGraphRecords = exactGraphLedger.compileResourceRecords("final");
  const exactGraph = deepFreezeExact(
    Object.fromEntries(
      exactGraphRecords.map(({ resourceKey, dependsOn }) => [resourceKey, dependsOn])
    )
  );
  const exactGraphState = {
    ids: { userA: graphUserId },
    resourceKeys: new Map([
      ["user-a", graphUserCore.resourceKey],
      ["independent-content-type", graphIndependentCore.resourceKey],
      ["session-task:" + graphSessionId, graphSessionCore.resourceKey],
      ["access-log-task-ua:" + graphAccessId, graphAccessCore.resourceKey],
    ]),
    currentResourceOwnerProof: null,
  };
  invariant(
    assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, exactGraph),
    "exact final owner/dependency graph positive drift"
  );
  const omittedGraph = deepFreezeExact({
    ...exactGraph,
    [graphUserCore.resourceKey]: deepFreezeExact([]),
  });
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, omittedGraph),
    "exact owner graph omitted edge"
  );
  const reversedGraph = deepFreezeExact({
    ...exactGraph,
    [graphSessionCore.resourceKey]: deepFreezeExact([]),
    [graphAccessCore.resourceKey]: deepFreezeExact([graphSessionCore.resourceKey]),
  });
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, reversedGraph),
    "exact owner graph reversed edge"
  );
  const wrongOwnerRecords = deepFreezeExact(
    exactGraphRecords.map((record) =>
      record.resourceKey === graphIndependentCore.resourceKey
        ? deepFreezeExact({ ...record, ownerSubjectIdentifier: graphUserId })
        : record
    )
  );
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, wrongOwnerRecords, exactGraph),
    "non-owner record owner injection"
  );

  const makeCleanupAdminProbe = (responseFrames) => {
    const userId = "54000000-0000-4000-8000-000000007540";
    const sessionId = "54000000-0000-4000-8000-000000007541";
    const capability = Object.freeze({
      key: "bootstrap",
      userAgent: "TASK-540/cleanup-hash-self-test",
      userId,
    });
    const requests = [];
    const runtimeReceipts = [];
    let responseIndex = 0;
    const context = {
      async fetch(url, options) {
        requests.push(
          deepFreezeExact({
            method: options.method,
            pathname: new URL(url).pathname,
          })
        );
        invariant(responseIndex < responseFrames.length, "cleanup hash probe response underflow");
        const frame = responseFrames[responseIndex++];
        return {
          async dispose() {},
          status: () => frame.status,
          text: async () => frame.body,
        };
      },
    };
    const state = {
      assertSafeEvidence() {},
      bootstrapBaseline: { id: userId },
      deletedSubjects: new Set(),
      earlyApiSessionTuples: new Map([["bootstrap", { id: sessionId }]]),
      fixtureIds: new Map(),
      plan,
      runtimeReceiptSequence: 0,
      sessions: new Map([["bootstrap", capability]]),
    };
    PRIVATE_API_REQUEST_CONTEXT.set(
      state,
      new Map([
        [
          "bootstrap",
          {
            capability,
            context,
            csrf: "[redacted]",
            disposeProof: null,
            key: "bootstrap",
            sessionId,
            userAgent: capability.userAgent,
          },
        ],
      ])
    );
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.set(state, { restorationStarted: false });
    PRIVATE_RUNTIME.set(state, {
      authRatePolicy: null,
      csrfHeaderName: "x-coderso-csrf",
      repoEnvironment: null,
    });
    return {
      assertConsumed() {
        invariant(responseIndex === responseFrames.length, "cleanup hash probe response overflow");
      },
      requests,
      runtimeReceipts,
      state,
    };
  };
  for (const [label, byteLength] of [
    ["one-byte Buffer", 1],
    ["maximum-size Buffer", MAX_STREAM_BYTES],
  ]) {
    const authoritativeBytes = Buffer.alloc(byteLength, 0x61);
    invariant(
      hashCleanupAuthoritativeBytes(authoritativeBytes, "cleanup hash " + label) ===
        hashBytes(authoritativeBytes),
      "cleanup hash " + label + " acceptance drift"
    );
  }
  for (const [label, authoritativeBytes] of [
    ["non-Buffer", "not-authoritative-bytes"],
    ["empty Buffer", Buffer.alloc(0)],
    ["oversized Buffer", Buffer.alloc(MAX_STREAM_BYTES + 1)],
  ]) {
    await expectAsyncFailure(
      async () => hashCleanupAuthoritativeBytes(authoritativeBytes, "cleanup hash " + label),
      "cleanup hash " + label + " rejection"
    );
  }
  const cleanupAuthoritativeHashSource = hashCleanupAuthoritativeBytes.toString();
  const cleanupPositiveByteLengthToken = "authoritativeBytes.length > 0";
  const cleanupMaximumByteLengthToken = "authoritativeBytes.length <= MAX_STREAM_BYTES";
  const validatesCleanupAuthoritativeHashBounds = (source) =>
    source.split(cleanupPositiveByteLengthToken).length - 1 === 1 &&
    source.split(cleanupMaximumByteLengthToken).length - 1 === 1 &&
    !source.includes("authoritativeBytes.length > 1") &&
    !source.includes("authoritativeBytes.length < MAX_STREAM_BYTES");
  invariant(
    validatesCleanupAuthoritativeHashBounds(cleanupAuthoritativeHashSource),
    "cleanup authoritative hash boundary source drift"
  );
  for (const [label, token, replacement] of [
    ["positive byte length", cleanupPositiveByteLengthToken, "authoritativeBytes.length > 1"],
    [
      "maximum byte length",
      cleanupMaximumByteLengthToken,
      "authoritativeBytes.length < MAX_STREAM_BYTES",
    ],
  ]) {
    assertNegative(
      !validatesCleanupAuthoritativeHashBounds(
        cleanupAuthoritativeHashSource.replace(token, replacement)
      ),
      "cleanup hash " + label + " boundary mutant"
    );
  }
  const cleanupScreenId = sourceCaptures.get("screen.id");
  const cleanupEntryId = sourceCaptures.get("entry.id");
  const cleanupScreenPresentBody = JSON.stringify({
    id: cleanupScreenId,
    legalRepresentationDrift: { layout: "screen-vNext" },
  });
  const cleanupDeleteBody = JSON.stringify({ ok: true });
  const cleanupAbsentBody = JSON.stringify({ code: "not_found", representation: "vNext" });
  const cleanupPcaProbe = makeCleanupAdminProbe([
    { body: cleanupScreenPresentBody, status: 200 },
    { body: cleanupDeleteBody, status: 200 },
    { body: cleanupAbsentBody, status: 404 },
  ]);
  const cleanupScreenSubject = { kind: "screen", id: cleanupScreenId, storageKey: null };
  const cleanupPresentProof = await proveCleanupSubjectPresent(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  const cleanupDeleteProof = await deleteCleanupSubject(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  const cleanupAbsentProof = await proveCleanupSubjectAbsent(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  cleanupPcaProbe.assertConsumed();
  const cleanupPcaHashes = [cleanupScreenPresentBody, cleanupDeleteBody, cleanupAbsentBody].map(
    (body) => hashBytes(Buffer.from(body))
  );
  invariant(
    deepEqualJson(cleanupPresentProof, {
      observedBytesSha256: cleanupPcaHashes[0],
      output: { present: true },
    }) &&
      deepEqualJson(cleanupDeleteProof, { observedBytesSha256: cleanupPcaHashes[1] }) &&
      deepEqualJson(cleanupAbsentProof, { observedBytesSha256: cleanupPcaHashes[2] }) &&
      deepEqualJson(
        cleanupPcaProbe.requests.map(({ method }) => method),
        ["GET", "DELETE", "GET"]
      ) &&
      cleanupPcaProbe.requests.every(({ pathname }) => pathname.endsWith("/" + cleanupScreenId)),
    "cleanup production P/C/A authoritative hash drift"
  );
  assertRecursivelyFrozen(cleanupPresentProof);
  assertRecursivelyFrozen(cleanupDeleteProof);
  assertRecursivelyFrozen(cleanupAbsentProof);
  const cleanupReceiptRecord = {
    identifier: [cleanupScreenId],
    kind: "custom-screen",
  };
  const cleanupReceiptOutputs = [{ present: true }, { deleted: true }, { absent: true }];
  const cleanupHashReceipts = cleanupPcaHashes.map((observedBytesSha256, index) => {
    const operation = "cleanup-" + CLEANUP_OPERATION_KINDS[index];
    const operationDescriptor = "cleanup-hash-self-test-" + CLEANUP_OPERATION_KINDS[index];
    const output = cleanupReceiptOutputs[index];
    const receipt = cleanupRuntimeReceipt(
      cleanupPcaProbe.state,
      operation,
      operationDescriptor,
      cleanupReceiptRecord,
      output,
      observedBytesSha256
    );
    const expectedEvidenceSha256 = hashBytes(
      Buffer.from(
        canonicalJson({
          observedBytesSha256,
          operation,
          operationDescriptor,
          output,
          subjectIdentifier: cleanupScreenId,
          subjectKind: cleanupReceiptRecord.kind,
        }) + "\n"
      )
    );
    invariant(
      receipt.evidenceSha256 === expectedEvidenceSha256,
      CLEANUP_OPERATION_KINDS[index] + " cleanup receipt observed hash drift"
    );
    return receipt;
  });
  invariant(
    new Set(cleanupHashReceipts.map(({ evidenceSha256 }) => evidenceSha256)).size === 3,
    "cleanup receipt hashes did not bind exact authoritative observations"
  );
  await expectAsyncFailure(
    async () =>
      cleanupRuntimeReceipt(
        cleanupPcaProbe.state,
        "cleanup-provenance",
        "cleanup-hash-buffer-mutant",
        cleanupReceiptRecord,
        { present: true },
        Buffer.from("nonempty-authoritative-response")
      ),
    "cleanup receipt raw Buffer rejection"
  );
  await expectAsyncFailure(
    async () =>
      cleanupRuntimeReceipt(
        cleanupPcaProbe.state,
        "cleanup-provenance",
        "cleanup-hash-uppercase-mutant",
        cleanupReceiptRecord,
        { present: true },
        cleanupPcaHashes[0].toUpperCase()
      ),
    "cleanup receipt noncanonical hash rejection"
  );

  const cleanupEntryPresentBody = JSON.stringify({
    data: { legalRepresentationDrift: true },
    id: cleanupEntryId,
  });
  const cleanupEntryProbe = makeCleanupAdminProbe([{ body: cleanupEntryPresentBody, status: 200 }]);
  const cleanupEntryProof = await proveCleanupSubjectPresent(cleanupEntryProbe.state, {
    kind: "editable-entry",
    id: cleanupEntryId,
    storageKey: null,
  });
  cleanupEntryProbe.assertConsumed();
  invariant(
    cleanupEntryProof.observedBytesSha256 === hashBytes(Buffer.from(cleanupEntryPresentBody)) &&
      cleanupEntryProbe.requests[0]?.method === "GET",
    "cleanup legal Entry representation drift was rejected"
  );

  const runCleanupPcaOperationChain = async (
    probe,
    record,
    fixtureSemantic,
    fixtureId,
    executeOperation = executeResourceCleanupOperation
  ) => {
    probe.state.fixtureIds.set(fixtureSemantic, fixtureId);
    for (const operationKind of CLEANUP_OPERATION_KINDS) {
      probe.runtimeReceipts.push(await executeOperation(probe.state, record, operationKind));
    }
  };
  const cleanupPcaRejectionIsMutationFree = (probe) =>
    probe.requests.length === 1 &&
    probe.requests.every(({ method }) => method === "GET") &&
    probe.state.deletedSubjects.size === 0 &&
    probe.state.runtimeReceiptSequence === 0 &&
    probe.runtimeReceipts.length === 0;
  const cleanupScreenResourceRecord = successCapabilities.lastFinalPlan.ledger.find(
    ({ identifier, kind }) => kind === "screen-main" && identifier[0] === cleanupScreenId
  );
  invariant(cleanupScreenResourceRecord !== undefined, "cleanup Screen ledger record is absent");

  const wrongCleanupIdProbe = makeCleanupAdminProbe([
    {
      body: JSON.stringify({ id: "54000000-0000-4000-8000-000000007599" }),
      status: 200,
    },
  ]);
  await expectAsyncFailure(
    () =>
      runCleanupPcaOperationChain(
        wrongCleanupIdProbe,
        cleanupScreenResourceRecord,
        "screen",
        cleanupScreenId
      ),
    "cleanup wrong Screen ID rejection"
  );
  wrongCleanupIdProbe.assertConsumed();
  invariant(
    cleanupPcaRejectionIsMutationFree(wrongCleanupIdProbe),
    "cleanup wrong Screen ID crossed the mutation boundary"
  );
  const receiptBeforeFailureProbe = makeCleanupAdminProbe([
    {
      body: JSON.stringify({ id: "54000000-0000-4000-8000-000000007598" }),
      status: 200,
    },
  ]);
  await expectAsyncFailure(
    () =>
      runCleanupPcaOperationChain(
        receiptBeforeFailureProbe,
        cleanupScreenResourceRecord,
        "screen",
        cleanupScreenId,
        async (state, record, operationKind) => {
          receiptBeforeFailureProbe.runtimeReceipts.push(
            cleanupRuntimeReceipt(
              state,
              "cleanup-" + operationKind,
              "cleanup-pre-failure-receipt-mutant",
              record,
              { mutant: "receipt-before-failure" }
            )
          );
          return executeResourceCleanupOperation(state, record, operationKind);
        }
      ),
    "cleanup pre-failure receipt mutant execution"
  );
  receiptBeforeFailureProbe.assertConsumed();
  assertNegative(
    !cleanupPcaRejectionIsMutationFree(receiptBeforeFailureProbe),
    "cleanup pre-failure receipt mutant"
  );
  const cleanupMediaId = sourceCaptures.get("media.id");
  const cleanupMediaKey = sourceCaptures.get("media.storage-key");
  const cleanupMediaResourceRecord = successCapabilities.lastFinalPlan.ledger.find(
    ({ identifier, kind }) =>
      kind === "media-row-key" &&
      identifier[0] === cleanupMediaId &&
      identifier[1] === cleanupMediaKey
  );
  invariant(cleanupMediaResourceRecord !== undefined, "cleanup media ledger record is absent");
  for (const [label, value] of [
    [
      "wrong media key",
      { id: cleanupMediaId, key: cleanupMediaKey + ".wrong", url: "/media/" + cleanupMediaKey },
    ],
    [
      "wrong media URL",
      { id: cleanupMediaId, key: cleanupMediaKey, url: "/media/wrong/" + cleanupMediaKey },
    ],
  ]) {
    const probe = makeCleanupAdminProbe([{ body: JSON.stringify(value), status: 200 }]);
    await expectAsyncFailure(
      () => runCleanupPcaOperationChain(probe, cleanupMediaResourceRecord, "media", cleanupMediaId),
      "cleanup " + label + " rejection"
    );
    probe.assertConsumed();
    invariant(
      cleanupPcaRejectionIsMutationFree(probe),
      "cleanup " + label + " crossed the mutation boundary"
    );
  }

  const cleanupSubjectHashSourceContracts = [
    {
      label: "delete",
      source: deleteCleanupSubject.toString(),
      token: "return deepFreezeExact({ observedBytesSha256 });",
    },
    {
      label: "provenance",
      source: proveCleanupSubjectPresent.toString(),
      token: "observedBytesSha256: response.observedBytesSha256,",
    },
    {
      label: "absence",
      source: proveCleanupSubjectAbsent.toString(),
      token: "return deepFreezeExact({ observedBytesSha256: response.observedBytesSha256 });",
    },
  ];
  const validatesCleanupSubjectHashSource = (source, token) =>
    source.includes(token) &&
    source.includes("hashCleanupAuthoritativeBytes(") &&
    !source.includes("deepFreezeExact({ authoritativeBytes") &&
    !source.includes("authoritativeBytes: response.authoritativeBytes");
  for (const { label, source, token } of cleanupSubjectHashSourceContracts) {
    invariant(
      validatesCleanupSubjectHashSource(source, token),
      "cleanup " + label + " observed-hash source drift"
    );
    const mutant = source.replace(
      token,
      label === "absence"
        ? "return deepFreezeExact({ authoritativeBytes: response.authoritativeBytes });"
        : label === "provenance"
          ? "authoritativeBytes: response.authoritativeBytes,"
          : 'return deepFreezeExact({ authoritativeBytes: Buffer.from("mutant") });'
    );
    assertNegative(
      !validatesCleanupSubjectHashSource(mutant, token),
      "cleanup " + label + " raw-authoritative-bytes source mutant"
    );
  }
  const cleanupReceiptHashSource = cleanupRuntimeReceipt.toString();
  const cleanupReceiptObservedHashToken = "observedBytesSha256,\n      output,";
  const validatesCleanupReceiptHashSource = (source) =>
    source.includes(cleanupReceiptObservedHashToken) &&
    source.includes(
      'typeof observedBytesSha256 === "string" && /^[a-f0-9]{64}$/u.test(observedBytesSha256)'
    ) &&
    !source.includes("Buffer.isBuffer(observedBytesSha256)");
  invariant(
    validatesCleanupReceiptHashSource(cleanupReceiptHashSource),
    "cleanup receipt observed-hash source drift"
  );
  for (const [label, replacement] of [
    ["dropped", "observedBytesSha256: null,\n      output,"],
    ["changed", "observedBytesSha256: hashBytes(Buffer.from(observedBytesSha256)),\n      output,"],
  ]) {
    assertNegative(
      !validatesCleanupReceiptHashSource(
        cleanupReceiptHashSource.replace(cleanupReceiptObservedHashToken, replacement)
      ),
      "cleanup receipt " + label + " observed-hash source mutant"
    );
  }
  const presentationCleanupHashSource = executeResourceCleanupOperation.toString();
  const presentationCleanupHashToken = '"presentation override cleanup provenance"';
  const validatesPresentationCleanupHashSource = (source) =>
    source.includes(presentationCleanupHashToken) &&
    source.includes("observedBytesSha256 = response.observedBytesSha256;") &&
    !source.includes("observedBytes = response.authoritativeBytes;");
  invariant(
    validatesPresentationCleanupHashSource(presentationCleanupHashSource),
    "presentation override cleanup observed-hash source drift"
  );
  assertNegative(
    !validatesPresentationCleanupHashSource(
      presentationCleanupHashSource.replace(
        "observedBytesSha256 = response.observedBytesSha256;",
        "observedBytes = response.authoritativeBytes;"
      )
    ),
    "presentation override raw-authoritative-bytes source mutant"
  );
  const intentionalCleanupHashSource =
    executeIntentionalPresentationOverrideAlreadyAbsentCleanup.toString();
  const intentionalCleanupHashToken = "const observedBytesSha256 = hashBytes(";
  const validatesIntentionalCleanupHashSource = (source) =>
    source.includes(intentionalCleanupHashToken) &&
    source.includes("output,\n    observedBytesSha256\n  );");
  invariant(
    validatesIntentionalCleanupHashSource(intentionalCleanupHashSource),
    "intentional override cleanup observed-hash source drift"
  );
  assertNegative(
    !validatesIntentionalCleanupHashSource(
      intentionalCleanupHashSource.replace(
        "output,\n    observedBytesSha256\n  );",
        "output,\n    null\n  );"
      )
    ),
    "intentional override dropped observed-hash source mutant"
  );
  negativeCases += 12;

  const overrideAuthorityActions = Object.fromEntries(
    Object.entries(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).map(([key, actionId]) => [
      key,
      plan.actionManifest.find(({ id }) => id === actionId),
    ])
  );
  invariant(
    Object.values(overrideAuthorityActions).every((action) => action !== undefined) &&
      overrideAuthorityActions.acquisition.ordinal < overrideAuthorityActions.reset.ordinal &&
      overrideAuthorityActions.reset.ordinal < overrideAuthorityActions.proof.ordinal &&
      overrideAuthorityActions.proof.ordinal <
        plan.actionManifest.find(({ id }) => id === "dg-003-builder").ordinal,
    "dg-003 intentional override reset/proof order drift"
  );
  const overrideAuthorityCaptures = new SingleAssignmentCaptureMap();
  overrideAuthorityCaptures.bind("screen.id", "54000000-0000-4000-8000-000000007501");
  overrideAuthorityCaptures.bind("entry.id", "54000000-0000-4000-8000-000000007502");
  const overrideAuthorityState = {
    assertSafeEvidence() {},
    intentionalPresentationOverrideAuthority: null,
    intentionalPresentationOverrideCleanupProof: null,
    intentionalPresentationOverrideObservations: new Map(),
    pendingIntentionalPresentationOverrideReceipts: new Map(),
    plan,
    resourceKeys: new Map(),
    runtimeReceiptSequence: 3,
    overridesCleared: false,
  };
  const makeAuthorityReceipt = (action, sequence) =>
    deepFreezeExact({
      runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
      sequence,
      operation: canonicalManifestRuntimeOperation(action),
      operationDescriptor: action.executable.operationId,
      status: 0,
      evidenceSha256: hashBytes(Buffer.from("override-authority-receipt:" + action.id)),
      subjectKind: null,
      subjectIdentifier: null,
      sanitizedOutput: "{}",
    });
  const overrideIdentifier = exactPresentationOverrideIdentifier(
    overrideAuthorityState,
    overrideAuthorityCaptures
  );
  const overrideCore = createResourceCore({
    kind: "presentation-override",
    identifier: overrideIdentifier,
    ownerSubjectIdentifier: null,
    acquisitionSourceId: "set-039-override-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-039-override-create"),
    acquisitionChannel: "admin-api",
  });
  const overrideDelta = deepFreezeExact({
    cores: deepFreezeExact([overrideCore]),
    dependencyEdges: deepFreezeExact([]),
  });
  const emptyDelta = emptyResourceDelta();
  const stageAuthorityAction = (key, sequence) => {
    const action = overrideAuthorityActions[key];
    stageIntentionalPresentationOverrideObservation(
      overrideAuthorityState,
      action,
      overrideAuthorityCaptures,
      Buffer.from("override-authority-response:" + action.id)
    );
    stageIntentionalPresentationOverrideActionReceipt(
      overrideAuthorityState,
      action,
      makeAuthorityReceipt(action, sequence)
    );
    if (key === "acquisition") {
      overrideAuthorityState.resourceKeys.set("presentation-override", overrideCore.resourceKey);
    }
    commitIntentionalPresentationOverrideActionAfterLedgerAppend(
      overrideAuthorityState,
      action,
      key === "acquisition" ? overrideDelta : emptyDelta
    );
  };
  stageAuthorityAction("acquisition", 1);
  stageAuthorityAction("reset", 2);
  invariant(
    completeIntentionalPresentationOverrideAbsenceAuthority(overrideAuthorityState) === null,
    "override reset without ss-006 proof authorized absence"
  );
  stageAuthorityAction("proof", 3);
  const completeOverrideAuthority =
    completeIntentionalPresentationOverrideAbsenceAuthority(overrideAuthorityState);
  invariant(completeOverrideAuthority !== null, "complete override absence authority was rejected");
  const overrideLedger = new ResourceLedgerBuilder();
  overrideLedger.appendValidatedDelta(overrideDelta);
  const [overrideRecord] = overrideLedger.compileResourceRecords("persistent");
  overrideAuthorityState.intentionalPresentationOverrideCleanupProof = deepFreezeExact({
    absenceOutputSha256: hashBytes(Buffer.from("fresh-current-owner-absence")),
    identifier: overrideIdentifier,
    operationDescriptor: "resource/current-owner-exact",
    proofActionReceiptSha256: completeOverrideAuthority.proof.receiptEvidenceSha256,
    resetActionReceiptSha256: completeOverrideAuthority.reset.receiptEvidenceSha256,
  });
  let freshOverrideAbsenceCalls = 0;
  const overrideCleanupReceipts = [];
  for (const operationKind of CLEANUP_OPERATION_KINDS) {
    overrideCleanupReceipts.push(
      await executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        overrideAuthorityState,
        overrideRecord,
        operationKind,
        async () => {
          freshOverrideAbsenceCalls += 1;
          return deepFreezeExact({ absent: true, affected: 0, present: false });
        }
      )
    );
  }
  const overrideOnlyPlan = deepFreezeExact({
    actionTuples: deepFreezeExact(cartesianCleanupTuples([overrideRecord.resourceKey])),
    ledger: deepFreezeExact([overrideRecord]),
  });
  assertCleanupReceiptBijection(overrideOnlyPlan, overrideCleanupReceipts);
  const intentionalOverrideObservedBytesSha256 = hashBytes(
    Buffer.from(
      canonicalJson({
        identifier: overrideRecord.identifier,
        operationDescriptor: overrideRecord.absenceOpId,
        result: { absent: true, affected: 0, present: false },
      }) + "\n"
    )
  );
  for (const [index, receipt] of overrideCleanupReceipts.entries()) {
    const operationKind = CLEANUP_OPERATION_KINDS[index];
    const output = JSON.parse(receipt.sanitizedOutput);
    const operationDescriptor =
      operationKind === "provenance"
        ? overrideRecord.provenanceOpId
        : operationKind === "delete"
          ? overrideRecord.cleanupOpId
          : overrideRecord.absenceOpId;
    invariant(
      receipt.evidenceSha256 ===
        hashBytes(
          Buffer.from(
            canonicalJson({
              observedBytesSha256: intentionalOverrideObservedBytesSha256,
              operation: "cleanup-" + operationKind,
              operationDescriptor,
              output,
              subjectIdentifier: lengthPrefixedTuple(overrideRecord.identifier),
              subjectKind: overrideRecord.kind,
            }) + "\n"
          )
        ),
      operationKind + " intentional override observed-hash receipt drift"
    );
  }
  invariant(
    freshOverrideAbsenceCalls === 3 &&
      overrideAuthorityState.overridesCleared === true &&
      overrideCleanupReceipts.every(({ sanitizedOutput }) =>
        sanitizedOutput.includes('"alreadyDeletedByExactReset":true')
      ),
    "dg-003 failure cleanup did not preserve exact override P/C/A receipts"
  );
  await expectAsyncFailure(
    async () =>
      executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        { ...overrideAuthorityState, intentionalPresentationOverrideCleanupProof: null },
        overrideRecord,
        "delete",
        async () => deepFreezeExact({ absent: true, affected: 0, present: false })
      ),
    "override cleanup without fresh exact absence proof"
  );
  await expectAsyncFailure(
    async () =>
      executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        overrideAuthorityState,
        overrideRecord,
        "delete",
        async () => deepFreezeExact({ absent: false, affected: 0, present: true })
      ),
    "override cleanup contradictory fresh absence proof"
  );
  for (const [label, mutant] of [
    [
      "current owner missing authorized-absence cardinality",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows.length !== 0",
        "overrideRows.length > 1"
      ),
    ],
    [
      "current owner ambiguous override bound",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows.length !== 1",
        "overrideRows.length < 1"
      ),
    ],
    [
      "current owner nullable override projection",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows[0] ?? null",
        "overrideRows[0]"
      ),
    ],
  ]) {
    await expectAsyncFailure(
      async () => assertCurrentResourceOwnerBridgeFailClosedSource(mutant),
      label
    );
  }
  negativeCases += 5;

  for (const [label, mutant] of [
    [
      "SEO discovery missing entry target-type boundary",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace('eq(seoDocuments.targetType,"entry"),', ""),
    ],
    [
      "SEO discovery missing exact target-ID boundary",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace(
        "inArray(seoDocuments.targetId,input.targetIds)",
        "eq(seoDocuments.targetId,input.targetIds[0])"
      ),
    ],
    [
      "SEO discovery accepts missing target IDs",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replaceAll(
        "targetIds.length !== 6",
        "targetIds.length > 6"
      ),
    ],
    [
      "SEO discovery accepts duplicate target IDs",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replaceAll(
        "new Set(input.targetIds).size !== 6",
        "new Set(input.targetIds).size > 6"
      ),
    ],
    [
      "SEO discovery loses overflow sentinel",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace(".limit(7)", ".limit(6)"),
    ],
  ]) {
    await expectAsyncFailure(
      async () => assertSeoEntryDiscoveryBridgeFailClosedSource(mutant),
      label
    );
  }

  const exactSeoEntryPredicate =
    "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));";
  const seoPcaPredicateMutants = [
    [
      "SEO provenance predicate without exact document ID",
      "provenance",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));"
      ),
    ],
    [
      "SEO cleanup predicate without exact target type",
      "delete",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetId,targetId));"
      ),
    ],
    [
      "SEO absence predicate without exact target ID",
      "absence",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType));"
      ),
    ],
    [
      "SEO provenance before-read bypasses exact predicate",
      "provenance",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance.replace(
        ".from(seoDocuments).where(predicate).limit(2);",
        ".from(seoDocuments).where(eq(seoDocuments.id,id)).limit(2);"
      ),
    ],
    [
      "SEO cleanup delete bypasses exact predicate",
      "delete",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete.replace(
        "db.delete(seoDocuments).where(predicate).returning",
        "db.delete(seoDocuments).where(eq(seoDocuments.id,id)).returning"
      ),
    ],
    [
      "SEO absence after-read bypasses exact predicate",
      "absence",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence.replace(
        "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
        "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(eq(seoDocuments.id,id)).limit(2);"
      ),
    ],
  ];
  for (const [label, operation, mutantSource] of seoPcaPredicateMutants) {
    invariant(
      mutantSource !== SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES[operation],
      label + " mutant anchor drift"
    );
    const mutantSources = deepFreezeExact({
      ...SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
      [operation]: mutantSource,
    });
    await expectAsyncFailure(
      async () => assertSeoEntryDocumentExactBridgeSourcesFailClosed(mutantSources),
      label
    );
  }
  negativeCases += seoPcaPredicateMutants.length;

  const seoEntryOriginBySemantic = deepFreezeExact({
    "editable-entry": "set-033-entry-create",
    "related-entry-a1": "set-022-related-a1-create",
    "related-entry-a2": "set-024-related-a2-create",
    "related-entry-b1": "set-026-related-b1-create",
    "related-entry-b2": "set-028-related-b2-create",
    "related-entry-failure1": "set-029a-related-failure1-create",
  });
  const makeSeoDiscoveryHarness = () => {
    const targetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map(
      (_entrySemantic, index) => `54000000-0000-4000-8000-${String(7601 + index).padStart(12, "0")}`
    );
    const entryCores = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => {
      const origin = seoEntryOriginBySemantic[entrySemantic];
      return createResourceCore({
        kind: entrySemantic === "editable-entry" ? "entry-editable" : "entry-related",
        identifier: [targetIds[index]],
        ownerSubjectIdentifier: null,
        acquisitionSourceId: origin,
        sourceActionOrdinal: actionOrdinal(plan, origin),
        acquisitionChannel: "admin-api",
      });
    });
    const ledger = new ResourceLedgerBuilder();
    ledger.appendValidatedDelta(
      deepFreezeExact({ cores: deepFreezeExact(entryCores), dependencyEdges: deepFreezeExact([]) })
    );
    const state = {
      fixtureIds: new Map(
        TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => [
          entrySemantic,
          targetIds[index],
        ])
      ),
      resourceKeys: new Map(
        TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => [
          entrySemantic,
          entryCores[index].resourceKey,
        ])
      ),
    };
    initializeBunBridgeOperationAuthority(state);
    return { entryCores, ledger, state, targetIds };
  };
  const seoHarness = makeSeoDiscoveryHarness();
  const seoCandidates = deepFreezeExact(
    seoHarness.targetIds
      .map((targetId, index) => ({
        id: `54000000-0000-4000-8000-${String(7611 + index).padStart(12, "0")}`,
        targetId,
        targetType: "entry",
      }))
      .sort(
        (left, right) =>
          left.targetId.localeCompare(right.targetId) || left.id.localeCompare(right.id)
      )
  );
  const seoPoll = deepFreezeExact({ candidates: seoCandidates });
  const nominalQueryTargets = [];
  const discoveredSeo = await discoverExactSeoEntryResources(
    seoHarness.state,
    seoHarness.ledger,
    async (targetIds) => {
      nominalQueryTargets.push([...targetIds]);
      return seoPoll;
    },
    async () => {}
  );
  const seoRecords = seoHarness.ledger.compileResourceRecords("persistent");
  const seoDocumentRecords = seoRecords.filter(({ kind }) => kind === "seo-document-entry");
  const seoEntryRecords = seoRecords.filter(({ kind }) =>
    ["entry-editable", "entry-related"].includes(kind)
  );
  const seoRecordByTargetId = new Map(
    seoDocumentRecords.map((record) => [record.identifier[2], record])
  );
  const seoEntryRecordByTargetId = new Map(
    seoEntryRecords.map((record) => [record.identifier[0], record])
  );
  const seoPlan = new ResourceCleanupPlanner().freezePersistent(seoRecords, []);
  invariant(
    discoveredSeo.length === 6 &&
      seoDocumentRecords.length === 6 &&
      seoEntryRecords.length === 6 &&
      nominalQueryTargets.length === 2 &&
      nominalQueryTargets.every((targetIds) => deepEqualJson(targetIds, seoHarness.targetIds)) &&
      new Set(discoveredSeo.map(({ resourceKey }) => resourceKey)).size === 6 &&
      seoHarness.targetIds.every((targetId) =>
        seoEntryRecordByTargetId
          .get(targetId)
          .dependsOn.includes(seoRecordByTargetId.get(targetId).resourceKey)
      ) &&
      deepEqualJson(
        seoPlan.resourceKeys.slice(0, 6),
        seoDocumentRecords.map(({ resourceKey }) => resourceKey)
      ) &&
      TASK_FIXTURE_ENTRY_SEMANTICS.every(
        (entrySemantic) =>
          seoHarness.state.resourceKeys.get(seoDocumentResourceSemantic(entrySemantic)) ===
          seoRecordByTargetId.get(seoHarness.state.fixtureIds.get(entrySemantic)).resourceKey
      ) &&
      RESOURCE_KIND_CONTRACTS["seo-document-entry"].cleanupPhase.success === 3 &&
      RESOURCE_KIND_CONTRACTS["seo-document-entry"].cleanupPhase.failure === 3,
    "SEO entry cleanup discovery/dependency order drift"
  );
  const seoStageState = { cleanupAbsenceKeys: new Set(), cleanupFailedKeys: new Set() };
  const seoStageCalls = [];
  const seoStageResult = await executeCleanupPlanStage(
    seoStageState,
    seoPlan,
    cleanupPlanView(seoRecords),
    new Set(["seo-document-entry", "entry-editable", "entry-related"]),
    3,
    async (_state, record, operationKind) => {
      seoStageCalls.push(record.resourceKey + ":" + operationKind);
      return deepFreezeExact({ operationKind, resourceKey: record.resourceKey });
    }
  );
  invariant(
    seoStageResult.failures.length === 0 &&
      seoDocumentRecords.every((seoRecord) => {
        const parentRecord = seoEntryRecordByTargetId.get(seoRecord.identifier[2]);
        const childAbsenceIndex = seoStageCalls.indexOf(seoRecord.resourceKey + ":absence");
        const parentProvenanceIndex = seoStageCalls.indexOf(
          parentRecord.resourceKey + ":provenance"
        );
        return (
          seoStageCalls.filter((call) => call === seoRecord.resourceKey + ":delete").length === 1 &&
          childAbsenceIndex >= 0 &&
          childAbsenceIndex < parentProvenanceIndex
        );
      }),
    "SEO children were not deleted/proved absent before their exact entry parents"
  );

  const emptySeoHarness = makeSeoDiscoveryHarness();
  const emptySeoResources = await discoverExactSeoEntryResources(
    emptySeoHarness.state,
    emptySeoHarness.ledger,
    async () => deepFreezeExact({ candidates: deepFreezeExact([]) }),
    async () => {}
  );
  invariant(
    emptySeoResources.length === 0 &&
      TASK_FIXTURE_ENTRY_SEMANTICS.every(
        (entrySemantic) =>
          !emptySeoHarness.state.resourceKeys.has(seoDocumentResourceSemantic(entrySemantic))
      ),
    "empty stable SEO discovery acquired a resource"
  );

  const missingSeoHarness = makeSeoDiscoveryHarness();
  const missingSeoCandidates = deepFreezeExact(seoCandidates.slice(0, 5));
  const missingSeoResources = await discoverExactSeoEntryResources(
    missingSeoHarness.state,
    missingSeoHarness.ledger,
    async (targetIds) => {
      invariant(
        deepEqualJson(targetIds, missingSeoHarness.targetIds),
        "missing SEO row narrowed the exact target inventory"
      );
      return deepFreezeExact({ candidates: missingSeoCandidates });
    },
    async () => {}
  );
  const missingTargetId = seoCandidates[5].targetId;
  const missingTargetSemantic = TASK_FIXTURE_ENTRY_SEMANTICS.find(
    (entrySemantic) => missingSeoHarness.state.fixtureIds.get(entrySemantic) === missingTargetId
  );
  invariant(
    missingSeoResources.length === 5 &&
      missingSeoHarness.ledger
        .compileResourceRecords("persistent")
        .filter(({ kind }) => kind === "seo-document-entry").length === 5 &&
      !missingSeoHarness.state.resourceKeys.has(seoDocumentResourceSemantic(missingTargetSemantic)),
    "missing exact SEO row did not preserve bounded authorized absence"
  );

  const seoDiscoveryDescriptor = BUN_BRIDGE_OPERATION_DESCRIPTORS["resource/seo-entry-discovery"];
  for (const [label, targetIds] of [
    ["missing SEO discovery input target", seoHarness.targetIds.slice(0, 5)],
    [
      "extra SEO discovery input target",
      [...seoHarness.targetIds, "54000000-0000-4000-8000-000000007699"],
    ],
    [
      "duplicate SEO discovery input target",
      [...seoHarness.targetIds.slice(0, 5), seoHarness.targetIds[0]],
    ],
  ]) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeInput(
          {},
          seoDiscoveryDescriptor,
          deepFreezeExact({ targetIds: deepFreezeExact(targetIds) })
        ),
      label
    );
  }

  const extraSeoCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007699",
    targetId: seoHarness.targetIds[0],
    targetType: "entry",
  });
  for (const [label, polls] of [
    [
      "extra SEO entry discovery",
      [deepFreezeExact({ candidates: deepFreezeExact([...seoCandidates, extraSeoCandidate]) })],
    ],
    [
      "unstable SEO entry discovery",
      [deepFreezeExact({ candidates: missingSeoCandidates }), seoPoll],
    ],
    [
      "foreign-target SEO entry discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            deepFreezeExact({
              ...seoCandidates[0],
              targetId: "54000000-0000-4000-8000-000000007698",
            }),
          ]),
        }),
      ],
    ],
    [
      "foreign targetType SEO entry discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            deepFreezeExact({ ...seoCandidates[0], targetType: "page" }),
          ]),
        }),
      ],
    ],
    [
      "duplicate SEO target discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([seoCandidates[0], extraSeoCandidate]),
        }),
      ],
    ],
    [
      "duplicate SEO document discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            seoCandidates[0],
            deepFreezeExact({ ...seoCandidates[1], id: seoCandidates[0].id }),
          ]),
        }),
      ],
    ],
    [
      "nondeterministic SEO discovery ordering",
      [deepFreezeExact({ candidates: deepFreezeExact([...seoCandidates].reverse()) })],
    ],
  ]) {
    const harness = makeSeoDiscoveryHarness();
    let pollIndex = 0;
    await expectAsyncFailure(
      async () =>
        discoverExactSeoEntryResources(
          harness.state,
          harness.ledger,
          async () => polls[Math.min(pollIndex++, polls.length - 1)],
          async () => {}
        ),
      label
    );
  }
  negativeCases += 15;

  const mixedPhaseThreeRecords = deepFreezeExact(
    [
      ["phase3-override", "presentation-override"],
      ["phase3-seo", "seo-document-entry"],
      ["phase3-setting", "setting-user-a"],
      ["phase3-screen", "screen"],
    ].map(([resourceKey, kind]) => ({ resourceKey, kind }))
  );
  const mixedPhaseThreeResourceKeys = deepFreezeExact(
    mixedPhaseThreeRecords.map(({ resourceKey }) => resourceKey)
  );
  const mixedPhaseThreeGraph = deepFreezeExact(
    Object.fromEntries(mixedPhaseThreeResourceKeys.map((resourceKey) => [resourceKey, []]))
  );
  const mixedPhaseThreePlan = deepFreezeExact({ resourceKeys: mixedPhaseThreeResourceKeys });
  const mixedPhaseThreeView = deepFreezeExact({
    ledger: mixedPhaseThreeRecords,
    dependencyGraph: mixedPhaseThreeGraph,
    failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
  });
  const mixedPhaseThreeKinds = new Set(mixedPhaseThreeRecords.map(({ kind }) => kind));
  const phaseThreeScreenBoundaryPrivateMarker =
    "TASK540_PHASE3_SCREEN_BOUNDARY_PRIVATE_DO_NOT_EGRESS";
  const mixedPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const mixedPhaseThreeCalls = [];
  const mixedPhaseThreeResult = await executeCleanupPlanStage(
    mixedPhaseThreeState,
    mixedPhaseThreePlan,
    mixedPhaseThreeView,
    mixedPhaseThreeKinds,
    3,
    async (_state, record, operationKind) => {
      mixedPhaseThreeCalls.push(record.kind + ":" + operationKind);
      if (record.kind === "screen" && operationKind === "provenance") {
        throw new Error(phaseThreeScreenBoundaryPrivateMarker);
      }
      return deepFreezeExact({ kind: record.kind, operationKind });
    }
  );
  const mixedPhaseThreeDiagnostic = privateCleanupFailureDiagnosticNeverThrow(
    mixedPhaseThreeResult.failures[0]
  );
  invariant(
    mixedPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(mixedPhaseThreeDiagnostic, {
        cleanupPhase: 3,
        cleanupFailureClass: "persistent_provenance_failed",
      }) &&
      deepEqualJson(mixedPhaseThreeCalls, [
        "presentation-override:provenance",
        "presentation-override:delete",
        "presentation-override:absence",
        "seo-document-entry:provenance",
        "seo-document-entry:delete",
        "seo-document-entry:absence",
        "setting-user-a:provenance",
        "setting-user-a:delete",
        "setting-user-a:absence",
        "screen:provenance",
      ]) &&
      mixedPhaseThreeResourceKeys
        .slice(0, 3)
        .every((resourceKey) => mixedPhaseThreeState.cleanupAbsenceKeys.has(resourceKey)) &&
      mixedPhaseThreeState.cleanupFailedKeys.has("phase3-screen") &&
      !canonicalJson(mixedPhaseThreeDiagnostic).includes(phaseThreeScreenBoundaryPrivateMarker),
    "mixed phase 3 early-success/screen-boundary attribution drift"
  );

  const taggedAdminPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const taggedAdminPhaseThreeResult = await executeCleanupPlanStage(
    taggedAdminPhaseThreeState,
    mixedPhaseThreePlan,
    mixedPhaseThreeView,
    mixedPhaseThreeKinds,
    3,
    async (_state, record, operationKind) => {
      if (record.kind === "screen" && operationKind === "provenance") {
        throw retainPrivateCleanupFailureDiagnosticNeverThrow(
          new Error(phaseThreeScreenBoundaryPrivateMarker),
          3,
          "admin_api_failed"
        );
      }
      return deepFreezeExact({ kind: record.kind, operationKind });
    }
  );
  invariant(
    taggedAdminPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(taggedAdminPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "admin_api_failed" }
      ),
    "tagged admin API phase 3 priority drift"
  );

  const genericOperationRecord = deepFreezeExact({
    resourceKey: "phase3-generic-operation",
    kind: "screen",
  });
  const genericOperationPlan = deepFreezeExact({
    resourceKeys: deepFreezeExact([genericOperationRecord.resourceKey]),
  });
  const genericOperationView = deepFreezeExact({
    ledger: deepFreezeExact([genericOperationRecord]),
    dependencyGraph: deepFreezeExact({ [genericOperationRecord.resourceKey]: [] }),
    failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
  });
  for (const [failedOperation, expectedFailureClass] of [
    ["provenance", "persistent_provenance_failed"],
    ["delete", "persistent_delete_failed"],
    ["absence", "persistent_absence_failed"],
  ]) {
    const state = { cleanupAbsenceKeys: new Set(), cleanupFailedKeys: new Set() };
    const result = await executeCleanupPlanStage(
      state,
      genericOperationPlan,
      genericOperationView,
      new Set([genericOperationRecord.kind]),
      3,
      async (_state, record, operationKind) => {
        if (operationKind === failedOperation) {
          throw new Error(phaseThreeScreenBoundaryPrivateMarker);
        }
        return deepFreezeExact({ kind: record.kind, operationKind });
      }
    );
    invariant(
      result.failures.length === 1 &&
        deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(result.failures[0]), {
          cleanupPhase: 3,
          cleanupFailureClass: expectedFailureClass,
        }),
      failedOperation + " generic phase 3 operation attribution drift"
    );
  }

  const missingPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const missingPhaseThreeResult = await executeCleanupPlanStage(
    missingPhaseThreeState,
    deepFreezeExact({ resourceKeys: deepFreezeExact(["phase3-missing-record"]) }),
    deepFreezeExact({
      ledger: deepFreezeExact([]),
      dependencyGraph: deepFreezeExact({}),
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["screen"]),
    3,
    async () => deepFreezeExact({ unreachable: true })
  );
  const dependencyPhaseThreeRecord = deepFreezeExact({
    resourceKey: "phase3-dependent-parent",
    kind: "screen",
  });
  const dependencyPhaseThreeState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const dependencyPhaseThreeResult = await executeCleanupPlanStage(
    dependencyPhaseThreeState,
    deepFreezeExact({ resourceKeys: deepFreezeExact([dependencyPhaseThreeRecord.resourceKey]) }),
    deepFreezeExact({
      ledger: deepFreezeExact([dependencyPhaseThreeRecord]),
      dependencyGraph: deepFreezeExact({
        [dependencyPhaseThreeRecord.resourceKey]: ["phase3-unproved-child"],
      }),
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set([dependencyPhaseThreeRecord.kind]),
    3,
    async () => deepFreezeExact({ unreachable: true })
  );
  invariant(
    missingPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(missingPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "persistent_stage_failed" }
      ) &&
      dependencyPhaseThreeResult.failures.length === 1 &&
      deepEqualJson(
        privateCleanupFailureDiagnosticNeverThrow(dependencyPhaseThreeResult.failures[0]),
        { cleanupPhase: 3, cleanupFailureClass: "persistent_dependency_blocked" }
      ),
    "phase 3 stage/dependency attribution drift"
  );

  const cleanupStageSource = executeCleanupPlanStage.toString();
  const cleanupStageSourceRequired = [
    'phaseThreeFailureClass = "persistent_stage_failed"',
    'cleanupPhase === 3 ? phaseThreeFailureClass : "phase_failed"',
    '"persistent_dependency_blocked"',
    '"persistent_provenance_failed"',
    '"persistent_delete_failed"',
    '"persistent_absence_failed"',
    "finalPlan.failureDiscoveryBlockedParentKeys.includes(resourceKey)",
    "!state.cleanupAbsenceKeys.has(childKey) || state.cleanupFailedKeys.has(childKey)",
  ];
  const validatesCleanupStageSource = (source) =>
    cleanupStageSourceRequired.every((token) => source.includes(token));
  invariant(validatesCleanupStageSource(cleanupStageSource), "cleanup stage source contract drift");
  assertSourceMutantsRejected(
    cleanupStageSource,
    validatesCleanupStageSource,
    cleanupStageSourceRequired,
    "cleanup stage guards/classes"
  );
  negativeCases += 7;

  const branchCleanupState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const branchOperationCalls = [];
  const branchResult = await executeCleanupPlanStage(
    branchCleanupState,
    deepFreezeExact({
      resourceKeys: deepFreezeExact([
        graphAccessCore.resourceKey,
        graphSessionCore.resourceKey,
        graphUserCore.resourceKey,
        graphIndependentCore.resourceKey,
      ]),
    }),
    deepFreezeExact({
      ledger: exactGraphRecords,
      dependencyGraph: exactGraph,
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["access-log-task-ua", "session-task", "user-a", "content-type"]),
    6,
    async (_state, record, operationKind) => {
      branchOperationCalls.push(record.resourceKey + ":" + operationKind);
      if (record.resourceKey === graphAccessCore.resourceKey && operationKind === "absence") {
        throw new Error("private branch absence failure");
      }
      return deepFreezeExact({ resourceKey: record.resourceKey, operationKind });
    }
  );
  invariant(
    branchResult.failures.length === 3 &&
      branchResult.failures.every((failure) =>
        deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(failure), {
          cleanupPhase: 6,
          cleanupFailureClass: "phase_failed",
        })
      ) &&
      branchOperationCalls.length === 6 &&
      branchCleanupState.cleanupFailedKeys.has(graphAccessCore.resourceKey) &&
      branchCleanupState.cleanupFailedKeys.has(graphSessionCore.resourceKey) &&
      branchCleanupState.cleanupFailedKeys.has(graphUserCore.resourceKey) &&
      branchCleanupState.cleanupAbsenceKeys.has(graphIndependentCore.resourceKey) &&
      !branchOperationCalls.some((value) => value.startsWith(graphSessionCore.resourceKey + ":")) &&
      !branchOperationCalls.some((value) => value.startsWith(graphUserCore.resourceKey + ":")),
    "cleanup branch/transitive blocker continuation drift"
  );

  const phase7CleanupState = {
    cleanupAbsenceKeys: new Set(),
    cleanupFailedKeys: new Set(),
  };
  const phase7Result = await executeCleanupPlanStage(
    phase7CleanupState,
    deepFreezeExact({ resourceKeys: deepFreezeExact([graphIndependentCore.resourceKey]) }),
    deepFreezeExact({
      ledger: exactGraphRecords,
      dependencyGraph: exactGraph,
      failureDiscoveryBlockedParentKeys: deepFreezeExact([]),
    }),
    new Set(["content-type"]),
    7,
    async () => {
      throw new Error("private phase 7 returned stage failure");
    }
  );
  invariant(
    phase7Result.failures.length === 1 &&
      deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(phase7Result.failures[0]), {
        cleanupPhase: 7,
        cleanupFailureClass: "phase_failed",
      }) &&
      phase7CleanupState.cleanupFailedKeys.has(graphIndependentCore.resourceKey),
    "phase 7 returned cleanup-stage failure attribution drift"
  );
  negativeCases += 2;

  const scheduledFailures = [];
  const scheduledTrace = [];
  const scheduledCalls = [];
  const testScheduler = createCleanupPhaseScheduler(scheduledFailures, scheduledTrace);
  for (let phase = 1; phase <= 10; phase += 1) {
    await testScheduler.run(phase, async () => {
      scheduledCalls.push(phase);
      if (phase === 3 || phase === 9) throw new Error("private scheduled phase failure");
    });
  }
  testScheduler.seal();
  invariant(
    deepEqualJson(scheduledCalls, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) &&
      scheduledFailures.length === 2 &&
      deepEqualJson(
        scheduledFailures.map((failure) => privateCleanupFailureDiagnosticNeverThrow(failure)),
        [
          { cleanupPhase: 3, cleanupFailureClass: "phase_failed" },
          { cleanupPhase: 9, cleanupFailureClass: "phase_failed" },
        ]
      ) &&
      scheduledTrace[2].completed === false &&
      scheduledTrace[8].completed === false &&
      scheduledTrace[9].completed === true,
    "cleanup scheduler skipped phase 10 after prior failures"
  );

  const cleanupPrecedenceFailures = [
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 7 failure"),
      7,
      "phase_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 generic failure"),
      3,
      "phase_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 admin failure"),
      3,
      "admin_api_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 provenance failure"),
      3,
      "persistent_provenance_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 delete failure"),
      3,
      "persistent_delete_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 absence failure"),
      3,
      "persistent_absence_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 stage failure"),
      3,
      "persistent_stage_failed"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 dependency failure"),
      3,
      "persistent_dependency_blocked"
    ),
    retainPrivateCleanupFailureDiagnosticNeverThrow(
      new Error("private phase 3 plan failure"),
      3,
      "persistent_plan_failed"
    ),
  ];
  const selectedCleanupPrecedence = selectPrivateCleanupFailureDiagnosticNeverThrow(
    cleanupPrecedenceFailures,
    0
  );
  const boundaryClassPrecedence = selectPrivateCleanupFailureDiagnosticNeverThrow(
    [
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new Error("private cleanup boundary failure"),
        0,
        "cleanup_boundary_failed"
      ),
      retainPrivateCleanupFailureDiagnosticNeverThrow(
        new Error("private construction cleanup failure"),
        0,
        "construction_cleanup_failed"
      ),
    ],
    0
  );
  const expectedPhaseEightPriority = [
    "bootstrap_reconciliation_failed",
    "bootstrap_cas_failed",
    "bootstrap_uncertain_baseline_failed",
    "bootstrap_post_restore_proof_failed",
    "bootstrap_restore_receipt_failed",
  ];
  const phaseEightPrioritySelectionsAreExact = expectedPhaseEightPriority
    .slice(0, -1)
    .every((expectedClass, index) => {
      const selected = selectPrivateCleanupFailureDiagnosticNeverThrow(
        [
          retainPrivateCleanupFailureDiagnosticNeverThrow(
            new Error("private lower-priority phase 8 failure"),
            8,
            expectedPhaseEightPriority[index + 1]
          ),
          retainPrivateCleanupFailureDiagnosticNeverThrow(
            new Error("private higher-priority phase 8 failure"),
            8,
            expectedClass
          ),
        ],
        0
      );
      return selected?.cleanupPhase === 8 && selected.cleanupFailureClass === expectedClass;
    });
  invariant(
    deepEqualJson(PHASE_THREE_CLEANUP_FAILURE_CLASSES, [
      "admin_api_failed",
      "persistent_plan_failed",
      "persistent_stage_failed",
      "persistent_dependency_blocked",
      "persistent_provenance_failed",
      "persistent_delete_failed",
      "persistent_absence_failed",
    ]) &&
      deepEqualJson(CLEANUP_FAILURE_CLASS_PRIORITY.slice(0, 7), [
        "persistent_plan_failed",
        "admin_api_failed",
        "persistent_provenance_failed",
        "persistent_delete_failed",
        "persistent_absence_failed",
        "persistent_stage_failed",
        "persistent_dependency_blocked",
      ]) &&
      deepEqualJson(PHASE_EIGHT_CLEANUP_FAILURE_CLASSES, expectedPhaseEightPriority) &&
      deepEqualJson(CLEANUP_FAILURE_CLASS_PRIORITY.slice(7, 12), expectedPhaseEightPriority) &&
      phaseEightPrioritySelectionsAreExact &&
      deepEqualJson(selectedCleanupPrecedence, {
        cleanupPhase: 3,
        cleanupFailureClass: "persistent_plan_failed",
      }) &&
      deepEqualJson(boundaryClassPrecedence, {
        cleanupPhase: 0,
        cleanupFailureClass: "construction_cleanup_failed",
      }),
    "cleanup phase/class diagnostic precedence drift"
  );

  const cleanupProductionSeamPrivateMarker =
    "TASK540_CLEANUP_PRODUCTION_SEAM_PRIVATE_DO_NOT_EGRESS";
  let cleanupAdminBoundaryFailure = null;
  try {
    await runPrivateCleanupAdminApiBoundary(async () => {
      throw new Error(cleanupProductionSeamPrivateMarker + ":admin");
    });
  } catch (error) {
    cleanupAdminBoundaryFailure = error;
  }
  invariant(
    cleanupAdminBoundaryFailure !== null &&
      deepEqualJson(privateCleanupFailureDiagnosticNeverThrow(cleanupAdminBoundaryFailure), {
        cleanupPhase: 3,
        cleanupFailureClass: "admin_api_failed",
      }),
    "cleanup Admin API production boundary attribution drift"
  );

  const cleanupPlanBoundaryFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(cleanupProductionSeamPrivateMarker + ":plan"),
    3,
    "persistent_plan_failed"
  );
  const cleanupPhaseThreeAggregate = retainPrivateCleanupAggregateDiagnosticNeverThrow(
    new AggregateError(
      [cleanupAdminBoundaryFailure, cleanupPlanBoundaryFailure],
      cleanupProductionSeamPrivateMarker + ":phase-three"
    ),
    [cleanupAdminBoundaryFailure, cleanupPlanBoundaryFailure],
    3
  );
  const cleanupLaterPhaseFailure = retainPrivateCleanupFailureDiagnosticNeverThrow(
    new Error(cleanupProductionSeamPrivateMarker + ":later-phase"),
    7,
    "phase_failed"
  );
  const cleanupFinalAggregate = retainPrivateCleanupAggregateDiagnosticNeverThrow(
    new AggregateError(
      [cleanupPhaseThreeAggregate, cleanupLaterPhaseFailure],
      cleanupProductionSeamPrivateMarker + ":final"
    ),
    [cleanupPhaseThreeAggregate, cleanupLaterPhaseFailure],
    0
  );
  const cleanupProductionSeamAuthority = createPrivateConstructionCleanupAuthority();
  cleanupProductionSeamAuthority.bindCompleteCapabilities({
    async cleanup() {
      throw cleanupFinalAggregate;
    },
  });
  const cleanupProductionSeamOutcome =
    await cleanupProductionSeamAuthority.cleanupWhateverWasAcquiredOnceNeverThrow();
  const cleanupProductionSeamLines = [];
  const cleanupProductionSeamSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    cleanupProductionSeamLines.push(line);
  });
  const cleanupProductionSeamExpectedLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 3,
      cleanupFailureClass: "persistent_plan_failed",
    }) + "\n";
  invariant(
    cleanupProductionSeamOutcome.absenceProven === false &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        null,
        cleanupProductionSeamSink,
        cleanupProductionSeamAuthority
      ) === true &&
      emitPrivateFailureActionDiagnosticNeverThrow(
        null,
        cleanupProductionSeamSink,
        cleanupProductionSeamAuthority
      ) === false &&
      deepEqualJson(cleanupProductionSeamLines, [cleanupProductionSeamExpectedLine]) &&
      Buffer.byteLength(cleanupProductionSeamLines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES &&
      !cleanupProductionSeamLines[0].includes(cleanupProductionSeamPrivateMarker),
    "cleanup production seam bounded diagnostic drift"
  );

  const cleanupAdminBoundarySource = runPrivateCleanupAdminApiBoundary.toString();
  const realCapabilitiesSource = createRealCapabilities.toString();
  const assertCleanupProductionSeamMutantRejected = (
    source,
    productionToken,
    mutantToken,
    label
  ) => {
    const validatesProductionSeam = (candidate) => candidate.split(productionToken).length === 2;
    invariant(validatesProductionSeam(source), label + " production source anchor drift");
    const mutant = source.replace(productionToken, mutantToken);
    assertNegative(!validatesProductionSeam(mutant), label + " source mutant");
  };
  assertCleanupProductionSeamMutantRejected(
    cleanupAdminBoundarySource,
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "admin_api_failed")',
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_provenance_failed")',
    "cleanup Admin API class"
  );
  assertCleanupProductionSeamMutantRejected(
    realCapabilitiesSource,
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_plan_failed")',
    'retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "persistent_stage_failed")',
    "persistent plan class"
  );
  assertCleanupProductionSeamMutantRejected(
    realCapabilitiesSource,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
            new AggregateError(phaseFailures, "phase 3 response-lost/persistent cleanup failed"),
            phaseFailures,
            3
          )`,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
            new AggregateError(phaseFailures, "phase 3 response-lost/persistent cleanup failed"),
            [],
            3
          )`,
    "phase 3 cleanup aggregate input"
  );
  assertCleanupProductionSeamMutantRejected(
    realCapabilitiesSource,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
          new AggregateError(failures, "TASK-540 deterministic cleanup failed"),
          failures,
          0
        )`,
    `retainPrivateCleanupAggregateDiagnosticNeverThrow(
          new AggregateError(failures, "TASK-540 deterministic cleanup failed"),
          [],
          0
        )`,
    "final cleanup aggregate input"
  );
  negativeCases += 2;
  let independentStepMask = 0;
  await expectAsyncFailure(
    async () =>
      runIndependentCleanupStepsNeverSkip(
        [
          async () => {
            independentStepMask |= 1;
            throw new Error("private first branch failure");
          },
          async () => {
            independentStepMask |= 2;
          },
          async () => {
            independentStepMask |= 4;
          },
        ],
        "self-test independent branches"
      ),
    "independent cleanup branch aggregate"
  );
  invariant(independentStepMask === 7, "independent cleanup branch was skipped");

  const reorderedCleanupReceipts = [...terminalEvidence.cleanupReceipts];
  [reorderedCleanupReceipts[0], reorderedCleanupReceipts[1]] = [
    reorderedCleanupReceipts[1],
    reorderedCleanupReceipts[0],
  ];
  await expectAsyncFailure(
    async () => assertCleanupReceiptBijection(terminalFinalPlan, reorderedCleanupReceipts),
    "reordered final cleanup receipts"
  );
  for (const [label, keys, tuples] of [
    [
      "real persistent tuple",
      terminalCapabilities.lastPersistentPlan.resourceKeys,
      terminalCapabilities.lastPersistentPlan.tuples,
    ],
    [
      "real terminal tuple",
      terminalCapabilities.lastTerminalPlan.resourceKeys,
      terminalCapabilities.lastTerminalPlan.tuples,
    ],
    ["real final tuple", terminalFinalPlan.resourceKeys, terminalFinalPlan.actionTuples],
  ]) {
    await expectAsyncFailure(
      async () => assertExactCleanupTupleSet(tuples.slice(1), keys, label),
      label + " omission"
    );
  }

  const failureCapabilities = buildFakeCapabilities({ failOrdinal: 25 });
  let failure = null;
  try {
    await executeSmokePlanCore(plan, failureCapabilities);
  } catch (error) {
    failure = error;
  }
  invariant(failure === TASK_FAILURE && Object.isFrozen(failure), "failure shape drift");
  invariant(failureCapabilities.cleaned, "failure cleanup did not run");
  invariant(failureCapabilities.calls.at(-1) === "failure-cleanup", "failure cleanup order drift");
  negativeCases += 1;

  await expectAsyncFailure(async () => assertExecutionInput({}), "missing public input");
  await expectAsyncFailure(
    async () =>
      assertExecutionInput({
        root: "/home/coder/project/Coderso",
        nonce: "0123456789ab",
        assertSafeEvidence() {},
        snapshotRepository() {},
        dispatchAgent() {},
      }),
    "agent injection"
  );
  await expectAsyncFailure(
    async () =>
      assertExecutionInput({
        root: "/home/coder/project/Coderso",
        nonce: "0123456789ab",
        assertSafeEvidence() {},
        snapshotRepository() {},
        command: "rm -rf /",
      }),
    "command injection"
  );
  const parsed = parseRegisteredOutput(
    { encoding: "json-string", kind: "object", keys: ["assertion", "target", "observations"] },
    Buffer.from(JSON.stringify(JSON.stringify({ assertion: "x", target: "y", observations: {} }))),
    "transport parser self-test"
  );
  invariant(parsed.assertion === "x", "transport JSON unwrap drift");
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        { encoding: "json", kind: "object", keys: ["assertion", "target", "observations"] },
        Buffer.from(JSON.stringify({ assertion: "x", target: "y", observations: {}, pass: true })),
        "pass injection"
      ),
    "trusted pass injection"
  );

  const strictObservationSchema = {
    type: "object",
    properties: {
      assertion: selfTestStringSchema({ minLength: 1, maxLength: 64 }),
      geometry: {
        type: "object",
        properties: {
          x: selfTestNumberSchema(),
          width: selfTestNumberSchema({ minimum: 0 }),
        },
      },
      tags: {
        type: "array",
        items: selfTestStringSchema({ minLength: 1, maxLength: 32 }),
        minItems: 1,
        maxItems: 8,
        unique: true,
      },
    },
  };
  const strictObservationPredicate = {
    op: "and",
    items: [
      {
        op: "nonEmptyString",
        value: { op: "output", path: ["assertion"] },
      },
      {
        op: "within",
        actual: { op: "output", path: ["geometry", "x"] },
        expected: { op: "literal", value: 10 },
        tolerance: { op: "literal", value: 0.25 },
      },
      {
        op: "compare",
        mode: "gt",
        left: { op: "output", path: ["geometry", "width"] },
        right: { op: "literal", value: 0 },
      },
      {
        op: "sameSet",
        left: { op: "output", path: ["tags"] },
        right: { op: "literal", value: ["visible", "settled"] },
        duplicates: "reject",
      },
      {
        op: "every",
        source: { op: "output", path: ["tags"] },
        as: "tag",
        predicate: {
          op: "nonEmptyString",
          value: { op: "var", name: "tag", path: [] },
        },
      },
    ],
  };
  const strictObservationContract = {
    grammar: selfTestJsonTransport(1),
    schema: strictObservationSchema,
    predicate: strictObservationPredicate,
    rememberAs: "strictObservation",
  };
  const strictObservation = {
    assertion: "visible-geometry",
    geometry: { x: 10.2, width: 320 },
    tags: ["visible", "settled"],
  };
  const selfTestJsonFrame = (value) => Buffer.from(canonicalJson(value) + "\n");
  const strictContext = selfTestContext(plan, "dsl-success");
  const strictParsed = parseRegisteredOutput(
    strictObservationContract,
    selfTestJsonFrame(strictObservation),
    "dsl-success",
    strictContext
  );
  invariant(
    deepEqualJson(strictParsed, strictObservation),
    "exact output parser changed observations"
  );
  invariant(
    strictContext.priorOutputs.get("dsl-success") === strictParsed &&
      strictContext.variables.get("strictObservation") === strictParsed,
    "validated observations were not remembered atomically"
  );

  const extraNested = JSON.parse(JSON.stringify(strictObservation));
  extraNested.geometry.unexpected = true;
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        strictObservationContract,
        selfTestJsonFrame(extraNested),
        "dsl-extra-nested",
        selfTestContext(plan, "dsl-extra-nested")
      ),
    "extra nested output key"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        strictObservationContract,
        selfTestJsonFrame(JSON.stringify(strictObservation)),
        "dsl-wrong-layer",
        selfTestContext(plan, "dsl-wrong-layer")
      ),
    "wrong JSON layer"
  );

  const failedPredicateContext = selfTestContext(plan, "dsl-failed-predicate");
  const failedPredicateContract = {
    grammar: selfTestJsonTransport(1),
    schema: strictObservationSchema,
    predicate: {
      op: "within",
      actual: { op: "output", path: ["geometry", "x"] },
      expected: { op: "literal", value: 50 },
      tolerance: { op: "literal", value: 0 },
    },
    rememberAs: "mustNotPersist",
  };
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        failedPredicateContract,
        selfTestJsonFrame(strictObservation),
        "dsl-failed-predicate",
        failedPredicateContext
      ),
    "failed output predicate"
  );
  invariant(
    failedPredicateContext.priorOutputs.size === 0 && failedPredicateContext.variables.size === 0,
    "failed predicate retained an observation"
  );

  const duplicateSetContract = {
    grammar: selfTestJsonTransport(1),
    schema: {
      type: "object",
      properties: {
        values: {
          type: "array",
          items: selfTestStringSchema({ minLength: 1, maxLength: 8 }),
          minItems: 1,
          maxItems: 8,
          unique: false,
        },
      },
    },
    predicate: {
      op: "sameSet",
      left: { op: "output", path: ["values"] },
      right: { op: "literal", value: ["a"] },
      duplicates: "reject",
    },
    rememberAs: null,
  };
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        duplicateSetContract,
        selfTestJsonFrame({ values: ["a", "a"] }),
        "dsl-duplicate-set",
        selfTestContext(plan, "dsl-duplicate-set")
      ),
    "sameSet duplicate"
  );

  const arraySchema = {
    type: "array",
    items: { type: "integer", minimum: 0, maximum: 10 },
    minItems: 0,
    maxItems: 4,
    unique: false,
  };
  const arrayWithHole = new Array(1);
  await expectAsyncFailure(
    async () => validateExactJsonSchema(arraySchema, arrayWithHole, "array-hole"),
    "array hole"
  );
  const arrayWithCustomKey = [1];
  arrayWithCustomKey.extra = true;
  await expectAsyncFailure(
    async () => validateExactJsonSchema(arraySchema, arrayWithCustomKey, "array-custom-key"),
    "array custom key"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(
        { type: "object", properties: { value: { type: "boolean" } } },
        Object.assign(Object.create(null), { value: true }),
        "nonplain-output"
      ),
    "nonplain JSON output"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(selfTestNumberSchema(), Number.POSITIVE_INFINITY, "nonfinite-output"),
    "nonfinite JSON output"
  );
  validateExactJsonSchema(
    selfTestStringSchema({ minLength: 12, maxLength: 32, format: "page-id" }),
    "wf540-page-1",
    "valid-page-id"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(
        selfTestStringSchema({ minLength: 1, maxLength: 32, format: "page-id" }),
        "p1",
        "invalid-page-id"
      ),
    "legacy page ID format"
  );

  const refContext = selfTestContext(plan, "ref-self-test");
  refContext.captures.bind("screen.id", "id/with-slash");
  refContext.priorOutputs.set("prior-action", { nested: { value: 7 } });
  refContext.variables.set("sample", { value: "retained" });
  refContext.currentOutput = { value: 3 };
  invariant(
    resolveExactRef({ op: "secret", name: "ADMIN_EMAIL" }, refContext) === "ADMIN_EMAIL",
    "secret Ref expanded a value"
  );
  invariant(
    resolveExactRef({ op: "capture", name: "screen.id" }, refContext) === "id/with-slash",
    "capture Ref drift"
  );
  invariant(
    resolveExactRef({ op: "fixture", path: ["fixturePrefix"] }, refContext) ===
      plan.fixtureBlueprint.fixturePrefix,
    "fixture Ref drift"
  );
  invariant(
    resolveExactRef(
      { op: "prior", actionId: "prior-action", path: ["nested", "value"] },
      refContext
    ) === 7,
    "prior Ref drift"
  );
  invariant(
    resolveExactRef({ op: "output", path: ["value"] }, refContext) === 3,
    "output Ref drift"
  );
  invariant(
    resolveExactRef({ op: "var", name: "sample", path: ["value"] }, refContext) === "retained",
    "var Ref drift"
  );
  invariant(
    resolveExactRef(
      {
        op: "rootPath",
        parts: [
          { op: "literal", value: "_docs" },
          { op: "literal", value: "evidence.json" },
        ],
      },
      refContext
    ) === "/task540-self-test-root/_docs/evidence.json",
    "rootPath Ref drift"
  );
  invariant(
    resolveExactRef({ op: "selector", templateId: "loginEmail", args: [] }, refContext) ===
      'input#email[name="email"][type="email"]',
    "selector Ref drift"
  );
  invariant(
    resolveExactRef({ op: "path", key: "builder" }, refContext) ===
      plan.fixtureBlueprint.origins.admin + "/admin/advanced/custom-screens/id%2Fwith-slash",
    "path Ref capture expansion drift"
  );
  invariant(
    deepEqualJson(
      resolveExactRef(
        {
          op: "array",
          items: [
            { op: "literal", value: 1 },
            { op: "literal", value: 2 },
          ],
        },
        refContext
      ),
      [1, 2]
    ),
    "array Ref drift"
  );
  invariant(
    deepEqualJson(
      resolveExactRef(
        { op: "object", properties: { safe: { op: "literal", value: true } } },
        refContext
      ),
      { safe: true }
    ),
    "object Ref drift"
  );
  invariant(
    resolveExactRef(
      {
        op: "sub",
        left: { op: "prior", actionId: "prior-action", path: ["nested", "value"] },
        right: { op: "output", path: ["value"] },
      },
      refContext
    ) === 4,
    "sub Ref drift"
  );
  invariant(
    resolveExactRef({ op: "length", value: { op: "literal", value: [1, 2, 3] } }, refContext) === 3,
    "length Ref drift"
  );
  const changedPointers = resolveExactRef(
    {
      op: "changedKeys",
      before: {
        op: "literal",
        value: { same: 1, nested: { value: 1 }, array: [1, 2], removed: true, "~slash/": 1 },
      },
      after: {
        op: "literal",
        value: { same: 1, nested: { value: 2, added: true }, array: [1, 3, 4], "~slash/": 2 },
      },
    },
    refContext
  );
  invariant(
    deepEqualJson(changedPointers, [
      "/array/1",
      "/array/2",
      "/nested/added",
      "/nested/value",
      "/removed",
      "/~0slash~1",
    ]),
    "changedKeys JSON Pointer drift"
  );
  await expectAsyncFailure(
    async () => resolveExactRef({ op: "unknown" }, refContext),
    "unknown Ref opcode"
  );
  await expectAsyncFailure(
    async () => resolveExactRef({ op: "literal", value: "$NOT_A_SECRET_REF" }, refContext),
    "literal dollar secret reference"
  );
  await expectAsyncFailure(
    async () => evaluateExactPredicate({ op: "unknown" }, refContext),
    "unknown Predicate opcode"
  );
  const shadowContext = selfTestContext(plan, "shadow-test");
  shadowContext.currentOutput = ["value"];
  shadowContext.variables.set("item", "existing");
  await expectAsyncFailure(
    async () =>
      evaluateExactPredicate(
        {
          op: "every",
          source: { op: "output", path: [] },
          as: "item",
          predicate: { op: "nonEmptyString", value: { op: "var", name: "item", path: [] } },
        },
        shadowContext
      ),
    "Predicate variable shadowing"
  );

  invariant(
    privateNativeSnapshotSizeIsValid(0, true) && privateNativeSnapshotSizeIsValid(1, false),
    "native snapshot size acceptance drift"
  );
  assertNegative(
    !privateNativeSnapshotSizeIsValid(0, false),
    "empty non-initial native snapshot rejection"
  );
  const entryAuthorId = "54000000-0000-4000-8000-000000000001";
  invariant(
    readExactEntryAuthorId(
      { author: { id: entryAuthorId, name: "Smoke Owner", email: "smoke@example.invalid" } },
      entryAuthorId,
      "self-test entry"
    ) === entryAuthorId,
    "entry author projection drift"
  );
  await expectAsyncFailure(
    async () =>
      readExactEntryAuthorId({ authorId: entryAuthorId }, entryAuthorId, "legacy self-test entry"),
    "legacy entry authorId projection"
  );

  const sessionAbsenceContract = {
    grammar: selfTestNativeTransport({
      nativeMode: "session-list-absence",
      sessionName: "wf540smoke",
      normalizedValue: true,
    }),
    schema: { type: "literal", value: true },
    predicate: null,
    rememberAs: null,
  };
  const emptySessionList = Buffer.from("  (no browsers)\n");
  invariant(
    parseRegisteredOutput(
      sessionAbsenceContract,
      emptySessionList,
      "session-absence",
      selfTestContext(plan, "session-absence")
    ) === true,
    "session absence parser drift"
  );
  const presentSessionList = Buffer.from(
    "### Browsers\n- owner-session:\n  - status: open\n  - browser-type: chromium\n  - user-data-dir: <in-memory>\n- wf540smoke:\n  - status: open\n  - browser-type: chromium\n  - user-data-dir: <in-memory>\n"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        sessionAbsenceContract,
        presentSessionList,
        "session-present",
        selfTestContext(plan, "session-present")
      ),
    "named session present"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        sessionAbsenceContract,
        Buffer.from("### Browsers\n- malformed\n"),
        "session-malformed",
        selfTestContext(plan, "session-malformed")
      ),
    "malformed session list"
  );
  const nativeCloseContract = {
    grammar: selfTestNativeTransport({
      nativeMode: "exact-text",
      exactText: "Browser 'wf540smoke' closed\n\n",
      normalizedValue: "closed",
    }),
    schema: { type: "literal", value: "closed" },
    predicate: null,
    rememberAs: null,
  };
  invariant(
    parseRegisteredOutput(
      nativeCloseContract,
      Buffer.from("Browser 'wf540smoke' closed\n\n"),
      "native-close",
      selfTestContext(plan, "native-close")
    ) === "closed",
    "native exact-text parser drift"
  );

  const privateMarker = "TASK540_PRIVATE_DO_NOT_EGRESS";
  let privateFailure = null;
  try {
    parseRegisteredOutput(
      strictObservationContract,
      selfTestJsonFrame({
        assertion: "visible-geometry",
        geometry: { x: 10.2, width: 320, privateMarker },
        tags: ["visible", "settled"],
      }),
      "private-egress-test",
      selfTestContext(plan, "private-egress-test")
    );
  } catch (error) {
    privateFailure = error;
  }
  invariant(privateFailure !== null, "private egress fixture did not fail");
  invariant(
    !String(privateFailure).includes(privateMarker),
    "private output leaked through parser failure"
  );
  invariant(
    !canonicalJson(TASK_FAILURE).includes(privateMarker),
    "private output leaked through public failure"
  );
  negativeCases += 1;
  await runExpectedAuthChallengeSelfTest({
    expectNegative: expectAsyncFailure,
    assertNegative,
  });
  return deepFreezeExact({
    pass: true,
    actions: plan.actionManifest.length,
    runtimeReceipts: evidence.runtimeReceipts.length,
    cleanupActions: evidence.cleanupReceipts.length,
    nominalPersistentCleanupActions: 72,
    terminalMatrixCases: 1,
    captures: evidence.captureProjection.length,
    negativeCases,
  });
}

if (
  process.argv[1]?.endsWith("/task-540-smoke-executor.mjs") &&
  process.argv.includes("--self-test")
) {
  process.stdout.write(JSON.stringify(await runTask540SmokeExecutorSelfTest()));
}
