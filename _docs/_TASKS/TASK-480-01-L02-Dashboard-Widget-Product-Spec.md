# TASK-480-01-L02: Dashboard Widget Product Spec
# FileName: TASK-480-01-L02-Dashboard-Widget-Product-Spec.md

**Priority:** High
**Category:** Admin UI / Dashboard / Product spec
**Estimated Effort:** Medium
**Dependencies:** TASK-480-01-L01 (audit informs which data sources already exist)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-480-01

---

## Overview

Define the authoritative **Dashboard widget product spec**: the widget catalog
(each type's CMS data source + config), the layout/grid model, the edit-mode UX,
and the **per-user vs per-site** layout decision. This spec is the contract that
TASK-480-02 (schemas + data-source services), -03 (layout persistence + API),
-04 (renderers), and -05 (builder UI) implement against. It is drafted into
`_docs/DASHBOARD_WIDGETS_SPEC.md` (finalized in TASK-480-06).

These are **admin Dashboard widgets** (panels visualizing CMS data inside
`/admin`) — explicitly **NOT** the page/content widgets in `core/widgets/*`
(public page-builder blocks). All names are namespaced `dashboard*` to avoid
collision.

- **Goal:** A complete, implementable widget catalog + layout model + edit-mode
  UX + per-user/per-site decision, expressed as concrete schema/type shapes.
- **Owning module/service:** the spec doc seed for `_docs/DASHBOARD_WIDGETS_SPEC.md`;
  defines (but does not yet build) the contracts for
  `core/services/dashboard/widgets/*` and `core/admin/ui/dashboard/*`.
- **Source-of-truth docs:** `core/services/dashboard/dashboardTypes.ts` +
  `dashboardService.ts` (existing data we can already source), the prototype
  `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx` (visual catalog), `_docs/RBAC_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `core/admin/services/userSettingsClient.ts` +
  `core/services/settings/userSettingsService.ts` (per-user preference pattern).
- **Out of scope:** Writing the schemas/services/routes/UI (that is -02..-05).
  New analytics ingestion. Public-site widgets.

---

## Security Contract

No runtime change in this leaf (spec only). The spec MUST, however, **specify**
the security posture each later leaf inherits:

- Widget data reads: `internal` `/admin/api/*`, session auth, `content:read`,
  schema reject-unknown, `admin` rate-limit bucket, no PII/secret in payloads.
- Layout writes: CSRF-required admin writes; per-user layout = session-only,
  per-site default = `settings:write` (or a new `dashboard:write`).
- The spec must call out that any widget sourcing from a permissioned domain
  (media/storage, security settings, users) gates on that domain's read
  permission, never widening access.

---

## Implementation Pseudocode

Spec leaf → the "pseudocode" is the **concrete contract shapes** the catalog,
layout, data sources, and edit-mode UX must take. These are the schema-first
shapes -02/-03 will own in `core/services/dashboard/*`.

### 1. Widget catalog (types + data source + config)

```ts
// core/services/dashboard/widgets/dashboardWidgetTypes.ts (owner; -02 builds)
export type DashboardWidgetType =
  | "stat.counter"        // single number (StatCard)
  | "chart.timeseries"    // content created/updated over time (AreaChart)
  | "chart.breakdown"     // content by type/status (Donut)
  | "activity.recent"     // recent edits feed (RecentEditsTable)
  | "contentType.count"   // per content-type counts list
  | "storage.usage"       // storage summary (SiteHealthCard)
  | "siteHealth.security" // security checks (SecurityStatusCard)
  | "quickActions"        // create/link shortcuts
  | "content.query";      // custom content query (table/list)
```

Catalog (data SOURCE + config per type; all metrics come from REAL CMS data —
never fabricated):

| Type | Visual (prototype) | Data source (server) | Config (schema-first) |
|------|--------------------|----------------------|------------------------|
| `stat.counter` | `StatCard` + optional spark | `getDashboardTotals()` (existing) OR per-content-type `countRows(contentEntries, eq(typeId,…))` | `metric: "pages"\|"entries"\|"media"\|"users"\|"contentType"`, `contentTypeSlug?` (required when `metric==="contentType"`), `accent`, `showSparkline:boolean` |
| `chart.timeseries` | `AreaChart` | NEW aggregation: count of pages/entries grouped by day over range (created_at/updated_at) | `metric: "pages"\|"entries"\|"media"`, `field:"created"\|"updated"`, `rangeDays: 7\|30\|90`, `contentTypeSlug?` |
| `chart.breakdown` | `Donut` | NEW aggregation: counts grouped by content type OR status | `dimension:"contentType"\|"status"`, `top?: number` |
| `activity.recent` | `RecentEditsTable` | `getRecentEdits(limit)` (existing) | `types: ("page"\|"entry"\|"media")[]`, `limit: 1..25` |
| `contentType.count` | list rows | `countRows` per content type (from `contentTypes`) | `contentTypeSlugs: string[]` (empty = all), `sort:"name"\|"count"` |
| `storage.usage` | `SiteHealthCard` | `getStorageSummary()` (existing) | none (display-only) |
| `siteHealth.security` | `SecurityStatusCard` | `buildSecuritySummary(getSecuritySettings())` (existing) | none |
| `quickActions` | button group | static link descriptors resolved via `adminPaths` | `actions: QuickActionKey[]` (e.g. `createPage`,`createEntry`,`uploadMedia`) |
| `content.query` | `SectionCard` table/list | NEW: filtered query over a content type (reuse listings/entries read path; READ-ONLY) | `contentTypeSlug`, `filter?`, `sort?`, `limit:1..25`, `columns: string[]`, `display:"table"\|"list"` |

Per-type config schemas live in the owner module and are validated
reject-unknown:

```ts
// schema-first per type; reject unknown fields
const statCounterConfigSchema = z.object({
  metric: z.enum(["pages", "entries", "media", "users", "contentType"]),
  contentTypeSlug: z.string().min(1).optional(),
  accent: z.enum(["primary", "success", "warning", "info"]).default("primary"),
  showSparkline: z.boolean().default(false),
}).strict().superRefine((cfg, ctx) => {
  if (cfg.metric === "contentType" && !cfg.contentTypeSlug) {
    ctx.addIssue({ code: "custom", message: "contentTypeSlug required" });
  }
});
// …one strict() schema per DashboardWidgetType, keyed in a registry:
export const DASHBOARD_WIDGET_CONFIG_SCHEMAS: Record<DashboardWidgetType, ZodTypeAny>;
export const DASHBOARD_WIDGET_DEFAULT_CONFIG: Record<DashboardWidgetType, unknown>;
```

### 2. Layout / grid model

```ts
// core/services/dashboard/widgets/dashboardLayoutTypes.ts (owner; -02/-03 build)
export type DashboardWidgetPosition = {
  x: number; // grid col, 0-based
  y: number; // grid row, 0-based
  w: number; // width in grid cols (clamped 1..GRID_COLS)
  h: number; // height in grid rows (clamped 1..MAX_H)
};

export type DashboardWidgetInstance = {
  id: string;                 // uuid (per instance, not per type)
  type: DashboardWidgetType;
  config: unknown;            // validated against the per-type schema
  position: DashboardWidgetPosition;
};

export type DashboardLayout = {
  schemaVersion: 1;           // bump + migrate on shape change
  scope: "user" | "site";
  widgets: DashboardWidgetInstance[]; // max e.g. 24
};

export const DASHBOARD_GRID_COLS = 12;     // 12-col responsive grid
export const DASHBOARD_MAX_WIDGETS = 24;
```

Normalization (the explicit `normalize*` helper -02 owns):

```ts
export function normalizeDashboardLayout(input: unknown): DashboardLayout {
  const parsed = dashboardLayoutSchema.parse(input);   // reject unknown fields
  return {
    schemaVersion: 1,
    scope: parsed.scope,
    widgets: parsed.widgets
      .slice(0, DASHBOARD_MAX_WIDGETS)
      .map((w) => ({
        id: w.id,
        type: w.type,
        config: DASHBOARD_WIDGET_CONFIG_SCHEMAS[w.type].parse(w.config), // per-type strict
        position: clampPosition(w.position), // x,y>=0; w in 1..GRID_COLS; h in 1..MAX_H
      })),
  };
}
export function defaultDashboardLayout(scope: "user" | "site"): DashboardLayout;
```

A **default layout** reproduces today's fixed dashboard (3 stat counters +
recent activity + storage + security) so a brand-new user sees parity, then can
customize.

### 3. Edit-mode UX (floating-panel builder)

```text
View mode (default):
  - Render the saved layout's widgets read-only on the grid.
  - "Customize" button (top-right, near PageHeader actions) enters edit mode.

Edit mode:
  - Grid becomes drag/resize-enabled (react-grid-style; rules-of-hooks safe,
    lazy-init reducer for layout draft — NO sync setState in effects).
  - "Add widget" opens the CATALOG (floating panel / sheet) listing the 9 types
    with preview + description; selecting one appends an instance at the next
    free slot with DASHBOARD_WIDGET_DEFAULT_CONFIG[type].
  - Selecting a placed widget opens its CONFIG in the floating panel (the
    _docs/_PROTOTYPE floating-panel pattern; dedicated widgets, not native
    controls) — fields are the per-type config schema.
  - Drag to arrange, handle to resize (snaps to grid; clamped to GRID_COLS).
  - Remove via the widget's overflow menu.
  - Footer: Save (PUT layout, CSRF) / Discard (revert to last-saved draft) /
    Reset to default. Dirty-state guard: leaving edit mode or navigating with
    unsaved changes prompts; background revalidation NEVER overwrites the dirty
    draft.

Data:
  - Layout loads cache-first (hydrate) + background revalidate; no mount-force
    refetch loop.
  - Widget data loads per-widget (or batched) AFTER layout resolves; loading /
    empty / error states per widget; a failing data source degrades that one
    widget, not the page.
```

### 4. Per-user vs per-site decision (RECOMMEND + JUSTIFY)

**Recommendation: per-USER layout as the default surface, with an OPTIONAL
per-site DEFAULT template (admin-managed) as the seed for new users.**

Justification:

- **Personalization fits the product.** A dashboard is a personal landing page;
  different roles care about different metrics. The codebase already has a clean,
  proven **per-user preference** mechanism — `user_settings` table +
  `userSettingsService.ts` (`validateUserSettingValue`, reject-unknown
  `ALLOWED_KEYS`, `onConflictDoUpdate` upsert) + `userSettingsClient.ts`
  (`createReadThroughCache`, `withCsrf` PATCH). Per-user layout maps directly
  onto it (auth-only, no extra RBAC), minimizing new surface.
- **Least privilege.** A per-user layout edit only mutates the caller's own row,
  so it needs **session auth only** — no broad `settings:write`. A per-site
  default is a shared resource, so it correctly requires `settings:write`
  (or a new `dashboard:write`) and is edited by admins only.
- **Migration parity.** The per-site default is seeded from
  `defaultDashboardLayout("site")` (≈ today's fixed dashboard), so existing
  users keep the current view until they customize — zero regression.
- **Storage choice (hand to -03):** EITHER add a `"dashboard.layout"` key to the
  existing `user_settings`/`UserSettingValueMap` (cheapest; reuses the whole
  validate/cache/CSRF stack) OR a dedicated `dashboard_layouts` table
  (`user_id` nullable for the site default, `scope`, `layout jsonb`,
  `updated_at`). **Spec recommends the `user_settings` key for per-user** (lowest
  risk) and a **small `dashboard_layouts` table only for the per-site default**
  (so it is not tied to any user). -03 makes the final call + DB artifacts.

**Data flow:** view loads per-user layout → fall back to per-site default → fall
back to `defaultDashboardLayout("user")`. Resolution order is documented so an
absent/invalid stored layout always degrades to a valid default.

**Error handling:** invalid stored layout → log + serve default (mirrors
`listUserSettings` try/catch-to-default), never crash the dashboard. Unknown
widget `type` or config field → rejected at the schema boundary on write; on read
of legacy/corrupt data, drop the offending widget and keep the rest.

**Regression-test shape (for -02/-03 to honor):**

- Domain/Vitest: `normalizeDashboardLayout` rejects unknown fields, clamps
  position, drops over-limit widgets, per-type config validation, default layout
  parity with today's payload, resolution-order fallbacks.
- Route/Bun: layout GET/PUT auth + CSRF + reject-unknown; per-site default gated
  on `settings:write`; widget data gated on `content:read`; no PII/secret leak.

---

## Testing Requirements

Spec leaf — no automated lane. Validation = review:

- Catalog table lists all 9 widget types, each with a REAL data source (existing
  `dashboardService.ts` function or a clearly-marked NEW aggregation) and a
  concrete config shape.
- Layout model + `normalize*` + default-layout + resolution-order are specified
  as concrete shapes (not prose).
- Edit-mode UX covers add/arrange/resize/configure/save/discard/reset + dirty
  guard + cache-first load.
- Per-user vs per-site decision is stated AND justified, with a storage
  recommendation handed to TASK-480-03.
- Output drafted into `_docs/DASHBOARD_WIDGETS_SPEC.md`.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — create/seed with this spec (catalog,
  layout, edit-mode UX, per-user/per-site decision). Finalized in TASK-480-06.
- `_docs/_TASKS/README.md` — status/statistics on completion.
- Note forward references for `_docs/RBAC_SPEC.md` (possible `dashboard:write`),
  `_docs/CMS_API.md`, `_docs/ADMIN_CACHE*.md`, `_docs/DATA_MODEL.md` so -02/-03
  pick them up.

---

## Closure Checklist

- [ ] Status `✅ Done`.
- [ ] Full catalog + layout + edit-mode + per-user/per-site decision specified
      as concrete shapes.
- [ ] `_docs/DASHBOARD_WIDGETS_SPEC.md` seeded.
- [ ] Forward contracts (RBAC/CSRF/cache/storage) handed to -02/-03.
