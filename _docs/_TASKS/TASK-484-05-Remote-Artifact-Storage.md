# TASK-484-05: Remote Artifact Storage
# FileName: TASK-484-05-Remote-Artifact-Storage.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `storage`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (needs `backups.artifact_key`). Reuses the media
storage adapters (`core/services/media/storage/*`) and
`getStorageSettingsInternal()` — no new storage driver is written.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

`createBackupArtifact` (`backupService.ts` 239-269) **always** `writeFile`s the
artifact to the local FS, even when `storageDriver` is `s3` / `azure` (the row's
`storageDriver` is set from `getStorageSettings().driver` at create time,
`backupService.ts` 293-302). This subtask makes artifact persistence honour the
driver: `local` keeps the filesystem path; `s3` / `azure` upload via the existing
media storage adapter and store the **public URL** (in `artifact_path`) + the
**storage key** (in `artifact_key`, from TASK-484-01).

`resolveBackupDownload` already returns the URL for public artifacts
(`backupService.ts` 381-383); `deleteBackup` (399-411) is extended to delete the
remote object via the adapter when `artifact_key` is set.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-05-L01 | `TASK-484-05-L01-Remote-Artifact-Upload.md` | Driver-aware artifact write + remote delete | ⏳ To Do |
| 484-05-L02 | `TASK-484-05-L02-Remote-Storage-Tests.md` | Remote-storage routing + redaction tests | ⏳ To Do |

**Implementation order:** L01 (driver branch in `createBackupArtifact` +
`deleteBackup` remote cleanup) → L02 (Bun tests with an injected fake adapter).

---

## Dependencies

- TASK-484-01 (`artifact_key`), `getMediaStorageAdapter()`
  (`core/services/media/storage/index.ts`), `MediaStorageAdapter` /
  `UploadFile` (`adapter.ts`).

---

## Testing Requirements

Bun lane (service + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — with an injected adapter: `local` writes FS +
  null `artifact_key`; `s3`/`azure` call `adapter.put` once, store public URL in
  `artifact_path` + key in `artifact_key`; `mapBackup` still redacts
  `artifactPath` for non-URL values and passes URLs through; `deleteBackup`
  calls `adapter.delete(key)` for remote rows and `rm` for local rows; adapter
  failure surfaces a sanitized error (no credentials leaked).
