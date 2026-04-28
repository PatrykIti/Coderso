# TASK-210-05-01: Forms Create Drawer Reset and Payload Guard
# FileName: TASK-210-05-01_Forms_Create_Drawer_Reset_and_Payload_Guard.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-05, TASK-210-01-01
**Status:** Done (2026-04-26)

---

## Overview

Make the Forms create drawer match the Pages list create ergonomics while
preserving the current list-drawer payload boundary.

## Sub-Tasks

- [x] Rename the header trigger from `New form` to `New`.
- [x] Reset drawer internal state on each open, using the Pages drawer key
  pattern if needed.
- [x] Add a `SheetDescription` or equivalent `aria-describedby` path matching
  `PageCreateDrawer` so this create drawer is accessible after the list parity
  work. This leaf only covers the create drawer warning; runtime preview and
  global dialog wrapper warnings stay outside TASK-210.
- [x] Add an open-after-create checkbox to the drawer UI.
- [x] Pass only `name`, optional `slug`, `status`, and `description` from the
  list drawer into `createForm`.
- [x] Do not include UI-only `openAfterCreate` in the `createForm` call or API
  payload.
- [x] Keep builder-owned fields (`submissionAccess`, `successMessage`,
  `successRedirectUrl`, `settings`) in the builder/settings flow.
- [x] Preserve the existing `formsClient.createForm` behavior that attaches
  normalized default `settings` before the API request when no settings are
  provided.
- [x] Preserve the existing null-create fallback at the list owner: a missing
  created row should refresh the list and close the drawer without navigating or
  reading `created.name`.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormCreateDrawer.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the real drawer
  rendering/reset/payload contract.
- `tests/vitest/ui-integration/forms.test.tsx`
- `tests/vitest/admin/formsClient.test.ts`

## Security Contract

- Visibility: internal admin UI create flow.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: create requires `forms:write`.
- CSRF: create continues through `createForm` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - UI sends only list-drawer create fields;
  - route `formCreateSchema` remains the server source of truth.
- Anti-abuse: no public write path is added.

## Testing Requirements

- Trigger label is `New`.
- Drawer state resets between openings.
- Drawer description/`aria-describedby` coverage matches the Pages create
  drawer pattern.
- List-to-client create payload excludes `openAfterCreate`.
- List-to-client create payload excludes builder-owned fields unless they are
  already present in the drawer contract.
- Client-level tests keep proving that `formsClient.createForm` sends normalized
  default `settings` on the network payload.
- Null create responses refresh and close without navigation or `created.name`
  access.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/formsClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The Forms drawer behaves like Pages on open/reset.
2. The create drawer has an accessible description and does not retain the
   current missing-description warning.
3. The API payload stays schema-first and contains no UI-only preference fields.
4. Builder/settings ownership of advanced Forms fields is preserved.
5. Existing `formsClient.createForm` default `settings` normalization is not
   removed to make the drawer test pass.
6. A null create response follows the existing refresh-and-close fallback
   instead of crashing or navigating to an invalid builder route.

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
