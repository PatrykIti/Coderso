# TASK-119-04: Assistant Progressive Follow-Up Flow and Mode Prompts
# FileName: TASK-119-04_Assistant_Progressive_Follow_Up_Flow_and_Mode_Prompts.md

**Priority:** Medium  
**Category:** Assistant/Core + UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-119-02, TASK-119-03  
**Status:** To Do

---

## Overview

Wdrozyc deterministic flow follow-up w rozmowie, gdzie assistant po odpowiedzi
`Basic` proponuje kolejne poziomy:
- `Need more detail?` -> `Medium`
- `Need step-by-step instruction?` -> `Instruction`
- `Need advanced scenarios?` -> `Advanced`

oraz tryby pomocnicze:
- `Troubleshooting`
- `Decision Guide`
- `Checklist`
- `Security`

---

## Sub-Tasks

1. Zdefiniowac kontrakt promptow follow-up i mapping do depth/mode.
2. Dodac API payload fields dla wyboru depth/mode w kolejnej turze.
3. Ujednolicic render follow-up chipow w `AssistantMessage`/panelu.
4. Dodac testy UI + route + service dla deterministic multi-turn flow.

---

## Security Contract

- Visibility: `internal` (`POST /admin/api/assistant/chat`)
- Auth: admin session + `settings:read`
- CSRF: required for chat POST
- Rate limit bucket: assistant/admin read limits stay unchanged
- Validation: strict schema for depth/mode selection, reject unknown values
- Anti-abuse: bounded options from server-defined allowlist (no arbitrary mode injection)

---

## Files

- `core/services/assistant/docsTypes.ts`
- `core/services/assistant/assistantService.ts`
- `core/api/admin/routes/assistant.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/AssistantMessage.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/integration/routes/assistant.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/assistant.test.ts`
- `bun test tests/unit/assistant/assistantService.test.ts`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
