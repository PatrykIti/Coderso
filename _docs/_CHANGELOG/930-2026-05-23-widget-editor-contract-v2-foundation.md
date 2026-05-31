# 930. Widget editor contract v2 foundation

- **Date:** 2026-05-23
- **Version:** Unreleased
- **Tasks:** TASK-336-01

## Key Changes

### Shared widget contract
- `WidgetDefinition` now accepts optional `editorContract.version = 2` metadata that describes wizard, visual, and advanced sections separately from the editor render callbacks.
- Added pure validator rules for required modes, stable section ids, known roles, safe paths, single writable ownership, temporary duplicate allowances, readonly advanced diagnostics, and wizard style ownership drift.

### Registry diagnostics
- Widget registration now records editor contract diagnostics without blocking the current migration.
- Added strict registry validation helpers so later TASK-336 closure can require contracts for all migrated widgets.

### QA and documentation
- Added focused Vitest coverage for the validator and registry diagnostics.
- Documented the relationship between editor callbacks and the declarative contract in the widget spec.
