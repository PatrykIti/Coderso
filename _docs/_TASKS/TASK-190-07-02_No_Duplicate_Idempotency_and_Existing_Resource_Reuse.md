# TASK-190-07-02: No-Duplicate Idempotency and Existing Resource Reuse
# FileName: TASK-190-07-02_No_Duplicate_Idempotency_and_Existing_Resource_Reuse.md

**Priority:** High
**Category:** Assistant/Core + Execution Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-02, TASK-190-05-03-07, TASK-190-06-02, TASK-190-07-01
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
- Update `tests/unit/assistant/actionExecutorService.test.ts`
- Update `tests/unit/assistant/actionExecutorService.db.test.ts`
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
  contentTypeId: string;
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
- This slice extends the existing bounded catalog seam in
  `adminContextCatalogs.ts` / `adminContextCatalogNormalizer.ts`; it does not
  add a parallel detail-page lookup store or one-off planner-only service path.
- Existing-resource reuse must key off deterministic identifiers or explicit
  collection-link metadata from current owner contracts. If an owner seam does
  not yet expose enough information, extend that seam with stable link metadata
  instead of falling back to `name`-only matching.
- `contentTypeId` is the stable collection identity in bounded detail-page
  summaries. `contentTypeSlug` and `linkedRouteType` remain route-facing labels
  and compatibility data; they must not become the primary join key for reuse.
- persistence of canonical list-page links and page-attached listing/query/
  template references stays with `TASK-190-05-02` / current page owner seams,
  concretely `PageData.settings.collectionLink`.
- persistence of stable custom-screen collection metadata stays with exact
  `collectionRole` / `compositionKey` fields from `TASK-190-06-02` / current
  custom-screen owner seams.
- persistence of detail-page-owned secondary-resource metadata stays with
  `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page owner seams.
- this slice only consumes those persisted fields in bounded catalogs and
  matcher logic; it must not introduce planner-owned metadata fallbacks.
- Non-unique fields such as listing query `name` or custom screen `name` are
  advisory labels only; they are not sufficient for silent reuse.
- `blueprintExistingResourceMatcher.ts` consumes these summaries for reuse and
  idempotency.
- matcher output feeds the existing `actionExecutorService` / idempotency store
  path; this slice must not introduce a planner-owned or blueprint-owned
  executor wrapper just to apply reuse decisions.
- generic provider/resource/policy exposure for `detail-page` stays deferred to
  `TASK-190-05-03-08`; this slice prepares the bounded summaries that later
  generic assistant seams consume, but it does not widen
  `providerPlanningContext.ts`, `cmsTargetResolver.ts`, or adjacent generic
  policy flows on its own.
- no parallel fuzzy lookup path should be introduced here to compensate for that
  deferral.

## Pseudocode

```ts
export const matchExistingCompositionResources = (graph, catalog) => ({
  contentType: findBySlug(catalog.contentTypes, graph.contentType.slug),
  page: findBySlug(catalog.pages, graph.page.slug),
  detailPage:
    findById(catalog.detailPages, graph.detailPage?.id) ??
    findLinkedDetailPage(
      catalog.detailPages,
      graph.contentType.id,
      graph.route?.detailPageId
    ),
  listingQuery: findExplicitOrUniqueQuery(
    catalog.listings.queries,
    graph.query?.id,
    graph.page?.listingQueryId,
    graph.contentType.slug
  ),
  listingTemplate: findBySlug(catalog.listings.templates, graph.template.slug),
  customScreen: findExplicitOrUniqueScreen(
    catalog.customScreens,
    graph.admin?.id,
    graph.admin?.compositionKey,
    graph.contentType.id,
    graph.admin?.role
  ),
});
```

Matcher rules:

- `page.slug` and `listing-template.slug` remain safe deterministic keys.
- `listing-query.name` and `custom-screen.name` must not be used as silent reuse
  keys because current storage only indexes them; they are not unique.
- `detail-page` fallback by `contentTypeId` alone is allowed only when current
  owner contracts expose exactly one canonical linked detail page for that
  collection; otherwise the matcher returns `unresolved`.
- `contentTypeSlug` may still appear in bounded summaries for route/context
  packaging, but matcher joins must prefer `contentTypeId` because the current
  content-type owner seam allows slug edits.
- If the current owner seam lacks deterministic link metadata for supporting
  resources, extend that seam with explicit `compositionKey`, `collectionRole`,
  or canonical list-page linkage under the exact owner leaves above rather than
  adding fuzzy name heuristics.
- For pages, the concrete persisted owner seam is
  `PageData.settings.collectionLink`; matcher logic consumes that field rather
  than introducing a second page-link store.
- This slice never invents or persists `compositionKey`, `collectionRole`,
  canonical list-page links, or page-attached listing refs inside matcher logic,
  planning state, or provider context.

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
- Non-unique `listing-query.name` and `custom-screen.name` collisions return
  `unresolved` or equivalent conflict metadata; they do not silently reuse the
  first match.
- Existing detail page document update/reuse tests keyed by stable detail page
  id and content-type ownership, not a second route-pattern owner.
- Matcher consumes canonical list-page / supporting-resource linkage from
  `TASK-190-05-02` / current page owner seams, concretely
  `PageData.settings.collectionLink`, rather than inventing planner-only state.
- Matcher consumes exact `collectionRole` / `compositionKey` fields from
  `TASK-190-06-02` / current custom-screen owner seams rather than inventing
  planner-only state.
- Matcher consumes any extra detail-page-owned secondary-resource metadata from
  `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page owner seams
  rather than inventing planner-only state.
- Generic provider/policy/target-resolver coverage for `detail-page` remains
  owned by `TASK-190-05-03-08`; this slice keeps reuse/idempotency assertions on
  bounded catalog builders and matcher behavior only.
- Idempotency replay tests.
- Conflict when existing resource is incompatible.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if cache events change.
- `_docs/ASSISTANT_SITE_BUILDER.md`
