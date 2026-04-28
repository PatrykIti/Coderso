# 227-2026-02-17 - Forms editor split and embed widget

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-038-05, TASK-038-06

## Key Changes
- Admin/UI: Added dedicated Forms list page with cached hydration, create drawer, and row actions.
- Admin/UI: Split Forms editor into a per-form builder route with field list, mobile sheets, and form settings panel.
- Admin/UI: Added Forms tab to the page editor library with searchable form cards.
- CMS/Widgets: Introduced Form Embed widget with runtime resolution, styling controls, and editor panels.
- Core/Platform: Added URL-encoded request body parsing for native form submissions.
- Docs: Updated admin cache docs with forms cache keys and route mappings.
- Tests: Added forms client cache coverage, request body URL-encoded parsing, and widget validation tests.
