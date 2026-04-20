# TASK-190-07-01: Composition Action Assembler
# FileName: TASK-190-07-01_Composition_Action_Assembler.md

**Priority:** High
**Category:** Assistant/Core + Action Assembly
**Estimated Effort:** Large
**Dependencies:** TASK-190-04, TASK-190-05, TASK-190-06
**Status:** To Do

---

## Overview

Convert the composed graph into existing typed assistant actions.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintActionAssembler.ts`
- Update `core/services/assistant/actionPlannerService.ts`
- Add `tests/vitest/assistant/blueprint-action-assembler.test.ts`

## Pseudocode

```ts
export const assembleCompositionActions = (graph): AssistantPlannedAction[] => {
  return [
    maybeContentRouteAction(graph),
    contentTypeUpsertAction(graph.schema),
    customScreenUpsertAction(graph.adminSurface),
    listingQueryUpsertAction(graph.query),
    listingTemplateUpsertAction(graph.template),
    pageUpsertAction(graph.page),
    ...gatedModuleNotes(graph.gated),
  ].filter(Boolean);
};
```

## Security Contract

- Visibility: internal assistant action planning.
- Auth model: unchanged.
- RBAC: per-action permissions unchanged.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: output passes `actionPlanSchema`.
- Anti-abuse: no action type outside registry.
- Secret handling: action payload redaction.

## Testing Requirements

- Assembled plan validates.
- Existing single preset plans unchanged.
- Mixed prompt plan action order stable.
- Gated modules produce non-executable metadata/questions.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
