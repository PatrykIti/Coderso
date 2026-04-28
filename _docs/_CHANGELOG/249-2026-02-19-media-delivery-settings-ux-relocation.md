# 249 - Media Delivery Settings UX Relocation

- **Date:** 2026-02-19
- **Version:** 0.1.249
- **Tasks:** TASK-054-10-09, TASK-054-10-09-01

## Key Changes

### Admin UX
- Moved media delivery access controls from **Settings -> Storage** to **Media Library**.
- Added a new `Media settings` action next to `Upload New` on `/admin/media`.
- Added a dedicated media settings drawer with `public` / `internal` delivery mode selector.

### Storage Settings Scope Cleanup
- Removed the Delivery Access card from `Settings -> Storage`.
- Storage page now focuses on provider configuration and upload policy defaults.

### Tests
- Added unit coverage for the media settings drawer:
  - `tests/unit/mediaUi/mediaSettingsDrawer.test.tsx`
- Updated existing UI tests:
  - `tests/unit/ui/media-library.test.tsx`
  - `tests/unit/ui/storage-settings.test.tsx`
