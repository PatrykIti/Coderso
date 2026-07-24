import {
  deepFreezeExact,
  invariant,
} from "../executor/foundation.mjs";
import {
  cleanupDiagnostics,
} from "./diagnostics.mjs";

const {
  createPrivateCleanupFailureDiagnostic,
  isPrivateCleanupFailureDiagnostic,
  privateCleanupFailureDiagnosticNeverThrow,
  privateCleanupOutcomeDiagnosticNeverThrow,
  retainPrivateCleanupOutcomeDiagnosticNeverThrow,
} = cleanupDiagnostics;
const PRIVATE_CONSTRUCTION_AUTHORITY = new WeakMap();

export function createConstructionAuthorityRuntime({
  cleanupConstructionStateOnce,
  removePrivateWorkspaceLedger,
}) {
  invariant(
    typeof cleanupConstructionStateOnce === "function",
    "construction cleanup state authority is absent"
  );
  invariant(
    typeof removePrivateWorkspaceLedger === "function",
    "construction workspace cleanup authority is absent"
  );

  function retainPrivateConstructionCleanupDiagnosticNeverThrow(
    state,
    outcome,
    fallbackFailureClass
  ) {
    try {
      if (isPrivateCleanupFailureDiagnostic(state.cleanupDiagnostic)) return true;
      const outcomeDiagnostic = privateCleanupOutcomeDiagnosticNeverThrow(outcome);
      if (outcomeDiagnostic !== null) {
        state.cleanupDiagnostic = outcomeDiagnostic;
        return true;
      }
      if (outcome?.absenceProven !== false) return false;
      state.cleanupDiagnostic = createPrivateCleanupFailureDiagnostic(0, fallbackFailureClass);
      return true;
    } catch {
      return false;
    }
  }

  function retainPrivateConstructionCleanupCauseNeverThrow(state, cause, fallbackFailureClass) {
    try {
      if (isPrivateCleanupFailureDiagnostic(state.cleanupDiagnostic)) return true;
      state.cleanupDiagnostic =
        privateCleanupFailureDiagnosticNeverThrow(cause) ??
        createPrivateCleanupFailureDiagnostic(0, fallbackFailureClass);
      return true;
    } catch {
      return false;
    }
  }

  function currentPrivateConstructionCleanupDiagnosticNeverThrow(authority) {
    try {
      const diagnostic = PRIVATE_CONSTRUCTION_AUTHORITY.get(authority)?.cleanupDiagnostic;
      return isPrivateCleanupFailureDiagnostic(diagnostic) ? diagnostic : null;
    } catch {
      return null;
    }
  }

  class PrivateConstructionCleanupAuthority {
    constructor() {
      PRIVATE_CONSTRUCTION_AUTHORITY.set(this, {
        workspaceLedger: null,
        capabilityState: null,
        capabilities: null,
        cleanupPromise: null,
        cleanupRequest: null,
        cleanupCalls: 0,
        cleanupDiagnostic: null,
        failures: [],
      });
    }

    registerWorkspaceLedger(ledger) {
      const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(this);
      invariant(state.workspaceLedger === null, "private workspace authority was assigned twice");
      state.workspaceLedger = ledger;
    }

    registerCapabilityState(capabilityState) {
      const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(this);
      invariant(state.capabilityState === null, "capability construction state was assigned twice");
      state.capabilityState = capabilityState;
    }

    bindCompleteCapabilities(capabilities) {
      const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(this);
      invariant(state.capabilities === null, "complete capabilities were assigned twice");
      invariant(
        capabilities && typeof capabilities.cleanup === "function",
        "complete cleanup capability is missing"
      );
      state.capabilities = capabilities;
    }

    cleanupWhateverWasAcquiredOnceNeverThrow(request = null) {
      const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(this);
      state.cleanupCalls += 1;
      if (state.cleanupPromise === null) {
        state.cleanupRequest = request;
        state.cleanupPromise = (async () => {
          const fallbackFailureClass =
            state.capabilities === null ? "construction_cleanup_failed" : "cleanup_boundary_failed";
          try {
            let outcome;
            if (state.capabilities !== null) {
              outcome = await state.capabilities.cleanup(request);
            } else if (state.capabilityState !== null) {
              outcome = await cleanupConstructionStateOnce(state.capabilityState, request);
            } else if (state.workspaceLedger !== null) {
              await removePrivateWorkspaceLedger(state.workspaceLedger);
              outcome = deepFreezeExact({ absenceProven: true, lifecycle: null });
            } else {
              outcome = deepFreezeExact({ absenceProven: true, lifecycle: null });
            }
            retainPrivateConstructionCleanupDiagnosticNeverThrow(
              state,
              outcome,
              fallbackFailureClass
            );
            return outcome;
          } catch (error) {
            state.failures.push(error);
            retainPrivateConstructionCleanupCauseNeverThrow(state, error, fallbackFailureClass);
            const outcome = deepFreezeExact({ absenceProven: false, lifecycle: null });
            retainPrivateCleanupOutcomeDiagnosticNeverThrow(outcome, state.cleanupDiagnostic);
            return outcome;
          }
        })();
      }
      return state.cleanupPromise;
    }

    retainFailureAndCleanupDiagnosticsNeverThrow(cause, diagnostics) {
      try {
        const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(this);
        state.failures.push(cause, diagnostics);
      } catch {
        // Private diagnostics never replace the fixed public failure.
      }
    }
  }

  function createPrivateConstructionCleanupAuthority() {
    return new PrivateConstructionCleanupAuthority();
  }

  function privateConstructionAuthorityProjection(authority) {
    const state = PRIVATE_CONSTRUCTION_AUTHORITY.get(authority);
    return deepFreezeExact({
      cleanupCalls: state.cleanupCalls,
      cleanupStarted: state.cleanupPromise !== null,
      cleanupMode:
        state.cleanupRequest?.failure === true
          ? "failure"
          : state.cleanupRequest === null
            ? null
            : "success",
      failureCount: state.failures.length,
    });
  }

  return Object.freeze({
    PRIVATE_CONSTRUCTION_AUTHORITY,
    PrivateConstructionCleanupAuthority,
    createPrivateConstructionCleanupAuthority,
    currentPrivateConstructionCleanupDiagnosticNeverThrow,
    privateConstructionAuthorityProjection,
  });
}
