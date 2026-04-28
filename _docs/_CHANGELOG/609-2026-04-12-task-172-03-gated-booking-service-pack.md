# 609. TASK-172-03 gated booking service pack

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-03

## Key Changes

### Assistant Blueprints
- Added `Booking Service Business` blueprint pack as `requires-prerequisite`.
- Booking prompts now route to a typed `needs_input` plan with a clear prerequisite question.

### Scope
- No booking resources, schedules, or public reservations are created by the assistant yet.
- Booking setup stays gated until dedicated booking action adapters and public booking hardening coverage are implemented.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
