# TASK-020-05: CORS Policy Middleware
# FileName: TASK-020-05_CORS_Policy_Middleware.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01
**Status:** Done (2026-01-30)

---

## Overview

Add CORS middleware for Admin API that uses settings to determine allowed origins and headers.

## Goals

- Only allow known admin origins.
- Respond correctly to OPTIONS preflight.
- Configurable via `securitySettings.cors`.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/middleware/cors.ts` | CORS middleware using settings |
| `core/server/httpServer.ts` | Attach CORS to `/admin/api` routes |

### Behavior

- Read `Origin` header and compare against allowlist.
- If match, set:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Credentials`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`
  - `Access-Control-Max-Age`
- If not allowed, do **not** set CORS headers.
- For OPTIONS preflight, return `204` with headers (no body).

### Defaults

- Allow same-origin and configured `securitySettings.cors.allowedOrigins`.
- In dev, add `VITE_DEV_SERVER_URL` automatically if not present.

## Testing Requirements

- [ ] `tests/integration/routes/cors.test.ts` allows configured origin.
- [ ] `tests/integration/routes/cors.test.ts` denies unknown origin.
- [ ] `tests/integration/routes/cors.test.ts` handles OPTIONS.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add CORS config rules.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-cors-middleware.md`
