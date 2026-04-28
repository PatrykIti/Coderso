# 185-2026-02-09 - Repeatable slots core

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-01, TASK-050-15, TASK-050

## Summary
- Added repeatable slot infrastructure for layout widgets with deterministic slot-instance IDs and insertion/runtime normalization.

## Key Changes
- CMS/Widgets: Extended slot definition contract with `kind`, `minItems`, and repeatable validation rules.
- CMS/Widgets: Added shared slot helpers (`fixed` vs `repeatable`, slot id parsing/building, instance resolution).
- CMS/Widgets: Updated block normalization to create required repeatable instances, migrate legacy slot keys, and enforce repeatable limits.
- Admin/UI: Updated slot option resolution and insertion flow to target repeatable slot instances.
- Admin/UI: Updated builder slot rendering (`BlockList`, `BlockSettings`) to show resolved repeatable slot targets.
- Admin/UI: Added repeatable slot instance helpers in builder block utils (`addRepeatableSlotInstance`, `removeRepeatableSlotInstance`).
- Tests: Added and extended unit tests for registry validation, widget normalization, slot option resolution, and block utils repeatable flow.
- Docs/Tasks: Marked `TASK-050-15-01` done and moved `TASK-050-15` to in-progress.
