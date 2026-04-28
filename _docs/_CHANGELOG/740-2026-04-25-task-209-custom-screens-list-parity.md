# 740 - TASK-209 custom screens list parity

Date: 2026-04-25
Version: Unreleased
Tasks: TASK-209, TASK-209-01, TASK-209-01-01, TASK-209-01-02, TASK-209-02, TASK-209-02-01, TASK-209-02-02, TASK-209-02-03, TASK-209-03, TASK-209-03-01, TASK-209-03-02, TASK-209-03-03, TASK-209-04

## Key Changes

### Custom Screens List
- Rebuilt `/admin/coderso/custom-screens` around the Pages list contract:
  compact `New`, filter strip, table card, visible-row selection, inline bulk
  actions, shared pagination footer, and selected-row treatment.
- Added Custom Screens-specific filters for screen/sidebar/content-type search,
  active/draft status, and content-type labels with stable `contentTypeId`
  fallbacks.
- Extracted list table, filters, row actions, bulk actions, list model, create
  drawer, and list-action toast adapter into resource-local components.

### Create And Lifecycle Actions
- Added a list-owned Custom Screen create drawer that submits only existing
  schema fields and blocks creation until a fetched content type is selected.
- Added typed `customScreens.openAfterCreate` user setting with default `true`.
- Routed create, activate, move-to-draft, delete, and bulk results through the
  shared list-action toast helper.
- Gated row delete and bulk delete through `ConfirmActionDialog`; no destructive
  delete runs directly from dropdown or bulk select.

### Cache And Prefetch
- Migrated `customScreensClient` and `contentTypesClient` list caches to
  `createMemoryBackedLocalCache` so module memory obeys the shared list TTL.
- Updated `useCustomScreens` to use cache-present/background and
  cache-missing/foreground mount behavior.
- Warmed both Custom Screens and content types on
  `/coderso/custom-screens` prefetch.
- Refreshed Custom Screen content-type label projection on `contentTypes:list`
  cache-bus updates without changing the Custom Screen API payload.

### Docs
- Documented Custom Screens list behavior in `_docs/CONTENT_LIST_UX.md`.
- Documented cache and prefetch ownership in `_docs/ADMIN_CACHE.md` and
  `_docs/ADMIN_CACHE_MAP.md`.
- Documented `customScreens.openAfterCreate` and list-only label projection in
  `_docs/CMS_API.md`.
- Moved the TASK-209 family to Done in `_docs/_TASKS/README.md`.

### Validation
- Added targeted Vitest coverage for Custom Screens client cache, mounted list
  behavior, view-model enrichment, create drawer, row actions, bulk actions,
  content-type cache TTL, prefetch warmup, user settings client, and list-action
  toast copy.
- Added user-settings service coverage for `customScreens.openAfterCreate`.
- Passed `bun --cwd core lint`.
- Passed `bun --cwd core lint:types`.
- Passed targeted Vitest:
  `tests/vitest/ui/custom-screens-page.test.tsx`,
  `tests/vitest/ui/custom-screens-list-wave.test.tsx`,
  `tests/vitest/ui/custom-screen-records.test.tsx`,
  `tests/vitest/ui/list-action-toasts.test.ts`,
  `tests/vitest/admin/customScreensClient.test.ts`,
  `tests/vitest/admin/contentTypesClient.test.ts`,
  `tests/vitest/ui/content-type-list-parity.test.tsx`,
  `tests/vitest/ui/entry-list-wave.test.tsx`,
  `tests/vitest/admin/adminPrefetch.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`, and
  `tests/vitest/admin/coderso-modules.test.ts`.
- Passed DB-backed Bun tests with the repo `.env` loaded:
  `tests/integration/routes/userSettings.test.ts` and
  `tests/unit/settings/userSettingsService.test.ts`.
