# TASK-063-08-03: ARIA Landmarks and Accessibility Labels
# FileName: TASK-063-08-03_ARIA_Landmarks_and_Accessibility_Labels.md

**Priority:** High  
**Category:** Accessibility  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-08-02  
**Status:** Done (2026-03-02)

---

## Overview
Dopelnic landmarks, aria-labels i semantyke regionow edytora.

---

## Scope
1. Dodac role/labels dla header/content/sidebar/footer.
2. Aria-labels dla toolbar buttons i tablists.
3. Sprawdzic czytelny tekst dla screen reader (user-friendly).

---

## Files to Create / Change
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `tests/integration/ui/post-editor-keyboard-a11y.test.tsx`

---

## Pseudocode
```ts
assign landmark labels
ensure toggles have aria-expanded/controls
validate tablist semantics
```

---

## Acceptance Criteria
1. Regiony sa semantycznie poprawne.
2. Screen reader dostaje sensowne etykiety.

---

## Testing Requirements
- Integration: aria attribute assertions.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
