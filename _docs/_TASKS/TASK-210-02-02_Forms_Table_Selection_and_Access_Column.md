# TASK-210-02-02: Forms Table Selection and Access Column
# FileName: TASK-210-02-02_Forms_Table_Selection_and_Access_Column.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-01
**Status:** To Do

---

## Overview

Rework `FormTable` so it matches the Pages table treatment while keeping
Forms-specific columns and row metadata.

## Sub-Tasks

- [ ] Add a checkbox header and row checkbox column.
- [ ] Add selected-row styling consistent with `PageTable`.
- [ ] Show Forms columns: form, status, submission access, updated, actions.
- [ ] Keep responsive mobile metadata under the form name.
- [ ] Keep row editor links on canonical `/coderso/forms/:id`.
- [ ] Keep row actions Forms-specific: include Edit and Action logs, but do not
  add Preview, Duplicate, or Embed Code.

## Files to Change

- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted by TASK-210-03-01.
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI read/list behavior.
- Auth model: unchanged authenticated admin read path.
- RBAC: existing `forms:read` for list rows.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: selection is client-local visible-row state only.

## Testing Requirements

- Header checkbox can select the current visible rows.
- Row checkbox toggles a single form id.
- Selected rows get visible selected styling.
- `submissionAccess` renders for `public` and `internal`.
- Row links resolve to canonical Forms editor routes.
- Row action-log links resolve to canonical Forms action-log routes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms table visually follows Pages table density and selection behavior.
2. The access column reflects the Forms `submissionAccess` contract.
3. Page-only actions are absent from the Forms table.
4. Each row can navigate to the existing Forms action-log route.
