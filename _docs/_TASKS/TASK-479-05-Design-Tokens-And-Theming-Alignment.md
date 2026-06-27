# TASK-479-05: Design Tokens & Theming Alignment
# FileName: TASK-479-05-Design-Tokens-And-Theming-Alignment.md

**Parent Task:** TASK-479
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Large
**Dependencies:** TASK-479 prototype (01–04)
**Status:** ⏳ To Do

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
  base + violet primary + Inter fonts), and add a **dark mode** layer. A fresh
  install must boot the violet/soft theme; existing custom templates must keep
  working unchanged.
- **Owning module/service:**
  - Contract + logic: `core/services/adminThemes/{tokenTypes.ts,tokenUtils.ts,tokenValidation.ts,adminThemeTemplateService.ts}`
  - CSS-var emitter: `core/ui/theme/tokenCss.ts` (`toAdminThemeCssVariables`,
    `toAdminThemeCssVariableMap`)
  - Stylesheet mapping: `core/admin/styles/globals.css` (`@theme` + `:root` + new `.dark`)
  - Runtime injection + toggle: `core/admin/app/AdminApp.tsx`,
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
| TASK-479-05-L01 | Token Gap Analysis & Inventory | ⏳ To Do |
| TASK-479-05-L02 | Extend AdminThemeTokens Type, Defaults, Normalize & Validation | ⏳ To Do |
| TASK-479-05-L03 | globals.css Mapping + :root + Dark Block | ⏳ To Do |
| TASK-479-05-L04 | admin-default Theme + DB Default Template | ⏳ To Do |
| TASK-479-05-L05 | Admin UI Theme Editor Controls for New Tokens | ⏳ To Do |
| TASK-479-05-L06 | Dark-Mode Toggle & Persistence in Admin Shell | ⏳ To Do |
| TASK-479-05-L07 | Token Docs & Tests | ⏳ To Do |

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
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`

New suites land under `tests/unit/adminThemes/` (contract/normalize/validation/
CSS-emission) and `tests/vitest/admin` + `tests/vitest/ui-integration`
(editor controls, dark toggle). Do NOT move runtime tests into Vitest for
coverage.

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

- [ ] All seven leaves `✅ Done`.
- [ ] Fresh install renders violet/soft light theme; dark toggle works and
      persists with no SSR flash.
- [ ] Pre-existing custom templates (without the new tokens) still load + render
      via defaults.
- [ ] `_docs/DESIGN_TOKENS.md` + board + changelog synced.
- [ ] Validation evidence (lint, types, vitest) recorded in the closeout.
