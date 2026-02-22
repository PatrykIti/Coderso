# 309 - TASK-061-05 Image Wrap Controls and Layout Semantics

- **Date:** 2026-02-22
- **Version:** 0.1.309
- **Tasks:** TASK-061, TASK-061-05

## Key Changes

### Shared Image Layout Contract
- Added `postImageWrapLayout` helpers with deterministic normalization:
  - `wrap`: `none | left | right`,
  - `widthPercent`: `25 | 33 | 50 | 66 | 100`,
  - `marginPreset`: `sm | md | lg`.
- Added shared runtime class builder used by editor canvas and public runtime renderer.

### Editor Controls and Data Flow
- Extended image controls in post editor:
  - inspector controls: `Text wrap`, `Image width`, `Image spacing`,
  - rich-text selected-image controls for inline `img` nodes.
- Image attrs are now preserved through sanitize/normalize flow:
  - `data-wrap`, `data-width`, `data-margin`,
  - block image attrs: `wrap`, `widthPercent`, `marginPreset`.

### Runtime and CSS Parity
- Runtime mapper/renderer now emits image wrap layout contract.
- Added post content CSS layer (`core/site/styles/post-content.css`) covering:
  - inline rich-text image float semantics,
  - block image class semantics,
  - mobile fallback forcing stacked full-width layout.
- Added matching admin editor CSS hooks for consistent preview in writing canvas.

### Tests and Validation
- Added tests:
  - `tests/unit/posts/post-image-wrap-layout.test.ts`,
  - `tests/integration/runtime/post-writing-canvas-wrap.test.tsx`.
- Extended existing coverage:
  - `tests/unit/posts/post-richtext-serializer.test.ts`,
  - `tests/integration/ui/post-editor-paste-image.test.tsx`,
  - `tests/integration/ui/post-block-inspector.test.tsx`.
- Full validation run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test` (`1381 pass`, `149 skip`, `0 fail`).

## Result
- Post writing canvas and public runtime now support Word-like image wrap semantics with stable normalization and mobile-safe behavior.
