import { describe, expect, test } from "vitest";

import {
  BEACON_NONCE_DEFAULT_TTL_MINUTES,
  BEACON_NONCE_MIN_TTL_MINUTES,
  MAX_SITE_CACHE_TTL_SECONDS,
  resolveBeaconNonceTtlMs,
} from "../../../core/services/analytics/beaconTtl";

describe("beaconTtl (TASK-483 nonce/cache-TTL coupling)", () => {
  test("INVARIANT: max site cache TTL is strictly below the minimum nonce lifetime", () => {
    // Guarantees a per-render nonce baked into cached HTML can never expire
    // within the cache window (the post-audit MEDIUM finding).
    expect(MAX_SITE_CACHE_TTL_SECONDS).toBeLessThan(BEACON_NONCE_MIN_TTL_MINUTES * 60);
  });

  test("unset env → default TTL", () => {
    expect(resolveBeaconNonceTtlMs(undefined)).toBe(BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000);
    expect(resolveBeaconNonceTtlMs("")).toBe(BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000);
  });

  test("invalid/non-positive env → default TTL", () => {
    expect(resolveBeaconNonceTtlMs("nope")).toBe(BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000);
    expect(resolveBeaconNonceTtlMs("0")).toBe(BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000);
    expect(resolveBeaconNonceTtlMs("-5")).toBe(BEACON_NONCE_DEFAULT_TTL_MINUTES * 60 * 1000);
  });

  test("configured TTL is floored to the minimum so it always outlives the cache", () => {
    // A tiny operator-configured TTL is clamped up to the floor.
    expect(resolveBeaconNonceTtlMs("1")).toBe(BEACON_NONCE_MIN_TTL_MINUTES * 60 * 1000);
    // A larger configured TTL is honored.
    expect(resolveBeaconNonceTtlMs("60")).toBe(60 * 60 * 1000);
    // The effective minimum always exceeds the max cache window.
    expect(resolveBeaconNonceTtlMs("1") / 1000).toBeGreaterThan(MAX_SITE_CACHE_TTL_SECONDS);
  });
});
