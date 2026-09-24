/**
 * TASK-551-07-L01: canonical cache input encoding and key construction.
 *
 * Canonical inputs accept only null, booleans, finite numbers, strings, arrays
 * and plain objects; object keys are sorted by UTF-8 bytes so structurally
 * equal inputs hash identically regardless of insertion order. Undefined
 * slots, array holes, cycles, non-finite numbers, exotic prototypes and
 * over-limit payloads are rejected BEFORE any hashing or hashing-sized
 * allocation. The bounded debug label is metadata only: it never reaches key
 * identity.
 *
 * Dependency direction: this module value-imports only
 * `serverCacheContracts.ts` (limit table, finite unions, tag/family
 * predicates) and is value-imported by the eligibility proof factory, the
 * config loader and `serverCacheConditionalWrite.ts`. `serverCacheContracts.ts`
 * imports nothing at value level from any sibling (the codec only type-imports
 * it), so the runtime import graph stays acyclic.
 */

import { createHash } from "node:crypto";
import {
  CACHE_FAMILIES,
  SERVER_CACHE_LIMITS,
  isCacheFamily,
  isCacheTag,
  type CacheEligibilityFieldDigest,
  type CacheFamily,
  type CacheGenerationDigest,
  type CacheGenerationEntry,
  type CacheGenerationToken,
  type CacheKey,
  type CacheSchemaVersion,
  type CacheTag,
} from "./serverCacheContracts";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const SERVER_CACHE_KEY_ERROR_CODES = {
  inputInvalid: "server_cache_key_input_invalid",
  inputTooLarge: "server_cache_key_input_too_large",
  keyTooLarge: "server_cache_key_too_large",
  keyMalformed: "server_cache_key_malformed",
  namespaceInvalid: "server_cache_key_namespace_invalid",
  componentInvalid: "server_cache_key_component_invalid",
  generationMissing: "server_cache_key_generation_missing",
  debugLabelTooLarge: "server_cache_debug_label_too_large",
  flightIdentityInvalid: "server_cache_flight_identity_invalid",
} as const;

/** Typed failure carrying only its machine-readable code. */
export class ServerCacheKeyError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ServerCacheKeyError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new ServerCacheKeyError(code);
}

const LOWERCASE_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const LOWERCASE_HEX_32_PATTERN = /^[0-9a-f]{32}$/;

export const SERVER_CACHE_KEY_FORMAT_VERSION = "v1";
export const SERVER_CACHE_KEY_IDENTITY_PREFIX = "coderso";

const encoder = new TextEncoder();

/**
 * Allocation-free UTF-8 byte measurement used on the hot canonical path. A
 * surrogate pair is one astral code point and therefore four UTF-8 bytes in
 * total: the low surrogate is consumed here instead of being charged again, so
 * astral-heavy input is never billed at twice its real size. A lone surrogate
 * cannot appear in `JSON.stringify` output (it is escaped to six ASCII bytes)
 * and can never encode to fewer bytes, so it is charged that worst case.
 */
function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 6;
      }
    } else if (code <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Sorts key names by raw UTF-8 bytes rather than UTF-16 code units. */
function sortKeysByUtf8Bytes(keys: readonly string[]): readonly string[] {
  const annotated = keys.map((key) => ({ key, bytes: encoder.encode(key) }));
  annotated.sort((left, right) => {
    const shared = Math.min(left.bytes.length, right.bytes.length);
    for (let index = 0; index < shared; index += 1) {
      const diff = (left.bytes[index] as number) - (right.bytes[index] as number);
      if (diff !== 0) return diff;
    }
    return left.bytes.length - right.bytes.length;
  });
  return annotated.map((entry) => entry.key);
}

/**
 * Canonical tag ordering, shared with `normalizeServerCacheAffectedTags` and
 * `normalizeServerCacheAffectedFamilies` in `serverCacheCoherence.ts`: tags
 * sort by their byte-identical ASCII form, so every canonical projection of a
 * tag set agrees.
 */
function byTagBytes<T extends { tag: string }>(left: T, right: T): number {
  return left.tag === right.tag ? 0 : left.tag < right.tag ? -1 : 1;
}

// ---------------------------------------------------------------------------
// Canonical input encoding
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Serializes one JSON-shaped value canonically (`{"a":1}` form, object keys
 * sorted by UTF-8 bytes) while charging every emitted chunk against the
 * canonical byte budget, so oversized input never reaches the hasher.
 */
export function encodeCanonicalInput(value: unknown): Uint8Array {
  let out = "";
  let remainingBytes = SERVER_CACHE_LIMITS.maxCanonicalInputBytes;
  const seenObjects = new Set<object>();

  const charge = (chunk: string): void => {
    remainingBytes -= utf8ByteLength(chunk);
    if (remainingBytes < 0) fail(SERVER_CACHE_KEY_ERROR_CODES.inputTooLarge);
    out += chunk;
  };
  // Byte-only variant: charges the budget without emitting text, so a caller
  // can account for bytes before it is ready to append them.
  const chargeBytes = (bytes: number): void => {
    remainingBytes -= bytes;
    if (remainingBytes < 0) fail(SERVER_CACHE_KEY_ERROR_CODES.inputTooLarge);
  };

  const serialize = (current: unknown, depth: number): void => {
    if (depth > MAX_CANONICAL_DEPTH) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
    // `undefined` is unrepresentable: encoding it as `null` would make two
    // distinct inputs collide on one digest, so it is rejected in every
    // position (top level, array element and object slot alike).
    if (current === undefined) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
    if (current === null) {
      charge("null");
      return;
    }
    if (typeof current === "boolean") {
      charge(current ? "true" : "false");
      return;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
      charge(Object.is(current, -0) ? "0" : (JSON.stringify(current) as string));
      return;
    }
    if (typeof current === "string") {
      charge(JSON.stringify(current));
      return;
    }
    if (typeof current !== "object") {
      // functions, symbols, bigint and everything else are unrepresentable
      fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
    }
    if (seenObjects.has(current)) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);

    if (Array.isArray(current)) {
      seenObjects.add(current);
      for (let index = 0; index < current.length; index += 1) {
        // Holes are unrepresentable canonically and reject outright; an
        // explicit `undefined` element is rejected by the recursion.
        if (!(index in current)) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
        if (index === 0) charge("[");
        else charge(",");
        serialize(current[index], depth + 1);
      }
      seenObjects.delete(current);
      charge(current.length === 0 ? "[]" : "]");
      return;
    }
    if (!isPlainObject(current)) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
    seenObjects.add(current);
    const rawKeys = Object.keys(current);
    // Every key is charged BEFORE the annotated encode-and-sort, so a hostile
    // payload carrying a huge key count fails on the byte budget instead of
    // first paying an attacker-scaled allocation. The bytes charged here are
    // exactly the per-slot bytes emitted below, so the total budget is
    // unchanged and the exact-boundary vectors still land on it.
    for (const key of rawKeys) chargeBytes(utf8ByteLength(JSON.stringify(key) + ":"));
    const orderedKeys = sortKeysByUtf8Bytes(rawKeys);
    for (let index = 0; index < orderedKeys.length; index += 1) {
      const key = orderedKeys[index] as string;
      const slot = current[key];
      if (slot === undefined) fail(SERVER_CACHE_KEY_ERROR_CODES.inputInvalid);
      if (index === 0) charge("{");
      else charge(",");
      out += JSON.stringify(key) + ":";
      serialize(slot, depth + 1);
    }
    seenObjects.delete(current);
    charge(orderedKeys.length === 0 ? "{}" : "}");
  };

  serialize(value, 0);
  return encoder.encode(out);
}

/** Depth guard against pathological nesting in hostile payloads. */
export const MAX_CANONICAL_DEPTH = 32;

/**
 * Lowercase 64-hex SHA-256 over any canonicalized bounded payload, branded as
 * the eligibility field digest that `buildServerCacheKey` consumes as
 * `inputDigest`. A consumer that needs a different brand of the same wire
 * form (the share scope in `serverCacheEligibility.ts`) re-brands at its own
 * boundary.
 */
export function digestServerCacheInput(input: unknown): CacheEligibilityFieldDigest {
  // Single documented cast site: `sha256Hex` always emits lowercase 64-hex,
  // the brand's exact wire form (`isValidLowercaseSha256Hex`, contracts.ts).
  return sha256Hex(encodeCanonicalInput(input)) as CacheEligibilityFieldDigest;
}

/**
 * Bounds an optional debug label to `SERVER_CACHE_LIMITS.maxDebugLabelBytes`.
 * Labels are returned verbatim for telemetry or rejected outright; they are
 * never embedded in a key.
 */
export function boundServerCacheDebugLabel(label: null | string | undefined): null | string {
  if (label === null || label === undefined) return null;
  if (typeof label !== "string" || utf8ByteLength(label) > SERVER_CACHE_LIMITS.maxDebugLabelBytes) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.debugLabelTooLarge);
  }
  return label;
}

// ---------------------------------------------------------------------------
// Final key construction
// ---------------------------------------------------------------------------

/**
 * Namespace rule, owned here at the key boundary: 1..128 ASCII
 * `[A-Za-z0-9._-]` with no leading/trailing separator. The constants are
 * exported so `serverCacheConfig.normalizeServerCacheConfig` consumes the same
 * rule instead of restating it -- one spelling, no drift.
 */
export const SERVER_CACHE_NAMESPACE_MAX_BYTES = 128;
export const SERVER_CACHE_NAMESPACE_SEPARATORS = Object.freeze([".", "_", "-"] as const);
export const SERVER_CACHE_NAMESPACE_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertNamespace(namespace: string): void {
  if (
    typeof namespace !== "string" ||
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
    fail(SERVER_CACHE_KEY_ERROR_CODES.namespaceInvalid);
  }
}

type BuildKeyInput = Readonly<{
  namespace: string;
  family: CacheFamily;
  schemaVersion: CacheSchemaVersion;
  generationDigest: CacheGenerationDigest;
  inputDigest: CacheEligibilityFieldDigest;
}>;

function assembleServerCacheKey(input: BuildKeyInput): string {
  return (
    `${SERVER_CACHE_KEY_IDENTITY_PREFIX}:${input.namespace}:server-cache:${SERVER_CACHE_KEY_FORMAT_VERSION}` +
    `:${input.family}:sv${input.schemaVersion}:${input.generationDigest}:${input.inputDigest}`
  );
}

function assertBuildableKeyComponents(input: BuildKeyInput): void {
  assertNamespace(input.namespace);
  if (!isCacheFamily(input.family)) fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
  if (
    typeof input.schemaVersion !== "number" ||
    !Number.isSafeInteger(input.schemaVersion) ||
    input.schemaVersion < SERVER_CACHE_LIMITS.minSchemaVersion ||
    input.schemaVersion > SERVER_CACHE_LIMITS.maxSchemaVersion
  ) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
  }
  for (const digest of [input.generationDigest, input.inputDigest]) {
    if (typeof digest !== "string" || !LOWERCASE_SHA256_PATTERN.test(digest)) {
      fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
    }
  }
}

/**
 * Builds the exact v1 key shape
 * `coderso:<namespace>:server-cache:v1:<family>:sv<schemaVersion>:<generationDigest>:<inputDigest>`
 * and fails closed when the assembled total leaves `SERVER_CACHE_LIMITS.maxKeyBytes`.
 */
export function buildServerCacheKey(input: BuildKeyInput): CacheKey {
  assertBuildableKeyComponents(input);
  const key = assembleServerCacheKey(input);
  if (utf8ByteLength(key) > SERVER_CACHE_LIMITS.maxKeyBytes) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.keyTooLarge);
  }
  return key as CacheKey;
}

/**
 * Exact maximum canonical key bytes for one namespace, derived by assembling
 * the widest legal component set (longest family, widest schema version) and
 * measuring the result — so the bound can never drift from the builder.
 */
export function maxServerCacheKeyBytes(namespace: string): number {
  const widest = assembleServerCacheKey({
    namespace,
    family: CACHE_FAMILIES.reduce((longest, family) =>
      utf8ByteLength(family) > utf8ByteLength(longest) ? family : longest
    ),
    schemaVersion: SERVER_CACHE_LIMITS.maxSchemaVersion as CacheSchemaVersion,
    generationDigest: "f".repeat(64) as CacheGenerationDigest,
    inputDigest: "0".repeat(64) as CacheEligibilityFieldDigest,
  });
  const bytes = utf8ByteLength(widest);
  if (bytes > SERVER_CACHE_LIMITS.maxKeyBytes) fail(SERVER_CACHE_KEY_ERROR_CODES.keyTooLarge);
  return bytes;
}

/**
 * Validates an already-built key against the exact v1 shape without
 * reconstructing its components (used by store-facing seams).
 */
export function isWellFormedServerCacheKey(value: unknown, namespace: string): boolean {
  if (typeof value !== "string") return false;
  const escapedNamespace = namespace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    "^coderso:" +
      escapedNamespace +
      ":server-cache:" +
      SERVER_CACHE_KEY_FORMAT_VERSION +
      ":[A-Za-z0-9-]+:sv[0-9]+:[0-9a-f]{64}:[0-9a-f]{64}$"
  );
  return pattern.test(value) && utf8ByteLength(value) <= SERVER_CACHE_LIMITS.maxKeyBytes;
}

// ---------------------------------------------------------------------------
// Generations
// ---------------------------------------------------------------------------

function isGenerationToken(value: unknown): value is CacheGenerationToken {
  return typeof value === "string" && LOWERCASE_HEX_32_PATTERN.test(value);
}

/**
 * Normalizes a raw generation snapshot into canonical form: unknown tags or
 * tokens fail closed, entries deduplicate per tag and sort by tag bytes.
 */
export function normalizeGenerations(
  entries: readonly CacheGenerationEntry[]
): readonly CacheGenerationEntry[] {
  if (!Array.isArray(entries) || entries.length < 1) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.generationMissing);
  }
  const seenTags = new Set<string>();
  for (const entry of entries) {
    if (!isCacheTag(entry?.tag) || !isGenerationToken(entry.token)) {
      fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
    }
    if (seenTags.has(entry.tag)) fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
    seenTags.add(entry.tag);
  }
  const normalized = entries.map((entry) => ({ tag: entry.tag, token: entry.token }));
  normalized.sort(byTagBytes);
  return normalized;
}

/**
 * Projects a full snapshot onto exactly the requested tags in canonical
 * order; every requested tag must exist, because a missing generation token
 * forces the `generation_unavailable` bypass instead of an unpinned read.
 */
export function projectGenerations(
  generations: readonly CacheGenerationEntry[],
  tags: readonly CacheTag[]
): readonly CacheGenerationEntry[] {
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > SERVER_CACHE_LIMITS.maxTags) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
  }
  const byTag = new Map<string, CacheGenerationEntry>();
  for (const entry of generations) byTag.set(entry.tag, entry);
  const projected: CacheGenerationEntry[] = [];
  for (const tag of [...tags].sort()) {
    const entry = byTag.get(tag);
    if (entry === undefined) fail(SERVER_CACHE_KEY_ERROR_CODES.generationMissing);
    projected.push({ tag: entry.tag, token: entry.token });
  }
  return projected;
}

/**
 * SHA-256 over the canonical generation projection (`[{"tag","token"}]` pairs
 * sorted by tag), giving the envelope-bound generation digest.
 */
export function digestGenerations(
  generations: readonly CacheGenerationEntry[],
  tags?: readonly CacheTag[]
): CacheGenerationDigest {
  const source = tags === undefined ? generations : projectGenerations(generations, tags);
  return sha256Hex(encodeCanonicalInput(source)) as CacheGenerationDigest;
}

/**
 * Combines the final key with process-local state (coherence epoch plus the
 * branded share-scope digest) into the local-flight registry identity.
 */
export function combineFlightIdentity(
  key: CacheKey,
  epoch: number,
  shareScopeDigest: string
): string {
  const identity = sha256Hex(encodeCanonicalInput([key, epoch, shareScopeDigest]));
  if (!LOWERCASE_SHA256_PATTERN.test(identity)) {
    fail(SERVER_CACHE_KEY_ERROR_CODES.flightIdentityInvalid);
  }
  return identity;
}

// ---------------------------------------------------------------------------
// Token normalization handoff
//
// Generation tokens are opaque cryptographic values minted by stores; this
// leaf only validates their pinned wire shape so adapters cannot widen it.
// ---------------------------------------------------------------------------

export function assertCacheGenerationTokenShape(value: unknown): CacheGenerationToken {
  if (!isGenerationToken(value)) fail(SERVER_CACHE_KEY_ERROR_CODES.componentInvalid);
  return value;
}
