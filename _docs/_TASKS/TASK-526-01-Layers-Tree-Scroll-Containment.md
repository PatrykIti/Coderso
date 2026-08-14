# TASK-526-01: Page Editor Panels — Layers Tree Scroll Containment

# FileName: TASK-526-01-Layers-Tree-Scroll-Containment.md

**Parent Task:** TASK-526
**Priority:** Medium
**Category:** Admin UI / Pages (Page Editor v2) / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done
**Completed:** 2026-07-08
**Depends on:** — (foundation; the only subtask of TASK-526).

---

## Scope

Wrap the Page Editor v2 **Layers tree** in a vertical scroll region so a tall block
tree becomes fully reachable. Pure className/structure change — mirrors TASK-197's
`flex h-full min-h-0 flex-col` + `min-h-0 flex-1 overflow-y-auto` idiom (the same shape
`PageEditorCommandPalette.tsx` already uses).

The ground audit found exactly **ONE** affected panel among every list/tree file under
`core/admin/ui/pages/editor/` and `core/admin/ui/pages/builder/`. Therefore this
subtask has **ONE leaf, per affected panel**:

## Leaves (one per affected panel)

- **526-01-L01** — `editor/PageEditorLayers.tsx` scroll wrapper + structural
  class-assertion test. (The ONLY panel that needs the fix.)

> No other leaf exists because every other candidate panel is already correctly
> scroll-contained (`LibraryPanel`/`WidgetPicker`/`FormPicker`/`CommandPalette`, per
> TASK-197) or is host-scrolled inner content that MUST NOT be modified
> (`VisualPanel`/`AdvancedPanel`/`WizardPanel`/`LayoutPanel`). See the parent-task
> ground audit table.

## Hard Invariants (subtask)

1. Scroll region on the TOP-LEVEL Layers invocation only; NEVER on the recursed inner
   `LayerBlockRows` instances.
2. `min-h-0 flex-1 overflow-y-auto` on the list region; `shrink-0` on any sticky
   header/toolbar.
3. Pure UI/structure — no logic/model/API/migration; `LayerBlockRows`'s existing
   recursive output stays byte-identical (the wrapper is additive).
4. Structural class-assertion test only; no `scrollHeight`.

## Definition of done

The Layers tree scrolls vertically inside a dedicated non-recursive wrapper
(`min-h-0 flex-1 overflow-y-auto`, `shrink-0` header) placeable in a height-bounded
host; recursion untouched; class-assertion test green; no other panel modified.
</content>
