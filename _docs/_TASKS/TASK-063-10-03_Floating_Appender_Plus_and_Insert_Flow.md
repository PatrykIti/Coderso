# TASK-063-10-03: Floating Appender Plus and Insert Flow
# FileName: TASK-063-10-03_Floating_Appender_Plus_and_Insert_Flow.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-06, TASK-063-10-02  
**Status:** Done (2026-02-24)

---

## Overview
Wdrozyc floating przycisk `+` w centralnym canvas (wzorzec z template), jako glowny i czytelny trigger dodawania bloku.

Ma dzialac razem z obecnymi flow:
- slash command,
- inserter sidebar,
- appender insertion points.

---

## Scope
1. Zamienic/uzupelnic obecny UI insert trigger na floating `+` style.
2. Spiac trigger z `resolvePostInsertMutation` (single source of truth).
3. Dopracowac focus return i keyboard a11y (`Enter`/`Space`/`Esc`).
4. Zachowac insertion pozycjonowane (after-selected, index, after-block).

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/postInsertFlow.ts`
- `core/admin/ui/posts/editor/blocks/SlashCommandMenu.tsx`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/unit/posts/post-insert-flow.test.ts`

---

## Pseudocode
```ts
onFloatingPlusClick(anchor) {
  setInsertAnchor(anchor);
  openInserter({ source: "canvas-plus" });
}

onInsertBlock(type) {
  const mutation = resolvePostInsertMutation({
    source: "canvas-plus",
    target: insertAnchor,
    blockType: type,
  });
  applyInsert(mutation);
  focusInsertedBlock();
}
```

---

## Acceptance Criteria
1. Floating `+` jest widoczny i intuicyjny w canvas.
2. Insert przez `+` daje identyczny efekt jak slash/inserter.
3. Brak konfliktow focus i brak reload/hydrate reset podczas insertu.

---

## Testing Requirements
- Integration:
  - click plus -> inserter -> insert block,
  - keyboard open/close,
  - focus inserted block.
- Unit:
  - insert mutation resolution dla source `canvas-plus`.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (insert interaction model)
- `_docs/CMS_API.md` (editor apply semantics if changed)
