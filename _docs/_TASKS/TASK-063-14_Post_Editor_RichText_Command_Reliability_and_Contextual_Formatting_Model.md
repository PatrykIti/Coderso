# TASK-063-14: Post Editor RichText Command Reliability and Contextual Formatting Model
# FileName: TASK-063-14_Post_Editor_RichText_Command_Reliability_and_Contextual_Formatting_Model.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-13  
**Status:** To Do

---

## Overview
Domknac problemy z niedzialajacymi komendami paska formatowania oraz uporzadkowac model opcji per typ bloku:
1. Komendy `H1..H6`, `Paragraph`, `Quote`, `Bullet/Ordered list`, `Align left/center/right` nie dzialaja deterministycznie.
2. `Highlight` dla wieloliniowego zaznaczenia rozwala uklad linii.
3. Brak jasnej odpowiedzi, kiedy lista ma byc komenda rich text, a kiedy osobnym `list` block.
4. Za duzo opcji jest widocznych dla kazdego bloku tekstowego (np. `heading`).
5. Duplikujemy kontrole miedzy belka nad blokiem i prawym panelem `Block`.

---

## Scope
1. Zdefiniowac kontrakt zachowania wszystkich komend rich text i mapowanie komenda -> efekt.
2. Ustabilizowac engine komend formatowania blokowego i inline.
3. Wprowadzic contextual toolbar profiles per block type.
4. Rozdzielic ownership opcji: `toolbar` vs `Block inspector` (bez dublowania).
5. Dodac pelne testy unit/integration dla kazdej komendy i scenariuszy selection.

---

## Locked Decisions
1. `List` command zostaje na toolbarze tylko tam, gdzie ma sens jako inline/block transform w ramach danego bloku tekstowego.
2. Dedykowany `list` block zostaje jako osobny typ bloku do semantycznych list sekcyjnych.
3. `Paragraph` command ma sluzyc do powrotu do normalnego akapitu (np. z heading/quote), a nie byc no-op.
4. Opcje obecne na toolbarze nie sa duplikowane w prawym `Block` inspector; inspector zostawia tylko opcje niedostepne z toolbar.
5. `Heading` block dostaje ograniczony zestaw opcji (mniej niz `paragraph` i `writing-canvas`).

---

## Sub-Tasks
1. `TASK-063-14-01_Command_Capability_Matrix_and_Expected_Behavior_Contract.md`
2. `TASK-063-14-02_Block_Level_Formatting_Commands_H1_H6_Paragraph_Quote_List.md`
3. `TASK-063-14-03_Inline_Formatting_and_Multiline_Highlight_Stability.md`
4. `TASK-063-14-04_Text_Alignment_and_List_Command_Engine_Stabilization.md`
5. `TASK-063-14-05_Contextual_Toolbar_Profiles_and_Block_Inspector_Dedup.md`
6. `TASK-063-14-06_QA_Docs_Changelog_and_Closure.md`

---

## Files to Create / Change (Planned)
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `core/services/posts/editor/postRichTextSerializer.ts`
- `core/services/posts/editor/postRichTextSanitizer.ts`
- `tests/unit/posts/post-richtext-serializer.test.ts`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/unit/ui/post-editor-richtext-toolbar-profiles.test.ts`
- `tests/integration/ui/post-editor-richtext-commands.test.tsx`
- `tests/integration/ui/post-editor-richtext-selection.test.tsx`

---

## Implementation Order (Locked)
1. `063-14-01` kontrakt zachowan i capability matrix.
2. `063-14-02` komendy blokowe (`H1..H6`, `Paragraph`, `Quote`, `List`).
3. `063-14-03` komendy inline i multiline highlight.
4. `063-14-04` alignment + stabilizacja list command.
5. `063-14-05` toolbar profiles i deduplikacja inspector.
6. `063-14-06` QA/docs/changelog/kanban closure.

---

## Acceptance Criteria
1. Wszystkie przyciski komend deklarowane jako aktywne faktycznie zmieniaja tresc/markup zgodnie z kontraktem.
2. `H1..H6`, `Paragraph`, `Quote`, `List`, `Align` dzialaja deterministycznie na pojedynczej i wieloliniowej selekcji.
3. `Highlight` nie skleja wieloliniowego tekstu do jednej linii.
4. Toolbar jest contextual per block type i nie pokazuje opcji bez sensu.
5. Prawy panel `Block` nie duplikuje opcji obecnych na toolbarze.
6. Lint/types + dedykowane testy richtext sa zielone.

---

## Testing Requirements
- Mandatory gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Targeted suites (minimum):
  - richtext command unit tests (serializer + adapter command mapping)
  - toolbar profile unit tests (per block type)
  - integration tests dla multiline selection, heading/paragraph/quote/list/align/highlight
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
