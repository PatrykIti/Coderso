# TASK-060-04: Compact List View Layout and Navigation
# FileName: TASK-060-04_Compact_List_View_Layout_and_Navigation.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-060-02  
**Status:** To Do

---

## Overview
Dopasowac list view do roli outline/nawigacji: waski, czytelny, szybki i bez podgladu tresci blokow.

## Scope
1. Szerokosc outline: target `~20%` (1/5), constraints `min 220px`, `max 320px`.
2. Wiersze outline pokazuja tylko: `#index + block label`.
3. Klik na item:
   - zaznacza blok,
   - przewija canvas do bloku,
   - aktywuje context w details.
4. DnD i keyboard fallback zostaja.
5. Opcjonalny toggle collapse outline przez ribbon (`Blocks`).

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/blocks/blockDnD.ts`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `tests/integration/ui/post-block-dnd.test.tsx`
- `tests/integration/ui/post-editor-outline-navigation.test.tsx` (new)

## Pseudocode
```ts
layout = grid(columns: ["minmax(220px, 320px)", "minmax(0, 1fr)"])

outlineItem = `${index + 1}. ${label(block.type)}`

onOutlineClick(blockId):
  selectBlock(blockId)
  scrollCanvasTo(blockId)

onBlocksToggle():
  outlineCollapsed = !outlineCollapsed
```

## Acceptance Criteria
1. Outline zajmuje wyraznie mniej miejsca niz obecne 1/3.
2. Outline nie pokazuje fragmentow tresci blokow.
3. Nawigacja blokow przez outline jest szybka i stabilna.
4. DnD/keyboard reorder dalej dziala.

## Testing Requirements
- Unit:
  - layout helper / width constraints,
  - selection-to-scroll helper.
- Integration:
  - outline select + scroll sync,
  - DnD and keyboard reorder no-regression.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
