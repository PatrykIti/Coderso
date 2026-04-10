# TASK-101-09-07-04: State-Aware Follow-Up Refinement and No-Duplicate Setups
# FileName: TASK-101-09-07-04_State_Aware_Follow_Up_Refinement_and_No_Duplicate_Setups.md

**Priority:** High  
**Category:** Core/Assistant + Runtime State  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-07-03  
**Status:** To Do

---

## Overview

Enable true follow-up planning so `LLM Guide` can refine an existing generated setup instead of
creating a parallel second setup.

## Scope

1. Read existing resource state from admin context and persisted resources.
2. Detect whether the user wants:
   - create new setup,
   - extend existing setup,
   - refine listing/page/form configuration.
3. Support prompts like:
   - "dodaj filtr po metrazu i liczbie pokoi"
   - "dodaj formularz zapytania do strony szczegolowej"
   - "zmien uklad kart i pokaz status projektu"
4. Guarantee update/noop over duplicate creation when matching setup already exists.

## Integration Notes

- This task depends on current persisted-resource seams already used by:
  - `actionExecutorService`
  - `settingsService`
  - content/listing/page/custom-screen services
- Planner state-awareness should prefer querying existing resources over inventing synthetic memory.
- Tests must prove that follow-up prompts update the current setup instead of creating:
  - a second content type,
  - a second custom screen,
  - a second listing template,
  - a second public catalog page.

## Testing Requirements

- `Vitest` planner tests for follow-up interpretation.
- `Bun` DB-backed refinement tests for update/noop behavior.
- acceptance scenarios proving no duplicate content type / screen / listing template is created.
