# 755 - TASK-224 Page editor preview action consolidation

Date: 2026-04-27
Version: Nextless Admin
Tasks: TASK-224

## Key Changes

### Pages Admin UI

- Removed the redundant Pages editor toolbar device selector.
- Renamed the toolbar action from `Runtime preview` to `Preview`.
- Moved `Preview` directly to the left of `Save draft`.
- Kept desktop/tablet/mobile switching inside the existing runtime preview
  dialog.

### Documentation and Validation

- Updated the preview spec so device selection is owned by
  `RuntimePreviewDialog`.
- Covered the toolbar contract with targeted Pages editor Vitest suites.
