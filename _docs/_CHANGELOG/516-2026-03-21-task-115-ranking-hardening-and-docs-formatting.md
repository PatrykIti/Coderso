# 516. TASK-115 ranking hardening and docs-only answer formatting

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-115-02, TASK-115-04

## Key Changes

### Ranking and Evidence Selection
- Assistant docs retrieval now scores product metadata from DB (`productArea`, title, keywords) in addition to chunk text.
- Exact module and screen phrases get stronger boosts, while cross-area hits such as `Themes` or `Booking` are penalized when a better-aligned product area exists.
- Confidence now reflects domain alignment, query coverage, and score gap instead of mostly mirroring the raw top score.

### Docs-Only Answer Readability
- Docs-only answers now keep paragraph and numbered-step structure so the assistant surface reads like guidance, not one merged text blob.
- The assistant message renderer formats structured docs answers into readable blocks without exposing sources as the default primary UI.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
