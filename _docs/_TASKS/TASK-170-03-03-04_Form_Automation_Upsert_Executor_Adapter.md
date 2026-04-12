# TASK-170-03-03-04: Form Automation Upsert Executor Adapter
# FileName: TASK-170-03-03-04_Form_Automation_Upsert_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Forms  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-03-03-01  
**Status:** Done (2026-04-12)

---

## Overview

Promote `form.automation.upsert` only after automation action schema, secret handling, and public form hardening are verified against existing forms services.

## Sub-Tasks

No child task files yet. Split if automation action types require independent adapters.

## Pseudocode

```ts
const form = await deps.getForm(input.formId);
const nextAction = normalizeFormAction(input.action);
assertNoIntegrationSecrets(nextAction.browserVisiblePayload);
await deps.upsertFormAction(form.id, nextAction);
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/forms/formActionsService.ts`
- `core/services/forms/formActionsContract.ts`
- `tests/vitest/assistant/*` for pure schema/redaction helpers
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `forms:read` for plan/dry-run and `forms:write` for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unsupported automation action config is rejected.
- Anti-abuse: public submissions continue to use existing form nonce/captcha/access evaluators; no new public endpoint.
- Idempotency: repeated automation upsert should update/noop rather than duplicate.
- Secret handling: no integration secrets, webhook secrets, provider keys, or raw submissions in preview/result/idempotency metadata.

## Testing Requirements

- Vitest:
  - pure form action schema/redaction helpers where Bun-free.
- Bun:
  - executor adapter tests,
  - form action service tests,
  - public form hardening regression only if public submission behavior changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Automation upsert uses existing forms services.
2. Secrets are not exposed in action payloads or metadata.
3. Public form hardening remains unchanged.

## Completion Notes (2026-04-12)

- Promoted `form.automation.upsert` from contract-only to executable assistant action type for safe non-webhook actions.
- Added strict input normalization for `formId` and one stable-id form action.
- Added dry-run/execute adapter logic through existing `listFormActions` and `setFormActions`.
- Kept webhook automations out of scope until secret handling for headers/body templates is explicit.
- Added Vitest schema/provider/registry contract coverage and Bun executor coverage for create/update/noop behavior.
