# TASK-279-02: Product Compare Attribute Rows Labels and Formatting

# FileName: TASK-279-02_Product_Compare_Attribute_Rows_Labels_and_Formatting.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-279-01, TASK-279
**Status:** To Do

---

## Overview

Replace Product Compare's hardcoded metric list with a schema-owned attribute
row contract and expose all row labels/editing controls required by the report.

Source report coverage:

- BF-01: price and stock rows cannot be hidden.
- BF-05: product excerpt/description cannot be displayed as a row.
- BF-09: the first column header is hardcoded to `Attribute`.
- BF-11: `formatCommerceMoney` is hardcoded to `en-US`.
- BF-13: stock state labels such as `Backorder` cannot be customized.
- BF-14: quantity display is raw `String(stockQuantity)`.
- UX-01: Visual editor exposes only 3 of 5 labels.

## Scope Boundary

In scope:

- Product Compare-owned attribute row keys, labels, visibility, order, and
  bounded display options.
- Legacy compatibility for the current `fields` and `labels` payload.
- Runtime compare row payload extension only for safe display values such as
  excerpt/description and stock fields.

Out of scope:

- Generic editable table cells or arbitrary product property paths.
- Raw HTML/Markdown attributes.
- A global locale system unless a source-of-truth locale contract already
  exists and is reused.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/unit/widgets/validator.test.ts`

## Implementation Pseudocode

```ts
const PRODUCT_COMPARE_ATTRIBUTE_KEYS = [
  "price",
  "compareAt",
  "stock",
  "quantity",
  "slug",
  "excerpt",
] as const;

type ProductCompareAttributeRow = {
  key: (typeof PRODUCT_COMPARE_ATTRIBUTE_KEYS)[number];
  label: string;
  visible: boolean;
};

type ProductCompareFormatOptions = {
  moneyLocale?: "en-US" | "pl-PL" | "de-DE" | "fr-FR";
  quantityMode?: "exact" | "hidden" | "threshold";
  lowStockThreshold?: number;
  backorderLabel?: string;
  attributeHeaderLabel?: string;
};

function normalizeProductCompareAttributeRows(value: unknown): ProductCompareAttributeRow[] {
  const legacy = rowsFromLegacyFieldsAndLabels(value);
  return dedupeKnownRows(legacy).map((row) => ({
    key: row.key,
    label: text(row.label, defaultLabelFor(row.key)),
    visible: row.visible !== false,
  }));
}

function renderMetric(row: CommerceWidgetRuntimeCompareRow, metric: ProductCompareAttributeRow) {
  switch (metric.key) {
    case "price":
      return formatCommerceMoney(row.priceAmount, row.currency, normalized.format?.moneyLocale);
    case "excerpt":
      return row.excerpt ?? "-";
    case "quantity":
      return formatQuantity(row.stockQuantity, normalized.format);
  }
}
```

Error handling:

- Unknown row keys are dropped during normalization.
- Empty labels fall back to stable defaults.
- Invalid locale/quantity mode falls back to existing behavior.
- Existing payloads using `fields.showCompareAt`, `fields.showStockQuantity`,
  `fields.showSlug`, and `labels.*` still render as they do today.

Regression shape:

- Renderer tests prove price, stock, quantity, slug, and excerpt rows can be
  shown/hidden and ordered only by known keys.
- Editor wave tests prove Visual exposes Quantity and Slug labels plus any new
  attribute-row controls.
- Validator tests prove unknown attribute keys and unknown format options are
  rejected or normalized according to schema.
- Runtime tests prove compare rows can carry excerpt/description safely.

## Security Contract

This leaf does not add routes.

- Endpoint visibility: unchanged public read-only rendering and internal admin
  editing.
- Auth/RBAC/CSRF: unchanged existing page/template/widget save flows.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: attribute rows, format options, and labels must be
  declared in `productCompareSchema` with known keys/enums.
- Anti-abuse: no arbitrary product paths, raw HTML, scriptable format strings,
  unbounded locales, or custom render callbacks in widget JSON.
- Secret handling: runtime row excerpts/descriptions must be public product
  data only.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts` when runtime row
  payload changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Price and stock rows are no longer hardcoded always-visible unless explicitly
  required by a documented fallback mode.
- Visual editing exposes labels for every renderable row, including Quantity
  and Slug.
- Product Compare supports safe excerpt/description, attribute header label,
  stock/backorder label, locale, and quantity display choices through bounded
  schema fields.
- Legacy payloads render without destructive rewrites.
