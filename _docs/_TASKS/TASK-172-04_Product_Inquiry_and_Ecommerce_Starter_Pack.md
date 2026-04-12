# TASK-172-04: Product Inquiry and Ecommerce Starter Pack
# FileName: TASK-172-04_Product_Inquiry_and_Ecommerce_Starter_Pack.md

**Priority:** High  
**Category:** Assistant/Product + Commerce + Catalogs  
**Estimated Effort:** Large  
**Dependencies:** TASK-172-01, TASK-170-01-03  
**Status:** To Do

---

## Overview

Expand the current product catalog preset into a practical product inquiry or ecommerce starter pack without overstating checkout capabilities that are not implemented.

## Sub-Tasks

No child task files yet. Split checkout/payment work into separate tasks if commerce scope expands beyond inquiry/catalog.

## Pseudocode

```ts
const mode = classifyCommerceMode(prompt); // "inquiry" | "catalog" | "checkout-ready"

if (mode !== "checkout-ready") {
  return buildProductInquiryPlan({ contentType, listing, page, inquiryForm });
}

return needsInput("Checkout setup needs explicit commerce/payment scope.");
```

## Files to Change

- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/actionPlannerService.ts`
- commerce domain services only if explicitly reused
- forms/pages/listings services through existing adapters
- `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- `tests/integration/server/*assistant*`

## Security Contract

- Visibility: internal action endpoints for setup.
- Auth model: admin session.
- RBAC: content/listing/page/form/commerce permissions based on selected mode.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: product schema and inquiry form fields must be strict.
- Anti-abuse: public inquiry form uses existing public form hardening; no payment public write unless separately scoped.
- Idempotency: repeated execute must not duplicate catalog resources.
- Secret handling: no payment keys, provider credentials, or customer submissions in assistant metadata.

## Testing Requirements

- Vitest:
  - prompt mode classification,
  - product inquiry blueprint shape,
  - checkout prompts return questions when unsupported.
- Bun:
  - DB-backed catalog/form/page execution,
  - public runtime catalog and inquiry form acceptance,
  - commerce tests only if commerce services are touched.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- commerce/product assistant docs in `docs/`.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Inquiry/catalog mode is honest and executable.
2. Checkout/payment is not implied unless explicitly implemented and tested.
3. Product catalog follow-ups reuse existing setup.
