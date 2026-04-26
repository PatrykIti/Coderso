# TASK-214-04-04: Listings Error Mapping and Toast Adapter
# FileName: TASK-214-04-04_Listings_Error_Mapping_and_Toast_Adapter.md

**Priority:** High
**Category:** Coderso Listings + API Contract + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208
**Status:** To Do

---

## Overview

Tighten the route/error and toast adapter contract needed for reliable Listings
list feedback.

Listings already has `mapListingError` in `core/server/routes/listingsRoutes.ts`
and strict schemas in `listingSchemas.ts`. This leaf verifies that UI-visible
query/template failures map to stable machine-readable API errors and that the
list uses shared toast normalization instead of ad hoc strings.

## Sub-Tasks

- [ ] Add Listings-specific toast adapters for query and template resources in
  `core/admin/ui/listings/listingActionToasts.ts`.
- [ ] Reuse `createListActionToastAdapter`; do not create a local toast system.
- [ ] Export one `listingQueryToasts` adapter and one `listingTemplateToasts`
  adapter for reuse by `ListingListPage`, `ListingTemplateManager`, and
  `ListingEditorPage`.
- [ ] Preserve inline alerts for contextual load or partial bulk failure copy.
- [ ] Add route tests for known mapped errors that the UI depends on.
- [ ] Export `mapListingError` from `core/server/routes/listingsRoutes.ts` for
  direct route-boundary coverage, matching the existing media/forms route test
  pattern. Export only the mapper; do not change behavior unless a real mapping
  gap is found.
- [ ] Add route tests for the current query error split:
  malformed/unknown top-level create/update payloads are rejected by
  `listingQueryCreateSchema` / `listingQueryUpdateSchema` as route-boundary
  validation errors, while semantic query normalizer errors that pass JSON
  schema validation, such as `listing_query_invalid_source_config`,
  `listing_query_invalid_filter_value`, and `listing_query_invalid_name`, pass
  through `withListingErrors` unchanged as `ApiError` instances.
- [ ] Do not require a public `listing_query_update_empty` response in TASK-214:
  the current route schema rejects empty update payloads before
  `parseListingQueryUpdateInput` can emit that internal sentinel. Only expose
  or test that code if the implementation intentionally changes the API
  contract and updates `_docs/CMS_API.md` in the same leaf.
- [ ] Add explicit mapping coverage for raw non-`ApiError` query sentinels that
  can leak through service code, especially the insert-failure
  `listing_query_invalid` from `listingQueriesService.createListingQuery`.
  This mapping should be separate from the query-builder `ApiError` pass-through
  cases.
- [ ] Confirm schemas reject unknown top-level query/template create/update
  fields.
- [ ] Add missing stable mapping only if a real domain error currently leaks as
  a raw exception.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/listingActionToasts.ts`
- `core/admin/ui/shared/listActionToasts.ts` only if the generic helper needs a
  target-safe extension.
- `core/server/routes/listingsRoutes.ts` to export `mapListingError`; add mapped
  cases only if mapping gaps are found.
- `core/server/validation/listingSchemas.ts` only if schema gaps are found.
- `tests/unit/content/listingSchemas.test.ts` if schema ownership or
  reject-unknown behavior changes.
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/integration/routes/listings.test.ts`

## Security Contract

- Visibility: internal Listings admin API and admin UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:read` for reads/preview, `content:write` for mutations.
- CSRF: mutation helpers continue using `withCsrf: true`.
- Rate-limit bucket: existing `admin_read` / `admin_write` buckets.
- Reject-unknown validation: create/update schemas keep
  `additionalProperties: false`; template `config` remains the deliberate
  flexible object owned by `listingTemplatesService` normalization.
- Anti-abuse: error messages must not expose raw SQL, stack traces, secret
  values, or unpublished runtime rows.

## Pseudocode

```ts
const queryError = listingQueryToasts.error("delete", err, {
  fallbackMessage: "Failed to delete listing query.",
});

export const mapListingError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  // ApiError instances from queryBuilderService should pass through before this
  // mapper. This mapper is only for non-ApiError domain sentinels.
  if (error.message === "listing_query_not_found") {
    return new ApiError("listing_query_not_found", "Listing query not found", 404);
  }
  if (error.message === "listing_query_invalid") {
    return new ApiError("listing_query_invalid", "Listing query payload is invalid", 400);
  }
  // Keep mapped template errors here.
};
```

## Testing Requirements

- Toast helper coverage includes query/template singular and plural copy.
- UI tests prove failed query/template mutations show stable inline copy.
- Route tests prove:
  - `mapListingError` maps existing non-`ApiError` query/template sentinels
    directly through an exported mapper;
  - missing query maps to `listing_query_not_found`;
  - raw non-`ApiError` `listing_query_invalid` maps to a stable 400 response;
  - malformed or unknown query create/update payloads are rejected at the route
    schema boundary with `validation_error`;
  - semantic query normalizer errors that pass JSON schema validation preserve
    stable query errors such as `listing_query_invalid_source_config`,
    `listing_query_invalid_filter_value`, and `listing_query_invalid_name`;
  - empty query update payloads keep the current route-boundary behavior unless
    a deliberate API contract change is made with docs and tests;
  - missing template maps to `listing_template_not_found`;
  - duplicate template slug maps to `listing_template_slug_exists`;
  - invalid template layout/config map to stable 400 errors;
  - unknown create/update fields are rejected.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `set -a && source .env && set +a && bun test tests/integration/routes/listings.test.ts`
  - `bun test tests/unit/content/listingSchemas.test.ts` if schema ownership or
    reject-unknown behavior changes.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md` if mapped error examples change.
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listings list feedback uses shared toast normalization.
2. UI-visible domain failures map to stable API errors.
3. Strict schema validation remains the route-boundary owner.
