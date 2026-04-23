# TASK-202-05-02: Save Draft, Publish Feedback, Badge, and Shared Toaster
# FileName: TASK-202-05-02_Save_Draft_Publish_Feedback_Badge_and_Shared_Toaster.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-202-05-01
**Status:** To Do

---

## Overview

Fix `BUG-3`: after `Save draft` or `Publish`, the editor gives no explicit
success signal beyond the unsaved alert disappearing. Use the existing shared
admin feedback pattern.

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
- `core/admin/app/AdminApp.tsx:87`
  - keep shared toaster mounted; do not add Engine-only host.
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
- Shared toaster remains mounted by `AdminApp`.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Save draft` and `Publish` both produce visible success or failure feedback.
2. The editor and list badge agree on status after publish.
3. Feedback uses shared admin infrastructure.
