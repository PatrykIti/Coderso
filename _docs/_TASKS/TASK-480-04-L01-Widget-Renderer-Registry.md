# TASK-480-04-L01: Widget Renderer Registry + DashboardWidgetHost
# FileName: TASK-480-04-L01-Widget-Renderer-Registry.md

**Priority:** High
**Category:** Admin UI / Dashboard / Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-480-02 (widget type enum, `DashboardWidget`, `DashboardWidgetData` union) · TASK-479-06-L02 (`SectionCard`, `EmptyState`)
**Status:** ✅ Done
**Completed:** 2026-07-05
**Parent Subtask:** TASK-480-04

---

## Overview

Build the typed **renderer registry** and the **`<DashboardWidgetHost>`** wrapper
that together form the dispatch + chrome layer for admin dashboard widgets. The
registry maps every `DashboardWidgetType` to a React renderer; the host selects
the renderer for `widget.type` and owns the four cross-cutting states —
**loading**, **empty**, **error**, and the **type/data-mismatch invariant** —
rendered with the prototype's `SectionCard` shell so every panel is visually
consistent regardless of which renderer fills it.

- **Goal:** A single, exhaustive, type-safe seam (`DASHBOARD_WIDGET_RENDERERS`,
  `DASHBOARD_WIDGET_CATALOG`, and `DashboardWidgetHost`) so the builder/grid
  (TASK-480-05) places hosts, lists catalog metadata, and passes each host a
  `widget` + a per-widget data **state**, never branching on type itself.
- **Owning module/service:** `core/admin/ui/dashboard/widgets/registry.tsx`,
  `core/admin/ui/dashboard/widgets/DashboardWidgetHost.tsx`.
- **Source-of-truth docs:**
  - Widget contract (import, do not redefine): `core/services/dashboard/dashboardTypes.ts`
    (`DashboardWidgetType`, `DashboardWidget`, `DashboardWidgetData`, and the
    `DASHBOARD_WIDGET_TYPES` const array) — owned by TASK-480-02.
  - Shared shell/empty: `core/admin/ui/shared/SectionCard.tsx`,
    `core/admin/ui/shared/EmptyState.tsx` (TASK-479-06-L02).
  - `_docs/DASHBOARD_WIDGETS_SPEC.md` (renderer catalog section).
- **Out of scope:** The renderer bodies themselves (→ L02 — register placeholders
  or import them once L02 lands); any data fetching, polling, or cache wiring
  (the host is **state-driven**: it renders the `WidgetDataState` it is given —
  TASK-480-02/05 own producing that state). Drag/resize/grid (→ 480-05).

> **Distinct from `core/widgets/*`:** this registry is for **admin Dashboard
> panels**, not page/content widgets. Keep it under
> `core/admin/ui/dashboard/widgets/` and never import `core/widgets/*` here.

---

## Security Contract

- **Endpoint visibility / Auth / RBAC / CSRF / Rate-limit:** n/a — presentational
  dispatch only; no routes, no fetch. (Upstream data is gated by the TASK-480-03
  internal admin endpoints: session + `content:read` for data, `dashboard:write`
  + CSRF for layout writes, `admin_read` for GET reads, and `admin_write` for
  writes/body POSTs.)
- **Validation:** the host treats `data` as the **already-normalized** union from
  TASK-480-01; it performs a **defensive discriminant check** (`data.type ===
  widget.type`) and renders a safe invariant fallback on mismatch rather than
  throwing or rendering arbitrary data.
- **Secret handling:** the host renders no secrets; error state shows a
  machine-mapped, human-readable message string only (never raw error objects,
  stack traces, or upstream payloads).

---

## Implementation Pseudocode

### Renderer contract types — `registry.tsx`

```tsx
// core/admin/ui/dashboard/widgets/registry.tsx
import type {
  DashboardWidget,
  DashboardWidgetData,
  DashboardWidgetConfig,
  DashboardWidgetType,
} from "../../../../services/dashboard/dashboardTypes";          // owned by 480-02
import { DASHBOARD_WIDGET_TYPES } from "../../../../services/dashboard/dashboardTypes"; // owned by 480-02

// Props every renderer receives. Narrowed per type so each renderer body sees
// ONLY its own config + data variant (no per-renderer re-discrimination).
export type DashboardWidgetRendererProps<T extends DashboardWidgetType = DashboardWidgetType> = {
  widget: Extract<DashboardWidget, { type: T }>;
  data: Extract<DashboardWidgetData, { type: T }>;
};

export type DashboardWidgetRenderer<T extends DashboardWidgetType> =
  React.ComponentType<DashboardWidgetRendererProps<T>>;

// Exhaustive map: a missing key is a COMPILE error (mapped type over the enum).
export type DashboardWidgetRendererRegistry = {
  [T in DashboardWidgetType]: DashboardWidgetRenderer<T>;
};

export const DASHBOARD_WIDGET_RENDERERS: DashboardWidgetRendererRegistry = {
  "totals-counters":     TotalsCountersWidget,    // ← L02
  "content-type-counts": ContentTypeCountsWidget,  // ← L02
  "content-over-time":   ContentOverTimeWidget,    // ← L02
  "recent-activity":     RecentActivityWidget,     // ← L02
  "storage-usage":       StorageUsageWidget,       // ← L02
  "site-health":         SiteHealthWidget,         // ← L02
  "security-summary":    SecuritySummaryWidget,    // ← L02
  "quick-actions":       QuickActionsWidget,       // ← L02
  "content-query":       ContentQueryWidget,       // ← L02
};

export type WidgetConfigField =
  | { key: string; kind: "text"; label: string }
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[] | "contentTypes" }
  | { key: string; kind: "range"; label: string; options: { value: "24h" | "7d" | "30d" | "90d"; label: string }[] }
  | { key: string; kind: "number"; label: string; min: number; max: number }
  | { key: string; kind: "toggle"; label: string };

export type DashboardWidgetCatalogEntry = {
  type: DashboardWidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "metrics" | "content" | "system" | "actions";
  defaultConfig: DashboardWidgetConfig;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  configFields: WidgetConfigField[];
};

// Metadata used by the TASK-480-05 add-widget/configure UI. This module owns
// catalog completeness; the builder consumes it and does not redeclare labels,
// defaults, sizing, or config fields.
export const DASHBOARD_WIDGET_CATALOG: Record<DashboardWidgetType, DashboardWidgetCatalogEntry> = {
  "totals-counters":     { /* label/icon/defaultConfig/defaultSize/configFields */ },
  "content-type-counts": { /* ... */ },
  "content-over-time":   { /* ... */ },
  "recent-activity":     { /* ... */ },
  "storage-usage":       { /* ... */ },
  "site-health":         { /* ... */ },
  "security-summary":    { /* ... */ },
  "quick-actions":       { /* ... */ },
  "content-query":       { /* ... */ },
};

export function getWidgetRenderer<T extends DashboardWidgetType>(
  type: T,
): DashboardWidgetRenderer<T> {
  return DASHBOARD_WIDGET_RENDERERS[type];
}

// Per-type "is there anything to show?" predicate (drives the host empty state).
// Keep pure + exhaustive (switch over data.type; default → false).
export function isWidgetDataEmpty(data: DashboardWidgetData): boolean {
  switch (data.type) {
    case "recent-activity": return data.items.length === 0;
    case "content-type-counts": return data.counts.length === 0;
    case "content-query": return data.rows.length === 0;
    case "quick-actions": return data.actions.length === 0;
    case "content-over-time": return data.series.every((s) => s.points.length === 0);
    case "totals-counters":
    case "storage-usage":
    case "site-health":
    case "security-summary":
      return false;                          // counters/health always render
    default: { const _never: never = data; return false; }
  }
}

// Re-export the enum array for the registry-exhaustiveness test (L03).
export { DASHBOARD_WIDGET_TYPES };
```

### Per-widget data state — `DashboardWidgetHost.tsx`

```tsx
// core/admin/ui/dashboard/widgets/DashboardWidgetHost.tsx
import { SectionCard } from "@/ui/shared/SectionCard";
import { EmptyState } from "@/ui/shared/EmptyState";
import { getWidgetRenderer, isWidgetDataEmpty } from "./registry";
import type { DashboardWidget, DashboardWidgetData } from "../../../../services/dashboard/dashboardTypes";

// State is PASSED IN (no fetch here). 480-02/05 produce it via the cached client.
export type WidgetDataState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry?: () => void }
  | { status: "ready"; data: DashboardWidgetData };

export function DashboardWidgetHost({
  widget,
  state,
  action,                       // optional header slot (e.g. builder remove/config btn in edit mode)
}: {
  widget: DashboardWidget;
  state: WidgetDataState;
  action?: React.ReactNode;
}) {
  return (
    <SectionCard title={widget.title} action={action} className="h-full">
      <div aria-busy={state.status === "loading"} className="h-full">
        {renderBody(widget, state)}
      </div>
    </SectionCard>
  );
}

function renderBody(widget: DashboardWidget, state: WidgetDataState): React.ReactNode {
  if (state.status === "loading") return <WidgetSkeleton type={widget.type} />;
  if (state.status === "error")   return <WidgetError message={state.message} onRetry={state.onRetry} />;

  const { data } = state;
  // Defensive invariant: contract guarantees data.type === widget.type, but never trust it blindly.
  if (data.type !== widget.type) return <WidgetError message="This panel couldn’t be displayed." />;
  if (isWidgetDataEmpty(data))   return <WidgetEmpty type={widget.type} />;

  const Renderer = getWidgetRenderer(widget.type);
  // Casts are safe: discriminants checked above; registry is exhaustive over the enum.
  return <Renderer widget={widget as never} data={data as never} />;
}
```

### The three chrome states (token-styled, no fetch, no effects)

```tsx
// WidgetSkeleton: shimmer blocks sized loosely by type (content-over-time → tall, totals-counters → short).
function WidgetSkeleton({ type }: { type: DashboardWidgetType }) {
  const tall = type === "content-over-time" || type === "content-query" || type === "recent-activity";
  return (
    <div data-testid="widget-skeleton" className="animate-pulse space-y-3">
      <div className="h-7 w-24 rounded-md bg-muted" />
      <div className={tall ? "h-40 w-full rounded-xl bg-muted" : "h-12 w-full rounded-lg bg-muted"} />
    </div>
  );
}

// WidgetError: SectionCard already drew the title; show message + optional retry.
function WidgetError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" data-testid="widget-error" className="flex flex-col items-start gap-3 text-sm">
      <p className="text-muted-foreground">{message}</p>
      {onRetry ? <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

// WidgetEmpty: reuse shared EmptyState (dashed card, icon tile, copy by type).
function WidgetEmpty({ type }: { type: DashboardWidgetType }) {
  const copy = EMPTY_COPY[type] ?? { title: "Nothing to show", description: "No data yet." };
  return <EmptyState data-testid="widget-empty" icon={<Inbox className="size-5" />} {...copy} />;
}
```

**Data flow:** builder/page (480-05) holds the `WidgetDataState` per widget
(produced by the cached widget-data client from 480-02) → passes `{widget, state}`
to `DashboardWidgetHost` → host selects state branch → on `ready`, validates the
discriminant + emptiness → dispatches to `getWidgetRenderer(widget.type)`. The
host has **no `useEffect`, no `useState`, no fetch** (react-hooks-safe; renders
exactly what it is handed).

**Error handling:** `state.message` is a pre-mapped, human-readable string from
the data layer (480-02 maps domain/transport errors there); the host never sees
raw errors. The mismatch branch is a defensive invariant, not a user path.

**Regression-test shape (delivered in L03):**

- Registry exhaustiveness: `Object.keys(DASHBOARD_WIDGET_RENDERERS)` and
  `Object.keys(DASHBOARD_WIDGET_CATALOG)` both equal `DASHBOARD_WIDGET_TYPES`
  (sorted) — every type has a renderer and metadata entry, no extras.
- Host states: `loading` → `widget-skeleton`; `error` → `widget-error` + message;
  `ready` + empty data → `widget-empty`; `ready` + mismatched `data.type` →
  `widget-error` (no throw); `ready` + valid data → the renderer's output.
- `isWidgetDataEmpty`: true for 0-item recent-activity/content-query/quick-actions
  and all-empty content-over-time series; false for
  totals-counters/storage-usage/site-health/security-summary.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types` (the mapped-type registry must compile — a missing
  renderer key fails here).
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/dashboardWidgetRegistry.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`
  (host-state cases live here alongside the renderers).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — document the registry seam, the
  `WidgetDataState` contract, and the four host states (loading/empty/error/
  mismatch) as the canonical extension point for new widget types.
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-04-L01`.
