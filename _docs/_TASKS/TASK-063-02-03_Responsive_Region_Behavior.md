# TASK-063-02-03: Responsive Region Behavior
# FileName: TASK-063-02-03_Responsive_Region_Behavior.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02-02  
**Status:** Done (2026-02-23)

---

## Overview
Doprecyzowac zachowanie regionow na mobile/tablet/desktop.

---

## Scope
1. Secondary sidebar jako sheet/drawer na mobile.
2. Details sidebar jako overlay na mobile i sticky panel na desktop.
3. Zachowanie scroll i focus lock bez konfliktow.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx` (new)

---

## Pseudocode
```ts
if viewport < md: render sidebars as sheet
else: render as columns
preserve panel state across viewport switch
```

---

## Acceptance Criteria
1. Brak UX glitchy przy zmianie szerokosci.
2. Panele zachowuja stan i focus poprawnie.

---

## Testing Requirements
- Integration: viewport-specific behavior snapshots/interactions.

---

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
