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

- [ ] Rename the list trigger from `New form` to compact `New`.
- [ ] Reset the drawer state each time it opens, matching the Pages drawer key
  pattern if the current internal state would otherwise leak.
- [ ] Add `forms.openAfterCreate` user setting, mirroring
  `pages.openAfterCreate`.
- [ ] On successful create:
  - emit create feedback through TASK-210-06;
  - navigate to `/coderso/forms/:id` when open-after-create is enabled;
  - otherwise close the drawer and background-refresh the list.
- [ ] Keep drawer payload schema limited to existing Forms create fields:
  `name`, optional `slug`, `status`, `description`.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormCreateDrawer.tsx`
- `core/admin/services/userSettingsClient.ts` only if the typed setting catalog
  requires registration.
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI create flow.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: create requires `forms:write`.
- CSRF: create continues through `createForm` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: UI submits only existing `formCreateSchema` fields.
- Anti-abuse: no public write path.

## Pseudocode

```ts
const [openAfterCreate, setOpenAfterCreate] = useState(true);

const handleCreate = async (payload: FormCreateInput & { openAfterCreate: boolean }) => {
  const created = await createForm(payload);
  formListToasts.success("create", { targetLabel: created.name });
  if (payload.openAfterCreate) {
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
  - create sends only Forms create schema fields;
  - open-after-create enabled navigates to the form builder;
  - open-after-create disabled refreshes the list and closes the drawer;
  - preference load/persist failures do not block create.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms create entry point matches the Pages `New` action pattern.
2. Drawer state does not leak between openings.
3. Users can create and either open the new form or stay on the list.
4. UI-only preference fields are not sent to the API.
5. Existing Forms builder route remains the edit target.
