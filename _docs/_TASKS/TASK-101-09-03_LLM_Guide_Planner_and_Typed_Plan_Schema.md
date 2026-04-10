# TASK-101-09-03: LLM Guide Planner and Typed Plan Schema
# FileName: TASK-101-09-03_LLM_Guide_Planner_and_Typed_Plan_Schema.md

**Priority:** High  
**Category:** Core/Assistant + Validation  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-01, TASK-101-09-02  
**Status:** To Do

---

## Overview

Planner ma zamieniac prompt usera i admin context na strict typed plan albo na follow-up questions,
gdy brakuje krytycznych danych.

## Scope

1. Prompt normalization i extraction:
   - goal,
   - resource intent,
   - domain nouns,
   - missing required inputs.
2. Strict JSON schema dla typed plan.
3. Local validation i repair heuristics przed przejsciem do dry-run.

## Files to Change

- `core/services/assistant/actionPlannerService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actionPlanTypes.ts` (new, ~180-260 LOC)
- `core/services/assistant/actionPlanHeuristics.ts` (new, ~160-240 LOC)
- `core/server/validation/assistantActionSchemas.ts` (new, ~180-260 LOC)
- `tests/vitest/assistant/action-planner-service.test.ts` (new, ~180-280 LOC)
- `tests/vitest/assistant/action-plan-heuristics.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
const draft = await provider.plan({
  prompt,
  docsContext,
  adminContext,
});

const normalized = normalizeDraftPlan(draft);
const repaired = repairMissingDefaults(normalized, adminContext);
return validateStrictPlanSchema(repaired);
```

## Sub-Tasks

- `TASK-101-09-03-01_Prompt_Normalization_Intent_Extraction_and_Strict_Plan_Schema.md`
- `TASK-101-09-03-02_Local_Heuristics_Plan_Repair_and_Missing_Context_Questions.md`

## Testing Requirements

- Vitest unit for planner sanitization and schema validation.
- Vitest unit for missing-context question generation.
- Mocked provider tests for malformed output recovery.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
