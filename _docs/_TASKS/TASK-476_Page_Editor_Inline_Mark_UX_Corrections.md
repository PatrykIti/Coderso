# TASK-476: Page Editor Inline Mark UX Corrections
# FileName: TASK-476_Page_Editor_Inline_Mark_UX_Corrections.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-471-03 (per-fragment color marks), TASK-472-05 (rich marks), TASK-475 (real-input toolbar fixes)
**Status:** 🚧 In Progress
**Started:** 2026-06-26

---

## Business Goal (umbrella)

Follow-up corrections to the canvas inline text-mark experience surfaced by the
site owner after TASK-475 shipped. Two distinct issues remain:

1. **Re-coloring a fragment resets it instead of replacing.** Applying a
   *different* color to an already-colored selection first clears the color back
   to the block default; a second click of the new color is needed to actually
   apply it. Root cause: the mark de-dupe treats "same type + same range" as a
   toggle-off, ignoring the color value. → `TASK-476-01` (this task fixes it).
2. **No live feedback while editing.** Applied color/highlight marks are not
   painted until the author leaves inline edit (the canvas shows plain text
   during edit by design), so the controls feel unresponsive. → `TASK-476-02`
   (deferred; larger interaction-design change, kept separate).

## Children

| Child | Title | Status |
|-------|-------|--------|
| TASK-476-01 | Mark Re-Color Replacement Semantics | ✅ Done |
| TASK-476-02 | Live In-Edit Mark Feedback | ⏳ To Do |

## Success criteria

- Re-coloring a selected fragment with a different color replaces it in one
  click; clicking the *same* color on the same range still toggles it off.
- (476-02, deferred) Applied marks are visible during inline edit.

## References

- Live audit: `_TMP-PAGE-EDITOR-COLOR-TOOLBAR-LIVE-AUDIT-2026-06-25.md`
- Predecessor: TASK-475 (changelog 1195).
