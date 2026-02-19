# 253 - Commerce Admin API Routes and RBAC

- **Date:** 2026-02-19
- **Version:** 0.1.253
- **Tasks:** TASK-054-11, TASK-054-11-04

## Key Changes

### Commerce Admin API
- Added internal admin routes under `/commerce/*`:
  - products list/detail/create/update/delete,
  - product collection assignment (`PUT /commerce/products/:id/collections`),
  - query endpoint (`POST /commerce/products/query`),
  - collections list/detail/create/update/delete.
- File:
  - `core/server/routes/commerceRoutes.ts`.

### RBAC and Permissions
- Added dedicated commerce permissions:
  - `commerce:read`,
  - `commerce:write`.
- File:
  - `core/services/admin/permissionsCatalog.ts`.

### Route Registration and Error Mapping
- Registered commerce routes in main router registry:
  - `core/server/routes/index.ts`.
- Added domain error to API error mapping for commerce payload/query failures with stable status codes.

### Tests
- Added integration coverage for:
  - route wiring,
  - error mapping behavior.
- File:
  - `tests/integration/routes/commerceRoutes.test.ts`.
