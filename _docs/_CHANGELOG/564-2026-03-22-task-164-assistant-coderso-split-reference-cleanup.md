# 564. TASK-164 assistant coderso split reference cleanup

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-164

## Key Changes

### Assistant Docs and Tests
- Updated stale pre-split `docs/coderso/*` references in assistant tests and
  historical `_docs` references to the current canonical Coderso docs.
- Aligned `_docs/CMS_API.md` assistant examples with the current widget-template
  doc path.

### Validation
- Completed:
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
  - `bun test tests/unit/assistant/assistantService.test.ts`
- Confirmed no remaining stale real `docs/coderso/*` references outside the
  synthetic fake paths in `docsIngestService.test.ts`.
