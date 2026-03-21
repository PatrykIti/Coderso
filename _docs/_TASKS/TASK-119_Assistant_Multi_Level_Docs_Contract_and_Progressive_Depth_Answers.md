# TASK-119: Assistant Multi-Level Docs Contract and Progressive-Depth Answers
# FileName: TASK-119_Assistant_Multi_Level_Docs_Contract_and_Progressive_Depth_Answers.md

**Priority:** High  
**Category:** Assistant + Docs + UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-118  
**Status:** Done (2026-03-21)

---

## Overview

Rozszerzyc oficjalny corpus asystenta i kontrakt odpowiedzi `docs-only`, aby
odpowiedzi byly warstwowe i prowadzone konwersacyjnie:

1. `[Basic]` - krotki, szybki opis "co to jest / po co to jest".
2. `[Medium]` - bardziej szczegolowy opis po potwierdzeniu, ze user chce wiecej.
3. `[Instruction]` - konkretna instrukcja krok po kroku po potwierdzeniu.
4. `[Advanced]` - scenariusze konfiguracji, trade-offy, anti-patterny.

Dodatkowo assistant ma umiec zaproponowac tryby pomocnicze:
- `Troubleshooting` (diagnoza i naprawa),
- `Decision Guide` (co wybrac i kiedy),
- `Checklist` (gotowosc do wdrozenia/publikacji),
- `Security` (ryzyka i wymagania hardeningu).

---

## Sub-Tasks

1. `TASK-119-01` - Authoring contract i template docs dla poziomow
   `Basic/Medium/Instruction/Advanced` + tryby pomocnicze.
2. `TASK-119-02` - Rozszerzenie retriever/composer/service o selection by
   requested depth i depth-follow-up prompts.
3. `TASK-119-03` - Enrichment corpusu `docs/` (Coderso + screens + playbooks)
   zgodnie z nowym kontraktem sekcji.
4. `TASK-119-04` - UX rozmowy: deterministic follow-up (`Need more detail?`,
   `Need steps?`, `Need advanced scenario?`) i routing do odpowiednich sekcji.
5. `TASK-119-05` - QA, docs/changelog sync, board closure.

---

## Security Contract

- Visibility: `internal` (`POST /admin/api/assistant/chat`)
- Auth: admin session + `settings:read`
- CSRF: required for chat POST
- Rate limit bucket: assistant/admin read limits stay unchanged
- Validation: strict payload schema, reject unknown fields
- Anti-abuse: no public write path, bounded text inputs, sanitized prompt surface

---

## Files

- `docs/_TEMPLATE.md`
- `docs/README.md`
- `docs/*` (all assistant corpus families)
- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/assistantService.ts`
- `core/services/assistant/docsTypes.ts`
- `core/admin/ui/assistant/AssistantMessage.tsx`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/unit/assistant/assistantService.test.ts`
- `tests/integration/routes/assistant.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/assistantService.test.ts`
- `bun test tests/integration/routes/assistant.test.ts`

---

## Documentation Updates Required

- `docs/README.md`
- `docs/_TEMPLATE.md`
- `docs/*`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` (on completion)

---

## Completion Notes (2026-03-21)

- Delivered multi-level docs-only answer contract with `detailLevel` and
  `guideMode` routing.
- Added progressive follow-up options in assistant response payload and admin UI
  rendering flow.
- Updated corpus authoring contract and enriched key high-traffic docs surfaces
  (`widgets`, `engine`, `entries`, `posts`, `commerce`, `booking`,
  `email/storage/integrations`).
- Synced architecture/API/assistant guide docs, task board, and changelog.
