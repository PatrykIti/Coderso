# TASK-201-05: Bulk Asset Actions and Upload Surface Clarity
# FileName: TASK-201-05_Bulk_Asset_Actions_and_Upload_Surface_Clarity.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-201, TASK-201-03
**Status:** To Do

---

## Overview

Improve day-to-day asset management after the correctness fixes land. The
Playwright report identifies missing multi-select/bulk operations and upload
surface ambiguity. This wave adds a visible-scope bulk flow and makes the upload
area/preference easier to find without breaking `MediaPicker`.

## Sub-Tasks

- `TASK-201-05-01_Multi_Select_Bulk_Delete_and_Download.md`
- `TASK-201-05-02_Upload_Zone_Separation_and_Open_Details_Preference_Placement.md`

## Scope

- Add a library-owned multi-select mode separate from details selection.
- Support visible-scope select all, clear selection, bulk delete, and bulk
  download.
- Confirm destructive bulk delete.
- Reuse existing `deleteMedia` per item unless a new route is justified later.
- Visually separate upload/dropzone from the asset grid.
- Move or duplicate `Open details after upload` into a clearer settings/upload
  preference surface while preserving `media.openAfterUpload`.

Out of scope:

- folders, bulk move, tagging, or collection assignment,
- a new media binary archive service unless client-side download is
  demonstrably insufficient and security-reviewed,
- changing upload validation or allowed MIME settings.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaGrid.tsx`
- `core/admin/ui/media/MediaCard.tsx`
- `core/admin/ui/media/MediaToolbar.tsx`
- `core/admin/ui/media/UploadDropzone.tsx`
- `core/admin/ui/media/MediaSettingsDrawer.tsx`
- `core/admin/services/mediaClient.ts`
- `core/admin/services/userSettingsClient.ts`
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`

## Security Contract

- Visibility: internal admin Media UI only.
- Auth model: unchanged admin session/API-key path.
- RBAC: `media:read` for selection/download, `media:write` for deletes.
- CSRF: unchanged for each delete mutation.
- Rate-limit bucket: existing `admin_write` for delete operations.
- Reject-unknown validation: unchanged unless a new bulk route is explicitly
  added by a follow-up.
- Anti-abuse:
  - bulk delete requires confirmation,
  - selection applies only to visible filtered rows unless the UI explicitly
    states a broader scope,
  - partial failures surface per-item or summarized errors,
  - downloads must use already authorized URLs and respect internal media
    delivery mode.

## Testing Requirements

- Vitest:
  - library selection mode does not break details open behavior,
  - visible select all / clear selection,
  - bulk delete confirmation and partial failure handling,
  - bulk download action uses safe URL/open/anchor behavior,
  - `MediaPicker` selection remains unchanged,
  - upload/dropzone visual separation and preference placement render.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Users can select multiple visible assets and perform safe bulk actions.
2. Existing single-click details selection still works.
3. Upload and open-after-upload controls are easier to discover without a second
   preference contract.
