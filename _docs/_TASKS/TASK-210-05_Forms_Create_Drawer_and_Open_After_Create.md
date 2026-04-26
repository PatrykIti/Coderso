# TASK-210-05: Forms Create Drawer and Open After Create
# FileName: TASK-210-05_Forms_Create_Drawer_and_Open_After_Create.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-01, TASK-210-02
**Status:** To Do

---

## Overview

Align the Forms create flow with the Pages list create behavior while keeping
the existing Forms create payload and builder route.

`FormCreateDrawer` already collects the core Forms fields. This task makes the
list-owned create entry point match Pages: compact `New` trigger, deterministic
drawer reset, optional open-after-create preference, refresh-in-place fallback,
and Forms-specific inline validation.

## Sub-Tasks

- [ ] TASK-210-05-01: Forms Create Drawer Reset and Payload Guard
- [ ] TASK-210-05-02: Forms Open After Create User Setting Contract
- [ ] Rename the list trigger from `New form` to compact `New`.
- [ ] Reset the drawer state each time it opens, matching the Pages drawer key
  pattern if the current internal state would otherwise leak.
- [ ] Add the same sheet description / `aria-describedby` accessibility pattern
  used by `PageCreateDrawer` so the Forms list create drawer does not retain the
  current missing-description warning. Do not treat this as the global BUG-6
  closure for runtime preview or unrelated dialogs.
- [ ] Add `forms.openAfterCreate` user setting, mirroring
  `pages.openAfterCreate`.
- [ ] On successful create:
  - emit create feedback through TASK-210-06;
  - navigate to `/coderso/forms/:id` when open-after-create is enabled;
  - otherwise close the drawer and background-refresh the list.
- [ ] Preserve the existing null-create fallback: if `createForm` resolves
  without a created row, do not dereference the missing row or navigate; close
  the drawer after a forced background list refresh and leave a completion note
  describing the fallback path.
- [ ] Keep the list drawer payload passed into `createForm` limited to its
  current UI fields: `name`, optional `slug`, `status`, `description`. Do not
  pass UI-only fields or move builder-owned API fields (`successMessage`,
  `successRedirectUrl`, `submissionAccess`, `settings`) into the drawer state.
  Preserve the existing client-level default `settings` normalization in
  `formsClient.createForm`, which means client tests may still see normalized
  default settings on the network payload.
- [ ] Register `forms.openAfterCreate` in both the admin client and server
  user-settings contracts if this task adds a Forms-specific preference key.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormCreateDrawer.tsx`
- `core/admin/services/userSettingsClient.ts`
- `core/services/settings/userSettingsService.ts`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the real
  `FormCreateDrawer` reset, description, and payload contract.
- `tests/vitest/ui-integration/forms.test.tsx`
- `tests/vitest/admin/formsClient.test.ts`
- `tests/vitest/admin/userSettingsClient.test.ts`
- `tests/unit/settings/userSettingsService.test.ts`
- `tests/integration/routes/userSettings.test.ts` when `forms.openAfterCreate`
  is added, because the route-visible settings catalog changes.

## Security Contract

- Visibility: internal admin UI create flow.
- Auth model:
  - create uses the existing authenticated admin session/admin API key path;
  - user preference reads/writes use the existing authenticated user-settings
    route.
- RBAC:
  - create requires `forms:write`;
  - preference writes stay user-scoped and must not grant Forms permissions.
- CSRF:
  - create continues through `createForm` with `withCsrf: true`;
  - preference `PATCH /user-settings/:key` continues through
    `setUserSetting` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket for create and user-setting
  writes.
- Reject-unknown validation:
  - UI passes only the current list-drawer fields into `createForm`;
  - `formsClient.createForm` may still normalize and attach default `settings`
    before calling the API, matching the existing client contract;
  - `forms.openAfterCreate` is boolean-only in the server settings normalizer.
- Anti-abuse: no public write path.

## Pseudocode

```ts
const [openAfterCreate, setOpenAfterCreate] = useState(true);

type FormListCreateInput = Pick<
  FormCreateInput,
  "name" | "slug" | "status" | "description"
> & { openAfterCreate: boolean };

const handleCreate = async (payload: FormListCreateInput) => {
  const { openAfterCreate, ...formInput } = payload;
  const created = await createForm(formInput);
  if (!created) {
    await refresh({ force: true, background: true });
    setCreateOpen(false);
    return;
  }
  formListToasts.success("create", { targetLabel: created.name });
  if (openAfterCreate) {
    navigate(`/coderso/forms/${encodeURIComponent(created.id)}`);
    return;
  }
  await refresh({ force: true, background: true });
  setCreateOpen(false);
};
```

The actual payload sent to `createForm` must not include UI-only fields such as
`openAfterCreate`.

## Testing Requirements

- Add or update Vitest coverage proving:
  - list trigger text is `New`;
  - drawer opens from the list header;
  - create drawer exposes an accessible description matching the Pages sheet
    pattern;
  - the list-to-client create call contains only Forms list drawer fields and no
    UI-only `openAfterCreate`;
  - `formsClient.createForm` still sends normalized default `settings` at the
    network boundary when the UI did not provide settings;
  - open-after-create enabled navigates to the form builder;
  - open-after-create disabled refreshes the list and closes the drawer;
  - null create responses refresh and close without navigation or `created.name`
    access;
  - preference load/persist failures do not block create.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/formsClient.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md` or the user-settings source docs if the persisted setting
  catalog is documented there.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms create entry point matches the Pages `New` action pattern.
2. Drawer state does not leak between openings.
3. Users can create and either open the new form or stay on the list.
4. UI-only preference fields are never sent to `createForm` or the API.
5. Existing Forms builder route remains the edit target.
6. `forms.openAfterCreate` has a server default, boolean validation, client
   type coverage, and regression tests before the UI depends on it.
7. The implementation preserves `formsClient.createForm` default `settings`
   normalization instead of treating settings as forbidden at the network
   boundary.
