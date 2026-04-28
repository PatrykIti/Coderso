# TASK-101-09-03-02: Local Heuristics, Plan Repair, and Missing Context Questions
# FileName: TASK-101-09-03-02_Local_Heuristics_Plan_Repair_and_Missing_Context_Questions.md

**Priority:** High
**Category:** Core/Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-03-01, TASK-101-09-02
**Status:** Done (2026-04-12)

---

## Overview

Wyciagnac lokalne heurystyki i recovery z `actionPlannerService.ts` do pure `actionPlanHeuristics.ts`.

Heurystyki maja korzystac z aktualnego `resourceCatalog` i `runtimeSnapshot`, ale nie moga importowac DB/runtime services.

## Files to Change

- `core/services/assistant/actionPlanHeuristics.ts` (new)
- `core/services/assistant/actionPlannerService.ts` (update)
- `tests/vitest/assistant/action-plan-heuristics.test.ts` (new)
- `tests/vitest/assistant/actionPlannerService.test.ts` (update)

## Pseudocode

```ts
const repair = repairPlannerDraft({
  prompt,
  classification,
  adminContext,
  draft,
});

if (repair.kind === "questions") return buildNeedsInputPlan(repair);
return buildPlanFromRepairedDraft(repair);
```

## Sub-Tasks

1. Move prompt classification helpers or expose them as pure helpers.
2. Add context-aware refinement family resolution from route + runtime snapshot + resource catalog.
3. Add safe defaults only when surfaced in assumptions.
4. Prefer typed follow-up questions over hidden guesses.
5. Preserve deterministic output for current shipped prompts.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/actionPlannerService.test.ts --config vitest.config.ts`
- Cover product/portfolio/services routing, route/resource selected refinement, missing catalog domain question, docs-only non-mutating prompt, deterministic repeat output.

## Documentation Updates Required

- Covered by parent closure.

## Completion Notes (2026-04-12)

- Added `actionPlanHeuristics.ts` with prompt classification and context-aware refinement family resolution.
- Heuristics now consider route, runtime selected resource, and resource catalog summaries.
- Planner imports heuristics instead of owning prompt classification inline.

## Validation (2026-04-12)

- `bunx vitest run tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/actionPlannerService.test.ts --config vitest.config.ts`
