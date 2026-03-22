# TASK-159: Roles Matrix Admin UI Assistant Documentation Refresh
# FileName: TASK-159_Roles_Matrix_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/roles/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the `/admin/roles` surface based
on a real authenticated walkthrough of the local admin UI. The goal is to split
Roles Matrix out of the old combined Users/Roles article and replace it with a
guided document that matches the shipped permission-matrix, search, role-creation,
and save/cancel workflow.

## Scope

1. Review the current combined users/roles assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/roles` with an
   authenticated session and record actual behavior.
3. Create a dedicated Roles Matrix doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/roles` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - permissions search,
   - add role,
   - unsaved-changes footer.
2. Capture the matrix workflow:
   - bulk role toggles,
   - permission groups,
   - role columns,
   - checkbox interactions.
3. Capture the role-editor flow:
   - role name,
   - description,
   - permission selection,
   - full-access warning.
4. Rewrite the doc without leaving `/roles` inside the same assistant article as
   `/users`.

## Acceptance Criteria

1. Roles Matrix has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about matrix review, search, role creation, and
   unsaved permission changes.
4. The coverage matrix points `/roles` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Roles Matrix UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/roles/*`

## Documentation Updates Required

- `docs/screens/roles-matrix.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-159_Roles_Matrix_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Roles Matrix UI
  on `/admin/roles`.
- The walkthrough confirmed:
  - permission search,
  - bulk role toggles,
  - grouped permissions matrix,
  - unsaved-changes footer,
  - add-role dialog.
- The rewritten doc was verified against:
  - `core/admin/ui/roles/PermissionsMatrixPage.tsx`
  - `core/admin/ui/roles/PermissionsMatrix.tsx`
  - `core/admin/ui/roles/RoleEditor.tsx`
  - `core/admin/services/adminRolesClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
