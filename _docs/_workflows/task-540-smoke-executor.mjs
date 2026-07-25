import { constants as fsConstants } from "node:fs";
import {
  lstat,
  open,
  readFile,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
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

import { assertExecutionInput } from "./task-540-smoke/executor/execution-contract.mjs";
import { createPlanExecutionRuntime } from "./task-540-smoke/executor/plan-execution.mjs";

import {
  createFakeCapabilitiesRuntime,
  fixtureCaptureValue,
} from "./task-540-smoke/executor/fake-capabilities.mjs";
import {
  assertCanonicalMediaRaceProjection,
  assertCleanupReceiptBijection,
  validateCapabilityResult,
} from "./task-540-smoke/executor/canonical-evidence.mjs";
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
  BUN_BRIDGE_EXECUTION_AUTHORITY,
  DATABASE_OPERATION_TIMEOUT_MS,
  MAX_COMPLETE_SESSION_ROWS,
  MAX_STREAM_BYTES,
  MAX_TASK_TRAFFIC_ROWS,
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  SESSION_NAME,
  TASK_FAILURE,
  TASK_FIXTURE_ENTRY_SEMANTICS,
  seoDocumentResourceSemantic,
} from "./task-540-smoke/executor/config.mjs";
import {
  CLEANUP_OPERATION_KINDS,
  INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS,
  RESOURCE_BUN_BRIDGE_PARTICIPATION,
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
  compileBlockedParentClosure,
  createResourceCore,
  destructiveResourceEdge,
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
import {
  BRIDGE_INPUT_READER,
  bridgeInputSchemaGuard,
} from "./task-540-smoke/runtime/bun-child-protocol.mjs";
import {
  BUN_BRIDGE_ENV_PROFILES,
  createBunBridgeTransport,
} from "./task-540-smoke/runtime/bun-bridge-transport.mjs";
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
  RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
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
  bunBridgeInputSchemaId,
  validateBunBridgeInput,
} from "./task-540-smoke/executor/bridge-input-validators.mjs";
import {
  bindResponseLostQueryOperationBindings,
  responseLostCandidateFamilyForDescriptor,
  validateResponseLostContentSchema,
} from "./task-540-smoke/executor/bridge-output-validators/response-lost.mjs";
import {
  BUN_BRIDGE_OUTPUT_VALIDATORS,
  bindResourceBridgeObservationValidators,
  validateBootstrapBaselineReadBridgeOutput,
  validateBootstrapRestoreBridgeOutput,
  validateBunBridgeOutput,
} from "./task-540-smoke/executor/bridge-output-validators/resources.mjs";
import { requireBridgeUuid } from "./task-540-smoke/executor/bun-bridge-validation-primitives.mjs";
import {
  changedJsonPointers,
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
  runCode,
} from "./task-540-smoke/browser/run-code.mjs";
import {
  createBrowserInvocationRouter,
  createSharedBrowserInvocationRuntime,
} from "./task-540-smoke/browser/generic-invocations.mjs";
import {
  buildFailureCleanupRoutesSource,
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
bindResponseLostQueryOperationBindings(RESPONSE_LOST_QUERY_OPERATION_BINDINGS);
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
const PRIVATE_BUN_RESOURCE_DESCRIPTORS = new WeakMap();
const PRIVATE_BUN_OPERATION_DESCRIPTORS = new WeakMap();
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
bindResourceBridgeObservationValidators({
  validateApiSessionObservation,
  validateBootstrapLoginObservation,
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
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateConstructionCleanupAuthority,
    createRealCapabilities,
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
