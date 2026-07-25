import {
  assertRecursivelyFrozen,
  deepFreezeExact,
  invariant,
} from "../foundation.mjs";
import { TERMINAL_RESOURCE_KINDS } from "../resource-contracts.mjs";
import {
  ResourceLedgerBuilder,
  actionOrdinal,
  compileBlockedParentClosure,
  createResourceCore,
  destructiveResourceEdge,
} from "../resource-ledger.mjs";

export async function runTerminalResourceGraphSelfTest({
  assertExactFinalResourceDependencyGraph,
  buildFakeCapabilities,
  executeSmokePlanCore,
  expectAsyncFailure,
  plan,
}) {
  const terminalCapabilities = buildFakeCapabilities({ terminalMatrix: true });
  const terminalEvidence = await executeSmokePlanCore(plan, terminalCapabilities);
  const terminalRecords = terminalEvidence.resources.filter(({ kind }) =>
    TERMINAL_RESOURCE_KINDS.has(kind)
  );
  const terminalCount = terminalRecords.length;
  invariant(
    terminalCount === 3 && terminalEvidence.cleanupReceipts.length === 72 + 3 * terminalCount,
    "dynamic terminal cleanup cardinality drift"
  );
  const terminalFinalPlan = terminalCapabilities.lastFinalPlan;
  invariant(
    terminalFinalPlan.persistentActionPlan === terminalCapabilities.lastPersistentPlan &&
      terminalFinalPlan.terminalActionPlan === terminalCapabilities.lastTerminalPlan,
    "terminal matrix stage-plan identity drift"
  );
  assertRecursivelyFrozen(terminalFinalPlan);
  const terminalSessionRecord = terminalFinalPlan.ledger.find(
    ({ kind }) => kind === "session-task"
  );
  const terminalAccessRecord = terminalFinalPlan.ledger.find(
    ({ kind }) => kind === "access-log-task-ua"
  );
  const userARecord = terminalFinalPlan.ledger.find(({ kind }) => kind === "user-a");
  invariant(
    terminalSessionRecord &&
      terminalAccessRecord &&
      userARecord &&
      terminalFinalPlan.dependencyGraph[userARecord.resourceKey].includes(
        terminalSessionRecord.resourceKey
      ) &&
      terminalFinalPlan.dependencyGraph[terminalSessionRecord.resourceKey].includes(
        terminalAccessRecord.resourceKey
      ),
    "terminal-to-user dependency graph drift"
  );
  const blockedClosure = compileBlockedParentClosure(terminalFinalPlan.dependencyGraph, [
    terminalAccessRecord.resourceKey,
  ]);
  invariant(
    blockedClosure.includes(terminalSessionRecord.resourceKey) &&
      blockedClosure.includes(userARecord.resourceKey),
    "terminal-child blocker did not propagate to user"
  );
  const terminalAbsenceSequence = terminalEvidence.cleanupReceipts.find(
    (receipt) =>
      receipt.operationDescriptor === terminalSessionRecord.absenceOpId &&
      receipt.operation === "cleanup-absence"
  )?.sequence;
  const userProvenanceSequence = terminalEvidence.cleanupReceipts.find(
    (receipt) =>
      receipt.operationDescriptor === userARecord.provenanceOpId &&
      receipt.operation === "cleanup-provenance"
  )?.sequence;
  invariant(
    Number.isSafeInteger(terminalAbsenceSequence) &&
      Number.isSafeInteger(userProvenanceSequence) &&
      terminalAbsenceSequence < userProvenanceSequence,
    "synthetic user cleanup ran before its terminal child absence proof"
  );

  const graphUserId = "54000000-0000-4000-8000-000000007201";
  const graphSessionId = "54000000-0000-4000-8000-000000007202";
  const graphAccessId = "54000000-0000-4000-8000-000000007203";
  const graphUserCore = createResourceCore({
    kind: "user-a",
    identifier: [graphUserId],
    acquisitionSourceId: "set-012-user-a-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-012-user-a-create"),
    acquisitionChannel: "service",
  });
  const graphIndependentCore = createResourceCore({
    kind: "content-type",
    identifier: ["54000000-0000-4000-8000-000000007204"],
    acquisitionSourceId: "set-018-related-a-type-create",
    sourceActionOrdinal: actionOrdinal(plan, "set-018-related-a-type-create"),
    acquisitionChannel: "admin-api",
  });
  const graphSessionCore = createResourceCore({
    kind: "session-task",
    identifier: [graphSessionId],
    ownerSubjectIdentifier: graphUserId,
    acquisitionSourceId: "terminal-task-ua-discovery",
    sourceActionOrdinal: null,
    acquisitionChannel: "terminal-db-delta",
  });
  const graphAccessCore = createResourceCore({
    kind: "access-log-task-ua",
    identifier: [graphAccessId],
    ownerSubjectIdentifier: graphSessionId,
    acquisitionSourceId: "terminal-task-ua-discovery",
    sourceActionOrdinal: null,
    acquisitionChannel: "terminal-db-delta",
  });
  const exactGraphLedger = new ResourceLedgerBuilder();
  exactGraphLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([graphUserCore, graphIndependentCore]),
      dependencyEdges: deepFreezeExact([]),
    })
  );
  exactGraphLedger.compileResourceRecords("persistent");
  exactGraphLedger.appendValidatedDelta(
    deepFreezeExact({
      cores: deepFreezeExact([graphSessionCore, graphAccessCore]),
      dependencyEdges: deepFreezeExact([
        destructiveResourceEdge(graphUserCore.resourceKey, graphSessionCore.resourceKey),
        destructiveResourceEdge(graphSessionCore.resourceKey, graphAccessCore.resourceKey),
      ]),
    })
  );
  exactGraphLedger.compileResourceRecords("terminal");
  const exactGraphRecords = exactGraphLedger.compileResourceRecords("final");
  const exactGraph = deepFreezeExact(
    Object.fromEntries(
      exactGraphRecords.map(({ resourceKey, dependsOn }) => [resourceKey, dependsOn])
    )
  );
  const exactGraphState = {
    ids: { userA: graphUserId },
    resourceKeys: new Map([
      ["user-a", graphUserCore.resourceKey],
      ["independent-content-type", graphIndependentCore.resourceKey],
      ["session-task:" + graphSessionId, graphSessionCore.resourceKey],
      ["access-log-task-ua:" + graphAccessId, graphAccessCore.resourceKey],
    ]),
    currentResourceOwnerProof: null,
  };
  invariant(
    assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, exactGraph),
    "exact final owner/dependency graph positive drift"
  );
  const omittedGraph = deepFreezeExact({
    ...exactGraph,
    [graphUserCore.resourceKey]: deepFreezeExact([]),
  });
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, omittedGraph),
    "exact owner graph omitted edge"
  );
  const reversedGraph = deepFreezeExact({
    ...exactGraph,
    [graphSessionCore.resourceKey]: deepFreezeExact([]),
    [graphAccessCore.resourceKey]: deepFreezeExact([graphSessionCore.resourceKey]),
  });
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, exactGraphRecords, reversedGraph),
    "exact owner graph reversed edge"
  );
  const wrongOwnerRecords = deepFreezeExact(
    exactGraphRecords.map((record) =>
      record.resourceKey === graphIndependentCore.resourceKey
        ? deepFreezeExact({ ...record, ownerSubjectIdentifier: graphUserId })
        : record
    )
  );
  await expectAsyncFailure(
    async () =>
      assertExactFinalResourceDependencyGraph(exactGraphState, wrongOwnerRecords, exactGraph),
    "non-owner record owner injection"
  );

  return Object.freeze({
    exactGraph,
    exactGraphRecords,
    graphAccessCore,
    graphIndependentCore,
    graphSessionCore,
    graphUserCore,
    terminalCapabilities,
    terminalEvidence,
    terminalFinalPlan,
  });
}
