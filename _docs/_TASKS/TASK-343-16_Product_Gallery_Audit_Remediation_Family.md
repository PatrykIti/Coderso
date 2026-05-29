# TASK-343-16: Product Gallery Audit Remediation Family

# FileName: TASK-343-16_Product_Gallery_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Product Gallery + Admin Preview + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-342
**Status:** To Do

---

## Overview

Close the Product Gallery preview and truthfulness drift where product data is
not hydrated until Advanced runs, source edits stay stale without refresh, and
route/CTA affordances are opaque when no detail route exists.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md:203-211`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx:393-395,886,928-930,1010`
- `core/widgets/core/productGallery.tsx:239,313,521,645,752-756,888,988`

## Sub-Tasks

- [ ] Make first-load preview hydration truthful in Wizard/Visual without
  requiring an Advanced detour.
- [ ] Surface stale-source state and refresh ownership more clearly in daily
  modes.
- [ ] Make missing `link.basePath` consequences explicit for cards and CTA.
- [ ] Decide whether the orphan `fields.showMediaHint` should be removed or
  wired through.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Improve preview hydration and stale-source messaging. |
| `core/widgets/core/productGallery.tsx` | Keep route/CTA behavior and field ownership truthful. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover route/CTA truthfulness and orphan-field ownership. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover preview hydration and stale-source UX. |

## Implementation Pseudocode

```ts
function shouldHydrateProductGalleryPreview(mode: EditorMode, previewState: PreviewState) {
  return previewState.status === "idle" || previewState.status === "stale";
}

function resolveProductGalleryRouteNotice(basePath?: string) {
  return basePath ? "configured" : "missing";
}
```

## Regression Test Shape

- Visual/Wizard no longer open on a misleading empty preview when products are
  resolvable.
- Missing route configuration is explicitly reflected in card/CTA guidance.

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
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Product Gallery preview is hydrated truthfully in daily modes.
- Missing route configuration is visible and understandable from the editor.

