# TASK-280-04: Product Gallery Editor Mode Empty State and Technical Hints

# FileName: TASK-280-04_Product_Gallery_Editor_Mode_Empty_State_and_Technical_Hints.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-280
**Status:** To Do

---

## Overview

Clean up Product Gallery editor mode ownership, empty-state normalization, grid
preview feedback, and technical media-hint behavior.

This leaf covers `UX-01`, `UX-02`, `UX-03`, `UX-04`, `BF-14`, `A2`, and `A6`
from `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- Product Gallery-specific Wizard/Visual/Advanced field placement;
- preserving empty `emptyState.description` as an intentional empty string;
- grid/columns preview affordance before save;
- turning `showMediaHint` into a clearly diagnostic, non-production-oriented
  control or hiding it behind Advanced diagnostics;
- empty-state live-region/role behavior if Product Gallery output changes
  dynamically in preview.

Out of scope:

- generic editor mode switching/update races owned by TASK-256-01;
- shared clear-control behavior owned by TASK-256-02;
- broad commerce collection picker/data loading owned by TASK-280-05.

## Source Findings

- `UX-01`: `SurfaceFields` appears in both Wizard and Visual.
- `UX-02` and `A2`: `showMediaHint` exposes raw media IDs to editors and public
  output.
- `UX-03` and `BF-14`: clearing `emptyState.description` returns to fallback
  copy because `text()` treats empty string as missing.
- `UX-04`: columns change has no visual preview before save.
- `A6`: empty state has no role or live-region semantics.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Add empty-description normalization that preserves intentional empty strings and add safe empty-state semantics. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Rebalance Wizard/Visual/Advanced fields, move technical media hint to diagnostics or relabel it, and add columns preview. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover empty description clearing, empty-state semantics, and media-hint public behavior. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover mode-specific controls, empty-description clearing, media-hint diagnostics, and columns preview. |
| `tests/unit/widgets/validator.test.ts` | Run/update if empty-state schema behavior changes. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document editor mode ownership and empty-state behavior. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Update fixed/deferred evidence for editor UX rows. |

## Implementation Pseudocode

Empty-state normalization:

```ts
function normalizeRequiredText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeOptionalEmptyText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

const emptyState = {
  title: normalizeRequiredText(value.emptyState?.title, productGalleryDefaults.emptyState.title),
  description: normalizeOptionalEmptyText(
    value.emptyState?.description,
    productGalleryDefaults.emptyState.description
  ),
};
```

Editor flow:

- Wizard keeps source basics, columns, and card style only.
- Visual owns card content, empty state, and visual surface controls.
- Advanced owns read-only diagnostics, runtime payload, query preview, and
  media-hint diagnostics if the field remains public.
- Columns preview renders a small static grid using the selected column count
  and does not require saved runtime data.

Error handling:

- Empty title still falls back to a usable default.
- Empty description stays empty and renders no second paragraph when blank.
- Media hints must not expose raw IDs by default in public runtime.
- Mode rebalancing must preserve existing saved Product Gallery payloads.

Regression-test shape:

```ts
test("empty-state description can be intentionally blank", () => {
  const data = normalizeProductGalleryData({ emptyState: { description: "" } });
  expect(data.emptyState?.description).toBe("");
  const html = renderToString(<ProductGalleryBlock variant="cards" data={data} />);
  expect(html).not.toContain("Adjust query filters");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: any changed diagnostic fields must remain
  schema-owned.
- Anti-abuse: no raw media IDs should be exposed as user-facing public copy by
  default. Diagnostics must be explicit and safe.
- Secret handling: diagnostics must not include provider secrets, private media
  URLs, or privileged commerce settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-04_Product_Gallery_Editor_Mode_Empty_State_and_Technical_Hints.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Wizard and Visual no longer duplicate Product Gallery surface fields.
- Empty-state description can be intentionally blank.
- Media-hint behavior is diagnostic, non-misleading, and not exposed as raw
  production copy by default.
- Editors get a lightweight columns preview before saving.
- Focused tests prove editor mode ownership and runtime empty-state behavior.
