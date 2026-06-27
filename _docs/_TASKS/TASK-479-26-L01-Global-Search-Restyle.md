# TASK-479-26-L01: Global Search Restyle
# FileName: TASK-479-26-L01-Global-Search-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Global Search screen to the prototype: a **centered** search hero
(large rounded input + leading icon + ⌘K kbd), a **Recent searches** chip row, and a
soft `rounded-2xl` card of **grouped results** (Pages / Posts / Media / Users) with
leading icon tiles + type badges. All search querying, debouncing, recent-search
hydration, category/date-range filtering, and navigation stay byte-for-byte the same.

- **Goal:** `core/admin/ui/search/SearchPage.tsx` (+ `SearchResults.tsx`,
  `SearchBar.tsx`) looks like `_docs/_PROTOTYPE/src/pages/tools/SearchPage.tsx` while
  preserving the existing `useSearchResults` flow and the `searchClient` cache contract.
- **Owning module/service:** `core/admin/ui/search/SearchPage.tsx`,
  `core/admin/ui/search/SearchResults.tsx`, `core/admin/ui/search/SearchBar.tsx`.
  Shared `Card`/`Input`/`Badge`/`Tabs`/`Select`/`Separator` primitives restyled in
  TASK-479-06-L01; `EmptyState` from TASK-479-06-L02.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/SearchPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{SectionCard,EmptyState}.tsx` and prototype
  UI `_docs/_PROTOTYPE/src/components/ui/{input,badge,tabs}.tsx`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `searchClient` (`listRecentSearchesCached`,
  `getCachedRecentSearches`, `normalizeSearchDateRange`, `DEFAULT_SEARCH_DATE_RANGE`),
  to `useSearchResults`, to `searchNavigation.ts` (`resolveSearchDestination`), to the
  recent-searches cache, or to RBAC. The category + date-range **filter controls and
  their wiring are preserved** (they may be relocated, never removed). The cmd-palette
  `SearchBar` in the top bar is out of scope except where it shares restyled primitives.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `SearchPage.tsx` (the lazy-init
`useState(() => getCachedRecentSearches())`, the two `refreshRecent` hydrate effects
wrapped in `setTimeout(..., 0)` / `setTimeout(..., 150)`, `useSearchResults`,
`categorySelection`/`dateRange` state, the `useMemo` derivations
`categoryIds`/`activeCategorySelection`/`activeCategoryLabels`/`filteredItems`/
`filteredGroups`/`categoryHelper`, `resolveSearchEmptyState`, and the
`handleSelect`/`handlePrefetch` navigate/prefetch calls). Keep the render-tree
behavior identical; change layout + classNames.

```tsx
// SearchPage.tsx — RENDER ONLY changes inside the existing return().
// Replace the current 2-column [sidebar | search+tabs] grid with the prototype's
// centered single column, but KEEP every control + handler. The category/date-range
// filters move into a collapsible "Filters" disclosure under the hero (NOT removed).

<AdminShell activeHref="/admin/search" showSearch={false} breadcrumbs={["Search"]}>
  <div className="mx-auto w-full max-w-2xl">
    {/* 1) Centered heading (port prototype mb-8 text-center block). */}
    <header className="mb-8 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Search</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Find anything across pages, content, media, and people.
      </p>
    </header>

    {/* 2) Search hero — KEEP value={query} onChange={setQuery} (the existing
        controlled input that drives useSearchResults). Port h-12 rounded-2xl
        pl-12 pr-16 shadow-card + leading Search icon + ⌘K kbd. */}
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages, content, media, users…"
             className="h-12 rounded-2xl pl-12 pr-16 text-base shadow-card" />
      <kbd className="…absolute right-4…">⌘K</kbd>
    </div>

    {/* 3) Recent chips — bind to the EXISTING recentSearches state (do NOT add a
        new fetch). Click sets query via the existing setQuery. Keep recentError
        rendering. Port Badge variant="outline" hover row. */}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Recent</span>
      {recentSearches.map((item) => (
        <Badge key={item} variant="outline" className="cursor-pointer hover:bg-muted"
               onClick={() => setQuery(item)}>{item}</Badge>
      ))}
    </div>

    {/* 4) Filters disclosure — relocate the PRESERVED Date Range Select + Category
        Checkbox list here. Keep value/onValueChange={setDateRange via
        normalizeSearchDateRange}, the Checkbox onCheckedChange setCategorySelection
        logic, the Clear button (setCategorySelection([])), and categoryHelper copy.
        No filter logic changes — just the container. */}

    {/* 5) Grouped results card — render SearchResults (variant="page") inside a
        rounded-2xl SectionCard with bodyClassName="p-0". SearchResults keeps groups=
        filterGroups(filteredGroups, contentFilter), emptyState=resolveSearchEmptyState(…),
        onSelect=handleSelect, onPrefetch=handlePrefetch, onViewAll=setContentFilter.
        Inside SearchResults.tsx, restyle each result ROW to the prototype:
          rounded-xl icon tile (bg-primary-soft) + title + muted path + type Badge,
          hover:bg-muted, divide-y group sections with xs uppercase group label.
        Keep the loading / error / not-enough-chars states (Type 2 chars / Searching /
        Search failed) but restyle them to the soft dashed EmptyState card. */}
  </div>
</AdminShell>
```

**Data flow:** `getCachedRecentSearches()` lazy init → `refreshRecent()` hydrate +
forced refresh after a completed query → `useSearchResults(query,{limit,dateRange})`
→ `filteredItems`/`filteredGroups` (render-time `useMemo`) → `SearchResults` rows.
The restyle changes none of these edges; the relocated filters and recent chips only
read/write the existing `dateRange` / `categorySelection` / `query` state.

**Navigation/href constraint (preserve):** Result rows must keep routing through the
canonical helpers — keep `handleSelect`/`handlePrefetch` calling
`resolveSearchDestination(item)` then `navigate(...)`/`prefetch(...)` from
`useAdminRouter()`. Do NOT hand-build `<a href>` or string-concat admin URLs; the
prototype's `<Link to="/search">` placeholders are mock-only and must be replaced by
the existing destination resolution, not copied.

**Error handling:** Keep `recentError` (recent-search load failure) and the search
error branch ("Search failed. Try again.") with their existing conditions; restyle to
the soft dashed `EmptyState`/card look. The `resolveSearchEmptyState` copy
(no-searchable-content / out-of-date-range / no-results / category-empty / type-empty)
is unchanged. No new error surfaces.

**React-hooks/cache rules:** Do not add a mount effect that force-refetches results.
The two `refreshRecent` effects (debounced via `setTimeout`) and `useSearchResults`'
own debounce are the only data effects and must be left untouched (no dirty-state
overwrite, no refetch loop). Recent chips + filters derive from existing state — no
synchronous `setState` in an effect.

**Regression-test shape:** see L07 — render `SearchPage` with a seeded
`getCachedRecentSearches` and a stubbed `useSearchResults`; assert: centered heading +
hero input present, typing updates `query` (drives the input value), recent chips
render and clicking one sets the query, grouped results render with group labels +
type badges + leading icon tiles, the Date Range Select + Category checkboxes are
present and writable, selecting a result calls `navigate` with the
`resolveSearchDestination` value, and the not-enough-chars / loading / error states
render the soft EmptyState card.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-search-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing search-adjacent suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx tests/vitest/ui/search-navigation.test.tsx tests/vitest/admin/searchClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L01`.
- If a shared `EmptyState`/`Badge` variant is introduced/changed for Search, note it
  alongside the TASK-479-06 shell notes so the other Tools screens reuse it.
