# TASK-480-03: Layout Persistence & API
# FileName: TASK-480-03-Layout-Persistence-And-API.md

**Parent Task:** TASK-480
**Priority:** High
**Category:** `dashboard` / `persistence-api`
**Estimated Effort:** Large
**Dependencies:** TASK-480-02 (widget/layout schema contract + data-source resolvers). This subtask owns the **layout repository, the internal admin API + cache**; it composes — does not redefine — the widget/layout schema + per-widget resolvers owned by 480-02. The layout-envelope schema itself is owned by 480-02 (`dashboardWidgetContract.ts`) and re-exported here, never re-declared.
**Status:** ✅ Done
**Started:**
**Completed:** 2026-07-05
---

## Overview

This subtask makes the configurable admin dashboard **durable and serveable**. It
provides the storage layer for a per-user dashboard layout, the internal admin
API to read/save that layout, the batched route that resolves live data for the
layout's widgets, and the admin cache wiring (keys/TTL/cacheBus) the builder UI
reads through.

- **Goal:** Persist a per-user dashboard layout (an ordered/sized set of
  **admin dashboard widget instances** — DISTINCT from `core/widgets` page/content
  widgets), serve it and its resolved widget data over internal admin routes, and
  cache it end-to-end so the builder hydrates instantly and revalidates in the
  background without mount-force refetch loops or dirty-state overwrites.
- **Owning module/service:** `core/services/dashboard/*`
  (`dashboardLayoutRepository.ts` — DB read/write, `dashboardLayoutService.ts` —
  read/write/reset orchestration + the route-facing `DashboardLayoutError` /
  `dashboard_layout_invalid` code; the layout-envelope **schema/normalize/defaults**
  are owned by 480-02 in `dashboardWidgetContract.ts` and re-exported, never
  re-declared), `core/server/routes/dashboardRoutes.ts` (orchestration-only),
  `core/admin/services/dashboardClient.ts` (cached client).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/RBAC_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/ADMIN_CACHE.md`,
  `_docs/ADMIN_CACHE_MAP.md`, `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by
  TASK-480-01-L02), `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** widget/layout schema + per-widget config schemas and the
  widget data-source resolvers themselves (480-02); the widget renderers
  (480-04); the edit-mode builder UI and floating-panel interactions (480-05);
  the dashboard shell re-skin (TASK-479-07). This subtask only **stores, serves,
  and caches**.

---

## Security Contract

This subtask adds internal admin endpoints under `/admin/api/dashboard/*` and a
new DB table, so a real contract is required (per-leaf contracts refine this).

- **Endpoint visibility:** `internal` — all routes mount under `/admin/api/*`
  (the admin `apiClient` prefixes `/admin/api`; route files use bare paths such
  as `/dashboard/layout`). No public/anonymous surface is added.
- **Auth model:** session (admin session cookie). No API-key scope is exposed.
- **RBAC:**
  - **Read** layout + widget data: `content:read` (matches the existing
    `GET /dashboard` gate in `core/server/routes/dashboardRoutes.ts`).
  - **Write** layout (`PUT /dashboard/layout`, reset): a dedicated
    **`dashboard:write`** permission added to the catalog (granted to Admin by
    default; see L02). Reuse of `settings:write` is rejected — the layout is a
    per-user personalization, not a system/security setting.
- **CSRF:** required for every admin write (`PUT`, reset). Enforced centrally by
  `core/server/middleware/csrf.ts`; routes must not bypass it.
- **Rate-limit buckets:** `admin_read` for admin GET reads
  (`/dashboard`, `/dashboard/layout`, `/dashboard/widget-data`) and
  `admin_write` for admin writes/body POSTs (`PUT /dashboard/layout`,
  `POST /dashboard/layout/reset`, `POST /dashboard/widget-data`), matching
  `core/server/httpServer.ts`.
- **Validation:** schema-first, **reject unknown fields**. The layout envelope
  schema is owned by 480-02 (`core/services/dashboard/dashboardWidgetContract.ts`)
  and re-exported here; route-side validation schemas in
  `core/server/validation/dashboardSchemas.ts` re-export that owner (never
  re-declare). Per-widget `config` validation is delegated to the 480-02 contract
  (`normalizeDashboardWidgetConfig(type, config)`); unknown widget `type` is
  rejected. Domain errors are mapped to transport errors only at the route
  boundary via `mapDashboardError` (`ApiError` from `../errorHandler`).
- **Anti-abuse:** widget-instance count is capped (`DASHBOARD_MAX_WIDGETS`), and
  the batched widget-data request caps the number of resolved instances; data
  resolvers run under the caller's `content:read` scope only.
- **Secret handling:** the layout stores presentation/config only — never
  credentials, tokens, or raw security settings. Resolved widget data is the same
  read-model already exposed by `getDashboardData()` (totals/storage/recent/
  security-summary) plus content counts; no secret reaches the client cache,
  logs, or debug payloads. The cached client persists layout + non-secret widget
  data only.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 480-03-L01 | `TASK-480-03-L01-Layout-Storage-And-Migration.md` | Layout Storage & Migration | ✅ Done |
| 480-03-L02 | `TASK-480-03-L02-Layout-Routes.md` | Layout Routes (GET/PUT) | ✅ Done |
| 480-03-L03 | `TASK-480-03-L03-Widget-Data-Route.md` | Batched Widget-Data Route | ✅ Done |
| 480-03-L04 | `TASK-480-03-L04-Cached-Client-And-CacheBus.md` | Cached Client & CacheBus | ✅ Done |
| 480-03-L05 | `TASK-480-03-L05-Route-And-Security-Tests.md` | Route & Security Tests | ✅ Done |

**Implementation order:** L01 (schema/storage) → L02 (layout routes) →
L03 (widget-data route) → L04 (cached client/cacheBus) → L05 (route + security
test lanes). L04 depends on L02/L03 endpoints existing; L05 gates the whole
subtask.

---

## Testing Requirements

Run from the repository root unless noted. Load DB env before any DB-backed test:
`set -a && source .env && set +a`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **Bun (routes/integration/security/perf lanes):**
  - `bun test tests/integration/routes/dashboard.test.ts` (registration + RBAC +
    CSRF + reject-unknown + `mapDashboardError`).
  - `bun test tests/integration/routes/dashboardLayout.test.ts` (DB-backed
    read/write round-trip, per-user isolation).
  - `bun test tests/security/codersoSecurityGate.test.ts` (route appears under the
    correct visibility/permission buckets).
- **Vitest (pure domain/services + admin UI):**
  - `bun --cwd core test:vitest -- dashboardLayout` (schema normalize/reject,
    defaults, widget cap, migration of legacy/empty layout).
  - `bun --cwd core test:vitest -- dashboardClient` (cache keys/TTL, cacheBus
    invalidation on save, hydrate-then-revalidate, no mount-force refetch).

State explicitly in the closeout if any DB lane was skipped (e.g. no database
available) and why.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — new `dashboard_layouts` table (L01).
- `_docs/CMS_API.md` — `GET/PUT /admin/api/dashboard/layout`,
  `GET /admin/api/dashboard/widget-data` (L02/L03).
- `_docs/RBAC_SPEC.md` + `core/services/admin/permissionsCatalog.ts` +
  `core/admin/ui/roles/permissionCatalog.ts` — new `dashboard:write` permission
  (L02).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — dashboard layout +
  widget-data cache keys, TTL, cacheBus, hydration policy (L04).
- `_docs/DASHBOARD_WIDGETS_SPEC.md` — extend with the persistence + API section
  (cross-link the widget/layout schema contract owned by 480-02).
- Task board index + statistics; changelog entry on closure.

---

## Closure Checklist

- [ ] All five leaves `✅ Done` (or terminal).
- [ ] Migration artifacts committed (SQL + `meta/*_snapshot.json` + `_journal.json`).
- [ ] `dashboard:write` present in permission catalog + RBAC docs + admin seed.
- [ ] Cache contract documented in `ADMIN_CACHE*.md`.
- [ ] Bun route/security + Vitest domain/UI lanes green (or skips justified).
- [ ] Board + changelog synced.
