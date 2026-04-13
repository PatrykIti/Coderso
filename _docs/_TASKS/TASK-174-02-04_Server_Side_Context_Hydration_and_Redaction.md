# TASK-174-02-04: Server-Side Context Hydration and Redaction
# FileName: TASK-174-02-04_Server_Side_Context_Hydration_and_Redaction.md

**Priority:** High
**Category:** Assistant/Context + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02-01, TASK-174-02-02, TASK-174-02-03
**Status:** Done (2026-04-13)

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

## Completion Notes (2026-04-13)

- Added `hydrateAssistantActiveSurfaceContext`.
- `/assistant/actions/plan` now rehydrates active surface identity before planning:
  - pages through `pageService.getPage`,
  - widget templates through `widgetTemplateService.getWidgetTemplate`,
  - custom screens through `customScreenService.getCustomScreen`.
- Plan route requests additional read permissions for active surfaces:
  - `content:read` for active pages/custom screens,
  - `widgets:read` for active widget templates.
- Provider planning prompt packages now include redacted active surface summaries.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
