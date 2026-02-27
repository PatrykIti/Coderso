# TASK-063-14-02: Block Level Formatting Commands H1 H6 Paragraph Quote List
# FileName: TASK-063-14-02_Block_Level_Formatting_Commands_H1_H6_Paragraph_Quote_List.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-14-01  
**Status:** In Progress (2026-02-27)

---

## Overview
Naprawic niedzialajace komendy blokowe:
- `H1..H6`
- `Paragraph`
- `Quote`
- `Bullet list` / `Ordered list`

---

## Scope
1. Zastapic niestabilne `execCommand` tam, gdzie nie daje przewidywalnego efektu.
2. Wprowadzic jednolity dispatcher dla block-level commands.
3. Zapewnic poprawne dzialanie na selekcji jedno- i wielowierszowej.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - wydzielic `applyBlockCommand(command, selectionCtx)`.
   - obsluzyc `heading-1..6`, `paragraph`, `quote`, `bullet-list`, `ordered-list`.
2. `core/services/posts/editor/postRichTextSerializer.ts`
   - doprecyzowac normalization output dla tagow blokowych po komendach.
3. `core/services/posts/editor/postRichTextSanitizer.ts`
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

---

## Testing Requirements
- Unit (new/updated):
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - command output for heading/paragraph/quote/list.
- Integration (new):
  - `tests/integration/ui/post-editor-richtext-commands.test.tsx`
    - H1..H6
    - paragraph from heading
    - quote toggle
    - bullet and ordered list behavior

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (block command execution flow)
