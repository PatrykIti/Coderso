# 660. TASK-179 surface hint filter contract

Date: 2026-04-17
Version: unreleased
Tasks: TASK-179-01

## Key Changes

### Assistant/Core

- Added `surfaceHint` to CMS operation drafts.
- Added allowlisted `filters[]` for `status`, `visibility`, and `showInSidebar`.
- Updated provider draft repair and structured JSON Schema builder to preserve safe surface/filter data.

### Validation

- Added schema and repair coverage for valid and invalid filters.
