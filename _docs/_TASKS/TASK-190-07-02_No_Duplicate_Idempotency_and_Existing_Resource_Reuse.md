# TASK-190-07-02: No-Duplicate Idempotency and Existing Resource Reuse
# FileName: TASK-190-07-02_No_Duplicate_Idempotency_and_Existing_Resource_Reuse.md

**Priority:** High
**Category:** Assistant/Core + Execution Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-07-01
**Status:** To Do

---

## Overview

Ensure composed plans reuse existing resources and stay idempotent.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintExistingResourceMatcher.ts`
- Update `core/services/assistant/adminContextCatalogs.ts` if additional resource summaries are needed.
- Add `tests/unit/assistant/blueprintCompositionExecutor.test.ts`

## Pseudocode

```ts
export const matchExistingCompositionResources = (graph, catalog) => ({
  contentType: findBySlug(catalog.contentTypes, graph.contentType.slug),
  page: findBySlug(catalog.pages, graph.page.slug),
  listingQuery: findByName(catalog.listings.queries, graph.query.name),
  listingTemplate: findBySlug(catalog.listings.templates, graph.template.slug),
  customScreen: findByName(catalog.customScreens, graph.admin.name),
});
```

## Security Contract

- Visibility: internal planning/dry-run.
- Auth model: unchanged.
- RBAC: execute permissions unchanged.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: resource matches are advisory and revalidated by executors.
- Anti-abuse: repeated prompts must not create resource spam.
- Secret handling: catalog summaries stay bounded/redacted.

## Testing Requirements

- DB-backed no-duplicate tests.
- Existing resource update/reuse tests.
- Idempotency replay tests.
- Conflict when existing resource is incompatible.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if cache events change.
- `_docs/ASSISTANT_SITE_BUILDER.md`
