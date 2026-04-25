# TASK-210-05-02: Forms Open After Create User Setting Contract
# FileName: TASK-210-05-02_Forms_Open_After_Create_User_Setting_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Settings Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-210-05-01
**Status:** To Do

---

## Overview

Add a typed `forms.openAfterCreate` preference for the Forms list. Do not reuse
`pages.openAfterCreate`; the setting is resource-specific so Forms can mirror the
Pages UX without coupling two admin surfaces to one preference key.

This is a settings contract change, not just a UI toggle. The key must be
registered on both admin client and server settings contracts before the Forms
list depends on it.

## Sub-Tasks

- [ ] Add `forms.openAfterCreate` to `UserSettings` in the admin client.
- [ ] Add `forms.openAfterCreate` to `UserSettingValueMap`.
- [ ] Add a default value to `DEFAULT_USER_SETTINGS`.
- [ ] Validate the key as boolean-only in `validateUserSettingValue`.
- [ ] Load the preference in `FormListPage` and ignore load failures.
- [ ] Persist preference changes through `setUserSetting`.
- [ ] Keep preference persistence failures non-blocking for create.

## Files to Change

- `core/admin/services/userSettingsClient.ts`
- `core/services/settings/userSettingsService.ts`
- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormCreateDrawer.tsx`
- `tests/vitest/admin/userSettingsClient.test.ts`
- `tests/unit/settings/userSettingsService.test.ts`
- `tests/integration/routes/userSettings.test.ts` because the route-visible
  settings catalog accepts a new key.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` if the drawer toggle is owned
  inside `FormCreateDrawer`.

## Security Contract

- Visibility: internal authenticated user setting.
- Auth model: existing `/user-settings` routes require authenticated admin user.
- RBAC: user-scoped preference writes do not grant Forms permissions.
- CSRF: `PATCH /user-settings/:key` continues through `setUserSetting` with
  `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unknown setting keys reject through
  `assertUserSettingKey`; `forms.openAfterCreate` accepts booleans only.
- Anti-abuse: no public write path; preference value is not a secret.

## Testing Requirements

- Client settings response includes `forms.openAfterCreate`.
- Client `setUserSetting("forms.openAfterCreate", value)` updates cache.
- Server service returns default `forms.openAfterCreate`.
- Server service rejects non-boolean values for the key.
- Forms create flow still works when preference load or persist fails.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
  - `set -a && source .env && set +a && bun test tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md` or the settings source doc if user settings are documented
  there.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `forms.openAfterCreate` is typed on the admin client.
2. `forms.openAfterCreate` has a server default and strict boolean validation.
3. Preference read/write failures do not block form creation.
