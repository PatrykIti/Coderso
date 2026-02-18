# TASK-054-07: Coderso Dynamic Data and Listing Suite
# FileName: TASK-054-07_Coderso_Dynamic_Data_and_Listing_Suite.md

**Priority:** High  
**Category:** CMS/Content + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06, TASK-055-01  
**Status:** In Progress (2026-02-18)

---

## Overview
Deliver dynamic data/listing capabilities (JetEngine/JetGrid-like) on top of Nextless content engine, with safe server execution, reusable listing templates, and non-technical admin UX.

## Scope
1. Typed query contract for sources: `entries`, `posts`, `users`, `taxonomies`.
2. Safe query execution service with strict operators, limits, pagination, sorting, and guardrails.
3. Listing template model (card/list/table/calendar/map-ready payload) reusable across pages/widgets.
4. Admin API for queries + templates + preview resolution.
5. Admin UI in `Coderso -> Listings` with visual query builder and template manager.
6. Runtime integration with `contentList` and `entryTeaser` widgets (dynamic bindings + template usage).
7. Conditional visibility and dynamic field binding contract for listing items.
8. Full test matrix (unit/integration/UI), docs, and changelog.

## Non-Goals
- External search engine integration (Algolia/Elastic) in this task.
- Public unauthenticated write endpoints for listings.
- Replacing existing content widgets; only extending them with listing engine support.

## Architecture Contract
- Query input is declarative JSON validated server-side.
- Query execution never evaluates arbitrary expressions.
- Every query path enforces hard caps (`limit`, `offset`, max filter count, max sort fields).
- Listing templates are data-first contracts, not executable code.
- Runtime widgets consume resolved listing payloads only.

## Sub-Tasks
- `TASK-054-07-01_Coderso_Listing_Query_Contract_and_Validation.md`
- `TASK-054-07-02_Coderso_Listing_Query_Execution_Service_and_Safety.md`
- `TASK-054-07-03_Coderso_Listing_Templates_Model_and_Service.md`
- `TASK-054-07-04_Coderso_Listings_API_and_Routes.md`
- `TASK-054-07-05_Coderso_Listings_Admin_UI_Query_Builder_and_Template_Manager.md`
- `TASK-054-07-06_Coderso_Runtime_Widget_Integration_for_Listings.md`
- `TASK-054-07-07_Coderso_Conditional_Visibility_and_Dynamic_Field_Binding.md`
- `TASK-054-07-08_Coderso_Listings_QA_Tests_and_Documentation.md`

## Files to Change (Target)
- `core/services/content/queryBuilderService.ts` (new)
- `core/services/content/listingTemplatesService.ts` (new)
- `core/services/content/listingRuntimeResolver.ts` (new)
- `core/server/validation/listingSchemas.ts` (new)
- `core/server/routes/listingsRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/admin/services/listingsClient.ts` (new)
- `core/admin/ui/listings/ListingListPage.tsx` (new)
- `core/admin/ui/listings/ListingEditorPage.tsx` (new)
- `core/admin/ui/listings/ListingTemplateManager.tsx` (new)
- `core/admin/ui/listings/*` (new helpers/components)
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/services/content/contentListResolver.ts`
- `core/services/content/entryTeaserResolver.ts`
- `tests/unit/content/*`
- `tests/unit/widgets/*`
- `tests/integration/routes/listings.test.ts` (new)
- `_docs/CODERSO_MODULES.md`
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`

## Detailed Pseudocode
```ts
// 1) Query contract (validated)
type ListingSource = "entries" | "posts" | "users" | "taxonomies";

type ListingFilter = {
  field: string;
  op:
    | "eq"
    | "neq"
    | "in"
    | "nin"
    | "contains"
    | "startsWith"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "exists";
  value?: unknown;
};

type ListingQuery = {
  id: string;
  source: ListingSource;
  sourceConfig: {
    contentTypeId?: string;
    taxonomyId?: string;
    includeDrafts?: boolean;
  };
  filters: ListingFilter[];
  sort: Array<{ field: string; dir: "asc" | "desc" }>;
  pagination: { limit: number; offset: number };
  fields: string[];
};

// 2) Build executable plan (safe)
function buildListingExecutionPlan(input: ListingQuery) {
  validateListingQuery(input); // schema + allowlist + caps
  return {
    source: resolveSource(input.source, input.sourceConfig),
    filters: sanitizeFilters(input.filters),
    sort: sanitizeSort(input.sort),
    limit: clamp(input.pagination.limit, 1, 100),
    offset: clamp(input.pagination.offset, 0, 5000),
    fields: sanitizeFields(input.fields),
  };
}

// 3) Execute source adapters
async function executeListingQuery(plan: ListingExecutionPlan) {
  switch (plan.source.kind) {
    case "entries":
      return runEntriesQuery(plan);
    case "posts":
      return runPostsQuery(plan); // alias to post-type entries per TASK-055-01
    case "users":
      return runUsersQuery(plan);
    case "taxonomies":
      return runTaxonomiesQuery(plan);
  }
}

// 4) Resolve template + runtime payload
async function resolveListingRuntimePayload(input: {
  query: ListingQuery;
  templateId?: string;
  preview: boolean;
}) {
  const plan = buildListingExecutionPlan(input.query);
  const rows = await executeListingQuery(plan);
  const template = input.templateId
    ? await getListingTemplate(input.templateId)
    : getDefaultTemplateForSource(plan.source.kind);
  return mapRowsToListingPayload(rows, template);
}

// 5) Widget integration
async function resolveContentListRuntimeData(data, opts) {
  if (data.source.mode === "listing") {
    return resolveListingRuntimePayload({
      query: data.source.listingQuery,
      templateId: data.source.listingTemplateId,
      preview: opts.preview,
    });
  }
  return resolveLegacyContentListData(data, opts);
}
```

## Implementation Order (No Rework)
1. Contract and validation (`054-07-01`).
2. Execution engine and source adapters (`054-07-02`).
3. Template storage/service (`054-07-03`).
4. API wiring + auth/permissions (`054-07-04`).
5. Admin UI query builder + template manager (`054-07-05`).
6. Runtime widget integration (`054-07-06`).
7. Conditional visibility + dynamic binding (`054-07-07`).
8. Tests/docs/changelog finalization (`054-07-08`).

## Acceptance Criteria
1. Non-technical user can build query-based lists/cards without custom code.
2. Listing templates are reusable across widgets/pages and independently versionable.
3. Query builder supports strict validation + execution limits + deterministic results.
4. `contentList` and `entryTeaser` can consume listing engine payloads.
5. Integration and unit tests cover validation, execution, API, and UI states.

## Testing Requirements
- Unit: query validation, plan builder, source adapters, template resolver.
- Unit: widget runtime mapping and dynamic field binding.
- Integration: `/listings/*` routes + permission guards.
- UI: Listings page load, create/edit query, template preview, error states.
- Regression: legacy `contentList` behavior remains stable.

## Documentation Updates Required
- `_docs/CMS_API.md` (listings routes/contracts)
- `_docs/CODERSO_MODULES.md` (listings module maturity + ownership)
- `_docs/ARCHITECTURE.md` (listing engine layer)
- `_docs/_CHANGELOG/*.md`
