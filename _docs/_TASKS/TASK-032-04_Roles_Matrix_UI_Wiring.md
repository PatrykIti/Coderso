# TASK-032-04: Roles Matrix UI Wiring
# FileName: TASK-032-04_Roles_Matrix_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-032-02, TASK-006-24  
**Status:** Done (2026-01-31)

---

## Overview

Wire Permissions Matrix UI to real roles/permissions API.

## UI Scope

Use:
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/PermissionsMatrixTable.tsx`
- `core/admin/ui/roles/RoleEditor.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/adminRolesClient.ts` | list/update roles + permissions catalog |
| `PermissionsMatrixPage.tsx` | load roles + permissions |
| `RoleEditor.tsx` | update role permissions |

### UX notes

- Show permission groups (content, media, settings, plugins, etc).
- Use permissions catalog labels instead of raw strings.

## Testing Requirements

- `tests/unit/admin/adminRolesClient.test.ts`
- Update `tests/unit/ui/permissions-matrix.test.tsx`
- Update `tests/unit/authUi/rolesUi.test.tsx` (if shared)

## Documentation Updates Required

- `_docs/CMS_API.md` permissions catalog.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-roles-matrix-ui.md`
