import {
  ALLOWED_SECRET_NAMES,
  COMMAND_TIMEOUT_MS,
  EMPTY_SHA256,
  LF_SHA256,
  MAX_STREAM_BYTES,
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
  SESSION_NAME,
  projectBrowserErrorFrameToken,
} from "../executor/config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";

const ALLOWED_PROGRAMS = new Set(["playwright-cli", "bun", "curl", process.execPath]);
const PRIVATE_AUTHORITY = new WeakMap();

function shellDisplay(program, args) {
  const quote = (value) => {
    if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) return value;
    return "'" + value.replaceAll("'", "'\\''") + "'";
  };
  return [program, ...args].map(quote).join(" ");
}

function configuredSensitiveValues(...sources) {
  const values = [];
  const append = (value) => {
    if (typeof value !== "string" || value.length === 0) return;
    values.push(value);
    try {
      values.push(decodeURIComponent(value));
    } catch {
      // The undecoded value is still part of the private corpus.
    }
  };
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of Reflect.ownKeys(source)) {
      if (typeof key !== "string") continue;
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        typeof descriptor.value !== "string"
      ) {
        continue;
      }
      const value = descriptor.value;
      let urlCredentials = null;
      try {
        const parsed = new URL(value);
        if (parsed.username.length > 0 || parsed.password.length > 0) {
          urlCredentials = [parsed.username, parsed.password];
        }
      } catch {
        // Non-URL values are classified only by their key.
      }
      const keyLooksSensitive =
        !/public[_-]?key/iu.test(key) &&
        /(?:password|passwd|secret|token|cookie|authorization|api[_-]?key|encryption|database[_-]?url|redis[_-]?url|dsn|(?:^|_)(?:pii[_-]?)?hash[_-]?key|private[_-]?key|signing[_-]?key|master[_-]?key)/iu.test(
          key
        );
      if (keyLooksSensitive || urlCredentials !== null) append(value);
      if (urlCredentials !== null) {
        for (const credential of urlCredentials) append(credential);
      }
    }
  }
  return [...new Set(values.filter(Boolean))];
}

function rawBytesAreSensitive(bytes, sensitiveValues) {
  const value = bytes.toString("utf8");
  if (
    /(?:authorization|cookie|set-cookie)\s*:/i.test(value) ||
    /bearer\s+[A-Za-z0-9._~+/-]+=*/i.test(value) ||
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)
  ) {
    return true;
  }
  return sensitiveValues.some((secret) => secret.length > 0 && value.includes(secret));
}

function repositorySnapshotDelta(before, after) {
  invariant(
    before &&
      after &&
      Array.isArray(before.paths) &&
      Array.isArray(after.paths) &&
      before.hashes &&
      after.hashes,
    "repository snapshot shape is invalid"
  );
  const paths = [...new Set([...before.paths, ...after.paths])].sort();
  return paths.filter(
    (entry) => (before.hashes[entry] ?? "<clean>") !== (after.hashes[entry] ?? "<clean>")
  );
}

function assertRepositoryMutationPolicy(action, before, after) {
  const changed = repositorySnapshotDelta(before, after);
  const policy = action.repositoryMutationPolicy;
  invariant(
    policy &&
      (policy.mode === "none" || policy.mode === "allowlist") &&
      Array.isArray(policy.paths),
    action.id + " repository policy is invalid"
  );
  if (policy.mode === "none") {
    invariant(changed.length === 0, action.id + " changed repository state");
    return;
  }
  invariant(
    changed.length === policy.paths.length &&
      changed.every((entry) => policy.paths.includes(entry)),
    action.id + " changed repository state outside its exact allowlist"
  );
}

function inspectRetainedProcessOutcome(execution, program) {
  const safeRead = (read) => {
    try {
      return { ok: true, value: read() };
    } catch {
      return { ok: false, value: undefined };
    }
  };
  const executionIsObject = execution !== null && typeof execution === "object";
  const stdoutRecord = safeRead(() => (executionIsObject ? execution.stdout : undefined));
  const stderrRecord = safeRead(() => (executionIsObject ? execution.stderr : undefined));
  const completionRecord = safeRead(() => (executionIsObject ? execution.completion : undefined));
  const terminationRecord = safeRead(() => (executionIsObject ? execution.termination : undefined));
  const timedOutRecord = safeRead(() => (executionIsObject ? execution.timedOut : undefined));
  const spawnErrorRecord = safeRead(() => (executionIsObject ? execution.spawnError : undefined));
  const stdoutBytesRecord = safeRead(() => stdoutRecord.value?.bytes);
  const stderrBytesRecord = safeRead(() => stderrRecord.value?.bytes);
  const stdoutExceededRecord = safeRead(() => stdoutRecord.value?.exceeded);
  const stderrExceededRecord = safeRead(() => stderrRecord.value?.exceeded);
  const completionCodeRecord = safeRead(() => completionRecord.value?.code);
  const terminationAbsentRecord = safeRead(() => terminationRecord.value?.absent);
  const stdoutBytes =
    stdoutBytesRecord.ok && Buffer.isBuffer(stdoutBytesRecord.value)
      ? stdoutBytesRecord.value
      : null;
  const stderrBytes =
    stderrBytesRecord.ok && Buffer.isBuffer(stderrBytesRecord.value)
      ? stderrBytesRecord.value
      : null;
  const shapeIsCanonical =
    executionIsObject &&
    stdoutRecord.ok &&
    stderrRecord.ok &&
    completionRecord.ok &&
    terminationRecord.ok &&
    timedOutRecord.ok &&
    spawnErrorRecord.ok &&
    stdoutBytesRecord.ok &&
    stderrBytesRecord.ok &&
    stdoutExceededRecord.ok &&
    stderrExceededRecord.ok &&
    completionCodeRecord.ok &&
    terminationAbsentRecord.ok &&
    stdoutRecord.value !== null &&
    typeof stdoutRecord.value === "object" &&
    stderrRecord.value !== null &&
    typeof stderrRecord.value === "object" &&
    completionRecord.value !== null &&
    typeof completionRecord.value === "object" &&
    terminationRecord.value !== null &&
    typeof terminationRecord.value === "object" &&
    stdoutBytes !== null &&
    stderrBytes !== null &&
    typeof stdoutExceededRecord.value === "boolean" &&
    typeof stderrExceededRecord.value === "boolean" &&
    typeof timedOutRecord.value === "boolean" &&
    typeof spawnErrorRecord.value === "boolean" &&
    (completionCodeRecord.value === null || Number.isInteger(completionCodeRecord.value)) &&
    typeof terminationAbsentRecord.value === "boolean";
  const outputExceeded =
    stdoutExceededRecord.value === true ||
    stderrExceededRecord.value === true ||
    (stdoutBytes !== null && stdoutBytes.length > MAX_STREAM_BYTES) ||
    (stderrBytes !== null && stderrBytes.length > MAX_STREAM_BYTES);
  const timedOut = timedOutRecord.value === true;
  const runnerAnomaly =
    shapeIsCanonical && (spawnErrorRecord.value === true || terminationAbsentRecord.value !== true);
  const browserErrorMarker =
    program === "playwright-cli" &&
    stdoutBytes !== null &&
    stdoutBytes.includes(Buffer.from("### Error\n"));
  const stderrRejected = stderrBytes !== null && stderrBytes.length !== 0;
  const exitFailed = completionCodeRecord.value !== 0;
  return Object.freeze({
    stdoutBytes,
    stderrBytes,
    shapeIsCanonical,
    outputExceeded,
    timedOut,
    runnerAnomaly,
    browserErrorMarker,
    stderrRejected,
    exitFailed,
    successfulBoundedAndAbsent:
      shapeIsCanonical &&
      !outputExceeded &&
      !timedOut &&
      !runnerAnomaly &&
      !browserErrorMarker &&
      !stderrRejected &&
      !exitFailed,
  });
}

function classifySafeRetainedProcessOutcome(outcome) {
  if (outcome.outputExceeded) return "process_output_limit";
  if (outcome.timedOut) return "process_timeout";
  if (outcome.runnerAnomaly) return "process_runner_failed";
  if (outcome.browserErrorMarker) return "browser_error_frame";
  if (outcome.stderrRejected) return "process_stderr_rejected";
  if (outcome.exitFailed) return "process_exit_failed";
  return null;
}

function isCredentialBrowserFillAction(action) {
  return (
    action?.kind === "fill" &&
    action.executable?.type === "browser-native" &&
    action.executable.operationId === "fill-secret"
  );
}

function buildBrowserStreamIntegrity(
  { action, program, args, displayArgs, stdoutDiscarded, outcome },
  digestEvidenceBytes = hashBytes
) {
  invariant(typeof digestEvidenceBytes === "function", "receipt digest authority is invalid");
  const credential = isCredentialBrowserFillAction(action);
  invariant(
    stdoutDiscarded === credential,
    credential ? "credential stdout must be discarded" : "non-credential stdout cannot be discarded"
  );
  if (credential) {
    const credentialRef = action.executable.refs?.[1];
    invariant(
      program === "playwright-cli" &&
        credentialRef?.op === "secret" &&
        ALLOWED_SECRET_NAMES.has(credentialRef.name) &&
        Array.isArray(args) &&
        args.length === 5 &&
        args[0] === "-s=" + SESSION_NAME &&
        args[1] === "--raw" &&
        args[2] === "fill" &&
        typeof args[3] === "string" &&
        args[3].length > 0 &&
        args[4] === credentialRef.name &&
        Array.isArray(displayArgs) &&
        displayArgs.length === 3 &&
        displayArgs[0] === args[0] &&
        displayArgs[1] === args[1] &&
        displayArgs[2] === action.executable.operationId &&
        Buffer.isBuffer(outcome.stdoutBytes) &&
        outcome.stdoutBytes.equals(Buffer.from("\n")) &&
        Buffer.isBuffer(outcome.stderrBytes) &&
        outcome.stderrBytes.length === 0,
      "credential browser receipt drift"
    );
    return deepFreezeExact({
      stdoutBytes: 1,
      stderrBytes: 0,
      stdoutSha256: LF_SHA256,
      stderrSha256: EMPTY_SHA256,
    });
  }
  return deepFreezeExact({
    stdoutBytes: outcome.stdoutBytes.length,
    stderrBytes: outcome.stderrBytes.length,
    stdoutSha256: digestEvidenceBytes(outcome.stdoutBytes),
    stderrSha256: digestEvidenceBytes(outcome.stderrBytes),
  });
}

export function createCommandAuthorityRuntime({
  failureBoundary,
  runRetainedProcessGroup,
}) {
  const {
    classifyPrivateAuthSettlementFailureFrame,
    classifyPrivateDirtyNavigationFailureFrame,
    classifyPrivateToneOpenFailureFrame,
    classifyPrivateToneSelectFailureFrame,
    createPrivateAuthSettlementFailure,
    createPrivateDirtyNavigationFailure,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    failPrivateAuthSettlementStage,
  } = failureBoundary;

  class LocalCommandAuthority {
    constructor(
      { root, assertSafeEvidence, snapshotRepository, sensitiveValues },
      processRunner = runRetainedProcessGroup
    ) {
      invariant(typeof processRunner === "function", "private process runner is invalid");
      PRIVATE_AUTHORITY.set(this, {
        root,
        assertSafeEvidence,
        snapshotRepository,
        sensitiveValues,
        processRunner,
        rawByReceipt: new WeakMap(),
        batchProofs: new WeakMap(),
      });
    }

    async executePhysicalProgram({
      action,
      program,
      args,
      cwd,
      env,
      stdinBytes = null,
      timeoutMs = COMMAND_TIMEOUT_MS,
    }) {
      invariant(ALLOWED_PROGRAMS.has(program), "program is not allowlisted");
      invariant(
        Array.isArray(args) && args.every((value) => typeof value === "string"),
        "argv invalid"
      );
      const state = PRIVATE_AUTHORITY.get(this);
      invariant(
        stdinBytes === null || (Buffer.isBuffer(stdinBytes) && stdinBytes.length <= 1024 * 1024),
        "stdin frame is invalid"
      );
      invariant(
        Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= COMMAND_TIMEOUT_MS,
        "command timeout is invalid"
      );
      let before;
      try {
        before = await state.snapshotRepository(action.repositoryMutationPolicy.paths);
      } catch (cause) {
        failPrivateAuthSettlementStage(
          action,
          "repository_boundary_failed",
          { cause },
          "repository snapshot failed"
        );
      }
      let execution;
      try {
        execution = await state.processRunner({
          file: program,
          args,
          cwd,
          env,
          stdinBytes,
          timeoutMs,
        });
      } catch (cause) {
        failPrivateAuthSettlementStage(
          action,
          "process_runner_failed",
          { cause },
          "local command runner failed"
        );
      }
      let after = null;
      let repositoryFailure = null;
      try {
        after = await state.snapshotRepository(action.repositoryMutationPolicy.paths);
        assertRepositoryMutationPolicy(action, before, after);
      } catch (cause) {
        repositoryFailure = cause;
      }
      const outcome = inspectRetainedProcessOutcome(execution, program);
      return { state, execution, outcome, before, after, repositoryFailure };
    }

    projectProgramOutcome(
      {
        action,
        program,
        args,
        sequence,
        operation,
        routeKey,
        assertionName,
        displayArgs = args,
        stdoutDiscarded = false,
      },
      { state, execution, outcome, before, after, repositoryFailure }
    ) {
      invariant(ALLOWED_PROGRAMS.has(program), "program is not allowlisted");
      invariant(
        Array.isArray(args) && args.every((value) => typeof value === "string"),
        "argv invalid"
      );
      invariant(
        Array.isArray(displayArgs) && displayArgs.every((value) => typeof value === "string"),
        "display argv invalid"
      );
      const exactAuthFailureClass =
        program === "playwright-cli" &&
        repositoryFailure === null &&
        outcome.successfulBoundedAndAbsent
          ? classifyPrivateAuthSettlementFailureFrame(action.id, outcome.stdoutBytes)
          : null;
      const exactToneOpenFailureClass =
        program === "playwright-cli" &&
        repositoryFailure === null &&
        outcome.successfulBoundedAndAbsent
          ? classifyPrivateToneOpenFailureFrame(action.id, outcome.stdoutBytes)
          : null;
      const exactToneSelectFailureClass =
        program === "playwright-cli" &&
        repositoryFailure === null &&
        outcome.successfulBoundedAndAbsent
          ? classifyPrivateToneSelectFailureFrame(action.id, outcome.stdoutBytes)
          : null;
      const exactDirtyNavigationFailureClass =
        program === "playwright-cli" &&
        repositoryFailure === null &&
        outcome.successfulBoundedAndAbsent
          ? classifyPrivateDirtyNavigationFailureFrame(action.id, outcome.stdoutBytes)
          : null;
      invariant(
        [
          exactAuthFailureClass,
          exactToneOpenFailureClass,
          exactToneSelectFailureClass,
          exactDirtyNavigationFailureClass,
        ].filter((failureClass) => failureClass !== null).length <= 1,
        "classified browser failure frame overlap"
      );
      if (exactAuthFailureClass !== null) {
        throw createPrivateAuthSettlementFailure(exactAuthFailureClass, { execution });
      }
      if (exactToneOpenFailureClass !== null) {
        throw createPrivateToneOpenFailure(exactToneOpenFailureClass, { execution });
      }
      if (exactToneSelectFailureClass !== null) {
        throw createPrivateToneSelectFailure(exactToneSelectFailureClass);
      }
      if (exactDirtyNavigationFailureClass !== null) {
        throw createPrivateDirtyNavigationFailure(exactDirtyNavigationFailureClass, { execution });
      }
      const sensitiveOutput =
        (outcome.stdoutBytes !== null &&
          rawBytesAreSensitive(outcome.stdoutBytes, state.sensitiveValues)) ||
        (outcome.stderrBytes !== null &&
          rawBytesAreSensitive(outcome.stderrBytes, state.sensitiveValues));
      invariant(!sensitiveOutput, "local command emitted sensitive bytes");
      invariant(outcome.shapeIsCanonical, "retained process result shape is invalid");
      if (repositoryFailure !== null) {
        failPrivateAuthSettlementStage(
          action,
          "repository_boundary_failed",
          { cause: repositoryFailure, execution },
          "repository boundary failed"
        );
      }
      const processFailureClass = classifySafeRetainedProcessOutcome(outcome);
      if (processFailureClass !== null) {
        // For an action no failure-frame registry owns, the fallback message is the ONLY thing
        // that survives to the diagnostic, so handing over a fixed string discarded the browser's
        // own statement of the cause. The projected token is vocabulary-bounded, never raw output.
        const browserErrorToken =
          processFailureClass === "browser_error_frame"
            ? projectBrowserErrorFrameToken(outcome.stdoutBytes)
            : null;
        failPrivateAuthSettlementStage(
          action,
          processFailureClass,
          { execution },
          browserErrorToken ?? "local command failed"
        );
      }
      try {
        invariant(
          outcome.stdoutBytes !== null && outcome.stderrBytes !== null,
          "local command buffers are absent"
        );
        const displayCommand = shellDisplay(program, displayArgs);
        const streamIntegrity = buildBrowserStreamIntegrity({
          action,
          program,
          args,
          displayArgs,
          stdoutDiscarded,
          outcome,
        });
        const receipt = {
          runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
          sequence,
          kind: action.kind,
          scenario: action.scenario,
          operation,
          routeKey,
          assertionName,
          command: displayCommand,
          status: 0,
          stdoutBytes: streamIntegrity.stdoutBytes,
          stderrBytes: streamIntegrity.stderrBytes,
          stdoutSha256: streamIntegrity.stdoutSha256,
          stderrSha256: streamIntegrity.stderrSha256,
          stdoutTruncated: false,
          stderrTruncated: false,
          sanitizedOutput: stdoutDiscarded ? "[discarded]" : "",
          stdoutDiscarded,
          pageId: action.pageId,
          tabIndex: action.tabIndex,
        };
        state.rawByReceipt.set(receipt, {
          stdout: outcome.stdoutBytes,
          stderr: outcome.stderrBytes,
          before,
          after,
        });
        state.assertSafeEvidence(receipt, "TASK-540 local command receipt");
        return { receipt, stdout: outcome.stdoutBytes, stderr: outcome.stderrBytes };
      } catch (cause) {
        failPrivateAuthSettlementStage(
          action,
          "receipt_boundary_failed",
          { cause, execution },
          "local command receipt failed"
        );
      }
    }

    async executeProgram({
      action,
      program,
      args,
      sequence,
      operation,
      routeKey,
      assertionName,
      displayArgs = args,
      stdoutDiscarded = false,
      cwd,
      env,
      stdinBytes = null,
      timeoutMs = COMMAND_TIMEOUT_MS,
    }) {
      const physical = await this.executePhysicalProgram({
        action,
        program,
        args,
        cwd,
        env,
        stdinBytes,
        timeoutMs,
      });
      return this.projectProgramOutcome(
        {
          action,
          program,
          args,
          sequence,
          operation,
          routeKey,
          assertionName,
          displayArgs,
          stdoutDiscarded,
        },
        physical
      );
    }

    async executeBatchProgram({ attributionAction, actions, args, cwd, env, timeoutMs }) {
      invariant(
        Array.isArray(actions) &&
          actions.length > 0 &&
          actions.length <= 64 &&
          actions[0] === attributionAction &&
          actions.every(
            (action) =>
              action?.executable?.type === "browser-run-code" &&
              action.repositoryMutationPolicy?.mode === "none" &&
              action.repositoryMutationPolicy.paths.length === 0
          ),
        "browser batch action authority is invalid"
      );
      const physical = await this.executePhysicalProgram({
        action: attributionAction,
        program: "playwright-cli",
        args,
        cwd,
        env,
        timeoutMs,
      });
      const { state, execution, outcome, before, after, repositoryFailure } = physical;
      const sensitiveOutput =
        (outcome.stdoutBytes !== null &&
          rawBytesAreSensitive(outcome.stdoutBytes, state.sensitiveValues)) ||
        (outcome.stderrBytes !== null &&
          rawBytesAreSensitive(outcome.stderrBytes, state.sensitiveValues));
      invariant(!sensitiveOutput, "local command emitted sensitive bytes");
      invariant(outcome.shapeIsCanonical, "retained process result shape is invalid");
      if (repositoryFailure !== null) {
        failPrivateAuthSettlementStage(
          attributionAction,
          "repository_boundary_failed",
          { cause: repositoryFailure, execution },
          "repository boundary failed"
        );
      }
      const processFailureClass = classifySafeRetainedProcessOutcome(outcome);
      if (processFailureClass !== null) {
        const browserErrorToken =
          processFailureClass === "browser_error_frame"
            ? projectBrowserErrorFrameToken(outcome.stdoutBytes)
            : null;
        failPrivateAuthSettlementStage(
          attributionAction,
          processFailureClass,
          { execution },
          browserErrorToken ?? "local command failed"
        );
      }
      invariant(
        Buffer.isBuffer(outcome.stdoutBytes) && Buffer.isBuffer(outcome.stderrBytes),
        "browser batch buffers are absent"
      );
      const proof = Object.freeze({});
      state.batchProofs.set(proof, {
        actions: Object.freeze([...actions]),
        nextIndex: 0,
        firstSequence: null,
        execution,
        before,
        after,
      });
      return Object.freeze({ proof, stdout: outcome.stdoutBytes, stderr: outcome.stderrBytes });
    }

    projectBatchActionResult({
      proof,
      request,
      stdout,
      stderr = Buffer.alloc(0),
      terminal = false,
    }) {
      const state = PRIVATE_AUTHORITY.get(this);
      const batch = state.batchProofs.get(proof);
      invariant(batch !== undefined, "browser batch proof is invalid or foreign");
      const action = batch.actions[batch.nextIndex];
      invariant(
        action !== undefined &&
          request?.action === action &&
          request.program === "playwright-cli" &&
          request.action.executable.type === "browser-run-code" &&
          Buffer.isBuffer(stdout) &&
          Buffer.isBuffer(stderr) &&
          stdout.length <= MAX_STREAM_BYTES &&
          stderr.length <= MAX_STREAM_BYTES &&
          typeof terminal === "boolean",
        "browser batch projection is invalid"
      );
      if (batch.firstSequence === null) batch.firstSequence = request.sequence;
      invariant(
        request.sequence === batch.firstSequence + batch.nextIndex,
        "browser batch receipt sequence drifted"
      );
      batch.nextIndex += 1;
      invariant(
        terminal || batch.nextIndex < batch.actions.length,
        "browser batch terminal frame is absent"
      );
      if (terminal) state.batchProofs.delete(proof);
      const execution = Object.freeze({
        completion: Object.freeze({ code: 0, signal: null }),
        timedOut: false,
        spawnError: false,
        stdout: Object.freeze({ bytes: stdout, exceeded: false }),
        stderr: Object.freeze({ bytes: stderr, exceeded: false }),
        termination: Object.freeze({ absent: true }),
      });
      return this.projectProgramOutcome(request, {
        state,
        execution: batch.execution,
        outcome: inspectRetainedProcessOutcome(execution, request.program),
        before: batch.before,
        after: batch.after,
        repositoryFailure: null,
      });
    }

    async executeLocal({
      action,
      sequence,
      operation,
      operationDescriptor,
      subjectKind,
      subjectIdentifier,
      run,
    }) {
      invariant(typeof operation === "string" && operation.length > 0, "local operation invalid");
      invariant(typeof run === "function", "local operation callback invalid");
      const state = PRIVATE_AUTHORITY.get(this);
      const before = await state.snapshotRepository(action.repositoryMutationPolicy.paths);
      let rawValue;
      let cause = null;
      try {
        rawValue = await run();
      } catch (error) {
        cause = error;
      }
      const after = await state.snapshotRepository(action.repositoryMutationPolicy.paths);
      assertRepositoryMutationPolicy(action, before, after);
      if (cause !== null) throw cause;
      const raw = Buffer.from(canonicalJson(rawValue) + "\n");
      invariant(raw.length <= MAX_STREAM_BYTES, "local observation exceeded 4 MiB");
      invariant(!rawBytesAreSensitive(raw, state.sensitiveValues), "local observation is sensitive");
      const empty = Buffer.alloc(0);
      const receipt = deepFreezeExact({
        runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
        sequence,
        operation,
        operationDescriptor,
        status: 0,
        evidenceSha256: hashBytes(raw),
        subjectKind,
        subjectIdentifier,
        sanitizedOutput: "",
      });
      state.rawByReceipt.set(receipt, { stdout: raw, stderr: empty, before, after });
      state.assertSafeEvidence(receipt, "TASK-540 local runtime receipt");
      return { receipt, stdout: raw, stderr: empty };
    }
  }

  return Object.freeze({
    LocalCommandAuthority,
    buildBrowserStreamIntegrity,
    configuredSensitiveValues,
    rawBytesAreSensitive,
    shellDisplay,
  });
}
