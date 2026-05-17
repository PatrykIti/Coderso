# TASK-279-01: Product Compare Source Selection and Limit Contract

# FileName: TASK-279-01_Product_Compare_Source_Selection_and_Limit_Contract.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Query + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-252-07-05, TASK-256-07, TASK-279
**Status:** To Do

---

## Overview

Make Product Compare source selection deterministic and align the compare limit
contract across schema, normalizer, editor UI, runtime query input, and tests.

Source report coverage:

- BF-04: no specific product ID selection.
- BF-15: schema max is 12 while `normalizeCommerceWidgetSource` and the editor
  allow 48.
- Playwright section 7.2: limit spinbutton accepts 13 and advertises `max=48`.

## Scope Boundary

In scope:

- Add a Product Compare-owned selected product set, manual order, and fallback
  behavior that can compare exact products.
- Keep `limit` capped to the Product Compare contract everywhere this widget
  owns the value.
- Bridge selected product IDs into commerce runtime resolution without changing
  Product Gallery or Product Table behavior.

Out of scope:

- Broad commerce source helper redesign unless it is backward-compatible and
  covered for all existing callers.
- Client-side provider fetches or admin browser access to provider credentials.
- Arbitrary product query DSL, custom filters, or user-authored object paths.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/services/commerce/commerceTypes.ts`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `core/services/commerce/commerceQueryService.ts`
- `core/server/validation/commerceSchemas.ts` when selected IDs are accepted
  by the admin/runtime commerce query payload.
- `core/server/routes/commerceRoutes.ts` when `/commerce/products/query`
  receives selected IDs for admin preview or picker flows.
- `core/admin/services/commerceClient.ts` when admin query payload typing
  exposes selected IDs.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/unit/commerce/commerceQueryService.test.ts`
- `tests/vitest/validation/commerceSchemas.test.ts` when `commerceQuerySchema`
  accepts selected IDs.
- `tests/integration/routes/commerceRoutes.test.ts` when the admin query route
  accepts selected IDs.
- `tests/unit/widgets/validator.test.ts`

## Implementation Pseudocode

```ts
const PRODUCT_COMPARE_MAX_PRODUCTS = 12;

type ProductCompareSource = CommerceWidgetSource & {
  productIds?: string[];
};

function normalizeProductCompareProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(toText).filter(Boolean))).slice(
    0,
    PRODUCT_COMPARE_MAX_PRODUCTS
  );
}

function normalizeProductCompareData(value: ProductCompareData): ProductCompareData {
  const sharedSource = normalizeCommerceWidgetSource(value.source, {
    limit: productCompareDefaults.source?.limit ?? 3,
    sortField: "title",
    sortDir: "asc",
  });
  const source = {
    ...sharedSource,
    limit: Math.min(sharedSource.limit, PRODUCT_COMPARE_MAX_PRODUCTS),
  };
  const productIds = normalizeProductCompareProductIds(value.source?.productIds);

  return {
    ...base,
    source: {
      ...source,
      productIds,
      limit: Math.min(source.limit, PRODUCT_COMPARE_MAX_PRODUCTS),
    },
  };
}

function buildProductCompareQueryInput(value: ProductCompareData) {
  const normalized = normalizeProductCompareData(value);
  const productIds = normalized.source?.productIds ?? [];
  return {
    ...buildCommerceWidgetQueryInput(normalized.source),
    ...(productIds.length > 0 ? { productIds } : {}),
  };
}

function normalizeCommerceExecutionPlan(input: CommerceQueryInput): CommerceExecutionPlan {
  const productIds = normalizeProductIds(input.productIds);
  return {
    ...existingPlan,
    productIds,
  };
}

function applyProductIdSelection(rows: CommerceProduct[], productIds: string[]) {
  if (productIds.length === 0) return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  return productIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
```

Error handling:

- Invalid product IDs normalize away and never reach runtime query execution.
- If selected IDs are missing or unavailable, runtime returns the available
  rows in deterministic selected order plus a bounded resolved total.
- Do not emit `productIds` or a separate `manualOrderIds` key from
  `buildProductCompareQueryInput` until `CommerceQuery`,
  `CommerceQueryInput`, `commerceQuerySchema`, `executeCommerceQuery`, and the
  `/commerce/products/query` route all accept the field. The selected order is
  the `productIds` array order; do not introduce a second ordering field unless
  the route schema and query service prove why it is necessary.
- If the implementation extends the shared commerce query type, add tests that
  prove Product Gallery and Product Table still use their current query shape.

Regression shape:

- Validator rejects unknown source fields and accepts bounded `productIds`.
- Normalizer clamps Product Compare limit to 12 while other commerce widgets
  keep their current limit behavior.
- Runtime query tests prove selected IDs are filtered before pagination and
  preserve manual order.
- Validation and route tests prove `/commerce/products/query` rejects unknown
  fields but accepts bounded `productIds` only after the route contract is
  intentionally extended.
- Editor wave tests prove the limit input advertises max 12 and cannot produce
  normalized values above 12.

## Security Contract

This leaf does not introduce public writes.

- Endpoint visibility: unchanged public read-only runtime rendering and
  internal admin editing. If existing admin product search APIs are reused, keep
  their current visibility.
- Auth/RBAC/CSRF: unchanged for page/template widget persistence. Any admin
  product picker call must require authenticated admin access.
- Rate-limit bucket: unchanged unless an admin product search endpoint is
  introduced; then use an internal admin read/search bucket.
- Reject-unknown validation: `productIds` and any source additions must be in
  `productCompareSchema` with `additionalProperties: false`.
- Anti-abuse: clamp product ID count, trim/dedupe strings, keep search bounded,
  and do not let widget JSON carry raw SQL/query fragments/provider URLs.
- Secret handling: selected IDs are public identifiers only; provider keys and
  private product payloads remain backend-owned.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when product-id
  filtering reaches query execution.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Product Compare can compare an exact bounded selected product set by ID.
- Product Compare limit is 1-12 in schema, normalizer, editor input, query
  builder, and tests.
- Existing Product Gallery/Product Table source behavior is unchanged unless a
  shared helper extension is explicitly tested for all callers.
- Missing or invalid selected IDs fail safely with deterministic empty/partial
  output and no provider details in browser-visible payloads.
