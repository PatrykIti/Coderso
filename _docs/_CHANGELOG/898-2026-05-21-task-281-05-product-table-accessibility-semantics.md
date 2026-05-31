# 898. TASK-281-05 product table accessibility semantics

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-281, TASK-281-05

## Key Changes

### Product Table accessibility semantics

- Product Table now renders a deterministic sr-only `Product table` caption, applies `scope="col"` to every current header including Action, and keeps native table semantics instead of adding a redundant wrapper `role="table"`.
- The widget section and scroll region now expose deterministic accessible labels, while visible section header fields remain deferred to `TASK-281-06`.
- Commerce runtime warnings now announce through `role="alert"`, preview refresh banners announce through `role="status"`, and the existing editor-preview empty-state live region is now locked by focused SSR coverage.

### Ownership and docs sync

- A3 ownership is synchronized back to `TASK-281-03`, which already removed duplicated title/status copy; `TASK-281-05` keeps that baseline under regression coverage without reopening section-header scope.
- Updated the Product Table widget docs, TASK-281 family tracker, task board, and Playwright report to mark the Product Table table-semantics wave closed.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`
