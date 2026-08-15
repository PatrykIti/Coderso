# TASK-487-01: Backend — Entry Revisions Read + Restore
# FileName: TASK-487-01-Backend-Revisions-And-Restore.md

**Parent Task:** TASK-487
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add the missing server-side data path for entry revision history and restore.
Today `publishEntry` writes revisions (`entryService.ts:828` →
`createEntryRevisionTx`), but nothing can read or restore them. This subtask adds
a typed, author-joined read shape plus a `restoreEntryRevision` service, then
wires the two routes into `contentEntryRoutes.ts`, mirroring the posts pattern
(`postsService.ts:973`, `postsRoutes.ts:358-380`).

This is the foundation for TASK-487-02 (client + UI) and must land first.

---

## Sub-Tasks

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| TASK-487-01-L01 | `restoreEntryRevision` service + author-joined revision read shape | Medium | ⏳ To Do |
| TASK-487-01-L02 | Wire `GET .../revisions` + `POST .../revisions/:revisionId/restore` routes + error mapping | Small | ⏳ To Do |

---

## Dependencies

- None (table and write path already exist). L02 depends on L01.

---

## Testing Requirements

- Bun lane only (the service imports `db` from `db/client`, so the modules are
  not Bun-free):
  - `tests/unit/content/entryService.test.ts` (DB-backed) — extend the existing
    revision test to cover restore + author shape.
  - `tests/integration/routes/contentEntriesRoutes.test.ts` — route registration
    + permissions + `mapContentEntryError` for the new revision codes.
  - optional end-to-end mirror of
    `tests/integration/posts/posts-revisions-flow.test.ts`.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- `set -a && source .env && set +a` before DB-backed tests.
- No DB schema change → no migration artifacts.
