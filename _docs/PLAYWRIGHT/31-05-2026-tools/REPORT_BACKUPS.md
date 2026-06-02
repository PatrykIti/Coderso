# Backups - Playwright Audit

Date: 31-05-2026  
Route: `/admin/backups`

## What Was Clicked

- Sidebar Tools -> Backups.
- Schedule frequency buttons: Daily, Weekly, Monthly.
- Storage select: Local Storage, Amazon S3, Azure Blob.
- Update Schedule.
- Create Backup Now dialog.
- Backup content checkboxes.
- Start Backup.
- Backup search input.
- Table action buttons.
- Pagination buttons.

## What Worked

- The route loaded successfully.
- Schedule frequency and storage controls could be changed.
- Update Schedule returned a successful backend response.
- The original schedule was restored after the audit.
- Create Backup Now opened the dialog.
- Deep pass: Start Backup returned HTTP 200 from `POST /backups`.
- Deep pass: backup count increased and the created row was visible through the
  API.
- Search showed a clear empty state for a non-matching term.
- Restore, Download, and Delete were disabled for queued backups.
- TASK-351 closure pass on 2026-06-01 proved controlled include options through
  the UI request body (`database` + `settings` after toggling), internal CMS
  artifact completion, local download, real list pagination, disabled restore
  reason, cache hydration, and a real delete action for the created row.
- The closure pass recorded zero browser console errors, zero page exceptions,
  and zero network loading failures.
- TASK-355 follow-up on 2026-06-02 verified through the running CMS HTTP stack
  that new manual backups still complete inside the CMS, download as local JSON
  (`url: null`, `contentType: application/json`), redact list/cache artifact
  paths to `local`, and delete the created row/artifact. The same pass observed
  two pre-existing stale queued/running rows from 2026-05-31, so worker health
  can still display an age warning even though new backups work.

## Resolved Findings

### [RESOLVED] Backup content checkboxes are sent and validated

Resolution:

- `BackupNowDialog` now owns controlled include state.
- `BackupsPage` and `backupsClient.createBackup` serialize selected include
  options.
- `POST /backups` validates a strict bounded include enum array and logs only
  selected option keys in audit metadata.
- Browser proof toggled Media off and Settings on, then observed request body
  `{"kind":"manual","include":["database","settings"]}`.

### [RESOLVED] Manual backups create CMS-managed artifacts

Resolution:

- v1 manual backup creation is handled by the CMS process: the admin API writes
  a local JSON artifact and marks the row `complete` on success.
- The list response reports internal worker health and queue counts for legacy
  queued/running rows, but new manual backups do not wait for an external
  worker.
- Restore is rejected as `backup_not_ready` before artifacts exist and
  `backup_restore_unsupported` after completion until a CMS restore
  implementation exists.
- Download is enabled for completed CMS-managed local artifacts and returns
  JSON content with `url: null` and `path: null`; list/browser cache redacts
  local paths to `artifactPath: "local"`.
- TASK-355 refined browser cache patching: create sanitizes before cache write,
  delete patches only safe pages and invalidates pagination-sensitive caches,
  and no-op pages no longer broadcast spurious updates.

### [RESOLVED] Pagination buttons are stateful

Resolution:

- `GET /backups` accepts strict `page`, `limit`, and `query` parameters and
  returns `total`, `hasNext`, `hasPrevious`, and `worker`.
- `BackupsPage` owns page/search state and reloads list data through the client.
- `BackupsTable` disables Previous/Next according to the returned metadata.
- Browser proof used fixture rows to move from the first page to page two and
  back, then verified the total returned to its prior value after deleting the
  created backup.

### [RESOLVED] Delete is a real metadata-row action

Resolution:

- `DELETE /backups/:id` requires `backups:write`, deletes only the requested
  metadata row, and writes an audit event.
- The UI asks for confirmation and refreshes the current page, stepping back if
  deletion empties the page.
- Browser proof deleted only its created backup row and verified the row was
  gone from the database before cleanup.
- TASK-355 replaced `window.confirm` with the shared confirm dialog, added
  selected-row state plus bulk delete, and changed the primary header action to
  concise `Create`.

## Side Effects

- The audit created backup rows through the real UI/API path.
- Original audit rows created on 2026-05-31 were left intact. TASK-351 closure
  rows and pagination fixtures were removed after proof.
- The schedule settings changed during the test were restored to their original
  values.

## Source References

- `core/admin/ui/backups/BackupsPage.tsx`
- `core/admin/ui/backups/BackupScheduleCard.tsx`
- `core/admin/ui/backups/BackupNowDialog.tsx`
- `core/admin/ui/backups/BackupsTable.tsx`
- `core/admin/services/backupsClient.ts`
- `core/server/routes/backupRoutes.ts`
- `core/services/backups/backupService.ts`
