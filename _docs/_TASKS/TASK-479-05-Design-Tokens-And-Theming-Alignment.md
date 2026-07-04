# TASK-479-05: Design Tokens & Theming Alignment
# FileName: TASK-479-05-Design-Tokens-And-Theming-Alignment.md

**Parent Task:** TASK-479
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Large
**Dependencies:** TASK-479 prototype (01–04)
**Status:** ✅ Done (2026-06-28; all seven leaves shipped — contract + emitter +
globals.css mapping + seeded "Soft Violet" default + editor controls + no-flash
dark toggle + docs/tests. Closure validation in the L07 changelog 1202.)

---

## Overview

Align the DB-backed **Admin UI Theme** token contract with the finished
visual-redesign prototype so the real admin can ship the "Soft & Friendly"
(Notion-like), **violet** look — warm neutrals, `rounded-2xl` cards, soft
shadows, light default + dark toggle.

- **Goal:** Extend the `AdminThemeTokens` contract and its CSS-variable pipeline
  to carry every token the prototype `theme.css` uses but the contract currently
  lacks (primary-soft + foreground; `state.info` + soft variants
  `success-soft`/`warning-soft`/`info-soft`; `sidebar.muted`/`accent`/
  `accentForeground`/`border`; effects shadows `soft`/`card`/`pop`; warm-neutral
  base + violet primary + Inter fonts), and add a **dark mode** layer (emitted as
  a `:root.dark{--admin-*}` block FROM the injected per-profile style so the real
  chrome — which reads `--admin-*` directly — recolors; see L01 decision). A fresh
  install must boot the violet/soft theme; existing custom templates must keep
  working unchanged.
- **Shared-token ownership (D3):** group 05 OWNS the token VALUES the shared
  primitives consume — `--primary-soft`, `--success`/`--warning`/`--info` (+ their
  `-soft`), `shadow-card`, `font-display`. The matching `soft`/`success`/
  `warning`/`info` Badge & Button variants that READ these are wired by the
  TASK-479-06-L02 shared pattern library (the Tabs underline variant is named
  `line`, not `underline`). Screen leaves reference these EXACT names ("token from
  479-05" / "variant from 479-06-L02") and must not re-invent divergent tokens.
- **Owning module/service:**
  - Contract + logic: `core/services/adminThemes/{tokenTypes.ts,tokenUtils.ts,tokenValidation.ts,adminThemeTemplateService.ts}`
  - CSS-var emitter: `core/ui/theme/tokenCss.ts` (`toAdminThemeCssVariables`
    incl. a dark `:root.dark` selector pass, `toAdminThemeCssVariableMap`)
  - Stylesheet mapping: `core/admin/styles/globals.css` (`@theme` + `:root`
    derivations from `--admin-*`; the dark `:root.dark{--admin-*}` is emitted by
    the injected style, NOT a static globals `.dark` — see L01/L03)
  - Runtime injection + toggle: `core/admin/app/AdminApp.tsx` (injects BOTH the
    light `:root{--admin-*}` and the dark `:root.dark{--admin-*}` blocks),
    `core/admin/ui/shared/TopBar.tsx`
  - Editor UI: `core/admin/ui/themes/ThemeTemplateDrawer.tsx` (real per-token
    pickers + live preview), `core/admin/ui/themes/ThemeTokensEditor.tsx`,
    `core/admin/ui/themes/ThemePreviewPanel.tsx`
  - Seed/default: `themes/admin-default/theme.json`, `core/db/seed.ts`
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`,
  prototype `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** Shell/topbar/sidebar structural restyle (TASK-479-06),
  per-page rollout (TASK-479-07), the SITE/front `DesignTokens` contract
  (`core/services/theme/tokenTypes.ts`) — this subtask only touches the
  **Admin UI Theme** token system. No endpoint, RBAC, route, or cache-contract
  changes.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The `admin_theme_templates.tokens` column
is `jsonb`; the token shape is enforced in the application layer
(`assertAdminThemeTokens`) — no DB schema migration is required for the added
token fields. Validation must keep rejecting unknown fields and must
non-destructively default old templates that predate the new groups.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-05-L01 | Token Gap Analysis & Inventory | ✅ Done |
| TASK-479-05-L02 | Extend AdminThemeTokens Type, Defaults, Normalize & Validation | ✅ Done |
| TASK-479-05-L03 | globals.css Mapping + :root + Dark Block | ✅ Done |
| TASK-479-05-L04 | admin-default Theme + DB Default Template | ✅ Done |
| TASK-479-05-L05 | Admin UI Theme Editor Controls for New Tokens | ✅ Done |
| TASK-479-05-L06 | Dark-Mode Toggle & Persistence in Admin Shell | ✅ Done |
| TASK-479-05-L07 | Token Docs & Tests | ✅ Done |

Implementation order: **L01 → L02 → L03 → (L04, L05, L06 in parallel) → L07**.
L01 is a read-only decision gate; nothing downstream may diverge from the
strategy it records.

---

## Testing Requirements

Every leaf runs the standard admin/UI lane (Bun-free Vitest per
`_docs/TESTING_STRATEGY.md`):

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/unit/adminThemes`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`

New suites land under `tests/unit/adminThemes/` (contract/normalize/validation/
CSS-emission), `tests/vitest/ui/` (theme editor controls — the ThemeTemplateDrawer
suites live here on disk) and `tests/vitest/ui-integration/` (dark toggle +
injected dark block). The AdminApp dual-block injection is asserted via the
existing `tests/vitest/admin/adminApp.test.tsx`. Use the repo idiom (happy-dom +
`createRoot`/`React.act`); the repo has no React-Testing-Library/jest-dom/
user-event. Do NOT move runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board buckets + statistics on every status
  change for this subtask and its leaves.
- Update `_docs/DESIGN_TOKENS.md` (new Admin UI Theme groups + a dark-mode
  section) — owned by L07.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** and the
  specific leaf id(s).
- Note the new design language in `_docs/THEMES_SPEC.md` admin-theme references
  if the token-pipeline description changes.

---

## Closure Checklist

- [x] All seven leaves `✅ Done`.
- [~] Fresh install renders violet/soft light theme; dark toggle works and
      persists with no SSR flash, and dark RECOLORS the real chrome (button +
      sidebar + topbar resolve dark `--admin-*`, not just the `.dark` class).
      Sequence the "dark works" gate AFTER the TASK-479-06 chrome migration.
      **Automated proxy in place** (`tests/vitest/ui-integration/admin-dark-mode.test.tsx`
      asserts the injected `:root.dark` block carries the real dark chrome hexes
      and that globals.css derives the shadcn vars FROM `--admin-*`); the LIVE
      single-window verification stays deferred to the post-TASK-479-06 gate (dev
      server not run in this leaf).
- [x] Pre-existing custom templates (without the new tokens) still load + render
      via defaults (covered by `mergeAdminThemeTokens`/`normalizeAdminThemeTokens`
      back-fill tests + the drawer legacy-template suite).
- [x] `_docs/DESIGN_TOKENS.md` + board + changelog synced.
- [x] Validation evidence (lint, types, vitest) recorded in the closeout (see
      changelog 1202).
