# 756 - TASK-225 Page editor status badge and action locking

Date: 2026-04-27
Version: Nextless Admin
Tasks: TASK-225

## Key Changes

### Pages Admin UI

- Updated the Pages editor `Published` badge to use the same emerald color
  contract as the `/admin/pages` table.
- Kept the `Draft` badge on the existing amber styling.
- Blocked overlapping save draft and publish mutations with shared disabled
  state and a synchronous in-flight guard.

### Validation

- Added Pages editor Vitest coverage for published badge styling and rapid
  save/publish action locking.
