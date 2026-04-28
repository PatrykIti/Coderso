# 231-2026-02-17 - Coderso admin IA and routing foundation

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-054-01, TASK-054-02, TASK-054-03, TASK-054-04, TASK-054-05

## Key Changes
- Admin/UI: Introduced `Coderso` sidebar group with modules: Engine, Entries, Widgets, Forms, Posts.
- Admin/UI: Added collapsible group rendering with persisted state (`nextless.admin.navGroupState`).
- Admin/UI: Added active-state matching for canonical + nested routes and mobile drawer close-on-select.
- Admin/Routing: Added canonical Coderso route aliases in `adminPaths` and route normalization in `AdminApp`.
- Admin/Routing: Switched canonical route patterns to `/admin/coderso/*` while preserving legacy links.
- Admin/Prefetch: Updated prefetch matching to canonical Coderso paths with legacy alias support.
- Tests: Added nav/router/link regression tests for Coderso IA and alias behavior.
- Docs: Updated navigation and architecture docs with Coderso IA and compatibility contract.
