# 782 - TASK-248 custom screens workspace builder V2

**Date:** 2026-05-01
**Version:** Unreleased
**Tasks:** TASK-248, TASK-248-01, TASK-248-01-01, TASK-248-01-02, TASK-248-02, TASK-248-02-01, TASK-248-02-02, TASK-248-03, TASK-248-03-01, TASK-248-03-02, TASK-248-03-03, TASK-248-04, TASK-248-04-01, TASK-248-04-02

## Key Changes

### Custom Screens

- Added persisted Custom Screen V2 definitions through
  `custom_screens.definition`, with strict `listView` and `editorView`
  normalization.
- Kept V1 rows readable by migrating legacy `schemaVersion`, `blocks`, and
  `bindings` into deterministic V2 definitions at read time.
- Added `List View` builder controls for schema-backed columns, filters,
  default sort, row click behavior, create mode, and bulk action visibility.
- Added a records table renderer that reads `definition.listView` and reuses the
  existing content-entry client, cache keys, and route contracts.
- Added `Editor View` create/edit mode for
  `/advanced/custom-screens/:screenId/entries/new` and
  `/advanced/custom-screens/:screenId/entries/:entryId`, including schema
  default draft data and non-destructive update payloads.

### Admin Contracts

- Added workspace route helpers and prefetch support for Custom Screen records
  and entry detail routes.
- Centralized content-entry route error mapping for validation, slug conflicts,
  media failures, relation failures, missing entries/types, and auth failures.
- Split widget availability into `admin-list-view` and `admin-editor-view`
  surfaces with data-access metadata for selected content type and selected
  entry widgets.
- Updated admin cache, CMS API, content type, widget, task board, and Playwright
  closure docs.

## Validation

- `bun --cwd core lint:types` - passed.
- `bun --cwd core lint` - passed.
- `bun run test:vitest -- tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/admin/entriesClient.test.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-route-params.test.ts` - passed.
- `bun test tests/integration/routes/customScreensRoutes.test.ts tests/integration/routes/contentEntriesRoutes.test.ts tests/unit/widgets/registry.test.ts` - passed.
- `bun run gates:coderso` - passed. DB-backed subchecks were skipped by the
  gate because `DATABASE_URL` is not configured.

## Not Run Locally

- DB-backed migration smoke for `custom_screens.definition`; this worktree has
  no `.env` file and `DATABASE_URL` is unset.
- Playwright CLI House Projects replay; no authenticated dev server/session was
  available in this worktree. `_docs/PLAYWRIGHT/SUMMARY-SCREENS-2026-05-01.md`
  records the blocker and targeted replacement validation.
