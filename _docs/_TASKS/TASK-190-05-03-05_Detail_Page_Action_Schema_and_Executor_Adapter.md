# TASK-190-05-03-05: Detail Page Action Schema and Executor Adapter
# FileName: TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md

**Priority:** High
**Category:** Assistant/Core + Typed Actions
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-02, TASK-190-05-03-03, TASK-190-05-03-04
**Status:** To Do

---

## Overview

Promote detail page documents into strict typed assistant actions. The composer
must be able to assemble reviewed plans that create or update detail page
documents through existing dry-run/review/execute flow.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/services/assistant/actionPlanSchema.ts`
- Update `core/services/assistant/actionRegistry.ts`
- Update `core/services/assistant/actionFamilyContracts.ts`
- Update `core/services/assistant/actionExecutorService.ts`
- Update `core/services/assistant/actionUndoManifest.ts` if detail documents
  need rollback metadata.
- Update `core/admin/ui/assistant/components/ActionPlanReview.tsx` labels.
- Update `core/admin/ui/assistant/components/ActionExecutionResult.tsx` labels.
- Update `tests/vitest/assistant/action-plan-schema.test.ts` with
  `detail-page.upsert` cases.
- Update `tests/vitest/assistant/action-family-contracts.test.ts` if the
  reviewed executable permission/notes metadata changes for `detail-page.upsert`
- Update `tests/vitest/assistant/action-registry.test.ts` with
  `detail-page.upsert` cases.
- Update `tests/vitest/assistant/actionPlannerService.test.ts`
- Update `tests/unit/assistant/actionExecutorService.test.ts` with
  `detail-page.upsert` cases.
- Update `tests/unit/assistant/actionExecutorService.db.test.ts` with
  `detail-page.upsert` cases for the
  DB-backed persist/idempotency path

## Assistant Integration Rule

`detail-page.upsert` must integrate through the same assistant seams that
already own generic resource planning. Do not add a bespoke planner branch just
for detail pages.

Required integration points in this leaf:

- `actionRegistry.ts` remains the executable action owner.
- `actionFamilyContracts.ts` remains the label/contract owner.
- the first reviewed `detail-page.upsert` path may be composer-owned and does
  not need to pretend that `detail-page` is already a generic CMS resource
  family,
- `actionExecutorService.ts` owns server-side validation, persistence, and
  normalized execution result metadata for `detail-page.upsert`,
- generic policy/target-resolver/provider packaging for `detail-page` is split
  into `TASK-190-05-03-08`,
- admin cached-client wrappers, cache keys, and assistant-side cache
  invalidation for `detail-page` are explicitly deferred to
  `TASK-190-05-03-07`,
- Resource catalog transport and active-surface hydration for `detail-page`
  remain owned by `TASK-190-07-02` and `TASK-190-06-03-03`; this leaf must not
  replace those seams with ad-hoc lookups.

## Action Contract

Required action:

```ts
type AssistantDetailPageUpsertAction = {
  id: string;
  type: "detail-page.upsert";
  title: string;
  description: string;
  input: {
    document: DetailPageDocument;
    expectedExistingId?: string | null;
  };
};
```

Status ownership rule:

- `DetailPageDocument.status` is the single status owner for this resource.
- `detail-page.upsert` must not duplicate publish state in a second
  `input.status` field.
- Execute/dry-run metadata may summarize the effective status, but the strict
  action input contract carries that value only through `input.document.status`.
- because the current reviewed assistant action-family contract exposes static
  execute-permission metadata, and this action can persist
  `document.status = "published"`, the safest first implementation should align
  with the current `page.upsert` permission boundary instead of inventing an
  implicit conditional publish side path:
  - `detail-page.upsert` execute contract requires `content:write` plus
    `content:publish`,
  - a future draft-only / publish split would need an explicit later action-
    family refactor, not hidden status-sensitive permission branching inside the
    first reviewed executor path.

`page.upsert` must not be overloaded with detail page document payloads.
`page.upsert` remains the action for normal/static/list/landing Pages. Detail
templates use `detail-page.upsert` so runtime ownership, bindings, preview,
cache invalidation, and manual editing stay explicit.
Composer-created detail page documents must carry a stable id so a later
`setting.content-route.upsert.detailPageId` step can link the canonical route
deterministically. `detail-page.upsert` owns document upsert only; it does not
become a second route-owner mutation.

Dry-run must show:

- content type,
- detail page id,
- blocks/sections summary,
- bindings summary,
- related sources,
- public impact,
- conflicts and missing fields.

Execute must:

- revalidate document,
- verify content type exists,
- verify the document id/content type contract is safe and deterministic,
- derive the persisted publish state from `document.status` instead of a second
  action-level status field,
- upsert document idempotently,
- invalidate relevant site cache,
- return normalized execution metadata (`detailPageId`, `contentTypeId`,
  `contentTypeSlug`, effective status/public-impact summary) needed by the later
  admin client/cache layer,
- leave preview token issuance, preview URL building, and sample-entry-backed
  draft preview responses with the preview/admin owner seams from
  `TASK-190-05-03-04` and `TASK-190-05-03-07`; this leaf should return only the
  normalized resource metadata those later owners need,
- leave runtime route ownership unchanged until a later
  `setting.content-route.upsert` links `detailPageId`.

Policy metadata for this resource family should use the technical kind
`detail-page` and the UI label "Detail Template" only at the presentation
layer, but generic policy registration itself is deferred to
`TASK-190-05-03-08`.

## Pseudocode

```ts
export const executeDetailPageUpsert = async (action, deps) => {
  const document = normalizeDetailPageDocument(action.input.document);
  const contentType = await deps.getContentTypeById(document.contentTypeId);
  assertDetailPageIdOwnership(document.id, contentType.id, action.input.expectedExistingId);

  const persisted = await deps.upsertDetailPageDocument(document);
  deps.invalidateDetailPagePublicCache(persisted);

  return {
    detailPageId: persisted.id,
    contentTypeId: persisted.contentTypeId,
    contentTypeSlug: contentType.slug,
    status: persisted.status,
  };
};
```

## Security Contract

- Visibility: internal assistant action flow.
- Auth model: existing admin session.
- RBAC:
  - plan/dry-run follow the existing content-owned read path,
  - execute keeps the same reviewed content write/publish boundary already used
    by current page-like assistant actions:
    - `content:write`,
    - `content:publish`,
  - write-only actors must not be able to persist a published detail-page
    document through this first reviewed upsert path.
- CSRF: existing assistant execute route.
- Rate-limit bucket: assistant.
- Reject-unknown validation: action input and document are strict.
- Anti-abuse:
  - no provider-to-executor payload,
  - action must be locally assembled,
  - no fuzzy prompt-only id matching in this leaf.
- Public-write hardening: embedded forms reuse existing form hardening.
- Secret handling: action preview/audit redacts secret-like binding fields.

## Testing Requirements

- Schema accepts valid action and rejects unknown fields.
- Schema rejects a second top-level `input.status` when `document.status`
  already owns the publish state.
- `page.upsert` rejects opaque detail page document payloads.
- Dry-run reports missing content type/field conflicts.
- Execute creates/upserts document idempotently.
- Execute DB tests cover the persisted create/update/idempotency path in
  `tests/unit/assistant/actionExecutorService.db.test.ts`, not only the pure
  unit seam.
- Execute rejects content-type/id mismatches and incompatible existing detail
  page ownership.
- Undo manifest captures safe rollback metadata if applicable.
- Action registry includes `detail-page.upsert`.
- Action-family contract coverage stays aligned with the chosen first reviewed
  permission boundary (`content:write` + `content:publish`) so this action does
  not introduce a write-only publish side channel.
- Review/result UI labels render `detail-page.upsert` as "Detail Template"
  while the technical action/resource kind remains `detail-page`.
- Base reviewed planner integration continues to flow through the existing
  action-plan seams without adding a second detail-page executor path.
- This leaf does not issue preview tokens or preview URLs from assistant
  execute; draft preview issuance remains owned by `TASK-190-05-03-04` /
  `TASK-190-05-03-07`.
- Admin cache key registration, cached-client hydration, and assistant-side
  cache invalidation for `detail-page` are explicitly deferred to
  `TASK-190-05-03-07` so the tree stays implementable in dependency order.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
