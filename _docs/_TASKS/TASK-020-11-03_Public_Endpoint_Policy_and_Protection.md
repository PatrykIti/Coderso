# TASK-020-11-03: Public Endpoint Policy + Protection
# FileName: TASK-020-11-03_Public_Endpoint_Policy_and_Protection.md

**Priority:** High  
**Category:** Core/Security + Public Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-11-01  
**Status:** To Do  

---

## Overview

Define explicit public endpoints and apply read/write rate limits plus reCAPTCHA v3 checks. Protect preview tokens and public submission endpoints.

---

## Goals

1. Identify public routes and classify as read/write.
2. Apply stricter limits to public write endpoints.
3. Ensure preview tokens cannot be brute-forced.
4. Add reCAPTCHA v3 gate to public write endpoints.

## Public Endpoint Inventory (from docs + code)

**Admin API public writes:**
- `POST /forms/:id/submissions` (public submit)

**Auth endpoints (strict auth bucket, not public_write):**
- `POST /auth/login`
- `POST /auth/reset`
- `POST /auth/reset/confirm`

**Public site reads:**
- `GET /admin/*` and `/admin/assets/*` (admin SPA bootstrap + assets)
- `GET /preview` (tokenized preview)
- `GET /media/*` (media files)
- `GET /site/assets/*` and `GET /site/favicon.ico`
- `GET /` and all other public site routes (pages + content routes)

**Notes:**
- Admin UI assets (`/admin/*`) are served publicly for bootstrapping and should use the `public_read` bucket with high limits.
- Public site requests are handled in `core/server/publicSite.tsx` (not `/admin/api`).


---

## Pseudocode

```ts
// public route classification
const PUBLIC_WRITE = ["/admin/api/forms/:id/submissions"];
const PUBLIC_READ = ["/preview", "/media/*", "/site/*", "/admin/*"];

if (PUBLIC_WRITE.matches(path)) bucket = "public_write";
else if (PUBLIC_READ.matches(path)) bucket = "public_read";
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/server/publicSite.tsx` | Apply bucket mapping for public read/write |
| `core/server/httpServer.ts` | Ensure preview endpoints are gated + bucketed |
| `core/server/routes/formsRoutes.ts` | reCAPTCHA v3 for public submissions |
| `tests/unit/security/rateLimit.test.ts` | Add public bucket coverage |
| `tests/integration/routes/forms.test.ts` | Validate public write throttling |

---

## Open Questions

- None (list resolved from docs/code).

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`
