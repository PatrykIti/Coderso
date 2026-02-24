# TASK-063-10-01: Template Contract Mapping and Component Inventory
# FileName: TASK-063-10-01_Template_Contract_Mapping_and_Component_Inventory.md

**Priority:** High  
**Category:** Architecture + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-01  
**Status:** To Do

---

## Overview
Zrobic formalny mapping pomiedzy HTML reference (`_docs/UI/admin_panel/46-post-editor/code.html`) a aktualnym drzewem komponentow post editora.

Cel: uniknac "ad-hoc" przerobek i najpierw zdefiniowac kontrakt regionow + odpowiedzialnosci komponentow.

---

## Scope
1. Rozpisac regiony template (top bar, left outline rail, center canvas, right inspector).
2. Przypisac kazdy region do istniejacego komponentu lub nowego komponentu.
3. Zdefiniowac "must keep" behavior (save/autosave/preview/revisions/runtime).
4. Zdefiniowac tokeny spacing/sizing do spójnej migracji wizualnej.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `_docs/_TASKS/TASK-063-10_Post_Editor_Stitch_Template_Migration_and_Focus_Mode.md` (cross-links)

---

## Pseudocode
```ts
const templateContract = {
  header: "PostEditorHeader",
  leftRail: "PostListViewSidebar",
  canvas: "PostEditorCanvas",
  rightRail: "PostDetailsSidebar",
};

assertNoBehaviorLoss([
  "autosave",
  "preview",
  "publish",
  "revisions",
  "runtime-render",
]);
```

---

## Acceptance Criteria
1. Jest jednoznaczna mapa: reference template -> komponenty Nextless.
2. Kazdy region ma ownership i granice odpowiedzialnosci.
3. Lista "must keep" behavior jest jawna i bedzie testowana w kolejnych subtaskach.

---

## Testing Requirements
- N/A (planning/contract task).
- Wymagane: aktualizacja listy regression testow dla kolejnych subtaskow.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (section: posts editor region ownership)
- `_docs/_TASKS/README.md`
