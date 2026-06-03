# TASK-351-02: Backup Execution, Artifact, Restore, Download, and Delete Contract
# FileName: TASK-351-02_Backup_Execution_Artifact_Restore_Download_and_Delete_Contract.md

**Priority:** High
**Category:** Backups + Runtime + API + Storage + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-351-01
**Status:** Done (2026-06-01)

---

## Overview

Turn backup rows into actionable backups or explicitly document an external
worker boundary. The report shows manual backups remain queued with
`artifactPath: null`, `sizeBytes: null`, and disabled restore/download actions.
Current architecture documents v1 backups as metadata-only, so this leaf must
either preserve that boundary truthfully or update architecture/API/security
docs before adding artifact execution.

## Sub-Tasks

- Decide and document the execution model: keep v1 as external-worker
  metadata-only, or change architecture/API docs to support synchronous small
  snapshot/background worker execution.
- If architecture changes, implement queued -> running -> complete/failed
  transitions for manual backups in the supported local runtime.
- If architecture changes, create artifact files under a safe configured backup
  directory or storage adapter path.
- If v1 remains metadata-only, make queue/worker state explicit and keep
  download/restore disabled with tested reasons.
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
| `core/server/routes/backupRoutes.ts` | Add delete route if supported, centralize `mapBackupError`, and make download/restore status-aware. |
| `core/server/validation/backupSchemas.ts` | Add delete/restore confirmation schemas if needed. |
| `core/admin/services/backupsClient.ts` | Add delete and status-aware download/restore typings. |
| `core/admin/ui/backups/BackupsPage.tsx` | Wire delete, restore, download refresh/error paths. |
| `core/admin/ui/backups/BackupsTable.tsx` | Enable actions only when real and show unavailable reasons. |
| `core/db/migrations/*` | Add migration artifacts if include metadata, error detail, worker metadata, or artifact fields require schema changes. |
| `tests/unit/backups/backupService.test.ts` | Cover lifecycle, artifact, restore/download/delete errors. |
| `tests/integration/routes/backups.test.ts` | Cover route lifecycle and RBAC/validation. |
| `_docs/ARCHITECTURE.md` | Update only if artifact execution/restore/delete moves beyond the current v1 metadata-only contract. |
| `_docs/CMS_API.md` | Update backup create/include, delete/download/restore, worker-boundary, and error-code contracts. |
| `_docs/SECURITY_SPEC.md` | Update artifact access and secret-handling policy if artifacts become downloadable. |

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
  if (backupExecutionMode() === "external-worker") {
    return { ...row, worker: { mode: "external", message: "Waiting for backup worker." } };
  }
  if (backupExecutionMode() === "inline-dev") {
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
- In metadata-only mode, the row stays queued/external-worker with explicit
  worker-state messaging.
- In artifact-execution mode, executor reads row, writes artifact, and updates
  row status.
- UI polls/listens for status changes and enables actions from row state.
- Delete removes only the targeted row/artifact and refreshes the list.

Error handling:

- Artifact paths must be normalized under the configured backup root to prevent
  traversal.
- Failed backups must store a bounded user-safe error code/message.
- Restore must refuse queued/running/failed backups and missing artifacts.
- Download/restore route errors must map through `mapBackupError` to
  machine-readable `backup_not_found`, `backup_not_ready`, and
  `backup_artifact_invalid` responses.
- Delete must handle already-missing artifacts idempotently while preserving DB
  row correctness.

Regression-test shape:

- In metadata-only mode, create backup and assert external-worker/queued state
  plus disabled-action reasons.
- In artifact-execution mode, create backup and assert status reaches complete
  or failed deterministically.
- Completed backup returns non-null artifact path and size.
- Download for queued backup returns `backup_not_ready`.
- Route tests cover registration plus `mapBackupError` for not-found/not-ready.
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
- Update `_docs/ARCHITECTURE.md` before claiming local/dev artifact execution.
- Update `_docs/CMS_API.md` for status, worker, delete, download, restore, and
  error-code contracts.

## Acceptance Criteria

- Created backups no longer sit forever in unexplained queued state: they either
  expose an external-worker boundary or move through a documented execution
  lifecycle.
- Completed backups have actionable download metadata when artifact execution is
  supported.
- Restore/delete behavior is real or truthfully unavailable with documented
  product rationale.

## Closure Notes

Done (2026-06-01): v1 remains an external-worker metadata queue per
architecture. `resolveBackupDownload` now rejects queued/artifact-less rows and
non-`http(s)` artifacts, `restoreBackup` rejects not-ready rows and then returns
`backup_restore_unsupported` until a worker-backed restore exists, route errors
map through `mapBackupError`, and `DELETE /backups/:id` removes only the target
metadata row with audit coverage. The UI enables download only for
worker-provided URL artifacts and keeps restore unavailable with explicit copy.
