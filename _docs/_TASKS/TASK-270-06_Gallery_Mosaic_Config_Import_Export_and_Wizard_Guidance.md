# TASK-270-06: Gallery Mosaic Config Import Export and Wizard Guidance

# FileName: TASK-270-06_Gallery_Mosaic_Config_Import_Export_and_Wizard_Guidance.md

**Priority:** Low
**Category:** Widgets + Gallery Mosaic + Admin UI + Authoring Workflow
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-06-02, TASK-270-01, TASK-270-02, TASK-270-03, TASK-270-05
**Status:** To Do

---

## Overview

Add Gallery Mosaic configuration import/export and update Wizard guidance after
TASK-256 and earlier TASK-270 leaves define the final media and presentation
model.

This leaf does not own Wizard video picker functionality from TASK-256-06-02.
It may add copy or guidance only to explain the final product workflow and must
not create an alternate schema parser outside the widget owner module.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:310-312` - UX-07 reports
  Wizard video support is missing. Implementation stays in TASK-256-06-02; this
  leaf may update guidance after that lands.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:334` - BF-16 requests
  gallery configuration import/export.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/galleryMosaic.tsx` | Add pure import/export helpers only if the widget owner needs them, using `normalizeGalleryMosaicData` and schema-owned fields as the only accepted payload boundary. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add copy/export/import controls in a bounded editor section; parse pasted JSON defensively; normalize valid payloads; display machine-readable import errors without leaking raw stack traces. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Add pure helper tests for export shape, import normalization, invalid payload rejection, and legacy payload compatibility if helpers are added. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert import/export controls render, valid import patches data, invalid import is non-destructive, and Wizard guidance reflects final TASK-256 media behavior. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document import/export behavior, accepted payload scope, and Wizard guidance. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark BF-16 fixed or deferred and record TASK-256 ownership for Wizard video behavior. |

## Implementation Pseudocode

```ts
type GalleryMosaicImportResult =
  | { ok: true; data: GalleryMosaicData }
  | { ok: false; code: "gallery_mosaic_import_invalid_json" | "gallery_mosaic_import_invalid_payload" };

function exportGalleryMosaicConfig(data: GalleryMosaicData): string {
  return JSON.stringify(normalizeGalleryMosaicData(data), null, 2);
}

function importGalleryMosaicConfig(source: string): GalleryMosaicImportResult {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (!isGalleryMosaicLikePayload(parsed)) {
      return { ok: false, code: "gallery_mosaic_import_invalid_payload" };
    }
    return { ok: true, data: normalizeGalleryMosaicData(parsed) };
  } catch {
    return { ok: false, code: "gallery_mosaic_import_invalid_json" };
  }
}
```

Error handling:

- Invalid JSON or unknown payload shape must be rejected without mutating the
  current widget data.
- Import helpers must call the widget normalizer rather than duplicating field
  defaults in the editor.
- Export output includes only schema-owned public widget data, never editor-local
  media picker ids, private URLs, diagnostics, or screenshots.
- If import/export belongs in a future shared widget-template helper by the time
  this leaf starts, split that shared helper first instead of adding a one-off
  generic framework inside Gallery Mosaic.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing.
- Reject-unknown validation: imports must reject unknown top-level fields and
  normalize through the schema owner before persistence.
- Anti-abuse: imported JSON cannot contain scripts, raw HTML, arbitrary classes,
  or private media tokens.
- Secret handling: export/import payloads must not include provider keys, signed
  URLs, local file paths, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-06_Gallery_Mosaic_Config_Import_Export_and_Wizard_Guidance.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Valid Gallery Mosaic config can be exported and re-imported without losing
  schema-owned data.
- Invalid imports are rejected with visible, non-destructive editor errors.
- Wizard guidance reflects the final TASK-256 media contract without owning that
  shared fix.
