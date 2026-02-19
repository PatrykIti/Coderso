# 252 - Commerce DB and Service/Query Engine

- **Date:** 2026-02-19
- **Version:** 0.1.252
- **Tasks:** TASK-054-11, TASK-054-11-02, TASK-054-11-03

## Key Changes

### Commerce Data Model
- Added commerce persistence layer in DB schema:
  - `commerce_products`,
  - `commerce_collections`,
  - `commerce_product_collections`.
- Added indexes and constraints for slug uniqueness, listing filters, and deterministic ordering.
- Added migration artifacts:
  - `core/db/migrations/0042_jazzy_kid_colt.sql`,
  - `core/db/migrations/meta/0042_snapshot.json`,
  - `core/db/migrations/meta/_journal.json`.

### Commerce Service Layer
- Implemented commerce product and collection services:
  - product CRUD with slug uniqueness checks,
  - publish lifecycle handling (`publishedAt`),
  - collection assignment and hydration in product DTO.
- File:
  - `core/services/commerce/commerceService.ts`.

### Deterministic Query Engine
- Implemented allowlisted commerce query execution:
  - filter/sort/pagination normalization,
  - unsafe field/operator rejection before data access,
  - deterministic filtering/sorting output.
- File:
  - `core/services/commerce/commerceQueryService.ts`.

### Runtime Resolver Payloads
- Added runtime payload builders for commerce widgets:
  - product runtime cards,
  - compare payload,
  - wishlist payload.
- File:
  - `core/services/commerce/commerceRuntimeResolver.ts`.

### Tests
- Added DB-backed schema/service tests:
  - `tests/unit/commerce/schema.test.ts`,
  - `tests/unit/commerce/commerceService.test.ts`.
- Added unit tests for query/runtime logic:
  - `tests/unit/commerce/commerceQueryService.test.ts`,
  - `tests/unit/commerce/commerceRuntimeResolver.test.ts`.
