# TASK-006-35: Invite Users UI (Visual)
# FileName: TASK-006-35_Invite_Users_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-019, TASK-024  
**Status:** To Do

---

## Overview

Create the “Invite User” drawer/modal UI (name, email, role, permissions
preview). Visual-only layer for TASK-019.

## Reference UI

- `_docs/UI/admin_panel/35-invite-users/code.html`
- `_docs/UI/admin_panel/35-invite-users/screen.png`

## UI Composition

**Wrapper:** `Dialog` (modal)

**Sections:**
- Form fields (name, email, role).
- Permissions preview list.
- Actions: send invite, cancel.

## Shadcn Components

- `Dialog` or `Sheet`, `Button`, `Input`, `Select`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/users/InviteUserDialog.tsx` | create | modal/drawer |
| `core/admin/ui/users/UsersRolesPage.tsx` | update | launch invite |

## Data + State

- `POST /users` (invite/pending status).

## Unit Tests

- `tests/unit/ui/invite-user.test.tsx` renders form.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-invite-users-ui.md`
