# TASK-190-05-03-05: Detail Page Action Schema and Executor Adapter
# FileName: TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md

**Priority:** High
**Category:** Assistant/Core + Typed Actions
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-02, TASK-190-05-03-03
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
- Update `core/admin/services/assistantClient.ts` for cache invalidation after
  `detail-page.upsert`, reusing the same cached-client pattern used by other
  admin resources.
- Update `core/admin/ui/assistant/components/ActionPlanReview.tsx` labels.
- Update `core/admin/ui/assistant/components/ActionExecutionResult.tsx` labels.
- Update `core/admin/services/cachePolicy.ts` with:
  - `detailPages:list`
  - `detailPages:detail:<id>`
- Update `_docs/ADMIN_CACHE.md`
- Update `_docs/ADMIN_CACHE_MAP.md`
- Add `tests/vitest/assistant/action-plan-schema.test.ts` cases.
- Add `tests/vitest/assistant/action-registry.test.ts` cases.
- Update `tests/vitest/assistant/actionPlannerService.test.ts`
- Add `tests/unit/assistant/actionExecutorService.test.ts` cases.

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
- generic policy/target-resolver/provider packaging for `detail-page` is split
  into `TASK-190-05-03-08`,
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
    status: "draft" | "published";
    document: DetailPageDocument;
    expectedExistingId?: string | null;
  };
};
```

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
- upsert document idempotently,
- invalidate relevant site cache,
- invalidate admin detail page list/detail cache keys,
- return admin/public preview metadata,
- leave runtime route ownership unchanged until a later
  `setting.content-route.upsert` links `detailPageId`.

Policy metadata for this resource family should use the technical kind
`detail-page` and the UI label "Detail Template" only at the presentation
layer, but generic policy registration itself is deferred to
`TASK-190-05-03-08`.

## Security Contract

- Visibility: internal assistant action flow.
- Auth model: existing admin session.
- RBAC: execute requires content/page route write permissions matching existing
  page/content route actions.
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
- `page.upsert` rejects opaque detail page document payloads.
- Dry-run reports missing content type/field conflicts.
- Execute creates/upserts document idempotently.
- Execute rejects content-type/id mismatches and incompatible existing detail
  page ownership.
- Undo manifest captures safe rollback metadata if applicable.
- Action registry includes `detail-page.upsert`.
- Review/result UI labels render `detail-page.upsert` as "Detail Template"
  while the technical action/resource kind remains `detail-page`.
- Base reviewed planner integration continues to flow through the existing
  action-plan seams without adding a second detail-page executor path.
- Assistant execution cache invalidates `detailPages:list` and
  `detailPages:detail:<id>` once the dedicated admin detail-page client wrappers
  from the admin/API slice exist.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
