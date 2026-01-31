# TASK-032-03: Users UI Wiring
# FileName: TASK-032-03_Users_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-032-02, TASK-006-19, TASK-006-35  
**Status:** Done (2026-01-31)

---

## Overview

Wire Users UI to real API endpoints.

## UI Scope

Use:
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/ui/users/InviteUserDialog.tsx`
- `core/admin/ui/users/UserDrawer.tsx` (if present)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/adminUsersClient.ts` | list/create/update/disable/roles |
| `UsersRolesPage.tsx` | load users + roles from API |
| `InviteUserDialog.tsx` | create user via API |

### UX notes

- Disable delete for last admin.
- Show role badges from API.
- Use optimistic updates where safe.

## Testing Requirements

- `tests/unit/admin/adminUsersClient.test.ts`
- Update `tests/unit/ui/users-roles.test.tsx`
- Update `tests/unit/ui/invite-user.test.tsx`

## Documentation Updates Required

- `_docs/CMS_API.md` confirm UI uses admin users endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-users-ui-wiring.md`
