# TASK-101-09-03-01: Prompt Normalization, Intent Extraction, and Strict Plan Schema
# FileName: TASK-101-09-03-01_Prompt_Normalization_Intent_Extraction_and_Strict_Plan_Schema.md

**Priority:** High
**Category:** Core/Assistant + Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-03
**Status:** Done (2026-04-12)

---

## Overview

Wyciagnac strict nested action-plan schema z obecnego mieszania TypeScript type guards + route-level top-level schemas.

Ten leaf ma byc Bun-free i import-safe.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts` (new)
- `core/services/assistant/actionPlannerService.ts` (update to call schema normalizer)
- `tests/vitest/assistant/action-plan-schema.test.ts` (new)

## Target Contract

```ts
const normalized = normalizeAssistantActionPlan(rawPlan);
assertAssistantActionPlanStrict(normalized);
```

Requirements:
- reject unknown plan/action fields,
- validate action inputs by type,
- normalize/clamp confidence,
- require questions for `needs_input`,
- require no questions for executable `ready` plans,
- preserve current action family contracts.

## Sub-Tasks

1. Add pure strict schema/normalizer module.
2. Move `isAssistantActionPlan` validation ownership into schema module or make it delegate there.
3. Add per-action input checks for existing action families:
   - content route,
   - content type,
   - custom screen,
   - listing query/template,
   - form,
   - page,
   - `site-kit.*`.
4. Keep current public type names stable.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/action-plan-schema.test.ts --config vitest.config.ts`
- Include valid current catalog plan, valid site-kit plan, unknown-field rejection, malformed action input rejection, confidence normalization, `ready`/`needs_input` invariants.

## Documentation Updates Required

- Covered by parent closure unless public schema docs change.

## Completion Notes (2026-04-12)

- Added `actionPlanSchema.ts` with strict plan/action/input validation.
- Existing `isAssistantActionPlan` now delegates to strict validation.
- Planner returns normalized plans through `normalizeAssistantActionPlan`.
- Covered ready/needs-input invariants, per-action input validation, unknown-field rejection, and confidence clamping.

## Validation (2026-04-12)

- `bunx vitest run tests/vitest/assistant/action-plan-schema.test.ts --config vitest.config.ts`
