# TASK-063-13-02: RichText Input Caret Stability and Enter Semantics
# FileName: TASK-063-13-02_RichText_Input_Caret_Stability_and_Enter_Semantics.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-13-01  
**Status:** To Do

---

## Overview
Naprawic niestabilnosc caret i newline behavior dla blokow tekstowych:
- `writing-canvas` (`Section`)
- `paragraph`
- `heading`
- `quote`

---

## Scope
1. Rozdzielic pipeline `typing` i `paste` dla `writing-canvas`.
2. Ustabilizowac `PostRichTextAdapter` (selection-safe sync).
3. Ujednolicic semantyke `Enter` (blokowy paragraph, bez skokow caret).
4. Dodac html pre-normalization aliasow (`div/b/i`) dla editor output.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - dla `writing-canvas` uzyc dedicated typing converter (nie `createWritingCanvasContentFromPaste`).
   - utrzymac paste directives tylko w `onPaste`.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - dodac guard przed pelnym `innerHTML` resetem podczas lokalnej edycji.
   - dodac deterministic `Enter` handling (`insertParagraph`) i alias pre-normalization.
3. `core/services/posts/editor/postRichTextSerializer.ts`
   - dodac normalize phase dla browser tags (`b/i/div`) przed sanitize/serialize.
4. `core/services/posts/editor/postRichTextSanitizer.ts`
   - zapewnic transformacje blokowe kompatybilne z editor DOM.
5. `core/services/posts/editor/postPasteNormalizer.ts`
   - dodac nowy helper `createWritingCanvasContentFromEditorHtml` (typing-safe).

---

## Pseudocode
```ts
function onRichTextInput(html: string) {
  const normalized = normalizeEditorHtml(html); // div->p, b->strong, i->em
  if (block.type === "writing-canvas") {
    const content = createWritingCanvasContentFromEditorHtml(normalized);
    updateBlockContent(block.id, content);
  } else {
    updateBlockContent(block.id, normalized);
  }
}

useEffect(() => {
  if (isLocalInputFrame) return; // avoid caret reset
  syncInnerHtmlFromExternalValue();
}, [value]);
```

---

## Acceptance Criteria
1. Wpisanie pierwszego znaku w pustym `Section` nie powoduje przeskoku caret.
2. `Enter` w `paragraph`/`heading`/`quote` tworzy nowa linie/akapit bez jumpu.
3. Zwykly typing nie uruchamia heurystyk paste normalizera.
4. Brak regresji w paste (`Word`, `Docs`, `HTML`, image paste).

---

## Testing Requirements
- Unit (new/updated):
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - case: `b/i/div` alias normalization.
  - `tests/unit/posts/post-paste-normalizer.test.ts`
    - case: `createWritingCanvasContentFromEditorHtml` nie emituje paste warnings.
  - `tests/unit/ui/post-editor-state-normalization.test.ts`
    - case: writing-canvas typing update keeps deterministic content envelope.
- Integration (new):
  - `tests/integration/ui/post-editor-richtext-caret.test.tsx`
    - first-char behavior in empty writing-canvas.
    - enter behavior paragraph/heading/quote.
  - `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
    - no regression for slash/paste integration after typing pipeline split.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (typing vs paste data-flow contract)
- `_docs/CODERSO_MODULES.md` (richtext adapter behavioral guarantees)

