# TASK-119-03: Assistant Corpus Enrichment for Multi-Level Answers
# FileName: TASK-119-03_Assistant_Corpus_Enrichment_for_Multi_Level_Answers.md

**Priority:** High  
**Category:** Docs/Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-119-01  
**Status:** To Do

---

## Overview

Rozbudowac corpus `docs/` tak, aby wszystkie kluczowe powierzchnie (Coderso,
screens, playbooks) mialy komplet materialu dla poziomow:
`Basic`, `Medium`, `Instruction`, `Advanced` oraz sensowne bloki
`Troubleshooting`, `Decision Guide`, `Checklist`, `Security` tam, gdzie to ma
wartosc produktowa.

---

## Sub-Tasks

1. Dodac szczegolowe instrukcje do wszystkich modułow `docs/coderso/*`.
2. Dodac scenariusze zaawansowane i decyzje konfiguracyjne dla `docs/screens/*`.
3. Ujednolicic playbooki pod checklists i failure modes.
4. Utrzymac deterministic IDs/anchors sekcji dla stabilnego retrievalu.
5. Dolozyc corpus QA list: coverage per surface i per level.

---

## Files

- `docs/coderso/*.md`
- `docs/screens/*.md`
- `docs/playbooks/*.md`
- `docs/solution-kits/*.md`
- `docs/_COVERAGE_MATRIX.md`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted assistant retriever/composer suites:
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- manual corpus integrity pass (headers + required levels + examples)

---

## Documentation Updates Required

- `docs/*`
- `docs/_COVERAGE_MATRIX.md`
- `docs/README.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
