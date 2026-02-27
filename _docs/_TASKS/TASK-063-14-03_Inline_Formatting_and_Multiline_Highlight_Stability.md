# TASK-063-14-03: Inline Formatting and Multiline Highlight Stability
# FileName: TASK-063-14-03_Inline_Formatting_and_Multiline_Highlight_Stability.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-02  
**Status:** To Do

---

## Overview
Naprawic formatowanie inline dla wieloliniowych selekcji, szczegolnie `highlight`, bez niszczenia ukladu linii i blokow.

---

## Scope
1. Ustabilizowac `highlight` na zakresach obejmujacych wiele linii.
2. Utrzymac strukture blokowa (`p/h*/blockquote/li`) po formatowaniu.
3. Zachowac poprawnosc dla `bold/italic/underline/strike/link` na granicach linii.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - wdrozyc range-safe `applyInlineCommand`.
   - dla multiline selection iterowac po text runs per block zamiast flatten do jednego run.
2. `core/services/posts/editor/postRichTextSerializer.ts`
   - upewnic sie, ze serializer nie scala blokow po inline markach.
3. `core/services/posts/editor/postPasteNormalizer.ts`
   - potwierdzic brak regresji mapowania do nodes po multiline marks.

---

## Pseudocode
```ts
function applyHighlight(selection: Range) {
  const textRuns = collectTextRuns(selection); // per block run
  for (const run of textRuns) {
    wrapRun(run, "mark");
  }
  normalizeAdjacentMarks();
}
```

---

## Acceptance Criteria
1. `Highlight` na 5+ liniach nie skleja tekstu do jednej linii.
2. Struktura akapitow i naglowkow zostaje zachowana.
3. Inne komendy inline nadal dzialaja poprawnie.

---

## Testing Requirements
- Unit (new):
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - multiline mark preservation.
- Integration (new):
  - `tests/integration/ui/post-editor-richtext-selection.test.tsx`
    - multiline highlight across paragraphs/headings.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (inline range processing rules)
