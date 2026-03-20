# 514. TASK-115 assistant content-first answer composer

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-115, TASK-115-01, TASK-115-02, TASK-115-03, TASK-115-04

## Key Changes

### Assistant Answers
- Replaced the old location-list output with content-first answers built from the top matching article snippets.
- `location_answer` and `how_to_answer` now return actual product guidance instead of lists of file paths and headings.

### Ranking
- Added stronger priors for canonical product docs and instruction-heavy sections such as `Step By Step`.
- Reduced the likelihood that weaker `Examples` sections dominate direct configuration questions.

### Assistant UI
- The default chat UI now treats the main answer as the primary output.
- `Sources` are no longer rendered as a default first-class block in the user-facing assistant message surface.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
