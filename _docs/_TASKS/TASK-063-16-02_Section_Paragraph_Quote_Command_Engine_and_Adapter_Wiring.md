# TASK-063-16-02: Section Paragraph Quote Command Engine and Adapter Wiring
# FileName: TASK-063-16-02_Section_Paragraph_Quote_Command_Engine_and_Adapter_Wiring.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-16-01  
**Status:** Done (2026-03-02)

---

## Overview
Wdrozyc deterministic path dla `paragraph` i `quote` w `Section` na poziomie command engine + adapter, bez polegania na przypadkowym zachowaniu fallback `execCommand`.

---

## Scope
1. Utrwalic block-level transform dla `paragraph`/`quote` na wybranych blokach w `contentEditable`.
2. Zapewnic stabilny selection restore przed/po command execution.
3. W `writing-canvas` path dopilnowac, ze wynik komendy trafia do modelu content jako node boundary.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts`
   - doprecyzowac transform `paragraph` i `quote` dla wszystkich wybranych blokow.
   - zagwarantowac deterministic toggle behavior.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - jawny section-aware path dla `paragraph/quote` z poprawnym target block selection.
   - bezpieczne fallbacki tylko jako compatibility guard.
3. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - doprecyzowac granice commitu draft -> structured content po komendach.

---

## Acceptance Criteria
1. Klik `Paragraph`/`Quote` daje natychmiastowy i poprawny efekt na canvasie.
2. Efekt nie znika po rerenderze i nie wymaga recznego odswiezenia focusu.
3. Brak regresji dla pozostalych block-format commands.

---

## Testing Requirements (Target)
- Unit:
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
- Integration:
  - `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`

---

## Closure Note (2026-03-02)
Wdrozone deterministic command path dla `paragraph/quote` w `Section`:
1. `postRichTextCommandEngine` dodaje fallback opakowania root HTML bez block wrappers.
2. `PostRichTextAdapter` uzywa fallbacku, gdy `targetBlocks` sa puste, co stabilizuje zachowanie `paragraph/quote` dla section authoring.
