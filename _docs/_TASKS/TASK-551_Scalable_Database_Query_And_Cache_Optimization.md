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
does not retain a persistent per-process value cache. Every public request first
performs exactly one uncached, authoritative `getSecuritySettings` read before
security/rate middleware. Global Redis outage bypasses to DB; ambiguous/partial generation delivery may expose only unexpired safe-public old-generation bytes
until durable delivery or policy TTL. Mutable content is never eligible on cache state alone: detail runs one indexed visibility/version point gate; a mutable
list runs one bounded membership/version gate for at most validated limit+1 ordered projections, no bodies/hashes, with digest in its key. Thus safe structural
requests total one query and mutable page/home/post/content-entry detail/list totals two (security+gate), with zero other reads. This bounded-eventual contract
is not linearizability/stale-while-revalidate and never applies to security/private data.

This is not a promise to add every conceivable index or cache every response.
Every optimization must have a caller, a bounded contract, representative
small/large evidence, and before/after results. Private/password, draft/preview, auth/RBAC/security decisions, secrets, sessions and nonce-bearing output are
unconditional exclusions no leaf may relax. Only explicitly non-security user-specific responses may prove identity partitioning and a bounded lifetime.

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
| Eligible warm public render | Usually 4+ DB reads before/around HTML cache | Every request executes 1 authoritative SecuritySettings read. Safely eligible structurally non-mutable routes execute no other query; mutable page/home/post/content-entry detail/list routes execute exactly 1 additional narrow point or bounded membership gate. Both execute 0 additional warm-hit queries; commonly 50-90% fewer DB calls and 40-90% lower application latency for true hits |
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
TASK-551-01 runs one deterministic family scenario at a time with exact target/
support counts, UUIDv5 IDs from `(validatedRunScope,profile,family,ordinal)`,
list timestamps grouped by ten and append timestamps unique by ordinal. Fixed
distributions are users `80/10/10` across status with five roles/every tenth
multi-role; content `50/30/10/10`; entry visibility `70/20/10`; forms
`60/30/10`; submissions `70/20/10`; media `80/20` with 10% null folder; five
booking statuses at 20% each; search uses the exact per-family integer common/
rare table plus hidden/miss zero (never percentage rounding); and ten-row equal-
sort groups. Small/large pools are `2/10`, with three repetitions of five
warmups plus 30 samples after `20/100` calibration. P95 spread is
`(max-min)/max(median,0.1)*100` with an all-zero result of zero and a `20%` cap;
the accepted calibration factor is `0.80..1.20`, and frozen ceilings use
`ceilToTenth(max(floor, medianRepetitionPercentile*1.25))`. Normal gates consume
only stored finite ceilings and never silently freeze new ones.
Summary/facet fixtures freeze `asOf=2026-01-15T12:00:00.000Z`. Submission `ordinal%4===0` is 1..6 days before; all others are 8..37 days before, yielding rolling-
seven-day `500/25,000` and spam `200/10,000`. Booking UTC/New_York/Tokyo buckets `0..9/10..19/20..59/60..99` mean same-day past/future/next/prior, +60-minute end,
and exact today `400/20,000`, upcoming/past-current `1,000/50,000` each, independent of host timezone.

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

TASK-551-05-L01 is the one atomic schema/migration owner. Its generated FTS and
trigram source bytes use only the exact `SEARCH_VECTOR_SQL`/
`TRIGRAM_CANDIDATES` literals built from immutable-safe
`coalesce(...) || ' ' || ...` concatenation; `concat_ws` or another stable
variadic helper is forbidden. Before migration, the closed function/operator
dependency set is resolved through `pg_proc`/`pg_operator` and every
implementation must have `provolatile = 'i'`. The installed Drizzle DSL cannot
represent the booking GiST exclusion, so the same leaf exports one deeply
immutable `BOOKING_RESERVATION_EXCLUSION_SQL` descriptor whose exact custom
fragment is `CREATE EXTENSION IF NOT EXISTS btree_gist` followed by
`ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl
EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH
&&) WHERE (status IN ('pending', 'confirmed'))`; rollback is exactly
`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl`
and preserves the shared extension. The generated snapshot
intentionally omits only that unrepresentable object; exact descriptor/migration/
live `pg_constraint` parity, clean/prior apply, rollback/forward reapply, fresh-
generator zero drift, and a no-generated-drop guard prove it. This satisfies the
AGENTS atomic-artifact rule because L01 alone lands the schema exports and
descriptor, the one SQL migration, matching generated snapshot and journal
update, plus all guards in one change; it neither pretends DSL support nor
defers an artifact to another writer.

All snapshot-owned TASK-551 indexes live in one closed catalog, including every form/booking/list/reverse-FK/retention member; assistant ingest uses
`started_at`. Exact caller/index pairs include `pages_author_list_updated_id_idx(author_id,updated_at DESC,id DESC)`, role-leading
`user_roles_role_user_idx(role_id,user_id)`, and `posts_tags_gin_idx`/`media_tags_gin_idx` as `jsonb_path_ops` GIN for their exact parameterized `@>` predicates.
The read-performance catalog also owns `cache_outbox_unprocessed_age_idx(created_at ASC,id ASC) WHERE processed_at IS NULL`; planned
`cacheInvalidationOutbox.ts#readOldestUnprocessedAge` uses fingerprint `cache_outbox_oldest_unprocessed` and exact `WHERE processed_at IS NULL ORDER BY
created_at,id LIMIT 1`, including claimed/backed-off rows, with 1k/100k EXPLAIN plus insert/claim/retry/complete write-budget evidence.
Deployment is four-phase. After preflight, the transactional-expand mutation drain remains through phase 3a while top-level concurrent builds make
`page_revisions_page_version_idx`, `content_revisions_entry_version_idx`, then `widget_template_revisions_template_version_idx` ready/valid and durably receipt
the `revision-integrity` barrier via `apply-resume-check --through-group revision-integrity`; old `max(version)+1` writers remain rejected. Only then does the old
app resume for the online read-performance group and final catalog admission. Transactional SQL creates no index. Crash/resume, numeric limits, reverse
`DROP INDEX CONCURRENTLY`, the custom GiST seam, fresh `resolve-receipt`, and two full `apply-resume-check` calls with a zero-DDL rerun remain mandatory.

### Exact server-cache boundary

The standalone server-only owner exports these exact concepts and fields;
07-L01 may implement but may not rename, extend, narrow, or duplicate them
without amending every consumer task first:

```ts
type ServerCacheBackend = "memory" | "redis";

type CacheSchemaVersion = number & { readonly __cacheSchemaVersion: unique symbol };
type PositiveCacheTtlMs = number & { readonly __positiveCacheTtlMs: unique symbol };
type CacheValueByteLimit = number & { readonly __cacheValueByteLimit: unique symbol };
type NegativeCacheTtlMs = number & { readonly __negativeCacheTtlMs: "5_000..15_000" };
declare const validatedCacheEligibilityProof: unique symbol;
type CacheShareScopeDigest = string & { readonly __cacheShareScopeDigest: "lowercase-64-hex" };
type CacheEligibilityProof = Readonly<{ shareScopeDigest: CacheShareScopeDigest;
  negativeFill: "forbid" | "eligible"; readonly [validatedCacheEligibilityProof]: true }>;
type CachePolicy<T> = {
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  tags: readonly CacheTag[];
  negativeTtlMs: null | NegativeCacheTtlMs;
  stalePolicy: "forbid";
  decode: (input: unknown) => T;
  isEligible: (context: CacheEligibilityContext) => CacheEligibilityProof | null;
};

interface ServerCacheStore {
  get(key: CacheKey): Promise<Uint8Array | null>;
  set(key: CacheKey, value: Uint8Array, ttlMs: PositiveCacheTtlMs): Promise<void>;
  delete(key: CacheKey): Promise<void>;
  readGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  bumpGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<boolean>;
  health(): Promise<ServerCacheHealth>;
  close(): Promise<void>;
}

declare const validatedConditionalWriteEntry: unique symbol;

type CacheConditionalWriteEntry = Readonly<{
  key: CacheKey; encodedEnvelope: Uint8Array; fillKind: "positive" | "negative";
  ttlMs: PositiveCacheTtlMs; policyPositiveTtlMs: PositiveCacheTtlMs;
  policyNegativeTtlMs: NegativeCacheTtlMs | null; policyMaxValueBytes: CacheValueByteLimit;
  readonly [validatedConditionalWriteEntry]: true;
}>;

type CacheConditionalWrite = {
  expectedGenerations: CacheGenerations; tags: readonly CacheTag[];
  entries: readonly [CacheConditionalWriteEntry]
    | readonly [CacheConditionalWriteEntry, CacheConditionalWriteEntry];
};

type CacheInvalidationPlan = { eventKey: string; tags: readonly CacheTag[] };

declare function createCacheConditionalWriteEntry(input: Readonly<{
  policy: CachePolicy<unknown>; key: CacheKey; encodedEnvelope: Uint8Array;
  fillKind: "positive" | "negative"; ttlMs: PositiveCacheTtlMs;
  storeMaxEntryBytes: CacheValueByteLimit;
}>): CacheConditionalWriteEntry;

type ServerCacheForcedBypassReason = "redis_unavailable" | "outbox_lag" | "local_incoherence";

type ProcessCacheCoherenceEpoch = number & { readonly __processCacheCoherenceEpoch: unique symbol };

type ServerCacheCoherence =
  | Readonly<{
      state: "coherent";
      epoch: ProcessCacheCoherenceEpoch;
      oldestPendingAgeMs: null | number;
    }>
  | Readonly<{
      state: "forced_bypass";
      epoch: ProcessCacheCoherenceEpoch;
      reason: ServerCacheForcedBypassReason;
      affectedFamilies: "all" | readonly CacheFamily[];
      sinceMonotonicMs: number;
      oldestPendingAgeMs: null | number;
    }>;

type ServerCacheHealth = Readonly<{
  backend: ServerCacheBackend;
  readiness: "ready" | "degraded";
  coherence: ServerCacheCoherence;
  stableCode: null | string;
}>;

type CacheCoherenceAffectedTags =
  | "all"
  | readonly [CacheTag, ...CacheTag[]];

type ServerCacheCoherenceSignal =
  | Readonly<{
      kind: "force";
      source: "memory_store" | "redis_store" | "outbox_worker" | "post_commit";
      reason: ServerCacheForcedBypassReason;
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: string;
    }>
  | Readonly<{
      kind: "recover";
      source: "memory_store" | "redis_store" | "outbox_worker";
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: null;
    }>
  | Readonly<{
      kind: "invalidation_observed";
      source: "local_post_commit" | "pubsub";
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: null;
    }>;

type ServerCacheBackendHealthInput = Readonly<{
  backend: ServerCacheBackend;
  readiness: "ready" | "degraded";
  stableCode: null | string;
}>;

interface ServerCacheCoherenceController {
  registerPolicy(input: Readonly<{
    family: CacheFamily;
    tags: readonly CacheTag[];
  }>): void;
  report(signal: ServerCacheCoherenceSignal): void;
  currentEpoch(family: CacheFamily): ProcessCacheCoherenceEpoch;
  snapshot(): ServerCacheCoherence;
  health(input: ServerCacheBackendHealthInput): ServerCacheHealth;
}
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

Policy schema versions accept only `1..2_147_483_647`; positive policy and store
TTLs accept `1..3_600_000 ms`, negative policy TTL accepts `5_000..15_000 ms`,
and policy value limits accept `1..16_777_216` bytes within the store ceiling.
Only `ServerCache` creates branded entries. Both stores strictly decode every
envelope, require entry/envelope `fillKind` equality, select the positive ceiling
or require the non-null negative ceiling, and recheck TTL, lifetime, encoded
bytes and total UTF-8-key-plus-envelope bytes before any command/mutation. Redis
uses the same one exact internal validator for generation-only and lease-owned
writes; any forged/malformed one/two-entry bundle issues zero Redis commands.
A public HTML configuration TTL of `0`
bypasses `public-html-manifest` and `public-html` policy construction,
generation reads, and store access. It does not disable the independent fixed
positive `public-runtime` bootstrap policy; positive public HTML TTL normalizes
to `1..600_000 ms`. Unknown or malformed coherence fails to `forced_bypass`.
Signals are recursively normalized and one process-local controller derives
affected families from registered finite policy tags. An effective force or
recovery transition advances affected-family epochs once before becoming
visible, while a state-identical force/recover report is a no-op. Every accepted
`invalidation_observed` report conservatively advances the affected epochs,
including duplicate at-least-once local or Pub/Sub observations. There is no
event-dedup registry; an observation never clears any fence or authorizes stale/
private values. Fences remain independent by source. An epoch at the safe-
integer ceiling is permanently forced-bypass until process restart. Locally
known outbox lag or incoherence strictly above `5_000 ms` forces affected-family
value bypass until recovery.

`ServerCache` is the cache-aside coordinator above the store. It owns canonical
serialization, strict envelope validation, byte measurement, TTL jitter,
single-flight, telemetry, circuit breaking, and bypass behavior. Domain
services never instantiate/import memory or Redis adapters.
Its generic `getOrLoad(ServerCacheLoadRequest<TCached,TResult>)` is the sole load/
fill owner: it captures primary+finite `fillFenceTags` generations and accepts a strict loader union. `kind:"no_fill"` carries only finite reason+`returnValue`
and performs no encode/write; `kind:"fill"` carries `fillKind:"positive"|"negative"`, `cacheValue`, caller-only `returnValue`, and branded zero/one companion.
Positive primary and companion independently sample and cap their own policy TTLs, so an atomic pair may have unequal TTLs. Negative fill requires the
policy's negative TTL and cannot carry a companion. Consumers call neither write primitive; hits/waiters use `resolveCached`, and
every bypass/lost-generation/lease path returns the authoritative result without fill.
Public HTML couples manifest+HTML only through that seam: a manifest-primary miss
caches manifest plus branded HTML companion while returning the HTTP response;
a manifest hit/HTML miss makes HTML primary plus refreshed-manifest companion.
Both-or-neither fills and `returnValue` is never encoded. Public manifest/HTML loaders use only positive fill or finite-reason `no_fill`, never negative fill;
a render-time excluded dependency returns its authoritative response as `no_fill` without throwing, encoding, or publishing either entry.

Keys are length-bounded, SHA-256-digested canonical input under the conceptual
shape `coderso:<deployment>:server-cache:v1:<family>:sv<schemaVersion>:<generation-digest>:<input-digest>`.
The debug label is stored only as sanitized bounded metadata. Keys contain no
raw URL, query, PII, cookie, token, nonce, secret, or delimiter-parsed identity.

The memory adapter is an O(1) LRU bounded by both entry count and serialized
bytes, plus key/value/tag limits, monotonic expiry, at most 64 lazy-sweep
examinations per operation, and backend-independent promise-only local single-
flight. The one process-wide distinct-key ceiling defaults to 1,024 and accepts
only `16..10_000`; an existing key always joins, while a new key at capacity
runs the authoritative loader with no map insertion or fill and records
`singleflight_saturated`. Its local-flight key digests `{finalPathKey,
processCacheCoherenceEpoch, shareScopeDigest}`, where the branded lowercase-64-
hex share-scope digest covers every normalized eligibility-context field.
Ineligible/unbranded requests bypass registry/read/lease/fill. The registry keeps
only the identity-cleaned shared fill-outcome promise, never `Promise<TResult>`
or a caller `returnValue`; the owner keeps its own loader result. A joiner uses
its own `resolveCached` only after a strictly decoded `published` outcome proves
successful positive/eligible-negative conditional publication. `no_fill`, rejection,
generation change, lease loss, unavailable/timeout, closed/bypass or malformed
outcomes are `not_published`, so every joiner runs its own authoritative loader
with fill disabled. Safe-integer epoch overflow remains forced-bypass.
Exact validated configuration is supplied by the infrastructure owner; the
planned environment surface is:

```text
SERVER_CACHE_BACKEND=memory|redis      # default memory
SERVER_CACHE_NAMESPACE=<deployment>   # memory default local; explicit non-local required in Redis
SERVER_CACHE_MEMORY_MAX_ENTRIES=<int> # default 200, 1..100000
SERVER_CACHE_MEMORY_MAX_BYTES=<int>   # default 67108864, 1048576..1073741824
SERVER_CACHE_MAX_ENTRY_BYTES=<int>    # default 2097152, 1024..min(total,16777216)
SERVER_CACHE_MAX_IN_FLIGHT_KEYS=<int> # default 1024, 16..10000
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
data. Its strict message contains only `eventKey` plus the resulting generation
digest. A subscriber uses that bounded key for one outbox point read, strictly
normalizes the finite tags there, and only then reports the observation; tags,
record identity, paths, and domain payload never enter Pub/Sub. Distributed
cold-load coalescing uses a bounded `SET NX PX` lease,
unique token, compare-and-delete release, jittered wait/re-read, and generation
recheck before fill. A distributed owner fills only through one bounded Redis
Lua `putIfGenerationsAndLeaseOwned` that atomically proves its lease token and
all expected generations before writing one/two entries. Only `written` fills;
`generation_changed`, `lease_lost`, `unavailable`, and renew `lost|unknown`
return authoritative bytes without fill. A generation-only store write is not a
substitute; token-safe release afterward is cleanup only.

The backend-neutral distributed handoff and singleton runtime accessor remain
exact across 07/08/09:

```ts
type DistributedCacheLeaseMs = number & {
  readonly __distributedLeaseMs: unique symbol;
};
type DistributedCacheWaitMs = number & {
  readonly __distributedWaitMs: unique symbol;
};
type DistributedCachePollMs = number & {
  readonly __distributedPollMs: unique symbol;
};

type DistributedCacheLoadAcquireInput = Readonly<{
  key: CacheKey;
  leaseMs: DistributedCacheLeaseMs; // 100..10_000; default 2_000
  waitMs: DistributedCacheWaitMs;   // 0..500; default 250
  pollMinMs: DistributedCachePollMs; // 10..50
  pollMaxMs: DistributedCachePollMs; // 10..50; min <= max
}>;

type DistributedCacheLoadWaitResult =
  | Readonly<{ kind: "value"; bytes: Uint8Array }>
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "unavailable"; stableCode: string }>;

type DistributedCacheOwnedWriteResult =
  | Readonly<{ kind: "written" }>
  | Readonly<{ kind: "generation_changed" }>
  | Readonly<{ kind: "lease_lost" }>
  | Readonly<{ kind: "unavailable"; stableCode: string }>;

type DistributedCacheLoadAcquireResult =
  | Readonly<{ kind: "owner";
      renew: () => Promise<"renewed" | "lost" | "unknown">;
      putIfGenerationsAndLeaseOwned: (
        input: CacheConditionalWrite,
      ) => Promise<DistributedCacheOwnedWriteResult>;
      release: () => Promise<"released" | "lost" | "unknown"> }>
  | Readonly<{ kind: "waiter";
      waitForValue: () => Promise<DistributedCacheLoadWaitResult> }>
  | Readonly<{ kind: "bypass";
      reason: "transport_unavailable" | "closed"; stableCode: string }>;

interface DistributedCacheLoadCoordinator {
  acquire(input: DistributedCacheLoadAcquireInput):
    Promise<DistributedCacheLoadAcquireResult>;
  close(): Promise<void>;
}

type ServerCacheRuntime = Readonly<{
  backend: ServerCacheBackend;
  cache: ServerCache;
  coherenceController: ServerCacheCoherenceController;
  invalidation: CacheInvalidationRuntimeHandle;
  loadCoordinator: DistributedCacheLoadCoordinator | null;
  health: () => Promise<ServerCacheHealth>;
}>;

declare function getServerCacheRuntime(): ServerCacheRuntime;
```

`getServerCacheRuntime()` never constructs a runtime: before start and after
close it throws `server_cache_runtime_unavailable`; while started it returns one
frozen process singleton. The invalidation handle owns exact idempotent
`stopClaiming()`, bounded `drain(timeoutMs)` and `close(timeoutMs)` semantics;
shutdown awaits stop/drain/PubSub close, then distributed-coordinator close,
cache/store close, and only then database close.

### Cache eligibility and invalidation

Initial safe families include normalized non-secret public settings, active
theme/profile/routes, redirects (short positive/negative), site shell,
published public page/entry/post/listing/form configuration, and cache-eligible
public HTML. Every renderer returns or registers the exact dependency tags it
consumed. Global invalidation may initially bump a site generation; finer tags
must remain bounded and evidence-driven.

Minimal method+URL dispatch preserves the complete booking/Forms/analytics API before cache normalization/read/write: every booking path/method including
`GET /api/booking/slots`, exact Forms submission/upload paths at every method, and analytics beacon at every method. Existing handlers retain access/session/
API-key/CSRF/DNT/rate/nonce/HMAC/CAPTCHA/token and method/not-found behavior. Only unmatched surviving GET/HEAD normalizes a cache request; every request
performs its one authoritative SecuritySettings query.
Mutable page/home/post/content-entry details then execute one narrow indexed
point gate before manifest/value lookup; exact projections are page
`id,status,publishedAt,hasPublishedData,updatedAt`, post
`id,status,publishedAt,updatedAt`, and entry
`id,status,publishedAt,visibility,hasPassword,updatedAt` (booleans derived).
Corresponding lists execute one family-specific ordered projection for at most
`pageLimit + 1` rows, no body/hash. Missing/unpublished/removed representation,
private/password, membership/reorder/version change, or malformed proof fails
closed and cannot return primed output. A safe structural hit totals one query;
a gated hit totals two; both add zero domain/render/cache reads.

Never cache decrypted/secret `SecuritySettings`, session/auth/RBAC decisions,
private/password content, drafts/previews, unknown query variants, 5xx responses,
or unbounded user-specific output. Exact no-manifest/no-envelope-fill exclusions
are `commerce_product_data`, `form_submission_nonce`, `booking_submission_nonce`,
`booking_slots_token`, `analytics_beacon_nonce`, `request_scoped_token`, and
`unknown_dynamic_dependency`; every dynamic dependency is tagged, gated, or one
of those exclusions. Existing form/booking/analytics writes retain nonce/HMAC/
CAPTCHA/access/rate enforcement. Negative
not-found/redirect-miss caching is opt-in and normally 5-15 seconds. No stale-
while-revalidate applies to security/auth decisions. Decrypted security settings
remain DB-authoritative on every read; `security-settings-generation` may carry
only finite generation/coherence metadata, and an explicitly typed redacted
public projection may use a separate policy. No secret-bearing settings object
or decrypted value enters memory cache, Redis, an outbox row, or browser storage.

Every outer authoritative mutation allocates exactly one opaque `eventKey`
before its transaction and returns one deduplicated `CacheInvalidationPlan`
covering old/new identities plus dependants. Nested settings/import/restore
operations receive that same outer key and transaction and contribute finite
tags through `collectInvalidationTagsTx`; they never allocate a nested key,
persist/apply a nested plan, or use the global DB client. Memory mode writes zero
outbox rows and performs exactly one awaited post-commit generation bump. Redis
mode persists exactly one row in the same transaction and then awaits its
immediate `applyAfterCommit(plan)` before returning the committed result; fire-
and-forget is forbidden. The handle absorbs transport failure and resolves only
after local observation or the required affected-tag fence is visible. Rollback/no-op emits no
invalidation. Once the DB
and required outbox commit, a cache transport failure must not turn the API
response into an apparent mutation failure; the worker retries and reads
bypass values whose local incoherence is known. Globally unavailable Redis
always causes DB/render bypass. During an ambiguous/partial delivery state, an
otherwise safe public value may remain visible only while its original TTL is
unexpired; healthy polling is at most 250 ms, invalidation lag targets p99 at
most 1 second, and locally visible backlog/incoherence strictly above 5 seconds
alerts, degrades readiness, and forces affected-family bypass until recovery.
Public HTML TTL is at most 600 seconds and no server-cache policy exceeds 3,600
seconds. Admin preview/readback
bypasses until its event is observed; auth, security, private/password, draft,
preview, and nonce-bearing data remains uncached or fail-closed DB-backed.

Browser Admin cache remains a separate contract. Its opaque scope digest binds
normalized deployment identity, a crypto-random 128-bit `authIncarnation`
encoded as 32 lowercase hex characters, monotonically increasing safe-integer
`authEpoch`, authenticated user identity, and sorted roles/permissions. Keys,
envelopes, and cacheBus events carry the deployment digest plus scope digest and
epoch; they never carry raw identity/permissions/incarnation. `sessionStorage`
retains only the strict incarnation record for reload in the same authenticated
tab session. Rotate before a successful new-login scope; delete/rotate before
logout, 401/403 or identity transition, then advance epoch and clear scope.
Permission changes advance epoch and derive a new scope. Storage failure uses a
fresh memory-only incarnation and persistent safe misses; no auth API payload is
changed. Storage quota/private-mode, broadcast, and subscriber failures are
best-effort and cannot make a successful API mutation look failed. Dirty editor
state and background revalidation semantics remain unchanged.
Deployment identity is fixed-order UTF-8 JSON `{v:3,origin,adminBasePath,
entryModulePath}`. Scope is SHA-256 of fixed-order v3 JSON containing that string,
incarnation, epoch, user ID, and separate NFC/deduplicated/UTF-8-byte-sorted
permission/role ID arrays; delimiter concatenation and unknown/oversized input fail.

Security-settings partial writes set local lock timeout `2s` and acquire advisory lock `(551,904)` before same-transaction read/merge/write. Redis writes add
exactly one same-transaction outbox row; memory writes add zero and use exactly one awaited post-commit generation bump. Both map `55P03`/`40P01` to
`security_settings_conflict` and await invalidation; no pre-lock/global/cached merge read is permitted.

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
and `core/db/migrations/meta/_journal.json`), `.env.example`,
`core/server/publicSite.tsx`, the
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

- TASK-551-02: `core/db/client.ts`, DB config, runtime lifecycle registry,
  `runtimeEntrypoint.ts`, and the sole `prod.ts` plus `dev.ts` start/signal paths,
  sanitized DB telemetry, and exact `withDedicatedDatabaseSession<T>(run)` API.
  It also exports `assertMaintenanceSessionAffinity()`. `DB_MAINTENANCE_MODE=primary|direct|session`, pool max `2..4`, and secret `DB_MAINTENANCE_URL` are strict.
  Ordinary primary startup never probes, so `off+primary+DB_POOL_MAX=1` is valid when the scheduler is disabled and `verifyDatabaseSessions` checks that one session only. Explicit direct/session probes once at DB start;
  the lifecycle-scoped promise/result is reused. An enabled scheduler awaits the assertion before timer/listen and fails at capacity below two or transaction+primary.
  Its reserved-session value exposes only signal-aware static `execute`, bounded `transaction`, `assertAlive`, and `cancelActiveAndRollback`; no active SQL/
  transaction returns to the pool, and cancellation-aware workers confirm rollback/connection termination before close continues.
  `runtimeEntrypoint.ts` is the sole lifecycle start/close, signal, listen and HTTP-drain owner; thin prod/dev adapters only select mode. It registers Vite as
  a participant, awaits start, listens only after success/no startup signal, awaits the signal, drains HTTP gracefully for at most 10 seconds then forcibly,
  and reverse-closes participants. Every close receives `RuntimeCloseContext{absoluteDeadline,signal}`. Total shutdown is at most 15 seconds; non-DB closes
  are at most 5 seconds, while DB is the sole exception at `min(10 seconds, remaining absolute budget)` with no outer 5-second race or detached teardown. Start
  failure awaits partial rollback and never listens; no participant/adapter owns another signal, lifecycle call, `server.stop`, or drain algorithm.
  08-L03 composes only `httpServer.ts`.
  Default Bun suites are `tests/integration/server/task551DatabaseLifecycle.test.ts`
  and `tests/integration/server/task551RuntimeEntrypoints.test.ts`; defaults are pool/
  replicas/server/reserve/worker/migration `10/1/103/21/2/1`, planned `13`,
  available `82`, with strict `planned < available`. Lifecycle ceilings are
  2,000/5,000/10,000/15,000 ms plus a 10-second DB close and late acquisitions
  release once. Six families, five outcomes, 12 duration cells and nine row
  cells including overflow produce 3,240 cells per fingerprint plus 44 pool
  cells, using saturating counters and deterministic snapshot/reset. Its direct paths are `tests/vitest/db/databaseConfig.test.ts`,
  `tests/vitest/db/queryFingerprintRegistry.test.ts`, the Bun lifecycle path above, and `tests/perf/database-pool-telemetry.test.ts`; measurement and pool
  probing are opt-in and do not claim driver-wide row/wait telemetry. Registry
  names are `QUERY_FAMILIES`, `QUERY_OUTCOMES`, `QUERY_DURATION_BUCKET_MAX_MS`, `ROWS_RETURNED_BUCKET_MAX`,
  `POOL_WAIT_BUCKET_MAX_MS`, `POOL_OUTCOMES`, `MAX_QUERY_FINGERPRINTS=512`, and
  `MAX_COUNTER_VALUE=Number.MAX_SAFE_INTEGER`.
- TASK-551-03: shared cursor/projection/batch owners, exact
  `PaginationCursorKeyring`, `loadPaginationCursorKeyring(env)`, idempotent
  `registerPaginationCursorLifecycleParticipant()`, and fail-closed
  `requirePaginationCursorKeyring()`. L02 owns the complete
  `core/server/routes/index.ts` and calls only the register helper at module
  evaluation before the generic lifecycle start. After all 06 services land,
  L02 solely owns page/detail revision route/schema/client/UI envelope adoption,
  the complete current seven-client consumer graph, bounded picker/search/load-
  more behavior, every cohesive split needed for touched files above 1,000
  lines, its direct tests, and the five-scenario UI smoke. L02 extracts
  `formReadService` as the sole form-list SQL owner with exact `FormListItem`
  `id,name,slug,status,description,submissionAccess,updatedAt`; `bookingReadService` owns
  every booking list, including paginated reservation/resource/service/blackout
  reads, capped service-resource/schedule arrays, and the 31-day/500-slot preview.
  Existing Reservations/Resources/Services tabs consume narrow items; Services retains derived `submissionAccess`, edits await point detail, and Availability/
  SlotPreview use bounded pickers. Submission payload uses one authorized parent-bound point query only after expansion, stays component-local/uncached, and
  aborts/clears on close/unmount/logout/auth change; every success/error response sets `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`,
  `Expires: 0`, and its client passes `cache:"no-store"`. Media `name` derives originalName→title→sanitized key basename→asset; raw key stays omitted and utils consumes name.
  Oversized legacy `booking-page.test.tsx`/`media-library.test.tsx` are deleted: exact fixtures are `bookingPageTestFixtures.tsx`/`mediaLibraryTestFixtures.tsx`,
  with booking `loading-pagination|mutations|calendar` and media `loading-pagination|selection-folders|upload-edit` independently runnable suites.
  Exact extraction stems are `BookingOverviewPanel`, `MediaLibraryFolderState/Results`, `UsersRolesContent`, `DetailTemplateRevisionPanel`, `MenuDesignCanvas/Inspector/DataSources`, `MenuEditorWorkspace`, `PostEditorMediaControls`, `ContentListSource/PresentationEditors`, `CtaBannerContentEditors`, `EntryTeaserSource/PresentationEditors`, `FeatureGridItemEditors`, `FooterNavigation/BrandEditors`, `GalleryMosaicItemEditors`, `HeroContent/Media/LayoutEditors`, `LogoCloudItemEditors`, `NavigationItem/PresentationEditors`, `PostsFeedSourceEditors`, `RichTextContent/LayoutEditors`, `SectionContent/LayoutEditors`, `TeamMember/LayoutEditors`, and `TestimonialItemEditors`. The page-editor flow becomes one shared
  fixture plus eight named loading/editing/autosave/preview/publish/sections/
  accessibility/persistence suites. The 06-L02 handoff preserves two summaries:
  page `{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`
  and detail `{id,detailPageId,version,kind,createdAt,createdBy:string|null}`.
  Each typed `{items,nextCursor,hasMore}` envelope uses input `{cursor?,limit?}`,
  default/max `50/100`, `version DESC,id DESC`; bodies are point-only and
  invented `reason` is forbidden. No raw-array,
  auto-fetch-all, or silent first-page fallback exists.
  Every metric-bearing Admin keyset response is `{items,nextCursor,hasMore,summary,facets}`: only `matchingTotal` follows row filters; other typed summary counts and
  bounded author/content-type/role/folder/tag facets retain global authorized/parent scope. Facet pages are strict `{items,nextCursor,hasMore}`, default/max
  `50/100`, no auto-fetch; page+fixed aggregate+optional bounded facet batch totals at most three SQL with no page concatenation/per-row lookup.
- TASK-551-04: search and assistant retrieval query owners only; it consumes the TASK-551-05 vector/index schema and owns no migration artifact. Search GETs
  become provably write-free. The sole history write is internal `POST /admin/api/search/history`: session actor, `content:read`, shared CSRF, `admin_write`
  bucket, strict four-key body and actor-bound UUID idempotency; conflict maps 409. `searchClient.ts` and `useSearchResults.ts` reuse one UUID per normalized UI
  intent/retry, and no public/API-key/GET mutation alias exists.
- TASK-551-05: the sole TASK-551 owner of schema decomposition and every
  migration/vector/index/constraint/outbox schema artifact plus plan evidence;
  it also owns the one explicit Drizzle-unsupported exclusion descriptor/custom
  seam and all generator/catalog/drift guards; it does not rewrite service query
  logic owned elsewhere or claim a fake DSL representation.
- TASK-551-06: access/audit/append-heavy retention, revision allocation and
  maintenance jobs assigned in its leaves, including exact
  `createRetentionSchedulerLifecycleParticipant`; it owns no migration,
  `dockerStart.ts`, HTTP composition, or signal handler and hands the entry/post/
  detail-document adoption contract to TASK-551-09. Every adopter uses exactly
  `withRevisionParentLock(identity, tx, run)` with a zero-argument `run` that
  closes over `tx`, and `allocateRevision(input, tx)`; tx-first overloads are
  forbidden. L01 alone owns Bun-free `searchHistoryContract.ts` and its Vitest,
  removes the real private `pruneHistory` declaration/call, and lands actor/UUIDv5-idempotent `recordSearch`; L04 imports that contract read-only for POST.
  Scheduled retention lock/liveness/batches/unlock use one dedicated backend PID. Loss cancels and rolls back before reacquire, returns only
  `retention_lock_lost`, and publishes no partial summary. Close aborts/cancels/confirms rollback or termination within `4,500 ms`; no detached work survives.
  Analytics age is owned only by `ANALYTICS_RETENTION_DAYS`: absent/malformed/non-finite resolves to 365 and finite values floor then clamp to
  `30..1095`; `Number(raw)` pins empty/whitespace/0/-1/1.9→30, 30.9→30,
  `0x20`→32, `1e2`→100, 1095.9/1096→1095, while absent/non-finite/malformed→365.
  Only `RETENTION_ANALYTICS_ENABLED` enables it and both age aliases reject.
  Every present `ANALYTICS_PRUNE_INLINE_DISABLED` or
  `ANALYTICS_PRUNE_INLINE_ENABLED` value is a separate raw-value-free warning-
  once deprecated no-op. `RETENTION_DRY_RUN` is the sole exact lowercase boolean;
  true performs bounded reads and zero destructive-row-lock/mutation/publication/
  progress. Direct service calls take no scheduler advisory lock; scheduled dry-
  run takes exactly one replica advisory lock before invoking the same service.
  Request writes perform zero inline analytics pruning.
- TASK-551-07: standalone server-cache contracts/coordinator/memory adapter only.
- TASK-551-08: Redis adapter, outbox services/worker, generation transport and
  distributed coalescing; L03 is the sole `httpServer.ts` composition writer and
  defines `registerComposedHttpRuntimeParticipants()`.
  `httpServer.ts` calls it idempotently at module evaluation to register cache,
  retention, and the existing backup scheduler start/stop seam while preserving
  the cursor participant already registered by `routes/index.ts`. L03 never
  loads/injects the keyring, never edits `prod.ts`/`dev.ts`, and does not edit
  `backupScheduler.ts`; both entrypoints remain 02-L02 lifecycle adapters.
  TASK-551-08 consumes TASK-551-05's outbox schema and owns no schema/migration.
- TASK-551-09: the whole current public/entry/post/SEO/import-export/detail-page
  adoption files and tests, settings/security cache, site-shell dependencies,
  mutation invalidation, and Admin identity-cache safety; it adopts 03's query
  and 06's revision handoffs without split writers. Its four leaves own and run
  every direct existing suite named in their exact validation commands; 10
  consumes those receipts and owns only aggregate/full gates and documentation.
- TASK-551-10: gates, fault/load harnesses, docs and closure only; it does not
  reopen production source contracts.

The per-leaf exact allowlists override this summary. TASK-551-01-L01 is the sole
writer of the machine-readable ownership matrix: it freezes the initial current
inventory before TASK-551-02 and is re-dispatched after TASK-551-09 to replace
the receipt with a fresh exact-set `phase: "final"` inventory. Later leaves and
TASK-551-10 consume but never edit those artifacts. A discovered overlap is a
task-contract defect and must be reconciled before dispatch, not resolved by two
writers editing the same file.

## Sub-Tasks

### Land Order

TASK-551-11 is an orchestration sidecar throughout. Product work lands strictly
in this compile-green order (child names include their leaves unless a leaf is
spelled out):

1. [ ] **TASK-551-01** — performance baseline, complete query inventory, and
   small/large budgets (2 leaves).
2. [ ] **TASK-551-02** — validated pool, timeouts, lifecycle, query telemetry,
   and operations evidence (2 leaves).
3. [ ] **TASK-551-05** — evidence-driven composite/partial/FK indexes and
   concurrency constraints (2 leaves).
4. [ ] **TASK-551-03-L01** — cursor/bounded-read contracts and lifecycle adapter.
5. [ ] **TASK-551-06-L01 → TASK-551-06-L02 → TASK-551-06-L03** —
   retention, bounded pruning, revision services, scheduling, and partition
   readiness.
6. [ ] **TASK-551-03-L02** — bounded Admin/revision route, schema, client, UI,
   consumer-graph and concurrency adoption after 06.
7. [ ] **TASK-551-03-L03** — aggregate, webhook, and solution-kit batching.
8. [ ] **TASK-551-04** — exact indexed full-text/trigram search and bounded
   assistant candidates (2 leaves).
9. [ ] **TASK-551-07** — typed local-first server cache and byte-bounded memory
   LRU/single-flight (2 leaves).
10. [ ] **TASK-551-08** — optional Redis, durable generation invalidation,
   Pub/Sub acceleration, and distributed stampede control (3 leaves).
11. [ ] **TASK-551-09** — hot-path cache adoption, one-query safe whole requests,
   two-query mutable page/home/post/entry whole requests, complete post-commit
   invalidation, and Admin/security cache hardening
   (4 leaves).

   **Mandatory final inventory gate:** re-dispatch TASK-551-01-L01 from the
   validated post-09 production tree. The same sole artifact writer refreshes
   exact set equality and emits a `phase: "final"` receipt with zero planned
   deltas before TASK-551-10-L01 may start.

12. [ ] **TASK-551-10** — small/large load and fault matrix, documentation,
    operational runbooks, and family closure (2 leaves).

**TASK-551-11** remains the author/audit/implementation/post-audit evidence
sidecar throughout and has no product leaf or numbered product slot.

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
- Coherence tests prove state-identical force/recover reports are no-ops; every
  accepted local/PubSub `invalidation_observed`, including duplicate delivery,
  advances affected epochs without clearing fences; no event-dedup registry or
  second epoch mutator exists; overflow forces permanent bypass. Pub/Sub carries
  only event key plus generation digest and resolves tags by outbox point read.
- Public Redis consistency is explicitly bounded-eventual: global outage
  bypasses on every replica; partial/ambiguous delivery may expose only safe,
  still-unexpired public old-generation bytes until delivery or hard TTL. Poll
  is at most 250 ms, healthy lag p99 at most 1 second, locally known incoherence
  strictly above 5 seconds alerts, degrades readiness, and forces affected-family
  bypass until recovery, public HTML TTL is at most 600 seconds,
  and all policy TTLs are at most 3,600 seconds. Admin preview/readback bypasses
  until observation; security/private/auth/nonce data has no stale allowance.
- Every public request performs exactly one authoritative SecuritySettings read. A safe structurally non-mutable HTML/list request has no other query. A mutable
  page/home/post/entry detail or list adds exactly one narrow point or bounded membership gate for at most `pageLimit + 1` projections and no bodies. Both
  execute zero additional warm-hit queries; restricted/missing/malformed or changed membership/version proof cannot return primed output. Preview,
  private/password, nonce-bearing and unsafe variants never enter the cache. Old/new slug, update, delete,
  selected menu/footer, theme, settings, SEO, redirects, forms and list
  dependencies invalidate after commit only.
- Admin cached values cannot cross deployment, crypto-random 128-bit session
  `authIncarnation`, authenticated identity/permission or monotonic `authEpoch`
  scopes. Incarnation rotation precedes login/logout/401/403/identity changes;
  failed storage uses memory-only scope and persistent misses. Storage/cacheBus
  errors cannot reverse a successful authoritative API result and no auth API
  payload changes. Decrypted or secret-bearing security
  settings are never cached and every read remains DB-authoritative; only finite
  generation/coherence metadata and explicitly redacted projections are eligible.
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
- TASK-551-09 leaves themselves own and run all direct existing-suite paths in
  their validation commands. TASK-551-10 consumes exact current receipts for
  those paths; aggregate/full commands may rediscover them but never transfer
  their ownership or edit/rebaseline them.
- Closure runs full `bun run test`, `bun run precommit:check`,
  `bun run gates:coderso`, the required strict security scan, exact performance
  and reliability suites, migration-from-clean plus migration-from-prior
  snapshots, at least five distinct two-process/Redis real-flow smokes, and the
  TASK-551-03-L02 five-scenario Admin-list Playwright smoke in both light and dark
  modes with screenshots, visible-effect assertions, and zero console errors.
- TASK-551-01-L01 runs in `initial` phase before 02 and is re-dispatched after 09
  in `final` phase. TASK-551-10-L01 rejects an initial/stale receipt, any planned
  delta, or a final source-tree digest that does not match the current production
  query surface.
- Redis integration uses an isolated test namespace/database and cleans only
  its own keys. If CI provisions Redis differently, the test command and
  service version become part of the checked-in release-gate contract.

## Documentation Updates Required

- Add `_docs/DATABASE_PERFORMANCE.md` as the query/index/pool/retention source of
  truth and `_docs/SERVER_CACHE.md` as the local/Redis/outbox contract.
- Update `.env.example`, `README.md`, `_docs/ARCHITECTURE.md`,
  `_docs/CMS_API.md`, `_docs/ORM_SPEC.md`, `_docs/DATA_MODEL.md`, `_docs/TESTING_STRATEGY.md`,
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
  const collector = createTransactionInvalidationCollector(tx, eventKey);
  const mutation = await mutateBoundedDomain(tx, input, {
    eventKey,
    collectInvalidationTagsTx: (nestedTx, nestedEventKey, change) =>
      collector.addFromSameOuterContext(nestedTx, nestedEventKey, change),
  });
  const plan = collector.toPlanOrNull();
  if (plan) await persistCacheInvalidationTx(tx, plan, cacheBackend);
  return { value: mutation.value, plan };
});

const runtime = getServerCacheRuntime();
if (result.plan) await runtime.invalidation.applyAfterCommit(result.plan);
return result.value;

const cache = runtime.cache;
const cached = await cache.getOrLoad(policy, canonicalInput,
  eligibilityContext, async () => {
  return loadNarrowBoundedReadModel(db, canonicalInput);
});

const security = await getSecuritySettings(); // exactly once before middleware
await runPublicSecurityAndRateMiddleware(request, security);
const visibility = request.isMutableContentDetail
  ? await loadNarrowPublicContentVisibilityVersion(request.identity)
  : null;
const membership = request.isMutableContentList
  ? await loadBoundedPublicContentMembershipVersions(request.listGate)
  : null;
if (request.requiresMutableContentGate &&
    !(visibility ?? membership)?.isStrictlyPublic) {
  return renderThroughAuthoritativeTask517Path(request, visibility);
}
const snapshot = await readFixedPositiveRuntimeSnapshot(cache, request);
if (snapshot.publicHtmlTtlMs === 0) {
  return renderWithoutManifestOrHtmlCache(request, snapshot);
}
return readWarmValue({ request,
  gateDigest: visibility?.versionToken ?? membership?.orderedDigest });
```

Errors from validation/domain constraints remain machine-readable. Transaction
failure emits no cache event. Cache failure becomes a measured miss/bypass and
does not rewrite a committed mutation result. Regression tests exercise hit,
miss, concurrent fill, commit, rollback, stale-generation fill, Redis failure,
and recovery with the same externally visible domain result. Security settings
always use their narrow authoritative DB read; cache infrastructure may expose
only generation/coherence metadata or an explicitly redacted projection.
