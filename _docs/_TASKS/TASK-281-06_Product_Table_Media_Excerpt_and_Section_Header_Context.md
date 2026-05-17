# TASK-281-06: Product Table Media Excerpt and Section Header Context

# FileName: TASK-281-06_Product_Table_Media_Excerpt_and_Section_Header_Context.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-05, TASK-256-06
**Status:** To Do

---

## Overview

Add Product Table-owned product context that already exists in runtime data but
is not represented in the table. This leaf covers `UX-05`, `BF-01`, `BF-02`,
`BF-07`, and `A7` from `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current runtime cards include `excerpt`, `primaryMediaId`, and `mediaIds`, but
the renderer ignores them. The widget also lacks a section header
(`eyebrow/title/description`) above the table.

## Scope Boundary

In scope:

- optional thumbnail/media column using backend-owned media resolution;
- lazy-loading and accessible alt behavior for Product Table thumbnails;
- optional excerpt column with plain-text clamping;
- Product Table section header fields for eyebrow/title/description;
- editor controls and preview states for those Product Table fields;
- preserving current table-only output by default for legacy payloads.

Out of scope:

- implementing a generic media resolver or private media URL exposure;
- rich text excerpts or raw HTML;
- product detail pages, galleries, or carousel behavior;
- global section-header contract changes.

## Sub-Tasks

- [ ] Add Product Table header fields for eyebrow, title, and description.
- [ ] Add optional image and excerpt columns to the column metadata model.
- [ ] Resolve media through public-safe backend-owned media data only.
- [ ] Render thumbnails with lazy loading and safe alt text/fallbacks.
- [ ] Add editor controls and admin preview behavior for header/media/excerpt
  fields.
- [ ] Add renderer/editor tests for header, media, excerpt, and missing-data
  fallbacks.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add header/media/excerpt schema fields, normalization, renderer output, and column metadata. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Provide safe media URL/alt metadata only if current runtime cards lack enough data for public thumbnails. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add Product Table header, media, and excerpt controls in Wizard/Visual as appropriate. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert legacy defaults, header rendering, excerpt output, media column safety, lazy thumbnail output, and no broken image for missing media. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls emit normalized header/media/excerpt fields. |

## Implementation Pseudocode

Data shape:

```ts
type ProductTableData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  fields?: {
    showImage?: boolean;
    showExcerpt?: boolean;
  };
  labels?: {
    image?: string;
    excerpt?: string;
  };
};
```

Media mapping:

```ts
type ProductTableMedia = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

function resolveProductTableMedia(item: CommerceWidgetRuntimeCard): ProductTableMedia | null {
  if (!item.primaryMediaId) return null;
  return resolvePublicMediaById(item.primaryMediaId);
}
```

Error handling:

- Missing media renders an empty placeholder only when the design requires a
  stable column width; otherwise render an empty cell with accessible text.
- Thumbnail images use `loading="lazy"` unless a later, explicitly documented
  performance policy promotes a visible hero product image.
- Excerpts are plain text and clamp by character/line policy.
- Header fields normalize blank strings to omitted fields.
- Private media URLs or unresolved media IDs never render as public `src`.

## Security Contract

No API routes are added by this leaf unless media resolution requires an
existing internal/public media lookup.

- Endpoint visibility: unchanged; media URLs must be public-safe outputs.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new header/media/excerpt fields must be added to
  `productTableSchema`.
- Anti-abuse: no raw HTML excerpts, inline event handlers, arbitrary class
  names, or private media URLs.
- Secret handling: no signed/private URLs, media tokens, or provider secrets in
  widget JSON or public output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- Media/public URL tests if a media resolver seam changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with header/media/excerpt fields.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-05/BF-01/BF-02/
  BF-07/A7 evidence after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table can show a safe thumbnail and excerpt without changing legacy
  default output.
- Product thumbnail output is lazy-loaded, accessible, and never exposes private
  media URLs.
- Header fields give editors visible context above the table and feed the
  accessibility caption/label behavior from TASK-281-05 where appropriate.
- Missing media/excerpt data degrades without broken images or empty misleading
  labels.
