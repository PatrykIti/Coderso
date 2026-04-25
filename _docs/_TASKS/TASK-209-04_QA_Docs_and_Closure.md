# TASK-209-04: QA, Docs, and Closure
# FileName: TASK-209-04_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-209-01, TASK-209-02, TASK-209-03
**Status:** To Do

---

## Overview

Close the Custom Screens list parity family with targeted validation,
documentation updates, task board sync, and changelog entries.

This closure task should run after implementation leaves land. It must verify
the route in the current repo instead of relying on static screenshots or stale
task assumptions.

## Sub-Tasks

No child task files.

## Testing Requirements

- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts` if `customScreens.openAfterCreate` is added.
- Run the user-settings service test if the persisted preference key is added
  and `DATABASE_URL` is reachable:
  - `set -a && source .env && set +a`
  - `bun test tests/unit/settings/userSettingsService.test.ts`
- Run `bun test tests/integration/routes/customScreensRoutes.test.ts` if any
  route, validation, permission, or error-mapping contract changed.
- If a local dev server is available, verify `/admin/coderso/custom-screens`
  against `/admin/pages` at desktop and mobile widths:
  - header actions,
  - filters,
  - table layout,
  - pagination,
  - row dropdown,
  - create drawer,
  - single delete confirm,
  - bulk action bar,
  - bulk delete confirm,
  - toasts.

## Security Contract

- Visibility: internal admin UI and existing internal admin API.
- Auth/RBAC/CSRF/rate-limit: verify they remained unchanged unless an
  implementation task explicitly updated the contract.
- Reject-unknown validation: verify no UI code submits fields outside
  `customScreenCreateSchema` and `customScreenUpdateSchema`.
- Anti-abuse: verify destructive actions require confirmation and no public
  write path was introduced.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
  - Document Custom Screens list parity: filters, table, lifecycle actions,
    bulk actions, and toast behavior.
- `_docs/ADMIN_CACHE.md`
  - Document Custom Screens mount/prefetch behavior if changed.
- `_docs/ADMIN_CACHE_MAP.md`
  - Keep Custom Screens cached API and cache-bus owners aligned.
- `_docs/CMS_API.md`
  - Add `customScreens.openAfterCreate` if the preference key is added.
  - Keep the Custom Screens record summary aligned with the existing contract,
    including `showInSidebar`, `sidebarLabel`, and derived `capabilities`, even
    when endpoint paths do not change.
- `_docs/_TASKS/README.md`
  - Move TASK-209 family to Done and update statistics.
- `_docs/_CHANGELOG/*`
  - Add the completed task entry.
- `_docs/_CHANGELOG/README.md`
  - Index the changelog entry.

## Acceptance Criteria

1. All targeted suites pass or unrelated failures are isolated with exact
   failure strings.
2. Docs describe the final Custom Screens list behavior and cache contract.
3. Task statuses, board statistics, and changelog index are synchronized.
4. Remaining gaps are explicit and not hidden as completed parity work.
