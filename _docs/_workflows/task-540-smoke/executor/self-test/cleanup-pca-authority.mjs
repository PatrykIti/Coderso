import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import {
  MAX_STREAM_BYTES,
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
} from "../config.mjs";
import {
  CLEANUP_OPERATION_KINDS,
  INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS,
  deepEqualJson,
} from "../resource-contracts.mjs";
import {
  ResourceLedgerBuilder,
  actionOrdinal,
  cartesianCleanupTuples,
  createResourceCore,
  emptyResourceDelta,
  lengthPrefixedTuple,
} from "../resource-ledger.mjs";
import { SingleAssignmentCaptureMap } from "../captures.mjs";
import { canonicalManifestRuntimeOperation } from "../../runtime/operation-router.mjs";

export async function runCleanupPcaAuthoritySelfTest({
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  PRIVATE_API_REQUEST_CONTEXT,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  PRIVATE_RUNTIME,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  assertCleanupReceiptBijection,
  assertCurrentResourceOwnerBridgeFailClosedSource,
  assertNegative,
  assertSeoEntryDiscoveryBridgeFailClosedSource,
  cleanupRuntimeReceipt,
  commitIntentionalPresentationOverrideActionAfterLedgerAppend,
  completeIntentionalPresentationOverrideAbsenceAuthority,
  deleteCleanupSubject,
  exactPresentationOverrideIdentifier,
  executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
  executeResourceCleanupOperation,
  expectAsyncFailure,
  hashCleanupAuthoritativeBytes,
  plan,
  proveCleanupSubjectAbsent,
  proveCleanupSubjectPresent,
  sourceCaptures,
  stageIntentionalPresentationOverrideActionReceipt,
  stageIntentionalPresentationOverrideObservation,
  successCapabilities,
}) {
  const makeCleanupAdminProbe = (responseFrames) => {
    const userId = "54000000-0000-4000-8000-000000007540";
    const sessionId = "54000000-0000-4000-8000-000000007541";
    const capability = Object.freeze({
      key: "bootstrap",
      userAgent: "TASK-540/cleanup-hash-self-test",
      userId,
    });
    const requests = [];
    const runtimeReceipts = [];
    let responseIndex = 0;
    const context = {
      async fetch(url, options) {
        requests.push(
          deepFreezeExact({
            method: options.method,
            pathname: new URL(url).pathname,
          })
        );
        invariant(responseIndex < responseFrames.length, "cleanup hash probe response underflow");
        const frame = responseFrames[responseIndex++];
        return {
          async dispose() {},
          status: () => frame.status,
          text: async () => frame.body,
        };
      },
    };
    const state = {
      assertSafeEvidence() {},
      bootstrapBaseline: { id: userId },
      deletedSubjects: new Set(),
      earlyApiSessionTuples: new Map([["bootstrap", { id: sessionId }]]),
      fixtureIds: new Map(),
      plan,
      runtimeReceiptSequence: 0,
      sessions: new Map([["bootstrap", capability]]),
    };
    PRIVATE_API_REQUEST_CONTEXT.set(
      state,
      new Map([
        [
          "bootstrap",
          {
            capability,
            context,
            csrf: "[redacted]",
            disposeProof: null,
            key: "bootstrap",
            sessionId,
            userAgent: capability.userAgent,
          },
        ],
      ])
    );
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.set(state, { restorationStarted: false });
    PRIVATE_RUNTIME.set(state, {
      authRatePolicy: null,
      csrfHeaderName: "x-coderso-csrf",
      repoEnvironment: null,
    });
    return {
      assertConsumed() {
        invariant(responseIndex === responseFrames.length, "cleanup hash probe response overflow");
      },
      requests,
      runtimeReceipts,
      state,
    };
  };
  for (const [label, byteLength] of [
    ["one-byte Buffer", 1],
    ["maximum-size Buffer", MAX_STREAM_BYTES],
  ]) {
    const authoritativeBytes = Buffer.alloc(byteLength, 0x61);
    invariant(
      hashCleanupAuthoritativeBytes(authoritativeBytes, "cleanup hash " + label) ===
        hashBytes(authoritativeBytes),
      "cleanup hash " + label + " acceptance drift"
    );
  }
  for (const [label, authoritativeBytes] of [
    ["non-Buffer", "not-authoritative-bytes"],
    ["empty Buffer", Buffer.alloc(0)],
    ["oversized Buffer", Buffer.alloc(MAX_STREAM_BYTES + 1)],
  ]) {
    await expectAsyncFailure(
      async () => hashCleanupAuthoritativeBytes(authoritativeBytes, "cleanup hash " + label),
      "cleanup hash " + label + " rejection"
    );
  }
  const cleanupAuthoritativeHashSource = hashCleanupAuthoritativeBytes.toString();
  const cleanupPositiveByteLengthToken = "authoritativeBytes.length > 0";
  const cleanupMaximumByteLengthToken = "authoritativeBytes.length <= MAX_STREAM_BYTES";
  const validatesCleanupAuthoritativeHashBounds = (source) =>
    source.split(cleanupPositiveByteLengthToken).length - 1 === 1 &&
    source.split(cleanupMaximumByteLengthToken).length - 1 === 1 &&
    !source.includes("authoritativeBytes.length > 1") &&
    !source.includes("authoritativeBytes.length < MAX_STREAM_BYTES");
  invariant(
    validatesCleanupAuthoritativeHashBounds(cleanupAuthoritativeHashSource),
    "cleanup authoritative hash boundary source drift"
  );
  for (const [label, token, replacement] of [
    ["positive byte length", cleanupPositiveByteLengthToken, "authoritativeBytes.length > 1"],
    [
      "maximum byte length",
      cleanupMaximumByteLengthToken,
      "authoritativeBytes.length < MAX_STREAM_BYTES",
    ],
  ]) {
    assertNegative(
      !validatesCleanupAuthoritativeHashBounds(
        cleanupAuthoritativeHashSource.replace(token, replacement)
      ),
      "cleanup hash " + label + " boundary mutant"
    );
  }
  const cleanupScreenId = sourceCaptures.get("screen.id");
  const cleanupEntryId = sourceCaptures.get("entry.id");
  const cleanupScreenPresentBody = JSON.stringify({
    id: cleanupScreenId,
    legalRepresentationDrift: { layout: "screen-vNext" },
  });
  const cleanupDeleteBody = JSON.stringify({ ok: true });
  const cleanupAbsentBody = JSON.stringify({ code: "not_found", representation: "vNext" });
  const cleanupPcaProbe = makeCleanupAdminProbe([
    { body: cleanupScreenPresentBody, status: 200 },
    { body: cleanupDeleteBody, status: 200 },
    { body: cleanupAbsentBody, status: 404 },
  ]);
  const cleanupScreenSubject = { kind: "screen", id: cleanupScreenId, storageKey: null };
  const cleanupPresentProof = await proveCleanupSubjectPresent(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  const cleanupDeleteProof = await deleteCleanupSubject(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  const cleanupAbsentProof = await proveCleanupSubjectAbsent(
    cleanupPcaProbe.state,
    cleanupScreenSubject
  );
  cleanupPcaProbe.assertConsumed();
  const cleanupPcaHashes = [cleanupScreenPresentBody, cleanupDeleteBody, cleanupAbsentBody].map(
    (body) => hashBytes(Buffer.from(body))
  );
  invariant(
    deepEqualJson(cleanupPresentProof, {
      observedBytesSha256: cleanupPcaHashes[0],
      output: { present: true },
    }) &&
      deepEqualJson(cleanupDeleteProof, { observedBytesSha256: cleanupPcaHashes[1] }) &&
      deepEqualJson(cleanupAbsentProof, { observedBytesSha256: cleanupPcaHashes[2] }) &&
      deepEqualJson(
        cleanupPcaProbe.requests.map(({ method }) => method),
        ["GET", "DELETE", "GET"]
      ) &&
      cleanupPcaProbe.requests.every(({ pathname }) => pathname.endsWith("/" + cleanupScreenId)),
    "cleanup production P/C/A authoritative hash drift"
  );
  assertRecursivelyFrozen(cleanupPresentProof);
  assertRecursivelyFrozen(cleanupDeleteProof);
  assertRecursivelyFrozen(cleanupAbsentProof);
  const cleanupReceiptRecord = {
    identifier: [cleanupScreenId],
    kind: "custom-screen",
  };
  const cleanupReceiptOutputs = [{ present: true }, { deleted: true }, { absent: true }];
  const cleanupHashReceipts = cleanupPcaHashes.map((observedBytesSha256, index) => {
    const operation = "cleanup-" + CLEANUP_OPERATION_KINDS[index];
    const operationDescriptor = "cleanup-hash-self-test-" + CLEANUP_OPERATION_KINDS[index];
    const output = cleanupReceiptOutputs[index];
    const receipt = cleanupRuntimeReceipt(
      cleanupPcaProbe.state,
      operation,
      operationDescriptor,
      cleanupReceiptRecord,
      output,
      observedBytesSha256
    );
    const expectedEvidenceSha256 = hashBytes(
      Buffer.from(
        canonicalJson({
          observedBytesSha256,
          operation,
          operationDescriptor,
          output,
          subjectIdentifier: cleanupScreenId,
          subjectKind: cleanupReceiptRecord.kind,
        }) + "\n"
      )
    );
    invariant(
      receipt.evidenceSha256 === expectedEvidenceSha256,
      CLEANUP_OPERATION_KINDS[index] + " cleanup receipt observed hash drift"
    );
    return receipt;
  });
  invariant(
    new Set(cleanupHashReceipts.map(({ evidenceSha256 }) => evidenceSha256)).size === 3,
    "cleanup receipt hashes did not bind exact authoritative observations"
  );
  await expectAsyncFailure(
    async () =>
      cleanupRuntimeReceipt(
        cleanupPcaProbe.state,
        "cleanup-provenance",
        "cleanup-hash-buffer-mutant",
        cleanupReceiptRecord,
        { present: true },
        Buffer.from("nonempty-authoritative-response")
      ),
    "cleanup receipt raw Buffer rejection"
  );
  await expectAsyncFailure(
    async () =>
      cleanupRuntimeReceipt(
        cleanupPcaProbe.state,
        "cleanup-provenance",
        "cleanup-hash-uppercase-mutant",
        cleanupReceiptRecord,
        { present: true },
        cleanupPcaHashes[0].toUpperCase()
      ),
    "cleanup receipt noncanonical hash rejection"
  );

  const cleanupEntryPresentBody = JSON.stringify({
    data: { legalRepresentationDrift: true },
    id: cleanupEntryId,
  });
  const cleanupEntryProbe = makeCleanupAdminProbe([{ body: cleanupEntryPresentBody, status: 200 }]);
  const cleanupEntryProof = await proveCleanupSubjectPresent(cleanupEntryProbe.state, {
    kind: "editable-entry",
    id: cleanupEntryId,
    storageKey: null,
  });
  cleanupEntryProbe.assertConsumed();
  invariant(
    cleanupEntryProof.observedBytesSha256 === hashBytes(Buffer.from(cleanupEntryPresentBody)) &&
      cleanupEntryProbe.requests[0]?.method === "GET",
    "cleanup legal Entry representation drift was rejected"
  );

  const runCleanupPcaOperationChain = async (
    probe,
    record,
    fixtureSemantic,
    fixtureId,
    executeOperation = executeResourceCleanupOperation
  ) => {
    probe.state.fixtureIds.set(fixtureSemantic, fixtureId);
    for (const operationKind of CLEANUP_OPERATION_KINDS) {
      probe.runtimeReceipts.push(await executeOperation(probe.state, record, operationKind));
    }
  };
  const cleanupPcaRejectionIsMutationFree = (probe) =>
    probe.requests.length === 1 &&
    probe.requests.every(({ method }) => method === "GET") &&
    probe.state.deletedSubjects.size === 0 &&
    probe.state.runtimeReceiptSequence === 0 &&
    probe.runtimeReceipts.length === 0;
  const cleanupScreenResourceRecord = successCapabilities.lastFinalPlan.ledger.find(
    ({ identifier, kind }) => kind === "screen-main" && identifier[0] === cleanupScreenId
  );
  invariant(cleanupScreenResourceRecord !== undefined, "cleanup Screen ledger record is absent");

  const wrongCleanupIdProbe = makeCleanupAdminProbe([
    {
      body: JSON.stringify({ id: "54000000-0000-4000-8000-000000007599" }),
      status: 200,
    },
  ]);
  await expectAsyncFailure(
    () =>
      runCleanupPcaOperationChain(
        wrongCleanupIdProbe,
        cleanupScreenResourceRecord,
        "screen",
        cleanupScreenId
      ),
    "cleanup wrong Screen ID rejection"
  );
  wrongCleanupIdProbe.assertConsumed();
  invariant(
    cleanupPcaRejectionIsMutationFree(wrongCleanupIdProbe),
    "cleanup wrong Screen ID crossed the mutation boundary"
  );
  const receiptBeforeFailureProbe = makeCleanupAdminProbe([
    {
      body: JSON.stringify({ id: "54000000-0000-4000-8000-000000007598" }),
      status: 200,
    },
  ]);
  await expectAsyncFailure(
    () =>
      runCleanupPcaOperationChain(
        receiptBeforeFailureProbe,
        cleanupScreenResourceRecord,
        "screen",
        cleanupScreenId,
        async (state, record, operationKind) => {
          receiptBeforeFailureProbe.runtimeReceipts.push(
            cleanupRuntimeReceipt(
              state,
              "cleanup-" + operationKind,
              "cleanup-pre-failure-receipt-mutant",
              record,
              { mutant: "receipt-before-failure" }
            )
          );
          return executeResourceCleanupOperation(state, record, operationKind);
        }
      ),
    "cleanup pre-failure receipt mutant execution"
  );
  receiptBeforeFailureProbe.assertConsumed();
  assertNegative(
    !cleanupPcaRejectionIsMutationFree(receiptBeforeFailureProbe),
    "cleanup pre-failure receipt mutant"
  );
  const cleanupMediaId = sourceCaptures.get("media.id");
  const cleanupMediaKey = sourceCaptures.get("media.storage-key");
  const cleanupMediaResourceRecord = successCapabilities.lastFinalPlan.ledger.find(
    ({ identifier, kind }) =>
      kind === "media-row-key" &&
      identifier[0] === cleanupMediaId &&
      identifier[1] === cleanupMediaKey
  );
  invariant(cleanupMediaResourceRecord !== undefined, "cleanup media ledger record is absent");
  for (const [label, value] of [
    [
      "wrong media key",
      { id: cleanupMediaId, key: cleanupMediaKey + ".wrong", url: "/media/" + cleanupMediaKey },
    ],
    [
      "wrong media URL",
      { id: cleanupMediaId, key: cleanupMediaKey, url: "/media/wrong/" + cleanupMediaKey },
    ],
  ]) {
    const probe = makeCleanupAdminProbe([{ body: JSON.stringify(value), status: 200 }]);
    await expectAsyncFailure(
      () => runCleanupPcaOperationChain(probe, cleanupMediaResourceRecord, "media", cleanupMediaId),
      "cleanup " + label + " rejection"
    );
    probe.assertConsumed();
    invariant(
      cleanupPcaRejectionIsMutationFree(probe),
      "cleanup " + label + " crossed the mutation boundary"
    );
  }

  const cleanupSubjectHashSourceContracts = [
    {
      label: "delete",
      source: deleteCleanupSubject.toString(),
      token: "return deepFreezeExact({ observedBytesSha256 });",
    },
    {
      label: "provenance",
      source: proveCleanupSubjectPresent.toString(),
      token: "observedBytesSha256: response.observedBytesSha256,",
    },
    {
      label: "absence",
      source: proveCleanupSubjectAbsent.toString(),
      token: "return deepFreezeExact({ observedBytesSha256: response.observedBytesSha256 });",
    },
  ];
  const validatesCleanupSubjectHashSource = (source, token) =>
    source.includes(token) &&
    source.includes("hashCleanupAuthoritativeBytes(") &&
    !source.includes("deepFreezeExact({ authoritativeBytes") &&
    !source.includes("authoritativeBytes: response.authoritativeBytes");
  for (const { label, source, token } of cleanupSubjectHashSourceContracts) {
    invariant(
      validatesCleanupSubjectHashSource(source, token),
      "cleanup " + label + " observed-hash source drift"
    );
    const mutant = source.replace(
      token,
      label === "absence"
        ? "return deepFreezeExact({ authoritativeBytes: response.authoritativeBytes });"
        : label === "provenance"
          ? "authoritativeBytes: response.authoritativeBytes,"
          : 'return deepFreezeExact({ authoritativeBytes: Buffer.from("mutant") });'
    );
    assertNegative(
      !validatesCleanupSubjectHashSource(mutant, token),
      "cleanup " + label + " raw-authoritative-bytes source mutant"
    );
  }
  const cleanupReceiptHashSource = cleanupRuntimeReceipt.toString();
  const cleanupReceiptObservedHashToken = "observedBytesSha256,\n      output,";
  const validatesCleanupReceiptHashSource = (source) =>
    source.includes(cleanupReceiptObservedHashToken) &&
    source.includes(
      'typeof observedBytesSha256 === "string" && /^[a-f0-9]{64}$/u.test(observedBytesSha256)'
    ) &&
    !source.includes("Buffer.isBuffer(observedBytesSha256)");
  invariant(
    validatesCleanupReceiptHashSource(cleanupReceiptHashSource),
    "cleanup receipt observed-hash source drift"
  );
  for (const [label, replacement] of [
    ["dropped", "observedBytesSha256: null,\n      output,"],
    ["changed", "observedBytesSha256: hashBytes(Buffer.from(observedBytesSha256)),\n      output,"],
  ]) {
    assertNegative(
      !validatesCleanupReceiptHashSource(
        cleanupReceiptHashSource.replace(cleanupReceiptObservedHashToken, replacement)
      ),
      "cleanup receipt " + label + " observed-hash source mutant"
    );
  }
  const presentationCleanupHashSource = executeResourceCleanupOperation.toString();
  const presentationCleanupHashToken = '"presentation override cleanup provenance"';
  const validatesPresentationCleanupHashSource = (source) =>
    source.includes(presentationCleanupHashToken) &&
    source.includes("observedBytesSha256 = response.observedBytesSha256;") &&
    !source.includes("observedBytes = response.authoritativeBytes;");
  invariant(
    validatesPresentationCleanupHashSource(presentationCleanupHashSource),
    "presentation override cleanup observed-hash source drift"
  );
  assertNegative(
    !validatesPresentationCleanupHashSource(
      presentationCleanupHashSource.replace(
        "observedBytesSha256 = response.observedBytesSha256;",
        "observedBytes = response.authoritativeBytes;"
      )
    ),
    "presentation override raw-authoritative-bytes source mutant"
  );
  const intentionalCleanupHashSource =
    executeIntentionalPresentationOverrideAlreadyAbsentCleanup.toString();
  const intentionalCleanupHashToken = "const observedBytesSha256 = hashBytes(";
  const validatesIntentionalCleanupHashSource = (source) =>
    source.includes(intentionalCleanupHashToken) &&
    source.includes("output,\n    observedBytesSha256\n  );");
  invariant(
    validatesIntentionalCleanupHashSource(intentionalCleanupHashSource),
    "intentional override cleanup observed-hash source drift"
  );
  assertNegative(
    !validatesIntentionalCleanupHashSource(
      intentionalCleanupHashSource.replace(
        "output,\n    observedBytesSha256\n  );",
        "output,\n    null\n  );"
      )
    ),
    "intentional override dropped observed-hash source mutant"
  );

  const overrideAuthorityActions = Object.fromEntries(
    Object.entries(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).map(([key, actionId]) => [
      key,
      plan.actionManifest.find(({ id }) => id === actionId),
    ])
  );
  invariant(
    Object.values(overrideAuthorityActions).every((action) => action !== undefined) &&
      overrideAuthorityActions.acquisition.ordinal < overrideAuthorityActions.reset.ordinal &&
      overrideAuthorityActions.reset.ordinal < overrideAuthorityActions.proof.ordinal &&
      overrideAuthorityActions.proof.ordinal <
        plan.actionManifest.find(({ id }) => id === "dg-003-builder").ordinal,
    "dg-003 intentional override reset/proof order drift"
  );
  const overrideAuthorityCaptures = new SingleAssignmentCaptureMap();
  overrideAuthorityCaptures.bind("screen.id", "54000000-0000-4000-8000-000000007501");
  overrideAuthorityCaptures.bind("entry.id", "54000000-0000-4000-8000-000000007502");
  const overrideAuthorityState = {
    assertSafeEvidence() {},
    intentionalPresentationOverrideAuthority: null,
    intentionalPresentationOverrideCleanupProof: null,
    intentionalPresentationOverrideObservations: new Map(),
    pendingIntentionalPresentationOverrideReceipts: new Map(),
    plan,
    resourceKeys: new Map(),
    runtimeReceiptSequence: 3,
    overridesCleared: false,
  };
  const makeAuthorityReceipt = (action, sequence) =>
    deepFreezeExact({
      runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
      sequence,
      operation: canonicalManifestRuntimeOperation(action),
      operationDescriptor: action.executable.operationId,
      status: 0,
      evidenceSha256: hashBytes(Buffer.from("override-authority-receipt:" + action.id)),
      subjectKind: null,
      subjectIdentifier: null,
      sanitizedOutput: "{}",
    });
  const overrideIdentifier = exactPresentationOverrideIdentifier(
    overrideAuthorityState,
    overrideAuthorityCaptures
  );
  const overrideCore = createResourceCore({
    kind: "presentation-override",
    identifier: overrideIdentifier,
    ownerSubjectIdentifier: null,
    acquisitionSourceId: "set-039-override-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-039-override-create"),
    acquisitionChannel: "admin-api",
  });
  const overrideDelta = deepFreezeExact({
    cores: deepFreezeExact([overrideCore]),
    dependencyEdges: deepFreezeExact([]),
  });
  const emptyDelta = emptyResourceDelta();
  const stageAuthorityAction = (key, sequence) => {
    const action = overrideAuthorityActions[key];
    stageIntentionalPresentationOverrideObservation(
      overrideAuthorityState,
      action,
      overrideAuthorityCaptures,
      Buffer.from("override-authority-response:" + action.id)
    );
    stageIntentionalPresentationOverrideActionReceipt(
      overrideAuthorityState,
      action,
      makeAuthorityReceipt(action, sequence)
    );
    if (key === "acquisition") {
      overrideAuthorityState.resourceKeys.set("presentation-override", overrideCore.resourceKey);
    }
    commitIntentionalPresentationOverrideActionAfterLedgerAppend(
      overrideAuthorityState,
      action,
      key === "acquisition" ? overrideDelta : emptyDelta
    );
  };
  stageAuthorityAction("acquisition", 1);
  stageAuthorityAction("reset", 2);
  invariant(
    completeIntentionalPresentationOverrideAbsenceAuthority(overrideAuthorityState) === null,
    "override reset without ss-006 proof authorized absence"
  );
  stageAuthorityAction("proof", 3);
  const completeOverrideAuthority =
    completeIntentionalPresentationOverrideAbsenceAuthority(overrideAuthorityState);
  invariant(completeOverrideAuthority !== null, "complete override absence authority was rejected");
  const overrideLedger = new ResourceLedgerBuilder();
  overrideLedger.appendValidatedDelta(overrideDelta);
  const [overrideRecord] = overrideLedger.compileResourceRecords("persistent");
  overrideAuthorityState.intentionalPresentationOverrideCleanupProof = deepFreezeExact({
    absenceOutputSha256: hashBytes(Buffer.from("fresh-current-owner-absence")),
    identifier: overrideIdentifier,
    operationDescriptor: "resource/current-owner-exact",
    proofActionReceiptSha256: completeOverrideAuthority.proof.receiptEvidenceSha256,
    resetActionReceiptSha256: completeOverrideAuthority.reset.receiptEvidenceSha256,
  });
  let freshOverrideAbsenceCalls = 0;
  const overrideCleanupReceipts = [];
  for (const operationKind of CLEANUP_OPERATION_KINDS) {
    overrideCleanupReceipts.push(
      await executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        overrideAuthorityState,
        overrideRecord,
        operationKind,
        async () => {
          freshOverrideAbsenceCalls += 1;
          return deepFreezeExact({ absent: true, affected: 0, present: false });
        }
      )
    );
  }
  const overrideOnlyPlan = deepFreezeExact({
    actionTuples: deepFreezeExact(cartesianCleanupTuples([overrideRecord.resourceKey])),
    ledger: deepFreezeExact([overrideRecord]),
  });
  assertCleanupReceiptBijection(overrideOnlyPlan, overrideCleanupReceipts);
  const intentionalOverrideObservedBytesSha256 = hashBytes(
    Buffer.from(
      canonicalJson({
        identifier: overrideRecord.identifier,
        operationDescriptor: overrideRecord.absenceOpId,
        result: { absent: true, affected: 0, present: false },
      }) + "\n"
    )
  );
  for (const [index, receipt] of overrideCleanupReceipts.entries()) {
    const operationKind = CLEANUP_OPERATION_KINDS[index];
    const output = JSON.parse(receipt.sanitizedOutput);
    const operationDescriptor =
      operationKind === "provenance"
        ? overrideRecord.provenanceOpId
        : operationKind === "delete"
          ? overrideRecord.cleanupOpId
          : overrideRecord.absenceOpId;
    invariant(
      receipt.evidenceSha256 ===
        hashBytes(
          Buffer.from(
            canonicalJson({
              observedBytesSha256: intentionalOverrideObservedBytesSha256,
              operation: "cleanup-" + operationKind,
              operationDescriptor,
              output,
              subjectIdentifier: lengthPrefixedTuple(overrideRecord.identifier),
              subjectKind: overrideRecord.kind,
            }) + "\n"
          )
        ),
      operationKind + " intentional override observed-hash receipt drift"
    );
  }
  invariant(
    freshOverrideAbsenceCalls === 3 &&
      overrideAuthorityState.overridesCleared === true &&
      overrideCleanupReceipts.every(({ sanitizedOutput }) =>
        sanitizedOutput.includes('"alreadyDeletedByExactReset":true')
      ),
    "dg-003 failure cleanup did not preserve exact override P/C/A receipts"
  );
  await expectAsyncFailure(
    async () =>
      executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        { ...overrideAuthorityState, intentionalPresentationOverrideCleanupProof: null },
        overrideRecord,
        "delete",
        async () => deepFreezeExact({ absent: true, affected: 0, present: false })
      ),
    "override cleanup without fresh exact absence proof"
  );
  await expectAsyncFailure(
    async () =>
      executeIntentionalPresentationOverrideAlreadyAbsentCleanup(
        overrideAuthorityState,
        overrideRecord,
        "delete",
        async () => deepFreezeExact({ absent: false, affected: 0, present: true })
      ),
    "override cleanup contradictory fresh absence proof"
  );
  for (const [label, mutant] of [
    [
      "current owner missing authorized-absence cardinality",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows.length !== 0",
        "overrideRows.length > 1"
      ),
    ],
    [
      "current owner ambiguous override bound",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows.length !== 1",
        "overrideRows.length < 1"
      ),
    ],
    [
      "current owner nullable override projection",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE.replace(
        "overrideRows[0] ?? null",
        "overrideRows[0]"
      ),
    ],
  ]) {
    await expectAsyncFailure(
      async () => assertCurrentResourceOwnerBridgeFailClosedSource(mutant),
      label
    );
  }

  for (const [label, mutant] of [
    [
      "SEO discovery missing entry target-type boundary",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace('eq(seoDocuments.targetType,"entry"),', ""),
    ],
    [
      "SEO discovery missing exact target-ID boundary",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace(
        "inArray(seoDocuments.targetId,input.targetIds)",
        "eq(seoDocuments.targetId,input.targetIds[0])"
      ),
    ],
    [
      "SEO discovery accepts missing target IDs",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replaceAll(
        "targetIds.length !== 6",
        "targetIds.length > 6"
      ),
    ],
    [
      "SEO discovery accepts duplicate target IDs",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replaceAll(
        "new Set(input.targetIds).size !== 6",
        "new Set(input.targetIds).size > 6"
      ),
    ],
    [
      "SEO discovery loses overflow sentinel",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE.replace(".limit(7)", ".limit(6)"),
    ],
  ]) {
    await expectAsyncFailure(
      async () => assertSeoEntryDiscoveryBridgeFailClosedSource(mutant),
      label
    );
  }

  return Object.freeze({ explicitNegativeCases: 17 });
}
