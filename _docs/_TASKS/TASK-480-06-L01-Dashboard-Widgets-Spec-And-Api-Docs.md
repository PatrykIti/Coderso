# TASK-480-06-L01: Dashboard Widgets Spec & API Docs
# FileName: TASK-480-06-L01-Dashboard-Widgets-Spec-And-Api-Docs.md

**Parent Subtask:** TASK-480-06
**Priority:** Medium
**Category:** Admin UI / Dashboard Widgets / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-480-01 (audit + product spec), TASK-480-02 (schema/service contract), TASK-480-03 (DB + routes + cache), TASK-480-04 (renderers), TASK-480-05 (UI) — all must be implemented (or frozen contracts) before the docs can describe them accurately
**Status:** ⏳ To Do

---

## Overview

Author the source-of-truth documentation for the Dashboard Widgets feature and
synchronize every contract doc it touches. The centerpiece is a new
`_docs/DASHBOARD_WIDGETS_SPEC.md` (widget catalog, data sources, layout model,
edit-mode UX, persistence, RBAC, cache). The rest are precise edits to existing
contract docs so the new routes, cached resource, DB table, and repo index are
discoverable and consistent with what TASK-480-01..05 shipped.

- **Goal:** A reader (human or assistant) can understand and safely extend the
  Dashboard Widgets system from `_docs/` alone — the catalog, the layout schema,
  the API surface, the cache contract, the persistence model, and the RBAC gates
  are all written down and cross-linked, matching the code exactly.
- **Owning module/service:** `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by
  480-01-L02, extended by 02/03/04/05; finalized here), with
  synchronized edits to `_docs/CMS_API.md`, `_docs/ADMIN_CACHE.md`,
  `_docs/ADMIN_CACHE_MAP.md`, `_docs/DATA_MODEL.md`, and `AGENTS.md`.
- **Source-of-truth docs (the code these docs must mirror):**
  - Schema/service owner: `core/services/dashboard/*` (extended by TASK-480-02 —
    `dashboardTypes.ts`, the new `dashboardWidgetContract.ts` schema + `normalize*`
    helpers, `dashboardService.ts` + `dashboardDataSources.ts` data-source resolvers).
  - Existing baseline contract: `core/services/dashboard/dashboardTypes.ts`
    (`DashboardPayload`), `core/services/dashboard/dashboardService.ts`
    (`getDashboardData`), `core/admin/services/dashboardClient.ts`.
  - Routes: the internal admin routes registered by TASK-480-03.
  - Cache: the cached client + keys/TTL added by TASK-480-03.
  - DB: the layout table + migration artifacts added by TASK-480-03.
  - UI: `core/admin/ui/dashboard/*` widget grid + edit-mode builder from
    TASK-480-05; visual language from `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`
    (`StatCard` / `AreaChart` / `Donut` / `SectionCard`) and the floating-panel
    builder pattern from `_docs/_PROTOTYPE`.
  - Format rules: `AGENTS.md`, `_docs/_TASKS/EXAMPLE_TASK.md`.
- **Out of scope:** No code, schema, route, cache, DB, or UI changes. No changelog
  / board edits (that is TASK-480-06-L02). This leaf only writes/edits docs. If the
  code and the intended doc disagree, stop and route the gap to the owning leaf —
  do not "fix" it in prose.

---

## Security Contract

No endpoint or permission model changes. Docs-only. This leaf **describes** the
security contract that TASK-480-01..05 implemented; it must describe it accurately
and must never weaken it in prose:

- **Endpoint visibility:** internal admin (`/admin/api/*`).
- **Auth model:** session.
- **RBAC:** widget **data** reads require `content:read`; dashboard **layout**
  reads require `content:read` and **writes** require the dedicated
  `dashboard:write` permission (added by 480-03 — confirm against the registered
  routes before writing; `settings:write` is explicitly NOT reused).
- **CSRF:** required for every admin layout write.
- **Rate-limit bucket:** `admin`.
- **Validation:** schema owner in `core/services/dashboard/*` rejects unknown
  fields; document the `normalize*` boundary.
- **Secret handling:** document explicitly that security / site-health widgets emit
  boolean/status summaries only (mirroring `buildSecuritySummary`), and that no raw
  settings, credentials, or secrets reach the client payload, browser cache, or
  logs. The `settings:redacted` precedent in `ADMIN_CACHE.md` is the model to cite.

---

## Implementation Pseudocode

> "Pseudocode" here = the **doc outline** and the **exact files to touch with the
> exact edit per file**. Write prose, not code; keep every claim verifiable against
> the cited source file.

### 1) FINALIZE `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by 480-01-L02, extended by 02/03/04/05)

Outline (H2 sections, in order):

```md
# Dashboard Widgets (Admin)

## Overview
- What it is: a configurable admin Dashboard built from add/remove/arrange/resize
  PANELS ("widgets"), each bound to a CMS data source. Replaces the fixed
  `DashboardPayload` blob.
- Scope boundary (REQUIRED, first paragraph): admin DASHBOARD widgets are DISTINCT
  from `core/widgets/*` page/content widgets. Different registry, different RBAC,
  different cache family, different render host (admin Dashboard shell, not public
  site). Link out to `_docs/WIDGETS.md` for the other system to prevent conflation.
- Visual language: TASK-479 prototype primitives (StatCard + sparkline / AreaChart
  / Donut / SectionCard); edit mode uses the floating-panel builder pattern.

## Widget Catalog
- Table of built-in widget types with: id, title, data source, default size,
  required permission, config shape. Seed set (mirror what TASK-480-02 registered):
  | Widget id | Purpose | Data source | RBAC | Config |
  |-----------|---------|-------------|------|--------|
  | `totals` | counters (pages/entries/media/users) | dashboard totals | content:read | — |
  | `content-type-counts` | per-content-type counts | content types + entries | content:read | { contentTypeIds[] } |
  | `content-over-time` | chart of content created/updated | time-bucketed query | content:read | { range, metric } |
  | `recent-activity` | recent edits feed | recentEdits | content:read | { limit, types[] } |
  | `storage-usage` | storage used/quota | storage summary | content:read | — |
  | `site-health` | security/site-health status | security summary | content:read | — |
  | `quick-actions` | shortcut buttons | static / adminPaths | content:read | { actions[] } |
  | `content-query` | custom bounded content query | entries query | content:read | { typeSlug, filter, limit } |
- State that the catalog is the schema-owned enum in `core/services/dashboard/*`
  (TASK-480-02); adding a widget = extend that enum + its config schema + a resolver.

## Data Sources
- Each widget declares a data-source id resolved server-side in
  `core/services/dashboard/dashboardService.ts` (extends `getDashboardData`).
- Resolvers reuse existing read models (totals/storage/security/recentEdits today;
  new bounded content-over-time + content-query resolvers from TASK-480-02).
- Hard limits: every query is bounded (limit caps, range caps) — document the caps.

## Layout Model
- A dashboard layout = ordered list of placed widgets: { id, type, config, x, y, w,
  h } on a fixed column grid (document the column count + min/max w/h).
- Schema-first: layout validated by the Zod-equivalent schema in
  `core/services/dashboard/dashboardWidgetContract.ts`; unknown fields rejected;
  `normalizeDashboardLayout` fills defaults and clamps geometry. Reference the
  helper name from TASK-480-02.
- Versioning: `version` on the stored layout (DB column `schema_version`);
  legacy/empty rows normalize to a default layout (non-destructive read-migration),
  mirroring the Pages v2 doc precedent in `ADMIN_CACHE.md`.

## Edit-Mode UX
- View mode = render the grid read-only. Edit mode = floating-panel builder:
  add widget (catalog picker), remove, drag to reorder, resize, edit per-widget
  config; explicit Save (no autosave overwrite of a dirty draft), Cancel reverts.
- Per react-hooks rules: no sync setState in effects; lazy-init/reducer for the
  builder draft; no mount-force refetch loop.
- Reference the prototype floating-panel pattern + TASK-479 StatCard/SectionCard.

## Persistence
- Layout persisted per (scope) via TASK-480-03. Document the table
  (`dashboard_layouts` or the actual name), its owner, and the read/write path.
- Default layout served when no row exists (the current fixed cards become the
  seeded default so existing installs see no regression).

## API
- Internal admin routes (point at the `## Dashboard` section of CMS_API.md):
  - `GET /dashboard` — resolved widget payload (back-compat: still returns the
    legacy totals/storage/security/recentEdits shape plus the widget data map).
  - `GET /dashboard/layout` — current layout (content:read).
  - `PUT /dashboard/layout` — persist layout (dashboard:write, CSRF, schema reject-unknown).
  - `GET /dashboard/widgets` — catalog/metadata (content:read), if exposed.
  - (Match the EXACT routes TASK-480-03 registered; do not invent.)

## RBAC
- Data reads: content:read. Layout read: content:read; layout write: dashboard:write.
- Restate the secret-handling rule (status booleans only; no raw settings).

## Cache
- Cached resource `dashboard:layout` (and any widget-data caches) — TTL, cached
  client wrapper, cacheBus key, hydrate-then-revalidate, dirty-draft protection,
  no mount-force refetch. Point at `ADMIN_CACHE.md` for the full contract.

## Testing
- Point at the Bun route/security suites (480-03) + Vitest domain (480-02) /
  UI (480-04/05) suites.

## Open Questions / Follow-ups
- Per-user vs per-site layouts; export/import of layouts; custom widget plugins.
```

### 2) UPDATE `_docs/CMS_API.md` — extend the `## Dashboard (v1)` section (currently at the Dashboard heading near line 2844)

- Keep the existing `GET /dashboard` response block; **add** a note that the
  payload now also carries the resolved widget data map and a `layout` reference,
  while preserving the legacy `totals`/`storage`/`security`/`recentEdits` keys for
  back-compat (cite `DashboardPayload` evolution from TASK-480-01).
- Add the new endpoints with permissions, request/response shapes, CSRF note, and
  the `admin` rate-limit bucket. Match exactly the routes registered by 480-03:
  `GET /dashboard/layout`, `PUT /dashboard/layout`, and (if present)
  `GET /dashboard/widgets`. Use the existing house style (Permissions line, Note,
  endpoint list, fenced JSON example).
- Cross-link to `_docs/DASHBOARD_WIDGETS_SPEC.md`.

### 3) UPDATE `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cached resource

In `ADMIN_CACHE.md`:
- Add `dashboard:layout` to the **Cache keys** list (under `core/admin/services/cachePolicy.ts`).
- Add a "### Dashboard widgets cache note" subsection under the per-resource notes,
  describing: owner client (`core/admin/services/dashboardClient.ts` extended by
  TASK-480-03), TTL (`cacheTtlMs.detail`), hydrate-then-revalidate on mount,
  cache-bus `dashboard:layout` `update`/`invalidate` on save, dirty-draft
  protection (background revalidation never overwrites an unsaved builder draft),
  and that **no secrets** enter the cache (security widget = booleans only, same
  rule as `settings:redacted`).
- If widget DATA is also cached, add its key(s) + note; if widget data stays
  uncached (read-on-open), say so explicitly (like Form submissions).

In `ADMIN_CACHE_MAP.md`:
- Add a `## Dashboard` route→file→cached-API block: UI
  `core/admin/ui/dashboard/DashboardPage.tsx`, cached APIs
  `getDashboardLayoutCached` / `getCachedDashboardLayout` / `saveDashboardLayout`,
  cache bus `dashboard:layout`.

### 4) UPDATE `_docs/DATA_MODEL.md` — new layout table (ONLY if TASK-480-03 added a table)

- Add a `## Dashboard layouts` section after `## Settings` describing the table
  added by 480-03: columns (id, scope/owner, definition jsonb, schema_version,
  created_at, updated_at), the jsonb layout contract, and the non-destructive
  read-normalization note. Cite the migration artifacts (SQL + `meta/*_snapshot.json`
  + `meta/_journal.json`) produced by 480-03 — this leaf documents them, 480-03
  creates them.
- If 480-03 stored the layout inside an existing settings/jsonb column instead of a
  new table, document THAT instead and skip the new-table section.

### 5) UPDATE `AGENTS.md` repo doc index

- Add a line under "Primary internal/agent docs live in `_docs/`" (the bulleted
  list around line 40–62), e.g.:
  `- \`_docs/DASHBOARD_WIDGETS_SPEC.md\` - admin dashboard widgets & configurable panels`
  Place it near `_docs/WIDGETS.md` and make the one-liner state the admin-vs-core
  distinction so the index itself disambiguates.

**Data flow (for the docs themselves):** read the shipped code from 480-01..05 →
mirror the exact contract into the spec/API/cache/data docs → cross-link the spec
from `CMS_API.md`, `ADMIN_CACHE.md`, and `AGENTS.md` → verify no doc claims a
control the code does not implement.

**Error handling (doc-review discipline):** every endpoint, key, table column, and
permission named in the docs must be grep-confirmable in the corresponding source
file. If a claim cannot be confirmed, fix the doc to match code, or escalate to the
owning leaf — never document aspirational behavior as shipped.

**Regression-test shape:** docs-only leaf — no automated tests authored here.
Validation = the link/contract review in Testing Requirements below, plus the
program-wide gate run in TASK-480-06-L02. (A docs-presence assertion, if any team
wants one, belongs in the L02 closure suite, not here.)

---

## Testing Requirements

Docs-only; no code tests. Validation steps:

- Confirm every route documented in `CMS_API.md` exists in the 480-03 route module
  (grep the route registration); confirm permissions match the route guards.
- Confirm every cache key documented in `ADMIN_CACHE.md` exists in
  `core/admin/services/cachePolicy.ts` (from 480-03).
- Confirm the DATA_MODEL table/columns match the 480-03 migration + snapshot.
- Markdown sanity: links resolve, tables render, headings nest correctly.
- `bun --cwd core lint` / `bun --cwd core lint:types` are not required for a
  docs-only change but MUST still be green at closure (run in L02); note here that
  no source files changed.
- State clearly in the summary if any cross-check could not be completed (e.g. a
  sibling leaf not yet merged).

---

## Documentation Updates Required

- **Finalize:** `_docs/DASHBOARD_WIDGETS_SPEC.md` (seeded by 480-01-L02, extended by 02/03/04/05).
- **Update:** `_docs/CMS_API.md` (Dashboard section + new routes).
- **Update:** `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` (dashboard:layout
  cached resource).
- **Update:** `_docs/DATA_MODEL.md` (dashboard layout table — if 480-03 added one).
- **Update:** `AGENTS.md` repo doc index (new spec line).
- Board + changelog are handled by **TASK-480-06-L02**, not this leaf.
