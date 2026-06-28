# TASK-484-04: Restore Implementation
# FileName: TASK-484-04-Restore-Implementation.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `restore`
**Estimated Effort:** Large
**Dependencies:** TASK-484-05 is **not** required (restore reads whatever
`artifactPath` points at — local file or remote URL — and works for both), but if
05 lands first, restore exercises the remote-read path too. Reuses
`importConfig` (`core/services/tools/importExportService.ts`) for the settings
portion of the artifact.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

`restoreBackup()` (`backupService.ts` 366-373) currently validates the row and
then unconditionally `throw new Error("backup_restore_unsupported")`. This
subtask implements a real, **transactional, confirmation-gated** restore from the
`version: 1` JSON artifact produced by `createBackupArtifact`
(`{ version, id, createdAt, include, storageDriver, database, settings, media }`).

Restore restores **CMS metadata + settings**, not media file bytes (the artifact
only stores media library rows + URLs — see the note at `backupService.ts`
256-260). That property is enforced and documented, not silently implied.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-04-L01 | `TASK-484-04-L01-Restore-From-Artifact.md` | `restoreBackup` transactional restore + artifact parse | ⏳ To Do |
| 484-04-L02 | `TASK-484-04-L02-Restore-Route-Hardening-And-Tests.md` | Restore route confirm-gate + security tests | ⏳ To Do |

**Implementation order:** L01 (read artifact + strict-parse + transactional
restore + new domain codes) → L02 (route `confirm` body + RBAC/CSRF + Bun
route/security tests).

---

## Dependencies

- TASK-484-01 (`artifact_key` for remote reads via TASK-484-05; optional).
- `importConfig` / `previewImport` (`importExportService.ts` 380-470) for the
  settings bundle.
- `resolveBackupDownload` (`backupService.ts` 375-397) as the read seam for
  local-vs-remote artifact content.

---

## Testing Requirements

Bun lane (DB transaction + route). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — round-trip: create artifact → wipe rows →
  restore → tables match; `confirm` required; rejects missing/garbage/`version≠1`
  artifact; not-ready / not-found mapped; transaction rolls back on mid-restore
  failure (no partial state).
- `bun test tests/integration/routes/backups.test.ts` — `POST /backups/:id/restore`
  requires `backups:write`, requires `confirm: true`, rejects unknown body fields,
  audit-logged; `backup_restore_unsupported` no longer emitted.
