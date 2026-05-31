# TASK-281-03: Product Table Status Stock and Row State Presentation

# FileName: TASK-281-03_Product_Table_Status_Stock_and_Row_State_Presentation.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-256-02
**Status:** Done (2026-05-21)

---

## Overview

Improve Product Table row-state rendering for commerce status and stock data.
This leaf covers `BUG-02`, `BUG-03`, `BF-03`, and `BF-04` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: status renders as raw text, non-published status is duplicated in
the title suffix, and stock quantity/in-stock flags are normalized but ignored
by the renderer.

## Scope Boundary

In scope:

- status badge rendering for `published`, `draft`, and `archived`;
- a deterministic rule for when the title suffix is removed because the status
  column is visible;
- optional stock quantity display inside the stock column;
- bounded row-state styling for draft/archived rows;
- editor controls only where the product owner should choose presentation.

Out of scope:

- public product links or action columns;
- public search/filter/sort behavior;
- arbitrary per-row colors, raw classes, or custom HTML.

## Sub-Tasks

- [x] Add bounded status badge rendering for published, draft, and archived
  products.
- [x] Remove title status suffix duplication when the status column is visible.
- [x] Add optional stock quantity display using normalized stock data.
- [x] Add bounded row-state treatment for draft/archived rows.
- [x] Add renderer/editor tests for status, stock, and row-state behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add status badge maps, stock quantity rendering, row-state classes/styles, and normalization fields if options are configurable. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add controls for stock quantity/status presentation only if the renderer exposes options. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert status badge markup, title suffix policy, row-state classes, and stock quantity output. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Cover new controls and normalized payloads if controls are added. |

## Implementation Pseudocode

Status presentation:

```ts
const statusToneClassMap: Record<CommerceWidgetRuntimeCard["status"], string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

function renderProductTitle(item: CommerceWidgetRuntimeCard, showStatusColumn: boolean) {
  if (showStatusColumn) return item.title;
  return titleWithStatus(item.title, item.status);
}
```

Stock copy:

```ts
function formatStockCell(stock: CommerceWidgetRuntimeCard["stock"], showQuantity: boolean) {
  const label = commerceStockLabelMap[stock.state];
  if (!showQuantity || typeof stock.quantity !== "number") return label;
  return `${label} (${stock.quantity})`;
}
```

Error handling:

- Unknown stock states continue to normalize through existing shared commerce
  card logic.
- Negative, null, and NaN quantities remain normalized away before render.
- Row-state styling uses fixed maps and never serializes arbitrary classes.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add any new presentation fields to
  `productTableSchema`.
- Anti-abuse: status labels and stock output remain plain text from normalized
  enum/number values.
- Secret handling: no secret or privileged data in row-state fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with status badge, stock quantity,
  and row-state presentation behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` with `BUG-02`,
  `BUG-03`, `BF-03`, and `BF-04` evidence after implementation.
- Keep `_docs/_TASKS/README.md` synchronized with the leaf status transition.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Status values render as accessible badges, not raw enum text.
- Product title does not duplicate draft/archived status when a status column is
  visible.
- Stock quantity can be shown without weakening the existing stock-state label.
- Draft/archived row treatment is bounded, readable, and covered by SSR tests.


## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Closure Notes

- Product Table now renders fixed Published/Draft/Archived badges instead of raw
  status enums, and draft/archived rows use bounded tone treatment through one
  local status map.
- Title suffixes now stay only when the Status column is hidden, which removes
  the duplicated `(draft)` / `(archived)` copy from rows that already show a
  dedicated status badge.
- Visual mode now exposes a truthful `showStockQuantity` toggle only while the
  Stock column is visible, clears the flag when Stock is turned off, and the
  renderer appends normalized quantities without weakening the existing
  stock-state label.
