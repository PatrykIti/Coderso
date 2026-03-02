# TASK-063-15: Post Editor Section Writing Canvas Caret Command Parity and Grouped Toolbar
# FileName: TASK-063-15_Post_Editor_Section_Writing_Canvas_Caret_Command_Parity_and_Grouped_Toolbar.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-13, TASK-063-14  
**Status:** To Do

---

## Overview
Domknac regresje bloku `Section` (tj. `writing-canvas`) i doprowadzic do realnej parity authoring:
1. Caret skacze na poczatek po pierwszym znaku i po sekwencji `Enter`.
2. Czesc komend rich text nie utrzymuje efektu po aktualizacji modelu (`paragraph`, `h1..h6`, listy, align, clear formatting).
3. Toolbar ma byc przeorganizowany na grupy akcji:
   - `Paragraph/H1..H6` jako jedna grupa (Word-like),
   - `Bullet/Ordered list` jako jedna grupa,
   - `Inline code/Code block` jako jedna grupa.

---

## Current State Analysis (Code-Based)
1. `Section` to blok `writing-canvas`, nie widget `section`.
2. Dla `writing-canvas` pipeline jest inny niz dla `paragraph/heading/quote`:
   - `value`: `serializeWritingCanvasContentToHtml(block.content)`,
   - `onChange`: `html -> createWritingCanvasContentFromEditorHtml -> structured nodes`.
3. To powoduje lossy roundtrip `HTML -> nodes -> HTML` przy kazdym wpisie, przez co `PostRichTextAdapter` czesto wymusza `innerHTML` rewrite i traci stabilna selekcje/caret.
4. Obecny parser `writing-canvas` odrzuca puste paragrafy, co destabilizuje pozycje caret po `Enter`/`Enter`.
5. Command engine ustawia `data-align` i blokowe tagi, ale model `writing-canvas` nie utrwala pelnej semantyki (szczegolnie `align` i `code-block`) w roundtrip.
6. Toolbar ma wiele osobnych przyciskow; brak grupowania dla naglowkow/list/kodu.

---

## Scope
1. Ustabilizowac input/caret behavior w `writing-canvas`.
2. Ustabilizowac Enter semantics (w tym double-enter) bez skoku caret.
3. Zapewnic persistence efektu komend richtext dla `Section`.
4. Przeorganizowac toolbar command IA na grupy (heading/list/code).
5. Dolozyc pelne testy kontraktowe pod zgloszone scenariusze.

---

## Sub-Tasks
1. `TASK-063-15-01_Section_Input_Pipeline_and_Caret_Stability.md`
2. `TASK-063-15-02_Section_Enter_Semantics_and_Empty_Paragraph_Preservation.md`
3. `TASK-063-15-03_Section_Command_Persistence_Paragraph_Headings_List_Align_Clear_Code.md`
4. `TASK-063-15-04_Section_Toolbar_Grouping_Heading_List_Code_and_A11y.md`
5. `TASK-063-15-05_QA_Docs_Changelog_and_Closure.md`

---

## Files to Create / Change (Planned)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
- `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts`
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/unit/posts/post-richtext-command-engine.test.ts`
- `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
- `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
- `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
- `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
- `tests/integration/ui/post-richtext-toolbar.test.tsx`
- `tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx`
- `tests/unit/ui/post-richtext-adapter-caret-section.test.tsx` (new)
- `tests/integration/ui/post-editor-section-caret-enter.test.tsx` (new)
- `tests/integration/ui/post-editor-section-command-persistence.test.tsx` (new)
- `tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` (new)

---

## Implementation Order (Locked)
1. `063-15-01` input pipeline i caret stability.
2. `063-15-02` Enter semantics i zachowanie pustych paragrafow.
3. `063-15-03` persistence komend i roundtrip contract.
4. `063-15-04` grouped toolbar IA + a11y/interaction.
5. `063-15-05` QA/docs/changelog/kanban closure.

---

## Acceptance Criteria
1. W `Section` pierwszy wpisany znak nie powoduje skoku caret na poczatek.
2. `Enter` i `Enter+Enter` nie resetuja caret do gornej linii.
3. Komendy `paragraph`, `h1..h6`, `bullet/ordered`, `align-left/center/right`, `clear-formatting` dzialaja i utrzymuja efekt po blur/reload.
4. `code-block` nie degraduje do `quote`; `inline-code` i `code-block` sa obslugiwane spojnie.
5. Toolbar ma grupy `Heading`, `List`, `Code` i jest selection-safe (brak utraty focus/caret po kliknieciu).
6. Wszystkie subtaski `063-15-01..05` maja status `Done` z closure note.

---

## Testing Requirements (Target)
- Mandatory gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Required unit suites:
  - `bun test tests/unit/ui/post-richtext-adapter-caret-section.test.tsx`
  - `bun test tests/unit/posts/post-paste-normalizer.test.ts`
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `bun test tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
- Required integration suites:
  - `bun test tests/integration/ui/post-editor-section-caret-enter.test.tsx`
  - `bun test tests/integration/ui/post-editor-section-command-persistence.test.tsx`
  - `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx`
  - `bun test tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
  - `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
