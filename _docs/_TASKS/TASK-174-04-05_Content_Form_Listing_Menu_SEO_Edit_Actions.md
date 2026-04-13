# TASK-174-04-05: Content, Form, Listing, Menu, and SEO Edit Actions
# FileName: TASK-174-04-05_Content_Form_Listing_Menu_SEO_Edit_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Domain Resources
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-04
**Status:** To Do

---

## Overview

Add remaining typed edit actions for entries, forms, listing queries/templates, menu items, and SEO documents.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- content, form, listing, menu, and SEO domain services as needed
- `tests/vitest/assistant/*`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC:
  - content/entries/listings/SEO require `content:write`,
  - forms require `forms:write`,
  - menus require `menus:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict per-resource edit schemas.
- Anti-abuse: no blind broad rewrites; target from active context/catalog only.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw form submissions, provider keys, or secret-like config.

## Testing Requirements

- Vitest:
  - planner target resolution,
  - schema rejection,
  - ambiguity handling.
- Bun:
  - executor adapters through domain services,
  - route permissions,
  - idempotency replay/conflict.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can edit core domain resources through typed reviewed actions.
2. Each edit preserves unrelated fields/config.
3. Existing domain services own mutation behavior.
