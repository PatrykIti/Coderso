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

- Product Gallery, Product Compare, and Product Table should use the same Radix
  Select/combobox primitives as the rest of widget wizards.
- Current code review shows Listing Filters and Search Box already use the
  shared Radix Select primitives; their remaining report-owned issue is the
  loading/empty state covered by `TASK-213-01-02`.
- Commerce widgets should not ask editors to type raw collection IDs as CSV when
  the existing commerce collection client/cache can back a typed selector.
- Gallery Mosaic should provide a media-selection quick path instead of only a
  count control.
- Rich Text Section should not force routine content editing through raw
  `Body HTML` when structured/rich text editor seams exist elsewhere.
- Posts Feed, Content List, Entry Teaser, CTA Banner, Compare Timeline, Split
  Layout, Stack, Toggle Block, Footer social links, and related widgets need
  bounded quick-setup verification/upgrades where the QA report found
  underpowered or overly fixed wizard controls.

The business outcome is a consistent widget-editor experience where normal
content choices are made through typed controls and pickers, while Advanced
remains reserved for technical/raw payload work.

## Sub-Tasks

- `TASK-213-06-01_Commerce_Product_Radix_Select_and_Collection_Picker.md`
- `TASK-213-06-02_Gallery_Mosaic_Media_Picker_Quick_Setup.md`
- `TASK-213-06-03_Rich_Text_Section_Quick_Editor.md`
- `TASK-213-06-04_Dynamic_Content_Source_Quick_Setup.md`
- `TASK-213-06-05_CTA_and_Compare_Timeline_Quick_Fields.md`
- `TASK-213-06-06_Layout_Navigation_Helper_Controls.md`

## Files to Change

- Commerce/product editors:
  - `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - `core/admin/services/commerceClient.ts` for existing
    `listCommerceCollectionsCached` reuse only; avoid adding a parallel client
  - `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx` as the
    existing checkbox-picker behavior reference, not necessarily as a direct
    dependency
  - `core/widgets/core/commerceWidgetShared.ts`
  - `core/widgets/core/productGallery.tsx`
  - `core/widgets/core/productCompare.tsx`
  - `core/widgets/core/productTable.tsx`
- Media/rich-text/dynamic-content/layout editors:
  - `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
  - `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
  - `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
  - `core/admin/ui/widgets/editors/ContentListEditors.tsx`
  - `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
  - `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
  - `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
  - `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
  - `core/admin/ui/widgets/editors/StackEditors.tsx`
  - `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
  - `core/admin/ui/widgets/editors/FooterEditors.tsx`
  - `core/admin/ui/media/MediaPicker.tsx` as the existing media picker seam
  - `core/admin/services/mediaClient.ts` for existing media cache reads only;
    avoid adding a second media cache path
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

Collection picking must reuse the current commerce collection cache:

```ts
const collections = await listCommerceCollectionsCached({ force: false });

onCollectionToggle(id) {
  updateSource({ collectionIds: toggle(normalized.collectionIds, id) });
}
```

For Gallery Mosaic, do not write raw `MediaPicker` ids into the existing
`image`/`video` URL fields unless runtime rendering can resolve them safely.
Either add schema-owned `mediaId` fields plus a runtime resolver, or map selected
media to a safe public URL through the existing media client/cache. Private
delivery URLs and full media records must not be persisted in widget data.

For Rich Text Section, prefer the existing `body.blocks`, `outputMode`, and
`sanitizeRichTextHtml` seams before adding a new editor dependency. If the Posts
rich-text adapter is reused, keep it Bun-free at import time and adapt its output
through the Rich Text Section normalizer instead of persisting post-editor block
documents.

For dynamic-content, CTA/Compare, and layout/navigation helper work, keep each
leaf bounded to its named widget set. Current-state verification is acceptable
only when `TASK-213-07-01` records exact code references and the source report
keeps any remaining valid work under an implementation owner.

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
  - `tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
  - equivalent UI wave tests if added for compare/table.
- Media/rich-text/dynamic-content/layout widgets:
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/ui/media-picker.test.tsx` only if shared picker/cache
    behavior changes
  - `tests/vitest/widgets/richTextSection.test.tsx`
  - existing current command surface:
    `tests/unit/widgets/postsFeedWidget.test.tsx`
  - add a focused Vitest Posts Feed editor/widget suite only if the changed
    production module stays Bun-free and the suite can run without runtime
    coupling
  - `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
  - `tests/vitest/ui/content-list-editor-wave.test.tsx`
  - `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
  - `tests/vitest/widgets/ctaBanner.test.tsx`
  - `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `tests/vitest/widgets/compareTimeline.test.tsx`
  - `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
  - `tests/vitest/widgets/splitLayout.test.tsx`
  - `tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `tests/vitest/widgets/stack.test.tsx`
  - `tests/vitest/ui/stack-editor-wave.test.tsx`
  - `tests/vitest/widgets/toggleBlock.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
  - `tests/vitest/ui/footer-editor-wave.test.tsx`
- Manual Playwright:
  - product widgets use shared select styling and keyboard behavior;
  - Listing Filters/Search Box are verified as current-state Radix controls
    while their empty-state behavior is covered by `TASK-213-01-02`;
  - collection/media pickers do not require raw ID/CSV typing for common flows;
  - dynamic-content quick setup makes source/count/layout limits explicit or
    records current-state deferral with owner and reason;
  - Rich Text Section routine editing is not raw HTML-only.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- affected `_docs/_WIDGETS/*` files
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if picker data adds new
  cached clients
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Commerce/product widget wizards use the shared Radix control pattern.
2. Normal editors can pick collections/media/content without raw CSV/ID typing
   for common flows.
3. Raw HTML/technical payload editing is moved or kept in Advanced, not forced
   as the primary Wizard experience.
4. Picker outputs remain schema-owned, sanitized, and public-runtime safe.
