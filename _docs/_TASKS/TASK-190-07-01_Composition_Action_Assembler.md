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
- live planner cutover, broader gated review metadata, detail-page ordering, and
  later media/existing-resource flows remain deferred.

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
    listingQueryUpsertAction(graph.query),
    listingTemplateUpsertAction(graph.template),
    customScreenUpsertAction(graph.adminSurface),
    detailPageUpsertAction(graph.detailPage),
    contentRouteAction(graph.route, graph.detailPage?.id),
    pageUpsertAction(graph.listPage),
    ...entryUpsertDraftActions(graph.seedEntries),
    ...mediaReferenceAttachActions(graph.mediaReferences),
    ...formUpsertActions(graph.forms),
    ...menuActions(graph.menus),
    ...seoActions(graph.seo),
    ...gatedModuleNotes(graph.gated),
  ].filter(Boolean);
};
```

Ordering rules:

- `content-type.upsert` runs before `detail-page.upsert` so bindings can verify
  schema fields.
- `detail-page.upsert` runs before `setting.content-route.upsert` so the route
  link can reference a known stable `detailPageId`.
- Live runtime route switch happens only in `setting.content-route.upsert`; if
  `detail-page.upsert` fails, the existing public route must remain unchanged.
- `page.upsert` remains for list/landing pages.
- `detail-page.upsert` remains for detail templates and must not be collapsed
  into `page.upsert`.
- forms/menus/SEO run after primary page/detail resources so they can reference
  stable resource ids and public URLs.
- `entry.upsert-draft` seed actions, when a fixture explicitly enables sample
  content creation, run before `media.reference.attach` actions that target those
  entries.
- `media.reference.attach` is emitted only for existing media-library assets and
  supported entry targets. Page/widget media changes are represented in the
  relevant `page.upsert` / widget data owner action, not as a generic media
  patch. Raw uploads, attached files without trusted media ids, and media-library
  asset deletion stay gated/needs-input unless a media owner action exists.
- Media removal from a content/widget field means removing the reference through
  the target owner action; it must not delete the media-library asset unless the
  user explicitly asks for asset deletion and the media service action contract
  exists.

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
- Assembler does not emit `setting.content-route.upsert.detailPageId` before the
  referenced `detail-page.upsert` / `content-type.upsert` dependencies.
- Assembler does not emit `detail-page.upsert` before content type
  dependencies.
- Media reference actions are ordered after their target entry/resource exists,
  never before the content/schema/page owner action they depend on.
- Attached-file prompts without trusted media-library ids produce
  `needs_input`/gated prerequisites instead of executable media actions.
- Existing-gallery add/replace/remove flows are represented through
  `media.reference.attach` for supported entry targets or page/widget owner
  actions for widget data, with no raw upload payloads.
- Gated modules produce non-executable metadata/questions.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
