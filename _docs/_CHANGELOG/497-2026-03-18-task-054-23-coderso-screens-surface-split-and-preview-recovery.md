# 497. TASK-054-23 Coderso screens surface split and preview recovery

**Date:** 2026-03-18  
**Version:** 0.1.0  
**Tasks:** TASK-054-23, TASK-054-23-01, TASK-054-23-02, TASK-054-23-03, TASK-054-23-04, TASK-054-23-05

## Key Changes

### Coderso Screens
- Added derived custom screen capabilities (`collection-only`, `dashboard`, `editor`) and used them to gate the records workflow.
- Replaced confusing custom screen copy with product-level messaging for collection-only shortcuts, read-only dashboards, and editable record screens.
- Builder preview now explains missing content type, missing screen widgets, and collection-only setups instead of falling through to a blank state.

### Widget Surfaces
- Added widget surface scoping to the registry (`page-builder`, `widget-library`, `custom-screen-builder`).
- Delivered a dedicated screen widget pack for admin UI: `screen-record-header`, `screen-field-value`, `screen-field-group`, and `screen-two-column`.
- Hid screen-only widgets from `Coderso/Widgets` and page/template widget flows while keeping explicit shared layout primitives available where needed.

### Validation
- Added targeted Bun and Vitest coverage for widget surface filtering, custom screen capabilities, builder UI, and collection-only record fallback.
