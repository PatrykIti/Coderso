# TASK-480-02: Widget & Data-Source Contract
# FileName: TASK-480-02-Widget-And-Data-Source-Contract.md

**Parent Task:** TASK-480
**Priority:** High
**Category:** Admin / Dashboard / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** None (this is the foundation subtask the layout-persistence, data API, and admin-UI subtasks build on)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Define the **domain contract** that turns the fixed `DashboardPayload` blob into a
configurable widget/panel dashboard. This subtask owns the *shapes and the data*:
the widget/layout types, the schema-first validation + normalization, the
non-destructive legacy adapter, and the **data-source registry** that maps each
widget type to a resolver reading real CMS data. No HTTP routes, no persistence
table, and no React are introduced here — those are sibling subtasks
(`TASK-480-03` layout persistence + admin API, `TASK-480-04` widget renderers,
`TASK-480-05` admin builder UI). Everything authored here is the
single source of truth that those routes/components **re-export but never
re-declare**.

- **Goal:** Establish the canonical, schema-validated `DashboardLayout` /
  `DashboardWidget` contract and a pure resolver registry so every later layer
  (route, cache, UI) reads one owner instead of inventing parallel shapes.
- **Owning module/service:** `core/services/dashboard/*`
  (`dashboardTypes.ts`, new `dashboardWidgetContract.ts`,
  extended `dashboardService.ts`, new `dashboardDataSources.ts`).
- **Source-of-truth docs:** `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by
  `TASK-480-01-L02`, extended by this subtask), `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/RBAC_SPEC.md`, `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** persistence table + migration (`TASK-480-03`), the
  `/admin/api/dashboard/*` routes + cached client + cacheBus wiring
  (`TASK-480-03`), the widget renderers (`TASK-480-04`), the edit-mode builder /
  floating-panel UI (`TASK-480-05`), and the TASK-479 visual re-skin of the
  dashboard shell.

> **Naming note:** these are **admin Dashboard widgets** — configurable panels on
> the admin home surface. They are **DISTINCT from `core/widgets`** (the page /
> content widgets rendered on public pages). This contract must not import,
> extend, or alias the `core/widgets` catalog; the only overlap is conceptual.

---

## Security Contract

This subtask is **domain/service + tests only** — it adds no endpoint and no
permission model. It nonetheless encodes constraints the API subtask depends on:

- **Endpoint visibility:** n/a (no routes here; consumed by `internal`
  `/admin/api/*` routes in `TASK-480-03`).
- **Auth model:** n/a here. The contract assumes the calling route is
  session-authenticated.
- **RBAC:** n/a here. Document the intended split so the route subtask enforces
  it: **read/resolve widget data** → `content:read`; **persist layout** →
  the dedicated dashboard-layout write permission (`dashboard:write`) decided in
  `TASK-480-01-L02` and added/enforced by `TASK-480-03`.
- **CSRF / Rate-limit:** n/a (no writes here).
- **Validation:** `dashboardWidgetContract.ts` is the schema owner. It
  **rejects unknown fields** (`.strict()` / `assertAllowedKeys`) and exposes
  `normalizeDashboardLayout()`. No other module may parse raw layout input.
- **Anti-abuse:** the `content-query` resolver must **clamp** limit/offset and
  reject unsafe sources so a stored widget config can never run an unbounded or
  arbitrary query (see L02).
- **Secret handling:** resolvers project only already-safe dashboard data
  (counts, recent edits with PII-resolved author email via the existing
  `resolveEmailValue` seam, storage totals, security *summary*). They must not
  surface raw security settings, secrets, or credentials into any widget payload.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-480-02-L01 | Widget & Layout Types + Schema | ⏳ To Do |
| TASK-480-02-L02 | Data-Source Registry & Service | ⏳ To Do |
| TASK-480-02-L03 | Contract Tests (schema / normalize / legacy / resolvers) | ⏳ To Do |

**Dependency order:** L01 (types + schema + normalize + legacy adapter) →
L02 (registry + resolvers consume the L01 types) → L03 (tests cover both).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **Vitest (pure domain/service lane)** — new specs under `tests/vitest/services/`:
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgetContract.test.ts`
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardDataSourceRegistry.test.ts`
- No Bun route/DB suite is required *by this subtask* (no routes/DB here). The
  resolver shaping helpers are written DB-free / injectable so they run in
  Vitest; any DB-backed resolver integration is exercised later under
  `TASK-480-03`'s Bun route lane (`tests/integration/routes`, `tests/security`).
- Load env before any DB-touching test: `set -a && source .env && set +a`.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — record the widget-type enum, the
  `DashboardWidget` / `DashboardLayout` shapes, per-type config, default widget
  set, grid constants/clamps, and the resolver registry contract.
- `_docs/DATA_MODEL.md` — note the conceptual `DashboardLayout` document shape
  (the physical table lands in `TASK-480-03`).
- Task board index (`_docs/_TASKS/README.md`) — register `TASK-480-02` + leaves.
- Changelog — task-linked entry on closure.
- (No `_docs/CMS_API.md` / `_docs/ADMIN_CACHE*.md` change in *this* subtask —
  those belong to the route/cache subtask `TASK-480-03`.)

---

## Closure Checklist

- [ ] L01, L02, L03 all `✅ Done`.
- [ ] Schema rejects unknown fields and clamps grid/query; legacy/empty layout
      yields the documented DEFAULT widget set non-destructively.
- [ ] Registry has exactly one resolver per `DashboardWidgetType`; resolver
      output shapes match the documented `DashboardWidgetData` union.
- [ ] `_docs/DASHBOARD_WIDGETS_SPEC.md` + `_docs/DATA_MODEL.md` updated.
- [ ] Board index + changelog synced.
- [ ] Validation evidence (lint/types/vitest commands + results) recorded.
