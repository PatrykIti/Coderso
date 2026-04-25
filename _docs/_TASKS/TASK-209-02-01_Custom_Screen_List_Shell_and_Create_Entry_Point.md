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
Screens list header action layout match Pages: the header must have the same
inline slot where selected-row bulk controls will render in `TASK-209-03-03`,
to the left of a compact `New` button. `New` opens a list-owned create drawer
instead of forcing users through a full blank builder page first.

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
- `core/admin/services/userSettingsClient.ts`
- `core/services/settings/userSettingsService.ts`
- `tests/vitest/admin/userSettingsClient.test.ts`
- `tests/unit/settings/userSettingsService.test.ts`
- `tests/integration/routes/userSettings.test.ts` with route-boundary coverage
  for reading and writing `customScreens.openAfterCreate`.
- `_docs/CMS_API.md` user-settings key list.
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
  - open-after-create checkbox/persistence using a dedicated
    `customScreens.openAfterCreate` user setting.
- The content-type select mirrors the existing builder contract: use the fetched
  `contentTypesClient` options as-is and do not filter out draft content types
  unless a separate Engine/content-type contract explicitly changes that rule.
- When a draft screen has the sidebar shortcut enabled, the drawer/list copy must
  make clear that the shortcut is configured but appears in the admin nav only
  after the screen is active.
- Add `customScreens.openAfterCreate` to both user-settings owners before the
  drawer calls `setUserSetting`:
  - `core/services/settings/userSettingsService.ts`
  - `core/admin/services/userSettingsClient.ts`
  - default value: `true`, matching Pages' open-after-create behavior.
- Update typed `UserSettings` mocks/fixtures across affected Vitest suites so
  they include `customScreens.openAfterCreate`; do not loosen the type or return
  partial settings only to satisfy tests.
- Update user-settings service/client tests and `_docs/CMS_API.md` so the new
  key is typed, validated as boolean, returned by `GET /user-settings`, and
  writable through `PATCH /user-settings/customScreens.openAfterCreate`.
- Extend the user-settings route test so the key is exercised through the
  existing `GET /user-settings/:key` and `PATCH /user-settings/:key` handlers,
  not only by direct service/client unit tests.
- Handle no content types explicitly:
  - render a disabled/empty content-type state,
  - keep submit disabled until `contentTypeId` is selected,
  - provide a canonical `AdminLink` to `/coderso/engine` for creating the first
    content type.
- Treat `contentTypeId` as a selected option from `contentTypesClient`, not as a
  new Custom Screens service validation rule. The server create route continues
  to validate the existing non-empty string schema and must not receive
  denormalized content-type labels or UI-only drawer state.
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
- Auth model: existing authenticated admin session/admin API key model; the
  user-settings preference uses authenticated `GET/PATCH /user-settings/:key`
  with the existing `requireAuth` model.
- RBAC: `content:read` for content-type options; create itself requires
  `content:write`.
- CSRF: create continues through `createCustomScreen` with `withCsrf: true`;
  preference updates continue through `setUserSetting` with `withCsrf: true`.
- Rate-limit bucket: `admin_read` for options/settings reads and `admin_write`
  for create/preference writes.
- Reject-unknown validation: drawer submits only fields accepted by
  `customScreenCreateSchema`; `customScreens.openAfterCreate` accepts only a
  boolean value in the typed user-settings validator. Do not submit
  `openAfterCreate`, content-type labels, or other UI-only fields to
  `/custom-screens`.
- Anti-abuse: no public write path; drawer create remains bounded to a single
  user-selected content type and local validation before submit.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- Mounted drawer test in `tests/vitest/ui/custom-screens-list-wave.test.tsx`
  covering open, submit success with navigation, submit success without
  navigation, no-content-type disabled submit, preference toggle persistence,
  and rejected create mutation.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts`
- If the route test executes user-settings service reads/writes for the new key:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/userSettings.test.ts`
  If it remains registration-only, note that it does not prove key validation.
- If `DATABASE_URL` is reachable:
  - `set -a && source .env && set +a`
  - `bun test tests/unit/settings/userSettingsService.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `New` opens a drawer from the list surface.
2. The drawer creates a valid Custom Screen without adding new API fields.
3. Direct `/admin/coderso/custom-screens/new` builder route still works.
4. Open-after-create behavior is explicit and persisted separately from Pages.
5. The drawer blocks submit until a content type from the fetched options is
   selected and guides users to the canonical Engine route when no content
   types exist.
6. Bulk controls are not implemented in this leaf; the header slot is present
   for `TASK-209-03-03` to attach the actual bulk action bar.
