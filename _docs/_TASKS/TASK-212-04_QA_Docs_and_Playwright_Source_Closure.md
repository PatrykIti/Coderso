# TASK-212-04: QA Docs and Playwright Source Closure
# FileName: TASK-212-04_QA_Docs_and_Playwright_Source_Closure.md

**Priority:** Medium
**Category:** CMS/Posts + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-212-01, TASK-212-02, TASK-212-03
**Status:** To Do

---

## Overview

Close `TASK-212` with validation evidence, source-report updates, docs, board,
and changelog.

This closure must be based on the 2026-04-25 Playwright retest findings, not the
older 2026-04-23 state. It should keep `TASK-204` closure intact and only update
the status of the remaining/open findings from the new retest.

## Sub-Tasks

- `TASK-212-04-01_Posts_Retest_Validation_Matrix.md`
- `TASK-212-04-02_Docs_Changelog_and_Source_Report_Update.md`

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if media/API contracts change
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor media UX changes
- `_docs/_TASKS/TASK-212*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-212`

## Security Contract

- No closure-only route or auth change.
- Validation notes must state whether any admin route, public runtime route, or
  media delivery behavior changed.
- Source-report and changelog copy must not include tokens, cookies, raw SQL,
  stack traces, or private media URLs.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Targeted Vitest lanes from `TASK-212-01` and `TASK-212-02`.
- Media block lanes from `TASK-212-03` if accepted.
- Bun route/runtime lanes only if route/runtime contracts change; load DB env
  before DB-backed tests:
  - `set -a && source .env && set +a`
- Manual Playwright CLI replay:
  - publish/update toast delivery;
  - Create New Post drawer console-clean state;
  - Media tab accepted/deferred state.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if applicable
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if applicable
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

## Acceptance Criteria

1. `SUMMARY-POSTS.md` has a final TASK-212 section that maps `BUG-5`, `BUG-8`,
   and `UX-4`.
2. Validation commands are recorded with pass/fail status.
3. Board statistics and task statuses are synchronized.
4. Changelog entry exists when this family is completed.
