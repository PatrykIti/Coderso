# 1146 - TASK-418 per-type page block controls

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-03-L02

## Key Changes

- Added Page owner metadata for block-width, image-fit, gallery-layout, and
  divider-tone option sets plus non-insertable block reasons.
- Added per-type atomic block controls for every owner-insertable Page block and
  registry parity tests for prop paths and owner option arrays.
- Updated PageEditor so selected-block controls render from registry metadata and
  the block inserter derives choices from `pageBlockCapabilities`.
- Added Vitest round-trip coverage for button, image, list, card, statistic,
  quote, divider, and spacer controls.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
