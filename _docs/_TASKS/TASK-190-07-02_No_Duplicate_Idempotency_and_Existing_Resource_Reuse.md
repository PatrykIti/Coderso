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
- Update `core/services/assistant/adminContextTypes.ts`
- Update `core/services/assistant/adminContextCatalogNormalizer.ts`
- Update `core/services/assistant/adminContextCatalogs.ts`
- Update `core/services/assistant/providerPlanningContext.ts` if the bounded
  resource package must expose the new detail-page summaries
- Update `core/services/assistant/cmsTargetResolver.ts` if detail-page matching
  needs trusted catalog support
- Add `tests/unit/assistant/blueprintCompositionExecutor.test.ts`
- Update `tests/vitest/assistant/admin-context-catalogs.test.ts`
- Update `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`

## Bounded Catalog Contract

This slice owns the assistant-facing bounded catalog summary needed for
existing-resource reuse. `detail-page` must become a cataloged resource here
instead of being matched through one-off service calls.

Required summary shape:

```ts
type AssistantDetailPageSummary = {
  id: string;
  name: string;
  status: "draft" | "published";
  contentTypeSlug: string;
  linkedRouteType: string | null;
  updatedAt: string | null;
  blockCount: number;
  bindingCount: number;
};
```

Rules:

- `AssistantResourceCatalogSnapshot` gains a bounded `detailPages` group.
- Catalog summaries must stay redacted: no raw blocks, no full binding payloads,
  no preview tokens, and no unpublished entry data.
- `blueprintExistingResourceMatcher.ts` consumes these summaries for reuse and
  idempotency.
- `providerPlanningContext.ts` may expose the bounded summaries only through the
  existing redacted resource package.
- `cmsTargetResolver.ts` may use the bounded summaries for trusted detail-page
  lookup once the policy/action slices enable that resource family; no parallel
  fuzzy lookup path should be introduced.

## Pseudocode

```ts
export const matchExistingCompositionResources = (graph, catalog) => ({
  contentType: findBySlug(catalog.contentTypes, graph.contentType.slug),
  page: findBySlug(catalog.pages, graph.page.slug),
  detailPage:
    findById(catalog.detailPages, graph.detailPage?.id) ??
    findCanonicalDetailPageByType(catalog.detailPages, graph.detailPage?.contentTypeSlug),
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
- Bounded detail-page catalog summaries normalize and round-trip through the
  assistant resource catalog builders.
- Existing resource update/reuse tests.
- Existing detail page document update/reuse tests keyed by stable detail page
  id and content-type ownership, not a second route-pattern owner.
- Idempotency replay tests.
- Conflict when existing resource is incompatible.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if cache events change.
- `_docs/ASSISTANT_SITE_BUILDER.md`
