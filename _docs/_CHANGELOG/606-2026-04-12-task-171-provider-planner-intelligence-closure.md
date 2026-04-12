# 606. TASK-171 provider planner intelligence closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-171, TASK-171-05

## Key Changes

### Closure
- Closed the provider planner intelligence wave.
- Delivered:
  - bounded/redacted provider planning prompt packages,
  - fake-provider draft execution helper with deterministic fallback,
  - strict schema repair and typed clarification preservation,
  - provider/local/fallback planner metadata in review UI,
  - deterministic provider planner fixtures without live network calls.

### Scope
- Live route/provider wiring remains intentionally out of scope for this wave.
- Future product tasks can opt into `planAssistantActionsWithProviderDraft` through explicit provider settings and route gates.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/provider-planning-context.test.ts`
