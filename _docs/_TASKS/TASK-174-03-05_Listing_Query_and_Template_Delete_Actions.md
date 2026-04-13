# TASK-174-03-05: Listing Query and Template Delete Actions
# FileName: TASK-174-03-05_Listing_Query_and_Template_Delete_Actions.md

**Priority:** High
**Category:** Assistant/Delete + Listings
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** To Do

---

## Overview

Add reviewed delete actions for listing queries and listing templates.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/content/listingQueriesService.ts`
- `core/services/content/listingTemplatesService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schemas reject unknown fields.
- Anti-abuse: block delete if page/widget references survive outside the reviewed plan where reference data is available.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw config secrets in UI/audit.

## Testing Requirements

- Vitest:
  - target resolution by active context/name/slug,
  - ambiguity handling,
  - schema rejection.
- Bun:
  - delete through `deleteListingQuery` / `deleteListingTemplate`,
  - reference conflict warning/block,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can delete exact listing queries/templates after review.
2. Referenced resources are not silently removed.
3. Existing listing domain services own deletion.
