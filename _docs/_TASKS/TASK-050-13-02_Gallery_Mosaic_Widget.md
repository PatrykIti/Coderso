# TASK-050-13-02: Gallery Mosaic Widget
# FileName: TASK-050-13-02_Gallery_Mosaic_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-13-01  
**Status:** To Do

---

## Overview

Implement Gallery Mosaic widget for visual storytelling and portfolio sections.

---

## Scope

- Widget ID: `gallery-mosaic`
- Variants: `mosaic`, `uniform-grid`, `feature-left`
- Model:
  - header: `title`, `description`
  - items[]: `image`, `video`, `caption`, `href`
  - style: `ratio`, `gap`, `radius`, `overlay`, `captionPosition`
- Wizard: variant + initial media count
- Visual: media management + overlay/caption controls
- Advanced: technical ratio/layout tokens

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/galleryMosaic.tsx` | new model/schema/defaults/render | deterministic media placement |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | new editors | media-focused Visual |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/galleryMosaic.test.tsx` | new tests | schema/defaults/render |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/galleryMosaic.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-gallery-mosaic-widget.md`
