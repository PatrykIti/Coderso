# TASK-201-05-02: Upload Zone Separation and Open Details Preference Placement
# FileName: TASK-201-05-02_Upload_Zone_Separation_and_Open_Details_Preference_Placement.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-201-05
**Status:** Done (2026-04-23)

---

## Overview

Make the upload area visually distinct from the existing asset grid and move or
reinforce `Open details after upload` so users can actually discover it. This
closes `UX-4` and `UX-5` while preserving the existing upload and user setting
contracts.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/UploadDropzone.tsx`
- `core/admin/ui/media/MediaToolbar.tsx`
- `core/admin/ui/media/MediaSettingsDrawer.tsx`
- `core/admin/services/userSettingsClient.ts`
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
- `tests/vitest/admin/userSettingsClient.test.ts` only if preference typing or
  normalization changes

## Security Contract

- Visibility: internal admin UI and existing user setting endpoint.
- Auth model: unchanged.
- RBAC: existing settings/user-settings permissions.
- CSRF: unchanged for `PATCH /user-settings/:key`.
- Rate-limit bucket: existing admin settings/user-settings bucket.
- Reject-unknown validation: preserve the exact `media.openAfterUpload` boolean
  contract.
- Anti-abuse:
  - upload CTA must call the existing file input/dropzone path,
  - preference mutation must not write arbitrary user-setting keys,
  - UI must not reveal storage secrets or privileged settings.

## Testing Requirements

- Vitest:
  - upload surface and grid are separately identifiable,
  - upload CTA still opens the hidden file input path,
  - `Open details after upload` renders in the chosen discoverable location,
  - preference changes still call `setUserSetting("media.openAfterUpload", ...)`,
  - settings drawer remains focused on delivery access if the preference is
    intentionally kept outside it.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` only if user-settings docs need wording refresh
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Upload controls are visually separated from the asset grid.
2. `Open details after upload` is discoverable and still uses the existing
   `media.openAfterUpload` setting.
3. Upload validation and settings security remain unchanged.
