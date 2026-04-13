# TASK-174-03-02: Page Delete Action
# FileName: TASK-174-03-02_Page_Delete_Action.md

**Priority:** High
**Category:** Assistant/Delete + Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** To Do

---

## Overview

Add `page.delete` for user-requested deletion of pages resolved from active page context or server-side page catalog.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/pages/pageService.ts` if helper checks are needed
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`; published/public deletion requires `content:publish` if domain policy requires it.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict `page.delete` input rejects unknown fields.
- Anti-abuse: target page id must be resolved from active context/catalog; public impact warning required.
- Idempotency: execute requires idempotency key.
- Secret handling: do not expose raw page data in API/UI/audit.

## Testing Requirements

- Vitest:
  - active page prompt resolves `page.delete`,
  - ambiguous title/slug returns `needs_input`,
  - schema rejects unknown fields.
- Bun:
  - executor calls `deletePage`,
  - public/published warning appears in dry-run,
  - route permission checks execute path.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can plan reviewed deletion of the active page or exact page match.
2. Deletion goes through `pageService.deletePage`.
3. Public impact is visible before execute.
