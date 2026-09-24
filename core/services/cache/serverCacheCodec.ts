/**
 * TASK-551-07-L01: strict server-cache envelope codec.
 *
 * Sole encoder/decoder authority for `coderso.server-cache-envelope@v1` bytes.
 * The wire form is UTF-8 JSON with exactly eight fields in a fixed order;
 * decoding is recursively reject-unknown, validates every branded field and
 * enforces the policy-selected lifetime ceiling (`policy.ttlMs` for positive
 * fills, `policy.negativeTtlMs` for negative fills).
 *
 * Runtime dependency discipline: this module deliberately imports contract
 * TYPES only and stays a sink of the value-import graph.
 * `serverCacheConditionalWrite.ts` value-imports `decodeServerCacheEnvelope`
 * for entry creation, and the codec imports no sibling value in return; the
 * small local constants below are that leaf discipline, kept byte-identical to
 * the pinned contract literals.
 */

import type {
  CacheFamily,
  CacheGenerationDigest,
  CachePolicy,
  CacheSchemaVersion,
  ServerCacheEnvelopeV1,
  UnixTimeMs,
} from "./serverCacheContracts";

// ---------------------------------------------------------------------------
// Wire constants and machine-readable failures
// ---------------------------------------------------------------------------

export const SERVER_CACHE_ENVELOPE_SCHEMA_V1 = "coderso.server-cache-envelope@v1";

const ENVELOPE_FIELD_ORDER = Object.freeze([
  "schema",
  "family",
  "schemaVersion",
  "fillKind",
  "writtenAtUnixMs",
  "expiresAtUnixMs",
  "generationDigest",
  "value",
]);

/**
 * Lifetime ceilings come from the supplied policy, so no limit table is
 * duplicated here. The absolute ceilings below are byte-identical to the
 * contract limits (owned by `serverCacheContracts.ts`); they are restated
 * locally because this module keeps the leaf discipline described in the
 * header (contract TYPES only, no sibling value import). Drift is a suite
 * failure, not a silent divergence: every mirror is pinned to its owner by the
 * leaf's codec/keys suite.
 */
const LOWERCASE_SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const SERVER_CACHE_CODEC_LIMIT_MIRRORS = Object.freeze({
  /** Mirrors `SERVER_CACHE_LIMITS.maxPolicyValueBytes`. */
  maxPolicyValueBytes: 16_777_216,
  /** Mirrors `SERVER_CACHE_LIMITS.minPolicyTtlMs` / `maxPolicyTtlMs`. */
  minPolicyTtlMs: 1,
  maxPolicyTtlMs: 3_600_000,
  /**
   * Mirrors the `normalizeNegativeCacheTtlMs` window (explicit `null` or
   * integer 5_000..15_000; a missing field is malformed).
   */
  minNegativeTtlMs: 5_000,
  maxNegativeTtlMs: 15_000,
} as const);

const {
  maxPolicyValueBytes: MAX_JSON_VALUE_BYTES_UPPER_BOUND,
  minPolicyTtlMs: MIN_POLICY_TTL_MS,
  maxPolicyTtlMs: MAX_POLICY_TTL_MS,
  minNegativeTtlMs: MIN_NEGATIVE_TTL_MS,
  maxNegativeTtlMs: MAX_NEGATIVE_TTL_MS,
} = SERVER_CACHE_CODEC_LIMIT_MIRRORS;

// ---------------------------------------------------------------------------
// Branded-scalar re-normalization
//
// The codec consumes branded policy scalars, so it re-validates each one it is
// about to enforce instead of trusting the brand: a NaN or out-of-range value
// must fail closed, never void the ceiling it is compared against. The owning
// authorities are `normalizePositiveCacheTtlMs` (integer
// `SERVER_CACHE_LIMITS.minPolicyTtlMs..maxPolicyTtlMs`),
// `normalizeNegativeCacheTtlMs` (explicit `null` or integer 5_000..15_000;
// `undefined` is malformed) and `normalizeCacheValueByteLimit` (integer
// 1..maxPolicyValueBytes). The codec stays a value-import leaf (type-only
// imports), so the bounds are mirrored rather than imported, cite their owner
// and stay pinned to it by the codec/keys suite.
// ---------------------------------------------------------------------------

/** `null` when the positive ceiling is outside its normalized brand range. */
function normalizePositiveTtlCeilingMs(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < MIN_POLICY_TTL_MS ||
    value > MAX_POLICY_TTL_MS
  ) {
    return null;
  }
  return value;
}

/**
 * `null` when the value is `null` OR outside the normalized negative brand
 * range; the caller (`normalizePolicyCeilings`) tells the two apart.
 */
function normalizeNegativeTtlCeilingMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < MIN_NEGATIVE_TTL_MS ||
    value > MAX_NEGATIVE_TTL_MS
  ) {
    return null;
  }
  return value;
}

/** `null` when the value-byte limit is outside its normalized brand range. */
function normalizeValueByteLimitBytes(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_JSON_VALUE_BYTES_UPPER_BOUND
  ) {
    return null;
  }
  return value;
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
  // in serverCacheContracts.ts.
  const negativeMalformed = policy.negativeTtlMs !== null && negativeTtlMs === null;
  if (positiveTtlMs === null || maxValueBytes === null || negativeMalformed) return null;
  return { positiveTtlMs, negativeTtlMs, maxValueBytes };
}

/**
 * Positive fills sample from `policy.ttlMs`; negative fills require non-null
 * `negativeTtlMs` and never fall back to the positive TTL. `null` now only
 * means the policy explicitly declared no negative fill; a malformed policy
 * never reaches this function.
 */
function selectLifetimeCeilingMs(
  fillKind: ServerCacheEnvelopeFillKind,
  ceilings: NormalizedPolicyCeilings
): number | null {
  return fillKind === "positive" ? ceilings.positiveTtlMs : ceilings.negativeTtlMs;
}

export const SERVER_CACHE_ENVELOPE_ERROR_CODES = {
  encodeInvalid: "server_cache_envelope_encode_invalid",
  valueTooLarge: "server_cache_envelope_value_too_large",
  sweepLimitInvalid: "server_cache_envelope_sweep_limit_invalid",
} as const;

/** Typed encode-time failure carrying only its machine-readable code. */
export class ServerCacheEnvelopeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ServerCacheEnvelopeError";
    this.code = code;
  }
}

function failEncode(code: string): never {
  throw new ServerCacheEnvelopeError(code);
}

// ---------------------------------------------------------------------------
// Shared seam types
// ---------------------------------------------------------------------------

export type ServerCacheEnvelopeFillKind = "positive" | "negative";

export type ServerCacheEnvelopeEncodeInput = Readonly<{
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  fillKind: ServerCacheEnvelopeFillKind;
  writtenAtUnixMs: UnixTimeMs;
  expiresAtUnixMs: UnixTimeMs;
  generationDigest: CacheGenerationDigest;
  value: unknown;
}>;

export type ServerCacheEnvelopeDecodeReason = "expired" | "oversized" | "invalid";

export type ServerCacheEnvelopeDecodeResult =
  | Readonly<{ ok: true; envelope: ServerCacheEnvelopeV1 }>
  | Readonly<{ ok: false; reason: ServerCacheEnvelopeDecodeReason }>;

type DecodeOptions = Readonly<{
  nowUnixMs?: UnixTimeMs;
  enforceExpiry?: boolean;
}>;

const encoder = new TextEncoder();
const strictDecoder = new TextDecoder("utf8", { fatal: true });

function isValidSafeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/**
 * Serializes the envelope in the pinned field order and bounds its encoded
 * size by `policy.maxValueBytes` before a backend ever sees the bytes.
 */
export function encodeServerCacheEnvelope(
  input: ServerCacheEnvelopeEncodeInput,
  policy: CachePolicy<unknown>
): Uint8Array {
  // The policy's own branded scalars are re-normalized before any of them is
  // enforced, so a NaN or out-of-range ceiling cannot void the bounds below.
  const ceilings = normalizePolicyCeilings(policy);
  if (ceilings === null) failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  if (input.fillKind !== "positive" && input.fillKind !== "negative") {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  if (input.family !== policy.family || input.schemaVersion !== policy.schemaVersion) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  if (!isValidSafeInteger(input.writtenAtUnixMs) || !isValidSafeInteger(input.expiresAtUnixMs)) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  if (typeof input.generationDigest !== "string") {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  // `JSON.stringify` DROPS `undefined`, function and symbol members instead of
  // serializing them, so accepting such a value here would emit bytes with no
  // `value` field at all -- bytes this module's own decoder rejects as
  // `invalid`. Unrepresentable values fail at encode time, never after a
  // backend has stored them.
  if (
    input.value === undefined ||
    typeof input.value === "function" ||
    typeof input.value === "symbol"
  ) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  if (!LOWERCASE_SHA256_PATTERN.test(input.generationDigest)) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  if (input.expiresAtUnixMs <= input.writtenAtUnixMs) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }
  const ceilingMs = selectLifetimeCeilingMs(input.fillKind, ceilings);
  if (ceilingMs === null) failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  const lifetimeMs = input.expiresAtUnixMs - input.writtenAtUnixMs;
  if (lifetimeMs < 1 || lifetimeMs > ceilingMs) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  }

  const record: Record<string, unknown> = {};
  record.schema = SERVER_CACHE_ENVELOPE_SCHEMA_V1;
  record.family = input.family;
  record.schemaVersion = input.schemaVersion;
  record.fillKind = input.fillKind;
  record.writtenAtUnixMs = input.writtenAtUnixMs;
  record.expiresAtUnixMs = input.expiresAtUnixMs;
  record.generationDigest = input.generationDigest;
  record.value = input.value;
  let json: string;
  try {
    json = JSON.stringify(record);
  } catch {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
    return new Uint8Array();
  }
  const bytes = encoder.encode(json);
  if (
    bytes.byteLength > ceilings.maxValueBytes ||
    bytes.byteLength > MAX_JSON_VALUE_BYTES_UPPER_BOUND
  ) {
    failEncode(SERVER_CACHE_ENVELOPE_ERROR_CODES.valueTooLarge);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/**
 * Strictly decodes stored bytes against exactly one policy. Every mismatch is
 * reported through the coarse finite reason union — never through raw bytes,
 * keys or parser detail — so callers map it onto `store_value_rejected`.
 */
export function decodeServerCacheEnvelope(
  bytes: Uint8Array,
  policy: CachePolicy<unknown>,
  options: DecodeOptions = {}
): ServerCacheEnvelopeDecodeResult {
  // The policy's own branded scalars are re-normalized before any of them is
  // enforced, so a NaN or out-of-range ceiling fails closed instead of
  // voiding the bounds below.
  const ceilings = normalizePolicyCeilings(policy);
  if (ceilings === null || !(bytes instanceof Uint8Array)) {
    return { ok: false, reason: "invalid" };
  }
  // A zero-byte read must have surfaced as a backend null (store_absent);
  // non-empty oversized bytes keep their own coarse reason.
  if (bytes.byteLength > ceilings.maxValueBytes) {
    return { ok: false, reason: "oversized" };
  }
  if (bytes.byteLength < 1) {
    return { ok: false, reason: "invalid" };
  }
  let text: string;
  try {
    text = strictDecoder.decode(bytes);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "invalid" };
  }
  const record = parsed as Record<string, unknown>;
  // Exact field count and zero unknown fields; recursive rejection continues
  // below for nested branded scalars. Canonicality note: `JSON.parse` folds
  // duplicate member names into a single own property, so a payload carrying
  // a repeated field name still yields exactly eight keys and is accepted
  // here. The encoder is the only writer of canonical wire bytes; safety does
  // not depend on that canonicality because every value is validated below
  // and no key is ever assigned dynamically.
  if (Object.keys(record).length !== ENVELOPE_FIELD_ORDER.length) {
    return { ok: false, reason: "invalid" };
  }
  for (const field of ENVELOPE_FIELD_ORDER) {
    // Own-property check (`Object.hasOwn`): a polluted `Object.prototype`
    // would otherwise satisfy a missing own field through the prototype
    // chain and let a smuggled own member ride in under the field count.
    if (!Object.hasOwn(record, field)) return { ok: false, reason: "invalid" };
  }
  if (record.schema !== SERVER_CACHE_ENVELOPE_SCHEMA_V1) {
    return { ok: false, reason: "invalid" };
  }
  if (record.family !== policy.family) return { ok: false, reason: "invalid" };
  if (record.schemaVersion !== policy.schemaVersion) {
    return { ok: false, reason: "invalid" };
  }
  const fillKind = record.fillKind;
  if (fillKind !== "positive" && fillKind !== "negative") {
    return { ok: false, reason: "invalid" };
  }
  if (!isValidSafeInteger(record.writtenAtUnixMs) || !isValidSafeInteger(record.expiresAtUnixMs)) {
    return { ok: false, reason: "invalid" };
  }
  const writtenAtUnixMs = record.writtenAtUnixMs as UnixTimeMs;
  const expiresAtUnixMs = record.expiresAtUnixMs as UnixTimeMs;
  if (expiresAtUnixMs <= writtenAtUnixMs) return { ok: false, reason: "invalid" };
  if (typeof record.generationDigest !== "string") {
    return { ok: false, reason: "invalid" };
  }
  if (!LOWERCASE_SHA256_PATTERN.test(record.generationDigest)) {
    return { ok: false, reason: "invalid" };
  }
  const ceilingMs = selectLifetimeCeilingMs(fillKind, ceilings);
  if (ceilingMs === null) return { ok: false, reason: "invalid" };
  const lifetimeMs = expiresAtUnixMs - writtenAtUnixMs;
  if (lifetimeMs < 1 || lifetimeMs > ceilingMs) return { ok: false, reason: "invalid" };

  const enforceExpiry = options.enforceExpiry !== false;
  if (enforceExpiry) {
    const nowUnixMs: UnixTimeMs = options.nowUnixMs ?? (Date.now() as UnixTimeMs);
    if (!isValidSafeInteger(nowUnixMs)) return { ok: false, reason: "invalid" };
    if (expiresAtUnixMs <= nowUnixMs) return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    envelope: {
      schema: SERVER_CACHE_ENVELOPE_SCHEMA_V1,
      family: record.family as CacheFamily,
      schemaVersion: record.schemaVersion as CacheSchemaVersion,
      fillKind,
      writtenAtUnixMs,
      expiresAtUnixMs,
      generationDigest: record.generationDigest as CacheGenerationDigest,
      value: record.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Bounded expiry sweep planning
//
// The per-operation chunk bound IS enforced here, not merely by caller
// discipline: `SERVER_CACHE_SWEEP_CHUNK_LIMIT` restates
// `SERVER_CACHE_LIMITS.maxExpirySweepEntriesPerOperation` (64) byte-identically
// because the codec stays a value-import leaf (type-only imports, see the
// header), and the codec/keys suite pins the mirror to its owner so drift fails
// a test instead of a runtime bound. Callers may pass a smaller chunk, never a
// larger one.
// ---------------------------------------------------------------------------

/** Per-operation chunk ceiling; mirrors `SERVER_CACHE_LIMITS.maxExpirySweepEntriesPerOperation`. */
export const SERVER_CACHE_SWEEP_CHUNK_LIMIT = 64;

/** Splits pending expiries into at-most-`limit` entry operations. */
export function sliceExpirySweepEntries<T>(
  entries: readonly T[],
  limit: number
): readonly (readonly T[])[] {
  if (
    typeof limit !== "number" ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > SERVER_CACHE_SWEEP_CHUNK_LIMIT ||
    !Array.isArray(entries)
  ) {
    throw new ServerCacheEnvelopeError(SERVER_CACHE_ENVELOPE_ERROR_CODES.sweepLimitInvalid);
  }
  const chunks: (readonly T[])[] = [];
  for (let index = 0; index < entries.length; index += limit) {
    chunks.push(entries.slice(index, index + limit));
  }
  return Object.freeze(chunks);
}
