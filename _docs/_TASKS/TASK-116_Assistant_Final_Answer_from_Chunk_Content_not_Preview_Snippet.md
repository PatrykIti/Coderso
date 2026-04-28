# TASK-116: Assistant Final Answer from Chunk Content, not Preview Snippet
# FileName: TASK-116_Assistant_Final_Answer_from_Chunk_Content_not_Preview_Snippet.md

**Priority:** Medium  
**Category:** Assistant/Core  
**Estimated Effort:** Small  
**Dependencies:** TASK-115  
**Status:** Done (2026-03-20)

---

## Overview

Naprawic bug composera, w ktorym finalna odpowiedz byla budowana z
preview-snippetu searchowego zamiast z pełnej tresci chunku.

---

## Sub-Tasks

1. Zastapic `hit.snippet` w final answer path przez `hit.chunk.content`.
2. Dodac bezpieczne skrocenie po granicach zdan lub list krokow.
3. Dolozyc regresy potwierdzajace brak urywanych `…snippet…` odpowiedzi.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
- `bun test tests/unit/assistant/assistantService.test.ts`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Final answer composition now uses chunk content instead of the preview snippet.
- Added sentence/list-aware truncation to keep answers readable without arbitrary preview clipping.
- Added regressions proving that `…snippet…` style truncation is no longer the source of the user-facing answer.
