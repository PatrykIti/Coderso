# 567. TASK-167 assistant guide-mode follow-up specificity

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-167

## Key Changes

### Assistant Docs
- Updated the canonical `Widget Template Editor` doc so `Medium`, `Advanced`,
  and `Security` keep explicit Hero block context during follow-up retrieval.

### Answer Composition
- Updated docs-only follow-up composition so a dedicated helper-mode section
  (`Troubleshooting`, `Decision Guide`, `Checklist`, `Security`) becomes the
  primary answer body instead of being followed by redundant fallback guidance.

### Regression Coverage
- Added composer coverage for security follow-ups without fallback duplication.
- Added retriever coverage for Hero security questions inside the widgets
  product area.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts`
