# TASK-210-04-01: Forms Bulk Action Bar and Visible Selection
# FileName: TASK-210-04-01_Forms_Bulk_Action_Bar_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-03, TASK-210-03-01
**Status:** Done (2026-04-26)

---

## Overview

Add the Pages-style inline bulk action bar for Forms, scoped to the selected
rows visible after filters and pagination.

## Sub-Tasks

- [x] Add `FormBulkActionsBar` if extracting keeps `FormListPage` readable.
- [x] Render the bar in `PageHeader.actions`, to the left of `New`.
- [x] Show selected count.
- [x] Support Publish, Move to draft, Archive, and Delete.
- [x] Disable Apply until an action is selected.
- [x] Keep selected ids limited to current visible rows.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormBulkActionsBar.tsx` if extracted.
- `core/admin/ui/forms/FormTable.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` or a focused new component
  suite if `FormBulkActionsBar` is extracted.

## Security Contract

- Visibility: internal admin UI bulk actions.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: bulk lifecycle/delete require `forms:write`.
- CSRF: each write goes through existing `formsClient` helpers with
  `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged in this leaf.
- Anti-abuse: only currently visible selected ids may be submitted to a bulk
  operation.

## Testing Requirements

- Bulk bar appears only after selecting at least one visible row.
- Selected count updates after row and header checkbox changes.
- Bulk action options are Forms-specific.
- Hidden selected ids are not included in pending bulk actions.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms bulk controls match Pages inline header placement.
2. Bulk options are status-safe for Forms.
3. Hidden rows cannot be selected into bulk execution.

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
