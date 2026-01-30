# TASK-020-04: CSRF Protection Middleware
# FileName: TASK-020-04_CSRF_Protection_Middleware.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01, TASK-004-02
**Status:** To Do

---

## Overview

Implement CSRF validation middleware using session-bound tokens, controlled by security settings.

## Goals

- Enforce CSRF on state-changing routes.
- Allow per-route bypass for public endpoints if needed (e.g. webhook receiver).
- Fully controlled by `securitySettings.csrf`.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/middleware/csrf.ts` | `csrfGuard` middleware |
| `core/server/httpServer.ts` | Insert CSRF guard for `/admin/api` writes |
| `core/server/routes/authRoutes.ts` | Ensure `GET /auth/csrf` stays aligned with new settings |

### CSRF behavior

- Safe methods (GET/HEAD/OPTIONS) pass through.
- For POST/PUT/PATCH/DELETE, require:
  - session present,
  - header `securitySettings.csrf.headerName` present,
  - token matches current session CSRF token.

### Token TTL

- Use `securitySettings.csrf.tokenTtlMinutes` to expire tokens.
- On expiry: require new token from `/auth/csrf`.

## Testing Requirements

- [ ] `tests/unit/security/csrf.test.ts` rejects missing token.
- [ ] `tests/unit/security/csrf.test.ts` rejects expired token.
- [ ] `tests/integration/routes/auth.test.ts` token endpoint returns token and expiry.

## Documentation Updates Required

- `_docs/CMS_API.md` update CSRF flow.
- `_docs/SECURITY_SPEC.md` add CSRF rules + settings.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-csrf-middleware.md`
