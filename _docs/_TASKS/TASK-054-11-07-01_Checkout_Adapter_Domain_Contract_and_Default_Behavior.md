# TASK-054-11-07-01: Checkout Adapter Domain Contract and Default Behavior
# FileName: TASK-054-11-07-01_Checkout_Adapter_Domain_Contract_and_Default_Behavior.md

**Priority:** High  
**Category:** Commerce/Domain  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-03  
**Status:** Done (2026-02-19)

---

## Goal
Define a typed checkout/cart adapter contract with deterministic default behavior for projects without external provider integration.

## Scope
1. Add checkout/cart domain types:
   - line items,
   - add-to-cart input/result,
   - checkout-url input/result,
   - adapter capabilities and context.
2. Add default internal no-op adapter (`internal_noop`) that:
   - never throws for normal inputs,
   - returns stable `mode: "none"` results.
3. Add runtime contract guards for adapter key/shape validation.

## Files
- `core/services/commerce/checkoutAdapter.ts` (new)

## Pseudocode
```ts
export interface CommerceCheckoutAdapter {
  key: string;
  label: string;
  capabilities: { addToCart: boolean; checkout: boolean };
  addToCart?: (input, ctx) => Promise<AddToCartResult>;
  createCheckoutUrl?: (input, ctx) => Promise<CheckoutUrlResult>;
}

export const INTERNAL_NOOP_CHECKOUT_ADAPTER = {
  key: "internal_noop",
  capabilities: { addToCart: true, checkout: true },
  addToCart: async () => ({ mode: "none", cartUrl: null, checkoutUrl: null }),
  createCheckoutUrl: async () => ({ mode: "none", url: null }),
};
```

## Acceptance Criteria
1. Contract supports add-to-cart + checkout URL flows without provider lock-in.
2. Default adapter is deterministic and safe by default.
3. Invalid adapter definitions are rejected with stable error codes.

## Delivered
- Added checkout/cart contract types and adapter capabilities:
  - `core/services/commerce/checkoutAdapter.ts`
- Added deterministic internal fallback adapter:
  - `INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY`
  - `internalNoopCheckoutAdapter`
- Added shared fallback result factories and adapter contract assertions:
  - `createNoopAddToCartResult`
  - `createNoopCheckoutUrlResult`
  - `assertCheckoutAdapterContract`
