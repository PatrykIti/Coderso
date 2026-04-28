# 507. TASK-108 anchored assistant window and launcher visual polish

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-108, TASK-108-01, TASK-108-02, TASK-108-03

## Key Changes

### Assistant Launcher
- Corrected the launcher idle visual state so the conversation affordance remains visible without hover.
- Preserved a stronger highlighted active state while keeping the same floating launcher identity.

### Anchored Conversation Window
- Replaced the full right-side assistant sheet with an anchored floating conversation window positioned relative to the launcher.
- Added outside-click and `Escape` close behavior for the anchored conversation surface.
- Added viewport-safe clamping for anchored window placement.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
