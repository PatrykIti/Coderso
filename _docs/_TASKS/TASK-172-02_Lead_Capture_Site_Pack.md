# TASK-172-02: Lead Capture Site Pack
# FileName: TASK-172-02_Lead_Capture_Site_Pack.md

**Priority:** High  
**Category:** Assistant/Product + Forms + Pages  
**Estimated Effort:** Large  
**Dependencies:** TASK-172-01, TASK-170-01-03  
**Status:** To Do

---

## Overview

Add a blueprint pack for small service businesses that need a lead capture site: landing page, service summary sections, public inquiry form, and follow-up refinements.

## Sub-Tasks

No child task files unless form automation splits into its own implementation leaf.

## Pseudocode

```ts
const plan = buildBlueprintPlan(leadCapturePack, {
  prompt,
  fields: ["service", "problem", "region", "contact"],
  actions: [
    pageUpsertLanding(),
    formUpsertInquiry({ submissionAccess: "public" }),
    pagePatchFormEmbed(),
  ],
});
```

## Files to Change

- `core/services/assistant/blueprints/*`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/forms/formsService.ts` only through existing APIs/helpers
- `core/services/pages/pageService.ts`
- widget/form embed contract modules if page block support expands
- `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/integration/server/*assistant*`

## Security Contract

- Visibility: internal action endpoints for setup.
- Auth model: admin session.
- RBAC: page/form read for plan/dry-run and page/form write/publish for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: public form fields and page blocks must be strict.
- Anti-abuse: generated public forms must use existing public form access evaluators, nonce/captcha policy, and submission hardening.
- Idempotency: repeated execute must not duplicate forms/pages.
- Secret handling: no form submissions or integration secrets in plan/preview/audit.

## Testing Requirements

- Vitest:
  - prompt classification to lead capture pack,
  - blueprint action order and field defaults,
  - form embed plan shape.
- Bun:
  - executor DB test for page+form creation,
  - public runtime acceptance for landing page and embedded form,
  - form public-write security tests if form access behavior changes.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- relevant `docs/` assistant corpus page for lead capture setup.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. User prompt for a service lead page routes to a ready plan.
2. Execute creates/update a page and hardened inquiry form.
3. Runtime acceptance proves the public surface renders without duplicate setup.
