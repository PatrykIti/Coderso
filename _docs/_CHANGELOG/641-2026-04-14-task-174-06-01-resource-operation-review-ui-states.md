# 641. TASK-174-06-01 resource operation review UI states

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-06, TASK-174-06-01

## Key Changes

### Assistant UI
- Updated action review cards to show resource operation badges for create, update, delete, archive, detach, restore, blocked, and no-op states.
- Added destructive-operation and blocked-conflict preview alerts before execution.
- Renamed execution CTA/result copy from setup-specific wording to reviewed action wording.
- Updated execution results to show partial action counts, including archive/detach/restore, failed counts, and action-level status.
- Redacted secret-like dynamic text in review and execution result UI.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
