# TASK-054-11-07-02: Checkout Adapter Registry and Plugin Hook Bridge
# FileName: TASK-054-11-07-02_Checkout_Adapter_Registry_and_Plugin_Hook_Bridge.md

**Priority:** High  
**Category:** Commerce/Plugins  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-07-01  
**Status:** Done (2026-02-19)

---

## Goal
Implement adapter registry resolution with plugin extension hook points.

## Scope
1. Add checkout adapter registry with:
   - register/unregister/list,
   - provider key resolution with fallback,
   - operation helpers (`resolve add-to-cart`, `resolve checkout URL`).
2. Add plugin hook constant for checkout adapter extension.
3. Bridge plugin filters into adapter catalog resolution.
4. Ensure plugin failures/invalid payloads do not break core runtime.

## Files
- `core/services/commerce/checkoutRegistry.ts` (new)
- `core/plugins/hooks/commerce.ts` (new)

## Pseudocode
```ts
const catalog = mergeBuiltInAndLocalAdapters();
const payload = applyFilter("commerce:checkout:adapters", { adapters: catalog, defaultKey });
const adapter = payload.adapters[requestedKey] ?? payload.adapters[payload.defaultKey] ?? INTERNAL_NOOP;

if (operation === "checkout") return adapter.createCheckoutUrl?.(...) ?? noopCheckoutResult();
return adapter.addToCart?.(...) ?? noopAddToCartResult();
```

## Acceptance Criteria
1. Registry resolves unknown providers to stable fallback.
2. Plugins can extend adapter catalog via hooks.
3. Invalid plugin adapter payloads are ignored safely (no runtime crash).

## Delivered
- Added checkout adapter registry and operation resolvers:
  - `core/services/commerce/checkoutRegistry.ts`
  - `registerCheckoutAdapter`
  - `unregisterCheckoutAdapter`
  - `listCheckoutAdapters`
  - `resolveCheckoutAdapter`
  - `resolveCommerceAddToCart`
  - `resolveCommerceCheckoutUrl`
- Added plugin hook extension point:
  - `core/plugins/hooks/commerce.ts`
  - `COMMERCE_CHECKOUT_ADAPTERS_FILTER`
- Added safe filter bridge behavior:
  - plugin filter failures are isolated and do not crash runtime,
  - invalid adapter payload entries are ignored,
  - internal noop adapter is always enforced as fallback.
