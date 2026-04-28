# 604. TASK-171-03 provider draft schema repair

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-171, TASK-171-03

## Key Changes

### Provider Draft Adapter
- Hardened provider draft recovery for strict schema failures.
- Preserved typed provider clarification questions when a draft has usable questions but invalid action input.
- Confirmed safe partial action drafts can still repair missing optional labels through deterministic defaults.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
