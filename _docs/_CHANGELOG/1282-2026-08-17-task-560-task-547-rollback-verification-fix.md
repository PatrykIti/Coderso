# 1282 - TASK-560 — task-547 rollback verification fix (page lifecycle snapshot restore)

**Date:** 2026-08-17
**Version:** Unreleased
**Tasks:** TASK-560, TASK-547

## Key Changes

### Current resource resolver page reads
- `readNativeDesired` for `kind === "page"` now reads the full
  `PageLifecycleNativeSnapshot` via the new read-only
  `readPageLifecycleNativeSnapshot(id)` reader (`pageService.ts`) and projects it
  from the template, instead of a 4-field `PAGE_PLANNER_EQUALITY_SELECTION` read
  that produced null `authorId`/`revisions`/`currentData`/`publishedAt`/
  `publishedData` and caused `task_547_resource_restore_mismatch` during rollback
  verification on `/kontakt`.
- `readPageLifecycleNativeSnapshot` is a pure reader without the native CMS
  writer fence (`db.transaction(tx => readPageLifecycleTx(tx, id, false))`),
  matching the ledger `beforeSnapshot.desired` shape (8 fields) so verification
  compares like with like.

## Validation
- `bun --cwd core lint` + `bun --cwd core lint:types` green; full precommit
  (`lint`, `lint:types`, `store lint`, SDK + root `tsc`) green on commit.
- Lifecycle suites `fullSiteLifecycleAdapters.test.ts` and
  `fullSiteLifecycleUpdates.test.ts` green (`--timeout=60000`).
- `fullSiteInstallDbLedgerLifecycle.test.ts` passes with
  `bun test --timeout=30000` (the "persists an exact apply source" case is a
  pre-existing ~6.2s full rollback test, slow but not broken; green on clean
  HEAD too).
- Runtime smoke `task-547` fast profile, session `wf560-547-r13`: **18/18
  scenarios PASS**, cleanup PASS, 0 feature console errors. Evidence:
  `_docs/_workflows/_smoke/task-547/screenshots/fast-wf560-547-r13-*.png`
  (18 screenshots).
