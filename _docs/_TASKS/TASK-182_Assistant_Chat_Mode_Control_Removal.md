# TASK-182: Assistant Chat Mode Control Removal
# FileName: TASK-182_Assistant_Chat_Mode_Control_Removal.md

**Priority:** Medium
**Category:** Admin/UI + Assistant UX
**Estimated Effort:** Small
**Dependencies:** TASK-179-08, TASK-181
**Status:** Done (2026-04-18)

---

## Overview

Remove the `Assistant mode` selector from the floating assistant chat window and add a clear new-conversation action in the message footer.

Assistant mode is a global assistant setting and should stay in the main assistant settings UI. The chat window should only show the compact readiness badge in its existing top position.

## Sub-Tasks

No child task files.

## Files Changed

- `core/admin/ui/assistant/AssistantModeSwitch.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

## Acceptance Criteria

1. The floating assistant chat no longer renders the `Assistant mode` label or mode select control.
2. The `LLM ready` / `Docs only` badge remains visible in the same top-of-chat position as before.
3. The active assistant mode continues to come from global settings/runtime state.
4. The message footer has `New` aligned left and `Send` aligned right.
5. `New` starts a clean empty conversation by clearing messages, input, active plan, preview, execution, planning state, and action error.

## Testing Requirements

- Vitest UI:
  - assistant mode component renders the readiness badge without mode selector copy.
  - assistant panel interaction tests remain green.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Completion Notes (2026-04-18)

- Removed the floating chat mode selector and label.
- Kept the readiness badge in the original top-of-chat location.
- Added a footer `New` action aligned left from `Send` that starts a clean conversation.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
