# 992 - TASK-342 commerce populated fixture wave

Date: 2026-05-28
Version: Unreleased
Tasks: TASK-342-03, TASK-342-03-01, TASK-342-03-02, TASK-342-03-03

## Key Changes

- Classified the commerce outliers from the 2026-05-27 Playwright wave as
  fixture-data drift instead of widget-local renderer failure.
- Extended the repeatable widget smoke harness so it now bootstraps a
  deterministic commerce fixture dataset when `product-gallery`,
  `product-compare`, or `product-table` are selected.
- Restored populated public proof for:
  - `product-gallery`
  - `product-compare`
  - `product-table`
- No widget-local runtime code changes were needed in the three commerce
  renderers after the shared fixture owner was restored.

## Validation

- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-03-product-gallery --widget product-gallery --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-03-product-gallery.json --output-md .tmp/task-342-03-product-gallery.md --strict`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-03-product-compare --widget product-compare --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-03-product-compare.json --output-md .tmp/task-342-03-product-compare.md --strict`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-03-product-table --widget product-table --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-03-product-table.json --output-md .tmp/task-342-03-product-table.md --strict`
