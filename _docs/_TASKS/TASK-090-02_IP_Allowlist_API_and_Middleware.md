# TASK-090-02: IP Allowlist API and Middleware
# FileName: TASK-090-02_IP_Allowlist_API_and_Middleware.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-090-01, TASK-020  
**Status:** To Do

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

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-ip-allowlist-api.md`
