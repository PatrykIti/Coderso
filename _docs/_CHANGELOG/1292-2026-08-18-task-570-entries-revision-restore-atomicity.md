# 1292 - TASK-570 Entries Revision Restore Atomicity And Bounded History

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-570, TASK-570-01

## Key Changes

### Entries
- `restoreEntryRevision` is now ONE fenced transaction: fence + `FOR UPDATE` on
  the entry, narrow revision read by `revisionId`, target snapshot
  re-validation, and the pre-restore snapshot written inside the same tx — an
  interleaved editor write can never be lost and a validation failure rolls back
  completely (H-487-01). Null-actor restore succeeds with NO new revision row;
  no-op restore short-circuits with no write and no cache invalidation.
- Revision history endpoint switched to a keyset-cursor bounded read
  (`listEntryRevisions`, `(version DESC, id DESC)` composite cursor, default
  page 50 / max 200, selects NO `data` payload columns) with a narrow
  `getEntryRevisionData(revisionId)` detail read scoped by `entryId`
  (M-487-02).
- Migration `0076_content_revisions_version_uniq` adds the unique
  `(entryId, version)` constraint; concurrency-safe allocation keeps
  `onConflictDoNothing` + bounded retry (N3).
- Admin migration: `entriesClient.ts` revision shape drops `data`,
  `useEntryRevisions` fetches the drawer preview on demand, and
  `EntryRevisionDrawer` renders via the detail read; `entry_revision_not_found`
  → 404 and `revision_conflict` → 409 mapped at the route boundary.

### Entry Service Test Modularity (TASK-570-01)
- Split the 2084-line `tests/unit/content/entryService.test.ts` into 5 focused
  suites + a shared support module (`support/entryServiceTestSupport.ts`) by
  responsibility (source audit, CRUD, visibility, metadata writes, concurrency).
  Pure relocation: 29/29 test names preserved, all files < 1000 lines.

## Validation
- `bun --cwd core lint` + `lint:types` green; content unit lane A/B-isolated 141
  tests green (pre-existing `detailPageRuntimeResolver.test.ts` vi.mock leak
  documented in the contract, isolated by process-separated runs); vitest
  entries client/cursor suites green.
- Runtime smoke (`wf569smoke`): created + published a Products entry, edited and
  updated it, opened History — drawer lists "Version 1", Preview renders the
  narrow snapshot ("Snapshot with 0 fields"), Restore confirm dialog executes a
  no-op restore without errors (data identical, expected); screenshots
  `_docs/_workflows/_smoke/task570-entry-revisions-drawer.png`.
