# TASK-101-09-03-01: Prompt Normalization, Intent Extraction, and Strict Plan Schema
# FileName: TASK-101-09-03-01_Prompt_Normalization_Intent_Extraction_and_Strict_Plan_Schema.md

**Priority:** High  
**Category:** Core/Assistant + Validation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-03  
**Status:** To Do

---

## Overview

Zdefiniowac strict planner contract:
- wejscie: prompt + docs + admin context,
- wyjscie: typed plan lub typed follow-up questions,
- brak wolnego JSON-a i brak implicit defaults bez normalizacji.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts` (new, ~180-260 LOC)
- `core/services/assistant/actionPlannerService.ts` (update, ~120-180 LOC)
- `core/server/validation/assistantActionSchemas.ts` (new/update, ~120-180 LOC)
- `tests/vitest/assistant/action-plan-schema.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
type AssistantActionPlan =
  | { kind: "plan"; actions: TypedActionDraft[]; assumptions: string[] }
  | { kind: "questions"; questions: FollowUpQuestion[] };
```

## Sub-Tasks

1. Define strict type and schema ownership.
2. Normalize prompt-derived entities into stable ids and enums.
3. Reject unknown fields and malformed actions.

## Testing Requirements

- Vitest unit for schema success/failure matrix.
- Vitest unit for enum and default normalization.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
