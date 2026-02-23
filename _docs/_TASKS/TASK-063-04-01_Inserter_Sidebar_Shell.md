# TASK-063-04-01: Inserter Sidebar Shell
# FileName: TASK-063-04-01_Inserter_Sidebar_Shell.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-04  
**Status:** To Do

---

## Overview
Stworzyc shell sidebaru insertera z obsluga open/close/escape.

---

## Scope
1. Dodac komponent `PostInserterSidebar`.
2. Podpiac lifecycle open/close do `usePostEditorLayout`.
3. Dodac close button i Escape handling.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-inserter-sidebar.test.tsx`

---

## Pseudocode
```ts
if !inserterOpen return null
onEscape => closeInserter
onClose => focus Add toggle
```

---

## Acceptance Criteria
1. Sidebar otwiera i zamyka sie przewidywalnie.
2. Escape zawsze dziala.

---

## Testing Requirements
- Integration: open/close/escape.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
