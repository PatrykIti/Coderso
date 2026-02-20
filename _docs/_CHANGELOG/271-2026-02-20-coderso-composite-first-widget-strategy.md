# 271 - Coderso Composite-First Widget Strategy

- **Date:** 2026-02-20
- **Version:** 0.1.271
- **Tasks:** TASK-054-14, TASK-054-14-01, TASK-054-14-02, TASK-054-14-03, TASK-054-14-04

## Key Changes

### Widget Metadata Contract
- Extended widget contract with composite-first metadata:
  - `complexity`, `audience`, `module`, `presets`, `requires`.
- Added registry-level metadata normalization and validation with deterministic fallback for legacy definitions.
- Added explicit metadata map for core widgets.

### Catalog and Admin Client Contract
- Extended `GET /admin/api/widgets` catalog payload with composite metadata.
- Updated admin widgets client contract and cache hydration for the extended shape.

### Widget Library UX (Progressive Disclosure)
- Changed default library flow to `Recommended` (composite-first).
- Added `All widgets` tab and `Advanced mode` toggle.
- Added module/complexity filtering and metadata badges/details in card and drawer.

### QA and Documentation
- Updated tests for registry, catalog/client payloads, and widget library filters/modes.
- Added and synchronized docs:
  - `_docs/WIDGETS_COMPOSITE_STRATEGY.md`
  - `_docs/CMS_API.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/CODERSO_MODULES.md`
  - `_docs/README.md`
  - `_docs/_TASKS/README.md`
