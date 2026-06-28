# 1202 - TASK-479-05-L07 Token Docs & Tests + TASK-479-05 Subtask Closure

**Date:** 2026-06-28
**Version:** Unreleased
**Tasks:** TASK-479, TASK-479-05, TASK-479-05-L01, TASK-479-05-L02,
TASK-479-05-L03, TASK-479-05-L04, TASK-479-05-L05, TASK-479-05-L06,
TASK-479-05-L07

## Key Changes

### Source-of-truth docs for the extended Admin UI Theme contract + dark mode

`_docs/DESIGN_TOKENS.md` (owned by L07) now reflects what L02–L06 shipped:

- The "Admin UI Theme Tokens (granular)" block was replaced with the full
  TASK-479-05 group shape — `primarySoft`, the new `state.info`/`*Foreground`/
  `*Soft`, `sidebar.muted`/`accent`/`accentForeground`/`border`, and the
  `effects` shadows — alongside `base`/`buttons`/`inputs`/`topbar`/`card`/
  `typography`.
- The L01 frozen prototype → `AdminThemeTokens` path → `--admin-*` owner →
  shadcn-var mapping table is pasted in, with `NEW` markers, plus the
  backward-compatibility note (jsonb column, `mergeAdminThemeTokens`/
  `normalizeAdminThemeTokens` back-fill, `assertAdminThemeTokens` reject-unknown).
- A new "Admin UI dark mode (TASK-479-05)" section records the canonical
  architecture: dark is a `:root.dark{--admin-*}` block emitted FROM the injected
  `<style id="coderso-theme-tokens">` (values from
  `DEFAULT_ADMIN_THEME_TOKENS_DARK`), so the chrome — which reads `--admin-*`
  directly — recolors; it is NOT a static `globals.css .dark`. The toggle
  (`AdminColorModeToggle`, `localStorage["coderso-admin-color-mode"]`, pre-paint
  in `index.html`) and the deferred per-template `dark?` follow-up are documented.
- The shadcn-mapping line gains the new `--color-primary-soft`/`--color-info`/
  soft-state/`--color-sidebar-accent`/`--shadow-*` names.

`_docs/THEMES_SPEC.md` already carried the seeded "Soft Violet" default +
jsonb-no-migration note (added by L04); left intact.

### Consolidated token test matrix

- `tests/vitest/ui-integration/admin-dark-mode.test.tsx` (NEW) asserts the
  injected dark block recolors the REAL chrome (`--admin-button-primary-bg:#8b5cf6`,
  `--admin-sidebar-bg:#1c1b1f`, `--admin-topbar-bg:#18171a`,
  `--admin-base-bg:#18171a` — not merely a `.dark` class), that `globals.css`
  `@theme` exposes the new `--color-*` and `:root` derives them FROM `--admin-*`,
  the `--popover`→`--admin-card-bg` re-map, the `shadow-card` wiring through
  `--admin-shadow-card`, and that the pre-paint `:root.dark` fallback mirrors
  `DEFAULT_ADMIN_THEME_TOKENS_DARK`. `globals.css` is parsed as TEXT (jsdom does
  not resolve a `var()` cascade).
- `tests/unit/adminThemes/tokenValidation.test.ts` gains an unknown-key
  rejection case for the `sidebar`/`state` groups.
- The contract/CSS-emission/back-fill guards
  (`tests/unit/adminThemes/{tokenTypes,tokenCss,tokenValidation}.test.ts`), the
  editor drawer suite
  (`tests/vitest/ui/theme-template-drawer-new-tokens.test.tsx`, L05) and the dark
  toggle suite (`tests/vitest/ui-integration/admin-color-mode-toggle.test.tsx`,
  L06) form the consolidated matrix. The `tokenCss` suite encodes the L01 frozen
  NEW-token list as a const so inventory↔emitter drift fails the build.

### Type-gate reconciliation (no product code)

L02's contract extension (`primarySoft`/`effects`) had left several pre-existing
admin-theme test fixtures missing the new groups, turning the repo-level
`tsc -p tsconfig.json` gate red. The closure leaf reconciled them with type-only
assertions that preserve the intentional partial-legacy runtime shapes
(`tests/vitest/ui/{theme-editor,drawers,theme-profile-drawer,
theme-template-drawer-wave,theme-template-drawer-new-tokens}.test.tsx`,
`tests/vitest/admin/adminThemeClient.test.ts`). Runtime behavior is unchanged.

### Status / board

- L01–L07 and the **TASK-479-05** subtask are flipped to `✅ Done` (L02's status
  line, left as To Do though its code had shipped, is reconciled here).
- `_docs/_TASKS/README.md` board + statistics updated.

### Backward compatibility / security

No endpoint, RBAC, route, or cache-contract changes (visual restyle + docs/tests
only). The `admin_theme_templates.tokens` column stays `jsonb`; the new token
groups need no migration and old templates back-fill from the defaults.

## Tests

- `bun test tests/unit/adminThemes` — 27/27 pass (5 files).
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui tests/vitest/ui-integration tests/vitest/admin`
  — 432 files / 2002 tests pass.

## Validation

- `bun --cwd core lint` — clean.
- `bun --cwd core lint:types` — clean.
- `tsc -p tsconfig.json --noEmit` (repo-level, includes tests) — 0 errors.

## Deferred

- The LIVE single-window "dark recolors the real chrome" check is sequenced
  AFTER the TASK-479-06 chrome migration (an automated proxy is in place).
- An optional per-template `dark?: Partial<AdminThemeTokens>` set remains a
  purely-additive follow-up (the injected style already owns the dark block).
