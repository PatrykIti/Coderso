# 899. TASK-281-06 product table media excerpt section header

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-281, TASK-281-06

## Key Changes

### Product Table media and section context

- Product Table now extends the shared column registry with optional Image and Excerpt columns, renders a visible section header, and keeps the legacy default table output unchanged while the new fields stay disabled.
- Public runtime hydration now attaches only public image media to Product Table rows, thumbnails render lazily with safe alt fallback and a `No image` placeholder, and long excerpts clamp in the renderer instead of widening layout or accepting raw HTML.

### Admin preview and closure sync

- Visual mode now exposes Section header controls plus Image/Excerpt toggles and labels while preserving the existing preview-state refresh, safe links, row-state treatment, and read-only runtime diagnostics.
- Updated the Product Table widget docs, the Playwright report, the TASK-281 family tracker, and the task board to mark the media/excerpt/header wave closed on the clean rework branch.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`
