// Task-owned traffic delta authority for the TASK-540 smoke executor.
//
// Owns the exact task user-agent inventory, the bounded stable terminal task-traffic delta
// discovery that runs after every API context is closed, and the authoritative bounded
// stable-poll proof receipts emitted around the task-owned terminal deletions.
import {
  MAX_COMPLETE_SESSION_ROWS,
  MAX_TASK_TRAFFIC_ROWS,
} from "./config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";

export function taskUserAgents(state) {
  return [
    state.plan.fixtureBlueprint.userAgents.browser,
    state.plan.fixtureBlueprint.userAgents.publicPreflight,
    state.plan.fixtureBlueprint.userAgents.apiBootstrap,
    state.plan.fixtureBlueprint.userAgents.apiUserA,
  ];
}

export function createTaskTrafficAuthority(dependencies) {
  // The API request context registries, the bootstrap login authority, the bounded delay, the Bun
  // bridge runner and the authoritative proof receipt builder belong to authorities the facade
  // composes, so they arrive as injected dependencies and every declaration below closes over
  // those exact values instead of a rebindable module slot.
  exactOwnKeys(
    dependencies,
    [
      "PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY",
      "authoritativeProofRuntimeReceipt",
      "delayMilliseconds",
      "privateApiContextRegistry",
      "privateEphemeralApiContextRegistry",
      "runBunBridgeOperation",
    ],
    "task traffic authority dependencies",
    { plain: true }
  );
  invariant(
    dependencies.PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY instanceof WeakMap,
    "task traffic authority bootstrap login authority is not a WeakMap"
  );
  invariant(
    [
      "authoritativeProofRuntimeReceipt",
      "delayMilliseconds",
      "privateApiContextRegistry",
      "privateEphemeralApiContextRegistry",
      "runBunBridgeOperation",
    ].every((key) => typeof dependencies[key] === "function"),
    "task traffic authority dependencies are not callable"
  );
  const {
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    authoritativeProofRuntimeReceipt,
    delayMilliseconds,
    privateApiContextRegistry,
    privateEphemeralApiContextRegistry,
    runBunBridgeOperation,
  } = dependencies;

  async function readStableTaskTrafficDelta(state, onPoll = null) {
    invariant(
      state.apiContextsClosed === true &&
        state.sessions.size === 0 &&
        privateApiContextRegistry(state).size === 0 &&
        privateEphemeralApiContextRegistry(state).size === 0,
      "terminal discovery started before API contexts closed"
    );
    invariant(state.taskTrafficBaseline !== null, "task traffic baseline is absent");
    invariant(
      onPoll === null || typeof onPoll === "function",
      "task traffic poll receipt authority drift"
    );
    let previous = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const snapshot = await runBunBridgeOperation(state, "terminal/task-traffic-snapshot", {
        userAgents: taskUserAgents(state),
      });
      exactOwnKeys(
        snapshot,
        ["access", "audit", "completeSession", "session"],
        "task traffic snapshot",
        { plain: true }
      );
      const agents = taskUserAgents(state);
      const validateRows = (kind, rows, exactKeys, bound, allowArbitraryUserAgent = false) => {
        invariant(
          Array.isArray(rows) &&
            rows.length <= bound &&
            deepEqualJson(
              rows.map(({ id }) => id),
              rows.map(({ id }) => id).sort()
            ) &&
            new Set(rows.map(({ id }) => id)).size === rows.length,
          kind + " task traffic row inventory drift"
        );
        for (const row of rows) {
          exactOwnKeys(row, exactKeys, kind + " task traffic row", { plain: true });
          invariant(
            typeof row.id === "string" && /^[0-9a-f-]{36}$/u.test(row.id),
            kind + " task traffic row ID drift"
          );
          if (Object.hasOwn(row, "userAgent")) {
            invariant(
              allowArbitraryUserAgent
                ? row.userAgent === null || typeof row.userAgent === "string"
                : agents.includes(row.userAgent),
              kind + " task traffic user-agent drift"
            );
          }
        }
      };
      validateRows(
        "access",
        snapshot.access,
        ["id", "sessionId", "userId", "userAgent"],
        MAX_TASK_TRAFFIC_ROWS
      );
      validateRows("audit", snapshot.audit, ["actorId", "id", "userAgent"], MAX_TASK_TRAFFIC_ROWS);
      validateRows("session", snapshot.session, ["id", "userAgent", "userId"], MAX_TASK_TRAFFIC_ROWS);
      validateRows(
        "complete session",
        snapshot.completeSession,
        ["id", "userAgent", "userId"],
        MAX_COMPLETE_SESSION_ROWS,
        true
      );
      const baseline = state.taskTrafficBaseline;
      const completeIds = snapshot.completeSession.map(({ id }) => id);
      invariant(
        baseline.sessionIds.every((id) => completeIds.includes(id)),
        "a baseline session disappeared before task-owned cleanup"
      );
      const newCompleteSessions = snapshot.completeSession.filter(
        ({ id }) => !baseline.sessionIds.includes(id)
      );
      invariant(
        newCompleteSessions.every(({ userAgent }) => agents.includes(userAgent)),
        "a new session does not carry an exact task user-agent"
      );
      const taskSessionDelta = snapshot.session.filter(({ id }) => !baseline.sessionIds.includes(id));
      invariant(
        deepEqualJson(
          newCompleteSessions.map(({ id }) => id).sort(),
          taskSessionDelta.map(({ id }) => id).sort()
        ),
        "complete-session inventory does not equal the task-UA session inventory"
      );
      const bootstrapAuthority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
      invariant(
        bootstrapAuthority === undefined ||
          [...bootstrapAuthority.ownedSessionIds].every((id) => {
            const row = newCompleteSessions.find((candidate) => candidate.id === id);
            return (
              row?.userId === state.bootstrapBaseline.id &&
              [
                state.plan.fixtureBlueprint.userAgents.browser,
                state.plan.fixtureBlueprint.userAgents.apiBootstrap,
              ].includes(row.userAgent)
            );
          }),
        "an early captured bootstrap session is absent from terminal complete inventory"
      );
      invariant(
        [...state.earlyApiSessionTuples.entries()].every(([key, tuple]) => {
          const expectedUserId = key === "bootstrap" ? state.bootstrapBaseline.id : state.ids.userA;
          const expectedUserAgent =
            key === "bootstrap"
              ? state.plan.fixtureBlueprint.userAgents.apiBootstrap
              : state.plan.fixtureBlueprint.userAgents.apiUserA;
          const row = newCompleteSessions.find(({ id }) => id === tuple.id);
          return (
            (key === "bootstrap" || key === "user-a") &&
            tuple.userId === expectedUserId &&
            tuple.userAgent === expectedUserAgent &&
            row?.userId === expectedUserId &&
            row?.userAgent === expectedUserAgent
          );
        }),
        "an early captured isolated API session is absent from terminal complete inventory"
      );
      const delta = deepFreezeExact({
        access: snapshot.access.filter(({ id }) => !baseline.accessIds.includes(id)),
        audit: snapshot.audit.filter(({ id }) => !baseline.auditIds.includes(id)),
        session: newCompleteSessions,
      });
      if (onPoll !== null) await onPoll(attempt + 1, delta);
      state.taskTrafficPollCount = attempt + 1;
      const encoded = canonicalJson(delta);
      if (encoded === previous) return delta;
      previous = encoded;
      await delayMilliseconds(50);
    }
    invariant(false, "task traffic delta did not reach two stable observations");
  }

  function appendTaskTrafficPollProofReceipts(state, receiptTarget, phase, poll, rowsByKind) {
    invariant(
      Array.isArray(receiptTarget) &&
        (phase === "before-delete" || phase === "after-delete") &&
        Number.isSafeInteger(poll) &&
        poll > 0,
      "task traffic poll proof input drift"
    );
    for (const kind of ["audit", "access", "session"]) {
      const rows = rowsByKind[kind];
      invariant(Array.isArray(rows), "task traffic poll rows are absent: " + kind);
      const output = deepFreezeExact({ phase, poll, rowCount: rows.length });
      const authoritativeBytes = Buffer.from(canonicalJson({ phase, poll, kind, rows }) + "\n");
      receiptTarget.push(
        authoritativeProofRuntimeReceipt(state, {
          operation: "terminal-" + kind + "-stable-poll",
          operationDescriptor: "terminal-task-ua-bounded-stable-poll-v1",
          evidenceSha256: hashBytes(authoritativeBytes),
          subjectKind: "task-ua-" + kind,
          subjectIdentifier: phase + ":" + poll,
          output,
        })
      );
    }
  }

  return Object.freeze({
    appendTaskTrafficPollProofReceipts,
    readStableTaskTrafficDelta,
  });
}
