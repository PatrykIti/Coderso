# TASK-551: Scalable Database, Query, and Cache Optimization
# FileName: TASK-551_Scalable_Database_Query_And_Cache_Optimization.md

**Priority:** High (next performance/reliability program after active collision
owners reach a safe handoff)
**Category:** Database / Performance / Reliability / Cache / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-550 complete; the non-negotiable TASK-511/TASK-493/
TASK-517/TASK-518 external dispatch gate below
**Related Tasks:** TASK-360-06, TASK-459-04, TASK-483, TASK-511, TASK-517,
TASK-518, TASK-493, TASK-550
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Make the current PostgreSQL-backed runtime fast and predictable for both a
small, single-process installation and a large multi-replica deployment. The
program covers the complete production query inventory, data-integrity races,
bounded list/search/read models, evidence-driven indexes, retention, pool and
query observability, a typed local server cache, optional Redis, durable
post-commit invalidation, and hot-path adoption.

The small-site default remains operationally simple: PostgreSQL plus a
byte-bounded in-process LRU. Redis is opt-in infrastructure for multiple
replicas. In Redis mode, Redis is the shared value backend and the application
does not retain a persistent per-process value cache. Globally unavailable
Redis makes every replica bypass cache and read the authoritative database;
ambiguous or partial generation delivery may expose only still-unexpired, safe
public old-generation bytes until durable delivery or the policy TTL. This is a
bounded-eventual availability contract, not linearizability or stale-while-
revalidate, and it never applies to security/private data.

This is not a promise to add every conceivable index or cache every response.
Every optimization must have a caller, a bounded contract, representative
small/large evidence, and before/after results. Unsafe, private, nonce-bearing,
draft, authentication, and security-sensitive data stays uncached unless a
leaf proves a stricter safe contract.

## Verified Baseline (2026-07-24)

The owner-authorized read-only audit loaded `.env`, inspected the live
PostgreSQL database and reviewed at least 64 production modules that import the
database client. Raw credentials, bind values, user data, and secrets were not
copied into this task.

### Live database evidence

- PostgreSQL 18.3; database size approximately 97 MB; `pg_stat_statements` and
  `pg_trgm` are installed.
- The current dataset is still small enough to hide many scale defects behind
  a near-100% buffer-cache hit rate. The statistics are also test-polluted and
  must be re-baselined over a known interval before implementation decisions.
- `settings` single-key reads account for roughly 562,980 recorded calls.
- `access_logs` is the largest table family at roughly 94,000 live rows,
  11,800 dead rows, and 38 MB; `audit_logs` is roughly 12,400 rows and 7 MB.
- Existing large page/content/media search indexes recorded zero scans because
  the query expressions do not match the index expressions.
- Unbounded page/revision/SEO queries returned hundreds of thousands of rows
  cumulatively; audit wildcard search recorded approximately 50-117 ms calls.
- Server settings show a 103-connection PostgreSQL ceiling while the app
  configures `DB_POOL_MAX=10` independently per process and currently has no
  validated cluster connection budget or complete timeout policy.

### Highest-risk code evidence

- `core/server/publicSite.tsx` checks redirect, settings, and theme/profile
  state before the current HTML cache; a warm hit normally still performs
  approximately four DB queries, and redirect chains add more.
- `core/site/cache/siteCache.ts` is a synchronous per-process `Map`, bounded by
  200 entries but not bytes, with no cross-replica invalidation, stampede
  protection, strict envelope, or safe structured key encoding.
- `settingsService.getSetting` always reads the database. Security settings
  also have a process-global cache that can remain stale indefinitely on other
  replicas.
- Published page/entry update and delete, menu mutations, footer-template
  mutations, posts, and several settings dependencies do not completely
  invalidate public output. `setSettingsTx` can invalidate before the caller's
  outer transaction commits.
- Public and Admin list paths in pages, entries, posts, users, submissions,
  media, booking, revisions, and other domains load unbounded or overly wide
  results. `usersService` can fetch password hashes/encrypted fields for list
  work that does not consume them.
- Search queries build expressions that differ from migration `0006` indexes;
  some sources are queried sequentially without deterministic rank/order, and
  assistant retrieval ranks an unbounded candidate set in Bun.
- Concurrent booking uses check-then-insert without a complete database
  exclusion contract. Page/entry/post/widget revisions allocate with an
  unlocked `max(version) + 1`; page and entry revisions lack the complete
  parent/version uniqueness guarantee. Last-admin/session/publication and
  assistant execution flows contain additional transaction-boundary risks.
- Analytics/dashboard/SEO/webhook/import-export paths perform multiple
  sequential aggregates, row-by-row updates, N+1 work, or full-list materialization.
- Append-heavy access/audit/assistant/revision/submission/delivery/session data
  does not have one complete bounded retention and pruning contract.
- `core/db/schema.ts`, `solutionKitsInstallService.ts`, `entryService.ts`,
  `bookingService.ts`, and `postsService.ts` are already at or above the
  repository's 1,000-line limit. The leaf that first touches each file must
  split it by cohesive ownership before extending behavior.

All paths and symbols are implementation anchors to re-verify against the live
tree immediately before a leaf edits them. A missing `rg` result on a known
large file is not proof of absence.

## Outcome and Realistic Impact Targets

These are acceptance ranges to measure, not guaranteed marketing numbers:

| Area | Current shape | Target and realistic effect |
|---|---|---|
| Eligible warm public render | Usually 4+ DB reads before/around HTML cache | Exactly 0 PostgreSQL queries; 70-99% fewer DB calls on cache-eligible traffic and commonly 50-95% lower application latency for true hits |
| Growing list at 10k rows, page size 50 | O(N), sometimes wide JSONB/PII transfer and JS slicing | O(page) keyset query; commonly 100-1,000x fewer transferred rows/bytes and 5-50x lower list latency |
| Full-text search | Expression/index drift, wildcard scans, unbounded candidates | Exact stored vector + indexed rank/order/limit; commonly 10-100x faster at scale, subject to plan evidence |
| Multi-query aggregates/N+1 | 10-15+ sequential round trips on some endpoints | Set-based aggregates/batches; target 50-85% endpoint-latency reduction |
| Point/filter/sort indexes | Missing or mismatched composite/FK paths | Target 2-50x lower latency/rows-read on proven hot queries without breaching write budgets |
| Local cache | Entry-count-only process cache | Predictable byte ceiling, TTL+jitter, strict values, and one loader per key burst |
| Redis cache | Absent | Shared bounded-eventual public values across replicas, global-outage DB bypass, a measured hard-TTL stale ceiling under partial delivery, and no stale local-mode masquerade; Redis may add sub-ms/low-ms overhead versus memory but enables horizontal scale |
| Integrity races | Possible duplicate versions/bookings and partial writes | Zero invariant violations in concurrent/rollback tests; correctness is the primary impact |
| Append-heavy growth | Linear and incompletely pruned | Bounded scheduled work and stable query/backup/VACUUM behavior inside documented retention windows |

Final budgets are frozen by TASK-551-01 from reproducible fixtures and current
hardware. A leaf may tighten them but may not silently weaken them to make a
gate pass.

## Locked Architecture

### Query and persistence contract

Every production database call is classified as point read, bounded list,
search, aggregate, mutation, append, maintenance stream, or intentional active
owner handoff. Each record in the inventory names caller, selected projection,
filters/joins/order, cardinality cap, query-count budget, index/constraint,
freshness/cache eligibility, mutation transaction, and owning leaf. No direct
query site is silently omitted.

Growing lists use opaque versioned keyset cursors and a stable unique
tiebreaker. Full bodies, document JSON, hashes, encrypted fields, and secrets
are detail-only. Search owns one stored/generated vector contract and performs
ranking, deterministic ordering, and candidate limits in SQL. Set-based
queries replace N+1 and per-row mutation loops with bounded concurrency where
one statement is not possible.

Database constraints, not preflight reads, own uniqueness/invariants. Revision
allocation, booking exclusivity, last-admin protection, session limits, and
multi-row publication flows become atomic and concurrency-tested. External
storage/cache/event effects use after-commit work, outbox/tombstone, or explicit
reconciliation as appropriate.

### Exact server-cache boundary

The standalone server-only owner exports these exact concepts and fields;
07-L01 may implement but may not rename, extend, narrow, or duplicate them
without amending every consumer task first:

```ts
type ServerCacheBackend = "memory" | "redis";

type CachePolicy<T> = {
  family: CacheFamily;
  schemaVersion: number;
  ttlMs: number;
  maxValueBytes: number;
  tags: readonly CacheTag[];
  negativeTtlMs: null | NegativeCacheTtlMs;
  stalePolicy: "forbid";
  decode: (input: unknown) => T;
  isEligible: (context: CacheEligibilityContext) => boolean;
};

interface ServerCacheStore {
  get(key: CacheKey): Promise<Uint8Array | null>;
  set(key: CacheKey, value: Uint8Array, ttlMs: number): Promise<void>;
  delete(key: CacheKey): Promise<void>;
  readGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  bumpGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<boolean>;
  health(): Promise<ServerCacheHealth>;
  close(): Promise<void>;
}

type CacheConditionalWriteEntry = {
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  ttlMs: number;
};

type CacheConditionalWrite = {
  expectedGenerations: CacheGenerations;
  tags: readonly CacheTag[];
  entries:
    | readonly [CacheConditionalWriteEntry]
    | readonly [CacheConditionalWriteEntry, CacheConditionalWriteEntry];
};

type CacheInvalidationPlan = {
  eventKey: string;
  tags: readonly CacheTag[];
};
```

`CacheFamily` is exactly `public-runtime | public-html-manifest | public-html |
redirects | site-shell | pages | entries | posts | listings | forms |
public-settings | themes | security-settings-generation`. `CacheTag` is exactly
`site:all | site:runtime | site:html | site:redirects | site:shell | site:pages |
site:entries | site:posts | site:listings | site:forms | site:settings |
site:themes | settings:security`. Record IDs, slugs, paths, and query variants
never extend either union; they belong only in digested canonical key input.
Generation values are fresh, non-reused opaque lowercase 32-hex tokens, not
resettable counters. Missing tokens are atomically initialized before lookup,
and every finite-tag bump replaces the tokens atomically.

`ServerCache` is the cache-aside coordinator above the store. It owns canonical
serialization, strict envelope validation, byte measurement, TTL jitter,
single-flight, telemetry, circuit breaking, and bypass behavior. Domain
services never instantiate/import memory or Redis adapters.

Keys are length-bounded, SHA-256-digested canonical input under the conceptual
shape `coderso:<deployment>:server-cache:v1:<family>:sv<schemaVersion>:<generation-digest>:<input-digest>`.
The debug label is stored only as sanitized bounded metadata. Keys contain no
raw URL, query, PII, cookie, token, nonce, secret, or delimiter-parsed identity.

The memory adapter is an O(1) LRU bounded by both entry count and serialized
bytes, plus key/value/tag limits, monotonic expiry, bounded lazy sweeping, and
per-key local single-flight. Exact validated configuration is supplied by the
infrastructure owner; the planned environment surface is:

```text
SERVER_CACHE_BACKEND=memory|redis      # default memory
SERVER_CACHE_NAMESPACE=<deployment>   # memory default local; explicit non-local required in Redis
SERVER_CACHE_MEMORY_MAX_ENTRIES=<int> # default 200, 1..100000
SERVER_CACHE_MEMORY_MAX_BYTES=<int>   # default 67108864, 1048576..1073741824
SERVER_CACHE_MAX_ENTRY_BYTES=<int>    # default 2097152, 1024..min(total,16777216)
SERVER_CACHE_COMMAND_TIMEOUT_MS=<int> # default 50, 5..5000
REDIS_URL=redis://...|rediss://...    # required only in Redis mode
```

Redis mode uses Bun's native `RedisClient` against the repository's supported
Redis baseline (7.2+ at authoring time); no new client dependency is planned.
Implementation must re-check the current Bun API before coding. Missing or
invalid Redis URL/namespace in explicitly selected Redis mode fails startup.
A runtime Redis timeout/error opens a bounded circuit and bypasses cached
values to PostgreSQL/render; it never falls back to a persistent local value
cache. The process-local single-flight map may remain because it stores only
in-flight work.

Redis invalidation never uses `KEYS` or unbounded `SCAN`. It atomically bumps
bounded tag/family generations; new reads derive different value keys, while
old values expire by TTL. A transactional `cache_invalidation_outbox` records
Redis-mode invalidation with the authoritative mutation, and a bounded
`FOR UPDATE SKIP LOCKED` worker retries idempotently. An immediate after-commit
attempt reduces lag. Pub/Sub is optional acceleration/telemetry only—never the
correctness channel—and disconnect cannot authorize stale security or private
data. Distributed cold-load coalescing uses a bounded `SET NX PX` lease,
unique token, compare-and-delete release, jittered wait/re-read, and generation
recheck before fill.

### Cache eligibility and invalidation

Initial safe families include normalized non-secret public settings, active
theme/profile/routes, redirects (short positive/negative), site shell,
published public page/entry/post/listing/form configuration, and cache-eligible
public HTML. Every renderer returns or registers the exact dependency tags it
consumed. Global invalidation may initially bump a site generation; finer tags
must remain bounded and evidence-driven.

Never cache decrypted/secret settings, session/auth/RBAC decisions,
private/password content, drafts/previews, nonce/form-bearing HTML, unknown
query variants, 5xx responses, or unbounded user-specific output. Negative
not-found/redirect-miss caching is opt-in and normally 5-15 seconds. No stale-
while-revalidate applies to security/auth decisions.

Every mutation returns a deduplicated `CacheInvalidationPlan` covering old and
new identities plus dependants. Memory mode executes it after commit. Redis
mode persists the outbox record in the same transaction and then attempts the
generation bump after commit. Rollback/no-op emits no invalidation. Once the DB
and required outbox commit, a cache transport failure must not turn the API
response into an apparent mutation failure; the worker retries and reads
bypass values whose local incoherence is known. Globally unavailable Redis
always causes DB/render bypass. During an ambiguous/partial delivery state, an
otherwise safe public value may remain visible only while its original TTL is
unexpired; healthy polling is at most 250 ms, invalidation lag targets p99 at
most 1 second, and locally visible backlog/incoherence older than 5 seconds
alerts, degrades readiness, and forces bypass. Public HTML TTL is at most 600
seconds and no server-cache policy exceeds 3,600 seconds. Admin preview/readback
bypasses until its event is observed; auth, security, private/password, draft,
preview, and nonce-bearing data remains uncached or fail-closed DB-backed.

Browser Admin cache remains a separate contract. It receives deployment,
authenticated-user, and auth/permission-epoch namespacing; identity changes
clear inaccessible values. Storage quota/private-mode, broadcast, and cache
subscriber failures are best-effort and cannot make a successful API mutation
look failed. Dirty editor state and background revalidation semantics remain
unchanged.

## Security Contract

- **Visibility:** no new public write route. Any route changes are bounded
  versions of existing public reads or internal Admin APIs.
- **Auth/RBAC:** existing internal session/API-key and permission checks remain
  before protected data access. Pagination/caching cannot widen visibility;
  private/password work is serialized with TASK-517 and remains excluded from
  public cache.
- **CSRF:** all existing internal/Admin writes retain CSRF enforcement. Public
  reads have no CSRF requirement; existing public write nonce/HMAC/CAPTCHA
  contracts are unchanged and their responses remain ineligible for HTML cache
  when a nonce is present.
- **Rate limits:** existing route-family buckets remain. Redis/cache failures
  do not bypass rate limiting or bot controls.
- **Validation:** reject unknown query/cursor/cache-envelope fields; clamp page,
  batch, TTL, key/tag count, value bytes, wait, lock, retry, and retention
  limits. Cursor values are opaque, versioned, and tamper-evident or strictly
  normalized as owned by the pagination contract.
- **Secrets/privacy:** no secrets, hashes, encrypted payloads, cookies, tokens,
  nonces, raw PII, bind values, or private bodies in cache keys/values, logs,
  metrics, EXPLAIN evidence, fixtures, Pub/Sub, or outbox payloads. Admin cache
  is identity/permission scoped.
- **Redis:** TLS/auth configuration is supplied through `REDIS_URL`, never
  browser code or Settings. Commands are bounded; no arbitrary command/key
  input crosses an API boundary.
- **Anti-abuse:** no new public write means no new nonce/signature path. Existing
  form/booking/analytics anti-abuse remains authoritative and is tested across
  cache hit/miss/outage paths.

## Non-Negotiable External Dispatch Gate

No TASK-551 product implementation in 01 through 10 may begin while any of
TASK-511, TASK-493, TASK-517, or TASK-518 remains non-terminal. The only
substitute is a fresh, exact, serialized handoff audit run immediately before
the first product dispatch and revalidated before each affected leaf. That
audit must prove one current writer and byte-disjoint work for every schema and
migration path (`core/db/schema.ts`, `core/db/schema/**`, all migration SQL/meta,
and `meta/_journal.json`), `.env.example`, `core/server/publicSite.tsx`, the
whole entry service and tests, the whole SEO service/types/tests, the whole
import/export service/tests plus backup integration, and lifecycle/startup
paths (`httpServer.ts`, `prod.ts`, `dev.ts`, `dockerStart.ts`,
`backupScheduler.ts`, and the shared lifecycle registry). It records final
task status, exact paths, test ownership, land order, and immutable handoff
bytes. Any unknown, wildcard, concurrent writer, stale byte, or partial handoff
fails the gate; waiting for all four families to become terminal is the default.
Read-only TASK-551-11 research/audit may run before this gate, but product
source, tests, migrations, gates, docs, and environment files may not change.

After the gate:

- TASK-511 remains sole owner of backup streaming/import/restore and scheduler
  behavior. TASK-551-09 consumes only its final post-commit plan seam.
- TASK-517's final entry visibility/password and `publicSite.tsx` behavior is
  preserved by TASK-551-09, which then becomes the sole TASK-551 writer of the
  whole entry/public adoption paths.
- TASK-493 retains GSC/Search Console product behavior. TASK-551-09 becomes the
  sole TASK-551 writer of the whole current SEO/import-adoption files and tests
  only after the exact handoff.
- TASK-518 and all other migration owners land first by default. TASK-551-05 is
  the only TASK-551 schema/migration writer and allocates one fresh next-free
  migration triple from the current journal.
- No implementation agent edits task/changelog/workflow files. TASK-551-10-L02
  owns product/developer docs and closure records; TASK-551-11 owns only
  workflow/audit evidence. The repository owner creates commits.

## Single-Writer Domain Ownership

- TASK-551-02: `core/db/client.ts`, DB config/lifecycle, sanitized DB telemetry.
- TASK-551-03: shared cursor/projection/batch owners and non-public-hot list/
  aggregate domains assigned in its leaves; it must split every oversized
  touched service first.
- TASK-551-04: search and assistant retrieval query owners only; it consumes the
  TASK-551-05 vector/index schema and owns no migration artifact.
- TASK-551-05: the sole TASK-551 owner of schema decomposition and every
  migration/vector/index/constraint/outbox schema artifact plus plan evidence;
  it does not rewrite service query logic owned elsewhere.
- TASK-551-06: access/audit/append-heavy retention, revision allocation and
  maintenance jobs assigned in its leaves; it owns no migration and hands the
  entry/post/detail-document adoption contract to TASK-551-09.
- TASK-551-07: standalone server-cache contracts/coordinator/memory adapter only.
- TASK-551-08: Redis adapter, outbox services/worker, generation transport and
  distributed coalescing only; it consumes TASK-551-05's outbox schema and owns
  no schema or migration.
- TASK-551-09: the whole current public/entry/post/SEO/import-export/detail-page
  adoption files and tests, settings/security cache, site-shell dependencies,
  mutation invalidation, and Admin identity-cache safety; it adopts 03's query
  and 06's revision handoffs without split writers.
- TASK-551-10: gates, fault/load harnesses, docs and closure only; it does not
  reopen production source contracts.

The per-leaf exact allowlists override this summary. Before implementation,
TASK-551-01 freezes a machine-readable ownership matrix covering every direct
DB caller. A discovered overlap is a task-contract defect and must be reconciled
before dispatch, not resolved by two writers editing the same file.

## Sub-Tasks and Land Order

TASK-551-11 is an orchestration sidecar throughout. Product work lands strictly
in this order:

1. [ ] **TASK-551-01** — performance baseline, complete query inventory, and
   small/large budgets (2 leaves).
2. [ ] **TASK-551-02** — validated pool, timeouts, lifecycle, query telemetry,
   and operations evidence (2 leaves).
3. [ ] **TASK-551-05** — evidence-driven composite/partial/FK indexes and
   concurrency constraints (2 leaves).
4. [ ] **TASK-551-03** — bounded projections, keyset pagination, batching,
   aggregate consolidation, and N+1 removal (3 leaves).
5. [ ] **TASK-551-04** — exact indexed full-text/trigram search and bounded
   assistant candidates (2 leaves).
6. [ ] **TASK-551-06** — retention, bounded pruning, revision concurrency, and
   partition readiness (3 leaves).
7. [ ] **TASK-551-07** — typed local-first server cache and byte-bounded memory
   LRU/single-flight (2 leaves).
8. [ ] **TASK-551-08** — optional Redis, durable generation invalidation,
   Pub/Sub acceleration, and distributed stampede control (3 leaves).
9. [ ] **TASK-551-09** — hot-path cache adoption, zero-query warm public hits,
   complete post-commit invalidation, and Admin/security cache hardening
   (4 leaves).
10. [ ] **TASK-551-10** — small/large load and fault matrix, documentation,
    operational runbooks, and family closure (2 leaves).
11. [ ] **TASK-551-11** — author/audit/implementation/post-audit orchestration
    and evidence sidecar (no product leaves).

## Family Acceptance Criteria

- Every production DB caller is recorded with one terminal disposition and one
  source writer; active task handoffs are explicit and verified after landing.
- All growing request-path lists/searches are bounded at SQL, use narrow
  projections and deterministic ordering, and pass cursor/query-count tests.
- The chosen indexes/constraints have complete migration artifacts and
  sanitized before/after plan evidence on small and large fixtures; unused
  indexes are not removed from cumulative stats alone.
- Booking/revision/admin/session/publication races and rollback paths pass
  concurrent integration tests with no duplicate or partial durable state.
- Append-heavy families have configurable bounded retention, cutoff indexes,
  idempotent jobs, distributed locking where multi-replica scheduling applies,
  and documented recovery.
- Default memory cache passes byte/count/TTL/jitter/LRU/single-flight/corrupt/
  oversize parity tests. Redis passes the same semantic contract plus two-
  client invalidation, outage, reconnect, outbox retry, lease, and generation
  race tests.
- Public Redis consistency is explicitly bounded-eventual: global outage
  bypasses on every replica; partial/ambiguous delivery may expose only safe,
  still-unexpired public old-generation bytes until delivery or hard TTL. Poll
  is at most 250 ms, healthy lag p99 at most 1 second, visible incoherence over
  5 seconds degrades/alerts/bypasses, public HTML TTL is at most 600 seconds,
  and all policy TTLs are at most 3,600 seconds. Admin preview/readback bypasses
  until observation; security/private/auth/nonce data has no stale allowance.
- A warm eligible public HTML hit executes exactly zero PostgreSQL queries.
  Preview, private/password, nonce-bearing and unsafe variants never enter the
  cache. Old/new slug, update, delete, selected menu/footer, theme, settings,
  SEO, redirects, forms and list dependencies invalidate after commit only.
- Admin cached values cannot cross authenticated identities or permission
  epochs; storage/cacheBus errors cannot reverse a successful authoritative
  API result. Security settings cannot remain indefinitely stale between replicas.
- Performance gates publish reproducible p50/p95/p99, rows read/returned, query
  counts, pool wait/saturation, cache hit/miss/error, invalidation lag, bytes,
  and coalescing evidence without secrets or raw user data.
- All touched human-authored production and test modules are at most 1,000
  physical lines. Relevant Bun/Vitest, DB, migration, performance, reliability,
  security, lint/type, full combined, and multi-process smoke gates pass.

## Testing Requirements

- Load `.env` before every DB/settings lane. Prove DB reachability before the
  full suite and use uniquely scoped fixtures with owned-row cleanup only.
- Bun owns runtime DB/cache adapters, Redis/outbox workers, concurrency,
  performance, security, and multi-process tests. Vitest owns only extracted
  Bun-free cursor/policy/codec/read-model modules and Admin browser-cache logic.
- Run per-leaf targeted tests plus `bun --cwd core lint:types` and
  `bun --cwd core lint`. Re-run every named failure once in isolation before
  classification.
- Closure runs full `bun run test`, `bun run precommit:check`,
  `bun run gates:coderso`, the required strict security scan, exact performance
  and reliability suites, migration-from-clean plus migration-from-prior
  snapshots, and at least five distinct two-process/Redis real-flow smokes.
- Redis integration uses an isolated test namespace/database and cleans only
  its own keys. If CI provisions Redis differently, the test command and
  service version become part of the checked-in release-gate contract.

## Documentation Updates Required

- Add `_docs/DATABASE_PERFORMANCE.md` as the query/index/pool/retention source of
  truth and `_docs/SERVER_CACHE.md` as the local/Redis/outbox contract.
- Update `.env.example`, `README.md`, `_docs/ARCHITECTURE.md`,
  `_docs/ORM_SPEC.md`, `_docs/DATA_MODEL.md`, `_docs/TESTING_STRATEGY.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/CODERSO_RELEASE_GATES.md`, and operational
  deployment/health docs.
- Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for Admin
  identity/permission scoping; keep that browser contract clearly separate
  from server cache.
- On closure, update all TASK-551 files and board statistics, create and index
  changelog 1263 listing every terminal descendant, and record exact validation
  plus before/after measurements and any explicit safe non-goals.

## Implementation Pseudocode

```ts
const eventKey = createCacheInvalidationEventKey();
const result = await db.transaction(async (tx) => {
  const mutation = await mutateBoundedDomain(tx, input);
  const plan = buildCacheInvalidationPlan({ eventKey,
    before: mutation.before, after: mutation.after });
  if (plan) await persistCacheInvalidationTx(tx, plan, cacheBackend);
  return { value: mutation.value, plan };
});

if (result.plan) await applyCacheInvalidationAfterCommit(result.plan);
return result.value;

const cached = await serverCache.getOrLoad(policy, canonicalInput,
  eligibilityContext, async () => {
  return loadNarrowBoundedReadModel(db, canonicalInput);
});
```

Errors from validation/domain constraints remain machine-readable. Transaction
failure emits no cache event. Cache failure becomes a measured miss/bypass and
does not rewrite a committed mutation result. Regression tests exercise hit,
miss, concurrent fill, commit, rollback, stale-generation fill, Redis failure,
and recovery with the same externally visible domain result.
