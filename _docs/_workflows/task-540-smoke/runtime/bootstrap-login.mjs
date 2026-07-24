import {
  BOOTSTRAP_RAW_USER_ROW_KEYS,
  BOOTSTRAP_ROLE_TUPLE_KEYS,
  bootstrapTimestampPair,
  bootstrapUnchangedProjection,
  isNullableIsoTimestamp,
  validateBootstrapPrivateBaseline,
} from "../executor/bootstrap-contracts.mjs";
import { MAX_TASK_TRAFFIC_ROWS } from "../executor/config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createBootstrapLoginRuntime({ delayMilliseconds, runBunBridgeOperation }) {
  const PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY = new WeakMap();

  function initializeBootstrapLoginAuthority(state, baseline) {
    invariant(
      !PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.has(state),
      "bootstrap login authority was assigned twice"
    );
    validateBootstrapPrivateBaseline(baseline);
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.set(state, {
      baseline,
      baselineUnchanged: bootstrapUnchangedProjection(baseline),
      newestOwnedPair: bootstrapTimestampPair(baseline),
      attempts: [],
      ownedAuditIds: new Set(),
      ownedSessionIds: new Set(),
      reconciliationError: null,
      reconciliationSealed: false,
      sealedNewestOwnedPair: null,
      restorationStarted: false,
      restorationPromise: null,
      restorationProof: null,
      casAttempts: 0,
      validatedCasProof: null,
      uncertainReads: 0,
      uncertainBaselineProof: null,
      resolution: null,
      receiptAttempted: false,
      receipt: null,
    });
  }

  function validateBootstrapLoginObservation(state, observation, label) {
    exactOwnKeys(
      observation,
      ["auditIds", "id", "lastLoginAt", "rawUserRow", "roleTuples", "sessionIds", "updatedAt"],
      label,
      { plain: true }
    );
    exactOwnKeys(observation.rawUserRow, BOOTSTRAP_RAW_USER_ROW_KEYS, label + " raw user row", {
      plain: true,
    });
    invariant(
      observation.id === state.bootstrapBaseline.id &&
        observation.rawUserRow.id === observation.id &&
        observation.lastLoginAt === observation.rawUserRow.lastLoginAt &&
        observation.updatedAt === observation.rawUserRow.updatedAt &&
        isNullableIsoTimestamp(observation.lastLoginAt) &&
        isNullableIsoTimestamp(observation.updatedAt),
      label + " user identity drift"
    );
    invariant(
      Array.isArray(observation.roleTuples) && observation.roleTuples.length === 1,
      label + " role cardinality drift"
    );
    exactOwnKeys(observation.roleTuples[0], BOOTSTRAP_ROLE_TUPLE_KEYS, label + " role tuple", {
      plain: true,
    });
    for (const [kind, ids] of [
      ["audit", observation.auditIds],
      ["session", observation.sessionIds],
    ]) {
      invariant(
        Array.isArray(ids) &&
          ids.length <= MAX_TASK_TRAFFIC_ROWS &&
          ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/u.test(id)) &&
          new Set(ids).size === ids.length &&
          deepEqualJson(ids, [...ids].sort()),
        label + " " + kind + " inventory drift"
      );
    }
    const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    invariant(
      authority &&
        deepEqualJson(bootstrapUnchangedProjection(observation), authority.baselineUnchanged),
      label + " non-login columns or role tuples drifted"
    );
    return observation;
  }

  async function readStableBootstrapLoginObservation(state, userAgent) {
    let previous = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const observation = validateBootstrapLoginObservation(
        state,
        await runBunBridgeOperation(state, "resource/bootstrap-login-observation", {
          userAgent,
          userId: state.bootstrapBaseline.id,
        }),
        "bootstrap login observation"
      );
      const encoded = canonicalJson(observation);
      if (encoded === previous) return deepFreezeExact(observation);
      previous = encoded;
      await delayMilliseconds(50);
    }
    invariant(false, "bootstrap login observation did not reach two stable observations");
  }

  function settleBootstrapLoginAttempt(state, authority, attempt, observation, options = {}) {
    invariant(
      authority === PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state) &&
        ["entered", "pending-late"].includes(attempt.status) &&
        deepEqualJson(authority.newestOwnedPair, attempt.beforePair),
      "bootstrap attempt settlement authority drift"
    );
    const afterPair = bootstrapTimestampPair(observation);
    const lastChanged = attempt.beforePair.lastLoginAt !== afterPair.lastLoginAt;
    const updatedChanged = attempt.beforePair.updatedAt !== afterPair.updatedAt;
    invariant(lastChanged === updatedChanged, "bootstrap login changed only one timestamp column");
    invariant(
      attempt.beforeSessionIds.every((id) => observation.sessionIds.includes(id)) &&
        attempt.beforeAuditIds.every((id) => observation.auditIds.includes(id)),
      "bootstrap login removed a pre-attempt boundary row"
    );
    const newSessionIds = observation.sessionIds.filter(
      (id) => !attempt.beforeSessionIds.includes(id)
    );
    const newAuditIds = observation.auditIds.filter(
      (id) => !attempt.beforeAuditIds.includes(id)
    );
    if (!lastChanged && options.deferUnchanged === true) {
      invariant(
        newSessionIds.length === 0 && newAuditIds.length === 0,
        "unchanged bootstrap pair created boundary rows"
      );
      attempt.status = "pending-late";
      attempt.provisionalAfterPair = afterPair;
      return false;
    }
    if (options.requireChanged === true) {
      invariant(lastChanged, "successful bootstrap login did not mutate both timestamps");
    }
    if (lastChanged) {
      invariant(
        newSessionIds.length === 1 &&
          newAuditIds.length === 1 &&
          !authority.ownedSessionIds.has(newSessionIds[0]) &&
          !authority.ownedAuditIds.has(newAuditIds[0]),
        "bootstrap changed pair lacks its exact task-UA session/audit boundary"
      );
      authority.newestOwnedPair = afterPair;
      authority.ownedSessionIds.add(newSessionIds[0]);
      authority.ownedAuditIds.add(newAuditIds[0]);
    } else {
      invariant(
        newSessionIds.length === 0 && newAuditIds.length === 0,
        "unchanged bootstrap pair created boundary rows"
      );
    }
    attempt.afterPair = afterPair;
    attempt.changed = lastChanged;
    attempt.newAuditIds = deepFreezeExact(newAuditIds);
    attempt.newSessionIds = deepFreezeExact(newSessionIds);
    attempt.provisionalAfterPair = null;
    attempt.status = "settled";
    return true;
  }

  async function runObservedBootstrapLoginAttempt(state, channel, userAgent, operation) {
    const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    invariant(
      authority &&
        !authority.restorationStarted &&
        typeof operation === "function" &&
        ["ui", "api-bootstrap"].includes(channel) &&
        !authority.attempts.some((attempt) => attempt.channel === channel),
      "bootstrap login attempt authority drift"
    );
    const before = await readStableBootstrapLoginObservation(state, userAgent);
    invariant(
      deepEqualJson(bootstrapTimestampPair(before), authority.newestOwnedPair),
      "bootstrap timestamps drifted before an owned login attempt"
    );
    const attempt = {
      afterPair: null,
      beforeAuditIds: deepFreezeExact([...before.auditIds]),
      beforePair: bootstrapTimestampPair(before),
      beforeSessionIds: deepFreezeExact([...before.sessionIds]),
      changed: null,
      channel,
      newAuditIds: null,
      newSessionIds: null,
      observationError: null,
      operationReturned: false,
      provisionalAfterPair: null,
      status: "entered",
      userAgent,
    };
    authority.attempts.push(attempt);
    let value;
    let primaryError = null;
    let observationError = null;
    let after = null;
    try {
      value = await operation();
      attempt.operationReturned = true;
    } catch (error) {
      primaryError = error;
    } finally {
      try {
        after = await readStableBootstrapLoginObservation(state, userAgent);
        settleBootstrapLoginAttempt(state, authority, attempt, after, {
          deferUnchanged: primaryError !== null,
          requireChanged: primaryError === null,
        });
      } catch (error) {
        observationError = error;
        attempt.observationError = error;
      }
    }
    if (primaryError !== null && observationError !== null) {
      throw new AggregateError(
        [primaryError, observationError],
        "bootstrap login and final observation failed"
      );
    }
    if (observationError !== null) throw observationError;
    if (primaryError !== null) throw primaryError;
    return value;
  }

  async function reconcileBootstrapLoginAuthority(
    state,
    { deferUnchanged = false, restoration = false, seal = true } = {}
  ) {
    const authority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    invariant(
      authority && (restoration ? authority.restorationStarted : !authority.restorationStarted),
      "bootstrap late reconciliation authority drift"
    );
    try {
      const unresolved = authority.attempts.filter(({ status }) => status !== "settled");
      invariant(
        unresolved.length <= 1,
        "multiple unresolved bootstrap login attempts cannot be attributed safely"
      );
      for (const attempt of unresolved) {
        const observation = await readStableBootstrapLoginObservation(state, attempt.userAgent);
        settleBootstrapLoginAttempt(state, authority, attempt, observation, {
          deferUnchanged,
          requireChanged: attempt.operationReturned,
        });
      }
      const allSettled = authority.attempts.every(({ status }) => status === "settled");
      for (const attempt of authority.attempts.filter(({ status }) => status === "settled")) {
        const observation = await readStableBootstrapLoginObservation(state, attempt.userAgent);
        const expectedSessionIds = [...attempt.beforeSessionIds, ...attempt.newSessionIds].sort();
        const expectedAuditIds = [...attempt.beforeAuditIds, ...attempt.newAuditIds].sort();
        invariant(
          deepEqualJson(bootstrapTimestampPair(observation), authority.newestOwnedPair) &&
            deepEqualJson(observation.sessionIds, expectedSessionIds) &&
            deepEqualJson(observation.auditIds, expectedAuditIds),
          "late bootstrap mutation or owned boundary disappearance detected"
        );
      }
      if (seal)
        invariant(allSettled, "bootstrap login attempt remained unresolved at the seal boundary");
      authority.reconciliationError = null;
      if (seal) authority.reconciliationSealed = true;
      return allSettled;
    } catch (error) {
      authority.reconciliationError = error;
      throw error;
    }
  }

  return Object.freeze({
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
    initializeBootstrapLoginAuthority,
    reconcileBootstrapLoginAuthority,
    runObservedBootstrapLoginAttempt,
    settleBootstrapLoginAttempt,
    validateBootstrapLoginObservation,
  });
}
