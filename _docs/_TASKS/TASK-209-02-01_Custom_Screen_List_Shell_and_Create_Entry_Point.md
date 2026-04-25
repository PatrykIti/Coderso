# TASK-209-02-01: Custom Screen List Shell and Create Entry Point
# FileName: TASK-209-02-01_Custom_Screen_List_Shell_and_Create_Entry_Point.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-02, TASK-209-01
**Status:** To Do

---

## Overview

Keep the existing `AdminShell`/`PageHeader` route shape, but make the Custom
Screens list header action match Pages: inline selected-row bulk controls render
to the left of a compact `New` button, and `New` opens a list-owned create
drawer instead of forcing users through a full blank builder page first.

The builder route remains the full editing surface. The create drawer only owns
the minimum Custom Screen creation contract and then navigates to the builder
when configured.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- new `core/admin/ui/custom-screens/CustomScreenCreateDrawer.tsx`
- `core/admin/services/customScreensClient.ts` only if a client helper is needed
  for create feedback typing.
- `core/admin/services/userSettingsClient.ts` if adding the
  `customScreens.openAfterCreate` setting needs registration or typing.
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Implementation Checklist

- Keep breadcrumbs:
  - `Coderso / Screens`
- Keep `PageHeader title="Custom Screens"` and the current description unless
  copy becomes inconsistent after the drawer is added.
- Change the visible action label to compact `New`, matching Pages.
- Add `CustomScreenCreateDrawer` with:
  - screen name,
  - content type select,
  - status defaulting to `draft`,
  - optional sidebar shortcut toggle and sidebar label,
  - open-after-create checkbox/persistence using a dedicated user setting.
- Use existing `createCustomScreen` and existing schema fields only:

```tsx
await createCustomScreen({
  name,
  contentTypeId,
  status,
  showInSidebar,
  sidebarLabel,
  blocks: [],
  bindings: [],
});
```

- On create success:
  - emit the shared create toast in `TASK-209-03-01`,
  - navigate to `/coderso/custom-screens/:id` when open-after-create is true,
  - otherwise close the drawer and refresh the list in the background.
- Keep `/admin/coderso/custom-screens/new` as a valid direct builder create
  route for deep links and existing tests.

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC: `content:read` for content-type options; create itself requires
  `content:write`.
- CSRF: create continues through `createCustomScreen` with `withCsrf: true`.
- Rate-limit bucket: `admin_read` for options and `admin_write` for create.
- Reject-unknown validation: drawer submits only fields accepted by
  `customScreenCreateSchema`.
- Anti-abuse: no public write path; drawer create remains bounded to a single
  user-selected content type and local validation before submit.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- Mounted drawer test in `tests/vitest/ui/custom-screens-list-wave.test.tsx`
  covering open, submit success with navigation, submit success without
  navigation, and rejected create mutation.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `New` opens a drawer from the list surface.
2. The drawer creates a valid Custom Screen without adding new API fields.
3. Direct `/admin/coderso/custom-screens/new` builder route still works.
4. Open-after-create behavior is explicit and persisted separately from Pages.
