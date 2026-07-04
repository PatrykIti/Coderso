# TASK-487-02: Admin — Entries Client Revision Methods + Revision Drawer UI
# FileName: TASK-487-02-Admin-Client-And-Revision-Drawer.md

**Parent Task:** TASK-487
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-487-01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Expose the new backend revision endpoints through the admin client and surface a
revision history drawer in the entry editor. Mirror the posts implementation
end-to-end: `postsClient.ts:368-403` (client + cache contract),
`cachePolicy.ts:40` (`postRevisions` key), and `PostRevisionDrawer.tsx` (drawer
component). The drawer opens from a new "History" button in the entry editor
toolbar (`EntryEditor.tsx:732-752`).

The admin client and UI are Bun-free, so all tests for this subtask run in the
Vitest lane.

---

## Sub-Tasks

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| TASK-487-02-L01 | `entriesClient` revision methods + `entries:revisions:<id>` cache contract | Small | ⏳ To Do |
| TASK-487-02-L02 | `EntryRevisionDrawer` component + wire History button + restore handler in `EntryEditor` | Medium | ⏳ To Do |

---

## Dependencies

- TASK-487-01 (routes must exist). L02 depends on L01.

---

## Testing Requirements

- Vitest lane (Bun-free):
  - `tests/vitest/admin/entriesClient.test.ts` — mirror
    `tests/vitest/admin/postsClient.test.ts`: list/cache/restore patch +
    broadcast.
  - `tests/vitest/ui/content-entry-editor.test.tsx` (or
    `tests/vitest/ui-integration/*`) — drawer open, loading/error/empty states,
    restore confirm → entry data refresh.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB schema change → no migration artifacts.
