# TASK-561: Backup Import Native CMS Writer Fence Enforcement

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1283 (pinned)
**Priority:** High
**Size:** Medium

# FileName: TASK-561_Backup_Import_Native_CMS_Writer_Fence_Enforcement.md

**Parent Task:** none
**Source Findings:** H-547-01, H-511-02 (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

## Purpose

`importBackupFromUpload()` never takes the native CMS writer fence, so a
destructive backup restore can interleave with an active full-site holder
(TASK-547) and with concurrent admin writers. Maintenance mode only blocks the
public surface; it does not serialize writers behind the admin API. This breaks
the TASK-547 integrity contract (an active full-site holder must make an
ordinary import/backup writer return `busy` before any protected work) and the
repo rule requiring one explicit concurrency strategy with no silent lost
writes.

## Evidence

- `core/server/routes/backupRoutes.ts:278-302` — restore route authorizes after
  only a maintenance check; its own comment `:278-286` admits `/admin/api/*`
  stays available.
- `core/server/httpServer.ts:561-570` — admin API is dispatched before
  `handlePublicRequest()` (503 is public-surface only).
- `core/services/backups/backupImport.ts:717-723` — outer transaction opens
  without `acquireNativeCmsWriterFence(tx)`; `:543-549` runs destructive
  delete-replace inside it.
- `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts:193` — importer is
  classified `managed-shared`, but `:349` (`fenceOwners`) lists only
  `backupService.restoreBackup`, and the owner-assertion loop `:400-419` never
  checks `importBackupFromUpload`.
- TASK-547 contract: `TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md:316-318`.

## Scope

- Add `acquireNativeCmsWriterFence(tx)` as the **first statement** of the import
  outer-transaction callback (`importBackupFromUpload`), before any
  delete/insert/restore work.
- Add `importBackupFromUpload` to `fenceOwners` in the inventory and to the
  owner-assertion loop (the test must iterate all `managed-shared` importers).
- DB/race regression: active full-site holder vs import returns `busy` with
  zero protected writes from the import path.
- Verify the lock is the shared fence consistent with the rest of the writers
  (`core/db/nativeCmsWriterFence.ts:100-108`); on contention map to the
  EXISTING machine-readable code `native_cms_writer_fence_busy` (the code the
  fence already throws, `core/db/nativeCmsWriterFence.ts:108`; TASK-547's busy
  contract uses the same) — do NOT invent a new `restore_busy` code. Add a
  `mapBackupError` case for `native_cms_writer_fence_busy` → **409** (the
  `backup_not_ready → 409` precedent in `backupRoutes.ts:103-104`; a single
  status, not 409/503) without
  raw driver details.

## Fix Strategy

```ts
// core/services/backups/backupImport.ts
export async function importBackupFromUpload(input: ImportBackupInput) {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx); // FIRST, before any restore work
    const tarPath = ...;
    await restoreArchiveStreamTx(tx, tarPath, manifest, {...});
    ...
  });
}
```

- In `backupRoutes.ts`, map the fence error through `mapBackupError` to
  `native_cms_writer_fence_busy` (409), consistent with the TASK-547
  full-site `busy` contract (no new error code).
- Add a DB regression with a barrier: holder acquires the fence, import
  concurrently attempts, assert `busy` and zero `INSERT`/`DELETE` from import.

## Security Contract

- Endpoint: `internal` admin (**`/admin/api/backups/import`** — the fence
  change lands on the upload-import route `backupRoutes.ts:278`; the
  restore-by-id route `:260` already fences via `restoreBackup` at
  `backupService.ts:576`); the route uses
  RBAC `backups:write` (`backupRoutes.ts:260,278`) — there is no
  `backups:restore` permission in the repo, correct the reference.
- Fence enforcement is backend-only; no CSRF/rate-limit change.
- No new payload fields; reject-unknown unchanged.
- The `busy` error must be sanitized (fixed code, no driver message/bind
  values).

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- `bun test tests/unit/kits/nativeCmsWriterFenceInventory.test.ts` (extended
  with the importer) + DB race test when `DATABASE_URL` is available (load env
  with `set -a && source .env && set +a`).
- Route registration + `map*Error` coverage for the new
  `native_cms_writer_fence_busy` mapping in the backup route suite.
- Confirm legacy `restoreBackup` still passes (non-destructive backward
  compatibility).

## Notes

- H-511-02 and H-547-01 share one root cause; this task closes both.
- After landing, update `_docs/ARCHITECTURE.md` fence-ownership description if
  needed and add a changelog entry.
