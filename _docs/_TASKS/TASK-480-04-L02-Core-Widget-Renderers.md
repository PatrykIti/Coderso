# TASK-480-04-L02: Core Widget Renderers
# FileName: TASK-480-04-L02-Core-Widget-Renderers.md

**Priority:** High
**Category:** Admin UI / Dashboard / Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-480-04-L01 (registry + host) · TASK-480-02 (config + data union) · TASK-479-06-L02 (`StatCard`, `Charts`, `StatusBadge`, `DataTable`, `EmptyState`, `SectionCard`)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-480-04

---

## Overview

Implement the eight core renderer components registered in L01. Each is a thin,
**schema-driven**, presentational component that reads its already-validated
`widget.config` and its narrowed `DashboardWidgetData` variant and renders with
the TASK-479 shared pattern library (`StatCard`, pure-SVG `charts`,
`StatusBadge`, `DataTable`, `EmptyState`). Renderers do **no fetching**, hold
**no state** (beyond trivial lazy `useState` for local view toggles, lifted via
callbacks where needed), and run **no effects** — they are total functions of
`{widget, data}`. The existing fixed dashboard cards
(`SiteHealthCard`, `SecurityStatusCard`, `RecentEditsTable`) are **generalized**
into these renderers (config-driven), not duplicated.

- **Goal:** Eight token-styled renderers — `StatWidget`, `ChartWidget`,
  `RecentActivityWidget`, `ContentTypeCountWidget`, `StorageWidget`,
  `SiteHealthWidget`, `QuickActionsWidget`, `ContentQueryWidget` — that the host
  dispatches to, each covering its normal render plus graceful per-renderer
  degenerate cases (the host already covers top-level loading/empty/error).
- **Owning module/service:** `core/admin/ui/dashboard/widgets/renderers/*`
  (`StatWidget.tsx`, `ChartWidget.tsx`, `RecentActivityWidget.tsx`,
  `ContentTypeCountWidget.tsx`, `StorageWidget.tsx`, `SiteHealthWidget.tsx`,
  `QuickActionsWidget.tsx`, `ContentQueryWidget.tsx`).
- **Source-of-truth docs:**
  - Config + data union (import only): `core/services/dashboard/dashboardTypes.ts` (TASK-480-02).
  - Shared patterns: `core/admin/ui/shared/{StatCard,Charts,StatusBadge,DataTable,EmptyState}.tsx` (TASK-479-06-L02).
  - Prototype reference: `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx` (Stat grid, AreaChart/Donut, activity feed, tasks/links).
  - Cards being generalized: `core/admin/ui/dashboard/{SiteHealthCard,SecurityStatusCard,RecentEditsTable,StatCard}.tsx`.
  - Canonical nav: `core/admin/utils/adminPaths.ts` + `core/admin/ui/shared/AdminLink.tsx` (QuickActions/ContentQuery row links).
- **Out of scope:** Defining/normalizing config or data (→ 480-02); fetching the
  data (→ 480-03); the host chrome (→ L01); the builder’s per-widget config
  editors (→ 480-05). Renderers never re-validate or re-fetch.

> **Distinct from `core/widgets/*`:** these render **admin Dashboard panels** from
> CMS data, not page/content widgets. No import from `core/widgets/*`.

---

## Security Contract

- **Endpoint visibility / Auth / RBAC / CSRF / Rate-limit:** n/a — presentational
  only. (Data is gated upstream by TASK-480-03: session + `content:read`.)
- **Validation:** renderers consume the **normalized** discriminated union from
  480-02; they never parse raw input and reject nothing themselves (the schema
  already did). They tolerate the documented edges (0 rows, `usedPercent: null`,
  `limitBytes: null`, missing `delta`) without throwing.
- **Navigation safety:** `QuickActionsWidget` and `ContentQueryWidget` row links
  route **only** through `adminPaths.*` + `AdminLink`; action targets are an
  **allow-listed** set resolved by 480-02 (no raw/user-supplied hrefs rendered as
  links — an unknown target renders disabled/as text, never a live arbitrary URL).
- **Secret handling:** render only the redacted fields present in
  `DashboardWidgetData` (e.g. `RecentActivity` uses `author.name ?? author.email`
  exactly as the existing `RecentEditsTable` does — no extra PII). Untrusted
  text (e.g. a `contentQuery` cell value) is rendered as **text**; never
  `dangerouslySetInnerHTML`.

---

## Implementation Pseudocode

All renderers use the L01 prop shape
`DashboardWidgetRendererProps<"<type>"> = { widget, data }` (already narrowed).
Group by family.

### Family A — Counters: `StatWidget`, `ContentTypeCountWidget`

```tsx
// renderers/StatWidget.tsx — data: { type:"stat"; value:number; formatted:string;
//   delta?: { value:number; trend:"up"|"down"|"flat"; label?:string }; spark?: number[] }
// config: { metric: StatMetricId; accent?: "primary"|"success"|"warning"; format?: "number"|"bytes"|"percent" }
export function StatWidget({ widget, data }: DashboardWidgetRendererProps<"stat">) {
  return (
    <StatCard                                   // shared StatCard (479-06-L02)
      label={widget.title}
      value={data.formatted}                    // formatting done in 480-02; renderer just displays
      delta={data.delta?.label ?? formatDelta(data.delta)}
      trend={data.delta?.trend ?? "flat"}
      accent={widget.config.accent ?? "primary"}
      spark={data.spark}                         // omit prop when no real series → no sparkline (never faked)
    />
  );
}

// renderers/ContentTypeCountWidget.tsx — data: { type:"contentTypeCount";
//   counts: { slug:string; label:string; count:number; href?:string }[] }
// config: { display:"bars"|"list"; limit?:number }   (limit already applied upstream)
export function ContentTypeCountWidget({ widget, data }: DashboardWidgetRendererProps<"contentTypeCount">) {
  const max = Math.max(...data.counts.map((c) => c.count), 1);
  if (widget.config.display === "bars") {
    return <BarChart data={data.counts.map((c) => c.count)} labels={data.counts.map((c) => c.label)} />;
  }
  return (
    <ul className="divide-y divide-border">
      {data.counts.map((c) => (
        <li key={c.slug} className="flex items-center gap-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.label}</span>
          <span className="h-1.5 w-24 rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.count / max) * 100}%` }} />
          </span>
          <span className="w-10 text-right font-medium tabular-nums">{c.count.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
  );
}
```

### Family B — Charts: `ChartWidget`

```tsx
// renderers/ChartWidget.tsx — config: { kind:"area"|"bar"|"donut"; range?:"24h"|"7d"|"30d" }
// data: { type:"chart"; kind:"area"|"bar"|"donut";
//         series: { id:string; label:string; color?:string; points:number[] }[];
//         categories?: string[]; segments?: { label:string; value:number; color:string }[] }
export function ChartWidget({ widget, data }: DashboardWidgetRendererProps<"chart">) {
  switch (data.kind) {                          // trust data.kind (host already matched type)
    case "area":
      return <AreaChart data={data.series[0]?.points ?? []} />;        // shared pure-SVG AreaChart
    case "bar":
      return <BarChart data={data.series[0]?.points ?? []} labels={data.categories} />;
    case "donut":
      return (
        <div className="flex flex-col items-center gap-4">
          <Donut segments={(data.segments ?? []).map((s) => ({ value: s.value, color: s.color, label: s.label }))} />
          <DonutLegend segments={data.segments ?? []} />
        </div>
      );
    default: { const _never: never = data.kind; return null; }
  }
}
// NOTE: charts are decorative SVG (role="img" aria-hidden); pair with a visually-hidden
// data summary <ul> for a11y so screen readers get the numbers (chart itself is hidden).
```

### Family C — Lists / Tables: `RecentActivityWidget`, `ContentQueryWidget`

```tsx
// renderers/RecentActivityWidget.tsx — data: { type:"recentActivity";
//   items: DashboardRecentEdit[] }  (reuses the existing recent-edit shape)
// config: { limit?:number; types?: ("page"|"entry"|"media")[] }  (applied upstream)
export function RecentActivityWidget({ data }: DashboardWidgetRendererProps<"recentActivity">) {
  return (
    <ul className="divide-y divide-border">
      {data.items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {ICON_FOR_TYPE[item.type]}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <AdminLink href={hrefForEdit(item)} prefetch className="truncate font-medium hover:text-primary">
              {item.title}
            </AdminLink>
            <div className="truncate text-xs text-muted-foreground">
              {item.author.name ?? item.author.email ?? "System"}
            </div>
          </div>
          <StatusBadge status={item.status} />                  {/* shared StatusBadge */}
          <span className="shrink-0 text-xs text-muted-foreground">{toRelative(item.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
  // hrefForEdit(item): switch(item.type) → adminPaths.pageEditor/entryEditor/mediaDetail(item.id);
  //   unknown → undefined → render title as plain <span> (never a raw href).
}

// renderers/ContentQueryWidget.tsx — config: { typeSlug:string; columns: ColumnDef[];
//   limit?:number; sort?:{ field:string; dir:"asc"|"desc" } }  (query resolved upstream)
// data: { type:"contentQuery"; columns: { key:string; label:string }[]; rows: Record<string,string|number>[] }
export function ContentQueryWidget({ data }: DashboardWidgetRendererProps<"contentQuery">) {
  return (
    <DataTable                                         // shared generic DataTable (479-06-L02)
      columns={data.columns.map((c) => ({ key: c.key, header: c.label, cell: (row) => String(row[c.key] ?? "") }))}
      rows={data.rows}
    />
    // String(...) guarantees text rendering — never inject HTML from a content value.
  );
}
```

### Family D — Health / Usage: `StorageWidget`, `SiteHealthWidget`

```tsx
// renderers/StorageWidget.tsx — data: { type:"storage"; usedBytes:number;
//   limitBytes:number|null; usedPercent:number|null; breakdown?: { label:string; bytes:number }[] }
export function StorageWidget({ data }: DashboardWidgetRendererProps<"storage">) {
  const display = data.usedPercent === null ? `${formatBytes(data.usedBytes)} (no limit)` : `${data.usedPercent}%`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Storage used</span>
        <span className="font-medium">{display}</span>
      </div>
      <Progress value={data.usedPercent ?? 0} className="h-2" />   {/* reuse ui/progress, as SiteHealthCard does today */}
      {data.breakdown ? <StorageBreakdown items={data.breakdown} /> : null}
    </div>
  );
}

// renderers/SiteHealthWidget.tsx — data: { type:"siteHealth"; security: DashboardSecuritySummary }
// Generalizes SecurityStatusCard/SiteHealthCard into a panel body.
export function SiteHealthWidget({ data }: DashboardWidgetRendererProps<"siteHealth">) {
  const { security } = data;
  const passing = security.checks.length - security.issues;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{passing}/{security.checks.length} checks passing</span>
        <StatusBadge status={security.status === "ok" ? "published" : security.status === "warning" ? "pending" : "draft"} />
      </div>
      <ul className="space-y-2">
        {security.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            <HealthDot status={c.status} />
            <div><div className="font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{c.detail}</div></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Family E — Actions: `QuickActionsWidget`

```tsx
// renderers/QuickActionsWidget.tsx — config + data: { type:"quickActions";
//   actions: { id: QuickActionId; label:string; target: AdminPathKey; icon?:string }[] }
// `target` is an ALLOW-LISTED adminPaths key resolved in 480-02 — never a raw URL.
export function QuickActionsWidget({ data }: DashboardWidgetRendererProps<"quickActions">) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {data.actions.map((a) => {
        const href = resolveAdminPath(a.target);          // returns undefined for unknown key
        const inner = (<><Icon name={a.icon} className="size-4" /> <span>{a.label}</span></>);
        return href
          ? <AdminLink key={a.id} href={href} prefetch><Button variant="soft" className="w-full justify-start gap-2">{inner}</Button></AdminLink>
          : <Button key={a.id} variant="soft" className="w-full justify-start gap-2 opacity-50" disabled>{inner}</Button>;
      })}
    </div>
  );
}
```

**Data flow:** host hands `{widget, data}` (narrowed) → renderer reads
`widget.config` for presentation choices (display mode, accent, chart kind) and
`data` for values → composes shared patterns. **No fetch, no effect**; formatting
(`formatted`, `usedPercent`, relative times where centralized) is done upstream in
480-02 — renderers only display, and use small local pure formatters
(`formatBytes`, `toRelative`) reused from the existing dashboard cards.

**Error handling:** none thrown — renderers tolerate degenerate-but-valid data
(`usedPercent: null`, empty `series[0]`, missing `delta`, unknown nav target →
text/disabled). True loading/empty/error are the host’s job (L01).

**Regression-test shape (delivered in L03):** one render test per renderer
asserting (a) normal data renders the expected marker/value, (b) the degenerate
edge renders without throwing (null storage limit, empty chart series, unknown
quick-action target → disabled button, content-query cell renders as text).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`
- Existing dashboard suites stay green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx tests/vitest/ui/stat-card.test.tsx`
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — fill the "Renderer catalog" table: one row
  per renderer (type → config keys consumed → data shape → shared patterns used →
  degenerate-data behavior).
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-04-L02`;
  note the generalization of `SiteHealthCard`/`SecurityStatusCard`/`RecentEditsTable`
  into config-driven renderers.
