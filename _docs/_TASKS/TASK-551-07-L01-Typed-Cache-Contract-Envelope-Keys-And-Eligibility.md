# TASK-551-07-L01: Typed Cache Contract, Envelope, Keys, and Eligibility
# FileName: TASK-551-07-L01-Typed-Cache-Contract-Envelope-Keys-And-Eligibility.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-07
**Priority:** High
**Category:** Cache / Contracts / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-551-06-L03; consumes TASK-551-01/02 contracts
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; closure only)

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
- new `core/services/cache/serverCacheCoherence.ts`;
- new `core/services/cache/serverCacheConditionalWrite.ts`;
- new `core/services/cache/serverCacheCodec.ts`;
- new `core/services/cache/serverCacheKeys.ts`;
- new `core/services/cache/serverCacheEligibility.ts`;
- new `core/services/cache/serverCacheConfig.ts`;
- new `tests/vitest/cache/server-cache-contracts.test.ts`;
- new `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`;
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
`ServerCacheLoadRequest`, `ServerCacheLoadTrigger`, `ServerCacheNoFillReason`, `ServerCacheStore`,
`ServerCacheStoreDescription`, `CacheConditionalWriteResult`,
`ServerCacheHealth`,
`ServerCacheCoherenceSignal`, `ServerCacheCoherenceController`,
`CacheInvalidationAttemptToken`, `CacheInvalidationAttemptRegistration`,
`CacheInvalidationPlan`. Later clauses mandate additional owned exports, which
are enumerated here rather than left implicit: the coherence/health types
`ProcessCacheCoherenceEpoch`, `ServerCacheForcedBypassReason`,
`ServerCacheCoherence`, `CacheCoherenceAffectedTags`,
`CacheCoherenceGlobalSource`, `CacheCoherenceObservationToken`,
`ServerCacheBackendHealthInput`; the envelope/time types `UnixTimeMs` and
`CacheGenerationDigest`; the normalized-value brands `NegativeCacheTtlMs`,
`CacheSchemaVersion`, `PositiveCacheTtlMs` and `CacheValueByteLimit` together
with the envelope record `ServerCacheEnvelopeV1`, which close the importable
surface consumed by the `CachePolicy<T>` fields, `CacheConditionalWriteEntry`,
`ServerCacheStoreDescription.maxEntryBytes` and the entry-factory input, every
one of them exported from `serverCacheContracts.ts`; the conditional-write
entry type `CacheConditionalWriteEntry` with its sole factory
`createCacheConditionalWriteEntry`, both exported from
`serverCacheContracts.ts` beside the `CacheConditionalWrite` handoff; the
limits constant `SERVER_CACHE_LIMITS`; and the distributed types
`DistributedCacheLeaseMs`, `DistributedCacheWaitMs`,
`DistributedCachePollMs`, `DistributedCacheLoadAcquireInput`,
`DistributedCacheLoadWaitResult`, `DistributedCacheLoadAcquireResult`,
`DistributedCacheOwnedWriteResult` together with the interface
`DistributedCacheLoadCoordinator`. Every type in that list is exported
unconditionally: a memory-only deployment constructs no coordinator instance,
yet the contract itself stays complete and compiled.
`normalizeServerCacheConfig` is exported from `serverCacheConfig.ts`;
`CachePolicyCapacityRequirement` and `assertMandatoryPolicyCapacity` are
exported beside it because both consume normalized configuration and both fail
startup. `SERVER_CACHE_MAX_ENTRY_BYTES` is not an extra uppercase constant: it
names the normalized per-entry byte ceiling produced by
`normalizeServerCacheConfig(env)` (the `SERVER_CACHE_MAX_ENTRY_BYTES=<int>`
variable above, default 2_097_152, accepted range
`1_024..min(total,16_777_216)`), cross-checked at startup against
`store.describe().maxEntryBytes`. `decode` is the only authority for a policy's
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

declare const cacheInvalidationAttemptToken: unique symbol;
type CacheInvalidationAttemptToken = Readonly<{
  eventKey: string;
  sequence: number;
  readonly [cacheInvalidationAttemptToken]: true;
}>;

type CacheInvalidationAttemptRegistration =
  | Readonly<{ kind: "registered"; token: CacheInvalidationAttemptToken }>
  | Readonly<{ kind: "saturated" }>;

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
      attemptToken: CacheInvalidationAttemptToken;
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
  beginInvalidationAttempt(input: Readonly<{
    eventKey: string;
    affectedTags: CacheCoherenceAffectedTags;
  }>): CacheInvalidationAttemptRegistration;
  settleInvalidationAttempt(token: CacheInvalidationAttemptToken): void;
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
retains at most `maxCoherenceUnresolvedEvents = 4_096` unresolved event records
and `maxCoherenceActiveAttempts = 4_096` active immediate-delivery tokens. Each
record contains normalized tags, active-token identities, failure-fence state
and durable-receipt state; it is never a historical deduplication/tombstone cache.
`beginInvalidationAttempt(...)` registers before the Redis callback starts.
`post_commit_failed` is accepted only for that still-active token while the event
has no durable processed receipt. The
matching `durable_invalidation_processed`, reported only after generation bump
and conditional processed-row commit, marks the event durably processed and
clears its exact fence. If it arrives before a delayed failure, that token's
later failure is ignored. `settleInvalidationAttempt(token)` is called in the
callback's outermost `finally`, then deletes the record when no active token or
unresolved failure remains. A receipt with no local record creates no tombstone;
if it predated registration, L08 replays the authoritative processed-row receipt
after a later failure and before token settlement. No broad recovery, Pub/Sub,
other event or age proof clears an exact failed-event fence.
Saturation starts no callback, stores no rejected key, and temporarily forces
all-family `local_incoherence`/degraded readiness until both counts fall to
`coherenceOverflowRecoveryThreshold = 3_072`. Redis saturation also installs
L08's durable global drain fence until its Redis+DB proof, independent of local
hysteresis. Memory replacement is synchronous and outside this registry; its
bump failure remains process-lifetime bypass because no durable receipt exists.
`currentEpoch`, `snapshot`, and
`health` are read/composition methods and no runtime, adapter, invalidation
consumer, or helper may expose `advanceLocalCoherenceEpoch` or any second
`advance*Epoch` path. Epoch or attempt-sequence safe-integer overflow forces permanent bypass until
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
  maxCoherenceUnresolvedEvents: 4_096,
  maxCoherenceActiveAttempts: 4_096,
  coherenceOverflowRecoveryThreshold: 3_072,
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
  trigger: ServerCacheLoadTrigger;
  companion<T>(input: Readonly<{
    policy: CachePolicy<T>;
    input: unknown;
    context: CacheEligibilityContext;
    value: T;
  }>): CacheLoadCompanion;
}

type ServerCacheLoadTrigger =
  | Readonly<{ kind: "store_absent" }>
  | Readonly<{
      kind: "store_value_rejected";
      reason: "expired" | "generation_mismatch" | "oversized" | "invalid";
    }>
  | Readonly<{
      kind: "fill_disabled";
      reason:
        | "ineligible"
        | "singleflight_saturated"
        | "coherence_bypass"
        | "generation_unavailable"
        | "transport_unavailable"
        | "distributed_wait_timeout"
        | "coordinator_closed"
        | "not_published_retry";
    }>;

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

Every loader invocation receives one closed `ServerCacheLoadTrigger`.
`store_absent` means the backend returned no bytes for the exact current key.
When bytes were returned but strict envelope/generation/expiry/size/policy decode
rejected them, best-effort eviction occurs and the trigger is
`store_value_rejected` with only the coarse finite reason—never raw bytes, key or
decoder detail. Redis TTL expiry that has already removed the key is necessarily
`store_absent`; an expired envelope still returned by a backend is `expired`.
Bypass, saturation and per-caller replay after any non-publication use
`fill_disabled`; a consumer-proposed `fill` on that trigger is normalized to the
caller's authoritative return with zero encode/write/publication. A policy may
choose `no_fill` after `store_value_rejected` (the public manifest does) while a
different non-security policy may rebuild it; only `store_absent` is the public
manifest's true-miss positive-fill authority.

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
versionToken: lowercase-64-hex }`. The non-authorizing
`public-html-manifest` family requires exactly `"not_required"`; its proof never
authorizes HTML/body access. Mutable `public-html` requires the second form,
produced only from its current bounded root+nested DB validator, while structurally
safe non-mutable HTML may use `"not_required"`. Missing,
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

The private event maps are observable only through bounded counters/health:

```ts
function beginInvalidationAttempt(input): CacheInvalidationAttemptRegistration {
  const saturated = unresolvedEvents.size >= 4_096 || activeAttempts.size >= 4_096;
  if (saturated) {
    capacityFence = "forced"; // no callback starts and no rejected key is kept
    return { kind: "saturated" };
  }
  const token = createOpaqueAttemptToken(input.eventKey);
  registerActiveToken(input, token);
  return { kind: "registered", token };
}
function acceptDurableProcessed(signal) {
  const event = unresolvedEvents.get(signal.eventKey);
  if (!event) return; // no historical tombstone
  Object.assign(event, { durablyProcessed: true, failed: false });
  clearExactEventFence(event);
  retireEventWhenSettled(event);
  recoverCapacityFenceAtHysteresis();
}
function acceptPostCommitFailure(signal) {
  const event = requireActiveMatchingToken(signal.attemptToken, signal.eventKey);
  if (!event || event.durablyProcessed) return; // stale/delayed result
  event.failed = true;
  installExactEventFence(event);
}
function settleInvalidationAttempt(token) {
  const event = eventForActiveToken(token);
  if (!event) return;
  retireActiveTokenOnlyIfSame(token);
  retireEventWhenSettled(event);
  recoverCapacityFenceAtHysteresis();
}
function recoverCapacityFenceAtHysteresis() {
  if (unresolvedEvents.size > 3_072 || activeAttempts.size > 3_072) return;
  capacityFence = "coherent"; // only this capacity fence; other fences win
}
```

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

Ownership scope of every pin below (see the Contract Repair Record at the end
of this file for the clause-by-clause mapping): each test executes offline in
this leaf's three test files and drives pure in-memory fixtures typed exactly
by these interfaces -- fake coherence controllers, fake stores, fake load
contexts and fake distributed coordinators. Where a pin names a mechanism whose
implementation another leaf owns (controller transitions and fences, adapter or
Redis parity, lease outcomes, singleflight joins, durable drain), this leaf pins
only the typed seam, its normalization bounds and specification-vector data;
the owning leaf re-pins the identical behavior against its implementation:
TASK-551-07-L02 for the memory adapter, coherence-controller transitions,
capacity/hysteresis lifecycle stress and the loader-trigger/singleflight matrix;
TASK-551-08-L01 for Redis store parity and failure semantics; TASK-551-08-L02
for the independently durable drain fence; TASK-551-08-L03 for lease and
multi-replica parity. No database connection, network service or spawned
process exists in this lane.

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
family-specific manifest-not-required, mutable-HTML-current-public, safe-
non-mutable, private/password/missing/malformed visibility-proof cases; prove a
manifest context/proof cannot authorize HTML. Pin exact 5,000 ms forced-bypass,
health-age/stable-code bounds.
Pin that eligibility returns `null` for every excluded/unknown context and a
branded lowercase-64-hex `shareScopeDigest` for eligible context; changing any
single query/disposition/visibility-version field while the result remains
eligible must change the digest, while changing access/render/nonce to an excluded
state yields `null` and reordered equivalent input must not change it. Prove no raw
identity, token, nonce or query text appears in the proof or diagnostics.
Pin every coherence signal source/transition, independent-fence recovery,
source-token stale force/recovery ordering, exact-event active/failure/processed
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
Pin the complete loader-trigger matrix: backend null is `store_absent`; returned
expired/wrong-generation/oversized/invalid bytes are evicted and become only
their coarse `store_value_rejected` reason; ineligible, saturated, coherence,
generation, transport, distributed-wait-timeout, closed and joiner-retry paths
use their exact `fill_disabled` reasons. A `fill`
returned under `fill_disabled` yields the caller's authoritative value with zero
encode/store/coordinator work. No trigger contains key bytes, envelope bytes or
decoder/driver diagnostics.
Run more than 100,000 sequential settled invalidations in both success and failure-then-durable orderings and assert unresolved-event/active-attempt memory
returns to zero (or the fixed baseline), no tombstone accumulates and no global
bypass appears. Hold exactly 4,096 concurrent unresolved records/attempts, prove the 4,097th starts no callback and forces temporary all-family bypass, then settle
to 3,073/3,072 and prove automatic recovery occurs only at 3,072 when no other
fence exists. Also prove Redis saturation installs L08's independently durable
drain fence, durable-before-delayed-failure cannot re-fence, a settled token can
never report, and safe-integer epoch/token overflow still fails closed.

```bash
node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/cache/server-cache-contracts.test.ts tests/vitest/cache/server-cache-codec-keys.test.ts tests/vitest/cache/server-cache-eligibility.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/services/cache/serverCacheContracts.ts \
  core/services/cache/serverCacheCodec.ts \
  core/services/cache/serverCacheKeys.ts \
  core/services/cache/serverCacheEligibility.ts \
  core/services/cache/serverCacheConfig.ts \
  tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
```

## Documentation Updates Required

Send exact env/envelope/key/eligibility documentation to TASK-551-10-L02; do
not edit shared docs or changelog here.

---

## Contract Repair Record (2026-08-27)

Append-only log of the verification-audit repairs applied to this leaf.
Sentences written earlier stay in place; where an entry re-scopes them, the
entry governs. Acceptance thresholds are unchanged: nothing left the program,
pins moved only to the leaf that owns the implementation under test. This
record documents deltas; it does not flip task status, touch board rows,
changelog entries or workflow files.

### R1 - HIGH - Testing Requirements split by owner

Exclusive Ownership above stays authoritative: this leaf ships five contract
modules plus three test files and creates neither a store, nor a memory/Redis
adapter, nor a coherence controller, lease coordinator, outbox worker or
runtime. Since `core/services/cache/` holds zero implementations in this
worktree, every behavioral pin resolves through one of two routes below.

Route A - pinned here, through fixtures owned inside
`server-cache-contracts.test.ts`, `server-cache-codec-keys.test.ts` and
`server-cache-eligibility.test.ts`. Fixtures are pure in-memory fakes typed by
these interfaces, so each suite stays deterministic, DB-free, socket-free and
independently runnable:

- contract union member/field sets plus normalization bounds for coherence
  signals, `ServerCacheCoherence` snapshots, `ServerCacheBackendHealthInput`
  and `ServerCacheHealth`;
- specification-vector tables fixing expected force/recover ordering,
  independent global versus exact-event fences, saturated registration shape,
  cap `4_096` and hysteresis `3_072` as data implementors must satisfy;
- contracts/unions, canonical key vectors, envelope decode bounds, eligibility
  digests and matrix, `SERVER_CACHE_LIMITS`, config normalization plus
  credential redaction, conditional-write entry factory normalization,
  invalidation-plan strictness and the startup capacity function.

Route B - delegated to the leaf owning the implementation, which already pins
the behavior verbatim in its own Testing Requirements (verified read-only in
this worktree at repair time):

| Pin group | Owner |
| --- | --- |
| coherence source/transition matrix, independent-fence recovery, stale force/recover token ordering, exact-event active/failure/durable ordering, registry capacity/hysteresis, ">100k settled invalidations" lifecycle, 4,096-to-3,072 saturation ramp | TASK-551-07-L02 |
| safe-integer epoch ceiling forcing permanent bypass until restart; `controller.health(...)` composition | TASK-551-07-L02 |
| full loader-trigger matrix, `getOrLoad` singleflight/joiner outcomes, unequal primary/companion TTLs, `no_fill` zero-work proofs | TASK-551-07-L02 |
| generation-digest-mismatch eviction plus coarse rejected trigger | TASK-551-07-L02 |
| memory-adapter conformance of the `ServerCacheStore` interface and atomic all-or-nothing `writeIfGenerationsMatch` over real storage | TASK-551-07-L02 |
| Redis store parity, `unknown` physical outcome after dispatch, redacted failure diagnostics, so "against both adapters" closes across L02 plus 08-L01 | TASK-551-08-L01 |
| independently durable drain fence installed by Redis saturation | TASK-551-08-L02 |
| distributed owner acquire/result/close unions, `written`/`generation_changed`/`lease_lost`/`unavailable`, generation-only write never called by an owner, post-attempt release unable to authorize a fill | TASK-551-08-L03 |

Should one of those owners drop its pin, the deferral protocol handles the gap
downstream; this leaf does not widen its allowlist to absorb adapter,
controller or lease behavior.

### R2 - MEDIUM - validation gate made env-source-free

Root `package.json` defines `"test:vitest"` beginning with
`set -a && { [ ! -f .env ] || . ./.env; } && set +a`, so the formerly
documented wrapper invocation loaded the repository `.env` file and broke the
program-wide rule that forbids sourcing environment state. The gate above now
states the direct offline-safe call that the executability stage had already
approved as its substitution:

```text
before:
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts

after:
node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/cache/server-cache-contracts.test.ts tests/vitest/cache/server-cache-codec-keys.test.ts tests/vitest/cache/server-cache-eligibility.test.ts
```

`vitest.config.ts` and `tests/setup/vitest.ts` read no environment values, so
the replacement runs the same three suites with identical assertions. The
`before:` lines are historical documentation inside a non-executable `text`
block; the executable gate in Testing Requirements is the `after:` form alone.
`wc -l` now lists explicit paths rather than brace expansion, mirroring the
gates-plan variant. `bun --cwd core lint:types`, `bun --cwd core lint` and
`git diff --check` remain untouched.

### R3 - LOW - Exact Owned Surface completed

- Extended the exported-symbol enumeration above with
  `ProcessCacheCoherenceEpoch`, `ServerCacheCoherence`,
  `ServerCacheForcedBypassReason`, `CacheCoherenceAffectedTags`,
  `CacheCoherenceGlobalSource`, `CacheCoherenceObservationToken`,
  `ServerCacheBackendHealthInput`, `UnixTimeMs`, `CacheGenerationDigest`,
  `SERVER_CACHE_LIMITS`, `CacheConditionalWriteEntry`,
  `createCacheConditionalWriteEntry`, `normalizeServerCacheConfig`,
  `CachePolicyCapacityRequirement`, `assertMandatoryPolicyCapacity`,
  `DistributedCacheLeaseMs`, `DistributedCacheWaitMs`,
  `DistributedCachePollMs`, `DistributedCacheLoadAcquireInput`,
  `DistributedCacheLoadWaitResult`, `DistributedCacheLoadAcquireResult`,
  `DistributedCacheOwnedWriteResult` and `DistributedCacheLoadCoordinator`.
- Defined `SERVER_CACHE_MAX_ENTRY_BYTES`: it denotes the normalized per-entry
  ceiling returned by `normalizeServerCacheConfig(env)` and introduces no
  separately declared constant.
- Removed the bare "optional" qualifier from the type list:
  `DistributedCacheOwnedWriteResult` and the remaining distributed types are
  exported unconditionally; only constructing a `DistributedCacheLoadCoordinator`
  instance depends on the deployment mode.

### R4 - LOW - owned-surface enumeration extended with the value brands and the envelope record

The verification audit found five contract-mandated symbols that appear only in
prose and fenced blocks while the enumeration above claims completeness twice:
`NegativeCacheTtlMs`, `CacheSchemaVersion`, `PositiveCacheTtlMs`,
`CacheValueByteLimit` and `ServerCacheEnvelopeV1`. All five are consumer
importable because they sit inside public signatures: the `CachePolicy<T>`
fields `schemaVersion`, `ttlMs`, `maxValueBytes` and `negativeTtlMs`; the
envelope field `schemaVersion`; the `CacheConditionalWriteEntry` TTL and byte
fields; `ServerCacheStoreDescription.maxEntryBytes`; and the
`createCacheConditionalWriteEntry` input. None of them appeared in the base
list, in the later-clause additions or in the R3 completion bullet, so their
owning module stayed implicit exactly where implicitness is forbidden.

The Exact Owned Surface enumeration now names them and assigns each one to
`serverCacheContracts.ts`, the same single module as `CachePolicy<T>` and
`CacheConditionalWriteEntry`; `ServerCacheEnvelopeV1` remains a contract type
there instead of becoming codec-local, matching the placement of every other
symbol these blocks define. Bounds, defaults, brand shapes and every testing
pin are unchanged, and nothing left the program: this entry completes an
enumeration only, with no status flip, no board row, no changelog entry and no
workflow file change.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-07-L01",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-07"
  },
  "allowlist": [
    "core/services/cache/serverCacheContracts.ts",
    "core/services/cache/serverCacheCoherence.ts",
    "core/services/cache/serverCacheConditionalWrite.ts",
    "core/services/cache/serverCacheCodec.ts",
    "core/services/cache/serverCacheKeys.ts",
    "core/services/cache/serverCacheEligibility.ts",
    "core/services/cache/serverCacheConfig.ts",
    "tests/vitest/cache/server-cache-contracts.test.ts",
    "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts",
    "tests/vitest/cache/server-cache-codec-keys.test.ts",
    "tests/vitest/cache/server-cache-eligibility.test.ts"
  ],
  "forbiddenPaths": [
    "core/services/cache/serverCache.ts",
    "core/services/cache/memoryServerCacheStore.ts",
    "core/services/cache/serverCacheTelemetry.ts",
    "core/services/cache/redisServerCacheClient.ts",
    "core/services/cache/redisServerCacheStore.ts",
    "core/services/cache/cacheInvalidationOutbox.ts",
    "core/services/cache/serverCacheRuntime.ts",
    "core/site/cache/siteCache.ts",
    "core/server/httpServer.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json"
  ],
  "dependencies": ["TASK-551-06-L03:single"],
  "commands": [
    {
      "id": "cache-contract-tests",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["wc", "-l", "core/services/cache/serverCacheContracts.ts", "core/services/cache/serverCacheCoherence.ts", "core/services/cache/serverCacheConditionalWrite.ts", "core/services/cache/serverCacheCodec.ts", "core/services/cache/serverCacheKeys.ts", "core/services/cache/serverCacheEligibility.ts", "core/services/cache/serverCacheConfig.ts", "tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-06-L03:single"],
      "commandIds": ["cache-contract-tests", "core-lint-types", "core-lint", "diff-check", "line-count"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (FAZA 0 dispositions)

The eight originally allowlisted files already exist in this worktree from the
unadmitted snapshot commit `62438e4e` (HEAD `8f73a0f8`). This entry records a
fresh three-lens FAZA-0 audit (conformity, red-root-cause, 1000-line split
plan) run against the live files, amended in round 2 after four independent
read-only auditors (two pre-implementation, two reconcile) reviewed it, and
amended again in round 3 (record at the end of this entry). Every
citation below was re-read against the live files for this revision. Source and
test line numbers refer to HEAD `8f73a0f8`; line numbers into this task file
refer to the file after the round-2 in-place body edits recorded at the end of
this entry. These corrections win over the body where they disagree, except for
the two body sections edited in place for machine authority (Exclusive
Ownership and the Workflow Dispatch Envelope), which agree with this entry by
construction.

Status and Changelog stay as-is. The Changelog field at line 11 reads verbatim
`**Changelog:** 1310 (pinned; closure only)`, and Status remains `⏳ To Do`;
changelog 1310 is written only by the TASK-551-10-L02 closure, matching the
sibling precedent of TASK-551-06-L02/06-L03.

R4 (lines 1129-1150) is honored for `ServerCacheEnvelopeV1` and the four value
brands (`NegativeCacheTtlMs`, `CacheSchemaVersion`, `PositiveCacheTtlMs`,
`CacheValueByteLimit`): all five stay contract types in
`serverCacheContracts.ts`, and C1 below carves `ServerCacheEnvelopeV1` out of
the moved conditional-write range for exactly that reason. R3/R4 also place
`CacheConditionalWriteEntry` in `serverCacheContracts.ts`, and R3 places
`createCacheConditionalWriteEntry` and the coherence names
`ServerCacheCoherence`, `ServerCacheForcedBypassReason`,
`CacheCoherenceAffectedTags`, `CacheCoherenceGlobalSource`,
`CacheCoherenceObservationToken` and `ServerCacheBackendHealthInput` there.
Those placements are superseded by C1(b) and C1(a): every name either clause
enumerates is owned by `serverCacheConditionalWrite.ts` or
`serverCacheCoherence.ts`. `ProcessCacheCoherenceEpoch` stays in
`serverCacheContracts.ts` (C1(c)).

Downstream mirrored corrections owed by this round, each landed by that file's
own single writer in the same round (this file edits none of them). The
decisions each mirror implements:

- TASK-551-07-L02: its envelope `forbiddenPaths` carries ALL 11 L01 paths --
  `core/services/cache/serverCacheContracts.ts`, `serverCacheCodec.ts`,
  `serverCacheKeys.ts`, `serverCacheEligibility.ts`, `serverCacheConfig.ts`,
  `serverCacheCoherence.ts`, `serverCacheConditionalWrite.ts` (all under
  `core/services/cache/`) and `tests/vitest/cache/server-cache-contracts.test.ts`,
  `server-cache-codec-keys.test.ts`, `server-cache-eligibility.test.ts`,
  `server-cache-coherence-conditional-write.test.ts` (all under
  `tests/vitest/cache/`). The argv of BOTH of its vitest commands uses the
  validator-legal env-free form `["bun", "--env-file=/dev/null",
  "node_modules/vitest/vitest.mjs", "run", <test paths...>]` (C7); the
  `l01-contract-vitest` argv, its `positiveDiscovery.paths` and the Testing
  Requirements bash block name
  `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`; every
  `createCacheConditionalWriteEntry` call uses the 7-field input of C2; every
  `buildServerCacheKey` call uses the real input shape `{ namespace, family,
  schemaVersion, generationDigest, inputDigest }` (`serverCacheKeys.ts:286-292`,
  C10); every relocated name is imported from its owning module (C1).
- TASK-551-07 parent: the Testing Requirements command (lines 197-204 of that
  file) names the four L01 test files, and its dated mirror bullet states that
  `ServerCacheEnvelopeV1` stays in `serverCacheContracts.ts` (R4, C1(b)), that
  only the three verbatim-moved suites (`"invalidation event keys"`, `"health
  normalization bounds"`, `"coherence signal normalization"`) keep test names
  and assertions byte-identical, that the conditional-write and
  invalidation-plan suites are strengthened (C2, C8), and that C3 changes one
  retained vector (`server-cache-contracts.test.ts:299`).
- TASK-551-10-L01: the test-file name reconciliation is closed. Lines
  1101-1107 (bash test list), 1364 (`cache-contract-vitest` argv) and 1366
  (`positiveDiscovery.paths`) of that file name
  `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`; its
  argv already uses the validator-legal env-free form.
- TASK-551-09-L04: its envelope `forbiddenPaths` carries the same ALL 11 L01
  paths listed for 07-L02 above.

### C1 — File Size gate split (HIGH)

**Finding.** `core/services/cache/serverCacheContracts.ts` is 1,160 physical
lines and `tests/vitest/cache/server-cache-contracts.test.ts` is 1,458
physical lines; both exceed the AGENTS.md > File Size and Modularity
1,000-line cap and must split before this leaf closes. Verified section
markers inside `serverCacheContracts.ts`: `// --- Coherence, health and
invalidation seams` at line 388, `// --- Bounded invalidation event keys` at
line 504, `// --- Envelope record and conditional-write handoff` at line 776,
`// --- Typed loader-result seam` at line 1031 — so the coherence block runs
388-775 and the envelope/conditional-write block runs 776-1030. The two brand
symbols `cacheInvalidationAttemptToken` (declared line 152) and
`cacheCoherenceObservationToken` (declared line 155) are used only inside the
coherence block, at lines 422, 432, 745 and 766 — confirmed by a whole-file
grep with no other production use.

**Disposition (binding).**

(a) **`core/services/cache/serverCacheCoherence.ts`** (new) takes the
"Coherence, health and invalidation seams" and "Bounded invalidation event
keys" sections (lines 388-775 inclusive) plus the two brand consts at lines
152-157. Exported set that moves: types `ServerCacheForcedBypassReason`,
`ServerCacheCoherence`, `ServerCacheHealth`, `CacheCoherenceAffectedTags`,
`CacheCoherenceGlobalSource`, `CacheInvalidationAttemptToken`,
`CacheInvalidationAttemptRegistration`, `CacheCoherenceObservationToken`,
`ServerCacheCoherenceSignal`, `ServerCacheBackendHealthInput`; interface
`ServerCacheCoherenceController`; const `CACHE_EVENT_KEY_PREFIX`; functions
`isServerCacheEventKey`, `normalizeServerCacheStableCode`,
`normalizeServerCacheOldestPendingAgeMs`, `normalizeServerCacheAffectedTags`,
`normalizeServerCacheAffectedFamilies`, `validateServerCacheCoherenceSignal`,
`assertBrandedObservationToken`, `assertBrandedAttemptToken`; brand consts
`cacheInvalidationAttemptToken`, `cacheCoherenceObservationToken`. The private
helpers of that range (`CACHE_EVENT_UUID_PATTERN`, `STABLE_CODE_PATTERN`,
`byUtf8Bytes`, `normalizeSequence`, `SIGNAL_FIELD_SETS`, `assertExactFields`,
`assertExactSignalFields`, `assertExactTokenFields`) move with it; none has a
use outside 388-775.

(b) **`core/services/cache/serverCacheConditionalWrite.ts`** (new) takes lines
789-1030 inclusive: the "Envelope record and conditional-write handoff" section
**minus** its marker comment (line 776) and the `ServerCacheEnvelopeV1` type
(lines 778-787). Decision: per R4, `ServerCacheEnvelopeV1` stays in
`serverCacheContracts.ts`, and `serverCacheCodec.ts` keeps its existing
`import type { ..., ServerCacheEnvelopeV1, ... } from "./serverCacheContracts"`
(codec.ts:17-24) unchanged. Moving the type would make the codec type-import
`serverCacheConditionalWrite.ts` while that module value-imports the codec, a
codec/conditional-write cycle this split avoids. The retained marker at line 776
is renamed comment-only to `// --- Envelope record`. Exported set that moves:
types `CacheConditionalWriteEntry`, `CacheConditionalWrite`,
`CacheConditionalWriteResult`, `ServerCacheStoreDescription`; interface
`ServerCacheStore`; function `createCacheConditionalWriteEntry`; type
`CacheInvalidationPlan`; function `validateCacheInvalidationPlan`. The private
brand `validatedConditionalWriteEntry` (declared line 146, used only at lines
803 and 987) and the private helpers `rejectConditionalEntry` (835),
`entryScalar` (846), `CreateConditionalWriteEntryInput` (859-867),
`ENTRY_KEY_SHAPE_PATTERN` (884-885) and `entryKeyForm` (887) move with it.
`ENTRY_NAMESPACE_PATTERN` and `ENTRY_NAMESPACE_EDGE_PATTERN` (882-883) are
replaced per C5 instead of moving.

(c) `serverCacheContracts.ts` keeps failures, unions, the remaining brands,
scalars, limits, normalizers, eligibility types, generations,
`ServerCacheEnvelopeV1`, the typed loader seam and the distributed load
contracts. `ProcessCacheCoherenceEpoch` (declared line 188) and its normalizer
(line 289) stay here: they sit in the retained "Normalized opaque
scalars"/"Normalizers" sections, not inside 388-775, even though the moved
`ServerCacheCoherenceController` interface references the type.

**Export-surface rule (amends the body).** The body clause "export them only
from `serverCacheContracts.ts`" is amended: every name enumerated in (a)/(b) is
exported only from its new owning module; `serverCacheContracts.ts` re-exports
none of them. 07-L02 and every later consumer import each relocated name from
its owning module, never through `serverCacheContracts.ts`.

(d) **Import map (binding).** After the split the runtime (value) import graph
is acyclic:

- `serverCacheConditionalWrite.ts` -> {`serverCacheContracts.ts`,
  `serverCacheCoherence.ts`, `serverCacheCodec.ts`, `serverCacheKeys.ts`};
- `serverCacheCoherence.ts` -> `serverCacheContracts.ts`;
- `serverCacheKeys.ts` -> `serverCacheContracts.ts`;
- `serverCacheEligibility.ts` -> {`serverCacheContracts.ts`,
  `serverCacheKeys.ts`};
- `serverCacheConfig.ts` -> {`serverCacheContracts.ts`, `serverCacheKeys.ts`}
  plus a type-only import from `serverCacheConditionalWrite.ts`;
- `serverCacheCodec.ts` -> type-only imports from `serverCacheContracts.ts`;
- `serverCacheContracts.ts` imports NOTHING at value level from any sibling.

Per module:

- `serverCacheContracts.ts`: line 42, `import { decodeServerCacheEnvelope }
  from "./serverCacheCodec";`, is DELETED (its only use, line 949, moves). It
  gains `import type { CacheConditionalWrite } from
  "./serverCacheConditionalWrite";` for the retained use at line 1132
  (`putIfGenerationsAndLeaseOwned`). The import is type-only and erased at
  emit; neither root `tsconfig.json` nor `core/tsconfig.json` sets
  `verbatimModuleSyntax` or `isolatedModules`.
- `serverCacheCoherence.ts` value-imports `SERVER_CACHE_LIMITS` (used at 518,
  529, 548, 563), `CACHE_FAMILIES` (582), `isCacheFamily` (587), `isCacheTag`
  (567), `SERVER_CACHE_CONTRACT_ERROR_CODES` and `ServerCacheContractError`, and
  type-imports `CacheFamily`, `CacheTag`, `ProcessCacheCoherenceEpoch` and
  `ServerCacheBackend`, all from `./serverCacheContracts`.
- `serverCacheConditionalWrite.ts` value-imports `decodeServerCacheEnvelope`
  from `./serverCacheCodec` (949); value-imports `isServerCacheEventKey` (1016)
  and type-imports `ServerCacheHealth` (831) from `./serverCacheCoherence`;
  value-imports `SERVER_CACHE_LIMITS` (937, 1020),
  `normalizePositiveCacheTtlMs` (943, 947), `normalizeNegativeCacheTtlMs`
  (944), `normalizeCacheValueByteLimit` (945-946), `isCacheTag` (1025),
  `SERVER_CACHE_CONTRACT_ERROR_CODES` and `ServerCacheContractError` from
  `./serverCacheContracts` and type-imports `CacheGenerations`, `CacheKey`,
  `CachePolicy`, `CacheTag`, `CacheValueByteLimit`, `NegativeCacheTtlMs`,
  `PositiveCacheTtlMs` and `ServerCacheBackend` from it; value-imports
  `SERVER_CACHE_NAMESPACE_PATTERN`, `SERVER_CACHE_NAMESPACE_MAX_BYTES` and
  `SERVER_CACHE_NAMESPACE_SEPARATORS` from `./serverCacheKeys` (C5).
- `serverCacheConfig.ts`: `type ServerCacheStoreDescription` leaves the
  `./serverCacheContracts` import block (line 43) and is re-imported with
  `import type { ServerCacheStoreDescription } from
  "./serverCacheConditionalWrite";`. C5 adds the namespace constants to its
  existing `./serverCacheKeys` import (line 45).
- `serverCacheKeys.ts`, `serverCacheEligibility.ts` and `serverCacheCodec.ts`:
  no import change beyond C6.

Local failure helpers: each new module declares
`const CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;` and
`function fail(code: string): never { throw new ServerCacheContractError(code); }`,
aliasing the exported table (contracts.ts:47) and reusing the exported class
(contracts.ts:66). Every thrown code string stays byte-identical to today's, and
`instanceof ServerCacheContractError` keeps holding because the class is the
same import; no new code, table or error class is introduced.

Comment-only docstring edits (binding, because the split makes them false):

- contracts.ts:4-6 — the header claims sole authority for coherence/health
  shapes, conditional-write handoffs and invalidation plans; name the two
  sibling owners instead.
- contracts.ts:11-14 — the "only runtime dependency is
  `decodeServerCacheEnvelope`" sentence and the `eligibility -> keys ->
  contracts -> codec` chain; state that the module has no sibling value import
  and one type-only back-reference to `serverCacheConditionalWrite.ts`.
- contracts.ts:16-23 — the auxiliary-surface list names the coherence
  signal/token validators and the invalidation-plan validator as exported
  here; remove them.
- contracts.ts:25-38 — the brand-visibility note says
  `cacheInvalidationAttemptToken`/`cacheCoherenceObservationToken` are
  exported here and that `validatedConditionalWriteEntry`'s only factory is
  "in this file"; point both at their new modules.
- contracts.ts:874-877, moving with the key-form docstring into
  `serverCacheConditionalWrite.ts` — it claims the module cannot import from
  `serverCacheKeys` without a cycle; after the split it does (C5). The inline
  comment at 891-893 ("Mirrors `normalizeNamespace` in `serverCacheConfig.ts`")
  is rewritten to name the imported key-boundary rule.
- contracts.ts:842, moving with `entryScalar`'s docstring into
  `serverCacheConditionalWrite.ts` — "funnels through the owning normalizer
  above"; the normalizers are no longer above in the same file, so the phrase
  becomes "the owning normalizer imported from `serverCacheContracts.ts`".
- codec.ts:10-14 — claims `serverCacheContracts.ts` re-imports
  `decodeServerCacheEnvelope`; the importer is now
  `serverCacheConditionalWrite.ts`. codec.ts:44-48 cites "the value cycle
  described in the header" as the reason for its local mirrors; restate the
  reason as leaf discipline that keeps the codec a sink of the value graph.
- codec.ts:76-84 (the "Branded-scalar re-normalization" banner: the owning
  normalizers "cannot be imported here without the value cycle") and
  codec.ts:407-413 (the sweep-limit banner: importing the contract value
  "would close the acyclic graph described in the header") — after the split
  no cycle would close, because `serverCacheContracts.ts` no longer
  value-imports the codec. Restate both reasons as leaf discipline: the codec
  stays a value-import leaf (type-only imports), so the mirrors STAY and remain
  pinned to their owners by the codec/keys suite. Mirrors are not replaced by
  value imports.
- keys.ts:12-15 — the `eligibility -> keys -> contracts -> codec` chain; state
  the graph above.
- keys.ts:118-123 — says `normalizeServerCacheAffectedTags` and
  `normalizeServerCacheAffectedFamilies` live "in `serverCacheContracts.ts`";
  point it at `serverCacheCoherence.ts`.
- `tests/vitest/cache/server-cache-contracts.test.ts:2-6` (retained file
  header) — drop the suites that moved: "coherence/health shapes and signal
  specification vectors", "conditional-write entry normalization" and
  "invalidation-plan strictness". The new test file carries its own header
  naming the five suites it holds.

(e) **Tests.** New `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`
(named for both suites it holds) receives three contiguous moved sections of
`server-cache-contracts.test.ts`, each defined by its `describe` BODY (opening
`describe(` line through its closing `});`) plus that section's OWN banner,
verified against the live file:

1. Banner lines 369-371 (`// Bounded event keys and health/coherence
   normalization bounds`) plus lines 373-765. The span holds
   `"invalidation event keys"` (373-383), `"health normalization bounds"`
   (385-441), the `// Coherence-signal specification vectors` banner (443-445)
   with its top-level vector fixtures `SignalVector`, `SIGNAL_FIELD_SETS` and
   `baseVectors` (447-570), and `"coherence signal normalization"` (571-765).
   The range stops at 765: the `// Configuration normalization and credential
   redaction` banner at 767-769 belongs to the retained `normalizeServerCacheConfig`
   suite and stays.
2. Banner lines 1037-1039 (`// Conditional-write handoff`) plus
   `"createCacheConditionalWriteEntry"` (1041-1235). The range stops at 1235:
   the `// Typed loader seam` banner at 1237-1239 stays with the retained suite.
3. `"invalidation plan strictness"` (1366-1387). Its banner at 1362-1364
   (`// Invalidation-plan and distributed-load strictness`) is shared with the
   retained `"distributed load contract"` suite (1389-1439), so it is not
   moved: the retained file keeps it, narrowed comment-only to
   `// Distributed-load strictness`, and the new file gives the moved suite its
   own banner `// Invalidation-plan strictness`.

Retained sections keep their banners unchanged (apart from the 1362-1364
narrowing above); each moved section carries its own banner into the new
file. The last two moved suites are strengthened by C2 and C8; the first three
`describe` blocks of section 1 keep their test names and assertions
byte-identical. Fixture disposition, verified against every use site:

- MOVE (only the new file uses them): `UUID_A` and `EVENT_KEY` (lines 101-102;
  used at 375-378, 536-634 and 1368), `fakeObservationToken` (127-132; used at
  509, 523 and 629) and `fakeAttemptToken` (134-136; used at 550 and 634).
- DUPLICATE (both files use them): `BRAND_CODES` (77; retained uses 284-364 and
  1418, moved uses 391-633, 1131 and 1168), `KEY_INPUT_DIGEST` (103-104; used by
  `sampleKey`), `sampleKey` (117-125; moved uses 1071-1208, retained uses 1396
  and 1412) and `fakePolicy` (138-152; moved uses 1067-1189, retained uses 1248
  and 1338).
- RETAIN only: `expectCode` (106-115; used only at 284-342) and
  `eligibleContext` (154-167; used only at 1244, 1336, 1445 and 1454), plus
  `CONFIG_CODES` and the three reason arrays (78-94).

Each duplicate is a small pure literal or builder; there is no shared fixture
module (AGENTS.md: no dumping-ground helpers). The new file's import block is
exactly:

```ts
import { describe, expect, it } from "vitest";
import {
  assertBrandedAttemptToken,
  cacheCoherenceObservationToken,
  cacheInvalidationAttemptToken,
  isServerCacheEventKey,
  normalizeServerCacheAffectedFamilies,
  normalizeServerCacheAffectedTags,
  normalizeServerCacheOldestPendingAgeMs,
  normalizeServerCacheStableCode,
  validateServerCacheCoherenceSignal,
  type CacheCoherenceObservationToken,
  type CacheInvalidationAttemptToken,
  type ServerCacheCoherence,
  type ServerCacheCoherenceSignal,
} from "../../../core/services/cache/serverCacheCoherence";
import {
  createCacheConditionalWriteEntry,
  validateCacheInvalidationPlan,
} from "../../../core/services/cache/serverCacheConditionalWrite";
import {
  normalizeCacheGenerationDigest,
  normalizeCacheSchemaVersion,
  normalizeCacheValueByteLimit,
  normalizeNegativeCacheTtlMs,
  normalizePositiveCacheTtlMs,
  normalizeUnixTimeMs,
  validatedCacheEligibilityProof,
  CACHE_TAGS,
  SERVER_CACHE_CONTRACT_ERROR_CODES,
  SERVER_CACHE_LIMITS,
  type CacheEligibilityFieldDigest,
  type CachePolicy,
  type CacheTag,
  type PositiveCacheTtlMs,
  type ProcessCacheCoherenceEpoch,
} from "../../../core/services/cache/serverCacheContracts";
import { decodeServerCacheEnvelope } from "../../../core/services/cache/serverCacheCodec";
import { buildServerCacheKey } from "../../../core/services/cache/serverCacheKeys";
```

`CACHE_TAGS` feeds C8's 13-tag accept vector and 33-tag length vector;
`decodeServerCacheEnvelope` feeds C2's direct decoder assertions. The retained
file keeps its own `CACHE_TAGS` import (line 42; used at 246).

The retained `server-cache-contracts.test.ts` drops these names from its
`serverCacheContracts` import block (lines 15-61): lines 16-19
(`assertBrandedAttemptToken`, `cacheCoherenceObservationToken`,
`cacheInvalidationAttemptToken`, `createCacheConditionalWriteEntry`), 23
(`isServerCacheEventKey`), 34-37 (`normalizeServerCacheAffectedFamilies`,
`normalizeServerCacheAffectedTags`, `normalizeServerCacheOldestPendingAgeMs`,
`normalizeServerCacheStableCode`), 39 (`validateServerCacheCoherenceSignal`),
40 (`validatedCacheEligibilityProof`, whose only use at 635 moves), 45
(`type CacheCoherenceObservationToken`), 49 (`type
CacheInvalidationAttemptToken`), 52 (`type CacheTag`, only use 426 moves), 56
(`type PositiveCacheTtlMs`, only use 1106 moves), 57 (`type
ProcessCacheCoherenceEpoch`, only use 694 moves) and 58-59 (`type
ServerCacheCoherence`, `type ServerCacheCoherenceSignal`). Line 38
(`normalizeUnixTimeMs`, used at 322-325) and line 33
(`normalizeProcessCacheCoherenceEpoch`, used at 340-343) stay. Line 60 (`type
UnixTimeMs`) is already unused and may be dropped. The retained file imports
nothing from the two new modules.

`tests/vitest/cache/server-cache-codec-keys.test.ts` (allowlisted) repoints
`isServerCacheEventKey` (line 22, used at 253) out of its
`serverCacheContracts` import block into a new import from
`../../../core/services/cache/serverCacheCoherence`; its other imports are
unchanged.

Gate note: `bun --cwd core lint` globs only
`{admin,server,services,ui,db,plugins,store}/**` and `bun --cwd core
lint:types` compiles `core/tsconfig.json`, so neither type-checks `tests/`. The
orchestrator therefore also runs root `tsc -p tsconfig.json --noEmit` (root
`tsconfig.json` includes `tests/**/*.ts`) as a slow gate over this leaf.
Because the root program may carry pre-existing errors outside this leaf, the
orchestrator captures a ROOT `tsc -p tsconfig.json --noEmit` baseline on the
unmodified tree BEFORE dispatching the leaf and, after it, judges only NEW
errors located in the 11 allowlisted files; a baseline error elsewhere neither
fails nor passes this gate. The four-file vitest run (C7) is a GROUP-level
gate: the orchestrator runs it once after writer 11 of C11 has landed, never
inside a single writer's mandate (per-writer fast gates are listed in C11(3)).

(f) **Ownership and dispatch.** Exclusive Ownership (lines 25-39) and the
Workflow Dispatch Envelope (lines 1152-1242) were edited in place in round 2
to carry all 11 paths; see the round-2 record below. The body envelope is the
single dispatch authority, and this entry carries no `json` fence. Implementers
never edit this task file: the orchestrator dispatches with the 11-path
allowlist. The root `tsc -p tsconfig.json --noEmit` baseline gate (C1(e) gate
note) is an ORCHESTRATOR gate outside the envelope: the envelope carries no
argv for it, and no writer mandate runs it.

(g) **Line budgets** (target at most 900 lines each, hard cap 1,000; estimates
from the verified ranges above):

| File | Now | After |
| --- | --- | --- |
| `core/services/cache/serverCacheContracts.ts` | 1,160 | ~525 |
| `core/services/cache/serverCacheCoherence.ts` | new | ~430 |
| `core/services/cache/serverCacheConditionalWrite.ts` | new | ~285 |
| `core/services/cache/serverCacheCodec.ts` | 438 | ~455 (C1(d) comments, C9) |
| `core/services/cache/serverCacheKeys.ts` | 467 | ~468 (C1(d) comments, C6, C10) |
| `core/services/cache/serverCacheEligibility.ts` | 280 | ~280 (C4) |
| `core/services/cache/serverCacheConfig.ts` | 488 | ~486 (C5) |
| `tests/vitest/cache/server-cache-contracts.test.ts` | 1,458 | ~805 |
| `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts` | new | ~830 (C2, C8) |
| `tests/vitest/cache/server-cache-codec-keys.test.ts` | 679 | ~750 (C3, repoint, C9) |
| `tests/vitest/cache/server-cache-eligibility.test.ts` | 413 | ~450 (C4) |

**Implementation instruction.** Land the split as one atomic change, where
"atomic" means one C11 writer group judged once, after all 11 writers have
landed (intermediate states are not judged; C11(2)). Extract
(a) and (b) verbatim apart from the import map, the local `fail`/`CODES`
two-liners and the comment-only docstring edits of (d); keep
`ServerCacheEnvelopeV1` in place; split the tests per (e). Before calling the
split done, the orchestrator runs the GROUP-level gates after writer 11: the
four-file vitest command (C7) and `wc -l` over all 11 files.

### C2 — `createCacheConditionalWriteEntry` input shape (MEDIUM) and vacuous rejection suite (HIGH)

**Finding.** The body's fenced handoff at lines 505-512 of this file declares
a 6-field input `{policy, key, encodedEnvelope, fillKind, ttlMs,
storeMaxEntryBytes}`. The real implementation defines a 7-field
`CreateConditionalWriteEntryInput` at `serverCacheContracts.ts:859-867` that
also requires `namespace: string`, with an inline comment: "The deployment
`namespace` is required because the key's namespace segment is the
shared-store isolation boundary and cannot be derived from the policy." It is
consumed at `entryKeyForm` (`serverCacheContracts.ts:887-905`), which rejects
the key when `namespace !== input.namespace` at line 895. The body handoff
omits this field entirely.

**Finding (round 2, HIGH).** The conditional-write rejection suite is vacuous
today. The `happy` fixture (`server-cache-contracts.test.ts:1116-1128`) and
both byte-ceiling inputs (1170-1177 and 1178-1185) omit `namespace`, so every
`fails(...)` call in the mismatch test (1114-1162) and the byte-ceiling test
(1164-1186) is rejected by the shape guard at `serverCacheContracts.ts:927-934`
(`typeof request.namespace !== "string"`) before it reaches the check it names.
The byte-ceiling bodies (`{ pad: ... }`) are not envelopes either, so even with
`namespace` they would stop at the decoder call (949-955) and its rejection at
line 956, never at the byte checks (975-976). Separately, under the 256-byte policy the store ceiling is
unreachable: the fixture key is 173 bytes and the largest envelope the policy
admits is 256 bytes, which totals 429 bytes and never exceeds the 600-byte store
ceiling.

**Disposition (binding).** The 7-field input `{policy, namespace, key,
encodedEnvelope, fillKind, ttlMs, storeMaxEntryBytes}` is canonical; the body's
fenced handoff at lines 505-512 is superseded by this shape. 07-L02 and every
later consumer construct the call with `namespace` included, passing the
deployment namespace normalized by
`serverCacheConfig.normalizeServerCacheConfig(env).namespace`. No source change.

**Test disposition (binding, round 2).** These changes land in the new
`server-cache-coherence-conditional-write.test.ts`, which receives the suite
under C1(e). They strengthen assertions against unchanged source, so test names
may change and every change is recorded in the implementer report:

1. `happy` gains `namespace: "fixturens"` (the namespace `sampleKey()` builds
   with, line 119).
2. Positive control, placed before the first `fails(...)`: the unmodified
   `happy` input is ACCEPTED. `createCacheConditionalWriteEntry(happy)` returns
   an entry with `key === happy.key`, `encodedEnvelope === happy.encodedEnvelope`,
   `fillKind === "positive"`, `ttlMs === 1_000`, `policyPositiveTtlMs === 60_000`,
   `policyNegativeTtlMs === null` and `policyMaxValueBytes === 4_096`, and the
   entry is frozen.
3. New key-form rejection vectors, each otherwise valid, with its envelope
   encoded for its own policy so that `entryKeyForm` is the only failing gate:
   foreign namespace `fails({ ...happy, namespace: "otherns" })`; foreign
   family, where the policy is `fakePolicy({ family: "posts" })` and the key
   is still `sampleKey()` (family `pages`); and foreign schema version, where
   the policy is `fakePolicy({ schemaVersion: normalizeCacheSchemaVersion(8) })`
   and the key is still `sampleKey()` (`sv7`).
4. Policy value-byte ceiling: both inputs carry `namespace: "fixturens"`.
   Replace the `{ pad }` body with a VALID envelope,
   `encodeEnvelope({ policy, fillKind: "positive", writtenAt: 0, lifetimeMs:
   1_000, value: { html: "x".repeat(16) } })`, under
   `fakePolicy({ maxValueBytes: normalizeCacheValueByteLimit(256) })` and
   `unboundedStore()`. With the suite's test encoder
   (`server-cache-contracts.test.ts:1052-1062`) the envelope is 251 + n bytes
   for `n` filler characters, so n = 16 yields 267 bytes. An in-test
   precondition asserts `encodedEnvelope.byteLength > 256` (computed, not
   hard-coded). The rejecting gate is the DECODER, not the factory's byte
   recheck: `decodeServerCacheEnvelope` returns `{ ok: false, reason:
   "oversized" }` at `serverCacheCodec.ts:316` because the bytes exceed
   `policy.maxValueBytes`, and the factory rejects at
   `serverCacheContracts.ts:956` (`if (!decoded.ok)`) before the recheck at
   975. A direct assertion pins it:
   `decodeServerCacheEnvelope(bytes, policy256, { enforceExpiry: false })`
   `toEqual({ ok: false, reason: "oversized" })`. Control: the identical bytes
   under `fakePolicy()` (4,096-byte ceiling, same family and schema version)
   are accepted.
5. Store key-plus-envelope ceiling: use `fakePolicy()` (4,096-byte policy
   ceiling), because the 256-byte policy cannot reach this gate. Build a VALID
   envelope as in step 4 with n = 256 (507 bytes) and set
   `storeMaxEntryBytes: normalizeCacheValueByteLimit(600)`: the 173-byte
   `sampleKey()` plus 507 bytes is 680 > 600, while 507 stays under the 4,096
   policy ceiling. In-test preconditions assert
   `Buffer.byteLength(key, "utf8") + encodedEnvelope.byteLength > 600` and
   `encodedEnvelope.byteLength <= 4_096`; the key length is computed, not
   hard-coded. The rejecting gate is `serverCacheContracts.ts:976`
   (`totalBytes > storeMaxEntryBytes`). Control: the identical input with
   `unboundedStore()` is accepted.
6. Rejecting gate per existing vector of the mismatch test (1114-1162), with
   `namespace` present so the shape guard no longer masks them:
   - fillKind mismatch `{ ...happy, fillKind: "negative" }` (1135): the
     positive envelope decodes, and the factory rejects at 958
     (`envelope.fillKind !== request.fillKind`);
   - negative fill under `negativeTtlMs: null` (1137-1147): the DECODER
     rejects at `serverCacheCodec.ts:378` (no negative ceiling selected), then
     956. Direct assertion: `decodeServerCacheEnvelope(bytes, policy, {
     enforceExpiry: false })` `toEqual({ ok: false, reason: "invalid" })`;
   - sampled `ttlMs: policy.ttlMs + 1` (1149): the envelope decodes and the
     factory rejects at 972 (`entryTtlMs > selectedCeiling`);
   - envelope lifetime `policy.ttlMs + 1` (1151-1159): the DECODER rejects at
     `serverCacheCodec.ts:380` (`lifetimeMs > ceilingMs`), then 956. Direct
     assertion: `{ ok: false, reason: "invalid" }` as above;
   - corrupted body `"{"` (1161): the DECODER rejects at
     `serverCacheCodec.ts:332` (`JSON.parse`), then 956.

Each rejection keeps asserting `BRAND_CODES.conditionalEntryInvalid`
(`server_cache_conditional_entry_invalid`, contracts.ts:51). The factory's
rechecks at 966 (the `-1` negative-ceiling fallback), 973-974 (lifetime
bounds) and 975 (policy value bytes) are DEFENSIVE: the decoder enforces the
same ceilings from the same policy object first (`serverCacheCodec.ts:316`,
370, 378 and 380), so with a consistent policy they are unreachable and
coverage will show them uncovered. That is expected; no test forges an
inconsistent policy to reach them. With the positive control in place, only
the fillKind-mismatch (958), sampled-`ttlMs + 1` (972) and store-ceiling (976)
vectors are claimed to have no earlier gate; every decoder-rejected vector is
pinned to its named decoder reason by the direct assertion.

### C3 — Two red vitest vectors are TEST bugs, source unchanged (HIGH-as-blocker, test-only fix)

**Finding 1.** `tests/vitest/cache/server-cache-contracts.test.ts:299` pins
`normalizeNegativeCacheTtlMs(undefined) === null` inside the vector table at
lines 297-305. This contradicts the source docstring at
`serverCacheContracts.ts:324-327` ("`null` is the only non-numeric value the
domain admits: a policy whose `negativeTtlMs` field is missing (`undefined`)
is malformed, not negative-free, and fails closed") and the parent contract at
`TASK-551-07-Typed-Local-First-Server-Cache.md:42` ("Every policy explicitly
declares `negativeTtlMs` (`null` or 5-15 seconds)"). Re-running the suite in
this worktree shows this vector throws `ServerCacheContractError:
server_cache_contract_brand_invalid` from `fail()` (`serverCacheContracts.ts
:77`) via `brandedInteger` (`serverCacheContracts.ts:250`): confirmed red.

**Finding 2.** `tests/vitest/cache/server-cache-codec-keys.test.ts:191`
computes `astral.repeat((SERVER_CACHE_LIMITS.maxCanonicalInputBytes - 2) / 4)`,
i.e. `(65_536 - 2) / 4 = 16_383.5`. `String.prototype.repeat` truncates a
non-integer count (`ToIntegerOrInfinity`), silently producing 16,383 repeats,
so the encoded byte length lands at 65,534, not the asserted 65,536.
Re-running the suite in this worktree fails with `AssertionError: expected
65534 to be 65536` at `tests/vitest/cache/server-cache-codec-keys.test.ts:193`:
confirmed red.

**Disposition (binding).**

1. The vector at `server-cache-contracts.test.ts:299` becomes
   `[undefined, BRAND_CODES.brandInvalid]`, moving it from the `toBeNull()`
   branch to the `expectCode(...)` branch of the same loop (lines 306-310).
   This suite stays in the retained file.
2. `server-cache-codec-keys.test.ts:191` is rewritten so the repeat count is
   an exact integer. The literal is pinned:
   `const astralAtLimit = astral.repeat(Math.floor((SERVER_CACHE_LIMITS.maxCanonicalInputBytes - 2) / 4)) + "kk";`
   That is 16,383 astral characters (4 bytes each, 65,532 bytes), plus the 2
   ASCII bytes of `"kk"`, plus the 2 JSON quote bytes. The encoded length lands
   exactly on `SERVER_CACHE_LIMITS.maxCanonicalInputBytes` (65,536). The
   existing `+1 astral` over-limit rejection assertion at line 194 is
   unchanged.

Downstream check recorded: TASK-551-09-L01/09-L03 policy tables use explicit
`null` or millisecond values for `negativeTtlMs` only, never `undefined`; this
correction does not change their contract.

**Implementation instruction.** Both fixes are test-only: the C3 fixes need no
source change. C1, C5, C6, C9 and the C10 input-digest brand change source
separately. The four-file vitest command (C7), judged once after the whole
writer group has landed (C11), shows 0 failures. At HEAD `8f73a0f8`, exactly
these 2 tests fail.

### C4 — Fail-closed exact-field guard (HIGH)

**Finding.** `serverCacheEligibility.ts:111-115` defines `hasExactFields`
using `fields.every((field) => field in record)`. The `in` operator walks the
prototype chain. `serverCacheContracts.ts:649-660` defines the sibling
`assertExactFields` using `Object.hasOwn(target, field)`, with an explicit
docstring: "Exact-field membership uses `Object.hasOwn`, never `in`: a single
`Object.prototype` pollution would otherwise satisfy a missing own field and
turn an exact-field gate into a pass-through that accepts smuggled payload."
The eligibility module's gate does not follow its sibling's documented rule.
`hasExactFields` guards the context (line 142, against `CONTEXT_FIELD_ORDER`
at lines 69-76: `access`, `renderMode`, `sensitiveDependency`, `queryVariant`,
`responseDisposition`, `mutableVisibilityGate`), the `known_bounded`
query variant (line 153, `["kind", "digest"]`), the `unknown` query variant
(157) and the visibility gate (171).

**Disposition (binding).** `hasExactFields` in `serverCacheEligibility.ts` is
rewritten to use `Object.hasOwn(record, field)` in place of `field in record`,
matching `assertExactFields`:

```ts
function hasExactFields(record: Record<string, unknown>, fields: readonly string[]): boolean {
  const keys = Object.keys(record);
  if (keys.length !== fields.length) return false;
  return fields.every((field) => Object.hasOwn(record, field));
}
```

**Regression vectors (binding, pinned in round 2).** Add one new `it()` titled
exactly `"rejects inherited-only context and query-variant fields"` directly
after the test at `server-cache-eligibility.test.ts:77-111` ("returns null for
missing, malformed or unknown-field contexts"). The fixtures use local
prototype objects (`Object.create`), never global-prototype pollution, and
reuse the suite's `QUERY_DIGEST` (lines 26-29) and `context()` (lines 33-43):

```ts
// Positive control: the same values as own fields are eligible.
expect(deriveCacheEligibilityProof({ family: "pages", context: context() })).not.toBeNull();

// 6 own keys (= CONTEXT_FIELD_ORDER.length); the required
// mutableVisibilityGate is only inherited, and "smuggled" fills the count.
const inheritedGate = Object.assign(Object.create({ mutableVisibilityGate: "not_required" }), {
  access: "public_anonymous",
  renderMode: "public",
  sensitiveDependency: "absent",
  queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
  responseDisposition: "positive_candidate",
  smuggled: "x",
}) as CacheEligibilityContext;
expect(deriveCacheEligibilityProof({ family: "pages", context: inheritedGate })).toBeNull();

// Nested: 2 own keys (= ["kind", "digest"].length); digest only inherited.
const inheritedDigest = Object.assign(Object.create({ digest: QUERY_DIGEST }), {
  kind: "known_bounded",
  smuggled: 1,
});
expect(
  deriveCacheEligibilityProof({
    family: "pages",
    context: { ...context(), queryVariant: inheritedDigest } as CacheEligibilityContext,
  })
).toBeNull();
```

Under the pre-fix `in` check both vectors pass the key-count and membership
checks, and the reads of `record.mutableVisibilityGate` and
`queryRecord.digest` return the inherited valid values, so the old code mints
a proof. **Evidence required:** the implementer report shows this `it()` RED
against the unmodified `hasExactFields` (run the eligibility file once before
the source edit) and GREEN after it.

### C5 — DRY namespace rule (MEDIUM)

**Finding.** `serverCacheConfig.ts:157-158` declares its own
`NAMESPACE_PATTERN` and `SEPARATOR_CHARS`, and `serverCacheConfig.ts:269`
restates the 128-byte maximum as a literal (`raw.length > 128`).
`serverCacheKeys.ts:259-267` already exports `SERVER_CACHE_NAMESPACE_PATTERN`,
`SERVER_CACHE_NAMESPACE_SEPARATORS` and `SERVER_CACHE_NAMESPACE_MAX_BYTES`
specifically for this reuse, with a docstring stating: "The constants are
exported so `serverCacheConfig.normalizeServerCacheConfig` consumes the same
rule instead of restating it -- one spelling, no drift." The conditional-write
key-form gate mirrors the same rule a third time
(`serverCacheContracts.ts:882-883` patterns, the `128` literal at 897 and the
comment at 891-893).

**Disposition (binding).**

- `serverCacheConfig.ts` imports `SERVER_CACHE_NAMESPACE_PATTERN`,
  `SERVER_CACHE_NAMESPACE_SEPARATORS` and `SERVER_CACHE_NAMESPACE_MAX_BYTES`
  from `./serverCacheKeys` (extending the existing import at line 45). It
  deletes ONLY lines 157-158 (`NAMESPACE_PATTERN`, `SEPARATOR_CHARS`),
  rewrites line 268 (`!NAMESPACE_PATTERN.test(raw)`) to
  `!SERVER_CACHE_NAMESPACE_PATTERN.test(raw)` and replaces the literal at line
  269 with `SERVER_CACHE_NAMESPACE_MAX_BYTES`.
  `DEFAULT_MEMORY_NAMESPACE` (line 159) STAYS: it is used at lines 232, 265 and
  275 and carries the parent's memory-mode default `local`
  (`TASK-551-07-Typed-Local-First-Server-Cache.md:55`), which `serverCacheKeys`
  does not own.
- The first/last-character checks at lines 270-271 use the cast form that
  `serverCacheKeys.ts:275-280` uses for `.includes` on the readonly tuple:
  `SERVER_CACHE_NAMESPACE_SEPARATORS.includes(raw.charAt(0) as (typeof
  SERVER_CACHE_NAMESPACE_SEPARATORS)[number])`, and likewise for the last
  character.
- `serverCacheConditionalWrite.ts` (C1(b)) imports the same three constants
  from `./serverCacheKeys` instead of carrying `ENTRY_NAMESPACE_PATTERN` and
  `ENTRY_NAMESPACE_EDGE_PATTERN` (contracts.ts:882-883) and the `128` literal
  (897). The edge check uses the same separator cast form. This creates no
  cycle: after the split `serverCacheKeys.ts` value-imports only
  `serverCacheContracts.ts`. `ENTRY_KEY_SHAPE_PATTERN` (884-885) stays as the
  key-shape regex. The docstring at 874-877 and the comment at 891-893 are
  updated comment-only (C1(d)).

Values and first/last-character semantics are identical, so behavior is
unchanged; the existing config and conditional-write suites pin the same
bounds.

### C6 — Duplicate generation-entry type (LOW, binding)

`serverCacheKeys.ts:374-377` exports `ServerCacheGenerationEntry`
(`Readonly<{ tag: CacheTag; token: CacheGenerationToken }>`), structurally
identical to `CacheGenerationEntry` exported from
`serverCacheContracts.ts:383`. Binding: delete the local declaration and add
`type CacheGenerationEntry` to the existing `./serverCacheContracts` import
block (`serverCacheKeys.ts:19-31`). Replace its in-file uses at lines 388, 389,
412, 414, 418, 420 and 434. A whole-repo grep over `core/`, `tests/` and
`_docs/_TASKS/` finds no consumer of `ServerCacheGenerationEntry` outside
`serverCacheKeys.ts` and this task file.

### C7 — Validation law

The envelope's `cache-contract-tests` argv (body, line 1198) is the
validator-legal env-free form, run from the repository root:

```text
["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run",
 "tests/vitest/cache/server-cache-contracts.test.ts",
 "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts",
 "tests/vitest/cache/server-cache-codec-keys.test.ts",
 "tests/vitest/cache/server-cache-eligibility.test.ts"]
```

It carries no `NAME=value` token because the dispatch validator's
`requireLiteralArgv` (`_docs/_workflows/lib/task-551-dispatch-contract.mjs:473-490`)
rejects any argv token matching `^[A-Za-z_][A-Za-z0-9_]*=`; this is the same
form TASK-551-10-L01 uses at line 1364 of that file. `environmentProfile:
"none"` and `--env-file=/dev/null` keep it from reading `.env`. The gate
receipt records this envelope argv form verbatim. The operator-equivalent
shell line for a manual run, which additionally pins a non-routable
`DATABASE_URL`, is:

```bash
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/cache/server-cache-contracts.test.ts tests/vitest/cache/server-cache-coherence-conditional-write.test.ts tests/vitest/cache/server-cache-codec-keys.test.ts tests/vitest/cache/server-cache-eligibility.test.ts
```

This supersedes the three-file vitest line and the eight-path `wc -l` list in
the body's Testing Requirements block (lines 1005-1018), the "three test
files" wording at line 920, R1's "five contract modules plus three test files"
at lines 1038-1039, R2's `after:` form (line 1096), and Route A's three-file
list (lines 1044-1046): Route A's fixtures now live in the four test files
named above, and this leaf ships seven contract modules plus four test files.
`wc -l` covers all 11 paths of the envelope's `line-count` command. `bun --cwd
core lint:types`, `bun --cwd core lint` and root `tsc -p tsconfig.json
--noEmit` (judged against the pre-leaf root baseline, C1(e) gate note) remain
orchestrator-run slow gates between phases, never inside a per-file agent
mandate. The root `tsc` baseline gate is an ORCHESTRATOR gate outside the
envelope: the envelope carries no argv for it.

### C8 — Invalidation-plan strictness never calls the validator (MEDIUM)

**Finding.** The test `"invalidation plan strictness"`
(`server-cache-contracts.test.ts:1366-1387`) builds `legalPlan` and widened
copies and asserts only `Object.keys(...)` lengths plus
`isServerCacheEventKey`. It never calls `validateCacheInvalidationPlan`
(`serverCacheContracts.ts:1002-1029`), and a repository-wide grep finds zero
test callers. The Route A pin "invalidation-plan strictness" (line 1059) is
therefore unproven.

**Disposition (binding).** The moved suite in
`server-cache-coherence-conditional-write.test.ts` calls
`validateCacheInvalidationPlan` directly, casting through `as never` like the
conditional-write `fails` helper:

- Accept: `{ eventKey: EVENT_KEY, tags: ["site:pages"] }` is returned by
  identity (`toBe(plan)`), and a plan carrying all 13 distinct `CACHE_TAGS` is
  accepted.
- Reject with `SERVER_CACHE_CONTRACT_ERROR_CODES.planInvalid`
  (`server_cache_invalidation_plan_invalid`, contracts.ts:59), one assertion
  per vector:
  - each extra string field `recordId`, `slug`, `path`, `query`,
    `domainPayload` and `identityTag` added to the legal plan (guard at
    1008-1015);
  - a symbol-keyed extra `{ ...legal, [Symbol("x")]: 1 }` (1012);
  - a non-event `eventKey`: `UUID_A` (no prefix), `"record:17"`,
    `"cache-event:" + UUID_A.toUpperCase()` and the number `42` (1016-1018);
  - empty `tags: []`;
  - `SERVER_CACHE_LIMITS.maxTags + 1` (= 33, contracts `maxTags: 32`) tags.
    Only 13 distinct tags exist, so this vector necessarily repeats a tag; the
    length guard at 1020 fires before the duplicate check at 1025;
  - a duplicate tag `["site:pages", "site:pages"]`;
  - an unknown or variable-suffixed tag (`"site:page-17"`, `"site:pages:17"`);
  - a non-array `tags: "site:pages"` (1019-1022);
  - array input `[EVENT_KEY, ["site:pages"]]`, `null`, `undefined` and a
    string (1004-1006);
  - an inherited-only field
    `Object.assign(Object.create({ tags: ["site:pages"] }), { eventKey:
    EVENT_KEY, smuggled: 1 })`. It has two own keys, but `tags` fails
    `Object.hasOwn` (1011).

The test name may change; record the change in the implementer report.

### C9 — Fail-closed read side for a malformed policy scalar (MEDIUM)

**Finding.** The write side fails closed on every malformed policy scalar it
consumes. `createCacheConditionalWriteEntry` re-normalizes `policy.ttlMs`,
`policy.negativeTtlMs` and `policy.maxValueBytes` through the owning
normalizers (`serverCacheContracts.ts:943-945`) and rejects on any failure.
`normalizeNegativeCacheTtlMs` (`serverCacheContracts.ts:329-332`, docstring
323-328) admits only `null` or an integer in 5_000..15_000 and throws
`server_cache_contract_brand_invalid` for anything else, including
`undefined` ("a policy whose `negativeTtlMs` field is missing (`undefined`)
is malformed, not negative-free, and fails closed").

The codec's read side does not. Its mirror `normalizeNegativeTtlCeilingMs`
(`serverCacheCodec.ts:101-112`) returns `null` both for a declared `null` and
for every invalid value (`undefined`, `NaN`, out-of-range, non-number), and
`normalizePolicyCeilings` (`serverCacheCodec.ts:137-143`) returns that `null`
as "negative-free". `selectLifetimeCeilingMs` (codec.ts:150-155) consults
only the ceiling of the fill kind being decoded, so:

- a policy with `negativeTtlMs` missing, `undefined`, `4_999`, `NaN` or
  `"10000"` still decodes (codec.ts:310-313, 377-378) and encodes
  (codec.ts:226-229, 260) positive envelopes;
- a policy with `ttlMs: NaN` still decodes and encodes negative envelopes.

Only `maxValueBytes` is fully fail-closed today (codec.ts:227 and 311). The
docstring at codec.ts:127-130 ("`null` members mean the policy itself is
malformed") is false for `negativeTtlMs`, where a `null` member is the legal
"no negative fill" declaration. The mirror comments at codec.ts:60 and :81
describe the window without saying that a missing field is malformed.

**Disposition (binding, round 3: full fail-closed).** `normalizePolicyCeilings`
returns `null` whenever ANY consumed policy scalar is outside the window its
owning normalizer admits, so encode and decode fail closed on exactly the
policies the write factory rejects:

| Scalar | Legal (owner) | Malformed (codec returns `null` for the whole policy) |
| --- | --- | --- |
| `ttlMs` | safe integer 1..3_600_000 (`normalizePositiveCacheTtlMs`, contracts.ts:272-276; `SERVER_CACHE_LIMITS.minPolicyTtlMs`/`maxPolicyTtlMs`, 218-219) | anything else, for EITHER fill kind |
| `negativeTtlMs` | `null`, or a safe integer 5_000..15_000 (`normalizeNegativeCacheTtlMs`, contracts.ts:329-332) | `undefined` (missing or explicit), `NaN`, out-of-range, any non-number |
| `maxValueBytes` | safe integer 1..16_777_216 (`normalizeCacheValueByteLimit`; `maxPolicyValueBytes`, contracts.ts:221) | anything else (already fail-closed today) |

The three private mirror helpers keep their current bodies
(`serverCacheCodec.ts:88-99`, `101-112`, `115-125`).
`normalizeNegativeTtlCeilingMs` may keep returning `null` for every
non-number, so its `null` stays ambiguous between "declared `null`" and
"declared but invalid". `normalizePolicyCeilings` resolves the ambiguity with
one exact predicate on the RAW field: the negative scalar is malformed if and
only if `policy.negativeTtlMs !== null && normalizeNegativeTtlCeilingMs(policy.negativeTtlMs) === null`.
A missing own field reads as `undefined`, which is `!== null`, so it is
malformed. `in`/`hasOwn` is not consulted, because a declared-`undefined`
field and a missing field are the same malformed class.

```ts
/** `null` when the positive ceiling is outside its normalized brand range. */
function normalizePositiveTtlCeilingMs(value: unknown): number | null {
  // body unchanged (codec.ts:88-99)
}

/**
 * `null` when the value is `null` OR outside the normalized negative brand
 * range; the caller (`normalizePolicyCeilings`) tells the two apart.
 */
function normalizeNegativeTtlCeilingMs(value: unknown): number | null {
  // body unchanged (codec.ts:101-112)
}

/**
 * Re-normalized policy ceilings. Every member is in its owning brand range;
 * `negativeTtlMs === null` means the policy explicitly declared no negative
 * fill. A malformed policy never produces this record (see below).
 */
type NormalizedPolicyCeilings = Readonly<{
  positiveTtlMs: number;
  negativeTtlMs: number | null;
  maxValueBytes: number;
}>;

/**
 * Re-normalizes every consumed policy scalar against its owning window
 * (`normalizePositiveCacheTtlMs`, `normalizeNegativeCacheTtlMs`,
 * `normalizeCacheValueByteLimit`). `null` means the policy ITSELF is
 * malformed, and every consumer fails closed on it; a single invalid scalar
 * makes the whole policy malformed, whichever fill kind is being processed.
 */
function normalizePolicyCeilings(policy: CachePolicy<unknown>): NormalizedPolicyCeilings | null {
  const positiveTtlMs = normalizePositiveTtlCeilingMs(policy.ttlMs);
  const maxValueBytes = normalizeValueByteLimitBytes(policy.maxValueBytes);
  const negativeTtlMs = normalizeNegativeTtlCeilingMs(policy.negativeTtlMs);
  // Only an explicit `null` is negative-free. Anything else that normalizes to
  // `null` is declared but invalid (missing/`undefined`, NaN, out of range or
  // a non-number) and is malformed, mirroring `normalizeNegativeCacheTtlMs`
  // (serverCacheContracts.ts:329-332).
  const negativeMalformed = policy.negativeTtlMs !== null && negativeTtlMs === null;
  if (positiveTtlMs === null || maxValueBytes === null || negativeMalformed) return null;
  return { positiveTtlMs, negativeTtlMs, maxValueBytes };
}
```

- Decode (codec.ts:310-313): `const ceilings = normalizePolicyCeilings(policy);`
  then `if (ceilings === null || !(bytes instanceof Uint8Array)) return { ok:
  false, reason: "invalid" };`. `"invalid"` is a member of the existing reason
  union `"expired" | "oversized" | "invalid"` (codec.ts:194); no new reason is
  added, and the order (malformed policy before `"oversized"` at 316) is
  unchanged. `selectLifetimeCeilingMs` (150-155) keeps its signature and its
  `number | null` result: the positive branch is now always a number, and a
  `null` negative branch still means "declared negative-free", rejected at
  378.
- Encode (codec.ts:226-229) fails closed symmetrically:
  `const ceilings = normalizePolicyCeilings(policy);` then `if (ceilings ===
  null) failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);`. This
  replaces the `ceilings.maxValueBytes === null` check, and the
  `as number` cast at line 285 is removed (`ceilings.maxValueBytes` is
  `number` after the narrowing).
- Comment-only: codec.ts:60 becomes "Mirrors the `normalizeNegativeCacheTtlMs`
  window (explicit `null` or integer 5_000..15_000; a missing field is
  malformed)"; codec.ts:81 reads "(explicit `null` or integer 5_000..15_000;
  `undefined` is malformed)"; the `NormalizedPolicyCeilings` docstring at
  127-130 is replaced by the one above, so it no longer claims that `null`
  members mean a malformed policy; the `selectLifetimeCeilingMs` docstring at
  145-149 drops "`null` means the selected ceiling is missing or outside its
  normalized range" and states that `null` now only means the policy
  explicitly declared no negative fill (a malformed policy never reaches this
  function). The comments at 224-225 and 307-309 ("re-normalized before any
  of them is enforced") stay.

**Existing policies are unaffected (verified, round 3).** Every policy that
reaches the codec or the conditional-write factory in the four L01 test
files declares all three scalars inside their windows:
`server-cache-contracts.test.ts` `fakePolicy` (138-152: `ttlMs` 60_000,
`maxValueBytes` 4_096, `negativeTtlMs: null` at 146) and its overrides at 1067
(`ttlMs` 30_000), 1091-1094 (`ttlMs` 120_000, `negativeTtlMs` 8_000) and 1165
(`maxValueBytes` 256); `server-cache-codec-keys.test.ts` `fakePolicy` (60-72:
`negativeTtlMs` 10_000 at 67) and its overrides at 472 and 605
(`negativeTtlMs: null`), 478 (`maxValueBytes` 64) and 516 (`negativeTtlMs`
8_000). C2's new policies (`fakePolicy({ family: "posts" })`,
`fakePolicy({ schemaVersion: normalizeCacheSchemaVersion(8) })`) keep the
same valid scalars. `server-cache-eligibility.test.ts` never calls the codec.
The conditional-write factory rejects a malformed policy at
`serverCacheContracts.ts:943-945` before it calls the decoder, so no
conditional-write vector changes its rejecting gate. No production policy
omits the field (C3's downstream check).

**Regression vectors (binding).** In `tests/vitest/cache/server-cache-codec-keys.test.ts`,
add one nested `describe` inside `describe("envelope decoding")` directly after
the test at lines 586-615 ("fails negative fills without a policy ceiling and
bounds negative lifetimes"). Each malformed class is its own `it.each` row, so
a failing row is reported by name and one failure never hides another (this
replaces the round-2 "three assertions in one `it()`" shape):

```ts
describe("malformed policy scalars fail closed", () => {
  const now = { nowUnixMs: normalizeUnixTimeMs(2_000) };
  const positiveBytes = encodePositive(); // written 1_000, expires 31_000
  const negativeBody = {
    expiresAtUnixMs: 9_000,
    family: "public-html",
    fillKind: "negative",
    generationDigest: "b".repeat(64),
    schema: SERVER_CACHE_ENVELOPE_SCHEMA_V1,
    schemaVersion: 2,
    value: { absent: true },
    writtenAtUnixMs: 1_000,
  };
  const negativeBytes = new TextEncoder().encode(JSON.stringify(negativeBody));
  const encodeNegative = (policy: CachePolicy<unknown>): Uint8Array =>
    encodeServerCacheEnvelope(
      {
        family: policy.family,
        schemaVersion: policy.schemaVersion,
        fillKind: "negative",
        writtenAtUnixMs: normalizeUnixTimeMs(1_000),
        expiresAtUnixMs: normalizeUnixTimeMs(9_000),
        generationDigest: normalizeCacheGenerationDigest("b".repeat(64)),
        value: { absent: true },
      },
      policy
    );
  const withScalar = (field: string, value: unknown): CachePolicy<unknown> =>
    ({ ...fakePolicy(), [field]: value }) as unknown as CachePolicy<unknown>;
  const withoutNegativeTtl = (): CachePolicy<unknown> => {
    const policy = { ...fakePolicy() } as Record<string, unknown>;
    delete policy.negativeTtlMs;
    expect(Object.hasOwn(policy, "negativeTtlMs")).toBe(false);
    return policy as unknown as CachePolicy<unknown>;
  };
  type FillKind = "positive" | "negative";
  const MALFORMED: ReadonlyArray<readonly [string, () => CachePolicy<unknown>, FillKind]> = [
    ["negativeTtlMs missing", withoutNegativeTtl, "positive"],
    ["negativeTtlMs undefined", () => withScalar("negativeTtlMs", undefined), "positive"],
    ["negativeTtlMs 4_999", () => withScalar("negativeTtlMs", 4_999), "positive"],
    ["negativeTtlMs NaN", () => withScalar("negativeTtlMs", Number.NaN), "positive"],
    ["negativeTtlMs string", () => withScalar("negativeTtlMs", "10000"), "positive"],
    ["ttlMs NaN", () => withScalar("ttlMs", Number.NaN), "negative"],
  ];

  it("control: the well-formed policy decodes and encodes both fill kinds", () => {
    expect(decodeServerCacheEnvelope(positiveBytes, fakePolicy(), now).ok).toBe(true);
    expect(decodeServerCacheEnvelope(negativeBytes, fakePolicy(), now).ok).toBe(true);
    expect(() => encodePositive({ policy: fakePolicy() })).not.toThrow();
    expect(() => encodeNegative(fakePolicy())).not.toThrow();
  });

  it.each(MALFORMED)("decode rejects a policy with %s as invalid", (_name, policy, fillKind) => {
    const bytes = fillKind === "positive" ? positiveBytes : negativeBytes;
    expect(decodeServerCacheEnvelope(bytes, policy(), now)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it.each(MALFORMED)("encode throws encodeInvalid for a policy with %s", (_name, policy, fillKind) => {
    const encode =
      fillKind === "positive"
        ? () => encodePositive({ policy: policy() })
        : () => encodeNegative(policy());
    expect(encode).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  });
});
```

The negative body copies the key order of the passing vector's object literal
at lines 588-597
(lifetime 8_000 <= the fixture's 10_000 negative ceiling; `now` 2_000 is
before expiry 9_000). Every name used is already imported by the file
(lines 14-50) or defined in it (`fakePolicy` 60-72, `encodePositive`
400-424); the C1(e) repoint of `isServerCacheEventKey` does not touch them.

**Evidence required.** W-test-codec-keys (C11) runs the codec/keys file once
against the UNMODIFIED codec: the control passes and all 12 named rows (six
decode, six encode) are RED. Under today's codec each row fails by assertion
(decode returns `ok: true`, encode returns bytes), never by an import or
compile error. W-codec (C11) records the same file GREEN after the source
edit. The existing `negativeTtlMs: null` vectors (lines 472 and 605) keep
passing unchanged. The codec's line delta is carried in C1(g).

### C10 — Body pseudocode key derivation (LOW, binding)

The body's Implementation Pseudocode (lines 842-851) awaits
`buildServerCacheKey({ namespace, family, schemaVersion, generations, input })`
and `digestGenerations(projectGenerations(generations, policy.tags))`. The
real API is synchronous and takes digests: `BuildKeyInput` is `{ namespace,
family, schemaVersion, generationDigest, inputDigest }`
(`serverCacheKeys.ts:286-292`), `buildServerCacheKey` returns a `CacheKey`
without a promise (324), and `digestGenerations(generations, tags?)` projects
by `tags` itself (433-439). Lines 842-851 are read as:

```ts
const generationDigest = digestGenerations(generations, policy.tags);
const key = buildServerCacheKey({
  namespace: config.namespace,
  family: policy.family,
  schemaVersion: policy.schemaVersion,
  generationDigest,
  inputDigest, // branded CacheEligibilityFieldDigest of the canonical input
});
const expectedGenerationDigest = generationDigest;
```

Likewise the decoded envelope is `decoded.envelope`, not `decoded.value`
(codec.ts:196-198). No source change beyond the input-digest brand below.

**Input-digest brand (binding, round 3).** The `inputDigest` above must not
need a cast in 07-L02. `digestServerCacheInput` (`serverCacheKeys.ts:238`)
returns a plain `string` today (docstring 233-237). `serverCacheContracts.ts`
exports no normalizer for `CacheEligibilityFieldDigest`. The whole-file grep
finds only the type (336-338), the untyped predicate
`isValidLowercaseSha256Hex` (202-204) and `normalizeCacheGenerationDigest`
(318-321), which brands `CacheGenerationDigest`. There is therefore no owning
normalizer to funnel through. W-keys (C11) makes `digestServerCacheInput`
return `CacheEligibilityFieldDigest` through ONE documented cast site inside
`serverCacheKeys.ts`, with no new export and no new import
(`type CacheEligibilityFieldDigest` is already imported at keys.ts:24):

```ts
/**
 * Lowercase 64-hex SHA-256 over any canonicalized bounded payload, branded as
 * the eligibility field digest that `buildServerCacheKey` consumes as
 * `inputDigest`. A consumer that needs a different brand of the same wire
 * form (the share scope in `serverCacheEligibility.ts`) re-brands at its own
 * boundary.
 */
export function digestServerCacheInput(input: unknown): CacheEligibilityFieldDigest {
  // Single documented cast site: `sha256Hex` always emits lowercase 64-hex,
  // the brand's exact wire form (`isValidLowercaseSha256Hex`, contracts.ts:202).
  return sha256Hex(encodeCanonicalInput(input)) as CacheEligibilityFieldDigest;
}
```

This is the only NEW cast; it mirrors the existing `digestGenerations` cast
at keys.ts:438 (`as CacheGenerationDigest`). The widest-probe literal cast in
`maxServerCacheKeyBytes` (keys.ts:346) already exists and is unchanged.
`serverCacheEligibility.ts:229-236` keeps its `as unknown as
CacheShareScopeDigest` re-brand unchanged: it still compiles, because the
branded result is a `string` subtype. The test callers
(`server-cache-codec-keys.test.ts:109, 166, 201-205, 392`;
`server-cache-eligibility.test.ts:350`) compare with `toBe`/`not.toBe` and are
unaffected. 07-L02 passes `inputDigest: digestServerCacheInput(input)` with no
cast. The rest of C10 remains reference only (C11(6)).

### C11 — Dispatch and sequencing (binding for the orchestrator's writer mandates)

This leaf lands as ONE writer group of eleven single-file writers. Each writer
owns exactly one of the 11 allowlisted paths and receives only the
corrections listed for it below. The orchestrator builds every writer mandate
from this section.

1. **Extraction source.** Every extracting writer takes the moved bytes from
   the committed baseline, never from the working tree:
   `git show 8f73a0f8:core/services/cache/serverCacheContracts.ts` for
   W-coherence and W-condwrite, and
   `git show 8f73a0f8:tests/vitest/cache/server-cache-contracts.test.ts` for
   W-test-new. W-contracts and W-test-contracts delete those same ranges in
   the same group, and a fix-loop re-run of any extracting writer may happen
   after those deletions have landed, so the working tree may already lack
   the moved bytes at any point in the group; `git show` is stable across
   first runs and re-runs alike. All source and test line numbers in C1-C10
   refer to HEAD `8f73a0f8`.

   **Orchestrator precondition (before writer 1).** The 11 allowlisted paths
   must be byte-identical to the baseline:
   `git diff --quiet 8f73a0f8 -- core/services/cache/serverCacheContracts.ts core/services/cache/serverCacheCoherence.ts core/services/cache/serverCacheConditionalWrite.ts core/services/cache/serverCacheCodec.ts core/services/cache/serverCacheKeys.ts core/services/cache/serverCacheEligibility.ts core/services/cache/serverCacheConfig.ts tests/vitest/cache/server-cache-contracts.test.ts tests/vitest/cache/server-cache-coherence-conditional-write.test.ts tests/vitest/cache/server-cache-codec-keys.test.ts tests/vitest/cache/server-cache-eligibility.test.ts`
   must exit 0. On a non-zero exit the orchestrator stops, dispatches no
   writer, and re-anchors this contract to the current bytes first.
2. **Fixed land order.** Writers land strictly in this order:

   | # | Writer | File | Applies |
   | --- | --- | --- | --- |
   | 1 | W-coherence | `core/services/cache/serverCacheCoherence.ts` (new) | C1(a), its C1(d) imports and local `fail`/`CODES` |
   | 2 | W-condwrite | `core/services/cache/serverCacheConditionalWrite.ts` (new) | C1(b), its C1(d) imports and docstrings, C5 (conditional-write half) |
   | 3 | W-contracts | `core/services/cache/serverCacheContracts.ts` | C1(c), (d), the deletion set of item 5 |
   | 4 | W-config | `core/services/cache/serverCacheConfig.ts` | C1(d) type-import move, C5 |
   | 5 | W-keys | `core/services/cache/serverCacheKeys.ts` | C6, C1(d) keys comments, C10 input-digest brand |
   | 6 | W-test-new | `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts` (new) | C1(e) moved sections and fixtures, C2, C8 |
   | 7 | W-test-contracts | `tests/vitest/cache/server-cache-contracts.test.ts` | C1(e) removals, header and banner narrowing, C3 fix 1 |
   | 8 | W-test-codec-keys | `tests/vitest/cache/server-cache-codec-keys.test.ts` | C1(e) repoint, C3 fix 2, C9 vectors; records the C9 RED run |
   | 9 | W-test-eligibility | `tests/vitest/cache/server-cache-eligibility.test.ts` | C4 vectors; records the C4 RED run |
   | 10 | W-codec | `core/services/cache/serverCacheCodec.ts` | C9 source, C1(d) codec comments; records the C9 GREEN run |
   | 11 | W-eligibility | `core/services/cache/serverCacheEligibility.ts` | C4 source; records the C4 GREEN run |

   The in-between states do not type-check by design (for example, between
   W-coherence and W-contracts the moved names are declared in two modules,
   and the new test file does not exist until W-test-new). No writer "fixes"
   another writer's file to make an intermediate state compile.
3. **Per-writer fast gates.** Before the group is judged, each writer runs only
   the following fast gates on its own file:
   - for a `core/` file, eslint from `core/`:
     `../node_modules/.bin/eslint --max-warnings=0 services/cache/<file>.ts`;
     it uses the repo-root `eslint.config.mjs` resolved by upward lookup from
     `core/` (the same config as `bun --cwd core lint`);
   - `wc -l <file>` (at most 1,000; C1(g) targets);
   - `node_modules/.bin/prettier --write <file>` and then
     `node_modules/.bin/prettier --check <file>`, both from the repository
     root. Pinned snippets in C1-C10 fix TOKENS and values, not line breaks:
     the writer formats its own file with prettier before the check, and
     prettier's line breaking never counts as drift from a snippet.

   **Named exceptions (single-file vitest).** W-test-codec-keys and
   W-test-eligibility each run ONE single-file RED vitest run on their own
   test file, and W-codec and W-eligibility each run ONE single-file GREEN
   run on the matching test file (item 4). The command is pinned, run from
   the repository root:

   ```bash
   env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/cache/<file>.test.ts
   ```

   where `<file>` is `server-cache-codec-keys` (W-test-codec-keys, W-codec)
   or `server-cache-eligibility` (W-test-eligibility, W-eligibility). No other
   writer runs vitest.

   The four-file vitest gate (C7), `bun --cwd core lint:types`,
   `bun --cwd core lint` and root `tsc -p tsconfig.json --noEmit` (C1(e) gate
   note; an orchestrator gate outside the envelope) are judged only after the
   whole group has landed, by the orchestrator.
4. **RED evidence.** The two RED runs (W-test-codec-keys for C9, W-test-eligibility
   for C4) must show the NAMED new assertions failing, by assertion, against the
   unmodified source. That is the 12 `it.each` rows of C9 and the C4 `it()`.
   A run that fails at import, collection or transform time is not RED evidence
   and does not satisfy C4/C9; the writer reports it as a blocker. At writer 8
   every value import of the codec/keys file resolves: coherence exists
   (writer 1), and contracts no longer imports the codec (writer 3). At writer
   9 the eligibility file's imports are unchanged.
5. **Exact W-contracts deletion set** (line numbers at HEAD `8f73a0f8`):
   - :42 (`import { decodeServerCacheEnvelope } from "./serverCacheCodec";`);
   - :146-148 (`validatedConditionalWriteEntry`);
   - :152-157 (`cacheInvalidationAttemptToken`, `cacheCoherenceObservationToken`);
   - :388-775 (coherence, health, invalidation seams and event keys);
   - :789-1030 (conditional-write handoff and invalidation plan).

   KEEP :776, renamed comment-only to `// --- Envelope record`, and :778-787
   (`ServerCacheEnvelopeV1`). The C1(d) type-only import of
   `CacheConditionalWrite` and the comment-only docstring edits are this
   writer's only additions.
6. **Binding scope.** Implementers apply only C1(a)-(e), C3, C4, C5, C6, C9 and
   the C10 input-digest brand to the files as they are at HEAD `8f73a0f8`. C2
   and C8 are test-only strengthening, applied by W-test-new against unchanged
   source. C10's key-derivation pseudocode and the body's Implementation
   Pseudocode are reference only, never instructions to re-author an existing
   module. The C10 input-digest brand is the single exception, named above.
7. **No intermediate commit.** Nothing is committed until all 11 writers have
   landed and the group-level gates (item 3) are green. The repository's
   pre-commit hook runs the full `precommit:check` on every commit, and the
   intermediate states do not type-check (item 2); the hook is never
   bypassed (`--no-verify` is forbidden).

### Round-2 record (2026-09-24)

In-place BODY edits (task-contract fix per AGENTS.md "fix the task contract
first"; the body is otherwise untouched):

1. Exclusive Ownership (lines 25-39). Before: 8 bullets (five modules, three
   test files). After: 11 bullets, adding
   `core/services/cache/serverCacheCoherence.ts`,
   `core/services/cache/serverCacheConditionalWrite.ts` and
   `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`;
   every other bullet and the Forbidden paragraph are unchanged.
2. Workflow Dispatch Envelope (JSON fence at lines 1158-1242,
   schema `coderso.task551.workflow-dispatch@v1`). Every other key
   (`forbiddenPaths`, `dependencies`, the three tooling commands and
   `occurrences`) is unchanged.
3. Workflow Dispatch Envelope, `cache-contract-tests` argv prefix (line 1198),
   changed so the argv and C7 agree and the dispatch validator's
   `requireLiteralArgv` accepts it (it rejects `NAME=value` tokens):

```text
allowlist
  before: 8 paths = serverCacheContracts.ts, serverCacheCodec.ts,
          serverCacheKeys.ts, serverCacheEligibility.ts, serverCacheConfig.ts
          (core/services/cache/) + server-cache-contracts.test.ts,
          server-cache-codec-keys.test.ts, server-cache-eligibility.test.ts
          (tests/vitest/cache/)
  after:  11 paths = the 8 above + core/services/cache/serverCacheCoherence.ts
          (after serverCacheContracts.ts)
          + core/services/cache/serverCacheConditionalWrite.ts
          + tests/vitest/cache/server-cache-coherence-conditional-write.test.ts
          (after server-cache-contracts.test.ts)
cache-contract-tests argv and positiveDiscovery.paths
  before: the 3 test files
  after:  the 4 test files; the new file follows server-cache-contracts.test.ts
line-count argv
  before: wc -l + the 8 paths
  after:  wc -l + all 11 paths, in allowlist order
cache-contract-tests argv prefix (edit 3; the four test paths are unchanged)
  before: "node_modules/.bin/vitest", "run", "--config", "vitest.config.ts"
  after:  "bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run"
```

In-place amendments to this uncommitted corrections section:

- H1 (dispatch-breaking): the three `json` fences previously appended under
  C1(e) were removed. The first was a bare `"allowlist": [...]` fragment, which
  is not standalone JSON. The dispatch preflight
  (`_docs/_workflows/lib/task-551-dispatch-contract.mjs:364-370` strict-parses
  every `json` fence; line 358 raises `trailing`) therefore failed closed for
  the whole TASK-551 family. The 11-path authority now lives in the body
  envelope (edit 2 above).
- The new test file is renamed from `server-cache-contracts-coherence.test.ts`
  to `server-cache-coherence-conditional-write.test.ts` everywhere, because it
  also holds the conditional-write and invalidation-plan suites.
- The C1 implementation-instruction sentence telling the implementer to update
  Exclusive Ownership, the Exact Owned Surface attribution and the dispatch
  envelope was deleted; implementers never edit task files.
- Preface: the misquoted Changelog field was corrected to the verbatim line-11
  text; the preface now records that R4 is honored and lists the downstream
  mirrors owed.
- C1: `ServerCacheEnvelopeV1` is carved out of the moved range (moved range is
  now 789-1030); the binding import map, the acyclic graph and the comment-only
  docstring list were added; the fixture split was corrected (`expectCode` and
  `eligibleContext` are retained only; `UUID_A`, `EVENT_KEY` and the two token
  fakes move; `BRAND_CODES`, `KEY_INPUT_DIGEST`, `sampleKey` and `fakePolicy`
  are duplicated); exact per-file imports, the codec-keys repoint and the
  root-`tsc` gate note were added; line budgets were restated for 11 files.
- C2: the vacuous-suite finding and the binding test disposition were added;
  body line references were updated to the post-edit numbering (505-512).
- C4: the exact inherited-field vectors, their anchor and the red/green
  evidence requirement were pinned.
- C5: narrowed to lines 157-158 plus the line-269 literal, keeping
  `DEFAULT_MEMORY_NAMESPACE`; the readonly-tuple cast form was named; the rule
  was extended to `serverCacheConditionalWrite.ts`.
- C6: made binding.
- C7: made repository-root-relative (no absolute worktree path); it now names
  what it supersedes.
- C8: new; its accept vector's 13 `CACHE_TAGS` come from the new file's import
  block.

Round-2 audit dispositions applied in place (second pass, same date):

- Preface: the downstream-mirror list now states the decisions each mirror
  implements (07-L02 and 09-L04 `forbiddenPaths` carry all 11 L01 paths;
  07-L02's two vitest argvs use the validator-legal form; parent 07's mirror
  keeps `ServerCacheEnvelopeV1` in contracts and limits byte-identity to the
  three verbatim-moved suites; 10-L01 name reconciliation closed) and cites
  the corrected anchors (parent 197-204; 10-L01 1101-1107, 1364, 1366).
- C1(d): added contracts.ts:842, codec.ts:76-84 and 407-413 (mirrors stay; the
  codec remains a value-import leaf), keys.ts:118-123 and the retained test
  header 2-6. C5: named config.ts:268.
- C1(e): moved sections are defined by describe body plus own banner
  (369-371 + 373-765, 1037-1039 + 1041-1235, 1366-1387), so no range swallows
  the retained banners at 767-769 or 1237-1239; the shared 1362-1364 banner is
  split comment-only. `CACHE_TAGS` and `decodeServerCacheEnvelope` joined the
  new file's import block. The gate note now requires a pre-leaf root `tsc`
  baseline and judges only new errors in the 11 files.
- C1(g): codec and codec/keys test budgets restated for C9.
- C2: each vector names its actual rejecting gate; the policy-oversize,
  negative-under-null and lifetime vectors are decoder rejections with direct
  `decodeServerCacheEnvelope` assertions; 966, 973-975 are recorded as
  defensive rechecks; concrete filler sizes n = 16 and n = 256 are pinned.
- C7: restated around the validator-legal envelope argv (body edit 3), with
  the receipt recording that form; lines 920 and 1038-1039 joined the
  supersede list.
- C9 (fail-closed read side for a missing `negativeTtlMs`) and C10 (body
  pseudocode key derivation) are new.

### Round-3 record (2026-09-24)

Round-3 audit dispositions, applied in place to this uncommitted section (no
body edit; the body line numbers cited above are unchanged):

- M1 (C9): C9 is now fully fail-closed. `normalizePolicyCeilings` returns
  `null` when ANY consumed scalar (`ttlMs`, `negativeTtlMs`, `maxValueBytes`)
  is outside its owning window, which matches the write factory
  (contracts.ts:943-945) and `normalizeNegativeCacheTtlMs` (329-332). The
  pseudocode spells the exact declared-`null` versus declared-but-invalid
  predicate. The false "`null` members mean malformed" docstring is replaced.
  The misplaced helper comment ("`undefined` no longer maps to
  negative-free") moved to the check site. The regression test is now named
  `it.each` rows covering missing, `undefined`, `4_999`, `NaN` and `"10000"`
  `negativeTtlMs` (positive decode and encode), plus `ttlMs: NaN` (negative
  decode and encode). The round-2 single-`it()` shape is replaced. The
  no-impact check on existing test policies was re-verified and recorded.
- M2: new C11 (dispatch and sequencing). It covers the baseline extraction
  source, the fixed 11-writer land order, per-writer fast gates versus
  group-level gates, the RED-evidence rule, the exact W-contracts deletion set
  and the binding scope sentence.
- C3: fix 2 pins the literal filler expression. The "source is correct and
  unchanged" sentence is rescoped to the C3 fixes alone.
- Preface: "R4 honored" is narrowed to `ServerCacheEnvelopeV1` and the four
  value brands. R3/R4's placement of the C1(a)/C1(b) names in
  `serverCacheContracts.ts` is recorded as superseded.
- Anchors: C2 mismatch test 1114-1162; C8 suite 1366-1387.
- C10: the input-digest brand of `digestServerCacheInput` is binding through
  one documented cast site in `serverCacheKeys.ts`. The contracts module owns
  no `CacheEligibilityFieldDigest` normalizer (verified).
- C1(g): codec, keys and codec/keys test budgets restated for C9 and C10.
- Correction headings C1-C11 and the round records were promoted from `####` to
  `###`, so they nest directly under this `##` entry.

### Round-4 record (2026-09-24)

Round-4 LOW dispositions, applied in place to this uncommitted section (no
body edit):

1. C11(3): named exceptions added. W-test-codec-keys and W-test-eligibility
   run ONE single-file RED vitest run, W-codec and W-eligibility ONE GREEN
   run, with the pinned env-free command from the repository root.
2. C11(3): pinned snippets fix tokens and values, not line breaks; each writer
   runs `prettier --write` on its own file before `prettier --check`.
3. C11(1): orchestrator precondition `git diff --quiet 8f73a0f8 -- <11 paths>`
   before writer 1 (stop and re-anchor otherwise); the `git show` rationale
   now covers fix-loop re-runs.
4. C11(7): no commit until all 11 writers have landed and the group-level
   gates are green; the pre-commit hook runs the full `precommit:check` and is
   never bypassed.
5. C1 implementation instruction and C1(e) gate note: "atomic" means one C11
   writer group judged once; the four-file vitest is the GROUP-level gate the
   orchestrator runs after writer 11.
6. C4: the new `it()` title is pinned as
   `"rejects inherited-only context and query-variant fields"`.
7. C9: the comment-edit list gains the `selectLifetimeCeilingMs` docstring at
   codec.ts:145-149 (`null` now only means an explicitly declared
   negative-free policy); the copied vector's anchor is corrected to the
   object literal at 588-597.
8. C10: "the only digest-producing cast" is reworded to "the only NEW cast;
   it mirrors the existing `digestGenerations` cast at keys.ts:438".
9. C11(3) eslint wording names the repo-root `eslint.config.mjs` resolved by
   upward lookup from `core/` (same config as `bun --cwd core lint`); C1(f)
   and C7 state that the root `tsc` baseline gate is an ORCHESTRATOR gate
   outside the envelope.
10. C9: the anchor "comments at 223-225" is corrected to 224-225.
