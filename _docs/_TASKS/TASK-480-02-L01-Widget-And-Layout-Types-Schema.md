# TASK-480-02-L01: Widget & Layout Types + Schema
# FileName: TASK-480-02-L01-Widget-And-Layout-Types-Schema.md

**Parent Subtask:** TASK-480-02
**Priority:** High
**Category:** Admin / Dashboard / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add the widget/layout **types**, a **schema-first** validator that rejects
unknown fields, a `normalizeDashboardLayout()` helper with defaults + clamped
grid, and a **non-destructive legacy adapter** that turns an empty/missing layout
into the DEFAULT widget set (totals counters + recent activity + storage +
security) reusing the data the current `DashboardPayload` already exposes.

- **Goal:** One canonical, validated `DashboardLayout` contract that every later
  layer re-exports instead of re-declaring; a legacy/empty layout always renders
  a useful default board (no blank-dashboard regression vs. today's fixed blob).
- **Owning module/service:**
  - Types → extend `core/services/dashboard/dashboardTypes.ts`.
  - **Schema + enums + defaults + normalize + adapter** → new owner
    `core/services/dashboard/dashboardWidgetContract.ts`.
  - (Routes in `TASK-480-03` `re-export` from this owner; they never re-declare.)
- **Source-of-truth docs:** `_docs/DASHBOARD_WIDGETS_SPEC.md` (create/extend),
  `_docs/DATA_MODEL.md`, `_docs/RBAC_SPEC.md`.
- **Out of scope:** the resolver registry / data reads (L02), persistence table
  + migration (`TASK-480-03`), HTTP routes/cache (`TASK-480-03`), UI
  (`TASK-480-04` renderers / `TASK-480-05` builder).

> These are **admin Dashboard widgets**, NOT `core/widgets` page/content widgets.
> Do not import or alias the `core/widgets` catalog here.

---

## Security Contract

- **Endpoint visibility:** n/a (pure domain module; consumed by `internal`
  `/admin/api/*` routes later).
- **Auth model / RBAC / CSRF / Rate-limit:** n/a in this leaf. Document for the
  route subtask: resolving widget data → `content:read`; persisting a layout →
  the dedicated dashboard-layout write permission (`dashboard:write`, added by
  `TASK-480-03`).
- **Validation (the core of this leaf):** `dashboardWidgetContract.ts` is the
  **only** module allowed to parse raw layout input. The schema is **strict**
  (reject unknown top-level and per-widget keys), enums are closed, and grid
  geometry is clamped. `normalizeDashboardLayout(input: unknown)` is the single
  entry point; routes/UI must call it, never hand-roll parsing.
- **Anti-abuse:** widget `position` is clamped to the grid; `widgets[]` length is
  capped at `MAX_WIDGETS`; duplicate widget `id`s are de-duplicated
  deterministically. (Query clamping for `content-query` config lives with the
  resolver in L02, but the *schema* here still bounds its raw `limit`/`offset`.)
- **Secret handling:** types/schema carry no secrets. The legacy adapter only
  references **already-public** dashboard data semantics (counts, recent edits,
  storage, security summary) — it stores *which* widgets, not their resolved
  values.

---

## Sub-Tasks (leaf checklist)

- [ ] Extend `dashboardTypes.ts` with `DashboardWidgetType`, `DashboardWidget`,
      `DashboardWidgetPosition`, per-type `DashboardWidgetConfig`,
      `DashboardLayout`.
- [ ] Create `dashboardWidgetContract.ts`: schema (strict), grid constants,
      defaults, `normalizeDashboardLayout()`, `adaptLegacyDashboardLayout()`,
      `DEFAULT_DASHBOARD_LAYOUT`, and the public per-widget config validator
      `normalizeDashboardWidgetConfig(type, config)` (consumed by the 480-03 data
      route and the 480-05 configure panel; this module is the only owner).
- [ ] Wire the contract to remain the owner (export enum + schema + helpers);
      add no parsing elsewhere.
- [ ] Unit coverage handed to L03.
- [ ] Doc updates (`DASHBOARD_WIDGETS_SPEC.md`, `DATA_MODEL.md`).

---

## Implementation Pseudocode

### 1. Types — extend `core/services/dashboard/dashboardTypes.ts`

```ts
// --- admin Dashboard widgets (NOT core/widgets page widgets) ---

export const DASHBOARD_WIDGET_TYPES = [
  "totals-counters",      // pages/entries/media/users counters
  "content-type-counts",  // per-content-type entry counts
  "content-over-time",    // chart: content created/updated over a range
  "recent-activity",      // recentEdits feed
  "storage-usage",        // media storage summary
  "site-health",          // storage + security rollup
  "security-summary",     // security checks
  "quick-actions",        // static action links (no DB)
  "content-query",        // safe, clamped custom content query
] as const;

export type DashboardWidgetType = (typeof DASHBOARD_WIDGET_TYPES)[number];

export type DashboardWidgetPosition = {
  x: number; // grid column (0-based)
  y: number; // grid row (0-based)
  w: number; // width in grid columns
  h: number; // height in grid rows
};

// Per-type config; unknown keys rejected by the schema. Keep each variant small.
export type DashboardWidgetConfig =
  | { kind: "totals-counters"; metrics?: Array<"pages" | "entries" | "media" | "users"> }
  | { kind: "content-type-counts"; contentTypeIds?: string[]; limit?: number }
  | { kind: "content-over-time"; rangeDays?: number; bucket?: "day" | "week" }
  | { kind: "recent-activity"; limit?: number; types?: Array<"page" | "entry" | "media"> }
  | { kind: "storage-usage" }
  | { kind: "site-health" }
  | { kind: "security-summary" }
  | { kind: "quick-actions"; actions?: Array<{ label: string; href: string }> }
  | {
      kind: "content-query";
      contentTypeId: string | null;       // null = all entries
      status?: "draft" | "published" | "scheduled" | "archived" | "active";
      limit?: number;                       // clamped in L02 resolver + schema
      sort?: "updatedAt" | "createdAt" | "title";
      order?: "asc" | "desc";
    };

export type DashboardWidget = {
  id: string;                       // stable client id (uuid-ish)
  type: DashboardWidgetType;
  title?: string;                   // optional override of default title
  config: DashboardWidgetConfig;    // `kind` MUST equal `type`
  position: DashboardWidgetPosition;
};

export const DASHBOARD_LAYOUT_VERSION = 1 as const;

export type DashboardLayout = {
  version: number;                  // DASHBOARD_LAYOUT_VERSION
  widgets: DashboardWidget[];
};
```

### 2. Schema + constants + normalize — new `dashboardWidgetContract.ts`

```ts
import { z } from "zod"; // or the repo's existing assertAllowedKeys validators
import {
  DASHBOARD_WIDGET_TYPES,
  DASHBOARD_LAYOUT_VERSION,
  type DashboardLayout,
  type DashboardWidget,
} from "./dashboardTypes";

// --- grid + limits (single source of truth) ---
export const DASHBOARD_GRID_COLUMNS = 12;
export const DASHBOARD_WIDGET_MIN_W = 1;
export const DASHBOARD_WIDGET_MIN_H = 1;
export const DASHBOARD_WIDGET_MAX_W = DASHBOARD_GRID_COLUMNS; // 12
export const DASHBOARD_WIDGET_MAX_H = 12;
export const DASHBOARD_MAX_WIDGETS = 24;
export const DASHBOARD_CONTENT_QUERY_MAX_LIMIT = 50;
export const DASHBOARD_CONTENT_QUERY_DEFAULT_LIMIT = 10;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.trunc(Number.isFinite(n) ? n : lo)));

const positionSchema = z
  .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
  .strict();

// One strict object per config variant; `.strict()` rejects unknown keys.
const configSchemas = {
  "totals-counters": z.object({
    kind: z.literal("totals-counters"),
    metrics: z.array(z.enum(["pages", "entries", "media", "users"])).optional(),
  }).strict(),
  "content-query": z.object({
    kind: z.literal("content-query"),
    contentTypeId: z.string().nullable(),
    status: z.enum(["draft", "published", "scheduled", "archived", "active"]).optional(),
    limit: z.number().optional(),
    sort: z.enum(["updatedAt", "createdAt", "title"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  }).strict(),
  // ...one strict variant per DashboardWidgetType (see Types §1).
} as const;

const widgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(DASHBOARD_WIDGET_TYPES),
  title: z.string().max(120).optional(),
  config: z.unknown(),       // validated against configSchemas[type] in normalize
  position: positionSchema,
}).strict();

export const dashboardLayoutSchema = z.object({
  version: z.number().optional(),
  widgets: z.array(widgetSchema).max(DASHBOARD_MAX_WIDGETS),
}).strict();

// --- the ONLY public parse/normalize entry point ---
export function normalizeDashboardLayout(input: unknown): DashboardLayout {
  const parsed = dashboardLayoutSchema.parse(input); // throws on unknown fields
  const seen = new Set<string>();
  const widgets: DashboardWidget[] = [];

  for (const raw of parsed.widgets) {
    if (seen.has(raw.id)) continue;          // dedupe duplicate ids deterministically
    seen.add(raw.id);

    // config.kind MUST match type; parse against the per-type strict schema.
    const cfgSchema = configSchemas[raw.type];
    const config = normalizeWidgetConfig(raw.type, cfgSchema.parse(
      withKind(raw.type, raw.config)
    ));

    widgets.push({
      id: raw.id,
      type: raw.type,
      title: raw.title?.trim() || undefined,
      config,
      position: {
        x: clamp(raw.position.x, 0, DASHBOARD_GRID_COLUMNS - 1),
        y: clamp(raw.position.y, 0, 9999),
        w: clamp(raw.position.w, DASHBOARD_WIDGET_MIN_W, DASHBOARD_WIDGET_MAX_W),
        h: clamp(raw.position.h, DASHBOARD_WIDGET_MIN_H, DASHBOARD_WIDGET_MAX_H),
      },
    });
  }

  return { version: DASHBOARD_LAYOUT_VERSION, widgets };
}

// content-query limit clamp lives here too (schema bounds, resolver re-clamps).
function normalizeWidgetConfig(type, cfg) {
  if (type === "content-query") {
    return {
      ...cfg,
      limit: clamp(
        cfg.limit ?? DASHBOARD_CONTENT_QUERY_DEFAULT_LIMIT,
        1,
        DASHBOARD_CONTENT_QUERY_MAX_LIMIT,
      ),
    };
  }
  return cfg;
}

// PUBLIC per-type config validator — the single owner of per-widget config
// validation. Consumed by the 480-03 data route and the 480-05 configure panel
// (both import this; neither re-declares a parser).
export function normalizeDashboardWidgetConfig(
  type: DashboardWidgetType,
  config: unknown,
): DashboardWidgetConfig {
  const cfgSchema = configSchemas[type];
  return normalizeWidgetConfig(type, cfgSchema.parse(withKind(type, config)));
}
```

### 3. Defaults + non-destructive legacy adapter

```ts
// The DEFAULT board = exactly the panels today's fixed DashboardPayload feeds:
// totals counters + recent activity + storage + security.
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = normalizeDashboardLayout({
  version: DASHBOARD_LAYOUT_VERSION,
  widgets: [
    { id: "default-totals",   type: "totals-counters",  config: { kind: "totals-counters" },  position: { x: 0, y: 0, w: 12, h: 1 } },
    { id: "default-recent",   type: "recent-activity",  config: { kind: "recent-activity" },  position: { x: 0, y: 1, w: 8,  h: 3 } },
    { id: "default-storage",  type: "storage-usage",    config: { kind: "storage-usage" },    position: { x: 8, y: 1, w: 4,  h: 1 } },
    { id: "default-security", type: "security-summary", config: { kind: "security-summary" }, position: { x: 8, y: 2, w: 4,  h: 2 } },
  ],
});

// Legacy/empty -> default, WITHOUT mutating or discarding a real saved layout.
export function adaptLegacyDashboardLayout(
  layout: DashboardLayout | null | undefined,
): DashboardLayout {
  if (!layout || !Array.isArray(layout.widgets) || layout.widgets.length === 0) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
  return normalizeDashboardLayout(layout); // re-validate stored rows on read
}
```

**Data flow:** raw input (route body / stored row / UI draft) →
`normalizeDashboardLayout()` (strict parse, dedupe, clamp) → typed
`DashboardLayout`. On read, a missing/empty layout flows through
`adaptLegacyDashboardLayout()` → `DEFAULT_DASHBOARD_LAYOUT`. Routes stay
orchestration-only and import these helpers; they never re-declare the schema.

**Error handling:** unknown fields / closed-enum violations / `config.kind ≠
type` throw a schema error at the boundary; the route subtask maps it to a
machine-readable domain error (e.g. `dashboard_layout_invalid`) via its
`mapDashboardError` boundary. Geometry out of range is clamped (not rejected) so
a slightly-stale UI draft still saves.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest (handed to L03, lives in `tests/vitest/services/dashboardWidgetContract.test.ts`):
  - strict reject of unknown top-level + per-widget + per-config keys,
  - defaults applied (version, content-query limit),
  - grid clamp (x/y/w/h to bounds), `MAX_WIDGETS` cap, duplicate-id dedupe,
  - `config.kind ≠ type` rejected,
  - `adaptLegacyDashboardLayout(null | {} | { widgets: [] })` →
    `DEFAULT_DASHBOARD_LAYOUT` (4 default widgets: totals/recent/storage/security),
  - a real saved layout round-trips unchanged through the adapter.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgetContract.test.ts`

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — widget-type enum, `DashboardWidget` /
  `DashboardLayout` shapes, per-type config table, grid constants/clamps,
  DEFAULT widget set, legacy-adapter behavior.
- `_docs/DATA_MODEL.md` — document the `DashboardLayout` document shape
  (physical table arrives in `TASK-480-03`).
- Board index + changelog on closure.

---

## Closure Checklist

- [ ] Types added to `dashboardTypes.ts`; schema/defaults/normalize/adapter in
      `dashboardWidgetContract.ts` (sole parse owner).
- [ ] Strict reject-unknown + clamp + dedupe + cap verified by L03 specs.
- [ ] Legacy/empty → DEFAULT widget set (non-destructive) verified.
- [ ] `DASHBOARD_WIDGETS_SPEC.md` + `DATA_MODEL.md` updated.
- [ ] lint/types/vitest evidence recorded.
