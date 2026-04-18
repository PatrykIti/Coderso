# TASK-184-02: Pages Live CMS Operation Matrix
# FileName: TASK-184-02_Pages_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for page operations.

The test should create a deterministic group of pages, ask natural prompts to find pages by title/slug/status, edit single and multiple pages, delete selected pages, and verify unrelated pages are never returned or mutated.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create pages:
  - two or more pages with shared prefix, for example `llm-live-<runId>-test-alpha`.
  - at least one unrelated published page.
- Search:
  - find published pages by word in title,
  - find by slug fragment,
  - verify unrelated published pages are excluded.
- Update:
  - rename one page by exact title,
  - update status or metadata for counted matching pages when supported.
- Delete:
  - delete two counted pages by title prefix,
  - follow-up confirmation: `tak, te dwie, usun je`.
- Negative:
  - broad "delete all pages" returns `needs_input`.

## Files to Change

- New live test file for pages.
- Shared live fixture helper from TASK-184-01.
- Existing page/action tests only if helper contracts require it.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: page execute requires content write/publish permissions as existing contracts require.
- CSRF: preserve route/service test ownership from harness.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: generated `page.*` actions must pass strict schema.
- Anti-abuse: only resources with test prefix may be deleted.
- Secret handling: no page data with secrets and no provider keys in logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - provider metadata present,
  - expected `page.upsert`, `page.update`, `page.delete` actions where applicable,
  - dry-run ready before execute,
  - final page list matches expected state,
  - unrelated pages unchanged.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
