# 1016 - TASK-343-23 Gallery Mosaic truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-23, TASK-343

## Key Changes

### Admin UI

- Added shared destructive count-reduction confirmation to both Wizard and
  Visual, with removed tile labels and explicit copy that restored counts create
  placeholders rather than recovering discarded media or copy.
- Added lightbox-mode guidance that admin preview markup is static while
  published pages bind the runtime script.
- Fixed singular link/lightbox warning grammar in Visual and Advanced.

### Widgets / Runtime

- Added accessible section naming for Gallery Mosaic output: visible headings
  now own `aria-labelledby`, and titleless sections fall back to
  `aria-label="Gallery"`.
- Removed duplicated `grid grid-cols-1` classes from `feature-left` density
  containers.
- Added domain helpers for count-reduction summaries and user-facing reduction
  descriptions.

### QA / Docs

- Added Gallery Mosaic regression coverage for section naming, count-reduction
  summaries, Wizard/Visual guarded reductions, lightbox preview messaging, link
  grammar, and feature-left class dedupe.
- Updated Gallery Mosaic widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking, with N3/N8/N9 routed as deferred/product or fixture
  caveats.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-23
  drift review: no blockers)
