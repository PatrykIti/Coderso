# 1286 - TASK-564 Backup Users Section Bounded Memory Restore

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-564

## Key Changes

### Backups
- Replaced the full in-memory materialization of the archived users/RBAC section
  during backup import with a bounded staging-table batch upsert
  (`restoreUsersSectionTx` in `backupUsersSection.ts`): NDJSON lines stream in
  ~5k-row batches into `backup_users_staging`, then the natural-key collision
  guard, FK-missing roleId guard, user_roles reconcile, STAGING→FINAL upsert and
  the unchanged admin-lockout guard run as set-based SQL against the staging
  table inside the same outer transaction (M-511-04).
- Migration `0078_backup_users_staging` adds `backup_users_staging` with
  run-scoped `runId` + `kind` discriminator (`role`/`user`/`user_role`) and
  partial unique indexes per kind; idempotent per-run cleanup on success,
  rollback and retry.
- `backupImport.ts` pre-restore path streams lines into the staging helper
  instead of `collectLines()`; content/media paths untouched.
- No full-array materialization: only batch counts accumulate in memory, with
  OOM-guard tests asserting the bounded batch budget.

## Validation
- `bun --cwd core lint` + `lint:types` green; 34 backup tests + 101
  migration-chain tests green; DB restore test with large users section and
  staging cleanup assertions.
- Migration 0078 full artifacts (SQL + `0078_snapshot.json` + journal) landed
  atomically with the schema module.
- Runtime smoke (`wf569smoke` session): Backups page renders worker/storage
  state, Import dialog opens with file+passphrase gating (Import disabled until
  both present), maintenance-mode guard surfaces fail-closed
  ("Backups unavailable: Enable maintenance mode before importing"); screenshots
  in `_docs/_workflows/_smoke/task564-backup-import-guard.png`.
