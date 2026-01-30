# TASK-086: Admin Users and Roles Core and UI
# FileName: TASK-086_Admin_Users_and_Roles_Core_and_UI.md

**Priority:** High  
**Category:** Admin/Users  
**Estimated Effort:** Large  
**Dependencies:** TASK-001, TASK-004, TASK-020, TASK-006-19, TASK-006-24, TASK-006-35  
**Status:** To Do

---

## Overview

Implement full users/roles management (CRUD + permissions) and wire the existing Admin UI screens.

## Goals

- List/create/update/disable users.
- List/create/update roles and permissions.
- Provide a canonical permissions catalog.
- Wire Users page, Invite dialog, and Roles Matrix UI to API.

## Sub-Tasks (detailed task files)

- `TASK-086-01_Users_and_Roles_Service.md`
- `TASK-086-02_Users_and_Roles_API_Routes.md`
- `TASK-086-03_Users_UI_Wiring.md`
- `TASK-086-04_Roles_Matrix_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` users/roles endpoints.
- `_docs/ARCHITECTURE.md` RBAC overview.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-roles-core.md`
