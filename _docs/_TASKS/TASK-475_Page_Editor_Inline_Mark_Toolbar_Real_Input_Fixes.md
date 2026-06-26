# TASK-475: Page Editor Inline Mark Toolbar Real-Input Fixes
# FileName: TASK-475_Page_Editor_Inline_Mark_Toolbar_Real_Input_Fixes.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-469 (rich-text inline edit fidelity), TASK-471-03 (per-fragment color marks + inline toolbar), TASK-472-05 (bold/italic/link/highlight marks)
**Status:** ✅ Done
**Completed:** 2026-06-25

---

## Business Goal (umbrella)

The per-fragment inline text-mark toolbar shipped by TASK-471-03 / TASK-472-05 is
**not usable with a real mouse and keyboard**, even though its data model,
sanitizers, renderer, and unit tests are correct. Live verification in Chrome
(see audit `_TMP-PAGE-EDITOR-COLOR-TOOLBAR-LIVE-AUDIT-2026-06-25.md`) reproduced
the site owner's report: selecting a text fragment, then clicking a color swatch,
applies nothing ("zero reaction"), and the inline link URL field cannot be
focused or typed into. The previous tests passed only because they drove the
component with synthetic events wrapped in `flushSync`, which masks the real
asynchronous input timing.

This umbrella restores **real-input fidelity** so a non-technical author can
recolor a selected fragment and add an inline link with an ordinary mouse and
keyboard, on the canvas — exactly the flow TASK-471-03 promised.

## Bugs in scope (confirmed live)

1. **Swatch real-click is a no-op.** A real click reaches the swatch
   (`disabled=false`, click + mousedown both observed at the DOM), the DOM
   selection survives, yet `block.props.marks` stays empty and no
   `<span data-page-text-mark>` is produced. Affects color **and**
   bold/italic/link/highlight (identical control gate). → `TASK-475-01`.
2. **Inline link URL `<input>` cannot focus or accept text.** A real click leaves
   `document.activeElement` on the contentEditable; typing mutates the heading
   text instead of the input (`value` stays `""`). → `TASK-475-01`.

Both share one root cause: the toolbar wrapper's blanket `onMouseDown`
`preventDefault()` combined with the controls reading the asynchronously-cached
`selectionRange` React state instead of the live DOM selection. See `TASK-475-01`
for the full trace and fix.

## Capabilities delivered

- A real mouse click on any inline-mark control (color swatch, highlight swatch,
  bold/italic/link button) applies the mark to the **current selection**.
- The inline link URL input is focusable and typable; applying a link uses the
  typed URL.
- Entering text edit no longer needs a double-click: a **second single click** on
  a selected text block starts editing (caret at the click point), so the author
  can then drag-select a fragment in one natural motion. → `TASK-475-03`.
- Existing selection-preservation, fail-closed color/href sanitization, undo/redo
  history, and `disabled`-when-no-selection behavior are preserved.

## Children

| Child | Title | Status |
|-------|-------|--------|
| TASK-475-01 | Toolbar Selection Snapshot And Input Focus Fix | ✅ Done |
| TASK-475-03 | Single-Click-To-Edit And Drag-Select Entry | ✅ Done |
| TASK-475-02 | Validation, Docs, And Closure | ✅ Done |

## Success criteria

- On the canvas, with no code: double-click a heading/text/quote, select a
  fragment, click a color swatch → only that fragment recolors; click the link
  field, type a URL, apply → the fragment becomes a sanitized anchor.
- A regression test reproduces the real-input ordering (no `flushSync` masking)
  and fails on the current code, passes after the fix.
- `bun --cwd core lint`, `bun --cwd core lint:types`, and the Page authoring
  Vitest suites are green.

## Out of scope (separate follow-ups, not bugs)

These were surfaced by the same live audit but are UX enhancements, not the
reported breakage. Track separately if the owner wants them; do not fold into
TASK-475:

- No live mark feedback **while** editing (canvas shows plain text mid-edit by
  design: `PageAuthoringCanvas.tsx:221`).
- No active-color indicator on swatches (no `aria-pressed`/ring reflecting the
  mark at the caret).
- No full color picker (only 6 design-token swatches).
- The block-level panel "Text color" (`block.style.textColor`) vs the
  per-fragment mini-toolbar are visually undistinguished, which led the owner to
  use the block-level control and recolor the whole block (working as coded).

## References

- Live audit + root cause: `_TMP-PAGE-EDITOR-COLOR-TOOLBAR-LIVE-AUDIT-2026-06-25.md`
- Originating features: TASK-471-03, TASK-472-05, TASK-469.
