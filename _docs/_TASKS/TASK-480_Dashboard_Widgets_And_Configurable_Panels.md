# TASK-480: Dashboard Widgets & Configurable Panels
# FileName: TASK-480_Dashboard_Widgets_And_Configurable_Panels.md

**Priority:** High
**Category:** Admin UI / Dashboard / Feature
**Estimated Effort:** Very Large
**Dependencies:** TASK-479-05 (admin tokens) + TASK-479-06 (admin shell + shared `StatCard`/`SectionCard`/charts) — recommended so the widgets inherit the redesigned visual language, but the feature can land independently against the current primitives.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD, set when work begins>`
**Completed:** `<YYYY-MM-DD, set at closure>`

---

## Overview

Today the admin Dashboard is a **fixed blob**. `getDashboardData()`
(`core/services/dashboard/dashboardService.ts`) returns one hard-coded
`DashboardPayload` (`core/services/dashboard/dashboardTypes.ts`) —
`{ generatedAt, totals{pages,entries,media,users}, storage, security,
recentEdits }` — served by `GET /admin/api/dashboard`
(`core/server/routes/dashboardRoutes.ts`) and consumed by a single non-editable
screen (`core/admin/ui/dashboard/DashboardPage.tsx`). The user cannot add,
remove, rearrange, resize, or configure anything.

This task turns the Dashboard into a **modern, configurable widget/panel
surface**. The user composes the dashboard from **panels ("widgets")** that each
pull from a **CMS data source** — counters (totals, per-content-type counts),
charts (content over time, content breakdown), recent activity, storage usage,
site-health/security, quick actions, and custom content queries. An **edit mode**
(the floating-panel builder pattern from `_docs/_PROTOTYPE`) lets the user add
panels from a catalog, drag/arrange/resize them on a grid, configure each via a
floating panel, and save the layout. The visual language is the TASK-479
prototype (`StatCard` with sparkline, `AreaChart`/`Donut`, `SectionCard`).

- **Goal:** Replace the fixed dashboard payload/screen with a configurable
  widget dashboard driven by CMS data sources, with an edit-mode builder.
- **Owning module/service:** `core/services/dashboard/*` (domain contracts,
  schemas, data-source services), `core/server/routes/dashboardRoutes.ts`
  (orchestration-only routes), `core/admin/services/dashboardClient.ts` +
  cache wrappers, `core/admin/ui/dashboard/*` (renderers + builder UI).
- **Source-of-truth docs:** `_docs/DASHBOARD_WIDGETS_SPEC.md` (NEW — created by
  this task), `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`, `_docs/RBAC_SPEC.md`,
  `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md`, `_docs/TESTING_STRATEGY.md`,
  prototype: `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`.
- **Out of scope:** Public-site widgets and the page/content widget system in
  **`core/widgets/*`** (page-builder blocks) — those are a DIFFERENT subsystem
  and are NOT touched here. Analytics ingestion/instrumentation (we only read
  existing CMS data). Cross-user sharing/marketplace of dashboards.

### Relationship to TASK-479-07 (UI shell only)

`TASK-479-07` (Dashboard Screen Migration) is a **re-skin only**: it restyles the
current fixed cards to the prototype look and renders whatever data exists today.
**TASK-480 is the feature counterpart** that produces the actual configurable
widget/panel system. Once TASK-480 lands, the TASK-479-07 shell hosts this
task's widget grid; until then they are independent (479-07 can ship the static
restyle, 480 then replaces the body with the builder). The two tasks already
cross-reference each other (`TASK-479-07-Dashboard-Screen.md`).

### Distinction: admin dashboard widgets ≠ page widgets

The "widgets" in this task are **admin Dashboard panels** — UI cards that
visualize CMS data inside `/admin`. They are **distinct from `core/widgets/*`**,
which are page-builder content blocks rendered on the public site. To avoid
collision, all new types/files in this task are namespaced under
`dashboard*` (e.g. `DashboardWidgetType`, `dashboardWidgetSchema`,
`core/services/dashboard/widgets/*`), never under `core/widgets/*`.

---

## Security Contract (overview)

Per-leaf Security Contracts are authoritative; this is the umbrella summary.

- **Endpoint visibility:** `internal` — all routes under `/admin/api/*`
  (mounted via `core/server/routes/index.ts`). No public surface.
- **Auth model:** session cookie (httpOnly), same as the existing
  `GET /admin/api/dashboard`.
- **RBAC:**
  - **Widget DATA reads** require `content:read` (matches the current dashboard
    route `requirePermission("content:read")`). Data-source services that read
    other domains (e.g. media/storage, security settings) must NOT leak data the
    caller cannot already read via that permission; sensitive reads gate on the
    domain permission they belong to.
  - **Layout reads/writes:** the **per-user** layout is a personal preference
    (session-scoped, no extra RBAC — mirrors `/admin/api/user-settings`). The
    optional **per-site default** layout is admin-managed and requires
    `settings:write` (a new `dashboard:write` permission MAY be introduced in
    `_docs/RBAC_SPEC.md` if the team prefers a dedicated scope — decided in
    TASK-480-01-L02 / TASK-480-03).
- **CSRF:** required for every admin write (layout PUT/PATCH, reset) via
  `X-CSRF-Token` (`apiRequest(..., { withCsrf: true })`).
- **Rate-limit bucket:** `admin`.
- **Validation:** schema-first, reject-unknown-fields. All widget/layout schemas
  + enums + defaults are owned in `core/services/dashboard/*`; routes re-export
  but never re-declare them. Normalization via explicit `normalize*` helpers.
- **Secret handling:** no secrets/keys/PII in widget payloads, client cache, or
  logs. Author emails in activity widgets continue to flow through
  `resolveEmailValue` / `piiEmail` exactly as `dashboardService.ts` does today.

---

## Sub-Tasks

| Subtask | Title | Status |
|---------|-------|--------|
| TASK-480-01 | Feature-Completeness Audit & Widget Product Spec | ⏳ To Do |
| TASK-480-02 | Widget & Data-Source Contract | ⏳ To Do |
| TASK-480-03 | Layout Persistence & API | ⏳ To Do |
| TASK-480-04 | Widget Renderer Components | ⏳ To Do |
| TASK-480-05 | Dashboard Builder UI (edit mode) | ⏳ To Do |
| TASK-480-06 | Docs, Gates & Closure | ⏳ To Do |

**Subtask intent (one line each):**

- **01 — Audit & Spec:** read-only audit of every admin screen (Complete /
  Partial / Stub) so the team knows which TASK-479 subtasks are pure re-skin vs
  need a sibling feature; plus the authoritative widget catalog + layout +
  edit-mode UX product spec.
- **02 — Widget & Data-Source Contract:** Zod-or-equivalent schemas for widget
  types/config + layout, and the server data-source services (counters, charts,
  activity, storage, security, content-query) with a single batch data route.
- **03 — Layout Persistence & API:** storage for the per-user (and optional
  per-site default) layout, `GET`/`PUT` layout routes, end-to-end cache contract
  (key/TTL, cached client wrapper, cacheBus invalidation, hydrate +
  background revalidate, no mount-force loops, no dirty-state overwrite).
- **04 — Widget Renderer Components:** one admin renderer per widget type built
  from the shared prototype primitives; loading/empty/error states; no fabricated
  metrics.
- **05 — Dashboard Builder UI:** edit-mode grid (add from catalog,
  drag/arrange/resize), per-widget config via the floating-panel pattern, save /
  discard / reset, dirty-state protection.
- **06 — Docs, Gates & Closure:** `_docs/DASHBOARD_WIDGETS_SPEC.md`, CMS_API,
  ADMIN_CACHE*, DATA_MODEL (if DB), board + changelog; final gate matrix.

---

## Testing Requirements

Lanes per `_docs/TESTING_STRATEGY.md`. Load DB env before any DB-backed test:
`set -a && source .env && set +a`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **Bun (routes / integration / security / perf):**
  - `bun --cwd core test tests/integration/routes/dashboardWidgets*.test.ts`
    (route registration, auth/RBAC/CSRF, schema reject-unknown, error mapping,
    data-source aggregation).
  - `bun --cwd core test tests/security/dashboardWidgets*.test.ts`
    (permission gating, no-PII/secret leakage, CSRF-required on writes,
    rate-limit bucket).
- **Vitest (pure domain/services + admin UI):**
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgets*.test.ts`
    (schema normalization, defaults, limits, layout normalization, legacy
    adapters).
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard*.test.tsx`
    (renderers, builder hydration, dirty-state protection, edit-mode flows).
  - The existing `tests/vitest/admin/dashboardClient.test.ts` must stay green
    until its contract is intentionally migrated.
- State clearly in each closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — **create** (catalog, data sources, layout
  model, edit-mode UX, per-user vs per-site decision).
- `_docs/CMS_API.md` — document new `/admin/api/dashboard/*` routes (widget data
  + layout).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cache keys/TTL,
  cached client wrapper, cacheBus topics, and the Dashboard route→files→cached
  APIs entry.
- `_docs/DATA_MODEL.md` — if a layout table/column is added (DB artifacts:
  SQL migration + `meta/<idx>_snapshot.json` + `meta/_journal.json`).
- `_docs/RBAC_SPEC.md` — only if a dedicated `dashboard:write` permission is
  introduced.
- `_docs/_TASKS/README.md` — board bucket + statistics on every status change.
- `_docs/_CHANGELOG/` — task-linked entry on closure (cross-link `TASK-480` +
  the leaf id).

---

## Closure Checklist

- [ ] All TASK-480-01..06 subtasks `✅ Done` / `⏭️ Superseded` / `❌ Cancelled`.
- [ ] No open child left under this task.
- [ ] `_docs/DASHBOARD_WIDGETS_SPEC.md` created and matches shipped code.
- [ ] CMS_API / ADMIN_CACHE* / DATA_MODEL / RBAC docs synced to shipped contract.
- [ ] Board index + statistics synced; changelog entry added and cross-linked.
- [ ] Full gate matrix (lint, types, Bun route+security, Vitest domain+UI)
      recorded in the closeout with results.
