# TASK-063-05-03: ListView and Outline Sidebar UI
# FileName: TASK-063-05-03_ListView_and_Outline_Sidebar_UI.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-05-02  
**Status:** Done (2026-02-24)

---

## Overview
Zaimplementowac sidebar `Document Overview` z tabami List View i Outline + stats panel.

---

## Scope
1. Dodac `PostListViewSidebar` z tabs.
2. Dodac komponenty `PostDocumentOutline` i `PostDocumentStats`.
3. Spiac selection, reorder i focus behavior.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx`
- `core/admin/ui/posts/editor/outline/PostDocumentStats.tsx`
- `tests/integration/ui/post-editor-listview-outline.test.tsx`

---

## Pseudocode
```ts
render tabs: list|outline
list uses existing DnD view
outline uses computed model + warning badges
```

---

## Acceptance Criteria
1. User moze przejsc miedzy list i outline.
2. Klik w outline nawiguje do sekcji/bloku.

---

## Testing Requirements
- Integration: tabs, selection, stats visible.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
