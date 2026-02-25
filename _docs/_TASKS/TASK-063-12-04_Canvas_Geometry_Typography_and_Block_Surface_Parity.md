# TASK-063-12-04: Canvas Geometry, Typography, and Block Surface Parity
# FileName: TASK-063-12-04_Canvas_Geometry_Typography_and_Block_Surface_Parity.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-01, TASK-063-12-03  
**Status:** To Do

---

## Overview
Dopasowac center writing canvas do geometrii i estetyki referencji:
- szerokosc i marginesy,
- skala typografii tytulu,
- rytm spacingu miedzy blokami,
- powierzchnie placeholderow media/interactive.

---

## Scope
1. Ustalic docelowa geometrie canvas (`max width`, vertical rhythm, paddings).
2. Dopasowac title field visual contract.
3. Ujednolicic block surface styling dla unified article flow.
4. Zachowac existing editing/parsing/runtime behavior.

---

## Sub-Tasks
1. Refactor wrapper classes i spacing tokeny canvas.
2. Dostosowac title input typography i behavior.
3. Ujednolicic placeholder states dla `image/embed/button`.
4. Zweryfikowac selection ring i focus flow po insercie.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
- `tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Pseudocode
```ts
const CANVAS_UI = {
  maxWidth: 720,
  titleScale: "display-5xl",
  verticalRhythm: "space-y-6",
  placeholderTone: "slate-dashed",
};

renderUnifiedCanvas(CANVAS_UI);
```

---

## Acceptance Criteria
1. Canvas geometry i typography sa bliskie referencji.
2. Placeholdery media sa spójne i czytelne.
3. Brak regresji w edycji rich text, paste, insert, block select.

---

## Testing Requirements
- Integration UI:
  - title field rendering and editing
  - unified flow spacing and block placeholders
  - select/focus contract after insert
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (canvas contract)
- `_docs/CODERSO_MODULES.md` (authoring UX notes)
