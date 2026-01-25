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
```

---

## Sub-Tasks

### TASK-019-1: Users UI

**Status:** To Do

- List users.
- Create/edit users.
- Assign roles.

---

### TASK-019-2: Roles UI

**Status:** To Do

- Create/edit roles.
- Configure permissions (checkbox list).

Example role payload:

```json
{
  "name": "editor",
  "permissions": ["content:read", "content:write", "media:read"]
}
```

---

## Testing Requirements

- [ ] User create/edit persists.
- [ ] Role update affects permission checks.
- [ ] Users without permission cannot access screens.

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
