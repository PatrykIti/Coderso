# 602. TASK-171-01 provider planning prompt package

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-171, TASK-171-01, TASK-171-01-01, TASK-171-01-02

## Key Changes

### Provider Planning
- Added `providerPlanningContext.ts` as the pure owner for provider planning prompt packages.
- Packages bounded context for future provider draft calls:
  - user prompt
  - docs evidence
  - advisory runtime snapshot
  - resource catalog summaries
- No live provider/network call was introduced.

### Security
- Provider planning packages are redacted through `assistantRedaction.ts`.
- Extended assistant redaction to treat signed-url-like metadata keys as sensitive.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/assistantRedaction.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
