import {
  lstat,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import { Script } from "node:vm";

import { buildTask540SmokePlan } from "./task-540-smoke-contract.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./task-540-smoke/executor/foundation.mjs";

import { assertExecutionInput } from "./task-540-smoke/executor/execution-contract.mjs";
import { createPlanExecutionRuntime } from "./task-540-smoke/executor/plan-execution.mjs";
import { createExecuteAction } from "./task-540-smoke/executor/capabilities/execute-action.mjs";
import { createExecuteCleanupLifecycleCore } from "./task-540-smoke/executor/capabilities/cleanup-lifecycle.mjs";

import {
  createFakeCapabilitiesRuntime,
  fixtureCaptureValue,
} from "./task-540-smoke/executor/fake-capabilities.mjs";
import {
  assertCleanupReceiptBijection,
  validateCapabilityResult,
} from "./task-540-smoke/executor/canonical-evidence.mjs";
import {
  BROWSER_FIXED_TIMEOUT_ENV,
  BROWSER_OPTIONAL_INHERITED_ENV,
  applyFixedBrowserTimeoutEnvironment,
  assertStorageFallbackEnvironmentAbsent,
  buildExactHostEnvironment,
} from "./task-540-smoke/executor/environment.mjs";
import {
  assertNoSymlinkAncestors,
  createPrivateBrowserWorkspace,
  readOwnedRegularFileNoFollow,
  readStableArtifactIdentity,
  readStrictRepoEnvironment,
  removePrivateWorkspaceLedger,
  requireMissingPath,
  sameArtifactIdentity,
} from "./task-540-smoke/executor/private-workspace.mjs";
import {
  TASK_FAILURE,
  TASK_FIXTURE_ENTRY_SEMANTICS,
  seoDocumentResourceSemantic,
} from "./task-540-smoke/executor/config.mjs";
import {
  CLEANUP_OPERATION_KINDS,
  deepEqualJson,
} from "./task-540-smoke/executor/resource-contracts.mjs";
import {
  ResourceCleanupPlanner,
  ResourceLedgerBuilder,
  createResourceCore,
  destructiveResourceEdge,
} from "./task-540-smoke/executor/resource-ledger.mjs";
import { registerSuccessfulActionResourcesAfterLedgerAppend } from "./task-540-smoke/executor/action-resources.mjs";
import { createResponseLostRegistry } from "./task-540-smoke/runtime/response-lost-registry.mjs";
import { createResponseLostBaselines } from "./task-540-smoke/runtime/response-lost-baselines.mjs";
import { createResponseLostDiscovery } from "./task-540-smoke/runtime/response-lost-discovery.mjs";
import { cleanupDiagnostics } from "./task-540-smoke/cleanup/diagnostics.mjs";
import { createConstructionAuthorityRuntime } from "./task-540-smoke/cleanup/construction-authority.mjs";
import { createFinalBaselinesRuntime } from "./task-540-smoke/cleanup/final-baselines.mjs";
import { createCleanupSubjectAuthorityRuntime } from "./task-540-smoke/cleanup/subject-authority.mjs";
import { runApiContextSelfTest } from "./task-540-smoke/executor/self-test/api-context.mjs";
import { runBootstrapRestorationSelfTest } from "./task-540-smoke/executor/self-test/bootstrap-restoration.mjs";
import { runBunBridgeContractsSelfTest } from "./task-540-smoke/executor/self-test/bun-bridge-contracts.mjs";
import { runBunResponseContractsSelfTest } from "./task-540-smoke/executor/self-test/bun-response-contracts.mjs";
import { runExpectedAuthChallengeSelfTest } from "./task-540-smoke/executor/self-test/auth-challenge.mjs";
import { runBrowserCaptureFrontierSelfTest } from "./task-540-smoke/executor/self-test/browser-capture-frontier.mjs";
import { runBrowserRunCodeSourceOwnershipSelfTest } from "./task-540-smoke/executor/self-test/browser-run-code-source-ownership.mjs";
import { runCleanupPcaAuthoritySelfTest } from "./task-540-smoke/executor/self-test/cleanup-pca-authority.mjs";
import { runCleanupStagesSelfTest } from "./task-540-smoke/executor/self-test/cleanup-stages.mjs";
import { runConstructionCleanupSelfTest } from "./task-540-smoke/executor/self-test/construction-cleanup.mjs";
import { runFailureActionClassificationSelfTest } from "./task-540-smoke/executor/self-test/failure-action-classification.mjs";
import { runFailureActionExecutionSelfTest } from "./task-540-smoke/executor/self-test/failure-action-execution.mjs";
import { runFailureActionSinksSelfTest } from "./task-540-smoke/executor/self-test/failure-action-sinks.mjs";
import { runFailureFramesSelfTest } from "./task-540-smoke/executor/self-test/failure-frames.mjs";
import { runHostReadinessPolicySelfTest } from "./task-540-smoke/executor/self-test/host-readiness-policy.mjs";
import { runMediaIsolationSelfTest } from "./task-540-smoke/executor/self-test/media-isolation.mjs";
import { runMediaUploadSelfTest } from "./task-540-smoke/executor/self-test/media-upload.mjs";
import { runNominalEvidenceSelfTest } from "./task-540-smoke/executor/self-test/nominal-evidence.mjs";
import { runParserRefNativeOutputSelfTest } from "./task-540-smoke/executor/self-test/parser-ref-native-output.mjs";
import { runResponseLostDiscoverySelfTest } from "./task-540-smoke/executor/self-test/response-lost-discovery.mjs";
import { runSeoEntryCleanupSelfTest } from "./task-540-smoke/executor/self-test/seo-entry-cleanup.mjs";
import { runSettlementDiagnosticCasesSelfTest } from "./task-540-smoke/executor/self-test/settlement-diagnostic-cases.mjs";
import { runSourceOwnershipAuthRateSelfTest } from "./task-540-smoke/executor/self-test/source-ownership-auth-rate.mjs";
import { runTerminalResourceGraphSelfTest } from "./task-540-smoke/executor/self-test/terminal-resource-graph.mjs";
import { createSettlementDiagnosticHarness } from "./task-540-smoke/executor/self-test/settlement-diagnostic-harness.mjs";
import {
  createFailureBoundaryRuntime,
  retainOrDiscardPreAuthorityCauseNeverThrow,
} from "./task-540-smoke/executor/failure-boundary.mjs";
import { createDiagnosticSinkRuntime } from "./task-540-smoke/executor/diagnostic-sink.mjs";
import { SingleAssignmentCaptureMap } from "./task-540-smoke/executor/captures.mjs";
import { createAdminApiSessionRuntime } from "./task-540-smoke/runtime/admin-api-session.mjs";
import { createBootstrapLoginRuntime } from "./task-540-smoke/runtime/bootstrap-login.mjs";
import { BRIDGE_INPUT_READER } from "./task-540-smoke/runtime/bun-child-protocol.mjs";
import { createBunBridgeTransport } from "./task-540-smoke/runtime/bun-bridge-transport.mjs";
import { createCommandAuthorityRuntime } from "./task-540-smoke/runtime/command-authority.mjs";
import {
  TASK540_MEDIA_UPLOAD_SHA256,
  TASK540_PNG_SIGNATURE_HEX,
  createMediaOperationsRuntime,
  decodeCanonicalMediaUploadFixtureExact,
} from "./task-540-smoke/runtime/media-operations.mjs";
import { createMissingMediaProofRuntime } from "./task-540-smoke/runtime/missing-media-proof.mjs";
import { createMediaStorageOwnershipRuntime } from "./task-540-smoke/runtime/media-storage-ownership.mjs";
import { createRuntimeOperationRouter } from "./task-540-smoke/runtime/operation-router.mjs";
import { createProcessRuntime } from "./task-540-smoke/runtime/process-runtime.mjs";
import { createStorageManifestRuntime } from "./task-540-smoke/runtime/storage-manifest.mjs";
import { createStoragePreflightRuntime } from "./task-540-smoke/runtime/storage-preflight.mjs";
import {
  assertPlainJsonValue,
} from "./task-540-smoke/executor/json-schema.mjs";
import {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
  assertSeoEntryDocumentExactBridgeSourcesFailClosed,
} from "./task-540-smoke/executor/bun-bridge-resource-sources.mjs";
import {
  PREFERENCE_GET_BRIDGE_SOURCE,
  PREFERENCE_SET_BRIDGE_SOURCE,
  USER_ABSENCE_BRIDGE_SOURCE,
  USER_DELETE_BRIDGE_SOURCE,
  USER_PROOF_BRIDGE_SOURCE,
  USER_PROVISION_BRIDGE_SOURCE,
} from "./task-540-smoke/executor/bridge-sources/user-preference.mjs";
import {
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
} from "./task-540-smoke/executor/bridge-sources/response-lost.mjs";
import {
  CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
  SCREEN_MATERIALIZE_BRIDGE_SOURCE,
  SECURITY_RATE_BRIDGE_SOURCE,
  SECURITY_SESSION_BRIDGE_SOURCE,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
  assertCurrentResourceOwnerBridgeFailClosedSource,
  assertSeoEntryDiscoveryBridgeFailClosedSource,
} from "./task-540-smoke/executor/bridge-sources/platform.mjs";
import {
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
} from "./task-540-smoke/executor/bridge-sources/bootstrap.mjs";
import {
  BUN_BRIDGE_INPUT_VALIDATORS,
  validateBunBridgeInput,
} from "./task-540-smoke/executor/bridge-input-validators.mjs";
import { createBunBridgeDescriptors } from "./task-540-smoke/executor/bridge-descriptors.mjs";
import {
  PRIVATE_BUN_OPERATION_DESCRIPTORS,
  createResourceBunOperationAuthority,
} from "./task-540-smoke/executor/resource-bun-authority.mjs";
import { createResponseLostBridgeOutputValidators } from "./task-540-smoke/executor/bridge-output-validators/response-lost.mjs";
import { createResourceBridgeOutputValidators } from "./task-540-smoke/executor/bridge-output-validators/resources.mjs";
import { requireBridgeUuid } from "./task-540-smoke/executor/bun-bridge-validation-primitives.mjs";
import {
  assertRecordIdentity,
  contentSchemaFromFields,
  createPlatformRuntimeOperations,
  createScreenMaterialization,
  normalizeAuthRatePolicy,
  readExactEntryAuthorId,
  runtimeSafeProjection,
} from "./task-540-smoke/executor/runtime-operations/platform.mjs";
import { createOverrideRuntimeOperations } from "./task-540-smoke/executor/runtime-operations/overrides.mjs";
import {
  resolveFixtureValue,
} from "./task-540-smoke/executor/ref-dsl.mjs";
import { decodeExactNativeUtf8 } from "./task-540-smoke/executor/output-parser.mjs";
import {
  createBrowserOutputAuthority,
  privateNativeSnapshotSizeIsValid,
  removeAcquiredScreenshots,
} from "./task-540-smoke/executor/browser-output-authority.mjs";
import {
  createTaskTrafficAuthority,
  taskUserAgents,
} from "./task-540-smoke/executor/task-traffic.mjs";
import {
  authoritativeProofRuntimeReceipt,
  cleanupRuntimeReceipt,
  createCleanupExecutionStages,
  createCleanupPhaseScheduler,
  finalRecordByKey,
  runIndependentCleanupStepsNeverSkip,
} from "./task-540-smoke/executor/cleanup-execution.mjs";
import {
  BOOTSTRAP_RESTORE_PROOF_KEYS,
  classifyBootstrapCasBridgeFailure,
  createBootstrapRestorationProtocol,
} from "./task-540-smoke/executor/bootstrap-restoration-protocol.mjs";
import {
  assertExactFinalResourceDependencyGraph,
  createSyntheticOwnerDependencyRefresh,
} from "./task-540-smoke/executor/terminal-resource-graph.mjs";
import {
  cleanupPlanView,
} from "./task-540-smoke/executor/finalization.mjs";
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
const { buildFakeCapabilities } = createFakeCapabilitiesRuntime({
  RESPONSE_LOST_CREATE_DESCRIPTORS,
  compileActionExecutionSpec,
  discoverExactSeoEntryResources,
  finalRecordByKey,
  initializeBunBridgeOperationAuthority,
  routeReceiptMetadata,
});
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

// The resource Bun descriptor promotion, the descriptor/ledger exactness proofs, the bound
// resource dispatch and the static registry validation live in one module and receive the
// descriptor registries, the descriptor constructors and the operation runner composed here.
const {
  assertResourceBunDescriptorSetExact,
  bunBridgeDescriptorForOperation,
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

// The current synthetic owner dependency edge refresh lives in one module and receives the
// intentional presentation-override absence authority and the Bun bridge operation runner
// composed above.
const { refreshCurrentSyntheticOwnerDependencyEdges } = createSyntheticOwnerDependencyRefresh({
  completeIntentionalPresentationOverrideAbsenceAuthority,
  runBunBridgeOperation,
});

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

// The persistent resource cleanup operation and cleanup plan stage executors live in one module
// and receive the Bun bridge operation runner, the bound resource dispatch, the runtime operation
// descriptor registry, the admin API request authority, the cleanup subject authority and the
// intentional presentation-override cleanup composed above.
const { executeCleanupPlanStage, executeResourceCleanupOperation } = createCleanupExecutionStages({
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  adminApiRequest,
  bootstrapApiSession,
  completeIntentionalPresentationOverrideAbsenceAuthority,
  deleteCleanupSubject,
  executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
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
  // The ten-phase deterministic cleanup lifecycle lives in one capability module and receives
  // the capability state, the manifest plan, the private browser workspace, the bootstrap login
  // authority and every private discovery, disposal, task-traffic, restoration, baseline and
  // host shutdown helper composed above.
  const { executeCleanupLifecycleCore } = createExecuteCleanupLifecycleCore({
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    appendTaskTrafficPollProofReceipts,
    assertResourceBunDescriptorSetExact,
    browserWorkspace,
    closeBrowserIfPresent,
    createBootstrapRestoreReceiptOnce,
    discoverExactSeoEntryResources,
    discoverOneResponseLostCreate,
    discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
    disposeApiRequestContextAndProveAbsent,
    disposeOwnedApiRequestContextAndProveAbsent,
    executeCleanupPlanStage,
    plan,
    portsAreAbsent,
    privateApiContextRegistry,
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
    restoreBootstrapLoginState,
    retainPrivateCleanupAggregateDiagnosticNeverThrow,
    retainPrivateCleanupFailureDiagnosticNeverThrow,
    retainedApiLifecycleFailure,
    state,
    stopOwnedHost,
  });
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
    executeAction: createExecuteAction({
      PRIVATE_RUNTIME,
      armResponseLostCreateBeforeWrite,
      assertSafeEvidence,
      authority,
      browserWorkspace,
      buildBrowserInvocation,
      buildPrivateBrowserInvocationWithAuthSettlementBoundary,
      classifyPrivateAuthSettlementFailureFrame,
      classifyPrivateDirtyNavigationFailureFrame,
      classifyPrivateToneOpenFailureFrame,
      classifyPrivateToneSelectFailureFrame,
      compileActionExecutionSpec,
      createPrivateAuthSettlementFailure,
      createPrivateDirtyNavigationFailure,
      createPrivateToneOpenFailure,
      createPrivateToneSelectFailure,
      finalizePrivateBrowserResultWithAuthSettlementBoundary,
      normalizeBrowserCommandOutput,
      normalizePrivateBrowserOutputWithAuthSettlementBoundary,
      outputContext,
      parsePrivateBrowserSuccessWithAuthSettlementBoundary,
      plan,
      rememberFixtureBindings,
      root,
      routeReceiptMetadata,
      runObservedBootstrapLoginAttempt,
      runtimeHandlers,
      stageIntentionalPresentationOverrideActionReceipt,
      state,
    }),
    executeCleanupLifecycleCore,
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

  const browserSourceContext = await runBrowserRunCodeSourceOwnershipSelfTest({
    assertNegative,
    buildBrowserInvocation,
    compileActionExecutionSpec,
    expectAsyncFailure,
    plan,
    sourceCaptures,
  });
  const {
    sourceContext,
    authArmSourceActionIds,
    authCloseSourceActionIds,
    authRateBarrierSourceActionIds,
    blockBaselineSourceActionIds,
    mediaIsolationSourceActionIds,
    recordEntryMenuSourceActionIds,
    recordsWorkspaceSourceActionIds,
    authSettlementCompiledSources,
    previewRuntimeActionSelectors,
    observedPreviewRuntimeActionIds,
    assertSourceMutantsRejected,
  } = browserSourceContext;
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
  const settlementDiagnosticHarness = createSettlementDiagnosticHarness({
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
  const settlementDiagnosticCasesResult = await runSettlementDiagnosticCasesSelfTest({
    LocalCommandAuthority,
    assertNegative,
    buildBrowserStreamIntegrity,
    compileActionExecutionSpec,
    executionFixtures: failureActionExecutionResult,
    expectAsyncFailure,
    failureBoundary,
    failureFrameFixtures: failureFramesResult,
    normalizeBrowserCommandOutput,
    plan,
    selfTestContext,
    settlementDiagnosticHarness,
    shellDisplay,
  });
  negativeCases += settlementDiagnosticCasesResult.explicitNegativeCases;
  await runSourceOwnershipAuthRateSelfTest({
    authArmSourceActionIds,
    authCloseSourceActionIds,
    authRateBarrierSourceActionIds,
    blockBaselineSourceActionIds,
    buildAuthRateWindowBarrierSource,
    buildBrowserInvocation,
    compileActionExecutionSpec,
    disabledAuthRatePolicy,
    enabledAuthRatePolicy,
    expectAsyncFailure,
    mediaIsolationSourceActionIds,
    observedPreviewRuntimeActionIds,
    plan,
    previewRuntimeActionSelectors,
    recordEntryMenuSourceActionIds,
    recordsWorkspaceSourceActionIds,
    sourceCaptures,
    sourceContext,
  });
  const { successCapabilities, evidence } = await runNominalEvidenceSelfTest({
    adminApiRequest,
    API_SESSION_OBSERVATION_BRIDGE_SOURCE,
    assertCanonicalFinalization,
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
    buildFakeCapabilities,
    BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
    captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
    disposeOwnedApiRequestContextAndProveAbsent,
    executeSmokePlanCore,
    expectAsyncFailure,
    fixtureCaptureValue,
    parseMediaRaceAuthoritativeAdminEvidence,
    plan,
    readPublicApiExactlyOnce,
    RESPONSE_LOST_CREATE_ACTION_IDS,
    RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
    RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
    sourceCaptures,
    USER_PROVISION_BRIDGE_SOURCE,
    validateBoundedNaturalCandidateResult,
  });

  await runApiContextSelfTest({
    PRIVATE_API_REQUEST_CONTEXT,
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    disposeApiRequestContextAndProveAbsent,
    expectAsyncFailure,
    settleBootstrapLoginAttempt,
    validateExactApiLoginResponse,
  });

  await runBootstrapRestorationSelfTest({
    assertNegative,
    assertSourceMutantsRejected,
    attemptBootstrapCasBridgeOnce,
    BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
    BOOTSTRAP_RESTORE_PROOF_KEYS,
    classifyBootstrapCasBridgeFailure,
    classifyClosedBootstrapCasBridgeOutcome,
    createBootstrapRestoreReceiptOnce,
    executeBootstrapRestorationProtocol,
    expectAsyncFailure,
    initializeBootstrapLoginAuthority,
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    privateCleanupFailureDiagnosticNeverThrow,
    restoreBootstrapLoginState,
    runBunBridge,
    runRetainedProcessGroup,
    selfTestBunBridgeInputForSchema,
    settleBootstrapLoginAttempt,
  });

  const { apiSessionUserId } = await runBunBridgeContractsSelfTest({
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_INPUT_VALIDATORS,
    BUN_BRIDGE_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    PRIVATE_BUN_RESOURCE_DESCRIPTORS,
    RESOURCE_BUN_SOURCE_SPECS,
    assertFinalStorageDatabaseBaseline,
    assertPreparedBunBridgeFrameExact,
    assertResourceBunDescriptorSetExact,
    dryDispatchBunBridgeDescriptor,
    encodeBoundedBunBridgeCanonicalFrame,
    expectAsyncFailure,
    initializeBunBridgeOperationAuthority,
    prepareBunBridgeDispatch,
    promoteResourceBunDescriptorsAfterLedgerAppend,
    responseLostStorageRoot,
    selfTestBunBridgeInputForSchema,
    selfTestExactBunChildInputSource,
    validateBunBridgeInput,
    validateBunBridgeOperationDescriptor,
    validateBunBridgeOutput,
    validateStaticBunBridgeDescriptorRegistries,
  });
  await runBunResponseContractsSelfTest({
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    MEDIA_EXACT_BRIDGE_SOURCES,
    PRIVATE_BUN_OPERATION_DESCRIPTORS,
    PRIVATE_BUN_RESOURCE_DESCRIPTORS,
    STORAGE_PREFLIGHT_BRIDGE_SOURCE,
    USER_PROVISION_BRIDGE_SOURCE,
    apiSessionUserId,
    assertResourceBunDescriptorSetExact,
    bunBridgeDescriptorForOperation,
    contentSchemaFromFields,
    expectAsyncFailure,
    initializeBunBridgeOperationAuthority,
    plan,
    promoteResourceBunDescriptorsAfterLedgerAppend,
    responseLostCandidateFamilyForDescriptor,
    selfTestBunBridgeInputForSchema,
    selfTestExactBunChildInputSource,
    validateBunBridgeInput,
    validateBunBridgeOutput,
    validateResponseLostContentSchema,
  });

  const responseLostDiscoveryResult = await runResponseLostDiscoverySelfTest({
    PendingFailureAttemptRegistry,
    RESPONSE_LOST_CREATE_ACTION_IDS,
    contentSchemaFromFields,
    discoverOneResponseLostCreate,
    discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
    evidence,
    expectAsyncFailure,
    plan,
    rawBytesAreSensitive,
    registerFailureDiscoveredResourceAfterLedgerAppend,
  });
  negativeCases += responseLostDiscoveryResult.explicitNegativeCases;

  const {
    exactGraph,
    exactGraphRecords,
    graphAccessCore,
    graphIndependentCore,
    graphSessionCore,
    graphUserCore,
    terminalCapabilities,
    terminalEvidence,
    terminalFinalPlan,
  } = await runTerminalResourceGraphSelfTest({
    assertExactFinalResourceDependencyGraph,
    buildFakeCapabilities,
    executeSmokePlanCore,
    expectAsyncFailure,
    plan,
  });

  const cleanupPcaAuthorityResult = await runCleanupPcaAuthoritySelfTest({
    CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
    PRIVATE_API_REQUEST_CONTEXT,
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    PRIVATE_RUNTIME,
    SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
    assertCleanupReceiptBijection,
    assertCurrentResourceOwnerBridgeFailClosedSource,
    assertNegative,
    assertSeoEntryDiscoveryBridgeFailClosedSource,
    cleanupRuntimeReceipt,
    commitIntentionalPresentationOverrideActionAfterLedgerAppend,
    completeIntentionalPresentationOverrideAbsenceAuthority,
    deleteCleanupSubject,
    exactPresentationOverrideIdentifier,
    executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
    executeResourceCleanupOperation,
    expectAsyncFailure,
    hashCleanupAuthoritativeBytes,
    plan,
    proveCleanupSubjectAbsent,
    proveCleanupSubjectPresent,
    sourceCaptures,
    stageIntentionalPresentationOverrideActionReceipt,
    stageIntentionalPresentationOverrideObservation,
    successCapabilities,
  });
  negativeCases += cleanupPcaAuthorityResult.explicitNegativeCases;

  const seoEntryCleanupResult = await runSeoEntryCleanupSelfTest({
    BUN_BRIDGE_OPERATION_DESCRIPTORS,
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
    assertSeoEntryDocumentExactBridgeSourcesFailClosed,
    cleanupPlanView,
    discoverExactSeoEntryResources,
    executeCleanupPlanStage,
    expectAsyncFailure,
    initializeBunBridgeOperationAuthority,
    plan,
    validateBunBridgeInput,
  });
  negativeCases += seoEntryCleanupResult.explicitNegativeCases;

  const cleanupStagesResult = await runCleanupStagesSelfTest({
    assertCleanupReceiptBijection,
    assertNegative,
    assertSourceMutantsRejected,
    createCleanupPhaseScheduler,
    createExecuteCleanupLifecycleCore,
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    emitPrivateFailureActionDiagnosticNeverThrow,
    exactGraph,
    exactGraphRecords,
    executeCleanupPlanStage,
    expectAsyncFailure,
    graphAccessCore,
    graphIndependentCore,
    graphSessionCore,
    graphUserCore,
    runIndependentCleanupStepsNeverSkip,
    runPrivateCleanupAdminApiBoundary,
    terminalCapabilities,
    terminalEvidence,
    terminalFinalPlan,
  });
  negativeCases += cleanupStagesResult.explicitNegativeCases;

  const parserRefNativeOutputResult = await runParserRefNativeOutputSelfTest({
    assertExecutionInput,
    assertNegative,
    buildFakeCapabilities,
    executeSmokePlanCore,
    expectAsyncFailure,
    plan,
    privateNativeSnapshotSizeIsValid,
    readExactEntryAuthorId,
    selfTestContext,
    selfTestJsonTransport,
    selfTestNativeTransport,
    selfTestNumberSchema,
    selfTestStringSchema,
  });
  negativeCases += parserRefNativeOutputResult.explicitNegativeCases;
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
