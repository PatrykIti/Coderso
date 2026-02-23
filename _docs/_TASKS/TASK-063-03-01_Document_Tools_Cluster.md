# TASK-063-03-01: Document Tools Cluster
# FileName: TASK-063-03-01_Document_Tools_Cluster.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-03  
**Status:** To Do

---

## Overview
Zaimplementowac lewy cluster narzedzi dokumentu: Add, Undo/Redo, Document Overview.

---

## Scope
1. Wydzielic `PostEditorDocumentTools`.
2. Spiac akcje z layout state i post editor history.
3. Dodac shortcut hints i aria labels.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/header/PostEditorDocumentTools.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Pseudocode
```ts
render Add button => toggleInserter()
render Undo/Redo => state.history actions
render Overview => toggleListView()
```

---

## Acceptance Criteria
1. Narzedia dokumentu dzialaja i sa spójne ze stanem.
2. Undo/Redo nie lamia autosave flow.

---

## Testing Requirements
- Integration: button actions + disabled states.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
