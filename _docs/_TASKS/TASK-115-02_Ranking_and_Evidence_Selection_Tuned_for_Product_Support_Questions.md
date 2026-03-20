# TASK-115-02: Ranking and Evidence Selection Tuned for Product Support Questions
# FileName: TASK-115-02_Ranking_and_Evidence_Selection_Tuned_for_Product_Support_Questions.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-115  
**Status:** To Do

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
- `tests/vitest/assistant/docsDbRetriever.test.ts`

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
