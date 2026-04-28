# 752 - TASK-221 Entries metadata panel scroll containment

Date: 2026-04-27
Version: Nextless Admin
Tasks: TASK-221

## Key Changes

### Entries Editor

- Fixed the desktop Entries details panel so metadata, checklist, SEO,
  taxonomy, and danger-zone sections scroll inside the right panel.
- Removed nested right-panel scroll wrappers from the desktop aside and mobile
  details sheet.
- Kept the metadata panel author footer outside the scrollable region.

### Validation

- Added Vitest regression coverage for right-panel scroll ownership in the
  Entries editor shell.
- Confirmed the existing metadata panel render coverage still passes.
