# TASK-115-02: Ranking and Evidence Selection Tuned for Product Support Questions
# FileName: TASK-115-02_Ranking_and_Evidence_Selection_Tuned_for_Product_Support_Questions.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-115  
**Status:** Done (2026-03-21)

---

## Overview

Poprawic ranking i wybor evidence tak, aby assistant odpowiadal z najlepszych
produktowych dokumentow i sekcji, zamiast trafien tylko tekstowo podobnych.

---

## Scope

1. Dodac section priors:
   - boost: `Step By Step`, `What Is It`, `When To Use`
   - penalty: `Examples` dla pytan konfiguracyjnych
2. Dodac path priors:
   - boost: `docs/screens/*`, `docs/coderso/*`
   - downgrade: changelog/task docs if they ever leak into runtime corpus inputs
3. Dolozyc intent heuristics:
   - `where`
   - `how`
   - `which screen`
4. Upewnic sie, ze selected evidence jest sensowne dla composera, a nie tylko
   najwyzsze czysto tekstowo.
5. Dolozyc mocny signal za zgodny `productArea`, `title`, `keywords`, exact
   module/screen phrase match i query coverage.
6. Obnizyc confidence, gdy top hit nie ma mocnego zgodnego sygnalu domenowego
   albo jest tylko minimalnie lepszy od kolejnego trafienia.

---

## Area Breakdown

### Section Weighting

- `Step By Step` should usually win for direct configuration questions.
- `Examples` should not win over `Step By Step` when the user asks where to configure a setting.

### Document Type Weighting

- canonical screen/module docs > generic playbooks for screen-level questions
- playbooks can still win for broad scenario questions

### Evidence Selection

- top 1-2 chunks for answer composition
- additional chunks only when they materially improve the answer

---

## Files

- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsRetriever.ts` (if heuristics are shared)
- `core/services/assistant/docsAnswerComposer.ts`
- `core/admin/ui/assistant/AssistantMessage.tsx`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`

---

## Pseudocode

```ts
score = bm25Score;
score += sectionWeight(chunk.headingPath, questionIntent);
score += pathWeight(chunk.docPath, questionIntent);
score += exactPhraseBoost(chunk, query);
score -= weakEvidencePenalty(chunk, questionIntent);
```

---

## Testing Requirements

- ranking tests for:
  - screen docs > examples
  - step-by-step > examples for config queries
  - canonical docs > noisy documents

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`

---

## Regression Follow-up (2026-03-21)

Pierwsze zamkniecie taska poprawilo section/path priors, ale pozostawilo zbyt
slaby signal domenowy na etapie wyboru primary evidence.

Zaobserwowane regresje:
- pytanie o `Hero widget colors` potrafilo wybrac `Booking` albo `Themes`,
- pytanie o `widgets` potrafilo promowac `Themes`,
- confidence pozostawalo zbyt wysokie, bo bylo oparte glownie o `topScore`,
- docs-only answer byl poprawniejszy tresciowo, ale nadal renderowal sie jako
  jeden zlany blok tekstu.

Forma naprawy:
1. Oprzec ranking o metadata docs z DB: `productArea`, `title`, `keywords`.
2. Dodac boost za exact module/screen phrase match i query coverage.
3. Dolozyc cross-area penalty, gdy inny produktowy obszar ma wyraznie
   silniejszy signal domenowy.
4. Skalowac confidence nie tylko `topScore`, ale tez domain alignment, score
   gap i coverage.
5. Formatowac docs-only answer do paragrafow i list numerowanych, zeby wynik
   byl czytelny bez zewnetrznego LLM.

## Completion Notes (2026-03-21)

- Added metadata-aware ranking based on `productArea`, doc title, keywords, and
  exact product phrase matches so widget/screen questions stop drifting into
  semantically similar but wrong areas like `Themes` or `Booking`.
- Added cross-area penalties and confidence calibration so weakly aligned hits
  no longer look highly trustworthy just because their raw text score is high.
- Docs-only answers now render as readable paragraphs and numbered steps instead
  of one merged text block.
