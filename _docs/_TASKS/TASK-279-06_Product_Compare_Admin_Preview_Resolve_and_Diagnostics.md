# TASK-279-06: Product Compare Admin Preview Resolve and Diagnostics

# FileName: TASK-279-06_Product_Compare_Admin_Preview_Resolve_and_Diagnostics.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Preview + Diagnostics
**Estimated Effort:** Very Large
**Dependencies:** TASK-279-01, TASK-279-02, TASK-256-01, TASK-279
**Status:** To Do

---

## Overview

Make the Product Compare admin editing experience truthful by showing bounded
resolved-product status in Wizard/Visual, preventing manual runtime-error
spoofing, and adding a backend-owned preview refresh path when feasible.

Source report coverage:

- UX-03: Advanced editor exposes editable `resolved.error`.
- UX-04: Advanced query preview is raw JSON without useful context.
- UX-05: Wizard/Visual do not show matched/resolved product count.
- UX-08 and Playwright section 7.1: admin canvas remains empty while frontend
  SSR renders real products.

## Scope Boundary

In scope:

- Read-only runtime diagnostics.
- Product count/status summaries in Wizard and Visual.
- A Product Compare preview refresh/re-resolve flow that uses backend-owned
  commerce resolver logic and bounded query input.
- Safe stale/error/loading states in admin preview.

Out of scope:

- Client-side commerce provider fetches.
- Persisting preview-only resolved rows as author data unless the existing
  widget save contract explicitly owns that persistence.
- Generic admin preview infrastructure unless TASK-256 or another shared task
  creates it first.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/widgets/core/productCompare.tsx`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/server/routes/commerceRoutes.ts` for the existing authenticated
  `/commerce/products/query` preview/search seam or any new internal preview
  route.
- `core/server/validation/commerceSchemas.ts` for query/preview payload
  validation.
- `core/admin/services/commerceClient.ts` for the existing
  `previewCommerceProductsQuery` admin client seam.
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/integration/routes/commerceRoutes.test.ts` when the existing commerce
  query route or a new preview endpoint is used.
- `tests/vitest/validation/commerceSchemas.test.ts` when query/preview schema
  changes.

## Implementation Pseudocode

```tsx
function ProductCompareRuntimeSummary({ resolved }: { resolved: ProductCompareData["resolved"] }) {
  const rows = resolved?.rows?.length ?? 0;
  const total = resolved?.total ?? 0;
  const stale = resolved?.resolvedAt ? isOlderThanPreviewTtl(resolved.resolvedAt) : true;
  return <StatusText rows={rows} total={total} stale={stale} error={resolved?.error} />;
}

function ProductCompareAdvancedEditor({ value }: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(value);
  return (
    <CommerceEditorSection title="Runtime payload">
      <ProductCompareRuntimeSummary resolved={normalized.resolved} />
      {normalized.resolved?.error ? <ReadOnlyDiagnostic label="Runtime error" value={normalized.resolved.error} /> : null}
      <QueryPreview query={buildProductCompareQueryInput(normalized)} />
    </CommerceEditorSection>
  );
}

async function resolveProductComparePreview(input: ProductCompareData, session: AdminSession) {
  assertAdminPreviewAccess(session);
  const normalized = normalizeProductCompareData(input);
  const query = buildProductCompareQueryInput(normalized);
  const result = await previewCommerceProductsQuery(query);
  const payload = buildCommerceComparePayload(result.rows);
  return {
    ...normalized,
    resolved: {
      rows: payload.rows,
      total: result.total,
      resolvedAt: payload.generatedAt,
    },
  };
}
```

Error handling:

- Runtime errors display as read-only diagnostics and do not mutate author data
  through a text input.
- Preview refresh failures show a bounded machine-readable error and keep the
  last safe preview state.
- Prefer the existing authenticated `/commerce/products/query` seam when it can
  satisfy Product Compare preview safely. If a dedicated preview route is still
  needed, add it as an internal admin route with explicit registration,
  validation, CSRF/session, and error mapping tests.
- If live preview resolution is unavailable, Wizard/Visual still show the
  current resolved count and stale status from normalized data.

Regression shape:

- Editor tests prove `Runtime error flag` is no longer editable.
- Editor tests prove Wizard/Visual display resolved rows/total/stale status.
- If the existing commerce query route is reused, route/schema tests prove the
  payload is accepted only for bounded Product Compare query fields and still
  rejects unknown keys.
- If a new preview route is introduced, route registration tests prove auth,
  CSRF/session expectations, validation, rate limit, and known error mapping.
- Runtime tests prove preview hydration uses the same query input as frontend
  SSR.

## Security Contract

This leaf may add an internal admin preview read endpoint if existing owners do
not already provide one.

- Endpoint visibility: internal admin-only preview/read route; no public write.
- Auth model: authenticated admin session with page/template preview access.
- RBAC: require the same permission used to edit or preview the containing
  page/template/widget.
- CSRF: if the route is POST because it accepts a widget payload, enforce the
  existing admin CSRF contract.
- Rate-limit bucket: admin preview/commerce read bucket with bounded source
  limit/product ID count.
- Reject-unknown validation: request payload must validate Product Compare data
  with `additionalProperties: false` before runtime hydration.
- Anti-abuse: clamp limits, selected products, search, and status filters; do
  not proxy arbitrary provider endpoints or raw query fragments.
- Secret handling: response must contain only public product display fields and
  bounded diagnostic codes, never provider secrets or raw backend errors.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- Add route registration, validation, CSRF/RBAC, and `map*Error` coverage if a
  preview endpoint is introduced.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/CMS_API.md` only if a new internal admin preview endpoint is added.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cached admin
  preview resources are introduced.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Advanced runtime diagnostics are read-only.
- Wizard and Visual show truthful resolved/matched product status without
  leaking raw provider payloads.
- Admin preview can refresh or clearly explain stale/unavailable resolved data.
- Any new preview endpoint is internal, authenticated, bounded, CSRF-safe when
  applicable, and covered by route/security tests.
