# TASK-280-01: Product Gallery Media Link and CTA Cards

# FileName: TASK-280-01_Product_Gallery_Media_Link_and_CTA_Cards.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-252-07-04, TASK-256-04, TASK-280
**Status:** To Do

---

## Overview

Add Product Gallery-owned product media, safe product links, and bounded card
CTA behavior so the widget behaves like a commerce gallery instead of a static
text card list.

This leaf covers `CODE-06`, `CODE-08`, `BF-01`, `BF-02`, `BF-03`, `BF-12`,
`BF-13`, `A1`, and `A5` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- schema-owned `link` / `basePath` / `cta` fields for Product Gallery card
  navigation;
- media rendering from backend-resolved product/media payloads;
- safe image `alt` fallback using product title when no resolved media alt is
  available;
- card-level link and optional "View product" CTA that use the same sanitized
  product URL;
- editor controls for CTA label/visibility and base path;
- tests proving links/images are accessible and safe.

Out of scope:

- client-side provider/media fetching;
- cart mutations, checkout writes, wishlist writes, or public write endpoints;
- generic safe-href helper work owned by TASK-256;
- broad Product Compare/Product Table link/media expansion unless a separate
  commerce-shared task is created.

## Source Findings

- `REPORT_PRODUCT_GALLERY_WIDGET.md` `CODE-06` and `BF-01`: product cards ignore
  `primaryMediaId` and render no image.
- `REPORT_PRODUCT_GALLERY_WIDGET.md` `CODE-08`, `BF-02`, `BF-03`, and `BF-12`:
  cards have product slugs but no links, CTA, or `baseUrl` field.
- `REPORT_PRODUCT_GALLERY_WIDGET.md` `BF-13`, `A1`, and `A5`: links and future
  media need keyboard access and image alt text.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Extend schema/types/defaults/normalizer for link/media/CTA fields and render safe card links/images. |
| `core/widgets/core/commerceWidgetShared.ts` | Add Product Gallery-specific runtime card media metadata only if the resolver can supply safe URL/alt fields without changing other widgets unexpectedly. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Map product media metadata into runtime cards if media URL/alt data already exists in commerce records or an approved media lookup seam is available. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Preserve Product Gallery resolved media/link payloads during hydration. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Add Product Gallery link/CTA and media display controls in the correct editor mode. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover linked cards, CTA rendering, safe path fallback, image/alt output, and no image when media is unresolved. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover link/CTA/media editor controls and normalized payload updates. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Cover resolver-to-card media metadata when runtime mapping changes. |
| `tests/unit/widgets/validator.test.ts` | Add schema accept/reject coverage for new Product Gallery fields. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document media/link/CTA fields and resolver expectations. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Mark card media/link/CTA findings fixed or deferred with textual evidence. |

## Implementation Pseudocode

Types and normalizer:

```ts
type ProductGalleryLinkTarget = "same-tab" | "new-tab";
type ProductGalleryCtaStyle = "text" | "button" | "none";

type ProductGalleryLinkConfig = {
  basePath?: string;
  target?: ProductGalleryLinkTarget;
  ctaLabel?: string;
  ctaStyle?: ProductGalleryCtaStyle;
};

function normalizeProductGalleryLink(value: unknown): ProductGalleryLinkConfig {
  const basePath = normalizeSafeBasePath(readString(value, "basePath") ?? "/products");
  return {
    basePath,
    target: readString(value, "target") === "new-tab" ? "new-tab" : "same-tab",
    ctaLabel: normalizeOptionalText(readString(value, "ctaLabel")) ?? "View product",
    ctaStyle: resolveEnum(readString(value, "ctaStyle"), ["text", "button", "none"], "text"),
  };
}
```

Data flow:

- `toCommerceRuntimeCard()` includes only media URL/alt metadata that the
  backend can resolve safely.
- `normalizeProductGalleryData()` normalizes the new link/media fields and keeps
  legacy payloads on the current no-image/no-CTA behavior unless defaults are
  intentionally changed in this leaf.
- `ProductGalleryBlock` builds `href = joinProductGalleryProductHref(basePath,
  item.slug)` through a safe path helper.
- Cards use a single semantic link target for image/title/CTA, with `rel` set
  for new-tab links.

Error handling:

- Empty or unsafe `basePath` normalizes to `/products`.
- Empty product `slug` keeps the card unlinked instead of rendering `href="#"`.
- Missing media URL renders the current text-only card and optional media hint;
  it must not render broken `<img>`.
- Missing media alt falls back to the product title. Decorative media is not
  allowed for product cards.
- Cart/add-to-cart labels are not enabled unless an existing commerce checkout
  action is wired and tested.

Regression-test shape:

```ts
test("product gallery renders safe product links and media alt text", () => {
  const html = renderToString(
    <ProductGalleryBlock
      variant="cards"
      data={normalizeProductGalleryData({
        link: { basePath: "/products", ctaLabel: "View details" },
        resolved: { items: [resolvedCardWithMedia] },
      })}
    />
  );
  expect(html).toContain('href="/products/starter-home"');
  expect(html).toContain('alt="Starter Home"');
  expect(html).toContain("View details");
});
```

## Security Contract

No API routes are added by default.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new link/media/CTA fields must be schema-owned and
  reject unknown fields.
- Anti-abuse: hrefs must be safe relative URLs or approved absolute URLs through
  the existing safe-href contract. No raw HTML, inline events, script URLs, or
  provider secrets in widget data.
- Secret handling: media URLs must be public-safe resolved URLs only. Private
  provider/media credentials remain backend-owned.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts` when resolver
  media mapping changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-01_Product_Gallery_Media_Link_and_CTA_Cards.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Product Gallery cards can render safe product images when resolved media data
  exists.
- Product cards expose keyboard-accessible links to product pages.
- CTA labels/styles are bounded and do not imply cart behavior unless an
  existing checkout action is wired and tested.
- Missing media/link data degrades to safe, non-broken output.
- Tests prove the schema, normalizer, runtime card mapping, editor controls, and
  renderer stay synchronized.
