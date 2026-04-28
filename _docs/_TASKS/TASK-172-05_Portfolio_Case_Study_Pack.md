# TASK-172-05: Portfolio Case Study Pack
# FileName: TASK-172-05_Portfolio_Case_Study_Pack.md

**Priority:** Medium  
**Category:** Assistant/Product + Portfolio  
**Estimated Effort:** Medium  
**Dependencies:** TASK-172-01  
**Status:** Done (2026-04-12)

---

## Overview

Turn the current portfolio/projects preset into a more complete case-study pack with detail pages, visible client/result fields, testimonials/CTA placement where existing widgets support it, and no-duplicate refinements.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
return buildBlueprintPlan(portfolioCaseStudyPack, {
  schemaFields: ["title", "clientName", "deliveryYear", "summary", "results"],
  actions: [contentTypeUpsert(), listingUpsert(), pageUpsert(), contentRouteUpsert()],
});
```

## Files to Change

- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/actionPlannerService.ts`
- listing/page/widget contracts if CTA/testimonials are added
- `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- `tests/integration/server/*assistant*`

## Security Contract

- Visibility: internal action endpoints.
- Auth model: admin session.
- RBAC: content/listing/page write permissions for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: schema fields and page block types strict.
- Anti-abuse: no public writes except existing public runtime reads.
- Idempotency: no duplicate portfolio resources.
- Secret handling: no private client data beyond explicitly modeled public fields.

## Testing Requirements

- Vitest:
  - blueprint field defaults,
  - routing for portfolio/case-study prompts,
  - refinement no-duplicate behavior where pure.
- Bun:
  - executor and public runtime acceptance for portfolio list/detail.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- relevant `docs/` assistant corpus page.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Portfolio/case-study prompts create a complete ready plan.
2. Generated pages support list/detail flow.
3. Follow-up changes update existing resources.

## Completion Notes (2026-04-12)

- Extended the existing portfolio/projects pack with case-study fields:
  - `resultSummary`
  - `testimonialQuote`
- Added these fields to the dedicated admin screen bindings so editors can review result/testimonial data.
- Kept the existing listing/page/detail route action flow unchanged.
- Added Vitest coverage for schema and plan output.
