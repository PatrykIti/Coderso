# 186-2026-02-09 - Section layout widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-02, TASK-050-15, TASK-050

## Summary
- Added the new `section` layout widget with semantic wrapper controls, repeatable region slots, and full Wizard/Visual/Advanced editor coverage.

## Key Changes
- CMS/Widgets: Introduced `section` widget definition (`default`/`contained`/`bleed`) with deterministic runtime markers and region rendering.
- CMS/Widgets: Added repeatable `region` slot contract (`minItems: 1`, `maxItems: 8`) and slot target rendering via shared slot helpers.
- Admin/UI: Added Section editors with section-based Visual IA and technical-only Advanced mode.
- Admin/UI: Extended block settings with repeatable slot instance add/remove controls used by Section regions.
- Runtime: Registered `section` in core/runtime widget maps to keep admin and preview parity.
- Tests: Added unit coverage for Section schema/defaults/renderer/editors and expanded renderer/template-editor/block-settings assertions.
- Docs/Tasks: Marked `TASK-050-15-02` done, updated task board progress, and documented Section widget spec.
