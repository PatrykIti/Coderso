# TASK-481-03: Editor-Control Preview Unification

# FileName: TASK-481-03-Editor-Control-Preview-Unification.md

**Parent Task:** TASK-481
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-02 (site brand resolves in-canvas)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Once site brand resolves in the canvas (TASK-481-02), the inline text-color toolbar
must preview the SAME live site palette the block-level control already uses, so
inline + block-level + in-canvas brand all agree (no preview/apply mismatch).

Today the inline mark toolbar in
`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` builds its swatches from a
module-level constant `inlineTextMarkPalette` (line 197) computed from
`getPageEditorColorPalette()` with **no tokens** — i.e. `DEFAULT_TOKENS` — and
filtered to the four brand ids `["primary","secondary","accent","border"]`. The
block/section controls instead read the live `sitePalette` via
`PageEditorColorPaletteContext` (PageEditor.tsx:415) and preview each swatch by its
resolved `previewValue`. This subtask threads the live palette into the inline
toolbar and renders inline swatches by `previewValue` too, while strictly
preserving real-input focusability per memory
`page-editor-color-toolbar-live-findings` — no toolbar-wide `onMouseDown`
`preventDefault` (the existing per-button handlers stay as-is).

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-481-03-L01 | Thread live site palette into the inline text-color toolbar | Small | ⏳ To Do |
| TASK-481-03-L02 | Inline + block + in-canvas preview agreement test | Small | ⏳ To Do |

## Dependencies

- TASK-481-02 (the in-canvas brand value must already be the site value for the
  "agreement" to be meaningful).
- L01 → L02.
- Reuses `PageEditorColorPaletteContext` / `usePageEditorColorPalette`,
  `getPageEditorColorPalette`, `PageEditorColorSwatch.previewValue`.

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/shared-color-control.test.tsx`.
- Assert: inline swatches render from the live palette (site `previewValue`, not
  `DEFAULT_TOKENS`); the brand-id filter is preserved; the inline preview value,
  the block-level preview value, and the in-canvas resolved value agree for a brand
  token; focusability guard — no toolbar-root `onMouseDown` `preventDefault`
  regression (the URL input and custom color picker stay focusable/usable).
