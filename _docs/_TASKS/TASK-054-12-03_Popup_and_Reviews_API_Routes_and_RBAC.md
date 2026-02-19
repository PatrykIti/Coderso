# TASK-054-12-03: Popup and Reviews API Routes and RBAC
# FileName: TASK-054-12-03_Popup_and_Reviews_API_Routes_and_RBAC.md

**Priority:** High  
**Category:** API/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12-02  
**Status:** To Do

---

## Goal
Expose popup/reviews management through internal admin API with explicit permission boundaries and stable error mapping.

## Scope
1. Add `/popups/*` internal routes.
2. Add `/reviews/*` internal routes.
3. Register route modules in `registerAllRoutes`.
4. Add permissions:
   - `popups:read`, `popups:write`,
   - `reviews:read`, `reviews:write`.

## Security Contract
- Endpoint visibility: `internal` (`/admin/api/*`) only for this subtask.
- Auth: admin session + RBAC permission middleware.
- Rate-limit bucket: admin bucket (existing authenticated admin policy).
- Anti-abuse:
  - no anonymous fallback,
  - no public write endpoints added in this subtask,
  - if future public review submit is introduced, it must require nonce + signature/HMAC + optional reCAPTCHA and separate public write bucket.

## Files
- `core/server/routes/popupsRoutes.ts` (new)
- `core/server/routes/reviewsRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/services/admin/permissionsCatalog.ts`
- `core/server/validation/popupSchemas.ts` (new)
- `core/server/validation/reviewSchemas.ts` (new)

## Pseudocode
```ts
router.post("/popups", requirePermission("popups:write"), validate(schema), createPopup);
router.patch("/reviews/:id/status", requirePermission("reviews:write"), moderateReview);
```

## Acceptance Criteria
1. New routes are internal-only and permission-guarded.
2. Domain errors map to stable API responses.
3. Route wiring tests pass.
