# TASK-252-06-07: Gallery Mosaic Layout Captions Overlays and Alt Text

# FileName: TASK-252-06-07_Gallery_Mosaic_Layout_Captions_Overlays_and_Alt_Text.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Expose gallery mosaic layout presets, captions, overlays, and alt text while keeping carousel/lightbox as separate decisions.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/gallery-mosaic/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: layout presets, captions, overlays, image alt labels, media selection,
  and the current `header`, `items`, and `style` owner fields from
  `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md`; add schema-owned `altText`
  per gallery item in `core/widgets/core/galleryMosaic.tsx` while preserving
  the existing caption fallback for legacy payloads.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat lightbox/carousel behavior and richer media overlays as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `gallery-mosaic`.
- `Visual`: `Layout`, `Images`, `Captions`, `Overlay`, `Accessibility`.
- `Advanced`: `Media diagnostics`, `Legacy gallery mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/galleryMosaic.tsx`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/vitest/widgets/galleryMosaic.test.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-07_Gallery_Mosaic_Layout_Captions_Overlays_and_Alt_Text.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeGalleryMosaicData(data: GalleryMosaicData): GalleryMosaicData {
  return {
    header: normalizeGalleryMosaicHeader(data.header),
    items: normalizeGalleryMosaicItems(data.items),
    style: normalizeGalleryMosaicStyle(data.style),
  };
}

function normalizeGalleryMosaicItem(item: GalleryMosaicItem, index: number): GalleryMosaicItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `gallery-mosaic-${index + 1}`),
    altText: normalizeGalleryMosaicAltText(item.altText, item.caption),
  };
}

function GalleryMosaicVisualEditor(props: WidgetEditorProps<GalleryMosaicData>) {
  return (
    <WidgetEditorSection id="gallery-mosaic.items" title="Media items">
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`gallery-mosaic.items.${index}.caption`} label="Caption" data-widget-control={`gallery-mosaic.items.${index}.caption`}>
          <Input value={item.caption ?? ""} onChange={handleControlChange} />
        </WidgetControlRow>
        <WidgetControlRow key={`${item.id ?? index}-alt`} id={`gallery-mosaic.items.${index}.altText`} label="Alt text" data-widget-control={`gallery-mosaic.items.${index}.altText`}>
          <Input value={item.altText ?? ""} onChange={(altText) => props.onChange(updateGalleryMosaicItem(props.value, index, { altText }))} />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/galleryMosaic.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `gallery-mosaic` output is public page/runtime output.
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
  - changed `gallery-mosaic` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/galleryMosaic.tsx`.
- Anti-abuse:
  - Link and media fields must keep existing safe URL/media validation.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-07_Gallery_Mosaic_Layout_Captions_Overlays_and_Alt_Text.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `gallery-mosaic` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
