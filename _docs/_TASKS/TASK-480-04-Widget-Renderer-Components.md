# TASK-480-04: Widget Renderer Components
# FileName: TASK-480-04-Widget-Renderer-Components.md

**Priority:** High
**Category:** Admin UI / Dashboard / Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-480-02 (widget schema + domain contract types + the per-widget `DashboardWidgetData` union) · TASK-479-06-L02 (shared pattern library: `SectionCard`, `StatCard`, `charts`, `StatusBadge`, `EmptyState`, `DataTable`)
**Status:** ✅ Done
**Completed:** 2026-07-05
**Parent Task:** TASK-480

---

## Overview

This subtask delivers the **presentation layer** of the configurable admin
dashboard: a typed renderer **registry** that maps each `DashboardWidgetType` to
a React component, a `<DashboardWidgetHost>` that selects the renderer and owns
the loading / empty / error chrome, and the **core renderer family** (Stat,
Chart, RecentActivity, ContentTypeCount, Storage, SiteHealth, QuickActions,
ContentQuery). Every renderer is **schema-driven** — it reads the validated
`widget.config` and the normalized `DashboardWidgetData` it is handed — and is
**purely presentational** (no fetching, no global state, no effects). The visual
language is the TASK-479 prototype (token-styled `SectionCard`/`StatCard`/charts
from the shared pattern library), so a widget grid reads as one cohesive surface.

> **Disambiguation (state in every child file):** these are **admin Dashboard
> widgets** — panels on the admin home screen sourced from CMS data — and are
> **DISTINCT** from `core/widgets/*` (the page/content widgets used inside the
> page & content editors). This unit lives under
> `core/admin/ui/dashboard/widgets/` and never imports from `core/widgets/*`.

- **Goal:** Given a validated `DashboardWidget` and its `DashboardWidgetData`,
  render the correct token-styled panel with first-class loading / empty / error
  states, so the layout/builder (TASK-480-05) only has to place hosts in a grid.
- **Owning module/service (as-built, flat — no `widgets/` subdir):**
  `core/admin/ui/dashboard/widgetRegistry.ts` (registry + catalog),
  `core/admin/ui/dashboard/widgetRenderers.tsx` (the 9 renderers +
  `UnavailableWidget` + `WidgetRenderer` type), and
  `core/admin/ui/dashboard/DashboardWidgetHost.tsx` (dispatch + edit chrome).
- **Source-of-truth docs:**
  - `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by TASK-480-01-L02; this unit
    extends it with the "Renderer catalog & states" section).
  - Widget contract: `core/services/dashboard/dashboardTypes.ts` (types) +
    `dashboardWidgetContract.ts` (schema) — owned by TASK-480-02; this unit
    imports, never redefines, the type enum / config / data union.
  - Shared patterns: `core/admin/ui/shared/{SectionCard,StatCard,Charts,StatusBadge,EmptyState,DataTable}.tsx` (TASK-479-06-L02).
  - Prototype reference: `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`,
    `_docs/_PROTOTYPE/src/components/patterns/{charts,SectionCard,StatCard}.tsx`.
  - Legacy cards being generalized: `core/admin/ui/dashboard/{StatCard,SiteHealthCard,SecurityStatusCard,RecentEditsTable}.tsx`.
  - `_docs/TESTING_STRATEGY.md` (Vitest UI lane).
- **Out of scope:** Defining/validating the widget schema or data union (→ 480-02);
  fetching widget data, cached client, cacheBus (→ 480-03); the
  edit-mode builder, grid layout, drag/resize, add/remove (→ 480-05); the
  dashboard route/page that assembles hosts into a grid (→ 480-05). This unit
  only turns `{widget, data}` into pixels.

---

## Security Contract

- **Endpoint visibility:** n/a — this unit ships **presentational React
  components only**; it registers no routes and performs no network I/O.
- **Auth model / RBAC / CSRF / Rate-limit:** n/a in this unit, but the data these
  renderers display **originates** from the internal admin widget-data endpoints
  added in TASK-480-03 (`/admin/api/dashboard/widget-data`), which require a
  **session**, RBAC `content:read` for widget data (and `dashboard:write` for
  layout writes), **CSRF** on layout writes/body POSTs, `admin_read` for GET
  reads, and `admin_write` for writes/body POSTs. Renderers MUST assume their
  `data` prop is already validated + redacted by that pipeline and add no trust
  of their own.
- **Validation:** schema ownership stays in `core/services/dashboard/*`
  (TASK-480-02). Renderers consume the **already-normalized** discriminated
  union; they never re-parse raw input and never accept unknown fields.
- **Secret handling:** renderers MUST NOT render or log secrets/PII beyond what
  the redacted `DashboardWidgetData` already contains; any rich/HTML content
  (e.g. a `contentQuery` cell) is rendered as **text** (no
  `dangerouslySetInnerHTML` for untrusted values).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-480-04-L01 | Widget Renderer Registry + `DashboardWidgetHost` (loading/empty/error) | ✅ Done |
| TASK-480-04-L02 | Core Widget Renderers (Stat, Chart, RecentActivity, ContentTypeCount, Storage, SiteHealth, QuickActions, ContentQuery) | ✅ Done |
| TASK-480-04-L03 | Renderer & Registry Render-State Tests (Vitest) | ✅ Done |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/dashboardWidgetRegistry.test.ts`
- Existing dashboard suites must stay green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx tests/vitest/ui/stat-card.test.tsx`
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — add a "Renderer catalog & states" section:
  the registry map, the host's loading/empty/error/mismatch states, and the
  per-renderer data → visual mapping (one row per `DashboardWidgetType`).
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure cross-linking `TASK-480` +
  `TASK-480-04` (and the specific leaf id).
- No `_docs/CMS_API.md` / `_docs/ADMIN_CACHE*.md` / `_docs/DATA_MODEL.md` change
  in this unit (no routes, cache, or DB) — those belong to TASK-480-02/03.
