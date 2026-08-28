import { describe, expect, test } from "bun:test";
const it = test;
import {
  createTask551L02OwnerCapabilityFactory,
  type Task551L02OwnerCapabilityObserved,
} from "../../../scripts/task551DatabaseBaseline/reviewedPairPersistence";

const headDigest = "a".repeat(64);
const smallCandidateDigest = "b".repeat(64);
const largeCandidateDigest = "c".repeat(64);

function observed(
  overrides: Partial<Task551L02OwnerCapabilityObserved> = {}
): Task551L02OwnerCapabilityObserved {
  return {
    headDigest,
    smallCandidateDigest,
    largeCandidateDigest,
    now: 100,
    ...overrides,
  };
}

function issue(factory = createTask551L02OwnerCapabilityFactory(headDigest), nonce = "nonce-1") {
  return {
    factory,
    capability: factory.issueForCandidates({
      smallCandidateDigest,
      largeCandidateDigest,
      expiresAt: 200,
      nonce,
    }),
  };
}

describe("TASK-551 L02 opaque owner capability", () => {
  it("creates a nominal object with no enumerable, string, or symbol fields", () => {
    const { capability } = issue();
    expect(Object.keys(capability)).toEqual([]);
    expect(Reflect.ownKeys(capability)).toEqual([]);
    expect(JSON.stringify(capability)).toBe("{}");
    expect(Object.getOwnPropertyNames(capability)).toEqual([]);
  });

  it("binds the trusted head and exact small/large digests", () => {
    const { factory, capability } = issue();
    expect(factory.consumeForReviewedTransition(capability, observed())).toEqual({
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("rejects foreign capabilities and every binding mismatch before a consume", () => {
    const first = issue();
    const foreign = issue(createTask551L02OwnerCapabilityFactory(headDigest), "nonce-foreign");
    for (const [name, value] of [
      ["head", { headDigest: "d".repeat(64) }],
      ["small", { smallCandidateDigest: "d".repeat(64) }],
      ["large", { largeCandidateDigest: "d".repeat(64) }],
    ] as const) {
      expect(() =>
        first.factory.consumeForReviewedTransition(first.capability, observed(value))
      ).toThrow(
        `l02_owner_capability_${name === "head" ? "head_mismatch" : `${name}_digest_mismatch`}`
      );
    }
    expect(() =>
      first.factory.consumeForReviewedTransition(foreign.capability, observed())
    ).toThrow("l02_owner_capability_unbranded");
    expect(() => first.factory.consumeForReviewedTransition({} as never, observed())).toThrow(
      "l02_owner_capability_unbranded"
    );
  });

  it("rejects expiry, repeated nonces, and replay while never exposing the nonce", () => {
    const expired = issue(createTask551L02OwnerCapabilityFactory(headDigest), "expired");
    const expiredCapability = expired.capability;
    expect(() =>
      expired.factory.consumeForReviewedTransition(expiredCapability, observed({ now: 200 }))
    ).toThrow("l02_owner_capability_expired");

    const duplicateFactory = createTask551L02OwnerCapabilityFactory(headDigest);
    duplicateFactory.issueForCandidates({
      smallCandidateDigest,
      largeCandidateDigest,
      expiresAt: 200,
      nonce: "same",
    });
    expect(() =>
      duplicateFactory.issueForCandidates({
        smallCandidateDigest,
        largeCandidateDigest,
        expiresAt: 200,
        nonce: "same",
      })
    ).toThrow("l02_owner_capability_nonce_reused");

    const replay = issue(createTask551L02OwnerCapabilityFactory(headDigest), "replay");
    replay.factory.consumeForReviewedTransition(replay.capability, observed());
    expect(() =>
      replay.factory.consumeForReviewedTransition(replay.capability, observed())
    ).toThrow("l02_owner_capability_consumed");
    expect(JSON.stringify(replay.capability)).not.toContain("replay");
  });

  it("serializes only the redacted receipt and supports exactly one concurrent synchronous consume", async () => {
    const { factory, capability } = issue(
      createTask551L02OwnerCapabilityFactory(headDigest),
      "concurrent"
    );
    const results = await Promise.allSettled([
      Promise.resolve().then(() => factory.consumeForReviewedTransition(capability, observed())),
      Promise.resolve().then(() => factory.consumeForReviewedTransition(capability, observed())),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const fulfilled = results.find(
      (result) => result.status === "fulfilled"
    ) as PromiseFulfilledResult<{
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1";
      digest: string;
    }>;
    // The only serialized surface of a fulfilled consume is the redacted receipt.
    expect(JSON.parse(JSON.stringify(fulfilled.value))).toEqual({
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(results.filter((result) => result.status === "rejected")[0]).toMatchObject({
      reason: expect.objectContaining({ message: "l02_owner_capability_consumed" }),
    });
  });

  it("still issues successfully after rejected issue attempts", () => {
    const factory = createTask551L02OwnerCapabilityFactory(headDigest);
    // Malformed inputs are rejected without burning the single-issue state.
    expect(() =>
      factory.issueForCandidates({
        smallCandidateDigest: "not-a-digest",
        largeCandidateDigest,
        expiresAt: 200,
        nonce: "attempt-malformed",
      })
    ).toThrow("l02_owner_capability_small_digest_invalid");
    expect(() =>
      factory.issueForCandidates({
        smallCandidateDigest,
        largeCandidateDigest,
        expiresAt: 1.5,
        nonce: "attempt-expiry",
      })
    ).toThrow("l02_owner_capability_expiry_invalid");
    const { capability } = issue(factory, "valid-after-rejections");
    expect(factory.consumeForReviewedTransition(capability, observed())).toEqual({
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("rejects spread copies and prototype-forged capabilities as unbranded", () => {
    const { factory, capability } = issue();
    const spreadCopy = { ...capability };
    expect(() => factory.consumeForReviewedTransition(spreadCopy, observed())).toThrow(
      "l02_owner_capability_unbranded"
    );
    const prototypeForged = Object.create(capability) as object;
    expect(() => factory.consumeForReviewedTransition(prototypeForged, observed())).toThrow(
      "l02_owner_capability_unbranded"
    );
    // The genuine capability must remain untouched by both forgery attempts.
    expect(factory.consumeForReviewedTransition(capability, observed())).toEqual({
      schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("rejects now beyond expiry and every invalid expiresAt at issue time", () => {
    const factory = createTask551L02OwnerCapabilityFactory(headDigest);
    const strictlyAfterExpiry = createTask551L02OwnerCapabilityFactory(headDigest);
    const capability = strictlyAfterExpiry.issueForCandidates({
      smallCandidateDigest,
      largeCandidateDigest,
      expiresAt: 200,
      nonce: "after-expiry",
    });
    expect(() =>
      strictlyAfterExpiry.consumeForReviewedTransition(capability, observed({ now: 201 }))
    ).toThrow("l02_owner_capability_expired");

    for (const [name, expiresAt] of [
      ["zero", 0],
      ["negative", -1],
      ["non-integer", 200.5],
    ] as const) {
      expect(() =>
        factory.issueForCandidates({
          smallCandidateDigest,
          largeCandidateDigest,
          expiresAt,
          nonce: `invalid-expiry-${name}`,
        })
      ).toThrow("l02_owner_capability_expiry_invalid");
    }
  });
});
