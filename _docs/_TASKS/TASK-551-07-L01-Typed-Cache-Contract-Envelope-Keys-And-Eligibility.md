# TASK-551-07-L01: Typed Cache Contract, Envelope, Keys, and Eligibility
# FileName: TASK-551-07-L01-Typed-Cache-Contract-Envelope-Keys-And-Eligibility.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-07
**Priority:** High
**Category:** Cache / Contracts / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-551-06-L03; consumes TASK-551-01/02 contracts
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Own the Bun-free typed boundary used by all memory and Redis implementations:
strict policies/envelopes, canonical SHA-256 keys, eligibility, invalidation
plans and validated infrastructure configuration. Do not implement a store.

## Sub-Tasks

None. This file is an executable leaf under TASK-551-07.

## Exclusive Ownership

This leaf is the sole writer of:

- new `core/services/cache/serverCacheContracts.ts`;
- new `core/services/cache/serverCacheCodec.ts`;
- new `core/services/cache/serverCacheKeys.ts`;
- new `core/services/cache/serverCacheEligibility.ts`;
- new `core/services/cache/serverCacheConfig.ts`;
- new `tests/vitest/cache/server-cache-contracts.test.ts`;
- new `tests/vitest/cache/server-cache-codec-keys.test.ts`;
- new `tests/vitest/cache/server-cache-eligibility.test.ts`.

Forbidden: `serverCache.ts`, memory/Redis adapters, public runtime, existing
site/Admin cache, domain services, DB/schema/migrations, server lifecycle,
TASK-517, TASK-493 and TASK-511 paths, docs/board/changelog/workflows and package
manifests.

## Exact Owned Surface

Preserve the parent names and export them only from
`serverCacheContracts.ts`: `ServerCacheBackend`, `CacheFamily`, `CacheTag`,
`CacheKey`, `CacheGenerationToken`, `CacheGenerations`,
`CacheEligibilityContext`, `CacheEligibilityFieldDigest`,
`CacheEligibilityProof`, `CacheShareScopeDigest`,
`CachePolicy<T>`, `CacheConditionalWrite`,
`CacheLoadCompanion`, `ServerCacheLoadContext`, `ServerCacheLoaderResult`,
`ServerCacheLoadRequest`, `ServerCacheNoFillReason`, `ServerCacheStore`,
`ServerCacheStoreDescription`, `CacheConditionalWriteResult`,
`ServerCacheHealth`,
`ServerCacheCoherenceSignal`, `ServerCacheCoherenceController`,
`CacheInvalidationPlan`, and an optional `DistributedCacheLoadCoordinator` plus
`DistributedCacheOwnedWriteResult`. `decode` is the only authority for a policy's
value. `CacheSchemaVersion`, `PositiveCacheTtlMs`, `CacheValueByteLimit`, and
`NegativeCacheTtlMs` are opaque normalized integers; production callers obtain
them through constructors rather than assertions. Schema versions accept only
`1..2_147_483_647`, positive policy/conditional-write TTL accepts only
`1..3_600_000` ms, and value-byte limits accept only `1..16_777_216` and must
also fit the normalized store's per-entry ceiling. `NegativeCacheTtlMs` accepts
only integer `5_000..15_000`. The exact v1 policy addition is:

```ts
type NegativeCacheTtlMs = number & {
  readonly __negativeCacheTtlMs: "5_000..15_000";
};

type CacheSchemaVersion = number & { readonly __cacheSchemaVersion: unique symbol };
type PositiveCacheTtlMs = number & { readonly __positiveCacheTtlMs: unique symbol };
type CacheValueByteLimit = number & { readonly __cacheValueByteLimit: unique symbol };
type CacheEligibilityFieldDigest = string & {
  readonly __cacheEligibilityFieldDigest: "lowercase-64-hex";
};

type CacheEligibilityContext = Readonly<{
  access: "public_anonymous" | "authenticated" | "private" | "password" | "unknown";
  renderMode: "public" | "preview" | "draft" | "unknown";
  sensitiveDependency: "absent" | "nonce" | "request_scoped" | "unknown";
  queryVariant:
    | Readonly<{ kind: "known_bounded"; digest: CacheEligibilityFieldDigest }>
    | Readonly<{ kind: "unknown" }>;
  responseDisposition:
    | "positive_candidate"
    | "public_negative_candidate"
    | "unknown";
  mutableVisibilityGate:
    | "not_required"
    | Readonly<{
        state: "strictly_public";
        versionToken: CacheEligibilityFieldDigest;
      }>;
}>;

type CachePolicy<T> = {
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  tags: readonly CacheTag[];
  negativeTtlMs: null | NegativeCacheTtlMs;
  stalePolicy: "forbid"; // v1 never serves an expired/SWR value
  decode: (input: unknown) => T;
  isEligible: (context: CacheEligibilityContext) => CacheEligibilityProof | null;
};

declare const validatedCacheEligibilityProof: unique symbol;
type CacheShareScopeDigest = string & {
  readonly __cacheShareScopeDigest: "lowercase-64-hex";
};
type CacheEligibilityProof = Readonly<{
  shareScopeDigest: CacheShareScopeDigest;
  negativeFill: "forbid" | "eligible";
  readonly [validatedCacheEligibilityProof]: true;
}>;
```

`serverCacheEligibility.ts` is the sole proof factory. It recursively validates the
complete finite `CacheEligibilityContext`, fails closed for every authenticated,
preview/draft, private/password, nonce-bearing, unknown-query, missing or malformed
case, and hashes the canonical encoding of **every** normalized context field into
`shareScopeDigest`; a policy cannot select a subset. The normalized context includes
the public/anonymous access disposition, render mode, nonce/sensitive-dependency
absence, bounded query-variant digest, positive/public-negative permission, and the
complete mutable-visibility gate including its version token. Raw cookies, tokens,
nonces, identities and unrestricted query text are forbidden context fields. A
missing/unbranded proof is ineligible and cannot enter the local fill-attempt registry, read a
value, acquire a distributed lease or fill either backend.

`CacheFamily` is exactly the finite union `public-runtime | public-html-manifest
| public-html | redirects | site-shell | pages | entries | posts | listings |
forms | public-settings | themes | security-settings-generation`. `CacheTag` is
exactly `site:all | site:runtime | site:html | site:redirects | site:shell |
site:pages | site:entries | site:posts | site:listings | site:forms |
site:settings | site:themes | settings:security`. Unknown or variable-suffixed
families/tags fail closed. V1 deliberately maps record ids, slugs, and paths to
these finite family/site generations; variable identity appears only inside the
digested canonical input, preventing unbounded Redis generation metadata.

L01 also solely owns the backend-neutral coherence/health shape consumed by L02,
08-L02/L03 and 09. `ProcessCacheCoherenceEpoch` is an opaque monotonically
increasing safe integer local to one process. The exact v1 health union is:

```ts
type ProcessCacheCoherenceEpoch = number & {
  readonly __processCacheCoherenceEpoch: unique symbol;
};

type ServerCacheForcedBypassReason =
  | "redis_unavailable"
  | "outbox_lag"
  | "local_incoherence";

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
```

`oldestPendingAgeMs` is a finite integer
`0..SERVER_CACHE_LIMITS.maxHealthPendingAgeMs` capped for telemetry;
`sinceMonotonicMs` never leaves process-local health. Unknown/malformed health
fails to `forced_bypass`, never to coherent. Only this contract module defines
the union; adapters/workers report inputs, and only the L02-implemented
`ServerCacheCoherenceController.report(...)` owns transitions and epoch mutation.
`stableCode` is null or 1–64 ASCII `[a-z0-9_]+` bytes; affected families are
deduplicated/sorted and non-empty unless represented by `"all"`.

L01 defines, and L02's coordinator solely implements, the exact process-local
coherence handoff:

```ts
type CacheCoherenceAffectedTags =
  | "all"
  | readonly [CacheTag, ...CacheTag[]];

type CacheCoherenceGlobalSource =
  | "memory_store"
  | "redis_store"
  | "outbox_worker";

declare const cacheCoherenceObservationToken: unique symbol;
type CacheCoherenceObservationToken = Readonly<{
  source: CacheCoherenceGlobalSource;
  sequence: number;
  readonly [cacheCoherenceObservationToken]: true;
}>;

type ServerCacheCoherenceSignal =
  | Readonly<{
      kind: "force";
      source: CacheCoherenceGlobalSource;
      observationToken: CacheCoherenceObservationToken;
      reason: ServerCacheForcedBypassReason;
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: string;
    }>
  | Readonly<{
      kind: "recover";
      source: CacheCoherenceGlobalSource;
      observationToken: CacheCoherenceObservationToken;
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: null;
    }>
  | Readonly<{
      kind: "invalidation_observed";
      source: "local_post_commit" | "pubsub";
      eventKey: string;
      affectedTags: CacheCoherenceAffectedTags;
      oldestPendingAgeMs: null | number;
      observedAtMonotonicMs: number;
      stableCode: null;
    }>
  | Readonly<{
      kind: "post_commit_failed";
      source: "post_commit";
      eventKey: string;
      affectedTags: CacheCoherenceAffectedTags;
      observedAtMonotonicMs: number;
      stableCode: string;
    }>
  | Readonly<{
      kind: "durable_invalidation_processed";
      source: "outbox_worker";
      eventKey: string;
      affectedTags: CacheCoherenceAffectedTags;
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
  beginObservation(source: CacheCoherenceGlobalSource):
    CacheCoherenceObservationToken;
  report(signal: ServerCacheCoherenceSignal): void;
  currentEpoch(family: CacheFamily): ProcessCacheCoherenceEpoch;
  snapshot(): ServerCacheCoherence;
  health(input: ServerCacheBackendHealthInput): ServerCacheHealth;
}
```

Every signal is recursively normalized before `report`: affected tags are
finite, non-empty, deduplicated and sorted; time/age/stable-code bounds are the
same exact health bounds above. The coordinator registers a policy before any
generation or value access. It derives affected families from registered policy
tag intersections; `"all"`, `site:all`, or an unrecognized empty mapping becomes
`affectedFamilies: "all"` fail-closed. `report(...)` is the sole epoch-mutating
method. Each async global probe obtains its opaque source-bound token before I/O;
the controller remembers the last applied sequence per source and ignores an
older/equal completion, so delayed recovery cannot clear a newer force. An
accepted force/recover transition advances affected family epochs once before
becoming visible, while a state-identical current-token transition is a no-op.
Every accepted `invalidation_observed` carries the normalized event key and
conservatively advances affected epochs, including at-least-once local/PubSub
duplicates. It never clears a fence or authorizes stale/private values.

Global health fences and failed-post-commit fences are separate. The controller
keeps a fixed `maxCoherenceEventKeys = 4_096` registry of exact event-key states
`pending | durably_processed`; `post_commit_failed` installs only that event's
affected-family fence. Only `durable_invalidation_processed` after the same
outbox row's generation bump and conditional processed-row commit records its
tombstone and clears that exact fence. Broad outbox/Redis recovery, Pub/Sub, a
different event, or pending-age proof clears none. A durable signal arriving
before a delayed failure leaves a tombstone, so that failure cannot re-fence.
The registry never evicts a live/tombstone identity during the process lifetime;
capacity or safe-integer overflow installs permanent all-family
`local_incoherence` until restart. Memory-mode bump failure likewise becomes
permanent process-local bypass because it has no durable outbox receipt.
`currentEpoch`, `snapshot`, and
`health` are read/composition methods and no runtime, adapter, invalidation
consumer, or helper may expose `advanceLocalCoherenceEpoch` or any second
`advance*Epoch` path. Epoch safe-integer overflow forces permanent bypass until
process restart. Global fences are tracked independently by source. An
`outbox_worker` recovery clears only its global lag fence; Redis recovery clears
only the Redis fence. Any global or pending-event fence wins, with
reason priority `redis_unavailable`, `outbox_lag`, then `local_incoherence`.
`health(input)` is the only composition function used by store `health()`:
degraded backend input without a matching normalized fence is itself treated as
forced bypass (`redis_unavailable` for Redis, otherwise `local_incoherence`), and
readiness is degraded whenever either input or coherence is degraded.

`CacheGenerationToken` is an opaque lowercase 32-hex-character cryptographic
token. Reading a missing site/family generation atomically initializes and
returns a fresh non-reusable token before any value lookup; bump replaces tokens
instead of incrementing/resetting an integer. Tests inject a deterministic token
source, while production uses cryptographic randomness.

`CacheGenerationDigest` is an opaque lowercase 64-hex SHA-256 digest and
`UnixTimeMs` is an integer `0..Number.MAX_SAFE_INTEGER`. The envelope decoder is
recursively reject-unknown, validates both branded forms, requires
`expiresAtUnixMs > writtenAtUnixMs`, and rejects a lifetime outside
`1..policy.ttlMs` for `fillKind:"positive"`; for `fillKind:"negative"` it
requires non-null `policy.negativeTtlMs` and rejects a lifetime outside
`1..policy.negativeTtlMs`. Both are necessarily within `1..maxPolicyTtlMs`.
`ServerCacheEnvelopeV1` contains only:

```ts
type ServerCacheEnvelopeV1 = {
  schema: "coderso.server-cache-envelope@v1";
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  fillKind: "positive" | "negative";
  writtenAtUnixMs: UnixTimeMs;
  expiresAtUnixMs: UnixTimeMs;
  generationDigest: CacheGenerationDigest;
  value: unknown;
};
```

Export and reuse these exact limits:

```ts
SERVER_CACHE_LIMITS = {
  maxKeyBytes: 512,
  maxCanonicalInputBytes: 65_536,
  maxDebugLabelBytes: 128,
  maxTags: 32,
  maxTagBytes: 128,
  maxEventKeyBytes: 128,
  maxConditionalWrites: 2,
  minSchemaVersion: 1,
  maxSchemaVersion: 2_147_483_647,
  minPolicyTtlMs: 1,
  maxPolicyTtlMs: 3_600_000,
  minPolicyValueBytes: 1,
  maxPolicyValueBytes: 16_777_216,
  maxExpirySweepEntriesPerOperation: 64,
  forcedBypassPendingAgeMs: 5_000,
  maxHealthPendingAgeMs: 86_400_000,
  maxHealthStableCodeBytes: 64,
  maxCoherenceEventKeys: 4_096,
  minInFlightKeys: 16,
  maxInFlightKeys: 10_000,
  defaultInFlightKeys: 1_024,
  minDistributedLeaseMs: 100,
  maxDistributedLeaseMs: 10_000,
  defaultDistributedLeaseMs: 2_000,
  minDistributedWaitMs: 0,
  maxDistributedWaitMs: 500,
  defaultDistributedWaitMs: 250,
  minDistributedPollMs: 10,
  maxDistributedPollMs: 50,
  ttlJitterMinRatio: 0.90,
  ttlJitterMaxRatio: 1.00,
};
```

Canonical input accepts only null, booleans, finite numbers, strings, arrays
and plain objects; object keys sort by UTF-8 bytes. Reject undefined, holes,
cycles, non-finite numbers, prototypes and over-limit input before hashing.
Tags accept only the finite literals above, deduplicate and sort. Event keys use
the internal `cache-event:<uuid>` form and must fit `maxEventKeyBytes`. The input
and generation projections use lowercase SHA-256; the bounded debug label is
metadata, never key identity. The final key is exactly
`coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<generationDigest>:<inputDigest>`.

`CacheConditionalWrite` contains one or two already-encoded, policy-validated
entries, the finite tag set, and its expected generation snapshot. Its exact
handoff is:

```ts
declare const validatedConditionalWriteEntry: unique symbol;

type CacheConditionalWriteEntry = Readonly<{
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  fillKind: "positive" | "negative";
  ttlMs: PositiveCacheTtlMs;
  policyPositiveTtlMs: PositiveCacheTtlMs;
  policyNegativeTtlMs: NegativeCacheTtlMs | null;
  policyMaxValueBytes: CacheValueByteLimit;
  readonly [validatedConditionalWriteEntry]: true;
}>;

type CacheConditionalWrite = {
  expectedGenerations: CacheGenerations;
  tags: readonly CacheTag[];
  entries:
    | readonly [CacheConditionalWriteEntry]
    | readonly [CacheConditionalWriteEntry, CacheConditionalWriteEntry];
};

type CacheConditionalWriteResult =
  | Readonly<{ kind: "written" }>
  | Readonly<{ kind: "generation_changed" }>
  | Readonly<{
      kind: "unknown";
      physicalOutcome: "unknown";
      stableCode: string;
    }>;

type ServerCacheStoreDescription = Readonly<{
  backend: ServerCacheBackend;
  maxEntryBytes: CacheValueByteLimit;
}>;

interface ServerCacheStore {
  describe(): ServerCacheStoreDescription;
  get(key: CacheKey): Promise<Uint8Array | null>;
  delete(key: CacheKey): Promise<void>;
  readGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  bumpGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  writeIfGenerationsMatch(input: CacheConditionalWrite):
    Promise<CacheConditionalWriteResult>;
  health(): Promise<ServerCacheHealth>;
  close(): Promise<void>;
}

createCacheConditionalWriteEntry(input: Readonly<{
  policy: CachePolicy<unknown>;
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  fillKind: "positive" | "negative";
  ttlMs: PositiveCacheTtlMs;
  storeMaxEntryBytes: CacheValueByteLimit;
}>): CacheConditionalWriteEntry;

type CacheInvalidationPlan = {
  eventKey: string;
  tags: readonly CacheTag[];
};
```

Only `ServerCache` calls `createCacheConditionalWriteEntry`; callers and stores
cannot assert the brand. The factory decodes against the supplied policy,
requires a positive entry's `ttlMs` and envelope lifetime to be
`<= policy.ttlMs`; a negative entry requires non-null `negativeTtlMs` and bounds
both by that negative ceiling. The sampled negative duration is normalized into
the common positive store-duration brand only after selecting the negative
ceiling; it never falls back to `policy.ttlMs`. The factory also requires encoded
bytes `<= policy.maxValueBytes`, and total key-plus-envelope bytes
`<= storeMaxEntryBytes`, then records both normalized policy TTL ceilings. Stores
strictly decode each envelope, require `entry.fillKind === envelope.fillKind`,
select `policyPositiveTtlMs` for a positive entry or require/select non-null
`policyNegativeTtlMs` for a negative entry, and recheck TTL, lifetime, bytes and
their own configured entry ceiling before doing any work. A brand cannot
substitute for those checks. Any mismatch rejects the whole bundle before a store
command or state mutation.

It compares every current generation and writes all entries or none. Memory does
so synchronously in-process; Redis parity is one bounded Lua script owned by
TASK-551-08-L01. This is an internal `ServerCacheStore` primitive; TASK-551-09
publishes coupled HTML value/dependency-manifest entries only through the typed
`ServerCache.getOrLoad(request)` surface. Conditional-write normalization rejects
unknown fields, duplicate keys, TTL outside the branded positive range or above
the ceiling selected from `policyPositiveTtlMs`/`policyNegativeTtlMs` by the
matching entry/envelope `fillKind`, an encoded envelope above
`policyMaxValueBytes`/store byte ceiling,
or a total
`UTF8(key).byteLength + encodedEnvelope.byteLength` above normalized
`SERVER_CACHE_MAX_ENTRY_BYTES` before invoking a backend.
`written` is the only publication authorization. `generation_changed` proves no
write. A Redis timeout/disconnect/malformed reply after dispatch returns
`unknown` because physical execution may have happened; it is never rewritten
to false/no-write, shared as published, or used to authorize a joiner. Any
physically installed bytes remain ordinary strictly decoded, generation-bound
candidates for a later independent cache read.
`CacheInvalidationPlan` recursively rejects every other field: it never carries
record IDs, slugs, paths, raw/digested identity tags, query input, or domain
payload. Domain old/new identity analysis only selects and deduplicates the
finite `CacheTag[]` before the plan crosses the cache/outbox boundary.

L01 also owns the exact typed loader-result seam. It is the only way a consumer
can request a primary plus optional companion publication; neither
`CacheConditionalWrite` nor either backend write primitive is a consumer API:

```ts
declare const validatedCacheLoadCompanion: unique symbol;

type CacheLoadCompanion = Readonly<{
  policy: CachePolicy<unknown>;
  input: unknown;
  context: CacheEligibilityContext;
  value: unknown;
  readonly [validatedCacheLoadCompanion]: true;
}>;

interface ServerCacheLoadContext {
  companion<T>(input: Readonly<{
    policy: CachePolicy<T>;
    input: unknown;
    context: CacheEligibilityContext;
    value: T;
  }>): CacheLoadCompanion;
}

type ServerCacheNoFillReason =
  | "response_not_cacheable"
  | "cache_excluded_dependency"
  | "authoritative_only";

type ServerCacheLoaderResult<TCached, TResult> =
  | Readonly<{
      kind: "no_fill";
      returnValue: TResult;
      reason: ServerCacheNoFillReason;
    }>
  | Readonly<{
      kind: "fill";
      fillKind: "positive";
      returnValue: TResult;
      cacheValue: TCached;
      companion: CacheLoadCompanion | null;
    }>
  | Readonly<{
      kind: "fill";
      fillKind: "negative";
      returnValue: TResult;
      cacheValue: TCached;
      companion: null;
    }>;

type ServerCacheLoadRequest<TCached, TResult> = Readonly<{
  policy: CachePolicy<TCached>;
  input: unknown;
  context: CacheEligibilityContext;
  fillFenceTags: readonly CacheTag[];
  resolveCached: (value: TCached) => Promise<TResult>;
  loader: (
    context: ServerCacheLoadContext,
  ) => Promise<ServerCacheLoaderResult<TCached, TResult>>;
}>;
```

`ServerCache.getOrLoad(request)` is the sole load owner. Before key construction,
value access, or loader execution it normalizes and captures one generation
snapshot for the union of `request.policy.tags` and `fillFenceTags`. The latter
is a bounded finite predeclared superset of every tag a companion may use; it
cannot be extended after the loader starts. Primary key identity still uses only
the primary policy tags. `context.companion(...)` is the only companion factory:
it canonicalizes input, runs the supplied policy decoder and eligibility proof,
requires all companion policy tags to be present in the captured fence, and
returns the opaque brand. Loader results recursively reject unknown fields and
form the strict discriminated union above. A `no_fill` branch accepts only its
finite reason and `returnValue`; `fillKind`, `cacheValue`, and `companion` are
forbidden, and `ServerCache` returns the authoritative value without encoding or
calling any store/distributed write primitive. A `fill` permits exactly zero or
one companion, so primary plus companion is exactly one or two entries.
`returnValue` is returned to the authoritative caller and is never encoded;
`cacheValue` and the optional companion are the only fill values.

A positive primary samples its shortening-only TTL from `policy.ttlMs`; an
optional positive companion independently samples and caps its TTL from its own
companion policy, so one atomic bundle may legally contain unequal TTLs. A negative
fill is valid only when `policy.negativeTtlMs` is non-null and the already-strict
eligibility proof authorizes that negative result; it
samples from and is capped by that `negativeTtlMs`, never the positive TTL.
Negative fills cannot carry a companion in v1. A negative result under a null or
ineligible negative policy, a `no_fill` result with fill-only fields, an unknown
reason/discriminator/field, or any other malformed union member raises the stable
loader-contract error and performs zero encode/store/distributed-fill calls.

A primary hit or distributed waiter value is strictly decoded and passed through
that caller's `resolveCached`. Local-flight identity is the canonical digest of the
final path key, current process coherence epoch and the branded
`shareScopeDigest`. The registry stores only a shared fill-attempt outcome; it
never stores `Promise<TResult>` or any caller's `returnValue`. The owner always
receives its own loader `returnValue`. A joiner may call its own `resolveCached`
only after the shared outcome proves a successfully conditional-written,
strictly decoded positive or eligible-negative primary fill. `no_fill`, loader
rejection, generation change, lost lease, unavailable/timeout, malformed outcome,
or any other non-publication makes every joiner execute its own authoritative
loader with fill disabled. Ineligible or unbranded requests bypass the registry
entirely. On a miss, `ServerCache` alone encodes both candidates, creates their
validated conditional entries from the pre-loader snapshot, and chooses the fill:
memory/non-distributed mode calls the store generation-only primitive, while a
Redis distributed owner calls only
`owner.putIfGenerationsAndLeaseOwned(...)`. Consumers—including TASK-551-09—call
neither primitive. Ineligible, saturated, closed, timeout, unavailable, changed-
generation, or lost-lease paths return each caller's own authoritative
`returnValue` without fill. A valid loader `no_fill` does the same intentionally;
caller-specific values and loader/domain errors retain per-caller identity and
never cross the registry.

`normalizeServerCacheConfig(env)` owns exactly:

```text
SERVER_CACHE_BACKEND=memory|redis      # default memory
SERVER_CACHE_NAMESPACE=<deployment>   # optional in memory; required in Redis
SERVER_CACHE_MEMORY_MAX_ENTRIES=<int> # default 200, 1..100000
SERVER_CACHE_MEMORY_MAX_BYTES=<int>   # default 67108864, 1048576..1073741824
SERVER_CACHE_MAX_ENTRY_BYTES=<int>    # default 2097152, 1024..min(total,16777216)
SERVER_CACHE_MAX_IN_FLIGHT_KEYS=<int> # default 1024, 16..10000
SERVER_CACHE_COMMAND_TIMEOUT_MS=<int> # default 50, 5..5000
REDIS_URL=redis://...|rediss://...    # required only in Redis mode
```

An omitted memory namespace normalizes deterministically to `local`. Every other
namespace is 1–128 ASCII `[A-Za-z0-9._-]` bytes and cannot begin/end with a
separator. Redis always requires an explicit non-`local` deployment namespace.
Credentials in `REDIS_URL` never appear in normalized diagnostics. Unknown
backend, malformed integer/URL/namespace or inconsistent byte limits fail
startup; malformed Redis configuration fails startup when Redis is explicitly
selected. Domain TTLs remain policies, not ENV. TASK-551-10-L02 is the sole
`.env.example` writer for both database and server-cache variables;
TASK-551-02-L02 supplies normalized database values/comments as a read-only
handoff rather than editing that shared file. TASK-551-10-L02's cache handoff
includes `SERVER_CACHE_MAX_IN_FLIGHT_KEYS`; no other leaf edits `.env.example`.

L01 also exports strict `CachePolicyCapacityRequirement` and
`assertMandatoryPolicyCapacity(catalog, store.describe(), namespace)`. For each
mandatory policy it derives the exact maximum canonical key bytes for that
namespace and requires
`maxKeyBytes + policy.maxValueBytes <= store.maxEntryBytes` with safe-integer
accounting. Duplicate family/schema descriptors, unknown fields, a missing
mandatory policy, or an impossible entry fails startup with redacted
`server_cache_policy_exceeds_store_entry_bytes`; it may not silently turn a
mandatory policy into permanent misses. TASK-551-08-L03 owns the closed v1
capacity catalog and validates it before HTTP listen; TASK-551-09 policy tests
prove exact agreement with those descriptors.

The optional distributed-load contract is exact and backend-neutral:

```ts
type DistributedCacheLeaseMs = number & { readonly __distributedLeaseMs: unique symbol };
type DistributedCacheWaitMs = number & { readonly __distributedWaitMs: unique symbol };
type DistributedCachePollMs = number & { readonly __distributedPollMs: unique symbol };

type DistributedCacheLoadAcquireInput = Readonly<{
  key: CacheKey;
  leaseMs: DistributedCacheLeaseMs;
  waitMs: DistributedCacheWaitMs;
  pollMinMs: DistributedCachePollMs;
  pollMaxMs: DistributedCachePollMs;
}>;

type DistributedCacheLoadWaitResult =
  | Readonly<{ kind: "value"; bytes: Uint8Array }>
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "unavailable"; stableCode: string }>;

type DistributedCacheOwnedWriteResult =
  | Readonly<{ kind: "written" }>
  | Readonly<{ kind: "generation_changed" }>
  | Readonly<{ kind: "lease_lost" }>
  | Readonly<{
      kind: "unavailable";
      physicalOutcome: "unknown";
      stableCode: string;
    }>;

type DistributedCacheLoadAcquireResult =
  | Readonly<{
      kind: "owner";
      renew: () => Promise<"renewed" | "lost" | "unknown">;
      putIfGenerationsAndLeaseOwned: (
        input: CacheConditionalWrite,
      ) => Promise<DistributedCacheOwnedWriteResult>;
      release: () => Promise<"released" | "lost" | "unknown">;
    }>
  | Readonly<{
      kind: "waiter";
      waitForValue: () => Promise<DistributedCacheLoadWaitResult>;
    }>
  | Readonly<{
      kind: "bypass";
      reason: "transport_unavailable" | "closed";
      stableCode: string;
    }>;

interface DistributedCacheLoadCoordinator {
  acquire(input: DistributedCacheLoadAcquireInput):
    Promise<DistributedCacheLoadAcquireResult>;
  close(): Promise<void>;
}
```

Constructors enforce lease `100..10_000 ms`, wait `0..500 ms`, poll
`10..50 ms`, and `pollMinMs <= pollMaxMs`; the defaults are respectively 2,000,
250 and implementation-jittered 10..50 ms. Runtime transport/timeout failures do
not escape: acquire returns `bypass`, waiter returns `unavailable`, and uncertain
renew/release returns `unknown`. The owner's
`putIfGenerationsAndLeaseOwned(...)` is the only distributed-owner fill surface:
one bounded Redis Lua operation must verify the exact random lease token and all
expected finite generation tokens before writing the one or two validated
entries. It returns `written`, `generation_changed`, `lease_lost`, or bounded
redacted `unavailable` with physical outcome `unknown`; every non-`written`
result returns the authoritative
loader value without fill. A generation-only store write must never substitute
for this ownership proof. `release()` runs after the write attempt as token-safe
best-effort cleanup; its result cannot retroactively authorize or invalidate a
completed fill. `close()` is concurrency-safe/idempotent and
later acquire returns the stable `closed` bypass. Returned bytes are cloned and
still pass the coordinator's policy/envelope/generation validation.

Eligibility is fail-closed. `CachePolicy.isEligible(context)` returns a branded
proof, never a bare boolean, only when the complete context explicitly proves
public, unauthenticated, non-preview, non-private/password, non-nonce, known
bounded query variant and either a successful positive disposition or an
explicitly proven public negative-cache disposition. It also carries
`mutableVisibilityGate: "not_required" | { state: "strictly_public";
versionToken: lowercase-64-hex }`; a mutable-visibility route is eligible only
with the second form produced from its current mandatory DB gate. Missing,
unknown, private/password or malformed context yields `null` before any registry,
value or lease access. The branded proof's digest covers the full canonical
context, including the complete visibility gate; it is not reusable for a
different auth/query/disposition/version context. Negative results are allowed
only when the proof says `negativeFill:"eligible"` and `negativeTtlMs` is non-null
and normalized to 5–15 seconds.
`stalePolicy` is always `"forbid"` in v1: no policy serves expired data or uses
stale-while-revalidate. Security/auth values are never eligible at all; the
`security-settings-generation` family stores generation metadata only.

## Implementation Pseudocode

```ts
const config = normalizeServerCacheConfig(processEnvRecord);
const generations = normalizeGenerations(await store.readGenerations(policy.tags));
const key = await buildServerCacheKey({
  namespace: config.namespace,
  family: policy.family,
  schemaVersion: policy.schemaVersion,
  generations,
  input: canonicalInput,
});
const expectedGenerationDigest = await digestGenerations(
  projectGenerations(generations, policy.tags),
);
const decoded = decodeServerCacheEnvelope(bytes, policy);
if (decoded.ok && decoded.value.generationDigest !== expectedGenerationDigest) {
  await bestEffortDelete(key);
  return cacheMiss("generation_digest_mismatch");
}
if (!decoded.ok || decoded.value.expiresAtUnixMs <= now()) return cacheMiss(decoded.reason);
return policy.decode(decoded.value.value);
```

Configuration errors are stable machine-readable `server_cache_config_*`
errors. Runtime envelope/key/eligibility faults do not escape as domain values;
they return a typed bypass reason and bounded redacted telemetry.

## Security Contract

- **Visibility/routes:** no route changes; all modules are server/pure only.
- **Auth/RBAC/CSRF/rate limits:** unchanged and never cached by this policy.
- **Validation:** strict unknown rejection and all limits above; no arbitrary
  cache command/key comes from an API body.
- **Secrets/privacy:** prohibit raw URLs, query strings, cookies, tokens, nonces,
  PII, bind values, secrets and decrypted settings in keys/debug metadata.
- **Anti-abuse:** no public write; hostile canonical inputs fail before large
  allocation or hashing.

## Testing Requirements

Pin canonical object-order, Unicode, numeric, schema-version, generation-order
and key vectors;
prove a legal path containing `|` cannot collide; reject every max+1 and unknown
field; test wrong family/version/expiry/digest; verify eligibility matrix and
that redacted config never exposes Redis credentials. Test the exact finite
family/tag unions, fresh initialization of missing generation tokens, no token
reuse, event-key and conditional-write max+1, memory namespace `local`, required
Redis namespace, negative TTL null/4,999/5,000/15,000/15,001, and
`writeIfGenerationsMatch` all-or-nothing behavior. Pin schema version, positive
TTL, policy-value bytes, conditional TTL/policy-TTL mismatch, per-policy envelope
lifetime, Unix time/duration and the exact 64-
entry sweep limit at zero/one/exact maximum/maximum+1 as applicable. Include
not-required/current-public/private/password/missing/malformed visibility-proof
eligibility cases and exact 5,000 ms forced-bypass, health-age/stable-code bounds.
Pin that eligibility returns `null` for every excluded/unknown context and a
branded lowercase-64-hex `shareScopeDigest` for eligible context; changing any
single query/disposition/visibility-version field while the result remains
eligible must change the digest, while changing access/render/nonce to an excluded
state yields `null` and reordered equivalent input must not change it. Prove no raw
identity, token, nonce or query text appears in the proof or diagnostics.
Pin every coherence signal source/transition, independent-fence recovery,
source-token stale force/recovery ordering, exact-event pending/processed
ordering (including durable-before-delayed-failure), registry capacity,
backend-health composition, distributed acquire/result/close union and every
distributed bound at min/max/max+1. Pin atomic owned-write `written`, generation-
changed, lease-lost and unavailable outcomes; prove generation-only write is not
called by a distributed owner, and post-attempt release cannot authorize a fill.
Pin the exact generic loader-result/request shapes and every discriminated branch:
positive primary and companion independently use only their own sampled policy
TTLs, including an unequal-TTL atomic pair; eligible negative fill
uses only its declared 5–15 second negative TTL and carries no companion; each
finite `no_fill` reason returns `returnValue` with zero encoding, conditional
write, store write, lease-owned write, or companion publication. Reject negative
fill when `negativeTtlMs` is null or its context is ineligible, plus reject a
negative companion, fill-only fields on `no_fill`, unknown reason/discriminator/
field, and missing branch fields; every invalid result performs zero fill work.
Also pin primary hit/waiter `resolveCached`, the exact shared-fill-attempt outcome
union, and proof that it contains neither `TResult` nor `returnValue`. Pin that
only a successfully written positive/eligible-negative fill lets joiners call
their own `resolveCached`; ineligible and missing-proof calls never enter the
registry, while `no_fill`, rejection, generation/lease/transport failures and
malformed outcomes make each joiner run its own authoritative no-fill loader.
Cover distinct auth contexts and distinct request-scoped token/nonce return values
concurrently and prove no cross-caller reuse. Also pin positive zero/one companion
acceptance, unequal primary/companion TTLs, second-companion and companion-
outside-captured-fence rejection, and proof that `returnValue` is never encoded.
Assert no public/domain consumer can import or invoke either conditional-write
primitive.
Pin in-flight config at 15/16/1,024/10,000/
10,001 and redacted env diagnostics. Pin the complete `ServerCacheStore`
interface against both adapters, conditional-write `unknown` physical outcome,
generation-digest mismatch eviction/miss, and startup capacity at exact/max+1
key-plus-envelope bytes for every mandatory v1 policy.

```bash
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/serverCache{Contracts,Codec,Keys,Eligibility,Config}.ts \
  tests/vitest/cache/server-cache-{contracts,codec-keys,eligibility}.test.ts
```

## Documentation Updates Required

Send exact env/envelope/key/eligibility documentation to TASK-551-10-L02; do
not edit shared docs or changelog here.
