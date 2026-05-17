# TASK-281-09: Product Table Export Currency and Advanced Diagnostics

# FileName: TASK-281-09_Product_Table_Export_Currency_and_Advanced_Diagnostics.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Admin UI + Diagnostics
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-256-04
**Status:** To Do

---

## Overview

Finalize Product Table data utilities and admin diagnostics that do not belong
to the core column or public query leaves. This leaf covers `UX-07`, `UX-09`,
and `BF-14` from `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: the table has no CSV/clipboard export option, currency formatting
uses `Intl.NumberFormat("en-US", ...)`, and the Advanced editor exposes
`Runtime error flag` as an editable text input even though it is runtime data.

## Scope Boundary

In scope:

- optional CSV/clipboard export for visible table rows;
- locale/currency display policy using schema-owned formatting settings or site
  locale defaults;
- read-only runtime diagnostics in Advanced mode;
- clear distinction between configuration fields and runtime-injected `resolved`
  metadata.

Out of scope:

- exporting hidden/private commerce fields;
- server-side export jobs;
- analytics/reporting downloads;
- editing runtime `resolved.error` or `resolved.items` directly in the widget
  editor.

## Sub-Tasks

- [ ] Replace editable Advanced runtime error input with read-only diagnostics.
- [ ] Add schema-owned currency/locale formatting settings or site-locale
  fallback behavior.
- [ ] Add optional CSV/clipboard export for visible public table cells only.
- [ ] Escape export values and omit hidden/private commerce fields.
- [ ] Add renderer/editor/security tests for diagnostics, money formatting, and
  export behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add export/format settings and a pure visible-row serialization helper if export is runtime-rendered. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Replace editable `Runtime error flag` with read-only diagnostics and add export/currency controls if they are admin-configurable. |
| `core/widgets/core/commerceWidgetShared.ts` | Adjust money formatting only if Product Table cannot own locale policy locally. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert locale/currency formatting, export data restrictions, and read-only diagnostics model. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert Advanced runtime error is read-only and export/currency controls normalize correctly. |

## Implementation Pseudocode

Currency format:

```ts
type ProductTableMoneyFormat = {
  locale?: "site" | "en-US" | "pl-PL" | "de-DE";
  currencyDisplay?: "symbol" | "code" | "name";
};

function formatProductTableMoney(amount: number, currency: string, settings: ProductTableMoneyFormat) {
  const locale = resolveSiteOrExplicitLocale(settings.locale);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: settings.currencyDisplay ?? "symbol",
  }).format(amount);
}
```

Export serialization:

```ts
function buildProductTableCsvRows(data: ProductTableData) {
  const columns = getVisibleProductTableColumns(normalizeProductTableData(data));
  return data.resolved?.items?.map((item) =>
    columns.map((column) => serializeProductTableCell(column, item))
  ) ?? [];
}
```

Advanced diagnostics:

```tsx
<div aria-label="Runtime error flag" data-readonly="true">
  {normalized.resolved?.error ?? "No runtime error"}
</div>
```

Error handling:

- Clipboard export should fail visibly without throwing if browser clipboard API
  is unavailable.
- CSV values must be escaped and limited to visible columns.
- Invalid locale/currency options normalize to current defaults.
- Runtime error metadata is display-only and cannot be persisted by editing a
  text field.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: export/format fields must be schema-owned and
  reject unknown values.
- Anti-abuse: CSV/clipboard export only serializes already visible public table
  cells and escapes formula-like cell prefixes if needed.
- Secret handling: export must not include hidden product metadata, private
  media URLs, runtime debug objects, provider keys, or admin-only fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Security-focused export assertions if CSV/clipboard behavior is added.

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with export, currency formatting, and
  Advanced diagnostics behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-07/UX-09/BF-14
  evidence after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Advanced mode no longer lets editors mutate runtime-only error metadata.
- Currency display is deterministic and compatible with existing money data.
- Optional export uses visible public table cells only and escapes data safely.
- Editor and renderer tests prove diagnostics/export/format settings stay in
  sync.
