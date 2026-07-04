# TASK-479-07: Dashboard Screen Migration
# FileName: TASK-479-07-Dashboard-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Dashboard
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05 (tokens) · TASK-479-06 (shell) · TASK-480 (forward / non-blocking — Dashboard Widgets feature provides the configurable panels this shell will later host; not required to ship this re-skin)
**Status:** ✅ Done (2026-06-29)
**Parent Task:** TASK-479

---

## Overview

> **Scope note (re-skin vs feature):** This subtask is the dashboard **UI shell
> only** — restyle the screen and render whatever data exists today. The modern
> **configurable widget/panel system** (build dashboard panels from CMS data
> sources) is a separate full implementation in **TASK-480 (Dashboard Widgets &
> Configurable Panels)**. Once TASK-480 lands, this shell hosts its widget grid;
> until then, restyle the current fixed cards (totals/storage/security/recentEdits).

Restyle the real admin Dashboard to the finished visual-redesign prototype while
keeping every existing data hook, cache contract, and route helper intact. The
prototype Dashboard (`_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`) introduces
the soft & friendly (Notion-like) language — violet accent, `rounded-2xl` cards,
soft shadows, warm neutrals — composed from the shared primitives/patterns
(`PageHeader`, `StatCard` with sparkline, `SectionCard`, `AreaChart`/`Donut`
charts, `StatusBadge`, `Avatar`). This subtask ports that look onto
`core/admin/ui/dashboard/DashboardPage.tsx` and its child cards, mapping each
prototype section to a **real** data source (or an explicitly-marked placeholder
where no backing endpoint exists yet) — never fabricating metrics or API calls.

- **Goal:** Make the real Dashboard match the prototype's modern layout (stat-card
  grid with sparklines, content donut, recently-edited list, site health /
  security cards restyled as `SectionCard`s) without changing any data, route, or
  permission behavior.
- **Owning module/service:** `core/admin/ui/dashboard/` (`DashboardPage.tsx`,
  `StatCard.tsx`, `RecentEditsTable.tsx`, `SiteHealthCard.tsx`,
  `SecurityStatusCard.tsx`); shared shell/patterns from TASK-479-06.
- **Source-of-truth docs:**
  - Prototype source: `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`
  - Prototype primitives: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,SectionCard,charts,StatusBadge}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,avatar}.tsx`
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
  - Data contract: `core/services/dashboard/dashboardTypes.ts` (`DashboardPayload`)
  - Shell/patterns landed by parent: TASK-479-05 (tokens), TASK-479-06 (shell + shared `StatCard`/`SectionCard`/charts)
  - `_docs/TESTING_STRATEGY.md` (Vitest lane)
- **Out of scope:** No new analytics/metrics endpoints; no changes to
  `dashboardClient`/`DashboardPayload`; no new routes; the prototype-only
  decorative sections that have **no** real backing (traffic time-series, generic
  activity feed, "Your tasks", tip card) are NOT wired to fake data — they are
  either omitted or rendered as clearly-marked static placeholders with a
  follow-up note (see L01 mapping table). Theme tokens (TASK-479-05) and shell
  chrome (TASK-479-06) are delivered by those subtasks, not here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and admin paths). The Dashboard keeps `getDashboardData()` /
`DashboardPayload` exactly as-is; all in-page links continue to route through the
shared `AdminLink` (which canonicalizes its `href` via `resolveAdminHref` from
`@/utils/adminPaths`), never hand-built hrefs. (`adminPaths.ts` exports helper
functions like `resolveAdminHref`/`withAdminBasePath` — there is **no**
`adminPaths.dashboard()`/`.pages()` path-builder object to call.)

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-07-L01 | Dashboard Page Restyle | ⏳ To Do |
| TASK-479-07-L02 | Dashboard Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx`
- The existing `tests/vitest/admin/dashboardClient.test.ts` must stay green
  (unchanged data contract).
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics when the status
  of this subtask or its leaves changes.
- `_docs/_CHANGELOG/` — add an entry on closure, cross-linking `TASK-479` and
  `TASK-479-07` (plus the specific leaf id).
- If the Dashboard's documented look changes in any UI/admin design doc under
  `_docs/UI/admin_panel/`, note the new design language there.
