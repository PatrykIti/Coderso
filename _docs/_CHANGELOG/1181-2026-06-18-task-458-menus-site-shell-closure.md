# 1181 - TASK-458 Menus Site Shell Closure

**Date:** 2026-06-18
**Version:** Unreleased
**Tasks:** TASK-458, TASK-458-04

## Key Changes

### Task Board
- Closed TASK-458 and TASK-458-04 as `Done` after the final live smoke
  evidence landed.
- Updated `_docs/_TASKS/README.md` statistics and moved both records from
  `In Progress` to `Done`.

### Closure Evidence
- Recorded fresh `coderso-dev-core-host` + `playwright-cli` evidence for the
  Menus Site shell dialog, deliberate Settings shell-section removal,
  restricted menu design palette, draft-private menu design saves, publish
  propagation to the public shell, invalid menu extras rejection, and shell
  setting restoration.
- Added a supplemental live Page editor catalog check proving the regular
  editor still exposes the full insert catalog while the menu design editor
  remains restricted to menu-safe extras.

## Validation

- `playwright-cli -s=task458459-live-audit run-code --filename .tmp/task-458-459-live-audit-code.js`
  via `.tmp/task-458-459-live-audit-runner.ts`:
  `.tmp/task-458-459-live-audit-result.json`, `status: passed`,
  `failedChecks: []`.
- `playwright-cli -s=task458-page-catalog run-code --filename .tmp/task-458-page-editor-catalog-code.js`:
  `.tmp/task-458-page-editor-catalog-result.json`, `status: passed`.
