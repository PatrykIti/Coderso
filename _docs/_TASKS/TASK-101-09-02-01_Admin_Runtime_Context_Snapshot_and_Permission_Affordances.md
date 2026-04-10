# TASK-101-09-02-01: Admin Runtime Context Snapshot and Permission Affordances
# FileName: TASK-101-09-02-01_Admin_Runtime_Context_Snapshot_and_Permission_Affordances.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-02  
**Status:** To Do

---

## Overview

Zebrany ma byc kontekst "co user aktualnie widzi i moze zrobic":
- route,
- active module,
- selected entity,
- visible action affordances,
- permission summary.

## Files to Change

- `core/admin/ui/assistant/useAssistantAdminContext.ts` (new, ~120-180 LOC)
- `core/admin/ui/layouts/AdminShell.tsx` (update, ~30-60 LOC)
- `core/services/assistant/adminContextService.ts` (update, ~80-140 LOC)
- `tests/vitest/ui/use-assistant-admin-context.test.tsx` (new, ~120-180 LOC)

## Pseudocode

```ts
return {
  route: path,
  activeHref,
  selectedResourceId,
  visibleActions: ["create", "save", "publish"],
  permissions: resolveCurrentPermissionEnvelope(user),
};
```

## Sub-Tasks

1. Build minimal client-side snapshot contract.
2. Enrich with server-side permission envelope.
3. Verify selection and affordance fallbacks.

## Testing Requirements

- Vitest UI for active route and affordance detection.
- Vitest unit for permission envelope shaping.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
