import { writeSync } from "node:fs";

import {
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  TASK_FAILURE,
  classifyFailureReasonNeverThrow,
} from "./config.mjs";
import {
  canonicalJson,
  invariant,
} from "./foundation.mjs";
import { cleanupDiagnostics } from "../cleanup/diagnostics.mjs";

const { privateCleanupFailureReasonNeverThrow } = cleanupDiagnostics;
const PRIVATE_FAILURE_ACTION_DIAGNOSTIC_SINKS = new WeakMap();

export function createDiagnosticSinkRuntime({
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  currentPrivateRetainedFailureCauseNeverThrow,
  failureBoundary,
}) {
  invariant(
    typeof currentPrivateRetainedFailureCauseNeverThrow === "function",
    "retained failure cause authority is absent"
  );
  const {
    currentPrivateAuthSettlementFailureClassNeverThrow,
    currentPrivateDirtyNavigationFailureClassNeverThrow,
    currentPrivateFailureActionIdNeverThrow,
    currentPrivateToneOpenFailureClassNeverThrow,
    currentPrivateToneSelectFailureClassNeverThrow,
  } = failureBoundary;

  function createPrivateBoundedFailureActionDiagnosticSink(write) {
    invariant(typeof write === "function", "failure action diagnostic writer is invalid");
    const sink = Object.freeze({});
    PRIVATE_FAILURE_ACTION_DIAGNOSTIC_SINKS.set(sink, { attempted: false, write });
    return sink;
  }

  function writePrivateFailureActionDiagnosticOnceNeverThrow(sink, line) {
    try {
      const state = PRIVATE_FAILURE_ACTION_DIAGNOSTIC_SINKS.get(sink);
      if (
        state === undefined ||
        state.attempted ||
        typeof line !== "string" ||
        Buffer.byteLength(line) > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES ||
        !line.endsWith("\n") ||
        line.slice(0, -1).includes("\n") ||
        line.includes("\0")
      ) {
        return false;
      }
      state.attempted = true;
      state.write(line);
      return true;
    } catch {
      return false;
    }
  }

  function emitPrivateFailureActionDiagnosticNeverThrow(
    tracker,
    sink,
    constructionCleanupAuthority = null
  ) {
    try {
      const failedActionId = currentPrivateFailureActionIdNeverThrow(tracker);
      const cleanupDiagnostic = currentPrivateConstructionCleanupDiagnosticNeverThrow(
        constructionCleanupAuthority
      );
      if (failedActionId === null && cleanupDiagnostic === null) return false;
      const failureClass =
        currentPrivateAuthSettlementFailureClassNeverThrow(tracker) ??
        currentPrivateToneOpenFailureClassNeverThrow(tracker) ??
        currentPrivateToneSelectFailureClassNeverThrow(tracker) ??
        currentPrivateDirtyNavigationFailureClassNeverThrow(tracker);
      const baseDiagnostic = {
        code: TASK_FAILURE.code,
        ...(failedActionId === null ? {} : { failedActionId }),
        ...(failureClass === null ? {} : { failureClass }),
        ...(cleanupDiagnostic === null ? {} : cleanupDiagnostic),
      };
      // The reason is a FALLBACK for actions no tracker classifies, which is where the
      // diagnostic used to be empty. When a failureClass is present the cause is one of the
      // registered private failures whose message is a fixed human string, so a reason would
      // add nothing and would only consume the byte budget. The token comes from a frozen
      // vocabulary, never raw message text, and it is additive: if appending it would exceed
      // the sink's byte bound the base diagnostic is emitted alone, so naming the cause can
      // never cost us the diagnostic itself.
      const failureReason =
        failureClass === null
          ? classifyFailureReasonNeverThrow(
              currentPrivateRetainedFailureCauseNeverThrow(constructionCleanupAuthority)
            )
          : null;
      // {cleanupPhase, cleanupFailureClass} says WHERE cleanup died, never WHAT it hit, so a
      // cleanup-only failure named a phase number while the phase invariant's own prose died
      // with the process. The retained token names it, and the wrapper reason above still says
      // which postcondition reported the failure, so the two are complementary rather than
      // competing. Like failureReason this field is additive and droppable, and it is a
      // projection of source-literal prose from the frozen vocabulary, never message text.
      const cleanupFailureReason =
        cleanupDiagnostic === null
          ? null
          : privateCleanupFailureReasonNeverThrow(cleanupDiagnostic);
      const reasonedDiagnostic = {
        ...baseDiagnostic,
        ...(failureReason === null ? {} : { failureReason }),
      };
      for (const candidate of [
        {
          ...reasonedDiagnostic,
          ...(cleanupFailureReason === null ? {} : { cleanupFailureReason }),
        },
        reasonedDiagnostic,
      ]) {
        const line = canonicalJson(candidate) + "\n";
        if (Buffer.byteLength(line) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES) {
          return writePrivateFailureActionDiagnosticOnceNeverThrow(sink, line);
        }
      }
      return writePrivateFailureActionDiagnosticOnceNeverThrow(
        sink,
        canonicalJson(baseDiagnostic) + "\n"
      );
    } catch {
      return false;
    }
  }

  function createPrivateSynchronousFailureActionDiagnosticSink(fileDescriptor, synchronousWrite) {
    invariant(
      Number.isSafeInteger(fileDescriptor) && fileDescriptor >= 0,
      "failure action diagnostic file descriptor is invalid"
    );
    invariant(
      typeof synchronousWrite === "function",
      "failure action diagnostic synchronous writer is invalid"
    );
    return createPrivateBoundedFailureActionDiagnosticSink((line) => {
      const bytes = Buffer.from(line, "utf8");
      const written = synchronousWrite(fileDescriptor, bytes, 0, bytes.length, null);
      invariant(written === bytes.length, "failure action diagnostic write was incomplete");
    });
  }

  function createRealFailureActionDiagnosticSink() {
    return createPrivateSynchronousFailureActionDiagnosticSink(2, writeSync);
  }

  return Object.freeze({
    createPrivateBoundedFailureActionDiagnosticSink,
    createPrivateSynchronousFailureActionDiagnosticSink,
    createRealFailureActionDiagnosticSink,
    emitPrivateFailureActionDiagnosticNeverThrow,
    writePrivateFailureActionDiagnosticOnceNeverThrow,
  });
}
