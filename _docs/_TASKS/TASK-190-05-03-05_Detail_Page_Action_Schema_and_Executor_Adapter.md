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
- Update `core/services/assistant/actionFamilyContracts.ts`
- Update `core/services/assistant/actionExecutorService.ts`
- Update `core/services/assistant/actionUndoManifest.ts` if detail documents
  need rollback metadata.
- Add `tests/vitest/assistant/action-plan-schema.test.ts` cases.
- Add `tests/unit/assistant/actionExecutorService.test.ts` cases.

## Action Contract

Required action:

```ts
type AssistantDetailPageUpsertAction = {
  id: string;
  type: "detail-page.upsert";
  title: string;
  description: string;
  input: {
    contentTypeSlug: string;
    routePattern: string;
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

Dry-run must show:

- content type,
- route pattern,
- blocks/sections summary,
- bindings summary,
- related sources,
- public impact,
- conflicts and missing fields.

Execute must:

- revalidate document,
- verify content type exists,
- verify route does not collide unsafely,
- upsert document idempotently,
- invalidate relevant site cache,
- return admin/public preview metadata.

## Security Contract

- Visibility: internal assistant action flow.
- Auth model: existing admin session.
- RBAC: execute requires content/page route write permissions matching existing
  page/content route actions.
- CSRF: existing assistant execute route.
- Rate-limit bucket: assistant.
- Reject-unknown validation: action input and document are strict.
- Anti-abuse: no provider-to-executor payload; action must be locally assembled.
- Public-write hardening: embedded forms reuse existing form hardening.
- Secret handling: action preview/audit redacts secret-like binding fields.

## Testing Requirements

- Schema accepts valid action and rejects unknown fields.
- `page.upsert` rejects opaque detail page document payloads.
- Dry-run reports missing content type/field conflicts.
- Execute creates/upserts document idempotently.
- Execute rejects route collision.
- Undo manifest captures safe rollback metadata if applicable.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
