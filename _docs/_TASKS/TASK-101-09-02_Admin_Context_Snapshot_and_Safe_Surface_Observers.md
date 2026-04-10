# TASK-101-09-02: Admin Context Snapshot and Safe Surface Observers
# FileName: TASK-101-09-02_Admin_Context_Snapshot_and_Safe_Surface_Observers.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI + CMS Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-01, TASK-054, TASK-059, TASK-061, TASK-063  
**Status:** To Do

---

## Overview

`llm-guide` ma rozumiec aktualny stan admina nie przez surowy DOM, ale przez ustrukturyzowany
context snapshot budowany z route state, visible affordances, schema catalogs i permission envelope.

## Scope

1. Zdefiniowac client-side `uiSnapshot` dla aktywnego ekranu.
2. Zdefiniowac server-side enrichment:
   - permissions,
   - active module/surface,
   - resource/schema catalogs,
   - relevant entity ids.
3. Dodac redaction, budget limits i staleness metadata.

## Files to Change

- `core/services/assistant/adminContextService.ts` (new, ~220-340 LOC)
- `core/services/assistant/adminContextTypes.ts` (new, ~160-220 LOC)
- `core/admin/ui/assistant/useAssistantAdminContext.ts` (new, ~120-180 LOC)
- `core/admin/ui/layouts/AdminShell.tsx` (update, ~40-80 LOC)
- `core/admin/app/AdminApp.tsx` (update, ~40-80 LOC)
- `core/admin/services/assistantClient.ts` (update, ~40-80 LOC)
- `tests/vitest/assistant/admin-context-service.test.ts` (new, ~160-260 LOC)
- `tests/vitest/ui/use-assistant-admin-context.test.tsx` (new, ~120-200 LOC)

## Pseudocode

```ts
const uiSnapshot = collectAssistantUiSnapshot();

const context = await buildAssistantAdminContext({
  actorId,
  route: uiSnapshot.route,
  uiSnapshot,
});

return clampAndRedactContext(context, MAX_ASSISTANT_CONTEXT_BYTES);
```

## Sub-Tasks

- `TASK-101-09-02-01_Admin_Runtime_Context_Snapshot_and_Permission_Affordances.md`
- `TASK-101-09-02-02_Resource_Schema_Widget_and_Surface_Catalog_Context.md`

## Testing Requirements

- Vitest unit for context builders and redaction budgets.
- Vitest UI for route/screen context collection.
- Targeted integration coverage where context depends on live route selection.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
