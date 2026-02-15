# TASK-020-11-01: Rate Limit Buckets + Keying Strategy
# FileName: TASK-020-11-01_Rate_Limit_Buckets_and_Keying.md

**Priority:** High  
**Category:** Core/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-06, TASK-020-11  
**Status:** To Do  

---

## Overview

Introduce explicit rate limit buckets and keying strategy that work well for shared/variable IPs and authenticated users.

Buckets: `auth`, `admin_read`, `admin_write`, `public_read`, `public_write`, `assistant`.

---

## Goals

1. Distinct buckets with different limits.
2. Keying by `userId` for authenticated traffic, by `IP (+ optional UA hash)` for anonymous traffic.
3. Clear bucket assignment rules by path + method.
4. Avoid penalizing many users behind the same NAT.

---

## Pseudocode

```ts
// bucket resolution
function resolveBucket(req, ctx) {
  if (path.startsWith("/auth")) return "auth";
  if (path.startsWith("/assistant")) return "assistant";
  if (path.startsWith("/admin/api")) {
    if (method === "GET") return "admin_read";
    return "admin_write";
  }
  if (path.startsWith("/public")) {
    if (method === "GET") return "public_read";
    return "public_write";
  }
  return "public_read";
}

// keying
function resolveRateKey(bucket, ctx) {
  if (ctx.user?.id) return `user:${ctx.user.id}:${bucket}`;
  const ip = ctx.ip ?? "unknown";
  const uaHash = hash(ctx.userAgent ?? "");
  return `ip:${ip}:${uaHash}:${bucket}`;
}
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/server/middleware/rateLimit.ts` | Extend buckets + keying + per-bucket config |
| `core/server/httpServer.ts` | Map route -> bucket based on path + method + auth |
| `core/services/settings/securitySettings.ts` | Add per-bucket settings defaults (wired later) |
| `tests/unit/security/rateLimit.test.ts` | Add bucket-specific tests + shared IP scenario |

---

## Testing Requirements

- `tests/unit/security/rateLimit.test.ts`
  - bucket selection
  - per-bucket limits
  - keying by userId vs IP
  - shared IP scenario does not block different users

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (bucket list + keying rules)
