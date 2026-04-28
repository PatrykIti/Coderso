# 616. TASK-173-02 partial success recovery UI

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-173, TASK-173-02

## Key Changes

### Admin UI
- Added partial-failure recovery guidance to assistant action execution results.
- Mixed success/failure execution results now show:
  - how many actions succeeded and failed,
  - failed action labels,
  - error codes,
  - failed action messages,
  - guidance to run a fresh dry-run before retry.

### Safety
- No automatic retry path was added; retry remains explicit and uses the existing dry-run/confirm/execute flow.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
