# 747 - TASK-215 Widgets Pages-style library parity

Date: 2026-04-26
Version: unreleased
Tasks: TASK-215, TASK-215-01, TASK-215-01-01, TASK-215-01-02, TASK-215-02, TASK-215-02-01, TASK-215-02-02, TASK-215-02-03, TASK-215-03, TASK-215-03-01, TASK-215-03-02, TASK-215-03-03, TASK-215-04, TASK-215-04-01, TASK-215-04-02, TASK-215-04-03, TASK-215-04-04, TASK-215-05, TASK-215-05-01, TASK-215-05-02

## Key Changes

### Widget Library Shell
- Replaced the Widgets left rail with one filter-bar section dropdown for `All Items`, `Favorites`, `Templates`, `All Widgets`, and widget categories.
- Made `All Items` open in table view by default and kept grid as a view-mode switch over the same visible rows.
- Preserved existing widget catalog, template category, page, drawer, insert dialog, and template category drawer ownership.

### Table, Grid, and Selection
- Added a section-aware widget library model for dropdown normalization, filtering, counts, and visible-row selection trimming.
- Added a Pages-style widget table with checkbox selection, source/category/details columns, three-dot row actions, and shared pagination.
- Upgraded grid cards with selectable checkboxes and the same row-equivalent action menus while preserving core-widget drawer click behavior.

### Actions and Feedback
- Added source-aware action menus: core rows expose Preview placeholder, Configure, Insert, and favorite actions; template management actions stay scoped to the `Templates` section.
- Added visible-scope bulk favorite add/remove and Favorites bulk removal while preserving `widgets.favorites` and max-50 feedback.
- Kept template destructive actions behind `ConfirmActionDialog` and switched bulk delete to `Promise.allSettled` partial-failure handling.

### Docs and QA
- Updated Widgets, Content List UX, Admin Cache, Admin Cache Map, task statuses, task board stats, and this changelog.
- Validated with core lint/typecheck and targeted Vitest UI/helper/pagination/widget client/prefetch suites.
