# 1222 - TASK-484 Backups: Scheduler, Retention, Restore & Remote Storage

**Date:** 2026-07-05
**Version:** Unreleased
**Tasks:** TASK-484 (closure leaf TASK-484-06-L02)
**Type:** Backups/Scheduler/Data Model/API/Security/Media/Testing/Docs/Task Board

## Overview

Backups previously looked complete in the admin UI but were non-functional past
a manual one-off: the schedule never ran, retention never pruned, restore was a
hard stub (`throw "backup_restore_unsupported"`), artifacts were always written
to local FS regardless of `storageDriver`, and there was no storage-usage
signal. TASK-484 makes the feature real — an in-process scheduler that runs due
backups and advances `next_run_at`, retention pruning, a transactional
confirmation-gated restore, remote (s3/azure) artifact storage, and a usage /
quota source.

## Changes

### Data model (migration `0065`)

- `backup_schedules`: new `next_run_at` + `last_run_at` timestamps (+
  `next_run_at` index); `backups`: new `artifact_key` (server-internal remote
  object key). Full Drizzle artifacts (`0065_backup_run_metadata.sql` +
  `meta/0065_snapshot.json` + `_journal.json` idx 65, gapless after TASK-483's
  `0064` analytics tables).

### Scheduler & schedule metadata (01, 02)

- Pure `computeNextRunAt(frequency, from)` calculator + `markScheduleRun()`
  helper (persists `last_run_at` + recomputed `next_run_at`).
- In-process `core/server/jobs/backupScheduler.ts` started from
  `startHttpServer()` (`core/server/httpServer.ts`) so it runs in dev and prod
  alike (not `dockerStart.ts`, which would be dead in dev). Opt-in outside
  production via `BACKUP_SCHEDULER_ENABLED`; single-flight via an in-process flag
  + a Postgres advisory lock (`BACKUP_SCHEDULER_LOCK_NAMESPACE=20260628`,
  `KEY=484`). Runs as a **system actor** — no request/CSRF; audit rows use
  `actorId: null`, `metadata.source: "scheduler"`. Deterministic
  `runDueScheduledBackups(now)` seam for tests.

### Retention (03)

- `pruneExpiredBackups(retentionDays)` deletes expired terminal backups (reusing
  per-row artifact cleanup, local + remote), invoked after each scheduled run and
  via internal `POST /backups/prune` (`backups:write` + CSRF; server-owned
  window from the schedule singleton, never client-supplied).

### Restore (04)

- Real, **destructive**, confirmation-gated `restoreBackup(id, { confirm })`:
  strict-parses the `version: 1` JSON artifact fail-closed (reject unknown
  top-level keys, version check) **before** any write, then restores metadata +
  settings in a single outer `db.transaction` (snapshot tables + settings share
  one `tx` via `importConfigTx`) — all-or-nothing. `confirm === true` is required
  at both the route (strict schema, `enum: [true]`) and the service. Removed the
  `backup_restore_unsupported` stub; the code stays mapped to `409` for
  back-compat but is no longer emitted. Restore restores metadata + settings,
  **not** media file bytes.

### Remote artifact storage (05)

- `createBackupArtifact` branches on `storageDriver`: `local` writes under
  `BACKUP_DIR`/`storage/backups`; `s3`/`azure` upload via the reused media
  storage adapters (`getMediaStorageAdapter()`), storing the public URL as
  `artifactPath` and the object key as server-internal `artifactKey`.
  `deleteBackup` removes remote objects (with a driver-drift guard). Upload
  failures are wrapped to the machine-readable `backup_upload_failed` — raw
  adapter/credential text is never persisted to client-visible fields.

### Usage / quota (06)

- `getBackupStorageUsage()` + `GET /backups/usage` (`backups:read`): total bytes,
  backup count, per-status and per-driver breakdown, active driver label, plus an
  optional server-owned quota (`BACKUP_MAX_TOTAL_BYTES`) with a pure `overQuota`
  signal (never blocks new backups). No artifact paths, keys, credentials, or PII
  in the payload.

### Docs

- `_docs/DATA_MODEL.md` — new standalone Backups section (`backups`,
  `backup_schedules`, scheduler/retention lifecycle) + indexes.
- `_docs/CMS_API.md` — Backups (v1): restore now supported (`{ confirm: true }`),
  new `POST /backups/prune` + `GET /backups/usage`, remote public-URL
  `artifactPath`, error-code table refresh; removed the stale
  "restore unsupported" caveat.
- `_docs/SECURITY_SPEC.md` — new Backups (v1) section: system-actor scheduler
  (no CSRF, `actorId:null`), restore confirmation + fail-closed artifact gate,
  backend-only storage secrets, `artifact_key` redaction, non-LLM-executable.
- `_docs/MEDIA_SPEC.md` — backup artifacts reuse the media storage drivers for
  s3/azure (URL + key) and still do not archive media file bytes.

## Validation

Gate matrix (env loaded from `.env`, shared remote render.com Postgres):

- `bun --cwd core lint` — pass
- `bun --cwd core lint:types` — pass
- `bun test tests/unit/backups` — 30 pass / 0 fail
- `bun test tests/integration/routes/backups.test.ts` — 14 pass / 0 fail
- `bun test tests/integration/runtime/backupScheduler.test.ts` — 7 pass / 0 fail
- `bun test tests/security/codersoSecurityGate.test.ts` — 4 pass / 0 fail
- Vitest `tests/vitest/backups/computeNextRunAt.test.ts` — 8 pass / 0 fail
- Migration `0065` artifacts present; journal gapless through idx 65.
- Grep gate: `_docs/CMS_API.md` no longer claims restore is unsupported (only a
  back-compat legacy-code note); `restoreBackup` no longer throws
  `backup_restore_unsupported`.

DB-backed lanes ran against the shared remote DB using uniquely-scoped fixtures,
delta assertions, schedule snapshot/restore, and per-id cleanup; no destructive
restore was executed over shared tables and no enabled schedule / held advisory
lock was left behind.

## Security

- All backup routes remain `internal` (`/admin/api/*`); reads `backups:read`,
  writes `backups:write` + `enforceCsrf` + `admin_write` bucket. No new
  permission.
- Scheduler is a non-request system actor (no CSRF), env-gated and single-flight.
- Restore is confirmation-gated and fail-closed (strict artifact validation
  before any write, single transaction).
- Storage credentials stay backend-only (`getStorageSettingsInternal()` /
  reused media adapters); artifacts never contain credentials; `artifact_key` is
  server-internal (redacted to `null` for clients); upload failures wrapped to
  `backup_upload_failed`; no route/RBAC regression.
