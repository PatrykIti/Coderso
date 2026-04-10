# TASK-101-09-07-01: Intent Family Classification and Prompt-to-Blueprint Routing
# FileName: TASK-101-09-07-01_Intent_Family_Classification_and_Prompt_to_Blueprint_Routing.md

**Priority:** High  
**Category:** Core/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-07  
**Status:** Done (2026-04-10)

---

## Overview

Replace the current single-case prompt detection with a generic intent-family classifier.

## Scope

1. Add explicit intent families and routing rules.
2. Distinguish:
   - documentation question,
   - setup request,
   - follow-up refinement request.
3. Route setup requests into the correct blueprint generator.
4. Keep `house-projects-catalog` as the current fallback preset inside the new routing layer.
5. Preserve the current `/assistant/actions/plan` response shape while widening planner internals.

## Integration Notes

- This task should mostly stay inside:
  - `core/services/assistant/actionPlannerService.ts`
  - `core/services/assistant/actionPlanTypes.ts`
- It should not require route or UI contract changes if done correctly.
- The runtime must continue to return:
  - `ready` plan for the current house-projects prompt,
  - `needs_input` for underspecified setup requests,
  - docs assistant behavior unchanged for pure docs questions.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Testing Requirements

- `Vitest` unit for:
  - prompt classification,
  - routing to blueprint families,
  - fallback to `needs_input`,
  - non-regression for the current house-projects prompt,
  - separation of docs questions vs setup requests vs follow-up refinement.

## Completion Notes (2026-04-10)

- Added generic planner classification over:
  - `docs_question`
  - `setup_request`
  - `refinement_request`
- Added intent-family routing for:
  - `catalog_showcase`
  - `product_catalog`
  - `portfolio_projects`
  - `services_directory`
  - `lead_capture_site`
- Kept the existing `house-projects-catalog` preset as the current routed ready-plan case.
- Preserved backward-compatible `needs_input` behavior for prompts that are still broader than the currently shipped blueprints.
- Widened the floating assistant prompt heuristic so more setup/refinement prompts reach the planner path.
