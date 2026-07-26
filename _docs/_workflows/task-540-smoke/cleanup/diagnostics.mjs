import {
  CLEANUP_FAILURE_CLASSES,
  CLEANUP_FAILURE_CLASS_PRIORITY,
  FAILURE_REASON_HARNESS_PATTERN,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  classifyFailureReasonNeverThrow,
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
// {cleanupPhase, cleanupFailureClass} states WHERE cleanup died but never WHAT it hit, so a
// cleanup-only failure could report a phase number while the phase invariant's own prose died
// with the process — which is exactly how a phase-5 failure reached the operator as a bare
// `cleanupPhase: 5`. The projected `wf540_` token of each retained failure is therefore kept
// beside its diagnostic, keyed by BOTH the failure and the frozen diagnostic object the sink
// already holds, and an aggregate inherits the token of the earliest phase it wraps. Only a
// member of the frozen vocabulary is ever retained, never raw message text, so the sink keeps
// its bounded-bytes and secret-free guarantees unchanged.
const PRIVATE_CLEANUP_FAILURE_REASONS = new WeakMap();

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

// Abstains on anything the frozen vocabulary does not cover, "unclassified" included, so a
// failure the projection cannot name leaves every emitted diagnostic byte-identical.
function harnessFailureReasonNeverThrow(cause) {
  try {
    const reason = classifyFailureReasonNeverThrow(cause);
    return typeof reason === "string" && FAILURE_REASON_HARNESS_PATTERN.test(reason) ? reason : null;
  } catch {
    return null;
  }
}

function privateCleanupFailureReasonNeverThrow(subject) {
  try {
    const reason = PRIVATE_CLEANUP_FAILURE_REASONS.get(subject);
    return typeof reason === "string" && FAILURE_REASON_HARNESS_PATTERN.test(reason) ? reason : null;
  } catch {
    return null;
  }
}

function retainPrivateCleanupFailureReasonNeverThrow(subject, reason) {
  try {
    if (typeof reason !== "string" || !FAILURE_REASON_HARNESS_PATTERN.test(reason)) return false;
    if (PRIVATE_CLEANUP_FAILURE_REASONS.has(subject)) return false;
    PRIVATE_CLEANUP_FAILURE_REASONS.set(subject, reason);
    return true;
  } catch {
    return false;
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
      const diagnostic = createPrivateCleanupFailureDiagnostic(cleanupPhase, cleanupFailureClass);
      PRIVATE_CLEANUP_FAILURE_DIAGNOSTICS.set(failure, diagnostic);
      const reason =
        privateCleanupFailureReasonNeverThrow(failure) ?? harnessFailureReasonNeverThrow(failure);
      retainPrivateCleanupFailureReasonNeverThrow(failure, reason);
      retainPrivateCleanupFailureReasonNeverThrow(diagnostic, reason);
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

// The earliest phase that failed is the one that describes the run, so selection keeps the
// failure OBJECT beside the diagnostic it won with: an aggregate can then inherit that exact
// failure's reason token instead of the wrapper's fixed prose.
function selectPrivateCleanupFailureNeverThrow(failures) {
  try {
    const candidates = Array.isArray(failures)
      ? failures
          .map((failure) => ({
            failure,
            diagnostic: privateCleanupFailureDiagnosticNeverThrow(failure),
          }))
          .filter(({ diagnostic }) => diagnostic !== null)
      : [];
    if (candidates.length === 0) return null;
    candidates.sort((left, right) => {
      const phaseOrder = left.diagnostic.cleanupPhase - right.diagnostic.cleanupPhase;
      if (phaseOrder !== 0) return phaseOrder;
      return (
        CLEANUP_FAILURE_CLASS_PRIORITY.indexOf(left.diagnostic.cleanupFailureClass) -
        CLEANUP_FAILURE_CLASS_PRIORITY.indexOf(right.diagnostic.cleanupFailureClass)
      );
    });
    return candidates[0];
  } catch {
    return null;
  }
}

function selectPrivateCleanupFailureDiagnosticNeverThrow(failures, fallbackPhase = null) {
  try {
    const selected = selectPrivateCleanupFailureNeverThrow(failures);
    if (selected !== null) return selected.diagnostic;
    return fallbackPhase === null
      ? null
      : createPrivateCleanupFailureDiagnostic(
          fallbackPhase,
          fallbackPhase === 0 ? "cleanup_boundary_failed" : "phase_failed"
        );
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
  const selected = selectPrivateCleanupFailureNeverThrow(failures);
  const diagnostic =
    selected === null
      ? selectPrivateCleanupFailureDiagnosticNeverThrow(failures, fallbackPhase)
      : selected.diagnostic;
  const retained = retainPrivateCleanupFailureDiagnosticNeverThrow(
    error,
    diagnostic.cleanupPhase,
    diagnostic.cleanupFailureClass
  );
  // The wrapper's own message is fixed prose ("TASK-540 deterministic cleanup failed"), so
  // without this the emitted diagnostic would name the aggregate and lose the only statement of
  // what the phase actually hit.
  if (selected !== null) {
    const reason = privateCleanupFailureReasonNeverThrow(selected.failure);
    retainPrivateCleanupFailureReasonNeverThrow(retained, reason);
    const retainedDiagnostic = privateCleanupFailureDiagnosticNeverThrow(retained);
    if (retainedDiagnostic !== null) {
      retainPrivateCleanupFailureReasonNeverThrow(retainedDiagnostic, reason);
    }
  }
  return retained;
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
  privateCleanupFailureReasonNeverThrow,
  privateCleanupOutcomeDiagnosticNeverThrow,
  retainPrivateCleanupAggregateDiagnosticNeverThrow,
  retainPrivateCleanupFailureDiagnosticNeverThrow,
  retainPrivateCleanupOutcomeDiagnosticNeverThrow,
  selectPrivateCleanupFailureDiagnosticNeverThrow,
});
