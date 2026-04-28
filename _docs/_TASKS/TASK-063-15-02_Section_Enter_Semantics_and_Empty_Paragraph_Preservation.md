# TASK-063-15-02: Section Enter Semantics and Empty Paragraph Preservation
# FileName: TASK-063-15-02_Section_Enter_Semantics_and_Empty_Paragraph_Preservation.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-15-01  
**Status:** Done (2026-03-02)

---

## Overview
Ustabilizowac semantyke `Enter` dla `Section` i przestac tracic puste paragrafy potrzebne do poprawnego osadzenia caret po `Enter` oraz `Enter+Enter`.

---

## Scope
1. Zmienic parser `writing-canvas`, aby nie usuwał celowo utworzonych pustych paragrafow.
2. Utrzymac deterministyczny kontrakt `insertParagraph` dla zwyklego Enter.
3. Zachowac kompatybilnosc z sanitize i existing paste normalization.

---

## Detailed File-Level Plan
1. `core/services/posts/editor/postPasteNormalizer.ts`
   - dodac rozroznienie miedzy "noise empty block" a "user-intended empty paragraph".
   - zachowac puste paragrafy, jesli wynikaja z Enter semantics i sa nośnikami pozycji caret.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - doprecyzowac handling `Enter` dla non-list path z zachowaniem selection anchor.
   - unikac natychmiastowego przebudowania DOM po sekwencji `Enter+Enter`.
3. `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
   - commit path dla `writing-canvas` po Enter ma respektowac preserved empty paragraphs.

---

## Acceptance Criteria
1. Pojedynczy `Enter` w `Section` tworzy nowa linie/paragraph i caret zostaje we właściwym miejscu.
2. `Enter+Enter` nie powoduje skoku caret do pierwszej linii dokumentu.
3. Puste paragrafy utworzone przez Enter nie sa usuwane przez parser przy najblizszym commicie.

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/posts/post-paste-normalizer.test.ts`
    - parser preserves intentional empty paragraph markers.
    - parser still strips invalid empty wrappers/noise.
  - `tests/unit/ui/post-richtext-adapter-caret-section.test.tsx`
    - Enter path keeps selection anchor in new paragraph.
- Integration:
  - `tests/integration/ui/post-editor-section-caret-enter.test.tsx`
    - single Enter behavior in Section.
    - double Enter behavior in Section.
    - no jump-to-top regression after Enter sequence.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (Enter semantics for writing-canvas)

---

## Closure Note (2026-03-02)
Parser `writing-canvas` zachowuje intencjonalne puste paragrafy (`<p><br></p>`), co stabilizuje sekwencje `Enter` i `Enter+Enter`; kontrakt potwierdzono testami normalizera/paste.
