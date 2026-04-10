# TASK-101-09-07-04: State-Aware Follow-Up Refinement and No-Duplicate Setups
# FileName: TASK-101-09-07-04_State_Aware_Follow_Up_Refinement_and_No_Duplicate_Setups.md

**Priority:** High  
**Category:** Core/Assistant + Runtime State  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-07-03  
**Status:** In Progress (2026-04-10)

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

## Progress Notes

Completed first slice (2026-04-10):
- `LLM Guide` now recognizes a house-projects follow-up prompt:
  - "dodaj filtr po metrazu i liczbie pokoi"
- Planner returns a refinement plan instead of a second setup plan.
- The refinement plan reuses canonical catalog resources and updates the existing catalog page via `page.upsert`.
- The catalog page can now receive a `listing-filters` widget through the existing page action family.
- Added tests for:
  - planner follow-up interpretation,
  - stubbed executor no-duplicate behavior,
  - DB-backed update/no-duplicate behavior,
  - public runtime render showing the listing filters after refinement.

Completed second slice (2026-04-10):
- `LLM Guide` now recognizes an inquiry form follow-up prompt:
  - "dodaj formularz zapytania do strony szczegolowej"
- Planner returns a refinement plan with:
  - `form.upsert`,
  - `page.upsert` with a `form-embed` block.
- Executor reuses existing forms service methods:
  - `listForms`,
  - `createForm`,
  - `updateForm`,
  - `setFormFields`.
- Stubbed executor tests confirm the inquiry form is created and embedded on the existing catalog page without creating a second page.
- Existing DB-backed and public runtime acceptance tests remain green after adding `form.upsert`.

Remaining:
- generic persisted-state resolution for renamed/customized setups,
- broader no-duplicate acceptance across product, portfolio, and services presets.
