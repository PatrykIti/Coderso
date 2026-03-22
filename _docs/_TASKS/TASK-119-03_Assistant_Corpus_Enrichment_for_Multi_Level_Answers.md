# TASK-119-03: Assistant Corpus Enrichment for Multi-Level Answers
# FileName: TASK-119-03_Assistant_Corpus_Enrichment_for_Multi_Level_Answers.md

**Priority:** High  
**Category:** Docs/Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-119-01  
**Status:** Done (2026-03-21)

---

## Overview

Rozbudowac corpus `docs/` tak, aby wszystkie kluczowe powierzchnie (Coderso,
screens, playbooks) mialy komplet materialu dla poziomow:
`Basic`, `Medium`, `Instruction`, `Advanced` oraz sensowne bloki
`Troubleshooting`, `Decision Guide`, `Checklist`, `Security` tam, gdzie to ma
wartosc produktowa.

---

## Sub-Tasks

1. Dodac szczegolowe instrukcje do kluczowych high-traffic modulow Coderso.
2. Dodac scenariusze zaawansowane i decyzje konfiguracyjne dla
   high-traffic surfaces w `docs/screens/*`.
3. Utrzymac deterministic IDs/anchors sekcji dla stabilnego retrievalu.
4. Dolozyc corpus QA list: coverage per surface i per level.

---

## Files

- `docs/coderso/widgets-and-template-editor.md`
- `docs/coderso/engine-and-schema-builder.md`
- `docs/coderso/entries-and-record-editing.md`
- `docs/coderso/posts.md`
- `docs/coderso/commerce.md`
- `docs/coderso/booking.md`
- `docs/screens/email-settings.md`
- `docs/screens/storage-settings.md`
- `docs/screens/integrations.md`
- `docs/screens/api-keys.md`
- `docs/screens/webhooks.md`
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

---

## Completion Notes (2026-03-21)

- Migrated key assistant corpus docs to the multi-level section layout:
  - `docs/coderso/widgets-and-template-editor.md`
  - `docs/coderso/engine-and-schema-builder.md`
  - `docs/coderso/entries-and-record-editing.md`
  - `docs/coderso/posts.md`
  - `docs/coderso/commerce.md`
  - `docs/coderso/booking.md`
  - `docs/screens/email-settings.md`
  - `docs/screens/storage-settings.md`
  - `docs/screens/integrations.md`
  - `docs/screens/api-keys.md`
  - `docs/screens/webhooks.md`
- Added detailed procedural and advanced guidance blocks plus troubleshooting,
  decision, checklist, and security content for these high-traffic surfaces.
