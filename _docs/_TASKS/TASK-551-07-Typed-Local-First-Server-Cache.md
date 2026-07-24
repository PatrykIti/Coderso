# TASK-551-07: Typed Local-First Server Cache
# FileName: TASK-551-07-Typed-Local-First-Server-Cache.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Cache / Performance / Reliability / Security
**Estimated Effort:** Large
**Dependencies:** TASK-551-06 complete; consumes TASK-551-01/02 frozen budgets
and telemetry/lifecycle seams
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Create the standalone, server-only cache contract required by TASK-551 without
adopting it in public/domain callers yet. The default implementation is a
byte/count-bounded in-process LRU for a single replica. The contract is async
from day one so TASK-551-08 can supply Redis without changing consumers.

PostgreSQL remains authoritative. Invalid, expired, oversized or unavailable
cache data is a measured miss/bypass, never a substitute value.

## Locked Contract

- TASK-551-07-L01 owns the exact `ServerCacheBackend`, `CachePolicy`,
  `ServerCacheStore`, `ServerCacheLoadRequest`, typed loader-result/companion,
  `CacheInvalidationPlan`, envelope, canonical key, eligibility and validated
  environment contracts named in the parent.
- TASK-551-07-L02 owns `ServerCache`, the memory store, telemetry and local
  single-flight. It consumes L01 exports and does not redeclare them.
- Backend is `memory` by default. This wave does not add Redis, alter public
  rendering, or migrate existing `siteCache` callers.
- Canonical keys have conceptual form
  `coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<generationDigest>:<inputDigest>`.
  Variable identity is canonicalized, bounded and SHA-256 digested; no
  delimiter parser or raw URL/PII/token is permitted.
- `CacheFamily` and `CacheTag` are finite v1 unions. Tags are site/family scopes,
  never unbounded per-record ids/slugs; every variable request identity belongs
  only in the digested key input. Envelope and policy versions are strict.
  Every policy explicitly declares `negativeTtlMs` (`null` or 5-15 seconds) and
  `stalePolicy: "forbid"`; v1 has no stale-while-revalidate. Exact limits are
  exported once by L01 and imported by every later leaf; no consumer copies
  clamp values. Positive policy/conditional-write TTL is an integer
  `1..3_600_000 ms`; schema version and value-byte limits use L01 constructors.
  Envelope lifetime is additionally bounded by the concrete policy TTL, never
  merely by the family-wide maximum. Conditional entries are created only by
  the coordinator's L01-owned policy-aware factory and carry normalized positive,
  nullable-negative and value ceilings plus an opaque validation brand; memory and
  Redis stores strictly decode the envelope, match its `fillKind`, select the
  correct ceiling and cannot accept a caller-asserted or forged runtime entry.
  Invalidation plans contain exactly an opaque event key and finite tags—never
  record IDs, slugs, paths, or digested identity tags.
- Memory mode uses the deterministic validated namespace `local` when
  `SERVER_CACHE_NAMESPACE` is absent. Redis mode requires an explicit deployment
  namespace. `.env.example` is updated once, solely by TASK-551-10-L02, for both
  database and server-cache variables; 02/07 provide read-only config handoffs.
- The memory LRU is O(1), bounded by entry count and exact key-plus-value bytes,
  enforces the per-entry cap against total key-plus-value bytes, uses monotonic
  expiry, one combined at-most-64 expiry/capacity-victim work budget per
  operation, skips an insertion without applying a partial victim plan when 64
  entries cannot make it fit, and uses independent
  shortening-only `[0.9,1.0]` TTL jitter per entry. One loader serves a canonical
  request burst only when its proven shareable positive/eligible-negative fill is
  conditionally written successfully. The backend-independent local registry
  retains only shared fill-attempt outcome promises, never `TResult` or caller
  values. Its key includes final path identity, a process-local family coherence
  epoch and L01's branded digest of every normalized eligibility/share context
  field. Memory mode is explicitly not multi-replica coherent.
- The local fill-attempt registry has one process-wide distinct-key ceiling:
  `SERVER_CACHE_MAX_IN_FLIGHT_KEYS`, default `1024`, valid `16..10_000`. An
  already-present key always joins. A new key at the ceiling executes its
  authoritative loader without fill or map insertion and records the bounded
  `singleflight_saturated` outcome.
- Loader output is a strict union: `no_fill` carries only a finite reason plus
  caller `returnValue` and can never encode/store; `fill` carries
  `fillKind: positive|negative`, `returnValue`, `cacheValue`, and zero/one branded
  companion. Positive primary and companion independently sample/cap their own
  policy TTLs, so an atomic pair may have unequal TTLs. Negative is accepted only
  for an eligible policy with non-null 5–15 second `negativeTtlMs`, uses that TTL
  rather than the positive TTL, and has no companion in v1. Malformed branches
  fail with zero fill side effects.
- The coordinator already accepts an optional distributed-load coordinator and
  store health/circuit signals, but 08-L03 is their only Redis implementation.
  L01 pins its acquire/owner/waiter/bypass, renew/release, and idempotent close
  union, including normalized lease/wait/poll bounds, stable runtime errors and
  the owner's exact atomic `putIfGenerationsAndLeaseOwned` result. A Redis owner
  may fill only when one Lua operation proves both its lease token and every
  expected generation; lost/unknown/unavailable returns the authoritative value
  without fill. Post-attempt token-safe release is cleanup, never fill authority.
  `ServerCache.getOrLoad(request)` is the only consumer load/fill surface. It
  captures the primary tags plus the request's finite predeclared fill fence
  before running the loader, owns the process-local fill-attempt registry, and turns the
  typed valid fill plus optional branded companion into exactly one or two
  entries; a typed `no_fill` returns the owner's authoritative value without
  either entry and makes every joiner execute its own no-fill loader. Ineligible
  or missing-proof requests never enter the registry. Only a successfully
  conditional-written shareable fill lets joiners use their own `resolveCached`;
  no caller-specific `returnValue`, nonce/token or error crosses callers.
  Consumers never encode envelopes, create conditional writes, or call a store/
  owner write primitive. The memory adapter performs the internal one- or two-
  entry generation compare/write atomically in-process; TASK-551-08-L01 supplies
  Redis generation-only parity, while a distributed owner uses only the L01
  lease-plus-generation atomic operation.
- L01 owns the complete backend-neutral store interface plus backend/worker
  coherence signal and snapshot types. Conditional writes return
  `written|generation_changed|unknown`; an uncertain Redis reply has unknown
  physical outcome and is never publication authorization. L02 owns the
  one process-local `ServerCacheCoherenceController`: adapters and workers report
  normalized signals, while store `health()` deterministically combines backend
  readiness with that controller. Source-bound observation watermarks reject
  stale async recovery. Immediate post-commit failures create bounded exact-event
  fences before returning; only durable processing of that same outbox event
  clears one, while broad health recovery and Pub/Sub clear none. Registry
  overflow fails closed to all-family bypass. Only `report(...)` mutates epochs and no separate
  consumer/runtime advance helper exists.
- Startup validates the closed mandatory v1 policy-capacity catalog against the
  selected store using exact maximum key plus encoded-envelope bytes. An
  impossible mandatory policy fails startup instead of silently missing.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-551-07-L01 | Typed store/policy/invalidation contracts, strict envelope/codec, canonical keys, eligibility and env normalization | ⏳ To Do |
| TASK-551-07-L02 | Byte/count-bounded memory LRU, coordinator, telemetry and local single-flight | ⏳ To Do |

**Land order:** `TASK-551-07-L01 → TASK-551-07-L02`.

## Collision Guards

- The parent external dispatch gate already made TASK-511/TASK-493/TASK-517/
  TASK-518 terminal by default or produced the one accepted fresh exact
  serialized all-path handoff. No narrower cache-only handoff substitutes.
- Do not edit `core/server/publicSite.tsx`, `core/site/cache/siteCache.ts`, any
  current domain service, Admin cache file, Redis/outbox file, DB schema or
  migration artifact. Those belong to 08/09 or other TASK-551 children.
- Do not edit TASK-517 public runtime, TASK-493 SEO, TASK-511 backup, task board,
  changelog, workflow, shared docs, `package.json`, `core/package.json` or
  `bun.lock`.
- L01 and L02 have disjoint exact path allowlists. A needed path outside them is
  a task-contract defect to reconcile before implementation.

## Security Contract

- **Visibility/routes:** no route is added or changed.
- **Auth/RBAC/CSRF/rate limits:** unchanged; cache APIs are server-only and are
  not reachable from request input as arbitrary key/value operations.
- **Validation:** reject unknown envelope/config fields; clamp key, canonical
  input, tag count/bytes, TTL, value bytes, entry count, aggregate bytes and
  distinct in-flight keys.
- **Secrets/privacy:** eligibility rejects auth/session/RBAC, secret/decrypted,
  private/password, preview/draft, nonce-bearing and user-specific values.
- **Anti-abuse:** no public write. Unknown query variants and 5xx responses are
  ineligible; negative caching requires an explicit 5–15 second policy.

## Acceptance Criteria

- Pure consumers can use one async typed cache without importing a backend.
- Exact envelope/key vectors are stable across Bun and Vitest; malformed,
  expired, wrong-version and oversized values become misses.
- Memory tests prove count and byte ceilings, replacement accounting, LRU,
  expiry, per-entry jitter bounds, the combined 64-victim work cap/skip behavior,
  and fill-attempt cleanup on success and
  rejection, plus exact distinct-key saturation behavior. Coordinator tests prove
  positive, negative and every finite `no_fill` branch; invalid/no-fill results
  perform zero fill work, and a valid primary/optional-companion request fills one
  or two entries only through `ServerCache`. A distributed owner fills only
  through atomic lease-plus-generation proof. The canonical local-flight key
  digests final normal/bypass path key plus current process coherence epoch and
  branded `shareScopeDigest`. For 1/10/50 same-key/scope misses with a successful
  fill, exactly one loader runs and every joiner resolves the published primary
  through its own `resolveCached`; the registry shares only the exact tracked
  fill-outcome promise. Ineligible requests bypass it. `no_fill`, rejection,
  lost/changed/unavailable/timeout/closed or malformed outcomes return the owner's
  own result/error and make every joiner load authoritatively for itself. Distinct
  auth contexts and request-scoped token/nonce values never cross callers. Epoch
  N+1 never joins epoch N. Unequal positive primary/companion TTLs retain their
  independent policy ceilings in one atomic write.
- Cache/storage/telemetry errors never change the authoritative loader result.
- Every added production/test file remains below 1,000 physical lines.

## Testing Requirements

```bash
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts \
  tests/vitest/cache/memory-server-cache-store.test.ts \
  tests/vitest/cache/server-cache-coordinator.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/*.ts tests/vitest/cache/*.test.ts
```

## Documentation Updates Required

Documentation and changelog 1263 are handed to TASK-551-10-L02.
