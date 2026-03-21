# TASK-118-03: Assistant Widgets and Engine Corpus Enrichment, QA, and Closure
# FileName: TASK-118-03_Assistant_Widgets_Engine_Corpus_Enrichment_QA_and_Closure.md

**Priority:** Medium  
**Category:** Docs/Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-118-01, TASK-118-02  
**Status:** Done (2026-03-21)

---

## Overview

Uzupelnic official assistant corpus tam, gdzie retriever/composer juz dzialaja
lepiej, ale dokumenty nadal nie zawieraja wystarczajaco konkretnej guidance,
szczegolnie dla:
- hero widget colors / visual settings,
- practical engine onboarding (`how can I use engine?`).

---

## Sub-Tasks

1. Dolozyc hero/widget-specific visual guidance do canonical widgets docs.
2. Dolozyc bardziej operacyjny engine usage path do canonical engine docs.
3. Zsynchronizowac task board, architecture/guide/API docs i changelog.
4. Uruchomic final validation.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/assistantService.test.ts`
- `bun test tests/integration/routes/assistant.test.ts`

---

## Documentation Updates Required

- `docs/coderso/widgets-and-template-editor.md`
- `docs/coderso/engine-and-schema-builder.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-21)

- Added widget-specific Hero visual settings guidance to canonical widgets docs.
- Added more operational Engine onboarding steps to canonical engine docs.
- Final validation, board sync, and changelog/docs updates completed.
