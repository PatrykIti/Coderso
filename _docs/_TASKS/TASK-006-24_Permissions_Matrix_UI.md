# TASK-006-24: Permissions Matrix UI (Visual)
# FileName: TASK-006-24_Permissions_Matrix_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-019, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the roles/permissions matrix UI (grid) for RBAC management. Visual-only
layer for TASK-019.

## Reference UI

- `_docs/UI/admin_panel/24-permissions-matrix/code.html`
- `_docs/UI/admin_panel/24-permissions-matrix/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Roles list header + search.
- Permission grid (rows = permissions, columns = roles).
- Bulk toggles and save bar.

## Shadcn Components

- `Table`, `Checkbox`, `Button`, `Input`, `Badge`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/roles/PermissionsMatrixPage.tsx` | create | main layout |
| `core/admin/ui/roles/PermissionsMatrix.tsx` | create | grid |

## Data + State

- `GET /roles`
- `PATCH /roles/:id` for permission updates.

## Unit Tests

- `tests/unit/ui/permissions-matrix.test.tsx` renders grid.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-permissions-matrix-ui.md`
