# 511. TASK-112 assistant conversation window overflow and width handling

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-112

## Key Changes

### Assistant Conversation Window
- Added safer long-message wrapping so assistant responses remain inside the conversation panel.
- Kept the transcript vertically scrollable without overlapping the composer or `Send` row.
- Added controlled width resizing for the anchored conversation window with viewport-safe limits.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
