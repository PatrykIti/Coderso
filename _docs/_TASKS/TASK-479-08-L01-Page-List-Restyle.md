# TASK-479-08-L01: Page List Restyle
# FileName: TASK-479-08-L01-Page-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Pages)
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-08

---

## Overview

Restyle the real Pages list to the prototype look: a `PageHeader` with title +
description + actions, status **tabs** (All / Published / Drafts / Scheduled /
Archived) rendered via the shared `StatusTabs` from **TASK-479-06-L02** (core Tabs
`line` variant), a `FilterBar` (search + filters), a `DataTable` with the columns
**Title · Status · Author · Updated · Views**, a violet-aware `StatusBadge`, and
pagination. The status set is the **real `PageStatus` enum**
(`draft | published | scheduled | archived` — there is no `trash`/`review`). The
prototype's `PageListPage.tsx` renders a `trash` status tab that does NOT exist in
core — when porting, map it to the real `archived` status; do not copy the
prototype's `trash` tab. The list keeps its real data source, filtering, selection,
bulk actions, and cache wiring untouched.

- **Goal:** `core/admin/ui/pages/PageListPage.tsx` and its row/filter children
  render in the new design language without changing data flow, selection, bulk
  actions, or the cache contract.
- **Owning module/service:** `core/admin/ui/pages/PageListPage.tsx`,
  `core/admin/ui/pages/PageFilters.tsx`, `core/admin/ui/pages/PageTable.tsx`,
  `core/admin/ui/pages/PageBulkActionsBar.tsx`; shared `core/admin/ui/shared/PageHeader.tsx`,
  `core/admin/ui/shared/ListPaginationFooter.tsx`, `core/admin/components/ui/*`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md` (token names),
  `_docs/TESTING_STRATEGY.md` (Vitest lane). **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/pages/content/PageListPage.tsx`; pattern primitives
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,FilterBar,DataTable,Pagination,StatusBadge}.tsx`.
  Tabs are the shared `StatusTabs` (created by **TASK-479-06-L02**) over the core
  `core/admin/components/ui/tabs.tsx` `line` variant — the prototype calls the same
  look "underline", but the core variant name is `line`.
- **Out of scope:** No change to `listPagesCached`/`getCachedPages`/`createPage`/
  `publishPage`/`deletePage`/`duplicatePage` clients, no new columns beyond those
  listed, no new endpoints, no bulk-action semantics changes. The page **Views**
  column is display-only. The real `PageSummary` (`core/admin/services/pagesClient.ts`)
  exposes only `{ id, title, slug, status, updatedAt, author }` — **no view count** —
  so per the owner's de-fabrication rule the Views cell renders an em-dash for every
  row (never a random number like the prototype mock). Keep the column header for the
  prototype's visual parity; do not wire it to a fabricated metric.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The "Templates" action and "New page" CTA
keep routing through `AdminLink` + `adminPaths`/`prefetchAdminRoute`; nothing in
this leaf touches auth, RBAC, CSRF, or the pages cache keys.

---

## Implementation Pseudocode

Keep `PageListPage`'s entire state/effect/handler block (lines ~66–371 today)
**verbatim** — `getCachedPages`, `listPagesCached`, `subscribeCacheEvents`,
`resolveCacheRefreshBackground`, `resolvePageListMountRefreshOptions`,
`useListPagination`, selection, and bulk handlers are the cache/RBAC contract.
Only the **returned JSX** (lines ~373–481) and the row/filter children change.

```tsx
// core/admin/ui/pages/PageListPage.tsx  (render only — logic unchanged)
// Port the visual shells from _docs/_PROTOTYPE/src/pages/content/PageListPage.tsx
return (
  <AdminShell activeHref="/admin/pages" breadcrumbs={["Content", "Pages"]}>
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* PageHeader — restyle the SHARED core PageHeader to the prototype's
          title/description/actions shape (TASK-479-06 already restyled it);
          here just pass description + the existing actions cluster. */}
      <PageHeader
        title="Pages"
        description="Create, organize, and publish the pages of your site."
        actions={/* keep existing: bulk bar (when selectedCount>0), Templates
                    AdminLink (prefetch), New button -> setCreateOpen(true) */}
      />

      {error ? <Alert variant="destructive">…</Alert> : null}

      {/* STATUS TABS — shared StatusTabs from 479-06-L02. Derive from REAL data,
          not mock counts. counts = useMemo(() => groupBy(items, p => p.status),
          [items]) and map status->tab. Selecting a tab sets the EXISTING
          statusFilter state (setStatusFilter) that filterPages() already consumes
          (matchesStatus = status === "all" || page.status === status). The tab
          values are exactly the real PageStatus enum + "all":
          all | published | draft | scheduled | archived. There is NO "trash" and
          NO "review" status in core — do not invent them. */}
      <StatusTabs                       // shared primitive from 479-06-L02
        value={statusFilter}
        onChange={setStatusFilter}      // reuse existing state, no new source
        items={statusTabItems}          // {value,label,count} from items
      />

      {/* FILTER BAR — restyle PageFilters.tsx to the prototype FilterBar shape
          (search input + status/author selects). KEEP its props/handlers:
          search, status, author, authorOptions, onSearchChange, onStatusChange,
          onAuthorChange. (Status may live in the tabs row; keep author here.) */}
      <PageFilters … unchanged props … />

      {isLoading ? <ListSkeleton/> /* shared skeleton from 479-06-L02 */ : (
        // DATA TABLE — restyle PageTable.tsx using the prototype DataTable look:
        //   columns: Title (icon + title + mono slug, links via AdminLink to the
        //   page editor href from adminPaths), Status (StatusBadge), Author
        //   (Avatar + first name), Updated (muted), Views (right-aligned tabular
        //   — em-dash if absent), row actions menu. KEEP selection
        //   (selectedIds/isAllSelected/isIndeterminate/onToggleAll/onTogglePage)
        //   and the existing onEdit/onPreview/onPublish/onUnpublish/onDuplicate/
        //   onDelete handlers exactly.
        <PageTable items={pagination.visibleRows} …unchanged handlers… />
      )}

      <ListPaginationFooter resourceLabel="pages" pagination={pagination} isLoading={isLoading} />
    </div>
    {/* PageCreateDrawer + both ConfirmActionDialogs unchanged */}
  </AdminShell>
);
```

```tsx
// StatusBadge mapping (restyle core badge; mirror prototype StatusBadge tones).
// Cover EXACTLY the real PageStatus members (draft|published|scheduled|archived):
//   published -> success/emerald soft, draft -> muted/neutral soft,
//   scheduled -> violet/primary soft, archived -> secondary/neutral soft.
// Do NOT add a "review" or "trash" tone — those statuses do not exist in core.
// Use the SHARED StatusBadge + status-token classes from the design system
// (TASK-479-06-L02 StatusBadge / TASK-479-05 soft tokens), NOT hard-coded hexes.
// There is an existing helper pageEditorStatusBadgeClassName in
// core/admin/ui/pages/editor/pageEditorOptions.ts (today only a 2-state
// published-vs-other map) — extend it to the full status set and extract/share a
// single status->className map so list + editor stay consistent (place it next to
// the shared StatusBadge UI primitive).
```

**Data flow:** `getCachedPages()` lazy-init → render from cache → mount
`listPagesCached` hydrate (background when cached) → `subscribeCacheEvents` on
`cacheKeys.pagesList` triggers background refresh → `filterPages` + `useListPagination`
derive visible rows. **None of this moves**; restyle is presentational. Row links
and the Templates/New actions resolve hrefs via `adminPaths`/`AdminLink` (never
hand-built strings) and keep `prefetch`.

**Error handling:** keep the existing `error` Alert and `pageListToasts`
success/error adapter calls; no new error surfaces. Tabs/filter changes must not
trigger a refetch (they filter the already-loaded `items` array). Do **not** add a
mount-force refetch or any `useEffect` that `setState`s synchronously from derived
data — compute tab counts with `useMemo`/render-time derivation (ESLint 9
react-hooks compliant).

**Regression-test shape:** see TASK-479-08-L03 — assert header/description/tabs/
columns render, cached-vs-loading branch, Templates href is `"/admin/advanced/page-templates"`,
selection + bulk bar appear, and no new network/refetch on tab switch.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-list-filters.test.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-row-actions.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx`
- Existing assertions in `page-list.test.tsx` (header "Pages", "Templates", "New",
  "Loading pages", the templates href, Templates-before-New ordering) must remain
  true — update them only if the visual structure intentionally relabels, and add
  the new-structure assertions in L03.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-08-L01**.
- No contract doc changes expected (visual-only). If the status-tab set or the
  Views column resolution materially differs from `PageSummary`, note it in the
  changelog entry.
