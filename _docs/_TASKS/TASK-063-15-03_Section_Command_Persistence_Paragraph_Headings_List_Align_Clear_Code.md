# TASK-063-15-03: Section Command Persistence Paragraph Headings List Align Clear Code
# FileName: TASK-063-15-03_Section_Command_Persistence_Paragraph_Headings_List_Align_Clear_Code.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-15-01, TASK-063-15-02  
**Status:** To Do

---

## Overview
Zapewnic, aby wszystkie komendy rich text dla `Section` dzialaly i utrzymywaly efekt po roundtripie modelu:
- `paragraph`
- `h1..h6`
- `bullet-list` / `ordered-list`
- `align-left` / `align-center` / `align-right`
- `clear-formatting`
- `inline-code` / `code-block`

---

## Scope
1. Utrwalic semantyke komend w modelu `WritingCanvasContent`.
2. Usunac degradacje `code-block -> quote`.
3. Dodac persistence alignment dla `writing-canvas` nodes.
4. Utrzymac kompatybilnosc runtime mapper/renderer i normalizera dokumentu.

---

## Detailed File-Level Plan
1. `core/services/posts/editor/postBlockDocument.ts`
   - rozszerzyc typing nodes (jesli wymagane) o dane niezbedne do persistence `align` oraz `code-block`.
2. `core/services/posts/editor/postPasteNormalizer.ts`
   - parser `createWritingCanvasContentFromEditorHtml` ma mapowac:
     - `h1..h6` -> heading node z level,
     - `ul/ol/li` -> list node,
     - `pre/code` -> code node lub jawna semantyka code-block (bez degradacji do quote),
     - `data-align`/`align` -> node alignment.
   - serializer `serializeWritingCanvasContentToHtml` ma odtwarzac to bez utraty danych.
3. `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts`
   - utrzymac deterministic command output zgodny z parser expectations.
4. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - doprecyzowac clear-formatting path i command execution boundaries dla `writing-canvas`.
5. `core/services/posts/runtime/postBlockRuntimeMapper.ts`
   - wspierac nowe/rozszerzone node semantics w runtime mapping.
6. `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
   - runtime render ma respektowac alignment i code block semantics.

---

## Acceptance Criteria
1. Po kliknieciu komendy w `Section` efekt jest widoczny natychmiast i zostaje po blur/reselect.
2. `code-block` nie zamienia sie na `quote`.
3. `align-left/center/right` pozostaje zachowany po roundtrip i widoczny w canvas/runtime.
4. `clear-formatting` usuwa inline marks/linki bez rozwalenia struktury blokowej.

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/posts/post-richtext-command-engine.test.ts`
    - block/list/alignment commands for writing-canvas scenarios.
    - explicit `h1..h6` coverage (all levels).
    - clear-formatting behavior checks.
  - `tests/unit/posts/post-paste-normalizer.test.ts`
    - `pre/code` preservation contract.
    - `data-align` preservation for paragraph/heading/quote nodes.
    - heading/list roundtrip preservation.
  - `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
    - command dispatch -> expected HTML mutations for section profile.
- Integration:
  - `tests/integration/ui/post-editor-section-command-persistence.test.tsx` (new)
    - paragraph/h1..h6/list/align/clear-formatting/code-block in section.
    - behavior remains after blur/reselect (state roundtrip).
  - `tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
    - add section-specific command contract cases.
  - `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
    - section multiline selection + clear-formatting/link boundaries.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (writing-canvas command persistence contract)
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (section command parity status)
