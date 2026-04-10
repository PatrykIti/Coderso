# TASK-101-09-07: Generic LLM Guide Intent Families and State-Aware Planning
# FileName: TASK-101-09-07_Generic_LLM_Guide_Intent_Families_and_State_Aware_Planning.md

**Priority:** High  
**Category:** Core/Assistant + Product UX + Planning  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09 current vertical slice, TASK-101-09-06-04  
**Status:** In Progress (2026-04-10)

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

## Integration with Current Code

This wave must extend the already shipped action-engine slice, not replace it.

Current owner modules:
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/actionExecutorService.ts`

Rules:
- keep the current `house-projects-catalog` flow working as the first preset,
- add generic routing above it,
- do not break the existing `/assistant/actions/*` contract,
- do not widen the executor surface before planner families and state-awareness are explicit.

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

## Acceptance Criteria

1. The planner no longer relies on a single hardcoded prompt detector.
2. At least 3 business prompt families route into explicit blueprint families.
3. The current house-projects preset remains backward-compatible.
4. Follow-up prompts are classified separately from initial setup prompts.

## Progress Notes

- `TASK-101-09-07-01` is complete:
  - generic prompt classification is now implemented,
  - planner routing recognizes docs vs setup vs refinement intent,
  - current house-projects flow remains the routed ready-plan case.
- Remaining work:
  - generic blueprint generation,
  - additional preset families,
  - state-aware refinement without duplicate setups.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
