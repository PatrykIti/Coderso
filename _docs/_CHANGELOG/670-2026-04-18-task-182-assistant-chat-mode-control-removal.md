# 670. TASK-182 assistant chat mode control removal

Date: 2026-04-18
Version: unreleased
Tasks: TASK-182

## Key Changes

### Admin/UI

- Removed the `Assistant mode` selector from the floating assistant chat window.
- Kept the `LLM ready` / `Docs only` readiness badge in the existing top-of-chat position.
- Added a footer `New` button aligned left from `Send` to start a clean empty conversation.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
