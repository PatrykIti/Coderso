# TASK-480-01-L02: Dashboard Widget Product Spec
# FileName: TASK-480-01-L02-Dashboard-Widget-Product-Spec.md

**Priority:** High
**Category:** Admin UI / Dashboard / Product spec
**Estimated Effort:** Medium
**Dependencies:** TASK-480-01-L01 (audit informs which data sources already exist)
**Status:** ✅ Done
**Completed:** 2026-07-05
**Parent Subtask:** TASK-480-01

---

## Overview

Define the authoritative **Dashboard widget product spec**: the widget catalog
(each type's CMS data source + config), the layout/grid model, the edit-mode UX,
and the final **dashboard_layouts + dashboard:write** persistence/RBAC decision.
This spec is the contract that
TASK-480-02 (schemas + data-source services), -03 (layout persistence + API),
-04 (renderers), and -05 (builder UI) implement against. It is drafted into
`_docs/DASHBOARD_WIDGETS_SPEC.md` (finalized in TASK-480-06).

These are **admin Dashboard widgets** (panels visualizing CMS data inside
`/admin`) — explicitly **NOT** the page/content widgets in `core/widgets/*`
(public page-builder blocks). All names are namespaced `dashboard*` to avoid
collision.

- **Goal:** A complete, implementable widget catalog + layout model + edit-mode
  UX + persistence/RBAC decision, expressed as concrete schema/type shapes.
- **Owning module/service:** the spec doc seed for `_docs/DASHBOARD_WIDGETS_SPEC.md`;
  defines (but does not yet build) the contracts for
  `core/services/dashboard/*` and `core/admin/ui/dashboard/*`.
- **Source-of-truth docs:** `core/services/dashboard/dashboardTypes.ts` +
  `dashboardService.ts` (existing data we can already source), the prototype
  `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx` (visual catalog), `_docs/RBAC_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/DATA_MODEL.md`, and the TASK-480-03
  `dashboard_layouts` storage/API contract.
- **Out of scope:** Writing the schemas/services/routes/UI (that is -02..-05).
  New analytics ingestion. Public-site widgets.

---

## Security Contract

No runtime change in this leaf (spec only). The spec MUST, however, **specify**
the security posture each later leaf inherits:

- Widget data reads: `internal` `/admin/api/*`, session auth, `content:read`,
  schema reject-unknown, `admin_read` for GET and `admin_write` for the
  body-carrying POST widget-data query, no PII/secret in payloads.
- Layout reads/writes: per-user layout persisted in `dashboard_layouts`; reads
  require `content:read`, writes/reset require `dashboard:write` + CSRF and use
  `admin_write`. `settings:write` is not reused.
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
// core/services/dashboard/dashboardTypes.ts — DashboardWidgetType is OWNED by
// TASK-480-02-L01 (the canonical enum/contract owner). This product spec is a
// CONSUMER: it IMPORTS the enum and never re-declares it. Widget-id naming below is a
// product-spec sketch; the SHIPPED ids/grouping are whatever 480-02-L01 registers.
import type { DashboardWidgetType } from "core/services/dashboard/dashboardTypes";
// The canonical 9 kebab widget types (defined by 480-02-L01, shown here for the catalog):
//   "totals-counters"      pages/entries/media/users counters (StatCard)
//   "content-type-counts"  per-content-type entry counts (list rows OR Donut breakdown)
//   "content-over-time"    content created/updated over a range (AreaChart)
//   "recent-activity"      recent edits feed (RecentEditsTable)
//   "storage-usage"        media storage summary
//   "site-health"          storage + security rollup (SiteHealthCard)
//   "security-summary"     security checks (SecurityStatusCard)
//   "quick-actions"        create/link shortcuts (no DB)
//   "content-query"        custom content query (table/list)
```

Catalog (data SOURCE + config per type; all metrics come from REAL CMS data —
never fabricated):

| Type | Visual (prototype) | Data source (server) | Config (schema-first) |
|------|--------------------|----------------------|------------------------|
| `totals-counters` | `StatCard` + optional spark | `getDashboardTotals()` (existing) | `metrics?: ("pages"\|"entries"\|"media"\|"users")[]`, `accent?: "primary"\|"success"\|"warning"`, `format?: "number"\|"bytes"\|"percent"` |
| `content-type-counts` | list rows OR `Donut` (breakdown) | content types + entries counts | `contentTypeIds?: string[]`, `limit?: number`, `display?: "bars"\|"list"\|"donut"` |
| `content-over-time` | `AreaChart` / bar chart | NEW aggregation: count of content created/updated over range | `rangeDays?: number`, `bucket?: "day"\|"week"`, `variant?: "area"\|"bar"` |
| `recent-activity` | `RecentEditsTable` | `getRecentEdits(limit)` (existing) | `types: ("page"\|"entry"\|"media")[]`, `limit: 1..25` |
| `storage-usage` | storage summary card | `getStorageSummary()` (existing) | none (display-only) |
| `site-health` | `SiteHealthCard` | `getStorageSummary()` + `buildSecuritySummary(getSecuritySettings())` (existing) rollup | none (display-only) |
| `security-summary` | `SecurityStatusCard` | `buildSecuritySummary(getSecuritySettings())` (existing) | none |
| `quick-actions` | button group | static link descriptors resolved via admin route helpers | `actions?: { id, label, target, icon? }[]` |
| `content-query` | `SectionCard` table/list | NEW: filtered query over entries (READ-ONLY) | `contentTypeId: string \| null`, `status?`, `limit?`, `sort?`, `order?` |

Per-type config schemas live in the owner module and are validated
reject-unknown:

```ts
// schema-first per type; reject unknown fields. config.kind MUST equal the widget type.
const totalsCountersConfigSchema = z.object({
  kind: z.literal("totals-counters"),
  metrics: z.array(z.enum(["pages", "entries", "media", "users"]))
    .default(["pages", "entries", "media", "users"]),
  accent: z.enum(["primary", "success", "warning"]).default("primary"),
  format: z.enum(["number", "bytes", "percent"]).default("number"),
}).strict();
// The single per-content-type counter and the breakdown both fold into the
// content-type-counts variant (`contentTypeIds`, `limit`, `display`). One
// strict() schema per DashboardWidgetType (config.kind === type), keyed in a
// registry covering all 9 canonical types:
export const DASHBOARD_WIDGET_CONFIG_SCHEMAS: Record<DashboardWidgetType, ZodTypeAny>;
export const DASHBOARD_WIDGET_DEFAULT_CONFIG: Record<DashboardWidgetType, unknown>;
```

### 2. Layout / grid model

```ts
// core/services/dashboard/dashboardTypes.ts + dashboardWidgetContract.ts — these types are
// OWNED by TASK-480-02-L01; this spec IMPORTS them and does NOT re-declare. (Layout envelope
// schema lives in dashboardWidgetContract.ts.) Shapes shown for reference:
export type DashboardWidgetPosition = {
  x: number; // grid col, 0-based
  y: number; // grid row, 0-based
  w: number; // width in grid cols (clamped 1..GRID_COLS)
  h: number; // height in grid rows (clamped 1..MAX_H)
};

// Canonical per-instance widget (480-02-L01 names it `DashboardWidget`).
export type DashboardWidget = {
  id: string;                       // stable instance id (default-* or nanoid)
  type: DashboardWidgetType;        // one of the 9 canonical kebab types
  title?: string;                   // optional title override
  config: DashboardWidgetConfig;    // discriminated union; config.kind MUST equal type
  position: DashboardWidgetPosition;
};

export type DashboardLayout = {
  version: 1;                 // bump + migrate on shape change
  widgets: DashboardWidget[]; // max e.g. 24
};

export const DASHBOARD_GRID_COLS = 12;     // 12-col responsive grid
export const DASHBOARD_MAX_WIDGETS = 24;
```

Normalization (the explicit `normalize*` helper -02 owns):

```ts
export function normalizeDashboardLayout(input: unknown): DashboardLayout {
  const parsed = dashboardLayoutSchema.parse(input);   // reject unknown fields
  return {
    version: 1,
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
export function defaultDashboardLayout(): DashboardLayout;
```

A **default layout** reproduces today's fixed dashboard (`totals-counters` +
`recent-activity` + `storage-usage` + `security-summary`) so a brand-new user sees
parity, then can customize.

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

### 4. Persistence/RBAC decision (FINAL for TASK-480)

**Decision: per-user dashboard layout in a dedicated `dashboard_layouts` table,
with layout writes gated by `dashboard:write`.**

Justification:

- **Domain ownership.** A dashboard layout is a versioned widget document, not a
  small UI preference. Keeping it in `dashboard_layouts` gives the dashboard
  feature its own migration, snapshot, validation, and future read-migration path.
- **Least privilege with explicit intent.** Layout reads reuse `content:read`
  because the saved layout only determines which already-authorized dashboard data
  will be displayed. Layout writes require `dashboard:write`, a narrow permission
  that is clearer than overloading `settings:write`.
- **Migration parity.** An unsaved user resolves to `defaultDashboardLayout()`,
  seeded from today's fixed dashboard (`totals-counters`, `recent-activity`,
  `storage-usage`, `security-summary`), so existing installs see no blank
  dashboard regression.
- **Future per-site default.** Shared site/role default dashboards are explicitly
  out of the TASK-480 storage surface. If added later, they should be a follow-up
  task that extends the same domain table or introduces a separate default table
  with its own RBAC decision.

**Data flow:** view loads the caller's `dashboard_layouts` row → absent/invalid
row falls back to `defaultDashboardLayout()`. Resolution order is documented so
stored drift always degrades to a valid default.

**Error handling:** invalid stored layout → log + serve default (mirrors
`listUserSettings` try/catch-to-default), never crash the dashboard. Unknown
widget `type` or config field → rejected at the schema boundary on write; on read
of legacy/corrupt data, drop the offending widget and keep the rest.

**Regression-test shape (for -02/-03 to honor):**

- Domain/Vitest: `normalizeDashboardLayout` rejects unknown fields, clamps
  position, drops over-limit widgets, per-type config validation, default layout
  parity with today's payload, resolution-order fallbacks.
- Route/Bun: layout GET requires `content:read`; layout PUT/reset require
  `dashboard:write` + CSRF + reject-unknown; widget data gated on `content:read`;
  no PII/secret leak; rate-limit buckets are `admin_read`/`admin_write`.

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
- Persistence/RBAC decision is stated and justified, matching TASK-480-03's
  dedicated `dashboard_layouts` + `dashboard:write` contract.
- Output drafted into `_docs/DASHBOARD_WIDGETS_SPEC.md`.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — create/seed with this spec (catalog,
  layout, edit-mode UX, persistence/RBAC decision). Finalized in TASK-480-06.
- `_docs/_TASKS/README.md` — status/statistics on completion.
- Note forward references for `_docs/RBAC_SPEC.md` (`dashboard:write`),
  `_docs/CMS_API.md`, `_docs/ADMIN_CACHE*.md`, `_docs/DATA_MODEL.md` so -02/-03
  pick them up.

---

## Closure Checklist

- [ ] Status `✅ Done`.
- [ ] Full catalog + layout + edit-mode + persistence/RBAC decision specified
      as concrete shapes.
- [ ] `_docs/DASHBOARD_WIDGETS_SPEC.md` seeded.
- [ ] Forward contracts (RBAC/CSRF/cache/storage) handed to -02/-03.
