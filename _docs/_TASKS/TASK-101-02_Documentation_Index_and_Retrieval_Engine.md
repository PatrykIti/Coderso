# TASK-101-02: Documentation Index and Retrieval Engine
# FileName: TASK-101-02_Documentation_Index_and_Retrieval_Engine.md

**Priority:** High  
**Category:** Core/Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-01  
**Status:** To Do

---

## Overview

Budujemy silnik Doc Navigatora bez LLM:
- indeksuje `_docs/**/*.md`,
- parsuje sekcje i naglowki,
- zwraca najlepsze trafienia do pytania,
- generuje bezpieczna odpowiedz szablonowa z cytowaniem zrodel.

---

## Technical Design

### Parsing
- Wejscie: markdown files.
- Segment: `document -> headings -> section chunks`.
- Kazdy chunk dostaje metadata:
  - `docPath`, `headingPath`, `lineStart`, `lineEnd`, `tokensEstimate`.

### Retrieval
- Engine: SQLite FTS5 lub BM25 (local, deterministic).
- Query normalization:
  - lowercase,
  - punctuation strip,
  - polish/english stopwords,
  - synonym map (np. "widget" ~ "blok").

### Response composer
- Nie generuje "wolnej" odpowiedzi.
- Uzywa szablonow:
  - `location_answer`
  - `how_to_answer`
  - `missing_answer`.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/assistant/docsIndexService.ts` | new | parse + chunk + index lifecycle |
| `core/services/assistant/docsRetriever.ts` | new | ranked search + topK |
| `core/services/assistant/docsAnswerComposer.ts` | new | deterministic answer templates |
| `core/services/assistant/docsTypes.ts` | new | shared contracts |
| `core/services/assistant/docsIndexService.test.ts` | new | parse/index tests |
| `core/services/assistant/docsRetriever.test.ts` | new | ranking + relevance tests |
| `core/services/assistant/docsAnswerComposer.test.ts` | new | response formatting tests |

---

## Functional Requirements

1. Reindex manual (`POST /assistant/reindex`) i optional on-boot.
2. Minimum 3 source snippets per answer (if available).
3. Max chunk length guard (avoid overly long sections).
4. Brak halucynacji: jesli brak trafienia, zwroc `missing_answer` + propozycje
   doprecyzowania.

---

## Performance Targets

- Cold index build: < 5s for current `_docs` size.
- Query latency docs-only: p95 < 120ms local.
- Memory target (docs-only mode): <= 350MB runtime budget.

---

## Testing Requirements

- Unit: parser handles Polish and English headings.
- Unit: retriever ranks exact section higher than distant matches.
- Unit: missing query returns no fake answer.
- Integration: reindex and query after doc update.

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (docs index design)
- `_docs/CMS_API.md` (reindex/search endpoints once exposed)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-doc-index-and-retrieval.md`
