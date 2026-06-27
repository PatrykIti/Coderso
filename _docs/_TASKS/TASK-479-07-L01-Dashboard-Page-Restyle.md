# TASK-479-07-L01: Dashboard Page Restyle
# FileName: TASK-479-07-L01-Dashboard-Page-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Dashboard
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-07

---

## Overview

Port the prototype Dashboard layout onto the real admin Dashboard. Replace the
current ad-hoc grid with the prototype's `PageHeader` + stat-card grid (with
sparklines) + a `SectionCard`-based body (content donut, recently-edited list,
site-health / security cards). Every section that has a real data source is wired
to `DashboardPayload`; prototype-only decorative sections without a backing
endpoint are NOT faked — they are omitted or shown as a clearly-marked static
placeholder with a follow-up note.

- **Goal:** `core/admin/ui/dashboard/DashboardPage.tsx` (and the dashboard child
  cards it composes) visually match `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`
  while preserving the real fetch/hydration, loading/error states, RBAC, and
  canonical link helpers.
- **Owning module/service:** `core/admin/ui/dashboard/DashboardPage.tsx`,
  `core/admin/ui/dashboard/StatCard.tsx`,
  `core/admin/ui/dashboard/RecentEditsTable.tsx`,
  `core/admin/ui/dashboard/SiteHealthCard.tsx`,
  `core/admin/ui/dashboard/SecurityStatusCard.tsx`.
- **Source-of-truth docs:**
  - Prototype page: `_docs/_PROTOTYPE/src/pages/DashboardPage.tsx`
  - Prototype patterns: `_docs/_PROTOTYPE/src/components/patterns/{StatCard,SectionCard,PageHeader,charts}.tsx`
  - Shared shell/patterns/charts: delivered by TASK-479-06 (consume them; do not redefine here)
  - Data contract: `core/services/dashboard/dashboardTypes.ts` (`DashboardPayload`)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No data-layer changes (`dashboardClient`/`DashboardPayload`
  untouched); no new metrics endpoints; no new routes; do not invent a
  traffic/analytics time-series or a generic activity feed backed by fake data.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Concretely:

- Keep `getDashboardData()` and the `DashboardPayload` shape exactly as today; do
  not add client calls.
- Every in-page navigation (recently-edited rows, "All pages", "View all", etc.)
  MUST route through the shared canonical helpers — `adminPaths` for hrefs and
  `AdminLink`/`prefetchAdminRoute` for navigation/prefetch — never a hand-built
  string. (The prototype's `<Link to="/pages">`/`/audit` literals are mock-only;
  translate each to its `adminPaths.*` equivalent.)
- Preserve the existing data-hydration semantics: one fetch on mount via the
  `active`-flag effect plus the manual `refresh` button. Do NOT add a
  mount-force refetch loop, and do not overwrite in-flight/dirty state. If the
  dashboard later moves to `cachedClient`/`cacheBus`, keep its cache keys/TTL and
  cache-hydrate + background-revalidation contract intact.

---

## Implementation Pseudocode

### Section → real-data mapping (decide each, no fabricated data)

| Prototype section | Real source in `DashboardPayload` | Decision |
|-------------------|-----------------------------------|----------|
| Stat-card grid (4) | `totals.pages`, `totals.entries`, `totals.media`, `totals.users` + `storage` | Port with real values; sparkline optional (see below) |
| Content breakdown Donut | `totals` (pages / entries / media / users) | Port with real totals as segments |
| Recently edited list | `recentEdits[]` (title, path, status, author, updatedAt) | Restyle existing `RecentEditsTable` rows; reuse `StatusBadge` |
| Site health card | `storage` | Restyle existing `SiteHealthCard` inside a `SectionCard` |
| Security status card | `security` | Restyle existing `SecurityStatusCard` inside a `SectionCard` |
| Traffic AreaChart (time-series) | none | Omit OR render a clearly-labeled static placeholder; add follow-up task for a metrics endpoint |
| Generic activity feed | none (overlaps `recentEdits`) | Omit (recently-edited already covers it) |
| "Your tasks" / Tip card | none | Omit (pure decoration) |

> Sparklines: `DashboardPayload` carries no per-stat time-series, so render
> `StatCard` **without** a sparkline (the prop is optional) rather than
> fabricating one. If a real series is added later, pass it then.

### `StatCard.tsx` — restyle, keep the existing prop API

```tsx
// core/admin/ui/dashboard/StatCard.tsx
// Port the prototype StatCard look (soft Card, muted icon chip, font-display
// value, pill delta) but KEEP the current props (label, value, delta, icon,
// accent, className) so existing callers/tests don't break. Add OPTIONAL
// `spark`/`trend` for forward-compat with the shared Sparkline from 06-L02.
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/ui/shared/charts"; // shared module created in TASK-479-06-L02
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning";
  trend?: "up" | "down" | "flat";
  spark?: number[];           // optional; omit when no real series exists
  className?: string;
};

export function StatCard({ label, value, delta, icon, accent = "primary", trend = "up", spark, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>{/* rounded-2xl + soft shadow come from token restyle (479-05) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {icon ? <span className="flex size-7 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">{icon}</span> : null}
            {label}
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        {spark ? <Sparkline data={spark} tone={trend === "down" ? "destructive" : "primary"} /> : null}
      </div>
      {delta ? <DeltaPill delta={delta} trend={trend} accent={accent} /> : null}
    </Card>
  );
}
```

### `DashboardPage.tsx` — restyle the composition, keep the data wiring verbatim

```tsx
// core/admin/ui/dashboard/DashboardPage.tsx
// UNCHANGED: state (data/isLoading/error), the `refresh` useCallback, the
// `active`-flag mount effect, and the `cards` useMemo derived from totals/storage.
// Only the returned JSX changes. No sync setState in effects; keep render-time
// derivation (cards via useMemo) per ESLint 9 react-hooks rules.

return (
  <AdminShell activeHref={adminPaths.dashboard()}>{/* helper, not "/admin" literal */}
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader                                   // from shared shell/patterns (479-06)
        title="Dashboard"
        description="Welcome back, Admin. Here's what's happening today."
        actions={<RefreshButton onClick={...} disabled={isLoading} />}
      />

      {error ? <Alert variant="destructive">{/* AlertTitle/Description unchanged */}</Alert> : null}

      {/* Stat-card grid — real totals/storage from the existing `cards` useMemo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div aria-busy={isLoading} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recently edited (real recentEdits) — spans 2 cols */}
        <SectionCard
          className="lg:col-span-2" title="Recent Edits" padded={false} bodyClassName="p-0"
          action={<AdminLink to={adminPaths.pages()}>{/* ghost "All pages" */}</AdminLink>}
        >
          <RecentEditsTable items={data?.recentEdits ?? []} />{/* restyled rows + StatusBadge */}
        </SectionCard>

        {/* Content breakdown (real totals) */}
        <SectionCard title="Content breakdown" description="By type">
          <Donut segments={donutSegments(data?.totals)} />{/* shared Donut from 06-L02 */}
          <DonutLegend totals={data?.totals} />
        </SectionCard>
      </div>

      {/* Site health + security (real storage/security) restyled as SectionCards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SiteHealthCard storage={data?.storage ?? EMPTY_STORAGE} security={data?.security ?? EMPTY_SECURITY} />
        <SecurityStatusCard summary={data?.security ?? EMPTY_SECURITY} />
      </div>

      {isLoading ? <DashboardSkeleton /> : null}{/* keep a loading affordance — see error handling */}

      {/* Traffic/activity/tasks/tip: omitted or static placeholder ONLY (no fake data) */}
    </div>
  </AdminShell>
);
```

**Data flow:** mount effect calls `getDashboardData()` (unchanged) → resolves into
`data` → `cards` useMemo derives real stat values from `totals`/`storage` →
`donutSegments(totals)` derives donut from real counts → `RecentEditsTable`,
`SiteHealthCard`, `SecurityStatusCard` consume their real slices. No new fetches.

**Error handling:** preserve the existing `error` string state and the
`destructive` `Alert`; preserve the loading affordance so a render-time test can
still assert a loading marker (keep a `Loading dashboard…`-equivalent node or an
`aria-busy` skeleton — see L02). Guard all `data?.…` access with the existing
`?? EMPTY_*` fallbacks so the loading/empty render never throws.

**Regression-test shape (delivered in L02):**

- Render `DashboardPage` server-side via `renderAdminUi`; assert the loading
  state and the restyled section headings render without throwing.
- Assert links resolve to `adminPaths.*` targets (no raw `/pages`/`/audit`
  literals leaking from the prototype).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx`
- Keep `tests/vitest/admin/dashboardClient.test.ts` green (data contract
  untouched).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-07-L01`.
- If any decorative section is shipped as a static placeholder, file the
  follow-up (metrics/analytics endpoint for the traffic chart) and reference it
  in the changelog entry.
