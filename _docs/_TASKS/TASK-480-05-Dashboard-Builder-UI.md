# TASK-480-05: Dashboard Builder UI (edit mode)
# FileName: TASK-480-05-Dashboard-Builder-UI.md

**Priority:** High
**Category:** Admin UI / Dashboard / Configurable Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-480-03 (layout routes + cached dashboard-layout client + cache contract) · TASK-480-04 (`DashboardWidgetHost`, widget UI registry) — which transitively depend on TASK-480-02 (domain/service contract + schema + data sources) and TASK-480-01 (widget product spec)
**Status:** ✅ Done
**Started:**
**Completed:** 2026-07-05
**Parent Task:** TASK-480

---

## Overview

Build the **admin Dashboard builder**: the edit-mode surface that turns the
restyled Dashboard shell (delivered by **TASK-479-07**) into a user-configurable
grid of widgets. The user toggles **Edit mode**, then **adds / removes / arranges
/ resizes** panels ("widgets"), each backed by a CMS **data source** (counters,
charts, recent activity, storage, site-health, quick actions, custom content
queries). Saving persists the layout through the cached client (`PUT` route from
TASK-480-03). Until Edit mode is toggled, the Dashboard renders the saved layout
read-only.

> **These are ADMIN DASHBOARD widgets** — instances of a saved dashboard layout
> that pull from CMS read models. They are **DISTINCT** from `core/widgets`
> (page/content widgets in the page builder) and from the Widget Library
> (`widgetCatalog:list`, TASK-479-22). This subtask never touches the page-widget
> system; it composes the dashboard widget UI registry from TASK-480-04.

This subtask owns only the **builder/edit-mode UX and its client wiring**. It does
NOT define the layout schema (TASK-480-02), the routes + cached client (TASK-480-03),
or the individual widget renderers / `DashboardWidgetHost`
(TASK-480-04); it consumes those contracts and must not fork them.

- **Goal:** A modern, accessible Dashboard builder hosted inside
  `core/admin/ui/dashboard/DashboardPage.tsx` — responsive widget grid, an Edit
  toggle that enables drag/arrange/resize with a keyboard-operable fallback,
  reducer-driven dirty state, an "Add widget" catalog, a floating per-widget
  configure panel (schema-driven, with live preview), and a Save path that writes
  through the cached client without mount-force refetch loops or dirty-state
  overwrites.
- **Owning module/service:** `core/admin/ui/dashboard/builder/*` (new) +
  integration into `core/admin/ui/dashboard/DashboardPage.tsx`.
- **Source-of-truth docs:**
  - Product/widget spec: `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by TASK-480-01-L02)
  - Layout contract: `core/services/dashboard/dashboardWidgetContract.ts`
    (widget + layout schema/types) + `dashboardTypes.ts` (types) — owned by
    TASK-480-02; this subtask re-uses, never re-declares
  - Cached client + keys: `core/admin/services/dashboardClient.ts`,
    `core/admin/services/cachePolicy.ts` (TASK-480-03); `_docs/ADMIN_CACHE.md`,
    `_docs/ADMIN_CACHE_MAP.md`
  - Widget host + UI registry/catalog:
    `core/admin/ui/dashboard/widgets/DashboardWidgetHost.tsx`,
    `core/admin/ui/dashboard/widgets/registry.tsx` (`DASHBOARD_WIDGET_RENDERERS`
    + `DASHBOARD_WIDGET_CATALOG`, TASK-480-04)
  - Floating-panel pattern: `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`,
    `_docs/PAGE_EDITOR_V2` floating-panel references; shared patterns from
    TASK-479-06 (`PageHeader`, `SectionCard`, `StatCard`, charts)
  - Routes/API: `_docs/CMS_API.md` (Dashboard widgets section, TASK-480-03)
  - RBAC: `_docs/RBAC_SPEC.md` (`content:read` for widget data; the dashboard
    layout write permission `dashboard:write`)
  - Testing lanes: `_docs/TESTING_STRATEGY.md`
- **Out of scope:** No schema/route/migration/cached-client definitions (schema →
  480-02; routes/migration/cached-client → 480-03); no widget renderer internals
  (480-04) or data-source aggregation (480-02); no changes to `core/widgets` /
  Widget Library; no new analytics/metrics endpoints beyond what 480-02/03 exposes.

---

## Security Contract

The builder is admin UI that consumes the internal admin Dashboard API (TASK-480-03; the domain contract/types it relies on are owned by TASK-480-02).
It introduces no new endpoints, but its client wiring MUST preserve the upstream
contract:

- **Endpoint visibility:** `internal` (consumes `/admin/api/dashboard/*` only).
- **Auth model:** session (admin), via the shared `apiClient`.
- **RBAC:**
  - Widget **data** reads require `content:read` (the existing Dashboard
    permission per `_docs/CMS_API.md`).
  - Layout **writes** (Save) require the dashboard layout write permission
    (`dashboard:write`, decided in TASK-480-01-L02 and added by TASK-480-03 in
    `_docs/RBAC_SPEC.md`). The
    builder must gate the Edit toggle and Save action client-side on that
    permission snapshot (hide/disable when absent) — defence-in-depth only; the
    route is the real boundary.
- **CSRF:** required on the layout `PUT` write; carried automatically by the shared
  admin `apiClient`. The builder must not bypass it with a raw `fetch`.
- **Rate-limit buckets:** `admin_read` for layout/widget-data GET reads and
  `admin_write` for layout writes/body POSTs (enforced at the route, TASK-480-03).
- **Validation:** schema is owned by 480-02's `dashboardWidgetContract.ts` (reject-unknown);
  the builder serializes a layout that already conforms and lets the route
  re-validate. The builder never sends fields the schema rejects.
- **Secret handling:** dashboard widget config/data carry no secrets; nothing
  secret-bearing enters browser cache, logs, or debug payloads. Widget config is
  IDs/enums/ranges only.

Per-leaf Security Contracts restate the slice each leaf relies on.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| TASK-480-05-L01 | `TASK-480-05-L01-Widget-Grid-And-Edit-Mode.md` | Widget grid + Edit mode (arrange/resize, dirty-state, Save) | ✅ Done |
| TASK-480-05-L02 | `TASK-480-05-L02-Add-Widget-Catalog-And-Configure-Panel.md` | Add-widget catalog + floating per-widget configure panel | ✅ Done |
| TASK-480-05-L03 | `TASK-480-05-L03-Builder-Tests.md` | Builder Vitest ui-integration (add/remove/arrange/save → dirty/cache) | ✅ Done |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI/ui-integration lane for the builder:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-builder.test.tsx`
- Keep `tests/vitest/ui/dashboard.test.tsx` (TASK-479-07-L02) and
  `tests/vitest/admin/dashboardClient.test.ts` (TASK-480-03) green —
  the builder reuses, not forks, those contracts.
- (Cross-subtask) the route/security Bun suites for the layout endpoints live in
  TASK-480-03 (480-03-L05); this subtask mocks them at the client boundary and does
  not re-run them, but must not regress them.
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — add the **Builder / edit-mode UX** section
  (Edit toggle, arrange/resize model + a11y fallback, Add-widget catalog, configure
  panel, Save/dirty semantics).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — note the Dashboard builder
  hydrate-from-cache → background-revalidate → dirty-guarded-save behavior for
  `dashboard:layout` (the keys themselves are added by TASK-480-03; the builder
  documents its consumer policy).
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-05`.

---

## Closure Checklist

- [ ] All three leaves `✅ Done` (or terminal).
- [ ] Builder hosted in `DashboardPage.tsx`; Edit toggle gated on `dashboard:write`.
- [ ] Save writes through the cached client (`PUT`), patches `dashboard:layout`
      cache, broadcasts cacheBus update; no mount-force refetch loop; dirty edits
      never overwritten by background revalidation.
- [ ] Vitest builder suite green; existing dashboard suites green.
- [ ] Spec + cache docs + board + changelog updated.
