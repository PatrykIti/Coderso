# 617. TASK-173-03 idempotency replay diagnostics

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-173, TASK-173-03

## Key Changes

### Assistant Execution
- Added idempotency diagnostics to assistant execute results:
  - `replayed`
  - `scope=actor_plan_hash`
- Replay responses now mark `replayed=true`; fresh executions mark `replayed=false`.

### Safety
- No DB schema change was required.
- Diagnostics expose only replay state and scope, not raw persisted payload internals.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
