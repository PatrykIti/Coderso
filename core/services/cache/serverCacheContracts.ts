/**
 * TASK-551-07-L01: backend-neutral typed server-cache contract surface.
 *
 * Authority for the strict policies, envelopes, keys, eligibility and
 * distributed-load unions consumed by every memory and Redis implementation.
 * Two sibling modules own the rest of the contract: `serverCacheCoherence.ts`
 * owns the coherence/health shapes, the coherence signal/token validators and
 * the bounded invalidation event keys, and `serverCacheConditionalWrite.ts`
 * owns the conditional-write handoffs, the store seam and invalidation plans.
 * Contracts only: no store, adapter, coherence controller, lease coordinator,
 * outbox worker or public runtime lives here, nothing reads the environment,
 * opens a socket or touches a database.
 *
 * This module has no sibling value import. Its only sibling reference is one
 * type-only back-reference to `serverCacheConditionalWrite.ts`
 * (`CacheConditionalWrite`, erased at emit), so it stays a sink of the acyclic
 * runtime import graph.
 *
 * Owned-surface note: the contract's "Exact Owned Surface" enumerates the
 * mandated symbols. Everything else exported here (the finite family/tag arrays
 * and their predicates, the error-code table and error class, the scalar
 * normalizers, `CacheGenerationEntry` and
 * `createDistributedCacheLoadAcquireInput`) is leaf-owned auxiliary surface:
 * published so the leaf's own suites and the downstream consuming leaves
 * normalize through one authority instead of re-deriving the bounds.
 *
 * Contract-repair note (brand visibility): the contract sketches the runtime
 * brands as module-private `declare const ... unique symbol`, but the sole proof
 * factory lives in `serverCacheEligibility.ts` and the companion/coordinator
 * factories are owned by downstream leaves, so a module-private symbol could
 * never cross that boundary. `validatedCacheEligibilityProof` and
 * `validatedCacheLoadCompanion` are therefore exported here on purpose, and
 * `cacheInvalidationAttemptToken` and `cacheCoherenceObservationToken` are
 * exported from `serverCacheCoherence.ts` for the same reason, while
 * `validatedConditionalWriteEntry` (whose only factory is in
 * `serverCacheConditionalWrite.ts`) stays private to that module.
 * An importer that can read these constants can also attach them, so a runtime
 * brand proves structural conformance, never authenticity: authenticity comes
 * from re-derivation -- a proof from `deriveCacheEligibilityProof`, an entry
 * from `createCacheConditionalWriteEntry` (which re-validates the key form,
 * every branded scalar and the envelope) and a token from the owning
 * coordinator factory, and no proof may be compared without the policy family
 * that produced it.
 */

import type { CacheConditionalWrite } from "./serverCacheConditionalWrite";

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
export const validatedCacheLoadCompanion: unique symbol = Symbol(
  "coderso.server-cache.validatedCacheLoadCompanion"
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

// --- Envelope record

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
