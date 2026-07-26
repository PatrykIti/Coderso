import {
  AUTH_SETTLEMENT_FAILURE_FRAMES,
  DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  DIRTY_NAVIGATION_FAILURE_FRAMES,
  EMPTY_SHA256,
  LF_SHA256,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_OPEN_FAILURE_FRAMES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_FAILURE_FRAMES,
} from "../config.mjs";
import { canonicalJson, deepFreezeExact, hashBytes, invariant } from "../foundation.mjs";
import { parseRegisteredOutput } from "../output-parser.mjs";
import { registeredSelector } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { emptyResourceDelta } from "../resource-ledger.mjs";
import { playwrightArgs } from "../../browser/run-code.mjs";

export async function runSettlementDiagnosticCasesSelfTest({
  LocalCommandAuthority,
  assertNegative,
  buildBrowserStreamIntegrity,
  compileActionExecutionSpec,
  executionFixtures,
  expectAsyncFailure,
  failureBoundary,
  failureFrameFixtures,
  normalizeBrowserCommandOutput,
  plan,
  selfTestContext,
  settlementDiagnosticHarness,
  shellDisplay,
}) {
  const {
    buildPrivateBrowserInvocationWithAuthSettlementBoundary,
    classifyPrivateAuthSettlementFailureFrame,
    classifyPrivateDirtyNavigationFailureFrame,
    classifyPrivateToneOpenFailureFrame,
    classifyPrivateToneSelectFailureFrame,
    createPrivateAuthSettlementFailure,
    createPrivateDirtyNavigationFailure,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    finalizePrivateBrowserResultWithAuthSettlementBoundary,
    isExactAuthSettlementSuccessFrame,
    normalizePrivateBrowserOutputWithAuthSettlementBoundary,
    parsePrivateBrowserSuccessWithAuthSettlementBoundary,
  } = failureBoundary;
  const {
    dirtyNavigationFailureAction,
    toneOpenFailureAction,
    toneSelectFailureAction,
  } = executionFixtures;
  const { bootstrapSettlementAction, successfulGeneratedFrame } = failureFrameFixtures;
  const {
    settlementTwinAction,
    settlementPrivateMarker,
    createSensitiveScanProbe,
    runSettlementDiagnosticCase,
    createRetainedExecution,
    runLocalAuthority,
  } = settlementDiagnosticHarness;

  const credentialReceiptAction = plan.actionManifest.find(
    ({ id }) => id === "set-010-login-password"
  );
  invariant(credentialReceiptAction !== undefined, "credential receipt action is absent");
  const credentialSelector = registeredSelector(plan, "loginPassword");
  const credentialArgs = playwrightArgs("fill", credentialSelector, "ADMIN_PASSWORD");
  const credentialDisplayArgs = playwrightArgs("fill-secret");
  const credentialOutcome = {
    stdoutBytes: Buffer.from("\n"),
    stderrBytes: Buffer.alloc(0),
  };
  const credentialAuthorityResult = await runLocalAuthority(
    { action: credentialReceiptAction },
    {
      args: credentialArgs,
      displayArgs: credentialDisplayArgs,
      stdoutDiscarded: true,
      execution: createRetainedExecution({ stdout: Buffer.from("\n") }),
      sensitiveValues: [],
    }
  );
  invariant(
    credentialAuthorityResult.receipt.command ===
      shellDisplay("playwright-cli", credentialDisplayArgs) &&
      credentialAuthorityResult.receipt.sequence === 1 &&
      credentialAuthorityResult.receipt.status === 0 &&
      credentialAuthorityResult.receipt.stdoutBytes === 1 &&
      credentialAuthorityResult.receipt.stderrBytes === 0 &&
      credentialAuthorityResult.receipt.stdoutSha256 === LF_SHA256 &&
      credentialAuthorityResult.receipt.stderrSha256 === EMPTY_SHA256 &&
      credentialAuthorityResult.receipt.stdoutDiscarded === true &&
      credentialAuthorityResult.receipt.sanitizedOutput === "[discarded]" &&
      credentialAuthorityResult.stdout.equals(Buffer.from("\n")) &&
      credentialAuthorityResult.stderr.length === 0,
    "credential authority receipt integration drift"
  );
  for (const [label, override] of [
    ["program", { program: "node" }],
    ["args", { args: [...credentialArgs.slice(0, -1), "ADMIN_EMAIL"] }],
    ["display", { displayArgs: [...credentialDisplayArgs.slice(0, -1), "fill"] }],
    ["discard", { stdoutDiscarded: false }],
    ["status", { execution: createRetainedExecution({ code: 1 }) }],
    ["stdout", { execution: createRetainedExecution({ stdout: Buffer.alloc(0) }) }],
    [
      "stderr",
      {
        execution: createRetainedExecution({
          stdout: Buffer.from("\n"),
          stderr: Buffer.from("drift"),
        }),
      },
    ],
  ]) {
    await expectAsyncFailure(
      async () =>
        runLocalAuthority(
          { action: credentialReceiptAction },
          {
            args: credentialArgs,
            displayArgs: credentialDisplayArgs,
            stdoutDiscarded: true,
            execution: createRetainedExecution({ stdout: Buffer.from("\n") }),
            sensitiveValues: [],
            ...override,
          }
        ),
      "credential authority " + label + " mutation"
    );

  }
  let credentialReceiptDigestCalls = 0;
  const credentialStreamIntegrity = buildBrowserStreamIntegrity(
    {
      action: credentialReceiptAction,
      program: "playwright-cli",
      args: credentialArgs,
      displayArgs: credentialDisplayArgs,
      stdoutDiscarded: true,
      outcome: credentialOutcome,
    },
    () => {
      credentialReceiptDigestCalls += 1;
      return "0".repeat(64);
    }
  );
  const normalizedCredentialOutput = await normalizeBrowserCommandOutput(
    {},
    credentialReceiptAction,
    credentialReceiptAction.executable,
    credentialOutcome.stdoutBytes,
    { args: credentialArgs, displayArgs: credentialDisplayArgs, stdoutDiscarded: true }
  );
  invariant(
    credentialReceiptDigestCalls === 0 &&
      deepEqualJson(credentialStreamIntegrity, {
        stdoutBytes: 1,
        stderrBytes: 0,
        stdoutSha256: LF_SHA256,
        stderrSha256: EMPTY_SHA256,
      }) &&
      normalizedCredentialOutput.equals(Buffer.from('{"ok":true}\n')),
    "credential receipt fixed-integrity drift"
  );
  for (const [label, override] of [
    ["stdout", { outcome: { ...credentialOutcome, stdoutBytes: Buffer.alloc(0) } }],
    ["stderr", { outcome: { ...credentialOutcome, stderrBytes: Buffer.from("drift") } }],
    ["display", { displayArgs: [...credentialDisplayArgs.slice(0, -1), "fill"] }],
    ["discard", { stdoutDiscarded: false }],
  ]) {
    await expectAsyncFailure(
      async () =>
        buildBrowserStreamIntegrity({
          action: credentialReceiptAction,
          program: "playwright-cli",
          args: credentialArgs,
          displayArgs: credentialDisplayArgs,
          stdoutDiscarded: true,
          outcome: credentialOutcome,
          ...override,
        }),
      "credential receipt " + label
    );
  }
  let ordinaryReceiptDigestCalls = 0;
  const ordinaryOutcome = {
    stdoutBytes: Buffer.from('{"ok":true}\n'),
    stderrBytes: Buffer.alloc(0),
  };
  const ordinaryStreamIntegrity = buildBrowserStreamIntegrity(
    {
      action: settlementTwinAction,
      program: "playwright-cli",
      args: ["--raw", "self-test"],
      displayArgs: ["--raw", "self-test"],
      stdoutDiscarded: false,
      outcome: ordinaryOutcome,
    },
    (bytes) => {
      ordinaryReceiptDigestCalls += 1;
      return hashBytes(bytes);
    }
  );
  invariant(
    ordinaryReceiptDigestCalls === 2 &&
      ordinaryStreamIntegrity.stdoutSha256 === hashBytes(ordinaryOutcome.stdoutBytes) &&
      ordinaryStreamIntegrity.stderrSha256 === EMPTY_SHA256,
    "ordinary receipt evidence digest drift"
  );
  // Two local-command-authority invariants used to reach the diagnostic as "unclassified" because
  // no classifier pattern matched an executor invariant message. The runtime projection names them
  // now, so each case below states the exact token it expects rather than inheriting the catch-all
  // default — the expectation stays as strict as it was, it just says more.
  const SENSITIVE_BYTES_REASON = "wf540_rt_local_command_emitted_sensitive_bytes";
  const MALFORMED_PROCESS_RESULT_REASON = "wf540_rt_retained_process_result_shape_is_invalid";
  const exactLoginFrame = Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES.login_route, "utf8");
  await runSettlementDiagnosticCase({
    label: "exact browser frame before secret scan",
    expectedFailureClass: "login_route",
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactLoginFrame }),
        sensitiveValues: ["login_route"],
      }),
  });
  const exactToneOpenFrame = Buffer.from(
    TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact tone-open frame before secret scan",
    actionId: toneOpenFailureAction.id,
    expectedFailureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneOpenFrame }),
        sensitiveValues: [TONE_OPEN_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const exactToneSelectFrame = Buffer.from(
    TONE_SELECT_FAILURE_FRAMES[TONE_SELECT_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact tone-select frame before secret scan",
    actionId: toneSelectFailureAction.id,
    expectedFailureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame }),
        sensitiveValues: [TONE_SELECT_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const exactDirtyNavigationFrame = Buffer.from(
    DIRTY_NAVIGATION_FAILURE_FRAMES[DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]],
    "utf8"
  );
  await runSettlementDiagnosticCase({
    label: "exact dirty-navigation frame before secret scan",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0],
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
        sensitiveValues: [DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[0]],
      }),
  });
  const executeProgramSource = LocalCommandAuthority.prototype.executeProgram.toString();
  const dirtyClassifierStart = executeProgramSource.indexOf(
    "const exactDirtyNavigationFailureClass ="
  );
  const dirtyClassifierEnd = executeProgramSource.indexOf(
    "const sensitiveOutput =",
    dirtyClassifierStart
  );
  invariant(
    dirtyClassifierStart >= 0 && dirtyClassifierEnd > dirtyClassifierStart,
    "dirty-navigation process classifier source boundary drift"
  );
  const dirtyClassifierSource = executeProgramSource.slice(
    dirtyClassifierStart,
    dirtyClassifierEnd
  );
  const dirtyClassifierGuardTokens = [
    'program === "playwright-cli" &&',
    "repositoryFailure === null &&",
    "outcome.successfulBoundedAndAbsent",
  ];
  const validatesDirtyClassifierSource = (source) => {
    const required = [
      "const exactDirtyNavigationFailureClass =",
      ...dirtyClassifierGuardTokens,
      "? classifyPrivateDirtyNavigationFailureFrame(action.id, outcome.stdoutBytes)",
      ": null;",
    ];
    let previousIndex = -1;
    for (const token of required) {
      const tokenIndex = source.indexOf(token, previousIndex + 1);
      if (tokenIndex <= previousIndex) return false;
      previousIndex = tokenIndex;
    }
    return (
      source.split("classifyPrivateDirtyNavigationFailureFrame").length - 1 === 1 &&
      dirtyClassifierGuardTokens.every((token) => source.split(token).length - 1 === 1)
    );
  };
  invariant(
    validatesDirtyClassifierSource(dirtyClassifierSource),
    "dirty-navigation exact-frame classifier guard drift"
  );
  for (const [index, guardToken] of dirtyClassifierGuardTokens.entries()) {
    const mutant = dirtyClassifierSource.replace(
      guardToken,
      index === dirtyClassifierGuardTokens.length - 1 ? "true" : ""
    );
    assertNegative(
      !validatesDirtyClassifierSource(mutant),
      "dirty-navigation classifier removed guard mutant " + index
    );
  }


  await runSettlementDiagnosticCase({
    label: "non-playwright exact dirty-navigation frame remains generic",
    actionId: dirtyNavigationFailureAction.id,
    operationMustReject: false,
    operation: (context) =>
      runLocalAuthority(context, {
        program: "bun",
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
      }),
  });
  await runSettlementDiagnosticCase({
    label: "exact dirty-navigation frame repository boundary precedence",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: "repository_boundary_failed",
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactDirtyNavigationFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-open frame repository boundary precedence",
    actionId: toneOpenFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneOpenFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-open process failure remains unclassified",
    actionId: toneOpenFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: Buffer.from("### Error\nsafe\n"), code: 1 }),
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-select frame repository boundary precedence",
    actionId: toneSelectFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame }),
        postSnapshotThrows: true,
      }),
  });
  await runSettlementDiagnosticCase({
    label: "tone-select process failure remains unclassified",
    actionId: toneSelectFailureAction.id,
    operation: (context) =>
      runLocalAuthority(context, {
        execution: createRetainedExecution({ stdout: exactToneSelectFrame, code: 1 }),
      }),
  });
  for (const [label, stdout] of [
    ["non-playwright exact browser frame", exactLoginFrame],
    ["non-playwright browser marker", Buffer.from("### Error\nsafe\n")],
  ]) {
    await runSettlementDiagnosticCase({
      label,
      operationMustReject: false,
      operation: (context) =>
        runLocalAuthority(context, {
          program: "bun",
          execution: createRetainedExecution({ stdout }),
        }),
    });
  }
  for (const [label, stdout, collidingSecret] of [
    ["non-playwright exact browser frame secret scan", exactLoginFrame, "login_route"],
    ["non-playwright browser marker secret scan", Buffer.from("### Error\nsafe\n"), "### Error"],
  ]) {
    const scanProbe = createSensitiveScanProbe(collidingSecret);
    await runSettlementDiagnosticCase({
      label,
      expectedFailureReason: SENSITIVE_BYTES_REASON,
      operation: (context) =>
        runLocalAuthority(context, {
          program: "bun",
          execution: createRetainedExecution({ stdout }),
          sensitiveValues: scanProbe.sensitiveValues,
        }),
    });
    invariant(scanProbe.calls() === 1, label + " did not execute the secret scan");
  }
  const processCases = [
    [
      "process output precedence",
      "process_output_limit",
      { stdoutExceeded: true, timedOut: true, spawnError: true, terminationAbsent: false },
    ],
    [
      "process timeout precedence",
      "process_timeout",
      { timedOut: true, spawnError: true, terminationAbsent: false },
    ],
    ["process spawn anomaly", "process_runner_failed", { spawnError: true }],
    ["process runner anomaly", "process_runner_failed", { terminationAbsent: false }],
    [
      "browser error precedence",
      "browser_error_frame",
      { stdout: Buffer.from("### Error\nsafe\n"), stderr: Buffer.from("safe stderr"), code: 1 },
    ],
    ["process stderr precedence", "process_stderr_rejected", { stderr: Buffer.from("safe") }],
    ["process exit precedence", "process_exit_failed", { code: 1 }],
  ];
  const exactDirtyNavigationProcessCases = [
    ["stdout output bound", "process_output_limit", { stdoutExceeded: true }],
    ["stderr output bound", "process_output_limit", { stderrExceeded: true }],
    ["timeout", "process_timeout", { timedOut: true }],
    ["spawn anomaly", "process_runner_failed", { spawnError: true }],
    ["termination anomaly", "process_runner_failed", { terminationAbsent: false }],
    ["stderr rejection", "process_stderr_rejected", { stderr: Buffer.from("safe") }],
    ["exit failure", "process_exit_failed", { code: 1 }],
    [
      "overlapping process flags",
      "process_output_limit",
      {
        stdoutExceeded: true,
        stderrExceeded: true,
        timedOut: true,
        spawnError: true,
        terminationAbsent: false,
        stderr: Buffer.from("safe"),
        code: 1,
      },
    ],
  ];
  for (const [label, expectedFailureClass, executionOptions] of exactDirtyNavigationProcessCases) {
    await runSettlementDiagnosticCase({
      label: "exact dirty-navigation frame plus " + label,
      actionId: dirtyNavigationFailureAction.id,
      expectedFailureClass,
      operation: (context) =>
        runLocalAuthority(context, {
          execution: createRetainedExecution({
            ...executionOptions,
            stdout: exactDirtyNavigationFrame,
          }),
        }),
    });
  }
  for (const [label, failureClass, executionOptions] of processCases) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, failureClass],
      [dirtyNavigationFailureAction.id, failureClass],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(executionOptions),
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "process_runner_failed"],
    [dirtyNavigationFailureAction.id, "process_runner_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "runner throw " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) => runLocalAuthority(context, { runnerThrows: true }),
    });
  }
  const cleanMalformedExecution = Object.freeze({
    ...createRetainedExecution(),
    completion: undefined,
  });
  const secretGetterMalformedExecution = Object.freeze({
    timedOut: false,
    spawnError: false,
    stdout: Object.freeze({
      bytes: Buffer.from(settlementPrivateMarker + "\n"),
      exceeded: false,
    }),
    stderr: Object.freeze({ bytes: Buffer.alloc(0), exceeded: false }),
    get completion() {
      throw new Error(settlementPrivateMarker);
    },
    termination: Object.freeze({ absent: true }),
  });
  for (const [label, execution, postSnapshotThrows] of [
    ["clean malformed process result", cleanMalformedExecution, false],
    ["secret getter malformed process result", secretGetterMalformedExecution, true],
  ]) {
    for (const actionId of [bootstrapSettlementAction.id, settlementTwinAction.id]) {
      const scanProbe =
        execution === secretGetterMalformedExecution
          ? createSensitiveScanProbe(settlementPrivateMarker)
          : null;
      await runSettlementDiagnosticCase({
        label: label + (actionId === settlementTwinAction.id ? " non-auth" : " auth"),
        actionId,
        expectedFailureReason:
          scanProbe === null ? MALFORMED_PROCESS_RESULT_REASON : SENSITIVE_BYTES_REASON,
        operation: (context) =>
          runLocalAuthority(context, {
            execution,
            postSnapshotThrows,
            ...(scanProbe === null ? {} : { sensitiveValues: scanProbe.sensitiveValues }),
          }),
      });
      if (scanProbe !== null) {
        invariant(scanProbe.calls() === 1, label + " did not scan the retained secret buffer");
      }
    }
  }
  const overlappingProcessOptions = {
    stdoutExceeded: true,
    timedOut: true,
    spawnError: true,
    terminationAbsent: false,
    stderr: Buffer.from("safe"),
    code: 1,
  };
  const repositoryCases = [
    ["repository exact frame", { stdout: exactLoginFrame }],
    ...processCases.map(([label, , options]) => ["repository plus " + label, options]),
    ["repository plus overlapping process flags", overlappingProcessOptions],
  ];
  for (const [label, executionOptions] of repositoryCases) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "repository_boundary_failed"],
      [dirtyNavigationFailureAction.id, "repository_boundary_failed"],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(executionOptions),
            postSnapshotThrows: true,
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "repository_boundary_failed"],
    [dirtyNavigationFailureAction.id, "repository_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "pre-snapshot failure " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) =>
        runLocalAuthority(context, {
          preSnapshotThrows: true,
          assertAfter: ({ runnerCalls }) =>
            invariant(runnerCalls === 0, "pre-snapshot failure invoked process runner"),
        }),
    });
  }
  for (const [label, executionOptions] of [
    ...processCases.map(([caseLabel, , options]) => [caseLabel, options]),
    ["overlapping process flags", overlappingProcessOptions],
  ]) {
    for (const secretChannel of ["stdout", "stderr"]) {
      const secretExecutionOptions = {
        ...executionOptions,
        [secretChannel]: Buffer.from(settlementPrivateMarker + "\n"),
      };
      await runSettlementDiagnosticCase({
        label: label + " secret " + secretChannel,
        expectedFailureReason: SENSITIVE_BYTES_REASON,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(secretExecutionOptions),
          }),
      });
      await runSettlementDiagnosticCase({
        label: "repository plus " + label + " secret " + secretChannel,
        expectedFailureReason: SENSITIVE_BYTES_REASON,
        operation: (context) =>
          runLocalAuthority(context, {
            execution: createRetainedExecution(secretExecutionOptions),
            postSnapshotThrows: true,
          }),
      });
    }
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "receipt_boundary_failed"],
    [dirtyNavigationFailureAction.id, "receipt_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "command receipt " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: (context) => runLocalAuthority(context, { receiptThrows: true }),
    });
  }

  const runBrowserOutputPipeline = async (
    context,
    bytes,
    {
      outputContract = plan.registries.outputs[context.action.outputSchemaId],
      onParseAttempt = () => {},
    } = {}
  ) => {
    const commandResult = Object.freeze({ stdout: bytes });
    const normalizedBytes = await normalizePrivateBrowserOutputWithAuthSettlementBoundary(
      context.action,
      commandResult,
      () => normalizeBrowserCommandOutput({}, context.action, context.action.executable, bytes, {})
    );
    const failureClass = classifyPrivateAuthSettlementFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (failureClass !== null) throw createPrivateAuthSettlementFailure(failureClass);
    const toneOpenFailureClass = classifyPrivateToneOpenFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (toneOpenFailureClass !== null) {
      throw createPrivateToneOpenFailure(toneOpenFailureClass);
    }
    const toneSelectFailureClass = classifyPrivateToneSelectFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (toneSelectFailureClass !== null) {
      throw createPrivateToneSelectFailure(toneSelectFailureClass);
    }
    const dirtyNavigationFailureClass = classifyPrivateDirtyNavigationFailureFrame(
      context.action.id,
      normalizedBytes
    );
    if (dirtyNavigationFailureClass !== null) {
      throw createPrivateDirtyNavigationFailure(dirtyNavigationFailureClass);
    }
    return parsePrivateBrowserSuccessWithAuthSettlementBoundary(
      context.action,
      commandResult,
      normalizedBytes,
      () => {
        onParseAttempt();
        return parseRegisteredOutput(
          outputContract,
          normalizedBytes,
          context.action.id,
          selfTestContext(plan, context.action.id)
        );
      }
    );
  };
  await runSettlementDiagnosticCase({
    label: "normalized tone-open frame pipeline",
    actionId: toneOpenFailureAction.id,
    expectedFailureClass: TONE_OPEN_BROWSER_FAILURE_CLASSES[3],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(TONE_OPEN_FAILURE_FRAMES[TONE_OPEN_BROWSER_FAILURE_CLASSES[3]], "utf8")
      ),
  });
  await runSettlementDiagnosticCase({
    label: "normalized tone-select frame pipeline",
    actionId: toneSelectFailureAction.id,
    expectedFailureClass: TONE_SELECT_BROWSER_FAILURE_CLASSES[5],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(TONE_SELECT_FAILURE_FRAMES[TONE_SELECT_BROWSER_FAILURE_CLASSES[5]], "utf8")
      ),
  });
  await runSettlementDiagnosticCase({
    label: "normalized dirty-navigation frame pipeline",
    actionId: dirtyNavigationFailureAction.id,
    expectedFailureClass: DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9],
    operation: (context) =>
      runBrowserOutputPipeline(
        context,
        Buffer.from(
          DIRTY_NAVIGATION_FAILURE_FRAMES[DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES[9]],
          "utf8"
        )
      ),
  });
  for (const [label, bytes] of [
    ["invalid UTF-8", Buffer.from([0xc3, 0x28])],
    ["empty framing", Buffer.alloc(0)],
    ["multiline framing", Buffer.from("{}\n{}\n")],
  ]) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "output_normalization_failed"],
      [dirtyNavigationFailureAction.id, "output_normalization_failed"],
      [settlementTwinAction.id, null],
    ]) {
      await runSettlementDiagnosticCase({
        label:
          label +
          (expectedFailureClass === null
            ? " non-auth"
            : actionId === dirtyNavigationFailureAction.id
              ? " dirty-navigation"
              : " auth"),
        actionId,
        expectedFailureClass,
        operation: (context) => runBrowserOutputPipeline(context, bytes),
      });
    }
  }
  // Each frame is paired with the token its OWN rejection must now emit. Every one of these used
  // to report "unclassified": an output-contract invariant is labelled with the failing action
  // id, and the runtime projection abstained on the digits in that id, so no schema or predicate
  // rejection of any of the 496 actions could name itself. Pinning the exact token keeps that
  // closed — a regression in the projection shows up here as "unclassified" again.
  const genericSuccessFrames = [
    [Buffer.from("{\n"), "wf540_rt_contains_malformed_json"],
    [
      Buffer.from(
        canonicalJson({
          url: plan.fixtureBlueprint.origins.admin + "/admin/",
          userMenuVisible: "true",
          userName: "Bootstrap Admin",
        }) + "\n"
      ),
      "wf540_rt_must_be_boolean",
    ],
    [
      Buffer.from(
        canonicalJson({
          rawUrl: "safe-value",
          url: plan.fixtureBlueprint.origins.admin + "/admin/",
          userMenuVisible: true,
          userName: "Bootstrap Admin",
        }) + "\n"
      ),
      "wf540_rt_value_has_non_canonical_keys",
    ],
    [
      Buffer.from(canonicalJson({ failureClass: "unknown", settled: false }) + "\n"),
      "wf540_rt_value_has_non_canonical_keys",
    ],
    [
      Buffer.from(canonicalJson({ failureClass: "process_timeout", settled: false }) + "\n"),
      "wf540_rt_value_has_non_canonical_keys",
    ],
  ];
  for (const [index, [bytes, expectedFailureReason]] of genericSuccessFrames.entries()) {
    await runSettlementDiagnosticCase({
      label: "ineligible success frame " + index,
      expectedFailureReason,
      operation: (context) => runBrowserOutputPipeline(context, bytes),
    });
  }
  // Same pinning, one layer deeper: these frames are well formed and pass the schema, so they are
  // rejected by the output PREDICATE — the exact failure shape that blocked ru-073-light-dark-proof
  // at action 438/496 with no cause named. `wf540_rt_predicate_failed` reaching the diagnostic
  // line through the real pipeline is the end-to-end witness that the gap is closed.
  const semanticSuccessFrames = [
    [
      {
        url: plan.fixtureBlueprint.origins.admin + "/admin/wrong",
        userMenuVisible: true,
        userName: "Bootstrap Admin",
      },
      "wf540_rt_predicate_failed",
    ],
    [
      {
        url: plan.fixtureBlueprint.origins.admin + "/admin/",
        userMenuVisible: false,
        userName: "Bootstrap Admin",
      },
      "wf540_rt_predicate_failed",
    ],
    [
      {
        url: plan.fixtureBlueprint.origins.admin + "/admin/",
        userMenuVisible: true,
        userName: "",
      },
      "wf540_rt_is_too_short",
    ],
  ];
  const authSettlementOutputContract =
    plan.registries.outputs[bootstrapSettlementAction.outputSchemaId];
  for (const [index, [value, nonAuthFailureReason]] of semanticSuccessFrames.entries()) {
    for (const [actionId, expectedFailureClass] of [
      [bootstrapSettlementAction.id, "success_contract_failed"],
      [settlementTwinAction.id, null],
    ]) {
      let parseAttempts = 0;
      await runSettlementDiagnosticCase({
        label:
          "eligible semantic success failure " +
          index +
          (expectedFailureClass === null ? " non-auth" : " auth"),
        actionId,
        expectedFailureClass,
        ...(expectedFailureClass === null ? { expectedFailureReason: nonAuthFailureReason } : {}),
        operation: (context) =>
          runBrowserOutputPipeline(context, Buffer.from(canonicalJson(value) + "\n"), {
            outputContract: authSettlementOutputContract,
            onParseAttempt: () => {
              parseAttempts += 1;
            },
          }),
      });
      invariant(parseAttempts === 1, "semantic success twin did not reach the auth parser");
    }
  }
  invariant(
    isExactAuthSettlementSuccessFrame(bootstrapSettlementAction, successfulGeneratedFrame) &&
      !isExactAuthSettlementSuccessFrame(settlementTwinAction, successfulGeneratedFrame),
    "auth settlement exact success eligibility drift"
  );
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "invocation_boundary_failed"],
    [dirtyNavigationFailureAction.id, "invocation_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "invocation boundary " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: ({ action }) =>
        buildPrivateBrowserInvocationWithAuthSettlementBoundary(action, () =>
          compileActionExecutionSpec({ ...action, builder: "observe(" })
        ),
    });
  }
  for (const [actionId, expectedFailureClass] of [
    [bootstrapSettlementAction.id, "receipt_boundary_failed"],
    [dirtyNavigationFailureAction.id, "receipt_boundary_failed"],
    [settlementTwinAction.id, null],
  ]) {
    await runSettlementDiagnosticCase({
      label:
        "final result validator " +
        (expectedFailureClass === null
          ? "non-auth"
          : actionId === dirtyNavigationFailureAction.id
            ? "dirty-navigation"
            : "auth"),
      actionId,
      expectedFailureClass,
      operation: async (context) => {
        const commandResult = await runLocalAuthority(context);
        const receipt = deepFreezeExact({
          ...commandResult.receipt,
          method: null,
          pattern: null,
          sanitizedOutput: "{}",
        });
        return finalizePrivateBrowserResultWithAuthSettlementBoundary(
          context.action,
          context.action.executable,
          plan,
          commandResult,
          () =>
            deepFreezeExact({
              receipt,
              captureBindings: { unauthorized: "safe" },
              acquisitionDelta: emptyResourceDelta(),
              settledCreateOrigin: null,
            })
        );
      },
    });
  }

  return Object.freeze({ explicitNegativeCases: 10 });
}
