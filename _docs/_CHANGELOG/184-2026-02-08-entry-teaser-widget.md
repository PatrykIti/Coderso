# 184-2026-02-08 - Entry teaser widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-14-02, TASK-050-14, TASK-050

## Summary
- Added new `entry-teaser` dynamic widget with runtime source resolution (`manual`, `latest`, `featured`) and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `entry-teaser` schema, defaults, normalization, and renderer variants (`horizontal`, `vertical`, `minimal`).
- CMS/Widgets: Added fallback strategy for featured mode (`fallbackToLatest`) and deterministic runtime markers (`data-entry-teaser-*`).
- CMS/Site: Added runtime resolver for teaser source resolution with published/preview parity and content route-aware detail URLs.
- CMS/Site: Extended public runtime/template preview hydration pipeline to resolve `entry-teaser` payload server-side.
- Admin/UI: Added `EntryTeaserEditors` with source mode workflow, manual entry picker, CTA behavior controls, and technical advanced options.
- Admin/UI: Registered Entry Teaser in core/admin/runtime widget pipelines.
- Tests: Added dedicated Entry Teaser widget tests and extended public renderer assertions.
- Docs/Tasks: Marked `TASK-050-14-02` and pack `TASK-050-14` as done.
