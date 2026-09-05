/**
 * TASK-551-07-L01: backend-neutral typed server-cache contract surface.
 *
 * Sole authority for the strict policies, envelopes, keys, eligibility,
 * coherence/health shapes, conditional-write handoffs, invalidation plans and
 * distributed-load unions consumed by every memory and Redis implementation.
 * Contracts only: no store, adapter, coherence controller, lease coordinator,
 * outbox worker or public runtime lives here, nothing reads the environment,
 * opens a socket or touches a database.
 *
 * The only runtime dependency is `serverCacheCodec.decodeServerCacheEnvelope`
 * (needed by `createCacheConditionalWriteEntry`, which decodes before it trusts
 * bytes), so the graph stays acyclic: `eligibility -> keys -> contracts ->
 * codec`.
 *
 * Owned-surface note: the contract's "Exact Owned Surface" enumerates the
 * mandated symbols. Everything else exported here (the finite family/tag arrays
 * and their predicates, the error-code table and error class, the scalar
 * normalizers, `CacheGenerationEntry`, the coherence signal/token validators,
 * `createDistributedCacheLoadAcquireInput` and the invalidation plan validator)
 * is leaf-owned auxiliary surface: published so the leaf's own suites and the
 * downstream consuming leaves normalize through one authority instead of
 * re-deriving the bounds.
 *
 * Contract-repair note (brand visibility): the contract sketches the runtime
 * brands as module-private `declare const ... unique symbol`, but the sole proof
 * factory lives in `serverCacheEligibility.ts` and the companion/coordinator
 * factories are owned by downstream leaves, so a module-private symbol could
 * never cross that boundary. `validatedCacheEligibilityProof`,
 * `validatedCacheLoadCompanion`, `cacheInvalidationAttemptToken` and
 * `cacheCoherenceObservationToken` are therefore exported on purpose, while
 * `validatedConditionalWriteEntry` (whose only factory is in this file) is NOT.
 * An importer that can read these constants can also attach them, so a runtime
 * brand proves structural conformance, never authenticity: authenticity comes
 * from re-derivation -- a proof from `deriveCacheEligibilityProof`, an entry
 * from `createCacheConditionalWriteEntry` (which re-validates the key form,
 * every branded scalar and the envelope) and a token from the owning
 * coordinator factory, and no proof may be compared without the policy family
 * that produced it.
 */

import { decodeServerCacheEnvelope } from "./serverCacheCodec";

// --- Machine-readable failures -------------------------------------------------

/** Bounded, secret-free failure codes for every contract violation. */
export const SERVER_CACHE_CONTRACT_ERROR_CODES = {
  brandInvalid: "server_cache_contract_brand_invalid",
  familyInvalid: "server_cache_contract_family_invalid",
  tagInvalid: "server_cache_contract_tag_invalid",
  conditionalEntryInvalid: "server_cache_conditional_entry_invalid",
  stableCodeInvalid: "server_cache_health_stable_code_invalid",
  pendingAgeInvalid: "server_cache_health_pending_age_invalid",
  epochInvalid: "server_cache_coherence_epoch_invalid",
  affectedTagsInvalid: "server_cache_coherence_affected_tags_invalid",
  affectedFamiliesInvalid: "server_cache_coherence_affected_families_invalid",
  signalInvalid: "server_cache_coherence_signal_invalid",
  tokenInvalid: "server_cache_coherence_token_invalid",
  planInvalid: "server_cache_invalidation_plan_invalid",
  distributedBoundsInvalid: "server_cache_distributed_bounds_invalid",
} as const;

const CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;

/** Typed failure carrying only its machine-readable code. */
export class ServerCacheContractError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ServerCacheContractError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new ServerCacheContractError(code);
}

// --- Finite family/tag unions (unknown or variable-suffixed forms fail closed) --
//
// Frozen at runtime: a fail-closed union must not depend on importer discipline,
// because the eligibility factory, `maxServerCacheKeyBytes` and the affected
// family bound all read these arrays live.

export const CACHE_FAMILIES = Object.freeze([
  "public-runtime",
  "public-html-manifest",
  "public-html",
  "redirects",
  "site-shell",
  "pages",
  "entries",
  "posts",
  "listings",
  "forms",
  "public-settings",
  "themes",
  "security-settings-generation",
] as const);

export type CacheFamily = (typeof CACHE_FAMILIES)[number];

const FAMILY_SET: ReadonlySet<string> = new Set<string>(CACHE_FAMILIES);

export function isCacheFamily(value: unknown): value is CacheFamily {
  return typeof value === "string" && FAMILY_SET.has(value);
}

export const CACHE_TAGS = Object.freeze([
  "site:all",
  "site:runtime",
  "site:html",
  "site:redirects",
  "site:shell",
  "site:pages",
  "site:entries",
  "site:posts",
  "site:listings",
  "site:forms",
  "site:settings",
  "site:themes",
  "settings:security",
] as const);

export type CacheTag = (typeof CACHE_TAGS)[number];

const TAG_SET: ReadonlySet<string> = new Set<string>(CACHE_TAGS);

export function isCacheTag(value: unknown): value is CacheTag {
  return typeof value === "string" && TAG_SET.has(value);
}

export type ServerCacheBackend = "memory" | "redis";

// --- Runtime brand keys ---------------------------------------------------------
//
// Each is a real `unique symbol` constant, which makes the brand unforgeable
// through structural typing: no bare cast or look-alike object literal can
// satisfy the branded type. See the header contract-repair note for which of
// these must be exported and why.

export const validatedCacheEligibilityProof: unique symbol = Symbol(
  "coderso.server-cache.validatedCacheEligibilityProof"
);
const validatedConditionalWriteEntry: unique symbol = Symbol(
  "coderso.server-cache.validatedConditionalWriteEntry"
);
export const validatedCacheLoadCompanion: unique symbol = Symbol(
  "coderso.server-cache.validatedCacheLoadCompanion"
);
export const cacheInvalidationAttemptToken: unique symbol = Symbol(
  "coderso.server-cache.cacheInvalidationAttemptToken"
);
export const cacheCoherenceObservationToken: unique symbol = Symbol(
  "coderso.server-cache.cacheCoherenceObservationToken"
);

// --- Normalized opaque scalars --------------------------------------------------

/** Integer `0..Number.MAX_SAFE_INTEGER`. */
export type UnixTimeMs = number & { readonly __unixTimeMs: unique symbol };

/** Opaque lowercase 32-hex-character cryptographic generation token. */
export type CacheGenerationToken = string & { readonly __cacheGenerationToken: "lowercase-32-hex" };

/** Opaque lowercase 64-hex SHA-256 generation digest. */
export type CacheGenerationDigest = string & {
  readonly __cacheGenerationDigest: "lowercase-64-hex";
};

/** Negative cache duration in milliseconds; v1 accepts integer `5_000..15_000`. */
export type NegativeCacheTtlMs = number & { readonly __negativeCacheTtlMs: "5_000..15_000" };

/** Opaque envelope/policy schema version; accepted range `1..2_147_483_647`. */
export type CacheSchemaVersion = number & { readonly __cacheSchemaVersion: unique symbol };

/** Opaque positive policy TTL; accepted range `1..3_600_000` ms. */
export type PositiveCacheTtlMs = number & { readonly __positiveCacheTtlMs: unique symbol };

/**
 * Opaque per-entry byte limit; accepted range `1..16_777_216` bytes and always
 * within the normalized store per-entry ceiling.
 */
export type CacheValueByteLimit = number & { readonly __cacheValueByteLimit: unique symbol };

/** Process-local monotonically increasing safe-integer coherence epoch. */
export type ProcessCacheCoherenceEpoch = number & {
  readonly __processCacheCoherenceEpoch: unique symbol;
};

/** Final materialized key (see `serverCacheKeys.buildServerCacheKey`). */
export type CacheKey = string & { readonly __serverCacheKey: "coderso-server-cache-v1" };

const LOWERCASE_HEX_32_PATTERN = /^[0-9a-f]{32}$/;
const LOWERCASE_SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function isValidLowercaseHex32(value: unknown): boolean {
  return typeof value === "string" && LOWERCASE_HEX_32_PATTERN.test(value);
}

export function isValidLowercaseSha256Hex(value: unknown): boolean {
  return typeof value === "string" && LOWERCASE_SHA256_PATTERN.test(value);
}

// --- Shared code-owned limits ---------------------------------------------------

export const SERVER_CACHE_LIMITS = Object.freeze({
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
  ttlJitterMinRatio: 0.9,
  ttlJitterMaxRatio: 1.0,
});

const LIMITS = SERVER_CACHE_LIMITS;

// --- Normalizers ----------------------------------------------------------------

function brandedInteger(value: unknown, min: number, max: number, code: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(code);
  }
  return value;
}

/** Binds one branded integer range to its owning failure code. */
function bounded<Brand>(min: number, max: number, code: string) {
  return (value: unknown): Brand => brandedInteger(value, min, max, code) as Brand;
}

export const normalizeUnixTimeMs = bounded<UnixTimeMs>(
  0,
  Number.MAX_SAFE_INTEGER,
  CODES.brandInvalid
);

export const normalizeCacheSchemaVersion = bounded<CacheSchemaVersion>(
  LIMITS.minSchemaVersion,
  LIMITS.maxSchemaVersion,
  CODES.brandInvalid
);

export const normalizePositiveCacheTtlMs = bounded<PositiveCacheTtlMs>(
  LIMITS.minPolicyTtlMs,
  LIMITS.maxPolicyTtlMs,
  CODES.brandInvalid
);

/**
 * Validates a byte limit against the absolute policy ceiling; whether it also
 * fits the deployed store ceiling is decided by the policy factory and by
 * `assertMandatoryPolicyCapacity`.
 */
export const normalizeCacheValueByteLimit = bounded<CacheValueByteLimit>(
  LIMITS.minPolicyValueBytes,
  LIMITS.maxPolicyValueBytes,
  CODES.brandInvalid
);

export const normalizeProcessCacheCoherenceEpoch = bounded<ProcessCacheCoherenceEpoch>(
  0,
  Number.MAX_SAFE_INTEGER,
  CODES.epochInvalid
);

export const normalizeDistributedCacheLeaseMs = bounded<DistributedCacheLeaseMs>(
  LIMITS.minDistributedLeaseMs,
  LIMITS.maxDistributedLeaseMs,
  CODES.distributedBoundsInvalid
);

export const normalizeDistributedCacheWaitMs = bounded<DistributedCacheWaitMs>(
  LIMITS.minDistributedWaitMs,
  LIMITS.maxDistributedWaitMs,
  CODES.distributedBoundsInvalid
);

export const normalizeDistributedCachePollMs = bounded<DistributedCachePollMs>(
  LIMITS.minDistributedPollMs,
  LIMITS.maxDistributedPollMs,
  CODES.distributedBoundsInvalid
);

export function normalizeCacheGenerationToken(value: unknown): CacheGenerationToken {
  if (!isValidLowercaseHex32(value)) fail(CODES.brandInvalid);
  return value as CacheGenerationToken;
}

export function normalizeCacheGenerationDigest(value: unknown): CacheGenerationDigest {
  if (!isValidLowercaseSha256Hex(value)) fail(CODES.brandInvalid);
  return value as CacheGenerationDigest;
}

/**
 * `null` is the only non-numeric value the domain admits: a policy whose
 * `negativeTtlMs` field is missing (`undefined`) is malformed, not
 * negative-free, and fails closed instead of silently authorizing no negative
 * fill.
 */
export function normalizeNegativeCacheTtlMs(value: unknown): NegativeCacheTtlMs | null {
  if (value === null) return null;
  return brandedInteger(value, 5_000, 15_000, CODES.brandInvalid) as NegativeCacheTtlMs;
}

// --- Eligibility context and proof ---------------------------------------------

export type CacheEligibilityFieldDigest = string & {
  readonly __cacheEligibilityFieldDigest: "lowercase-64-hex";
};

export type CacheEligibilityContext = Readonly<{
  access: "public_anonymous" | "authenticated" | "private" | "password" | "unknown";
  renderMode: "public" | "preview" | "draft" | "unknown";
  sensitiveDependency: "absent" | "nonce" | "request_scoped" | "unknown";
  queryVariant:
    | Readonly<{ kind: "known_bounded"; digest: CacheEligibilityFieldDigest }>
    | Readonly<{ kind: "unknown" }>;
  responseDisposition: "positive_candidate" | "public_negative_candidate" | "unknown";
  mutableVisibilityGate:
    | "not_required"
    | Readonly<{ state: "strictly_public"; versionToken: CacheEligibilityFieldDigest }>;
}>;

export type CacheShareScopeDigest = string & {
  readonly __cacheShareScopeDigest: "lowercase-64-hex";
};

/**
 * Proof returned solely by `serverCacheEligibility.deriveCacheEligibilityProof`;
 * a missing, unbranded or foreign proof can never enter the fill-attempt
 * registry, read a value, acquire a lease or fill either backend.
 */
export type CacheEligibilityProof = Readonly<{
  shareScopeDigest: CacheShareScopeDigest;
  negativeFill: "forbid" | "eligible";
  readonly [validatedCacheEligibilityProof]: true;
}>;

export type CachePolicy<T> = {
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  ttlMs: PositiveCacheTtlMs;
  maxValueBytes: CacheValueByteLimit;
  tags: readonly CacheTag[];
  negativeTtlMs: null | NegativeCacheTtlMs;
  /** v1 never serves an expired/SWR value. */
  stalePolicy: "forbid";
  decode: (input: unknown) => T;
  isEligible: (context: CacheEligibilityContext) => CacheEligibilityProof | null;
};

// --- Generations ----------------------------------------------------------------

export type CacheGenerationEntry = Readonly<{ tag: CacheTag; token: CacheGenerationToken }>;

/** Canonical (tag-sorted, deduplicated) generation snapshot. */
export type CacheGenerations = readonly [CacheGenerationEntry, ...CacheGenerationEntry[]];

// --- Coherence, health and invalidation seams -----------------------------------

export type ServerCacheForcedBypassReason =
  "redis_unavailable" | "outbox_lag" | "local_incoherence";

export type ServerCacheCoherence =
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

export type ServerCacheHealth = Readonly<{
  backend: ServerCacheBackend;
  readiness: "ready" | "degraded";
  coherence: ServerCacheCoherence;
  stableCode: null | string;
}>;

export type CacheCoherenceAffectedTags = "all" | readonly [CacheTag, ...CacheTag[]];

export type CacheCoherenceGlobalSource = "memory_store" | "redis_store" | "outbox_worker";

export type CacheInvalidationAttemptToken = Readonly<{
  eventKey: string;
  sequence: number;
  readonly [cacheInvalidationAttemptToken]: true;
}>;

export type CacheInvalidationAttemptRegistration =
  | Readonly<{ kind: "registered"; token: CacheInvalidationAttemptToken }>
  | Readonly<{ kind: "saturated" }>;

export type CacheCoherenceObservationToken = Readonly<{
  source: CacheCoherenceGlobalSource;
  sequence: number;
  readonly [cacheCoherenceObservationToken]: true;
}>;

export type ServerCacheCoherenceSignal =
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

export type ServerCacheBackendHealthInput = Readonly<{
  backend: ServerCacheBackend;
  readiness: "ready" | "degraded";
  stableCode: null | string;
}>;

export interface ServerCacheCoherenceController {
  registerPolicy(input: Readonly<{ family: CacheFamily; tags: readonly CacheTag[] }>): void;
  beginObservation(source: CacheCoherenceGlobalSource): CacheCoherenceObservationToken;
  beginInvalidationAttempt(
    input: Readonly<{
      eventKey: string;
      affectedTags: CacheCoherenceAffectedTags;
    }>
  ): CacheInvalidationAttemptRegistration;
  settleInvalidationAttempt(token: CacheInvalidationAttemptToken): void;
  report(signal: ServerCacheCoherenceSignal): void;
  currentEpoch(family: CacheFamily): ProcessCacheCoherenceEpoch;
  snapshot(): ServerCacheCoherence;
  health(input: ServerCacheBackendHealthInput): ServerCacheHealth;
}

// --- Bounded invalidation event keys --------------------------------------------

export const CACHE_EVENT_KEY_PREFIX = "cache-event:";

const CACHE_EVENT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Accepts only the internal `cache-event:<uuid>` form inside
 * `SERVER_CACHE_LIMITS.maxEventKeyBytes`; raw record ids, slugs and paths are
 * never valid event identities.
 */
export function isServerCacheEventKey(value: unknown): boolean {
  if (typeof value !== "string" || !value.startsWith(CACHE_EVENT_KEY_PREFIX)) return false;
  if (!CACHE_EVENT_UUID_PATTERN.test(value.slice(CACHE_EVENT_KEY_PREFIX.length))) return false;
  return Buffer.byteLength(value, "utf8") <= SERVER_CACHE_LIMITS.maxEventKeyBytes;
}

const STABLE_CODE_PATTERN = /^[a-z0-9_]+$/;

/** `null` or 1–64 ASCII `[a-z0-9_]` bytes. */
export function normalizeServerCacheStableCode(value: unknown): null | string {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    Buffer.byteLength(value, "utf8") > SERVER_CACHE_LIMITS.maxHealthStableCodeBytes ||
    !STABLE_CODE_PATTERN.test(value)
  ) {
    fail(CODES.stableCodeInvalid);
  }
  return value;
}

/**
 * Fails closed on non-finite, negative or fractional ages -- the contract types
 * `oldestPendingAgeMs` as a finite integer, so coercion would silently corrupt
 * the telemetry it reports -- and caps integer telemetry at
 * `maxHealthPendingAgeMs`; a pending age cannot reject a healthy window.
 */
export function normalizeServerCacheOldestPendingAgeMs(value: unknown): null | number {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(CODES.pendingAgeInvalid);
  }
  return Math.min(value, SERVER_CACHE_LIMITS.maxHealthPendingAgeMs);
}

/** Canonical tag/family ordering shared with `serverCacheKeys`. */
function byUtf8Bytes(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

/**
 * Rejects duplicates, then sorts canonically; empty, over-limit, unknown-tag
 * or duplicate input fails.
 */
export function normalizeServerCacheAffectedTags(
  tags: readonly CacheTag[]
): CacheCoherenceAffectedTags {
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > SERVER_CACHE_LIMITS.maxTags) {
    fail(CODES.affectedTagsInvalid);
  }
  for (const tag of tags) {
    if (!isCacheTag(tag)) fail(CODES.affectedTagsInvalid);
  }
  const sorted = [...new Set<string>(tags)].sort(byUtf8Bytes);
  if (sorted.length !== tags.length) fail(CODES.affectedTagsInvalid);
  return Object.freeze(sorted) as CacheCoherenceAffectedTags;
}

/**
 * Deduplicates and sorts families; an empty mapping degrades to `"all"`
 * fail-closed, matching the `"all"`/`site:all` escalation rule.
 */
export function normalizeServerCacheAffectedFamilies(
  families: "all" | readonly CacheFamily[]
): "all" | readonly CacheFamily[] {
  if (families === "all") return "all";
  if (!Array.isArray(families) || families.length > CACHE_FAMILIES.length) {
    fail(CODES.affectedFamiliesInvalid);
  }
  const listed = families as readonly CacheFamily[];
  for (const family of listed) {
    if (!isCacheFamily(family)) fail(CODES.affectedFamiliesInvalid);
  }
  if (listed.length === 0) return "all"; // unrecognized empty mapping degrades
  return Object.freeze([...new Set<string>(listed)].sort(byUtf8Bytes)) as readonly CacheFamily[];
}

/** Safe non-negative integer shared by monotonic clocks and token sequences. */
function normalizeSequence(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(CODES.tokenInvalid);
  }
  return value;
}

const SIGNAL_FIELD_SETS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  force: [
    "affectedTags",
    "kind",
    "observationToken",
    "observedAtMonotonicMs",
    "oldestPendingAgeMs",
    "reason",
    "source",
    "stableCode",
  ],
  recover: [
    "affectedTags",
    "kind",
    "observationToken",
    "observedAtMonotonicMs",
    "oldestPendingAgeMs",
    "source",
    "stableCode",
  ],
  invalidation_observed: [
    "affectedTags",
    "eventKey",
    "kind",
    "observedAtMonotonicMs",
    "oldestPendingAgeMs",
    "source",
    "stableCode",
  ],
  post_commit_failed: [
    "affectedTags",
    "attemptToken",
    "eventKey",
    "kind",
    "observedAtMonotonicMs",
    "source",
    "stableCode",
  ],
  durable_invalidation_processed: [
    "affectedTags",
    "eventKey",
    "kind",
    "observedAtMonotonicMs",
    "source",
    "stableCode",
  ],
});

/**
 * Exact-field membership uses `Object.hasOwn`, never `in`: a single
 * `Object.prototype` pollution would otherwise satisfy a missing own field and
 * turn an exact-field gate into a pass-through that accepts smuggled payload.
 */
function assertExactFields(target: object, fields: readonly string[], code: string): void {
  const actual = Object.keys(target);
  if (actual.length !== fields.length) fail(code);
  for (const field of fields) {
    if (!Object.hasOwn(target, field)) fail(code);
  }
}

function assertExactSignalFields(kind: string, signal: object): void {
  const expected = SIGNAL_FIELD_SETS[kind];
  if (expected === undefined) fail(CODES.signalInvalid);
  assertExactFields(signal, expected, CODES.signalInvalid);
  // `Object.keys` ignores symbol-keyed properties, so a signal carrying
  // smuggled data under a symbol key would otherwise pass the exact-field
  // check. Signals own no symbol keys at all.
  if (Object.getOwnPropertySymbols(signal).length !== 0) fail(CODES.signalInvalid);
}

/** Recursively rejects unknown fields and out-of-bounds signal payloads. */
export function validateServerCacheCoherenceSignal(
  signal: ServerCacheCoherenceSignal
): ServerCacheCoherenceSignal {
  assertExactSignalFields(String(signal.kind), signal);
  switch (signal.kind) {
    case "force":
    case "recover": {
      // The discriminated union fixes nullability per branch: a failure fence
      // always carries a code and a recovery never does, so a reporter cannot
      // push a null-code fence or an authoritative-looking code onto the
      // wrong branch.
      if (
        signal.kind === "force" ? typeof signal.stableCode !== "string" : signal.stableCode !== null
      ) {
        fail(CODES.signalInvalid);
      }
      normalizeServerCacheStableCode(signal.stableCode);
      normalizeSequence(signal.observedAtMonotonicMs);
      normalizeServerCacheOldestPendingAgeMs(signal.oldestPendingAgeMs);
      assertBrandedObservationToken(signal.observationToken);
      return signal;
    }
    case "invalidation_observed":
    case "durable_invalidation_processed": {
      if (signal.kind === "invalidation_observed") {
        if (signal.source !== "local_post_commit" && signal.source !== "pubsub") {
          fail(CODES.signalInvalid);
        }
      } else if (signal.source !== "outbox_worker") {
        fail(CODES.signalInvalid);
      }
      if (!isServerCacheEventKey(signal.eventKey)) fail(CODES.signalInvalid);
      normalizeSequence(signal.observedAtMonotonicMs);
      // Both branches are recovery-shaped: `stableCode` is exactly `null`.
      if (signal.stableCode !== null) fail(CODES.signalInvalid);
      if (signal.kind === "invalidation_observed") {
        normalizeServerCacheOldestPendingAgeMs(signal.oldestPendingAgeMs);
      }
      return signal;
    }
    case "post_commit_failed": {
      if (signal.source !== "post_commit") fail(CODES.signalInvalid);
      if (!isServerCacheEventKey(signal.eventKey)) fail(CODES.signalInvalid);
      assertBrandedAttemptToken(signal.attemptToken);
      normalizeSequence(signal.observedAtMonotonicMs);
      // A failed post-commit always carries its failure code.
      if (typeof signal.stableCode !== "string") fail(CODES.signalInvalid);
      normalizeServerCacheStableCode(signal.stableCode);
      return signal;
    }
    default:
      fail(CODES.signalInvalid);
  }
}

/**
 * Rejects a token whose own property set is wider than the branded shape:
 * extra enumerable fields and any symbol key beyond the brand itself are
 * smuggled payload, not conformance.
 */
function assertExactTokenFields(token: object, fields: readonly string[]): void {
  assertExactFields(token, fields, CODES.tokenInvalid);
  if (Object.getOwnPropertySymbols(token).length !== 1) fail(CODES.tokenInvalid);
}

/** Runtime conformance guard for observation tokens. */
export function assertBrandedObservationToken(
  token: CacheCoherenceObservationToken
): CacheCoherenceObservationToken {
  if (
    typeof token !== "object" ||
    token === null ||
    token[cacheCoherenceObservationToken] !== true ||
    !(
      token.source === "memory_store" ||
      token.source === "redis_store" ||
      token.source === "outbox_worker"
    )
  ) {
    fail(CODES.tokenInvalid);
  }
  assertExactTokenFields(token, ["source", "sequence"]);
  normalizeSequence(token.sequence);
  return token;
}

/** Runtime conformance guard for invalidation attempt tokens. */
export function assertBrandedAttemptToken(
  token: CacheInvalidationAttemptToken
): CacheInvalidationAttemptToken {
  if (
    typeof token !== "object" ||
    token === null ||
    token[cacheInvalidationAttemptToken] !== true
  ) {
    fail(CODES.tokenInvalid);
  }
  if (!isServerCacheEventKey(token.eventKey)) fail(CODES.tokenInvalid);
  assertExactTokenFields(token, ["eventKey", "sequence"]);
  normalizeSequence(token.sequence);
  return token;
}

// --- Envelope record and conditional-write handoff ------------------------------

export type ServerCacheEnvelopeV1 = {
  schema: "coderso.server-cache-envelope@v1";
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  fillKind: "positive" | "negative";
  writtenAtUnixMs: UnixTimeMs;
  expiresAtUnixMs: UnixTimeMs;
  generationDigest: CacheGenerationDigest;
  value: unknown;
};

/**
 * Producer-validated conditional-write entry. Only
 * `createCacheConditionalWriteEntry` manufactures it; neither callers nor
 * stores can mint the brand, and a brand never substitutes for the store-side
 * recheck.
 */
export type CacheConditionalWriteEntry = Readonly<{
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  fillKind: "positive" | "negative";
  ttlMs: PositiveCacheTtlMs;
  policyPositiveTtlMs: PositiveCacheTtlMs;
  policyNegativeTtlMs: NegativeCacheTtlMs | null;
  policyMaxValueBytes: CacheValueByteLimit;
  readonly [validatedConditionalWriteEntry]: true;
}>;

export type CacheConditionalWrite = {
  expectedGenerations: CacheGenerations;
  tags: readonly CacheTag[];
  entries:
    | readonly [CacheConditionalWriteEntry]
    | readonly [CacheConditionalWriteEntry, CacheConditionalWriteEntry];
};

export type CacheConditionalWriteResult =
  | Readonly<{ kind: "written" }>
  | Readonly<{ kind: "generation_changed" }>
  | Readonly<{ kind: "unknown"; physicalOutcome: "unknown"; stableCode: string }>;

export type ServerCacheStoreDescription = Readonly<{
  backend: ServerCacheBackend;
  maxEntryBytes: CacheValueByteLimit;
}>;

export interface ServerCacheStore {
  describe(): ServerCacheStoreDescription;
  get(key: CacheKey): Promise<Uint8Array | null>;
  delete(key: CacheKey): Promise<void>;
  readGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  bumpGenerations(tags: readonly CacheTag[]): Promise<CacheGenerations>;
  writeIfGenerationsMatch(input: CacheConditionalWrite): Promise<CacheConditionalWriteResult>;
  health(): Promise<ServerCacheHealth>;
  close(): Promise<void>;
}

function rejectConditionalEntry(): never {
  fail(CODES.conditionalEntryInvalid);
}

/**
 * Branded scalars are re-normalized at this enforcement point: a brand never
 * substitutes for the numeric checks. Each helper funnels through the owning
 * normalizer above and maps any failure onto
 * `server_cache_conditional_entry_invalid`, so an exported boundary never
 * leaks a second error code or dereferences a malformed scalar.
 */
function entryScalar<T>(normalize: (value: unknown) => T, value: unknown): T {
  try {
    return normalize(value);
  } catch {
    return rejectConditionalEntry();
  }
}

/**
 * Exact factory input; consumed only by the `ServerCache` runtime. The
 * deployment `namespace` is required because the key's namespace segment is the
 * shared-store isolation boundary and cannot be derived from the policy.
 */
type CreateConditionalWriteEntryInput = Readonly<{
  policy: CachePolicy<unknown>;
  namespace: string;
  key: CacheKey;
  encodedEnvelope: Uint8Array;
  fillKind: "positive" | "negative";
  ttlMs: PositiveCacheTtlMs;
  storeMaxEntryBytes: CacheValueByteLimit;
}>;

/**
 * Key-form gate for the conditional-write handoff.
 *
 * `serverCacheKeys.buildServerCacheKey` is the only legal producer of a
 * `CacheKey`, but the brand is compile-time only, so the factory re-checks the
 * exact v1 shape instead of trusting it. This module cannot import
 * `isWellFormedServerCacheKey` (`serverCacheKeys` consumes contract values, so
 * the reverse import would close the cycle), which is why the shape is restated
 * here and pinned to the builder by the leaf suite:
 * `coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<64hex>:<64hex>`.
 * A key from another deployment's namespace, a foreign family or another schema
 * version can therefore never be certified for this policy.
 */
const ENTRY_NAMESPACE_PATTERN = /^[A-Za-z0-9._-]+$/;
const ENTRY_NAMESPACE_EDGE_PATTERN = /^[._-]|[._-]$/;
const ENTRY_KEY_SHAPE_PATTERN =
  /^coderso:([A-Za-z0-9._-]+):server-cache:v1:([A-Za-z0-9-]+):sv([0-9]+):([0-9a-f]{64}):([0-9a-f]{64})$/;

function entryKeyForm(key: string, input: CreateConditionalWriteEntryInput): boolean {
  const match = ENTRY_KEY_SHAPE_PATTERN.exec(key);
  if (match === null) return false;
  const namespace = match[1] as string;
  // Mirrors `normalizeNamespace` in `serverCacheConfig.ts` (1..128 ASCII
  // `[A-Za-z0-9._-]`, no leading/trailing separator), the rule the key builder
  // itself enforces before minting a key.
  if (
    namespace !== input.namespace ||
    namespace.length < 1 ||
    namespace.length > 128 ||
    ENTRY_NAMESPACE_PATTERN.test(namespace) === false ||
    ENTRY_NAMESPACE_EDGE_PATTERN.test(namespace)
  ) {
    return false;
  }
  if ((match[2] as string) !== input.policy.family) return false;
  return (match[3] as string) === String(input.policy.schemaVersion);
}

/**
 * Decodes the supplied envelope strictly against the supplied policy,
 * re-validates the key form and records the normalized TTL ceilings for the
 * entry's own `fillKind`. Rejects any mismatch before a store command can
 * exist; raises `server_cache_conditional_entry_invalid` instead of returning a
 * partial entry.
 */
export function createCacheConditionalWriteEntry(
  input: CreateConditionalWriteEntryInput
): CacheConditionalWriteEntry {
  // Shape guards run before any dereference, so a non-string key, a null
  // policy or an out-of-range branded scalar surfaces as the machine-readable
  // code above instead of a raw TypeError echoing runtime values.
  const candidate = input as unknown;
  if (typeof candidate !== "object" || candidate === null) return rejectConditionalEntry();
  const request = candidate as Partial<CreateConditionalWriteEntryInput>;
  const policyCandidate: unknown = request.policy;
  if (typeof policyCandidate !== "object" || policyCandidate === null)
    return rejectConditionalEntry();
  const policy = policyCandidate as CachePolicy<unknown>;
  if (
    typeof request.namespace !== "string" ||
    typeof request.key !== "string" ||
    !(request.encodedEnvelope instanceof Uint8Array) ||
    (request.fillKind !== "positive" && request.fillKind !== "negative")
  ) {
    return rejectConditionalEntry();
  }

  const keyBytes = Buffer.byteLength(request.key, "utf8");
  if (keyBytes > SERVER_CACHE_LIMITS.maxKeyBytes) return rejectConditionalEntry();
  if (!entryKeyForm(request.key, request as CreateConditionalWriteEntryInput)) {
    return rejectConditionalEntry();
  }

  // Re-normalized policy and input scalars; recorded verbatim on the entry.
  const policyPositiveTtlMs = entryScalar(normalizePositiveCacheTtlMs, policy.ttlMs);
  const policyNegativeTtlMs = entryScalar(normalizeNegativeCacheTtlMs, policy.negativeTtlMs);
  const policyMaxValueBytes = entryScalar(normalizeCacheValueByteLimit, policy.maxValueBytes);
  const storeMaxEntryBytes = entryScalar(normalizeCacheValueByteLimit, request.storeMaxEntryBytes);
  const entryTtlMs = entryScalar(normalizePositiveCacheTtlMs, request.ttlMs);

  const decoded = decodeServerCacheEnvelope(
    request.encodedEnvelope,
    policy,
    // Entry creation judges the written lifetime itself; wall-clock expiry is
    // a read-side concern and must not reject a freshly encoded bundle.
    { enforceExpiry: false }
  );
  if (!decoded.ok) return rejectConditionalEntry();
  const envelope = decoded.envelope;
  if (envelope.fillKind !== request.fillKind) return rejectConditionalEntry();

  // The negative ceiling comes from the policy only; it never falls back to the
  // positive TTL for a negative entry.
  const selectedCeiling =
    request.fillKind === "positive"
      ? policyPositiveTtlMs
      : policyNegativeTtlMs === null
        ? -1
        : policyNegativeTtlMs;

  const lifetimeMs = envelope.expiresAtUnixMs - envelope.writtenAtUnixMs;
  const totalBytes = keyBytes + request.encodedEnvelope.byteLength;
  const malformed =
    entryTtlMs > selectedCeiling ||
    lifetimeMs < 1 ||
    lifetimeMs > selectedCeiling ||
    request.encodedEnvelope.byteLength > policyMaxValueBytes ||
    totalBytes > storeMaxEntryBytes;
  if (malformed) return rejectConditionalEntry();

  const entry: CacheConditionalWriteEntry = {
    key: request.key,
    encodedEnvelope: request.encodedEnvelope,
    fillKind: request.fillKind,
    ttlMs: entryTtlMs,
    policyPositiveTtlMs,
    policyNegativeTtlMs,
    policyMaxValueBytes,
    [validatedConditionalWriteEntry]: true,
  };
  return Object.freeze(entry);
}

export type CacheInvalidationPlan = { eventKey: string; tags: readonly CacheTag[] };

/**
 * Runtime gate for the plan that crosses the cache/outbox boundary: it accepts
 * exactly `eventKey` and a canonical, deduplicated, finite tag set and rejects
 * every other field -- record ids, slugs, paths, raw or digested identity tags,
 * query input, domain payload and symbol-keyed extras -- with
 * `server_cache_invalidation_plan_invalid`. Domain old/new identity analysis
 * selects and deduplicates the tags before the plan reaches this boundary.
 */
export function validateCacheInvalidationPlan(plan: CacheInvalidationPlan): CacheInvalidationPlan {
  const candidate = plan as unknown;
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return fail(CODES.planInvalid);
  }
  const record = candidate as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !Object.hasOwn(record, "eventKey") ||
    !Object.hasOwn(record, "tags") ||
    Object.getOwnPropertySymbols(record).length !== 0
  ) {
    return fail(CODES.planInvalid);
  }
  if (typeof record.eventKey !== "string" || !isServerCacheEventKey(record.eventKey)) {
    return fail(CODES.planInvalid);
  }
  const tags = record.tags;
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > SERVER_CACHE_LIMITS.maxTags) {
    return fail(CODES.planInvalid);
  }
  const seenTags = new Set<string>();
  for (const tag of tags) {
    if (!isCacheTag(tag) || seenTags.has(tag)) return fail(CODES.planInvalid);
    seenTags.add(tag);
  }
  return plan;
}

// --- Typed loader-result seam ---------------------------------------------------

/** Manufactured only by `ServerCacheLoadContext.companion(...)`. */
export type CacheLoadCompanion = Readonly<{
  policy: CachePolicy<unknown>;
  input: unknown;
  context: CacheEligibilityContext;
  value: unknown;
  readonly [validatedCacheLoadCompanion]: true;
}>;

export type ServerCacheLoadTrigger =
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

export interface ServerCacheLoadContext {
  trigger: ServerCacheLoadTrigger;
  companion<T>(
    input: Readonly<{
      policy: CachePolicy<T>;
      input: unknown;
      context: CacheEligibilityContext;
      value: T;
    }>
  ): CacheLoadCompanion;
}

export type ServerCacheNoFillReason =
  "response_not_cacheable" | "cache_excluded_dependency" | "authoritative_only";

export type ServerCacheLoaderResult<TCached, TResult> =
  | Readonly<{ kind: "no_fill"; returnValue: TResult; reason: ServerCacheNoFillReason }>
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

export type ServerCacheLoadRequest<TCached, TResult> = Readonly<{
  policy: CachePolicy<TCached>;
  input: unknown;
  context: CacheEligibilityContext;
  fillFenceTags: readonly CacheTag[];
  resolveCached: (value: TCached) => Promise<TResult>;
  loader: (context: ServerCacheLoadContext) => Promise<ServerCacheLoaderResult<TCached, TResult>>;
}>;

// --- Distributed load coordination (contracts only; owners implement) -----------

export type DistributedCacheLeaseMs = number & { readonly __distributedLeaseMs: unique symbol };
export type DistributedCacheWaitMs = number & { readonly __distributedWaitMs: unique symbol };
export type DistributedCachePollMs = number & { readonly __distributedPollMs: unique symbol };

export type DistributedCacheLoadAcquireInput = Readonly<{
  key: CacheKey;
  leaseMs: DistributedCacheLeaseMs;
  waitMs: DistributedCacheWaitMs;
  pollMinMs: DistributedCachePollMs;
  pollMaxMs: DistributedCachePollMs;
}>;

export type DistributedCacheLoadWaitResult =
  | Readonly<{ kind: "value"; bytes: Uint8Array }>
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "unavailable"; stableCode: string }>;

export type DistributedCacheOwnedWriteResult =
  | Readonly<{ kind: "written" }>
  | Readonly<{ kind: "generation_changed" }>
  | Readonly<{ kind: "lease_lost" }>
  | Readonly<{ kind: "unavailable"; physicalOutcome: "unknown"; stableCode: string }>;

export type DistributedCacheLoadAcquireResult =
  | Readonly<{
      kind: "owner";
      renew: () => Promise<"renewed" | "lost" | "unknown">;
      putIfGenerationsAndLeaseOwned: (
        input: CacheConditionalWrite
      ) => Promise<DistributedCacheOwnedWriteResult>;
      release: () => Promise<"released" | "lost" | "unknown">;
    }>
  | Readonly<{ kind: "waiter"; waitForValue: () => Promise<DistributedCacheLoadWaitResult> }>
  | Readonly<{ kind: "bypass"; reason: "transport_unavailable" | "closed"; stableCode: string }>;

export interface DistributedCacheLoadCoordinator {
  acquire(input: DistributedCacheLoadAcquireInput): Promise<DistributedCacheLoadAcquireResult>;
  close(): Promise<void>;
}

/** Builds the acquire input, enforcing `pollMinMs <= pollMaxMs` plus all ranges. */
export function createDistributedCacheLoadAcquireInput(
  input: Readonly<{
    key: CacheKey;
    leaseMs: DistributedCacheLeaseMs;
    waitMs: DistributedCacheWaitMs;
    pollMinMs: DistributedCachePollMs;
    pollMaxMs: DistributedCachePollMs;
  }>
): DistributedCacheLoadAcquireInput {
  const leaseMs = normalizeDistributedCacheLeaseMs(input.leaseMs);
  const waitMs = normalizeDistributedCacheWaitMs(input.waitMs);
  const pollMinMs = normalizeDistributedCachePollMs(input.pollMinMs);
  const pollMaxMs = normalizeDistributedCachePollMs(input.pollMaxMs);
  if (pollMinMs > pollMaxMs) fail(CODES.distributedBoundsInvalid);
  return Object.freeze({ key: input.key, leaseMs, waitMs, pollMinMs, pollMaxMs });
}
