# 1145 - TASK-418 Universal Page Control Registry

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-03-L01

## Key Changes

### Pages Contract
- Exported Page owner option arrays from `pageDocumentV2` for editor
  select/segmented controls.
- Added `pageSectionCapabilities` so every section type has insertability
  metadata or an explicit non-insertable reason.
- Added `pageEditorControlRegistry` with universal section/block controls,
  schema-owned array paths, responsive override paths, and capability-gated
  lookup.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts`
  - Passed: 17 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.

## Notes

- `TASK-418-03` is now in progress. Per-type block controls, responsive override
  indicators, and toolbar shortcuts remain open under later leaves.
