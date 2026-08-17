# TASK-563: Backup Import Cache Invalidation And Post-Commit Failure Audit

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Medium

# FileName: TASK-563_Backup_Import_Cache_Invalidation_And_Post_Commit_Failure_Audit.md

**Parent Task:** none
**Source Findings:** M-511-03, M-511-03b (audit `_TMP-audit-task-511-backups.md`, verified at HEAD `4e3dab15`)

## Purpose

`importBackupFromUpload()` commits restored content/settings but never calls
`clearSiteCache()`, so public HTML can present pre-import state through TTL.
Also, a post-commit media phase failure writes no audit record and logs a raw
storage error. The owner-approved best-effort media degradation is kept, but the
failure must be recorded redacted and testable.

## Evidence

- `core/services/backups/backupImport.ts:715-742` — commit + media + return with
  no `clearSiteCache`; legacy `core/services/backups/backupService.ts:572-581`
  calls `clearSiteCache()` after the transaction.
- `backupImport.ts:725-732` media runs after DB commit; `mediaArchive.ts:293-327`
  partial object writes with raw `console.error` at `:321`.
- `core/server/routes/backupRoutes.ts:303-320` — `logAudit` only on success.
- TASK-511-03 `:506-510` explicitly allows best-effort media / broken-image
  degradation and forbids object-storage rollback (keep).

## Scope

- Call `clearSiteCache()` after the authoritative DB commit (independent of the
  later best-effort media phase).
- Write a redacted failure audit/recovery receipt when the post-commit media
  phase fails; sanitize the storage error at `mediaArchive.ts:321`.
- Add a regression with pre-filled cache and an Nth-object media failure test.

## Fix Strategy

```ts
// after commit, before media best-effort phase
await clearSiteCache(); // authoritative DB state now visible
try {
  await restoreMediaFromArchive(...);
} catch (error) {
  await logRedactedRestoreFailure({ stage: "media", code: "media_restore_partial", ... });
}
```

## Security Contract

- Endpoint unchanged (`internal` admin, `backups:restore`).
- Audit/failure log must be redacted (no storage credentials, keys, raw error
  objects).
- Cache invalidation runs only after commit; no invalidation on rollback.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Unit test for the Nth-object media failure (fake storage throwing at object N)
  asserting redacted audit + no raw error in logs.
- DB cache regression when `DATABASE_URL` available.

## Notes

- Does not change the accepted object-storage degradation contract.
