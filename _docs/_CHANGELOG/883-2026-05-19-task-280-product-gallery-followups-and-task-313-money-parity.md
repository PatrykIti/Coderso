# 883 - TASK-280 Product Gallery follow-ups and TASK-313 money parity

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-280, TASK-280-01, TASK-280-02, TASK-280-03, TASK-280-04, TASK-280-05, TASK-280-06, TASK-280-07, TASK-280-08, TASK-313

## Key Changes

### CMS Widgets and Runtime

- Expanded Product Gallery into a complete commerce widget surface: cards now
  render backend-resolved media, safe relative product links, bounded CTA
  styles, compact/minimal presentation differences, section header metadata,
  compare-at guards, and block-local accessible card naming.
- Added Product Gallery-local source improvements without widening the shared
  commerce picker contract: bounded minor-unit price filters, manual curated
  product ordering, and a view-all navigation path instead of a broader
  load-more/public query surface.

### Admin UI and QA

- Wired Product Gallery into the shared widget preview-state pipeline with a
  dedicated admin preview route, bounded Advanced-mode refresh behavior, and
  explicit loading/empty/stale/ready/error status cues for inline canvas
  verification.
- Kept preview ownership explicit in widget definitions so Page Editor and
  Widget Template Editor no longer rely on hardcoded preview-capable widget
  lists for Product Gallery and Entry Teaser.
- Added focused coverage for Product Gallery runtime output, editor waves,
  admin preview state, preview route/client behavior, shared preview-capability
  helpers, validator acceptance, and the cross-widget commerce runtime seam.

### Shared Commerce Contract and Docs

- Split the shared money-formatting drift out of the widget-only family as
  `TASK-313` and aligned `formatCommerceMoney()` with the commerce admin
  minor-unit contract for Product Gallery, Product Compare, and Product Table.
- Synchronized the Product Gallery Playwright report, widget doc, task-family
  docs, task board, and changelog so every reported finding now maps to a
  shipped Product Gallery leaf or the shared TASK-313 closure.

### Validation

- Green focused validation on 2026-05-19:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-gallery-admin-preview.test.tsx tests/vitest/admin/productGalleryPreviewClient.test.ts tests/vitest/ui/widget-preview-state-support.test.ts tests/vitest/widgets/productCompare.test.tsx tests/vitest/widgets/productTable.test.tsx`
  - `bun test tests/integration/routes/productGalleryPreview.test.ts tests/integration/routes/widgets.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts tests/unit/widgets/validator.test.ts`
- Repo-wide `bun run lint` / `bun run test:vitest` attempts were started, but
  the final closeout used the focused Product Gallery lanes above after the
  user approved a scoped finish because the shared environment was under heavy
  parallel-agent / test-DB contention.
