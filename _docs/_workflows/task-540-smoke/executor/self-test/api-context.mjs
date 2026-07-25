import { deepFreezeExact, invariant } from "../foundation.mjs";

export async function runApiContextSelfTest({
  PRIVATE_API_REQUEST_CONTEXT,
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  disposeApiRequestContextAndProveAbsent,
  expectAsyncFailure,
  settleBootstrapLoginAttempt,
  validateExactApiLoginResponse,
}) {
  const exactLoginProjection = deepFreezeExact({
    session: { expiresAt: "2026-07-17T00:00:00.000Z" },
    user: {
      email: "admin@example.test",
      id: "54000000-0000-4000-8000-000000007300",
      name: "Admin",
    },
  });
  invariant(
    validateExactApiLoginResponse(
      exactLoginProjection,
      exactLoginProjection.user.id,
      "ADMIN@example.test"
    ) === exactLoginProjection,
    "strict API login projection rejected the exact response"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateExactApiLoginResponse(
          deepFreezeExact({ ...exactLoginProjection, unexpected: true }),
          exactLoginProjection.user.id,
          exactLoginProjection.user.email
        )
      ),
    "API login top-level unknown key"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateExactApiLoginResponse(
          deepFreezeExact({
            ...exactLoginProjection,
            user: { ...exactLoginProjection.user, unexpected: true },
          }),
          exactLoginProjection.user.id,
          exactLoginProjection.user.email
        )
      ),
    "API login nested unknown key"
  );

  const makeApiDisposalProbe = ({ disposeThrows = false, probeRejects = true } = {}) => {
    const state = {};
    const capability = Object.freeze({
      key: "bootstrap",
      userAgent: "TASK-540/self-test",
      userId: null,
    });
    let disposeCalls = 0;
    let storageCalls = 0;
    const context = {
      async dispose() {
        disposeCalls += 1;
        if (disposeThrows) throw new Error("self-test dispose failure");
      },
      async storageState() {
        storageCalls += 1;
        if (typeof probeRejects === "function" ? probeRejects(disposeCalls) : probeRejects) {
          throw new Error("self-test closed context");
        }
        return { cookies: [], origins: [] };
      },
    };
    const registry = new Map([
      [
        "bootstrap",
        {
          capability,
          context,
          disposalErrors: [],
          disposeAttemptPromise: null,
          disposeProof: null,
          key: "bootstrap",
          userAgent: capability.userAgent,
        },
      ],
    ]);
    PRIVATE_API_REQUEST_CONTEXT.set(state, registry);
    return {
      capability,
      context,
      get disposeCalls() {
        return disposeCalls;
      },
      registry,
      get storageCalls() {
        return storageCalls;
      },
      state,
    };
  };
  const successfulApiDisposal = makeApiDisposalProbe();
  const [firstDisposalProof, secondDisposalProof] = await Promise.all([
    disposeApiRequestContextAndProveAbsent(
      successfulApiDisposal.state,
      successfulApiDisposal.capability,
      "bootstrap"
    ),
    disposeApiRequestContextAndProveAbsent(
      successfulApiDisposal.state,
      successfulApiDisposal.capability,
      "bootstrap"
    ),
  ]);
  invariant(
    firstDisposalProof === secondDisposalProof &&
      successfulApiDisposal.disposeCalls === 1 &&
      successfulApiDisposal.storageCalls === 1 &&
      successfulApiDisposal.registry.size === 1,
    "API context disposal was not once-only with an independent absence probe"
  );
  const phase4DisposalProof = await disposeApiRequestContextAndProveAbsent(
    successfulApiDisposal.state,
    successfulApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    phase4DisposalProof === firstDisposalProof &&
      successfulApiDisposal.disposeCalls === 1 &&
      successfulApiDisposal.storageCalls === 2 &&
      successfulApiDisposal.registry.has("bootstrap"),
    "eager API disposal did not retain acquired history for an independent phase-4 probe"
  );
  const throwingApiDisposal = makeApiDisposalProbe({ disposeThrows: true });
  const throwingDisposalProof = await disposeApiRequestContextAndProveAbsent(
    throwingApiDisposal.state,
    throwingApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    throwingDisposalProof.capabilityAbsent === true &&
      throwingApiDisposal.disposeCalls === 1 &&
      throwingApiDisposal.storageCalls === 1 &&
      throwingApiDisposal.registry.has("bootstrap") &&
      throwingApiDisposal.registry.get("bootstrap").disposalErrors.length === 1,
    "throwing-but-absent API disposal lost its proof or retained error"
  );
  const liveApiDisposal = makeApiDisposalProbe({
    probeRejects: (disposeCalls) => disposeCalls >= 2,
  });
  await expectAsyncFailure(
    () =>
      disposeApiRequestContextAndProveAbsent(
        liveApiDisposal.state,
        liveApiDisposal.capability,
        "bootstrap"
      ),
    "API context live post-dispose capability"
  );
  invariant(
    liveApiDisposal.disposeCalls === 1 &&
      liveApiDisposal.storageCalls === 1 &&
      liveApiDisposal.registry.has("bootstrap") &&
      liveApiDisposal.registry.get("bootstrap").disposeAttemptPromise === null,
    "live post-dispose capability was incorrectly removed from private authority"
  );
  const recoveredApiDisposal = await disposeApiRequestContextAndProveAbsent(
    liveApiDisposal.state,
    liveApiDisposal.capability,
    "bootstrap"
  );
  invariant(
    recoveredApiDisposal.capabilityAbsent === true &&
      liveApiDisposal.disposeCalls === 2 &&
      liveApiDisposal.storageCalls === 2 &&
      liveApiDisposal.registry.has("bootstrap") &&
      liveApiDisposal.registry.get("bootstrap").disposalErrors.length === 1,
    "retained live API context did not recover through a fresh close/probe"
  );

  const makeBootstrapSettlementProbe = () => {
    const state = {};
    const beforePair = deepFreezeExact({
      lastLoginAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });
    const authority = {
      newestOwnedPair: beforePair,
      ownedAuditIds: new Set(),
      ownedSessionIds: new Set(),
    };
    const attempt = {
      beforeAuditIds: deepFreezeExact([]),
      beforePair,
      beforeSessionIds: deepFreezeExact([]),
      status: "pending-late",
    };
    PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.set(state, authority);
    return { attempt, authority, state };
  };
  const lateSettlement = makeBootstrapSettlementProbe();
  const lateSessionId = "54000000-0000-4000-8000-000000007301";
  const lateAuditId = "54000000-0000-4000-8000-000000007302";
  invariant(
    settleBootstrapLoginAttempt(
      lateSettlement.state,
      lateSettlement.authority,
      lateSettlement.attempt,
      {
        lastLoginAt: "2026-07-16T00:00:01.000Z",
        updatedAt: "2026-07-16T00:00:01.000Z",
        sessionIds: [lateSessionId],
        auditIds: [lateAuditId],
      }
    ) === true &&
      lateSettlement.attempt.status === "settled" &&
      lateSettlement.authority.ownedSessionIds.has(lateSessionId) &&
      lateSettlement.authority.ownedAuditIds.has(lateAuditId),
    "delayed exact bootstrap session/audit pair was not adopted"
  );
  const oneColumnSettlement = makeBootstrapSettlementProbe();
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        settleBootstrapLoginAttempt(
          oneColumnSettlement.state,
          oneColumnSettlement.authority,
          oneColumnSettlement.attempt,
          {
            lastLoginAt: "2026-07-16T00:00:01.000Z",
            updatedAt: "2026-07-16T00:00:00.000Z",
            sessionIds: [lateSessionId],
            auditIds: [lateAuditId],
          }
        )
      ),
    "one-column delayed bootstrap mutation"
  );
}
