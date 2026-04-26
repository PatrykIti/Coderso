# TASK-213-06: Widget Editor Control Unification and Picker Upgrades
# FileName: TASK-213-06_Widget_Editor_Control_Unification_and_Picker_Upgrades.md

**Priority:** Medium
**Category:** Widget Editors + Commerce + Content + Media
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-206, TASK-208
**Status:** To Do

---

## Overview

Repair the broader editor consistency and picker gaps from the Widget Library
audit:

- Product Gallery, Product Compare, Product Table, Listing Filters, and Search
  Box should use the same Radix Select/combobox primitives as the rest of widget
  wizards.
- Commerce widgets should not ask editors to type raw collection IDs as CSV when
  a picker can use existing commerce/listing data.
- Gallery Mosaic should provide a media-selection quick path instead of only a
  count control.
- Rich Text Section should not force routine content editing through raw
  `Body HTML` when structured/rich text editor seams exist elsewhere.
- Posts Feed, CTA Banner, Split Layout, Stack, Toggle Block, Footer social links,
  and related widgets need bounded quick-setup upgrades where the QA report
  found underpowered or overly fixed wizard controls.

The business outcome is a consistent widget-editor experience where normal
content choices are made through typed controls and pickers, while Advanced
remains reserved for technical/raw payload work.

## Sub-Tasks

- `TASK-213-06-01_Commerce_Product_Radix_Select_and_Collection_Picker.md`
- `TASK-213-06-02_Content_Media_and_Rich_Text_Quick_Setup_Upgrades.md`

## Files to Change

- Commerce/product editors:
  - `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - `core/widgets/core/commerceWidgetShared.ts`
  - `core/widgets/core/productGallery.tsx`
  - `core/widgets/core/productCompare.tsx`
  - `core/widgets/core/productTable.tsx`
- Content/media/rich-text editors:
  - `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
  - `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
  - `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
  - `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
  - `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
  - `core/admin/ui/widgets/editors/StackEditors.tsx`
  - `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
  - `core/admin/ui/widgets/editors/FooterEditors.tsx`
- Supporting picker clients only if existing clients are insufficient:
  - `core/admin/services/mediaClient.ts`
  - commerce/listing client modules used by current product widgets
- Relevant widget and UI wave tests.

## Implementation Direction

First standardize controls without changing stored data. Then add richer pickers
behind existing normalized shapes.

Pseudocode for a shared select field:

```tsx
function WidgetSelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-1 text-sm">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
```

Pseudocode for collection IDs:

```ts
type CommerceSource = {
  mode: "all" | "collection" | "manual";
  collectionIds?: string[];
};

onCollectionToggle(id) {
  updateSource({ collectionIds: toggle(normalized.collectionIds, id) });
}
```

For Rich Text Section, prefer existing structured block controls before adding a
new editor dependency. Raw HTML can remain in Advanced as the technical escape
hatch.

## Security Contract

- Visibility:
  - editor controls are internal admin only;
  - normalized widget output may render publicly.
- Auth model:
  - existing admin session/API-key path for media/commerce/listing selector
    reads.
- RBAC:
  - existing media/commerce/listing read permissions for picker data;
  - existing page/template write permissions for saved widget data.
- CSRF: no write route changes unless picker selections add mutations; any
  write must keep CSRF.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation:
  - picker outputs must normalize to existing arrays/enums before persistence;
  - any new structured rich-text/media field must be added to owner schema and
    normalizer before editor exposure.
- Anti-abuse:
  - do not store private media URLs, provider secrets, form nonces, or raw
    commerce/listing payloads in widget data;
  - sanitize rich text using the existing rich-text/html sanitizer path;
  - public runtime must not render executable HTML or unsafe URLs.

## Testing Requirements

- Product widgets:
  - `tests/vitest/widgets/productGallery.test.tsx`
  - `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
  - equivalent UI wave tests if added for compare/table.
- Content/media/rich-text widgets:
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/widgets/richTextSection.test.tsx`
  - `tests/vitest/widgets/postsFeed.test.tsx` if present or a new focused
    suite if missing
  - `tests/vitest/widgets/ctaBanner.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
- Manual Playwright:
  - product widgets use shared select styling and keyboard behavior;
  - collection/media pickers do not require raw ID/CSV typing for common flows;
  - Rich Text Section routine editing is not raw HTML-only.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- affected `_docs/_WIDGETS/*` files
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if picker data adds new
  cached clients
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Product/listing widget wizards use the shared Radix control pattern.
2. Normal editors can pick collections/media/content without raw CSV/ID typing
   for common flows.
3. Raw HTML/technical payload editing is moved or kept in Advanced, not forced
   as the primary Wizard experience.
4. Picker outputs remain schema-owned, sanitized, and public-runtime safe.
