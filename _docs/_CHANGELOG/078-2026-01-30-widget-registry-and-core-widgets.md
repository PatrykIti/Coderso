# 078 - Widget registry and core widgets

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-009, TASK-009-01, TASK-009-02, TASK-009-03, TASK-009-04, TASK-009-05, TASK-009-06, TASK-009-07, TASK-009-08, TASK-009-09, TASK-009-10, TASK-009-11

## Key Changes

### Core/Widgets
- Added widget registry and schema validation pipeline with AJV-backed defaults + variant enforcement.
- Implemented core widgets (Hero, Timeline, Compare Timeline, Newsletter, Contact, Navigation, Footer) with schemas, defaults, and renderers.
- Added widget renderer pipeline with layout/visibility support and missing/invalid widget fallbacks.

### Admin/UI
- Added widget editor components for Wizard/Visual/Advanced modes for each core widget.
- Wired Page Builder and Widget Library to the registry with live previews and dynamic editors.

### Tests
- Added unit tests for widget registry, validator, widget renderers, and page builder wiring.

### Docs
- Updated `_docs/WIDGETS.md` to align block schema and widget definition contract with implementation.
