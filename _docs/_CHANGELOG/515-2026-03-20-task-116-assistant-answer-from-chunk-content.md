# 515. TASK-116 assistant answer from chunk content

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-116

## Key Changes

### Assistant Answer Formatting
- Final assistant answers now use `chunk.content` instead of the shorter preview snippet generated for retrieval/evidence.
- Added sentence-aware and numbered-step-aware truncation so answers stay readable without arbitrary snippet clipping.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
