# TASK-101-09-03-02: Local Heuristics, Plan Repair, and Missing Context Questions
# FileName: TASK-101-09-03-02_Local_Heuristics_Plan_Repair_and_Missing_Context_Questions.md

**Priority:** Medium  
**Category:** Core/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-03-01  
**Status:** In Progress (2026-04-11)

---

## Overview

Gdy planner nie dostanie pelnego lub poprawnego outputu, lokalna logika ma:
- dopelnic bezpieczne defaults,
- naprawic drobne braki,
- albo zwrocic follow-up questions zamiast zgadywania.

## Files to Change

- `core/services/assistant/actionPlanHeuristics.ts` (new, ~160-240 LOC)
- `core/services/assistant/actionPlannerService.ts` (update, ~60-120 LOC)
- `tests/vitest/assistant/action-plan-heuristics.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
if (!draft.catalogType) {
  return toQuestions(["What kind of catalog records should be created?"]);
}

return withSafeDefaults(draft, { visibility: "draft", createCustomScreen: true });
```

## Sub-Tasks

1. Add safe default repair rules.
2. Prefer follow-up questions over hidden assumptions.
3. Preserve deterministic outputs for identical inputs.

## Testing Requirements

- Vitest unit for repair rules.
- Vitest unit for follow-up question fallback.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`

## Audit Notes (2026-04-11)

- Local deterministic routing, needs-input fallback, and refinement heuristics are implemented in `actionPlannerService`.
- A separate `actionPlanHeuristics.ts` module and broader repair/recovery matrix remain open.
