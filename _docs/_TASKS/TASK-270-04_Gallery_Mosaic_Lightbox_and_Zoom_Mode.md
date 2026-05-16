# TASK-270-04: Gallery Mosaic Lightbox and Zoom Mode

# FileName: TASK-270-04_Gallery_Mosaic_Lightbox_and_Zoom_Mode.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-02, TASK-270-03
**Status:** To Do

---

## Overview

Add an optional Gallery Mosaic lightbox/zoom presentation mode using existing
safe runtime and accessibility patterns.

This leaf is product scope. It must not replace the TASK-256 safe link,
caption, alt, or video-control repairs. It may use those final contracts as the
baseline for lightbox labels, keyboard behavior, and media output.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:328` - BF-10 reports no
  lightbox or zoom option on click.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:380` - summary repeats
  lightbox/zoom as a medium-priority product gap.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:6` - lightbox/modal is Adapt
  only if an existing shared modal path can be reused.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Add a bounded `interaction` or `lightbox` config if no shared widget interaction owner already exists; render safe trigger attributes and deterministic data markers without inline unsafe scripts. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add Visual controls for lightbox disabled/enabled mode and any bounded zoom behavior; show when link behavior takes precedence if both href and lightbox are configured. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Assert lightbox-disabled default, lightbox-enabled markers, safe labels, and href precedence behavior. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert editor controls patch the lightbox config and explain interaction precedence. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer snapshot/markers need awareness of the new interaction output. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document lightbox behavior and accessibility expectations. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-10 fixed or deferred with implementation evidence. |

## Implementation Pseudocode

```ts
type GalleryMosaicInteractionMode = "none" | "lightbox";

type GalleryMosaicData = {
  interaction?: {
    mode?: GalleryMosaicInteractionMode;
  };
};

function resolveGalleryMosaicInteractionMode(value: string | undefined): GalleryMosaicInteractionMode {
  return value === "lightbox" ? "lightbox" : "none";
}

function getGalleryItemInteraction(item: GalleryMosaicItem, mode: GalleryMosaicInteractionMode) {
  if (item.href?.trim()) return { type: "link" as const };
  if (mode === "lightbox") return { type: "lightbox" as const };
  return { type: "none" as const };
}
```

Error handling:

- Existing `href` behavior remains non-destructive. If a gallery item has a link,
  the editor must explain that navigation wins over lightbox for that item or
  require an explicit user choice.
- Do not introduce a one-off global script if a shared runtime interaction
  helper exists by implementation time.
- Keyboard and focus behavior must be tested. If accessible lightbox behavior
  cannot be implemented without a shared runtime contract, split that shared
  helper out before landing this leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new interaction config must be schema-backed and
  reject unknown values.
- Anti-abuse: no raw HTML, unsafe inline event handlers, arbitrary selectors, or
  untrusted script URLs. Media in the lightbox uses the same safe-media output
  as inline tiles.
- Secret handling: lightbox state must not expose private media or local file
  paths.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-04_Gallery_Mosaic_Lightbox_and_Zoom_Mode.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Lightbox is opt-in and off by default for existing payloads.
- Lightbox behavior is accessible by keyboard and does not break link items.
- Runtime output remains deterministic, safe, and testable without committing
  screenshots.
