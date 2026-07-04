# TASK-481-03-L01: Live Site Palette in the Inline Text-Color Toolbar

# FileName: TASK-481-03-L01-Live-Palette-Inline-Text-Color-Toolbar.md

**Parent Subtask:** TASK-481-03
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

**Goal:** Make the inline (per-fragment) text-color toolbar preview the LIVE site
palette and render its swatches by resolved `previewValue`, so inline previews agree
with the block-level control and with the now-WYSIWYG in-canvas brand render.

Today the inline toolbar uses a module-level constant
`inlineTextMarkPalette` (`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`:197)
built from `getPageEditorColorPalette()` with **no tokens** (= `DEFAULT_TOKENS`),
filtered to the four brand ids `["primary","secondary","accent","border"]`. The
block/section controls instead read the live `sitePalette` via
`PageEditorColorPaletteContext` (`PageEditor.tsx`:415) and preview each swatch by
`swatch.previewValue`. This leaf threads the same live palette into the inline
toolbar and renders inline swatches by `previewValue`, keeping the brand-id filter.

**Owning module(s) to create-or-extend:**
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` — the inline mark toolbar
  inside `InlineEditableCanvasText` (`markToolbar`, swatch loops ~463 and ~529) and
  the static `inlineTextMarkPalette` (:197).
- Shared palette context access: either export `PageEditorColorPaletteContext` /
  `usePageEditorColorPalette` from a module both files can import, OR pass the live
  palette down as a `SectionCanvas` → `InlineEditableCanvasText` prop. (See note.)

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md` (token swatches commit `var(--color-*)` while previewing
  the resolved site token).
- `_docs/PAGE_MODEL.md` (inline text marks: `color`/`highlight`).

**Out-of-scope:** Changing which marks/ids are offered inline (keep the existing
brand-id filter + its neutral-exclusion rationale at :193–199); the block-level
control; any sanitizer change.

## Security Contract

Not a route/auth/data leaf — N/A by surface, stated explicitly:
- **Endpoint / Auth / RBAC / CSRF / rate-limit:** none / unchanged. Inline mark
  application (`applyMark`) is an in-memory editor edit; persistence uses the existing
  page-save path (untouched).
- **Validation:** the swatch `value` committed by a mark is still a fixed
  `var(--color-*)` token validated by `pageAuthoringSanitizers.ts`
  (`isAuthoringColorToken`); `previewValue` is display-only and never persisted. No
  validation owner change.
- **Secret/PII handling:** none.

## Implementation Pseudocode

```tsx
// PageAuthoringCanvas.tsx
// 1. Read the live palette where the toolbar renders (instead of the static const):
const colorPalette = usePageEditorColorPalette();           // shared context hook
const inlineSwatches = colorPalette.filter((s) =>
  ["primary", "secondary", "accent", "border"].includes(s.id));   // same filter as :197

// 2. Render each swatch by its resolved previewValue (NOT var()):
inlineSwatches.map((swatch) => (
  <button
    type="button"
    key={swatch.id}
    title={swatch.label}
    aria-label={`Text color ${swatch.label}`}
    data-page-editor-text-color-swatch={swatch.id}
    style={{ backgroundColor: swatch.previewValue ?? swatch.value }}   // live site value
    onClick={(event) => {
      event.preventDefault(); event.stopPropagation();                 // per-button only
      const range = resolveActiveMarkRange(); if (!range) return;
      applyMark({ blockId: block.id, propPath, type: "color",
                  from: range.from, to: range.to, color: swatch.value });   // commit var()
    }}
  />
));
```

Critical guardrails (memory `page-editor-color-toolbar-live-findings`):
- **Do NOT add a toolbar-wide `onMouseDown` `preventDefault`.** The shared cause of
  the broken real-input toolbar was a toolbar-root `onMouseDown` that swallowed focus
  for the URL input and the custom color picker. Keep the existing per-control
  handlers exactly as they are (the file already documents at :387–413 / :500–503 why
  the link URL input and the native color picker must NOT be `preventDefault`-ed).
- Swatch buttons keep their own `onClick` `preventDefault/stopPropagation` (selection
  range must survive the click) — that is per-button and is fine.
- Preserve focusability: do not wrap the swatches in a focus-stealing container.

Context-sharing note (pick the lower-risk option at implementation time):
- `PageEditorColorPaletteContext` (and `usePageEditorColorPalette`) currently live as
  module-local consts in `PageEditor.tsx` (:415/:418) and are NOT exported.
  `PageAuthoringCanvas.tsx` is rendered inside the provider (`PageEditor.tsx`:3124),
  so the cleanest path is to MOVE the context + hook into a shared module (e.g.
  `core/services/pages/pageEditorControlUiModel.ts`, which already owns
  `getPageEditorColorPalette` and `PageEditorColorSwatch`) and import it from both
  files. Alternatively, thread the live palette as a prop. Do NOT duplicate a second
  context.
- **Error handling:** none — presentational; no domain codes / `map*Error`.

**Regression-test shape:** render the inline toolbar inside a palette provider seeded
with a non-default site palette; assert swatch backgrounds use site `previewValue`
(not `DEFAULT_TOKENS`); assert the committed mark color is the `var(--color-*)` token;
assert no toolbar-root `onMouseDown preventDefault` and that the URL input is
focusable.

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/shared-color-control.test.tsx` (+ inline-toolbar
  cases may also extend `tests/vitest/ui/page-authoring-canvas.test.tsx`).
- Cases: live `previewValue` swatch rendering; brand-id filter preserved; committed
  value is the token; focusability/no-toolbar-wide-preventDefault guard.
- No DB migration artifacts.
