import { describe, expect, test } from "vitest";

import {
  beaconRequestSchema,
  normalizeBeaconRequest,
} from "../../../core/services/analytics/beaconContract";

describe("beaconRequestSchema", () => {
  test("is a strict reject-unknown envelope of event + nonce", () => {
    expect(beaconRequestSchema.additionalProperties).toBe(false);
    expect(beaconRequestSchema.required).toEqual(["event", "nonce"]);
    expect(Object.keys(beaconRequestSchema.properties)).toEqual(["event", "nonce"]);
  });
});

describe("normalizeBeaconRequest", () => {
  test("returns the raw event and nonce for a valid envelope", () => {
    const event = { type: "pageview", path: "/home" };
    const result = normalizeBeaconRequest({ event, nonce: "abcdefgh" });
    expect(result.nonce).toBe("abcdefgh");
    expect(result.rawEvent).toBe(event);
  });

  test("rejects unknown top-level keys", () => {
    expect(() => normalizeBeaconRequest({ event: {}, nonce: "x", extra: 1 })).toThrow(
      "analytics_beacon_invalid"
    );
  });

  test("rejects a missing/non-string nonce", () => {
    expect(() => normalizeBeaconRequest({ event: {}, nonce: 123 })).toThrow(
      "analytics_beacon_invalid"
    );
  });

  test("rejects non-object input", () => {
    expect(() => normalizeBeaconRequest(null)).toThrow("analytics_beacon_invalid");
    expect(() => normalizeBeaconRequest([])).toThrow("analytics_beacon_invalid");
    expect(() => normalizeBeaconRequest("nope")).toThrow("analytics_beacon_invalid");
  });
});
