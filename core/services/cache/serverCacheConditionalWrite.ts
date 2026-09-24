/**
 * TASK-551-07-L01: conditional-write handoff and invalidation plan of the typed
 * server-cache contract.
 *
 * Owns the producer-validated conditional-write entry and its factory, the
 * store seam (`ServerCacheStore`, `ServerCacheStoreDescription`), the
 * conditional-write result union and the invalidation-plan validator, split out
 * of `serverCacheContracts.ts` to keep both modules under the file-size cap.
 * `ServerCacheEnvelopeV1` stays in `serverCacheContracts.ts`, so the codec keeps
 * type-importing it from there and no codec/conditional-write cycle exists.
 *
 * Export-surface rule: every name declared here is exported from THIS module
 * only and is never re-exported through `serverCacheContracts.ts`; consumers
 * import each name from here.
 *
 * Value-import graph: this module imports from `serverCacheContracts.ts`
 * (limits, scalar normalizers, the tag predicate, the error-code table and the
 * error class), `serverCacheCoherence.ts` (the event-key predicate),
 * `serverCacheCodec.ts` (`decodeServerCacheEnvelope`, because the factory
 * decodes before it trusts bytes) and `serverCacheKeys.ts` (the namespace
 * rule). None of them imports this module at value level, so the graph stays
 * acyclic. Thrown codes are the identical exported
 * `SERVER_CACHE_CONTRACT_ERROR_CODES` strings and the error class is the same
 * import, so `instanceof ServerCacheContractError` keeps holding.
 *
 * Brand visibility: `validatedConditionalWriteEntry` is module-private because
 * its only factory, `createCacheConditionalWriteEntry`, lives in this file. A
 * runtime brand proves structural conformance, never authenticity: an entry is
 * authentic only when this factory re-validated the key form, every branded
 * scalar and the envelope.
 */

import { decodeServerCacheEnvelope } from "./serverCacheCodec";
import { isServerCacheEventKey, type ServerCacheHealth } from "./serverCacheCoherence";
import {
  SERVER_CACHE_CONTRACT_ERROR_CODES,
  SERVER_CACHE_LIMITS,
  ServerCacheContractError,
  isCacheTag,
  normalizeCacheValueByteLimit,
  normalizeNegativeCacheTtlMs,
  normalizePositiveCacheTtlMs,
  type CacheGenerations,
  type CacheKey,
  type CachePolicy,
  type CacheTag,
  type CacheValueByteLimit,
  type NegativeCacheTtlMs,
  type PositiveCacheTtlMs,
  type ServerCacheBackend,
} from "./serverCacheContracts";
import {
  SERVER_CACHE_NAMESPACE_MAX_BYTES,
  SERVER_CACHE_NAMESPACE_PATTERN,
  SERVER_CACHE_NAMESPACE_SEPARATORS,
} from "./serverCacheKeys";

const CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;

function fail(code: string): never {
  throw new ServerCacheContractError(code);
}

// --- Runtime brand key ----------------------------------------------------------
//
// A real `unique symbol` constant, so no bare cast or look-alike object literal
// can satisfy `CacheConditionalWriteEntry`.

const validatedConditionalWriteEntry: unique symbol = Symbol(
  "coderso.server-cache.validatedConditionalWriteEntry"
);

// --- Conditional-write handoff and invalidation plan ----------------------------

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
 * normalizer imported from `serverCacheContracts.ts` and maps any failure onto
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
 * exact v1 shape instead of trusting it. The namespace segment is judged by the
 * key boundary's own exported rule (`SERVER_CACHE_NAMESPACE_*` from
 * `serverCacheKeys.ts`, which this module can value-import without a cycle
 * because `serverCacheKeys` value-imports only `serverCacheContracts`); the
 * full key shape is restated here and pinned to the builder by the leaf suite:
 * `coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<64hex>:<64hex>`.
 * A key from another deployment's namespace, a foreign family or another schema
 * version can therefore never be certified for this policy.
 */
const ENTRY_KEY_SHAPE_PATTERN =
  /^coderso:([A-Za-z0-9._-]+):server-cache:v1:([A-Za-z0-9-]+):sv([0-9]+):([0-9a-f]{64}):([0-9a-f]{64})$/;

function entryKeyForm(key: string, input: CreateConditionalWriteEntryInput): boolean {
  const match = ENTRY_KEY_SHAPE_PATTERN.exec(key);
  if (match === null) return false;
  const namespace = match[1] as string;
  // The key boundary's namespace rule imported from `serverCacheKeys.ts`
  // (1..`SERVER_CACHE_NAMESPACE_MAX_BYTES` ASCII `[A-Za-z0-9._-]`, no
  // leading/trailing separator), the rule the key builder itself enforces
  // before minting a key.
  if (
    namespace !== input.namespace ||
    namespace.length < 1 ||
    namespace.length > SERVER_CACHE_NAMESPACE_MAX_BYTES ||
    SERVER_CACHE_NAMESPACE_PATTERN.test(namespace) === false ||
    SERVER_CACHE_NAMESPACE_SEPARATORS.includes(
      namespace.charAt(0) as (typeof SERVER_CACHE_NAMESPACE_SEPARATORS)[number]
    ) ||
    SERVER_CACHE_NAMESPACE_SEPARATORS.includes(
      namespace.charAt(namespace.length - 1) as (typeof SERVER_CACHE_NAMESPACE_SEPARATORS)[number]
    )
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
