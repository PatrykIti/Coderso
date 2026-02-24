# TASK-063-10-02: Shell Layout Migration to Stitch Reference
# FileName: TASK-063-10-02_Shell_Layout_Migration_to_Stitch_Reference.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-10-01, TASK-063-02  
**Status:** To Do

---

## Overview
Przebudowac kompozycje shella post editora tak, aby wizualnie i UX-owo odpowiadala nowemu template:
- waski lewy rail (outline/list view),
- centralny writing canvas,
- prawy smart inspector (`Post` / `Block`).

---

## Scope
1. Uporzadkowac region wrappers i grid/flex behavior.
2. Dopasowac spacing i hierarchy layout bez naruszania logiki danych.
3. Utrzymac mobile toggles dla paneli bocznych.
4. Zachowac kompatybilnosc z obecnymi hookami i store.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx`

---

## Pseudocode
```tsx
<PostEditorLayout>
  <HeaderRegion />
  <BodyRegion columns="outline canvas inspector">
    <LeftRail width="240px" collapsible />
    <CanvasRegion fluid />
    <RightRail width="320px" tabs={["post", "block"]} collapsible />
  </BodyRegion>
</PostEditorLayout>
```

---

## Acceptance Criteria
1. Widok odpowiada nowemu template (3-region body + minimalistyczny spacing).
2. Sidebary nie zaslaniaja canvas i nie zrywaja responsywnosci.
3. Brak regresji navigacji block/list/details.

---

## Testing Requirements
- Integration:
  - region visibility i resize behavior,
  - mobile open/close sidebars,
  - regression selection flow.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (updated shell composition)
- `_docs/CODERSO_MODULES.md` (posts editor UX section)
