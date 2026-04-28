# TASK-210-02-02: Forms Table Selection and Access Column
# FileName: TASK-210-02-02_Forms_Table_Selection_and_Access_Column.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-01
**Status:** Done (2026-04-26)

---

## Overview

Rework `FormTable` so it matches the Pages table treatment while keeping
Forms-specific columns and row metadata.

## Sub-Tasks

- [x] Add a checkbox header and row checkbox column.
- [x] Add selected-row styling consistent with `PageTable`.
- [x] Show Forms columns: form, status, submission access, updated, actions.
- [x] Keep responsive mobile metadata under the form name.
- [x] Keep row editor links on canonical `/coderso/forms/:id`.
- [x] Keep row actions Forms-specific: include Edit and Action logs, but do not
  add Preview, Duplicate, or Embed Code.

## Files to Change

- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted by TASK-210-03-01.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the real `FormTable`
  rendering and interaction contract.

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
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
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

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
