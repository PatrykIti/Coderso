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
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Make the inline (per-fragment) text-color toolbar preview the LIVE site
palette and render its swatches by resolved `previewValue`, so inline previews agree
with the block-level control and with the now-WYSIWYG in-canvas brand render.

Today the inline toolbar uses a module-level constant
`inlineTextMarkPalette` (`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`:214)
built from `getPageEditorColorPalette()` with **no tokens** (= `DEFAULT_TOKENS`)
at `PageAuthoringCanvasInline.tsx:186`, filtered to the four brand ids `["primary","secondary","accent","border"]`. The
block/section controls instead read the live `sitePalette` via
`PageEditorColorPaletteContext` (`PageEditor.tsx`:352) and preview each swatch by
`swatch.previewValue`. This leaf threads the same live palette into the inline
toolbar and renders inline swatches by `previewValue`, keeping the brand-id filter.

**Owning module(s) to create-or-extend:**
- `core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx` (post-481-01-L01 split; the
  facade `PageAuthoringCanvas.tsx` re-exports the inline contract but contains none of
  the toolbar code) — the inline mark toolbar inside `InlineEditableCanvasText`
  (`markToolbar` const at :449, swatch loops ~554 and ~620) and the static
  `inlineTextMarkPalette` (:186).
- Shared palette context access: either export `PageEditorColorPaletteContext` /
  `usePageEditorColorPalette` from a module both files can import, OR pass the live
  palette down as a `SectionCanvas` → `InlineEditableCanvasText` prop. (See note.)

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md` (token swatches commit `var(--color-*)` while previewing
  the resolved site token).
- `_docs/PAGE_MODEL.md` (inline text marks: `color`/`highlight`).

**Out-of-scope:** Changing which marks/ids are offered inline (keep the existing
brand-id filter + its neutral-exclusion rationale at ~208–213, const at :214); the
block-level control; any sanitizer change.

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
// PageAuthoringCanvasInline.tsx
// 1. Read the live palette where the toolbar renders (instead of the static const at :186):
const colorPalette = usePageEditorColorPalette();           // shared context hook
const inlineSwatches = colorPalette.filter((s) =>
  ["primary", "secondary", "accent", "border"].includes(s.id));   // same filter as :214

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
  handlers exactly as they are (the mark-toolbar `onMouseDown` handler at
  `PageAuthoringCanvasInline.tsx` ~:460-497 and the custom color picker note at
  ~:597-600 document why the link URL input and the native color picker must NOT be
  `preventDefault`-ed).
- Swatch buttons keep their own `onClick` `preventDefault/stopPropagation` (selection
  range must survive the click) — that is per-button and is fine.
- Preserve focusability: do not wrap the swatches in a focus-stealing container.

Context-sharing note (pick the lower-risk option at implementation time):
- `PageEditorColorPaletteContext` (and `usePageEditorColorPalette`) currently live in
  `PageEditorRegistryFields.tsx:73-77` (post-split); the provider is in
  `PageEditorRoot.tsx`. AUDITED CORRECTION (TASK-481-03-L01 pre-implementation
  audit, HIGH-1): the provider previously wrapped ONLY `ToolbarSubpanel`
  (`PageEditorRoot.tsx` ~:632), NOT the canvas subtree where `SectionCanvas` renders
  (~:428), so `usePageEditorColorPalette()` inside the inline toolbar would return
  the createContext DEFAULT (DEFAULT_TOKENS). The orchestrator widened the provider
  to wrap the WHOLE editor body (container div, ~:180-874) as a structural fix.
  The cleanest implementation path is now to MOVE the context + hook into a
  TASK-481-owned shared module (`core/services/pages/pageEditorColorPaletteContext.ts`
  — new, created here) and import it from `PageEditorRegistryFields.tsx`,
  `PageEditorRoot.tsx`, and `PageAuthoringCanvasInline.tsx`. Do NOT duplicate a
  second context. Do NOT move
  it into `core/services/pages/pageEditorControlUiModel.ts` — that module is
  exclusively owned by TASK-539-03-L01 (see TASK-539-03-L01 "Sole ownership") and is
  a forbidden path for this family. Editing here stays within the TASK-481 brand-token
  surface (split facade + `PageEditorRoot.tsx`/`PageAuthoringCanvas.tsx`); respect the
  single-writer collision guard with TASK-539-03-L03 (see the parent).
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
