# TASK-054-18-01: Site Builder Executor Domain and Schemas
# FileName: TASK-054-18-01_Site_Builder_Executor_Domain_and_Schemas.md

**Priority:** High  
**Category:** Assistant/Domain  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-18  
**Status:** Done (2026-02-20)

---

## Overview
Dostarczyc domain service, ktory mapuje intake + planner output na jawne akcje, wykonanie i walidacje.

## Scope
1. Dodać `core/services/assistant/siteBuilderExecutor.ts`:
   - `previewGuidedSiteBuilderPlan(...)`,
   - `executeGuidedSiteBuilder(...)`,
   - `validateGuidedSiteBuilderRun(...)`.
2. Zdefiniować typed kontrakty:
   - plan actions (`stepId`, `target`, `resourceKey`),
   - execution summary,
   - validation checks + unresolved items.
3. Ujednolicić parsing `enabledStepIds` i metadata z run options.

## Files
- `core/services/assistant/siteBuilderExecutor.ts` (new)
- `core/services/assistant/siteBuilderPlanner.ts`
- `tests/unit/assistant/siteBuilderExecutor.test.ts` (new)

## Pseudocode
```ts
const plan = buildSiteBuilderPlan(intake);
const selectedKit = resolveKit(plan, preferredKitId);
const enabledStepIds = normalizeEnabled(plan.steps, input.enabledStepIds);
const actions = buildExplainableActions(selectedKit, plan, enabledStepIds);

if (!execute) return { plan, selectedKit, enabledStepIds, actions };

const result = applySolutionKitInstall({ plan, selectedKit, enabledStepIds });
const validation = validateExecution(result, selectedKit, enabledStepIds);
return { plan, selectedKit, enabledStepIds, actions, execution: result, validation };
```

## Testing Requirements
- Unit:
  - action mapping determinism,
  - partial-step filtering,
  - validation unresolved list for failed run/failed items.

## Documentation Updates Required
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Completion Notes (2026-02-20)
- Added `core/services/assistant/siteBuilderExecutor.ts` with typed `preview/execute/validate` contract.
- Implemented deterministic action mapping and enabled-step normalization.
- Added validation model with `checks[]` and `unresolvedItems[]` from run/items/template summary.
- Added domain unit coverage in `tests/unit/assistant/siteBuilderExecutor.test.ts`.
