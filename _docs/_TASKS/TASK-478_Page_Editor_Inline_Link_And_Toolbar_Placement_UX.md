# TASK-478: Page Editor Inline Link And Toolbar Placement UX
# FileName: TASK-478_Page_Editor_Inline_Link_And_Toolbar_Placement_UX.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-475/476/477 (inline mark toolbar)
**Status:** ✅ Done
**Changelog:** 1307 (pinned; closure only)

---

## Business Goal (umbrella)

Owner-reported follow-ups on the inline mark toolbar after TASK-475..477, all
live-verified on the Home hero (2026-06-27):

1. **Inline links are invisible and uncontrollable.** Applying a URL to a text
   fragment produces an `<a>` with **no styling** (no underline, no color, no
   indicator), so the author cannot tell a link exists or which fragment carries
   it. → `TASK-478-01`.
2. **Inline links can't be edited or removed, and they hijack selection.** There
   is no "remove link" control; the URL field can't be cleared to unlink (Apply is
   disabled on empty); the field does not load an existing link's href for editing;
   and on the canvas the linked fragment is a live `<a>` that **navigates on click**
   (a beforeunload prompt fires), so the author can't click it to re-select and
   fix/remove it. → `TASK-478-02`.
3. **The toolbar (and the color picker it spawns) covers the text.** The inline
   mark toolbar is pinned above the text (`absolute -top-9`); when the native color
   picker opens it appears over the text. The owner wants a control to **dock the
   toolbar to the block's left/right side** so it (and the picker) does not occlude
   the text being colored. → `TASK-478-03`.

## Children

| Child | Title | Status |
|-------|-------|--------|
| TASK-478-01 | Inline Link Visual Feedback | ✅ Done (changelog 1307) |
| TASK-478-02 | Inline Link Edit, Remove, And Click-To-Select | ✅ Done (changelog 1307) |
| TASK-478-03 | Dockable Inline Mark Toolbar (Top/Left/Right) | ✅ Done (changelog 1307) |

## Success criteria

- A linked fragment is visually obvious in the editor (and consistent with the
  front), and the author can edit/remove it without fighting navigation.
- The author can move the mark toolbar off the top of the block so neither it nor
  the color picker covers the text.

## Evidence (implemented, committed 205c66a5, verified 2026-08-18)

Pre-implementation audit (2026-08-18, fresh context) confirmed the full feature
set already exists in committed source with tagged tests; the family is closed
as implemented via changelog 1307:

- Linked runs render with `PAGE_TEXT_LINK_MARK_CLASS` (underline + link color
  token `--coderso-link` + `data-page-text-mark="link"`) on both front and
  canvas; canvas paints a non-navigating span (`data-page-editor-link-noop`)
  while the front keeps a real `<a rel="nofollow noreferrer">`
  (`core/services/pages/pageStaticBlockRenderers.tsx:337-402`).
- The editor has explicit "Remove link" (`PageAuthoringCanvas.tsx:727-754`),
  seeds the URL field from the selected link's href, applies over the range
  without same-href toggle-only removal, and click-to-select a linked fragment
  without navigation.
- The mark toolbar docks Top → Right → Left with placement classes
  (`PageAuthoringCanvas.tsx:237-246`) and keeps handlers working on every side.
- Tests tagged TASK-478-02/03 cover unlink, seed, noop-click, and dock cycles:
  `tests/vitest/ui/page-authoring-canvas.test.tsx` (7), `tests/vitest/pages/page-document-v2.test.ts` (3), `tests/vitest/pages/page-renderer-v2.test.tsx` (underline/class assertions). Verified 235/235 green on HEAD 31952b5f.
