# TASK-210-05-01: Forms Create Drawer Reset and Payload Guard
# FileName: TASK-210-05-01_Forms_Create_Drawer_Reset_and_Payload_Guard.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-05, TASK-210-01-01
**Status:** To Do

---

## Overview

Make the Forms create drawer match the Pages list create ergonomics while
preserving the current list-drawer payload boundary.

## Sub-Tasks

- [ ] Rename the header trigger from `New form` to `New`.
- [ ] Reset drawer internal state on each open, using the Pages drawer key
  pattern if needed.
- [ ] Add a `SheetDescription` or equivalent `aria-describedby` path matching
  `PageCreateDrawer` so this create drawer is accessible after the list parity
  work. This leaf only covers the create drawer warning; runtime preview and
  global dialog wrapper warnings stay outside TASK-210.
- [ ] Add an open-after-create checkbox to the drawer UI.
- [ ] Pass only `name`, optional `slug`, `status`, and `description` from the
  list drawer into `createForm`.
- [ ] Do not include UI-only `openAfterCreate` in the `createForm` call or API
  payload.
- [ ] Keep builder-owned fields (`submissionAccess`, `successMessage`,
  `successRedirectUrl`, `settings`) in the builder/settings flow.
- [ ] Preserve the existing `formsClient.createForm` behavior that attaches
  normalized default `settings` before the API request when no settings are
  provided.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormCreateDrawer.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
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
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
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
