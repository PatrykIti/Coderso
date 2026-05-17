# TASK-279-03: Product Compare Column Media Links and CTAs

# FileName: TASK-279-03_Product_Compare_Column_Media_Links_and_CTAs.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Media + Safe Links
**Estimated Effort:** Large
**Dependencies:** TASK-279-01, TASK-279-02, TASK-256-02, TASK-279
**Status:** To Do

---

## Overview

Add Product Compare column header merchandising: product image, safe product
title links, and optional per-product CTA behavior without creating a public
write or arbitrary link system.

Source report coverage:

- BF-02: no product image in the column header.
- BF-07: product title is static text instead of a product link.
- BF-10: no per-product CTA such as "View product" or "Add to cart".
- A6: product media requires alt/semantics when added.

## Scope Boundary

In scope:

- Extend `CommerceWidgetRuntimeCompareRow` with safe public display fields such
  as image URL/media metadata, title, slug-derived product URL, and public
  excerpt where needed by TASK-279-02.
- Derive image URLs from the existing media storage/public URL owners; do not
  assume `mediaIds` are directly renderable URLs.
- Derive product links from an explicit public commerce product route owner.
  If no such route exists when this leaf starts, ship title-link/CTA controls as
  disabled/read-only with clear diagnostics instead of inventing a guessed
  `/products/:slug` path.
- Add Product Compare renderer/editor options for showing image, product link,
  and CTA label/mode.
- Use existing safe href/link normalization patterns for rendered anchors.

Out of scope:

- Public cart mutation, checkout session creation, or provider API calls from
  the browser unless an existing commerce checkout/cart flow is explicitly
  reused and tested in the same leaf.
- Raw external URLs stored per product in widget JSON.
- Media library redesign or private media URLs in browser-visible data.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/widgets/core/widgetSafeHref.ts` when safe href helpers are needed.
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `core/services/commerce/commerceTypes.ts`
- `core/services/commerce/commerceProductLinks.ts` (new pure helper) if the
  leaf introduces a commerce product href contract.
- `core/services/media/mediaService.ts`
- `core/services/media/storage/adapter.ts`
- `core/db/schema.ts`
- `core/services/settings/settingsService.ts` only if the commerce product href
  contract needs a configurable public base path.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- Media service/storage tests when media URL hydration changes.
- `tests/vitest/widgets/widgetSafeHref.test.ts` when safe href behavior changes.

## Implementation Pseudocode

```ts
type CommerceWidgetRuntimeCompareRow = {
  id: string;
  title: string;
  slug: string;
  productHref?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaLabel?: string | null;
  // existing price/stock fields
};

type ProductCompareHeaderOptions = {
  showImages?: boolean;
  linkTitles?: boolean;
  ctaMode?: "none" | "view_product" | "checkout_redirect";
  ctaLabel?: string;
};

function normalizeProductCompareHeaderOptions(value: unknown): ProductCompareHeaderOptions {
  return {
    showImages: value.showImages === true,
    linkTitles: value.linkTitles !== false,
    ctaMode: knownCtaMode(value.ctaMode) ? value.ctaMode : "view_product",
    ctaLabel: text(value.ctaLabel, "View product"),
  };
}

async function enrichCompareRowsWithMediaAndLinks(products: CommerceProduct[]) {
  return Promise.all(
    products.map(async (product) => {
      const primaryMedia = await resolvePublicMediaForProduct(product.mediaIds[0]);
      return {
        ...baseCompareRow(product),
        productHref: resolveCommerceProductHref(product.slug),
        imageUrl: primaryMedia?.url ?? null,
        imageAlt: primaryMedia?.alt ?? product.title,
      };
    })
  );
}

function resolveCommerceProductHref(slug: string, options: CommerceProductLinkOptions) {
  if (!options.enabled || !options.basePath) return null;
  return joinSafeCommerceProductPath(options.basePath, slug);
}

function renderProductHeader(row: CommerceWidgetRuntimeCompareRow, options: HeaderOptions) {
  const href = normalizeWidgetSafeHref(row.productHref);
  return (
    <div>
      {options.showImages && row.imageUrl ? <img src={row.imageUrl} alt={row.imageAlt ?? row.title} /> : null}
      {options.linkTitles && href ? <a href={href}>{row.title}</a> : <span>{row.title}</span>}
      {options.ctaMode === "view_product" && href ? <a href={href}>{options.ctaLabel}</a> : null}
    </div>
  );
}
```

Error handling:

- Missing media renders the existing text-only header.
- Missing public commerce product-route ownership renders text-only titles and
  disables link/CTA output; do not guess a route from slug alone.
- Invalid product hrefs normalize to no link and no CTA.
- `checkout_redirect` stays disabled unless an existing backend-owned checkout
  adapter provides a safe public read/navigation contract.

Regression shape:

- Renderer tests prove image alt text, safe title links, and no-link fallback.
- Runtime tests prove compare rows include only public media/link fields.
- Media/link tests prove image URLs come from the storage-backed media owner and
  product links come from the explicit commerce route owner or render disabled
  when that route is absent.
- Editor tests prove header options normalize and render previews without raw
  URL/script fields.

## Security Contract

This leaf must remain read-only unless it explicitly reuses an existing tested
commerce checkout/cart adapter.

- Endpoint visibility: public rendering only. No new public write endpoint.
- Auth/RBAC/CSRF: unchanged admin save route protections.
- Rate-limit bucket: unchanged unless a tested checkout/cart route is reused.
- Reject-unknown validation: header and CTA options must be schema-bound enums
  and strings.
- Anti-abuse: CTA hrefs derive from backend-owned product slug/route or
  existing safe helper output. No raw JavaScript URLs, raw HTML, provider
  endpoints, or unbounded external URLs.
- Secret handling: image/link payloads must be public-safe fields only.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if safe
  href behavior changes.
- Add Bun-owned route/security tests if checkout/cart behavior is introduced.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/WIDGET_PACK_MATRIX.md` if readiness/completeness changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Product Compare can show product images with meaningful alt text and safe
  fallback behavior.
- Product titles can link to public product pages without arbitrary hrefs.
- CTA behavior is explicit, bounded, and read-only unless an existing commerce
  checkout/cart route is reused with full route/security proof.
- Existing text-only compare headers remain compatible.
