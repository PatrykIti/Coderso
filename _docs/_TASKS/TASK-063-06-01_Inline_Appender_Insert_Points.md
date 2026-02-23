# TASK-063-06-01: Inline Appender Insert Points
# FileName: TASK-063-06-01_Inline_Appender_Insert_Points.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-06  
**Status:** To Do

---

## Overview
Dodac appender `+` w canvasie dla szybkiego insertu blokow w kontekscie.

---

## Scope
1. Insert point miedzy blokami i na koncu dokumentu.
2. Po wstawieniu focus przechodzi na nowy blok.
3. Brak konfliktu z DnD/list view selection.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`

---

## Pseudocode
```ts
render insert handles around block list
handleInsertAt(index, type)
select inserted block and focus editable
```

---

## Acceptance Criteria
1. User szybko dodaje blok z poziomu canvas.
2. Insert point dziala stabilnie po reorder.

---

## Testing Requirements
- Integration: add between blocks and at end.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
