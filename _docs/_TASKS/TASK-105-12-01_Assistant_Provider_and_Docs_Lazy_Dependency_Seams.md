# TASK-105-12-01: Assistant Provider and Docs Lazy Dependency Seams
# FileName: TASK-105-12-01_Assistant_Provider_and_Docs_Lazy_Dependency_Seams.md

**Priority:** High  
**Category:** Platform + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-12  
**Status:** Done (2026-03-12)

---

## Overview

Refactor assistant provider/docs modules so pure helper logic no longer imports settings or integration services at module load time.

## Scope

1. `core/services/assistant/providers/index.ts`
2. `core/services/assistant/docsIndexService.ts`
3. dependent pure suites:
   - provider resolver
   - docs answer composer
   - docs retriever / docs db retriever
   - docs ingest/index helpers where safe

## Acceptance Criteria

1. Pure assistant/provider/docs suites can import their modules under Vitest without `DATABASE_URL` or runtime config failures.
2. Default runtime wiring remains intact for production paths.
3. No behavior change beyond dependency initialization timing.

## Completion Notes

- Refactored `core/services/assistant/providers/index.ts` to lazy-load integration runtime config in the default dep path.
- Refactored `core/services/assistant/docsIndexService.ts` to lazy-load settings access instead of importing it at module load time.
- Moved `providerResolver`, `docsAnswerComposer`, `docsRetriever`, `docsDbRetriever`, `docsIndexService`, and `docsIngestService` tests into `tests/vitest/assistant/*`.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
