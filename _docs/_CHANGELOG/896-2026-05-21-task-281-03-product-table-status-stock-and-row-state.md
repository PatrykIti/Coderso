# 896. TASK-281-03 product table status stock and row state

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-281, TASK-281-03

## Key Changes

### Product Table status and stock presentation

- Product Table now renders fixed Published, Draft, and Archived badges instead of raw status enums.
- Draft and archived rows now use bounded row-state treatment, and Product titles stop duplicating `(draft)` / `(archived)` when a dedicated Status column is already visible.
- Stock copy now supports an optional `showStockQuantity` field, exposed through a gated Visual editor control that only appears while the Stock column is enabled.

### Validation and docs sync

- Added SSR and happy-dom regression coverage for status badges, row-state treatment, title suffix policy, and the gated stock quantity control.
- Updated the Product Table widget docs, TASK-281-03 leaf, TASK-281 family tracker, task board, and Playwright report notes to reflect the shipped status/stock closure.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
