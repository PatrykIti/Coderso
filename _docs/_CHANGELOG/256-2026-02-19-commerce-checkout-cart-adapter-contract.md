# 256 - Commerce Checkout/Cart Adapter Contract

- **Date:** 2026-02-19
- **Version:** 0.1.256
- **Tasks:** TASK-054-11, TASK-054-11-07, TASK-054-11-07-01, TASK-054-11-07-02, TASK-054-11-07-03

## Key Changes

### Checkout Adapter Domain Contract
- Added typed commerce checkout/cart adapter contract:
  - line item types,
  - add-to-cart input/result model,
  - checkout URL input/result model,
  - adapter capability and context contracts.
- Added deterministic internal fallback adapter:
  - `internal_noop` adapter with stable `mode: "none"` behavior.
- File:
  - `core/services/commerce/checkoutAdapter.ts`

### Adapter Registry and Plugin Hook Bridge
- Added checkout adapter registry with:
  - local adapter register/unregister,
  - provider resolution with fallback to internal noop,
  - operation helpers for add-to-cart and checkout URL flows.
- Added plugin extension hook:
  - `commerce:checkout:adapters`
- Added safe filter bridge behavior:
  - plugin filter failures are isolated,
  - invalid adapter payloads are ignored,
  - internal fallback adapter is always preserved.
- Files:
  - `core/services/commerce/checkoutRegistry.ts`
  - `core/plugins/hooks/commerce.ts`

### Tests
- Added coverage for:
  - fallback resolution,
  - local adapter registration behavior,
  - plugin hook adapter injection,
  - invalid payload fallback safety.
- File:
  - `tests/unit/commerce/checkoutAdapter.test.ts`
