# TASK-343-16: Product Gallery Audit Remediation Family

# FileName: TASK-343-16_Product_Gallery_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Product Gallery + Admin Preview + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-342
**Status:** Done (2026-05-30)

---

## Overview

Close the Product Gallery preview and truthfulness drift where product data is
not hydrated until Advanced runs, source edits stay stale without refresh, and
route/CTA affordances are opaque when no detail route exists. The report also
requires public section naming and truthful `view all` disappearance handling.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md:203-214`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx:393-395,886,928-930,1010`
- `core/widgets/core/productGallery.tsx:239,313,521,645,752-756,888,988`

## Sub-Tasks

- [x] Make first-load preview hydration truthful in Wizard/Visual without
  requiring an Advanced detour.
- [x] Surface stale-source state and refresh ownership more clearly in daily
  modes.
- [x] Make missing `link.basePath` consequences explicit for cards and CTA.
- [x] Explain or prevent silent `view all` link disappearance when the destination
  is cleared or `total <= items.length`.
- [x] Decide whether the orphan `fields.showMediaHint` should be removed or
  wired through.
- [x] Add an accessible name for the public Product Gallery section, including a
  fallback when the section title is omitted.

## Implementation Notes

- Added Wizard and Visual preview summaries that hydrate first-load preview
  data and keep source/curation changes stale until `Refresh products` is used.
- Added route and view-all state helpers that drive runtime `data-*` markers,
  editor guidance, and Advanced summaries.
- Added public section naming with title-based `aria-labelledby` and a fallback
  `aria-label="Product gallery"`.
- Retired `fields.showMediaHint` from normalized owned data while leaving schema
  acceptance in place for legacy saved payloads.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Improve preview hydration and stale-source messaging. |
| `core/widgets/core/productGallery.tsx` | Keep route/CTA/view-all behavior, accessible section naming, and field ownership truthful. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover route/CTA/view-all truthfulness, accessible naming, and orphan-field ownership. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover preview hydration, stale-source UX, and missing-route guidance. |

## Implementation Pseudocode

```ts
function shouldHydrateProductGalleryPreview(mode: EditorMode, previewState: PreviewState) {
  return previewState.status === "idle" || previewState.status === "stale";
}

function resolveProductGalleryRouteNotice(basePath?: string) {
  return basePath ? "configured" : "missing";
}

function resolveViewAllVisibility(data: ProductGalleryData, total: number, shown: number) {
  if (data.pagination?.mode !== "view-all") return "disabled";
  if (!data.pagination.viewAllHref) return "missing_destination";
  if (total <= shown) return "all_products_visible";
  return "visible";
}
```

## Regression Test Shape

- Visual/Wizard no longer open on a misleading empty preview when products are
  resolvable.
- The existing editor test that expects preview hydration to be deferred until
  Advanced is opened must be rewritten or inverted if the product decision is
  to hydrate daily modes.
- Missing route configuration is explicitly reflected in card/CTA guidance.
- `view all` disappearance and section accessible naming are covered in renderer
  tests.

## Security Contract

No new public route. Existing commerce/admin preview boundaries stay unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md`.
- Update `_docs/_WIDGETS/PRODUCT_GALLERY.md`.
- Add `_docs/_CHANGELOG/1020-2026-05-30-task-343-16-product-gallery-truthfulness.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Product Gallery preview is hydrated truthfully in daily modes.
- Missing route configuration is visible and understandable from the editor.
- Product Gallery sections expose an accessible name and hidden links are
  explained by explicit state.
