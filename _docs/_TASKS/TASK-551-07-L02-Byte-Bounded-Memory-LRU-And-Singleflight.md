# TASK-551-07-L02: Byte-Bounded Memory LRU and Single-Flight
# FileName: TASK-551-07-L02-Byte-Bounded-Memory-LRU-And-Singleflight.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-07
**Priority:** High
**Category:** Cache / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-07-L01; TASK-551-03-L02 lands first (board land order step 8 precedes step 9; sequencing constraint is parent-owned)
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; closure only)

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
- Reject/skip values or total entries above policy/per-entry/aggregate limits.
  One operation has one shared maintenance budget of at most L01's exact
  `maxExpirySweepEntriesPerOperation = 64` examined/removable entries across
  expiry and capacity eviction. Before mutation, plan at most 64 oldest victims
  and their exact bytes; if that plan still cannot make the insert fit, record
  `eviction_budget_exhausted`, keep every planned victim and any prior value, and
  skip the insert. A feasible plan is then applied atomically with the insert.
  Replacement failure always preserves the previous valid entry.
- `get` lazily evicts expired entries using an injected monotonic clock under
  that same fixed work cap; no unbounded interval or full-map request-path scan.
- Memory generations are L01 opaque 32-hex tokens keyed only by the finite v1
  site/family tags. Reading a missing generation atomically initializes a fresh
  non-reusable token before lookup; a multi-tag bump replaces all requested
  tokens synchronously/atomically and returns one normalized snapshot.
- `ServerCache.getOrLoad(request)` consumes only L01's exact generic
  `ServerCacheLoadRequest<TCached,TResult>`. Before key construction, value read,
  or loader execution it normalizes and captures one generation snapshot for the
  union of primary policy tags and the finite predeclared `fillFenceTags`.
  Primary key identity projects only the primary policy tags. It evaluates
  eligibility once through L01's proof factory and registers policy/tag
  dependencies with the L01 coherence controller. An ineligible or missing/
  malformed/unbranded proof bypasses value access, distributed coordination and
  the local-flight registry entirely; that caller executes its own authoritative
  loader with the exact `fill_disabled/ineligible` trigger.
- `safeReadDecode` returns a strict union: decoded hit,
  `store_absent`, or `store_value_rejected` with only L01's coarse finite reason.
  Returned invalid bytes are evicted best-effort before the rejected result.
  The owner loader receives that trigger unchanged. Redis/backend null is an
  absence even when provider TTL caused it; returned expired bytes are rejected.
  Saturation/coherence/generation bypass and every per-caller retry after a
  non-published shared outcome receive their exact `fill_disabled` trigger. A
  loader-proposed fill under `fill_disabled` is returned authoritatively but
  never encoded or written.
- For a valid proof, local-flight identity is a collision-free digest of the final
  path key, the family's current `ProcessCacheCoherenceEpoch`, and the proof's
  `shareScopeDigest`. The final path key is the actual generation-bearing primary
  `CacheKey` on a normal path, or the canonical bounded non-store bypass key
  derived from the same namespace/family/schema/input digest on a store/circuit
  bypass path. The bypass key is never sent to a store. Distinct normalized auth,
  render, nonce, query, result-disposition or mutable-visibility contexts cannot
  join because any differing relevant field changes the branded share-scope digest.
- The registry stores only one cleanup-wrapped
  `Promise<ServerCacheSharedFillOutcome>`, never `Promise<TResult>` and
  never an owner's `returnValue`. The owner always awaits its private
  `ServerCacheOwnerFillAttempt<TCached,TResult>` and receives only its own loader
  `returnValue`. A joiner may pass the strictly decoded published primary through
  its own `request.resolveCached` only when the shared outcome is
  `kind:"published"`, which requires a valid positive or eligible-negative fill
  and a successful memory conditional write/Redis `written` result. For
  `not_published`—including `no_fill`, loader rejection, generation change, lease
  loss, timeout/unavailability, closed/bypass or malformed outcome—every joiner
  executes its own authoritative loader with fill disabled. The same tracked
  outcome promise object is returned internally to joiners and removed in its
  `finally`; caller-result promises are deliberately never shared.
- Sample a separate shortening-only `[0.9,1.0]` multiplier for every entry. The
  primary uses its positive or eligible-negative policy ceiling; a positive
  companion independently uses its own positive policy TTL. Each envelope and
  store TTL uses that entry's sampled value, and an atomic two-entry bundle may
  contain unequal TTLs. Tests inject RNG and clocks. Negative fills cannot carry a
  companion.
- One process-wide local fill-attempt registry covers eligible normal and bypass paths
  and is bounded by normalized `SERVER_CACHE_MAX_IN_FLIGHT_KEYS` (default 1,024,
  valid 16..10,000). Capacity counts distinct keys, not joiners. An existing key
  always joins even at capacity. A new distinct key at capacity runs the
  authoritative loader directly, creates no promise-map entry, performs no
  cache/distributed fill, and records `singleflight_saturated`; loader errors
  retain identity.
- An optional exact L01 `DistributedCacheLoadCoordinator` is invoked only after
  local fill-attempt ownership. The authoritative loader returns the strict
  `ServerCacheLoaderResult`. A valid `no_fill` returns its caller-only
  `returnValue` immediately and performs zero encode/store/distributed-write work.
  A valid `fill` declares `positive|negative`, a primary `cacheValue`, caller-only
  `returnValue`, and zero or one companion created only through the supplied
  branded companion factory. Positive selects the policy TTL; negative requires
  an eligible non-null negative policy, selects only its negative TTL, and cannot
  carry a companion. `ServerCache` validates that a positive companion policy's
  tags are a subset of the pre-loader fence, encodes only valid fill values, and
  creates exactly one validated `CacheConditionalWrite`. `returnValue` is never encoded.
  A distributed `owner` then calls only
  `owner.putIfGenerationsAndLeaseOwned(...)`; its bounded Redis operation proves
  the random lease token and every expected generation atomically with the one-
  or-two-entry fill. Only `written` means bytes entered cache.
  `generation_changed`, `lease_lost`, or `unavailable` marks the shared outcome
  non-published while returning the owner's own authoritative value. `waiter`
  validates cloned returned bytes or falls back authoritatively without fill on
  timeout/unavailable; `bypass` loads authoritatively without fill. Every joiner
  of those non-published outcomes then runs its own authoritative no-fill loader.
  A renew `lost|unknown` prevents the write
  attempt. Release runs after the owned-write attempt as token-safe best-effort
  cleanup, and its outcome never retroactively authorizes or invalidates a fill.
  Absent means local behavior. No persistent L1 is introduced by the hook, and
  coordinator close is awaited by `ServerCache.close()`.
- Implement the store-only
  `writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<CacheConditionalWriteResult>` over
  L01's exact one-or-two-entry operation. It is not exposed by `ServerCache` or a
  compatibility/public/domain facade. `ServerCache` is the only caller of
  L01 `createCacheConditionalWriteEntry(policy,...)`; memory strictly decodes each
  envelope, requires the entry/envelope `fillKind` values to match, chooses the
  positive ceiling or requires the non-null negative ceiling, and rechecks the
  brand's normalized policy TTL/value ceilings, entry TTL, policy-specific
  envelope lifetime and configured total entry ceiling, then compares all finite
  generation tokens and writes all entries or none in one synchronous critical
  section. The Redis store supplies the same generation-only atomic result in
  TASK-551-08-L01 for non-distributed paths. A distributed owner must not call
  it: L01's combined lease-and-generation owned-write surface is the sole
  authority for that fill and is implemented by TASK-551-08-L03. No consumer
  may construct a conditional write or choose between these backend primitives.
  Memory returns only `written|generation_changed`; Redis may additionally
  return `unknown` after an uncertain dispatched command. Only `written` becomes
  the registry's published outcome.
- The backend-neutral circuit counts store/transport failures, never loader or
  domain errors: three consecutive failures open it for 1 second, repeated
  failed half-open probes double the cooldown to a 30-second cap, exactly one
  half-open probe is admitted, and one successful probe closes/resets it.
  Open-circuit/store-unavailable requests skip every cache value read/write. An
  eligible request may wait on the bounded backend-independent fill-attempt
  registry keyed by the exact canonical collision-free digest of
  `{ finalPathKey, processCacheCoherenceEpoch, shareScopeDigest }`, but the
  resulting unavailable/non-published outcome makes every joiner run its own
  authoritative no-fill loader. The map retains outcome promises only, is removed
  in `finally`, and never becomes a Redis-mode L1 value cache.
- Maintain one bounded epoch per finite family inside the coherence controller.
  Only its exact `report(...)` implementation advances epochs. Async global
  reporters call `beginObservation(source)` before I/O; a report older than that
  source's last applied watermark is ignored, preventing delayed recovery from
  clearing a newer force. Every accepted event observation carries its bounded
  event key and advances affected epochs; local/PubSub observation never clears
  a fence or authorizes stale/private values. No
  `ServerCache`, store, runtime or consumer exports/calls a separate
  `advance*Epoch` helper. Never reset or reuse an epoch; reaching the safe-integer
  ceiling leaves the family permanently forced-bypass until process restart.
  Thus a post-mutation/fence caller cannot join prior-epoch work.
- Construct exactly one L01 `ServerCacheCoherenceController` per `ServerCache`.
  Memory/Redis stores receive that controller rather than owning coherence.
  Store, post-commit, outbox and Pub/Sub inputs call its exact normalized
  `report`; store `health()` delegates deterministic backend/coherence composition
  to `controller.health(...)`. It implements L01's separate exact caps of 4,096
  unresolved event records and 4,096 active immediate-attempt tokens, and keeps no
  settled tombstone. A post-commit callback must register its opaque token before
  starting, reports failure only with that live token, and settles it in the
  outermost `finally`. Only the matching `durable_invalidation_processed` receipt
  clears an unresolved exact failure; durable-before-delayed-failure is remembered
  only until all active tokens settle, then the record is retired. Global outbox/
  Redis recovery, Pub/Sub and other events do not clear an exact fence. At either
  cap the controller starts no untracked callback and forces a temporary all-
  family capacity bypass; it automatically removes only that capacity fence once
  both counts fall from 4,096 to the exact 3,072 hysteresis threshold. L08 owns
  the separate Redis durable-drain fence needed for a saturated post-commit event.
- A failed memory-mode generation bump immediately marks the affected finite
  families locally incoherent. Reads in that process bypass cache values; eligible
  calls may await the same scoped fill-attempt outcome, but because no conditional
  write can succeed each joiner runs its own authoritative loader. With no durable
  memory outbox receipt, that fence lasts until restart; restart discards all
  process-local values. An old value is never knowingly served merely until TTL.
- Telemetry is bounded by backend/family/outcome, never raw key: hit, miss,
  bypass reason, corrupt, expired, set, oversize, eviction reason, loader,
  single-flight joined/saturated, generation bump and store/circuit error;
  gauges include entries, bytes and in-flight count/capacity.

## Implementation Pseudocode

```ts
type ServerCacheSharedFillOutcome =
  | Readonly<{
      kind: "published";
      fillKind: "positive" | "negative";
      encodedPrimaryEnvelope: Uint8Array;
    }>
  | Readonly<{
      kind: "not_published";
      reason:
        | "no_fill"
        | "owner_loader_rejected"
        | "store_absent_no_publication"
        | "store_value_rejected"
        | "fill_disabled"
        | "distributed_waiter_value"
        | "generation_changed"
        | "lease_lost"
        | "unavailable"
        | "timeout"
        | "closed"
        | "malformed";
    }>;

type ServerCacheOwnerFillAttempt<TResult> = Readonly<{
  returnValue: TResult;
  sharedOutcome: ServerCacheSharedFillOutcome;
}>;

function sharedReasonFromTrigger(
  trigger: ServerCacheLoadTrigger,
): Extract<ServerCacheSharedFillOutcome, { kind: "not_published" }>["reason"] {
  switch (trigger.kind) {
    case "store_absent": return "store_absent_no_publication";
    case "store_value_rejected": return "store_value_rejected";
    case "fill_disabled": return "fill_disabled";
  }
}

function triggerFromCoordinatorState(state): ServerCacheLoadTrigger {
  switch (state.kind) {
    case "transport_unavailable":
    case "wait_unavailable":
      return { kind: "fill_disabled", reason: "transport_unavailable" };
    case "wait_timeout":
      return { kind: "fill_disabled", reason: "distributed_wait_timeout" };
    case "closed":
      return { kind: "fill_disabled", reason: "coordinator_closed" };
    case "malformed_waiter_value":
      return { kind: "fill_disabled", reason: "not_published_retry" };
  }
}

async function getOrLoad<TCached, TResult>(
  request: ServerCacheLoadRequest<TCached, TResult>,
): Promise<TResult> {
  const normalized = normalizeLoadRequest(request);
  const eligibility = normalized.policy.isEligible(normalized.context);
  if (!isBrandedEligibilityProof(eligibility)) {
    return runLoaderAndReturnWithoutFill(normalized, {
      kind: "fill_disabled", reason: "ineligible",
    }); // no registry/store/lease
  }
  const fencedTags = unionFiniteTags(
    normalized.policy.tags,
    normalized.fillFenceTags,
  );
  coherence.registerPolicy({
    family: normalized.policy.family,
    tags: normalized.policy.tags,
  });
  const generationRead = await safeReadGenerations(fencedTags);
  // strict union: ready snapshot | coherence_bypass | generation_unavailable
  const generations = generationRead.kind === "ready"
    ? generationRead.generations
    : null;
  const finalPathKey = generations
    ? buildServerCacheKey({
        // synchronous; exact BuildKeyInput (serverCacheKeys.ts:286-292)
        namespace: config.namespace,
        family: normalized.policy.family,
        schemaVersion: normalized.policy.schemaVersion,
        generationDigest: digestGenerations(generations, normalized.policy.tags),
        inputDigest: normalized.inputDigest, // digestServerCacheInput(input)
      })
    : await buildCanonicalNonStoreBypassFinalKey({
        namespace: config.namespace,
        policy: normalized.policy,
        input: normalized.input,
      });
  const processCacheCoherenceEpoch = coherence.currentEpoch(
    normalized.policy.family,
  );
  const localFlightKey = await digestCanonicalCollisionFreeTuple({
    finalPathKey,
    processCacheCoherenceEpoch,
    shareScopeDigest: eligibility.shareScopeDigest,
  });
  let trigger: ServerCacheLoadTrigger = {
    kind: "fill_disabled",
    reason: generationRead.kind === "coherence_bypass"
      ? "coherence_bypass"
      : "generation_unavailable",
  };
  if (generations) {
    const expectedGenerationDigest = digestGenerations(
      generations,
      normalized.policy.tags,
    );
    const hit = await safeReadDecode(
      finalPathKey,
      normalized.policy,
      expectedGenerationDigest,
    );
    if (hit.ok) return normalized.resolveCached(hit.value);
    trigger = hit.trigger; // store_absent or coarse store_value_rejected
  }
  const registration = registerTrackedFillAttempt({
    key: localFlightKey,
    operation: () => generations
      ? loadEncodeAndMaybePublish({
        request: normalized,
        eligibility,
        trigger,
        capturedGenerations: generations,
        primaryKey: finalPathKey,
        createCompanion: (companion) => validateAndBrandCompanion(
          companion,
          fencedTags,
        ),
        // This function alone encodes valid fill values and creates the write.
        writeNonDistributed: (write) => store.writeIfGenerationsMatch(write),
        writeDistributedOwner: (owner, write) =>
          owner.putIfGenerationsAndLeaseOwned(write),
        })
      : runOwnerWithoutFill(normalized, trigger),
  });
  if (registration.role === "saturated") {
    telemetry.outcome("singleflight_saturated", normalized.policy.family);
    return runLoaderAndReturnWithoutFill(normalized, {
      kind: "fill_disabled", reason: "singleflight_saturated",
    });
  }
  if (registration.role === "owner") {
    const attempt = await registration.ownerAttempt;
    return attempt.returnValue; // this caller's own loader/resolve result only
  }
  const shared = await registration.sharedOutcome;
  if (shared.kind === "published" && generations) {
    const decoded = strictDecodePublishedPrimaryForJoiner(
      shared.encodedPrimaryEnvelope,
      normalized.policy,
      generations,
    );
    if (decoded.ok) return normalized.resolveCached(decoded.value);
  }
  return runLoaderAndReturnWithoutFill(normalized, {
    kind: "fill_disabled", reason: "not_published_retry",
  }); // each joiner runs its own
}

// Deliberately non-async. The map stores only the cleanup-wrapped shared outcome.
function registerTrackedFillAttempt<TResult>(input) {
  const existing = inFlight.get(input.key);
  if (existing) return { role: "joiner", sharedOutcome: existing } as const;
  if (inFlight.size >= config.maxInFlightKeys) return { role: "saturated" } as const;
  const ownerAttempt: Promise<ServerCacheOwnerFillAttempt<TResult>> =
    input.operation();
  let trackedOutcome: Promise<ServerCacheSharedFillOutcome>;
  trackedOutcome = ownerAttempt.then(
    (attempt) => attempt.sharedOutcome,
    () => ({ kind: "not_published", reason: "owner_loader_rejected" }),
  ).finally(() =>
    removeOnlyIfSame(input.key, trackedOutcome),
  );
  inFlight.set(input.key, trackedOutcome);
  return { role: "owner", ownerAttempt } as const;
}

async function runLoaderAndReturnWithoutFill(request, trigger) {
  const loaded = validateLoaderResult(await request.loader({
    trigger,
    companion: (candidate) => validateCompanionForNoFillCall(candidate),
  }));
  // A syntactically valid fill on fill_disabled is authoritative output only.
  return loaded.returnValue;
}

async function runOwnerWithoutFill(request, trigger) {
  const returnValue = await runLoaderAndReturnWithoutFill(request, trigger);
  return {
    returnValue,
    sharedOutcome: {
      kind: "not_published",
      reason: sharedReasonFromTrigger(trigger),
    },
  } as const;
}

async function loadEncodeAndMaybePublish(input) {
  const owner = await acquireAfterLocalOwnershipOrUseMemory(input.primaryKey);
  if (owner.kind === "waiter") {
    const value = await waitAndStrictlyDecodePrimary(owner, input);
    if (value.ok) return {
      returnValue: await input.request.resolveCached(value.value),
      sharedOutcome: {
        kind: "not_published",
        reason: "distributed_waiter_value",
      },
    };
    return runOwnerWithoutFill(
      input.request,
      triggerFromCoordinatorState(normalizeCoordinatorWaitState(value)),
    );
  }
  if (owner.kind === "bypass") {
    return runOwnerWithoutFill(
      input.request,
      triggerFromCoordinatorState(normalizeCoordinatorBypassState(owner)),
    );
  }
  try {
    const loaded = validateLoaderResult(
      await input.request.loader({
        trigger: input.trigger,
        companion: input.createCompanion,
      }),
    );
    if (loaded.kind === "no_fill") return {
      returnValue: loaded.returnValue,
      sharedOutcome: { kind: "not_published", reason: "no_fill" },
    };
    const primaryTtlMs = loaded.fillKind === "positive"
      ? sampleShorteningOnlyTtl(input.request.policy.ttlMs)
      : sampleShorteningOnlyTtl(
          requireEligibleNegativeTtlWithoutCompanion(
            input.request.policy,
            input.eligibility,
            loaded.companion,
          ),
        );
    const companionTtlMs = loaded.companion
      ? sampleShorteningOnlyTtl(loaded.companion.policy.ttlMs)
      : null;
    const write = encodePrimaryAndOptionalCompanionFromCapturedSnapshot(
      loaded,
      input.capturedGenerations,
      input.primaryKey,
      { primaryTtlMs, companionTtlMs },
    );
    const writeResult = owner.kind === "owner"
      ? await safeOwnedConditionalWrite(() =>
          input.writeDistributedOwner(owner, write))
      : await safeGenerationConditionalWrite(() =>
          input.writeNonDistributed(write));
    return {
      returnValue: loaded.returnValue,
      sharedOutcome: toSharedPublishedOutcomeOnlyWhenWritten(
        writeResult,
        loaded.fillKind,
        write.entries[0].encodedEnvelope,
      ),
    };
  } finally {
    await releaseDistributedOwnerAfterAttemptIfPresent(owner);
  }
}
```

Store/codec/telemetry errors are swallowed only at the cache boundary. Eligible
callers may await one bounded scoped fill attempt, but every non-published outcome
runs a fresh authoritative no-fill loader per joiner. Loader/domain errors retain
their per-caller identity and are never cached or forwarded from an owner to a
joiner. A generation change during load discards the fill, returns the owner's
freshly loaded value to that owner, and makes each joiner load for itself.
`close()` is concurrency-safe/idempotent: it prevents new fills, awaits
the distributed coordinator's idempotent close, clears values and releases
settled in-flight references. Active authoritative loaders keep their result
identity but cannot fill after close. Later cache use returns the authoritative
loader through a normalized closed bypass; `health()` is degraded/forced with a
bounded stable code rather than inventing a new health-union state.

## Security Contract

- **Visibility/routes:** no route changes.
- **Auth/RBAC/CSRF/rate limits:** unchanged; L01 eligibility remains mandatory.
- **Validation:** all L01 limits plus safe integer byte accounting; no public
  API can select keys, generations or loader behavior.
- **Secrets/privacy:** metrics/logs expose family/reason only; no raw key/value.
- **Anti-abuse:** oversize/high-cardinality attempts bypass before allocation;
  bounded sweep/registry capacity limit successful shareable fill work without
  ever sharing caller-specific results.

## Testing Requirements

Test empty/get/set/delete, promotion, count eviction, byte eviction, replacement
accounting, cloned bytes, exact limits/max+1, monotonic expiry, bounded sweep,
fresh/non-reused generation-token initialization, atomic token replacement,
deterministic shortening-only jitter bounds, corrupt envelopes, ineligible
bypass, loader rejection, stale-generation fill discard and conditional two-entry
all-or-nothing writes. Pin strict memory-store envelope decode, matching entry/
envelope `fillKind`, positive versus required non-null negative ceiling and zero
state mutation for forged/malformed/TTL/lifetime/byte mismatch, including one bad
entry in a pair. For a successfully written shareable fill, 1/10/50
concurrent same-key-and-share-scope callers produce exactly one loader/render and
each joiner invokes its own `resolveCached`. Exercise one-entry and primary-plus-
companion success with equal and unequal positive policy TTLs; assert each entry
uses its independently sampled/capped envelope/store TTL and the atomic bundle may
contain unequal TTLs. Pin one exact cleanup-wrapped
`Promise<ServerCacheSharedFillOutcome>` object across the non-async registry's
joiner branches and prove the registry never contains `Promise<TResult>` or an
owner `returnValue`.
Pin every normalized share-scope field: equivalent eligible context joins, while
changing an eligible query variant, positive/negative disposition or mutable-
visibility version yields a distinct digest/flight. Changing auth, render/preview
or nonce/sensitive-dependency to an excluded state yields no proof. An ineligible
or missing/unbranded proof performs zero registry/store/lease calls.
Run 1/10/50 concurrent `no_fill`, owner-rejection, stale-generation,
lease-lost, unavailable, timeout, closed and malformed-outcome cases: the owner
keeps its own return/error, every joiner invokes its own authoritative no-fill
loader, and distinct per-request token/nonce/auth-context results and error objects
never cross callers. Store/circuit bypass therefore has one loader per caller,
not a one-loader claim. Primary hits and distributed waiter values use only that
caller's `resolveCached`; a waiter outcome is not republished to local joiners.
`returnValue` bytes are never encoded. Reject a
second companion, unknown loader-result fields, a companion whose policy tags
fall outside the pre-loader `fillFenceTags`, and every attempt to extend the
captured fence after load starts. Cover positive fill with/without companion,
eligible negative fill with its negative (never positive) TTL and no companion,
and every finite
`no_fill` reason. Assert `no_fill` performs zero encoding/store/owner-write work;
reject null-policy/ineligible/companion-bearing negative fills and malformed
`no_fill`/discriminators with zero fill side effects. Pin that only `ServerCache` creates conditional
entries and no consumer-facing direct-write method exists. Pin the three-
failure circuit threshold, one-probe half-open race, cooldown growth/reset and
prove loader failures do not open it. Inject a memory generation-bump failure and
prove the permanent process fence prevents old-value reuse until restart. Assert
stats have no key/value fragments. Delay a loader under epoch N, advance the
family fence through exactly one accepted controller `report(...)` transition at
post-commit, then prove a caller under epoch N+1 invokes/joins a new attempt and
cannot receive the epoch-N result. Pin the local-flight key vectors as a canonical
collision-free digest of exact `{ finalPathKey, processCacheCoherenceEpoch,
shareScopeDigest }` for
both generation-bearing normal keys and canonical non-store bypass keys; delimiter
collision vectors must differ. Assert current-token state-identical reports do
not advance, older token completion cannot undo a newer report, every accepted
event observation advances, and only matching durable processing clears its
event fence even when reports arrive in reverse order. Run more than 100,000
sequential success and failure-then-durable lifecycles and prove the exact event/
attempt counts return to baseline with no retained tombstone or global bypass.
Pin 4,096 concurrent registrations and a saturated 4,097th, with no callback for it,
temporary capacity bypass at 4,097, and automatic 3,073/3,072 hysteresis recovery;
prove L08's independent durable-drain fence still wins when present. Pin no broad
recovery clearing and no second `advance*Epoch` surface. Pin generation-
digest mismatch as best-effort eviction plus the coarse rejected trigger. Pin
backend-null `store_absent`, returned expired/oversized/invalid rejected reasons,
and every ineligible/saturation/coherence/generation/joiner fill-disabled reason.
Return a syntactically valid fill from each disabled case and prove only its
authoritative `returnValue` escapes with zero encode/store/lease/publication; no
trigger exposes key/envelope/decoder bytes. Pin the closed trigger mapping
(`store_absent -> store_absent_no_publication`, every rejected reason ->
`store_value_rejected`, every fill-disabled reason -> `fill_disabled`) and the
coordinator mapping for transport/wait-timeout/closed/malformed states; assert
that `ServerCacheSharedFillOutcome.reason` is always a finite string, never a
trigger object. Pin total key+value bytes and
one combined 64-entry expiry/eviction work budget: exact 64 succeeds when enough,
while a 65th required victim skips the insertion without deleting planned victims
or replacing the old value. With distinct keys pin
the in-flight 16/1,024/10,000 configuration bounds, N existing-key join, and new
N+1 authoritative/no-fill saturation behavior and telemetry. Exercise every
distributed owner/waiter/bypass outcome, timeout/unavailable fallback and cloned
bytes. For owners, pin `written`, `generation_changed`, `lease_lost`, and
`unavailable`/conditional-write `unknown`; prove every non-`written` outcome returns the fresh authoritative
value without fill, renew `lost|unknown` prevents the write, the generation-only
store write is never called, and release runs after the attempt as best-effort
cleanup whose `released|lost|unknown` result cannot change fill authority. Also
pin idempotent close. Assert store health is the deterministic controller/backend
composition and immediate post-commit failure fences before the caller resumes.

```bash
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null \
  node_modules/vitest/vitest.mjs run \
  tests/vitest/cache/memory-server-cache-store.test.ts \
  tests/vitest/cache/server-cache-coordinator.test.ts
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null \
  node_modules/vitest/vitest.mjs run \
  tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-coherence-conditional-write.test.ts \
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
only targeted evidence and does not edit changelog 1310.

## Workflow Dispatch Envelope

The L01 contract suites below are execution-only receipts: their test paths are
literal command inputs but remain foreign write targets. The brace-expanded
line-count gate is represented by the same finite owned path set.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-07-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-07"
  },
  "allowlist": [
    "core/services/cache/serverCache.ts",
    "core/services/cache/memoryServerCacheStore.ts",
    "core/services/cache/serverCacheTelemetry.ts",
    "tests/vitest/cache/memory-server-cache-store.test.ts",
    "tests/vitest/cache/server-cache-coordinator.test.ts"
  ],
  "forbiddenPaths": [
    "core/site/cache/siteCache.ts",
    "core/services/cache/redisServerCacheStore.ts",
    "core/services/cache/cacheInvalidationOutbox.ts",
    "core/services/cache/redisCacheLease.ts",
    "core/db/schema.ts",
    "core/server/httpServer.ts",
    "tests/vitest/cache/server-cache-contracts.test.ts",
    "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts",
    "tests/vitest/cache/server-cache-codec-keys.test.ts",
    "tests/vitest/cache/server-cache-eligibility.test.ts",
    "core/services/cache/serverCacheCoherence.ts",
    "core/services/cache/serverCacheConditionalWrite.ts",
    "core/services/cache/serverCacheContracts.ts",
    "core/services/cache/serverCacheCodec.ts",
    "core/services/cache/serverCacheKeys.ts",
    "core/services/cache/serverCacheEligibility.ts",
    "core/services/cache/serverCacheConfig.ts",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
    "_docs/_workflows/task-551-implement.mjs"
  ],
  "dependencies": ["TASK-551-03-L02:single"],
  "commands": [
    {
      "id": "memory-cache-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/cache/memory-server-cache-store.test.ts", "tests/vitest/cache/server-cache-coordinator.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/cache/memory-server-cache-store.test.ts", "tests/vitest/cache/server-cache-coordinator.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "l01-contract-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "argv": ["wc", "-l", "core/services/cache/serverCache.ts", "core/services/cache/memoryServerCacheStore.ts", "core/services/cache/serverCacheTelemetry.ts", "tests/vitest/cache/memory-server-cache-store.test.ts", "tests/vitest/cache/server-cache-coordinator.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-03-L02:single"],
      "commandIds": ["memory-cache-vitest", "l01-contract-vitest", "core-lint-types", "core-lint", "diff-check", "line-count"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (mirror of TASK-551-07-L01 round-2; append-only)

This entry mirrors the TASK-551-07-L01 round-2 dispositions that change what
this leaf consumes and executes. TASK-551-07-L01 owns those contracts; where
this mirror and the L01 file disagree, L01 wins and this entry must be
re-synced. Line anchors below were re-read against this file after the
in-place edits described here, and against the live source at HEAD
`8f73a0f8`. Status stays `⏳ To Do` and the Changelog pin stays `1310`
(TASK-551-10-L02 closure only).

### M1 — L01 module split under the 1,000-line gate (HIGH, consumer imports)

`core/services/cache/serverCacheContracts.ts` exceeds the AGENTS.md
1,000-line cap, so L01 splits it into two new L01-owned modules. The FULL
relocated export sets are the ones enumerated in TASK-551-07-L01 C1(a)
(coherence module) and C1(b) (conditional-write module); the summary below is
not a substitute for those lists:

- `core/services/cache/serverCacheCoherence.ts` owns the coherence, health and
  invalidation-attempt seams plus the bounded invalidation event keys:
  `ServerCacheHealth`, the `ServerCacheCoherence*` family (including
  `ServerCacheCoherenceController` and `ServerCacheCoherenceSignal`), the
  `CacheInvalidationAttempt*` family and `isServerCacheEventKey`, and also
  `CacheCoherenceAffectedTags`, `CacheCoherenceGlobalSource`,
  `CacheCoherenceObservationToken`, `ServerCacheForcedBypassReason` and
  `ServerCacheBackendHealthInput`, plus every other name listed in L01 C1(a)
  (for example `CACHE_EVENT_KEY_PREFIX`, the `normalizeServerCache*`
  coherence normalizers, `validateServerCacheCoherenceSignal` and the two
  brand consts). `ProcessCacheCoherenceEpoch` stays in
  `serverCacheContracts.ts`.
- `core/services/cache/serverCacheConditionalWrite.ts` owns
  `CacheConditionalWriteEntry`, `createCacheConditionalWriteEntry`,
  `validateCacheInvalidationPlan`, `CacheInvalidationPlan`,
  `ServerCacheStoreDescription`, and also the `ServerCacheStore` interface,
  `CacheConditionalWrite` and `CacheConditionalWriteResult` (the full set is
  L01 C1(b)). `ServerCacheEnvelopeV1` stays in
  `serverCacheContracts.ts`.

Binding consumer rule: `serverCache.ts`, `memoryServerCacheStore.ts`,
`serverCacheTelemetry.ts` and both owned test files import every relocated
name from its owning module. `serverCacheContracts.ts` never re-exports them,
so an import of a relocated name through `serverCacheContracts.ts` is a type
error, not a compatibility path. The pseudocode references to the
`ServerCacheCoherenceController` (lines 178-193) and to
`createCacheConditionalWriteEntry` (line 142) resolve to these modules. The
Exclusive Ownership section at lines 25-37 is unchanged: this leaf writes neither
new module.

### M2 — New L01 test file in the l01-contract-vitest receipt (MEDIUM, body edited in place)

L01 adds `tests/vitest/cache/server-cache-coherence-conditional-write.test.ts`.
The Workflow Dispatch Envelope is the machine authority, so the body was
edited in place (not only amended here):

- `l01-contract-vitest` `argv` (line 668) and `positiveDiscovery.paths`
  (line 672): the new path is inserted after
  `tests/vitest/cache/server-cache-contracts.test.ts`.
  - before: `[..., "tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"]`
  - after: `[..., "tests/vitest/cache/server-cache-contracts.test.ts", "tests/vitest/cache/server-cache-coherence-conditional-write.test.ts", "tests/vitest/cache/server-cache-codec-keys.test.ts", "tests/vitest/cache/server-cache-eligibility.test.ts"]`
- `forbiddenPaths` (lines 630-651): gains the new test path (line 638) and,
  as a single-writer guard, `core/services/cache/serverCacheCoherence.ts`
  (line 641) and `core/services/cache/serverCacheConditionalWrite.ts`
  (line 642). It also gains the five remaining L01-owned modules
  `core/services/cache/serverCacheContracts.ts`, `serverCacheCodec.ts`,
  `serverCacheKeys.ts`, `serverCacheEligibility.ts` and `serverCacheConfig.ts`
  (all under `core/services/cache/`, lines 643-647), which this leaf only
  imports. Before, the list held 12 entries ending the L01 group at
  `tests/vitest/cache/server-cache-eligibility.test.ts`; after, it holds 20
  unique entries, disjoint from the allowlist.
- Prose receipt bash block (lines 591-596): the new path is added (line 594);
  see M3 for the command form.

Both vitest commands' `argv` were also edited in place to the env-free,
validator-legal form, because `bun run test:vitest` resolves to the root
`package.json` script that sources `.env`. Their test paths are unchanged:

- `memory-cache-vitest` `argv` (line 657):
  - before: `["bun", "run", "test:vitest", "--", "tests/vitest/cache/memory-server-cache-store.test.ts", "tests/vitest/cache/server-cache-coordinator.test.ts"]`
  - after: `["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/cache/memory-server-cache-store.test.ts", "tests/vitest/cache/server-cache-coordinator.test.ts"]`
- `l01-contract-vitest` `argv` (line 668):
  - before: `["bun", "run", "test:vitest", "--", <the four L01 test paths>]`
  - after: `["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", <the same four L01 test paths>]`

### M3 — Env-free command form for the L01 receipt prose (MEDIUM, body edited in place)

L01 repair R2 (2026-08-27) (L01 "R2 - validation gate made env-source-free") retired the
`bun run test:vitest` wrapper because the root `package.json` script sources
`.env`. The L01 receipt prose in Testing Requirements was edited in place.

Before:

```text
bun run test:vitest -- tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
```

After (lines 591-596):

```text
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null \
  node_modules/vitest/vitest.mjs run \
  tests/vitest/cache/server-cache-contracts.test.ts \
  tests/vitest/cache/server-cache-coherence-conditional-write.test.ts \
  tests/vitest/cache/server-cache-codec-keys.test.ts \
  tests/vitest/cache/server-cache-eligibility.test.ts
```

The same env-free form,
`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <files>`,
applies to this leaf's own `memory-cache-vitest` receipt, edited in place
(prose lines 587-590). Before: `bun run test:vitest --
tests/vitest/cache/memory-server-cache-store.test.ts
tests/vitest/cache/server-cache-coordinator.test.ts`. After: the env-free form
above over the same two files.

### M4 — Call-shape corrections (LOW, recorded; fenced pseudocode edited in place)

1. `createCacheConditionalWriteEntry` takes one 7-field object
   `{ policy, namespace, key, encodedEnvelope, fillKind, ttlMs,
   storeMaxEntryBytes }`. It is not a positional `(policy, ...)` call. Live
   source: `CreateConditionalWriteEntryInput` at
   `serverCacheContracts.ts:859-867` today, which moves to
   `serverCacheConditionalWrite.ts` under M1; see L01 C2. The prose at
   line 142 (`createCacheConditionalWriteEntry(policy,...)`) is outside a
   fence and is superseded by this shape. `namespace` is the active
   deployment namespace from `normalizeServerCacheConfig(env).namespace`.
2. `buildServerCacheKey` is synchronous: `buildServerCacheKey(input:
   BuildKeyInput): CacheKey` at `serverCacheKeys.ts:324`. `BuildKeyInput` is
   `{ namespace, family, schemaVersion, generationDigest, inputDigest }` at
   `serverCacheKeys.ts:286-292`. The fenced pseudocode was edited in place
   at lines 284-291.
   - before: `await buildServerCacheKey({ policy, input, generations:
     projectGenerations(generations, normalized.policy.tags) })`
   - after: a synchronous `buildServerCacheKey({ namespace: config.namespace,
     family, schemaVersion, generationDigest: digestGenerations(generations,
     normalized.policy.tags), inputDigest })`. `digestGenerations`
     (`serverCacheKeys.ts:433`) projects the snapshot onto the policy tags
     itself. `inputDigest` is `digestServerCacheInput(input)`
     (`serverCacheKeys.ts:238`), computed once during request normalization.
     The `buildCanonicalNonStoreBypassFinalKey` branch is unchanged.
   - The hit-path `expectedGenerationDigest` (fenced pseudocode lines
     312-315) follows the same shape. before: `await digestGenerations(
     projectGenerations(generations, normalized.policy.tags))`; after: the
     synchronous `digestGenerations(generations, normalized.policy.tags)`,
     byte-equal to the `generationDigest` used in the key above.
