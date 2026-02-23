# TASK-063-08: Keyboard, A11y, and Focus Management
# FileName: TASK-063-08_Keyboard_A11y_and_Focus_Management.md

**Priority:** High  
**Category:** Accessibility + UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-03, TASK-063-04, TASK-063-05  
**Status:** To Do

---

## Overview
Domknac UX editora od strony klawiatury i accessibility:
- global shortcuts,
- poprawny focus handoff miedzy panelami,
- `Esc` behavior i aria labels,
- keyboard-help modal/hints.

---

## Scope
1. Dodac centralny shortcut registry dla post editora.
2. Ustandaryzowac focus return on close:
   - inserter -> Add,
   - list view -> Document Overview,
   - details -> Details toggle.
3. Ujednolicic aria-labels dla toolbar, sidebars i canvas landmarks.
4. Dodac smoke checks dla keyboard-only flows.

---

## Detailed Sub-Tasks
- `TASK-063-08-01_Shortcut_Registry_and_Keymaps.md`
- `TASK-063-08-02_Focus_Return_and_Escape_Contracts.md`
- `TASK-063-08-03_ARIA_Landmarks_and_Accessibility_Labels.md`

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorShortcuts.ts` (new)
- `core/admin/ui/posts/editor/hooks/useFocusReturn.ts` (new)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `tests/integration/ui/post-editor-keyboard-a11y.test.tsx` (new)

---

## Pseudocode
```ts
registerShortcut("mod+shift+o", toggleListView);
registerShortcut("mod+shift+i", toggleInserter);
registerShortcut("esc", closeActiveSidebarAndReturnFocus);

function closeActiveSidebarAndReturnFocus() {
  if (inserterOpen) return closeInserterAndFocusToggle();
  if (listViewOpen) return closeListViewAndFocusToggle();
  if (detailsOpen) return closeDetailsAndFocusToggle();
}
```

---

## Acceptance Criteria
1. Kluczowe akcje edytora sa osiagalne z klawiatury.
2. Focus nie "gubi sie" po zamknieciu paneli.
3. Landmarki/aria sa czytelne dla screen reader.

---

## Testing Requirements
- Integration UI:
  - shortcuts flow,
  - escape flow,
  - focus restoration assertions.
- A11y smoke:
  - aria roles/labels obecne dla regionow.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (keyboard/focus contracts)
- `_docs/CODERSO_MODULES.md` (authoring accessibility notes)

