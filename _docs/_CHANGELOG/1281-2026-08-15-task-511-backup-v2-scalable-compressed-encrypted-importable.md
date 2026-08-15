# 1281 - TASK-511 Backup v2 — Scalable, Compressed, Encrypted, Importable

**Date:** 2026-08-15
**Version:** Unreleased
**Tasks:** TASK-511, TASK-511-01, TASK-511-02, TASK-511-03, TASK-511-04, TASK-511-05, TASK-511-06, TASK-511-07

## Key Changes

### Backups v2
- Streaming export engine + `.cbk` tar archive (manifest.json → tables/<key>.ndjson → settings.json → media/* → users/roles/user_roles.ndjson) with bounded spooling (`backupArchive.ts`), gzip + AES-256-GCM/scrypt envelope (per-frame AAD, final flag, fail-closed decrypt, `backupCrypto.ts`).
- Media file bytes streamed into/out of the archive with per-file ceiling + traversal-guarded keys (`mediaArchive.ts`).
- Opt-in users/RBAC include (encrypted-only, batched chunk 500, admin-lockout guard) (`backupUsersSection.ts`).
- Import pipeline: upload → decrypt → validate → confirm-gated transactional restore (`backupImport.ts` + `POST /backups/import`, size ceilings, no partial writes).
- Scheduler full-backup wiring with `BACKUP_ENCRYPTION_PASSPHRASE` fail-closed + failed-row noise guard; migration `0072_backup_schedule_include` (`backup_schedules.include jsonb`); create-path `.cbk` rewiring; Admin UI (BackupNow/Import dialogs, schedule card with include options — additive).
- Docs/env: `.env.example` Backups section (empty vars), getting-started/security docs, `run-bun-lane.ts` suite registration, DATA_MODEL/CMS_API/SECURITY_SPEC/MEDIA_SPEC sync.

## Validation
- Migration 0072 full artifacts (SQL + snapshot + journal idx 72) verified; `backup_restore_superseded` → 422 per contract; `backup_media_too_large` → 422 mapped.
- Bun suites (archive/crypto/media/users/import/service/scheduler/routes) + Vitest (admin client + backups UI) green; lint + types green.
- Runtime smoke (wf511smoke, 5 scenarios): login, Backups page schedule card, encrypted Create backup (POST 200, .cbk artifact), Import dialog, Update Schedule (PATCH 200); 0 feature-related console errors. Screenshot `_docs/_workflows/_smoke/511-01-backups-dark.png`.
