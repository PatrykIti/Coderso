# TASK-184-06: Listings Live CMS Operation Matrix
# FileName: TASK-184-06_Listings_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Listings
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01, TASK-184-03
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for listing query and listing template operations.

The suite should create listing resources for a fixture content type, search by name/slug/layout/source, patch filters/card settings, update metadata, delete unreferenced resources, and verify referenced resources are blocked from deletion.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create:
  - listing query for fixture entries,
  - listing template with explicit slug/layout/config.
- Search:
  - by listing query name,
  - by listing template slug/layout,
  - exclude unrelated listings.
- Update/Patch:
  - update query limit/includeDrafts,
  - patch listing filters,
  - update template layout,
  - patch card config.
- Delete:
  - delete unreferenced query/template by counted prefix.
- Negative:
  - referenced query/template delete blocked when pages/widget templates still reference them.

## Files to Change

- New live test file for listings.
- Shared live fixture helper.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: listing mutations require content write permissions.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `listing-query.*` and `listing-template.*` actions must pass strict schemas.
- Anti-abuse: reference conflicts block deletion.
- Secret handling: no secret-like listing config in provider prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - filters/card patches preserve unrelated config,
  - reference conflict is detected,
  - cleanup deletes references before listing resources.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
