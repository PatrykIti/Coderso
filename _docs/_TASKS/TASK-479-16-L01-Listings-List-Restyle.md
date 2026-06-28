# TASK-479-16-L01: Listings List Restyle
# FileName: TASK-479-16-L01-Listings-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-16
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Listings **list** screen to match the prototype: redesigned
`PageHeader`, a soft tab strip (Queries / Templates), and a `rounded-2xl` **card
grid** for the query records — each card showing a query summary, the bound source/
content-type, and one real query-payload detail (result limit / fields count), with
a violet-toned icon tile and a soft "Edit" action. All data loading, filtering,
selection, bulk actions, the template manager,
the delete dialogs, and caching stay byte-for-byte the same.

- **Goal:** `core/admin/ui/listings/ListingListPage.tsx` (+ its `ListingQueryFilters`
  / `ListingQueryTable` rendering and, where the card grid is adopted, the
  Templates tab tables) look like
  `_docs/_PROTOTYPE/src/pages/advanced/ListingsPage.tsx` while preserving the
  existing tabbed list logic and cache contract.
- **Owning module/service:** `core/admin/ui/listings/ListingListPage.tsx`,
  `core/admin/ui/listings/ListingQueryFilters.tsx`,
  `core/admin/ui/listings/ListingQueryTable.tsx`,
  `core/admin/ui/listings/ListingBulkActionsBar.tsx`,
  `core/admin/ui/listings/ListingTemplateFilters.tsx` /
  `ListingTemplateTable.tsx` (templates tab). Shared primitives from TASK-479-05/06.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/ListingsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,EmptyState}.tsx` and
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,separator}.tsx`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `listingsClient`, `cachePolicy`/`cacheKeys`,
  `cacheBus`, `useListingQueries`/`useListingTemplates`, `useListPagination`,
  `listingActionToasts`, RBAC, or the create/edit/delete/bulk-delete flows. The
  ConfirmActionDialog copy/conditions and `ListingTemplateManager` behavior are
  unchanged. Do not convert tabs to routes.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `ListingListPage.tsx` (the
`useListingQueries`/`useListingTemplates` hooks, `sortByUpdatedDesc`,
`filterListingQueries`/`filterListingTemplates`, the two `useListPagination`
instances + their `resetKey`, the selection/`visibleSelected*`/`isAll*Selected`
derivations, every `run*Delete`/`run*BulkDelete` handler, `handleTabChange`'s
`navigate(..., { replace: true })`, and the four `ConfirmActionDialog`s). Keep the
render-tree behavior identical; swap classNames, add the tab strip, and re-present
the query rows as cards.

```tsx
// ListingListPage.tsx — RENDER ONLY changes inside the existing return().
// 1) PageHeader (already @/ui/shared/PageHeader, restyled centrally by 479-06):
//    keep the same title/description/actions. Keep the conditional bulk cluster
//    (activeBulkBar shown when activeSelectedCount > 0) and the "New" button with
//    its EXISTING handleNew() handler. Optionally add a soft <Badge>Beta</Badge>
//    like the prototype header — decorative only.
<PageHeader
  title="Listings"
  description="Create dynamic query presets and reusable list templates."
  actions={/* UNCHANGED: {activeSelectedCount > 0 ? activeBulkBar : null} + New */}
/>

// 2) Tabs strip: keep the EXISTING <Tabs value={activeTab} onValueChange={handleTabChange}>
//    (it owns the ?tab= sync). Restyle TabsList/TabsTrigger to the prototype soft
//    underline look (violet active text + bottom border) using the Tabs `line`
//    variant (NOT a fabricated `underline` variant) from the centrally restyled
//    tabs primitive (479-06-L02 / tokens from 479-05) — no new state,
//    handleTabChange untouched.

// 3) Queries tab — card grid (ports prototype ListingsPage card):
//    Replace <ListingQueryTable> presentation with a responsive grid of cards
//    driven by queryPagination.visibleRows (SAME data + SAME ids):
//      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//        {queryPagination.visibleRows.map((q) => (
//          <Card className="flex h-full flex-col rounded-2xl p-5 shadow-card transition-all hover:-translate-y-0.5">
//            <header: violet icon tile (LayoutGrid in rounded-xl bg-primary-soft) +
//                     a selection Checkbox (keeps onToggleItem(q.id)) and updatedAt>
//            <div className="mt-4 font-display text-[15px] font-semibold">{q.name}</div>
//            <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
//              {summarizeListingQuery(q)}  // derive readable summary, see below
//            </p>
//            <div className="mt-3 flex flex-wrap gap-2">
//              <Badge variant="soft">{sourceLabel(q.query.source)}</Badge>
//              {/* NO layout/template field exists on ListingQueryRecord — second
//                  badge shows a REAL query-payload value, never an invented layout */}
//              <Badge variant="outline">{`${q.query.pagination.limit} per page`}</Badge>
//            </div>
//            <Separator className="my-4" />
//            <div className="mt-auto flex gap-2">
//              <Button variant="soft" size="sm" className="w-full gap-1.5"
//                onClick={() => navigate(`/advanced/listings/${encodeURIComponent(q.id)}`)}>
//                <Pencil /> Edit
//              </Button>
//              {/* delete keeps EXISTING setPendingQueryDeleteId(q.id) */}
//            </div>
//          </Card>
//        ))}
//      </div>
//    Selection: preserve onToggleItem / toggleAllQueries / isAllQueriesSelected by
//    keeping a per-card Checkbox + a "Select all (visible)" control above the grid;
//    the bulk cluster in PageHeader is unchanged. If converting the WHOLE table to
//    cards risks losing the select-all affordance, KEEP ListingQueryTable for the
//    table fallback and only wrap rows in the new card chrome — preserve every
//    prop (selectedIds, isAllSelected, isIndeterminate, onToggleAll, onToggleItem,
//    onDelete, emptyMessage).

// 4) summarizeListingQuery(q): NEW pure helper (NOT a new query field) that turns
//    the real ListingQueryRecord into the mono summary line, e.g.
//      `${sourceLabel(q.query.source)}${firstFilter ? ` where ${field} ${op} ${value}` : ""}`
//      + (q.query.sort[0] ? `, sort by ${q.query.sort[0].field}` : "")
//    Pure, defensive (handle empty filters/sort), no side effects. Export it for
//    L04 unit assertions.

// 5) sourceLabel: map q.query.source (entries/posts/users/taxonomies) to the
//    listingSourceOptions labels from listings/defaults.ts (reuse, do not
//    re-hardcode). DO NOT add a layout badge: the real ListingQueryRecord /
//    ListingQueryPayload has NO template or layout binding (layout lives only on
//    ListingTemplateRecord, and queries are not bound to a template). The second
//    badge must read a REAL query-payload value (e.g. `pagination.limit` "per page"
//    or `fields.length` fields) — never an invented "Grid"/layout default. Tones
//    read from theme tokens (bg-primary-soft etc.), NOT hard-coded hex.

// 6) Empty / loading: keep the EXISTING emptyMessage strings (loading vs
//    "No listing queries match your current filters"); render them through the
//    prototype EmptyState pattern card when the grid has no rows.

// 7) Templates tab: same treatment is optional — at minimum restyle the
//    ListingTemplateTable wrapper to "overflow-hidden rounded-2xl border bg-card
//    shadow-card" and soft hover; keep its props/handlers. Card-grid parity for
//    templates is allowed if it does not disturb the select-all/bulk wiring.

// 8) ListingBulkActionsBar: restyle to a soft rounded-2xl bar (segmented action
//    Select + Apply/Clear) — keep ALL props (selectedCount, action, resourceLabel,
//    onActionChange, onApply, onClear, isApplying).
```

**Data flow:** `useListingQueries()`/`useListingTemplates()` (cache-hydrate +
`cacheBus` background revalidation inside the hooks) → `sortByUpdatedDesc` →
`filterListing*` → `useListPagination` → card grid / table rows → `ListPaginationFooter`.
The restyle changes none of these edges; the new card grid only re-presents
`queryPagination.visibleRows` and `summarizeListingQuery` is a pure derivation.

**Navigation/href constraint (preserve):** Edit and New navigations must keep
routing through the canonical helpers — keep the existing
`navigate("/advanced/listings/<id>")` / `navigate("/advanced/listings/new")` calls
and `AdminShell activeHref="/admin/advanced/listings"`. If any card link is added,
route it through `AdminLink` + `prefetchAdminRoute` / `adminPaths`; do NOT
hand-build `<a href>` or string-concat admin URLs outside the canonical helpers.

**Error handling:** The three destructive `Alert` blocks (`Unable to load listing
queries`, `Unable to load listing templates`, `Listing action failed`) and the four
`ConfirmActionDialog`s keep their existing copy and conditions; only their
surrounding card styling inherits the new tokens. No new error surfaces.

**React-hooks/cache rules:** `summarizeListingQuery`/`sourceLabel` are
pure render-time derivations (or `useMemo` over `visibleRows`) — no effect, no
synchronous `setState` in an effect. Do not add any mount effect that
force-refetches; the hooks own the single hydrate + cacheBus subscription and must
be left untouched (no dirty-state overwrite, no refetch loop).

**Regression-test shape:** see L04 — render `ListingListPage` with seeded
`useListingQueries`, assert: header + New button present, tab strip renders, query
records render as `rounded-2xl` cards with summary + a source badge + a real
query-detail badge (result limit), the
selection Checkbox still calls the toggle path (bulk cluster appears), tab switch to
Templates renders the templates surface, and the delete control still opens the
confirm dialog.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/listing-list-restyle.test.tsx`
  (new suite in L04)
- Re-run `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  to confirm no behavioral regression in the cache/service contract.
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-16-L01`.
- If a shared `summarizeListingQuery` / source-badge helper is introduced,
  note it alongside the TASK-479-06 shell notes so the editor (L02) and other
  Advanced lists reuse the same presentation.
