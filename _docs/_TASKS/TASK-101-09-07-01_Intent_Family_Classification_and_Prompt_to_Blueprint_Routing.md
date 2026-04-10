# TASK-101-09-07-01: Intent Family Classification and Prompt-to-Blueprint Routing
# FileName: TASK-101-09-07-01_Intent_Family_Classification_and_Prompt_to_Blueprint_Routing.md

**Priority:** High  
**Category:** Core/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-07  
**Status:** To Do

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

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Testing Requirements

- `Vitest` unit for:
  - prompt classification,
  - routing to blueprint families,
  - fallback to `needs_input`.
