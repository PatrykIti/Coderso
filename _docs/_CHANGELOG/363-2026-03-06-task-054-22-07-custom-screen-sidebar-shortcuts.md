# 363 - TASK-054-22-07 custom screen sidebar shortcuts

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-054-22-07

## Key Changes

### Custom screens
- Added `showInSidebar` and optional `sidebarLabel` to custom screen metadata.
- Extended the custom screen builder so editors can decide whether a screen should appear as a left-menu shortcut.
- Kept the shortcut opt-in and limited it to `active` screens.

### Admin navigation
- Added dynamic custom screen shortcuts after the `Coderso` group in the left sidebar.
- Shortcut targets now open the dedicated records workflow at `/admin/coderso/custom-screens/:screenId/entries`.
- Sidebar updates react to custom screen cache invalidation after create/update/delete.

### Validation
- Ran `bun --cwd core lint`
- Ran `bun --cwd core lint:types`
- Ran targeted navigation/custom-screen UI tests
- Ran DB-backed `customScreenService` test after applying the custom screen sidebar migration
