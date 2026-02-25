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

## Current State Analysis (Repo)
1. `PostEditorCanvas` ma aktualnie szerszy wrapper (`~860px`) oraz inny rytm spacingu (`space-y-7`) niz referencja.
2. Tytul ma skale `text-4xl` i nie odzwierciedla docelowego `display-like text-5xl`.
3. Placeholdery `image/embed/button` sa funkcjonalne, ale nie trzymaja geometrycznych i tonalnych detali z referencji.
4. `PostRichTextAdapter` zachowuje flow edycji i paste, ale surface typography nie jest jeszcze w pelni „reference-like”.

---

## Delta vs Reference
1. Referencja: canvas `max-width: 720px`, `py-20 px-8`, title `text-5xl font-display`, blokowy rytm `space-y-6`.
2. Aktualny canvas jest szerszy i wizualnie ciezszy.
3. Placeholder surfaces i hover tone roznia sie od kontraktu `slate-light + dashed + subtle hover`.

---

## Final Implementation Decisions
1. Docelowa geometria canvas: `max-width ~720` + desktop rhythm jak w referencji.
2. Title field przechodzi na kontrakt `display-5xl`, bez zmiany logiki edycji.
3. Placeholdery dla `image/embed/button` dostaja jeden wspolny styl reference-parity.
4. Zachowujemy obecny model block selection/focus token i paste pipeline bez zmian kontraktu danych.
5. Brak zmian backend/API; task dotyczy warstwy prezentacji i ergonomii.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - przebudowac wrapper geometry/tokens,
   - dopracowac title typography i spacing,
   - ujednolicic placeholder class map.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - dostroic typography density (`text-lg`, line-height) pod writing surface.
3. `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
   - upewnic sie, ze content region nie narzuca sprzecznych paddings.
4. `tests/integration/ui/post-editor-canvas-shared.test.tsx`
   - zaktualizowac asercje geometrii i placeholders.
5. `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
   - potwierdzic brak regresji writing flow po zmianie surface.
6. `tests/integration/ui/post-editor-smoke-regression.test.tsx`
   - potwierdzic kluczowy runtime/save flow.

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
  titleScale: "text-5xl font-display font-bold",
  verticalRhythm: "space-y-6",
  placeholderTone: "rounded-lg border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100",
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
  - no regressions for paste and slash insert interactions
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx tests/integration/ui/post-editor-writing-canvas-flow.test.tsx tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (canvas contract)
- `_docs/CODERSO_MODULES.md` (authoring UX notes)
