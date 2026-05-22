# 903. TASK-281 product table widget closure

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-281, TASK-281-10

## Key Changes

### Product Table closure evidence

- The Product Table Playwright report now includes the missing `TASK-281-09` export/currency evidence, a full closure matrix for every historical bug/UX/accessibility finding, and explicit no-action rows for the snapshot items that were already working.
- The Product Table widget docs now match the shipped contract for compact/default variants, public controls, export filename fallback, stock-quantity normalization, and current editor/runtime ownership.
- The closure pass also aligned the preview-route expectation with the current `resolved.runtime` payload and tightened report wording so the shipped contract is no longer described as a pre-closure snapshot.

### Final hardening and regression coverage

- Product Table normalization now drops stale imported `showStockQuantity` state whenever the Stock column is disabled, matching the existing editor behavior and preventing hidden quantity drift from surviving runtime normalization.
- Focused Product Table coverage now locks indicator-only sort badges, `load-more` pagination links, hidden-export conditions, eyebrow-based CSV filename fallback, and additional nested reject-unknown schema branches for `controls`, `format`, `links`, `header`, `labels`, and resolved `media`.
- The final board/changelog closure also removed the stale duplicate `TASK-281-08` To Do row and moved `TASK-281` plus `TASK-281-10` to Done with the final family validation evidence.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)
- `bun run precommit`
- `git diff --check`
