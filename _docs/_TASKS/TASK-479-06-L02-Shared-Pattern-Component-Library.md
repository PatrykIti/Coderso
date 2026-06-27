# TASK-479-06-L02: Shared Pattern Component Library
# FileName: TASK-479-06-L02-Shared-Pattern-Component-Library.md

**Priority:** Medium
**Category:** Admin UI / Design System / Patterns
**Estimated Effort:** Large
**Dependencies:** TASK-479-06-L01 (primitives provide the variants these patterns compose)
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Add the prototype's reusable composition patterns under
  `core/admin/ui/shared` so TASK-479-07 can restyle real pages by swapping in
  these structures while keeping each page's data/logic. Deliver: extend the
  existing `PageHeader` (icon + breadcrumbs + larger display title), and add
  `SectionCard`, `DataTable`, `StatCard`, `FilterBar`, `EmptyState`,
  `StatusBadge`, `SettingsSection` (+`SettingsField`), `SectionHeader` retheme,
  and pure-SVG `charts` (Area/Bar/Sparkline/Donut). `ListPaginationFooter`
  already exists — restyle it to the new look without changing its API.
- **Owning module/service:** `core/admin/ui/shared/{PageHeader,SectionHeader,SectionCard,DataTable,StatCard,FilterBar,EmptyState,StatusBadge,SettingsSection,Charts,ListPaginationFooter}.tsx`.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/src/components/patterns/*` (port
  source); `_docs/_PROTOTYPE/README.md` §"Patterns/shell"; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** Wiring these into real pages (→ TASK-479-07); editor preview
  frame (`EditorPreviewFrame.tsx` is prototype-only chrome — the real canvas
  comes from L06); changing `ListPaginationFooter`'s props/behavior.

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Charts are pure-SVG, deterministic, and
decorative (`role="img" aria-hidden`) — no data fetching.

## Implementation Pseudocode

Each new file is a thin, presentational shared component ported 1:1 from the
named prototype pattern, re-pathed onto real imports (`@/components/ui/*`,
`@/lib/utils` `cn`, `@/ui/shared/AdminLink` instead of the prototype `Link`).

### `PageHeader.tsx` (EXTEND existing — port `patterns/PageHeader.tsx`)

```tsx
// Current real PageHeader = title/description/actions only.
// ADD optional `icon` (rounded-2xl bg-primary-soft tile) + `breadcrumbs`.
// Breadcrumbs MUST use AdminLink + adminPaths, NOT the prototype <Link>.
type Crumb = { label: string; href?: string };  // href, not `to`
export function PageHeader({ title, description, actions, breadcrumbs, icon, className }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode;
  breadcrumbs?: Crumb[]; icon?: React.ReactNode; className?: string;
}) {
  // <nav> of breadcrumbs -> crumb.href ? <AdminLink href={crumb.href} prefetch> : <span>
  // header row: icon tile (size-11 rounded-2xl bg-primary-soft) + h1 font-display text-2xl
  // KEEP backward-compat: existing callers passing only title/description/actions still render.
}
```

### New shared patterns (port from prototype)

```text
SectionCard.tsx     <- patterns/SectionCard.tsx   (title/description/icon/action header + body, rounded-2xl)
DataTable.tsx       <- patterns/DataTable.tsx      (Column<Row> config, selectable, onRowClick; uses ui/table + ui/checkbox)
StatCard.tsx        <- patterns/StatCard.tsx       (label/value/delta/trend/icon/spark/hint; uses Sparkline)
FilterBar.tsx       <- patterns/FilterBar.tsx      (search input + filters + grid/list view toggle)
EmptyState.tsx      <- patterns/EmptyState.tsx     (icon tile + title + description + action, dashed card)
StatusBadge.tsx     <- patterns/StatusBadge.tsx    (status->variant MAP using L01 badge soft/success/warning/info)
SettingsSection.tsx <- patterns/SettingsSection.tsx(+ SettingsField; two-col sticky settings layout)
Charts.tsx          <- patterns/charts.tsx         (AreaChart/BarChart/Sparkline/Donut, pure SVG, useId, tokens)
SectionHeader.tsx   (RETHEME existing) -> match SectionCard header type scale + spacing
```

```tsx
// DataTable: keep generic + ReactNode columns; only the wrapper styling changes.
export function DataTable<Row extends Record<string, unknown>>({
  columns, rows, selectable, onRowClick, className,
}: { columns: Column<Row>[]; rows: Row[]; selectable?: boolean;
     onRowClick?: (row: Row) => void; className?: string }) {
  // rounded-2xl border bg-card shadow-soft wrapper around <Table>
  // selectable -> Checkbox header/cell; onRowClick -> cursor-pointer row, stopPropagation on the checkbox cell
}

// StatusBadge: domain status string -> { variant, dot } map. capitalize label.
const MAP = { published:{variant:"success",dot:"bg-success"}, draft:{variant:"secondary",dot:"bg-muted-foreground"},
              pending:{variant:"warning",dot:"bg-warning"}, scheduled:{variant:"info",dot:"bg-info"}, /* ...proto MAP */ };
// fallback -> { variant: "outline", dot: "bg-muted-foreground" }.
```

**Data flow:** all patterns are presentational; data is passed by the page that
adopts them in TASK-479-07. No internal fetch, no `useEffect` data loads, no
global state. Any interactive sub-state (e.g. `FilterBar` view toggle) is lifted
to the caller via callbacks (`onViewChange`) or kept as lazy `useState`.

**Error handling:** N/A at the pattern layer. `DataTable` renders `rows` as
given; empty `rows` should pair with `EmptyState` at the call site. Charts clamp
divisors (`|| 1`) to avoid NaN paths.

**Regression-test shape:** (L07)
- `PageHeader`: renders breadcrumb `AdminLink`s with resolved hrefs; still
  renders with only `title`.
- `DataTable`: renders header + N rows; `selectable` adds checkboxes;
  `onRowClick` fires once and the checkbox cell does not trigger it.
- `StatusBadge`: known status -> expected variant class; unknown -> `outline`.
- `Charts`: render without throwing for empty/one-point/normal series.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/shared-patterns` (added in L07)
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (no regression in suites importing PageHeader / ListPaginationFooter)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/DESIGN_TOKENS.md` / `_docs/UI/` — document the shared pattern catalog
  available to TASK-479-07 (names + props).
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L02.
