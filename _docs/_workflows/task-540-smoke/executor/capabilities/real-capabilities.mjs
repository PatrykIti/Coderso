// Real capability construction for the TASK-540 smoke executor.
//
// Owns the single construction entry point that proves the repository root identity, reads the
// strict repo environment, opens the private browser workspace, resolves the bundled Playwright
// and Bun executables, builds the one capability state object with its private Bun executable,
// API request-context and runtime registries, composes the local command authority, the runtime
// operation handler registry, the output context and the fixture binding memory, and returns the
// capability surface: the core cleanup authority binding, the ledger-append resource promotions,
// the response-lost settlement, the action executor, the cleanup lifecycle and the once-only
// failure cleanup boundary.
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

import { registerSuccessfulActionResourcesAfterLedgerAppend } from "../action-resources.mjs";
import {
  assertStorageFallbackEnvironmentAbsent,
  buildExactHostEnvironment,
} from "../environment.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "../foundation.mjs";
import {
  assertNoSymlinkAncestors,
  createPrivateBrowserWorkspace,
  readStableArtifactIdentity,
  readStrictRepoEnvironment,
} from "../private-workspace.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { ResourceCleanupPlanner, ResourceLedgerBuilder } from "../resource-ledger.mjs";
import { createExecuteCleanupLifecycleCore } from "./cleanup-lifecycle.mjs";
import { createExecuteAction } from "./execute-action.mjs";

export function createRealCapabilitiesFactory(dependencies) {
  // The private state registries, the local command authority, the Bun bridge descriptor and
  // executable authorities, the runtime operation handler builder, the browser invocation router
  // and receipt compiler and every private failure-frame, discovery, disposal, task-traffic,
  // restoration, baseline, cleanup-stage and diagnostic helper belong to authorities the facade
  // composes, so they arrive as injected dependencies and this module keeps no mutable state of
  // its own.
  exactOwnKeys(
    dependencies,
    [
      "LocalCommandAuthority",
      "PRIVATE_API_REQUEST_CONTEXT",
      "PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY",
      "PRIVATE_BUN_EXECUTABLE_AUTHORITY",
      "PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT",
      "PRIVATE_RUNTIME",
      "PendingFailureAttemptRegistry",
      "RESPONSE_LOST_CREATE_DESCRIPTORS",
      "appendTaskTrafficPollProofReceipts",
      "armResponseLostCreateBeforeWrite",
      "assertResourceBunDescriptorSetExact",
      "buildBrowserInvocation",
      "buildPrivateBrowserInvocationWithAuthSettlementBoundary",
      "buildRuntimeOperationHandlers",
      "classifyPrivateAuthSettlementFailureFrame",
      "classifyPrivateDirtyNavigationFailureFrame",
      "classifyPrivateToneOpenFailureFrame",
      "classifyPrivateToneSelectFailureFrame",
      "closeBrowserIfPresent",
      "commitIntentionalPresentationOverrideActionAfterLedgerAppend",
      "compileActionExecutionSpec",
      "configuredSensitiveValues",
      "createBootstrapRestoreReceiptOnce",
      "createPrivateAuthSettlementFailure",
      "createPrivateCleanupFailureDiagnostic",
      "createPrivateDirtyNavigationFailure",
      "createPrivateToneOpenFailure",
      "createPrivateToneSelectFailure",
      "discoverExactSeoEntryResources",
      "discoverOneResponseLostCreate",
      "discoverResponseLostPersistentCreatesNeverThrowPerAttempt",
      "disposeApiRequestContextAndProveAbsent",
      "disposeOwnedApiRequestContextAndProveAbsent",
      "executeCleanupPlanStage",
      "finalizePrivateBrowserResultWithAuthSettlementBoundary",
      "initializeBunBridgeOperationAuthority",
      "normalizeBrowserCommandOutput",
      "normalizePrivateBrowserOutputWithAuthSettlementBoundary",
      "parsePrivateBrowserSuccessWithAuthSettlementBoundary",
      "portsAreAbsent",
      "privateApiContextRegistry",
      "privateCleanupFailureDiagnosticNeverThrow",
      "privateEphemeralApiContextRegistry",
      "promoteResourceBunDescriptorsAfterLedgerAppend",
      "proveBrowserSessionAbsent",
      "proveFinalStorageAndDatabaseBaselines",
      "proveMissingMediaDbAndStorageAbsence",
      "readStableTaskTrafficDelta",
      "reconcileBootstrapLoginAuthority",
      "refreshCurrentSyntheticOwnerDependencyEdges",
      "registerFailureDiscoveredResourceAfterLedgerAppend",
      "releaseFailureRoutesIfPresent",
      "resolveValidatedBunExecutable",
      "resolveValidatedBundledPlaywrightRequest",
      "restoreBootstrapLoginState",
      "retainPrivateCleanupAggregateDiagnosticNeverThrow",
      "retainPrivateCleanupFailureDiagnosticNeverThrow",
      "retainPrivateCleanupOutcomeDiagnosticNeverThrow",
      "retainedApiLifecycleFailure",
      "routeReceiptMetadata",
      "runObservedBootstrapLoginAttempt",
      "stageIntentionalPresentationOverrideActionReceipt",
      "stopOwnedHost",
      "validateNativeDescriptorRegistry",
      "validateStaticBunBridgeDescriptorRegistries",
    ],
    "real capability construction dependencies",
    { plain: true }
  );
  const {
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
  } = dependencies;
  invariant(
    [
      PRIVATE_API_REQUEST_CONTEXT,
      PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
      PRIVATE_BUN_EXECUTABLE_AUTHORITY,
      PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT,
      PRIVATE_RUNTIME,
    ].every((registry) => registry instanceof WeakMap) &&
      typeof RESPONSE_LOST_CREATE_DESCRIPTORS === "object" &&
      RESPONSE_LOST_CREATE_DESCRIPTORS !== null,
    "real capability construction authorities are absent"
  );
  invariant(
    [
      LocalCommandAuthority,
      PendingFailureAttemptRegistry,
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
    ].every((dependency) => typeof dependency === "function"),
    "real capability construction helpers are not callable"
  );

  // The construction body below is the facade's original, moved verbatim, so prettier is held off
  // and this nested copy stays byte-identical to the reviewed source.
  // prettier-ignore
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

  return Object.freeze({ createRealCapabilities });
}
