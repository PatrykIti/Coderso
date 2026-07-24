# TASK-551-10-L01: Small/Large Load, Fault, Security, and Redis Smoke Gates
# FileName: TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md

**Parent Subtask:** TASK-551-10
**Priority:** High
**Category:** Performance / Reliability / Security / Runtime Smoke
**Estimated Effort:** Large
**Dependencies:** TASK-551-01 through TASK-551-09 landed with targeted gates;
TASK-551-11 pre-implementation audit PASS; parent external dispatch gate
reverified for TASK-511, TASK-493, TASK-517, and TASK-518
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Create and execute the aggregate release-blocking evidence for TASK-551. Run the
frozen small/large profiles against real PostgreSQL, exercise memory/Redis
semantic parity and failure transitions, prove cache security boundaries, wire
the performance/security/reliability suites into the existing Coderso release
gate, and run at least five real flows through two separate application
processes sharing a real Redis service.

This leaf owns harnesses, gate registration, CI Redis provisioning, and final
runtime evidence only. It cannot fix a production failure. Every product defect
returns to its TASK-551-01..09 single writer, after which this leaf reruns the
affected targeted and aggregate commands from a fresh process.

## Exact Single-Writer Ownership

This leaf may create or edit only:

- `tests/perf/task551DatabaseCachePerformanceGate.test.ts`;
- `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts`;
- `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts`;
- `tests/security/task551ServerCacheSecurityGate.test.ts`;
- `tests/helpers/task551RedisProcessHarness.ts`;
- `scripts/task551-redis-smoke.ts`;
- `scripts/coderso-release-gates.ts` (additive TASK-551 commands only);
- `.github/workflows/coderso-pr-gates.yml` (one pinned Redis service and bounded
  TASK-551 gate environment/command wiring only);
- `_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json` (sanitized final
  evidence only).

It reads, but never edits, TASK-551-01's frozen inventory/budget artifacts and
the targeted test receipts owned by TASK-551-02..09. Before writing either
shared gate file, re-read current bytes and confirm no active external task owns
the same region. A collision blocks dispatch and returns to orchestration.

Forbidden paths include all `core/**` production modules, `core/db/migrations/**`,
`core/db/schema*`, TASK-551 task files, `_docs/_CHANGELOG/**`, product/developer
docs, Admin/browser sources, and every targeted test owned by TASK-551-01..09.
This leaf must not rebaseline or weaken an owner assertion.

## Frozen Inputs and Fixture Safety

- Consume the exact versioned performance-budget and query-ownership artifacts
  produced by TASK-551-01; do not copy their constants into this leaf.
- The `small` and `large` profiles use TASK-551-01's exact row counts, payload
  sizes, concurrency, warm-up, sample count, percentile method, hardware/context
  metadata, and non-weakened budgets.
- DB fixtures use one run UUID in every owned slug/key and record every created
  row ID. Teardown deletes only those IDs in FK-safe order, including failure
  paths. Never assert a globally empty table or delete another suite's rows.
- Redis uses an unpredictable task-run namespace below the configured test-only
  prefix. Store the namespace digest, never its raw value. Cleanup uses the
  harness's recorded exact keys/generation/outbox identities; no `KEYS`, broad
  `SCAN`, `FLUSHDB`, or `FLUSHALL`.
- Fail before load tests if PostgreSQL or Redis reachability/version checks fail.
  Redis must be a real supported 7.2+ server; mocks and in-memory substitutes do
  not satisfy the integration/smoke contract.

## Automated Gate Matrix

### Small and large performance

- Point reads, bounded lists/keyset traversal, full-text/trigram search,
  aggregate consolidation, retention batches, pool saturation, memory LRU, Redis
  cache, and eligible public-render hit/miss paths run under both profiles.
- Record p50/p95/p99, rows read/returned, exact query count, bytes transferred,
  pool wait/saturation, cache hit/miss/error, serialized bytes, eviction,
  coalesced loaders, and invalidation lag.
- Assert exact zero PostgreSQL queries for a warm eligible public HTML hit and
  prove unsafe/private/preview/nonce variants bypass cache with bounded DB work.
- Compare sanitized `EXPLAIN (ANALYZE, BUFFERS)` plan fingerprints against the
  TASK-551-01 baseline and each owning migration receipt. A different plan is
  investigated; snapshots never include bind values or raw data.

### Fault and reliability

- Memory corrupt/unknown/expired/oversized envelope, byte/count eviction, loader
  failure, shutdown, and concurrent single-flight transitions.
- Redis connect timeout, command timeout, circuit open/half-open/close,
  disconnect, reconnect, corrupt/oversized value, generation read/bump failure,
  Pub/Sub loss, and process restart. Outage bypasses to DB and never starts a
  persistent local value cache.
- Commit/rollback/no-op invalidation, outbox claim/retry/never-discard policy,
  `FOR UPDATE SKIP LOCKED` concurrency, worker crash/reclaim, duplicate delivery,
  stale-generation fill rejection, lease expiry, token mismatch, and
  compare-and-delete release.
- Migration from the pre-TASK-551 snapshot and a clean database, plus next-free
  journal/snapshot integrity after re-reading TASK-518 and all migration owners.

### Bounded-eventual public-cache consistency

- Public Redis cache coherence is explicitly bounded-eventual, not linearizable.
  When Redis is globally unavailable, both processes must bypass cache and read
  PostgreSQL/render. During ambiguous or partial generation delivery, a safe
  public old-generation value may remain observable until the outbox worker
  delivers the bump or the measured policy TTL expires.
- The healthy worker poll interval is at most 250 ms and healthy committed-public
  invalidation lag must meet p99 at most 1 second. Oldest pending or locally known
  incoherent age above 5 seconds raises an alert, degrades readiness, and causes
  cache bypass wherever that barrier is visible until recovery.
- Every affected policy's hard TTL is measured and recorded. Public HTML is at
  most 600 seconds and no server-cache policy exceeds 3,600 seconds; the smoke
  records both observed invalidation lag and the applicable hard ceiling.
- Admin post-write preview/readback bypasses shared public cache and provides
  read-after-write. Private/password, auth/RBAC, security settings, drafts,
  previews, and nonce-bearing data remain fail-closed and DB-authoritative; no
  stale public-cache allowance applies to them.

### Security

- Scan keys, strict envelopes, cache values, Pub/Sub, outbox rows, telemetry,
  logs, EXPLAIN/evidence, and persisted smoke JSON for forbidden secrets/PII.
- Prove private/password/draft/preview/nonce-bearing/session/auth/RBAC and
  cross-identity Admin values never enter a shared cache or survive an identity/
  permission-epoch transition.
- Exercise hit, miss, Redis outage, reconnect, and stale-generation paths without
  bypassing current auth, CSRF, rate-limit, nonce/HMAC, CAPTCHA, or bot policy.
- Assert arbitrary Redis commands/keys and unknown cache/cursor fields never
  cross a route boundary.

## Required Two-Process Redis Real Flows

`scripts/task551-redis-smoke.ts` starts two independent Coderso server processes
(`processA` and `processB`) on task-owned ports. They share PostgreSQL and one
real Redis namespace, but not process memory. Restart from current built/source
bytes before the smoke; no hot-reload process qualifies. Run these exact ordered
scenario IDs:

1. `cross-process-warm-public-zero-db` — A fills one eligible published public
   response; B serves the identical validated value with exactly zero PostgreSQL
   queries and no process-local persistent value.
2. `post-commit-generation-and-rollback` — A commits an update and B observes the
   new value after waiting for bounded outbox/generation recovery and records the
   observed lag; a rolled-back update emits no generation/outbox change and B
   retains the authoritative committed value. The scenario does not assert
   immediate cross-process linearizability.
3. `redis-outage-outbox-recovery` — Redis becomes unavailable around a committed
   mutation; while Redis is globally unavailable both processes bypass to
   PostgreSQL and the API keeps the committed result. For ambiguous/partial
   delivery the test permits only safe public old-generation data within the
   declared lag/TTL model, asserts the 5-second alert/readiness behavior, waits
   for reconnect plus durable outbox delivery, then requires B to return the new
   value and records the recovery lag. It never claims linearizability.
4. `distributed-lease-and-stale-fill` — simultaneous cold requests from A and B
   produce the bounded loader count promised by the lease contract; a generation
   change during fill rejects stale publication, and token-mismatched release
   cannot delete another holder's lease.
5. `security-private-and-nonce-isolation` — both processes exercise public,
   private/password, preview, and nonce-bearing server paths; restricted bodies,
   secrets and nonce output never appear in shared keys/values or the other
   process's response. Admin browser identity/permission-epoch behavior remains
   the independently run TASK-551-09-L04 Vitest contract, not a claim made by
   this non-browser smoke.

Every scenario uses real HTTP/runtime entry points, asserts response/DOM or
persisted state plus exact query/cache/invalidation telemetry, and cleans only
owned rows/keys/processes/ports in `finally`. Zero unhandled process errors are
allowed. Because this is a non-UI infrastructure smoke, the structured
`screenshots` array is exactly empty; any UI/editor files touched by TASK-551-09
retain their separately required Playwright visible-effect smoke.

## Structured Evidence

Write exactly one final
`_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json` conforming to
`Task551RedisSmokeEvidenceV1` from TASK-551-10. The gate runner additionally
emits `.tmp/task-551/aggregate-gates-v1.json` using
`Task551AggregateGateEvidenceV1`. Both reject unknown fields, scenario
duplicates/reordering, non-finite/negative metrics, raw namespace/URLs, unknown
commands, required skips, and evidence above the bounded size declared by the
harness.

The tracked smoke evidence contains only version, digests, bounded aggregates,
the exact `publicConsistency` SLO/TTL constants, assertion IDs, and pass/failure
summaries. It contains no response body, raw Redis key, SQL, bind, cookie, header,
credential, path with user data, or raw log.

## Security Contract

- **Visibility/routes:** no route changes; only existing public reads and
  authenticated Admin paths are invoked.
- **Auth/RBAC:** use synthetic least-privileged sessions plus one scoped Admin
  fixture; prove identity and permission-epoch separation. Never persist session
  or CSRF material.
- **CSRF/rate limit/anti-abuse:** existing writes retain CSRF and current buckets;
  public-write probes retain nonce/HMAC/CAPTCHA. Cache failures cannot bypass
  them.
- **Validation:** strict command/profile/scenario/evidence allowlists and all
  parent clamps apply. Unknown fields and duplicate IDs fail before execution.
- **DB/Redis:** isolated fixtures and exact-key cleanup only. Connections have
  bounded connect/command/query/idle timeouts and close in `finally`.
- **Secrets/privacy:** redact before any output; any forbidden pattern blocks the
  evidence write and closure.

## Implementation Pseudocode

```ts
async function runTask551AggregateGates(deps: GateDeps): Promise<GateEvidence> {
  const budgets = await deps.loadAndValidateFrozenTask551Budgets();
  await deps.requirePostgresReachable();
  await deps.requireRealRedis({ minimum: "7.2.0" });

  const profiles = [];
  for (const profile of ["small", "large"] as const) {
    const fixture = await deps.seedOwnedFixture(profile);
    try {
      profiles.push(await deps.measureProfileAgainstFrozenBudgets(fixture, budgets));
    } finally {
      await deps.cleanupExactFixture(fixture);
    }
  }

  const fault = await deps.runMemoryRedisOutboxFaultMatrix();
  const security = await deps.runCacheSecurityMatrix();
  const smoke = await runTwoProcessRedisSmoke(EXACT_SCENARIO_IDS);
  return deps.normalizeAggregateEvidence({ profiles, fault, security, smoke });
}

async function runTwoProcessRedisSmoke(ids: readonly SmokeId[]) {
  const scope = await createOwnedPostgresRedisProcessScope();
  try {
    const [processA, processB] = await scope.startTwoFreshServers();
    await scope.requireHealthy(processA, processB);
    return await runSequentialScenarios(ids, { processA, processB, scope });
  } finally {
    await scope.stopOwnedProcessesAndCleanupExactState();
  }
}
```

**Data flow:** frozen budgets/inventory → reachability/version preflight →
owned small/large fixtures → measured Bun/DB/cache matrices → two fresh
processes + real Redis scenarios → sanitized strict evidence → release-gate
registration and post-audit handoff.

**Error handling:** unavailable infrastructure, required skip, budget regression,
unexpected plan/query count, malformed evidence, process error, leaked secret,
or incomplete cleanup returns `{ pass:false }`, preserves diagnostic IDs without
sensitive bytes, and blocks closure. Source correction is delegated to the
original owner; this leaf never changes a production assertion to pass.

**Regression-test shape:** test harness self-tests reject fake Redis, one-process
execution, reordered/missing scenarios, unbounded cleanup, raw namespace/URL,
non-finite metrics, unknown evidence fields, required skips, and evidence writes
after failed cleanup. Gate-runner tests prove the new performance, security, and
reliability commands are release-blocking.

## Exact Validation Commands

Load repository environment for every DB/settings command, but never print it:

```bash
set -a && source .env && set +a
bun --cwd core lint:types
bun --cwd core lint
bun test --timeout 120000 tests/perf/task551DatabaseCachePerformanceGate.test.ts
bun test --timeout 120000 tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts
bun test --timeout 120000 tests/security/task551ServerCacheSecurityGate.test.ts
bun test --timeout 180000 tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-test REDIS_URL="$REDIS_URL" bun scripts/task551-redis-smoke.ts
bun run test:vitest -- \
  tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts \
  tests/vitest/cache/memory-server-cache-store.test.ts \
  tests/vitest/cache/server-cache-coordinator.test.ts
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

The script derives a random run suffix below the literal test prefix; the
literal command value is not the final shared namespace. Verify `DATABASE_URL`
and `REDIS_URL` reachability before the full commands. A missing required service
blocks rather than skips. Re-run any named failure once in isolation before
classification. Run the exact migration apply/upgrade suites and targeted
Vitest paths handed off by TASK-551-01..09 in addition to this aggregate list.
The aggregate Vitest harness must assert that every five named cache files exists
and that discovery/execution counts are non-zero; an empty selection is a failure.

Before handoff, count every production and test file touched from the verified
pre-family baseline; any human-authored file over 1,000 physical lines fails.

## Documentation Updates Required

None in this leaf. TASK-551-10-L02 consumes the gate/smoke receipts and is the
sole final documentation and metadata writer.
