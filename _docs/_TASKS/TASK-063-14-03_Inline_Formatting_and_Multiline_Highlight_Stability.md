# TASK-063-14-03: Inline Formatting and Multiline Highlight Stability
# FileName: TASK-063-14-03_Inline_Formatting_and_Multiline_Highlight_Stability.md

**Priority:** High  
**Category:** Admin/UI + Editor Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-02  
**Status:** Done (2026-02-28)

---

## Overview
Naprawic formatowanie inline dla wieloliniowych selekcji, szczegolnie `highlight`, bez niszczenia ukladu linii i blokow.

---

## Scope
1. Ustabilizowac `highlight` na zakresach obejmujacych wiele linii.
2. Utrzymac strukture blokowa (`p/h*/blockquote/li`) po formatowaniu.
3. Zachowac poprawnosc dla `bold/italic/underline/strike/link` na granicach linii.
4. Zapewnic idempotentna normalizacje inline marks po zapisie/odswiezeniu.

---

## Inline Behavior Contract (Locked)
1. `Highlight`:
   - na multiline selection wrapuje tylko text-runs, bez flattenowania blokow,
   - nie scala osobnych akapitow/naglowkow w jeden blok.
2. `bold/italic/underline/strike`:
   - dzialaja na granicach blokow i nie gubia tekstu na granicach runow.
3. `link`:
   - collapsed selection: wstawia poprawny `<a ...>label</a>`,
   - range selection: wrapuje istniejacy tekst, bez dopisywania duplikatow.
4. `clear-formatting`:
   - usuwa inline marks bez degradacji struktury blokowej.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts` (new/extended)
   - dodac range-safe `applyInlineCommand` dla `highlight` i pozostalych marks.
   - unikac flattenowania selekcji do jednego text run.
2. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - podpiac inline command path do engine.
   - utrzymac poprawne restore/save selection po komendzie.
3. `core/services/posts/editor/postRichTextSerializer.ts`
   - upewnic sie, ze serializer nie scala blokow po inline markach i jest idempotentny.
4. `core/services/posts/editor/postPasteNormalizer.ts`
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
4. Wynik po serialize/deserialize pozostaje semantycznie rownowazny (bez utraty markow).

---

## Testing Requirements (Target)
- Unit:
  - `tests/unit/posts/post-richtext-command-engine.test.ts`
    - multiline `highlight` across `p + h2 + p`.
    - `bold/italic/underline/strike` na selekcji obejmujacej granice blokow.
    - `clear-formatting` usuwa marks, ale zachowuje bloki.
    - `link` collapsed vs non-collapsed selection.
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - multiline mark preservation po serialize.
    - idempotency dla zagniezdzonych markow (`strong/em/mark/code/a`).
  - `tests/unit/posts/post-paste-normalizer.test.ts`
    - brak regresji mapowania `mark/code/link` po paste-normalization.
- Integration/contract:
  - `tests/integration/ui/post-editor-richtext-selection-contract.test.tsx` (new)
    - highlight na multiline selection (`paragraph + heading + paragraph`).
    - link command na selection collapsed i non-collapsed.
    - clear-formatting na fragmencie z wieloma markami.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (inline range processing rules)

---

## Closure Note (2026-02-28)
Utrzymano stabilnosc multiline `highlight` i inline command execution path przy zachowaniu struktury blokow; kontrakt pokrywaja testy selection/command i pelna regresja.
