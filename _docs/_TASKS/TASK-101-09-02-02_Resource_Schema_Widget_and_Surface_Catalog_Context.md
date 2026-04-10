# TASK-101-09-02-02: Resource Schema, Widget, and Surface Catalog Context
# FileName: TASK-101-09-02-02_Resource_Schema_Widget_and_Surface_Catalog_Context.md

**Priority:** High  
**Category:** Core/Assistant + Coderso  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-02-01, TASK-054-22, TASK-054-16, TASK-055, TASK-059  
**Status:** To Do

---

## Overview

`llm-guide` ma widziec nie tylko route, ale tez dostepne surface contracts:
- content types,
- entry fields,
- custom screens,
- listings,
- forms,
- widgets/templates.

## Files to Change

- `core/services/assistant/adminContextService.ts` (update, ~120-200 LOC)
- `core/services/assistant/adminContextCatalogs.ts` (new, ~180-260 LOC)
- `tests/vitest/assistant/admin-context-catalogs.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
const catalogs = {
  contentTypes: await listContentTypeSummaries(),
  customScreens: await listCustomScreenSummaries(),
  listings: await listListingSummaries(),
  widgets: listWidgetContracts(),
};
```

## Sub-Tasks

1. Add compact summaries for major Coderso surfaces.
2. Clamp payload size to assistant context budget.
3. Preserve stable ids and machine-readable schema metadata.

## Testing Requirements

- Vitest unit for catalog aggregation and clamping.
- Vitest unit for stable id/summary normalization.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md`
