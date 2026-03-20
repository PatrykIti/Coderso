# TASK-115-01: Assistant Answer Contract and Content-First Composer Model
# FileName: TASK-115-01_Assistant_Answer_Contract_and_Content_First_Composer_Model.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-115  
**Status:** To Do

---

## Overview

Zmienic `docsAnswerComposer`, aby budowal faktyczna odpowiedz produktowa z tresci
trafionych chunkow, a nie liste lokalizacji.

---

## Scope

1. Zmienic shape odpowiedzi dla:
   - `location_answer`
   - `how_to_answer`
2. Odpowiedz ma byc budowana z:
   - top snippet,
   - ewentualnego screen/module context,
   - kolejnego kroku jesli wynik na to pozwala.
3. Nie wolno wprowadzać halucynacji:
   - tylko tresc obecna w evidence/chunkach,
   - zero zgadywania poza corpus.
4. `missing_answer` zostaje jawne i konserwatywne.

---

## Detailed Work Breakdown

### Contract

- `answer` ma byc pelnym user-facing response text.
- `template` dalej moze zostac technicznym typem (`location_answer`, `how_to_answer`, `missing_answer`).
- `sources` zostaja w payload jako warstwa secondary/debug, ale nie determinuja struktury `answer`.

### Composition Rules

- `location_answer`
  - ma powiedziec gdzie kliknac / jaki ekran otworzyc / jaka zakladke wybrac.
- `how_to_answer`
  - ma powiedziec jak wykonac workflow krok po kroku w skroconej formie.
- Jesli top evidence jest niejednoznaczne:
  - odpowiedz ma to powiedziec,
  - ale nadal nie ma wracac do listy plikow jako glowny output.

---

## Files

- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/docsTypes.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`

---

## Pseudocode

```ts
const topHit = hits[0];
const intent = inferIntent(question);

if (!topHit) return missingAnswer();

if (intent === "where") {
  return composeWhereAnswerFromSnippet(topHit.snippet, topHit.chunk.headingPath);
}

return composeHowAnswerFromTopEvidence(hits.slice(0, 2));
```

---

## Testing Requirements

- direct composer tests for:
  - `where can I configure ...`
  - `how do I ...`
  - weak evidence / missing answer

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
