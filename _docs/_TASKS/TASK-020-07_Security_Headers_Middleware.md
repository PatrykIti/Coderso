# TASK-020-07: Security Headers Middleware
# FileName: TASK-020-07_Security_Headers_Middleware.md

**Priority:** Medium
**Category:** Core/Security
**Estimated Effort:** Small
**Dependencies:** TASK-020-01
**Status:** To Do

---

## Overview

Add configurable security headers for admin HTML and API responses.

## Goals

- Centralized headers with sane defaults.
- Configurable from security settings.
- Applied to both `/admin` and `/admin/api` responses (excluding dev assets if needed).

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/middleware/securityHeaders.ts` | `applySecurityHeaders` helper |
| `core/server/httpServer.ts` | Add headers for admin + api responses |

### Headers to include

- `X-Frame-Options` (default: `DENY`)
- `X-Content-Type-Options` (default: `nosniff`)
- `Referrer-Policy` (default: `no-referrer`)
- `Content-Security-Policy` (optional; off by default)
- `Strict-Transport-Security` (optional; only if HTTPS)
- `Permissions-Policy` (optional; off by default)

### Notes

- Avoid CSP in dev unless explicitly enabled (Vite HMR needs ws/unsafe-inline).
- If `headers.enabled` is false, skip all header injection.

## Testing Requirements

- [ ] `tests/integration/routes/securityHeaders.test.ts` verifies default headers.
- [ ] `tests/integration/routes/securityHeaders.test.ts` verifies CSP when enabled.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add headers config and defaults.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-headers.md`
