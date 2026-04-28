# 260 - Engagement API Routes and RBAC

- **Date:** 2026-02-19
- **Version:** 0.1.260
- **Tasks:** TASK-054-12, TASK-054-12-03

## Key Changes

### Internal Popup API
- Added internal admin endpoints for popup lifecycle management:
  - `GET /admin/api/popups`
  - `GET /admin/api/popups/:id`
  - `POST /admin/api/popups`
  - `PATCH /admin/api/popups/:id`
  - `PATCH /admin/api/popups/:id/status`
  - `DELETE /admin/api/popups/:id`
- Added payload/query validation schemas and stable domain error mapping.
- Files:
  - `core/server/routes/popupsRoutes.ts`
  - `core/server/validation/popupSchemas.ts`

### Internal Reviews API
- Added internal admin endpoints for review moderation workflow:
  - `GET /admin/api/reviews`
  - `GET /admin/api/reviews/:id`
  - `POST /admin/api/reviews`
  - `PATCH /admin/api/reviews/:id`
  - `PATCH /admin/api/reviews/:id/status`
  - `DELETE /admin/api/reviews/:id`
- Added payload/query validation schemas and stable domain error mapping.
- Files:
  - `core/server/routes/reviewsRoutes.ts`
  - `core/server/validation/reviewSchemas.ts`

### Router and RBAC Catalog
- Registered popup/review route modules in global route registration.
- Added new permission scopes:
  - `popups:read`, `popups:write`
  - `reviews:read`, `reviews:write`
- Files:
  - `core/server/routes/index.ts`
  - `core/services/admin/permissionsCatalog.ts`

### Tests
- Added route wiring + error mapping coverage:
  - `tests/integration/routes/popupsRoutes.test.ts`
  - `tests/integration/routes/reviewsRoutes.test.ts`
- Added permission catalog coverage:
  - `tests/unit/admin/permissionsCatalog.test.ts`
