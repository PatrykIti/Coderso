# TASK-164: Assistant Coderso Split Reference Cleanup
# FileName: TASK-164_Assistant_Coderso_Split_Reference_Cleanup.md

**Priority:** Medium  
**Category:** Docs/QA  
**Estimated Effort:** Small  
**Dependencies:** `_docs/CMS_API.md`, `tests/vitest/assistant/*`, `tests/unit/assistant/*`  
**Status:** Done (2026-03-22)

---

## Overview

Clean up stale references to pre-split `docs/coderso/*` articles after the
route-by-route assistant documentation split. The goal is to align assistant
tests and historical task/doc references with the current canonical Coderso doc
set.

## Scope

1. Replace stale `docs/coderso/*` references in assistant tests and `_docs`.
2. Run the relevant assistant test suites after the path/title updates.
3. Synchronize task board and changelog.

## Sub-Tasks

1. Replace widget, engine, entries, posts, and commerce references with the
   current canonical split docs where applicable.
2. Update historical task notes and API examples that still point at removed or
   superseded Coderso docs.
3. Re-run targeted assistant suites to confirm the cleanup did not break test
   expectations.

## Acceptance Criteria

1. No assistant tests or active `_docs` references point at removed pre-split
   `docs/coderso/*` files.
2. Targeted assistant tests pass after the cleanup.
3. The task board and changelog reflect closure.

## Testing Requirements

- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
- `bun test tests/unit/assistant/assistantService.test.ts`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/_TASKS/*`
- `_docs/_CHANGELOG/*`
- `tests/vitest/assistant/*`
- `tests/unit/assistant/*`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Validation Executed (2026-03-22)

- Replaced stale pre-split `docs/coderso/*` references in:
  - `_docs/CMS_API.md`
  - `_docs/_TASKS/TASK-118-03_Assistant_Widgets_Engine_Corpus_Enrichment_QA_and_Closure.md`
  - `_docs/_TASKS/TASK-118_Assistant_Surface_Labels_Procedural_Guidance_and_Corpus_Specificity_Follow_Up.md`
  - `_docs/_TASKS/TASK-119-03_Assistant_Corpus_Enrichment_for_Multi_Level_Answers.md`
  - `tests/vitest/assistant/docsAnswerComposer.test.ts`
  - `tests/vitest/assistant/docsDbRetriever.test.ts`
  - `tests/vitest/assistant/openRouterProvider.test.ts`
  - `tests/unit/assistant/assistantService.test.ts`
- Verified no remaining stale `docs/coderso/*` references outside the synthetic
  fake paths intentionally used by `docsIngestService.test.ts`.
- Completed:
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
  - `bun test tests/unit/assistant/assistantService.test.ts`
