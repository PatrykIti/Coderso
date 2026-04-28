# TASK-036-02: IP Allowlist API and Middleware
# FileName: TASK-036-02_IP_Allowlist_API_and_Middleware.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-036-01, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Expose allowlist endpoints and enforce allowlist in request pipeline.

## Routes

Add `core/server/routes/ipAllowlistRoutes.ts`:
- `GET /ip-allowlist`
- `POST /ip-allowlist`
- `DELETE /ip-allowlist/:id`

## Middleware

Add `core/server/middleware/ipAllowlist.ts`:
- If list empty → allow all.
- If not empty → block unless IP matches.
- Apply to `/admin/api/*` and `/admin/*` pages.

## Validation

`core/server/validation/ipAllowlistSchemas.ts`:
- CIDR validation.

## Testing Requirements

- `tests/integration/routes/ipAllowlist.test.ts`
- `tests/unit/security/ipAllowlistMiddleware.test.ts`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` enforcement details.
- `_docs/CMS_API.md` allowlist endpoints.

## Changelog Entry

- `_docs/_CHANGELOG/091-2026-01-31-ip-allowlist-core.md`
