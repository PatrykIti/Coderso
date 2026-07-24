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

Export:

```ts
type CacheInvalidationWorkerCoherence = Readonly<{
  state: "coherent" | "forced_bypass";
  oldestPendingAgeMs: null | number;
  observedAtMonotonicMs: number;
}>;

persistCacheInvalidationTx(tx, plan, backend): Promise<void>;
applyCacheInvalidationAfterCommit(plan): Promise<"applied" | "queued" | "bypassed">;
claimCacheInvalidations(workerId, now, limit): Promise<Claim[]>;
completeCacheInvalidation(claim, generations): Promise<void>;
retryCacheInvalidation(claim, stableCode, nextAttempt): Promise<void>;
startCacheInvalidationWorker(input: {
  onCoherenceChange: (next: CacheInvalidationWorkerCoherence) => void;
}): Promise<void>;
```

`CacheInvalidationWorkerCoherence` and `startCacheInvalidationWorker` are owned
only by this leaf. L03 injects the callback and is the sole owner that combines
this report with store health into L01's `ServerCacheHealth` transition.

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
  raises a bounded alert and synchronously reports `forced_bypass` to runtime.
  The state returns to `coherent` only after a successful Redis health probe and
  a fresh bounded DB oldest-pending read proves age `<=5_000 ms` (or no pending
  event); absence/error remains forced-bypass. Processed
  public values retain their policy TTL as the hard stale ceiling.
- Retry starts at 100 ms with jitter and caps at 60 seconds. Pending events are
  never discarded because of attempt count. Processed rows retain 24 hours and
  prune in batches of 200; pending/claimed rows are never pruned.
- Completion is conditional on claim token. Crash/timeout makes the row
  reclaimable. The event key makes insert and claim identity idempotent. A crash
  after Redis token replacement but before DB completion can deliver again;
  generation replacement is at-least-once, monotonic-safe and measured, not an
  exactly-once/idempotent bump.
- Immediate post-commit calls the same delivery path. Failure preserves the
  committed result, marks the writer process's affected finite families
  incoherent/bypassed and leaves the durable event for the worker. It cannot
  claim an impossible instantaneous fence on a partitioned replica.
- Pub/Sub channel is derived from namespace/version. A strict bounded message
  carries event key and resulting generation digest only—never tags or domain
  identities. Publish happens after
  successful bump; subscribers may wake/recheck/measure but never mark an event
  complete or authorize cached security/private data.
- The consistency model is bounded-eventual, not linearizable. During globally
  ambiguous/partitioned state, already-safe public bytes may remain visible until
  worker delivery or policy TTL. Admin preview and read-after-write flows bypass
  until event observation. Security/auth/private/password/nonce-bearing data is
  excluded and never relies on this stale window.

## Implementation Pseudocode

```ts
const result = await db.transaction(async (tx) => {
  const mutation = await mutate(tx);
  const plan = buildCacheInvalidationPlan(mutation.before, mutation.after);
  await persistCacheInvalidationTx(tx, plan, config.backend);
  return { mutation, plan };
});
void applyCacheInvalidationAfterCommit(result.plan); // internally catches; durable retry remains

for (const claim of await claimCacheInvalidations(workerId, now(), 50)) {
  try {
    const generations = await store.bumpGenerations(claim.tags);
    await completeCacheInvalidation(claim, generations);
    await bestEffortPublish(claim.eventKey, generations);
  } catch (error) {
    await retryCacheInvalidation(claim, stableCode(error), boundedBackoff(claim.attempts));
  }
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
disconnect/malformed message. Assert the callback enters forced-bypass at
`5_001 ms`, remains bypassed on DB/Redis uncertainty, and recovers only after
both proofs; test `5_000/5_001`. DB fixtures use unique event prefixes and delete
only owned rows; Redis cleanup uses only the test namespace.

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
