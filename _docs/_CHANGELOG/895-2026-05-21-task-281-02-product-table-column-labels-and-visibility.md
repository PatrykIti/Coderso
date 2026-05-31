# 895. TASK-281-02 product table column labels and visibility

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-281, TASK-281-02

## Key Changes

### Product Table column contract

- Product Table now owns a shared `productTableColumns` registry that drives renderer headers, row cells, Visual editor toggles, and label inputs from one normalized source of truth.
- `showTitle` and `showPrice` are now schema-owned visibility flags with guardrails: Product restores when Slug is also hidden, and Price restores when Compare at is also hidden.
- Visual mode now exposes every schema-owned header label input: `title`, `slug`, `price`, `compareAt`, `status`, `stock`, and `collections`.

### Validation and docs sync

- Added renderer and editor regression coverage for the shared registry, legacy default behavior, and the paired-column guardrails.
- Updated the Product Table widget docs, TASK-281-02 leaf, TASK-281 family tracker, task board, and Playwright report notes to reflect the shipped label/visibility closure and the BF-02/BF-13 mapping cleanup.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`
