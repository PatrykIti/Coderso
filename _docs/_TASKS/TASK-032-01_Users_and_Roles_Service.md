# TASK-032-01: Users and Roles Service
# FileName: TASK-032-01_Users_and_Roles_Service.md

**Priority:** High  
**Category:** Admin/Users  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Add service layer for managing users, roles, and permissions.

## Service API

Create `core/services/admin/usersService.ts`:
- `listUsers()` (with role names)
- `getUser(id)`
- `createUser(input)` (password optional)
- `updateUser(id, input)`
- `disableUser(id)` / `enableUser(id)`
- `setUserRoles(userId, roleIds[])`

Create `core/services/admin/rolesService.ts`:
- `listRoles()`
- `getRole(id)`
- `createRole(input)`
- `updateRole(id, input)`
- `deleteRole(id)` (guard: cannot delete last admin)

Create `core/services/admin/permissionsCatalog.ts`:
- `listPermissions()` (static list of permission strings + labels)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/admin/usersService.ts` | CRUD + role assignment |
| `core/services/admin/rolesService.ts` | CRUD + guards |
| `core/services/admin/permissionsCatalog.ts` | permission list |
| `tests/unit/admin/usersService.test.ts` | create/update/disable |
| `tests/unit/admin/rolesService.test.ts` | CRUD + last-admin guard |

## Notes

- Use existing `roles`, `users`, `user_roles` tables.
- Ensure `admin` role with `*` permission cannot be removed from last admin.

## Documentation Updates Required

- `_docs/CMS_API.md` permissions catalog section.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-roles-services.md`
