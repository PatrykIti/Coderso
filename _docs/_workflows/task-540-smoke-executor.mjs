import { buildTask540SmokePlan } from "./task-540-smoke-contract.mjs";
import { exactOwnKeys, invariant } from "./task-540-smoke/executor/foundation.mjs";

import { assertExecutionInput } from "./task-540-smoke/executor/execution-contract.mjs";
import { createPlanExecutionRuntime } from "./task-540-smoke/executor/plan-execution.mjs";
import { createRunTask540SmokeExecutorSelfTest } from "./task-540-smoke/executor/self-test/entry.mjs";
import { createRealCapabilitiesFactory } from "./task-540-smoke/executor/capabilities/real-capabilities.mjs";

import { createFakeCapabilitiesRuntime } from "./task-540-smoke/executor/fake-capabilities.mjs";
import { validateCapabilityResult } from "./task-540-smoke/executor/canonical-evidence.mjs";
import {
  assertNoSymlinkAncestors,
  readOwnedRegularFileNoFollow,
  readStableArtifactIdentity,
  removePrivateWorkspaceLedger,
  requireMissingPath,
  sameArtifactIdentity,
} from "./task-540-smoke/executor/private-workspace.mjs";
import { TASK_FAILURE } from "./task-540-smoke/executor/config.mjs";
import { createResponseLostRegistry } from "./task-540-smoke/runtime/response-lost-registry.mjs";
import { createResponseLostBaselines } from "./task-540-smoke/runtime/response-lost-baselines.mjs";
import { createResponseLostDiscovery } from "./task-540-smoke/runtime/response-lost-discovery.mjs";
import { cleanupDiagnostics } from "./task-540-smoke/cleanup/diagnostics.mjs";
import { createConstructionAuthorityRuntime } from "./task-540-smoke/cleanup/construction-authority.mjs";
import { createFinalBaselinesRuntime } from "./task-540-smoke/cleanup/final-baselines.mjs";
import { createCleanupSubjectAuthorityRuntime } from "./task-540-smoke/cleanup/subject-authority.mjs";
import {
  createFailureBoundaryRuntime,
  retainOrDiscardPreAuthorityCauseNeverThrow,
} from "./task-540-smoke/executor/failure-boundary.mjs";
import { createDiagnosticSinkRuntime } from "./task-540-smoke/executor/diagnostic-sink.mjs";
import { createAdminApiSessionRuntime } from "./task-540-smoke/runtime/admin-api-session.mjs";
import { createBootstrapLoginRuntime } from "./task-540-smoke/runtime/bootstrap-login.mjs";
import { createBunBridgeTransport } from "./task-540-smoke/runtime/bun-bridge-transport.mjs";
import { createCommandAuthorityRuntime } from "./task-540-smoke/runtime/command-authority.mjs";
import { createMediaOperationsRuntime } from "./task-540-smoke/runtime/media-operations.mjs";
import { createMissingMediaProofRuntime } from "./task-540-smoke/runtime/missing-media-proof.mjs";
import { createMediaStorageOwnershipRuntime } from "./task-540-smoke/runtime/media-storage-ownership.mjs";
import { createRuntimeOperationRouter } from "./task-540-smoke/runtime/operation-router.mjs";
import { createProcessRuntime } from "./task-540-smoke/runtime/process-runtime.mjs";
import { createStorageManifestRuntime } from "./task-540-smoke/runtime/storage-manifest.mjs";
import { createStoragePreflightRuntime } from "./task-540-smoke/runtime/storage-preflight.mjs";
import {
  assertPlainJsonValue,
} from "./task-540-smoke/executor/json-schema.mjs";
import { validateBunBridgeInput } from "./task-540-smoke/executor/bridge-input-validators.mjs";
import { createBunBridgeDescriptors } from "./task-540-smoke/executor/bridge-descriptors.mjs";
import {
  RESOURCE_BUN_SOURCE_SPECS,
  createBunBridgeOperationRegistry,
} from "./task-540-smoke/executor/bridge-operation-registry.mjs";
import { createResourceBunOperationAuthority } from "./task-540-smoke/executor/resource-bun-authority.mjs";
import { createResponseLostBridgeOutputValidators } from "./task-540-smoke/executor/bridge-output-validators/response-lost.mjs";
import { createResourceBridgeOutputValidators } from "./task-540-smoke/executor/bridge-output-validators/resources.mjs";
import { requireBridgeUuid } from "./task-540-smoke/executor/bun-bridge-validation-primitives.mjs";
import {
  assertRecordIdentity,
  contentSchemaFromFields,
  createPlatformRuntimeOperations,
  createScreenMaterialization,
  normalizeAuthRatePolicy,
  runtimeSafeProjection,
} from "./task-540-smoke/executor/runtime-operations/platform.mjs";
import { createOverrideRuntimeOperations } from "./task-540-smoke/executor/runtime-operations/overrides.mjs";
import {
  resolveFixtureValue,
} from "./task-540-smoke/executor/ref-dsl.mjs";
import { decodeExactNativeUtf8 } from "./task-540-smoke/executor/output-parser.mjs";
import { createBrowserOutputAuthority } from "./task-540-smoke/executor/browser-output-authority.mjs";
import {
  createTaskTrafficAuthority,
  taskUserAgents,
} from "./task-540-smoke/executor/task-traffic.mjs";
import {
  authoritativeProofRuntimeReceipt,
  createCleanupExecutionStages,
  finalRecordByKey,
} from "./task-540-smoke/executor/cleanup-execution.mjs";
import { createConstructionStateCleanup } from "./task-540-smoke/executor/finalization.mjs";
import {
  createBootstrapRestorationProtocol,
} from "./task-540-smoke/executor/bootstrap-restoration-protocol.mjs";
import {
  createExactSeoEntryDiscovery,
  createSyntheticOwnerDependencyRefresh,
} from "./task-540-smoke/executor/terminal-resource-graph.mjs";
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
  runCode,
} from "./task-540-smoke/browser/run-code.mjs";
import {
  createBrowserInvocationRouter,
  createSharedBrowserInvocationRuntime,
} from "./task-540-smoke/browser/generic-invocations.mjs";
import {
  createActionExecutionCompiler,
} from "./task-540-smoke/browser/route-and-action-sources.mjs";

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
const {
  responseLostCandidateFamilyForDescriptor,
  validateBooleanBridgeProjection,
  validateBoundedCandidatesBridgeOutput,
  validateContentRoutesBridgeProjection,
  validateResponseLostContentSchema,
} = createResponseLostBridgeOutputValidators({ RESPONSE_LOST_QUERY_OPERATION_BINDINGS });
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
// The Screen body materializer only needs the Bun bridge operation runner, and the
// response-lost baselines below capture Screen creates, so it is composed first.
const { materializeScreenBody } = createScreenMaterialization({ runBunBridgeOperation });
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
} = cleanupDiagnostics;

const failureBoundary = createFailureBoundaryRuntime({
  decodeExactNativeUtf8,
  validateCapabilityResult,
});
const {
  PRIVATE_FAILURE_ACTION_TRACKERS,
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
  finalizePrivateBrowserResultWithAuthSettlementBoundary,
  normalizePrivateBrowserOutputWithAuthSettlementBoundary,
  parsePrivateBrowserSuccessWithAuthSettlementBoundary,
  retainPrivateAuthSettlementFailureClassNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  retainPrivateToneOpenFailureClassNeverThrow,
  retainPrivateToneSelectFailureClassNeverThrow,
  sealPrivateFailureActionTracker,
} = failureBoundary;

const {
  PROCESS_ABSENCE_STABILITY_MS,
  PROCESS_KILL_GRACE_MS,
  PROCESS_TERM_GRACE_MS,
  SMOKE_PORTS,
  appendRetainedGroupMembers,
  delayMilliseconds,
  portsAreAbsent,
  readHostReadyLine,
  readHostReadyLineWithTimerAuthority,
  readProcIdentity,
  resolveValidatedBundledPlaywrightRequest,
  runPrivateProcess,
  runRetainedProcessGroup,
  startOwnedHost,
  stopOwnedHost,
} = createProcessRuntime();

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

const { assertCanonicalFinalization, executeSmokePlanCore } = createPlanExecutionRuntime({
  SMOKE_PORTS,
  beginPrivateFailureAction,
  completePrivateFailureAction,
  retainPrivateAuthSettlementFailureClassNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  retainPrivateToneOpenFailureClassNeverThrow,
  retainPrivateToneSelectFailureClassNeverThrow,
  sealPrivateFailureActionTracker,
});
const {
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  initializeBootstrapLoginAuthority,
  reconcileBootstrapLoginAuthority,
  runObservedBootstrapLoginAttempt,
  settleBootstrapLoginAttempt,
  validateBootstrapLoginObservation,
} = createBootstrapLoginRuntime({ delayMilliseconds, runBunBridgeOperation });
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
  BUN_BRIDGE_OUTPUT_VALIDATORS,
  validateBootstrapBaselineReadBridgeOutput,
  validateBootstrapRestoreBridgeOutput,
  validateBunBridgeOutput,
} = createResourceBridgeOutputValidators({
  validateApiSessionObservation,
  validateBooleanBridgeProjection,
  validateBootstrapLoginObservation,
  validateBoundedCandidatesBridgeOutput,
  validateContentRoutesBridgeProjection,
});
// Descriptor construction and validation both read the output validator registry, so the
// descriptor authority is built once the registry above exists, and the Bun bridge transport
// that validates descriptors is constructed from it right after.
const {
  PRIVATE_BUN_RESOURCE_DESCRIPTORS,
  REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE,
  RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID,
  RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY,
  bunBridgeOperationDescriptor,
  validateBunBridgeOperationDescriptor,
} = createBunBridgeDescriptors({ BUN_BRIDGE_OUTPUT_VALIDATORS });
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

// The static runtime, response-lost and auxiliary Bun bridge operation descriptor registries,
// their canonical union and the resource Bun source specs live in one module and receive the
// descriptor constructor and the response-lost query family registries composed above.
const {
  BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
} = createBunBridgeOperationRegistry({
  RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID,
  RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
  RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY,
  bunBridgeOperationDescriptor,
});

// The resource Bun descriptor promotion, the descriptor/ledger exactness proofs, the bound
// resource dispatch and the static registry validation live in one module and receive the
// descriptor registries, the descriptor constructors and the operation runner composed here.
const {
  assertResourceBunDescriptorSetExact,
  bunBridgeDescriptorForOperation,
  initializeBunBridgeOperationAuthority,
  promoteResourceBunDescriptorsAfterLedgerAppend,
  runBoundResourceBunOperation,
  validateStaticBunBridgeDescriptorRegistries,
} = createResourceBunOperationAuthority({
  BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_OUTPUT_VALIDATORS,
  BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  PRIVATE_BUN_RESOURCE_DESCRIPTORS,
  REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE,
  RESOURCE_BUN_SOURCE_SPECS,
  bunBridgeOperationDescriptor,
  runBunBridgeOperation,
  validateBunBridgeOperationDescriptor,
});

// The exact SEO entry discovery reads the resource Bun descriptor promotion composed above, and
// the fake capabilities read that discovery together with the Bun operation authority
// initializer, so both are composed once the resource Bun operation authority exists.
const { discoverExactSeoEntryResources } = createExactSeoEntryDiscovery({
  PROCESS_ABSENCE_STABILITY_MS,
  delayMilliseconds,
  promoteResourceBunDescriptorsAfterLedgerAppend,
  requireBridgeUuid,
  runBunBridgeOperation,
});
const { buildFakeCapabilities } = createFakeCapabilitiesRuntime({
  RESPONSE_LOST_CREATE_DESCRIPTORS,
  compileActionExecutionSpec,
  discoverExactSeoEntryResources,
  finalRecordByKey,
  initializeBunBridgeOperationAuthority,
  routeReceiptMetadata,
});

// The Bun bridge operation runner stays in the facade: the descriptor lookup it calls comes from
// the resource Bun operation authority, which itself receives this runner, so only a hoisted
// facade declaration can close that composition loop without a rebindable module slot.
async function runBunBridgeOperation(state, operationId, input, executionBoundaryObserver = null) {
  const descriptor = bunBridgeDescriptorForOperation(state, operationId);
  exactOwnKeys(input, descriptor.inputKeys, operationId + " Bun bridge input", { plain: true });
  const value = await runBunBridge(state, descriptor, input, executionBoundaryObserver);
  return validateBunBridgeOutput(state, descriptor, input, value);
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

// The setup-phase platform operations live in one module and receive the owned host
// launcher, the private process runner, the admin API session authority, the observed
// bootstrap login attempt, the Bun bridge operation runner and the private runtime
// registry composed above.
const {
  runtimeBotProtection,
  runtimeCreateContentType,
  runtimeCreateEditableEntry,
  runtimeCreateRelatedEntry,
  runtimeCreateScreen,
  runtimeCsrf,
  runtimeHealth,
  runtimeHostLaunch,
  runtimeLogin,
  runtimeProveContentType,
  runtimeProveEditableEntry,
  runtimeProveRelatedEntry,
  runtimeProveScreen,
  runtimeProveUser,
  runtimeProvisionUser,
  runtimeSecurity,
} = createPlatformRuntimeOperations({
  PRIVATE_RUNTIME,
  adminApiRequest,
  bootstrapApiSession,
  captureApiCsrf,
  loginApiSession,
  readPublicApiExactlyOnce,
  runBunBridgeOperation,
  runObservedBootstrapLoginAttempt,
  runPrivateProcess,
  startOwnedHost,
});

// The override, preference, unsafe-binding and baseline-reset runtime operations live in one
// module and receive the admin API request authority, the bootstrap API session accessor and
// the Bun bridge operation runner composed above.
const {
  commitIntentionalPresentationOverrideActionAfterLedgerAppend,
  completeIntentionalPresentationOverrideAbsenceAuthority,
  exactPresentationOverrideIdentifier,
  parseMediaRaceAuthoritativeAdminEvidence,
  runtimePatchUnsafeBinding,
  runtimeProveEntryBaseline,
  runtimeProveOverrides,
  runtimeProvePreference,
  runtimeProveScreenBaseline,
  runtimeProveUnsafeBinding,
  runtimeReplaceOverrides,
  runtimeResetEntry,
  runtimeResetScreen,
  runtimeSetPreference,
  runtimeUserAPreferenceFalse,
  runtimeUserAPreferenceRead,
  stageIntentionalPresentationOverrideActionReceipt,
  stageIntentionalPresentationOverrideObservation,
} = createOverrideRuntimeOperations({
  adminApiRequest,
  bootstrapApiSession,
  runBunBridgeOperation,
});

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

// The native browser output descriptor registry, the browser command output normalizer and the
// browser session teardown proofs live in one module and receive the process identity reader and
// the private process runner composed above.
const {
  closeBrowserIfPresent,
  normalizeBrowserCommandOutput,
  proveBrowserSessionAbsent,
  releaseFailureRoutesIfPresent,
  validateNativeDescriptorRegistry,
} = createBrowserOutputAuthority({ readProcIdentity, runPrivateProcess });

// The task-owned traffic delta authority and its bounded stable-poll proof receipts live in one
// module and receive the API request context registries, the bootstrap login authority, the
// bounded delay, the Bun bridge runner and the authoritative proof receipt builder composed
// above.
const { appendTaskTrafficPollProofReceipts, readStableTaskTrafficDelta } =
  createTaskTrafficAuthority({
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    authoritativeProofRuntimeReceipt,
    delayMilliseconds,
    privateApiContextRegistry,
    privateEphemeralApiContextRegistry,
    runBunBridgeOperation,
  });

// The current synthetic owner dependency edge refresh lives in one module and receives the
// intentional presentation-override absence authority and the Bun bridge operation runner
// composed above.
const { refreshCurrentSyntheticOwnerDependencyEdges } = createSyntheticOwnerDependencyRefresh({
  completeIntentionalPresentationOverrideAbsenceAuthority,
  runBunBridgeOperation,
});

// The persistent resource cleanup operation and cleanup plan stage executors live in one module
// and receive the Bun bridge operation runner, the bound resource dispatch, the runtime operation
// descriptor registry, the admin API request authority, the cleanup subject authority and the
// intentional presentation-override cleanup composed above.
const {
  executeCleanupPlanStage,
  executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
  executeResourceCleanupOperation,
} = createCleanupExecutionStages({
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  adminApiRequest,
  bootstrapApiSession,
  completeIntentionalPresentationOverrideAbsenceAuthority,
  deleteCleanupSubject,
  hashCleanupAuthoritativeBytes,
  proveCleanupSubjectAbsent,
  proveCleanupSubjectPresent,
  runBoundResourceBunOperation,
  runBunBridgeOperation,
  runPrivateCleanupAdminApiBoundary,
});

// The bootstrap restoration protocol reads the bootstrap login authority and its reconciliation,
// the Bun bridge operation runner, the bootstrap bridge output validators and the auxiliary
// operation descriptor registry composed above, so it is constructed once all of them exist.
const {
  attemptBootstrapCasBridgeOnce,
  classifyClosedBootstrapCasBridgeOutcome,
  createBootstrapRestoreReceiptOnce,
  executeBootstrapRestorationProtocol,
  restoreBootstrapLoginState,
} = createBootstrapRestorationProtocol({
  BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  reconcileBootstrapLoginAuthority,
  runBunBridgeOperation,
  validateBootstrapBaselineReadBridgeOutput,
  validateBootstrapRestoreBridgeOutput,
});

// The construction state cleanup, the private construction cleanup authority and the failure
// action diagnostic sinks read the browser teardown proofs, the API request context
// registries and the owned host stopper composed above, so they are constructed once all of
// them exist.
const { cleanupConstructionStateOnce } = createConstructionStateCleanup({
  closeBrowserIfPresent,
  disposeApiRequestContextAndProveAbsent,
  disposeOwnedApiRequestContextAndProveAbsent,
  privateApiContextRegistry,
  privateEphemeralApiContextRegistry,
  proveBrowserSessionAbsent,
  releaseFailureRoutesIfPresent,
  retainedApiLifecycleFailure,
  stopOwnedHost,
});
const {
  PRIVATE_CONSTRUCTION_AUTHORITY,
  PrivateConstructionCleanupAuthority,
  createPrivateConstructionCleanupAuthority,
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  currentPrivateRetainedFailureCauseNeverThrow,
  privateConstructionAuthorityProjection,
} = createConstructionAuthorityRuntime({
  cleanupConstructionStateOnce,
  removePrivateWorkspaceLedger,
});
const {
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateSynchronousFailureActionDiagnosticSink,
  createRealFailureActionDiagnosticSink,
  emitPrivateFailureActionDiagnosticNeverThrow,
  writePrivateFailureActionDiagnosticOnceNeverThrow,
} = createDiagnosticSinkRuntime({
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  currentPrivateRetainedFailureCauseNeverThrow,
  failureBoundary,
});

// The real capability construction lives in one module and receives the private state
// registries, the local command authority, the Bun bridge descriptor and executable authorities,
// the runtime operation handler builder, the browser invocation router and receipt compiler and
// every private failure-frame, discovery, disposal, task-traffic, restoration, baseline,
// cleanup-stage and diagnostic helper composed above.
const { createRealCapabilities } = createRealCapabilitiesFactory({
  LocalCommandAuthority,
  PRIVATE_API_REQUEST_CONTEXT,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  PRIVATE_BUN_EXECUTABLE_AUTHORITY,
  PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT,
  PRIVATE_RUNTIME,
  PendingFailureAttemptRegistry,
  RESPONSE_LOST_CREATE_DESCRIPTORS,
  appendTaskTrafficPollProofReceipts,
  armResponseLostCreateBeforeWrite,
  assertResourceBunDescriptorSetExact,
  buildBrowserInvocation,
  buildPrivateBrowserInvocationWithAuthSettlementBoundary,
  buildRuntimeOperationHandlers,
  classifyPrivateAuthSettlementFailureFrame,
  classifyPrivateDirtyNavigationFailureFrame,
  classifyPrivateToneOpenFailureFrame,
  classifyPrivateToneSelectFailureFrame,
  closeBrowserIfPresent,
  commitIntentionalPresentationOverrideActionAfterLedgerAppend,
  compileActionExecutionSpec,
  configuredSensitiveValues,
  createBootstrapRestoreReceiptOnce,
  createPrivateAuthSettlementFailure,
  createPrivateCleanupFailureDiagnostic,
  createPrivateDirtyNavigationFailure,
  createPrivateToneOpenFailure,
  createPrivateToneSelectFailure,
  discoverExactSeoEntryResources,
  discoverOneResponseLostCreate,
  discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
  disposeApiRequestContextAndProveAbsent,
  disposeOwnedApiRequestContextAndProveAbsent,
  executeCleanupPlanStage,
  finalizePrivateBrowserResultWithAuthSettlementBoundary,
  initializeBunBridgeOperationAuthority,
  normalizeBrowserCommandOutput,
  normalizePrivateBrowserOutputWithAuthSettlementBoundary,
  parsePrivateBrowserSuccessWithAuthSettlementBoundary,
  portsAreAbsent,
  privateApiContextRegistry,
  privateCleanupFailureDiagnosticNeverThrow,
  privateEphemeralApiContextRegistry,
  promoteResourceBunDescriptorsAfterLedgerAppend,
  proveBrowserSessionAbsent,
  proveFinalStorageAndDatabaseBaselines,
  proveMissingMediaDbAndStorageAbsence,
  readStableTaskTrafficDelta,
  reconcileBootstrapLoginAuthority,
  refreshCurrentSyntheticOwnerDependencyEdges,
  registerFailureDiscoveredResourceAfterLedgerAppend,
  releaseFailureRoutesIfPresent,
  resolveValidatedBunExecutable,
  resolveValidatedBundledPlaywrightRequest,
  restoreBootstrapLoginState,
  retainPrivateCleanupAggregateDiagnosticNeverThrow,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateCleanupOutcomeDiagnosticNeverThrow,
  retainedApiLifecycleFailure,
  routeReceiptMetadata,
  runObservedBootstrapLoginAttempt,
  stageIntentionalPresentationOverrideActionReceipt,
  stopOwnedHost,
  validateNativeDescriptorRegistry,
  validateStaticBunBridgeDescriptorRegistries,
});

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

const { runTask540SmokeExecutorSelfTest } = createRunTask540SmokeExecutorSelfTest({
  BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  LocalCommandAuthority,
  PRIVATE_API_REQUEST_CONTEXT,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  PRIVATE_BUN_RESOURCE_DESCRIPTORS,
  PRIVATE_CONSTRUCTION_AUTHORITY,
  PRIVATE_FAILURE_ACTION_TRACKERS,
  PRIVATE_RUNTIME,
  PROCESS_KILL_GRACE_MS,
  PROCESS_TERM_GRACE_MS,
  PendingFailureAttemptRegistry,
  RESOURCE_BUN_SOURCE_SPECS,
  RESPONSE_LOST_CREATE_ACTION_IDS,
  adminApiRequest,
  appendRetainedGroupMembers,
  assertCanonicalFinalization,
  assertFinalStorageDatabaseBaseline,
  assertPreparedBunBridgeFrameExact,
  assertResourceBunDescriptorSetExact,
  attemptBootstrapCasBridgeOnce,
  beginPrivateFailureAction,
  buildAuthRateWindowBarrierSource,
  buildBrowserInvocation,
  buildBrowserStreamIntegrity,
  buildFakeCapabilities,
  buildRuntimeOperationHandlers,
  bunBridgeDescriptorForOperation,
  captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
  classifyClosedBootstrapCasBridgeOutcome,
  commitIntentionalPresentationOverrideActionAfterLedgerAppend,
  compileActionExecutionSpec,
  completeIntentionalPresentationOverrideAbsenceAuthority,
  configuredSensitiveValues,
  createBootstrapRestoreReceiptOnce,
  createPrivateAuthSettlementFailure,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  createPrivateDirtyNavigationFailure,
  createPrivateFailureActionTracker,
  createPrivateSynchronousFailureActionDiagnosticSink,
  createPrivateToneOpenFailure,
  createPrivateToneSelectFailure,
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  currentPrivateRetainedFailureCauseNeverThrow,
  deleteCleanupSubject,
  discoverExactSeoEntryResources,
  discoverOneResponseLostCreate,
  discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
  disposeApiRequestContextAndProveAbsent,
  disposeOwnedApiRequestContextAndProveAbsent,
  dryDispatchBunBridgeDescriptor,
  emitPrivateFailureActionDiagnosticNeverThrow,
  encodeBoundedBunBridgeCanonicalFrame,
  exactPresentationOverrideIdentifier,
  executeBootstrapRestorationProtocol,
  executeCleanupPlanStage,
  executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
  executeResourceCleanupOperation,
  executeSmokePlanCore,
  executeTask540SmokePlanWithAuthorityFactory,
  failureBoundary,
  hashCleanupAuthoritativeBytes,
  initializeBootstrapLoginAuthority,
  initializeBunBridgeOperationAuthority,
  normalizeBrowserCommandOutput,
  parseMediaRaceAuthoritativeAdminEvidence,
  prepareBunBridgeDispatch,
  privateCleanupFailureDiagnosticNeverThrow,
  privateConstructionAuthorityProjection,
  promoteResourceBunDescriptorsAfterLedgerAppend,
  proveCleanupSubjectAbsent,
  proveCleanupSubjectPresent,
  rawBytesAreSensitive,
  readHostReadyLine,
  readHostReadyLineWithTimerAuthority,
  readPublicApiExactlyOnce,
  registerFailureDiscoveredResourceAfterLedgerAppend,
  responseLostCandidateFamilyForDescriptor,
  responseLostStorageRoot,
  restoreBootstrapLoginState,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  runBunBridge,
  runPrivateCleanupAdminApiBoundary,
  runRetainedProcessGroup,
  settleBootstrapLoginAttempt,
  shellDisplay,
  stageIntentionalPresentationOverrideActionReceipt,
  stageIntentionalPresentationOverrideObservation,
  validateBoundedNaturalCandidateResult,
  validateBunBridgeOperationDescriptor,
  validateBunBridgeOutput,
  validateBunExecutableAuthorityObservation,
  validateExactApiLoginResponse,
  validateResponseLostContentSchema,
  validateStaticBunBridgeDescriptorRegistries,
  writePrivateFailureActionDiagnosticOnceNeverThrow,
});

export { runTask540SmokeExecutorSelfTest };

if (
  process.argv[1]?.endsWith("/task-540-smoke-executor.mjs") &&
  process.argv.includes("--self-test")
) {
  process.stdout.write(JSON.stringify(await runTask540SmokeExecutorSelfTest()));
}
