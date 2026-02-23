# TASK-063-02-01: Layout State Model and Hooks
# FileName: TASK-063-02-01_Layout_State_Model_and_Hooks.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02  
**Status:** Done (2026-02-23)

---

## Overview
Wydzielic centralny model stanu layoutu (sidebars, tabs, focus targets) do dedykowanego hooka.

---

## Scope
1. Dodac `usePostEditorLayout` jako source-of-truth dla region state.
2. Usunac rozproszone toggles z komponentow potomnych.
3. Dodac API: open/close/toggle dla inserter/list/details.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts` (new)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/unit/posts/post-editor-layout-state.test.ts` (new)

---

## Pseudocode
```ts
state = {inserterOpen, listViewOpen, detailsOpen, activeDetailsTab}
actions = {toggleInserter, toggleListView, openDetails(tab), closeAllPanels}
expose stable callbacks for shell + header
```

---

## Acceptance Criteria
1. Shell korzysta z jednego hooka layout state.
2. Brak duplikacji toggli w child komponentach.

---

## Testing Requirements
- Unit: reducer/actions layout state.
- Integration: toggles zmieniaja regiony poprawnie.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
