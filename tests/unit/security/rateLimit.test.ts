import { expect, test } from "bun:test";

import { checkRateLimit, resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { ApiError } from "../../../core/server/errorHandler";

const baseConfig = {
  enabled: true,
  admin: { windowSeconds: 10, maxRequests: 2 },
  auth: { windowSeconds: 5, maxRequests: 1 },
};

test("checkRateLimit blocks after max requests", () => {
  resetRateLimitBuckets();
  checkRateLimit("admin", "127.0.0.1", baseConfig);
  checkRateLimit("admin", "127.0.0.1", baseConfig);
  expect(() => checkRateLimit("admin", "127.0.0.1", baseConfig)).toThrow(
    "Too many requests"
  );
});

test("checkRateLimit resets after window", () => {
  resetRateLimitBuckets();
  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    checkRateLimit("auth", "10.0.0.1", baseConfig);
    expect(() => checkRateLimit("auth", "10.0.0.1", baseConfig)).toThrow(
      "Too many requests"
    );
    now += 6_000;
    checkRateLimit("auth", "10.0.0.1", baseConfig);
  } finally {
    Date.now = originalNow;
  }
});

test("checkRateLimit maps assistant bucket to assistant_rate_limited", () => {
  resetRateLimitBuckets();
  const config = {
    enabled: true,
    admin: { windowSeconds: 10, maxRequests: 1 },
    auth: { windowSeconds: 5, maxRequests: 1 },
  };

  checkRateLimit("assistant", "127.0.0.1", config);

  try {
    checkRateLimit("assistant", "127.0.0.1", config);
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_rate_limited");
    expect(apiError.status).toBe(429);
  }
});
