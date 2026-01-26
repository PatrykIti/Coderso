# TASK-006-13: Users and Roles UI
# FileName: TASK-006-13_Users_and_Roles_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-019, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Convert the users and roles admin screen into shadcn components. Data wiring
and RBAC actions are covered by TASK-019.

## Reference UI

- `_docs/UI/admin_panel/13-user-and-roles/code.html`
- `_docs/UI/admin_panel/13-user-and-roles/screen.png`

## UI Composition

**Wrapper:** `SplitShell`

**Sections:**
- Header with actions (create role, invite user).
- Filters (search, role, status).
- Users table with status badges and row actions.
- Right drawer for user details and permissions summary.

## Shadcn Components

- `Table`, `Button`, `Input`, `Select`, `Badge`, `DropdownMenu`, `Sheet`,
  `Switch`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/users/UsersRolesPage.tsx` | create | screen layout |
| `core/admin/ui/users/UsersTable.tsx` | create | table + rows |
| `core/admin/ui/users/UserFilters.tsx` | create | search + selects |
| `core/admin/ui/users/UserDetailsDrawer.tsx` | create | right panel |
| `core/admin/ui/layouts/SplitShell.tsx` | use | wrapper |

## Data + State

- `GET /users` with filters.
- `GET /roles` for role list.
- `PATCH /users/:id` for updates.
- `PATCH /roles/:id` for permission changes.

## Unit Tests

- `tests/unit/ui/users-roles.test.tsx` renders table + drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-roles-ui.md`
