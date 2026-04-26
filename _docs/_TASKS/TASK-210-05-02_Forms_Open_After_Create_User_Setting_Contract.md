# TASK-210-05-02: Forms Open After Create User Setting Contract
# FileName: TASK-210-05-02_Forms_Open_After_Create_User_Setting_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Settings Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-210-05-01
**Status:** Done (2026-04-26)

---

## Overview

Add a typed `forms.openAfterCreate` preference for the Forms list. Do not reuse
`pages.openAfterCreate`; the setting is resource-specific so Forms can mirror the
Pages UX without coupling two admin surfaces to one preference key.

This is a settings contract change, not just a UI toggle. The key must be
registered on both admin client and server settings contracts before the Forms
list depends on it.

## Sub-Tasks

- [x] Add `forms.openAfterCreate` to `UserSettings` in the admin client.
- [x] Add `forms.openAfterCreate` to `UserSettingValueMap`.
- [x] Add a default value to `DEFAULT_USER_SETTINGS`.
- [x] Validate the key as boolean-only in `validateUserSettingValue`.
- [x] Load the preference in `FormListPage` and ignore load failures.
- [x] Persist preference changes through `setUserSetting`.
- [x] Keep preference persistence failures non-blocking for create.

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
