# TASK-032-02: Users and Roles API Routes
# FileName: TASK-032-02_Users_and_Roles_API_Routes.md

**Priority:** High  
**Category:** Admin/Users  
**Estimated Effort:** Medium  
**Dependencies:** TASK-032-01, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Expose users/roles management endpoints for Admin UI.

## Routes

Add `core/server/routes/adminUsersRoutes.ts`:

- `GET /admin-users`
- `POST /admin-users`
- `PATCH /admin-users/:id`
- `POST /admin-users/:id/disable`
- `POST /admin-users/:id/enable`
- `PUT /admin-users/:id/roles` (replace role ids)

Add `core/server/routes/adminRolesRoutes.ts`:

- `GET /admin-roles`
- `POST /admin-roles`
- `PATCH /admin-roles/:id`
- `DELETE /admin-roles/:id`
- `GET /admin-roles/permissions` (catalog)

## Validation

Add schemas:
`core/server/validation/adminUserSchemas.ts`  
`core/server/validation/adminRoleSchemas.ts`

## Testing Requirements

- `tests/integration/routes/adminUsers.test.ts` (routes registered)
- `tests/integration/routes/adminRoles.test.ts` (routes registered)

## Documentation Updates Required

- `_docs/CMS_API.md` add users/roles endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-roles-api.md`
