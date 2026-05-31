# TASK-281-06: Product Table Media Excerpt and Section Header Context

# FileName: TASK-281-06_Product_Table_Media_Excerpt_and_Section_Header_Context.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-281-03, TASK-281-04, TASK-281-05, TASK-256-06
**Status:** Done (2026-05-22)

---

## Overview

Add Product Table-owned product context that already exists in runtime data but
is not represented in the table. This leaf covers `UX-05`, `BF-01`, `BF-02`,
`BF-07`, and `A7` from `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current runtime cards include `excerpt`, `primaryMediaId`, and `mediaIds`, but
the renderer ignores them. The widget also lacks a section header
(`eyebrow/title/description`) above the table.

The clean base for this leaf already includes the shared column registry from
`TASK-281-02`, row-state and stock behavior from `TASK-281-03`, link/action
behavior from `TASK-281-04`, admin preview parity from `TASK-281-01`, and the
table accessibility baseline from `TASK-281-05`. This leaf must extend those
seams additively instead of replacing them.

## Scope Boundary

In scope:

- optional thumbnail/media column using backend-owned media resolution;
- lazy-loading and accessible alt behavior for Product Table thumbnails;
- optional excerpt column with plain-text clamping;
- Product Table section header fields for eyebrow/title/description;
- editor controls and preview states for those Product Table fields;
- preserving the current shared column registry, preview-state contract,
  link/action column behavior, row-state logic, and accessibility semantics
  from `TASK-281-01` through `TASK-281-05`;
- preserving current table-only output by default for legacy payloads.

Out of scope:

- implementing a generic media resolver or private media URL exposure;
- rich text excerpts or raw HTML;
- product detail pages, galleries, or carousel behavior;
- global section-header contract changes.

## Sub-Tasks

- [x] Add Product Table header fields for eyebrow, title, and description.
- [x] Add optional image and excerpt columns to the column metadata model.
- [x] Resolve media through public-safe backend-owned media data only.
- [x] Render thumbnails with lazy loading and safe alt text/fallbacks.
- [x] Add editor controls and admin preview behavior for header/media/excerpt
  fields.
- [x] Add renderer/editor tests for header, media, excerpt, and missing-data
  fallbacks.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Extend the existing Product Table contract with header/media/excerpt fields, normalized defaults, additive renderer output, and new column metadata without replacing the shared registry or current accessibility/link seams. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Attach public-safe image metadata to hydrated Product Table rows while preserving `productHref` resolution and current runtime error handling. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add Product Table header, media, and excerpt controls in Wizard/Visual as appropriate while preserving preview-state refresh, read-only diagnostics, and current link/stock controls. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert legacy defaults, header rendering, excerpt output, media column safety, lazy thumbnail output, no broken image for missing media, and preserved accessibility/link behavior. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls emit normalized header/media/excerpt fields without regressing preview, link, or stock controls. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Assert Product Table hydration keeps `productHref` behavior and adds only public-safe image metadata. |
| `tests/unit/widgets/validator.test.ts` | Assert schema ownership and reject-unknown normalization when header/media/excerpt fields change. |

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
type ProductTableResolvedMedia = {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type ProductTableRuntimeItem = CommerceWidgetRuntimeCard & {
  productHref: string | null;
  media?: ProductTableResolvedMedia | null;
};

const productTableColumns = [
  ...existingColumns,
  { key: "image", visibilityKey: "showImage", labelKey: "image" },
  { key: "excerpt", visibilityKey: "showExcerpt", labelKey: "excerpt" },
];

async function attachProductTableMedia(
  items: ProductTableRuntimeItem[],
  deps: CommerceWidgetRuntimeDeps
): Promise<ProductTableRuntimeItem[]> {
  // Resolve only public image media for primaryMediaId/mediaIds[0].
}

function hydrateProductTableRuntimeData(value: ProductTableData) {
  // Keep current productHref resolution, then attach optional media metadata.
}
```

Error handling:

- Missing media renders a stable, non-broken fallback cell with accessible text
  instead of a broken image request.
- Thumbnail images use `loading="lazy"` unless a later, explicitly documented
  performance policy promotes a visible hero product image.
- Excerpts are plain text and clamp by character/line policy.
- Header fields normalize blank strings to omitted fields.
- Private media URLs or unresolved media IDs never render as public `src`.
- Existing `productHref`, preview-state refresh, row-state classes, and table
  caption/label semantics must keep their current behavior.

## Security Contract

No API routes are added by this leaf unless media resolution requires an
existing internal/public media lookup.

- Endpoint visibility: unchanged; media URLs must be public-safe outputs.
- Auth/RBAC/CSRF/rate limit: unchanged; this leaf must reuse the existing admin
  Product Table preview route instead of adding a new endpoint family.
- Reject-unknown validation: new header/media/excerpt fields must be added to
  `productTableSchema`.
- Anti-abuse: no raw HTML excerpts, inline event handlers, arbitrary class
  names, or private media URLs.
- Secret handling: no signed/private URLs, media tokens, or provider secrets in
  widget JSON or public output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with header/media/excerpt fields and
  how they layer onto the current preview/link/accessibility contract.
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


## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`

## Closure Notes

- Product Table now extends the shared `productTableColumns` registry with optional Image and Excerpt columns, keeps the existing Product/Price guardrails, and adds a visible section header through `header.eyebrow`, `header.title`, and `header.description`.
- Public runtime hydration now preserves the existing safe `productHref` contract while attaching only public image media, so thumbnails render lazily with safe alt fallback and a stable `No image` placeholder instead of broken requests or private URLs.
- Visual mode now exposes the new section-header controls plus Image/Excerpt toggles and labels without regressing preview-state refresh, row-state/status treatment, safe product links, or read-only diagnostics from `TASK-281-01` through `TASK-281-05`.
