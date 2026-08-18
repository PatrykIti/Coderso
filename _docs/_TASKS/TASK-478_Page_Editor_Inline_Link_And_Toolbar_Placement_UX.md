# TASK-478: Page Editor Inline Link And Toolbar Placement UX
# FileName: TASK-478_Page_Editor_Inline_Link_And_Toolbar_Placement_UX.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-475/476/477 (inline mark toolbar)
**Status:** ⏳ To Do
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
| TASK-478-01 | Inline Link Visual Feedback | ⏳ To Do |
| TASK-478-02 | Inline Link Edit, Remove, And Click-To-Select | ⏳ To Do |
| TASK-478-03 | Dockable Inline Mark Toolbar (Top/Left/Right) | ⏳ To Do |

## Success criteria

- A linked fragment is visually obvious in the editor (and consistent with the
  front), and the author can edit/remove it without fighting navigation.
- The author can move the mark toolbar off the top of the block so neither it nor
  the color picker covers the text.

## Evidence (live, 2026-06-27)

- Link renders as `<a href rel="nofollow noreferrer">` with `class:(none)`,
  `text-decoration:none`, base color — indistinguishable from plain text
  (`pageRendererV2.tsx:780` `renderMarkedTextSegment` link branch has no class).
- Toolbar buttons: bold, italic, color/highlight swatches, link — **no unlink**.
  Link Apply is `disabled={!selectionRange || linkHref.trim().length === 0}`
  (`PageAuthoringCanvas.tsx:569`); the URL field is not seeded from the selected
  link's href.
- Clicking a linked fragment on the canvas triggers navigation (beforeunload
  confirm) instead of selecting it.
- Toolbar is `absolute -top-9 left-0` above the text (`PageAuthoringCanvas.tsx`
  `markToolbar`).
