# 251 - Commerce Domain Contract and Schemas

- **Date:** 2026-02-19
- **Version:** 0.1.251
- **Tasks:** TASK-054-11, TASK-054-11-01

## Key Changes

### Commerce Domain Contract
- Added canonical commerce types for products, variants, stock, pricing, and query contracts:
  - `core/services/commerce/commerceTypes.ts`
- Added deterministic normalization helpers:
  - product status and stock state normalization,
  - currency and money validation,
  - slug normalization.

### Validation Schemas
- Added server-side commerce schemas for:
  - product create/update,
  - collection create/update,
  - runtime/admin query filter/sort/pagination payloads.
- File:
  - `core/server/validation/commerceSchemas.ts`

### Tests
- Added unit tests for normalization helpers:
  - `tests/unit/commerce/commerceValidation.test.ts`
- Added unit tests for schema validation:
  - `tests/unit/validation/commerceSchemas.test.ts`
