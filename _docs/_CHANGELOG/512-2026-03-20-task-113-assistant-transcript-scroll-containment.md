# 512. TASK-113 assistant transcript scroll containment

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-113

## Key Changes

### Assistant Conversation Window
- Added overscroll containment to the assistant transcript viewport and the conversation window shell.
- Scrolling over the assistant chat now stays inside the chat surface instead of chaining into the page behind it.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
