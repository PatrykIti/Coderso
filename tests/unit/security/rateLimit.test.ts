import { expect, test } from "bun:test";

import { checkRateLimit, resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { ApiError } from "../../../core/server/errorHandler";

const baseConfig = {
  enabled: true,
  buckets: {
    auth: { windowSeconds: 5, maxRequests: 1 },
    admin_read: { windowSeconds: 10, maxRequests: 2 },
    admin_write: { windowSeconds: 10, maxRequests: 2 },
    public_read: { windowSeconds: 10, maxRequests: 5 },
    public_write: { windowSeconds: 10, maxRequests: 2 },
    assistant: { windowSeconds: 5, maxRequests: 1 },
  },
};

test("checkRateLimit blocks after max requests", () => {
  resetRateLimitBuckets();
  checkRateLimit("admin_read", { ip: "127.0.0.1" }, baseConfig);
  checkRateLimit("admin_read", { ip: "127.0.0.1" }, baseConfig);
  expect(() =>
    checkRateLimit("admin_read", { ip: "127.0.0.1" }, baseConfig)
  ).toThrow("Too many requests");
});

test("checkRateLimit resets after window", () => {
  resetRateLimitBuckets();
  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    checkRateLimit("auth", { ip: "10.0.0.1" }, baseConfig);
    expect(() => checkRateLimit("auth", { ip: "10.0.0.1" }, baseConfig)).toThrow(
      "Too many requests"
    );
    now += 6_000;
    checkRateLimit("auth", { ip: "10.0.0.1" }, baseConfig);
  } finally {
    Date.now = originalNow;
  }
});

test("checkRateLimit maps assistant bucket to assistant_rate_limited", () => {
  resetRateLimitBuckets();
  const config = {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 5, maxRequests: 1 },
      admin_read: { windowSeconds: 10, maxRequests: 1 },
      admin_write: { windowSeconds: 10, maxRequests: 1 },
      public_read: { windowSeconds: 10, maxRequests: 1 },
      public_write: { windowSeconds: 10, maxRequests: 1 },
      assistant: { windowSeconds: 5, maxRequests: 1 },
    },
  };

  checkRateLimit("assistant", { ip: "127.0.0.1" }, config);

  try {
    checkRateLimit("assistant", { ip: "127.0.0.1" }, config);
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_rate_limited");
    expect(apiError.status).toBe(429);
  }
});

test("authenticated admin requests skip rate limits", () => {
  resetRateLimitBuckets();
  const config = {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 5, maxRequests: 1 },
      admin_read: { windowSeconds: 10, maxRequests: 1 },
      admin_write: { windowSeconds: 10, maxRequests: 1 },
      public_read: { windowSeconds: 10, maxRequests: 1 },
      public_write: { windowSeconds: 10, maxRequests: 1 },
      assistant: { windowSeconds: 5, maxRequests: 1 },
    },
  };

  checkRateLimit("admin_read", { ip: "127.0.0.1" }, config, { isAuthenticated: true });
  checkRateLimit("admin_write", { ip: "127.0.0.1" }, config, { isAuthenticated: true });
});
