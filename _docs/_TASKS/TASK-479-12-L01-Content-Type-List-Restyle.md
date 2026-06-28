# TASK-479-12-L01: Content Type List Restyle
# FileName: TASK-479-12-L01-Content-Type-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Restyle the content type list to the prototype's Engine page: a soft-card
**summary band** (Types / Entries / Fields) over a responsive **card grid** of
content types, each card showing its field and entry counts plus "Edit schema"
and "Entries" actions. All real data, filters, selection, bulk actions, and
pagination are preserved — only presentation changes.

- **Goal:** Give the content type list the soft/violet, `rounded-2xl` look of the
  prototype while keeping the live list data, search/status filter, bulk
  publish/draft/delete, selection, pagination, create drawer, and delete/duplicate
  confirm flows fully intact.
- **Owning module/service:** `core/admin/ui/content-types/ContentTypeList.tsx`
  (plus its presentational children `ContentTypeTable.tsx` and the new card grid),
  backed by `core/admin/services/contentTypesClient.ts`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/pages/advanced/EnginePage.tsx` and shared primitives
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,SectionCard}.tsx`,
  `_docs/_PROTOTYPE/src/components/ui/{card,button,badge,separator}.tsx`.
- **Shared primitives.** Use the shared `PageHeader`, `StatCard`, `StatusBadge`,
  and `EmptyState` from TASK-479-06-L02 (core `core/admin/ui/shared/*`) and the
  `soft` Badge/Button variant + `--primary-soft`/`shadow-card`/`font-display`
  tokens from TASK-479-05 — do not invent a divergent per-screen StatCard or
  status badge. Content-type `status` is only `draft | published` (verified in
  `contentTypesClient.ts`); bind the per-card `StatusBadge` to that real value and
  do not invent extra statuses.
- **Out of scope:** No change to `contentTypesClient` calls, `cacheKeys`, the bulk
  action semantics, or the create/delete/duplicate server flows. No new columns or
  data fields.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target file: `core/admin/ui/content-types/ContentTypeList.tsx` (keep the entire
state/effect/handler block from the current file — `listContentTypesCached`,
`getCachedContentTypes`, `subscribeCacheEvents(cacheKeys.contentTypesList)`,
`useListPagination`, selection, `runBulkAction`, `handleDelete`,
`handleDuplicate`, `handleCreated`). Only the returned JSX changes.

Port from prototype `EnginePage.tsx` (StatCard band + `TYPES.map(...)` card grid).

```tsx
// ContentTypeList.tsx — RENDER ONLY changes. Logic above `return` is unchanged.

// 1) Summary band — derive from the SAME `types`/`rows` already in state.
//    Do NOT add a fetch; compute at render time (no effect, no setState).
const summary = useMemo(() => {
  const totalEntries = types.reduce((n, t) => n + (t.entryCount ?? 0), 0);
  const totalFields = rows.reduce((n, r) => n + r.fieldCount, 0); // countSchemaFields already applied in `rows`
  return { typeCount: types.length, totalEntries, totalFields };
}, [types, rows]);

// 2) Card grid item — ports EnginePage card markup; uses AdminLink, not <a>.
function ContentTypeCard({ row }: { row: ContentTypeRow }) {
  const schemaHref = resolveAdminRoutePath(`/content-types/${encodeURIComponent(row.id)}/schema`);
  const entriesHref = resolveAdminRoutePath(`/advanced/engine/${encodeURIComponent(row.id)}/collection`);
  return (
    <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
      {/* selection + status preserved as real affordances (NOT in prototype) */}
      <div className="flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Database className="size-6" />
        </span>
        <Checkbox
          checked={selectedIds.includes(row.id)}
          onCheckedChange={() => handleToggleRow(row.id)}
          aria-label={`Select ${row.name}`}
        />
      </div>
      <div className="mt-4 font-display text-[15px] font-semibold">{row.name}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{row.fieldCount} fields</span>
        <span className="size-1 rounded-full bg-border" />
        <span>{row.entryCount ?? 0} entries</span>
        <StatusBadge status={row.status} />
      </div>
      <Separator className="my-4" />
      <div className="mt-auto flex items-center gap-2">
        <AdminLink href={schemaHref} className="flex-1"><Button variant="soft" size="sm" className="w-full">Edit schema</Button></AdminLink>
        <AdminLink href={entriesHref} className="flex-1"><Button variant="outline" size="sm" className="w-full">Entries</Button></AdminLink>
      </div>
    </Card>
  );
}

return (
  <AdminShell activeHref="/admin/content-types" breadcrumbs={["Content", "Content Types"]}>
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title="Content Types" description="…" actions={/* keep bulk bar + New type Button */} />
      {/* keep error / bulkFeedback Alerts unchanged */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Types" value={summary.typeCount} />
        <StatCard label="Entries" value={summary.totalEntries} />
        <StatCard label="Fields" value={summary.totalFields} />
      </div>
      {/* keep the existing search + status Select filter card, restyled to rounded-2xl */}
      {isLoading ? <CardGridSkeleton /> :
        rows.length === 0 ? <EmptyState … /> :
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagination.visibleRows.map((row) => <ContentTypeCard key={row.id} row={row} />)}
        </div>}
      <ListPaginationFooter resourceLabel="content types" pagination={pagination} isLoading={isLoading} />
    </div>
    {/* keep ContentTypeCreateDrawer + both ConfirmActionDialog blocks verbatim */}
  </AdminShell>
);
```

**Data flow:** `getCachedContentTypes()` lazy-init → `listContentTypesCached({force})`
on mount (existing single effect) → `subscribeCacheEvents` refresh → `rows`
(filtered/sorted via `useMemo`) → `useListPagination` → card grid. Summary band is
pure render-time derivation from `types`/`rows` (no new state, no effect).

**Error handling:** unchanged — keep the `error` Alert and `bulkFeedback` Alert;
keep `runBulkAction` `Promise.allSettled` + `summarizeBulkAction` partial-failure
handling and the two `ConfirmActionDialog`s. The card grid must keep selection
working so the existing `ContentTypeBulkActionsBar` still applies.

**Decision to honor:** the prototype card grid omits selection/sort/pagination,
but those are REAL features. Preserve them: render a per-card selection
`Checkbox`, keep `handleToggleAll` reachable (header "Select all" control or keep
`ContentTypeTable` available behind a Table/Grid view toggle), and keep
`ListPaginationFooter`. Do NOT drop bulk actions to match the prototype.

**Routing:** all card links go through `AdminLink` + `resolveAdminRoutePath`
(targets = the existing `/content-types/:id/schema` and
`/advanced/engine/:id/collection` routes); `handleCreated`/`handleDuplicate` keep
using `useAdminRouter().navigate`. No hand-built `<a href>`.

**Regression-test shape (see L05):** an SSR `renderAdminUi` render asserts the
always-visible chrome only — page title, the summary-band labels (Types / Entries
/ Fields), and the empty state — because `renderAdminUi` is SSR-only and the list
renders **no rows** without seeded content types. The card-dependent assertions
(one card per visible row with field/entry counts, "Edit schema"/"Entries"
actions, selection + bulk bar when an id is selected) run in a **seeded** test
using the repo idiom — `// @vitest-environment happy-dom` + `createRoot` + a
`vi.mock` of `contentTypesClient` (the same pattern as
`tests/vitest/ui/content-type-list-parity.test.tsx`). In that seeded test, assert
the card actions resolve through `AdminLink` to admin-prefixed canonical hrefs
(e.g. `href="/admin/advanced/engine/<id>/schema"` — note `resolveAdminRoutePath`
aliases `/content-types/*` → `/advanced/engine/*`), not hand-built unresolved
hrefs.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-content-type-list-restyle.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx`

Update the literal class/markup assertions in
`tests/vitest/ui/content-type-list-parity.test.tsx` where the grid intentionally
replaces the old table chrome; keep all behavioral (selection/bulk/pagination)
assertions. State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-12-L01`.
- `_docs/CONTENT_TYPES_SPEC.md` — note the list's card-grid presentation if the
  spec describes the list UX (no data/API change).
