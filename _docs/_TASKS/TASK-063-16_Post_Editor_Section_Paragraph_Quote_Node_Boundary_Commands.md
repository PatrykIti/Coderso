# TASK-063-16: Post Editor Section Paragraph Quote Node Boundary Commands
# FileName: TASK-063-16_Post_Editor_Section_Paragraph_Quote_Node_Boundary_Commands.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-15  
**Status:** Done (2026-03-02)

---

## Overview
Domknac zachowanie komend `paragraph` i `quote` w bloku `Section` (`writing-canvas`) tak, aby dzialaly jako transformacje jawnych, zagniezdzonych blokow wewnetrznych (nodes), a nie tylko chwilowe mutacje DOM bez stabilnej persistence.

Problem user-facing:
1. Klikniecie `Paragraph`/`Quote` w `Section` nie daje deterministycznego efektu lub efekt znika po roundtripie.
2. Canvas powinien pokazywac poprawny format (akapity/cytaty) jako logiczne bloki w sekcji.

---

## Scope
1. Zdefiniowac kontrakt komend `paragraph` i `quote` dla `writing-canvas` jako operacje na granicach węzłów.
2. Wymusic, by wykonanie komendy tworzylo/utrzymywalo jawny node `paragraph` albo `quote` w modelu `WritingCanvasContent`.
3. Zapewnic roundtrip parity (`editor html -> nodes -> html -> runtime`) bez utraty typu noda.
4. Dolozyc testy kontraktowe i integracyjne pokrywajace scenariusze collapsed/range/multiline.

---

## Command Contract (Locked)
1. `Paragraph` w `Section`:
   - konwertuje aktualny zakres do noda `paragraph`,
   - jesli selekcja obejmuje `quote` node, nastepuje `quote -> paragraph` bez utraty tresci.
2. `Quote` w `Section`:
   - konwertuje aktualny zakres do noda `quote`,
   - togglowanie `quote -> paragraph` pozostaje deterministyczne.
3. Dla obu komend wynik musi byc widoczny od razu na canvasie i utrzymany po `blur/reselect/save/reload`.
4. Kontrakt nie moze polegac tylko na fallback `execCommand` bez model persistence.

---

## Sub-Tasks
1. `TASK-063-16-01_Section_Paragraph_Quote_Node_Command_Contract_and_Target_Behavior.md`
2. `TASK-063-16-02_Section_Paragraph_Quote_Command_Engine_and_Adapter_Wiring.md`
3. `TASK-063-16-03_Section_Paragraph_Quote_Roundtrip_Normalizer_and_Runtime_Parity.md`
4. `TASK-063-16-04_QA_Docs_Changelog_and_Closure.md`

---

## Files to Create / Change (Planned)
- `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `tests/unit/posts/post-richtext-command-engine.test.ts`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
- `tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx` (new)
- `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
- `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`

---

## Implementation Order (Locked)
1. `063-16-01` kontrakt behavior i przypadki graniczne.
2. `063-16-02` command engine + adapter path dla `paragraph/quote` w `Section`.
3. `063-16-03` parser/serializer/runtime parity dla node boundaries.
4. `063-16-04` QA/docs/changelog/kanban closure.

---

## Acceptance Criteria
1. `Paragraph` i `Quote` w `Section` tworza/utrzymuja poprawny zagniezdzony node typu `paragraph`/`quote`.
2. Po komendzie i po roundtripie (`blur/reselect/save/reload`) typ noda sie nie gubi.
3. Canvas pokazuje poprawne formatowanie (`p` vs `blockquote`) zgodne z modelem.
4. Toggling `paragraph <-> quote` jest deterministyczny na collapsed i range selection.
5. Wszystkie subtaski `063-16-01..04` maja status `Done`.

---

## Closure Update (2026-03-02)
1. Dodano deterministic fallback dla komend blokowych przy `Section`, gdy edytor ma chwilowo root bez wrappera blokowego:
   - `applyCommandToRootHtmlWithoutBlocks(command, html)` w command engine.
2. Adapter richtext uzywa fallbacku dla `block-format/list-format`, gdy nie ma wykrytych target blockow:
   - `paragraph` i `quote` tworza poprawny wrapper blokowy (`p` / `blockquote`) zamiast wpasc w niestabilny fallback.
3. Potwierdzono persistence modelu `writing-canvas` dla `paragraph/quote` przez roundtrip parser/serializer.
4. QA gates zakonczone sukcesem:
   - `bun --cwd core lint` -> pass
   - `bun --cwd core lint:types` -> pass
   - `bun test tests/unit tests/integration tests/perf tests/security` -> pass (`1496 passed`, `150 skipped`, `0 failed`)

---

## Testing Requirements (Target)
- Mandatory gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Required unit suites:
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/posts/post-paste-normalizer.test.ts`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
- Required integration suites:
  - `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
