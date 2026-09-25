# TASK-551-08-L03: Distributed Lease and Multi-Replica Parity
# FileName: TASK-551-08-L03-Distributed-Lease-And-Multi-Replica-Parity.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-08
**Priority:** Critical
**Category:** Cache / Redis / Concurrency / Runtime
**Estimated Effort:** Large
**Dependencies:** INITIAL phase after TASK-551-02-L03; FINAL phase after
TASK-551-08-L02 plus the TASK-551-03-L02 response-header consumption receipt;
parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; closure only)

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

1. **INITIAL response-header seam:** after TASK-551-02-L03, add only the strict
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

Only after terminal TASK-551-02-L03, INITIAL's direct HTTP integration suite registers synthetic handlers and proves
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

## INITIAL implementation rulings (2026-08-26, orchestrator)

Grounded by the fresh pre-implementation audit against HEAD
`7029fb7ee615b256e20f3ed191f54b1ac13b5c0e`; these rulings bind the INITIAL
phase and its later consumers (the TASK-551-03-L02 consumption receipt and the
FINAL composition reopenings):

- **R1 — Synthetic-handler dispatch seam.** `core/server/httpServer.ts` adds
  exactly one narrow internal export for tests: an api-request dispatcher that
  accepts injected `RouteDefinition[]` (default argument: the module router, so
  the production call path stays byte-for-byte identical). It must reuse the
  REAL pipeline — request-ID/security/CORS/response-header assembly, IP
  allowlist, body parsing, context creation, handler loop, centralized error
  mapping — never a parallel copy. No production caller besides the unchanged
  `fetch` path may use injected routes. The INITIAL suite installs Bun
  `mock.module` stubs for `core/services/settings/securitySettings` and
  `core/services/security/ipAllowlistService` BEFORE dynamically importing
  `core/server/httpServer.ts`, proving JSON success plus mapped
  400/403/404/409 through real dispatch with zero DB connectivity. Import-time
  prerequisite: `core/db/client.ts` requires `DATABASE_URL` to be SET (module
  evaluation constructs the pool lazily; no reachable database is needed). Bun
  auto-loads `.env`; if absent, the suite sets a placeholder value before
  import and documents that requirement in a comment.
- **R2 — Bag creation timing and parse-stage errors.** The write-only header
  bag is created immediately after exact route match, BEFORE body parsing, and
  that same bag backs `RouteContext.setResponseHeader`.
  `parserErrorResponse` merges accepted bag entries too (set-if-absent, see
  R4). At parse-stage failure no handler has run yet, so such responses carry
  no bag headers today; the seam remains structurally correct for every
  post-match outcome.
- **R3 — Lane scope.** Header propagation applies ONLY to the router-lane
  dispatch above. The prepared public form-write boundary
  (`executePreparedFormWrite`, its private `RouteContext` and error mapping in
  `publicFormsApi.ts`), the standalone `errorResponse` definitions in
  `publicFormsApi.ts`/`publicEntryUnlockApi.ts`/`publicBookingApi.ts`,
  OPTIONS 204, the IP-allowlist pre-route errors in `handleAdmin`/`handleApi`,
  and the unmatched-route plain-text 404 remain bag-free by construction.
  TASK-551-03-L02's submission-detail point read is a router-chain GET in
  `formsRoutes.ts`; its no-store handler runs as the FIRST handler, so every
  outcome that reaches the handler chain carries the three exact headers.
- **R4 — Merge precedence.** Bag entries apply set-if-absent against every
  already-present response header (security headers, request-ID regardless of
  its configured name, CORS, `Content-Type`, `Set-Cookie`), identically on the
  success-init path and on every post-errorResponse append path.
- **R5 — Mapped 404 source.** The INITIAL matrix's "mapped 404" comes from a
  matched handler throwing `ApiError(..., 404)` (for example
  `media_not_found`-style), never from the unmatched-route plain-text 404.

## Workflow Dispatch Envelope

The INITIAL router test is independently database-free: it installs its own
placeholder before importing the lazy client and stubs every DB-touching route
dependency. It can therefore run with no environment profile. The FINAL Redis
group now uses the one-use owner-injected `task551-redis-test` profile; its only
declared overrides are the grounded nonsecret backend and bounded namespace.
The Redis endpoint remains private to TASK-551-11 and never appears in this
envelope, argv, evidence, or logs.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-08-L03",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-08"
  },
  "allowlist": [
    "core/server/router.ts",
    "core/services/cache/redisCacheLease.ts",
    "core/services/cache/serverCacheRuntime.ts",
    "core/services/cache/serverCachePolicyCapacityCatalog.ts",
    "core/server/httpServer.ts",
    "tests/integration/server/route-response-headers.test.ts",
    "tests/integration/server/redis-distributed-lease.test.ts",
    "tests/integration/server/server-cache-runtime-lifecycle.test.ts",
    "tests/integration/server/redis-multi-replica-parity.test.ts"
  ],
  "forbiddenPaths": [
    "core/server/runtimeEntrypoint.ts",
    "core/server/dev.ts",
    "core/server/prod.ts",
    "core/services/backups/backupScheduler.ts",
    "core/server/routes/formsRoutes.ts",
    "core/server/paginationCursorLifecycle.ts"
  ],
  "dependencies": [
    "TASK-551-02-L03:single",
    "TASK-551-08-L02:single"
  ],
  "commands": [
    {
      "id": "initial-route-response-headers-test",
      "lane": "bun-test",
      "argv": ["bun", "test", "tests/integration/server/route-response-headers.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/route-response-headers.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "initial-core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "initial-core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-redis-distributed-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/redis-distributed-lease.test.ts", "tests/integration/server/server-cache-runtime-lifecycle.test.ts", "tests/integration/server/redis-multi-replica-parity.test.ts"],
      "environmentProfile": "task551-redis-test",
      "environmentOverrides": {
        "SERVER_CACHE_BACKEND": "redis",
        "SERVER_CACHE_NAMESPACE": "task551-l03"
      },
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/redis-distributed-lease.test.ts", "tests/integration/server/server-cache-runtime-lifecycle.test.ts", "tests/integration/server/redis-multi-replica-parity.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "final-core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-line-count",
      "lane": "tooling",
      "argv": [
        "wc",
        "-l",
        "core/services/cache/redisCacheLease.ts",
        "core/services/cache/serverCacheRuntime.ts",
        "core/services/cache/serverCachePolicyCapacityCatalog.ts",
        "core/server/router.ts",
        "core/server/httpServer.ts",
        "tests/integration/server/route-response-headers.test.ts",
        "tests/integration/server/redis-distributed-lease.test.ts",
        "tests/integration/server/server-cache-runtime-lifecycle.test.ts",
        "tests/integration/server/redis-multi-replica-parity.test.ts"
      ],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "initial",
      "dependsOn": ["TASK-551-02-L03:single"],
      "commandIds": [
        "initial-route-response-headers-test",
        "initial-core-lint-types",
        "initial-core-lint"
      ]
    },
    {
      "id": "final",
      "dependsOn": ["TASK-551-08-L02:single"],
      "commandIds": [
        "final-redis-distributed-tests",
        "final-core-lint-types",
        "final-core-lint",
        "final-diff-check",
        "final-line-count"
      ]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (handoff from TASK-551-03-L02; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-faza0-dispositions.md`
(TASK-551-03-L02 FAZA-0, HEAD `ae6bea8a`), owner decision **D1** and findings
**F-11** and **F-12** (WU-D handoff). This section amends only the FINAL
occurrence. INITIAL (landed) is unchanged. Earlier sections are not rewritten.

Verified anchors at HEAD `ae6bea8a`:

- `core/server/httpServer.ts:137-145`: `jsonResponse` always calls `JSON.stringify` and forces
  `Content-Type: application/json`. Every router-lane result is JSON-serialized,
  so there is no binary lane today (F-12).
- `core/server/router.ts:36-46`: `RouteResponseHeaderContractV1` is a closed
  contract with exactly `Cache-Control`/`Pragma`/`Expires`. It has no
  `Content-Type`, `Content-Disposition` or `Content-Length` (F-12).
- `core/server/routes/formsRoutes.ts:708-717`: this is the legacy synchronous `GET /forms/:id/submissions/export`
  route (F-11).
- `tests/integration/routes/forms.test.ts:136` (inventory), `:209`, and
  `:221-330` (behavior tests at :221, :237, :265, :298) pin the legacy route.
- `core/services/forms/submissionExportJob.ts:166` `verifySubmissionExportToken`
  (returns a boolean, with no named error code) and `:191`
  `readSubmissionExportArtifact` (TASK-571).

Corrections for the FINAL occurrence:

- **C1 — Binary download response lane (D1, F-12).** FINAL adds a binary response
  lane to `core/server/httpServer.ts`. It is a typed router-lane result
  that the dispatcher recognizes before `jsonResponse` and that streams an
  artifact body without JSON serialization. The lane emits `Content-Type`,
  `Content-Disposition` (an `attachment` with a sanitized, quoted filename) and
  `Content-Length` (the exact artifact size).
  It is a closed extension. The router header contract (`router.ts:36-46`)
  gains a separately versioned closed shape for these three binary headers.
  Values are validated fail-closed (`route_response_header_invalid`), the
  content type comes from a fixed allowlist (CSV/JSON export types), and
  CR/LF/non-ASCII bytes are rejected. The existing v1 no-store triple and the
  R4 set-if-absent merge precedence stay byte-identical for JSON responses.
  The artifact may reach 256 MiB, so the body must be streamed and never
  buffered or stringified. R3 lane scope is unchanged.
  FINAL tests extend `tests/integration/server/route-response-headers.test.ts`
  with binary-lane cases: the exact headers, a streamed body, rejection of
  invalid headers, and JSON-lane byte-identity.
- **C2 — Download route wiring (D1, F-12): route-file ownership.** The
  envelope `forbiddenPaths` (`:488-494`, entry `:493`) FORBIDS
  `core/server/routes/formsRoutes.ts` to this leaf. 08-L03 FINAL therefore does
  NOT wire the token-guarded `GET /forms/:id/export-jobs/:jobId/download`.
  That route (consuming `readSubmissionExportArtifact` /
  `verifySubmissionExportToken`, plus the named token-verification error code
  and its `mapFormError` row with map*Error tests) is owned by the
  TASK-551-03-L02 FINAL occurrence, the single owner of `formsRoutes.ts`.
  In the parent graph, the `TASK-551-03-L02:final` node depends on
  `TASK-551-08-L03:final`, so it dispatches only after this leaf's C1 binary
  lane has landed and passed its FINAL gates. 08-L03 FINAL provides only the
  lane and its typed result contract.
- **C3 — Legacy export route removal (D1, F-11): owned by 03-L02 FINAL.**
  The following are all owned by TASK-551-03-L02 FINAL, in the same
  occurrence as the C2 download route, so export capability never goes missing:
  - removing the legacy `GET /forms/:id/submissions/export` (`formsRoutes.ts:708-717`);
  - its `tests/integration/routes/forms.test.ts` assertions (`:136`
    inventory, the `:196-219` registration test including `:209`, and the
    `:221-331` behavior tests, anchors at HEAD `9c5b6666`);
  - the `formsClient`/`FormSubmissionsPage` switch to the job download.

  Ownership of `forms.test.ts` transfers from TASK-551-09-L01 to TASK-551-03-L02,
  and 09-L01 keeps executing it read-only. None of this runs under this
  envelope: both files are outside this leaf's allowlist and `formsRoutes.ts`
  is forbidden here. 03-L02 INITIAL keeps the legacy route and its tests
  untouched (D1).
- **C4 — Envelope amendment owed.** The Workflow Dispatch Envelope above is
  NOT edited by this correction. The FINAL FAZA-0 pre-implementation audit owes
  one envelope update: add FINAL commands for the binary-lane test cases (the
  `httpServer.ts`/`router.ts`/`route-response-headers.test.ts` allowlist entries
  already exist). The `dependencies`, `occurrences` ids and `dependsOn` stay
  unchanged. `formsRoutes.ts` stays in `forbiddenPaths` unless that audit rules
  otherwise.

### Round-2 amendment — 2026-09-25 (mirror of TASK-551-03-L02 R2-06; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round2-dispositions.md`
(R2-06, HEAD `9c5b6666`). C2 and C3 above were amended in place, because that
dated section had not yet landed. Changes made:

- the download path spelling is unified to `/forms/:id/export-jobs/:jobId/download`;
- the "BLOCKED" and "handed to 09-L01" wording is removed;
- TASK-551-03-L02 FINAL (graph node `TASK-551-03-L02:final`, `dependsOn:
  ["TASK-551-08-L03:final"]`) is named as the single owner of the download route,
  the legacy route removal, the `forms.test.ts` edits and the client/UI switch;
- the `forms.test.ts` anchors are refreshed.

This leaf's envelope (`allowlist`, `forbiddenPaths` including
`core/server/routes/formsRoutes.ts`, `dependencies`, occurrences) is unchanged.

### Round-3 addendum — 2026-09-25 (mirror of TASK-551-03-L02 R3-08; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md`
item R3-08 (orchestrator decision, HEAD `9c5b6666`; the cross-leaf part of
R3-32 is cited below). Anchors were re-grounded on 2026-09-25 at HEAD
`9c5b6666`. This amends only the FINAL occurrence; INITIAL (landed) and
earlier sections are not rewritten. The envelope (`allowlist`,
`forbiddenPaths` including `core/server/routes/formsRoutes.ts`,
`dependencies`, occurrences and command ids), `**Status:**` and
`**Changelog:**` are unchanged.

**C5 — the binary lane carries the no-store triple for the 03-L02 FINAL
download route.** Supersedes, in C1 (`:642-643`), the scope of "The existing
v1 no-store triple and the R4 set-if-absent merge precedence stay
byte-identical for JSON responses." The JSON-lane byte-identity still holds.
The triple is no longer JSON-only: for the TASK-551-03-L02 FINAL route
`GET /forms/:id/export-jobs/:jobId/download` (C2), every response carries
the v1 triple. That covers the 200 binary response and the 403/404/409
error responses. The triple values are `Cache-Control: private, no-store, max-age=0`,
`Pragma: no-cache` and `Expires: 0` (`core/server/router.ts:36-46`). FINAL
therefore requires:

- **Binary success branch.** It applies the matched route's
  response-header bag (created per matched route at
  `core/server/httpServer.ts:465`, populated through
  `ctx.setResponseHeader`, `router.ts:17-20`). It uses the same
  set-if-absent `applyRouteResponseHeaderBag` (`httpServer.ts:153-158`)
  before the response is returned, exactly as the JSON success branch does
  (`:545-546`). This keeps the R4 precedence.
- **Error outcomes.** The route's 403/404/409 error outcomes keep the existing
  catch path (`httpServer.ts:558-561`), which already applies the bag. The
  binary lane adds no bypass around it: any failure raised before the body
  starts streaming (including an artifact open or read-setup failure) still
  goes through `errorResponse` plus the bag.
- **Header names.** The closed binary header shape (C1: `Content-Type`,
  `Content-Disposition`, `Content-Length`) and the triple are disjoint
  names. The binary shape never carries `Cache-Control`, `Pragma` or
  `Expires`, so nothing in the lane can override or duplicate the triple.
- **Present-only.** A binary result from a route that installed no triple
  carries none.
- **Route ownership.** Installing the triple is owned by TASK-551-03-L02
  FINAL, because `formsRoutes.ts` stays forbidden here (C2). That includes
  doing it before any handler step that can return 403/404/409, and the FINAL
  route test that asserts all three headers on 200 and on 403/404/409. This
  leaf guarantees only that the lane and the error path emit whatever the
  route installed. A 403 raised by a permission middleware that runs before
  the route's installing handler carries no triple; that handler ordering is
  03-L02's to pin.

Tests: the FINAL binary-lane cases of C1 in
`tests/integration/server/route-response-headers.test.ts` (already in the
allowlist) add three cases:

1. a synthetic route that sets the triple and returns a binary result
   answers 200 with the three triple headers byte-exact plus the three binary
   headers;
2. the same route throwing `ApiError` 403, 404 and 409 answers each status
   with the triple;
3. a binary result from a route that set no triple carries no triple header.

These cases join the C4 owed envelope amendment (FINAL commands for the
binary-lane cases); no file is added. Per R3-32, the TASK-551-03-L02 FINAL
pre-dispatch check names the exact exported binary-lane result type/helper.
This leaf's FINAL FAZA-0 amendment pins that name, and dispatch fails if it
is absent.
