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
surface ambiguity. It also verifies the existing details action surface so
visible actions do real work through named owners. This wave adds a
visible-scope bulk flow, makes the upload area/preference easier to find, and
repairs the current Replace affordance without breaking `MediaPicker`.

## Sub-Tasks

- `TASK-201-05-01_Multi_Select_Bulk_Delete_and_Download.md`
- `TASK-201-05-02_Upload_Zone_Separation_and_Open_Details_Preference_Placement.md`
- `TASK-201-05-03_Replace_Action_Owner_and_Details_Actions.md`

## Scope

- Add a library-owned multi-select mode separate from details selection.
- Support visible-scope select all, clear selection, bulk delete, and bulk
  download.
- Confirm destructive bulk delete.
- Reuse existing `deleteMedia` per item unless a new route is justified later.
- Make the existing `Replace` details action real through the media drawer,
  page, client, route, and service owners, or render it as unavailable and
  record an explicit open state during closure.
- Visually separate upload/dropzone from the asset grid.
- Move or duplicate `Open details after upload` into a clearer settings/upload
  preference surface while preserving `media.openAfterUpload`.

Out of scope:

- folders, bulk move, tagging, or collection assignment,
- a new media binary archive service unless client-side download is
  demonstrably insufficient and security-reviewed,
- changing upload validation or allowed MIME settings,
- leaving visible details actions clickable without an owner callback and
  tested async result.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaGrid.tsx`
- `core/admin/ui/media/MediaCard.tsx`
- `core/admin/ui/media/MediaToolbar.tsx`
- `core/admin/ui/media/UploadDropzone.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaSettingsDrawer.tsx`
- `core/admin/services/mediaClient.ts`
- `core/admin/services/userSettingsClient.ts`
- `core/server/routes/mediaRoutes.ts` if same-id replace is implemented
- `core/server/validation/mediaSchemas.ts` if a replace payload is added
- `core/services/media/mediaService.ts` if same-id replace is implemented
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/unit/media/mediaService.test.ts` if same-id replace is implemented
- `tests/integration/routes/media.test.ts` if a replace route is implemented

## Security Contract

- Visibility: internal admin Media UI only.
- Auth model: unchanged admin session/API-key path.
- RBAC: `media:read` for selection/download, `media:write` for deletes and
  same-id replacement if implemented.
- CSRF: unchanged for each delete mutation and required for any replace
  mutation.
- Rate-limit bucket: existing `admin_write` for delete/replace operations.
- Reject-unknown validation: unchanged unless a new bulk route is explicitly
  added by a follow-up or a replace payload is added by `TASK-201-05-03`.
- Anti-abuse:
  - bulk delete requires confirmation,
  - selection applies only to visible filtered rows unless the UI explicitly
    states a broader scope,
  - partial failures surface per-item or summarized errors,
  - downloads must use already authorized URLs and respect internal media
    delivery mode,
  - Replace must reuse upload validation and must not expose raw storage paths,
    signed secrets, or backend-only credentials.

## Testing Requirements

- Vitest:
  - library selection mode does not break details open behavior,
  - visible select all / clear selection,
  - bulk delete confirmation and partial failure handling,
  - bulk download action uses safe URL/open/anchor behavior,
  - Replace action is either real with success/error state or non-clickable with
    an explicit unavailable state,
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
4. Visible details actions, especially Replace, are not inert.
