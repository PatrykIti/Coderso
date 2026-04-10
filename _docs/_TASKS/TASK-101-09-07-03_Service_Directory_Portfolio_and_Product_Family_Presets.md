# TASK-101-09-07-03: Service Directory, Portfolio, and Product Family Presets
# FileName: TASK-101-09-07-03_Service_Directory_Portfolio_and_Product_Family_Presets.md

**Priority:** High  
**Category:** Product UX + Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-07-02  
**Status:** Done (2026-04-10)

---

## Overview

Add additional business-ready guide families beyond the current house-projects catalog.

## Target Presets

1. `services_directory`
2. `portfolio_projects`
3. `product_catalog`

## Scope

For each preset:
- content model defaults,
- admin surface composition,
- listing query/template defaults,
- public page defaults,
- follow-up question set for missing business decisions.

## Testing Requirements

- scenario tests for at least 3 distinct business prompts.
- route/execute acceptance for at least 1 non-house-project flow.

## Completion Notes (2026-04-10)

- Added business-ready routed presets for:
  - `product_catalog`
  - `portfolio_projects`
  - `services_directory`
- Planner now returns ready plans for these families instead of falling back to `needs_input`.
- Presets reuse the generic catalog family builder and current typed action families.
- Added planner scenario tests across multiple business prompt families.
- Added non-house execute regression through the shared executor contract.
