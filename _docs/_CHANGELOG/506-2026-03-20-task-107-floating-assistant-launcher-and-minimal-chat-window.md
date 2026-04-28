# 506. TASK-107 floating assistant launcher and minimal chat window

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-107, TASK-107-01, TASK-107-02, TASK-107-03, TASK-107-05, TASK-107-06, TASK-107-04

## Key Changes

### Assistant Launcher
- Removed the textual `Assistant` button from the admin topbar.
- Added a floating assistant launcher mounted at shell level instead of the topbar action row.
- Launcher visibility now follows the global `assistant.enabled` setting.
- Added draggable launcher positioning with viewport clamping and persisted local position.

### Conversation Window
- Simplified the assistant window to a conversation-first surface:
  - starter prompts,
  - transcript,
  - composer,
  - minimal runtime status copy.
- Removed global settings and preferences controls from the main conversation surface.
- Simplified `loading`, `error`, `disabled`, and `docs-not-ready` handling so the window no longer resembles a settings screen.

### Global Assistant Settings
- Added global launcher avatar settings:
  - `assistant.launcher.avatarEnabled`
  - `assistant.launcher.avatarAsset`
- Launcher now uses the configured avatar surface instead of the default message bubble when avatar mode is enabled.
- Assistant settings updates now invalidate assistant runtime/status caches so launcher and conversation state react immediately after save.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
  - `bun test tests/unit/settings/settingsService.test.ts`
