# TASK-213-07: QA Docs and Widget Source Report Closure
# FileName: TASK-213-07_QA_Docs_and_Widget_Source_Report_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-213-01, TASK-213-02, TASK-213-03, TASK-213-04, TASK-213-05, TASK-213-06
**Status:** To Do

---

## Overview

Close the Widget Library QA family with concrete validation, source-report
updates, docs, changelog, and task board synchronization.

This is not a substitute for the implementation subtasks. It exists so the
source report and repo docs do not drift after fixes land across many widget
owners.

## Sub-Tasks

- `TASK-213-07-01_Widget_Playwright_and_Vitest_Regression_Matrix.md`
- `TASK-213-07-02_Widgets_Docs_Changelog_and_Board_Closure.md`

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md`
- `docs/coderso/widget-library.md`
- `docs/coderso/widget-template-editor.md`
- affected `_docs/_WIDGETS/*` docs
- `_docs/_TASKS/TASK-213*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Implementation Direction

Track each Playwright finding to an owner and closure state.

Pseudocode for the source report closure table:

```md
| Finding | Owner task | Status | Evidence |
|---|---|---|---|
| BUG-9 Form Embed crash | TASK-213-01-01 | Fixed | test + Playwright replay |
| BUG-10 listing loading | TASK-213-01-02 | Fixed | test + empty-state replay |
```

Validation notes must list exact commands, dates, and outcomes. If DB-backed
lanes cannot run, record the concrete blocker and do not mark the relevant
finding closed until rerun.

## Security Contract

- Visibility: documentation-only closure; no new endpoint.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: docs must describe the implemented schema owners,
  not route-local shortcuts.
- Anti-abuse:
  - docs and changelog must not include secrets, raw tokens, private media URLs,
    stack traces with credentials, or production user data;
  - Playwright evidence should use bounded screenshots/notes and redact private
    payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- All targeted Vitest suites listed by the completed leaves.
- Bun route/service suites when template/category/page insert route contracts
  changed. Load DB env first:
  `set -a && source .env && set +a`.
- Manual Playwright replay against:
  - Widget Library list/filter/favorites/template actions;
  - insert dialog success/error;
  - Form Embed, Listing Filters, Search Box;
  - repeatable count widgets;
  - product/media/rich-text quick setup upgrades.

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. Every `SUMMARY-WIDGETS.md` finding has owner, status, and evidence.
2. Docs describe the final shipped behavior rather than the planned behavior.
3. Changelog and changelog index include the completed family.
4. `_docs/_TASKS/README.md` counts and task rows match task file statuses.
