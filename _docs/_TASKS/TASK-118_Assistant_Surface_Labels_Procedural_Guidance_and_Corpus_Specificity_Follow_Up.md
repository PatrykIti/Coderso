# TASK-118: Assistant Surface Labels, Procedural Guidance, and Corpus Specificity Follow-Up
# FileName: TASK-118_Assistant_Surface_Labels_Procedural_Guidance_and_Corpus_Specificity_Follow_Up.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-117  
**Status:** Done (2026-03-21)

---

## Overview

Domknac follow-up po `TASK-117`, bo po ostatnich poprawkach zostaly trzy realne
problemy produktowe:

1. Assistant potrafi pokazac sekcje (`Examples`, `What Is It`) jako `surface`
   zamiast nazwy dokumentu / modulu.
2. Dla pytan proceduralnych typu `how can I use engine?` odpowiedz nadal potrafi
   wybrac `When To Use` zamiast `Step By Step`.
3. Dla pytan typu `Where can I configure Hero widget colors?` ranking jest juz
   blizej wlasciwego dokumentu, ale corpus nie zawiera wystarczajaco konkretnej
   instrukcji hero/colors-specific, wiec final answer pozostaje zbyt ogolna.

---

## Sub-Tasks

1. `TASK-118-01` - propagate doc metadata into assistant evidence and fix
   user-facing surface labels.
2. `TASK-118-02` - tune procedural `how/use` ranking and section-aware answer
   composition to prefer `Step By Step`.
3. `TASK-118-03` - enrich official docs corpus for widgets/engine gaps and close
   QA/docs/changelog.

---

## Security Contract

- Visibility: `internal` (`POST /admin/api/assistant/chat`)
- Auth: admin session + `settings:read`
- CSRF: required for chat POST
- Rate limit bucket: existing assistant/admin read limits stay unchanged
- Validation: strict schema validation at route boundary, reject unknown fields
- Anti-abuse: no public write path; prompt content remains sanitized and bounded

---

## Files

- `core/services/assistant/docsTypes.ts`
- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/assistantService.ts`
- `docs/coderso/widgets-and-template-editor.md`
- `docs/coderso/engine-and-schema-builder.md`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/assistantService.test.ts`
- `bun test tests/integration/routes/assistant.test.ts`

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-21)

- Propagated canonical doc metadata into assistant evidence so surface labels now
  resolve to the document/module title instead of the selected section heading.
- Tuned procedural `how/use` behavior so `Step By Step` wins more reliably over
  `When To Use` for actionable guidance.
- Enriched official widgets/engine docs so Hero visual settings and Engine
  onboarding have concrete, answerable corpus coverage.
- Validation completed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
