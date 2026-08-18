# 1283 - TASK-561 Backup Import Native CMS Writer Fence Enforcement

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-561

## Key Changes

### Backups
- `importBackupFromUpload` now acquires the native CMS writer fence as the
  FIRST step of the restore transaction (`acquireNativeCmsWriterFence(tx)` in
  `backupImport.ts`), before any tar/restore work, matching the TASK-547
  full-site ownership contract.
- `backupRoutes.ts` maps the fence conflict through `mapBackupError` to
  `native_cms_writer_fence_busy` (409) — no new error code; consistent with
  the existing full-site `busy` mapping.
- Route registration + `map*Error` coverage added for the new mapping in the
  backup route suite.
- Legacy `restoreBackup` path stays green (non-destructive backward
  compatibility).

## Validation
- `bun --cwd core lint` + `lint:types` green; extended
  `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts` with the importer;
  DB race test (holder acquires fence, import returns 409, no partial
  restore) when `DATABASE_URL` available.
- Runtime smoke (`wf568smoke`): Import dialog without maintenance mode is
  rejected fail-closed (409, "Enable maintenance mode before importing"), and
  a valid `.cbk` imports fully with maintenance on ("Import complete: 22
  tables, 0 rows."); screenshots in
  `_docs/_workflows/_smoke/evidence/task-568/wf568smoke/`.
