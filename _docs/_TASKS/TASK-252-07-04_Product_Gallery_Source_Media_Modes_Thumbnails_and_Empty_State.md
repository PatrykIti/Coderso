# TASK-252-07-04: Product Gallery Source Media Modes Thumbnails and Empty State

# FileName: TASK-252-07-04_Product_Gallery_Source_Media_Modes_Thumbnails_and_Empty_State.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Add product-gallery shared commerce source controls, media modes, backend-owned
thumbnail selection, and empty states first; product-id/catalog source
expansion, aspect-ratio controls, variant media, and lightbox/action behavior
stay Adapt-only while provider fetch remains backend-owned.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/product-gallery/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: shared commerce source controls, product media modes, backend-owned
  thumbnails, and empty states from
  `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md`; start from the current owner
  fields `source`, `fields`, `emptyState`, `style`, and `resolved`.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat
  aspect-ratio controls, carousel arrows/dots polish, variant media, lightbox,
  and quick-view/action behavior as conditional; implement only when
  schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `product-gallery`.
- `Visual`: `Source`, `Media mode`, `Thumbnails`, `Empty state`.
- `Advanced`: `Commerce diagnostics`, `Backend resolver mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/commerceWidgetShared.ts` when source fields extend the
  shared commerce widget source contract.
- `core/services/commerce/commerceWidgetRuntime.ts` when runtime product
  gallery source resolution changes.
- `core/services/commerce/commerceQueryService.ts` when runtime product query
  normalization needs new allowlisted source fields.
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-04_Product_Gallery_Source_Media_Modes_Thumbnails_and_Empty_State.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## New Files to Create

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`

## Implementation Pseudocode

```tsx
function normalizeProductGalleryData(data: ProductGalleryData): ProductGalleryData {
  return {
    source: normalizeCommerceWidgetSource(data.source, {
      limit: productGalleryDefaults.source?.limit ?? 8,
      sortField: "updatedAt",
      sortDir: "desc",
    }),
    media: normalizeProductGalleryMedia(data.media),
    fields: normalizeProductGalleryFields(data.fields),
    emptyState: normalizeProductGalleryEmptyState(data.emptyState),
    style: normalizeProductGalleryStyle(data.style),
    resolved: normalizeProductGalleryResolved(data.resolved),
  };
}

function ProductGalleryVisualEditor(props: WidgetEditorProps<ProductGalleryData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="product-gallery.source" title="Product source">
      <WidgetControlRow id="product-gallery.source.limit" label="Products" data-widget-control="product-gallery.source.limit">
        <NumberInput value={value.source?.limit ?? 8} onChange={(limit) => props.onChange(updateProductGallerySource(value, { limit }))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-gallery.source.sortField" label="Sort field" data-widget-control="product-gallery.source.sortField">
        <Select value={value.source?.sortField ?? "updatedAt"} onChange={(sortField) => props.onChange(updateProductGallerySource(value, { sortField }))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-gallery.media.mode" label="Media mode" data-widget-control="product-gallery.media.mode">
        <SegmentedControl value={value.media?.mode ?? "grid"} onChange={(mode) => props.onChange(updateProductGalleryMedia(value, { mode }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/productGallery.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Keep product source controls on the shared `CommerceWidgetSource` fields:
  `source.limit`, `source.search`, `source.collectionIds`, `source.status`,
  `source.sortField`, and `source.sortDir`. If a later implementation needs a
  product/catalog source mode beyond those fields, extend
  `commerceWidgetShared.ts`, `commerceWidgetRuntime.ts`, and
  `commerceQueryService.ts` first, then add editor controls and tests.
- Keep thumbnails backend-owned: `media.mode` and thumbnail selection may only
  render from resolved product/media asset payloads supplied by
  `commerceWidgetRuntime.ts`; if the resolver does not supply URL/alt metadata,
  the implementation must either add that resolver contract with tests or defer
  thumbnail rendering.
- Treat `media` as a new schema-owned field for this leaf. Do not coerce
  existing `style` fields into `media`; legacy payloads without `media` should
  normalize to the current rendered behavior.
- Keep aspect-ratio controls out of required scope for this leaf unless the same
  implementation adds schema/defaults/normalizer/render/editor/tests and updates
  the matrix to promote the field from Adapt.
- Refactor `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `product-gallery` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `product-gallery` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/productGallery.tsx`.
- Anti-abuse:
  - provider fetch remains backend-owned
  - provider keys and privileged commerce config must not enter widget data/browser cache

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when shared
  commerce query normalization changes.
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/_WIDGETS/README.md` with a `PRODUCT_GALLERY.md` entry before leaf
  completion.
- `_docs/_TASKS/TASK-252-07-04_Product_Gallery_Source_Media_Modes_Thumbnails_and_Empty_State.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `_docs/_WIDGETS/README.md` includes the `PRODUCT_GALLERY.md` entry before
  this leaf is marked `Done`.
- `product-gallery` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
