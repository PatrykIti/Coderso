# TASK-201-05-01: Multi Select Bulk Delete and Download
# FileName: TASK-201-05-01_Multi_Select_Bulk_Delete_and_Download.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-201-05
**Status:** To Do

---

## Overview

Add a Media library multi-select mode with visible-scope bulk delete and bulk
download. Reuse current grid/card selection primitives where possible while
keeping `MediaPicker` behavior stable.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaGrid.tsx`
- `core/admin/ui/media/MediaCard.tsx`
- `core/admin/services/mediaClient.ts`
- add `core/admin/ui/media/MediaBulkActionsBar.tsx` if it keeps the library
  shell smaller
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: `media:read` for selection/download, `media:write` for delete.
- CSRF: existing per-item delete CSRF through `deleteMedia`.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged while using existing per-item routes.
- Anti-abuse:
  - bulk delete requires confirmation,
  - delete applies only to selected visible IDs,
  - partial failures are visible,
  - download URLs must be current media URLs and should not expose backend-only
    credentials.

## Testing Requirements

- Vitest:
  - entering/exiting select mode,
  - visible select all and indeterminate state,
  - selected count,
  - bulk delete confirmation/cancel/apply,
  - partial delete failure,
  - selected item details click behavior remains coherent,
  - `MediaPicker` still supports its current `selectedIds` flow.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Multi-select is discoverable and keyboard-accessible.
2. Bulk delete is confirmed and failure-aware.
3. Bulk download does not require a new unsafe backend path.
