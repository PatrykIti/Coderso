/**
 * TASK-551-07-L01: coherence, health and invalidation seams of the typed
 * server-cache contract, plus the bounded invalidation event keys.
 *
 * Owns the coherence/health shapes, the coherence signal and token validators,
 * the event-key form and the two coordinator brand keys
 * (`cacheInvalidationAttemptToken`, `cacheCoherenceObservationToken`), split out
 * of `serverCacheContracts.ts` to keep both modules under the file-size cap.
 *
 * Export-surface rule: every name declared here is exported from THIS module
 * only and is never re-exported through `serverCacheContracts.ts`; consumers
 * import each name from here.
 *
 * Value-import graph: this module imports only from `serverCacheContracts.ts`
 * (limits, the finite family/tag arrays and predicates, the error-code table and
 * the error class), so it stays acyclic. Thrown codes are the identical exported
 * `SERVER_CACHE_CONTRACT_ERROR_CODES` strings and the error class is the same
 * import, so `instanceof ServerCacheContractError` keeps holding.
 *
 * Brand visibility: the two brand keys are exported on purpose because the
 * token factories are owned by the downstream coordinator leaves. A runtime
 * brand proves structural conformance, never authenticity: a token is authentic
 * only when it comes from the owning coordinator factory.
 */

import {
  CACHE_FAMILIES,
  SERVER_CACHE_CONTRACT_ERROR_CODES,
  SERVER_CACHE_LIMITS,
  ServerCacheContractError,
  isCacheFamily,
  isCacheTag,
  type CacheFamily,
  type CacheTag,
  type ProcessCacheCoherenceEpoch,
  type ServerCacheBackend,
} from "./serverCacheContracts";

const CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;

function fail(code: string): never {
  throw new ServerCacheContractError(code);
}

// --- Runtime brand keys ---------------------------------------------------------
//
// Real `unique symbol` constants, so no bare cast or look-alike object literal
// can satisfy the branded token types below.

export const cacheInvalidationAttemptToken: unique symbol = Symbol(
  "coderso.server-cache.cacheInvalidationAttemptToken"
);
export const cacheCoherenceObservationToken: unique symbol = Symbol(
  "coderso.server-cache.cacheCoherenceObservationToken"
);

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
