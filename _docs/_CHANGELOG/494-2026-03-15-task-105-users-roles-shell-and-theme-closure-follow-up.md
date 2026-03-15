# 494. TASK-105 Users Roles Shell and Theme Closure Follow-Up

**Date:** 2026-03-15  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Themes
- Extended `ThemeTemplateDrawer` coverage for the remaining typography/button/input token callbacks, the safe no-op save path without `onSave`, and shorthand-hex base inversion.
- A fresh full-lane rerun now line-closes `ThemeTemplateDrawer` at `100.00%` lines while keeping branch coverage in the high 80s.

### QA / Users & Roles
- Added direct `UsersRolesPage` coverage for filter routing, invite/edit/toggle/delete flows, role create/edit/duplicate/delete orchestration, read-only mobile details behavior, and generic load failure handling.
- Added direct `UserList` and `UserFilters` coverage for protected-user guards, overflow and fallback role badges, read-only action disabling, and filter callback routing.

### Admin UI
- Prefixed the keyed `UserEditor` and `RoleEditor` instances inside `UsersRolesPage` to avoid duplicate `new-0` React key collisions during shell updates.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/theme-editor.test.tsx`
  - `tests/vitest/ui/user-editor-wave.test.tsx`
  - `tests/vitest/ui/user-list-filters-wave.test.tsx`
  - `tests/vitest/ui/users-roles-page-wave.test.tsx`
  - `tests/vitest/ui/users-roles.test.tsx`
- `bun run test:coverage` still hits the known `coverage/vitest/.tmp/coverage-*.json` `ENOENT` wrapper flake after test execution.
- Direct full-lane coverage passed via:
  - `bun x vitest run --config vitest.config.ts --coverage.enabled --coverage.provider=v8 --coverage.reporter=text-summary --coverage.reporter=json-summary --coverage.reporter=json --coverage.reportsDirectory=/tmp/full-vitest-cov --coverage.clean=false`
- Direct full-lane snapshot:
  - `471` files / `1741` tests
  - `% Stmts`: `70.81`
  - `% Branch`: `61.35`
  - `% Funcs`: `74.92`
  - `% Lines`: `74.04`
