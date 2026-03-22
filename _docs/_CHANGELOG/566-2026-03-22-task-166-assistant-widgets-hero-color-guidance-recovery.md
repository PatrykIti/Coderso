# 566. TASK-166 assistant widgets hero color guidance recovery

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-166

## Key Changes

### Assistant Docs
- Updated the canonical split `Widget Template Editor` doc with explicit
  Hero-specific guidance for `Details > Block Settings > Visual`.
- Added direct references to `Colors and Borders` and `Background` so Hero
  color questions resolve to the current shipped editing surface instead of
  generic library guidance.

### Retrieval Coverage
- Added a retriever regression test with competing `Widget Library` and
  `Widget Template Editor` hits from the same product area.
- Locked the expected result so Hero color questions keep preferring the
  template editor path with strong query coverage.

### Validation
- Passed:
  - `bun run vitest run tests/vitest/assistant/docsDbRetriever.test.ts`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts`
