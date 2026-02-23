# TASK-063-02-02: Region Components and Composition
# FileName: TASK-063-02-02_Region_Components_and_Composition.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02-01  
**Status:** To Do

---

## Overview
Wydzielic komponenty regionow i kompozycje shella na wzor InterfaceSkeleton.

---

## Scope
1. Dodac `PostEditorLayout` i `PostEditorRegions`.
2. Przeniesc renderowanie header/content/sidebars/footer do layout warstwy.
3. Utrzymac kompatybilnosc z obecnym `usePostEditorState`.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Pseudocode
```ts
<PostEditorLayout header=... content=... secondarySidebar=... sidebar=... footer=... />
regions receive only props, no direct service calls
shell orchestrates state + actions
```

---

## Acceptance Criteria
1. Shell ma klarowny podzial na regiony.
2. Komponenty regionow sa male i jednoodpowiedzialne.

---

## Testing Requirements
- Integration: render regionow + conditional visibility.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
