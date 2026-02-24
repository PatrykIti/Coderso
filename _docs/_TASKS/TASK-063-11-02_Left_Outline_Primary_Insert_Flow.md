# TASK-063-11-02: Left Outline Primary Insert Flow
# FileName: TASK-063-11-02_Left_Outline_Primary_Insert_Flow.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-06-02, TASK-063-11-01  
**Status:** To Do

---

## Overview
Przeniesc primary insert trigger (`+`) do lewego panelu `Document Outline`.

To ma byc domyslny punkt dodawania blokow (zgodnie z nowym UX), z podpieciem do istniejacego shared insert flow.

---

## Scope
1. Dodac plus trigger w left outline panelu.
2. Dodac wybór docelowej pozycji insercji (selected/after/end).
3. Zachowac shared resolver `resolvePostInsertMutation`.
4. Zachowac keyboard + a11y contract.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/postInsertFlow.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/posts/post-insert-flow.test.ts`
- `tests/integration/ui/post-editor-listview-outline.test.tsx`

---

## Pseudocode
```ts
onOutlinePlusClick(anchor) {
  openInserter({ source: "outline-plus", anchor });
}

onInsertFromOutline(type, anchor) {
  const mutation = resolvePostInsertMutation({
    source: "outline-plus",
    target: anchor,
    blockType: type,
  });
  applyInsert(mutation);
}
```

---

## Acceptance Criteria
1. Plusik w left panelu pozwala dodawac bloki bez przechodzenia do canvas appendera.
2. Insert dziala deterministicznie i zgodnie z selected anchor.
3. Brak regresji dla slash/sidebar/canvas insertion.

---

## Testing Requirements
- Unit: insert resolver dla source `outline-plus`.
- Integration: outline plus -> insert -> focus selected block.

---

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
