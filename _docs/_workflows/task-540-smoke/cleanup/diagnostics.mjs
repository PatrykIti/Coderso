import {
  CLEANUP_FAILURE_CLASSES,
  CLEANUP_FAILURE_CLASS_PRIORITY,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
} from "../executor/config.mjs";
import {
  deepEqualJson,
} from "../executor/resource-contracts.mjs";
import {
  deepFreezeExact,
  invariant,
} from "../executor/foundation.mjs";

const PRIVATE_CLEANUP_FAILURE_DIAGNOSTICS = new WeakMap();
const PRIVATE_CLEANUP_OUTCOME_DIAGNOSTICS = new WeakMap();

function isPrivateCleanupFailureDiagnostic(value) {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      !Object.isFrozen(value) ||
      !deepEqualJson(Object.keys(value).sort(), ["cleanupFailureClass", "cleanupPhase"])
    ) {
      return false;
    }
    const { cleanupFailureClass, cleanupPhase } = value;
    if (
      !Number.isSafeInteger(cleanupPhase) ||
      cleanupPhase < 0 ||
      cleanupPhase > 10 ||
      !CLEANUP_FAILURE_CLASSES.includes(cleanupFailureClass)
    ) {
      return false;
    }
    if (cleanupPhase === 0) {
      return ["cleanup_boundary_failed", "construction_cleanup_failed"].includes(
        cleanupFailureClass
      );
    }
    if (cleanupFailureClass === "phase_failed") return true;
    return (
      (cleanupPhase === 3 && PHASE_THREE_CLEANUP_FAILURE_CLASSES.includes(cleanupFailureClass)) ||
      (cleanupPhase === 8 && PHASE_EIGHT_CLEANUP_FAILURE_CLASSES.includes(cleanupFailureClass))
    );
  } catch {
    return false;
  }
}

function createPrivateCleanupFailureDiagnostic(cleanupPhase, cleanupFailureClass) {
  const diagnostic = deepFreezeExact({ cleanupPhase, cleanupFailureClass });
  invariant(
    isPrivateCleanupFailureDiagnostic(diagnostic),
    "private cleanup failure diagnostic is invalid"
  );
  return diagnostic;
}

function privateCleanupFailureDiagnosticNeverThrow(cause) {
  try {
    const diagnostic = PRIVATE_CLEANUP_FAILURE_DIAGNOSTICS.get(cause);
    return isPrivateCleanupFailureDiagnostic(diagnostic) ? diagnostic : null;
  } catch {
    return null;
  }
}

function retainPrivateCleanupFailureDiagnosticNeverThrow(cause, cleanupPhase, cleanupFailureClass) {
  try {
    const failure =
      (typeof cause === "object" && cause !== null) || typeof cause === "function"
        ? cause
        : new Error("TASK-540 cleanup failed");
    const existing = privateCleanupFailureDiagnosticNeverThrow(failure);
    if (existing === null) {
      PRIVATE_CLEANUP_FAILURE_DIAGNOSTICS.set(
        failure,
        createPrivateCleanupFailureDiagnostic(cleanupPhase, cleanupFailureClass)
      );
    }
    return failure;
  } catch {
    const failure = new Error("TASK-540 cleanup failed");
    PRIVATE_CLEANUP_FAILURE_DIAGNOSTICS.set(
      failure,
      createPrivateCleanupFailureDiagnostic(0, "cleanup_boundary_failed")
    );
    return failure;
  }
}

function selectPrivateCleanupFailureDiagnosticNeverThrow(failures, fallbackPhase = null) {
  try {
    const diagnostics = Array.isArray(failures)
      ? failures
          .map((failure) => privateCleanupFailureDiagnosticNeverThrow(failure))
          .filter((diagnostic) => diagnostic !== null)
      : [];
    if (diagnostics.length === 0) {
      return fallbackPhase === null
        ? null
        : createPrivateCleanupFailureDiagnostic(
            fallbackPhase,
            fallbackPhase === 0 ? "cleanup_boundary_failed" : "phase_failed"
          );
    }
    diagnostics.sort((left, right) => {
      const phaseOrder = left.cleanupPhase - right.cleanupPhase;
      if (phaseOrder !== 0) return phaseOrder;
      return (
        CLEANUP_FAILURE_CLASS_PRIORITY.indexOf(left.cleanupFailureClass) -
        CLEANUP_FAILURE_CLASS_PRIORITY.indexOf(right.cleanupFailureClass)
      );
    });
    return diagnostics[0];
  } catch {
    return fallbackPhase === null
      ? null
      : createPrivateCleanupFailureDiagnostic(
          fallbackPhase,
          fallbackPhase === 0 ? "cleanup_boundary_failed" : "phase_failed"
        );
  }
}

function retainPrivateCleanupAggregateDiagnosticNeverThrow(error, failures, fallbackPhase) {
  const diagnostic = selectPrivateCleanupFailureDiagnosticNeverThrow(failures, fallbackPhase);
  return retainPrivateCleanupFailureDiagnosticNeverThrow(
    error,
    diagnostic.cleanupPhase,
    diagnostic.cleanupFailureClass
  );
}

function retainPrivateCleanupOutcomeDiagnosticNeverThrow(outcome, diagnostic) {
  try {
    if (!isPrivateCleanupFailureDiagnostic(diagnostic)) return false;
    PRIVATE_CLEANUP_OUTCOME_DIAGNOSTICS.set(outcome, diagnostic);
    return true;
  } catch {
    return false;
  }
}

function privateCleanupOutcomeDiagnosticNeverThrow(outcome) {
  try {
    const diagnostic = PRIVATE_CLEANUP_OUTCOME_DIAGNOSTICS.get(outcome);
    return isPrivateCleanupFailureDiagnostic(diagnostic) ? diagnostic : null;
  } catch {
    return null;
  }
}

export const cleanupDiagnostics = Object.freeze({
  createPrivateCleanupFailureDiagnostic,
  isPrivateCleanupFailureDiagnostic,
  privateCleanupFailureDiagnosticNeverThrow,
  privateCleanupOutcomeDiagnosticNeverThrow,
  retainPrivateCleanupAggregateDiagnosticNeverThrow,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateCleanupOutcomeDiagnosticNeverThrow,
  selectPrivateCleanupFailureDiagnosticNeverThrow,
});
