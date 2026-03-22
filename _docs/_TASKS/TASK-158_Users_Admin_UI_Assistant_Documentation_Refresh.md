# TASK-158: Users Admin UI Assistant Documentation Refresh
# FileName: TASK-158_Users_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/users/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the `/admin/users` surface based
on a real authenticated walkthrough of the local admin UI. The goal is to split
Users out of the old combined Users/Roles article and replace it with a guided
document that matches the shipped user list, filters, details panel, invite
dialog, and role-summary workflow.

## Scope

1. Review the current combined users/roles assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/users` with an
   authenticated session and record actual behavior.
3. Create a dedicated Users doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/users` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the users route shell:
   - page header,
   - read-only badge if visible,
   - invite/create role actions,
   - search/role/status filters.
2. Capture the users list and details workflow:
   - user table,
   - role badges,
   - status and last-active fields,
   - right details panel.
3. Capture the invite flow:
   - invite dialog,
   - role selection,
   - permissions preview.
4. Verify row action flows in source:
   - view profile,
   - edit user,
   - reset password,
   - activate/deactivate,
   - delete.
5. Rewrite the doc without keeping `/users` mixed into the same assistant page
   as `/roles`.

## Acceptance Criteria

1. Users has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about list filtering, details review, invite flow, and
   user lifecycle actions.
4. The coverage matrix points `/users` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Users UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/users/*`

## Documentation Updates Required

- `docs/screens/users.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-158_Users_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Users UI on
  `/admin/users`.
- The walkthrough confirmed:
  - page shell,
  - filters,
  - user list,
  - right details panel,
  - invite dialog,
  - embedded role summary section.
- User lifecycle actions were verified against:
  - `core/admin/ui/users/UsersRolesPage.tsx`
  - `core/admin/ui/users/UserList.tsx`
  - `core/admin/ui/users/UserDetailsDrawer.tsx`
  - `core/admin/ui/users/InviteUserDialog.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
