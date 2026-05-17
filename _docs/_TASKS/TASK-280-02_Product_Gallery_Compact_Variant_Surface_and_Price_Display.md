# TASK-280-02: Product Gallery Compact Variant Surface and Price Display

# FileName: TASK-280-02_Product_Gallery_Compact_Variant_Surface_and_Price_Display.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-280
**Status:** To Do

---

## Overview

Make Product Gallery runtime output truthful for the `compact` variant, card
surface classes, minimal-card borders, and compare-at price display.

This leaf covers `CODE-01`, `CODE-02`, `CODE-03`, `CODE-04`, `CODE-07`,
`BF-04`, and the Product Gallery side of `NEW-02` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- use the `variant` argument in `ProductGalleryBlock`;
- make `compact` produce a denser, testable layout that still uses bounded
  class maps;
- remove Product Gallery-local dead fallback-class logic caused by checking the
  normalized style object;
- ensure `minimal` card style does not expose inert `borderColor` behavior;
- only render compare-at price when `compareAtAmount > amount`;
- verify Product Gallery price display against commerce admin amount units.

Out of scope:

- generic clear/none semantics, owned by TASK-256-02;
- shared editor atomic update helpers, owned by TASK-256-01;
- changing `formatCommerceMoney` for Product Compare/Table inside this Product
  Gallery-only leaf. If the cents/unit bug is confirmed in the shared helper,
  split that shared commerce formatter fix before landing Product Gallery code.

## Source Findings

- `CODE-01` / `BF-04`: `ProductGalleryBlock` ignores `variant`; `cards` and
  `compact` render identical HTML.
- `CODE-02` / `CODE-03`: `legacyCardSurfaceClass` and `legacyEmptyClass` are
  dead code after normalization and create trailing class artifacts.
- `CODE-04`: minimal cards can receive inline `borderColor` without a border.
- `CODE-07`: compare-at price renders even when it is lower than current price.
- `NEW-02`: frontend rendered `$19,900.00` for a product shown as `$199.00` in
  Commerce admin; current `CommerceTable` divides by 100 but
  `formatCommerceMoney` does not.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Use variant-specific class maps, remove dead fallback branches, clean minimal-card border handling, compare-at guard, and Product Gallery price display verification hook if local. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Add copy/preview labels for compact and minimal surface behavior if editor copy changes. |
| `tests/vitest/widgets/productGallery.test.tsx` | Add SSR assertions for compact vs cards, no trailing legacy classes, minimal border behavior, compare-at guard, and Product Gallery price formatting expectation. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover editor-facing compact/minimal guidance if controls or copy move. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Run when runtime money/card values are remapped before render. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document compact, surface, minimal, compare-at, and price-display behavior. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Mark the fixed/deferred Product Gallery rows with textual evidence. |

## Implementation Pseudocode

Variant and surface maps:

```ts
const variantGridClassMap: Record<ProductGalleryVariantId, string> = {
  cards: "gap-4",
  compact: "gap-2",
};

const variantCardClassMap: Record<ProductGalleryVariantId, string> = {
  cards: "space-y-3 rounded-xl p-4",
  compact: "space-y-2 rounded-lg p-3",
};

function resolveProductGalleryVariant(value: string): ProductGalleryVariantId {
  return value === "compact" ? "compact" : "cards";
}
```

Render flow:

```tsx
const resolvedVariant = resolveProductGalleryVariant(variant);
const cardBorderClass = normalized.style?.cardStyle === "minimal" ? "" : "border";
const cardStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(normalized.style?.cardBackground),
  borderColor:
    normalized.style?.cardStyle === "minimal"
      ? undefined
      : resolveClearableStyleValue(normalized.style?.cardBorderColor),
});
const hasCompareAt =
  typeof item.pricing.compareAtAmount === "number" &&
  item.pricing.compareAtAmount > item.pricing.amount;
```

Error handling:

- Unknown `variant` falls back to `cards`.
- Unknown `columns` still normalizes to `3`.
- Cleared `cardBorderColor` must not produce broken class names.
- Minimal cards must not serialize useless `border-color` unless a visible
  border/ring is intentionally added by this leaf.
- If the cents/unit bug requires shared formatter changes, stop the leaf and
  create or link a separate commerce-shared task instead of patching only
  Product Gallery with a hidden duplicate formatter.

Regression-test shape:

```ts
test("compact variant renders denser product gallery markup", () => {
  const cards = renderToString(<ProductGalleryBlock variant="cards" data={dataWithItem} />);
  const compact = renderToString(<ProductGalleryBlock variant="compact" data={dataWithItem} />);
  expect(compact).toContain("gap-2");
  expect(compact).not.toBe(cards);
});

test("compare-at price renders only for actual discounts", () => {
  const html = renderToString(<ProductGalleryBlock variant="cards" data={dataWithLowerCompareAt} />);
  expect(html).not.toContain("line-through");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: no arbitrary variant, card, or style classes.
- Anti-abuse: no raw class strings, raw CSS blocks, inline event handlers, or
  browser-stored privileged commerce settings.
- Secret handling: unchanged; price/style data contains no secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  when editor copy or controls change.
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts` when runtime
  card values or money units are remapped.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-02_Product_Gallery_Compact_Variant_Surface_and_Price_Display.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- `compact` and `cards` render distinct, purposeful Product Gallery layouts.
- Product Gallery output no longer contains dead legacy fallback artifacts.
- Minimal card surface behavior is visible, documented, and not misleading.
- Compare-at price is shown only for actual discounts.
- Product Gallery price display is verified against commerce admin amount units,
  and any cross-commerce formatter fix is split out instead of hidden here.
