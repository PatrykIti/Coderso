# TASK-190-07-01: Composition Action Assembler
# FileName: TASK-190-07-01_Composition_Action_Assembler.md

**Priority:** High
**Category:** Assistant/Core + Action Assembly
**Estimated Effort:** Large
**Dependencies:** TASK-190-03-01, TASK-190-04, TASK-190-05, TASK-190-06
**Status:** In Progress (2026-05-06)

---

## Overview

Convert the composed graph into existing typed assistant actions.

Current slice note:
- current catalog/form/page fragments can already be assembled and deduped in
  tests,
- the local setup planner now routes supported multi-capability and
  primary-plus-gated setup requests through the composed blueprint path,
- blocking graph conflicts now downgrade the composed result into typed
  `needs_input` / `gated` plans instead of failing with a null result,
- compatible listing facet/card fragments now also widen
  `listing-query.upsert.fields` automatically after merge so runtime filters and
  card bindings keep the projection data they need,
- broader refinement cutover, review metadata, detail-page ordering, and later
  media/existing-resource flows remain deferred.

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
    contentTypeUpsertAction(graph.schema),
    customScreenUpsertAction(graph.adminSurface),
    listingQueryUpsertAction(graph.query),
    listingTemplateUpsertAction(graph.template),
    ...formUpsertActions(graph.forms),
    pageUpsertAction(graph.listPage),
    contentRouteAction(graph.route),
  ].filter(Boolean);
};
```

Ordering rules:

- `content-type.upsert` runs before `custom-screen.upsert` and page/listing
  owner actions so schema-dependent resources can validate against a stable
  content model.
- `setting.content-route.upsert` runs after the current content/page owner
  actions so the public route switch is the last step in the current slice.
- `page.upsert` remains for list/landing pages.
- forms run after the primary schema/listing resources so the page owner action
  can reference a stable embedded form target.
- detail-page, media attach/delete, and entry-seed ordering stay deferred to
  the later closure leaves.

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
- Supported live setup requests route through the composed planner path instead
  of falling back to a legacy single-pack builder.
- Blocking graph conflicts dedupe to one typed question per target instead of
  surfacing a second generic duplicate-resource question.
- Gated modules produce non-executable metadata/questions.
- Detail-page and media dependency assertions remain deferred to the later
  closure leaves.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
