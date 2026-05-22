# 894. TASK-281-01 product table admin preview parity

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-281, TASK-281-01

## Key Changes

### Product Table admin preview parity

- Product Table now hydrates admin preview rows through an internal widget preview route and the shared `WidgetPreviewState` seam instead of leaving the canvas permanently empty until publish.
- Preview requests reuse the existing Product Table commerce query contract, abort superseded requests, ignore stale async responses, and keep the last safe preview payload when a newer request fails.
- Advanced mode runtime diagnostics are now read-only and expose refresh/loading/error state without persisting transient preview rows into saved widget JSON.

### Validation and docs sync

- Added Product Table preview route, preview client, widget/editor regression coverage, and route-registration assertions across Bun and Vitest lanes.
- Updated the Product Table task leaf, family checklist, task board, widget docs, and Playwright report status notes to reflect the shipped admin preview closure.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`
