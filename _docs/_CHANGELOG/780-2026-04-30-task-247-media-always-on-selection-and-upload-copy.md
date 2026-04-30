# 780. TASK-247 media always-on selection and upload copy

Date: 2026-04-30
Version: 1.0.0
Tasks: TASK-247

## Key Changes

### CMS Media/Admin UI
- Removed the Media Library header `Select` mode button.
- Kept multi-select checkboxes, selected count, `Select visible`, `Download`,
  `Delete`, and `Clear` available in the default Media Library state.
- Preserved card and row primary clicks for opening asset details while checkbox
  clicks only toggle bulk selection.
- Renamed the header upload CTA from `Upload New` to `Upload`.
- Preserved the existing `UploadDropzone` hidden file-input path and
  `media.openAfterUpload` preference behavior.

### Documentation
- Updated the Media spec to document always-available multi-select.
- Updated TASK-247 status, task board statistics, and changelog index.

## Validation

- PASS `bun run test:vitest -- tests/vitest/ui/media-library.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/ui/media-components.test.tsx tests/vitest/ui/media-card.test.tsx`
- PASS `bun --cwd core lint`
- PASS `bun --cwd core lint:types`
- PASS `git diff --check`
