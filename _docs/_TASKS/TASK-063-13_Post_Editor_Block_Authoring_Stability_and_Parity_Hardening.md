# TASK-063-13: Post Editor Block Authoring Stability and Parity Hardening
# FileName: TASK-063-13_Post_Editor_Block_Authoring_Stability_and_Parity_Hardening.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-12, TASK-061-06, TASK-061-09  
**Status:** Done (2026-02-27)

---

## Overview
Domknac krytyczne problemy authoring UX w post editorze, zgloszone po wdrozeniu parity:
1. `Section` (`writing-canvas`) ma niestabilny caret przy pierwszym wpisie.
2. `Paragraph` / `Heading` / `Quote` maja ten sam problem po `Enter`.
3. `List` nie pozwala sensownie pracowac na wielu liniach.
4. `Image` placeholder nie otwiera media picker flow (wymaga recznego attrs).
5. Toolbar rich text zwraca czesciowo surowy markup (`<b>...</b>`) zamiast wizualnego formatu.
6. `Button` / `Embed` i inne bloki interactive nie daja wystarczajaco realistycznego preview na canvasie.
7. Wiele opcji `Block` inspector sprawia wrazenie "mock", bo nie ma parity na canvas/runtime.
8. Potrzebny jest czytelny kontrakt dziedziczenia typografii (font family / global text controls).

---

## Scope
1. Stabilizacja pipeline wpisywania tekstu i caret behavior (typing vs paste).
2. Naprawa semantyki nowej linii dla `writing-canvas`, `paragraph`, `heading`, `quote`.
3. Przebudowa modelu edycji `list` pod multiline draft.
4. Click-to-select media flow dla `image` placeholder na canvasie.
5. Rozszerzenie toolbar rich text o stabilny output HTML i kontrole typografii.
6. Ustalenie i wdrozenie global typography inheritance dla blokow tekstowych.
7. De-mock `Block` inspector + podpiecie do realnego efektu na canvas/runtime.
8. Realistyczne preview blokow interactive (`button`, `embed`) bez wymuszenia Preview modal.
9. Rozbudowa testow unit/integration dla calej logiki authoring.

---

## Security Contract
- **Visibility:** internal (`/admin/*`, obecne `/admin/api/media*` i inne admin routes).  
- **Auth model:** authenticated admin session / admin API key scope (`media.read`, `media.write` dla media flow).  
- **Rate-limit bucket:** `admin_read` / `admin_write` (bez nowych bucketow).  
- **Public hardening:** brak nowych public endpointow; brak nowych public write routes.

---

## Current State Analysis (Repo)
1. `PostRichTextAdapter` emituje HTML przez `serializePostRichText`, ale browser-generated tagi (`div`, `b`, `i`) nie sa dobrze mapowane w obecnym kontrakcie.
2. `writing-canvas` używa `createWritingCanvasContentFromPaste` rowniez przy zwyklym pisaniu, co miesza pipeline typing/paste i resetuje strukture.
3. Sanitizer usuwa/normalizuje elementy w sposob, ktory przy `Enter` potrafi destabilizowac caret.
4. `list` jest controllem opartym o `Textarea -> parseListItems(...).filter(Boolean)` per keystroke, co zjada puste linie i utrudnia multiline UX.
5. `image` placeholder przekierowuje tylko do block settings; brak direct media-picker flow.
6. `button` / `embed` na canvasie to placeholdery tekstowe, nie runtime-like preview.
7. `BlockInspector` ma szeroki zestaw pol, ale nie wszystkie zmiany sa od razu widoczne w canvasie (odczucie mockow).
8. Brak formalnego kontraktu globalnej typografii dla blokow tekstowych.

---

## Sub-Tasks
1. `TASK-063-13-01_Block_by_Block_Defect_Analysis_and_Fix_Contract.md`
2. `TASK-063-13-02_RichText_Input_Caret_Stability_and_Enter_Semantics.md`
3. `TASK-063-13-03_List_Block_Multiline_Editing_and_State_Model.md`
4. `TASK-063-13-04_Image_Block_Click_to_Select_Media_Flow.md`
5. `TASK-063-13-05_Text_Toolbar_Font_Controls_and_Global_Typography_Inheritance.md`
6. `TASK-063-13-06_NonText_Block_Quick_Toolbars_and_Block_Inspector_DeMock.md`
7. `TASK-063-13-07_Canvas_Preview_Parity_for_Button_Embed_and_Image.md`
8. `TASK-063-13-08_RichText_Command_Output_and_Link_Rendering_Fixes_QA_Docs_Closure.md`

---

## Files to Create / Change (Planned)
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/services/posts/editor/postRichTextSerializer.ts`
- `core/services/posts/editor/postRichTextSanitizer.ts`
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/admin/services/mediaClient.ts`
- `tests/unit/posts/*`
- `tests/unit/ui/*`
- `tests/integration/ui/*`

---

## Implementation Order (Locked)
1. `063-13-01` analiza kontraktowa per blok.
2. `063-13-02` typing/caret/newline core.
3. `063-13-03` list multiline model.
4. `063-13-04` image click-to-pick flow.
5. `063-13-05` typography inheritance + text toolbar.
6. `063-13-06` non-text quick controls + inspector parity.
7. `063-13-07` realistic canvas previews.
8. `063-13-08` richtext command/link fixes + QA/docs/changelog.

---

## Acceptance Criteria
1. Brak caret jump dla `writing-canvas`, `paragraph`, `heading`, `quote`.
2. `List` pozwala stabilnie tworzyc/edytowac wiele linii.
3. `Image` placeholder otwiera media picker i aktualizuje blok bez recznego wpisywania URL.
4. Toolbar richtext nie produkuje surowych tagow jako tekst na canvasie.
5. `Button`/`Embed` (oraz inne interactive) maja realistyczny podglad na canvasie.
6. Kontrolki `Block` inspector przestaja byc "mock-like" (zmiany widoczne w canvas/runtime).
7. Kontrakt typografii tekstu jest jasny i testowalny (dziedziczenie globalne).
8. Lint/types oraz targetowane testy unit/integration sa zielone.

---

## Testing Requirements
- Mandatory gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Targeted suites (minimum):
  - richtext serialization/sanitization unit tests
  - writing-canvas and store normalization unit tests
  - block runtime mapper/renderer unit tests
  - UI integration tests for caret/newline/list/image picker/toolbar/link/preview
- Full regression run before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

