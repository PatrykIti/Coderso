# TASK-270-03: Gallery Mosaic Per-Item Media Presentation Fields

# FileName: TASK-270-03_Gallery_Mosaic_Per_Item_Media_Presentation_Fields.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Schema + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-02, TASK-270-01, TASK-270-02
**Status:** To Do

---

## Overview

Add Gallery Mosaic-specific per-item media authoring and presentation fields
for dedicated alt text, focal point, tile ratio override, and video poster
image.

This leaf does not own the shared current alt/caption fallback semantics, safe
media output, or autoplay controls. Those remain TASK-256. It adds optional
product fields that make Gallery Mosaic media composition more precise after the
shared accessibility and media contracts are stable.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:319,377` - BF-01 reports a
  missing dedicated `alt` field distinct from the visible caption text.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:226` - BF-13 reports video
  without poster image.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:329-331` - BF-11,
  BF-12, and BF-13 list object-position, per-item ratio, and poster image gaps.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:381,383` - summary repeats
  focus point and poster follow-ups. Responsive columns at line 382 belong to
  TASK-270-05.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:8` - per-image manual span is an
  Adapt option, preferably exposed as bounded presets instead of raw grid
  classes.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Extend `GalleryMosaicItem` and `galleryMosaicSchema` with bounded optional fields such as `alt`, `objectPosition`, `ratio`, and `poster`; normalize invalid values to defaults; use dedicated alt text when present; apply `object-position`, per-item ratio class, and video poster output without breaking existing payloads. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add Visual per-item controls for dedicated alt text, focal point/object position, optional item ratio override, and poster URL/media picker after TASK-270-01 media picker is available. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Add schema, normalizer, renderer, alt, poster, object-position, and per-item ratio coverage. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert editor controls patch the right item and preserve existing media fields. |
| `tests/unit/widgets/validator.test.ts` | Add mandatory schema validation coverage for accepting valid new fields, rejecting unknown nested `items[]` fields, and rejecting invalid enum values. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document the new optional fields and default behavior. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-11, BF-12, and BF-13 fixed or deferred with evidence. |

## Implementation Pseudocode

```ts
type GalleryMosaicObjectPosition = "center" | "top" | "bottom" | "left" | "right";
type GalleryMosaicItemRatio = "inherit" | GalleryMosaicRatio;

type GalleryMosaicItem = {
  id?: string;
  image?: string;
  video?: string;
  alt?: string;
  poster?: string;
  caption?: string;
  href?: string;
  objectPosition?: GalleryMosaicObjectPosition;
  ratio?: GalleryMosaicItemRatio;
};

function resolveGalleryMosaicObjectPosition(value: string | undefined): GalleryMosaicObjectPosition {
  if (value === "top" || value === "bottom" || value === "left" || value === "right") return value;
  return "center";
}

function resolveItemRatio(item: GalleryMosaicItem, sectionRatio: GalleryMosaicRatio) {
  return item.ratio && item.ratio !== "inherit" ? resolveGalleryMosaicRatio(item.ratio) : sectionRatio;
}

function resolveGalleryMosaicAltText(item: GalleryMosaicItem, index: number) {
  const explicitAlt = item.alt?.trim();
  if (explicitAlt) return explicitAlt;
  const caption = item.caption?.trim();
  return caption || `Gallery item ${index + 1}`;
}
```

Error handling:

- Invalid or legacy values normalize to safe defaults without deleting existing
  item media.
- `alt` is optional, trimmed, and plain-text only; it must not accept raw HTML
  or be backfilled from private media metadata.
- `poster` is optional and used only for video output.
- `objectPosition` maps to a bounded class/style owner; do not allow arbitrary
  CSS values or class names.
- Per-item ratio defaults to inherited section ratio and must not change the
  global style contract.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: existing authenticated admin session for page/template editing and
  unchanged public read-only runtime rendering.
- RBAC: existing page/template widget write permission; no new role or public
  capability.
- CSRF: unchanged admin write route protection; this leaf adds no route.
- Rate-limit bucket: unchanged admin write and public read buckets; no public
  write bucket.
- Reject-unknown validation: update `galleryMosaicSchema` with
  `additionalProperties: false` and add rejection coverage for unknown fields
  and invalid enum values.
- Anti-abuse: object-position and ratio are enum-backed. Poster URLs must follow
  the same safe-media behavior as image/video URLs.
- Secret handling: no private media ids, signed URLs, or storage credentials may
  be stored in widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-03_Gallery_Mosaic_Per_Item_Media_Presentation_Fields.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Existing Gallery Mosaic payloads still normalize and render.
- Individual items can store dedicated alt text without breaking the current
  TASK-256 fallback semantics when `alt` is absent.
- Individual items can override focal point and ratio through bounded options.
- Video items can provide a poster image without requiring a new public route.
- Tests prove schema acceptance, invalid-value rejection, normalization, editor
  patching, and runtime output.
