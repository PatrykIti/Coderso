# TASK-174-04-01: Page Metadata and Settings Edit Actions
# FileName: TASK-174-04-01_Page_Metadata_and_Settings_Edit_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-04
**Status:** To Do

---

## Overview

Add typed page edit actions for title, slug, status, nav/settings, and SEO-adjacent page metadata where owned by the page contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/pages/pageService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`; publish/status changes require `content:publish` where applicable.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict page edit schema.
- Anti-abuse: active page/catalog target resolution only; no arbitrary id passthrough.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw page snapshots in UI/audit.

## Testing Requirements

- Vitest:
  - active page target resolution,
  - schema rejection.
- Bun:
  - executor updates page through page service,
  - dry-run before/after summary,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can update page metadata/settings after review.
2. Unrelated page data remains unchanged.
3. Status/publish-affecting changes keep correct permissions.
