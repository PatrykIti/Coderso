# 785 - TASK-249 custom screens workspace V3

**Date:** 2026-05-01
**Version:** Unreleased
**Tasks:** TASK-249, TASK-249-01, TASK-249-01-01, TASK-249-01-02, TASK-249-02, TASK-249-02-01, TASK-249-02-02, TASK-249-03, TASK-249-03-01, TASK-249-03-02, TASK-249-04, TASK-249-04-01

## Key Changes

### Custom Screens workspace

- Promoted Custom Screens to a V3 workspace contract that migrates V1/V2 rows
  on read, rejects explicit V2 write payloads, and removes `rowClick` /
  `createMode` from the active records workflow.
- Realigned the builder shell to one control model: `Preview`, `List View`,
  `Editor View`, and `Save`.
- Replaced the old list-view form with a table-preview canvas, left-panel list
  element library, and selected-column inspector.
- Added dedicated builder preview dialogs so `List View` can preview the live
  records table and `Editor View` can preview the widget-based record surface
  without leaving the builder route.
- Removed active-path `Classic editor` and `EntryCreateDrawer` branches from the
  records workflow. `New record` and row edit now route only through the
  screen-owned editor.
- Added an inline screen-owned record canvas built on the existing `screen-*`
  widget contract instead of introducing a parallel Custom Screens widget
  platform, and added selected-element activation in the record editor details
  rail.

### Admin contracts and navigation

- Sidebar shortcuts now require `status=active`, `showInSidebar=true`, and
  `supportsDedicatedEditor=true`.
- Assistant runtime context no longer treats
  `/admin/advanced/custom-screens/:screenId/entries/new` as an existing entry
  with id `new`.
- Updated CMS API, list/editor UX docs, widget surface docs, and admin cache
  docs to describe the V3 workspace flow and readiness gate.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun x vitest run tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-list-view.test.ts tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/custom-screen-route-params.test.ts` - passed.
- `bun test tests/integration/routes/customScreensRoutes.test.ts tests/integration/routes/contentEntriesRoutes.test.ts` - passed.
- `bun run gates:coderso` - passed. DB-backed subchecks were skipped by the
  gate where the suite already marks them optional without `DATABASE_URL`.

## Not Run Locally

- Playwright replay of the House Projects workflow. No authenticated local dev
  server/session was available in this workspace during implementation.
