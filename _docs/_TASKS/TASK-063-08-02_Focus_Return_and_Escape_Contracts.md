# TASK-063-08-02: Focus Return and Escape Contracts
# FileName: TASK-063-08-02_Focus_Return_and_Escape_Contracts.md

**Priority:** High  
**Category:** Accessibility  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-08-01  
**Status:** Done (2026-03-02)

---

## Overview
Zdefiniowac i wdrozyc stale reguly focus return po zamknieciu paneli.

---

## Scope
1. Dodac hook `useFocusReturn`.
2. Zapamietywac opener element per panel.
3. Egzekwowac focus on close/escape.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/useFocusReturn.ts`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `tests/integration/ui/post-editor-keyboard-a11y.test.tsx`

---

## Pseudocode
```ts
onOpen(panel, openerRef)
onClose(panel) => openerRef?.focus()
onEscape => close top-most panel
```

---

## Acceptance Criteria
1. Focus nie gubi sie po Escape/Close.
2. Dziala dla wszystkich paneli.

---

## Testing Requirements
- Integration: focus assertions after close.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
