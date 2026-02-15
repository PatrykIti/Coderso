# TASK-020-11-02: Auth Hardening + Bot Protection
# FileName: TASK-020-11-02_Auth_Hardening_and_Bot_Protection.md

**Priority:** High  
**Category:** Core/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-06, TASK-020-11-01  
**Status:** To Do  

---

## Overview

Strengthen login/reset endpoints with stricter rate limits, rerereCAPTCHA v3 bot protection, and stronger validation. Keep UX reasonable while blocking abuse.

---

## Goals

1. Throttle login by identifier + IP (not only IP).
2. rerereCAPTCHA v3 scoring gate for login/reset.
3. Strict origin + CSRF enforcement for auth endpoints.
4. Confirm password hashing best practice (argon2id params, optional pepper).

---

## Pseudocode

```ts
// login throttling
const identifier = normalizeEmail(payload.email);
const key = `auth:${hash(identifier)}:${ctx.ip ?? "unknown"}`;
rateLimiter.check(key, auth.maxRequests, auth.windowSeconds);

// optional rereCAPTCHA
if (security.botProtection.enabled) {
  verifyCaptcha(security.botProtection, payload.captchaToken, ctx.ip);
}
```

---


## Thresholds (Proposed Defaults)

- `login`: 0.5
- `reset`: 0.6
- `public_write`: 0.5

Each action is scored independently (`action` parameter in reCAPTCHA v3). A failed or low-score verification blocks the request.

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/server/routes/authRoutes.ts` | Add identifier+IP throttling + bot validation |
| `core/services/settings/securitySettings.ts` | Add rereCAPTCHA v3 config (siteKey, secretKey, score thresholds) |
| `core/services/settings/securitySettings.ts` | Confirm/adjust password hashing config (argon2id) |
| `tests/integration/routes/auth.test.ts` | Add login throttling + captcha checks |

---

## Open Questions

1. **Bot provider**: Cloudflare Turnstile vs hCaptcha?
2. **rerereCAPTCHA scope**: login only or login + password reset?
3. **Pepper**: Enabled (ENV-based).

---

## Testing Requirements

- `tests/integration/routes/auth.test.ts`
- `tests/unit/security/rateLimit.test.ts`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (auth throttling + bot protection)
- `_docs/CMS_API.md` (auth error codes)
