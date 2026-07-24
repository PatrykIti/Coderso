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
  `ServerCacheStore`, `CacheInvalidationPlan`, envelope, canonical key,
  eligibility and validated environment contracts named in the parent.
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
  Invalidation plans contain exactly an opaque event key and finite tags—never
  record IDs, slugs, paths, or digested identity tags.
- Memory mode uses the deterministic validated namespace `local` when
  `SERVER_CACHE_NAMESPACE` is absent. Redis mode requires an explicit deployment
  namespace. `.env.example` is updated once, solely by TASK-551-10-L02, for both
  database and server-cache variables; 02/07 provide read-only config handoffs.
- The memory LRU is O(1), bounded by entry count and exact key-plus-value bytes,
  enforces the per-entry cap against total key-plus-value bytes, uses monotonic
  expiry, at most 64 lazy-sweep examinations per operation, shortening-only `[0.9,1.0]` TTL
  jitter and one loader per canonical request burst. Backend-independent local
  single-flight remains active during store/circuit bypass but retains promises
  only, never values. Its key includes a process-local family coherence epoch
  advanced at invalidation/fence transitions so post-mutation callers cannot
  join pre-mutation work. Memory mode is explicitly not multi-replica coherent.
- The coordinator already accepts an optional distributed-load coordinator and
  store health/circuit signals, but 08-L03 is their only Redis implementation.
  It also exposes the L01-owned bounded `writeIfGenerationsMatch` contract: the
  memory adapter performs the one- or two-entry generation compare/write
  atomically in-process, while TASK-551-08-L01 supplies the Redis Lua parity.

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
  input, tag count/bytes, TTL, value bytes, entry count and aggregate bytes.
- **Secrets/privacy:** eligibility rejects auth/session/RBAC, secret/decrypted,
  private/password, preview/draft, nonce-bearing and user-specific values.
- **Anti-abuse:** no public write. Unknown query variants and 5xx responses are
  ineligible; negative caching requires an explicit 5–15 second policy.

## Acceptance Criteria

- Pure consumers can use one async typed cache without importing a backend.
- Exact envelope/key vectors are stable across Bun and Vitest; malformed,
  expired, wrong-version and oversized values become misses.
- Memory tests prove count and byte ceilings, replacement accounting, LRU,
  expiry, jitter bounds, bounded sweep and single-flight cleanup on success and
  rejection.
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
