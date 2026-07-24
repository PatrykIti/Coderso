import { writeSync } from "node:fs";

import {
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  TASK_FAILURE,
} from "./config.mjs";
import {
  canonicalJson,
  invariant,
} from "./foundation.mjs";

const PRIVATE_FAILURE_ACTION_DIAGNOSTIC_SINKS = new WeakMap();

export function createDiagnosticSinkRuntime({
  currentPrivateConstructionCleanupDiagnosticNeverThrow,
  failureBoundary,
}) {
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
      const diagnostic = {
        code: TASK_FAILURE.code,
        ...(failedActionId === null ? {} : { failedActionId }),
        ...(failureClass === null ? {} : { failureClass }),
        ...(cleanupDiagnostic === null ? {} : cleanupDiagnostic),
      };
      const line = canonicalJson(diagnostic) + "\n";
      return writePrivateFailureActionDiagnosticOnceNeverThrow(sink, line);
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
