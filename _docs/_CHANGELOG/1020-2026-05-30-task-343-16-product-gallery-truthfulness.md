# 1020 - TASK-343-16 Product Gallery truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-16, TASK-343

## Key Changes

### Widgets / Runtime

- Added Product Gallery section accessible naming with title-based
  `aria-labelledby` and a fallback `aria-label`.
- Added route, CTA, and view-all state helpers plus deterministic
  `data-product-gallery-*` markers for missing product routes and hidden
  view-all links.
- Normalized legacy `fields.showMediaHint` out of owned widget data while
  keeping schema compatibility for saved payloads.

### Admin UI

- Hydrated Product Gallery previews from Wizard and Visual on first load
  instead of requiring an Advanced detour.
- Kept source and curation edits stale until an explicit `Refresh products`
  action, with daily-mode preview summary and refresh ownership.
- Surfaced missing product-route guidance and view-all disappearance reasons in
  Visual and Advanced diagnostics.

### QA / Docs

- Added Product Gallery renderer and editor regression coverage for preview
  hydration, stale-source refresh, accessible naming, route/CTA guidance,
  view-all hidden states, and legacy media-hint normalization.
- Updated Product Gallery widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-admin-preview.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-16
  drift review)
