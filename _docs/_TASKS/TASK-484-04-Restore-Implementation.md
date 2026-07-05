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
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
| 484-04-L01 | `TASK-484-04-L01-Restore-From-Artifact.md` | `restoreBackup` transactional restore + artifact parse | ✅ Done |
| 484-04-L02 | `TASK-484-04-L02-Restore-Route-Hardening-And-Tests.md` | Restore route confirm-gate + security tests | ✅ Done |

**Implementation order:** L01 (read artifact + strict-parse + transactional
restore + new domain codes) → L02 (route `confirm` body + RBAC/CSRF + Bun
route/security tests).

---

## Dependencies

- TASK-484-01 (`artifact_key` for remote reads via TASK-484-05; optional).
- `importConfig` / `previewImport` (`importExportService.ts`: `previewImport`
  380-393, `importConfig` 395-652 — the file's last function; its own
  `db.transaction` opens at :401) for the settings bundle.
- `resolveBackupDownload` (`backupService.ts` 375-397) as the read seam for
  local-vs-remote artifact content.

---

## Testing Requirements

Bun lane (DB transaction + route). Load env: `set -a && source .env && set +a`.

> **Shared-DB pin (mandatory):** the Bun suites run against the ONE shared
> remote Postgres (`DATABASE_URL` in `.env`), used concurrently by TASK-482,
> TASK-483 and the owner. Restore tests must **NEVER** restore over the shared
> DB destructively: no wiping/clearing/truncating of shared tables, no
> committed whole-table `replaceSnapshotTables` run. Round-trip coverage uses a
> scoped dry-run seam (exercise the tx-scoped restore inside a deliberately
> **rolled-back** transaction) and/or fixture-scoped targets: assert only on
> uniquely-scoped rows the test itself created, cleaned up per-row like the
> existing `createdIds` pattern in `tests/unit/backups/backupService.test.ts`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — round-trip via the rollback-scoped seam /
  fixture-scoped targets above (never a committed wipe of shared tables);
  `confirm` required; rejects missing/garbage/`version≠1`
  artifact; not-ready / not-found mapped; transaction rolls back on mid-restore
  failure (no partial state).
- `bun test tests/integration/routes/backups.test.ts` — `POST /backups/:id/restore`
  requires `backups:write`, requires `confirm: true`, rejects unknown body fields,
  audit-logged; `backup_restore_unsupported` no longer emitted **by the service**
  (the `mapBackupError` branch is kept mapped for back-compat per L01, so the
  existing assertion at `backups.test.ts` :148-151 stays valid and the suite
  edit stays additive). Uses the existing
  `makeRouter` stub-router pattern (injected `requirePermission`/`validate` deps)
  with `restoreBackup` stubbed/short-circuited — the route suite never performs a
  real destructive restore against the shared DB.
