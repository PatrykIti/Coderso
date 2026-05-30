# TASK-343-23: Gallery Mosaic Audit Remediation Family

# FileName: TASK-343-23_Gallery_Mosaic_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Admin Preview + A11y + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close Gallery Mosaic drift where the admin lightbox markup does not auto-bind in
CSR preview, the section lacks an accessible name, and count reduction can cause
silent non-recoverable media/content loss when the count is restored.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_GALLERY_MOSAIC_WIDGET.md:200-214`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/widgets/core/galleryMosaic.tsx`

## Sub-Tasks

- [x] Provide admin-preview lightbox binding or clear non-interactive preview
  messaging for lightbox-enabled variants.
- [x] Add accessible section naming in admin and public output.
- [x] Add destructive-state confirmation/recovery for count reductions that
  discard tile media, links, or captions.
- [x] Apply the guard to Wizard count changes too; current Visual confirmation
  alone is insufficient if Wizard count can still truncate without recovery.
- [x] Fix singular/plural link-warning copy while touching the affected summary.
- [x] Explicitly route report notes N3/N6/N8/N9 as deferred/product decisions if
  they are not fixed in this family.

## Implementation Notes

- Added domain-owned count-reduction summary helpers so Wizard and Visual share
  the same destructive warning and regression contract.
- Wizard and Visual count controls now open `ConfirmActionDialog` before
  reducing authored tiles. The dialog names removed tiles, explains that media,
  captions, alt text, posters, and destinations are removed from saved data, and
  states that increasing the count again creates placeholders rather than
  restoring discarded content.
- Lightbox mode now shows explicit admin-preview messaging: the editor canvas
  renders static lightbox markup, while published pages bind the runtime script.
- Gallery Mosaic sections now render `aria-labelledby` when a heading exists and
  `aria-label="Gallery"` when no visible heading exists.
- Fixed the singular link/lightbox copy (`uses` / `keeps`) and removed the
  duplicate `grid grid-cols-1` classes from `feature-left` containers.
- Routed N3 (overlay alpha discoverability), N8 (Wizard discoverability), and
  N9 (multi-widget fixture caveat) as explicit deferred/product notes; N6 was
  fixed in this family.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add count-reduction guard and preview-runtime guidance. |
| `core/widgets/core/galleryMosaic.tsx` | Add accessible naming and reconcile admin lightbox binding path. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Cover accessible naming, count-reduction semantics, and lightbox markup/binding contract. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Cover destructive count guard and preview guidance. |

## Implementation Pseudocode

```ts
function updateGalleryItemCount(current: GalleryMosaicData, nextCount: number) {
  if (nextCount < current.items.length && hasAuthoredTileData(current.items.slice(nextCount))) {
    return { mode: "confirm_truncate", nextCount };
  }
  return { mode: "apply", data: resizeGalleryItems(current, nextCount) };
}

function resolveGalleryMosaicA11y(data: GalleryMosaicData, blockId: string) {
  const titleId = data.title ? `gallery-mosaic-${blockId}-title` : undefined;
  return titleId ? { "aria-labelledby": titleId } : { "aria-label": "Gallery" };
}
```

## Regression Test Shape

- Lightbox-enabled admin previews either bind or clearly say they are static.
- Reducing/restoring count does not silently discard authored tile data from
  either Visual or Wizard count controls.
- Section naming exists with and without a visible heading.

## Security Contract

No API routes are added. Media, link, and lightbox script safety policies must
remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_GALLERY_MOSAIC_WIDGET.md`.
- Update `_docs/_WIDGETS/GALLERY_MOSAIC.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Gallery Mosaic preview/runtime and destructive count behavior are truthful.
- Gallery Mosaic sections expose accessible names.
