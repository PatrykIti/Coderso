# TASK-054-07-04: Coderso Listings API and Routes
# FileName: TASK-054-07-04_Coderso_Listings_API_and_Routes.md

**Priority:** High  
**Category:** Core/API + Admin  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-01, TASK-054-07-02, TASK-054-07-03  
**Status:** Done (2026-02-18)

---

## Goal
Expose Listings API for admin query builder and runtime preview.

## Files to Change
- `core/server/routes/listingsRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/server/validation/listingSchemas.ts`
- `core/services/content/listingQueriesService.ts` (new)
- `core/services/content/listingTemplatesService.ts`
- `core/db/schema.ts`
- `core/db/migrations/0038_listing_queries.sql` (new)
- `core/db/migrations/meta/_journal.json`
- `core/db/migrations/meta/0038_snapshot.json` (new)
- `tests/integration/routes/listings.test.ts` (new)
- `tests/unit/content/listingQueriesService.test.ts` (new)

## Routes
- `GET /listings/queries` (saved queries)
- `POST /listings/queries` (create query)
- `PATCH /listings/queries/:id`
- `DELETE /listings/queries/:id`
- `POST /listings/queries/preview` (execute unsaved query)
- `GET /listings/templates`
- `POST /listings/templates`
- `PATCH /listings/templates/:id`
- `DELETE /listings/templates/:id`

## Pseudocode
```ts
router.post("/listings/queries/preview", requirePermission("content:read"), async (ctx) => {
  validate(listingQuerySchema, ctx.body);
  return executeListingQuery(ctx.body as ListingQuery);
});
```

## Acceptance Criteria
1. Routes are permission-protected and schema-validated.
2. Preview endpoint returns deterministic list payload.
3. Integration tests cover success + validation failures.
4. Saved listing queries have dedicated persistence model (`listing_queries`) with CRUD service.
