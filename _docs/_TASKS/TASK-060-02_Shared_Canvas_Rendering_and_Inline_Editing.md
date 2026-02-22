# TASK-060-02: Shared Canvas Rendering and Inline Editing
# FileName: TASK-060-02_Shared_Canvas_Rendering_and_Inline_Editing.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-060-01  
**Status:** To Do

---

## Overview
Przebudowac canvas z trybu „edytuj wybrany blok osobno” na tryb wspolnego dokumentu, gdzie wszystkie bloki sa widoczne i edytowalne inline.

## Scope
1. Render wszystkich blokow w jednej kolumnie canvasu.
2. Inline editing dla blokow tekstowych bez przelaczania widokow.
3. Click-to-select bloku i synchronizacja z details/list view.
4. Zachowanie drag/reorder i transformacji bez utraty focusu.
5. Wsparcie pustego stanu dokumentu (CTA insert).

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/postEditorStore.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/blocks/blockTransforms.ts`
- `tests/integration/ui/post-editor-shared-canvas.test.tsx` (new)
- `tests/unit/ui/post-editor-canvas.test.tsx` (new or extend)

## Pseudocode
```ts
for block in document.blocks:
  render BlockCanvasItem(block, isSelected = block.id === selectedId)

onBlockClick(blockId):
  selectBlock(blockId)

onInlineChange(blockId, payload):
  updateBlockContent(blockId, payload)
  markDirty()

if document.blocks.length === 0:
  render EmptyCanvasState(insertActions)
```

## Acceptance Criteria
1. Canvas pokazuje wszystkie bloki jednoczesnie.
2. Edycja inline nie wymaga przechodzenia do oddzielnego panelu content.
3. Selekcja bloku synchronizuje outline + details.
4. Autosave/revisions dalej dzialaja bez regresji.

## Testing Requirements
- Unit:
  - select/update flow dla wielu blokow,
  - shared-canvas rendering helpers.
- Integration:
  - insert -> edit -> reorder -> transform -> save,
  - cursor stability w rich text podczas wpisywania i autosave.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (posts editor rendering flow)
- `_docs/_TASKS/README.md`
