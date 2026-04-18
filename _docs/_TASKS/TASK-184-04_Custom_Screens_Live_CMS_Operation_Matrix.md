# TASK-184-04: Custom Screens Live CMS Operation Matrix
# FileName: TASK-184-04_Custom_Screens_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01, TASK-184-03
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for custom screen operations.

Custom screens depend on content types, so this leaf should use the content type fixture from TASK-184-03 or create its own isolated content type through the harness.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create:
  - one visible/active screen,
  - one hidden/draft screen,
  - names share a test prefix.
- Search:
  - list visible screens in Screens,
  - search by prefix,
  - verify hidden screen is included/excluded depending on prompt wording.
- Update:
  - toggle sidebar visibility,
  - rename a screen,
  - patch a safe widget block/binding only if the fixture includes supported blocks.
- Delete:
  - delete two screens by counted prefix,
  - follow-up confirmation from previous candidate list.
- Negative:
  - ambiguous screen delete without count returns `needs_input`.

## Files to Change

- New live test file for custom screens.
- Shared live fixture helper.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: custom screen mutations require content write permissions.
- CSRF: preserve route/service test ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `custom-screen.*` actions must pass strict schemas.
- Anti-abuse: deletes restricted to test prefix resources.
- Secret handling: no raw entry values or provider secrets in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - surfaceHint `Screens` works,
  - visible/active filters are respected,
  - counted delete uses reviewed actions,
  - cache invalidation events can be asserted if the harness captures admin client broadcasts.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
