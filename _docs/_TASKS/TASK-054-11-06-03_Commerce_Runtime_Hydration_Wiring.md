# TASK-054-11-06-03: Commerce Runtime Hydration Wiring
# FileName: TASK-054-11-06-03_Commerce_Runtime_Hydration_Wiring.md

**Priority:** High  
**Category:** Runtime/Server  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-06-01  
**Status:** Done (2026-02-19)

---

## Goal
Inject commerce runtime payload into widget blocks before SSR rendering.

## Scope
1. Extend public runtime hydration for:
   - `product-gallery`
   - `product-compare`
   - `product-table`
2. Use existing `resolveCommerceRuntimeProducts` as single data source.
3. Keep `preview` behavior: include drafts in preview, published-only on public.
4. Set explicit `resolvedAt` + `error` fields for deterministic output.

## Security Contract
- This subtask hydrates data in SSR path and does not add new public endpoints.
- If endpoint exposure becomes necessary during implementation, use:
  - public read: request signing (HMAC/signature) + dedicated bucket,
  - public write: nonce + HMAC/signature + optional reCAPTCHA,
  - internal access mode: authenticated `session` or scoped `API key`.

## Files
- `core/server/publicSite.tsx`
- `core/services/commerce/commerceRuntimeResolver.ts`

## Pseudocode
```ts
if (block.type === "product-gallery") {
  const normalized = normalizeProductGalleryData(block.data);
  const resolved = await resolveCommerceRuntimeProducts({
    query: normalized.source.query,
    preview: options.preview,
  });
  nextBlock = withResolvedGalleryData(block, normalized, resolved);
}
```

## Acceptance Criteria
1. Hydration works for all three widget types.
2. Hydration never throws to renderer for expected query errors; stores `resolved.error`.
3. Compare/table widgets receive row payload from resolver output.

## Delivered
- Added dedicated runtime hydration helper:
  - `core/services/commerce/commerceWidgetRuntime.ts`
- Wired public SSR hydration for commerce widgets:
  - `core/server/publicSite.tsx`
- Added runtime hydration coverage:
  - `tests/unit/commerce/commerceWidgetRuntime.test.ts`
