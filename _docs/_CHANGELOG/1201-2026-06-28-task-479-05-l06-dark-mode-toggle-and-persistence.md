# 1201 - TASK-479-05-L06 Dark-Mode Toggle & Persistence in Admin Shell

**Date:** 2026-06-28
**Version:** Unreleased
**Tasks:** TASK-479, TASK-479-05, TASK-479-05-L06

## Key Changes

### Persisted, no-flash light/dark switch in the admin shell

The admin shell gains a light/dark toggle on a SEPARATE axis from the existing
theme-PROFILE switcher (`AdminThemeSwitcher`). The toggle flips
`<html class="dark">`, which activates the injected `:root.dark{--admin-*}`
block, so the WHOLE chrome (button + sidebar + topbar) recolors — not merely the
`.dark` class — because the chrome reads `--admin-*` directly and the injected
style wins source order (TASK-479-05-L01 dark-mode decision).

- **No-flash pre-paint** (`core/admin/index.html`): `<html class="light">` plus a
  tiny inline script that reads `coderso-admin-color-mode` from `localStorage`
  and sets the `dark`/`light` class on `<html>` BEFORE React mounts.
- **`AdminColorModeToggle` + `useColorMode`**
  (new `core/admin/ui/shared/AdminColorModeToggle.tsx`): the hook lazy-inits the
  mode from the DOM class (set pre-paint), falling back to storage then light;
  its effect ONLY syncs the class + persists (no sync `setState` in an effect —
  ESLint 9 react-hooks compliant). The toggle is a ghost icon `Button`
  (`aria-label="Toggle dark mode"`, `aria-pressed`) matching the neighboring
  chrome buttons. An exported `applyStoredColorMode()` is the TS twin of the
  pre-paint script (used to exercise the no-flash path in tests). `useColorMode`
  is the single source of truth for the class — no second class owner is added.
- **TopBar mount** (`core/admin/ui/shared/TopBar.tsx`): `<AdminColorModeToggle />`
  sits in the right-hand action cluster, immediately after `<AdminThemeSwitcher />`.
- **AdminApp dual-block injection** (`core/admin/app/AdminApp.tsx`): the injected
  `<style id="coderso-theme-tokens">` now emits BOTH the active profile's light
  `:root{--admin-*}` block AND a shared default dark `:root.dark{--admin-*}` block
  (`toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark")`). The
  profile switcher axis only re-emits the LIGHT block.

### Backward compatibility / security

- No endpoint, RBAC, route, or cache changes. The color mode is a client-only
  `localStorage` preference (`coderso-admin-color-mode`) — no server state, no
  payloads. `localStorage` access is wrapped in try/catch (private-mode /
  disabled storage) and defaults to light; `typeof document` guards keep the
  module importable under jsdom/SSR.
- The shared default dark palette covers every profile with zero data migration:
  existing light-only `admin_theme_templates` rows are untouched and their dark
  chrome comes from the injected `:root.dark{--admin-*}` block.

### Scope notes

- The `.dark` token VALUES (globals.css pre-paint fallback) are L03; the token
  contract + `DEFAULT_ADMIN_THEME_TOKENS_DARK` constant are L02 — both already
  shipped. This leaf only wires the toggle, persistence, and the AdminApp dual
  injection.
- `_docs/_TASKS/README.md` board + statistics and the `_docs/DESIGN_TOKENS.md`
  dark-mode section (toggle + `coderso-admin-color-mode` key + no-flash) are
  owned by L07 / subtask closure (per the L03 deferral pattern) and are not
  edited here.

## Tests

- `tests/vitest/ui-integration/admin-color-mode-toggle.test.tsx` (repo idiom:
  happy-dom + `createRoot`/`React.act`): `readInitialMode` returns `dark` when
  `<html class="dark">` is present and falls back to storage otherwise; lazy
  init from the pre-paint dark class; clicking the toggle adds/removes the `dark`
  class on `<html>` and writes `coderso-admin-color-mode`; `applyStoredColorMode`
  sets the class synchronously from a seeded value (no-flash).
- `tests/vitest/admin/topbar-color-mode-toggle.test.tsx`: TopBar mounts the
  toggle in the action cluster after the (mocked) `AdminThemeSwitcher`.
- `tests/vitest/admin/adminApp.test.tsx` (extended): the injected
  `coderso-theme-tokens` style carries BOTH `:root{` and `:root.dark{` blocks,
  and the dark block's chrome tokens are the real dark hexes
  (`--admin-button-primary-bg:#8b5cf6`, `--admin-sidebar-bg:#1c1b1f`,
  `--admin-topbar-bg:#18171a`, `--admin-base-bg:#18171a`) while the light block
  keeps `--admin-button-primary-bg:#7c3aed` — the real "dark recolors the chrome"
  assertion.

## Validation

- `bun --cwd core lint` — clean.
- `bun --cwd core lint:types` — clean.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin tests/vitest/ui-integration`
  — 120 files / 569 tests, all green (no regressions).
