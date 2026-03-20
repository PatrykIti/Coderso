# TASK-115: Assistant Product Answer Composer and Evidence UX Simplification
# FileName: TASK-115_Assistant_Product_Answer_Composer_and_Evidence_UX_Simplification.md

**Priority:** High  
**Category:** Assistant + Product UX + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-109, TASK-114  
**Status:** Done (2026-03-20)

---

## Overview

Przebudowac warstwe odpowiedzi asystenta tak, aby przestala zachowywac sie jak
indeks dokumentow, a zaczela odpowiadac jak realny produktowy assistant.

Aktualny problem biznesowy:
- user pyta: `Where can I configure Hero widget colors?`
- assistant zwraca:
  - liste lokalizacji dokumentow,
  - headingi,
  - badge `Sources`,
  - i wymaga od usera samodzielnego domyslenia sie odpowiedzi.

To jest zly kontrakt produktu, bo:
- user potrzebuje konkretnej odpowiedzi,
- nie ma dostepu do raw source docs jako osobnego surface,
- lista lokalizacji nie pomaga wykonac nastepnego kroku w UI.

Docelowo assistant ma:
- dawac krotka, konkretna odpowiedz oparta o tresc artykulu,
- wskazywac kolejny krok lub ekran, jesli to potrzebne,
- traktowac evidence jako warstwe wewnetrzna lub secondary,
- nie eksponowac `Sources` w standardowym user-facing flow, jesli nie prowadza do realnego, otwieralnego surface.

---

## Business Goal

1. Assistant ma odpowiadac trescia, nie lokalizacja.
2. User ma dostac odpowiedz typu:
   - `Open Widgets, edit the Hero template, then use the Visual tab to change colors.`
   a nie:
   - `Most relevant locations in docs: ...`
3. Zrodla nie maja byc domyslnym outputem produktu, bo nie sa dla usera operacyjnie uzyteczne.
4. Ranking ma preferowac kanoniczne dokumenty ekranow i workflow zamiast changelogow,
   task docs lub drugorzednych sekcji typu `Examples`.

---

## Product Contract

### User-facing answer

1. Glowny output = `answer` z tresci top trafien.
2. Odpowiedz ma byc:
   - konkretna,
   - krotka,
   - oparta o rzeczywiste snippet/chunk content,
   - bez halucynacji i bez dopowiadania spoza corpus.
3. Przy pytaniach `where / how / which screen` assistant ma zwracac:
   - akcje,
   - screen/module,
   - ewentualny kolejny krok.

### Evidence / sources

1. `Sources` nie sa domyslnie renderowane w standardowym user-facing chat UI.
2. Evidence pozostaje w runtime contract lub debug surface tylko wtedy, gdy jest potrzebne do:
   - QA,
   - audytu,
   - ewentualnego future admin-debug mode.
3. User-facing flow nie moze wygladac jak search/index explorer.

### Ranking

1. Preferowane dokumenty:
   - `docs/screens/*`
   - `docs/coderso/*`
   - `docs/solution-kits/*`
   - `docs/playbooks/*`
2. Preferowane sekcje:
   - `Step By Step`
   - `What Is It`
   - `When To Use`
3. Sekcje/slaby content do obniżenia:
   - `Examples` dla pytan konfiguracyjnych,
   - changelog/task-like docs,
   - zbyt ogolne sekcje bez instrukcji.

---

## Sub-Tasks

1. `TASK-115-01` - assistant answer contract and content-first composer model.
2. `TASK-115-02` - ranking and evidence selection tuned for product support questions.
3. `TASK-115-03` - UI rendering cleanup: hide sources in default chat flow and render answer-first hierarchy.
4. `TASK-115-04` - QA, docs, changelog, and closure.

---

## Architecture / Implementation Order

1. Najpierw zamrozic kontrakt outputu odpowiedzi.
2. Potem poprawic ranking i evidence selection.
3. Dopiero na koncu dopasowac UI do answer-first contract.
4. Nie wolno zaczynac od samego ukrycia `Sources` w UI bez zmiany composera,
   bo user zostanie z odpowiedzia niskiej jakosci, tylko bez widocznych wskazowek dlaczego.

---

## Files to Change

- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsRetriever.ts` (if shared ranking heuristics stay aligned)
- `core/services/assistant/docsTypes.ts`
- `core/services/assistant/assistantService.ts`
- `core/admin/ui/assistant/AssistantMessage.tsx`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

---

## Pseudocode

```ts
const hits = rankDocsForProductQuestion(question, dbRows);
const evidence = selectTopEvidence(hits, {
  preferredSections: ["step by step", "what is it", "when to use"],
  deprioritizedSections: ["examples"],
});

const answer = composeProductAnswer({
  question,
  evidence,
  mode: inferQuestionIntent(question), // where/how/which-screen
});

return {
  answer,
  confidence,
  sources: evidence, // keep in payload for debug/secondary use
};
```

```tsx
<AssistantMessage>
  <MainAnswer />
  {showSourcesInDebugMode ? <SourcesPanel /> : null}
</AssistantMessage>
```

---

## Acceptance Criteria

1. A configuration question returns a direct answer from article content, not a list of files.
2. Canonical product docs outrank changelog/task-like material for normal support queries.
3. The default chat UI does not show `Sources` as a first-class block.
4. The main answer is understandable without reading any supporting metadata.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted assistant composer/ranking/UI suites
- targeted assistant runtime suite for end-to-end answer contract

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Replaced the old location-list answer behavior with a content-first assistant answer contract.
- Added ranking priors for canonical product docs and stronger sections.
- Hid default `Sources` rendering from the standard chat UI.
