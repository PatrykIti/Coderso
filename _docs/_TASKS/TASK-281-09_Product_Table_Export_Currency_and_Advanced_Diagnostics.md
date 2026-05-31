# TASK-281-09: Product Table Export Currency and Advanced Diagnostics

# FileName: TASK-281-09_Product_Table_Export_Currency_and_Advanced_Diagnostics.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-07, TASK-281-08
**Status:** Done (2026-05-22)

---

## Overview

Finalize Product Table export and money-format behavior that sits on top of the
current column registry, public query, and layout leaves. This leaf covers the
still-open `UX-07` and `BF-14` findings from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: the table has no CSV export option and currency formatting still
uses the shared `Intl.NumberFormat("en-US", ...)` default. The read-only
runtime preview/diagnostics contract already shipped in `TASK-281-01` and must
stay separated from authored settings while this leaf adds new controls.

## Scope Boundary

In scope:

- optional CSV export for visible table rows using the current public table
  state;
- schema-owned money locale and currency display settings for Product Table;
- preserving the existing read-only runtime diagnostics boundary while adding
  authored controls in Visual mode;
- clear distinction between configuration fields and runtime-injected `resolved`
  metadata.

Out of scope:

- exporting hidden/private commerce fields;
- server-side export jobs;
- analytics/reporting downloads;
- clipboard/client-script export flows that would need shared runtime binding
  helpers;
- site-locale runtime plumbing outside the current Product Table-owned contract;
- editing runtime `resolved.error` or `resolved.items` directly in the widget
  editor.

## Sub-Tasks

- [x] Keep Advanced/runtime diagnostics read-only while adding authored export
  and currency controls in Visual mode.
- [x] Add schema-owned money locale and currency display settings for Product
  Table.
- [x] Add optional CSV export for visible public table cells only.
- [x] Escape export values and omit hidden/private commerce fields.
- [x] Add renderer/editor/security tests for diagnostics, money formatting, and
  export behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add Product Table-owned export/format settings, a pure visible-row serialization helper, and SSR CSV download wiring. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Keep Advanced diagnostics read-only and add Visual-mode export/currency controls. |
| `core/widgets/core/commerceWidgetShared.ts` | Extend the shared money formatter only if Product Table needs a backward-compatible utility seam for explicit `currencyDisplay`. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert locale/currency formatting, export data restrictions, and read-only diagnostics model. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert Advanced runtime error is read-only and export/currency controls normalize correctly. |

## Implementation Pseudocode

Currency/export contract:

```ts
type ProductTableFormat = {
  moneyLocale?: "en-US" | "pl-PL" | "de-DE" | "fr-FR";
  currencyDisplay?: "symbol" | "code" | "name";
};

type ProductTableExport = {
  enabled?: boolean;
  label?: string;
};

function formatProductTableMoney(
  amount: number,
  currency: string,
  settings: ProductTableFormat
) {
  return formatCommerceMoney(
    amount,
    currency,
    settings.moneyLocale ?? "en-US",
    settings.currencyDisplay ?? "symbol"
  );
}
```

Export serialization:

```ts
function buildProductTableCsvContent(data: ProductTableData) {
  const normalized = normalizeProductTableData(data);
  const columns = resolveVisibleProductTableColumns(normalized.fields ?? productTableFieldDefaults);
  const header = columns.map((column) => normalized.labels?.[column.labelKey] ?? column.key);
  const rows =
    normalized.resolved?.items?.map((item) =>
      columns.map((column) =>
        serializeProductTableCsvCell(column, item, {
          format: normalized.format,
          fields: normalized.fields,
        })
      )
    ) ?? [];

  return [header, ...rows].map((row) => row.map(escapeProductTableCsvValue).join(",")).join("\n");
}
```

Advanced diagnostics:

```tsx
<PreviewStatusCard value={normalized} context={context} />
// No authored export/currency control reads from or mutates normalized.resolved.*
```

Error handling:

- CSV values must be escaped, formula-hardened, and limited to visible columns.
- Invalid locale/currency/export options normalize to current Product Table
  defaults.
- Export button is hidden when export is disabled or no rows are currently
  resolved.
- Runtime error metadata stays display-only and cannot be persisted by editing a
  text field or through new authored controls.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: export/format fields must be schema-owned and
  reject unknown values.
- Anti-abuse: CSV export only serializes already visible public table cells,
  escapes formula-like cell prefixes, and stays bounded to the current visible
  page/filter state.
- Secret handling: export must not include hidden product metadata, private
  media URLs, runtime debug objects, provider keys, or admin-only fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Security-focused export assertions for CSV formula escaping and visible-column
  restrictions.

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with export, currency formatting, and
  preserved read-only diagnostics behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-07/BF-14 evidence
  after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Advanced mode still does not let editors mutate runtime-only error metadata.
- Currency display is deterministic and uses Product Table-owned locale/display
  settings without changing other commerce widgets.
- Optional CSV export uses visible public table cells only and escapes data
  safely.
- Editor and renderer tests prove diagnostics/export/format settings stay in
  sync.
