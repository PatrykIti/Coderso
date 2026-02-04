# 155-2026-02-04 - Hero widget expansion

Date: 2026-02-04
Version: Unreleased
Tasks: TASK-050-05

## Summary
- Expanded Hero widget data model, editors, and rendering with slot support.

## Key Changes
- CMS/Widgets: Hero schema now covers layout, spacing, background, and responsive fields.
- Admin/UI: Hero wizard/visual/advanced editors expanded to match v1 spec.
- CMS/Widgets: Hero renders `slots.content` under CTA and supports media variants.
- Admin/UI: Hero media now supports library selection with fallback URL input.
- Tests: added hero schema + slot rendering coverage.
