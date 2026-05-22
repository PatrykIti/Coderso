# 901. TASK-281-08 product table layout variants and sticky header

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-281, TASK-281-08

## Key Changes

### Product Table layout presets and bounded style tokens

- Product Table now ships a `compact` block variant plus bounded `style` controls for row density, row treatment, hover rows, sticky header, max width, alignment, and typography instead of hardcoded table spacing and sizing.
- Renderer layout now uses centralized class maps and deterministic data markers so striped rows, centered/narrow shells, and sticky headers stay predictable without raw class input.

### Editor and regression coverage

- Visual mode now exposes the new layout/style panel and keeps variant selection separate from the bounded style overrides so presets and explicit tokens compose cleanly.
- SSR, editor, validator, and registry coverage now lock the compact variant, style-token normalization, authored-cleared surface behavior, and sticky-header markup without regressing existing preview, link, or public-controls seams.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`
