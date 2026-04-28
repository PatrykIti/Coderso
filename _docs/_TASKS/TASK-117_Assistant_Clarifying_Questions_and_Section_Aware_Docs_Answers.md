# TASK-117: Assistant Clarifying Questions and Section-Aware Docs Answers
# FileName: TASK-117_Assistant_Clarifying_Questions_and_Section_Aware_Docs_Answers.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-115, TASK-116  
**Status:** Done (2026-03-21)

---

## Overview

Domknac docs-only assistant po follow-upie do `TASK-115-02`, tak aby:
- nie wybieral sekcji `Examples` lub `Common Mistakes` jako primary answer dla
  pytan `where / features / what can I do`,
- wybieral najpierw wlasciwy dokument/surface, a dopiero potem najlepsza sekcje
  do odpowiedzi,
- zadawal pytanie doprecyzowujace, gdy evidence jest zbyt slabe albo
  niejednoznaczne,
- nie ucinal odpowiedzi w pol zdania, jesli mozna zwrocic krotsza, ale kompletna
  odpowiedz.

---

## Sub-Tasks

1. Dodac query intent dla capability / feature questions (`what can I do`,
   `features`, `available`, `options`) i dopasowac section priors.
2. Dolozyc doc-first evidence selection:
   - najpierw wybrac dominant document/surface,
   - potem wybrac najlepsza sekcje w jego obrebie (`Step By Step`, `What Is It`,
     `When To Use`) zalezne od intencji.
3. Dodac deterministic `clarifying_question` answer template, gdy top evidence
   jest niejednoznaczne lub zbyt slabe.
4. Upewnic sie, ze `llm-rag` nie obchodzi clarification path przez zbyt wczesne
   odpalenie providera.
5. Zmienic answer shaping tak, aby zachowywal pelne zdania zamiast urywanego
   `...`, jesli mozna zwrocic krotsza kompletna tresc.
6. Dolozyc testy retriever/composer/service/UI/routes i zsynchronizowac docs.

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

- `core/services/assistant/docsDbRetriever.ts`
- `core/services/assistant/docsAnswerComposer.ts`
- `core/services/assistant/docsTypes.ts`
- `core/services/assistant/assistantService.ts`
- `core/admin/ui/assistant/AssistantMessage.tsx`
- `core/admin/services/assistantClient.ts`
- `tests/vitest/assistant/docsDbRetriever.test.ts`
- `tests/vitest/assistant/docsAnswerComposer.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/unit/assistant/assistantService.test.ts`
- `tests/integration/routes/assistant.test.ts`
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

- Added deterministic clarification flow via `clarifying_question` when the top
  docs remain ambiguous instead of returning a high-confidence wrong answer.
- Added doc-first, section-aware answer composition so capability questions pull
  from `What Is It` and location/procedural questions pull from `Step By Step`
  instead of leaking `Examples` or `Common Mistakes` into the primary answer.
- Updated docs-only answer shaping to prefer complete sentences and structured
  blocks over half-cut text.
- Validation completed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
