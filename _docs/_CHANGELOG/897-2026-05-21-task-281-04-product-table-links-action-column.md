# 897. TASK-281-04 product table links and action column

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-281, TASK-281-04

## Key Changes

### Product Table safe navigation

- Product Table now resolves public product detail hrefs through the shared commerce content-route map and stores only safe relative `productHref` values in resolved runtime rows.
- Visual mode now lets authors link either the Product or Slug column, keep links disabled entirely, and choose whether links open in a new tab through the shared safe-href contract.
- Rows with missing or unsafe URLs stay plain text, and interactive rows get only a bounded hover cue when a real link or action exists.

### Action column and docs sync

- Added an optional Action column with a bounded label default (`View`) and shared target/rel handling for new-tab links.
- Added focused runtime, renderer, validator, and editor-wave coverage for safe href fallback, link column normalization, new-tab rel policy, and product href hydration.
- Updated the Product Table widget docs, TASK-281 family tracker, task board, and Playwright report to mark `UX-03` and `BF-11` fixed while leaving broader row-hover styling to `TASK-281-08`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`
