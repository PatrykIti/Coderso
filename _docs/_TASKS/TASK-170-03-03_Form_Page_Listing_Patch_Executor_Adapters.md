# TASK-170-03-03: Form, Page, and Listing Patch Executor Adapters
# FileName: TASK-170-03-03_Form_Page_Listing_Patch_Executor_Adapters.md

**Priority:** High  
**Category:** Core/Assistant + Coderso Surfaces  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-03, TASK-170-01-03, TASK-170-03-01  
**Status:** To Do

---

## Overview

Implement non-destructive patch adapters for form automation, page widget patches, listing query filters, and listing template card configuration.

## Sub-Tasks

No child task files yet. Split by domain if patch semantics become too large for one implementation slice.

## Pseudocode

```ts
const current = await loadTarget(action.input.target);
const next = applyAssistantPatch(current, action.input.patch, {
  rejectUnknownFields: true,
  preserveUnknownLegacyBlocks: true,
});

if (isDeepEqual(current, next)) return noopResult();
return saveThroughDomainService(next);
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/forms/formActionsService.ts` or `formAutomationRunnerCore` only through reusable helpers
- `core/services/pages/pageService.ts`
- `core/services/content/listingQueriesService.ts`
- `core/services/content/listingTemplatesService.ts`
- widget/listing contract modules that own defaults/normalizers
- targeted Vitest/Bun tests

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `forms:read/write`, `content:read/write`, and `content:publish` where page publication changes are included.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unsupported widget types, listing fields, and automation action configs are rejected.
- Anti-abuse: public forms must keep existing nonce/captcha/access evaluator behavior; no new public endpoint.
- Idempotency: patches must be deterministic and replay-safe.
- Secret handling: no integration secrets, webhook secrets, form submissions, or secret-like settings in preview/result metadata.

## Testing Requirements

- Vitest:
  - pure patch helper coverage if extracted,
  - unknown widget/field rejection.
- Bun:
  - executor tests for each patch action,
  - public runtime acceptance for generated page/listing/form output where runtime surface changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/WIDGET_PACK_MATRIX.md` if widget pack readiness changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Patch actions are deterministic and non-destructive.
2. Public form hardening is preserved.
3. Runtime-facing changes have Bun acceptance coverage.
