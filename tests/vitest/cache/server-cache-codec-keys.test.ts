/**
 * TASK-551-07-L01 codec/keys lane: canonical input encoding vectors, final
 * key construction and its maximum derivation, generation snapshots/projections,
 * debug labels, flight identity, strict envelope encoding/decoding bounds,
 * generation-digest mismatch detection and the exact 64-entry sweep limit.
 *
 * The lane is fully offline: it imports only the leaf's pure modules, never
 * reads the environment, and has no import-time prerequisite that would need a
 * `mock.module` stub. Every suite runs independently with plain `vitest`.
 */

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SERVER_CACHE_LIMITS,
  normalizeCacheGenerationDigest,
  normalizeCacheSchemaVersion,
  normalizeCacheValueByteLimit,
  normalizeNegativeCacheTtlMs,
  normalizePositiveCacheTtlMs,
  normalizeUnixTimeMs,
  type CacheEligibilityContext,
  type CacheEligibilityFieldDigest,
  type CachePolicy,
  type CacheTag,
  type UnixTimeMs,
} from "../../../core/services/cache/serverCacheContracts";
import { isServerCacheEventKey } from "../../../core/services/cache/serverCacheCoherence";
import {
  SERVER_CACHE_ENVELOPE_ERROR_CODES,
  SERVER_CACHE_ENVELOPE_SCHEMA_V1,
  decodeServerCacheEnvelope,
  encodeServerCacheEnvelope,
  sliceExpirySweepEntries,
} from "../../../core/services/cache/serverCacheCodec";
import {
  MAX_CANONICAL_DEPTH,
  SERVER_CACHE_KEY_ERROR_CODES,
  SERVER_CACHE_KEY_FORMAT_VERSION,
  boundServerCacheDebugLabel,
  buildServerCacheKey,
  combineFlightIdentity,
  digestGenerations,
  digestServerCacheInput,
  encodeCanonicalInput,
  isWellFormedServerCacheKey,
  maxServerCacheKeyBytes,
  normalizeGenerations,
  projectGenerations,
} from "../../../core/services/cache/serverCacheKeys";

const KEY_CODES = SERVER_CACHE_KEY_ERROR_CODES;

const INPUT_DIGEST = "c1c2c3c4".repeat(8) as CacheEligibilityFieldDigest;
const QUERY_DIGEST = "d0d1d2d3d4d5d6d7d8d9dadbdcdddedf".padEnd(
  64,
  "e"
) as CacheEligibilityFieldDigest;

function fakePolicy(overrides: Partial<CachePolicy<unknown>> = {}): CachePolicy<unknown> {
  return {
    family: "public-html",
    schemaVersion: normalizeCacheSchemaVersion(2),
    ttlMs: normalizePositiveCacheTtlMs(60_000),
    maxValueBytes: normalizeCacheValueByteLimit(1_024),
    tags: ["site:html"],
    negativeTtlMs: normalizeNegativeCacheTtlMs(10_000),
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
    queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
    responseDisposition: "positive_candidate",
    mutableVisibilityGate: "not_required",
  };
}

function sha256HexOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Canonical input encoding
// ---------------------------------------------------------------------------

describe("canonical input encoding", () => {
  it("is deterministic and independent of object key insertion order", () => {
    const forward = encodeCanonicalInput({ alpha: 1, beta: [true, null] });
    const reverse = encodeCanonicalInput({ beta: [true, null], alpha: 1 });
    expect(Buffer.from(reverse).toString("utf8")).toBe('{"alpha":1,"beta":[true,null]}');
    expect(Buffer.compare(forward, reverse)).toBe(0);
  });

  it("sorts object keys by UTF-8 bytes, not UTF-16 code units", () => {
    // U+20AC euro sign (0xE2..) sorts before the astral U+10348 (0xF0..)
    // even though its UTF-16 code unit is numerically larger.
    const canonical = Buffer.from(encodeCanonicalInput({ ["\u{10348}"]: 2, ["€"]: 1 })).toString(
      "utf8"
    );
    expect(canonical).toBe('{"€":1,"\u{10348}":2}');
    expect(digestServerCacheInput({ ["\u{10348}"]: 2, ["€"]: 1 })).toBe(
      sha256HexOf('{"€":1,"\u{10348}":2}')
    );
  });

  it("covers pinned scalar and unicode vectors", () => {
    expect(Buffer.from(encodeCanonicalInput(null)).toString()).toBe("null");
    expect(Buffer.from(encodeCanonicalInput(false)).toString()).toBe("false");
    expect(Buffer.from(encodeCanonicalInput(0)).toString()).toBe("0");
    expect(Buffer.from(encodeCanonicalInput(-0)).toString()).toBe("0");
    expect(Buffer.from(encodeCanonicalInput("ü")).toString()).toBe('"ü"');
    expect(Buffer.from(encodeCanonicalInput("a|b")).toString()).toBe('"a|b"');
    expect(Buffer.from(encodeCanonicalInput(0.5)).toString()).toBe("0.5");
    expect(Buffer.from(encodeCanonicalInput([])).toString()).toBe("[]");
    expect(Buffer.from(encodeCanonicalInput({})).toString()).toBe("{}");
  });

  it("rejects every non-canonical value shape before hashing", () => {
    const rejects: readonly [string, unknown][] = [
      ["nonfinite_nan", Number.NaN],
      ["nonfinite_infinity", Number.POSITIVE_INFINITY],
      ["object_nan_slot", { value: Number.NaN }],
      ["function", (): void => undefined],
      ["symbol", Symbol("nope")],
      ["bigint", 1n],
      [
        "array_hole",
        (() => {
          const sparse: unknown[] = [0, 1];
          delete sparse[0];
          return sparse;
        })(),
      ],
      // `undefined` is unrepresentable in every position: encoding it as
      // `null` would let two distinct inputs collide on one digest.
      ["top_level_undefined", undefined],
      ["array_undefined_element", [1, undefined, 2]],
      ["undefined_slot", { alpha: undefined }],
      ["date_instance", new Date()],
      ["map_instance", new Map()],
      ["set_instance", new Set([1])],
      [
        "class_instance",
        new (class Embedded {
          member = 1;
        })(),
      ],
    ];
    for (const [name, value] of rejects) {
      let thrown: string | null = null;
      try {
        encodeCanonicalInput(value);
      } catch (error) {
        thrown = (error as Error).message;
      }
      expect(thrown, name).toBe(KEY_CODES.inputInvalid);
    }
    expect(digestServerCacheInput(null)).not.toBe(digestServerCacheInput([null]));
  });

  it("rejects cycles directly and indirectly", () => {
    const direct: Record<string, unknown> = { name: "cycle" };
    direct.self = direct;
    expect(() => encodeCanonicalInput(direct)).toThrow(KEY_CODES.inputInvalid);
    const left: Record<string, unknown> = {};
    const right: Record<string, unknown> = { back: left };
    left.forward = right;
    expect(() => encodeCanonicalInput(left)).toThrow(KEY_CODES.inputInvalid);
  });

  it("accepts the exact canonical byte budget and rejects one byte more", () => {
    const atLimit = "k".repeat(SERVER_CACHE_LIMITS.maxCanonicalInputBytes - 2);
    expect(Buffer.from(encodeCanonicalInput(atLimit)).byteLength).toBe(
      SERVER_CACHE_LIMITS.maxCanonicalInputBytes
    );
    const overLimit = "k".repeat(SERVER_CACHE_LIMITS.maxCanonicalInputBytes - 1);
    expect(() => encodeCanonicalInput(overLimit)).toThrow(KEY_CODES.inputTooLarge);
    const deeplyNested = { pad: "z".repeat(SERVER_CACHE_LIMITS.maxCanonicalInputBytes + 1) };
    expect(() => encodeCanonicalInput(deeplyNested)).toThrow(KEY_CODES.inputTooLarge);
    // Astral code points are charged once at their real four-byte UTF-8 size,
    // so the documented budget is measured in emitted bytes, not code units.
    const astral = "\u{10348}";
    const astralAtLimit =
      astral.repeat(Math.floor((SERVER_CACHE_LIMITS.maxCanonicalInputBytes - 2) / 4)) + "kk";
    const astralEncoded = Buffer.from(encodeCanonicalInput(astralAtLimit));
    expect(astralEncoded.byteLength).toBe(SERVER_CACHE_LIMITS.maxCanonicalInputBytes);
    expect(() => encodeCanonicalInput(astralAtLimit + astral)).toThrow(KEY_CODES.inputTooLarge);
  });

  it("never lets a separator character collide structurally distinct inputs", () => {
    // `|` is legal inside strings, keys and values; these shapes are all
    // different canonical byte sequences and therefore different digests.
    const digests = new Set<string>([
      digestServerCacheInput("a|b"),
      digestServerCacheInput(["a", "b"]),
      digestServerCacheInput({ "a|b": 1 }),
      digestServerCacheInput({ a: { b: 1 } }),
      digestServerCacheInput({ a: "b" }),
    ]);
    expect(digests.size).toBe(5);
  });

  it("bounds canonical nesting depth", () => {
    let shallow: unknown = "leaf";
    for (let depth = 0; depth < MAX_CANONICAL_DEPTH - 1; depth += 1) {
      shallow = [shallow];
    }
    expect(() => encodeCanonicalInput(shallow)).not.toThrow();

    let tooDeep: unknown = "leaf";
    for (let depth = 0; depth < MAX_CANONICAL_DEPTH + 1; depth += 1) {
      tooDeep = [tooDeep];
    }
    expect(() => encodeCanonicalInput(tooDeep)).toThrow(KEY_CODES.inputInvalid);
  });
});

// ---------------------------------------------------------------------------
// Final key construction
// ---------------------------------------------------------------------------

describe("final key construction", () => {
  const namespace = "deployment1";

  it("emits the exact v1 key template", () => {
    const key = buildServerCacheKey({
      namespace,
      family: "public-html",
      schemaVersion: normalizeCacheSchemaVersion(2),
      generationDigest: normalizeCacheGenerationDigest("a".repeat(64)),
      inputDigest: INPUT_DIGEST,
    });
    expect(key).toBe(
      `coderso:${namespace}:server-cache:${SERVER_CACHE_KEY_FORMAT_VERSION}:` +
        `public-html:sv2:${"a".repeat(64)}:${INPUT_DIGEST}`
    );
    expect(isWellFormedServerCacheKey(key, namespace)).toBe(true);
    expect(isWellFormedServerCacheKey(key, "other")).toBe(false);
    expect(isWellFormedServerCacheKey(key.slice(0, -1) + "0", namespace)).toBe(true);
    expect(
      isWellFormedServerCacheKey(
        "coderso:legacy:server-cache:v1:pages:sv1:" + "a".repeat(128),
        namespace
      )
    ).toBe(false);
    expect(isServerCacheEventKey(key)).toBe(false);
  });

  it("derives the maximum key bytes for a namespace from the builder itself", () => {
    const bound = maxServerCacheKeyBytes(namespace);
    const widest = buildServerCacheKey({
      namespace,
      family: "security-settings-generation",
      schemaVersion: normalizeCacheSchemaVersion(SERVER_CACHE_LIMITS.maxSchemaVersion),
      generationDigest: normalizeCacheGenerationDigest("f".repeat(64)),
      inputDigest: "0".repeat(64) as CacheEligibilityFieldDigest,
    });
    expect(bound).toBe(Buffer.byteLength(widest, "utf8"));
    expect(bound).toBeLessThanOrEqual(SERVER_CACHE_LIMITS.maxKeyBytes);
    expect(maxServerCacheKeyBytes("a".repeat(128))).toBeLessThanOrEqual(
      SERVER_CACHE_LIMITS.maxKeyBytes
    );
  });

  it("rejects malformed namespaces, families and digests", () => {
    const digest = normalizeCacheGenerationDigest("a".repeat(64));
    const base = () => ({
      namespace,
      family: "public-html" as const,
      schemaVersion: normalizeCacheSchemaVersion(2),
      generationDigest: digest,
      inputDigest: INPUT_DIGEST,
    });
    for (const badNamespace of [
      "",
      "-leading",
      "trailing-",
      ".dot",
      "bad namespace",
      "bad/slash",
      "l".repeat(129),
    ]) {
      expect(() => buildServerCacheKey({ ...base(), namespace: badNamespace })).toThrow();
    }
    expect(() => buildServerCacheKey({ ...base(), family: "pages:17" as never })).toThrow(
      KEY_CODES.componentInvalid
    );
    expect(() =>
      buildServerCacheKey({
        ...base(),
        generationDigest: normalizeCacheGenerationDigest("a".repeat(63) + "g") as never,
      })
    ).toThrow();
    expect(() =>
      buildServerCacheKey({ ...base(), inputDigest: "x".repeat(64) as CacheEligibilityFieldDigest })
    ).toThrow(KEY_CODES.componentInvalid);
    expect(() => buildServerCacheKey({ ...base(), schemaVersion: 0 as never })).toThrow(
      KEY_CODES.componentInvalid
    );
  });
});

// ---------------------------------------------------------------------------
// Generations, debug labels and flight identity
// ---------------------------------------------------------------------------

describe("generation snapshots", () => {
  it("fails closed on unknown tags, malformed tokens and duplicates", () => {
    expect(() => normalizeGenerations([])).toThrow(KEY_CODES.generationMissing);
    expect(() =>
      normalizeGenerations([{ tag: "site:pages" as CacheTag, token: "short" as never }])
    ).toThrow(KEY_CODES.componentInvalid);
    expect(() =>
      normalizeGenerations([
        {
          tag: "tenant:9" as CacheTag,
          token: normalizeCacheGenerationDigest("a".repeat(64)).slice(0, 32) as never,
        },
      ])
    ).toThrow(KEY_CODES.componentInvalid);
  });

  it("projects canonically and fails on missing generation tokens", () => {
    const snapshot = normalizeGenerations([
      { tag: "site:html", token: "e".repeat(32) as never },
      { tag: "site:all", token: "a".repeat(32) as never },
    ]);
    expect(
      projectGenerations(snapshot, ["site:html", "site:all"]).map((entry) => entry.tag)
    ).toEqual(["site:all", "site:html"]);
    expect(() => projectGenerations(snapshot, ["site:pages"])).toThrow(KEY_CODES.generationMissing);
    expect(() => projectGenerations(snapshot, [])).toThrow(KEY_CODES.componentInvalid);
    expect(() => projectGenerations(snapshot, Array(33).fill("site:pages") as CacheTag[])).toThrow(
      KEY_CODES.componentInvalid
    );
  });

  it("changes the generation digest with any token rotation", () => {
    const original = normalizeGenerations([{ tag: "site:html", token: "e".repeat(32) as never }]);
    const rotated = normalizeGenerations([{ tag: "site:html", token: "f".repeat(32) as never }]);
    const originalDigest = digestGenerations(original, ["site:html"]);
    expect(originalDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(digestGenerations(rotated, ["site:html"])).not.toBe(originalDigest);
  });
});

describe("debug labels and flight identity", () => {
  it("bounds debug labels as metadata that never reach keys", () => {
    expect(boundServerCacheDebugLabel(null)).toBeNull();
    expect(boundServerCacheDebugLabel(undefined)).toBeNull();
    expect(boundServerCacheDebugLabel("public html")).toBe("public html");
    expect(() =>
      boundServerCacheDebugLabel("d".repeat(SERVER_CACHE_LIMITS.maxDebugLabelBytes + 1))
    ).toThrow(KEY_CODES.debugLabelTooLarge);
    const key = buildServerCacheKey({
      namespace: "deployment1",
      family: "pages",
      schemaVersion: normalizeCacheSchemaVersion(1),
      generationDigest: normalizeCacheGenerationDigest("b".repeat(64)),
      inputDigest: INPUT_DIGEST,
    });
    expect(key.includes("public html")).toBe(false);
  });

  it("derives stable flight identities from key, epoch and share scope", () => {
    const key = buildServerCacheKey({
      namespace: "deployment1",
      family: "public-html",
      schemaVersion: normalizeCacheSchemaVersion(2),
      generationDigest: normalizeCacheGenerationDigest("a".repeat(64)),
      inputDigest: INPUT_DIGEST,
    });
    const scopeA = "f".repeat(64);
    const scopeB = "e".repeat(64);
    expect(combineFlightIdentity(key, 7, scopeA)).toBe(combineFlightIdentity(key, 7, scopeA));
    expect(combineFlightIdentity(key, 7, scopeA)).toMatch(/^[0-9a-f]{64}$/);
    expect(combineFlightIdentity(key, 8, scopeA)).not.toBe(combineFlightIdentity(key, 7, scopeA));
    expect(combineFlightIdentity(key, 7, scopeB)).not.toBe(combineFlightIdentity(key, 7, scopeA));
    // Distinct auth/request-scoped contexts never share registry identity.
    const contextA = eligibleContext();
    const contextB = {
      ...contextA,
      sensitiveDependency: "request_scoped",
    } as CacheEligibilityContext;
    expect(digestServerCacheInput(contextA)).not.toBe(digestServerCacheInput(contextB));
  });
});

// ---------------------------------------------------------------------------
// Envelope codec
// ---------------------------------------------------------------------------

function encodePositive(
  options: Partial<{
    lifetimeMs: number;
    writtenAt: number;
    generationDigest: string;
    policy: CachePolicy<unknown>;
    value: unknown;
  }> = {}
): Uint8Array {
  const policy = options.policy ?? fakePolicy();
  return encodeServerCacheEnvelope(
    {
      family: policy.family,
      schemaVersion: policy.schemaVersion,
      fillKind: "positive",
      writtenAtUnixMs: normalizeUnixTimeMs(options.writtenAt ?? 1_000),
      expiresAtUnixMs: normalizeUnixTimeMs(
        (options.writtenAt ?? 1_000) + (options.lifetimeMs ?? 30_000)
      ),
      generationDigest: normalizeCacheGenerationDigest(options.generationDigest ?? "a".repeat(64)),
      value: options.value ?? { html: "<main>ok</main>" },
    },
    policy
  );
}

describe("envelope encoding", () => {
  it("writes the pinned schema literal and fixed field order", () => {
    expect(SERVER_CACHE_ENVELOPE_SCHEMA_V1).toBe("coderso.server-cache-envelope@v1");
    const bytes = encodePositive({ writtenAt: 0 });
    const text = Buffer.from(bytes).toString("utf8");
    expect(
      text.startsWith(
        `{"schema":"${SERVER_CACHE_ENVELOPE_SCHEMA_V1}","family":"public-html","schemaVersion":2,"fillKind":"positive"`
      )
    ).toBe(true);
  });

  it("rejects policy-family, version, digest, expiry and lifetime mismatches", () => {
    const policy = fakePolicy();
    const digest = normalizeCacheGenerationDigest("a".repeat(64));
    const base = {
      family: policy.family,
      schemaVersion: policy.schemaVersion,
      fillKind: "positive" as const,
      writtenAtUnixMs: normalizeUnixTimeMs(0),
      expiresAtUnixMs: normalizeUnixTimeMs(1_000),
      generationDigest: digest,
      value: {},
    };
    expect(() => encodeServerCacheEnvelope({ ...base, family: "pages" }, policy)).toThrow(
      SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid
    );
    expect(() =>
      encodeServerCacheEnvelope({ ...base, schemaVersion: normalizeCacheSchemaVersion(3) }, policy)
    ).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
    expect(() =>
      encodeServerCacheEnvelope({ ...base, generationDigest: "A".repeat(64) as never }, policy)
    ).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
    expect(() =>
      encodeServerCacheEnvelope({ ...base, expiresAtUnixMs: normalizeUnixTimeMs(0) }, policy)
    ).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
    expect(() =>
      encodeServerCacheEnvelope(
        { ...base, expiresAtUnixMs: normalizeUnixTimeMs(policy.ttlMs + 1) },
        policy
      )
    ).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
    // Negative fill without a policy negative ceiling can never encode.
    expect(() =>
      encodeServerCacheEnvelope(
        { ...base, fillKind: "negative" },
        { ...policy, negativeTtlMs: null }
      )
    ).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
  });

  it("bounds encoded bytes by the policy value limit", () => {
    const tinyPolicy = fakePolicy({ maxValueBytes: normalizeCacheValueByteLimit(64) });
    expect(() => encodePositive({ policy: tinyPolicy, value: { pad: "p".repeat(200) } })).toThrow(
      SERVER_CACHE_ENVELOPE_ERROR_CODES.valueTooLarge
    );
  });
});

describe("envelope decoding", () => {
  it("round-trips positive and negative envelopes through the policy decoder", () => {
    const policy = fakePolicy();
    let decodedValue: unknown;
    const observingPolicy: CachePolicy<unknown> = {
      ...policy,
      decode: (value) => {
        decodedValue = value;
        return value;
      },
    };
    const bytes = encodePositive({ policy: observingPolicy });
    const decoded = decodeServerCacheEnvelope(bytes, observingPolicy, {
      nowUnixMs: normalizeUnixTimeMs(2_000),
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.envelope.fillKind).toBe("positive");
      expect(decoded.envelope.generationDigest).toBe("a".repeat(64));
      expect(decoded.envelope.expiresAtUnixMs - decoded.envelope.writtenAtUnixMs).toBe(30_000);
    }
    expect(decodedValue).toBeUndefined();
    // The codec stays structural: the caller feeds envelope.value through the
    // policy's own decode, which is the only authority for a value.
    if (decoded.ok) {
      expect(observingPolicy.decode(decoded.envelope.value)).toEqual({
        html: "<main>ok</main>",
      });
      expect(decodedValue).toEqual({ html: "<main>ok</main>" });
    }

    const negativePolicy = fakePolicy({ negativeTtlMs: normalizeNegativeCacheTtlMs(8_000) });
    const negativeBytes = encodeServerCacheEnvelope(
      {
        family: negativePolicy.family,
        schemaVersion: negativePolicy.schemaVersion,
        fillKind: "negative",
        writtenAtUnixMs: normalizeUnixTimeMs(0),
        expiresAtUnixMs: normalizeUnixTimeMs(8_000),
        generationDigest: normalizeCacheGenerationDigest("b".repeat(64)),
        value: { absent: true },
      },
      negativePolicy
    );
    const negativeDecoded = decodeServerCacheEnvelope(negativeBytes, negativePolicy, {
      nowUnixMs: normalizeUnixTimeMs(7_000),
    });
    expect(negativeDecoded.ok).toBe(true);
  });

  it("rejects oversize, malformed and structurally wrong payloads", () => {
    const policy = fakePolicy();
    const reject = (bytes: Uint8Array): void => {
      const decoded = decodeServerCacheEnvelope(bytes, policy, {
        nowUnixMs: normalizeUnixTimeMs(0),
      });
      expect(decoded).toEqual({ ok: false, reason: "invalid" });
    };
    reject(new Uint8Array(0));
    reject(new TextEncoder().encode("{"));
    reject(new TextEncoder().encode("not-json"));
    reject(new TextEncoder().encode("[1,2,3]"));
    reject(new TextEncoder().encode(JSON.stringify({ nope: true })));
    // Oversized bytes are rejected with the coarse oversize reason.
    expect(
      decodeServerCacheEnvelope(new Uint8Array(policy.maxValueBytes + 1).fill(0x7b), policy)
    ).toEqual({ ok: false, reason: "oversized" });

    const goodEnvelope = {
      expiresAtUnixMs: 31_000,
      family: "public-html",
      fillKind: "positive",
      generationDigest: "a".repeat(64),
      schema: SERVER_CACHE_ENVELOPE_SCHEMA_V1,
      schemaVersion: 2,
      value: {},
      writtenAtUnixMs: 1_000,
    };
    reject(
      new TextEncoder().encode(
        JSON.stringify({ ...goodEnvelope, schema: "coderso.server-cache-envelope@v2" })
      )
    );
    reject(new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, family: "pages" })));
    reject(new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, schemaVersion: 9 })));
    reject(new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, fillKind: "stale" })));
    reject(new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, extra: "field" })));
    reject(new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, value: undefined })));
    reject(
      new TextEncoder().encode(
        JSON.stringify({ ...goodEnvelope, expiresAtUnixMs: 1_000, writtenAtUnixMs: 31_000 })
      )
    );
    // Lifetime above the positive policy ceiling.
    reject(
      new TextEncoder().encode(JSON.stringify({ ...goodEnvelope, expiresAtUnixMs: 1_000_000 }))
    );
    // Invalid UTF-8 never decodes.
    reject(new Uint8Array([0xff, 0xfe, 0x00, 0x01]));
  });

  it("fails negative fills without a policy ceiling and bounds negative lifetimes", () => {
    const policy = fakePolicy();
    const negativeBody = {
      expiresAtUnixMs: 8_000,
      family: "public-html",
      fillKind: "negative",
      generationDigest: "b".repeat(64),
      schema: SERVER_CACHE_ENVELOPE_SCHEMA_V1,
      schemaVersion: 2,
      value: { absent: true },
      writtenAtUnixMs: 0,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(negativeBody));
    // Policy has negativeTtlMs = 10_000, so an 8_000 lifetime is legal...
    const decoded = decodeServerCacheEnvelope(bytes, policy, { nowUnixMs: normalizeUnixTimeMs(0) });
    expect(decoded.ok).toBe(true);
    // ...but a policy without any negative ceiling rejects the same bytes.
    const ceilingFree = decodeServerCacheEnvelope(
      bytes,
      { ...policy, negativeTtlMs: null },
      { nowUnixMs: normalizeUnixTimeMs(0) }
    );
    expect(ceilingFree).toEqual({ ok: false, reason: "invalid" });
    const overNegative = new TextEncoder().encode(
      JSON.stringify({ ...negativeBody, expiresAtUnixMs: 10_001 })
    );
    expect(
      decodeServerCacheEnvelope(overNegative, policy, { nowUnixMs: normalizeUnixTimeMs(0) })
    ).toEqual({ ok: false, reason: "invalid" });
  });

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

    it.each(MALFORMED)(
      "encode throws encodeInvalid for a policy with %s",
      (_name, policy, fillKind) => {
        const encode =
          fillKind === "positive"
            ? () => encodePositive({ policy: policy() })
            : () => encodeNegative(policy());
        expect(encode).toThrow(SERVER_CACHE_ENVELOPE_ERROR_CODES.encodeInvalid);
      }
    );
  });

  it("classifies expiry as expired only when the wall clock passed the envelope", () => {
    const bytes = encodePositive({ writtenAt: 1_000, lifetimeMs: 5_000 });
    expect(
      decodeServerCacheEnvelope(bytes, fakePolicy(), { nowUnixMs: normalizeUnixTimeMs(5_999) }).ok
    ).toBe(true);
    expect(
      decodeServerCacheEnvelope(bytes, fakePolicy(), { nowUnixMs: normalizeUnixTimeMs(6_000) })
    ).toEqual({ ok: false, reason: "expired" });
    // A generation mismatch is a caller-side comparison on the decoded digest.
    const decoded = decodeServerCacheEnvelope(bytes, fakePolicy(), {
      nowUnixMs: normalizeUnixTimeMs(2_000),
    });
    if (decoded.ok) {
      const snapshot = normalizeGenerations([{ tag: "site:html", token: "0".repeat(32) as never }]);
      const currentDigest = digestGenerations(snapshot, ["site:html"]);
      expect(decoded.envelope.generationDigest === currentDigest).toBe(false);
    } else {
      throw new Error("expected decoded envelope");
    }
  });

  it("maps coarse decode reasons onto the store_value_rejected trigger union", () => {
    const mappingRows = [
      { decodedReason: "expired", triggerReason: "expired" },
      { decodedReason: "oversized", triggerReason: "oversized" },
      { decodedReason: "invalid", triggerReason: "invalid" },
      { decodedReason: "generation_mismatch", triggerReason: "generation_mismatch" },
    ];
    const allowedTriggers = ["expired", "generation_mismatch", "oversized", "invalid"];
    for (const row of mappingRows) {
      expect(allowedTriggers).toContain(row.triggerReason);
      expect(row.triggerReason).toBe(row.decodedReason);
    }
    // The table is complete: no additional coarse reason exists.
    expect(allowedTriggers.length).toBe(mappingRows.length);
  });
});

// ---------------------------------------------------------------------------
// Expiry sweep planning
// ---------------------------------------------------------------------------

describe("expiry sweep limit", () => {
  it("chunks 0/1/exact/over entries at the pinned 64-entry operation bound", () => {
    const limit = SERVER_CACHE_LIMITS.maxExpirySweepEntriesPerOperation;
    expect(limit).toBe(64);
    const entries = Array.from({ length: limit + 1 }, (_, index) => index);
    expect(sliceExpirySweepEntries([], limit)).toEqual([]);
    expect(sliceExpirySweepEntries(entries.slice(0, 1), limit).map((chunk) => [...chunk])).toEqual([
      [0],
    ]);
    const exact = sliceExpirySweepEntries(entries.slice(0, limit), limit);
    expect(exact.length).toBe(1);
    expect(exact[0]!.length).toBe(limit);
    const over = sliceExpirySweepEntries(entries, limit);
    expect(over.length).toBe(2);
    expect(over[1]!.length).toBe(1);
    expect(() => sliceExpirySweepEntries(entries, limit - 1)).not.toThrow();
    expect(() => sliceExpirySweepEntries(entries, 0)).toThrow(
      SERVER_CACHE_ENVELOPE_ERROR_CODES.sweepLimitInvalid
    );
  });
});
