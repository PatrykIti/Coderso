import { deepFreezeExact, invariant } from "../foundation.mjs";

export async function runFailureActionSinksSelfTest({
  PRIVATE_FAILURE_ACTION_TRACKERS,
  assertNegative,
  beginPrivateFailureAction,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateFailureActionTracker,
  createPrivateSynchronousFailureActionDiagnosticSink,
  diagnosticPrivateMarker,
  emitPrivateFailureActionDiagnosticNeverThrow,
  expectAsyncFailure,
  plan,
}) {
  const onceTracker = createPrivateFailureActionTracker(plan);
  beginPrivateFailureAction(onceTracker, plan.actionManifest[0]);
  const firstActionDiagnosticLine =
    '{"code":"task540_smoke_failed","failedActionId":"' + plan.actionManifest[0].id + '"}\n';
  const onceLines = [];
  const onceSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    onceLines.push(line);
  });
  invariant(
    emitPrivateFailureActionDiagnosticNeverThrow(onceTracker, onceSink) === true &&
      emitPrivateFailureActionDiagnosticNeverThrow(onceTracker, onceSink) === false &&
      onceLines.length === 1 &&
      onceLines[0] === firstActionDiagnosticLine,
    "failure action diagnostic once-only contract drift"
  );

  for (const synchronousFailureCode of ["EPIPE", "EBADF"]) {
    const synchronousFailureTracker = createPrivateFailureActionTracker(plan);
    beginPrivateFailureAction(synchronousFailureTracker, plan.actionManifest[0]);
    const synchronousFailureWrites = [];
    const synchronousFailureSink = createPrivateSynchronousFailureActionDiagnosticSink(
      2,
      (fileDescriptor, bytes, offset, length, position) => {
        synchronousFailureWrites.push({
          fileDescriptor,
          bytes: Buffer.from(bytes),
          offset,
          length,
          position,
        });
        const error = new Error(diagnosticPrivateMarker);
        error.code = synchronousFailureCode;
        throw error;
      }
    );
    const firstSynchronousFailure = emitPrivateFailureActionDiagnosticNeverThrow(
      synchronousFailureTracker,
      synchronousFailureSink
    );
    const repeatedSynchronousFailure = emitPrivateFailureActionDiagnosticNeverThrow(
      synchronousFailureTracker,
      synchronousFailureSink
    );
    const [synchronousFailureWrite] = synchronousFailureWrites;
    assertNegative(
      firstSynchronousFailure === false &&
        repeatedSynchronousFailure === false &&
        synchronousFailureWrites.length === 1 &&
        synchronousFailureWrite.fileDescriptor === 2 &&
        synchronousFailureWrite.offset === 0 &&
        synchronousFailureWrite.length === Buffer.byteLength(firstActionDiagnosticLine) &&
        synchronousFailureWrite.position === null &&
        synchronousFailureWrite.bytes.toString("utf8") === firstActionDiagnosticLine &&
        !synchronousFailureWrite.bytes.includes(diagnosticPrivateMarker),
      synchronousFailureCode + " synchronous failure action diagnostic"
    );
  }

  const partialWriteTracker = createPrivateFailureActionTracker(plan);
  beginPrivateFailureAction(partialWriteTracker, plan.actionManifest[0]);
  const partialWrites = [];
  const partialWriteSink = createPrivateSynchronousFailureActionDiagnosticSink(
    2,
    (fileDescriptor, bytes, offset, length, position) => {
      partialWrites.push({
        fileDescriptor,
        bytes: Buffer.from(bytes),
        offset,
        length,
        position,
      });
      return length - 1;
    }
  );
  const firstPartialWrite = emitPrivateFailureActionDiagnosticNeverThrow(
    partialWriteTracker,
    partialWriteSink
  );
  const repeatedPartialWrite = emitPrivateFailureActionDiagnosticNeverThrow(
    partialWriteTracker,
    partialWriteSink
  );
  const [partialWrite] = partialWrites;
  assertNegative(
    firstPartialWrite === false &&
      repeatedPartialWrite === false &&
      partialWrites.length === 1 &&
      partialWrite.fileDescriptor === 2 &&
      partialWrite.offset === 0 &&
      partialWrite.length === Buffer.byteLength(firstActionDiagnosticLine) &&
      partialWrite.position === null &&
      partialWrite.bytes.toString("utf8") === firstActionDiagnosticLine &&
      !partialWrite.bytes.includes(diagnosticPrivateMarker),
    "partial synchronous failure action diagnostic"
  );

  const unknownTracker = createPrivateFailureActionTracker(plan);
  const unknownAction = deepFreezeExact({
    ...plan.actionManifest[0],
    id: "unregistered-action",
  });
  await expectAsyncFailure(
    async () => beginPrivateFailureAction(unknownTracker, unknownAction),
    "unregistered diagnostic action"
  );
  PRIVATE_FAILURE_ACTION_TRACKERS.get(unknownTracker).currentActionId = unknownAction.id;
  const unknownLines = [];
  const unknownSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    unknownLines.push(line);
  });
  assertNegative(
    emitPrivateFailureActionDiagnosticNeverThrow(unknownTracker, unknownSink) === false &&
      unknownLines.length === 0,
    "unknown failure action diagnostic"
  );

  const idleTracker = createPrivateFailureActionTracker(plan);
  const idleLines = [];
  const idleSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    idleLines.push(line);
  });
  assertNegative(
    emitPrivateFailureActionDiagnosticNeverThrow(null, idleSink) === false &&
      emitPrivateFailureActionDiagnosticNeverThrow(idleTracker, idleSink) === false &&
      idleLines.length === 0,
    "inactive failure action diagnostic"
  );
}
