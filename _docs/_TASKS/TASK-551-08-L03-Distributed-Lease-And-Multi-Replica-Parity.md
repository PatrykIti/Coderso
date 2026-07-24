# TASK-551-08-L03: Distributed Lease and Multi-Replica Parity
# FileName: TASK-551-08-L03-Distributed-Lease-And-Multi-Replica-Parity.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-08
**Priority:** Critical
**Category:** Cache / Redis / Concurrency / Runtime
**Estimated Effort:** Large
**Dependencies:** INITIAL phase after TASK-551-02-L02; FINAL phase after
TASK-551-08-L02 plus the TASK-551-03-L02 response-header consumption receipt;
parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Implement token-safe distributed cold-load coalescing and compose the memory or
Redis runtime once per process, including worker/PubSub lifecycle and graceful
participant close behavior. The terminal TASK-551-02 `runtimeEntrypoint.ts` alone
owns signals, listen, HTTP drain and lifecycle start/close. Prove two-client/
multi-process semantic parity without adding an L1
value cache in Redis mode. Before TASK-551-03-L02 lands, first add the narrow
route-response-header transport seam needed for its private form-submission
detail response; the later runtime composition phase reopens only this leaf's
same HTTP owner after L02 returns its consumption receipt.

## Sub-Tasks

None. This executable leaf has two mandatory serialized phases and remains
`🚧 In Progress`/non-releasable between them:

1. **INITIAL response-header seam:** after TASK-551-02-L02, add only the strict
   route-local response-header API and HTTP propagation tests. Return a
   compile-green receipt before TASK-551-03-L02 edits `formsRoutes.ts`.
2. **FINAL cache/runtime composition:** after TASK-551-08-L02 and the 03-L02
   consumption receipt, implement the lease, singleton cache runtime, capacity
   catalog and composed lifecycle behavior below. Do not reopen any 03 file.

## Exclusive Ownership

Sole writer of:

- existing `core/server/router.ts` only for the INITIAL strict route-response-
  header type/API;
- new `core/services/cache/redisCacheLease.ts`;
- new `core/services/cache/serverCacheRuntime.ts`;
- new `core/services/cache/serverCachePolicyCapacityCatalog.ts` for the closed
  mandatory v1 descriptors consumed at startup;
- existing `core/server/httpServer.ts` only for the exact composed participant,
  cache runtime, retention and existing backup start/stop lifecycle wiring
  described below, plus INITIAL collection/propagation of the strict route-
  local response headers on JSON success and mapped errors;
- new `tests/integration/server/route-response-headers.test.ts` in INITIAL;
- new `tests/integration/server/redis-distributed-lease.test.ts`;
- new `tests/integration/server/server-cache-runtime-lifecycle.test.ts`;
- new `tests/integration/server/redis-multi-replica-parity.test.ts`.

Within `httpServer.ts`, this leaf solely owns the exact
`registerComposedHttpRuntimeParticipants()` composition seam and its idempotent
module-evaluation call before their shared runtime entrypoint starts lifecycle.

INITIAL adds `RouteContext.setResponseHeader(...)` backed by one request-local,
write-only response-header bag. Its closed v1 contract accepts only these exact
name/value pairs: `Cache-Control` / `private, no-store, max-age=0`, `Pragma` /
`no-cache`, and `Expires` / `0`. Name matching is ASCII case-insensitive but is
canonicalized to those three spellings; unknown names, alternate values,
control/newline bytes, duplicate conflicting writes and values above 64 UTF-8
bytes fail `route_response_header_invalid` before mutation. Handlers cannot read,
replace or obtain the backing bag. `httpServer.ts` merges the accepted bag into
the final JSON `Response` on normal completion and into `errorResponse(...)` on
every caught/mapped route error, without replacing security/request-ID/CORS or
`Content-Type` headers. The bag is created after exact route match and never
crosses requests. TASK-551-03-L02 installs its no-store header middleware as the
first handler of the submission-detail route, before permission, validation and
DB handlers; therefore all success and route-mapped 4xx outcomes carry the same
three headers. INITIAL changes no endpoint, auth behavior or cache runtime.

TASK-511 remains sole owner of `core/services/backups/**` and backup scheduler
behavior. Re-read its parent-gate terminal or exact serialized handoff
`httpServer`/dev/prod bytes before editing and
preserve the scheduler seam. Forbidden: TASK-551-07/08-L01/L02 owners, public/
domain/Admin adoption, TASK-517 `publicSite.tsx`, TASK-493 SEO, package files,
task/board/changelog/workflow/docs. TASK-551-02-L02 is the sole writer of both
`core/server/dev.ts` and `core/server/prod.ts`; consume their terminal generic,
awaited `runRuntimeEntrypoint(...)` delegation read-only without editing either
file. If the
terminal seam is absent or either caller drifts, return ownership to
TASK-551-02-L02 instead of installing competing signal handlers.

The exact required TASK-551-02-L02 seam consumed here is only
`registerRuntimeLifecycleParticipant({ id, phase, start, close })`. Its terminal
`runtimeEntrypoint.ts` is the sole production caller of
`startRuntimeLifecycle()` and `closeRuntimeLifecycle(reason)` and the sole owner
of process signals, listen, stop-accepting, bounded HTTP drain/force-stop and
startup-failure rollback. `prod.ts` and `dev.ts` are thin mode adapters that import
`httpServer.ts` for module-evaluation registration and delegate only to
`runRuntimeEntrypoint(...)`; neither directly starts/closes lifecycle or owns a
signal/drain path. Importing `httpServer.ts` evaluates one idempotent
`registerComposedHttpRuntimeParticipants()` call before the runtime entrypoint can
start participants. L03 never edits `runtimeEntrypoint.ts`, `dev.ts` or `prod.ts`,
never calls lifecycle start/close, and never adds another signal/listen/drain
owner. Absence or name/behavior drift in that seam blocks implementation and
returns to TASK-551-02-L02.

L03 remains the sole TASK-551 writer of `core/server/httpServer.ts` and is also
the final composition owner for the already-landed TASK-551-03/06 handoffs. It
owns the exact idempotent pre-start seam
`registerComposedHttpRuntimeParticipants(): void`; `httpServer.ts` calls it once
at module evaluation, and repeat calls cannot register twice. The terminal
`runtimeEntrypoint.ts` remains the only lifecycle start/close caller. The seam must:

1. preserve TASK-551-03's already-registered pagination lifecycle participant and
   its validated keyring/router injection exactly; do not load a keyring, create
   a second pagination participant, or reorder its existing registration;
2. register TASK-551-06-L03's terminal
   `createRetentionSchedulerLifecycleParticipant(...)` worker participant
   without recreating its scheduler/config logic;
3. register the existing backup scheduler as worker `backup-scheduler`, with
   `startBackupScheduler()` in `start` and `stopBackupScheduler()` in `close`;
4. register `server-cache` in cache phase.

Remove the direct `startBackupScheduler()` call from `startHttpServer()`. Never
edit `backupScheduler.ts`, `prod.ts`, 03, or 06 owner files. Missing/drifted 03
pagination registration or 06 participant-factory receipts block implementation
instead of creating a second owner.

## Lease and Runtime Contract

- Lease key is a bounded digest derived from the final L01 value key. Acquire is
  `SET leaseKey random128BitToken NX PX leaseMs`.
- `redisCacheLease.ts` consumes L01's exact branded acquire input and bounds:
  lease `100..10_000 ms` (default 2,000), total wait `0..500 ms` (default 250),
  poll jitter `10..50 ms` with min `<=` max. Values are internal/config-derived,
  never request-controlled; this leaf does not redeclare a competing interface.
- Release/renew use Lua compare-token operations; a former owner cannot delete
  or extend a successor's lease. Timeout/disconnect means ownership is unknown.
  A `lost|unknown` renew prevents an owned-write attempt. Release is attempted
  token-safely after loading and any owned-write attempt as best-effort cleanup;
  its result cannot retroactively authorize or invalidate a fill.
- Implement every exact L01 result: acquire returns `owner`, `waiter`, or typed
  `bypass`; owner renew/release returns the exact success/lost/unknown union;
  waiter returns cloned bytes/timeout/unavailable; runtime failures never escape
  as an untyped lease error. `close()` is concurrency-safe/idempotent, rejects
  later acquire through the exact closed bypass, and attempts only token-safe
  release of leases still owned by this process.
- `ServerCache.getOrLoad(request)` is the sole load/fill-attempt/fill owner.
  After an eligibility-scope-bound process-local attempt wins, a distributed
  winner runs the typed loader. A valid `no_fill` returns that owner's own
  authoritative value with zero encoding or owned write; each local joiner runs
  its own authoritative no-fill loader, so request-scoped output is never shared.
  A valid positive/eligible-negative `fill` converts its primary plus
  optional positive branded companion into L01's one validated
  `CacheConditionalWrite`, and calls only
  `owner.putIfGenerationsAndLeaseOwned(...)`. Consumers never construct the
  conditional write or call a backend/owner write primitive. One bounded Redis Lua
  operation compares the exact random owner token and every expected finite
  generation, then writes all one or two entries or none. It returns `written`,
  `generation_changed`, `lease_lost`, or bounded redacted `unavailable`; every
  uncertain dispatched Lua failure is `unavailable` with
  `physicalOutcome:"unknown"`, because bytes may exist, and every non-`written`
  result returns the fresh authoritative value without publication. Before that
  Lua call, reuse L01's exact internal
  `validateRedisConditionalWriteBeforeCommand(...)`; strict envelope decode,
  matching entry/envelope `fillKind`, positive versus required non-null negative
  ceiling and TTL/lifetime/byte checks must pass for every entry. Any forged or
  malformed mismatch performs zero Redis commands. Positive companions retain
  their independently sampled policy TTL. The generation-only Redis store
  `writeIfGenerationsMatch(...)` is never called by
  a distributed owner. Waiters poll cache within the bound. Exactly one
  distributed loader is guaranteed only when the winner completes within the
  waiter budget. After timeout or Redis error, availability permits DB fallback
  without cache fill. Because timeout/unavailable is not a published shared
  outcome, each waiting caller then runs its own authoritative no-fill loader;
  no `TResult`, error, nonce/token or caller-specific response crosses callers.
- `serverCacheRuntime.ts` is the only composition root. Memory mode constructs
  one coherence controller, the memory store, and an L02 invalidation handle
  with no Redis/outbox/PubSub client. Redis mode constructs the same single
  controller plus one shared Redis store, lease coordinator and L02
  `CacheInvalidationRuntimeHandle` (worker plus optional Pub/Sub); it constructs
  no `MemoryServerCacheStore` or persistent value `Map`. Stores receive the
  controller and delegate exact health composition to it.
- Before publishing the runtime or allowing HTTP listen, validate the closed
  `SERVER_CACHE_MANDATORY_POLICY_CAPACITY_V1` catalog through L01 against
  `store.describe()` and the normalized namespace. It contains exactly the four
  policies adopted by 09: `public-runtime@1`/`262_144`,
  `public-html-manifest@1`/`32_768`, `public-html@1`/`2_000_000`, and
  `redirects@1`/`65_536` maximum encoded-envelope bytes. Exact maximum canonical
  key overhead is additional. A missing/duplicate/mismatched/impossible descriptor
  fails startup; TASK-551-09 policies must match rather than silently bypass.
- Export the exact singleton surface:

  ```ts
  type ServerCacheRuntime = Readonly<{
    mode: ServerCacheBackend;
    cache: ServerCache;
    invalidation: Readonly<{
      applyAfterCommit(plan: CacheInvalidationPlan):
        Promise<"applied" | "queued" | "bypassed">;
    }>;
    health: () => Promise<ServerCacheHealth>;
  }>;

  getServerCacheRuntime(): ServerCacheRuntime;
  ```

  After successful lifecycle start the accessor returns the same frozen object
  on every call; it never creates or starts a runtime. Memory constructs no
  distributed load coordinator. The store, controller, workers, Pub/Sub, lease
  coordinator, stop/drain/close methods and clients remain private to the
  composition root and cannot be downcast/re-exported. Before start and after close it throws stable
  `server_cache_runtime_unavailable`. Concurrent/idempotent start publishes
  exactly one instance; no caller, including TASK-551-09, may construct a second
  cache/coherence/invalidation runtime. `getServerCacheRuntime().cache` is the
  canonical consumer cache surface. Post-commit consumers call and await
  `runtime.invalidation.applyAfterCommit(plan)` before resuming; runtime exposes
  no controller or separate epoch-advance helper for that plan.
- Explicit Redis config/startup failure stops boot. Post-start failure reports
  the exact `redis_store` force signal to the one controller, producing degraded
  `forced_bypass(reason="redis_unavailable", affectedFamilies="all")`, while
  HTTP continues through DB/render. The L02 handle reports worker force/recovery
  signals with affected finite tags and bounded oldest pending age, never event
  payloads. Immediate post-commit failure reports its finite plan tags before
  returning. Healthy polling is at most
  250 ms, invalidation p99 target is at most 1 second, and oldest-pending age
  above 5,000 ms transitions to
  `forced_bypass(reason="outbox_lag", affectedFamilies="all")`. While forced,
  the coordinator skips Redis value GET, distributed lease, conditional fill,
  and ordinary fill; it uses authoritative DB/render plus the epoch-scoped
  eligibility-scope-bound fill-attempt registry; every non-published outcome still
  loads once per caller. Recovery requires both a ready Redis probe
  and L02's fresh current-watermark `outbox_worker` recovery; this clears only
  the global lag fence. Exact failed-post-commit fences remain until their own
  durable processed receipts. Reads resume only when no global/event fence remains.
  Unknown/malformed state remains bypassed. This is
  bounded-eventual public caching, not linearizability;
  security/auth/private values never use it.
- Start/close are concurrency-safe and idempotent. Shutdown stops new claims,
  awaits the L02 handle's bounded drain/close result (including Pub/Sub), closes
  the distributed coordinator so owned leases release only when token-safe,
  closes `ServerCache`/its store, clears the singleton accessor, and then allows
  server/process exit. A timed-out drain is reported with its stable code and
  leaves claims recoverable; DB lifecycle close begins only after the handle's
  bounded close returns.

## Implementation Pseudocode

```ts
// INITIAL only: router.ts owns the closed header contract; httpServer.ts owns
// its request-local bag and applies it to both success and caught error output.
type RouteResponseHeaderContractV1 = Readonly<{
  "Cache-Control": "private, no-store, max-age=0";
  Pragma: "no-cache";
  Expires: "0";
}>;
type RouteContext = Readonly<{
  // existing fields remain unchanged
  setResponseHeader<K extends keyof RouteResponseHeaderContractV1>(
    name: K,
    value: RouteResponseHeaderContractV1[K],
  ): void;
}>;

function registerComposedHttpRuntimeParticipants(): void {
  if (composedParticipantsRegistered) return;
  composedParticipantsRegistered = true;
  // TASK-551-03's pagination participant/keyring wiring is already registered.
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
registerComposedHttpRuntimeParticipants(); // httpServer.ts module evaluation
// No signal, lifecycle start/close, listen, stop or HTTP drain call is permitted
// here. Terminal runtimeEntrypoint.ts owns that complete algorithm. Consumers may
// call getServerCacheRuntime().cache only after its lifecycle start has completed.

// redisCacheLease.ts implements the owner method consumed only by ServerCache.
async function putIfGenerationsAndLeaseOwned(write) {
  const validated = validateRedisConditionalWriteBeforeCommand(
    write,
    config.maxEntryBytes,
  ); // validation failure has issued zero Redis commands
  return normalizeOwnedWriteReplyOrUnknownPhysicalOutcome(
    await withCommandDeadline(() => evalBounded(
      VERIFY_LEASE_GENERATIONS_AND_PUT_ONE_OR_TWO_LUA,
      leaseKeyAndGenerationKeys(validated),
      leaseTokenAndValidatedEntries(validated),
    )),
  );
}
```

## Security Contract

- **Visibility/routes:** no route surface changes; only server lifecycle.
- **Auth/RBAC/CSRF/rate limits:** existing ordering is preserved; cache startup
  and bypass cannot skip middleware.
- **Validation:** bounded lease/token/wait/poll/shutdown and strict runtime config.
- **Response headers:** INITIAL exposes only the closed three-pair private/no-
  store contract. Route code cannot inject arbitrary headers, cookies, CRLF or
  cross-request state through this seam; caught route errors preserve the
  already-installed safe headers without leaking error detail.
- **Secrets/privacy:** random lease token and digested key only; Redis URL and
  values never enter logs/process messages.
- **Anti-abuse:** no public write; lease contention cannot wait indefinitely or
  amplify one request into unbounded Redis/DB work.

## Testing Requirements

Use two independent Redis clients and, where feasible, two spawned Core
processes: prove one loader for 1/10/50 cold requests whose successful shareable
fill completes within the wait budget. For coupled primary-plus-companion
publication, including unequal positive TTLs, use two spawned processes and prove
one winning loader/render, both entries become visible
atomically, every waiter resolves through its primary policy, and the losing
process performs no generation-only or owned fill. Prove timeout/winner-crash
fallback runs one authoritative no-fill loader per waiting caller, shares no
caller result, and preserves token-safe expiry/reacquire. Pin atomic owned-write `written`,
`generation_changed`, `lease_lost`, and `unavailable`; every non-`written`
outcome must return authoritative bytes without publication, and uncertain
dispatch must report unknown physical outcome even if a later independent strict
GET observes valid bytes. The generation-only store
write must remain uncalled, and post-attempt release cannot change fill authority.
Before the owned-write Lua, pin the shared strict validator's positive/negative
success, entry/envelope `fillKind` mismatch, unknown/malformed discriminator,
null-negative policy and TTL/lifetime/byte failures; every invalid one/two-entry
bundle performs zero Redis commands. Also prove two-client bump visibility, Redis
outage DB bypass with no local value reuse and one authoritative loader per caller
(not one shared result), reconnect,
250 ms polling/1-second p99 and exact 5,000/5,001 ms transitions. Assert forced
bypass executes zero Redis value GET/fill/lease calls and recovery requires both
proofs. Pin every exact distributed acquire/owner/waiter/bypass result, lease/
wait/poll min/max/max+1, unavailable/closed stable outcomes and idempotent close.
Run concurrent distinct eligibility-scope, auth, `no_fill` and per-request
token/nonce cases; only a successfully `written` fill may serve local joiners via
their own `resolveCached`, while every non-published outcome remains per-caller.
Prove `registerComposedHttpRuntimeParticipants()` runs at `httpServer.ts` module
evaluation before terminal `runtimeEntrypoint.ts` starts lifecycle, preserves 03's already-
registered pagination participant/keyring identity, and never loads/registers a
second one; cache,
`createRetentionSchedulerLifecycleParticipant(...)`, and backup register exactly
once; `startHttpServer` no longer starts backup directly;
L02 stop/close→lease close→store close→database ordering and existing backup
behavior remain intact. Validate `runtimeEntrypoint.ts`, `dev.ts` and `prod.ts`
read-only: the entrypoint remains the sole production importer/caller of lifecycle
start/close and sole signal/listen/drain owner; both mode adapters have no direct
start/close/signal/drain call and delegate only to `runRuntimeEntrypoint(...)`.
Assert no other production caller exists.
Pin `getServerCacheRuntime()`
before start, repeated `.cache` identity, concurrent start, after close, and prove
TASK-551-09 consumers cannot create a second instance or access a `.serverCache`,
store, controller, worker, Pub/Sub, lease, stop/drain/close alias. Pin frozen
`mode/cache/invalidation.applyAfterCommit/health` as the complete public key set.
Assert all four capacity descriptors match 09's policy tables and exact maximum
key-plus-envelope bytes pass while max+1/impossible config fails before listen.
Assert post-commit consumers await only `invalidation.applyAfterCommit(plan)`,
never detach it, and cannot resume before observation/force-fence visibility;
controller `report(...)` is the sole epoch mutator and no double/second
`advance*Epoch` path exists.
Assert public/auth behavior is not changed yet.

INITIAL's direct HTTP integration suite registers synthetic handlers and proves
all three exact headers survive JSON success plus mapped 400/403/404/409 errors;
it also proves request isolation, same-value idempotence, case canonicalization,
and rejection of unknown names, alternate/control/newline/max+1 values and
conflicting duplicates before the response bag changes. The suite asserts the
existing security, request-ID, CORS and content-type headers remain intact. It
then imports the real 03-L02 route after that leaf's receipt and proves the
submission-detail endpoint emits the exact three headers on success and every
route-mapped 4xx while unrelated routes do not inherit them.

```bash
set -a && source .env && set +a
# INITIAL gate, before TASK-551-03-L02:
bun test tests/integration/server/route-response-headers.test.ts
bun --cwd core lint:types
bun --cwd core lint
# FINAL gate, after TASK-551-08-L02 and the 03-L02 receipt:
SERVER_CACHE_BACKEND=redis SERVER_CACHE_NAMESPACE=task551-l03 \
  bun test tests/integration/server/redis-distributed-lease.test.ts \
  tests/integration/server/server-cache-runtime-lifecycle.test.ts \
  tests/integration/server/redis-multi-replica-parity.test.ts
bun test tests/integration/runtime/backupScheduler.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/{redisCacheLease,serverCacheRuntime,serverCachePolicyCapacityCatalog}.ts \
  core/server/router.ts core/server/httpServer.ts \
  tests/integration/server/route-response-headers.test.ts \
  tests/integration/server/{redis-distributed-lease,server-cache-runtime-lifecycle,redis-multi-replica-parity}.test.ts
```

## Documentation Updates Required

Redis is mandatory for this leaf's acceptance. Full five-scenario runtime smoke
and operational documentation remain owned by TASK-551-10.
