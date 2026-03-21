# TASK-119-01: Assistant Docs Authoring Contract for Basic/Medium/Instruction/Advanced
# FileName: TASK-119-01_Assistant_Docs_Authoring_Contract_for_Basic_Medium_Instruction_Advanced.md

**Priority:** High  
**Category:** Docs/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-119  
**Status:** Done (2026-03-21)

---

## Overview

Zdefiniowac i wdrozyc nowy standard authoringu dokumentacji dla asystenta, tak
aby kazdy dokument mial powtarzalne bloki odpowiedzi:
- `Basic`
- `Medium`
- `Instruction`
- `Advanced`
- opcjonalne: `Troubleshooting`, `Decision Guide`, `Checklist`, `Security`.

---

## Sub-Tasks

1. Rozszerzyc `docs/_TEMPLATE.md` o mandatory sekcje poziomow i optional sekcje
   trybow pomocniczych.
2. Dodac reguly stylu contentu (sentence length, imperative style, no marketing
   copy, explicit constraints, explicit prerequisites).
3. Zaktualizowac `docs/README.md` o matrix: "query intent -> preferred section".
4. Dodac walidacje kontraktu w ingest (wymagane sekcje + aliases + backward
   compatibility dla istniejacych docs).

---

## Files

- `docs/_TEMPLATE.md`
- `docs/README.md`
- `core/services/assistant/docsIngestService.ts`
- `tests/vitest/assistant/docsIngestService.test.ts`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts`

---

## Documentation Updates Required

- `docs/_TEMPLATE.md`
- `docs/README.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`

---

## Completion Notes (2026-03-21)

- Replaced docs template contract with `Basic/Medium/Instruction/Advanced` plus
  helper sections (`Troubleshooting`, `Decision Guide`, `Checklist`,
  `Security`).
- Updated `docs/README.md` with required multi-level section model and
  query-intent-to-section matrix.
- Extended ingest validation to accept both legacy and multi-level section packs
  via heading aliases.
