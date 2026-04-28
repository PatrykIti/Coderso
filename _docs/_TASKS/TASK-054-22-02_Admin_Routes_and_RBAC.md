# TASK-054-22-02: Admin Routes and RBAC
# FileName: TASK-054-22-02_Admin_Routes_and_RBAC.md

**Priority:** High  
**Category:** Admin/API + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-22-01, TASK-054-02  
**Status:** Done (2026-03-04)

---

## Overview
Dodac internal API dla custom screens i zabezpieczyc je przez RBAC.

## Security Contract
- **Visibility:** internal (`/admin/api/custom-screens/*`).
- **Auth model:** authenticated admin session / API key scope `content:read` + `content:write`.
- **Rate-limit bucket:** `admin_read` / `admin_write`.
- **Anti-abuse:** brak public write; nonce/HMAC/reCAPTCHA nie dotyczy.

## Scope
1. Routes: list/get/create/update/delete custom screens.
2. RBAC: read/write based on existing content permissions.
3. Error mapping + validation errors.

## Files to Create / Change
- `core/server/routes/customScreenRoutes.ts` (new)
- `core/server/routes/adminRoutes.ts` (route registration)
- `core/services/customScreens/*`
- `core/services/rbac/*` (if new permission key required)

## Pseudocode
```ts
router.get("/custom-screens", requirePermission("content:read"), listScreens);
router.post("/custom-screens", requirePermission("content:write"), createScreen);
```

## Acceptance Criteria
1. Admin moze zarzadzac ekranami tylko z odpowiednimi uprawnieniami.
2. Walidacja payloadu zwraca czytelne błędy.
3. Route contracts sa stabilne dla UI.

## Testing Requirements
- Integration: route wiring + RBAC guards.
- Unit: permission mapping + validation errors.

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
