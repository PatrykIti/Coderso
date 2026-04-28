# 173-2026-02-08 - Feature grid widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-12-01, TASK-050-12, TASK-050

## Summary
- Added the new `feature-grid` core widget with deterministic rendering and full editor-mode coverage (Wizard, Visual, Advanced).

## Key Changes
- CMS/Widgets: Implemented `feature-grid` model, schema validation, defaults, normalization helpers, and renderer variants (`cards-3`, `cards-4`, `highlight-first`).
- CMS/Widgets: Added runtime output markers (`data-feature-grid-*`) for stable preview/runtime assertions.
- Admin/UI: Added `FeatureGridEditors` with mode boundaries: Wizard for quick setup, Visual as primary section-based editor, Advanced for technical tokens and normalization controls.
- Admin/UI: Registered Feature Grid in widget registry and core/runtime widget registration pipeline so it appears in editor and runtime preview.
- Tests: Added dedicated widget tests and extended renderer/template-editor regression coverage.
- Docs/Tasks: Marked `TASK-050-12-01` as done and updated task board counters/status placement.
