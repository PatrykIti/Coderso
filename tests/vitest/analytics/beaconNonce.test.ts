import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { assertBeaconNonce, createBeaconNonce } from "../../../core/services/analytics/beaconNonce";
import { ApiError } from "../../../core/server/errorHandler";

const SECRET = "beacon_nonce_test_secret";

// nonce failures are ApiError instances — assert the machine code on `.code`
// (the ApiError MESSAGE is human-readable, so toThrow("analytics_nonce_…")
// would not match).
const codeOf = (fn: () => unknown): string | null => {
  try {
    fn();
  } catch (error) {
    return (error as ApiError).code;
  }
  return null;
};

describe("beaconNonce", () => {
  let previousSecret: string | undefined;
  let previousTtl: string | undefined;

  beforeEach(() => {
    previousSecret = process.env.ANALYTICS_BEACON_NONCE_SECRET;
    previousTtl = process.env.ANALYTICS_BEACON_NONCE_TTL_MINUTES;
    process.env.ANALYTICS_BEACON_NONCE_SECRET = SECRET;
    delete process.env.ANALYTICS_BEACON_NONCE_TTL_MINUTES;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.ANALYTICS_BEACON_NONCE_SECRET;
    else process.env.ANALYTICS_BEACON_NONCE_SECRET = previousSecret;
    if (previousTtl === undefined) delete process.env.ANALYTICS_BEACON_NONCE_TTL_MINUTES;
    else process.env.ANALYTICS_BEACON_NONCE_TTL_MINUTES = previousTtl;
  });

  test("valid nonce round-trips", () => {
    expect(() => assertBeaconNonce(createBeaconNonce())).not.toThrow();
  });

  test("missing nonce rejected with analytics_nonce_required (400)", () => {
    expect(codeOf(() => assertBeaconNonce(undefined))).toBe("analytics_nonce_required");
    try {
      assertBeaconNonce(null);
    } catch (error) {
      expect((error as ApiError).status).toBe(400);
    }
  });

  test("malformed nonce rejected", () => {
    expect(codeOf(() => assertBeaconNonce("not-a-nonce"))).toBe("analytics_nonce_invalid");
  });

  test("tampered signature rejected", () => {
    const tampered = createBeaconNonce().replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(codeOf(() => assertBeaconNonce(tampered))).toBe("analytics_nonce_invalid");
  });

  test("expired nonce rejected", () => {
    const old = createBeaconNonce("beacon", Date.now() - 60 * 60 * 1000);
    expect(codeOf(() => assertBeaconNonce(old))).toBe("analytics_nonce_invalid");
  });

  test("future-skewed nonce rejected", () => {
    const future = createBeaconNonce("beacon", Date.now() + 60 * 60 * 1000);
    expect(codeOf(() => assertBeaconNonce(future))).toBe("analytics_nonce_invalid");
  });

  test("nonce signed with a different scope is rejected", () => {
    const other = createBeaconNonce("other-scope");
    expect(codeOf(() => assertBeaconNonce(other))).toBe("analytics_nonce_invalid");
  });

  test("missing secret fails fast with analytics_nonce_secret_missing (500)", () => {
    delete process.env.ANALYTICS_BEACON_NONCE_SECRET;
    expect(codeOf(() => createBeaconNonce())).toBe("analytics_nonce_secret_missing");
    try {
      createBeaconNonce();
    } catch (error) {
      expect((error as ApiError).status).toBe(500);
    }
  });
});
