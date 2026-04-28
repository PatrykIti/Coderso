# 154-2026-02-04 - Widget slots core

Date: 2026-02-04
Version: Unreleased
Tasks: TASK-050-04

## Summary
- Introduced slot-based nesting for widgets with legacy children compatibility.

## Key Changes
- CMS/Widgets: added slot definitions and slot data normalization with legacy mapping.
- Admin/UI: block list and insert dialog now handle slot-based nesting.
- Tests: updated builder, insert utils, and renderer/validator coverage for slots.
