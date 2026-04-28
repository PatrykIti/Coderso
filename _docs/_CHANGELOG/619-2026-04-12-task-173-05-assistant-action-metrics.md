# 619. TASK-173-05 assistant action metrics

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-173, TASK-173-05

## Key Changes

### Assistant Observability
- Added aggregate action execution metrics:
  - action execute count,
  - failed action count,
  - idempotency replay count.
- Executor now records metrics for fresh execution and safe replay.
- Audit metadata now includes redacted idempotency scope data.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantMetrics.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
