# TASK-061-05: Image Wrap Controls and Layout Semantics
# FileName: TASK-061-05_Image_Wrap_Controls_and_Layout_Semantics.md

**Priority:** High  
**Category:** Editor UX / Runtime CSS  
**Estimated Effort:** Medium  
**Dependencies:** TASK-061-02, TASK-061-04  
**Status:** To Do

---

## Overview
Dodac Word-like oplywanie obrazow w writing canvas i runtime renderer.

## Scope
1. Parametry image node:
   - `wrap`: `none | left | right`,
   - `widthPercent`: `25 | 33 | 50 | 66 | 100`,
   - `marginPreset`.
2. UI controls w details/ribbon dla image node.
3. Render editorowy i runtime dla oplywania tekstu.
4. Mobile fallback (`wrap` -> stacked `none` gdy narrow viewport).

## Files to Create / Change
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/site/styles/post-content.css` (new, if needed)
- `tests/unit/posts/post-image-wrap-layout.test.ts` (new)
- `tests/integration/runtime/post-writing-canvas-wrap.test.tsx` (new)

## Pseudocode
```ts
resolveImageClass(node, viewport):
  if viewport < md: return "wrap-none w-full"
  if node.wrap === "left": return `float-left w-${node.widthPercent}`
  if node.wrap === "right": return `float-right w-${node.widthPercent}`
  return `block w-${node.widthPercent}`
```

## Acceptance Criteria
1. User moze ustawic oplywanie obrazu i szerokosc.
2. Tekst realnie oplywa obraz na desktop.
3. Mobile nie lamie layoutu (auto fallback).

## Testing Requirements
- Unit: class resolver.
- Runtime integration: snapshot/layout assertions.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
