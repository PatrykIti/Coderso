# TASK-252-07-05: Product Compare Selected Products Attributes and Highlight

# FileName: TASK-252-07-05_Product_Compare_Selected_Products_Attributes_and_Highlight.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Make product-compare editor own selected products, attribute rows, and highlighted product first; sticky/pinned behavior stays Adapt-only while generic editable tables remain rejected.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/product-compare/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/product-compare/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/product-compare/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/product-compare/MATRIX.md`; for this leaf, start from the current owner fields `source`, `fields`, `labels`, `emptyState`, `style`, `resolved` and add only the schema fields that the matrix explicitly keeps.
- Keep: selected product set, attribute rows, and highlighted product from `_docs/_WIDGETS/tmp/product-compare/MATRIX.md`; add schema-owned highlight product fallback in `core/widgets/core/productCompare.tsx`.
- Adapt: sticky headers/pinned first column remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `product-compare`.
- `Visual`: `Products`, `Attributes`, `Highlight`, `Empty state`.
- `Advanced`: `Commerce diagnostics`, `Attribute mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceTypes.ts` only if `productIds` becomes a
  general commerce query contract.
- `core/services/commerce/commerceQueryService.ts`
- `core/server/validation/commerceSchemas.ts` only if `productIds` becomes
  admin/API query input rather than runtime-widget-only input.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/unit/commerce/commerceQueryService.test.ts`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/_WIDGETS/tmp/product-compare/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-05_Product_Compare_Selected_Products_Attributes_and_Highlight.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type ProductCompareAttributeRow = {
  key: "price" | "compareAt" | "stock" | "quantity" | "slug";
  label: string;
  visible: boolean;
};

type CommerceWidgetQueryInput = {
  pagination: { limit: number; offset: number };
  sort: Array<{ field: string; dir: "asc" | "desc" }>;
  search?: string;
  collectionIds?: string[];
  status?: string[];
  productIds?: string[];
  manualOrderIds?: string[];
};

type CommerceWidgetQueryOptions = {
  manualOrderIds?: string[];
};

function buildCommerceWidgetQueryInput(
  source: CommerceWidgetSource,
  options: CommerceWidgetQueryOptions = {}
): CommerceWidgetQueryInput {
  const normalized = normalizeCommerceWidgetSource(source, {
    limit: productCompareDefaults.source?.limit ?? 4,
    sortField: "updatedAt",
    sortDir: "desc",
  });
  return {
    ...normalizedSourceToQueryInput(normalized),
    productIds: normalizeCommerceWidgetProductIds(normalized.productIds),
    manualOrderIds: normalizeCommerceWidgetProductIds(options.manualOrderIds),
  };
}

function normalizeProductCompareData(data: ProductCompareData): ProductCompareData {
  const selectedProductIds = normalizeProductCompareSelectedProductIds(data.selectedProductIds);

  return {
    source: normalizeProductCompareSource(data.source),
    selectedProductIds,
    attributeRows: normalizeProductCompareAttributeRows(data.attributeRows),
    highlightProductId: normalizeProductCompareHighlightProductId(
      data.highlightProductId,
      selectedProductIds
    ),
    fields: normalizeProductCompareFields(data.fields),
    labels: normalizeProductCompareLabels(data.labels),
    emptyState: normalizeProductCompareEmptyState(data.emptyState),
    style: normalizeProductCompareStyle(data.style),
    resolved: normalizeProductCompareResolved(data.resolved),
  };
}

function buildProductCompareQueryInput(data: ProductCompareData): CommerceWidgetQueryInput {
  const selectedProductIds = normalizeProductCompareSelectedProductIds(data.selectedProductIds);
  return buildCommerceWidgetQueryInput(
    {
      ...data.source,
      productIds: selectedProductIds,
      limit: selectedProductIds.length || data.source?.limit,
    },
    { manualOrderIds: selectedProductIds }
  );
}

async function resolveProductCompareRows(data: ProductCompareData, deps: CommerceWidgetRuntimeDeps) {
  const query = buildProductCompareQueryInput(data);
  const result = await deps.executeCommerceQuery(query);
  return applyManualProductOrder(result.rows, query.manualOrderIds ?? []);
}

function ProductCompareVisualEditor(props: WidgetEditorProps<ProductCompareData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="product-compare.source" title="Compare source">
      <WidgetControlRow id="product-compare.selectedProductIds" label="Products" data-widget-control="product-compare.selectedProductIds">
        <ProductMultiSelect value={value.selectedProductIds ?? []} maxItems={4} onChange={(selectedProductIds) => props.onChange(updateProductCompareProducts(value, selectedProductIds))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-compare.highlightProductId" label="Highlight" data-widget-control="product-compare.highlightProductId">
        <Select value={value.highlightProductId ?? ""} onChange={(highlightProductId) => props.onChange(updateProductCompareHighlight(value, highlightProductId))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-compare.attributeRows" label="Attributes" data-widget-control="product-compare.attributeRows">
        <AttributeRowPicker value={value.attributeRows ?? []} allowedKeys={PRODUCT_COMPARE_ATTRIBUTE_KEYS} onChange={(attributeRows) => props.onChange(updateProductCompareAttributeRows(value, attributeRows))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/product-compare/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/productCompare.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add explicit schema/default ownership for bounded `selectedProductIds`,
  normalized `attributeRows` with known keys/labels, and `highlightProductId`
  with fallback to the first selected product; keep source filters as legacy or
  backend query support, not a replacement for manual selected-product scope.
- Extend the shared commerce query/source owner so selected product IDs resolve
  through backend-owned product lookup and preserve manual order; cover that in
  `tests/unit/commerce/commerceWidgetRuntime.test.ts`.
- Extend `CommerceWidgetSource`, `NormalizedCommerceWidgetSource`, and the
  shared query-input builder in `core/widgets/core/commerceWidgetShared.ts`
  with bounded `productIds`, then map them into
  `core/services/commerce/commerceQueryService.ts` as an allowlisted product-id
  filter. `commerceWidgetRuntime.ts` must use the shared builder and apply
  `manualOrderIds` after query execution; the editor must not synthesize rows
  client-side.
- Treat `productIds` as runtime-widget-only query input unless the
  implementation intentionally promotes it into the public/admin commerce query
  contract. If promoted, update `core/services/commerce/commerceTypes.ts`,
  `core/server/validation/commerceSchemas.ts`, route validation, and API tests
  in the same change; otherwise keep `productIds` out of admin/API schemas and
  cover the runtime-widget bridge only.
- Add query-service coverage for product-id filtering and runtime coverage for
  selected-product manual ordering plus empty/missing selected products.
- Refactor `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `product-compare` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `product-compare` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/productCompare.tsx`.
- Anti-abuse:
  - product data must resolve through existing commerce backend owners
  - attribute keys must be known/clamped, not arbitrary object paths

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-05_Product_Compare_Selected_Products_Attributes_and_Highlight.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `product-compare` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
