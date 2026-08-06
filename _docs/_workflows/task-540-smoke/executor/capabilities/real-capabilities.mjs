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
import { persistentBunBridgeDispatcherIsInstalled } from "../../runtime/bun-bridge-transport.mjs";
import { createExecuteCleanupLifecycleCore } from "./cleanup-lifecycle.mjs";
import { createExecuteAction, createPrepareBrowserAction } from "./execute-action.mjs";

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
    const batchingRuntime =
      persistentBunBridgeDispatcherIsInstalled()
        ? await Promise.all([
            import("../../../../../scripts/runtime-smoke/adapters/task-540/browser-segments.ts"),
            import("../../../../../scripts/runtime-smoke/adapters/task-540/browser-executor.ts"),
            import("../../../../../scripts/runtime-smoke/browser/action-frames.ts"),
            import("../../../../../scripts/runtime-smoke/repository-guard.ts"),
            import("../../../../../scripts/runtime-smoke/browser/segment-compiler.ts"),
          ])
        : null;
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
    const knownRepositoryGuard =
      batchingRuntime === null
        ? null
        : new batchingRuntime[3].RepositoryGuard(root, async () => {
            invariant(false, "known-path repository guard invoked full status authority");
          });
    const snapshotKnownRepository =
      knownRepositoryGuard === null
        ? snapshotRepository
        : async (paths = []) =>
            batchingRuntime[1].projectTask540KnownRepositorySnapshot(
              await knownRepositoryGuard.snapshotKnown(paths)
            );
    let fullRepositorySnapshot =
      batchingRuntime === null ? null : await snapshotRepository();
    let fullRepositorySnapshotCount = fullRepositorySnapshot === null ? 0 : 1;
    let finalRepositoryBoundarySealed = false;
    const terminalScenarioByActionId = new Map();
    for (const scenarioId of plan.requiredScenarios) {
      const actions = plan.actionManifest.filter((action) => action.scenario === scenarioId);
      invariant(actions.length > 0, scenarioId + " scenario action set is absent");
      terminalScenarioByActionId.set(actions.at(-1).id, scenarioId);
    }
    const screenshotPathsByScenario = new Map(
      plan.requiredScenarios.map((scenarioId) => [
        scenarioId,
        Object.values(plan.registries.screenshotPaths).filter((screenshotPath) =>
          plan.actionManifest.some(
            (action) =>
              action.scenario === scenarioId &&
              action.executable.type === "browser-screenshot" &&
              plan.registries.screenshotPaths[action.executable.screenshotId] === screenshotPath
          )
        ),
      ])
    );
    const sealFullRepositoryBoundary = async (allowedPaths) => {
      if (batchingRuntime === null) return;
      invariant(fullRepositorySnapshot !== null, "full repository baseline is absent");
      const after = await snapshotRepository();
      batchingRuntime[1].assertTask540RepositorySnapshotBoundary(
        fullRepositorySnapshot,
        after,
        allowedPaths
      );
      fullRepositorySnapshot = after;
      fullRepositorySnapshotCount += 1;
      invariant(fullRepositorySnapshotCount <= 9, "full repository snapshot budget exceeded");
    };
    const authority = new LocalCommandAuthority({
      root,
      assertSafeEvidence,
      snapshotRepository: snapshotKnownRepository,
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
    const prepareBrowserAction = createPrepareBrowserAction({
      PRIVATE_RUNTIME,
      browserWorkspace,
      buildBrowserInvocation,
      buildPrivateBrowserInvocationWithAuthSettlementBoundary,
      compileActionExecutionSpec,
      outputContext,
      plan,
      root,
      routeReceiptMetadata,
      state,
    });
    let executePreparedBrowserProgram = ({ logicalRequest }) =>
      authority.executeProgram(logicalRequest);
    let browserBatchExecutor = null;
    if (batchingRuntime !== null) {
      const [segments, executor, frames, , segmentCompiler] = batchingRuntime;
      const dispatchPlan = segments.compileTask540BrowserDispatchPlan(plan);
      const materializedAuthorities = new WeakMap();
      browserBatchExecutor = executor.createTask540BrowserExecutor({
        dispatchPlan,
        runId: "wf540-" + plan.nonce,
        manifestSha256: segments.task540ManifestSha256(plan),
        async materializeSegment(segment, current) {
          const actions = segment.actionIds.map((actionId) => {
            const action = plan.actionManifest.find((candidate) => candidate.id === actionId);
            invariant(action !== undefined, actionId + " batch action is absent");
            return action;
          });
          const materialized = Object.freeze({
            segment,
            actions: Object.freeze(
              actions.map((action) => {
                const prepared =
                  action.id === current.actionId
                    ? current.prepared
                    : prepareBrowserAction(action, current.captures);
                const args = prepared.invocation.args;
                invariant(
                  args.length === 4 &&
                    args[0] === current.logicalRequest.args[0] &&
                    args[1] === "--raw" &&
                    args[2] === "run-code" &&
                    typeof args[3] === "string" &&
                    args[3].length > 0,
                  action.id + " batch run-code invocation drift"
                );
                return Object.freeze({ actionId: action.id, source: args[3] });
              })
            ),
          });
          materializedAuthorities.set(materialized, {
            actions,
            sessionFlag: current.logicalRequest.args[0],
          });
          return materialized;
        },
        splitMaterializedSegment(materialized) {
          const authority = materializedAuthorities.get(materialized);
          invariant(authority !== undefined, "batch materialization authority is absent");
          const splitSegments = segmentCompiler.splitMaterializedSegment(
            materialized.segment,
            frames.materializedSourceBytes(materialized.segment, materialized.actions)
          );
          let offset = 0;
          const partitions = splitSegments.map((segment) => {
            const actions = materialized.actions.slice(offset, offset + segment.actionIds.length);
            const authorityActions = authority.actions.slice(
              offset,
              offset + segment.actionIds.length
            );
            offset += segment.actionIds.length;
            invariant(
              actions.length === segment.actionIds.length &&
                authorityActions.length === segment.actionIds.length &&
                actions.every(({ actionId }, index) => actionId === segment.actionIds[index]) &&
                authorityActions.every(({ id }, index) => id === segment.actionIds[index]),
              "browser batch partition authority drift"
            );
            const partition = Object.freeze({
              segment,
              actions: Object.freeze(actions),
            });
            materializedAuthorities.set(partition, {
              actions: authorityActions,
              sessionFlag: authority.sessionFlag,
            });
            return partition;
          });
          invariant(
            offset === materialized.actions.length,
            "browser batch partition cardinality drift"
          );
          return Object.freeze(partitions);
        },
        async dispatchSegment(materialized, expectation) {
          const materializedAuthority = materializedAuthorities.get(materialized);
          invariant(materializedAuthority !== undefined, "batch materialization authority is absent");
          const source = frames.buildBatchRunCodeSource({
            expectation,
            actions: materialized.actions,
          });
          const physical = await authority.executeBatchProgram({
            attributionAction: materializedAuthority.actions[0],
            actions: materializedAuthority.actions,
            args: [materializedAuthority.sessionFlag, "--raw", "run-code", source],
            cwd: browserWorkspace.cwd,
            env: browserWorkspace.environment,
          });
          invariant(physical.stderr.length === 0, "browser batch stderr is not empty");
          return Object.freeze({
            frames: frames.decodePlaywrightBatchOutput(physical.stdout, expectation),
            proof: physical.proof,
          });
        },
        async projectFrame(request, frame, proof) {
          const stdout =
            frame.status === "success"
              ? frames.logicalSuccessBytes(frame)
              : frames.logicalFailureBytes(frame);
          return authority.projectBatchActionResult({
            proof,
            request: request.logicalRequest,
            stdout,
            terminal: frame.terminal,
          });
        },
        executeStandalone(request) {
          return authority.executeProgram(request.logicalRequest);
        },
      });
      executePreparedBrowserProgram = (request) =>
        browserBatchExecutor.executePrepared(request);
    }
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
    const executeActionCore = createExecuteAction({
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
      executePreparedBrowserProgram,
      finalizePrivateBrowserResultWithAuthSettlementBoundary,
      normalizeBrowserCommandOutput,
      normalizePrivateBrowserOutputWithAuthSettlementBoundary,
      outputContext,
      parsePrivateBrowserSuccessWithAuthSettlementBoundary,
      plan,
      prepareBrowserAction,
      rememberFixtureBindings,
      root,
      routeReceiptMetadata,
      runObservedBootstrapLoginAttempt,
      runtimeHandlers,
      stageIntentionalPresentationOverrideActionReceipt,
      state,
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
      async executeAction(request) {
        const result = await executeActionCore(request);
        const scenarioId = terminalScenarioByActionId.get(request.action.id);
        if (scenarioId !== undefined) {
          await sealFullRepositoryBoundary(screenshotPathsByScenario.get(scenarioId) ?? []);
        }
        return result;
      },
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
              if (!finalRepositoryBoundarySealed) {
                await sealFullRepositoryBoundary([]);
                finalRepositoryBoundarySealed = true;
              }
              if (!selected.failure && batchingRuntime !== null) {
                invariant(
                  fullRepositorySnapshotCount === 9,
                  "successful smoke full repository snapshot count drift"
                );
                browserBatchExecutor.assertDrained();
              }
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
