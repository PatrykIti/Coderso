# 996 - TASK-343 shared MediaPicker routing

Date: 2026-05-29
Version: Unreleased
Tasks: TASK-343, TASK-343-31

## Key Changes

- Added `TASK-343-31` for the repeated shared MediaPicker/Radix Dialog
  accessibility warning found in widget authoring flows.
- Updated the `TASK-343` umbrella and task board totals from `30` to `31`
  physical remediation families.
- Routed footer-local classification to the shared MediaPicker owner instead of
  leaving the warning as an unowned note.

## Validation

- `git diff --check`
- `bun run precommit` through the commit hook
