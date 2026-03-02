# TASK-063-15-01: Section Input Pipeline and Caret Stability
# FileName: TASK-063-15-01_Section_Input_Pipeline_and_Caret_Stability.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-15  
**Status:** To Do

---

## Overview
Usunac przyczyne skoku caret w `Section` (`writing-canvas`) podczas wpisywania pierwszych znakow i zwyklego typingu.

---

## Scope
1. Rozdzielic live editing HTML od strukturalnego roundtripu `writing-canvas`.
2. Ograniczyc przypadki `innerHTML` rewrite w `PostRichTextAdapter`.
3. Zapewnic stabilnosc selekcji przy typingu i szybkich aktualizacjach React state.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - dodac `writingCanvasDraftHtml` (ephemeral) dla aktywnego bloku `writing-canvas`.
   - podczas focus/input karmic adapter draftem HTML bez natychmiastowego roundtrip do nodes.
   - roundtrip do `createWritingCanvasContentFromEditorHtml` wykonywac na commit points (`blur`, explicit command boundary, save boundary).
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - dodac silniejszy guard sync (`normalized emitted html` vs incoming value) oraz testowalny comparator.
   - utrzymac selection restore bez resetu DOM, jesli payload semantycznie nie zmienil tresci.
3. `core/services/posts/editor/postPasteNormalizer.ts`
   - bez zmiany kontraktu parsera na tym etapie; tylko wsparcie helperow needed do comparator/normalization.

---

## Acceptance Criteria
1. Pierwszy znak wpisany w pustym `Section` nie powoduje skoku caret na poczatek.
2. Wpisywanie ciagu znakow nie resetuje pozycji caret ani zaznaczenia.
3. `onChange` nie powoduje zbędnych rewritow `innerHTML` dla semantycznie rownowaznych wartosci.

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/ui/post-richtext-adapter-caret-section.test.tsx` (new)
    - first keystroke in empty `writing-canvas` keeps caret at end.
    - repeated typing does not trigger selection reset.
    - comparator blocks unnecessary DOM rewrites.
  - `tests/unit/posts/post-paste-normalizer.test.ts`
    - roundtrip helper keeps semantically equivalent inline markup stable.
- Integration:
  - `tests/integration/ui/post-editor-section-caret-enter.test.tsx` (new)
    - typing in selected `Section` persists caret position across rerenders.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (typing pipeline + commit boundaries for writing-canvas)
