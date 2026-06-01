# TASK-351-02: Backup Execution, Artifact, Restore, Download, and Delete Contract
# FileName: TASK-351-02_Backup_Execution_Artifact_Restore_Download_and_Delete_Contract.md

**Priority:** High
**Category:** Backups + Runtime + API + Storage + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-351-01
**Status:** To Do

---

## Overview

Turn backup rows into actionable backups or explicitly document an external
worker boundary. The report shows manual backups remain queued with
`artifactPath: null`, `sizeBytes: null`, and disabled restore/download actions.

## Sub-Tasks

- Decide local/dev execution model: synchronous small snapshot, background
  worker, or explicit external queue contract.
- Implement queued -> running -> complete/failed transitions for manual backups
  in the supported local runtime.
- Create artifact files under a safe configured backup directory or storage
  adapter path.
- Make download return a usable URL/stream only for completed backups.
- Make restore either perform a scoped restore with confirmation safeguards or
  remain disabled with explicit unsupported copy.
- Add delete API/UI for backup rows and artifacts, or document why delete stays
  unavailable.
- Log audit events for create/complete/failed/restore/download/delete without
  leaking artifact internals or secrets.

## Files To Change

| File | Required change |
|---|---|
| `core/services/backups/backupService.ts` | Add execution/worker helpers, artifact creation, completion/failure, delete, and restore semantics. |
| `core/services/backups/backupTypes.ts` | Add artifact/worker health/delete result types. |
| `core/server/routes/backupRoutes.ts` | Add delete route, map known errors, and make download/restore status-aware. |
| `core/server/validation/backupSchemas.ts` | Add delete/restore confirmation schemas if needed. |
| `core/admin/services/backupsClient.ts` | Add delete and status-aware download/restore typings. |
| `core/admin/ui/backups/BackupsPage.tsx` | Wire delete, restore, download refresh/error paths. |
| `core/admin/ui/backups/BackupsTable.tsx` | Enable actions only when real and show unavailable reasons. |
| `core/db/migrations/*` | Add migration artifacts if include metadata, error detail, worker metadata, or artifact fields require schema changes. |
| `tests/unit/backups/backupService.test.ts` | Cover lifecycle, artifact, restore/download/delete errors. |
| `tests/integration/routes/backups.test.ts` | Cover route lifecycle and RBAC/validation. |

## Implementation Pseudocode

```ts
async function executeBackup(id: string) {
  await markBackupRunning(id);
  try {
    const artifact = await createBackupArtifact(id, include);
    return markBackupComplete(id, artifact.path, artifact.sizeBytes);
  } catch (error) {
    return markBackupFailed(id, normalizeBackupError(error));
  }
}

async function createBackup(input) {
  const row = await insertQueuedBackup(input);
  if (shouldRunInlineInDev()) {
    void executeBackup(row.id);
  }
  return row;
}

async function downloadBackup(id) {
  const backup = await getBackupById(id);
  if (!backup) throw new Error("backup_not_found");
  if (backup.status !== "complete" || !backup.artifactPath) throw new Error("backup_not_ready");
  return resolveSafeArtifactDownload(backup.artifactPath);
}
```

Data flow:

- Create request inserts a queued row with include metadata.
- Executor reads row, writes artifact, and updates row status.
- UI polls/listens for status changes and enables actions from row state.
- Delete removes only the targeted row/artifact and refreshes the list.

Error handling:

- Artifact paths must be normalized under the configured backup root to prevent
  traversal.
- Failed backups must store a bounded user-safe error code/message.
- Restore must refuse queued/running/failed backups and missing artifacts.
- Delete must handle already-missing artifacts idempotently while preserving DB
  row correctness.

Regression-test shape:

- Create backup and assert status reaches complete or failed deterministically in
  local execution mode.
- Complete backup returns non-null artifact path and size.
- Download for queued backup returns `backup_not_ready`.
- Delete removes row and artifact without deleting unrelated rows.

## Security Contract

- Endpoint visibility: internal admin.
- Auth model: session cookie.
- RBAC: `backups:write` for create/restore/delete; `backups:read` for download.
- CSRF: required for create/restore/delete.
- Rate-limit bucket: `admin_write` for mutations, `admin_read` for download.
- Reject-unknown validation: strict confirmation payloads when destructive.
- Anti-abuse: no public write.
- Secret handling: backup artifacts must not be directly publicly browsable; any
  download URL must be admin-authenticated or short-lived and must not expose
  storage credentials.

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed tests when `.env` exists
- `bun test tests/unit/backups/backupService.test.ts`
- `bun test tests/integration/routes/backups.test.ts`
- Targeted runtime/storage test for artifact path safety
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Backup report and user docs with execution/worker boundary.
- Update `_docs/SECURITY_SPEC.md` if backup artifact access policy changes.

## Acceptance Criteria

- Created backups no longer sit forever in unexplained queued state in the
  supported local/dev path.
- Completed backups have actionable download metadata.
- Restore/delete behavior is real or truthfully unavailable with documented
  product rationale.
