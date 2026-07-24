# TASK-551-07-L02: Byte-Bounded Memory LRU and Single-Flight
# FileName: TASK-551-07-L02-Byte-Bounded-Memory-LRU-And-Singleflight.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-07
**Priority:** High
**Category:** Cache / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-07-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Implement the default single-replica memory store and the backend-neutral
`ServerCache` cache-aside coordinator. Prove predictable memory use, expiry and
one authoritative loader per final-key burst.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-07.

## Exclusive Ownership

This leaf is the sole writer of:

- new `core/services/cache/serverCache.ts`;
- new `core/services/cache/memoryServerCacheStore.ts`;
- new `core/services/cache/serverCacheTelemetry.ts`;
- new `tests/vitest/cache/memory-server-cache-store.test.ts`;
- new `tests/vitest/cache/server-cache-coordinator.test.ts`.

Forbidden: every L01 file, Redis/outbox/lease code, public/runtime adoption,
`core/site/cache/siteCache.ts`, Admin/domain services, DB/schema/migrations,
server startup, TASK-517/493/511 paths, package manifests and shared docs/tasks.

## Memory and Coordinator Contract

- Use `Map` insertion order with delete+set on hit for O(1) LRU. Clone stored
  and returned `Uint8Array` values so callers cannot mutate accounting/content.
- Exact `entryBytes = UTF8(key).byteLength + value.byteLength`; enforce the
  normalized per-entry ceiling against that total, not value bytes alone, and
  track aggregate bytes and entry count on every state change.
- Reject/skip values or total entries above policy/per-entry/aggregate limits before state
  mutation. Replacement failure preserves the previous valid entry.
- `get` lazily evicts expired entries using an injected monotonic clock. Each
  operation examines at most L01's exact
  `maxExpirySweepEntriesPerOperation = 64`; no unbounded
  interval or full-map request-path scan.
- Memory generations are L01 opaque 32-hex tokens keyed only by the finite v1
  site/family tags. Reading a missing generation atomically initializes a fresh
  non-reusable token before lookup; a multi-tag bump replaces all requested
  tokens synchronously/atomically and returns one normalized snapshot.
- `ServerCache.getOrLoad(policy,input,context,loader)` checks eligibility,
  generations, final key, strict envelope and byte limit, then joins the single
  in-flight promise for that final key. The in-flight entry is removed in a
  same-promise `finally` on success or rejection.
- Apply one sampled shortening-only `[0.9,1.0]` multiplier to the policy TTL for
  envelope and store, clamped to `1..policy.ttlMs`. Tests inject RNG and clocks.
- An optional L01 distributed coordinator is invoked only after local
  single-flight ownership; absent means local behavior. No persistent L1 is
  introduced by that hook.
- Expose coordinator
  `writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<boolean>` over
  L01's exact one-or-two-entry operation. Memory compares all finite generation
  tokens and writes all entries or none in one synchronous critical section.
  The Redis store supplies the same atomic result in TASK-551-08-L01.
- The backend-neutral circuit counts store/transport failures, never loader or
  domain errors: three consecutive failures open it for 1 second, repeated
  failed half-open probes double the cooldown to a 30-second cap, exactly one
  half-open probe is admitted, and one successful probe closes/resets it.
  Open-circuit/store-unavailable requests skip every cache value read/write but
  still join a bounded backend-independent local single-flight keyed by the
  canonical family/schema/input digest plus the affected family's current L01
  `ProcessCacheCoherenceEpoch`. That map retains promises only and is
  removed in `finally`; it never becomes a Redis-mode L1 value cache.
- Maintain one bounded epoch per finite family. Advance it before every local
  post-commit invalidation attempt and on every fence open, reason transition,
  successful recovery/clear, and observed remote invalidation. Never reset or
  reuse an epoch; reaching the safe-integer ceiling leaves the family permanently
  forced-bypass until process restart. Thus a post-mutation/fence caller cannot
  join a loader started under the prior coherence epoch.
- A failed memory-mode generation bump immediately marks the affected finite
  families locally incoherent. Reads in that process bypass cache values and use
  the same local single-flight until a successful bump/recovery clears the fence;
  an old value is never knowingly served merely until TTL.
- Telemetry is bounded by backend/family/outcome, never raw key: hit, miss,
  bypass reason, corrupt, expired, set, oversize, eviction reason, loader,
  single-flight joined, generation bump and store/circuit error; gauges include
  entries, bytes and in-flight count.

## Implementation Pseudocode

```ts
async function getOrLoad(policy, input, context, loader) {
  if (!policy.isEligible(context)) return loader();
  const generations = await safeReadGenerations(policy.tags);
  if (!generations) {
    const epoch = coherence.currentEpoch(policy.family);
    return joinBypassSingleFlight(policy, input, epoch, loader, "generation_unavailable");
  }
  const key = await buildServerCacheKey({ policy, input, generations });
  const hit = await safeReadDecode(key, policy, generations);
  if (hit.ok) return hit.value;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = loadDecodeEncodeAndSetIfGenerationStillCurrent();
  inFlight.set(key, promise);
  return promise.finally(() => removeOnlyIfSame(key, promise));
}
```

Store/codec/telemetry errors are swallowed only at the cache boundary and call
the authoritative loader through bounded local single-flight. Loader/domain
errors retain their original identity and are never cached. A generation change
during load discards the fill but returns the freshly loaded value to the
request. `close()` is idempotent, clears values/in-flight references and rejects
later store use with a typed closed health state.

## Security Contract

- **Visibility/routes:** no route changes.
- **Auth/RBAC/CSRF/rate limits:** unchanged; L01 eligibility remains mandatory.
- **Validation:** all L01 limits plus safe integer byte accounting; no public
  API can select keys, generations or loader behavior.
- **Secrets/privacy:** metrics/logs expose family/reason only; no raw key/value.
- **Anti-abuse:** oversize/high-cardinality attempts bypass before allocation;
  bounded sweep and one loader prevent request-amplified work.

## Testing Requirements

Test empty/get/set/delete, promotion, count eviction, byte eviction, replacement
accounting, cloned bytes, exact limits/max+1, monotonic expiry, bounded sweep,
fresh/non-reused generation-token initialization, atomic token replacement,
deterministic shortening-only jitter bounds, corrupt envelopes, ineligible
bypass, loader rejection, stale-generation fill discard, conditional two-entry
all-or-nothing writes and 1/10/50 concurrent callers producing exactly one loader
invocation on normal and store/circuit-bypass paths. Pin the three-
failure circuit threshold, one-probe half-open race, cooldown growth/reset and
prove loader failures do not open it. Inject a memory generation-bump failure and
prove the family bypass fence prevents old-value reuse until recovery. Assert
stats have no key/value fragments. Delay a loader under epoch N, advance the
family fence at post-commit, then prove a caller under epoch N+1 invokes/joins a
new loader and cannot receive the epoch-N result. Pin total key+value bytes and
the exact 64-entry sweep work at exact/max+1 boundaries.

```bash
bun run test:vitest -- tests/vitest/cache/memory-server-cache-store.test.ts \
  tests/vitest/cache/server-cache-coordinator.test.ts
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/{serverCache,memoryServerCacheStore,serverCacheTelemetry}.ts \
  tests/vitest/cache/{memory-server-cache-store,server-cache-coordinator}.test.ts
```

## Documentation Updates Required

Documentation and broader load gates belong to TASK-551-10; this leaf records
only targeted evidence and does not edit changelog 1263.
