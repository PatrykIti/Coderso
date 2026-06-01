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
  the UI request body (`database` + `settings` after toggling), queue/worker
  messaging, real list pagination, disabled restore/download reasons, and a
  real delete action for the created row.
- The closure pass recorded zero browser console errors, zero page exceptions,
  and zero network loading failures.

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

### [RESOLVED] Queued backups expose the v1 external-worker boundary

Resolution:

- v1 remains metadata-only by architecture: the admin API enqueues backup rows
  and a future worker/plugin owns artifact creation and restore execution.
- The list response now includes external worker health and queued-job counts.
- The table explains queued/running rows with external-worker copy and warns
  when jobs are aged beyond the accepted threshold.
- Restore is rejected as `backup_not_ready` before artifacts exist and
  `backup_restore_unsupported` after completion until a worker-backed restore
  implementation exists.
- Download is enabled only for completed backups with worker-provided `http(s)`
  artifact URLs; local or invalid artifact paths are disabled/rejected as
  `backup_artifact_invalid`.

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

## Side Effects

- The audit created queued backup rows through the real UI/API path.
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
