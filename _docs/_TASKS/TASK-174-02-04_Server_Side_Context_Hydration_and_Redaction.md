# TASK-174-02-04: Server-Side Context Hydration and Redaction
# FileName: TASK-174-02-04_Server_Side_Context_Hydration_and_Redaction.md

**Priority:** High
**Category:** Assistant/Context + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02-01, TASK-174-02-02, TASK-174-02-03
**Status:** To Do

---

## Overview

Add server-side hydration and redaction for active admin resource context before planner/provider use.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `core/server/routes/assistantRoutes.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Security Contract

- Visibility: internal plan route only.
- Auth model: existing admin session.
- RBAC: hydrate active page/template/screen details only after relevant read permission checks.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: reject unknown active context payload fields.
- Anti-abuse: client-provided ids are hints; server rehydrates and validates resources.
- Idempotency: not applicable.
- Secret handling: redact secret-like values, provider keys, API keys, cookies, CSRF tokens, access logs, form submissions, and user PII.

## Testing Requirements

- Vitest:
  - redaction and clamping of active context,
  - provider package excludes raw snapshots/secrets,
  - template/page/screen summary shapes.
- Bun:
  - assistant plan route hydrates context only with required permissions,
  - rejects unknown fields.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Active context is server-hydrated before mutation planning.
2. Provider packages receive bounded, redacted summaries only.
3. Route tests cover validation and permission boundaries.
