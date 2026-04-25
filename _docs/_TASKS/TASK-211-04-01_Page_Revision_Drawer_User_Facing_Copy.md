# TASK-211-04-01: Page Revision Drawer User-Facing Copy
# FileName: TASK-211-04-01_Page_Revision_Drawer_User_Facing_Copy.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + UX Copy
**Estimated Effort:** Small
**Dependencies:** TASK-211-04
**Status:** To Do

---

## Overview

Update `PageRevisionDrawer` user-facing copy so the Page History surface matches
the Page Settings `draft version in history` wording.

This is a UI copy task only. Do not rename `autosave` in persisted data, API
types, service code, or route contracts.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageRevisionDrawer.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`

## Implementation Direction

- Drawer description:
  - replace `Restore published revisions or manage the latest settings autosave.`
  - with copy such as `Restore published versions or manage the latest draft version.`
- Revision row:
  - use `Draft version` / `Draft` instead of `Not saved` plus `Autosave` badge if
    that reads better in the current UI.
- Confirm dialogs:
  - `Restore draft version?`
  - `Restore this draft version? Current unsaved changes may be overwritten.`
  - `Discard draft version?`
  - `Discard this draft version? It will be removed from history.`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no route or data changes.

## Testing Requirements

- Update `tests/vitest/ui/page-revision-drawer.test.tsx`:
  - assert the new drawer description;
  - assert the draft badge/label;
  - assert restore/discard dialog copy;
  - assert callbacks still receive the original revision id.

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. No user-facing `autosave` copy remains in Page History.
2. Domain/API `autosave` kind stays unchanged.
