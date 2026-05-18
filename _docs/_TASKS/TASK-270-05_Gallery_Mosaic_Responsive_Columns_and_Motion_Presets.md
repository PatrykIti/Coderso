# TASK-270-05: Gallery Mosaic Responsive Columns and Motion Presets

# FileName: TASK-270-05_Gallery_Mosaic_Responsive_Columns_and_Motion_Presets.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Layout + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-06-02, TASK-270-03, TASK-270-04
**Status:** Done (2026-05-18)

---

## Overview

Add bounded Gallery Mosaic presentation presets for variant-scoped responsive
layout density and tile entrance motion.

This leaf must not duplicate shared truthful-control repairs from TASK-256. It
adds new Gallery Mosaic-specific options only after current variant/layout
behavior is truthful and stable.
It intentionally resolves the report's breakpoint-column request through
approved density presets instead of arbitrary raw breakpoint maps. If a future
product decision needs explicit per-breakpoint column authoring, that must be
split to a separate task rather than claimed as silently completed here.

Landed implementation:

- `core/widgets/core/galleryMosaic.tsx` now owns schema-backed
  `style.layoutDensity` (`auto` / `compact` / `balanced` / `dense`) and
  `style.motionPreset` (`none` / `fade` / `slide-up`) with bounded,
  variant-scoped class maps and reduced-motion-safe motion classes.
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` adds Visual controls
  for density and motion and explicitly documents that Gallery Mosaic does not
  accept raw per-breakpoint column maps in widget data.
- Tests now cover normalizer fallback, deterministic data markers, motion-safe
  class output, editor patching, and strict validator rejection for invalid
  density/motion enums.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:332-333` - BF-14 and BF-15
  request entrance animation and breakpoint layout configuration.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:382` - summary repeats
  breakpoint column configuration.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:5,7-8` - responsive image grids
  are kept through existing variant mapping, not standalone raw column-count
  config; hover/motion effects and per-image layout spans are Adapt options,
  bounded by reduced-motion-safe presets and product-level choices.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Add bounded variant-scoped `layoutDensity` and `motionPreset` fields if accepted; normalize defaults; map only approved presets to static classes/data markers; keep existing variant defaults backward compatible. Do not add raw standalone column-count maps. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add Visual controls for layout density preset and motion preset with reduced-motion copy. Keep Advanced limited to technical snapshot/normalization unless TASK-256 changes mode ownership. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Add normalizer and render coverage for layout-density presets, invalid fallback, motion markers, and reduced-motion-safe class/data output. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert editor controls patch the new fields and do not overwrite variant or media item state. |
| `tests/vitest/widgets/renderer.test.tsx` | Update when shared renderer assertions include Gallery Mosaic output markers. |
| `tests/unit/widgets/validator.test.ts` | Add mandatory strict schema coverage for valid layout/motion presets and invalid enum rejection. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document supported variant-scoped layout density and motion presets. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-14 and BF-15 fixed or deferred with evidence. |

## Implementation Pseudocode

```ts
type GalleryMosaicLayoutDensity = "auto" | "compact" | "balanced" | "dense";
type GalleryMosaicMotionPreset = "none" | "fade" | "slide-up";

function resolveLayoutDensity(value: string | undefined): GalleryMosaicLayoutDensity {
  if (value === "compact" || value === "balanced" || value === "dense") return value;
  return "auto";
}

function resolveMotionPreset(value: string | undefined): GalleryMosaicMotionPreset {
  if (value === "fade" || value === "slide-up") return value;
  return "none";
}

function getGalleryGridClasses(variant: GalleryMosaicVariantId, density: GalleryMosaicLayoutDensity) {
  if (density === "auto") return getCurrentVariantGridClasses(variant);
  return galleryMosaicDensityPresetClasses[variant][density];
}
```

Error handling:

- Unknown layout-density or motion values fall back to current default output.
- Do not accept raw Tailwind class names or arbitrary breakpoint maps in widget
  data.
- Motion output must include a no-motion option and reduced-motion-safe classes
  or data markers.
- Changing layout density must not make the report's already-tested
  mobile/tablet layout worse; keep single-column mobile default unless the
  preset explicitly documents otherwise.

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
- Reject-unknown validation: new layout/motion fields must be enum-backed and
  reject unknown values, including unknown nested style keys.
- Anti-abuse: no raw CSS, raw class names, or arbitrary animation definitions in
  widget data.
- Secret handling: no diagnostics or private media data in output markers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change.
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-05_Gallery_Mosaic_Responsive_Columns_and_Motion_Presets.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Gallery Mosaic has bounded variant-scoped layout density presets, not
  arbitrary class input or standalone raw column maps.
- BF-15 closure evidence explicitly states that the shipped control is bounded
  density presets rather than a literal raw breakpoint-column matrix.
- Motion presets are opt-in, reduced-motion safe, and off by default.
- Existing variants still render with current defaults when new fields are
  absent.

## Completion Notes

- 2026-05-18: Gallery Mosaic now uses bounded `layoutDensity` presets instead
  of raw breakpoint maps and opt-in reduced-motion-safe `motionPreset`
  entrances.
- Validation:
  - `git diff --check`
  - `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/widgets/renderer.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
