# 225-2026-02-17 - Admin SPA navigation and prefetch

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-053-08

## Key Changes
- Admin/UI: Added lightweight SPA router for internal admin navigation.
- Admin/UI: Sidebar and internal links now use `AdminLink` to avoid full reloads.
- Admin/UI: Optional route prefetch warms list caches on hover/focus.
- Docs: Added admin navigation spec and documented prefetch behavior.
- Tests: Added prefetch and AdminLink coverage.
