# TASK-563: Backup Import Cache Invalidation And Post-Commit Failure Audit

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1285 (pinned)
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

- `core/services/backups/backupImport.ts:713-742` — validateArchive at `:715`,
  outer `db.transaction` at `:718`, commit + media + return with no
  `clearSiteCache`; legacy `core/services/backups/backupService.ts:572-581`
  calls `clearSiteCache()` after the transaction (only when settings present).
- `backupImport.ts:725-732` media runs after DB commit; `mediaArchive.ts:293-327`
  partial object writes with raw `console.error` at `:321`.
- `core/server/routes/backupRoutes.ts:303-320` — `logAudit` only on success.
- TASK-511-03 `:506-510` explicitly allows best-effort media / broken-image
  degradation and forbids object-storage rollback (keep).

## Scope

- Call `clearSiteCache()` after the authoritative DB commit, BEFORE the later
  best-effort media phase. Condition: clear when the archive includes database
  or settings content; a media/users-only archive with no content/settings
  change does not need the clear (mirror the legacy condition). Note
  `clearSiteCache` is the process-local LRU (`core/site/cache/siteCache.ts:199-201`)
  — single-replica semantics only.
- Write a REDACTED failure audit/recovery receipt when the post-commit media
  phase fails. Reuse the existing `logAudit` (`auditService.ts:199`) with
  `sanitizeAuditMetadata` (`core/services/audit/auditRedaction.ts`) — do NOT
  invent a new `logRedactedRestoreFailure` helper. Pin action
  `backup.mediaRestoreFailure`, targetType `backup`, targetId = the import run
  id (see below), severity `error`, message = fixed code only.
- **Run id source (pinned):** `importBackupFromUpload` creates no stored backup
  row, so there is no DB run id. Reuse the documented synthetic convention:
  `backupRoutes.ts:307-309` uses `targetId: "import"` for upload-restore audit
  rows. Use `targetId: "import"` for the media-failure receipt (consistent with
  the existing upload-restore audit identity), OR the spool-dir UUID
  (`backupImport.ts:699` `coderso-import-<randomUUID>`) if a run-scoped
  identity is preferred. Pick ONE and record it in the receipt; TASK-564's
  `opts.runId` must use the same source.
- Sanitize the storage error log at `mediaArchive.ts:321` (fixed code, no raw
  error object).
- Pin rethrow-vs-swallow semantics: the accepted best-effort degradation
  SHALL swallow the media failure after the DB commit (status quo RETHROWS →
  500 via `backupRoutes.ts:208-209`; the import already returned
  success for the content); the pseudocode below introduces the try/catch that
  performs the swallow, records the redacted audit receipt, and updates
  `mediaRestored`/`skippedMedia` counts (`backupImport.ts:741` currently
  hardcodes `skippedMedia: 0`) so the receipt reflects the true partial state.
  Note: this moves the surfacing from an HTTP 500 to the redacted
  `backup.mediaRestoreFailure` receipt + partial counts, which supersedes the
  TASK-511-03 `:506-509` "surface backup_media_write_failed so the operator can
  re-run" clause for the upload-import flow (the only production caller of
  `restoreMediaFromArchive` is `backupImport.ts:729`).
  The DB-side failure path (`backup_media_write_failed` → 500) is unchanged for
  callers that treat media failure as fatal (in the import path media always
  runs post-commit, so there is no pre-commit media phase).
- Add injection seams for `clearSiteCache` and the failure logger (mirror the
  existing `mediaAdapter` seam at `backupImport.ts:104`) OR document the bun
  module-mock strategy; the validation test must not rely on ambient modules.
- Add a regression with pre-filled cache and an Nth-object media failure test.

## Fix Strategy

```ts
// after commit, before media best-effort phase
if (includesContentOrSettings) await clearSiteCache(); // authoritative DB state now visible
const { restored, skipped } = { restored: 0, skipped: 0 };
try {
  ({ restored, skipped } = await restoreMediaFromArchive(...));
} catch (error) {
  // best-effort degradation: swallow, record redacted receipt, update counts
  await logAudit({
    action: "backup.mediaRestoreFailure",
    targetType: "backup",
    targetId: runId, // "import" convention (backupRoutes.ts:309) or spool-dir UUID (backupImport.ts:699); TASK-564 uses the same source
    severity: "error",
    metadata: sanitizeAuditMetadata({ code: "media_restore_partial", restored, skipped }),
  });
}
return { ...result, mediaRestored: restored, skippedMedia: skipped };
```

## Security Contract

- Endpoint unchanged (`internal` admin; the route uses RBAC `backups:write`
  per `backupRoutes.ts:278` — there is no `backups:restore` permission).
- Audit/failure log must be redacted (no storage credentials, keys, raw error
  objects) via `sanitizeAuditMetadata`.
- Cache invalidation runs only after commit; no invalidation on rollback.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Bun lane test (DB-backed) for the Nth-object media failure (fake storage
  throwing at object N, injected via the seam) asserting a redacted
  `backup.mediaRestoreFailure` audit row + no raw error in logs + correct
  `mediaRestored`/`skippedMedia` counts. The test is DB-backed because
  `importBackupFromUpload` imports `db` directly; use `testIfDb` + unique
  fixtures like the existing `backupImport.test.ts` suite.
- DB cache regression when `DATABASE_URL` available (pre-filled site cache,
  import, assert cache cleared).

## Notes

- Does not change the accepted object-storage degradation contract.
