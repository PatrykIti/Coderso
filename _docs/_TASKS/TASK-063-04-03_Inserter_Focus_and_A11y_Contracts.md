# TASK-063-04-03: Inserter Focus and A11y Contracts
# FileName: TASK-063-04-03_Inserter_Focus_and_A11y_Contracts.md

**Priority:** High  
**Category:** Accessibility  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-04-02  
**Status:** To Do

---

## Overview
Domknac focus return i aria contract dla sidebaru insertera.

---

## Scope
1. Po zamknieciu focus wraca na Add button.
2. Aria labels i role dla panelu i listy blokow.
3. Keyboard navigation po wynikach (arrow/enter).

---

## Files to Create / Change
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `core/admin/ui/posts/editor/hooks/useFocusReturn.ts`
- `tests/integration/ui/post-editor-inserter-sidebar.test.tsx`

---

## Pseudocode
```ts
store openerRef on open
close => openerRef.focus()
list items implement roving tabindex
```

---

## Acceptance Criteria
1. Focus return dziala zawsze.
2. Panel jest czytelny dla screen reader.

---

## Testing Requirements
- Integration: keyboard-only inserter flow.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
