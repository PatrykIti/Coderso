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
- Start Backup returned a successful backend response.
- The backup count increased after creation.
- Search showed a clear empty state for a non-matching term.
- Restore, Download, and Delete were disabled for queued backups.

## What Did Not Work

### [ISSUE] Backup content checkboxes are not used

Evidence:

- Playwright toggled Database snapshot, Media assets, and Settings & tokens.
- Start Backup still created the same manual backup request.

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

### [ISSUE] Created backups remain queued in local UI flow

Evidence:

- Starting a backup inserted a new backup row and increased the list count.
- The row remained queued; Restore and Download stayed disabled.

Why:

- The UI/API path creates a queued backup record.
- No local worker/artifact completion path was observed during the audit.

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
- No delete action was available for queued rows in the UI, so these rows were
  intentionally left in place.
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

