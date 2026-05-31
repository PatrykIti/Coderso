# 902. TASK-281-09 product table export and currency

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-281, TASK-281-09

## Key Changes

### Product Table export and money-format controls

- Product Table now owns explicit `format.moneyLocale` and `format.currencyDisplay` settings, so price and compare-at cells can render locale-aware multi-currency output while preserving the existing default-argument behavior used by other commerce widgets.
- Public Product Table shells can now expose an optional SSR CSV download button for the currently visible rows and columns only, with deterministic filenames derived from the section header when present.
- CSV export is built from the shared visible-column registry, reuses the active Product Table money-format settings, escapes quotes/newlines, and prefixes formula-like values before download.

### Editor and regression coverage

- Visual mode now exposes an `Export and currency` panel with bounded locale/display selects and an optional export label while Advanced mode keeps runtime diagnostics read-only.
- Focused widget, editor, and validator coverage now locks locale-aware rendering, SSR export markup, CSV escaping, and the new schema-owned `format` / `export` blocks.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)
