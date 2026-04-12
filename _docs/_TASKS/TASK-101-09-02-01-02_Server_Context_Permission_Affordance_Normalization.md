# TASK-101-09-02-01-02: Server Context Permission Affordance Normalization
# FileName: TASK-101-09-02-01-02_Server_Context_Permission_Affordance_Normalization.md

**Priority:** High
**Category:** Core/Assistant + API
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-02-01-01
**Status:** Done (2026-04-12)

---

## Overview

Rozszerzyc server-side `buildAssistantAdminContext` o runtime snapshot i permission/affordance hints. To nadal advisory context dla planowania, nie autoryzacja wykonania.

## Security Contract

- Visibility: internal only in existing assistant action planning context.
- Auth: existing admin session.
- RBAC: no authorization decisions based on client snapshot; execute routes still enforce permissions independently.
- CSRF: existing assistant action POST CSRF.
- Rate-limit: `assistant`.
- Reject-unknown validation: any new context fields are schema-owned and reject unknown fields.
- Anti-abuse: no public route, no nonce/HMAC/reCAPTCHA.
- Secret handling: drop user PII, session/cookie/CSRF data, raw roles and raw permission lists.

## Files to Change

- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/server/validation/assistantActionSchemas.ts` if context schema changes
- `tests/vitest/assistant/admin-context-service.test.ts`
- `tests/integration/routes/assistant.test.ts` if route schema changes

## Sub-Tasks

1. Add snapshot types to assistant context contract.
2. Normalize/dedupe/sort visible action hints.
3. Normalize permission hints as advisory `requiredForVisibleActions`.
4. Drop unsafe/unknown action kinds and secret-like fields.
5. Preserve `resourceCatalog` compatibility.

## Testing Requirements

- Vitest service tests for normalization and redaction.
- Bun route schema tests if schema changes.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`

## Completion Notes (2026-04-12)

- Added runtime snapshot normalization in `adminContextService`.
- Added strict schema for `context.runtimeSnapshot`.
- Advisory permission hints are normalized, deduped, sorted, and never used as authorization.
- Unsafe external hrefs and secret-like permission/resource hints are dropped.

## Validation (2026-04-12)

- `bunx vitest run tests/vitest/assistant/admin-context-service.test.ts --config vitest.config.ts`
- `bun test tests/integration/routes/assistant.test.ts`
