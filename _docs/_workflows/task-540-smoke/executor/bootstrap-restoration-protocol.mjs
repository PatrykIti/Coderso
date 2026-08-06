// Bootstrap login state restoration protocol for the TASK-540 smoke executor.
//
// Owns the frozen post-restore CAS proof key set and its validator, the phase 8 failure retention
// helper, the closed and failed bootstrap CAS bridge outcome classifiers, the single CAS bridge
// attempt, the CAS attempt result validator, the restoration proof builder, the ordered
// reconcile/CAS/uncertain-baseline restoration protocol, the one-shot restoration entry point and
// the one-shot bootstrap restore runtime receipt.
import { PHASE_EIGHT_CLEANUP_FAILURE_CLASSES } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";
import { cleanupRuntimeReceipt } from "./cleanup-execution.mjs";
import { cleanupDiagnostics } from "../cleanup/diagnostics.mjs";

const { retainPrivateCleanupFailureDiagnosticNeverThrow } = cleanupDiagnostics;

export const BOOTSTRAP_RESTORE_PROOF_KEYS = deepFreezeExact([
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

// The rejected CAS branch reports `casAttempt.cause` AS the failure, so a CAS bridge rejection names
// itself. The uncertain branch threw only the follow-up baseline-read failure and dropped
// `casAttempt.cause` on the floor, which is how a 35-minute run could report that the bootstrap row
// still differed while never stating that its CAS child had failed to start the statement at all.
// The cause is chained onto the thrown failure rather than wrapped around it: the emitted
// `cleanupFailureReason` is a projection of the thrown error's own MESSAGE, so rewording it would
// replace a named token with "unclassified". The bridge failure message is the fixed invariant string
// "descriptor-bound Bun bridge child failed", so no child output can reach the chain.
function chainUncertainBaselineCauseNeverThrow(baselineError, casCause) {
  try {
    if (
      !(baselineError instanceof Error) ||
      casCause === undefined ||
      baselineError.cause !== undefined
    ) {
      return false;
    }
    Object.defineProperty(baselineError, "cause", {
      configurable: true,
      enumerable: false,
      value: casCause,
      writable: true,
    });
    return true;
  } catch {
    return false;
  }
}

function retainPhaseEightFailure(error, failureClass) {
  invariant(
    PHASE_EIGHT_CLEANUP_FAILURE_CLASSES.includes(failureClass),
    "phase 8 failure class drift"
  );
  return retainPrivateCleanupFailureDiagnosticNeverThrow(error, 8, failureClass);
}

export function classifyBootstrapCasBridgeFailure(cause, executionBoundaryCrossed) {
  invariant(typeof executionBoundaryCrossed === "boolean", "bootstrap CAS boundary state drift");
  return Object.freeze({
    cause,
    kind: executionBoundaryCrossed ? "outcome-uncertain" : "rejected",
  });
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

export function createBootstrapRestorationProtocol(dependencies) {
  // The bootstrap login authority and its reconciliation, the Bun bridge operation runner, the
  // bootstrap bridge output validators and the auxiliary operation descriptor registry all belong
  // to authorities the facade composes, so they arrive as injected dependencies instead of static
  // imports and every declaration below closes over those exact values rather than a rebindable
  // module slot.
  exactOwnKeys(
    dependencies,
    [
      "BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS",
      "PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY",
      "reconcileBootstrapLoginAuthority",
      "runBunBridgeOperation",
      "validateBootstrapBaselineReadBridgeOutput",
      "validateBootstrapRestoreBridgeOutput",
    ],
    "bootstrap restoration protocol dependencies",
    { plain: true }
  );
  const {
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    reconcileBootstrapLoginAuthority,
    runBunBridgeOperation,
    validateBootstrapBaselineReadBridgeOutput,
    validateBootstrapRestoreBridgeOutput,
  } = dependencies;
  invariant(
    typeof BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS === "object" &&
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS !== null &&
      Object.isFrozen(BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS),
    "bootstrap restoration protocol auxiliary operation descriptors are absent"
  );
  invariant(
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY instanceof WeakMap,
    "bootstrap restoration protocol login authority registry is absent"
  );
  invariant(
    [
      "reconcileBootstrapLoginAuthority",
      "runBunBridgeOperation",
      "validateBootstrapBaselineReadBridgeOutput",
      "validateBootstrapRestoreBridgeOutput",
    ].every((key) => typeof dependencies[key] === "function"),
    "bootstrap restoration protocol dependencies are not callable"
  );

  function classifyClosedBootstrapCasBridgeOutcome(outcome) {
    validateBootstrapRestoreBridgeOutput(
      null,
      { operationId: "resource/bootstrap-cas-restore" },
      null,
      outcome
    );
    if (outcome.kind === "rolled-back") {
      return Object.freeze({
        cause: new Error(outcome.reason),
        kind: "rejected",
      });
    }
    if (outcome.kind === "committed-proof-failed") {
      return Object.freeze({ kind: "post-restore-proof-failed", proof: outcome.proof });
    }
    invariant(outcome.kind === "committed", "bootstrap CAS closed outcome drift");
    return Object.freeze({ kind: "validated", proof: outcome.proof });
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
        chainUncertainBaselineCauseNeverThrow(error, casAttempt.cause);
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

  return Object.freeze({
    attemptBootstrapCasBridgeOnce,
    classifyClosedBootstrapCasBridgeOutcome,
    createBootstrapRestoreReceiptOnce,
    executeBootstrapRestorationProtocol,
    restoreBootstrapLoginState,
  });
}
