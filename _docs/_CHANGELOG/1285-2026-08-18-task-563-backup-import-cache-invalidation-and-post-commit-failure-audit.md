# 1285 - TASK-563 Backup Import Cache Invalidation And Post Commit Failure Audit

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-563

## Key Changes

### Backups
- After the authoritative import transaction commits and before the
  best-effort media phase, `clearSiteCache()` runs so the DB state is
  immediately visible (old slug/new slug/delete invalidation covered).
- The post-commit media catch now rethrows any error that is NOT a
  `MediaRestoreFailure` (post-audit fix): `backup_media_key_unsafe` and
  `backup_media_too_large` surface their 422 mappings instead of being
  swallowed into a generic 200 receipt.
- On genuine media best-effort failure the importer records a redacted
  `backup.mediaRestoreFailure` audit row with sanitized metadata
  (`code: media_restore_partial`, restored/skipped counts) and correct
  `mediaRestored`/`skippedMedia` counts; no raw error payloads reach logs.
- Regression tests: Nth-object media failure via the injected storage seam
  (redacted audit row + counts + no raw error), plus the non-media-failure
  rethrow path and a DB cache-cleared regression when `DATABASE_URL`
  available.

## Validation
- `bun --cwd core lint` + `lint:types` green;
  `bun test tests/unit/backups/backupImportCache.test.ts` extended green;
  DB-backed media-failure test (testIfDb + unique fixtures) green.
- Runtime smoke (`wf568smoke`): after import replaces content, public front
  serves 404 for a removed page (no stale cached HTML); screenshots in
  `_docs/_workflows/_smoke/evidence/task-568/wf568smoke/`.
