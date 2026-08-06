import {
  acquiredSubjects,
  assertCanonicalFinalization as assertCanonicalFinalizationCore,
  assertCanonicalMediaRaceProjection,
  assertCanonicalMediaRuntimeReceipts,
  assertCanonicalPrimaryRuntimeInventory,
  assertCleanupReceiptBijection,
  buildCanonicalRouteEvidence,
  buildCanonicalScenarioEvidence,
  validateCapabilityResult,
} from "./canonical-evidence.mjs";
import { SingleAssignmentCaptureMap } from "./captures.mjs";
import { TASK_FAILURE } from "./config.mjs";
import { assertRegisteredExecutable } from "./execution-contract.mjs";
import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";
import { ResourceCleanupPlanner, ResourceLedgerBuilder } from "./resource-ledger.mjs";

export function createPlanExecutionRuntime({
  SMOKE_PORTS,
  beginPrivateFailureAction,
  completePrivateFailureAction,
  retainPrivateAuthSettlementFailureClassNeverThrow,
  retainPrivateDirtyNavigationFailureClassNeverThrow,
  retainPrivateToneOpenFailureClassNeverThrow,
  retainPrivateToneSelectFailureClassNeverThrow,
  sealPrivateFailureActionTracker,
}) {
  const PRIVATE_CORE = new WeakMap();

  function assertCanonicalFinalization(finalization, plan) {
    return assertCanonicalFinalizationCore(finalization, plan, SMOKE_PORTS);
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
      // The failure handler must never be able to lose the cause it is handling. Every other
      // call in this catch is already *NeverThrow; this recorder was the one that could throw,
      // and when it did the meta-error escaped before `cause` ever reached
      // retainFailureAndCleanupDiagnosticsNeverThrow below — the only writer of the slot the
      // diagnostic sink reads. A recorder failure is now structurally incapable of replacing
      // the primary cause, whatever recorder a capability supplies.
      if (typeof capabilities.retainPrimaryFailureObservation === "function") {
        try {
          capabilities.retainPrimaryFailureObservation(cause);
        } catch {
          // A recorder failure never replaces the primary cause it was asked to record.
        }
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

  return Object.freeze({
    assertCanonicalFinalization,
    executeSmokePlanCore,
  });
}
