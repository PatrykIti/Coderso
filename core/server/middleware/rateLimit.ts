import { ApiError } from "../errorHandler";
import type { SecuritySettings } from "../../services/settings/securitySettings";

export type RateLimitBucket = "admin" | "auth";

type BucketState = {
  hits: number;
  resetAt: number;
};

const buckets = new Map<string, BucketState>();

export function resetRateLimitBuckets() {
  buckets.clear();
}

export function checkRateLimit(
  bucket: RateLimitBucket,
  ip: string | undefined,
  config: SecuritySettings["rateLimit"]
) {
  if (!config.enabled) return;

  const limits = bucket === "auth" ? config.auth : config.admin;
  const key = `${bucket}:${ip ?? "unknown"}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      hits: 1,
      resetAt: now + limits.windowSeconds * 1000,
    });
    return;
  }

  if (existing.hits >= limits.maxRequests) {
    throw new ApiError("rate_limited", "Too many requests", 429);
  }

  existing.hits += 1;
}
