# 166-2026-02-07 - Timeline widget visual rebuild and advanced cleanup

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-08-02, TASK-050-08

## Summary
- Finalized Timeline editing architecture with Visual-first sections, widget-owned variant controls, and technical-only Advanced scope.

## Key Changes
- CMS/Widgets: Timeline definition now declares `editorCapabilities.visualOwnsVariantSelection = true`, so generic Visual variant controls are hidden.
- Admin/UI: Timeline Visual editor rebuilt into section-based IA:
  - Variant and timeline structure
  - Steps content and order
  - Guides and axis line
  - Markers and accents
  - Colors and background
  - Typography and spacing
- Admin/UI: Timeline Visual now supports step ordering (up/down), step add/remove in Visual, and per-step accent controls.
- CMS/Widgets: Timeline model and renderer extended with typography tokens (`style.titleSize`, `style.descriptionSize`) and corresponding runtime mapping.
- Admin/UI: Timeline Advanced reduced to technical-only controls (layout tokens + payload normalization), without day-to-day content/style editing.
- Tests: expanded Timeline, VisualPanel, and template editor coverage for variant ownership and updated Visual/Advanced IA boundaries.
