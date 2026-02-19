# TASK-054-11-04: Commerce Admin API Routes and RBAC
# FileName: TASK-054-11-04_Commerce_Admin_API_Routes_and_RBAC.md

**Priority:** High  
**Category:** API/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-03, TASK-004  
**Status:** To Do

---

## Goal
Expose internal commerce APIs with RBAC and stable error mapping.

## Scope
1. Add `/admin/api/commerce/*` CRUD routes.
2. Add permissions (`commerce:read`, `commerce:write`).
3. Map domain errors to API-safe codes.
4. Register routes in main router.

## Files (planned)
- `core/server/routes/commerceRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/services/admin/permissionsCatalog.ts`
- `tests/integration/routes/commerceRoutes.test.ts` (new)

## Pseudocode
```ts
if (!hasPermission(user, "commerce:write")) throw forbidden();
try {
  const product = await createCommerceProduct(payload);
  return ok(product);
} catch (error) {
  throw mapCommerceError(error);
}
```

## Acceptance Criteria
1. Commerce routes are internal and RBAC-protected.
2. Validation + domain errors never leak as generic 500 for known cases.
3. Integration tests cover route registration and error mapping.
