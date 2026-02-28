# TASK-063-14-02: Block Level Formatting Commands H1 H6 Paragraph Quote List
# FileName: TASK-063-14-02_Block_Level_Formatting_Commands_H1_H6_Paragraph_Quote_List.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-14-01  
**Status:** In Progress (2026-02-28)

---

## Overview
Naprawic niedzialajace komendy blokowe:
- `H1..H6`
- `Paragraph`
- `Quote`
- `Bullet list` / `Ordered list`

---

## Scope
1. Wprowadzic jednolity dispatcher dla block-level commands (`heading-1..6`, `paragraph`, `quote`, `bullet-list`, `ordered-list`).
2. Zrobic deterministic path dla komend blokowych; `execCommand` moze zostac jedynie fallbackiem kompatybilnosci.
3. Zapewnic poprawne dzialanie na selekcji jedno- i wielowierszowej.
4. Ustalic jawny kontrakt togglowania `quote` i list.

---

## Command Behavior Contract (Locked)
1. `H1..H6`:
   - ustawia wskazany poziom heading na wszystkich blokach objetych selekcja,
   - ponowne klikniecie tego samego poziomu nie degraduje bloku (idempotent).
2. `Paragraph`:
   - zawsze przywraca blok do `p` (z `h*`, `blockquote`, `pre`, `ul/ol`),
   - nie jest `no-op`, jesli aktualny blok nie jest `p`.
3. `Quote`:
   - toggle `p/h* -> blockquote`,
   - toggle `blockquote -> p`.
4. `Bullet/Ordered`:
   - toggle `p/h*/blockquote -> ul/ol`,
   - ponowne klikniecie na aktywnej liscie odwrapowuje do `p`.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` (new)
   - wydzielic pure command planner/executor dla block-level operations.
   - API: `applyBlockCommand(command, selectionCtx)` + helpery list/quote/heading/paragraph.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - podpiac adapter do command engine.
   - zostawic ewentualny `execCommand` tylko jako fallback, z post-normalizacja.
3. `core/services/posts/editor/postRichTextSerializer.ts`
   - doprecyzowac normalization output dla tagow blokowych po komendach.
4. `core/services/posts/editor/postRichTextSanitizer.ts`
   - zapewnic whitelist dla final markup po command dispatcher.

---

## Pseudocode
```ts
function applyBlockCommand(cmd: BlockCmd, selection: SelectionCtx) {
  const blocks = getSelectedBlockNodes(selection);
  switch (cmd) {
    case "paragraph":
      return replaceBlocks(blocks, "p");
    case "quote":
      return toggleBlockTag(blocks, "blockquote", "p");
    case "heading-2":
      return replaceBlocks(blocks, "h2");
    case "bullet-list":
      return wrapBlocksAsList(blocks, "ul");
  }
}
```

---

## Acceptance Criteria
1. `H1..H6` faktycznie zmieniaja poziom naglowka.
2. `Paragraph` przywraca zwykly akapit z heading/quote.
3. `Quote` toggluje tryb cytatu.
4. `Bullet list`/`Ordered list` dzialaja i nie sa no-op.
5. Zachowanie jest deterministyczne i idempotentne (ten sam input + ta sama komenda => ten sam output).

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/posts/post-richtext-command-engine.test.ts` (new)
    - `heading-1..6` na pojedynczym bloku.
    - `heading-1..6` na selekcji wielu blokow.
    - `paragraph` z `h1..h6`, `blockquote`, `ul`, `ol`.
    - `quote` toggle `p -> blockquote -> p`.
    - `bullet-list` i `ordered-list` toggle `wrap/unwrap`.
    - idempotency: dwukrotne uruchomienie tej samej komendy na tym samym stanie.
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - stabilny output dla `h1..h6`, `p`, `blockquote`, `ul/ol/li`.
    - brak utraty tresci podczas normalizacji po komendach blokowych.
  - `tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx` (new)
    - mapowanie klikniecia przycisku toolbar -> poprawna komenda engine.
- Integration/contract:
  - `tests/integration/ui/post-editor-richtext-command-contract.test.tsx` (new)
    - command contract dla `H1..H6`, `paragraph`, `quote`, `bullet-list`, `ordered-list`.
    - scenariusze single-selection i multi-selection.
    - brak regressji przy przejsciu `heading -> paragraph -> quote -> paragraph`.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (block command execution flow)
