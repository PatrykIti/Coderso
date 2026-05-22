# 900. TASK-281-07 product table public controls

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-281, TASK-281-07

## Key Changes

### Product Table SSR public controls

- Product Table now owns a bounded `controls` contract for public search, collection filters, sort affordances, and paged/load-more navigation, all driven through SSR page query params instead of a second public refresh route.
- Public runtime hydration now derives block-scoped query keys, preserves unrelated page params in Product Table hrefs, emits clear/previous/next metadata, and rejects invalid widget params without mutating persisted widget JSON.

### Published-safe runtime and admin coverage

- Public runtime now keeps Product Table query behavior published-safe even when authored source status filters or visitor params mention draft/archived rows; status params may narrow but never widen frontend visibility.
- Visual mode now exposes the public-controls panel while the Product Table preview/editor/runtime test lanes cover normalized controls, SSR markup, runtime metadata, and end-to-end `handlePublicRequest()` behavior.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`
