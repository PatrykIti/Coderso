import {
  assertRecursivelyFrozen,
  deepFreezeExact,
  invariant,
} from "../foundation.mjs";
import { TERMINAL_RESOURCE_KINDS, deepEqualJson } from "../resource-contracts.mjs";
import {
  ResourceLedgerBuilder,
  actionOrdinal,
  compileBlockedParentClosure,
  createResourceCore,
  destructiveResourceEdge,
} from "../resource-ledger.mjs";
import { createTaskTrafficAuthority, taskUserAgents } from "../task-traffic.mjs";
import { terminalResourceDelta } from "../terminal-resource-graph.mjs";

export async function runTerminalResourceGraphSelfTest({
  assertExactFinalResourceDependencyGraph,
  assertNegative,
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

  // Cleanup phase 5 reads the one UNFILTERED table in the task-traffic snapshot, so every session
  // another agent creates against this shared test database lands beside the run's own. Requiring
  // each new row to carry a task user-agent was therefore an assertion of exclusive ownership of a
  // shared database: no correct application behaviour can satisfy it while a second agent logs in,
  // and it is what ended a run that had completed all 496 actions. New rows are partitioned
  // instead. Excluding foreign rows from the DELTA is the load-bearing half — terminalResourceDelta
  // turns delta.session into `session-task` resources the terminal plan DELETES, so relaxing the
  // assertion alone would have made this smoke destroy another agent's live session.
  const trafficAgents = taskUserAgents({ plan });
  const trafficUserAId = "54000000-0000-4000-8000-000000009001";
  const trafficUserBId = "54000000-0000-4000-8000-000000009002";
  const trafficForeignUserId = "54000000-0000-4000-8000-000000009003";
  const trafficBaselineSessionId = "54000000-0000-4000-8000-00000000a001";
  const trafficTaskSessionId = "54000000-0000-4000-8000-00000000a002";
  const trafficForeignSessionId = "54000000-0000-4000-8000-00000000a003";
  const trafficForeignUserAgent = "curl/8.14.1";
  const trafficSessionRow = (id, userId, userAgent) => ({ id, userAgent, userId });
  const buildTrafficState = () => ({
    plan,
    apiContextsClosed: true,
    sessions: new Set(),
    bootstrapBaseline: null,
    earlyApiSessionTuples: new Map(),
    ids: { userA: trafficUserAId, userB: trafficUserBId },
    taskTrafficBaseline: deepFreezeExact({
      accessIds: deepFreezeExact([]),
      auditIds: deepFreezeExact([]),
      sessionIds: deepFreezeExact([trafficBaselineSessionId]),
    }),
    taskTrafficPollCount: 0,
  });
  const buildTrafficAuthority = (completeSessionsForPoll) => {
    let pollCount = 0;
    return createTaskTrafficAuthority({
      PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY: new WeakMap(),
      authoritativeProofRuntimeReceipt: () => deepFreezeExact({}),
      delayMilliseconds: async () => {},
      privateApiContextRegistry: () => new Map(),
      privateEphemeralApiContextRegistry: () => new Map(),
      runBunBridgeOperation: async (_state, operationId, input) => {
        invariant(
          operationId === "terminal/task-traffic-snapshot" &&
            deepEqualJson(input.userAgents, trafficAgents),
          "self-test task traffic snapshot request drift"
        );
        pollCount += 1;
        const completeSession = [...completeSessionsForPoll(pollCount)].sort((left, right) =>
          left.id.localeCompare(right.id)
        );
        return deepFreezeExact({
          access: deepFreezeExact([]),
          audit: deepFreezeExact([]),
          completeSession: deepFreezeExact(completeSession),
          session: deepFreezeExact(
            completeSession.filter(({ userAgent }) => trafficAgents.includes(userAgent))
          ),
        });
      },
    });
  };
  const trafficBaselineRow = () =>
    trafficSessionRow(
      trafficBaselineSessionId,
      trafficUserAId,
      plan.fixtureBlueprint.userAgents.browser
    );
  const trafficTaskRow = () =>
    trafficSessionRow(trafficTaskSessionId, trafficUserAId, plan.fixtureBlueprint.userAgents.apiUserA);
  const toleratedState = buildTrafficState();
  const toleratedDelta = await buildTrafficAuthority(() => [
    trafficBaselineRow(),
    trafficTaskRow(),
    trafficSessionRow(trafficForeignSessionId, trafficForeignUserId, trafficForeignUserAgent),
  ]).readStableTaskTrafficDelta(toleratedState);
  const toleratedTerminalDelta = terminalResourceDelta(
    { ids: { userA: trafficUserAId, userB: trafficUserBId }, resourceKeys: new Map() },
    toleratedDelta
  );
  assertNegative(
    deepEqualJson(
      toleratedDelta.session.map(({ id }) => id),
      [trafficTaskSessionId]
    ) &&
      toleratedTerminalDelta.cores.every(
        ({ identifier }) => identifier[0] !== trafficForeignSessionId
      ) &&
      toleratedState.taskTrafficPollCount === 2,
    "foreign session tolerated and excluded from the terminal deletion delta"
  );
  // Foreign login churn between polls must not stop the stable-delta loop converging, because the
  // delta it compares no longer contains the churning rows.
  const churnState = buildTrafficState();
  const churnDelta = await buildTrafficAuthority((poll) => [
    trafficBaselineRow(),
    trafficTaskRow(),
    trafficSessionRow(
      "54000000-0000-4000-8000-00000000b00" + String(poll % 10),
      trafficForeignUserId,
      trafficForeignUserAgent + "-" + poll
    ),
  ]).readStableTaskTrafficDelta(churnState);
  assertNegative(
    deepEqualJson(
      churnDelta.session.map(({ id }) => id),
      [trafficTaskSessionId]
    ) && churnState.taskTrafficPollCount === 2,
    "foreign session churn blocking terminal delta stability"
  );
  // Both sharpened guarantees still refuse: a session for a user only this run created must carry a
  // task user-agent, and anything wearing this run's fixture prefix must be one of the four exact
  // agents. Either would catch a real user-agent propagation defect.
  await expectAsyncFailure(
    async () =>
      buildTrafficAuthority(() => [
        trafficBaselineRow(),
        trafficTaskRow(),
        trafficSessionRow(trafficForeignSessionId, trafficUserBId, trafficForeignUserAgent),
      ]).readStableTaskTrafficDelta(buildTrafficState()),
    "task-owned user session under a foreign user-agent"
  );
  await expectAsyncFailure(
    async () =>
      buildTrafficAuthority(() => [
        trafficBaselineRow(),
        trafficTaskRow(),
        trafficSessionRow(
          trafficForeignSessionId,
          trafficForeignUserId,
          plan.fixtureBlueprint.fixturePrefix + "-browser-impostor"
        ),
      ]).readStableTaskTrafficDelta(buildTrafficState()),
    "task-prefixed session under an inexact user-agent"
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
