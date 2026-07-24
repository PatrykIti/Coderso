# TASK-551-08-L02: Durable Outbox, Generations, and Pub/Sub
# FileName: TASK-551-08-L02-Durable-Outbox-Generations-And-PubSub.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-08
**Priority:** Critical
**Category:** Cache / Database / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-551-08-L01; TASK-551-05 schema/migration and TASK-551-06
retention/lifecycle work terminal
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Persist Redis-mode invalidation with authoritative mutations, deliver generation
bumps at least once with monotonic-safe token replacement, and provide optional
namespace-scoped Pub/Sub acceleration. Event insert/claim is idempotent; the bump
itself is intentionally not described as idempotent. No domain caller is migrated
in this leaf.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-08.

## Exclusive Ownership

Sole writer of:

- new `core/services/cache/cacheInvalidationOutbox.ts`;
- new `core/services/cache/cacheInvalidationWorker.ts`;
- new `core/services/cache/cacheInvalidationPubSub.ts`;
- new `tests/integration/server/cache-invalidation-outbox.test.ts`;
- new `tests/integration/server/cache-invalidation-worker.test.ts`;
- new `tests/integration/server/cache-invalidation-pubsub.test.ts`.

TASK-551-05 is the sole TASK-551 schema/migration writer. This leaf consumes its
terminal, exported `cacheInvalidationOutbox` table and complete migration/snapshot/
journal receipt read-only. Forbidden: all `core/db/schema*`, migrations/meta,
L01 Redis files, 07 coordinator, runtime startup, domain/public/Admin files,
TASK-517/493/511 and shared docs/tasks.

## Durable Contract

Consume TASK-551-05's dedicated exported `cache_invalidation_outbox` table with
UUID `id`, unique L01-bounded `event_key`, strict JSON finite-tag array,
`created_at`, `available_at`, `attempts`, nullable `claim_token`/`claim_until`,
nullable `processed_at`, and bounded machine-readable `last_error_code`, plus its
pending `(available_at,id)`, expired-claim and processed-retention indexes and
state checks. If that exact terminal export/artifact receipt is absent, stop for
contract reconciliation; do not create or patch schema here.

Export the mutation functions plus one exact runtime factory/handle; the worker
loop and Pub/Sub client have no second public start path:

```ts
type CacheInvalidationDrainTimeoutMs = number & {
  readonly __cacheInvalidationDrainTimeoutMs: unique symbol;
};

type CacheInvalidationCloseResult = Readonly<{
  drain: "drained" | "timed_out";
  stableCode: null | "cache_invalidation_drain_timeout";
}>;

interface CacheInvalidationRuntimeHandle {
  applyAfterCommit(plan: CacheInvalidationPlan):
    Promise<"applied" | "queued" | "bypassed">;
  stopClaiming(): void;
  drain(timeoutMs: CacheInvalidationDrainTimeoutMs):
    Promise<"drained" | "timed_out">;
  close(timeoutMs: CacheInvalidationDrainTimeoutMs):
    Promise<CacheInvalidationCloseResult>;
}

type CacheInvalidationRuntimeInput = Readonly<{
  backend: ServerCacheBackend;
  namespace: string;
  store: ServerCacheStore;
  coherenceController: ServerCacheCoherenceController;
  pubSub: "disabled" | "enabled";
}>;

persistCacheInvalidationTx(tx, plan, backend): Promise<void>;
claimCacheInvalidations(workerId, now, limit): Promise<Claim[]>;
completeCacheInvalidation(claim, generations): Promise<void>;
retryCacheInvalidation(claim, stableCode, nextAttempt): Promise<void>;
createCacheInvalidationRuntime(input: CacheInvalidationRuntimeInput):
  Promise<CacheInvalidationRuntimeHandle>;
```

Drain timeout accepts exactly `100..30_000 ms` (runtime default `5_000 ms`).
`applyAfterCommit()` is the only public post-commit invalidation/epoch entry. It
internally reports every effective observation/fence transition through the
injected controller, whose `report(...)` method alone performs any epoch
mutation. The caller must `await applyAfterCommit(plan)` before returning its
committed result; fire-and-forget dispatch is forbidden. After strict plan
validation, the handle absorbs cache transport/timeout exceptions and resolves
only to `applied`, `queued`, or `bypassed`. It resolves only after the event-keyed
local `invalidation_observed` report is visible and, on delivery uncertainty,
after that exact event's `post_commit_failed` fence is visible to subsequent reads.
A caller only awaits/calls `applyAfterCommit(plan)`; it must not call
`report(...)` for that plan, call/export an `advance*Epoch` helper, or pre-advance
the epoch; specifically, `advanceLocalCoherenceEpoch` is not part of this surface.
Current-token state-identical global reports are controller no-ops; older source
watermarks are ignored. Every accepted `invalidation_observed` carries the strict
event key and conservatively advances affected epochs, including at-least-once
local/PubSub duplicates. Observation never clears a fence or authorizes stale/
private values. `stopClaiming()` is
synchronous/idempotent and prevents every later claim before
returning. `drain()` waits only for already-owned claim tasks through its deadline,
then aborts their owned Redis/DB work and returns `timed_out`; claim leases remain
recoverable. `close()` is concurrency-safe/idempotent (concurrent/later calls join
the same result), calls stop then drain, unsubscribes and closes this leaf's
Pub/Sub client, removes callbacks, and never closes the L01 command store or DB.
After close no claim, publish, subscription callback or coherence report starts.
L03 owns the handle and awaits it before closing the distributed coordinator and
store; there is no exported free-running `startCacheInvalidationWorker`.

- Memory mode writes no outbox and bumps its store only after commit. Redis mode
  inserts the normalized plan in the same transaction; duplicate `eventKey`
  with byte-identical tags is idempotent, while different tags conflict.
- Plan/outbox rows contain exactly the L01-bounded opaque event key and strict
  deduplicated finite `CacheTag[]`. Record IDs, slugs, paths, request digests,
  domain payloads and raw/digested per-record tag identities are rejected.
- Claim batches are at most 50 using a short DB transaction and
  `FOR UPDATE SKIP LOCKED`; claim lease is 30 seconds. Redis I/O occurs after
  the claim transaction, never while holding row locks.
- A healthy worker polls at most every 250 ms. The measured invalidation p99
  target is at most 1 second. Oldest pending age `>5_000 ms` degrades health,
  raises a bounded alert and synchronously reports L01 `force` from
  `outbox_worker`, reason `outbox_lag`, affected tags `"all"`, to the injected
  coherence controller.
  The global lag state recovers only after a successful Redis health probe and
  a fresh bounded DB oldest-pending read proves age `<=5_000 ms` (or no pending
  event); both probes capture source tokens before I/O and then report exact
  `outbox_worker` recovery. If this process entered immediate-attempt saturation,
  recovery is stricter: the DB proof must show **no pending or claimed row**
  before clearing the outbox-owned drain fence. L02's independent capacity fence
  recovers automatically only when both exact counts are `<=3_072`; either fence
  continues to win. Recovery clears only the applicable global lag/drain fence,
  never a post-commit event fence. Absence/error/stale completion remains forced-
  bypass. Processed
  public values retain their policy TTL as the hard stale ceiling.
- Retry starts at 100 ms with jitter and caps at 60 seconds. Pending events are
  never discarded because of attempt count. Processed rows retain 24 hours and
  prune in batches of 200; pending/claimed rows are never pruned.
- Completion is conditional on claim token. Crash/timeout makes the row
  reclaimable. The event key makes insert and claim identity idempotent. A crash
  after Redis token replacement but before DB completion can deliver again;
  generation replacement is at-least-once, monotonic-safe and measured, not an
  exactly-once/idempotent bump.
- After a successful generation bump, first conditionally commit `processed_at`
  for the same claim token, then report `durable_invalidation_processed` with
  that exact event key/tags. Only this ordered receipt clears that event's local
  failed-post-commit fence. If an immediate callback for the event is still
  active, L02 retains only that active record until its outermost `finally`
  settles the opaque token; a delayed failure using the processed token is
  ignored, and the settled record is deleted instead of retained as a tombstone.
  If DB completion is lost/unknown, report nothing and retry; a physically
  successful Redis bump without the durable DB receipt cannot clear it. Reversed
  order, another event, Pub/Sub, and broad health recovery are non-clearing.
- This worker calls only the generation-bump invalidation surface. It never
  writes cache values, acquires a distributed load lease, or calls either the
  generation-only conditional value write or L03's combined lease-and-generation
  owned-write operation.
- Redis immediate post-commit delivery first acquires L01's bounded opaque
  attempt token; only a registered token may start the callback. Failure preserves the
  committed result, marks the writer process's affected finite families
  incoherent/bypassed before its awaited promise resolves and leaves the durable
  event for the worker. Failure reports the exact live token, and the callback's
  outermost `finally` settles it only after no later branch can report. Memory
  mode performs its generation replacement synchronously in-process and does not
  enter the delayed Redis-attempt registry. Cache transport exceptions are caught inside the handle;
  the caller receives a normalized outcome, not an exception or early return. It cannot
  claim an impossible instantaneous fence on a partitioned replica.
- Immediately after installing an exact failure fence, the Redis path performs
  one bounded authoritative point read of that event's outbox row. If it already
  has the matching processed receipt (including when the worker completed before
  attempt registration), L08 re-reports `durable_invalidation_processed` before
  settling the token. Missing/pending/malformed/read-uncertain proof clears
  nothing; a later worker receipt remains authoritative. This ordered replay
  closes the pre-registration race without retaining historical tombstones.
- Before immediate delivery, `applyAfterCommit()` internally reports
  `invalidation_observed` from `local_post_commit` with the plan's event key and
  finite tags. On delivery failure/unknown physical outcome it reports
  `post_commit_failed` with that same identity/tags, the exact active attempt
  token and a bounded stable code before returning `queued`/`bypassed`.
  The controller alone applies the epoch rule above; neither the handle's caller
  nor another runtime helper advances it.
- If Redis attempt registration is saturated at either exact 4,096 cap,
  `applyAfterCommit` starts no callback and stores no rejected event identity in
  process memory. Before returning `bypassed`, it uses a fresh `outbox_worker`
  observation token to report an all-tag `outbox_lag` force with stable code
  `cache_invalidation_attempt_overflow` and marks this runtime as requiring a
  full pending/claimed-row drain. That requirement uses a monotonic safe-integer
  generation captured before the DB probe, so an older empty result cannot clear
  a newer overflow requirement; generation overflow remains fail-closed until
  restart. L02's local capacity fence recovers at 3,072,
  but this durable drain fence recovers only after Redis health plus the fresh
  empty-outbox proof above. Thus overflow work is owned by the durable row and
  cannot become an early cache hit when local hysteresis recovers.
- Pub/Sub channel is derived from namespace/version. A strict bounded message
  carries event key and resulting generation digest only—never tags or domain
  identities. Publish happens after
  successful bump; subscribers may wake/recheck/measure but never mark an event
  complete or authorize cached security/private data.
- A subscriber treats the message event key only as a bounded wakeup: it performs
  a bounded point read of that outbox row, strictly normalizes its finite tags,
  then reports L01 `invalidation_observed` from `pubsub` with the event key.
  Missing/malformed/read failure reports no observation; Pub/Sub never reports
  durable processing and never clears a fence. Pub/Sub startup,
  unsubscribe and client close belong exclusively to the runtime handle.
- The consistency model is bounded-eventual, not linearizable. During globally
  ambiguous/partitioned state, already-safe public bytes may remain visible until
  worker delivery or policy TTL. Admin preview and read-after-write flows bypass
  until event observation. Security/auth/private/password/nonce-bearing data is
  excluded and never relies on this stale window.

## Implementation Pseudocode

```ts
const invalidationRuntime = await createCacheInvalidationRuntime({
  backend: config.backend,
  namespace: config.namespace,
  store,
  coherenceController,
  pubSub: config.backend === "redis" ? "enabled" : "disabled",
});

const result = await db.transaction(async (tx) => {
  const mutation = await mutate(tx);
  const plan = buildCacheInvalidationPlan(mutation.before, mutation.after);
  await persistCacheInvalidationTx(tx, plan, config.backend);
  return { mutation, plan };
});
// Sole invalidation/epoch entry; caller does not report or advance separately.
const invalidationOutcome = await invalidationRuntime.applyAfterCommit(result.plan);
recordBoundedInvalidationOutcome(invalidationOutcome); // no payload; retry remains

async function applyAfterCommit(plan) {
  coherenceController.report(localObservationFor(plan));
  if (config.backend === "memory") {
    return bumpMemoryGenerationsSynchronouslyOrFenceUntilRestart(plan);
  }
  const registration = coherenceController.beginInvalidationAttempt({
    eventKey: plan.eventKey,
    affectedTags: plan.tags,
  });
  if (registration.kind === "saturated") {
    markEmptyOutboxDrainRequired(); // safe-integer generation; never wraps
    const observationToken = coherenceController.beginObservation("outbox_worker");
    coherenceController.report({
      kind: "force",
      source: "outbox_worker",
      observationToken,
      reason: "outbox_lag",
      affectedTags: "all",
      oldestPendingAgeMs: 0,
      observedAtMonotonicMs: monotonicNow(),
      stableCode: "cache_invalidation_attempt_overflow",
    });
    return "bypassed"; // durable row remains; no immediate callback started
  }
  const reportImmediateFailure = async (code: string) => {
    coherenceController.report({
      kind: "post_commit_failed",
      source: "post_commit",
      eventKey: plan.eventKey,
      attemptToken: registration.token,
      affectedTags: plan.tags,
      observedAtMonotonicMs: monotonicNow(),
      stableCode: code,
    });
    const receipt = await safeReadBoundedProcessedReceipt(plan.eventKey);
    if (receipt.kind === "processed" && sameFiniteTags(receipt.tags, plan.tags)) {
      coherenceController.report(durableProcessedSignalFrom(receipt));
    }
  };
  try {
    const delivered = await deliverImmediateGenerationReplacement(plan);
    if (delivered.kind === "applied") return "applied";
    await reportImmediateFailure(delivered.stableCode);
    return "queued";
  } catch (error) {
    await reportImmediateFailure(stableCode(error));
    return "queued";
  } finally {
    // Last callback action: no path may report this token after settlement.
    coherenceController.settleInvalidationAttempt(registration.token);
  }
}

for (const claim of await claimCacheInvalidations(workerId, now(), 50)) {
  try {
    const generations = await store.bumpGenerations(claim.tags);
    await completeCacheInvalidation(claim, generations);
    coherenceController.report({
      kind: "durable_invalidation_processed",
      source: "outbox_worker",
      eventKey: claim.eventKey,
      affectedTags: claim.tags,
      observedAtMonotonicMs: monotonicNow(),
      stableCode: null,
    });
    await bestEffortPublish(claim.eventKey, generations);
  } catch (error) {
    await retryCacheInvalidation(claim, stableCode(error), boundedBackoff(claim.attempts));
  }
}

async function tryRecoverOutboxFence() {
  const drainRequirement = captureEmptyOutboxDrainRequirement();
  const observationToken = coherenceController.beginObservation("outbox_worker");
  const [redisHealthy, pending] = await Promise.all([
    probeRedisHealth(),
    readBoundedOldestPendingAndClaimed(),
  ]);
  const dbProvesRecovery = drainRequirement.required
    ? pending.kind === "none"
    : pending.kind === "none" || pending.oldestAgeMs <= 5_000;
  if (!redisHealthy || !dbProvesRecovery) return;
  coherenceController.report(outboxRecoverySignal(observationToken, pending));
  if (pending.kind === "none") {
    markEmptyOutboxDrainRecoveredOnlyIfCurrent(drainRequirement);
  }
}

async function closeInvalidationRuntime() {
  const timeout = normalizeDrainTimeoutMs(5_000);
  return invalidationRuntime.close(timeout); // stop -> bounded drain -> Pub/Sub close
}
```

## Security Contract

- **Visibility/routes:** no routes.
- **Auth/RBAC/CSRF/rate limits:** unchanged.
- **Validation:** reject unknown plan/message fields; cap event key, tags, batch,
  claims, retry, error code and retained rows processed per tick.
- **Secrets/privacy:** outbox/PubSub contain only opaque event identity and
  normalized non-sensitive tags/generation digest; no domain payload/PII/URL.
- **Anti-abuse:** internal fixed worker and channel only; no arbitrary SQL/Redis
  input or public write.

## Testing Requirements

Verify the TASK-551-05 migration/export receipt, then test commit vs rollback/
no-op, identical/conflicting event keys, two workers with SKIP LOCKED,
expired-claim recovery, token mismatch, Redis outage/backoff/reconnect,
at-least-once duplicate token replacement, 250 ms polling, <=1 second p99 target,
exact 5,000/5,001 ms degraded/forced-bypass health, hard-TTL bound, bounded prune and Pub/Sub
disconnect/malformed message. Assert exact controller signals enter forced-bypass
at `5_001 ms`, remain bypassed on DB/Redis uncertainty, and recover only after
both proofs; test `5_000/5_001`. Prove immediate failure reports affected finite
tags before the awaited caller can resume, cache transport exceptions are
absorbed into `queued|bypassed`, and no mutation path uses `void`, a detached
promise, or returns before `applyAfterCommit`. Prove success resolves only after
the local observation is visible. Current-token state-identical force/recover
reports do not advance, stale completion cannot recover a newer force, and
every accepted local/PubSub `invalidation_observed` report advances affected
epochs even on at-least-once duplicate delivery. Prove observation/PubSub/global
recovery/another event never clears a post-commit fence; only a conditionally
committed processed receipt for the exact event clears it. Exercise processed-
before-delayed-failure ordering and prove the delayed live-token failure is
ignored, settlement retires the record, and a settled token cannot report.
Also complete the durable row before immediate-attempt registration, then fail
that attempt and prove the post-failure bounded processed-row replay clears it
before settlement; missing/pending/malformed/unavailable replay proof must not.
Process more than 100,000 sequential settled invalidations in immediate-success
and failure-then-durable order, asserting bounded controller memory, zero retained
tombstones and no capacity/global bypass. Hold 4,096 concurrent unresolved
records/attempts, prove the 4,097th starts no immediate callback, and pin temporary
capacity recovery at 3,073/3,072. For that saturated Redis event, prove the
outbox-owned force remains after local hysteresis recovery and clears only after
Redis health plus a fresh no-pending/no-claimed DB proof; a merely young pending
row, stale empty probe or newer drain-generation race cannot clear it. Also cover
DB-completion uncertainty after a physical bump. No `advanceLocalCoherenceEpoch`/other
`advance*Epoch` export or call exists. Pub/Sub
observation resolves tags by bounded
event-key point read. Pin drain timeout 99/100/5,000/30,000/30,001; prove stop-before-next-
claim, drained/timed-out results, claim recovery, concurrent/idempotent close,
callback removal and Pub/Sub closure. Prove worker delivery performs generation
replacement only and cannot call any conditional value-fill or lease surface.
DB fixtures use unique event prefixes and
delete only owned rows; Redis cleanup uses only the test namespace.

```bash
set -a && source .env && set +a
bun run db:migrate
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-l02 \
  bun test tests/integration/server/cache-invalidation-outbox.test.ts \
  tests/integration/server/cache-invalidation-worker.test.ts \
  tests/integration/server/cache-invalidation-pubsub.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/cacheInvalidation{Outbox,Worker,PubSub}.ts \
  tests/integration/server/cache-invalidation-*.test.ts
```

## Documentation Updates Required

Consume TASK-551-05's migration lock/forward-recovery evidence and record worker,
bounded-eventual/CAP, health and outbox runbook inputs for 10-L02; do not edit
shared docs/changelog here.
