// Capability cleanup lifecycle for the TASK-540 smoke executor.
//
// Owns the single capability method that runs the ten deterministic cleanup phases: browser and
// private-root release with its outside-repository ownership proof, screenshot disposition,
// response-lost plus SEO-entry and synthetic-owner resource discovery with the persistent stage
// cleanup, API request-context disposal proofs, the terminal task-traffic delta with terminal and
// final plan compilation, the terminal and user cleanup stages, bootstrap login restoration, the
// final storage/database/screenshot baselines and the owned-host shutdown pid/port absence proofs.
import path from "node:path";

import { removeAcquiredScreenshots } from "../browser-output-authority.mjs";
import { assertCanonicalMediaRaceProjection } from "../canonical-evidence.mjs";
import {
  authoritativeProofRuntimeReceipt,
  cleanupRuntimeReceipt,
  createCleanupPhaseScheduler,
  runIndependentCleanupStepsNeverSkip,
} from "../cleanup-execution.mjs";
import { TASK_FIXTURE_ENTRY_SEMANTICS } from "../config.mjs";
import {
  buildCanonicalFinalization,
  cleanupPlanView,
  validateSuccessfulScreenshotSet,
} from "../finalization.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import {
  readStableArtifactIdentity,
  removePrivateWorkspaceLedger,
  requireMissingPath,
} from "../private-workspace.mjs";
import {
  RESOURCE_KIND_CONTRACTS,
  TERMINAL_RESOURCE_KINDS,
  deepEqualJson,
} from "../resource-contracts.mjs";
import {
  ResourceCleanupPlanner,
  ResourceLedgerBuilder,
  compileBlockedParentClosure,
} from "../resource-ledger.mjs";
import {
  assertExactFinalResourceDependencyGraph,
  registerTerminalResourcesAfterLedgerAppend,
  terminalResourceDelta,
} from "../terminal-resource-graph.mjs";

export function createExecuteCleanupLifecycleCore(dependencies) {
  // The capability state, the manifest plan, the private browser workspace, the bootstrap login
  // authority and every private discovery, disposal, task-traffic, restoration, baseline and host
  // shutdown helper belong to authorities the facade composes, so they arrive as injected
  // dependencies and this module keeps no mutable state of its own.
  exactOwnKeys(
    dependencies,
    [
      "PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY",
      "appendTaskTrafficPollProofReceipts",
      "assertResourceBunDescriptorSetExact",
      "browserWorkspace",
      "closeBrowserIfPresent",
      "createBootstrapRestoreReceiptOnce",
      "discoverExactSeoEntryResources",
      "discoverOneResponseLostCreate",
      "discoverResponseLostPersistentCreatesNeverThrowPerAttempt",
      "disposeApiRequestContextAndProveAbsent",
      "disposeOwnedApiRequestContextAndProveAbsent",
      "executeCleanupPlanStage",
      "plan",
      "portsAreAbsent",
      "privateApiContextRegistry",
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
      "restoreBootstrapLoginState",
      "retainPrivateCleanupAggregateDiagnosticNeverThrow",
      "retainPrivateCleanupFailureDiagnosticNeverThrow",
      "retainedApiLifecycleFailure",
      "state",
      "stopOwnedHost",
    ],
    "capability cleanup lifecycle dependencies",
    { plain: true }
  );
  const {
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
  } = dependencies;
  invariant(
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY instanceof WeakMap &&
      [state, plan, browserWorkspace].every(
        (value) => typeof value === "object" && value !== null
      ),
    "capability cleanup lifecycle authorities are absent"
  );
  invariant(
    [
      appendTaskTrafficPollProofReceipts,
      assertResourceBunDescriptorSetExact,
      closeBrowserIfPresent,
      createBootstrapRestoreReceiptOnce,
      discoverExactSeoEntryResources,
      discoverOneResponseLostCreate,
      discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
      disposeApiRequestContextAndProveAbsent,
      disposeOwnedApiRequestContextAndProveAbsent,
      executeCleanupPlanStage,
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
      stopOwnedHost,
    ].every((dependency) => typeof dependency === "function"),
    "capability cleanup lifecycle helpers are not callable"
  );

  return Object.freeze({
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
  });
}
