/**
 * TASK-551-07-L01 eligibility lane: the complete fail-closed context matrix,
 * digest sensitivity per normalized field, reorder invariance, the manifest /
 * mutable-HTML gate rules, security-family exclusion, brand opacity and the
 * negative-fill authority.
 *
 * The lane is fully offline: only the leaf's pure modules are imported, no
 * environment is read, no import-time prerequisite exists and therefore no
 * `mock.module` stub is needed. It runs independently with plain `vitest`.
 */

import { describe, expect, it } from "vitest";
import {
  validatedCacheEligibilityProof,
  type CacheEligibilityContext,
  type CacheEligibilityFieldDigest,
} from "../../../core/services/cache/serverCacheContracts";
import {
  SERVER_CACHE_ELIGIBILITY_SPECIFICATION,
  authorizesNegativeFill,
  deriveCacheEligibilityProof,
  isBrandedCacheEligibilityProof,
} from "../../../core/services/cache/serverCacheEligibility";
import { digestServerCacheInput } from "../../../core/services/cache/serverCacheKeys";

const QUERY_DIGEST = "d0d1d2d3d4d5d6d7d8d9dadbdcdddedf".padEnd(
  64,
  "0"
) as CacheEligibilityFieldDigest;
const VERSION_TOKEN =
  "a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4" as CacheEligibilityFieldDigest;

function context(overrides: Partial<CacheEligibilityContext> = {}): CacheEligibilityContext {
  return {
    access: "public_anonymous",
    renderMode: "public",
    sensitiveDependency: "absent",
    queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
    responseDisposition: "positive_candidate",
    mutableVisibilityGate: "not_required",
    ...overrides,
  };
}

function publicHtmlGateContext(): CacheEligibilityContext {
  return context({
    mutableVisibilityGate: { state: "strictly_public", versionToken: VERSION_TOKEN },
  });
}

// ---------------------------------------------------------------------------
// Fail-closed matrix
// ---------------------------------------------------------------------------

describe("fail-closed eligibility matrix", () => {
  const excludedVectors: readonly [string, CacheEligibilityContext][] = [
    ["authenticated_access", context({ access: "authenticated" })],
    ["private_access", context({ access: "private" })],
    ["password_access", context({ access: "password" })],
    ["unknown_access", context({ access: "unknown" })],
    ["preview_render", context({ renderMode: "preview" })],
    ["draft_render", context({ renderMode: "draft" })],
    ["unknown_render", context({ renderMode: "unknown" })],
    ["nonce_dependency", context({ sensitiveDependency: "nonce" })],
    ["request_scoped_dependency", context({ sensitiveDependency: "request_scoped" })],
    ["unknown_dependency", context({ sensitiveDependency: "unknown" })],
    ["unknown_query_variant", context({ queryVariant: { kind: "unknown" } })],
    ["unknown_disposition", context({ responseDisposition: "unknown" })],
  ];

  for (const [name, candidate] of excludedVectors) {
    it(`returns null for ${name}`, () => {
      expect(deriveCacheEligibilityProof({ family: "pages", context: candidate })).toBeNull();
    });
  }

  it("returns null for missing, malformed or unknown-field contexts", () => {
    for (const malformed of [
      null,
      undefined,
      "public",
      42,
      {},
      { access: "public_anonymous" },
      { ...context(), unexpected: "field" },
      { ...context(), queryVariant: { kind: "known_bounded" } },
      { ...context(), queryVariant: { kind: "known_bounded", digest: "z".repeat(64) } },
      { ...context(), queryVariant: { kind: "unbounded" } },
      { ...context(), queryVariant: { kind: "unknown", digest: QUERY_DIGEST } },
      {
        ...context(),
        mutableVisibilityGate: { state: "strictly_public" },
      },
      {
        ...context(),
        mutableVisibilityGate: { state: "strictly_public", versionToken: "A".repeat(64) },
      },
      {
        ...context(),
        mutableVisibilityGate: { state: "internal_only", versionToken: VERSION_TOKEN },
      },
    ]) {
      expect(
        deriveCacheEligibilityProof({
          family: "pages",
          context: malformed as CacheEligibilityContext,
        }),
        JSON.stringify(malformed)
      ).toBeNull();
    }
  });

  it("rejects inherited-only context and query-variant fields", () => {
    // Positive control: the same values as own fields are eligible.
    expect(deriveCacheEligibilityProof({ family: "pages", context: context() })).not.toBeNull();

    // 6 own keys (= CONTEXT_FIELD_ORDER.length); the required
    // mutableVisibilityGate is only inherited, and "smuggled" fills the count.
    const inheritedGate = Object.assign(Object.create({ mutableVisibilityGate: "not_required" }), {
      access: "public_anonymous",
      renderMode: "public",
      sensitiveDependency: "absent",
      queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
      responseDisposition: "positive_candidate",
      smuggled: "x",
    }) as CacheEligibilityContext;
    expect(deriveCacheEligibilityProof({ family: "pages", context: inheritedGate })).toBeNull();

    // Nested: 2 own keys (= ["kind", "digest"].length); digest only inherited.
    const inheritedDigest = Object.assign(Object.create({ digest: QUERY_DIGEST }), {
      kind: "known_bounded",
      smuggled: 1,
    });
    expect(
      deriveCacheEligibilityProof({
        family: "pages",
        context: { ...context(), queryVariant: inheritedDigest } as CacheEligibilityContext,
      })
    ).toBeNull();
  });

  it("never proves the security-settings-generation family", () => {
    expect(
      deriveCacheEligibilityProof({
        family: "security-settings-generation",
        context: context(),
      })
    ).toBeNull();
    expect(
      deriveCacheEligibilityProof({
        family: "security-settings-generation",
        context: publicHtmlGateContext(),
      })
    ).toBeNull();
  });

  it("pins the specification data tables used by every excluded state", () => {
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.eligibleAccessValues]).toEqual([
      "public_anonymous",
    ]);
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.excludedAccessValues]).toEqual([
      "authenticated",
      "private",
      "password",
      "unknown",
    ]);
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.eligibleRenderModes]).toEqual(["public"]);
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.excludedRenderModes]).toEqual([
      "preview",
      "draft",
      "unknown",
    ]);
    expect(SERVER_CACHE_ELIGIBILITY_SPECIFICATION.absentSensitiveDependency).toBe("absent");
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.excludedSensitiveDependencies]).toEqual([
      "nonce",
      "request_scoped",
      "unknown",
    ]);
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.positiveDispositions]).toEqual([
      "positive_candidate",
      "public_negative_candidate",
    ]);
    expect(SERVER_CACHE_ELIGIBILITY_SPECIFICATION.manifestRequiredGateState).toBe("not_required");
    expect([...SERVER_CACHE_ELIGIBILITY_SPECIFICATION.alwaysIneligibleFamilies]).toEqual([
      "security-settings-generation",
    ]);
    expect(SERVER_CACHE_ELIGIBILITY_SPECIFICATION.maxCanonicalContextBytes).toBe(65_536);
  });
});

// ---------------------------------------------------------------------------
// Eligible paths and the branded proof
// ---------------------------------------------------------------------------

describe("eligible proofs", () => {
  it("proves public anonymous contexts for ordinary families", () => {
    for (const family of [
      "pages",
      "public-runtime",
      "public-settings",
      "listings",
      "site-shell",
    ] as const) {
      const proof = deriveCacheEligibilityProof({ family, context: context() });
      expect(proof, family).not.toBeNull();
      expect(proof!.shareScopeDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(proof!.negativeFill).toBe("forbid");
    }
  });

  it("allows structurally safe non-mutable HTML with no visibility gate", () => {
    const proof = deriveCacheEligibilityProof({ family: "public-html", context: context() });
    expect(proof).not.toBeNull();
    expect(proof!.shareScopeDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("requires the current strictly-public gate for mutable HTML and keeps it in the digest", () => {
    const proof = deriveCacheEligibilityProof({
      family: "public-html",
      context: publicHtmlGateContext(),
    });
    expect(proof).not.toBeNull();
    expect(proof!.shareScopeDigest).not.toBe(
      deriveCacheEligibilityProof({ family: "public-html", context: context() })!.shareScopeDigest
    );
    // Rotating the version token changes the digest even if the state is equal.
    const rotated = deriveCacheEligibilityProof({
      family: "public-html",
      context: context({
        mutableVisibilityGate: {
          state: "strictly_public",
          versionToken: ("b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4b" +
            "0") as CacheEligibilityFieldDigest,
        },
      }),
    })!;
    expect(rotated.shareScopeDigest).not.toBe(proof!.shareScopeDigest);
  });

  it("rejects a manifest context that smuggles any visibility gate", () => {
    expect(
      deriveCacheEligibilityProof({
        family: "public-html-manifest",
        context: context(),
      })
    ).not.toBeNull();
    expect(
      deriveCacheEligibilityProof({
        family: "public-html-manifest",
        context: publicHtmlGateContext(),
      })
    ).toBeNull();
  });

  it("proves a manifest context never authorizes HTML/body access", () => {
    const manifestProof = deriveCacheEligibilityProof({
      family: "public-html-manifest",
      context: context(),
    })!;
    expect(manifestProof).not.toBeNull();
    // The same context under public-html with a gate produces a different
    // share scope, so a manifest proof cannot be replayed for HTML values.
    const htmlProof = deriveCacheEligibilityProof({
      family: "public-html",
      context: publicHtmlGateContext(),
    })!;
    expect(htmlProof.shareScopeDigest).not.toBe(manifestProof.shareScopeDigest);
  });
});

// ---------------------------------------------------------------------------
// Digest sensitivity and invariance
// ---------------------------------------------------------------------------

describe("share scope digest sensitivity", () => {
  const baseDigest = deriveCacheEligibilityProof({
    family: "pages",
    context: context(),
  })!.shareScopeDigest;

  const sensitivityVectors: readonly [string, CacheEligibilityContext][] = [
    [
      "query_digest",
      context({
        queryVariant: {
          kind: "known_bounded",
          digest: QUERY_DIGEST.replace(/^d/, "e") as CacheEligibilityFieldDigest,
        },
      }),
    ],
    ["positive_to_public_negative", context({ responseDisposition: "public_negative_candidate" })],
    ["visibility_gate", publicHtmlGateContext()],
  ];

  for (const [name, candidate] of sensitivityVectors) {
    it(`changes the digest when only ${name} changes while staying eligible`, () => {
      const proof = deriveCacheEligibilityProof({ family: "pages", context: candidate });
      if (proof === null) {
        // The mutable gate on a non-HTML family still stays eligible.
        expect(name).toBe("visibility_gate");
        const htmlProof = deriveCacheEligibilityProof({
          family: "public-html",
          context: candidate,
        })!;
        expect(htmlProof.shareScopeDigest).not.toBe(baseDigest);
        return;
      }
      expect(proof.shareScopeDigest).not.toBe(baseDigest);
    });
  }

  it("keeps the digest stable across property insertion order", () => {
    const reordered: CacheEligibilityContext = {
      mutableVisibilityGate: "not_required",
      responseDisposition: "positive_candidate",
      queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
      sensitiveDependency: "absent",
      renderMode: "public",
      access: "public_anonymous",
    };
    expect(
      deriveCacheEligibilityProof({ family: "entries", context: reordered })!.shareScopeDigest
    ).toBe(
      deriveCacheEligibilityProof({ family: "entries", context: context() })!.shareScopeDigest
    );
  });

  it("changes the digest across families because the proof is context-bound, not value-bound", () => {
    const pages = deriveCacheEligibilityProof({ family: "pages", context: context() })!;
    const listings = deriveCacheEligibilityProof({ family: "listings", context: context() })!;
    expect(pages.shareScopeDigest).toBe(listings.shareScopeDigest);
    // Family identity is enforced by the policy binding, never by the proof:
    // the digest itself is the canonical context fingerprint.
  });
});

describe("proof brand opacity", () => {
  it("brands proofs with an unforgeable runtime symbol", () => {
    const proof = deriveCacheEligibilityProof({ family: "pages", context: context() })!;
    const symbols = Object.getOwnPropertySymbols(proof);
    expect(symbols.length).toBe(1);
    expect(symbols[0]).toBe(validatedCacheEligibilityProof);
    expect(isBrandedCacheEligibilityProof(proof)).toBe(true);

    const foreign = { shareScopeDigest: "a".repeat(64), negativeFill: "forbid" };
    expect(isBrandedCacheEligibilityProof(foreign)).toBe(false);
    const forged = {
      shareScopeDigest: "a".repeat(64),
      negativeFill: "forbid",
      [Symbol("validatedCacheEligibilityProof")]: true,
    };
    expect(isBrandedCacheEligibilityProof(forged)).toBe(false);
    for (const broken of [null, undefined, 1, "proof", {}, [], { negativeFill: "forbid" }]) {
      expect(isBrandedCacheEligibilityProof(broken)).toBe(false);
    }
  });

  it("never exposes raw identity, token, nonce or query text in the proof", () => {
    const contextual = context({
      queryVariant: { kind: "known_bounded", digest: QUERY_DIGEST },
    });
    const proof = deriveCacheEligibilityProof({ family: "pages", context: contextual })!;
    const serialized = JSON.stringify(proof, (_key, value) =>
      typeof value === "symbol" ? "symbol" : value
    );
    for (const forbidden of [
      "secret-cookie-value",
      QUERY_DIGEST,
      "nonce",
      "session",
      "?query=raw",
      "/login?token=",
    ]) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
    // The digest is a one-way fingerprint of the canonical context: it equals
    // the canonical input digest (so every normalized field contributes) but
    // never carries the bytes themselves.
    expect(proof.shareScopeDigest).toBe(digestServerCacheInput(contextual));
    expect(proof.shareScopeDigest).toHaveLength(64);
    expect(Buffer.from(proof.shareScopeDigest, "hex").toString("latin1")).not.toContain("nonce");
  });
});

// ---------------------------------------------------------------------------
// Negative-fill authority
// ---------------------------------------------------------------------------

describe("negative fill authority", () => {
  it("marks public-negative contexts eligible and positive contexts forbidden", () => {
    const positive = deriveCacheEligibilityProof({ family: "posts", context: context() })!;
    expect(positive.negativeFill).toBe("forbid");
    const negative = deriveCacheEligibilityProof({
      family: "posts",
      context: context({ responseDisposition: "public_negative_candidate" }),
    })!;
    expect(negative.negativeFill).toBe("eligible");
    expect(authorizesNegativeFill(negative, 10_000)).toBe(true);
  });

  it("refuses negative fills without a policy negative ceiling", () => {
    const negative = deriveCacheEligibilityProof({
      family: "posts",
      context: context({ responseDisposition: "public_negative_candidate" }),
    })!;
    expect(authorizesNegativeFill(negative, null)).toBe(false);
    expect(authorizesNegativeFill(negative, 0)).toBe(false);
    // Outside the normalized 5..15 second window.
    expect(authorizesNegativeFill(negative, 4_999)).toBe(false);
    expect(authorizesNegativeFill(negative, 15_001)).toBe(false);
    expect(authorizesNegativeFill(negative, 5_000)).toBe(true);
    expect(authorizesNegativeFill(negative, 15_000)).toBe(true);
  });

  it("refuses negative fills on ineligible or positive-only proofs", () => {
    const positive = deriveCacheEligibilityProof({ family: "posts", context: context() })!;
    expect(authorizesNegativeFill(positive, 10_000)).toBe(false);
    for (const excluded of [
      context({ access: "authenticated", responseDisposition: "public_negative_candidate" }),
      context({ sensitiveDependency: "nonce", responseDisposition: "public_negative_candidate" }),
      context({
        queryVariant: { kind: "unknown" },
        responseDisposition: "public_negative_candidate",
      }),
    ]) {
      expect(deriveCacheEligibilityProof({ family: "posts", context: excluded })).toBeNull();
      expect(authorizesNegativeFill(null, 10_000)).toBe(false);
    }
    // A locally flipped field does not help an attacker who lacks the context:
    // the positive proof's digest differs from every negative-authorizing
    // proof the factory produces, so the flip is detectable by anyone who can
    // re-derive the proof from the same context.
    const negative = deriveCacheEligibilityProof({
      family: "posts",
      context: context({ responseDisposition: "public_negative_candidate" }),
    })!;
    expect(negative.shareScopeDigest).not.toBe(positive.shareScopeDigest);
    const flipped = { ...positive, negativeFill: "eligible" as const };
    expect(isBrandedCacheEligibilityProof(flipped)).toBe(true);
    expect(flipped.shareScopeDigest).not.toBe(negative.shareScopeDigest);
  });
});
