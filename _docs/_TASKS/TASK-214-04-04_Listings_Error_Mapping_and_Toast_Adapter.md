# TASK-214-04-04: Listings Error Mapping and Toast Adapter
# FileName: TASK-214-04-04_Listings_Error_Mapping_and_Toast_Adapter.md

**Priority:** High
**Category:** Coderso Listings + API Contract + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-04, TASK-208
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
- `core/server/routes/listingsRoutes.ts` only if mapping gaps are found.
- `core/server/validation/listingSchemas.ts` only if schema gaps are found.
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
  if (error.message === "listing_query_not_found") {
    return new ApiError("listing_query_not_found", "Listing query not found", 404);
  }
  // Keep mapped template errors here.
};
```

## Testing Requirements

- Toast helper coverage includes query/template singular and plural copy.
- UI tests prove failed query/template mutations show stable inline copy.
- Route tests prove:
  - missing query maps to `listing_query_not_found`;
  - missing template maps to `listing_template_not_found`;
  - duplicate template slug maps to `listing_template_slug_exists`;
  - invalid template layout/config map to stable 400 errors;
  - unknown create/update fields are rejected.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `set -a && source .env && set +a && bun test tests/integration/routes/listings.test.ts`
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
