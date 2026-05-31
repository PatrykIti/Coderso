# 966 - Commerce editor query and color cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Tightened Product Compare and Product Gallery mode ownership: Wizard remains
  source/setup, Visual owns daily product curation, copy, layout, links, and
  swatch-only surfaces, and Advanced is read-only human diagnostics.
- Replaced raw CSS/token color text fields with swatch-only replace-or-clear
  controls and removed seeded CSS-token color defaults from fresh commerce
  widgets.
- Removed raw Advanced query JSON, phantom `runtime.*` editor-contract paths,
  internal sort labels, and Product Gallery raw media-ID preview hints.
- Updated commerce widget docs, task notes, and regression tests to enforce the
  beginner-safe shared `wizard/visual/advanced` contract.

## Validation

- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/commerce-widget-editor-shared.test.tsx tests/vitest/ui/product-gallery-admin-preview.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-product-compare-query-color-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-product-gallery-query-color-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-commerce-query-color-focused-2026-05-26.*`
