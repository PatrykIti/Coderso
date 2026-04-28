# TASK-119-02: Assistant Depth-Aware Retrieval and Composer Contract
# FileName: TASK-119-02_Assistant_Depth_Aware_Retrieval_and_Composer_Contract.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-119-01  
**Status:** Done (2026-03-21)

---

## Overview

Rozszerzyc retriever/composer tak, aby odpowiedz byla dobierana nie tylko po
intent (`location/capability/procedural`), ale tez po poziomie szczegolowosci:
`basic`, `medium`, `instruction`, `advanced`, plus tryby pomocnicze
(`troubleshooting`, `decision_guide`, `checklist`, `security`).

---

## Sub-Tasks

1. Dodac depth/mode do kontraktu typow assistant answer.
2. Rozszerzyc scoring o priorytety sekcji poziomow.
3. Dodac deterministic fallback:
   - brak `Instruction` -> zaproponuj `Medium` + pytanie follow-up,
   - brak `Advanced` -> zaproponuj najblizszy scenariusz + ograniczenia.
4. Dodac coverage testowa dla wszystkich poziomow odpowiedzi.

---

## Security Contract

- Visibility: `internal` (`POST /admin/api/assistant/chat`)
- Auth: admin session + `settings:read`
- CSRF: required for chat POST
- Rate limit bucket: assistant/admin read limits stay unchanged
- Validation: strict schema, reject unknown fields
- Anti-abuse: no public write path; bounded and sanitized user input

---

## Files

- `core/services/assistant/docsTypes.ts`
- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/assistantService.ts`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/unit/assistant/assistantService.test.ts`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- `bun test tests/unit/assistant/assistantService.test.ts`

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

---

## Completion Notes (2026-03-21)

- Added typed assistant depth/mode contract:
  - `detailLevel`: `basic|medium|instruction|advanced`
  - `guideMode`: `default|troubleshooting|decision_guide|checklist|security`
- Extended retriever and composer section scoring for multi-level and
  mode-specific section targeting.
- Added deterministic `followUpOptions[]` generation in composed docs answers.
- Updated assistant runtime/service result contract to propagate new fields.
