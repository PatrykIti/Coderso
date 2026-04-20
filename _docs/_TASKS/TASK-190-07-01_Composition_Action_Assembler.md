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
    contentRouteAction(graph.route),
    contentTypeUpsertAction(graph.schema),
    customScreenUpsertAction(graph.adminSurface),
    listingQueryUpsertAction(graph.query),
    listingTemplateUpsertAction(graph.template),
    pageUpsertAction(graph.listPage),
    detailPageUpsertAction(graph.detailPage),
    ...formUpsertActions(graph.forms),
    ...menuActions(graph.menus),
    ...seoActions(graph.seo),
    ...gatedModuleNotes(graph.gated),
  ].filter(Boolean);
};
```

Ordering rules:

- `setting.content-route.upsert` runs before `detail-page.upsert` so route
  ownership and `detailPageId` can be resolved deterministically.
- `content-type.upsert` runs before `detail-page.upsert` so bindings can verify
  schema fields.
- `page.upsert` remains for list/landing pages.
- `detail-page.upsert` remains for detail templates and must not be collapsed
  into `page.upsert`.
- forms/menus/SEO run after primary page/detail resources so they can reference
  stable resource ids and public URLs.

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
- `detailPageUpsertAction(graph.detailPage)` is emitted for catalog outcomes
  with public detail routes.
- Assembler does not emit `detail-page.upsert` before route/content type
  dependencies.
- Gated modules produce non-executable metadata/questions.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
