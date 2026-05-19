# TASK-280-06: Product Gallery Section Header Metadata and Accessibility

# FileName: TASK-280-06_Product_Gallery_Section_Header_Metadata_and_Accessibility.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-280-01, TASK-280-02, TASK-280
**Status:** Done (2026-05-19)

---

## Overview

Add Product Gallery-owned section header, product metadata, and card
accessibility improvements that are not part of the generic TASK-256 runtime
contract.

This leaf covers `BF-05`, `BF-07`, `A3`, and `A4` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- optional section `title` and `description` fields;
- product status badge rendering when enabled;
- stock badge non-color indicator such as icon/text prefix;
- accessible names for product cards via `aria-label` or `aria-labelledby`;
- editor controls for header and metadata visibility.

Out of scope:

- generic ARIA helper/runtime ID contract owned by TASK-256-04;
- product media/link rendering owned by TASK-280-01;
- compact/surface behavior owned by TASK-280-02.

## Source Findings

- `BF-05`: Product Gallery lacks section-level title/description.
- `BF-07`: cards do not show product status badges.
- `A3`: stock badge relies on color without a non-color indicator.
- `A4`: `<article>` lacks `aria-label` or `aria-labelledby`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Extend schema/defaults/normalizer/render for header fields, status badge toggle, stock indicator, and card accessible naming. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Add Product Gallery header and metadata controls in Visual mode. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover header rendering, status badge visibility, stock non-color indicator, and card accessible names. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover header/metadata editor controls and normalized payload updates. |
| `tests/unit/widgets/validator.test.ts` | Add schema coverage when fields are added. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document header and metadata fields. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Update accessibility and metadata rows with evidence. |

## Implementation Pseudocode

Schema model:

```ts
type ProductGalleryHeader = {
  title?: string;
  description?: string;
};

type ProductGalleryFields = {
  showExcerpt?: boolean;
  showPrice?: boolean;
  showStock?: boolean;
  showStatus?: boolean;
  showMediaHint?: boolean;
};

function normalizeProductGalleryHeader(value: unknown): ProductGalleryHeader | undefined {
  return compactObject({
    title: normalizeOptionalText(readString(value, "title")),
    description: normalizeOptionalText(readString(value, "description")),
  });
}
```

Render flow:

- Render section header only when title or description exists.
- Generate stable heading IDs from block-local deterministic values available in
  the renderer context, or use a safe fallback `aria-label` based on product
  title when no generated ID seam exists yet.
- Render status badges only when enabled and product status is available.
- Stock badges include a non-color indicator such as `In stock:`, `Backorder:`,
  or an accessible icon with screen-reader text.

Error handling:

- Missing header fields render no empty wrappers.
- Missing product title falls back to a generic card label only after normalizer
  rejects invalid runtime cards.
- Unknown status values normalize to `published`, `draft`, or `archived` before
  rendering.

Regression-test shape:

```ts
test("product gallery cards expose accessible names and non-color stock text", () => {
  const html = renderToString(<ProductGalleryBlock variant="cards" data={dataWithItem} />);
  expect(html).toContain("aria-label");
  expect(html).toContain("In stock");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new header/field toggles must be schema-owned.
- Anti-abuse: header text is plain text only; no raw HTML or scripts.
- Secret handling: no secrets in header or metadata fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-06_Product_Gallery_Section_Header_Metadata_and_Accessibility.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Product Gallery can render an optional section header without empty wrappers.
- Product status and stock indicators are accessible beyond color alone.
- Product cards expose useful accessible names.
- Editor controls and tests keep header/metadata fields synchronized with the
  schema and renderer.
