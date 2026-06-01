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

## What Did Not Work

### [ISSUE] Backup content checkboxes are not used

Evidence:

- Playwright toggled Database snapshot, Media assets, and Settings & tokens.
- Start Backup still created the same manual backup request.
- Deep pass request body was only `{ "kind": "manual" }`.

Why:

- `BackupNowDialog` uses uncontrolled `defaultChecked` checkboxes.
- `handleCreate` calls `onCreate()` without selected content options.
- `BackupsPage` sends only `{ kind: "manual" }` to the backup API.

How to fix:

- Track selected backup content in dialog state.
- Extend the backup creation schema with explicit include options, or remove the
  checkboxes if all manual backups are always full snapshots.
- Add a regression test that toggles each checkbox and asserts the request
  payload.

### [ISSUE] Created backups remain queued and no backup artifact is produced

Evidence:

- Starting a backup inserted a new backup row and increased the list count.
- The created row had `status: "queued"`, `artifactPath: null`, and
  `sizeBytes: null`.
- Restore and Download stayed disabled.

Why:

- The UI/API path creates a queued backup record.
- `createBackup` only inserts a queued row.
- No worker/artifact completion path was observed during the audit.
- `restoreBackup` currently returns the backup record; it does not restore a
  database or media snapshot.

How to fix:

- Wire backup execution status into the local/dev runtime, or clearly label the
  row as pending external processing.
- Add status polling or background refresh if backups complete asynchronously.
- Add integration coverage for queued -> completed -> downloadable/restoreable.

### [ISSUE] Pagination buttons are placeholders

Evidence:

- Previous and Next were rendered at the bottom of the table.
- Previous was disabled, but Next was enabled without any visible pagination
  behavior.

Why:

- `BackupsTable` renders pagination controls without page state or handlers.

How to fix:

- Add real pagination state and API parameters, or disable both controls until
  pagination is supported.
- Add tests for empty, first-page, and last-page states.

## Side Effects

- The audit created queued backup rows through the real UI/API path.
- There is no UI delete action for queued rows. Test rows created by this audit
  were removed directly from the database after evidence capture.
- The schedule settings changed during the test were restored to their original
  values.

## Source References

- `core/admin/ui/backups/BackupsPage.tsx`
- `core/admin/ui/backups/BackupScheduleCard.tsx`
- `core/admin/ui/backups/BackupNowDialog.tsx`
- `core/admin/ui/backups/BackupsTable.tsx`
- `core/admin/api/backupsClient.ts`
- `core/server/routes/admin/backupRoutes.ts`
- `core/server/services/backupService.ts`
