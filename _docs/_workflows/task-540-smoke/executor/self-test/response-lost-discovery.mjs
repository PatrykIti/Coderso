import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import { decodeExactNativeUtf8 } from "../output-parser.mjs";
import { RESOURCE_KIND_CONTRACTS, deepEqualJson } from "../resource-contracts.mjs";
import {
  RESOURCE_IDENTIFIER_TYPES,
  ResourceCleanupPlanner,
  ResourceLedgerBuilder,
  actionOrdinal,
  assertExactCleanupTupleSet,
  cartesianCleanupTuples,
  compileBlockedParentClosure,
  createResourceCore,
  emptyResourceDelta,
} from "../resource-ledger.mjs";

export async function runResponseLostDiscoverySelfTest({
  PendingFailureAttemptRegistry,
  RESPONSE_LOST_CREATE_ACTION_IDS,
  contentSchemaFromFields,
  discoverOneResponseLostCreate,
  discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
  evidence,
  expectAsyncFailure,
  plan,
  rawBytesAreSensitive,
  registerFailureDiscoveredResourceAfterLedgerAppend,
}) {
  const mutablePendingRegistry = new PendingFailureAttemptRegistry();
  const mutablePendingAction = plan.actionManifest.find(
    ({ id }) => id === "set-016-editable-type-create"
  );
  await expectAsyncFailure(
    async () =>
      mutablePendingRegistry.arm(mutablePendingAction, [], {
        naturalKey: { slug: "mutable" },
        baseline: { candidates: [] },
        authoredRequestSha256: hashBytes(Buffer.from("mutable-request")),
      }),
    "mutable response-lost request/baseline"
  );

  const responseLostAction = mutablePendingAction;
  const responseLostBlueprint = plan.fixtureBlueprint.contentTypes.editable;
  const responseLostAuthoredProjection = deepFreezeExact({
    name: responseLostBlueprint.name,
    slug: responseLostBlueprint.slug,
    schema: contentSchemaFromFields(responseLostBlueprint.fields),
    status: "draft",
    config: deepFreezeExact({}),
  });
  const responseLostNaturalKey = deepFreezeExact({ slug: responseLostBlueprint.slug });
  const responseLostDigest = hashBytes(Buffer.from(canonicalJson(responseLostAuthoredProjection)));
  const responseLostBaselineCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007101",
    name: "Pre-existing natural-key row",
    slug: responseLostBlueprint.slug,
    schema: deepFreezeExact({ type: "object" }),
    status: "draft",
    config: deepFreezeExact({}),
  });
  const responseLostCreatedCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007102",
    ...responseLostAuthoredProjection,
  });
  const makeResponseLostState = () => ({
    plan,
    responseLostIntents: new Map([
      [
        responseLostAction.id,
        deepFreezeExact({
          naturalKey: responseLostNaturalKey,
          authoredProjection: responseLostAuthoredProjection,
          authoredRequestSha256: responseLostDigest,
          preparedBody: null,
        }),
      ],
    ]),
    resourceKeys: new Map(),
    resourceOwners: new Map(),
    syntheticOwnerEdgeKeys: new Set(),
    fixtureIds: new Map(),
    ids: Object.create(null),
  });
  const responseLostAttempt = deepFreezeExact({
    pendingAttemptKey: "pending:response-lost-real-path",
    actionId: responseLostAction.id,
    actionOrdinal: responseLostAction.ordinal,
    kind: "content-type",
    semantic: "content-type-editable",
    naturalKey: responseLostNaturalKey,
    baseline: deepFreezeExact({ candidates: deepFreezeExact([responseLostBaselineCandidate]) }),
    authoredRequestSha256: responseLostDigest,
    failureObservationSha256: hashBytes(
      Buffer.from(canonicalJson({ name: "Error", code: "response_lost" }))
    ),
    intendedParentBlockerKeys: deepFreezeExact([]),
  });
  const discoveredState = makeResponseLostState();
  let discoveredQueryCount = 0;
  const discoveredResult = await discoverOneResponseLostCreate(
    discoveredState,
    responseLostAttempt,
    async (actionId, naturalKey) => {
      discoveredQueryCount += 1;
      invariant(
        actionId === responseLostAction.id && naturalKey === responseLostNaturalKey,
        "response-lost query input identity drift"
      );
      return deepFreezeExact({
        candidates: deepFreezeExact([responseLostBaselineCandidate, responseLostCreatedCandidate]),
      });
    }
  );
  invariant(
    discoveredQueryCount === 1 &&
      discoveredResult.failure === null &&
      discoveredResult.safeDelta.cores.length === 1 &&
      discoveredState.resourceKeys.size === 0,
    "response-lost exact discovered-create path drift"
  );
  const discoveredLedger = new ResourceLedgerBuilder();
  discoveredLedger.appendValidatedDelta(discoveredResult.safeDelta);
  registerFailureDiscoveredResourceAfterLedgerAppend(
    discoveredState,
    responseLostAttempt,
    discoveredResult.safeDelta
  );
  invariant(
    discoveredState.fixtureIds.get("content-type-editable") === responseLostCreatedCandidate.id &&
      discoveredLedger.compileResourceRecords("persistent").length === 1,
    "response-lost discovered create did not atomically join cleanup inventory"
  );
  let absentQueryCount = 0;
  const absentResult = await discoverOneResponseLostCreate(
    makeResponseLostState(),
    responseLostAttempt,
    async () => {
      absentQueryCount += 1;
      return deepFreezeExact({ candidates: deepFreezeExact([responseLostBaselineCandidate]) });
    }
  );
  invariant(
    absentQueryCount === 1 &&
      absentResult.failure === null &&
      absentResult.safeDelta.cores.length === 0,
    "response-lost exact absence path drift"
  );
  let ambiguousQueryCount = 0;
  const ambiguousBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    deepFreezeExact([responseLostAttempt]),
    (attempt) =>
      discoverOneResponseLostCreate(makeResponseLostState(), attempt, async () => {
        ambiguousQueryCount += 1;
        return deepFreezeExact({
          candidates: deepFreezeExact([
            responseLostBaselineCandidate,
            responseLostCreatedCandidate,
            deepFreezeExact({
              ...responseLostCreatedCandidate,
              id: "54000000-0000-4000-8000-000000007103",
            }),
          ]),
        });
      })
  );
  invariant(
    ambiguousQueryCount === 1 &&
      ambiguousBatch.attemptResults[0].failure?.code === "failure_discovery_ambiguous" &&
      ambiguousBatch.attemptResults[0].safeDelta.cores.length === 0,
    "response-lost ambiguity did not fail per-attempt without delete authority"
  );
  const mixedAttempts = deepFreezeExact([
    deepFreezeExact({ ...responseLostAttempt, pendingAttemptKey: "pending:mixed-discovered" }),
    deepFreezeExact({ ...responseLostAttempt, pendingAttemptKey: "pending:mixed-absent" }),
    deepFreezeExact({
      ...responseLostAttempt,
      pendingAttemptKey: "pending:mixed-ambiguous",
      intendedParentBlockerKeys: deepFreezeExact(["mixed-parent"]),
    }),
  ]);
  const mixedBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    mixedAttempts,
    async (attempt) => {
      if (attempt.pendingAttemptKey === "pending:mixed-discovered") {
        return deepFreezeExact({
          ...discoveredResult,
          pendingAttemptKey: attempt.pendingAttemptKey,
        });
      }
      if (attempt.pendingAttemptKey === "pending:mixed-absent") {
        return deepFreezeExact({
          ...absentResult,
          pendingAttemptKey: attempt.pendingAttemptKey,
        });
      }
      throw new Error("private mixed ambiguous discovery");
    }
  );
  const mixedLedger = new ResourceLedgerBuilder();
  for (const result of mixedBatch.attemptResults)
    mixedLedger.appendValidatedDelta(result.safeDelta);
  const mixedBlocked = compileBlockedParentClosure(
    { "mixed-ancestor": ["mixed-parent"], "mixed-parent": [], "mixed-independent": [] },
    mixedBatch.attemptResults.flatMap(({ intendedParentBlockerKeys }) => intendedParentBlockerKeys)
  );
  invariant(
    mixedLedger.compileResourceRecords("persistent").length === 1 &&
      mixedBatch.attemptResults.filter(({ failure }) => failure !== null).length === 1 &&
      deepEqualJson(mixedBlocked, ["mixed-ancestor", "mixed-parent"]),
    "mixed discovered/absent/ambiguous response-lost batch drift"
  );
  const pendingMatrix = new PendingFailureAttemptRegistry();
  const pendingActionA = plan.actionManifest.find(
    ({ id }) => id === RESPONSE_LOST_CREATE_ACTION_IDS[0]
  );
  const pendingActionB = plan.actionManifest.find(
    ({ id }) => id === RESPONSE_LOST_CREATE_ACTION_IDS[1]
  );
  pendingMatrix.arm(
    pendingActionA,
    [],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "pending-a" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("pending-a-authored-request")),
    })
  );
  pendingMatrix.arm(
    pendingActionB,
    ["existing-parent-key"],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "pending-b" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("pending-b-authored-request")),
    })
  );
  await expectAsyncFailure(
    async () =>
      pendingMatrix.arm(
        pendingActionA,
        [],
        deepFreezeExact({
          naturalKey: deepFreezeExact({ key: "duplicate" }),
          baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
          authoredRequestSha256: hashBytes(Buffer.from("duplicate-pending-request")),
        })
      ),
    "duplicate pending response-lost attempt"
  );
  const missingObservationRegistry = new PendingFailureAttemptRegistry();
  missingObservationRegistry.arm(
    pendingActionA,
    [],
    deepFreezeExact({
      naturalKey: deepFreezeExact({ key: "missing-observation" }),
      baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
      authoredRequestSha256: hashBytes(Buffer.from("missing-observation-request")),
    })
  );
  await expectAsyncFailure(
    async () => missingObservationRegistry.takeFrozenOnce(),
    "pending response-lost attempt missing failure observation"
  );
  pendingMatrix.retainPrimaryFailureObservation(
    Object.assign(new Error("private pending failure"), {
      code: "response_lost",
    })
  );
  const pendingAttempts = pendingMatrix.takeFrozenOnce();
  const expectedFailureObservationHash = hashBytes(
    Buffer.from(canonicalJson({ name: "Error", code: "response_lost" }))
  );
  invariant(
    pendingAttempts.every(
      ({ failureObservationSha256 }) => failureObservationSha256 === expectedFailureObservationHash
    ) && expectedFailureObservationHash !== hashBytes(Buffer.from("private pending failure")),
    "pending failure observation hash was not derived from the real private observation projection"
  );
  const responseLostBatch = await discoverResponseLostPersistentCreatesNeverThrowPerAttempt(
    pendingAttempts,
    async (attempt) => {
      if (attempt === pendingAttempts[0]) {
        return deepFreezeExact({
          pendingAttemptKey: attempt.pendingAttemptKey,
          safeDelta: emptyResourceDelta(),
          failure: null,
          intendedParentBlockerKeys: deepFreezeExact([]),
        });
      }
      throw new Error("private per-attempt adapter failure");
    }
  );
  invariant(
    responseLostBatch.attemptResults.length === 2 &&
      responseLostBatch.attemptResults[0].failure === null &&
      responseLostBatch.attemptResults[1].failure?.code === "failure_discovery_ambiguous" &&
      deepEqualJson(responseLostBatch.attemptResults[1].intendedParentBlockerKeys, [
        "existing-parent-key",
      ]),
    "response-lost mixed result batch drift"
  );
  await expectAsyncFailure(
    async () => pendingMatrix.takeFrozenOnce(),
    "pending attempt batch double consumption"
  );
  // The recorder of a primary failure cause must tolerate arriving after consumption instead of
  // raising an invariant of its own: once takeFrozenOnce has returned this deep-frozen snapshot no
  // later annotation could reach it, so recording is a no-op, and throwing here destroyed the very
  // diagnosis it was called to preserve. The preconditions that still mean something keep
  // refusing, so the relaxation is confined to the one call that cannot go wrong.
  const consumedBatchProjection = canonicalJson(pendingAttempts);
  invariant(
    pendingMatrix.retainPrimaryFailureObservation(
      Object.assign(new Error("private post-consumption observation"), { code: "response_lost" })
    ) === false &&
      canonicalJson(pendingAttempts) === consumedBatchProjection &&
      Object.isFrozen(pendingAttempts),
    "consumed pending attempt batch was altered by a late primary failure observation"
  );
  await expectAsyncFailure(
    async () =>
      pendingMatrix.arm(
        pendingActionA,
        [],
        deepFreezeExact({
          naturalKey: deepFreezeExact({ key: "post-consumption" }),
          baseline: deepFreezeExact({ candidates: deepFreezeExact([]) }),
          authoredRequestSha256: hashBytes(Buffer.from("post-consumption-request")),
        })
      ),
    "pending create arm after consumption"
  );
  await expectAsyncFailure(
    async () => pendingMatrix.settle(pendingActionA.id),
    "pending create settlement after consumption"
  );
  invariant(
    Object.keys(RESOURCE_KIND_CONTRACTS).length === 26 &&
      Object.keys(RESOURCE_KIND_CONTRACTS).every(
        (kind) =>
          RESOURCE_KIND_CONTRACTS[kind].identifierArity ===
          RESOURCE_IDENTIFIER_TYPES[RESOURCE_KIND_CONTRACTS[kind].identifierType]
      ),
    "resource kind contract exhaustiveness drift"
  );
  await expectAsyncFailure(
    async () => new ResourceLedgerBuilder({ ...RESOURCE_KIND_CONTRACTS }),
    "resource contract registry substitution"
  );
  const planBoundaryLedger = new ResourceLedgerBuilder();
  const planBoundaryCore = createResourceCore({
    kind: "user-a",
    identifier: ["54000000-0000-4000-8000-000000007001"],
    acquisitionSourceId: "set-012-user-a-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-012-user-a-create"),
    acquisitionChannel: "service",
  });
  planBoundaryLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([planBoundaryCore]),
      dependencyEdges: deepFreezeExact([]),
    })
  );
  const planBoundaryPlanner = new ResourceCleanupPlanner();
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezeTerminal([]),
    "terminal plan before persistent plan"
  );
  const planBoundaryPersistentLedger = planBoundaryLedger.compileResourceRecords("persistent");
  const planBoundaryPersistentPlan = planBoundaryPlanner.freezePersistent(
    planBoundaryPersistentLedger,
    []
  );
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezePersistent(planBoundaryPersistentLedger, []),
    "persistent plan double assignment"
  );
  const planBoundaryTerminalLedger = planBoundaryLedger.compileResourceRecords("terminal");
  const planBoundaryTerminalPlan = planBoundaryPlanner.freezeTerminal(planBoundaryTerminalLedger);
  const planBoundaryFinalLedger = planBoundaryLedger.compileResourceRecords("final");
  const planBoundaryFinalPlan = planBoundaryPlanner.freezeFinal(planBoundaryFinalLedger);
  invariant(
    planBoundaryFinalPlan.persistentActionPlan === planBoundaryPersistentPlan &&
      planBoundaryFinalPlan.terminalActionPlan === planBoundaryTerminalPlan,
    "plan boundary object identity drift"
  );
  await expectAsyncFailure(
    async () => planBoundaryPlanner.freezeFinal(planBoundaryFinalLedger),
    "final plan double assignment"
  );
  const tupleKeys = ["matrix-a", "matrix-b", "matrix-c"];
  const exactTuples = cartesianCleanupTuples(tupleKeys);
  for (let mutationIndex = 0; mutationIndex < 27; mutationIndex += 1) {
    const tupleIndex = mutationIndex % exactTuples.length;
    let mutated;
    if (mutationIndex < 9) {
      mutated = exactTuples.filter((_, index) => index !== tupleIndex);
    } else if (mutationIndex < 18) {
      mutated = [...exactTuples, exactTuples[tupleIndex]];
    } else {
      mutated = exactTuples.map((tuple, index) =>
        index === tupleIndex ? deepFreezeExact([tuple[0], "unknown-operation"]) : tuple
      );
    }
    await expectAsyncFailure(
      async () => assertExactCleanupTupleSet(mutated, tupleKeys, "tuple mutation " + mutationIndex),
      "cleanup tuple mutation " + mutationIndex
    );
  }
  for (const [label, bytes] of [
    ["native CR", Buffer.from("value\r\n")],
    ["native BOM", Buffer.from("\uFEFFvalue\n")],
    ["native NUL", Buffer.from("value\0\n")],
  ]) {
    await expectAsyncFailure(async () => decodeExactNativeUtf8(bytes, label), label);
  }
  await expectAsyncFailure(
    async () =>
      exactOwnKeys(
        { ...evidence, unexpected: true },
        Object.keys(evidence),
        "evidence unknown key",
        { plain: true }
      ),
    "canonical evidence unknown key"
  );
  invariant(
    rawBytesAreSensitive(Buffer.from("prefix-sixteen-private-suffix"), ["sixteen-private"]),
    "canonical evidence secret corpus detector drift"
  );
  return Object.freeze({ explicitNegativeCases: 2 });
}
