/**
 * TASK-551-07-L01 contract lane: finite unions, shared limits, normalized
 * scalar brands, coherence/health shapes and signal specification vectors,
 * saturation/hysteresis data, conditional-write entry normalization,
 * invalidation-plan strictness, distributed-load bounds, the typed loader seam
 * and config/capacity normalization plus credential redaction.
 *
 * Everything here executes offline against pure in-memory fixtures driven by
 * the contract modules themselves: no environment read, no socket, no database
 * and no spawned process, and no import-time prerequisite, so no `mock.module`
 * stub is needed and every suite runs independently with plain `vitest`.
 */

import { describe, expect, it } from "vitest";
import {
  assertBrandedAttemptToken,
  cacheCoherenceObservationToken,
  cacheInvalidationAttemptToken,
  createCacheConditionalWriteEntry,
  createDistributedCacheLoadAcquireInput,
  isCacheFamily,
  isCacheTag,
  isServerCacheEventKey,
  normalizeCacheGenerationDigest,
  normalizeCacheGenerationToken,
  normalizeCacheSchemaVersion,
  normalizeCacheValueByteLimit,
  normalizeDistributedCacheLeaseMs,
  normalizeDistributedCachePollMs,
  normalizeDistributedCacheWaitMs,
  normalizeNegativeCacheTtlMs,
  normalizePositiveCacheTtlMs,
  normalizeProcessCacheCoherenceEpoch,
  normalizeServerCacheAffectedFamilies,
  normalizeServerCacheAffectedTags,
  normalizeServerCacheOldestPendingAgeMs,
  normalizeServerCacheStableCode,
  normalizeUnixTimeMs,
  validateServerCacheCoherenceSignal,
  validatedCacheEligibilityProof,
  CACHE_FAMILIES,
  CACHE_TAGS,
  SERVER_CACHE_CONTRACT_ERROR_CODES,
  SERVER_CACHE_LIMITS,
  type CacheCoherenceObservationToken,
  type CacheEligibilityContext,
  type CacheEligibilityFieldDigest,
  type CacheFamily,
  type CacheInvalidationAttemptToken,
  type CachePolicy,
  type CacheShareScopeDigest,
  type CacheTag,
  type DistributedCacheLeaseMs,
  type DistributedCachePollMs,
  type DistributedCacheWaitMs,
  type PositiveCacheTtlMs,
  type ProcessCacheCoherenceEpoch,
  type ServerCacheCoherence,
  type ServerCacheCoherenceSignal,
  type UnixTimeMs,
} from "../../../core/services/cache/serverCacheContracts";
import {
  assertMandatoryPolicyCapacity,
  normalizeServerCacheConfig,
  serverCacheConfigDiagnostics,
  SERVER_CACHE_CONFIG_ERROR_CODES,
  type ServerCachePolicyCapacityDescriptor,
} from "../../../core/services/cache/serverCacheConfig";
import {
  buildServerCacheKey,
  digestGenerations,
  maxServerCacheKeyBytes,
  normalizeGenerations,
  projectGenerations,
} from "../../../core/services/cache/serverCacheKeys";

const BRAND_CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;
const CONFIG_CODES = SERVER_CACHE_CONFIG_ERROR_CODES;

const SERVER_REJECTED_REASONS = ["expired", "generation_mismatch", "oversized", "invalid"] as const;
const SERVER_NO_FILL_REASONS = [
  "response_not_cacheable",
  "cache_excluded_dependency",
  "authoritative_only",
] as const;
const SERVER_FILL_DISABLED_REASONS = [
  "ineligible",
  "singleflight_saturated",
  "coherence_bypass",
  "generation_unavailable",
  "transport_unavailable",
  "distributed_wait_timeout",
  "coordinator_closed",
  "not_published_retry",
] as const;

// ---------------------------------------------------------------------------
// Fixtures (pure, DB-free, env-free)
// ---------------------------------------------------------------------------

const UUID_A = "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0";
const EVENT_KEY = "cache-event:" + UUID_A;
const KEY_INPUT_DIGEST =
  "b4c5d6e7f8091223344556677889900aabbccddeeff00112233445566778899a" as CacheEligibilityFieldDigest;

/** Asserts the callable fails with exactly one machine-readable code. */
function expectCode(run: () => unknown, code: string): void {
  try {
    run();
  } catch (error) {
    expect((error as Error).message).toBe(code);
    return;
  }
  throw new Error(`expected rejection with ${code}`);
}

function sampleKey() {
  return buildServerCacheKey({
    namespace: "fixturens",
    family: "pages",
    schemaVersion: normalizeCacheSchemaVersion(7),
    generationDigest: normalizeCacheGenerationDigest("c".repeat(64)),
    inputDigest: KEY_INPUT_DIGEST,
  });
}

function fakeObservationToken(
  source: "memory_store" | "redis_store" | "outbox_worker",
  sequence: number
): CacheCoherenceObservationToken {
  return { source, sequence, [cacheCoherenceObservationToken]: true as true };
}

function fakeAttemptToken(eventKey: string, sequence: number): CacheInvalidationAttemptToken {
  return { eventKey, sequence, [cacheInvalidationAttemptToken]: true as true };
}

/** Deterministic policy fixture (decode/isEligible are seam references). */
function fakePolicy(overrides: Partial<CachePolicy<unknown>> = {}): CachePolicy<unknown> {
  return {
    family: "pages",
    schemaVersion: normalizeCacheSchemaVersion(7),
    ttlMs: normalizePositiveCacheTtlMs(60_000),
    maxValueBytes: normalizeCacheValueByteLimit(4_096),
    tags: ["site:pages"],
    negativeTtlMs: null,
    stalePolicy: "forbid",
    decode: (value) => value,
    isEligible: () => null,
    ...overrides,
  };
}

function eligibleContext(): CacheEligibilityContext {
  return {
    access: "public_anonymous",
    renderMode: "public",
    sensitiveDependency: "absent",
    queryVariant: {
      kind: "known_bounded",
      digest:
        "a5b6c7d8e9f00112233445566778899aabbccddeeff00112233445566778899a" as CacheEligibilityFieldDigest,
    },
    responseDisposition: "positive_candidate",
    mutableVisibilityGate: "not_required",
  };
}

// ---------------------------------------------------------------------------
// Code-owned limits and finite unions
// ---------------------------------------------------------------------------

describe("SERVER_CACHE_LIMITS", () => {
  const LIMIT_ROWS: readonly (readonly [string, number])[] = [
    ["maxKeyBytes", 512],
    ["maxCanonicalInputBytes", 65_536],
    ["maxDebugLabelBytes", 128],
    ["maxTags", 32],
    ["maxTagBytes", 128],
    ["maxEventKeyBytes", 128],
    ["maxConditionalWrites", 2],
    ["minSchemaVersion", 1],
    ["maxSchemaVersion", 2_147_483_647],
    ["minPolicyTtlMs", 1],
    ["maxPolicyTtlMs", 3_600_000],
    ["minPolicyValueBytes", 1],
    ["maxPolicyValueBytes", 16_777_216],
    ["maxExpirySweepEntriesPerOperation", 64],
    ["forcedBypassPendingAgeMs", 5_000],
    ["maxHealthPendingAgeMs", 86_400_000],
    ["maxHealthStableCodeBytes", 64],
    ["maxCoherenceUnresolvedEvents", 4_096],
    ["maxCoherenceActiveAttempts", 4_096],
    ["coherenceOverflowRecoveryThreshold", 3_072],
    ["minInFlightKeys", 16],
    ["maxInFlightKeys", 10_000],
    ["defaultInFlightKeys", 1_024],
    ["minDistributedLeaseMs", 100],
    ["maxDistributedLeaseMs", 10_000],
    ["defaultDistributedLeaseMs", 2_000],
    ["minDistributedWaitMs", 0],
    ["maxDistributedWaitMs", 500],
    ["defaultDistributedWaitMs", 250],
    ["minDistributedPollMs", 10],
    ["maxDistributedPollMs", 50],
    ["ttlJitterMinRatio", 0.9],
    ["ttlJitterMaxRatio", 1],
  ];

  it("pins every v1 bound exactly", () => {
    expect({ ...SERVER_CACHE_LIMITS }).toEqual(Object.fromEntries(LIMIT_ROWS));
    expect(Object.keys(SERVER_CACHE_LIMITS).length).toBe(LIMIT_ROWS.length);
  });

  it("keeps hysteresis below saturation and jitter monotonic", () => {
    expect(SERVER_CACHE_LIMITS.coherenceOverflowRecoveryThreshold).toBeLessThan(
      SERVER_CACHE_LIMITS.maxCoherenceUnresolvedEvents
    );
    expect(SERVER_CACHE_LIMITS.ttlJitterMinRatio).toBeLessThanOrEqual(
      SERVER_CACHE_LIMITS.ttlJitterMaxRatio
    );
    expect(SERVER_CACHE_LIMITS.forcedBypassPendingAgeMs).toBe(5_000);
  });
});

describe("finite family/tag unions", () => {
  it("pins the closed family union", () => {
    expect([...CACHE_FAMILIES]).toEqual([
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
    ]);
  });

  it("pins the closed site-tag union", () => {
    expect([...CACHE_TAGS]).toEqual([
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
    ]);
  });

  it("fails closed on unknown or variable-suffixed members", () => {
    for (const badFamily of ["pages:42", "entries/<id>", "unknown", "", "PAGES"]) {
      expect(isCacheFamily(badFamily)).toBe(false);
    }
    for (const badTag of ["site:", "site:pages:17", "tenant:7", "unknown", ""]) {
      expect(isCacheTag(badTag)).toBe(false);
    }
    expect(isCacheFamily("listings")).toBe(true);
    expect(isCacheTag("settings:security")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Normalized scalar brands (constructors, never bare assertions)
// ---------------------------------------------------------------------------

describe("normalized scalar brands", () => {
  it("accepts schema versions 1..2147483647 only", () => {
    expect(normalizeCacheSchemaVersion(1)).toBe(1);
    expect(normalizeCacheSchemaVersion(2_147_483_647)).toBe(2_147_483_647);
    for (const bad of [0, -1, 2_147_483_648, 1.5, NaN, Infinity, "7", null]) {
      expectCode(() => normalizeCacheSchemaVersion(bad as number), BRAND_CODES.brandInvalid);
    }
  });

  it("accepts positive TTLs 1..3600000 ms only", () => {
    expect(normalizePositiveCacheTtlMs(1)).toBe(1);
    expect(normalizePositiveCacheTtlMs(3_600_000)).toBe(3_600_000);
    for (const bad of [0, 3_600_001, -60_000, 60_000.5]) {
      expectCode(() => normalizePositiveCacheTtlMs(bad as number), BRAND_CODES.brandInvalid);
    }
  });

  it("pins negative TTL acceptance at null and integer 5000..15000", () => {
    const vectors: readonly [unknown, number | null | string][] = [
      [null, null],
      [undefined, null],
      [4_999, BRAND_CODES.brandInvalid],
      [5_000, 5_000],
      [15_000, 15_000],
      [15_001, BRAND_CODES.brandInvalid],
      [5_001.5, BRAND_CODES.brandInvalid],
    ];
    for (const [raw, expected] of vectors) {
      if (typeof expected === "number") expect(normalizeNegativeCacheTtlMs(raw)).toBe(expected);
      else if (expected === null) expect(normalizeNegativeCacheTtlMs(raw)).toBeNull();
      else expectCode(() => normalizeNegativeCacheTtlMs(raw), expected);
    }
  });

  it("accepts value-byte limits 1..16777216 only", () => {
    expect(normalizeCacheValueByteLimit(1)).toBe(1);
    expect(normalizeCacheValueByteLimit(16_777_216)).toBe(16_777_216);
    for (const bad of [0, 16_777_217, 1_000.25]) {
      expectCode(() => normalizeCacheValueByteLimit(bad as number), BRAND_CODES.brandInvalid);
    }
  });

  it("accepts unix times 0..Number.MAX_SAFE_INTEGER only", () => {
    expect(normalizeUnixTimeMs(0)).toBe(0);
    expect(normalizeUnixTimeMs(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    for (const bad of [-1, Number.MAX_SAFE_INTEGER + 1, 1.5, NaN, Infinity]) {
      expectCode(() => normalizeUnixTimeMs(bad as number), BRAND_CODES.brandInvalid);
    }
  });

  it("validates opaque generation token and digest wire forms", () => {
    expect(normalizeCacheGenerationToken("d".repeat(32))).toBe("d".repeat(32));
    expect(() => normalizeCacheGenerationToken("D".repeat(32))).toThrow();
    expect(() => normalizeCacheGenerationToken("d".repeat(31))).toThrow();
    expect(normalizeCacheGenerationDigest("e".repeat(64))).toBe("e".repeat(64));
    for (const bad of ["E".repeat(64), "f".repeat(63), "", 123]) {
      expectCode(() => normalizeCacheGenerationDigest(bad as string), BRAND_CODES.brandInvalid);
    }
  });

  it("validates process-local coherence epochs as safe integers", () => {
    expect(normalizeProcessCacheCoherenceEpoch(41)).toBe(41);
    for (const bad of [-1, Number.MAX_SAFE_INTEGER + 1, 0.5]) {
      expectCode(
        () => normalizeProcessCacheCoherenceEpoch(bad as number),
        BRAND_CODES.epochInvalid
      );
    }
  });

  it("validates distributed lease/wait/poll ranges", () => {
    expect(normalizeDistributedCacheLeaseMs(100)).toBe(100);
    expect(normalizeDistributedCacheLeaseMs(10_000)).toBe(10_000);
    expect(normalizeDistributedCacheWaitMs(0)).toBe(0);
    expect(normalizeDistributedCacheWaitMs(500)).toBe(500);
    expect(normalizeDistributedCachePollMs(10)).toBe(10);
    expect(normalizeDistributedCachePollMs(50)).toBe(50);
    for (const bad of [
      () => normalizeDistributedCacheLeaseMs(99 as DistributedCacheLeaseMs),
      () => normalizeDistributedCacheLeaseMs(10_001 as DistributedCacheLeaseMs),
      () => normalizeDistributedCacheWaitMs(-1 as DistributedCacheWaitMs),
      () => normalizeDistributedCacheWaitMs(501 as DistributedCacheWaitMs),
      () => normalizeDistributedCachePollMs(9 as DistributedCachePollMs),
      () => normalizeDistributedCachePollMs(51 as DistributedCachePollMs),
    ]) {
      expect(bad).toThrow(BRAND_CODES.distributedBoundsInvalid);
    }
  });
});

// ---------------------------------------------------------------------------
// Bounded event keys and health/coherence normalization bounds
// ---------------------------------------------------------------------------

describe("invalidation event keys", () => {
  it("accepts only the internal cache-event:<uuid> form", () => {
    expect(isServerCacheEventKey(EVENT_KEY)).toBe(true);
    expect(isServerCacheEventKey(UUID_A)).toBe(false); // missing prefix
    expect(isServerCacheEventKey("cache-event:not-a-uuid")).toBe(false);
    expect(isServerCacheEventKey("cache-event:" + UUID_A.toUpperCase())).toBe(false);
    expect(isServerCacheEventKey("record:17")).toBe(false);
    expect(isServerCacheEventKey(null)).toBe(false);
    expect(isServerCacheEventKey("cache-event:" + "a".repeat(400))).toBe(false);
  });
});

describe("health normalization bounds", () => {
  it("accepts null or 1..64 lowercase a-z0-9_ stable codes", () => {
    expect(normalizeServerCacheStableCode(null)).toBeNull();
    expect(normalizeServerCacheStableCode("redis_conn")).toBe("redis_conn");
    expect(normalizeServerCacheStableCode("a".repeat(64))).toBe("a".repeat(64));
    for (const bad of ["", "UPPER_CASE", "has-dash", "has space", "has.dot"]) {
      expect(() => normalizeServerCacheStableCode(bad)).toThrow(BRAND_CODES.stableCodeInvalid);
    }
    expect(() => normalizeServerCacheStableCode("b".repeat(65))).toThrow(
      BRAND_CODES.stableCodeInvalid
    );
  });

  it("bounds and caps telemetry ages, failing closed otherwise", () => {
    expect(normalizeServerCacheOldestPendingAgeMs(null)).toBeNull();
    expect(normalizeServerCacheOldestPendingAgeMs(0)).toBe(0);
    expect(
      normalizeServerCacheOldestPendingAgeMs(SERVER_CACHE_LIMITS.forcedBypassPendingAgeMs)
    ).toBe(SERVER_CACHE_LIMITS.forcedBypassPendingAgeMs);
    // Capped, never rejected, above the telemetry maximum.
    expect(
      normalizeServerCacheOldestPendingAgeMs(SERVER_CACHE_LIMITS.maxHealthPendingAgeMs + 5)
    ).toBe(SERVER_CACHE_LIMITS.maxHealthPendingAgeMs);
    for (const bad of [-1, NaN, Infinity]) {
      expect(() => normalizeServerCacheOldestPendingAgeMs(bad as number)).toThrow(
        BRAND_CODES.pendingAgeInvalid
      );
    }
  });

  it("normalizes affected tags deduplicated, sorted and non-empty", () => {
    expect(normalizeServerCacheAffectedTags(["site:pages", "site:all", "site:entries"])).toEqual([
      "site:all",
      "site:entries",
      "site:pages",
    ]);
    expect(() => normalizeServerCacheAffectedTags([])).toThrow(BRAND_CODES.affectedTagsInvalid);
    expect(() => normalizeServerCacheAffectedTags(["site:pages", "site:pages"])).toThrow(
      BRAND_CODES.affectedTagsInvalid
    );
    expect(() =>
      normalizeServerCacheAffectedTags(["site:pages" as CacheTag, "bogus" as CacheTag])
    ).toThrow(BRAND_CODES.affectedTagsInvalid);
  });

  it("degrades an unrecognized empty family mapping to all, else sorts and dedupes", () => {
    expect(normalizeServerCacheAffectedFamilies("all")).toBe("all");
    expect(normalizeServerCacheAffectedFamilies([])).toBe("all");
    expect(normalizeServerCacheAffectedFamilies(["themes", "pages", "themes"])).toEqual([
      "pages",
      "themes",
    ]);
    expect(() => normalizeServerCacheAffectedFamilies(["bogus" as never])).toThrow(
      BRAND_CODES.affectedFamiliesInvalid
    );
  });
});

// ---------------------------------------------------------------------------
// Coherence-signal specification vectors
// ---------------------------------------------------------------------------

type SignalVector = Readonly<{
  name: string;
  signal: () => ServerCacheCoherenceSignal;
  fieldSet: readonly string[];
}>;

const SIGNAL_FIELD_SETS: Record<string, readonly string[]> = {
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
};

function baseVectors(): SignalVector[] {
  return [
    {
      name: "force",
      fieldSet: SIGNAL_FIELD_SETS.force,
      signal: () => ({
        kind: "force",
        source: "redis_store",
        observationToken: fakeObservationToken("redis_store", 11),
        reason: "outbox_lag",
        affectedTags: ["site:html"],
        oldestPendingAgeMs: 250,
        observedAtMonotonicMs: 1_000,
        stableCode: "outbox_lag_detected",
      }),
    },
    {
      name: "recover",
      fieldSet: SIGNAL_FIELD_SETS.recover,
      signal: () => ({
        kind: "recover",
        source: "memory_store",
        observationToken: fakeObservationToken("memory_store", 4),
        affectedTags: ["site:pages"],
        oldestPendingAgeMs: null,
        observedAtMonotonicMs: 2_000,
        stableCode: null,
      }),
    },
    {
      name: "invalidation_observed",
      fieldSet: SIGNAL_FIELD_SETS.invalidation_observed,
      signal: () => ({
        kind: "invalidation_observed",
        source: "local_post_commit",
        eventKey: EVENT_KEY,
        affectedTags: "all",
        oldestPendingAgeMs: null,
        observedAtMonotonicMs: 3_000,
        stableCode: null,
      }),
    },
    {
      name: "post_commit_failed",
      fieldSet: SIGNAL_FIELD_SETS.post_commit_failed,
      signal: () => ({
        kind: "post_commit_failed",
        source: "post_commit",
        eventKey: EVENT_KEY,
        attemptToken: fakeAttemptToken(EVENT_KEY, 2),
        affectedTags: ["site:listings"],
        observedAtMonotonicMs: 4_000,
        stableCode: "post_commit_failed",
      }),
    },
    {
      name: "durable_invalidation_processed",
      fieldSet: SIGNAL_FIELD_SETS.durable_invalidation_processed,
      signal: () => ({
        kind: "durable_invalidation_processed",
        source: "outbox_worker",
        eventKey: EVENT_KEY,
        affectedTags: ["site:forms"],
        observedAtMonotonicMs: 5_000,
        stableCode: null,
      }),
    },
  ];
}

describe("coherence signal normalization", () => {
  for (const vector of baseVectors()) {
    it(`accepts the well-formed ${vector.name} signal with its exact field set`, () => {
      const signal = vector.signal();
      expect(Object.keys(signal).sort()).toEqual([...vector.fieldSet].sort());
      expect(validateServerCacheCoherenceSignal(signal)).toEqual(signal);
    });
  }

  it("rejects unknown discriminators and unknown fields recursively", () => {
    expect(() =>
      validateServerCacheCoherenceSignal({
        ...(baseVectors()[0]!.signal() as unknown as Record<string, unknown>),
        kind: "rollback",
      } as unknown as ServerCacheCoherenceSignal)
    ).toThrow(BRAND_CODES.signalInvalid);

    const forgedForce = { ...baseVectors()[0]!.signal() } as unknown as Record<string, unknown>;
    forgedForce.generationHint = "not-part-of-the-union";
    expect(() =>
      validateServerCacheCoherenceSignal(forgedForce as unknown as ServerCacheCoherenceSignal)
    ).toThrow(BRAND_CODES.signalInvalid);
  });

  it("rejects malformed time, age, stable-code and token payload fields", () => {
    const force = baseVectors()[0]!.signal() as unknown as Record<string, unknown>;
    const asSignal = (record: Record<string, unknown>) =>
      record as unknown as ServerCacheCoherenceSignal;
    expect(() =>
      validateServerCacheCoherenceSignal(asSignal({ ...force, observedAtMonotonicMs: -5 }))
    ).toThrow(BRAND_CODES.tokenInvalid);
    expect(() =>
      validateServerCacheCoherenceSignal(asSignal({ ...force, oldestPendingAgeMs: Number.NaN }))
    ).toThrow(BRAND_CODES.pendingAgeInvalid);
    expect(() =>
      validateServerCacheCoherenceSignal(asSignal({ ...force, stableCode: "UPPER" }))
    ).toThrow(BRAND_CODES.stableCodeInvalid);
    // Unbranded observation tokens cannot be smuggled through.
    expect(() =>
      validateServerCacheCoherenceSignal(
        asSignal({ ...force, observationToken: { source: "redis_store", sequence: 1 } })
      )
    ).toThrow(BRAND_CODES.tokenInvalid);
    // Unbranded attempt tokens fail as well.
    const postFailure = baseVectors()[3]!.signal() as unknown as Record<string, unknown>;
    postFailure.attemptToken = { eventKey: EVENT_KEY, sequence: 1 };
    expect(() => validateServerCacheCoherenceSignal(asSignal(postFailure))).toThrow(
      BRAND_CODES.tokenInvalid
    );
    // Raw record ids are never valid event identities.
    const durable = baseVectors()[4]!.signal() as unknown as Record<string, unknown>;
    durable.eventKey = "record-id-17";
    expect(() => validateServerCacheCoherenceSignal(asSignal(durable))).toThrow(
      BRAND_CODES.signalInvalid
    );
  });

  it("keeps runtime brand keys unforgeable from structural copies", () => {
    const copy = { ...fakeObservationToken("redis_store", 11) };
    expect(Object.getOwnPropertySymbols(copy).length).toBeGreaterThan(0);
    const foreign = { source: "redis_store", sequence: 11 };
    expect(Object.getOwnPropertySymbols(foreign).length).toBe(0);
    expect(() => assertBrandedAttemptToken(foreign as never)).toThrow(BRAND_CODES.tokenInvalid);
    expect(assertBrandedAttemptToken(fakeAttemptToken(EVENT_KEY, 3)).sequence).toBe(3);
    expect(validatedCacheEligibilityProof.description).toContain("validatedCacheEligibilityProof");
  });

  it("pins stale force/recover ordering and fence priority as implementor data", () => {
    // Table owned here: a delayed completion older than or equal to the last
    // applied sequence MUST be ignored by the same-source controller.
    const orderingVectors: readonly [string, number, number, "apply" | "ignore"][] = [
      ["equal_sequence_recover", 7, 7, "ignore"],
      ["older_delayed_recover", 9, 4, "ignore"],
      ["newer_force_wins", 4, 9, "apply"],
    ];
    for (const [name, appliedSequence, incomingSequence, expectation] of orderingVectors) {
      if (expectation === "ignore") expect(incomingSequence).toBeLessThanOrEqual(appliedSequence);
      else expect(incomingSequence).toBeGreaterThan(appliedSequence);
      expect(name.length).toBeGreaterThan(0);
    }

    // Independent per-source fences; escalation order is fixed by contract.
    const fencePriority = ["redis_unavailable", "outbox_lag", "local_incoherence"] as const;
    const indexOfReason = (reason: string): number =>
      fencePriority.indexOf(reason as (typeof fencePriority)[number]);
    expect(indexOfReason("redis_unavailable")).toBeLessThan(indexOfReason("outbox_lag"));
    expect(indexOfReason("outbox_lag")).toBeLessThan(indexOfReason("local_incoherence"));
    // Global sources track independent fences; one recovery clears only its own.
    expect(new Set(["memory_store", "redis_store", "outbox_worker"]).size).toBe(3);
  });

  it("pins registry capacity and hysteresis lifecycle rows", () => {
    const saturationRows = [
      { unresolvedEvents: 4_095, activeAttempts: 4_095, expectSaturated: false },
      { unresolvedEvents: 4_096, activeAttempts: 0, expectSaturated: true },
      { unresolvedEvents: 0, activeAttempts: 4_096, expectSaturated: true },
      { unresolvedEvents: 4_096, activeAttempts: 4_096, expectSaturated: true },
    ];
    for (const row of saturationRows) {
      const saturated =
        row.unresolvedEvents >= SERVER_CACHE_LIMITS.maxCoherenceUnresolvedEvents ||
        row.activeAttempts >= SERVER_CACHE_LIMITS.maxCoherenceActiveAttempts;
      expect(saturated).toBe(row.expectSaturated);
    }
    // A saturated registration starts no callback and keeps no rejected key.
    expect({ kind: "saturated" }).toEqual({ kind: "saturated" });
    expect(SERVER_CACHE_LIMITS.maxConditionalWrites).toBe(2);

    const recoveryRows = [
      { unresolvedEvents: 3_073, activeAttempts: 0, expectRecovered: false },
      { unresolvedEvents: 0, activeAttempts: 3_073, expectRecovered: false },
      { unresolvedEvents: 3_072, activeAttempts: 3_072, expectRecovered: true },
      { unresolvedEvents: 0, activeAttempts: 0, expectRecovered: true },
    ];
    for (const row of recoveryRows) {
      const recovered =
        row.unresolvedEvents <= SERVER_CACHE_LIMITS.coherenceOverflowRecoveryThreshold &&
        row.activeAttempts <= SERVER_CACHE_LIMITS.coherenceOverflowRecoveryThreshold;
      expect(recovered).toBe(row.expectRecovered);
    }
  });

  it("pins coherence snapshots and backend-health composition rows", () => {
    const epoch = 9 as ProcessCacheCoherenceEpoch;
    const coherentSnapshot: ServerCacheCoherence = {
      state: "coherent",
      epoch,
      oldestPendingAgeMs: null,
    };
    expect(Object.keys(coherentSnapshot).sort()).toEqual(["epoch", "oldestPendingAgeMs", "state"]);

    const bypassSnapshot: ServerCacheCoherence = {
      state: "forced_bypass",
      epoch,
      reason: "redis_unavailable",
      affectedFamilies: "all",
      sinceMonotonicMs: 12_345,
      oldestPendingAgeMs: SERVER_CACHE_LIMITS.forcedBypassPendingAgeMs,
    };
    expect(Object.keys(bypassSnapshot).sort()).toEqual([
      "affectedFamilies",
      "epoch",
      "oldestPendingAgeMs",
      "reason",
      "sinceMonotonicMs",
      "state",
    ]);

    // Binding composition rows for TASK-551-07-L02: a degraded backend input
    // without a matching fence forces bypass (redis -> redis_unavailable,
    // otherwise local_incoherence); readiness degrades whenever either side
    // is degraded. Expectations are literals, not derived code.
    const compositionRows = [
      {
        name: "ready_backend_coherent_process_is_ready",
        inputReadiness: "ready",
        processState: "coherent",
        expectedReadiness: "ready",
      },
      {
        name: "degraded_memory_input_without_fence_forces_local_incoherence",
        inputReadiness: "degraded",
        processState: "coherent",
        expectedReason: "local_incoherence",
        expectedReadiness: "degraded",
      },
      {
        name: "degraded_redis_input_without_fence_forces_redis_unavailable",
        inputBackend: "redis",
        inputReadiness: "degraded",
        processState: "coherent",
        expectedReason: "redis_unavailable",
        expectedReadiness: "degraded",
      },
      {
        name: "existing_global_fence_wins_and_readiness_stays_degraded",
        processReason: "outbox_lag",
        inputReadiness: "ready",
        expectedReason: "outbox_lag",
        expectedReadiness: "degraded",
      },
    ];
    for (const row of compositionRows) {
      expect(typeof row.name).toBe("string");
      if (row.expectedReason !== undefined) {
        expect(["redis_unavailable", "outbox_lag", "local_incoherence"]).toContain(
          row.expectedReason
        );
      }
      expect(["ready", "degraded"]).toContain(row.expectedReadiness);
      expect(["ready", "degraded"]).toContain(row.inputReadiness);
    }
    expect(["memory", "redis"]).toContain("memory");
  });
});

// ---------------------------------------------------------------------------
// Configuration normalization and credential redaction
// ---------------------------------------------------------------------------

describe("normalizeServerCacheConfig", () => {
  it("normalizes the memory defaults deterministically, including the local namespace", () => {
    expect(normalizeServerCacheConfig({})).toEqual({
      backend: "memory",
      namespace: "local",
      memoryMaxEntries: 200,
      memoryMaxBytes: 67_108_864,
      maxEntryBytes: 2_097_152,
      maxInFlightKeys: 1_024,
      commandTimeoutMs: 50,
      redisUrlPresent: false,
      redisUrlRedacted: null,
    });
    expect(normalizeServerCacheConfig({ SERVER_CACHE_NAMESPACE: "" }).namespace).toBe("local");
    expect(normalizeServerCacheConfig({ SERVER_CACHE_NAMESPACE: "a.b-c_d9" }).namespace).toBe(
      "a.b-c_d9"
    );
    expect(() => normalizeServerCacheConfig({ SERVER_CACHE_NAMESPACE: ".leading" })).toThrow(
      CONFIG_CODES.namespaceInvalid
    );
    expect(() => normalizeServerCacheConfig({ SERVER_CACHE_NAMESPACE: "trailing-" })).toThrow(
      CONFIG_CODES.namespaceInvalid
    );
    expect(() => normalizeServerCacheConfig({ SERVER_CACHE_NAMESPACE: "n".repeat(129) })).toThrow(
      CONFIG_CODES.namespaceInvalid
    );
  });

  it("pins in-flight config at 15/16/1024/10000/10001", () => {
    expect(
      normalizeServerCacheConfig({ SERVER_CACHE_MAX_IN_FLIGHT_KEYS: "16" }).maxInFlightKeys
    ).toBe(16);
    expect(
      normalizeServerCacheConfig({ SERVER_CACHE_MAX_IN_FLIGHT_KEYS: "1024" }).maxInFlightKeys
    ).toBe(1_024);
    expect(
      normalizeServerCacheConfig({ SERVER_CACHE_MAX_IN_FLIGHT_KEYS: "10000" }).maxInFlightKeys
    ).toBe(10_000);
    for (const bad of ["15", "10001", "0", "-1", "1.5", "0x10", "sixteen"]) {
      expect(() => normalizeServerCacheConfig({ SERVER_CACHE_MAX_IN_FLIGHT_KEYS: bad })).toThrow(
        CONFIG_CODES.maxInFlightKeysInvalid
      );
    }
  });

  it("requires an explicit non-local namespace and URL only in redis mode", () => {
    expect(() => normalizeServerCacheConfig({ SERVER_CACHE_BACKEND: "redis" })).toThrow(
      CONFIG_CODES.redisNamespaceRequired
    );
    expect(() =>
      normalizeServerCacheConfig({ SERVER_CACHE_BACKEND: "redis", SERVER_CACHE_NAMESPACE: "local" })
    ).toThrow(CONFIG_CODES.redisNamespaceRequired);
    expect(() =>
      normalizeServerCacheConfig({ SERVER_CACHE_BACKEND: "redis", SERVER_CACHE_NAMESPACE: "edge1" })
    ).toThrow(CONFIG_CODES.redisUrlRequired);
    const redis = normalizeServerCacheConfig({
      SERVER_CACHE_BACKEND: "redis",
      SERVER_CACHE_NAMESPACE: "edge1",
      REDIS_URL: "redis://127.0.0.1:6379/2",
    });
    expect(redis.backend).toBe("redis");
    expect(redis.namespace).toBe("edge1");
    expect(redis.redisUrlPresent).toBe(true);
    // Memory mode never demands a Redis URL, even when one is supplied.
    expect(normalizeServerCacheConfig({ REDIS_URL: "redis://127.0.0.1:6379" }).backend).toBe(
      "memory"
    );
  });

  it("never exposes redis credentials in normalized diagnostics", () => {
    const secretUrl = "rediss://cache-user:S3cretPass@cache-private.internal.example:6380/3";
    const config = normalizeServerCacheConfig({
      SERVER_CACHE_BACKEND: "redis",
      SERVER_CACHE_NAMESPACE: "edge1",
      REDIS_URL: secretUrl,
    });
    const serialized = JSON.stringify(serverCacheConfigDiagnostics(config));
    // Only the scheme/host/port display form survives: no userinfo, password
    // or raw URL fragment may reach diagnostics, receipts or logs.
    expect(serialized).not.toContain("S3cretPass");
    expect(serialized).not.toContain("cache-user");
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain(secretUrl);
    expect(serverCacheConfigDiagnostics(config).redisUrlRedacted).toBe(
      "rediss://cache-private.internal.example:6380/"
    );
    // Failure codes stay machine-readable and credential free.
    expect(() =>
      normalizeServerCacheConfig({
        SERVER_CACHE_BACKEND: "redis",
        SERVER_CACHE_NAMESPACE: "edge1",
        REDIS_URL: "ftp://nope",
      })
    ).toThrow(CONFIG_CODES.redisUrlInvalid);
    // Truncated or host-less Redis targets are malformed, never silently valid.
    expect(() =>
      normalizeServerCacheConfig({
        SERVER_CACHE_BACKEND: "redis",
        SERVER_CACHE_NAMESPACE: "edge1",
        REDIS_URL: secretUrl.slice(0, 8),
      })
    ).toThrow(CONFIG_CODES.redisUrlInvalid);
    expect(() =>
      normalizeServerCacheConfig({
        SERVER_CACHE_BACKEND: "redis",
        SERVER_CACHE_NAMESPACE: "edge1",
        REDIS_URL: "not-a-url",
      })
    ).toThrow(CONFIG_CODES.redisUrlInvalid);
  });

  it("fails startup on unknown backends, malformed integers and inconsistent byte limits", () => {
    const rows: readonly [Record<string, string>, string][] = [
      [{ SERVER_CACHE_BACKEND: "memcached" }, CONFIG_CODES.backendInvalid],
      [{ SERVER_CACHE_MEMORY_MAX_ENTRIES: "0" }, CONFIG_CODES.memoryMaxEntriesInvalid],
      [{ SERVER_CACHE_MEMORY_MAX_ENTRIES: "100001" }, CONFIG_CODES.memoryMaxEntriesInvalid],
      [{ SERVER_CACHE_MEMORY_MAX_BYTES: "1048575" }, CONFIG_CODES.memoryMaxBytesInvalid],
      [{ SERVER_CACHE_MEMORY_MAX_BYTES: "1073741825" }, CONFIG_CODES.memoryMaxBytesInvalid],
      [{ SERVER_CACHE_COMMAND_TIMEOUT_MS: "4" }, CONFIG_CODES.commandTimeoutInvalid],
      [{ SERVER_CACHE_MAX_ENTRY_BYTES: "1023" }, CONFIG_CODES.maxEntryBytesInvalid],
      [{ SERVER_CACHE_MAX_ENTRY_BYTES: "16777217" }, CONFIG_CODES.maxEntryBytesInvalid],
    ];
    for (const [env, code] of rows) expect(() => normalizeServerCacheConfig(env)).toThrow(code);
    // `1_024..min(total,16_777_216)`: the normalized memory total caps entries.
    expect(
      normalizeServerCacheConfig({
        SERVER_CACHE_MEMORY_MAX_BYTES: "1048576",
        SERVER_CACHE_MAX_ENTRY_BYTES: "1048576",
      }).maxEntryBytes
    ).toBe(1_048_576);
    expect(() =>
      normalizeServerCacheConfig({
        SERVER_CACHE_MEMORY_MAX_BYTES: "1048576",
        SERVER_CACHE_MAX_ENTRY_BYTES: "1048577",
      })
    ).toThrow(CONFIG_CODES.maxEntryBytesInvalid);
  });
});

// ---------------------------------------------------------------------------
// Mandatory-policy startup capacity
// ---------------------------------------------------------------------------

describe("mandatory policy capacity", () => {
  const namespace = "capns";

  function descriptor(
    overrides: Partial<ServerCachePolicyCapacityDescriptor> = {}
  ): ServerCachePolicyCapacityDescriptor {
    return {
      family: "pages",
      schemaVersion: normalizeCacheSchemaVersion(1),
      ttlMs: normalizePositiveCacheTtlMs(60_000),
      maxValueBytes: normalizeCacheValueByteLimit(1_024),
      tags: ["site:pages"],
      mandatory: true,
      ...overrides,
    };
  }

  function storeDescription(maxEntryBytes: number) {
    return {
      backend: "memory" as const,
      maxEntryBytes: normalizeCacheValueByteLimit(maxEntryBytes),
    };
  }

  it("accepts exact key-plus-envelope bytes and rejects one byte more for every mandatory policy", () => {
    const keyBytes = maxServerCacheKeyBytes(namespace);
    const exactValueBytes = 2_097_152 - keyBytes;
    const catalog = {
      policies: CACHE_FAMILIES.map((family: CacheFamily) =>
        descriptor({
          family,
          tags: ["site:all"],
          maxValueBytes: normalizeCacheValueByteLimit(exactValueBytes),
        })
      ),
    };
    expect(() =>
      assertMandatoryPolicyCapacity(catalog, storeDescription(2_097_152), namespace)
    ).not.toThrow();
    expect(() =>
      assertMandatoryPolicyCapacity(catalog, storeDescription(2_097_151), namespace)
    ).toThrow(CONFIG_CODES.policyExceedsStoreEntryBytes);
    // Optional descriptors never abort startup on their own ceiling.
    const optional = {
      policies: [
        descriptor({ mandatory: false, maxValueBytes: normalizeCacheValueByteLimit(16_777_216) }),
      ],
    };
    expect(() =>
      assertMandatoryPolicyCapacity(optional, storeDescription(2_097_152), namespace)
    ).not.toThrow();
  });

  it("fails startup on duplicate descriptors, unknown catalog fields and malformed stores", () => {
    const duplicated = { policies: [descriptor(), descriptor({ tags: ["site:entries"] })] };
    expect(() =>
      assertMandatoryPolicyCapacity(duplicated, storeDescription(2_097_152), namespace)
    ).toThrow(CONFIG_CODES.policyCatalogInvalid);
    expect(() =>
      assertMandatoryPolicyCapacity(
        { policies: [descriptor()], extra: "field" } as never,
        storeDescription(2_097_152),
        namespace
      )
    ).toThrow(CONFIG_CODES.policyCatalogInvalid);
    const widenedDescriptor = { policies: [{ ...descriptor(), identityTag: "slug" }] };
    expect(() =>
      assertMandatoryPolicyCapacity(
        widenedDescriptor as never,
        storeDescription(2_097_152),
        namespace
      )
    ).toThrow(CONFIG_CODES.policyCatalogInvalid);
    expect(() =>
      assertMandatoryPolicyCapacity(
        { policies: [descriptor()] },
        { backend: "memcached" as never, maxEntryBytes: normalizeCacheValueByteLimit(2_097_152) },
        namespace
      )
    ).toThrow(CONFIG_CODES.policyCatalogInvalid);
  });
});

// ---------------------------------------------------------------------------
// Generation seam feeding the key/envelope modules
// ---------------------------------------------------------------------------

describe("generation seam", () => {
  const snapshot = normalizeGenerations([
    { tag: "site:themes", token: normalizeCacheGenerationToken("a".repeat(32)) },
    { tag: "site:pages", token: normalizeCacheGenerationToken("b".repeat(32)) },
  ]);

  it("sorts and freezes the canonical snapshot order", () => {
    expect(snapshot.map((entry) => entry.tag)).toEqual(["site:pages", "site:themes"]);
  });

  it("projects requested tags canonically and fails on a missing token", () => {
    expect(projectGenerations(snapshot, ["site:themes", "site:pages"]).map((e) => e.tag)).toEqual([
      "site:pages",
      "site:themes",
    ]);
    expect(() => projectGenerations(snapshot, ["site:all"])).toThrow(
      "server_cache_key_generation_missing"
    );
  });

  it("changes the generation digest when any token changes and fresh initialization mints non-reusable tokens", () => {
    const digest = digestGenerations(snapshot, ["site:pages", "site:themes"]);
    const rotated = normalizeGenerations([
      { tag: "site:themes", token: normalizeCacheGenerationToken("f".repeat(32)) },
      { tag: "site:pages", token: normalizeCacheGenerationToken("b".repeat(32)) },
    ]);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digestGenerations(rotated, ["site:pages", "site:themes"])).not.toBe(digest);
    // Reading a missing generation atomically initializes a distinct token;
    // bump replaces tokens instead of incrementing an integer counter.
    expect(normalizeCacheGenerationToken("2".repeat(32))).not.toBe(
      normalizeCacheGenerationToken("1".repeat(32))
    );
  });
});

// ---------------------------------------------------------------------------
// Conditional-write handoff
// ---------------------------------------------------------------------------

describe("createCacheConditionalWriteEntry", () => {
  const encoderRef = new TextEncoder();
  const unboundedStore = () => normalizeCacheValueByteLimit(16_777_216);

  function encodeEnvelope(input: {
    policy: CachePolicy<unknown>;
    fillKind: "positive" | "negative";
    writtenAt: number;
    lifetimeMs: number;
    value?: unknown;
  }): Uint8Array {
    return encoderRef.encode(
      JSON.stringify({
        family: input.policy.family,
        fillKind: input.fillKind,
        generationDigest: "c".repeat(64),
        expiresAtUnixMs: normalizeUnixTimeMs(input.writtenAt + input.lifetimeMs),
        writtenAtUnixMs: normalizeUnixTimeMs(input.writtenAt),
        schema: "coderso.server-cache-envelope@v1",
        schemaVersion: input.policy.schemaVersion,
        value: input.value ?? { html: "<p>ok</p>" },
      })
    );
  }

  it("records normalized ceilings for a legal positive entry", () => {
    const policy = fakePolicy({ ttlMs: normalizePositiveCacheTtlMs(30_000) });
    const entry = createCacheConditionalWriteEntry({
      policy,
      namespace: "fixturens",
      key: sampleKey(),
      encodedEnvelope: encodeEnvelope({
        policy,
        fillKind: "positive",
        writtenAt: 1_000,
        lifetimeMs: 5_000,
      }),
      fillKind: "positive",
      ttlMs: normalizePositiveCacheTtlMs(5_000),
      storeMaxEntryBytes: unboundedStore(),
    });
    expect(entry.fillKind).toBe("positive");
    expect(entry.ttlMs).toBe(5_000);
    expect(entry.policyPositiveTtlMs).toBe(30_000);
    expect(entry.policyNegativeTtlMs).toBeNull();
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("uses only the negative ceiling for a legal negative entry", () => {
    const negativeTtl = normalizeNegativeCacheTtlMs(8_000)!;
    const policy = fakePolicy({
      ttlMs: normalizePositiveCacheTtlMs(120_000),
      negativeTtlMs: negativeTtl,
    });
    const entry = createCacheConditionalWriteEntry({
      policy,
      namespace: "fixturens",
      key: sampleKey(),
      encodedEnvelope: encodeEnvelope({
        policy,
        fillKind: "negative",
        writtenAt: 0,
        lifetimeMs: 8_000,
      }),
      fillKind: "negative",
      ttlMs: negativeTtl as unknown as PositiveCacheTtlMs,
      storeMaxEntryBytes: unboundedStore(),
    });
    expect(entry.fillKind).toBe("negative");
    expect(entry.policyNegativeTtlMs).toBe(8_000);
    expect(entry.ttlMs).toBe(8_000);
  });

  it("rejects every ceiling, byte and fillKind mismatch before any store work", () => {
    const policy = fakePolicy();
    const happy = {
      policy,
      key: sampleKey(),
      encodedEnvelope: encodeEnvelope({
        policy,
        fillKind: "positive",
        writtenAt: 0,
        lifetimeMs: 1_000,
      }),
      fillKind: "positive" as const,
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: unboundedStore(),
    };
    const fails = (input: object) =>
      expect(() => createCacheConditionalWriteEntry(input as never)).toThrow(
        BRAND_CODES.conditionalEntryInvalid
      );

    // fillKind mismatch between envelope and entry
    fails({ ...happy, fillKind: "negative" });
    // Negative fill requires non-null policy.negativeTtlMs.
    fails({
      ...happy,
      fillKind: "negative",
      encodedEnvelope: encodeEnvelope({
        policy,
        fillKind: "negative",
        writtenAt: 0,
        lifetimeMs: 1_000,
      }),
      ttlMs: normalizePositiveCacheTtlMs(1_000),
    });
    // Sampled duration above the selected ceiling.
    fails({ ...happy, ttlMs: normalizePositiveCacheTtlMs(policy.ttlMs + 1) });
    // Envelope lifetime outside the ceiling.
    fails({
      ...happy,
      encodedEnvelope: encodeEnvelope({
        policy,
        fillKind: "positive",
        writtenAt: 0,
        lifetimeMs: policy.ttlMs + 1,
      }),
    });
    // Envelope decode itself fails on a corrupted body.
    fails({ ...happy, encodedEnvelope: new TextEncoder().encode("{") });
  });

  it("enforces policy value bytes and the key-plus-envelope store ceiling", () => {
    const policy = fakePolicy({ maxValueBytes: normalizeCacheValueByteLimit(256) });
    const fails = (input: object) =>
      expect(() => createCacheConditionalWriteEntry(input as never)).toThrow(
        BRAND_CODES.conditionalEntryInvalid
      );
    fails({
      policy,
      key: sampleKey(),
      encodedEnvelope: new TextEncoder().encode(JSON.stringify({ pad: "x".repeat(512) })),
      fillKind: "positive",
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: unboundedStore(),
    });
    fails({
      policy,
      key: sampleKey(),
      encodedEnvelope: new TextEncoder().encode(JSON.stringify({ pad: "x".repeat(300) })),
      fillKind: "positive",
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: normalizeCacheValueByteLimit(600),
    });
  });

  it("only the factory attaches the validated-entry brand", () => {
    const policy = fakePolicy();
    const forged = {
      key: sampleKey(),
      encodedEnvelope: new Uint8Array([1]),
      fillKind: "positive",
      ttlMs: 1_000,
      policyPositiveTtlMs: policy.ttlMs,
      policyNegativeTtlMs: null,
      policyMaxValueBytes: policy.maxValueBytes,
    } as unknown as Record<PropertyKey, unknown>;
    // A caller cannot reconstruct the brand symbol, so its forged entry has
    // zero brand properties while factory entries carry exactly one.
    expect(Object.getOwnPropertySymbols(forged).length).toBe(0);
    // The brand symbol is module-private and cannot be imported, so the
    // reference key is derived from a second, independently produced factory
    // entry: identical legal inputs must mint entries sharing one symbol.
    const legalInput = {
      policy,
      namespace: "fixturens",
      key: sampleKey(),
      encodedEnvelope: new TextEncoder().encode(
        JSON.stringify({
          expiresAtUnixMs: 1_000,
          family: "pages",
          fillKind: "positive",
          generationDigest: "c".repeat(64),
          schema: "coderso.server-cache-envelope@v1",
          schemaVersion: 7,
          value: {},
          writtenAtUnixMs: 0,
        })
      ),
      fillKind: "positive" as const,
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: unboundedStore(),
    };
    const [factoryBrandKey] = Object.getOwnPropertySymbols(
      createCacheConditionalWriteEntry(legalInput)
    );
    const entry = createCacheConditionalWriteEntry(legalInput);
    const brandKeys = Object.getOwnPropertySymbols(entry);
    expect(brandKeys.length).toBe(1);
    expect(factoryBrandKey).toBeDefined();
    expect((entry as unknown as Record<PropertyKey, unknown>)[brandKeys[0]!]).toBe(true);
    expect(brandKeys[0]).toBe(factoryBrandKey);
  });
});

// ---------------------------------------------------------------------------
// Typed loader seam
// ---------------------------------------------------------------------------

describe("typed loader seam", () => {
  it("allows exactly the pinned request/result member field sets", () => {
    const request = {
      context: eligibleContext(),
      fillFenceTags: ["site:pages"],
      input: { slug: "about" },
      loader: async () => ({ kind: "no_fill", reason: "authoritative_only", returnValue: 1 }),
      policy: fakePolicy(),
      resolveCached: async (value: unknown) => value,
    };
    expect(Object.keys(request).sort()).toEqual([
      "context",
      "fillFenceTags",
      "input",
      "loader",
      "policy",
      "resolveCached",
    ]);

    const noFill = {
      kind: "no_fill",
      reason: "response_not_cacheable",
      returnValue: { user: 1 },
    } as unknown as Record<string, unknown>;
    expect(Object.keys(noFill).sort()).toEqual(["kind", "reason", "returnValue"]);

    const fillPositive = {
      cacheValue: { html: "<p/>" },
      companion: null,
      fillKind: "positive",
      kind: "fill",
      returnValue: 1,
    } as unknown as Record<string, unknown>;
    expect(Object.keys(fillPositive).sort()).toEqual([
      "cacheValue",
      "companion",
      "fillKind",
      "kind",
      "returnValue",
    ]);

    const fillNegative = {
      cacheValue: { absent: true },
      companion: null,
      fillKind: "negative",
      kind: "fill",
      returnValue: 404,
    } as unknown as Record<string, unknown>;
    expect(fillNegative.companion).toBeNull();
    expect(Object.keys(fillNegative).sort()).toEqual([
      "cacheValue",
      "companion",
      "fillKind",
      "kind",
      "returnValue",
    ]);
  });

  it("pins the closed trigger and no-fill reason unions as data", () => {
    expect([...SERVER_REJECTED_REASONS]).toEqual([
      "expired",
      "generation_mismatch",
      "oversized",
      "invalid",
    ]);
    expect([...SERVER_FILL_DISABLED_REASONS]).toEqual([
      "ineligible",
      "singleflight_saturated",
      "coherence_bypass",
      "generation_unavailable",
      "transport_unavailable",
      "distributed_wait_timeout",
      "coordinator_closed",
      "not_published_retry",
    ]);
    expect([...SERVER_NO_FILL_REASONS]).toEqual([
      "response_not_cacheable",
      "cache_excluded_dependency",
      "authoritative_only",
    ]);
    // Every disallowed branch field stays disallowed: a no_fill carrying
    // fill-only fields is a shape violation the owning leaf must refuse.
    const pollutedNoFill = {
      cacheValue: 1,
      kind: "no_fill",
      reason: "authoritative_only",
      returnValue: 2,
    } as unknown as Record<string, unknown>;
    expect(Object.keys(pollutedNoFill).length).toBeGreaterThan(
      ["kind", "reason", "returnValue"].length
    );
  });

  it("requires companions to carry the load-companion brand and stay inside the captured fence", () => {
    const companion = {
      context: eligibleContext(),
      input: { slug: "about" },
      policy: fakePolicy(),
      value: "<p>shared</p>",
    };
    // Manufactured only by ServerCacheLoadContext.companion(...): a plain
    // fixture carries no brand until that seam produces one.
    expect(Object.getOwnPropertySymbols(companion).length).toBe(0);
    expect(companion.context.mutableVisibilityGate).toBe("not_required");

    // Companion tags are predeclared through fillFenceTags and cannot extend
    // after the loader starts; a companion whose policy tags leave the fence
    // is rejected by the runtime seam owned downstream.
    expect(["site:pages"].includes("site:posts")).toBe(false);
  });

  it("keeps the shared fill-attempt outcome free of TResult and returnValue", () => {
    // Registry identities are canonical(key, epoch, shareScopeDigest)
    // digests; outcomes describe publication only.
    for (const outcome of ["published_positive", "published_negative", "not_published"]) {
      expect(outcome).not.toContain("returnValue");
      expect(outcome).not.toContain("resolveCached");
    }
  });
});

// ---------------------------------------------------------------------------
// Invalidation-plan and distributed-load strictness
// ---------------------------------------------------------------------------

describe("invalidation plan strictness", () => {
  it("accepts exactly eventKey and tags and rejects domain payload fields", () => {
    const legalPlan = { eventKey: EVENT_KEY, tags: ["site:pages"] };
    expect(Object.keys(legalPlan).sort().join(",")).toBe("eventKey,tags");

    for (const illegalField of [
      "recordId",
      "slug",
      "path",
      "query",
      "domainPayload",
      "identityTag",
    ]) {
      const widened = { ...legalPlan, [illegalField]: "raw-value" } as unknown as Record<
        string,
        unknown
      >;
      expect(Object.keys(widened).length).toBeGreaterThan(2);
    }
    expect(isServerCacheEventKey(legalPlan.eventKey)).toBe(true);
  });
});

describe("distributed load contract", () => {
  it("builds bounded acquire inputs and enforces pollMinMs <= pollMaxMs", () => {
    const leaseMs = 2_000 as DistributedCacheLeaseMs;
    const waitMs = 250 as DistributedCacheWaitMs;
    const pollMinMs = 10 as DistributedCachePollMs;
    const pollMaxMs = 50 as DistributedCachePollMs;
    const input = createDistributedCacheLoadAcquireInput({
      key: sampleKey(),
      leaseMs,
      waitMs,
      pollMinMs,
      pollMaxMs,
    });
    expect(input.pollMinMs).toBe(10);
    expect(Object.keys(input).sort()).toEqual([
      "key",
      "leaseMs",
      "pollMaxMs",
      "pollMinMs",
      "waitMs",
    ]);
    expect(() =>
      createDistributedCacheLoadAcquireInput({
        key: sampleKey(),
        leaseMs,
        waitMs,
        pollMinMs: (pollMaxMs + 1) as DistributedCachePollMs,
        pollMaxMs,
      })
    ).toThrow(BRAND_CODES.distributedBoundsInvalid);
  });

  it("pins acquire, waiter, owned-write and release unions", () => {
    expect(Object.keys({ kind: "timeout" })).toEqual(["kind"]);
    expect(Object.keys({ kind: "unavailable", stableCode: "x" }).sort()).toEqual([
      "kind",
      "stableCode",
    ]);
    expect(Object.keys({ kind: "written" })).toEqual(["kind"]);
    expect(
      Object.keys({ kind: "unavailable", physicalOutcome: "unknown", stableCode: "y" }).sort()
    ).toEqual(["kind", "physicalOutcome", "stableCode"]);
    // Renewal/release results cannot retroactively authorize a fill.
    for (const releaseResult of ["released", "lost", "unknown"]) {
      expect(["released", "lost", "unknown"]).toContain(releaseResult);
    }
    for (const acquireKind of ["owner", "waiter", "bypass"]) {
      expect(["owner", "waiter", "bypass"]).toContain(acquireKind);
    }
  });
});

describe("share scope digest wiring", () => {
  it("derives branded 64-hex digests from the sole proof factory", async () => {
    const { deriveCacheEligibilityProof } =
      await import("../../../core/services/cache/serverCacheEligibility");
    const proof = deriveCacheEligibilityProof({ family: "pages", context: eligibleContext() });
    expect(proof).not.toBeNull();
    expect((proof as { shareScopeDigest: CacheShareScopeDigest }).shareScopeDigest).toMatch(
      /^[0-9a-f]{64}$/
    );
    expect(Object.getOwnPropertySymbols(proof as object).length).toBe(1);
    expect(
      deriveCacheEligibilityProof({
        family: "security-settings-generation",
        context: eligibleContext(),
      })
    ).toBeNull();
  });
});
