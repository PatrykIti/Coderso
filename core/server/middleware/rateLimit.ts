import { createHash } from "node:crypto";
import { ApiError } from "../errorHandler";
import type { SecuritySettings } from "../../services/settings/securitySettings";

export type RateLimitBucket =
  | "auth"
  | "admin_read"
  | "admin_write"
  | "public_read"
  | "public_write"
  | "assistant";

export type RateLimitIdentity = {
  ip?: string;
  userAgent?: string;
  userId?: string;
  identifier?: string;
};

type BucketState = {
  hits: number;
  resetAt: number;
};

const buckets = new Map<string, BucketState>();

export function resetRateLimitBuckets() {
  buckets.clear();
}

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);

const resolveKey = (bucket: RateLimitBucket, identity: RateLimitIdentity) => {
  if (identity.userId) {
    return `${bucket}:user:${identity.userId}`;
  }

  const ip = identity.ip ?? "unknown";
  const uaHash = identity.userAgent ? hashValue(identity.userAgent) : "no-ua";
  const parts = [bucket, `ip:${ip}`, `ua:${uaHash}`];
  if (identity.identifier) {
    parts.push(`id:${hashValue(identity.identifier.toLowerCase())}`);
  }
  return parts.join(":");
};

export function checkRateLimit(
  bucket: RateLimitBucket,
  identity: RateLimitIdentity,
  config: SecuritySettings["rateLimit"],
  options?: { isAuthenticated?: boolean }
) {
  if (!config.enabled) return;

  if ((bucket === "admin_read" || bucket === "admin_write") && options?.isAuthenticated) {
    return;
  }

  const limits = config.buckets[bucket];
  const key = resolveKey(bucket, identity);
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
    if (bucket === "assistant") {
      throw new ApiError(
        "assistant_rate_limited",
        "Assistant rate limit exceeded",
        429
      );
    }
    throw new ApiError("rate_limited", "Too many requests", 429);
  }

  existing.hits += 1;
}
