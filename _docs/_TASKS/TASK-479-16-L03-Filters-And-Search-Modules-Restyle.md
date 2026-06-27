# TASK-479-16-L03: Filters & Search Modules Restyle
# FileName: TASK-479-16-L03-Filters-And-Search-Modules-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-16
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real **Filters** and **Search** preview screens to match the prototype:
soft `rounded-2xl` info/help cards, a redesigned `PageHeader`, soft bordered control
sections (listing-query select + runtime token input + Run-preview; search query +
limit + source switches), and softly carded result/summary surfaces. Both screens
remain **functional preview tools** (NOT the non-functional prototype mocks): the
runtime-token grammar preview and the public-search preview keep their exact request
logic, validation, and result rendering; only the chrome is restyled.

- **Goal:** `core/admin/ui/listings/ListingFiltersPage.tsx` adopts the look of
  `_docs/_PROTOTYPE/src/pages/advanced/FiltersPage.tsx`, and
  `core/admin/ui/listings/ListingSearchPage.tsx` adopts the look of
  `_docs/_PROTOTYPE/src/pages/advanced/SearchModulePage.tsx`, while preserving the
  facet/runtime-token config and the public-search preview behavior.
- **Owning module/service:** `core/admin/ui/listings/ListingFiltersPage.tsx`,
  `core/admin/ui/listings/ListingSearchPage.tsx`, and the
  `listings/hooks/useListingQueries.ts` they read. Shared primitives from
  TASK-479-05/06.
- **Source-of-truth docs:** prototype screens
  `_docs/_PROTOTYPE/src/pages/advanced/{FiltersPage,SearchModulePage}.tsx`;
  prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard}.tsx`; prototype
  ui `_docs/_PROTOTYPE/src/components/ui/{card,select,input,switch,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `previewListingFilters` / `previewPublicSearch`,
  the `extractListingQueryIdFromQueryString` parser, the
  `LISTING_QUERY_ID_PATTERN` validation, the runtime-token grammar / operators list,
  the public-search source set (`pages`/`entries`/`posts`), the `useListingQueries`
  cache contract, RBAC, or routing. The example-query generator
  (`queryExamples`/`runtimeTokenPrefix`) keeps its logic; only its card styling
  changes.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the preview logic in either file: in
`ListingFiltersPage.tsx` keep `useListingQueries`, `resolvedListingQueryId`,
`activeListingLabel`, `runtimeTokenPrefix`, `queryExamples`, `runPreview`
(including `extractListingQueryIdFromQueryString` + `LISTING_QUERY_ID_PATTERN`
guards and the `setSelectedListingQueryId(inferredId)` reconcile); in
`ListingSearchPage.tsx` keep `selectedSources` (`useMemo`), the limit parsing, and
`runPreview` calling `previewPublicSearch`. Keep behavior identical; swap the
section wrappers/classNames.

```tsx
// ListingFiltersPage.tsx — RENDER ONLY changes inside the existing return().
// 1) PageHeader: swap the bare PageHeader for the restyled @/ui/shared/PageHeader
//    (title "Filters", same description). Optional decorative <Badge>Beta</Badge>.
// 2) "How this works" <section>: re-skin to the prototype info card
//    (Card bg-primary-soft/50, rounded-2xl, leading Info icon tile). Keep copy.
// 3) Controls <section>: wrap in a SectionCard (rounded-2xl border bg-card p-5).
//    Keep the SAME grid + controls + handlers:
//      - Listing query <Select> (value resolvedListingQueryId || NO_LISTING_QUERY_VALUE,
//        onValueChange => setSelectedListingQueryId) with the NO_LISTING_QUERY_VALUE
//        sentinel + items.map. Keep the loading + "Query ID:" + token-uses-UUID hints.
//      - Runtime query string <Input> (queryString / setQueryString).
//      - Run preview <Button> (runPreview, disabled={isPreviewLoading}) — restyle
//        only; keep "Previewing..." label.
//      - Show/Hide examples <Button> (setShowExamples toggle) + the examples
//        sub-section: re-skin its inner cards to rounded-xl soft cards; KEEP each
//        "Use example" button calling setQueryString(example.query) and the
//        runtimeTokenPrefix-derived <code> blocks.
// 4) previewError <Alert> + the preview result <section>: keep both. Re-skin the
//    4 metric tiles (Total / Applied filters / Rejected tokens / Runtime search)
//    to soft rounded-xl stat cards; keep the rejected-tokens warning strip (move
//    amber-50/amber-200 hard colors to warning tokens) and the rows <pre> snapshot.

// ListingSearchPage.tsx — RENDER ONLY changes inside the existing return().
// 1) PageHeader: restyled @/ui/shared/PageHeader (title "Search", same description).
// 2) "What this preview searches" <section>: re-skin to the prototype info card.
//    Keep the indexed/not-indexed copy and <code> tokens.
// 3) Optional non-interactive search preview: port the prototype's read-only
//    search box pill (Search icon + muted rounded-2xl bar) ABOVE the controls as a
//    decorative front-end preview — purely presentational, no new state.
// 4) Controls <section> (SectionCard): keep the grid + controls + handlers:
//      - Query <Input> (query/setQuery), Limit <Input> (limit/setLimit),
//        Run preview <Button> (runPreview, disabled={isLoading}, "Searching..." label).
//      - Source switches: the three <label> rows with <Switch> for Pages/Entries/
//        Posts (checked={usePages|useEntries|usePosts}, onCheckedChange={setX}).
//        Re-skin to soft rounded-2xl toggle rows; KEEP the exact bound state.
// 5) error <Alert> + payload result <section>: keep both. Re-skin the
//    resolved-query/sources/items summary line and the items list (each item ->
//    soft rounded-xl card with title + source • href). Keep "No results." empty.
```

**Data flow (Filters):** `useListingQueries()` (cache-hydrate) →
`resolvedListingQueryId`/`runtimeTokenPrefix` → user types tokens or picks an
example → `runPreview()` validates the id (`extractListingQueryIdFromQueryString` +
`LISTING_QUERY_ID_PATTERN`) and calls `previewListingFilters({ listingQueryId,
queryString })` → `preview` feeds the metric tiles + rows snapshot. The restyle
changes none of these edges.

**Data flow (Search):** `selectedSources` derived via `useMemo` from the three
switches → `runPreview()` parses `limit` and calls `previewPublicSearch({ q, limit?,
sources? })` → `payload` feeds the summary + items list. Unchanged.

**Navigation/href constraint (preserve):** Keep `AdminShell activeHref="/admin/
advanced/filters"` and `"/admin/advanced/search"` and the breadcrumbs arrays. These
screens do not navigate, but if any link/button is added it must route through
`AdminLink` + `prefetchAdminRoute` / `adminPaths` — never a hand-built `<a href>`.

**Error handling:** Keep every `Alert` block unchanged in copy/condition (`Unable to
load listing queries`, `Preview failed`, `Search preview failed`) and the
`runPreview` catch branches (the Error→message fallbacks). The validation error
strings in the Filters `runPreview` (select-a-query / invalid-id-format) are
unchanged. Only surrounding card styling inherits new tokens.

**React-hooks/cache rules:** No new effects. `selectedSources`, `activeListingLabel`,
`runtimeTokenPrefix`, and `queryExamples` stay as the existing `useMemo`
derivations — no synchronous `setState` in an effect, no mount-force-refetch. The
`useListingQueries` hook owns the single hydrate + cacheBus subscription; leave it
untouched.

**Regression-test shape:** see L04 — render `ListingFiltersPage` (seeded
`useListingQueries`) and assert the restyled header + listing-query Select +
runtime-token Input + Run-preview button are present, "Show examples" toggles the
examples cards, and "Use example" still writes the token Input; render
`ListingSearchPage` and assert the query/limit inputs + three source switches are
present and toggling a switch updates the bound source set (and Run preview calls
the client).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/listing-filters-restyle.test.tsx tests/vitest/ui-integration/listing-search-restyle.test.tsx`
  (new suites in L04)
- Re-run `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  to confirm the preview request contracts are unaffected.
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-16-L03`.
- If a shared info-card / SectionCard wrapper is introduced for these preview
  tools, note it alongside the TASK-479-06 shell notes so other Advanced preview
  screens reuse the same restyled surfaces.
