# TASK-213-06-02: Content Media and Rich Text Quick Setup Upgrades
# FileName: TASK-213-06-02_Content_Media_and_Rich_Text_Quick_Setup_Upgrades.md

**Priority:** Medium
**Category:** Content Widgets + Media + Rich Text + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-213-06, TASK-206
**Status:** To Do

---

## Overview

Fix the quick-setup gaps for non-commerce content widgets from the per-widget
audit.

The report calls out:

- Gallery Mosaic exposes only count/layout, not media selection;
- Rich Text Section exposes raw `Body HTML` in Wizard;
- Posts Feed has improved source/display controls in the current checkout, but
  still needs explicit verification for title/layout quick setup before closing
  the source-report note;
- Content List and Entry Teaser are mostly source selectors; verify whether
  routine source/count/layout choices are clear enough or add bounded helper
  controls through existing schema fields;
- CTA Banner hides secondary CTA/description/eyebrow from quick setup;
- Compare Timeline exposes axis count without enough quick context for track
  labels/steps;
- Split Layout/Stack lack slot labels or helper copy in Wizard;
- Toggle Block lacks default active pane control;
- Footer social quick setup is fixed to two social links.

This leaf should upgrade common editor flows without turning Wizard into
Advanced. Raw payload/HTML remains technical and belongs in Advanced.

Current repo verification:

- `core/admin/ui/media/MediaPicker.tsx` and `listMediaCached` already provide a
  shared media selection/cache seam.
- `core/widgets/core/galleryMosaic.tsx` currently stores `image`/`video` URL
  strings and renders them directly. Picker work must not blindly persist media
  ids into those URL fields.
- `core/widgets/core/richTextSection.tsx` already owns `body.blocks`,
  `outputMode`, `normalizeRichTextBlocks`, and `sanitizeRichTextHtml`; reuse
  those seams before adding a new rich-text abstraction.

## Sub-Tasks

No child task files.

## Files to Change

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
- `core/admin/services/mediaClient.ts` for existing media cache reads only if
  Gallery Mosaic needs to resolve selected media records
- `core/widgets/core/galleryMosaic.tsx`
- `core/widgets/core/richTextSection.tsx`
- `core/widgets/core/postsFeed.tsx`
- `core/widgets/core/ctaBanner.tsx`
- related widget normalizers when schema/defaults change
- `tests/vitest/ui/media-picker.test.tsx` only if shared picker/cache behavior
  changes
- `tests/vitest/widgets/galleryMosaic.test.tsx`
- `tests/vitest/widgets/richTextSection.test.tsx`
- existing `tests/unit/widgets/postsFeedWidget.test.tsx`
- new focused Vitest Posts Feed editor/widget suite only if the changed module
  remains Bun-free and does not import runtime/server adapters at module load
- `tests/vitest/widgets/ctaBanner.test.tsx`
- layout/footer/toggle widget suites when touched.

## Implementation Direction

Use existing editor/picker seams before adding new abstractions.

Rich text:

```tsx
// Wizard owns structured content blocks.
<RichTextQuickEditor
  value={normalized.body?.blocks}
  onChange={(blocks) => update({ body: { ...body, blocks } })}
/>

// Advanced can keep sanitized raw HTML.
<Textarea label="Raw HTML" ... />
```

Gallery media:

```tsx
<MediaPicker
  value={normalized.items.map((item) => item.mediaId).filter(Boolean)}
  multiple
  maxItems={galleryMosaicItemMax}
  onChange={(mediaIds) => updateItemsFromMediaIds(mediaIds)}
/>
```

Posts Feed:

```tsx
<Input label="Section title" ... />
<Select label="Item count" ... />
<Select label="Layout" ... />
```

Dynamic content widgets:

```tsx
<SourcePicker label="Listing query" ... />
<Select label="Layout" ... />
<Input label="Visible items" type="number" min={1} max={24} ... />
```

Compare Timeline:

```tsx
<Input label="Track 1 label" ... />
<Input label="Track 2 label" ... />
<Select label="Axis step count" ... />
```

For Gallery Mosaic, first choose the storage contract:

1. Add schema-owned `mediaId` fields and a safe runtime/public URL resolver; or
2. Map selected records to sanitized public URLs through the existing media
   client/cache.

Do not store full media records, private delivery URLs, or unresolved picker ids
inside `image`/`video` fields.

For Rich Text Section, a Posts editor adapter may be reused only if the import
stays Bun-free and its output is normalized back into `RichTextSectionData`
(`body.blocks`/`body.html`), not persisted as a post document.

## Security Contract

- Visibility: internal admin editors; normalized output may render publicly.
- Auth model: existing admin session/API-key reads for media/posts/content.
- RBAC: existing media/content read permissions.
- CSRF: no write route changes unless picker changes introduce writes.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation:
  - new structured fields must be added to owner schema and normalizer before
    editor exposure;
  - raw HTML remains sanitized before runtime rendering.
- Anti-abuse:
  - no private media URLs, secrets, provider keys, form nonces, or unsanitized
    HTML in persisted widget data;
  - public runtime must not execute scripts or unsafe URLs from rich text.

## Testing Requirements

- Widget suites cover:
  - Gallery Mosaic media picker output normalization;
  - Gallery Mosaic public rendering resolves picked media safely or persists
    sanitized public URLs without private delivery data;
  - Rich Text Section structured quick editor and raw HTML sanitizer path;
  - Posts Feed title/count/layout quick fields through the existing Bun-owned
    widget suite and any added Bun-free Vitest editor suite;
  - Content List and Entry Teaser current-state verification or explicit
    source/count/layout helper upgrades;
  - CTA secondary/description/eyebrow quick fields if added;
  - Compare Timeline track labels plus axis count context;
  - Toggle default active pane;
  - Footer social add/remove within max bounds.
- Manual Playwright:
  - add Gallery Mosaic and pick media without raw IDs;
  - edit Rich Text without raw HTML for routine content;
  - verify Content List, Entry Teaser, Posts Feed, and Compare Timeline either
    expose clear quick setup or are explicitly deferred in the source report;
  - verify upgraded quick controls do not duplicate Advanced-only controls.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- affected `_docs/_WIDGETS/*` docs
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if media picker cache
  behavior changes.

## Acceptance Criteria

1. Routine content/media/rich-text quick setup no longer depends on raw IDs or
   raw HTML for common flows.
2. Wizard remains focused and does not duplicate full Advanced payload editing.
3. New fields are schema-owned, normalized, and public-runtime safe.
