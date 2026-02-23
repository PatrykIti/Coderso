# TASK-062-03: Replace Pasted Word TOC with Dynamic TOC
# FileName: TASK-062-03_Replace_Pasted_Word_TOC_with_Dynamic_TOC.md

**Priority:** High  
**Category:** Core/Editor + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-062-01, TASK-062-02  
**Status:** To Do

---

## Overview
Wykrywac wklejony z Worda "Spis tresci" i automatycznie zamieniac go na dynamiczny TOC block, zeby uniknac martwych linkow i niespojnosci.

---

## Sub-Tasks
1. Rozszerzyc smart-paste parser o detekcje Word TOC:
   - linki `href="#_Toc..."`,
   - sekwencje numerowanych heading-like line items.
2. Dodac `paste directives` do wyniku normalizacji:
   - `replaceWordTocWithDynamicToc: boolean`,
   - opcjonalne metadane diagnostyczne.
3. W adapterze edytora przy aktywnej dyrektywie:
   - usunac statyczny TOC fragment z wklejonej tresci,
   - wstawic (lub reuse) `toc` block w logicznym miejscu dokumentu.
4. Dodac user notice:
   - "Detected Word table of contents. Replaced with dynamic TOC."
5. Zapewnic idempotencje:
   - wielokrotny paste nie tworzy duplikatow TOC block bez intencji autora.

---

## Files to Create / Change
- `core/services/posts/editor/postPasteNormalizer.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/ui/posts/editor/postEditorStore.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/posts/post-paste-normalizer.test.ts`
- `tests/integration/ui/post-editor-paste-from-word.test.tsx`
- `tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`

---

## Pseudocode
```ts
function detectWordToc(nodes): boolean {
  const tocLinks = nodes.filter(isParagraphWithWordTocHref);
  const tocDensity = tocLinks.length / Math.max(nodes.length, 1);
  return tocLinks.length >= 3 && tocDensity > 0.15;
}

function normalizePostPastePayload(input) {
  const result = parseAndMap(input);
  if (detectWordToc(result.nodes)) {
    result.nodes = removeWordTocParagraphs(result.nodes);
    result.directives.replaceWordTocWithDynamicToc = true;
    result.warnings.push("word_toc_replaced");
  }
  return result;
}

function applyPasteToEditor(result) {
  insertNodes(result.nodes);
  if (result.directives.replaceWordTocWithDynamicToc) {
    ensureSingleDynamicTocBlockNearTop();
  }
}
```

---

## Acceptance Criteria
1. Wklejenie dokumentu Word ze spisem tresci nie pozostawia `#_Toc...` linkow w finalnym dokumencie.
2. Edytor automatycznie tworzy dynamiczny TOC block.
3. Runtime preview/public pokazuje dzialajacy TOC.
4. Brak duplikacji TOC block przy wielokrotnym paste.

---

## Testing Requirements
- Unit: Word TOC detection heuristics.
- Unit: paste directives contract.
- Integration: full paste flow (Word fixture z TOC -> dynamic TOC in editor + runtime).

---

## Documentation Updates Required
- `_docs/CMS_API.md` (smart paste directives + TOC replacement behavior)
- `_docs/ARCHITECTURE.md` (paste pipeline extension)

