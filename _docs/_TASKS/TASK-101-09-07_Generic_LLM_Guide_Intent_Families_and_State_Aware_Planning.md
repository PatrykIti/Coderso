# TASK-101-09-07: Generic LLM Guide Intent Families and State-Aware Planning
# FileName: TASK-101-09-07_Generic_LLM_Guide_Intent_Families_and_State_Aware_Planning.md

**Priority:** High  
**Category:** Core/Assistant + Product UX + Planning  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09 current vertical slice, TASK-101-09-06-04  
**Status:** To Do

---

## Overview

Current `LLM Guide` execution path works end-to-end for the shipped `house-projects-catalog`
vertical slice, but the planner is still too narrow.

This task generalizes the planner so the user can describe different business setups and still get:
- typed plan,
- dry-run,
- execute,
- update existing setup instead of creating duplicates.

## Goal

Move from:
- one hardcoded house-projects blueprint

to:
- a generic `LLM Guide` planner that routes prompts into reusable intent families
  and can refine existing setups through follow-up prompts.

## Target Capabilities

1. Intent-family classification:
   - `catalog_showcase`
   - `product_catalog`
   - `portfolio_projects`
   - `services_directory`
   - `lead_capture_site`
2. Generic blueprint generation from:
   - prompt,
   - admin context,
   - existing resource state.
3. State-aware follow-up refinement:
   - update listing filters,
   - add forms,
   - change visible fields,
   - update cards/layout,
   - avoid duplicate surfaces.

## Sub-Tasks

- `TASK-101-09-07-01_Intent_Family_Classification_and_Prompt_to_Blueprint_Routing.md`
- `TASK-101-09-07-02_Generic_Catalog_Family_Blueprint_Engine.md`
- `TASK-101-09-07-03_Service_Directory_Portfolio_and_Product_Family_Presets.md`
- `TASK-101-09-07-04_State_Aware_Follow_Up_Refinement_and_No_Duplicate_Setups.md`

## Testing Requirements

- `Vitest` for planner classification and blueprint routing.
- `Bun` for persisted refinement/update/noop behavior.
- scenario coverage for at least 3 distinct business prompts beyond house projects.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
