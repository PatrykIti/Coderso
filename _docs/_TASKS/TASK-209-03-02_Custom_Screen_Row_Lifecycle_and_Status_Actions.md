# TASK-209-03-02: Custom Screen Row Lifecycle and Status Actions
# FileName: TASK-209-03-02_Custom_Screen_Row_Lifecycle_and_Status_Actions.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-03-01, TASK-209-02-03
**Status:** To Do

---

## Overview

Replace the current minimal row dropdown with a Custom Screens row action menu
that matches the Pages row-action ergonomics while staying inside the Custom
Screens lifecycle contract.

Custom Screens do not have preview or duplicate routes today. The list should
not invent them. It should expose records, edit, status transition, and delete.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenRowActions.tsx`
- `core/admin/ui/custom-screens/CustomScreenTable.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Implementation Checklist

- Row actions:
  - Records -> `/coderso/custom-screens/:id/entries`
  - Edit -> `/coderso/custom-screens/:id`
  - Activate -> `updateCustomScreen(id, { status: "active" })` when status is
    `draft`
  - Move to draft -> `updateCustomScreen(id, { status: "draft" })` when status
    is `active`
  - Delete -> opens `ConfirmActionDialog`
- If `CustomScreenRowActions` was introduced by `TASK-209-02-03`, extend that
  component instead of creating a parallel action menu.
- Disable the active/draft action that does not apply to the current status or
  omit it in favor of a single context-specific action.
- After a status mutation succeeds:
  - refresh list in the background,
  - emit the adapter success toast,
  - keep sidebar shortcut projection truthful: activating a shortcut-enabled
    screen can make it visible in the admin nav, while moving it to draft must
    make the list/nav treat the shortcut as configured but not visible,
  - keep selected rows stable unless the row becomes hidden by active filters,
    in which case selection trimming handles it.
- On status mutation failure:
  - emit adapter error toast,
  - preserve a visible inline alert for screen-reader/discoverability parity.
- Use `AdminLink` for Records/Edit and keep route canonicalization in the shared
  `adminPaths` / `AdminLink` / `prefetchAdminRoute` helpers. Row actions may
  build the resource-specific suffix with `encodeURIComponent(id)`, but must not
  introduce local alias matching, local prefetch matching, or absolute
  `/admin/...` hrefs.

## Security Contract

- Visibility: internal admin UI and existing internal admin API.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: `content:write` for status updates; `content:read` for links.
- CSRF: `updateCustomScreen` uses existing `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: submit only `{ status: "active" }` or
  `{ status: "draft" }` to `customScreenUpdateSchema`.
- Anti-abuse: no hidden/bulk mutation path; row action operates on one explicit
  row id.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Mounted test covering:
  - Records and Edit links,
  - links resolve through the shared admin navigation path instead of a
    Custom Screens-local alias helper,
  - draft row shows Activate,
  - active row shows Move to draft,
  - status update success emits toast after refresh,
  - status update updates the sidebar shortcut state for shortcut-enabled rows,
  - status update failure emits error toast and inline alert.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Row actions use Custom Screens lifecycle semantics, not Page publish labels.
2. Status updates are PATCH-based and schema-compatible.
3. Records/Edit navigation remains canonical and prefetchable.
4. No Preview/Duplicate UI appears in this task.
5. Delete only sets the pending row for the shared confirmation dialog; the
   mutation still runs from the confirmed parent flow.
