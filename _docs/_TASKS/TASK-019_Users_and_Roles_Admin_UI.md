# TASK-019: Users and Roles Admin UI
# FileName: TASK-019_Users_and_Roles_Admin_UI.md

**Priority:** Medium
**Category:** CMS/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004
**Status:** To Do

---

## Overview

Build admin UI to manage users and roles in core.

**Goals:**
- CRUD users with role assignment.
- CRUD roles and permission sets.
- Lock down access with RBAC.

---

## Architecture

```
admin/ui/users/
  UserList.tsx
  UserEditor.tsx
admin/ui/roles/
  RoleList.tsx
  RoleEditor.tsx

tests/unit/authUi/
  rolesUi.test.tsx
  usersUi.test.tsx
```

---

## Sub-Tasks

### TASK-019-01_Users_UI

**Status:** To Do

- List users.
- Create/edit users.
- Assign roles.
- Prevent deleting the last admin user.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/users/UserList.tsx` | list + actions |
| `admin/ui/users/UserEditor.tsx` | editor form |

---

### TASK-019-02_Roles_UI

**Status:** To Do

- Create/edit roles.
- Configure permissions (checkbox list).
- Provide "select all" for admin role.

Example role payload:

```json
{
  "name": "editor",
  "permissions": ["content:read", "content:write", "media:read"]
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/roles/RoleList.tsx` | list + actions |
| `admin/ui/roles/RoleEditor.tsx` | editor form |

---

## Testing Requirements

- [ ] `tests/unit/authUi/usersUi.test.tsx` creates and edits users.
- [ ] `tests/unit/authUi/rolesUi.test.tsx` updates permissions.
- [ ] `tests/integration/ui/roles.test.tsx` enforces RBAC in UI.
- [ ] `tests/integration/ui/users.test.tsx` blocks deleting last admin.

---

## New Files to Create

- `admin/ui/users/UserList.tsx`
- `admin/ui/users/UserEditor.tsx`
- `admin/ui/roles/RoleList.tsx`
- `admin/ui/roles/RoleEditor.tsx`
- `tests/unit/authUi/usersUi.test.tsx`
- `tests/unit/authUi/rolesUi.test.tsx`
- `tests/integration/ui/roles.test.tsx`
- `tests/integration/ui/users.test.tsx`

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` (admin UI notes).
- `_docs/RBAC_SPEC.md` (permission mappings).
- `_docs/CMS_API.md` (users/roles endpoints usage).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-and-roles-ui.md`
- Notes: users and roles management UI.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
