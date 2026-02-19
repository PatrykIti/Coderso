# TASK-054-11-07: Checkout/Cart Adapter Contract
# FileName: TASK-054-11-07_Checkout_Cart_Adapter_Contract.md

**Priority:** Medium  
**Category:** Integrations/Architecture  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-03, TASK-054-11-06  
**Status:** To Do

---

## Goal
Define pluggable checkout/cart contract for future providers without hard-coding payment gateways in core.

## Scope
1. Adapter interface for add-to-cart and checkout URL resolution.
2. Default no-op/internal adapter behavior.
3. Hook points for plugin-provided adapters.

## Files (planned)
- `core/services/commerce/checkoutAdapter.ts` (new)
- `core/services/commerce/checkoutRegistry.ts` (new)
- `core/plugins/hooks/commerce.ts` (new or existing hooks extension)
- `tests/unit/commerce/checkoutAdapter.test.ts` (new)

## Pseudocode
```ts
const adapter = resolveCheckoutAdapter(providerKey);
const checkoutUrl = await adapter.createCheckoutUrl({ items, returnUrl });
```

## Acceptance Criteria
1. Core can run with default adapter (no provider lock-in).
2. Contract is plugin-extensible and typed.
3. Unit tests cover adapter resolution/fallback behavior.
