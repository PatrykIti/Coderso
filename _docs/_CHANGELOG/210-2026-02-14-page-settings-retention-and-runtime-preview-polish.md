# 210-2026-02-14 - Page settings retention and runtime preview polish

Date: 2026-02-14
Version: Unreleased
Tasks: TASK-053-02, TASK-053-03, TASK-053-04, TASK-053-05

## Key Changes
- Admin/UI: Page Settings drawer is fully scrollable and now exposes per-page revision retention controls.
- CMS/Pages: Publish flow prunes page revisions based on per-page retention (default 10, clamped 1–100).
- Preview/Runtime: Runtime preview device selection syncs between header and dialog with a single close button.
- Preview/Runtime: Added CSS preload and preview-only hide to reduce FOUC in runtime previews.
- Docs: Updated PAGE_MODEL, CMS_SPEC, and PREVIEW_SPEC with retention + preview behavior.
