// Composition entry for the TASK-540 smoke executor self-test.
//
// Owns the single self-test entry point that builds the canonical plan once, threads the shared
// negative-case counter and the shared fail-closed helpers through every focused self-test
// module in its fixed order, and returns the frozen self-test receipt. Every private registry,
// authority, bridge dispatcher, capability builder, cleanup helper and diagnostic sink the
// entry exercises belongs to an authority the facade composes, so they arrive as injected
// dependencies and this module keeps no mutable state of its own.
import {
  BOOTSTRAP_RESTORE_PROOF_KEYS,
  classifyBootstrapCasBridgeFailure,
} from "../bootstrap-restoration-protocol.mjs";
import {
  BUN_BRIDGE_INPUT_VALIDATORS,
  validateBunBridgeInput,
} from "../bridge-input-validators.mjs";
import {
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  bootstrapCasPredicates,
} from "../bridge-sources/bootstrap.mjs";
import {
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
  assertCurrentResourceOwnerBridgeFailClosedSource,
  assertSeoEntryDiscoveryBridgeFailClosedSource,
} from "../bridge-sources/platform.mjs";
import {
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
} from "../bridge-sources/response-lost.mjs";
import { USER_PROVISION_BRIDGE_SOURCE } from "../bridge-sources/user-preference.mjs";
import { privateNativeSnapshotSizeIsValid } from "../browser-output-authority.mjs";
import {
  MEDIA_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  assertSeoEntryDocumentExactBridgeSourcesFailClosed,
} from "../bun-bridge-resource-sources.mjs";
import { assertCleanupReceiptBijection } from "../canonical-evidence.mjs";
import { createExecuteCleanupLifecycleCore } from "../capabilities/cleanup-lifecycle.mjs";
import {
  cleanupRuntimeReceipt,
  createCleanupPhaseScheduler,
  runIndependentCleanupStepsNeverSkip,
} from "../cleanup-execution.mjs";
import {
  BROWSER_FIXED_TIMEOUT_ENV,
  BROWSER_OPTIONAL_INHERITED_ENV,
  applyFixedBrowserTimeoutEnvironment,
} from "../environment.mjs";
import { assertExecutionInput } from "../execution-contract.mjs";
import { fixtureCaptureValue } from "../fake-capabilities.mjs";
import { cleanupPlanView } from "../finalization.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "../foundation.mjs";
import { PRIVATE_BUN_OPERATION_DESCRIPTORS } from "../resource-bun-authority.mjs";
import {
  contentSchemaFromFields,
  normalizeAuthRatePolicy,
  readExactEntryAuthorId,
} from "../runtime-operations/platform.mjs";
import { assertExactFinalResourceDependencyGraph } from "../terminal-resource-graph.mjs";
import {
  TASK540_MEDIA_UPLOAD_SHA256,
  TASK540_PNG_SIGNATURE_HEX,
  decodeCanonicalMediaUploadFixtureExact,
} from "../../runtime/media-operations.mjs";
import { buildTask540SmokePlan } from "../../../task-540-smoke-contract.mjs";
import { runApiContextSelfTest } from "./api-context.mjs";
import { runExpectedAuthChallengeSelfTest } from "./auth-challenge.mjs";
import { runBootstrapCasBindFormsSelfTest } from "./bootstrap-cas-bind-forms.mjs";
import { runBootstrapRestorationSelfTest } from "./bootstrap-restoration.mjs";
import { runBrowserCaptureFrontierSelfTest } from "./browser-capture-frontier.mjs";
import { runBrowserNavigationDiscardSourceSelfTest } from "./browser-navigation-discard-source.mjs";
import { runBrowserRouteDuplicatePolicySelfTest } from "./browser-route-duplicate-policy.mjs";
import { runBrowserRunCodeSourceOwnershipSelfTest } from "./browser-run-code-source-ownership.mjs";
import { runBunBridgeContractsSelfTest } from "./bun-bridge-contracts.mjs";
import { runBunResponseContractsSelfTest } from "./bun-response-contracts.mjs";
import { runCleanupPcaAuthoritySelfTest } from "./cleanup-pca-authority.mjs";
import { runCleanupStagesSelfTest } from "./cleanup-stages.mjs";
import { runConstructionCleanupSelfTest } from "./construction-cleanup.mjs";
import {
  expectUncountedAsyncFailure,
  selfTestBunBridgeInputForSchema,
  selfTestContext,
  selfTestExactBunChildInputSource,
  selfTestJsonTransport,
  selfTestNativeTransport,
  selfTestNumberSchema,
  selfTestStringSchema,
} from "./entry-support.mjs";
import { runFailureActionClassificationSelfTest } from "./failure-action-classification.mjs";
import { runFailureActionExecutionSelfTest } from "./failure-action-execution.mjs";
import { runFailureActionSinksSelfTest } from "./failure-action-sinks.mjs";
import { runFailureFramesSelfTest } from "./failure-frames.mjs";
import { runFailureReasonProjectionSelfTest } from "./failure-reason-projection.mjs";
import { runHostReadinessPolicySelfTest } from "./host-readiness-policy.mjs";
import { runMediaIsolationSelfTest } from "./media-isolation.mjs";
import { runMediaUploadSelfTest } from "./media-upload.mjs";
import { runNominalEvidenceSelfTest } from "./nominal-evidence.mjs";
import { runParserRefNativeOutputSelfTest } from "./parser-ref-native-output.mjs";
import { runResponseLostDiscoverySelfTest } from "./response-lost-discovery.mjs";
import { runSeoEntryCleanupSelfTest } from "./seo-entry-cleanup.mjs";
import { runSettlementDiagnosticCasesSelfTest } from "./settlement-diagnostic-cases.mjs";
import { createSettlementDiagnosticHarness } from "./settlement-diagnostic-harness.mjs";
import { runSourceOwnershipAuthRateSelfTest } from "./source-ownership-auth-rate.mjs";
import { runTerminalResourceGraphSelfTest } from "./terminal-resource-graph.mjs";

export function createRunTask540SmokeExecutorSelfTest(dependencies) {
  exactOwnKeys(
    dependencies,
    [
      "BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS",
      "LocalCommandAuthority",
      "PRIVATE_API_REQUEST_CONTEXT",
      "PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY",
      "PRIVATE_BUN_RESOURCE_DESCRIPTORS",
      "PRIVATE_CONSTRUCTION_AUTHORITY",
      "PRIVATE_FAILURE_ACTION_TRACKERS",
      "PRIVATE_RUNTIME",
      "PROCESS_KILL_GRACE_MS",
      "PROCESS_TERM_GRACE_MS",
      "PendingFailureAttemptRegistry",
      "RESOURCE_BUN_SOURCE_SPECS",
      "RESPONSE_LOST_CREATE_ACTION_IDS",
      "adminApiRequest",
      "appendRetainedGroupMembers",
      "assertCanonicalFinalization",
      "assertFinalStorageDatabaseBaseline",
      "assertPreparedBunBridgeFrameExact",
      "assertResourceBunDescriptorSetExact",
      "attemptBootstrapCasBridgeOnce",
      "beginPrivateFailureAction",
      "buildAuthRateWindowBarrierSource",
      "buildBrowserInvocation",
      "buildBrowserStreamIntegrity",
      "buildFakeCapabilities",
      "buildRuntimeOperationHandlers",
      "bunBridgeDescriptorForOperation",
      "captureAllResponseLostNaturalBaselinesBeforeFirstWrite",
      "classifyClosedBootstrapCasBridgeOutcome",
      "commitIntentionalPresentationOverrideActionAfterLedgerAppend",
      "compileActionExecutionSpec",
      "completeIntentionalPresentationOverrideAbsenceAuthority",
      "configuredSensitiveValues",
      "createBootstrapRestoreReceiptOnce",
      "createPrivateAuthSettlementFailure",
      "createPrivateBoundedFailureActionDiagnosticSink",
      "createPrivateConstructionCleanupAuthority",
      "createPrivateDirtyNavigationFailure",
      "createPrivateFailureActionTracker",
      "createPrivateSynchronousFailureActionDiagnosticSink",
      "createPrivateToneOpenFailure",
      "createPrivateToneSelectFailure",
      "currentPrivateConstructionCleanupDiagnosticNeverThrow",
      "currentPrivateRetainedFailureCauseNeverThrow",
      "deleteCleanupSubject",
      "discoverExactSeoEntryResources",
      "discoverOneResponseLostCreate",
      "discoverResponseLostPersistentCreatesNeverThrowPerAttempt",
      "disposeApiRequestContextAndProveAbsent",
      "disposeOwnedApiRequestContextAndProveAbsent",
      "dryDispatchBunBridgeDescriptor",
      "emitPrivateFailureActionDiagnosticNeverThrow",
      "encodeBoundedBunBridgeCanonicalFrame",
      "exactPresentationOverrideIdentifier",
      "executeBootstrapRestorationProtocol",
      "executeCleanupPlanStage",
      "executeIntentionalPresentationOverrideAlreadyAbsentCleanup",
      "executeResourceCleanupOperation",
      "executeSmokePlanCore",
      "executeTask540SmokePlanWithAuthorityFactory",
      "failureBoundary",
      "hashCleanupAuthoritativeBytes",
      "initializeBootstrapLoginAuthority",
      "initializeBunBridgeOperationAuthority",
      "normalizeBrowserCommandOutput",
      "parseMediaRaceAuthoritativeAdminEvidence",
      "prepareBunBridgeDispatch",
      "privateCleanupFailureDiagnosticNeverThrow",
      "privateConstructionAuthorityProjection",
      "promoteResourceBunDescriptorsAfterLedgerAppend",
      "proveCleanupSubjectAbsent",
      "proveCleanupSubjectPresent",
      "rawBytesAreSensitive",
      "readHostReadyLine",
      "readHostReadyLineWithTimerAuthority",
      "readPublicApiExactlyOnce",
      "registerFailureDiscoveredResourceAfterLedgerAppend",
      "responseLostCandidateFamilyForDescriptor",
      "responseLostStorageRoot",
      "restoreBootstrapLoginState",
      "retainPrivateCleanupFailureDiagnosticNeverThrow",
      "retainPrivateDirtyNavigationFailureClassNeverThrow",
      "runBunBridge",
      "runPrivateCleanupAdminApiBoundary",
      "runRetainedProcessGroup",
      "settleBootstrapLoginAttempt",
      "shellDisplay",
      "stageIntentionalPresentationOverrideActionReceipt",
      "stageIntentionalPresentationOverrideObservation",
      "validateBoundedNaturalCandidateResult",
      "validateBunBridgeOperationDescriptor",
      "validateBunBridgeOutput",
      "validateBunExecutableAuthorityObservation",
      "validateExactApiLoginResponse",
      "validateResponseLostContentSchema",
      "validateStaticBunBridgeDescriptorRegistries",
      "writePrivateFailureActionDiagnosticOnceNeverThrow",
    ],
    "TASK-540 smoke executor self-test entry dependencies",
    { plain: true }
  );
  const {
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
  } = dependencies;
  invariant(
    [
      PRIVATE_API_REQUEST_CONTEXT,
      PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
      PRIVATE_BUN_RESOURCE_DESCRIPTORS,
      PRIVATE_CONSTRUCTION_AUTHORITY,
      PRIVATE_FAILURE_ACTION_TRACKERS,
      PRIVATE_RUNTIME,
    ].every((registry) => registry instanceof WeakMap),
    "self-test entry private registries are absent"
  );
  invariant(
    typeof LocalCommandAuthority === "function" &&
      typeof PendingFailureAttemptRegistry === "function" &&
      Number.isInteger(PROCESS_KILL_GRACE_MS) &&
      Number.isInteger(PROCESS_TERM_GRACE_MS),
    "self-test entry authority classes or process grace budgets are invalid"
  );
  invariant(
    [
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
      BUN_BRIDGE_OPERATION_DESCRIPTORS,
      BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
      BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
      RESOURCE_BUN_SOURCE_SPECS,
      RESPONSE_LOST_CREATE_ACTION_IDS,
    ].every((registry) => typeof registry === "object" && registry !== null),
    "self-test entry descriptor registries are absent"
  );
  async function runTask540SmokeExecutorSelfTest() {
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
      diagnosticInput,
      diagnosticPrivateMarker,
      dirtyNavigationFailureAction,
      dirtyNavigationPrivateMarker,
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

    // Counts through the shared assertNegative, so it must NOT be wrapped in `negativeCases +=`:
    // a compound assignment reads the counter before evaluating the call and would discard every
    // increment the call makes.
    runFailureReasonProjectionSelfTest({
      PRIVATE_CONSTRUCTION_AUTHORITY,
      assertNegative,
      createPrivateBoundedFailureActionDiagnosticSink,
      createPrivateConstructionCleanupAuthority,
      currentPrivateRetainedFailureCauseNeverThrow,
      emitPrivateFailureActionDiagnosticNeverThrow,
      plan,
      trackerAtAction,
    });

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
      PendingFailureAttemptRegistry,
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

    // Counts through the shared assertNegative, so it must NOT be wrapped in `negativeCases +=`.
    await runBrowserRouteDuplicatePolicySelfTest({ assertNegative, plan, sourceCaptures });

    // Counts through the shared assertNegative, so it must NOT be wrapped in `negativeCases +=`.
    await runBrowserNavigationDiscardSourceSelfTest({
      assertNegative,
      buildBrowserInvocation,
      compileActionExecutionSpec,
      plan,
      sourceCaptures,
    });

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
    const { bootstrapSettlementAction } = failureFramesResult;
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

    // Runs before the restoration protocol self-test because it establishes the more primitive
    // fact: the CAS statement the protocol depends on can be dispatched at all. Counts through the
    // shared assertNegative, so it must NOT be wrapped in `negativeCases +=`.
    runBootstrapCasBindFormsSelfTest({
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
      assertNegative,
      bootstrapCasPredicates,
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
      assertNegative,
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
      plan,
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

  return Object.freeze({ runTask540SmokeExecutorSelfTest });
}
