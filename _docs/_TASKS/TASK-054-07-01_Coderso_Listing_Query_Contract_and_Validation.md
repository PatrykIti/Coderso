# TASK-054-07-01: Coderso Listing Query Contract and Validation
# FileName: TASK-054-07-01_Coderso_Listing_Query_Contract_and_Validation.md

**Priority:** High  
**Category:** Core/CMS + Validation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07  
**Status:** Done (2026-02-18)

---

## Goal
Define strict query schema and validator for listing queries (`entries/posts/users/taxonomies`) with safe operators and bounded limits.

## Files to Change
- `core/server/validation/listingSchemas.ts`
- `core/services/content/queryBuilderService.ts` (new, validation helpers)
- `tests/unit/content/listingSchemas.test.ts` (new)
- `tests/unit/content/queryBuilderService.test.ts` (new)

## Contract
- Allowed operators: `eq, neq, in, nin, contains, startsWith, gt, gte, lt, lte, between, exists`.
- Required source-specific config:
  - `entries`: `contentTypeId`
  - `posts`: none (resolved by post mapping contract)
  - `users`: none
  - `taxonomies`: optional `taxonomyId`
- Hard caps:
  - `filters <= 20`
  - `sort <= 3`
  - `limit <= 100`
  - `offset <= 5000`
  - `fields <= 40`

## Pseudocode
```ts
function validateListingQuery(input: unknown): ListingQuery {
  validate(listingQuerySchema, input);
  const parsed = normalizeQuery(input);
  assertSupportedSource(parsed.source, parsed.sourceConfig);
  assertFilterOperatorValues(parsed.filters);
  assertNoUnsafeFieldNames(parsed);
  return parsed;
}
```

## Acceptance Criteria
1. Invalid operator/field/limit is rejected with deterministic error code.
2. Source-specific missing config is rejected.
3. Validation is reusable by routes and services.
4. `parseListingQuery`, `parseListingQueryCreateInput`, and `parseListingQueryUpdateInput` are covered by unit tests.
