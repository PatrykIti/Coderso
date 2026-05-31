# TASK-312-02: Gallery Mosaic Shared Runtime Semantics Residuals

# FileName: TASK-312-02_Gallery_Mosaic_Shared_Runtime_Semantics_Residuals.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Shared Contract + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-312-01
**Status:** Done (2026-05-17)

---

## Overview

Finish the Gallery Mosaic shared runtime semantics and accessibility cleanup
that the `TASK-256-04` and `TASK-256-06-02` contracts already claimed, using
only the current data model.

Current checkout note: this leaf captures the shared runtime baseline before
the later `TASK-270` product rollout landed. References below to future
`TASK-270-*` scope are reopen-time boundaries only.

This leaf covers current shared semantics only:

- resolver/runtime cleanup for the existing ratio/gap/radius/featured logic;
- figure/figcaption semantics for current caption output;
- current video semantics such as accessible naming and stop/control behavior
  using existing fields only.

It must not absorb new product fields or new interaction models. At reopen
time, dedicated per-item `alt`, poster images, lightbox, and motion remained in
`TASK-270`.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:56-73` - CODE-01 through
  CODE-04 capture current resolver/runtime cleanup drift.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` - rows `A4`, `A5`, and
  `A6` capture the shared current-runtime accessibility/semantic gaps this leaf
  closed. The final live closure routes `A3` to `TASK-270-07`.
- `_docs/_TASKS/TASK-256-04_Interactive_Runtime_Instance_and_Accessibility_Contract.md`
  - shared runtime semantics must consume the established accessibility pattern.
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`
  - Gallery Mosaic current alt/figure/video semantics belong to the shared
  contract, while new authoring fields stayed in `TASK-270-03` at reopen time.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Make resolver defaults explicit, remove redundant featured/runtime classes, render current caption/media semantics through shared-accessible figure/video behavior, and settle current video control behavior without adding new schema fields. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Add focused coverage for explicit resolver fallbacks, feature-left/runtime cleanup, figure/figcaption semantics, and current video behavior. |
| `tests/vitest/widgets/renderer.test.tsx` | Extend shared renderer assertions for Gallery Mosaic semantic/runtime markers when output structure changes. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document the settled shared runtime semantics that existed before the later `TASK-270` product fields landed. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Record the fixed/deferred status for the reopened current runtime semantics rows. |

## Implementation Pseudocode

```tsx
function resolveGalleryMosaicRatio(value: string | undefined): GalleryMosaicRatio {
  if (value === "1:1" || value === "4:3" || value === "16:9" || value === "3:4") return value;
  return "4:3";
}

function renderGalleryFigure(props: GalleryFigureProps) {
  const { media, caption, captionPosition, overlay, ids } = props;
  const figcaption =
    caption?.trim()
      ? (
          <figcaption id={ids.captionId}>
            {renderCaption({ caption, captionPosition, overlay })}
          </figcaption>
        )
      : null;

  return (
    <figure aria-labelledby={figcaption ? ids.captionId : undefined}>
      {media}
      {figcaption}
    </figure>
  );
}

function renderGalleryVideo(item: GalleryMosaicItem, accessibleCaption: string) {
  return (
    <video
      src={item.video}
      title={accessibleCaption}
      aria-label={accessibleCaption}
      controls
      playsInline
    />
  );
}
```

Error handling:

- Resolver cleanup must stay backward compatible and purely normalize current
  values; it must not invent new layout/product fields.
- Current video behavior must be accessible with the existing contract. If
  autoplay/loop is dropped or constrained, document that as a shared baseline
  correction rather than a new product toggle.
- Figure/figcaption semantics must remain deterministic for SSR output and must
  not duplicate visible caption text in multiple conflicting accessible-name
  paths.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged public read-only runtime rendering and authenticated
  admin editing.
- RBAC: unchanged page/template widget write permission.
- CSRF: unchanged admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged. This leaf uses only the current schema.
- Anti-abuse: keep shared safe-link/media output intact; do not introduce raw
  HTML, untrusted script URLs, or secret-bearing diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-312-02_Gallery_Mosaic_Shared_Runtime_Semantics_Residuals.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Current shared Gallery Mosaic runtime semantics are fixed using the existing
  data model only.
- Resolver/runtime cleanup no longer relies on implicit fall-through or
  redundant featured classes.
- Current caption/video semantics are accessible and test-covered before
  `TASK-270` adds new product-owned fields.

## Completion Notes

- 2026-05-17: Gallery Mosaic runtime now uses explicit resolver branches,
  semantic `figure/figcaption`, visible video controls, and no redundant
  per-card featured row-span for the current shared contract.
- Validation:
  - `set -a && source /Users/pciechanski/Documents/_moje_projekty/Coderso/.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/renderer.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict` (rerun on the host because sandbox trust-store/network blocked Semgrep and `bun audit`)
