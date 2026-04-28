# 311 - TASK-061-07 Runtime Renderer Parity and Backward Compatibility

- **Date:** 2026-02-23
- **Version:** 0.1.311
- **Tasks:** TASK-061, TASK-061-07

## Key Changes

### Writing-Canvas Runtime Parity
- `postBlockRuntimeMapper` now maps `writing-canvas` nodes directly for runtime output.
- `postBlockRuntimeRenderer` now renders `writing-canvas` nodes (`paragraph`, `heading`, `list`, `quote`, `image`) in public and preview paths.
- Inline writing-canvas images reuse shared wrap contract (`wrap`, `widthPercent`, `marginPreset`) and runtime CSS classes.

### Backward Compatibility Adapter
- Added `adaptLegacyDocumentForRuntime` in `postBlockLegacyAdapter`:
  - converts legacy text blocks into `writing-canvas` segments on read path,
  - keeps unsupported/non-convertible blocks unchanged (non-destructive fallback),
  - does not perform DB migration/write during runtime mapping.

### Runtime Diagnostics
- Runtime mapper now carries `warnings[]` for invalid/dropped runtime nodes.
- Runtime renderer exposes diagnostics in markup via:
  - `data-post-runtime-warning-count`
  - `data-post-runtime-warnings`

### Tests and Validation
- Added:
  - `tests/unit/posts/post-legacy-adapter-writing-canvas.test.ts`
- Extended:
  - `tests/unit/posts/post-block-runtime-renderer.test.tsx`
  - `tests/integration/runtime/post-rendering-parity.test.tsx`
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/posts/post-legacy-adapter-writing-canvas.test.ts tests/unit/posts/post-block-runtime-renderer.test.tsx tests/integration/runtime/post-rendering-parity.test.tsx` (`8 pass`)
  - `bun test` (`1387 pass`, `149 skip`, `0 fail`)

## Result
- Preview and published post runtime now share a writing-canvas-first renderer with safe legacy read compatibility and explicit runtime diagnostics.
