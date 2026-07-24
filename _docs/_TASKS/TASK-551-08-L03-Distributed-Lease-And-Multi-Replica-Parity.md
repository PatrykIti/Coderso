# TASK-551-08-L03: Distributed Lease and Multi-Replica Parity
# FileName: TASK-551-08-L03-Distributed-Lease-And-Multi-Replica-Parity.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-08
**Priority:** Critical
**Category:** Cache / Redis / Concurrency / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-551-08-L02; TASK-551-02-L02 lifecycle registry terminal;
parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Implement token-safe distributed cold-load coalescing and compose the memory or
Redis runtime once per process, including worker/PubSub lifecycle and graceful
shutdown. Prove two-client/multi-process semantic parity without adding an L1
value cache in Redis mode.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-08.

## Exclusive Ownership

Sole writer of:

- new `core/services/cache/redisCacheLease.ts`;
- new `core/services/cache/serverCacheRuntime.ts`;
- existing `core/server/httpServer.ts` only for the exact composed participant,
  cursor-keyring-before-router, cache runtime, retention and existing backup
  start/stop lifecycle wiring described below;
- existing `core/server/dev.ts` only to call composition before lifecycle start
  and retain awaited, idempotent lifecycle shutdown;
- new `tests/integration/server/redis-distributed-lease.test.ts`;
- new `tests/integration/server/server-cache-runtime-lifecycle.test.ts`;
- new `tests/integration/server/redis-multi-replica-parity.test.ts`.

Within `httpServer.ts`, this leaf solely owns the exact
`registerComposedHttpRuntimeParticipants()` composition seam and the required
deferral of router construction until cursor-keyring validation succeeds.

TASK-511 remains sole owner of `core/services/backups/**` and backup scheduler
behavior. Re-read its parent-gate terminal or exact serialized handoff
`httpServer`/dev/prod bytes before editing and
preserve the scheduler seam. Forbidden: TASK-551-07/08-L01/L02 owners, public/
domain/Admin adoption, TASK-517 `publicSite.tsx`, TASK-493 SEO, package files,
task/board/changelog/workflow/docs. TASK-551-02-L02 is the sole writer of
`core/server/prod.ts`; consume its terminal graceful-lifecycle seam without
editing that file. If it exposes no composable close registration, stop for a
task-contract reconciliation instead of installing competing signal handlers.

The exact required TASK-551-02-L02 seam is
`registerRuntimeLifecycleParticipant({ id, phase, start, close })`,
`startRuntimeLifecycle()` and `closeRuntimeLifecycle(reason)`. Its terminal
`prod.ts` must await `startRuntimeLifecycle()` before calling synchronous
`startHttpServer()` and await `closeRuntimeLifecycle()` from the one signal path.
L03 registers `server-cache` from the imported `httpServer` composition module;
`dev.ts` consumes the same start/close functions. L03 never edits `prod.ts` and
never adds another process signal owner. Absence or name/behavior drift in this
seam blocks implementation and returns to TASK-551-02-L02.

L03 remains the sole TASK-551 writer of `core/server/httpServer.ts` and
`core/server/dev.ts` and is also the final composition owner for the already-
landed TASK-551-03/06 handoffs. It owns the exact idempotent pre-start seam
`registerComposedHttpRuntimeParticipants(): void`. Both terminal 02 `prod.ts`
and L03 `dev.ts` call it before `startRuntimeLifecycle()`; prod/dev remain the
only lifecycle start/close callers. The seam must:

1. load TASK-551-03-L01's exact `PaginationCursorKeyring` through
   `loadPaginationCursorKeyring(env)` once and inject that same keyring into
   every bounded Admin route/read dependency;
2. register TASK-551-06-L03's terminal
   `createRetentionSchedulerLifecycleParticipant(...)` worker participant
   without recreating its scheduler/config logic;
3. register the existing backup scheduler as worker `backup-scheduler`, with
   `startBackupScheduler()` in `start` and `stopBackupScheduler()` in `close`;
4. register `server-cache` in cache phase; and
5. move current eager router construction behind this composition seam so the
   validated keyring is injected before any router/read-service closure exists.

Remove the direct `startBackupScheduler()` call from `startHttpServer()`. Never
edit `backupScheduler.ts`, `prod.ts`, 03, or 06 owner files. Missing/drifted 03
keyring or 06 participant-factory receipts block implementation instead of
creating a second owner.

## Lease and Runtime Contract

- Lease key is a bounded digest derived from the final L01 value key. Acquire is
  `SET leaseKey random128BitToken NX PX leaseMs`.
- Export exact bounds from `redisCacheLease.ts`: lease `100..10_000 ms`
  (default 2,000), total wait `0..500 ms` (default 250), poll jitter
  `10..50 ms`. Values are internal/config-derived, never request-controlled.
- Release/renew use Lua compare-token operations; a former owner cannot delete
  or extend a successor's lease. Timeout/disconnect means ownership is unknown,
  so no unsafe release is attempted.
- Winner loads from DB, then `ServerCache` re-reads all policy generations
  before set. Changed generation discards fill. Waiters poll cache within the
  bound. Exactly one distributed loader is guaranteed only when the winner
  completes within the waiter budget. After timeout or Redis error, availability
  permits DB fallback without cache fill, but TASK-551-07-L02 promise-only local
  single-flight limits it to at most one fallback loader per process.
- `serverCacheRuntime.ts` is the only composition root. Memory mode constructs
  the memory store and no Redis/outbox/PubSub client. Redis mode constructs one
  shared Redis store, lease coordinator, outbox worker and optional Pub/Sub; it
  constructs no `MemoryServerCacheStore` or persistent value `Map`.
- Explicit Redis config/startup failure stops boot. Post-start failure reports
  degraded and immediately transitions L01 health to
  `forced_bypass(reason="redis_unavailable", affectedFamilies="all")`, while
  HTTP continues through DB/render. Worker health includes bounded oldest
  pending age without event payloads. Healthy polling is at most
  250 ms, invalidation p99 target is at most 1 second, and oldest-pending age
  above 5,000 ms transitions to
  `forced_bypass(reason="outbox_lag", affectedFamilies="all")`. While forced,
  the coordinator skips Redis value GET, distributed lease, conditional fill,
  and ordinary fill; it uses authoritative DB/render plus the epoch-scoped
  promise-only local single-flight. Recovery requires both a ready Redis probe
  and L02's fresh `coherent` report, then advances the process coherence epoch
  before reads resume. Unknown/malformed state remains bypassed. This is
  bounded-eventual public caching, not linearizability;
  security/auth/private values never use it.
- Start/close are concurrency-safe and idempotent. Shutdown stops new claims,
  waits a bounded interval for active claims, releases owned leases when token
  safe, closes subscriptions/client and then allows server/process exit.

## Implementation Pseudocode

```ts
function registerComposedHttpRuntimeParticipants(): void {
  const paginationCursorKeys: PaginationCursorKeyring = loadPaginationCursorKeyring(env);
  composeRouterAfterKeyringValidation({ paginationCursorKeys });
  registerRuntimeLifecycleParticipant({
    id: "server-cache",
    phase: "cache",
    start: () => startServerCacheRuntime(normalizeServerCacheConfig(env)),
    close: (reason) => closeServerCacheRuntime({ reason, timeoutMs: boundedShutdownMs }),
  });
  registerRuntimeLifecycleParticipant(
    createRetentionSchedulerLifecycleParticipant(retentionConfig)
  );
  registerRuntimeLifecycleParticipant({
    id: "backup-scheduler",
    phase: "worker",
    start: async () => startBackupScheduler(),
    close: async () => stopBackupScheduler(),
  });
}
registerComposedHttpRuntimeParticipants(); // prod/dev call before lifecycle start
await startRuntimeLifecycle(); // prod owner performs this before startHttpServer
const runtime = getServerCacheRuntime();
if ((await runtime.health()).coherence.state === "forced_bypass") {
  return joinEpochScopedAuthoritativeLoad(finalKey);
}
const lease = await runtime.loadCoordinator.acquire(finalKey);
if (lease.kind === "owner") {
  try { return await loadThenGenerationRecheckAndMaybeFill(); }
  finally { await lease.releaseBestEffort(); }
}
const observed = await lease.waitForValue({ maxWaitMs: 250 });
return observed ?? loadAuthoritativelyWithoutFill();

async function shutdown() {
  server.stop();
  await closeRuntimeLifecycle("shutdown");
}
```

## Security Contract

- **Visibility/routes:** no route surface changes; only server lifecycle.
- **Auth/RBAC/CSRF/rate limits:** existing ordering is preserved; cache startup
  and bypass cannot skip middleware.
- **Validation:** bounded lease/token/wait/poll/shutdown and strict runtime config.
- **Secrets/privacy:** random lease token and digested key only; Redis URL and
  values never enter logs/process messages.
- **Anti-abuse:** no public write; lease contention cannot wait indefinitely or
  amplify one request into unbounded Redis/DB work.

## Testing Requirements

Use two independent Redis clients and, where feasible, two spawned Core
processes: prove one loader for 1/10/50 cold requests whose load completes within
the wait budget; prove timeout/winner-crash fallback is at most one loader per
process, token-safe expiry/reacquire, generation-change fill discard, two-client
bump visibility, Redis outage DB bypass with no local value reuse, reconnect,
250 ms polling/1-second p99 and exact 5,000/5,001 ms transitions. Assert forced
bypass executes zero Redis value GET/fill/lease calls and recovery requires both
proofs. Prove `registerComposedHttpRuntimeParticipants()` loads/injects the
keyring before router construction/listen; cache,
`createRetentionSchedulerLifecycleParticipant(...)`, and backup register exactly
once; `startHttpServer` no longer starts backup directly;
worker→cache→database close ordering and existing backup behavior remain intact.
Assert public/auth behavior is not changed yet.

```bash
set -a && source .env && set +a
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-l03 \
  bun test tests/integration/server/redis-distributed-lease.test.ts \
  tests/integration/server/server-cache-runtime-lifecycle.test.ts \
  tests/integration/server/redis-multi-replica-parity.test.ts
bun test tests/integration/runtime/backupScheduler.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/{redisCacheLease,serverCacheRuntime}.ts \
  core/server/{httpServer,dev}.ts \
  tests/integration/server/{redis-distributed-lease,server-cache-runtime-lifecycle,redis-multi-replica-parity}.test.ts
```

## Documentation Updates Required

Redis is mandatory for this leaf's acceptance. Full five-scenario runtime smoke
and operational documentation remain owned by TASK-551-10.
