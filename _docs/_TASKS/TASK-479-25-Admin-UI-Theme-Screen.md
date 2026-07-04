# TASK-479-25: Admin UI Theme Screen Migration
# FileName: TASK-479-25-Admin-UI-Theme-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin UI Theme
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Task:** TASK-479

---

## Overview

Restyle the real **Admin UI Theme** screen — the operator-facing surface that
creates theme templates and activates profiles for the admin panel — to the
finished visual-redesign prototype, while keeping every existing data hook,
template/profile persistence path, cache contract, and route helper intact. The
prototype (`_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx`) introduces the
soft & friendly (Notion-like) language — violet accent, `rounded-2xl` cards,
soft shadows, warm neutrals — composed of a `Palette` `PageHeader`, a **preset
row** of swatch cards (active card carries a `ring` + "Active" badge), a
two-column body with a **live mini-admin preview** (`SectionCard`) on the left
and a stacked **control panel** column on the right.

This subtask ports that *page chrome / preset row / preview / control-panel
layout* onto the REAL screen
(`core/admin/ui/themes/ThemesPage.tsx` + `ThemeTemplateCard` / `ThemeProfileCard`
plus a NEW `ThemeLivePreview` mini-admin). NOTE: `ThemesPage.tsx` does **not**
import or render `ThemePreviewPanel.tsx` today — that component is only rendered
by the unrouted `ThemeEditorPage` — so the live preview is a NEW dedicated
component modeled on the working mini-admin in `ThemeTemplateDrawer.tsx`
(lines 190-208); `ThemePreviewPanel.tsx` is left untouched and is NOT repurposed.
It does **not** re-implement per-token color pickers: the
new-token CONTROLS already land in `ThemeTemplateDrawer` via **TASK-479-05-L05**,
and the dark-mode toggle in **TASK-479-05-L06**. The real model is
template-then-profile CRUD (not the prototype's single "Save theme" mock), so the
prototype's accent/options/appearance control widgets map to the existing drawer
flow, not to fabricated inline state.

- **Goal:** Make the real Admin UI Theme screen match the prototype's modern
  layout — preset-style template/profile cards, a live mini-admin preview that
  reflects the active profile's tokens, and a `SectionCard`/`PageHeader` page
  chrome — without changing any data, route, RBAC, or cache behavior, and without
  duplicating the per-token pickers owned by TASK-479-05-L05.
- **Owning module/service:** `core/admin/ui/themes/` —
  `ThemesPage.tsx` (page chrome + preset/profile grids + live-preview layout),
  `ThemeTemplateCard.tsx` + `ThemeProfileCard.tsx` (preset-card visual),
  a NEW `ThemeLivePreview.tsx` (mini-admin live preview; modeled on the working
  mini-admin in `ThemeTemplateDrawer.tsx`, NOT the unrouted-only
  `ThemePreviewPanel.tsx`). Shared shell/patterns from TASK-479-06; token CSS +
  new-token pickers from TASK-479-05.
- **Source-of-truth docs:**
  - Prototype page: `_docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx`
  - Prototype primitives: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,SettingsSection}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,select,switch}.tsx`
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
  - Data + persistence contract: `core/admin/services/adminThemeClient.ts`
    (`AdminThemeTemplate`/`AdminThemeProfile`, `listAdmin*Cached`,
    `getCachedAdmin*`, `create/update*`, `activateAdminThemeProfile`),
    `core/services/adminThemes/tokenTypes.ts` (`DEFAULT_ADMIN_THEME_TOKENS`) +
    `core/services/adminThemes/tokenUtils.ts` (`mergeAdminThemeTokens`)
  - Live-preview painting helper: `core/ui/theme/tokenCss.ts`
    (`toAdminThemeCssVariableMap` — NOT in `tokenUtils.ts`; it emits ONLY
    `--admin-*`/`--font-*`/`--text-*` vars, so the preview markup must consume
    those via arbitrary-value utilities, e.g. `bg-[var(--admin-sidebar-bg)]`, and
    NOT shadcn `bg-background`/`bg-card`/`border-border`)
  - Shell/patterns landed by parent: TASK-479-06 (`AdminShell`, `PageHeader`,
    `SectionCard`, restyled `Card`/`Badge`/`Button`); tokens + new-token pickers +
    dark toggle: TASK-479-05 (L02/L03/L05/L06)
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane)
  - Existing suites: `tests/vitest/ui/themes.test.tsx`,
    `tests/vitest/ui/theme-leaf-components.test.tsx`
- **Out of scope:** No changes to `adminThemeClient` / theme routes / token
  contract; no new endpoints; the per-token color pickers for new tokens
  (TASK-479-05-L05) and the dark-mode toggle wiring (TASK-479-05-L06) are
  delivered by those leaves, not here; do NOT collapse template/profile CRUD into
  the prototype's single "Save theme" mock or fabricate inline accent/density
  state; `ThemeTemplateDrawer` / `ThemeProfileDrawer` / `ThemeExportDialog`
  internals are only touched insofar as the preset-card restyle requires
  (their token editors belong to TASK-479-05); `ThemePreviewPanel.tsx` (rendered
  only by the unrouted `ThemeEditorPage`) is NOT repurposed or modified here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The screen keeps `themes:read`/write RBAC,
the `adminThemeClient` persistence paths (`create/update/activate`), and the
`activeHref` + breadcrumbs wiring through the canonical sidebar href
(`/admin/themes` per `sidebarConfig.ts`) — never a newly hand-built href. The
template/profile cache contract (`getCachedAdmin*` hydrate,
`listAdmin*Cached({force})`, `subscribeCacheEvents` on
`adminThemeTemplatesList`/`adminThemeProfilesList`, `theme:updated` dispatch) is
preserved exactly.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-25-L01 | Theme Editor Page Restyle | ⏳ To Do |
| TASK-479-25-L02 | Theme Editor Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/themes.test.tsx tests/vitest/ui/theme-leaf-components.test.tsx`
- Keep the broader theme suites green (no contract drift):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/adminThemeClient.test.ts`
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics when the status
  of this subtask or its leaves changes.
- `_docs/_CHANGELOG/` — add an entry on closure, cross-linking `TASK-479` and
  `TASK-479-25` (plus the specific leaf id).
- If the Admin UI Theme screen's documented look changes in any UI/admin design
  doc under `_docs/UI/admin_panel/` (or `_docs/DESIGN_TOKENS.md` preview notes),
  record the new design language there.
