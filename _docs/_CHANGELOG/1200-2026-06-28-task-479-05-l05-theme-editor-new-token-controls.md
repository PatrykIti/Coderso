# 1200 - TASK-479-05-L05 Admin UI Theme Editor Controls for New Tokens

**Date:** 2026-06-28
**Version:** Unreleased
**Tasks:** TASK-479, TASK-479-05, TASK-479-05-L05

## Key Changes

### Admin UI Theme editor (per-token pickers + live preview)

The real per-token Admin-UI-Theme editor (`ThemeTemplateDrawer.tsx`) now exposes
**every** token added by TASK-479-05-L02 (the "Soft & Friendly" violet palette),
so operators can pick the new primary-soft surface, the `info` + soft status
colors, the new sidebar accents, and the elevation shadows — with the live
preview reflecting them and saves staying validated.

- **New "Accents" tab:** `primarySoft.bg` / `primarySoft.text` color pickers and
  three `effects.shadowSoft` / `shadowCard` / `shadowPop` text fields (shadows are
  CSS strings, edited via `TextField`, not `ColorField`). A `SoftAccentPreview`
  sample reads `var(--admin-primary-soft)` / `-soft-text` and
  `var(--admin-shadow-card)`.
- **Navigation tab** extended with `sidebar.muted` / `accent` / `accentForeground`
  / `border` pickers.
- **States tab** extended (grouped Solid / Foregrounds / Soft) with `state.info`,
  the four solid foregrounds (`success`/`warning`/`danger`/`info` Foreground), and
  the three softs (`successSoft`/`warningSoft`/`infoSoft`). `StatesPreview` gained
  an Info accent + a soft-chip row.
- **Live preview** needs no extra wiring: `previewStyle` already spreads
  `toAdminThemeCssVariableMap(tokens)`, which (post-L02) emits all the new
  `--admin-*` vars, so the preview surfaces inherit them and the new samples paint.
- **Invert affordance** extended: `invertNavigation` (+ new sidebar paths),
  `invertStates` (+ info / *Foreground / *Soft), and a new `invertAccents`
  (primarySoft only — shadows are strings, excluded from invert).

### Backward compatibility / security

- No endpoint, RBAC, route, or cache changes. Saves still flow through the
  existing `onSave → create/updateAdminThemeTemplate` path, which runs the
  L02-extended `assertAdminThemeTokens` — no validation bypass added.
- The drawer already initializes its token state via
  `mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, template?.tokens ?? null)`,
  so a pre-TASK-479-05 template (missing the new groups) back-fills from defaults,
  renders the new pickers, and persists a complete object that passes the strict
  validator.

### Scope notes

- Only `core/admin/ui/themes/ThemeTemplateDrawer.tsx` was touched.
  `ThemeTokensEditor.tsx` is the SITE `DesignTokens` JSON editor and
  `ThemePreviewPanel.tsx` is a static surface — neither edits `AdminThemeTokens`,
  so neither was modified (as the leaf's verified note predicted).

### Tests

- Added `tests/vitest/ui/theme-template-drawer-new-tokens.test.tsx` (repo idiom:
  happy-dom + `createRoot`/`React.act` + `vi.mock`ed primitives):
  1. every new picker label + the "Accents" tab trigger render;
  2. editing the new pickers updates both the live `--admin-*` preview var and the
     `onSave` payload, which then passes `assertAdminThemeTokens` (proving an old
     export without the new groups does not crash the editor).

## Validation

- `bun --cwd core lint` — clean.
- `bun --cwd core lint:types` — clean.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui` (theme
  suites): new-tokens (2) + drawer-wave (2) + tokens-editor (1) + theme-editor /
  -page-leaf / -leaf-components / themes (18) — all green, no regressions.
