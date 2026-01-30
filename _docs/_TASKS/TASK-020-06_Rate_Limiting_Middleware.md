# TASK-020-06: Rate Limiting Middleware
# FileName: TASK-020-06_Rate_Limiting_Middleware.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01
**Status:** To Do

---

## Overview

Implement in-memory rate limiting for admin/auth routes with configurable thresholds.

## Goals

- Per-IP buckets for `/auth/*` and `/admin/api/*`.
- Different thresholds for auth vs admin API.
- Configurable and runtime updatable.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/middleware/rateLimit.ts` | Rate limiter with expiring buckets |
| `core/server/httpServer.ts` | Apply limiter to `/admin/api` and `/auth/*` routes |

### Suggested API

```ts
export type RateLimitBucket = {
  hits: number;
  resetAt: number; // epoch ms
};

export function createRateLimiter(configProvider: () => SecuritySettings) {
  return {
    check: (bucketKey: string, maxRequests: number, windowSeconds: number) => {
      // throws ApiError("rate_limited", 429)
    },
  };
}
```

### Behavior

- Key: `${bucket}:${ip}` where bucket is `auth` or `admin`.
- Reset when `Date.now() > resetAt`.
- On limit exceeded, throw `ApiError("rate_limited", 429)`.

## Testing Requirements

- [ ] `tests/unit/security/rateLimit.test.ts` blocks after maxRequests.
- [ ] `tests/unit/security/rateLimit.test.ts` resets after window.
- [ ] `tests/integration/routes/auth.test.ts` returns 429 on rapid logins.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add rate limit settings.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-rate-limiting.md`
