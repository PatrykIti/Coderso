# TASK-270-05: Gallery Mosaic Responsive Columns and Motion Presets

# FileName: TASK-270-05_Gallery_Mosaic_Responsive_Columns_and_Motion_Presets.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Layout + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-06-02, TASK-270-03, TASK-270-04
**Status:** To Do

---

## Overview

Add bounded Gallery Mosaic presentation presets for responsive columns and tile
entrance motion.

This leaf must not duplicate shared truthful-control repairs from TASK-256. It
adds new Gallery Mosaic-specific options only after current variant/layout
behavior is truthful and stable.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:332-333` - BF-14 and BF-15
  request entrance animation and breakpoint column configuration.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:382` - summary repeats
  breakpoint column configuration.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:7-8` - hover/motion effects and
  per-image layout spans are Adapt options, bounded by reduced-motion-safe
  presets and product-level choices.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Add bounded `responsiveColumns` and `motionPreset` fields if accepted; normalize defaults; map only approved presets to static classes/data markers; keep variant defaults backward compatible. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add Visual controls for responsive column preset and motion preset with reduced-motion copy. Keep Advanced limited to technical snapshot/normalization unless TASK-256 changes mode ownership. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Add normalizer and render coverage for responsive presets, invalid fallback, motion markers, and reduced-motion-safe class/data output. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert editor controls patch the new fields and do not overwrite variant or media item state. |
| `tests/vitest/widgets/renderer.test.tsx` | Update when shared renderer assertions include Gallery Mosaic output markers. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document supported column and motion presets. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-14 and BF-15 fixed or deferred with evidence. |

## Implementation Pseudocode

```ts
type GalleryMosaicResponsiveColumns = "auto" | "compact" | "balanced" | "dense";
type GalleryMosaicMotionPreset = "none" | "fade" | "slide-up";

function resolveResponsiveColumns(value: string | undefined): GalleryMosaicResponsiveColumns {
  if (value === "compact" || value === "balanced" || value === "dense") return value;
  return "auto";
}

function resolveMotionPreset(value: string | undefined): GalleryMosaicMotionPreset {
  if (value === "fade" || value === "slide-up") return value;
  return "none";
}

function getGalleryGridClasses(variant: GalleryMosaicVariantId, columns: GalleryMosaicResponsiveColumns) {
  if (columns === "auto") return getCurrentVariantGridClasses(variant);
  return galleryMosaicColumnPresetClasses[variant][columns];
}
```

Error handling:

- Unknown column or motion values fall back to current default output.
- Do not accept raw Tailwind class names or arbitrary breakpoint maps in widget
  data.
- Motion output must include a no-motion option and reduced-motion-safe classes
  or data markers.
- Changing columns must not make the report's already-tested mobile/tablet
  layout worse; keep single-column mobile default unless the preset explicitly
  documents otherwise.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new layout/motion fields must be enum-backed and
  reject unknown values.
- Anti-abuse: no raw CSS, raw class names, or arbitrary animation definitions in
  widget data.
- Secret handling: no diagnostics or private media data in output markers.

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
- `_docs/_TASKS/TASK-270-05_Gallery_Mosaic_Responsive_Columns_and_Motion_Presets.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Gallery Mosaic has bounded responsive column presets, not arbitrary class
  input.
- Motion presets are opt-in, reduced-motion safe, and off by default.
- Existing variants still render with current defaults when new fields are
  absent.
