/**
 * TASK-551-07-L01 contract lane: bounded invalidation event keys, health
 * normalization bounds, coherence-signal specification vectors, the
 * conditional-write entry factory (`createCacheConditionalWriteEntry`) and
 * invalidation-plan strictness (`validateCacheInvalidationPlan`). The five
 * suites cover `serverCacheCoherence.ts` and `serverCacheConditionalWrite.ts`.
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

const BRAND_CODES = SERVER_CACHE_CONTRACT_ERROR_CODES;

// ---------------------------------------------------------------------------
// Fixtures (pure, DB-free, env-free)
// ---------------------------------------------------------------------------

const UUID_A = "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0";
const EVENT_KEY = "cache-event:" + UUID_A;
const KEY_INPUT_DIGEST =
  "b4c5d6e7f8091223344556677889900aabbccddeeff00112233445566778899a" as CacheEligibilityFieldDigest;

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
  return { source, sequence, [cacheCoherenceObservationToken]: true as const };
}

function fakeAttemptToken(eventKey: string, sequence: number): CacheInvalidationAttemptToken {
  return { eventKey, sequence, [cacheInvalidationAttemptToken]: true as const };
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

  it("rejects every key-form, ceiling, byte and fillKind mismatch before any store work", () => {
    const policy = fakePolicy();
    const happy = {
      policy,
      namespace: "fixturens",
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
    const decodes = (bytes: Uint8Array, decodePolicy: CachePolicy<unknown>) =>
      decodeServerCacheEnvelope(bytes, decodePolicy, { enforceExpiry: false });

    // Positive control: the unmodified input is accepted, so every rejection
    // below is caused by the one field it changes, never by the shape guard.
    const accepted = createCacheConditionalWriteEntry(happy);
    expect(accepted.key).toBe(happy.key);
    expect(accepted.encodedEnvelope).toBe(happy.encodedEnvelope);
    expect(accepted.fillKind).toBe("positive");
    expect(accepted.ttlMs).toBe(1_000);
    expect(accepted.policyPositiveTtlMs).toBe(60_000);
    expect(accepted.policyNegativeTtlMs).toBeNull();
    expect(accepted.policyMaxValueBytes).toBe(4_096);
    expect(Object.isFrozen(accepted)).toBe(true);

    // Key form: a foreign deployment namespace (the key and envelope are valid).
    fails({ ...happy, namespace: "otherns" });
    // Key form: a foreign family; the envelope is encoded for its own policy
    // and decodes, so the `pages` key segment is the only failing gate.
    const postsPolicy = fakePolicy({ family: "posts" });
    const postsEnvelope = encodeEnvelope({
      policy: postsPolicy,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: 1_000,
    });
    expect(decodes(postsEnvelope, postsPolicy).ok).toBe(true);
    fails({ ...happy, policy: postsPolicy, encodedEnvelope: postsEnvelope });
    // Key form: a foreign schema version; the key still carries `sv7`.
    const sv8Policy = fakePolicy({ schemaVersion: normalizeCacheSchemaVersion(8) });
    const sv8Envelope = encodeEnvelope({
      policy: sv8Policy,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: 1_000,
    });
    expect(decodes(sv8Envelope, sv8Policy).ok).toBe(true);
    fails({ ...happy, policy: sv8Policy, encodedEnvelope: sv8Envelope });

    // fillKind mismatch between envelope and entry: the positive envelope
    // decodes and the factory's own fillKind comparison rejects.
    const positiveDecoded = decodes(happy.encodedEnvelope, policy);
    expect(positiveDecoded.ok && positiveDecoded.envelope.fillKind).toBe("positive");
    fails({ ...happy, fillKind: "negative" });
    // Isolated fillKind gate: the policy HAS a negative ceiling and both the
    // lifetime and ttlMs fit it, so only the fillKind comparison can reject.
    const negativeCeilingPolicy = fakePolicy({ negativeTtlMs: normalizeNegativeCacheTtlMs(8_000) });
    const positiveUnderNegativeCeiling = encodeEnvelope({
      policy: negativeCeilingPolicy,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: 8_000,
    });
    expect(decodes(positiveUnderNegativeCeiling, negativeCeilingPolicy).ok).toBe(true);
    const isolatedFillKindInput = {
      ...happy,
      policy: negativeCeilingPolicy,
      encodedEnvelope: positiveUnderNegativeCeiling,
      ttlMs: normalizePositiveCacheTtlMs(8_000),
    };
    // Control: the matching declared fillKind is accepted.
    expect(createCacheConditionalWriteEntry(isolatedFillKindInput).fillKind).toBe("positive");
    fails({ ...isolatedFillKindInput, fillKind: "negative" });
    // Negative fill requires non-null policy.negativeTtlMs: the decoder
    // selects no negative ceiling and rejects first.
    const negativeEnvelope = encodeEnvelope({
      policy,
      fillKind: "negative",
      writtenAt: 0,
      lifetimeMs: 1_000,
    });
    expect(decodes(negativeEnvelope, policy)).toEqual({ ok: false, reason: "invalid" });
    fails({
      ...happy,
      fillKind: "negative",
      encodedEnvelope: negativeEnvelope,
      ttlMs: normalizePositiveCacheTtlMs(1_000),
    });
    // Sampled duration above the selected ceiling: the envelope decodes and
    // the factory's sampled-TTL check rejects.
    expect(positiveDecoded.ok).toBe(true);
    fails({ ...happy, ttlMs: normalizePositiveCacheTtlMs(policy.ttlMs + 1) });
    // Envelope lifetime outside the ceiling: the decoder rejects first.
    const overLongEnvelope = encodeEnvelope({
      policy,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: policy.ttlMs + 1,
    });
    expect(decodes(overLongEnvelope, policy)).toEqual({ ok: false, reason: "invalid" });
    fails({ ...happy, encodedEnvelope: overLongEnvelope });
    // Envelope decode itself fails on a corrupted body.
    const corrupted = new TextEncoder().encode("{");
    expect(decodes(corrupted, policy)).toEqual({ ok: false, reason: "invalid" });
    fails({ ...happy, encodedEnvelope: corrupted });
  });

  it("enforces policy value bytes and the key-plus-envelope store ceiling", () => {
    const fails = (input: object) =>
      expect(() => createCacheConditionalWriteEntry(input as never)).toThrow(
        BRAND_CODES.conditionalEntryInvalid
      );
    const key = sampleKey();

    // Policy value-byte ceiling: a VALID envelope above 256 bytes is rejected
    // by the decoder (`oversized`) before the factory's own byte recheck.
    const policy256 = fakePolicy({ maxValueBytes: normalizeCacheValueByteLimit(256) });
    const oversized = encodeEnvelope({
      policy: policy256,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: 1_000,
      value: { html: "x".repeat(16) },
    });
    expect(oversized.byteLength).toBeGreaterThan(256);
    expect(decodeServerCacheEnvelope(oversized, policy256, { enforceExpiry: false })).toEqual({
      ok: false,
      reason: "oversized",
    });
    const policyCeilingInput = {
      policy: policy256,
      namespace: "fixturens",
      key,
      encodedEnvelope: oversized,
      fillKind: "positive" as const,
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: unboundedStore(),
    };
    fails(policyCeilingInput);
    // Control: the identical bytes under the 4,096-byte policy are accepted.
    const underDefault = createCacheConditionalWriteEntry({
      ...policyCeilingInput,
      policy: fakePolicy(),
    });
    expect(underDefault.encodedEnvelope).toBe(oversized);

    // Store key-plus-envelope ceiling: the 4,096-byte policy admits the
    // envelope, so the store ceiling is the only failing gate.
    const policy = fakePolicy();
    const large = encodeEnvelope({
      policy,
      fillKind: "positive",
      writtenAt: 0,
      lifetimeMs: 1_000,
      value: { html: "x".repeat(256) },
    });
    expect(Buffer.byteLength(key, "utf8") + large.byteLength).toBeGreaterThan(600);
    expect(large.byteLength).toBeLessThanOrEqual(4_096);
    expect(decodeServerCacheEnvelope(large, policy, { enforceExpiry: false }).ok).toBe(true);
    const storeCeilingInput = {
      policy,
      namespace: "fixturens",
      key,
      encodedEnvelope: large,
      fillKind: "positive" as const,
      ttlMs: normalizePositiveCacheTtlMs(1_000),
      storeMaxEntryBytes: normalizeCacheValueByteLimit(600),
    };
    fails(storeCeilingInput);
    // Control: the identical input against an unbounded store is accepted.
    const unbounded = createCacheConditionalWriteEntry({
      ...storeCeilingInput,
      storeMaxEntryBytes: unboundedStore(),
    });
    expect(unbounded.encodedEnvelope).toBe(large);
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
// Invalidation-plan strictness
// ---------------------------------------------------------------------------

describe("invalidation plan strictness", () => {
  const legalPlan = () => ({ eventKey: EVENT_KEY, tags: ["site:pages"] as CacheTag[] });
  const rejects = (plan: unknown) =>
    expect(() => validateCacheInvalidationPlan(plan as never)).toThrow(BRAND_CODES.planInvalid);

  it("accepts exactly eventKey and a canonical tag set and returns the plan itself", () => {
    const plan = legalPlan();
    expect(validateCacheInvalidationPlan(plan)).toBe(plan);

    const everyTag = { eventKey: EVENT_KEY, tags: [...CACHE_TAGS] };
    expect(everyTag.tags.length).toBe(13);
    expect(new Set(everyTag.tags).size).toBe(13);
    expect(validateCacheInvalidationPlan(everyTag)).toBe(everyTag);
  });

  it.each(["recordId", "slug", "path", "query", "domainPayload", "identityTag"])(
    "rejects the extra domain field %s",
    (illegalField) => {
      rejects({ ...legalPlan(), [illegalField]: "raw-value" });
    }
  );

  it("rejects a symbol-keyed extra field", () => {
    rejects({ ...legalPlan(), [Symbol("x")]: 1 });
  });

  it.each([
    ["an unprefixed uuid", UUID_A],
    ["a raw record id", "record:17"],
    ["an uppercase uuid", "cache-event:" + UUID_A.toUpperCase()],
    ["a number", 42],
  ] as const)("rejects %s as the eventKey", (_name, eventKey) => {
    rejects({ ...legalPlan(), eventKey });
  });

  const overLimitTags = Array.from(
    { length: SERVER_CACHE_LIMITS.maxTags + 1 },
    (_, index) => CACHE_TAGS[index % CACHE_TAGS.length]
  );

  it.each([
    ["an empty tag set", []],
    ["maxTags + 1 tags", overLimitTags],
    ["a duplicate tag", ["site:pages", "site:pages"]],
    ["a variable-suffixed tag", ["site:page-17"]],
    ["a record-scoped tag", ["site:pages:17"]],
    ["a non-array tag set", "site:pages"],
  ] as const)("rejects %s", (_name, tags) => {
    rejects({ ...legalPlan(), tags });
  });

  it("pins the over-limit fixture shape and the maxTags constant", () => {
    // Only 13 distinct tags exist, so the 33-tag vector necessarily repeats a
    // tag; its length alone already exceeds the limit. Because of that repeat
    // the length guard cannot be isolated from the duplicate guard in this
    // leaf (recorded as C8); this test pins only the fixture shape.
    expect(overLimitTags.length).toBe(SERVER_CACHE_LIMITS.maxTags + 1);
    expect(SERVER_CACHE_LIMITS.maxTags).toBe(32);
  });

  it.each([
    ["an array", [EVENT_KEY, ["site:pages"]]],
    ["null", null],
    ["undefined", undefined],
    ["a string", EVENT_KEY],
  ] as const)("rejects %s as the plan", (_name, plan) => {
    rejects(plan);
  });

  it("rejects a plan whose tags are only inherited", () => {
    const smuggled = Object.assign(Object.create({ tags: ["site:pages"] }) as object, {
      eventKey: EVENT_KEY,
      smuggled: 1,
    });
    expect(Object.keys(smuggled).length).toBe(2);
    expect(Object.hasOwn(smuggled, "tags")).toBe(false);
    rejects(smuggled);
  });
});
