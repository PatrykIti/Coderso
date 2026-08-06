import { bootstrapTimestampPair } from "../bootstrap-contracts.mjs";
import { deepFreezeExact, invariant } from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runBootstrapRestorationSelfTest({
  assertNegative,
  assertSourceMutantsRejected,
  attemptBootstrapCasBridgeOnce,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_ROLLBACK_REASONS,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_RESTORE_PROOF_KEYS,
  classifyBootstrapCasBridgeFailure,
  classifyClosedBootstrapCasBridgeOutcome,
  createBootstrapRestoreReceiptOnce,
  executeBootstrapRestorationProtocol,
  expectAsyncFailure,
  initializeBootstrapLoginAuthority,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  privateCleanupFailureDiagnosticNeverThrow,
  restoreBootstrapLoginState,
  runBunBridge,
  runRetainedProcessGroup,
  selfTestBunBridgeInputForSchema,
  settleBootstrapLoginAttempt,
}) {
  const bootstrapProtocolFixture = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const bootstrapProtocolBaseline = bootstrapProtocolFixture.baseline;
  const validBootstrapCasProof = deepFreezeExact(
    Object.fromEntries(BOOTSTRAP_RESTORE_PROOF_KEYS.map((key) => [key, true]))
  );
  const bootstrapRollbackReason = "wf540_bootstrap_cas_newest_pair_mismatch";
  invariant(
    Array.isArray(BOOTSTRAP_CAS_ROLLBACK_REASONS) &&
      Object.isFrozen(BOOTSTRAP_CAS_ROLLBACK_REASONS) &&
      BOOTSTRAP_CAS_ROLLBACK_REASONS.length === 9 &&
      new Set(BOOTSTRAP_CAS_ROLLBACK_REASONS).size === 9 &&
      BOOTSTRAP_CAS_ROLLBACK_REASONS.includes(bootstrapRollbackReason),
    "bootstrap CAS rollback reason vocabulary drift"
  );
  const validBootstrapBaselineRead = deepFreezeExact({
    id: bootstrapProtocolBaseline.id,
    rawUserRow: bootstrapProtocolBaseline.rawUserRow,
    roleTuples: bootstrapProtocolBaseline.roleTuples,
  });
  const bootstrapProtocolPairOne = deepFreezeExact({
    lastLoginAt: "2026-07-16T00:00:01.000Z",
    updatedAt: "2026-07-16T00:00:01.000Z",
  });
  const bootstrapProtocolPairTwo = deepFreezeExact({
    lastLoginAt: "2026-07-16T00:00:02.000Z",
    updatedAt: "2026-07-16T00:00:02.000Z",
  });
  invariant(
    bootstrapProtocolPairOne.lastLoginAt !== bootstrapProtocolBaseline.rawUserRow.lastLoginAt &&
      bootstrapProtocolPairOne.updatedAt !== bootstrapProtocolBaseline.rawUserRow.updatedAt &&
      bootstrapProtocolPairTwo.lastLoginAt !== bootstrapProtocolPairOne.lastLoginAt &&
      bootstrapProtocolPairTwo.updatedAt !== bootstrapProtocolPairOne.updatedAt,
    "bootstrap two-successive-pair fixture drift"
  );
  const bootstrapBoundaryFailure = new Error("TASK540_PRIVATE_CAS_BOUNDARY_FAILURE");
  const bootstrapPreDispatchFailure = classifyBootstrapCasBridgeFailure(
    bootstrapBoundaryFailure,
    false
  );
  const bootstrapPostDispatchFailure = classifyBootstrapCasBridgeFailure(
    bootstrapBoundaryFailure,
    true
  );
  invariant(
    bootstrapPreDispatchFailure.kind === "rejected" &&
      bootstrapPreDispatchFailure.cause === bootstrapBoundaryFailure &&
      bootstrapPostDispatchFailure.kind === "outcome-uncertain" &&
      bootstrapPostDispatchFailure.cause === bootstrapBoundaryFailure,
    "bootstrap CAS pre-dispatch/uncertain failure classification drift"
  );
  await expectAsyncFailure(
    async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({
          kind: "rolled-back",
          proof: validBootstrapCasProof,
          reason: bootstrapRollbackReason,
        })
      ),
    "closed bootstrap rollback carrying a proof"
  );
  const classifiedRollback = classifyClosedBootstrapCasBridgeOutcome(
    deepFreezeExact({ kind: "rolled-back", proof: null, reason: bootstrapRollbackReason })
  );
  invariant(
    classifiedRollback.kind === "rejected" &&
      classifiedRollback.cause instanceof Error &&
      classifiedRollback.cause.message === bootstrapRollbackReason,
    "closed bootstrap rollback reason classification drift"
  );
  for (const [label, outcome] of [
    ["missing rollback reason", { kind: "rolled-back", proof: null }],
    [
      "unknown rollback reason",
      { kind: "rolled-back", proof: null, reason: "wf540_bootstrap_cas_unknown" },
    ],
    [
      "committed rollback reason",
      { kind: "committed", proof: validBootstrapCasProof, reason: bootstrapRollbackReason },
    ],
  ]) {
    await expectAsyncFailure(
      async () => classifyClosedBootstrapCasBridgeOutcome(deepFreezeExact(outcome)),
      label
    );
  }
  const bootstrapProtocolTraffic = deepFreezeExact({
    auditOne: "54000000-0000-4000-8000-000000007411",
    auditTwo: "54000000-0000-4000-8000-000000007412",
    sessionOne: "54000000-0000-4000-8000-000000007401",
    sessionTwo: "54000000-0000-4000-8000-000000007402",
  });
  const makeBootstrapProtocolProbe = ({ reconciliationSealed = true } = {}) => {
    const state = {
      assertSafeEvidence: () => true,
      bootstrapBaseline: bootstrapProtocolBaseline,
      bootstrapRestored: false,
      runtimeReceiptSequence: 0,
    };
    initializeBootstrapLoginAuthority(state, bootstrapProtocolBaseline);
    const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    const makeEnteredAttempt = ({
      beforeAuditIds,
      beforePair,
      beforeSessionIds,
      channel,
      userAgent,
    }) => ({
      afterPair: null,
      beforeAuditIds: deepFreezeExact([...beforeAuditIds]),
      beforePair,
      beforeSessionIds: deepFreezeExact([...beforeSessionIds]),
      changed: null,
      channel,
      newAuditIds: null,
      newSessionIds: null,
      observationError: null,
      operationReturned: true,
      provisionalAfterPair: null,
      status: "entered",
      userAgent,
    });
    const firstAttempt = makeEnteredAttempt({
      beforeAuditIds: [],
      beforePair: bootstrapTimestampPair(bootstrapProtocolBaseline),
      beforeSessionIds: [],
      channel: "ui",
      userAgent: "TASK-540/self-test-bootstrap-ui",
    });
    authority.attempts.push(firstAttempt);
    const firstSettled = settleBootstrapLoginAttempt(
      state,
      authority,
      firstAttempt,
      {
        ...bootstrapProtocolPairOne,
        auditIds: [bootstrapProtocolTraffic.auditOne],
        sessionIds: [bootstrapProtocolTraffic.sessionOne],
      },
      { requireChanged: true }
    );
    const secondAttempt = makeEnteredAttempt({
      beforeAuditIds: [bootstrapProtocolTraffic.auditOne],
      beforePair: bootstrapTimestampPair(bootstrapProtocolPairOne),
      beforeSessionIds: [bootstrapProtocolTraffic.sessionOne],
      channel: "api-bootstrap",
      userAgent: "TASK-540/self-test-bootstrap-api",
    });
    authority.attempts.push(secondAttempt);
    const secondSettled = settleBootstrapLoginAttempt(
      state,
      authority,
      secondAttempt,
      {
        ...bootstrapProtocolPairTwo,
        auditIds: [bootstrapProtocolTraffic.auditOne, bootstrapProtocolTraffic.auditTwo],
        sessionIds: [bootstrapProtocolTraffic.sessionOne, bootstrapProtocolTraffic.sessionTwo],
      },
      { requireChanged: true }
    );
    invariant(
      firstSettled === true &&
        secondSettled === true &&
        firstAttempt.status === "settled" &&
        secondAttempt.status === "settled" &&
        firstAttempt.changed === true &&
        secondAttempt.changed === true &&
        deepEqualJson(firstAttempt.beforePair, bootstrapTimestampPair(bootstrapProtocolBaseline)) &&
        deepEqualJson(firstAttempt.afterPair, bootstrapProtocolPairOne) &&
        deepEqualJson(secondAttempt.beforePair, bootstrapProtocolPairOne) &&
        deepEqualJson(secondAttempt.afterPair, bootstrapProtocolPairTwo) &&
        deepEqualJson(authority.newestOwnedPair, bootstrapProtocolPairTwo) &&
        authority.ownedSessionIds.size === 2 &&
        authority.ownedAuditIds.size === 2,
      "bootstrap real baseline-to-pair1-to-pair2 settlement drift"
    );
    authority.reconciliationSealed = reconciliationSealed;
    authority.restorationStarted = true;
    return { authority, firstAttempt, secondAttempt, state };
  };
  const validatedProtocolProbe = makeBootstrapProtocolProbe({
    reconciliationSealed: false,
  });
  let validatedReconcileCalls = 0;
  let validatedCasCalls = 0;
  let validatedReadCalls = 0;
  let validatedCasInput = null;
  const validatedProtocolProof = await executeBootstrapRestorationProtocol(
    validatedProtocolProbe.state,
    {
      async readBaselineOnce() {
        validatedReadCalls += 1;
        return validBootstrapBaselineRead;
      },
      async reconcile() {
        validatedReconcileCalls += 1;
        validatedProtocolProbe.authority.reconciliationError = null;
        validatedProtocolProbe.authority.reconciliationSealed = true;
      },
      async runCasOnce(input) {
        validatedCasCalls += 1;
        validatedCasInput = input;
        return classifyClosedBootstrapCasBridgeOutcome(
          deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof, reason: null })
        );
      },
    }
  );
  invariant(
    validatedReconcileCalls === 1 &&
      validatedCasCalls === 1 &&
      validatedReadCalls === 0 &&
      validatedCasInput.newestOwnedPair ===
        validatedProtocolProbe.authority.sealedNewestOwnedPair &&
      deepEqualJson(
        validatedCasInput.newestOwnedPair,
        validatedProtocolProbe.authority.newestOwnedPair
      ) &&
      deepEqualJson(validatedCasInput.newestOwnedPair, bootstrapProtocolPairTwo) &&
      deepEqualJson(validatedProtocolProbe.firstAttempt.newSessionIds, [
        bootstrapProtocolTraffic.sessionOne,
      ]) &&
      deepEqualJson(validatedProtocolProbe.firstAttempt.newAuditIds, [
        bootstrapProtocolTraffic.auditOne,
      ]) &&
      deepEqualJson(validatedProtocolProbe.secondAttempt.newSessionIds, [
        bootstrapProtocolTraffic.sessionTwo,
      ]) &&
      deepEqualJson(validatedProtocolProbe.secondAttempt.newAuditIds, [
        bootstrapProtocolTraffic.auditTwo,
      ]) &&
      validatedProtocolProof.resolution === "validated" &&
      validatedProtocolProof.casAttempts === 1 &&
      validatedProtocolProof.uncertainReads === 0 &&
      validatedProtocolProof.validatedInTransactionAndAfterCommit === true &&
      validatedProtocolProbe.state.bootstrapRestored === true,
    "validated bootstrap restoration protocol drift"
  );

  const uncertainCommittedProbe = makeBootstrapProtocolProbe();
  let uncertainCommittedCasCalls = 0;
  let uncertainCommittedReadCalls = 0;
  const uncertainCommittedProof = await executeBootstrapRestorationProtocol(
    uncertainCommittedProbe.state,
    {
      async readBaselineOnce() {
        uncertainCommittedReadCalls += 1;
        return validBootstrapBaselineRead;
      },
      async reconcile() {
        invariant(false, "sealed uncertain probe reconciled twice");
      },
      async runCasOnce() {
        uncertainCommittedCasCalls += 1;
        return Object.freeze({
          cause: new Error("TASK540_PRIVATE_LOST_CAS_OUTPUT"),
          kind: "outcome-uncertain",
        });
      },
    }
  );
  invariant(
    uncertainCommittedCasCalls === 1 &&
      uncertainCommittedReadCalls === 1 &&
      uncertainCommittedProof.resolution === "already-restored-after-uncertain-outcome" &&
      uncertainCommittedProof.casAttempts === 1 &&
      uncertainCommittedProof.uncertainReads === 1 &&
      uncertainCommittedProof.validatedInTransactionAndAfterCommit === false,
    "commit plus lost bridge output reconciliation drift"
  );

  const expectBootstrapProtocolFailure = async ({
    expectedFailureClass,
    probe = makeBootstrapProtocolProbe(),
    readBaselineOnce = async () => validBootstrapBaselineRead,
    reconcile = async () => {
      probe.authority.reconciliationError = null;
      probe.authority.reconciliationSealed = true;
    },
    runCasOnce = async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof, reason: null })
      ),
  }) => {
    let caught = null;
    try {
      await executeBootstrapRestorationProtocol(probe.state, {
        readBaselineOnce,
        reconcile,
        runCasOnce,
      });
    } catch (error) {
      caught = error;
    }
    const diagnostic = privateCleanupFailureDiagnosticNeverThrow(caught);
    assertNegative(
      diagnostic?.cleanupPhase === 8 && diagnostic.cleanupFailureClass === expectedFailureClass,
      "bootstrap phase 8 " + expectedFailureClass
    );
    return { caught, probe };
  };

  let reconciliationFailureCasCalls = 0;
  const reconciliationFailureProbe = makeBootstrapProtocolProbe({
    reconciliationSealed: false,
  });
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_reconciliation_failed",
    probe: reconciliationFailureProbe,
    reconcile: async () => {
      throw new Error("TASK540_PRIVATE_RECONCILIATION_FAILURE");
    },
    runCasOnce: async () => {
      reconciliationFailureCasCalls += 1;
      return classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof, reason: null })
      );
    },
  });
  invariant(
    reconciliationFailureCasCalls === 0 && reconciliationFailureProbe.authority.casAttempts === 0,
    "reconciliation failure did not prevent bootstrap CAS"
  );
  for (const [label, mutateProbe] of [
    [
      "first settlement only",
      (probe) => {
        probe.authority.attempts.pop();
      },
    ],
    [
      "stale newest-pair overwrite",
      (probe) => {
        probe.authority.newestOwnedPair = bootstrapProtocolPairOne;
      },
    ],
  ]) {
    const probe = makeBootstrapProtocolProbe();
    mutateProbe(probe);
    let casCalls = 0;
    await expectBootstrapProtocolFailure({
      expectedFailureClass: "bootstrap_reconciliation_failed",
      probe,
      runCasOnce: async () => {
        casCalls += 1;
        return classifyClosedBootstrapCasBridgeOutcome(
          deepFreezeExact({ kind: "committed", proof: validBootstrapCasProof, reason: null })
        );
      },
    });
    invariant(
      casCalls === 0 && probe.authority.casAttempts === 0,
      "bootstrap " + label + " mutant reached CAS"
    );
  }

  const rejectedCasProbe = makeBootstrapProtocolProbe();
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_cas_failed",
    probe: rejectedCasProbe,
    runCasOnce: async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "rolled-back", proof: null, reason: bootstrapRollbackReason })
      ),
  });
  invariant(
    rejectedCasProbe.authority.casAttempts === 1 && rejectedCasProbe.authority.uncertainReads === 0,
    "known bootstrap CAS failure cardinality drift"
  );

  const invalidPostProof = deepFreezeExact({
    ...validBootstrapCasProof,
    afterCommitByteIdentical: false,
    completeRowByteIdentical: false,
    restored: false,
  });
  await expectBootstrapProtocolFailure({
    expectedFailureClass: "bootstrap_post_restore_proof_failed",
    runCasOnce: async () =>
      classifyClosedBootstrapCasBridgeOutcome(
        deepFreezeExact({ kind: "committed-proof-failed", proof: invalidPostProof, reason: null })
      ),
  });

  for (const [label, invalidRead] of [
    [
      "lost output without commit",
      {
        ...validBootstrapBaselineRead,
        rawUserRow: {
          ...validBootstrapBaselineRead.rawUserRow,
          lastLoginAt: bootstrapProtocolPairTwo.lastLoginAt,
          updatedAt: bootstrapProtocolPairTwo.updatedAt,
        },
      },
    ],
    [
      "unknown user column",
      {
        ...validBootstrapBaselineRead,
        rawUserRow: { ...validBootstrapBaselineRead.rawUserRow, unknownColumn: true },
      },
    ],
    [
      "role drift",
      {
        ...validBootstrapBaselineRead,
        roleTuples: validBootstrapBaselineRead.roleTuples.map((role) => ({
          ...role,
          rolePermissions: [],
        })),
      },
    ],
    ["missing row", { id: null, rawUserRow: null, roleTuples: [] }],
    ["duplicate row projection", { ...validBootstrapBaselineRead, duplicateRowCount: 2 }],
  ]) {
    let readCalls = 0;
    const result = await expectBootstrapProtocolFailure({
      expectedFailureClass: "bootstrap_uncertain_baseline_failed",
      readBaselineOnce: async () => {
        readCalls += 1;
        return deepFreezeExact(invalidRead);
      },
      runCasOnce: async () =>
        Object.freeze({
          cause: new Error("TASK540_PRIVATE_UNCERTAIN_CAS"),
          kind: "outcome-uncertain",
        }),
    });
    invariant(
      readCalls === 1 &&
        result.probe.authority.casAttempts === 1 &&
        result.probe.authority.uncertainReads === 1 &&
        result.probe.authority.restorationProof === null,
      label + " uncertain baseline failure cardinality drift"
    );
  }

  const receiptFailureProbe = uncertainCommittedProbe;
  receiptFailureProbe.state.assertSafeEvidence = () => {
    throw new Error("TASK540_PRIVATE_RECEIPT_FAILURE");
  };
  let receiptFailure = null;
  try {
    createBootstrapRestoreReceiptOnce(
      receiptFailureProbe.state,
      receiptFailureProbe.authority.restorationProof
    );
  } catch (error) {
    receiptFailure = error;
  }
  const receiptFailureDiagnostic = privateCleanupFailureDiagnosticNeverThrow(receiptFailure);
  assertNegative(
    receiptFailureDiagnostic?.cleanupPhase === 8 &&
      receiptFailureDiagnostic.cleanupFailureClass === "bootstrap_restore_receipt_failed" &&
      receiptFailureProbe.authority.receiptAttempted === true &&
      receiptFailureProbe.authority.receipt === null &&
      receiptFailureProbe.authority.resolution === "already-restored-after-uncertain-outcome" &&
      receiptFailureProbe.authority.casAttempts === 1 &&
      receiptFailureProbe.authority.uncertainReads === 1 &&
      receiptFailureProbe.state.bootstrapRestored === true,
    "bootstrap receipt failure retained proven restoration"
  );

  const bootstrapProtocolSource = executeBootstrapRestorationProtocol.toString();
  const bootstrapProtocolRequired = [
    "const latestSettledAttempt = authority.attempts.at(-1);",
    "latestSettledAttempt.afterPair !== null",
    "deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair)",
    "authority.sealedNewestOwnedPair = deepFreezeExact({",
    "newestOwnedPair: authority.sealedNewestOwnedPair,",
    "authority.casAttempts += 1;",
    "authority.casAttempts === 1",
    "operations.runCasOnce(input)",
    'casAttempt.kind === "rejected"',
    'casAttempt.kind === "post-restore-proof-failed"',
    '"bootstrap_post_restore_proof_failed"',
    'casAttempt.kind === "validated"',
    "requireValidatedBootstrapCasProof(casAttempt.proof);",
    'casAttempt.kind === "outcome-uncertain"',
    "authority.uncertainReads += 1;",
    "authority.uncertainReads === 1",
    "operations.readBaselineOnce({",
    "validateBootstrapBaselineReadBridgeOutput(",
    'resolution = "already-restored-after-uncertain-outcome";',
    "authority.restorationProof = buildBootstrapRestorationProof(authority, resolution);",
  ];
  const validatesBootstrapProtocolSource = (source) =>
    bootstrapProtocolRequired.every((token) => source.includes(token)) &&
    source.split("operations.runCasOnce(input)").length - 1 === 1 &&
    source.split("operations.readBaselineOnce({").length - 1 === 1 &&
    source.split("authority.casAttempts += 1;").length - 1 === 1 &&
    source.split("authority.uncertainReads += 1;").length - 1 === 1 &&
    source.split("const latestSettledAttempt = authority.attempts.at(-1);").length - 1 === 1 &&
    source.indexOf("const latestSettledAttempt = authority.attempts.at(-1);") <
      source.indexOf("authority.sealedNewestOwnedPair = deepFreezeExact({") &&
    source.indexOf("authority.sealedNewestOwnedPair = deepFreezeExact({") <
      source.indexOf("operations.runCasOnce(input)") &&
    source.indexOf("operations.runCasOnce(input)") <
      source.indexOf("operations.readBaselineOnce({");
  invariant(
    validatesBootstrapProtocolSource(bootstrapProtocolSource),
    "bootstrap restoration protocol source drift"
  );
  assertSourceMutantsRejected(
    bootstrapProtocolSource,
    validatesBootstrapProtocolSource,
    bootstrapProtocolRequired,
    "bootstrap restoration protocol"
  );
  for (const [label, mutant] of [
    [
      "first settlement selected for seal",
      bootstrapProtocolSource.replace(
        "const latestSettledAttempt = authority.attempts.at(-1);",
        "const latestSettledAttempt = authority.attempts.at(0);"
      ),
    ],
    [
      "latest settlement correlation removed",
      bootstrapProtocolSource.replace(
        "deepEqualJson(authority.newestOwnedPair, latestSettledAttempt.afterPair)",
        "authority.newestOwnedPair !== null"
      ),
    ],
    [
      "second CAS write",
      bootstrapProtocolSource.replace(
        "casAttempt = validateBootstrapCasAttemptResult(await operations.runCasOnce(input));",
        "await operations.runCasOnce(input); casAttempt = validateBootstrapCasAttemptResult(await operations.runCasOnce(input));"
      ),
    ],
    [
      "two uncertain reads",
      bootstrapProtocolSource.replace(
        "const baselineRead = await operations.readBaselineOnce({",
        "await operations.readBaselineOnce({ userId: state.bootstrapBaseline.id }); const baselineRead = await operations.readBaselineOnce({"
      ),
    ],
    [
      "zero uncertain reads",
      bootstrapProtocolSource.replace(
        "const baselineRead = await operations.readBaselineOnce({",
        "const baselineRead = validBootstrapBaselineRead ?? ({"
      ),
    ],
    [
      "accept without byte identity",
      bootstrapProtocolSource.replace("validateBootstrapBaselineReadBridgeOutput(", "void ("),
    ],
    [
      "stale pair substitution",
      bootstrapProtocolSource.replace(
        "newestOwnedPair: authority.sealedNewestOwnedPair,",
        "newestOwnedPair: authority.newestOwnedPair,"
      ),
    ],
  ]) {
    assertNegative(!validatesBootstrapProtocolSource(mutant), label + " protocol mutant");
  }
  const bootstrapReceiptSource = createBootstrapRestoreReceiptOnce.toString();
  invariant(
    bootstrapReceiptSource.includes("authority.receiptAttempted = true;") &&
      bootstrapReceiptSource.includes('"bootstrap_restore_receipt_failed"') &&
      !bootstrapReceiptSource.includes("restoreBootstrapLoginState") &&
      !bootstrapReceiptSource.includes("runCasOnce") &&
      !bootstrapReceiptSource.includes("runBunBridgeOperation"),
    "bootstrap receipt separation source drift"
  );
  const retainedProcessSource = runRetainedProcessGroup.toString();
  const retainedProcessOrder = [
    "const child = spawn(file, args, {",
    "const spawnSettlementPromise = new Promise((resolve) => {",
    "const spawnSucceeded = await spawnSettlementPromise;",
    'invariant(spawnSucceeded && !spawnError, "retained process spawn failed");',
    "invariant(Number.isSafeInteger(child.pid) && child.pid > 1",
    "const leader = await readFreshProcessIdentityWithRetry(child.pid);",
    'invariant(leader.pid === leader.pgid, "retained process is not its process-group leader");',
    "const record = {",
    "if (beforeStdinDispatch !== null) beforeStdinDispatch();",
    "child.stdin.end(stdinBytes);",
  ];
  const validatesRetainedProcessDispatchBoundary = (source) => {
    let previousIndex = -1;
    for (const token of retainedProcessOrder) {
      const tokenIndex = source.indexOf(token, previousIndex + 1);
      if (tokenIndex <= previousIndex) return false;
      previousIndex = tokenIndex;
    }
    return (
      source.includes("beforeStdinDispatch = null") &&
      source.includes(
        'beforeStdinDispatch === null || typeof beforeStdinDispatch === "function"'
      ) &&
      source.split("const spawnSucceeded = await spawnSettlementPromise;").length - 1 === 1 &&
      source.split('invariant(spawnSucceeded && !spawnError, "retained process spawn failed");')
        .length -
        1 ===
        1 &&
      source.split("if (beforeStdinDispatch !== null) beforeStdinDispatch();").length - 1 === 1 &&
      source.split("child.stdin.end(stdinBytes);").length - 1 === 1
    );
  };
  invariant(
    validatesRetainedProcessDispatchBoundary(retainedProcessSource),
    "retained process stdin dispatch boundary drift"
  );
  for (const [label, mutant] of [
    [
      "spawn settlement proof removed",
      retainedProcessSource.replace(
        'invariant(spawnSucceeded && !spawnError, "retained process spawn failed");',
        "void spawnSucceeded;"
      ),
    ],
    [
      "boundary before PID retention",
      retainedProcessSource
        .replace("if (beforeStdinDispatch !== null) beforeStdinDispatch();", "")
        .replace(
          "invariant(Number.isSafeInteger(child.pid) && child.pid > 1",
          "if (beforeStdinDispatch !== null) beforeStdinDispatch();\n  invariant(Number.isSafeInteger(child.pid) && child.pid > 1"
        ),
    ],
    [
      "boundary after stdin dispatch",
      retainedProcessSource
        .replace("if (beforeStdinDispatch !== null) beforeStdinDispatch();", "")
        .replace(
          "child.stdin.end(stdinBytes);",
          "child.stdin.end(stdinBytes);\n    if (beforeStdinDispatch !== null) beforeStdinDispatch();"
        ),
    ],
    [
      "process-group proof removed",
      retainedProcessSource.replace(
        'invariant(leader.pid === leader.pgid, "retained process is not its process-group leader");',
        "void leader.pgid;"
      ),
    ],
    [
      "retained record removed",
      retainedProcessSource.replace("const record = {", "const unretainedRecord = {"),
    ],
  ]) {
    assertNegative(
      !validatesRetainedProcessDispatchBoundary(mutant),
      "bootstrap CAS " + label + " mutant"
    );
  }
  const bunBridgeSource = runBunBridge.toString();
  const validatesBunBridgeDispatchBoundary = (source) =>
    source.includes("beforeStdinDispatch: executionBoundaryObserver,") &&
    source.includes("stdinBytes: frame,") &&
    source.split("beforeStdinDispatch: executionBoundaryObserver,").length - 1 === 1 &&
    !source.includes("executionBoundaryObserver();") &&
    source.indexOf("stdinBytes: frame,") <
      source.indexOf("beforeStdinDispatch: executionBoundaryObserver,");
  invariant(
    validatesBunBridgeDispatchBoundary(bunBridgeSource),
    "Bun bridge execution boundary forwarding drift"
  );
  const validatesBootstrapCasFreshProcessRouting = (source) =>
    source.includes(
      'const requiresFreshBootstrapCas =\n      descriptor.operationId === "resource/bootstrap-cas-restore";'
    ) &&
    source.includes(
      "persistentBunBridgeDispatcher !== null && !requiresFreshBootstrapCas"
    ) &&
    source.includes('throw new Error("wf540_bootstrap_cas_one_shot_failed");') &&
    source.split('descriptor.operationId === "resource/bootstrap-cas-restore"').length - 1 === 1 &&
    source.split("persistentBunBridgeDispatcher(").length - 1 === 1 &&
    source.indexOf("persistentBunBridgeDispatcher !== null && !requiresFreshBootstrapCas") <
      source.indexOf("persistentBunBridgeDispatcher(") &&
    source.indexOf("const execution = await runRetainedProcessGroup({") <
      source.indexOf('throw new Error("wf540_bootstrap_cas_one_shot_failed");');
  invariant(
    validatesBootstrapCasFreshProcessRouting(bunBridgeSource),
    "bootstrap CAS fresh-process routing drift"
  );
  for (const [label, mutant] of [
    [
      "boundary crossed before retained runner",
      bunBridgeSource.replace(
        "const execution = await runRetainedProcessGroup({",
        "if (executionBoundaryObserver !== null) executionBoundaryObserver();\n  const execution = await runRetainedProcessGroup({"
      ),
    ],
    [
      "boundary observer not forwarded",
      bunBridgeSource.replace(
        "beforeStdinDispatch: executionBoundaryObserver,",
        "beforeStdinDispatch: null,"
      ),
    ],
  ]) {
    assertNegative(!validatesBunBridgeDispatchBoundary(mutant), "Bun bridge " + label + " mutant");
  }
  for (const [label, mutant] of [
    [
      "persistent routing restored",
      bunBridgeSource.replace(" && !requiresFreshBootstrapCas", ""),
    ],
    [
      "isolated operation substituted",
      bunBridgeSource.replace("resource/bootstrap-cas-restore", "resource/bootstrap-baseline-read"),
    ],
    [
      "safe failure token removed",
      bunBridgeSource.replace("wf540_bootstrap_cas_one_shot_failed", "bootstrap CAS failed"),
    ],
  ]) {
    assertNegative(
      !validatesBootstrapCasFreshProcessRouting(mutant),
      "bootstrap CAS " + label + " mutant"
    );
  }
  const bootstrapAttemptSource = attemptBootstrapCasBridgeOnce.toString();
  const bootstrapAttemptRequired = [
    "let executionBoundaryCrossed = false;",
    "outcome = await runBunBridgeOperation(",
    '"resource/bootstrap-cas-restore"',
    'invariant(!executionBoundaryCrossed, "bootstrap CAS execution boundary repeated");',
    "executionBoundaryCrossed = true;",
    "classifyBootstrapCasBridgeFailure(cause, executionBoundaryCrossed)",
    "classifyClosedBootstrapCasBridgeOutcome(outcome)",
  ];
  const validatesBootstrapAttemptSource = (source) =>
    bootstrapAttemptRequired.every((token) => source.includes(token)) &&
    source.split("runBunBridgeOperation(").length - 1 === 1 &&
    source.split('"resource/bootstrap-cas-restore"').length - 1 === 1 &&
    source.split("executionBoundaryCrossed = true;").length - 1 === 1 &&
    source.split("classifyClosedBootstrapCasBridgeOutcome(outcome)").length - 1 === 1 &&
    source.indexOf("outcome = await runBunBridgeOperation(") <
      source.indexOf("executionBoundaryCrossed = true;") &&
    source.indexOf("executionBoundaryCrossed = true;") <
      source.indexOf("classifyClosedBootstrapCasBridgeOutcome(outcome)");
  invariant(
    validatesBootstrapAttemptSource(bootstrapAttemptSource),
    "bootstrap CAS exact attempt helper source drift"
  );
  assertSourceMutantsRejected(
    bootstrapAttemptSource,
    validatesBootstrapAttemptSource,
    bootstrapAttemptRequired,
    "bootstrap CAS exact attempt helper"
  );
  const restoreBootstrapSource = restoreBootstrapLoginState.toString();
  const validatesRestoreBootstrapAttemptPath = (source) =>
    source.includes("runCasOnce: (input) => attemptBootstrapCasBridgeOnce(state, input)") &&
    source.split("attemptBootstrapCasBridgeOnce(state, input)").length - 1 === 1;
  invariant(
    validatesRestoreBootstrapAttemptPath(restoreBootstrapSource),
    "bootstrap restoration production attempt path drift"
  );
  const duplicateAttemptPathMutant = restoreBootstrapSource.replace(
    "attemptBootstrapCasBridgeOnce(state, input)",
    "attemptBootstrapCasBridgeOnce(state, input).then(() => attemptBootstrapCasBridgeOnce(state, input))"
  );
  assertNegative(
    !validatesRestoreBootstrapAttemptPath(duplicateAttemptPathMutant),
    "bootstrap restoration duplicate attempt helper mutant"
  );
  // These tokens keep the predicate LIST intact - one predicate per column, none deleted,
  // substituted or duplicated. They deliberately no longer pin the bind FORMS: pinning
  // `notDistinct(users.emailEncrypted, ...)` as a source token is exactly how a statement that
  // could never be dispatched coexisted with a green self-test for the whole life of this bridge.
  // The executable authority on the bind forms is bootstrap-cas-bind-forms.mjs, which compiles
  // these predicates through drizzle and asserts every bound parameter is a string or NULL.
  const bootstrapCasPredicateTokens = [
    "notDistinctUuid(users.id, input.userId)",
    "notDistinctText(users.email, input.baseline.rawUserRow.email)",
    "notDistinctText(users.emailHash, input.baseline.rawUserRow.emailHash)",
    "notDistinctJsonb(users.emailEncrypted, input.baseline.rawUserRow.emailEncrypted)",
    "notDistinctText(users.passwordHash, input.baseline.rawUserRow.passwordHash)",
    "notDistinctText(users.name, input.baseline.rawUserRow.name)",
    "notDistinctText(users.status, input.baseline.rawUserRow.status)",
    "notDistinctTimestampMs(users.createdAt, input.baseline.rawUserRow.createdAt)",
    "notDistinctTimestampMs(users.updatedAt, input.newestOwnedPair.updatedAt)",
    "notDistinctTimestampMs(users.lastLoginAt, input.newestOwnedPair.lastLoginAt)",
  ];
  const bootstrapCasRollbackGuardTokens = BOOTSTRAP_CAS_ROLLBACK_REASONS.map(
    (reason) => `rollbackKnown("${reason}")`
  );
  const bootstrapCasSourceRequired = [
    `const rollbackReasons = Object.freeze(${JSON.stringify(BOOTSTRAP_CAS_ROLLBACK_REASONS)})`,
    "const knownRollbacks = Object.freeze(Object.fromEntries(rollbackReasons.map((reason)=>[",
    'reason,Object.freeze({ kind:"wf540_bootstrap_known_rollback",reason }),',
    "const rollbackKnown = (reason) => {",
    'if (rollback === undefined) throw new Error("wf540_bootstrap_cas_reason_drift");',
    "let transactionProof = null;",
    "let rollbackReason = null;",
    "transactionProof = await db.transaction(async (tx) => {",
    "const predicates = (",
    "(sql,users,input);",
    "const updated = await tx.update(users).set({",
    "}).where(and(...predicates)).returning();",
    "const knownReason = rollbackReasons.find((reason)=>error === knownRollbacks[reason]) ?? null;",
    "if (knownReason === null) throw error;",
    "rollbackReason = knownReason;",
    'if (rollbackReason === null) throw new Error("wf540_bootstrap_cas_reason_absent");',
    'output = { kind:"rolled-back",proof:null,reason:rollbackReason };',
    'if (rollbackReason !== null) throw new Error("wf540_bootstrap_cas_reason_unexpected");',
    'output = { kind:restored ? "committed" : "committed-proof-failed",proof,reason:null };',
  ];
  const validatesBootstrapCasSource = (source) =>
    bootstrapCasSourceRequired.every((token) => source.includes(token)) &&
    bootstrapCasPredicateTokens.every((token) => source.split(token).length - 1 === 1) &&
    bootstrapCasRollbackGuardTokens.every((token) => source.split(token).length - 1 === 1) &&
    new Set(bootstrapCasPredicateTokens).size === 10 &&
    bootstrapCasRollbackGuardTokens.length === 9 &&
    new Set(bootstrapCasRollbackGuardTokens).size === 9 &&
    BOOTSTRAP_CAS_ROLLBACK_REASONS.every(
      (reason) => source.split(`"${reason}"`).length - 1 === 2
    ) &&
    source.split("notDistinctUuid(users.").length - 1 === 1 &&
    source.split("notDistinctText(users.").length - 1 === 5 &&
    source.split("notDistinctJsonb(users.").length - 1 === 1 &&
    source.split("notDistinctTimestampMs(users.").length - 1 === 3 &&
    source.split("tx.update(users)").length - 1 === 1 &&
    source.split("}).where(and(...predicates)).returning();").length - 1 === 1 &&
    source.split('output = { kind:"rolled-back",proof:null,reason:rollbackReason };').length - 1 ===
      1 &&
    source.split('"committed-proof-failed"').length - 1 === 1 &&
    source.includes("IS NOT DISTINCT FROM");
  invariant(
    validatesBootstrapCasSource(BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE),
    "bootstrap CAS bridge source drift"
  );
  assertSourceMutantsRejected(
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
    validatesBootstrapCasSource,
    bootstrapCasSourceRequired,
    "bootstrap CAS bridge closed outcome"
  );
  for (const [index, predicate] of bootstrapCasPredicateTokens.entries()) {
    const substitute =
      bootstrapCasPredicateTokens[(index + 1) % bootstrapCasPredicateTokens.length];
    for (const [mutation, mutant] of [
      ["deletion", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, "true")],
      ["substitution", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, substitute)],
      [
        "duplication",
        BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(predicate, predicate + "," + predicate),
      ],
    ]) {
      assertNegative(
        !validatesBootstrapCasSource(mutant),
        "bootstrap CAS predicate " + (index + 1) + " " + mutation + " mutant"
      );
    }
  }
  for (const [label, mutant] of [
    [
      "second update",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        "const updated = await tx.update(users).set({",
        "await tx.update(users).set({}); const updated = await tx.update(users).set({"
      ),
    ],
    [
      "zero-row rollback removed",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'if (updated.length !== 1) rollbackKnown("wf540_bootstrap_cas_update_cardinality");',
        "void updated.length;"
      ),
    ],
    [
      "known rollback made uncertain",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'output = { kind:"rolled-back",proof:null,reason:rollbackReason };',
        'throw new Error("wf540_known_rollback_hidden");'
      ),
    ],
    [
      "rollback reason replaced with data",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'rollbackKnown("wf540_bootstrap_cas_newest_pair_mismatch")',
        "rollbackKnown(input.userId)"
      ),
    ],
    [
      "invalid postcommit proof marked committed",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.replace(
        'output = { kind:restored ? "committed" : "committed-proof-failed",proof,reason:null };',
        'output = { kind:"committed",proof,reason:null };'
      ),
    ],
  ]) {
    assertNegative(!validatesBootstrapCasSource(mutant), "bootstrap CAS " + label + " mutant");
  }
  invariant(
    BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".limit(2)") &&
      BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(
        'throw new Error("wf540_bootstrap_baseline_read_columns")'
      ) &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".update(") &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".insert(") &&
      !BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE.includes(".delete("),
    "bootstrap CAS/read-only bridge source drift"
  );
}
