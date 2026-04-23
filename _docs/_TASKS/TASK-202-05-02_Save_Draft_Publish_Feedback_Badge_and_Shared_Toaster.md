# TASK-202-05-02: Save Draft, Publish Feedback, Badge, and Shared Toaster
# FileName: TASK-202-05-02_Save_Draft_Publish_Feedback_Badge_and_Shared_Toaster.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-202-05-01
**Status:** Done (2026-04-23)

---

## Overview

Fix `BUG-3`: after `Save draft` or `Publish`, the editor gives no explicit
success signal beyond the unsaved alert disappearing. Use the existing shared
admin feedback pattern.

This leaf owns the save/publish feedback and verifies the shared toaster
contract. Duplicate and delete feedback stay with the leaves that implement
those actions (`TASK-202-02-02` and `TASK-202-03-02`) so the action owner also
owns the user-visible result state, but those action leaves must not block
fixing `Save draft` / `Publish` feedback.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeEditor.tsx:214-242`
  - split save and publish intent.
- `core/admin/ui/content-types/ContentTypeEditor.tsx:353-382`
  - render status-aware button and feedback state.
- `core/admin/ui/content-types/ContentTypeList.tsx:30-38`
  - use real status for badges.
- `core/admin/ui/content-types/ContentTypeTable.tsx:99-102`
  - render real status badge.
- `core/admin/app/AdminApp.tsx:826`
  - keep the existing shared `<Toaster />` mount as the feedback host; do not
    add an Engine-only host.
- `tests/vitest/ui/content-type-editor.test.tsx`
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: inherited from save/publish API calls.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - feedback must be based on resolved API responses,
  - errors must be user-readable and redacted,
  - no duplicate toaster/event bus for Engine only.

## Testing Requirements

- Save draft shows success feedback and clears dirty state.
- Publish shows success feedback and updates badge/status.
- Failed save/publish keeps dirty state and shows error.
- Duplicate/delete feedback is covered in the duplicate/delete owner leaves and
  uses the same `AdminApp` toaster; this leaf must not introduce a second
  notification host.
- Shared toaster remains mounted by `AdminApp`.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Save draft` and `Publish` both produce visible success or failure feedback.
2. The editor and list badge agree on status after publish.
3. Duplicate/delete feedback ownership is explicit and uses the same shared
   admin infrastructure.
