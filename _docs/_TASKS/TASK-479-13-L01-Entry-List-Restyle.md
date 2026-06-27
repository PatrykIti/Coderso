# TASK-479-13-L01: Entry List Restyle
# FileName: TASK-479-13-L01-Entry-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-12
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-13
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Entries **list** screen to match the prototype: redesigned
`PageHeader` with the **type** filter cluster, a status **tab** strip, the soft
`FilterBar`, a `rounded-2xl` `DataTable` with violet status badges, and the soft
pagination footer. All data, filtering, selection, bulk actions, and caching stay
byte-for-byte the same.

- **Goal:** `core/admin/ui/entries/EntryList.tsx` + `EntryFilters.tsx` +
  `EntryTable.tsx` + `EntryBulkActionsBar.tsx` look like
  `_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx` while preserving the existing
  list logic and cache contract.
- **Owning module/service:** `core/admin/ui/entries/EntryList.tsx`,
  `core/admin/ui/entries/EntryFilters.tsx`, `core/admin/ui/entries/EntryTable.tsx`,
  `core/admin/ui/entries/EntryBulkActionsBar.tsx`. Shared `StatusTabs`/`StatusBadge`/
  `FilterBar`/`DataTable` wrapper primitives come from TASK-479-06-L02 (created/ported
  there); the `soft` Badge variant + `shadow-card`/`font-display` tokens from
  TASK-479-05.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,FilterBar,DataTable,StatusBadge,Pagination}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{tabs,select,badge,avatar,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `entriesClient`/`contentTypesClient`,
  `cachePolicy`/`cacheKeys` (`entriesAllList`, `contentTypesList`), `cacheBus`,
  `resolveCacheRefreshBackground`, `useListPagination`, `filterEntries`,
  `createListActionToastAdapter`, RBAC, or the create/duplicate/publish/draft/
  archive/delete flows. Bulk-action semantics, `EntryCreateDrawer`, and the
  `ConfirmActionDialog` are unchanged. The Entry editor is L02.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `EntryList.tsx` (the
`useMemo(getCachedAllEntries)` / `useMemo(getCachedContentTypes)` lazy inits, the two
`listAllEntriesCached` / `listContentTypesCached` hydrate effects, the
`subscribeCacheEvents(cacheKeys.entriesAllList | cacheKeys.contentTypesList)`
background revalidation, the `hasHydratedEntriesRef` / `hasHydratedTypesRef`
no-mount-force-refetch guards, `useListPagination`, `filterEntries`, the
`typeOptions`/`authorOptions` `useMemo`s, selection refs, and `runBulkAction`). Keep
the render-tree behavior identical; swap classNames and add the tab strip.

```tsx
// EntryList.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader: keep title/description/actions props. The bulk cluster
//    (EntryBulkActionsBar, shown when selectedCount > 0) and the New button keep
//    their handlers (setCreateOpen, disabled={types.length === 0}). PageHeader is
//    restyled centrally by TASK-479-06, so this file just keeps passing props.
//    Move the *type* filter Select up into the header actions row to mirror the
//    prototype ("All types" Select beside New entry). It must still write the
//    EXISTING `typeFilter` state via setTypeFilter and read `typeOptions` (which
//    already carry per-type counts derived from entries+types). Do NOT introduce a
//    second source of truth — EntryFilters' type Select and the header Select both
//    write `typeFilter` (keep them in sync, or render the type Select in ONE place
//    only and drop it from the other; pick one to avoid duplication).
<PageHeader
  title="Entries"
  description="Every piece of structured content across your content types."
  actions={/* UNCHANGED bulk cluster + type Select(setTypeFilter,typeOptions) + New */}
/>

// 2) NEW status tab strip — use the shared `StatusTabs` (Tabs `line` underline
//    variant) from 479-06-L02; do NOT invent a divergent tab primitive.
//    DERIVE counts from already-loaded `entries` (render-time derivation — NO new
//    effect, NO sync setState). The tab simply sets the existing statusFilter.
//    Statuses are the REAL `EntryStatus` enum from `@/services/entriesClient`
//    (`draft | published | scheduled | archived`) — there is NO "review" status,
//    so none is shown (drop the prototype's invented value).
const statusTabs = useMemo(() => {
  const by = (s: EntryStatus) => entries.filter((e) => e.status === s).length;
  return [
    { value: "all",       label: "All",       count: entries.length },
    { value: "published", label: "Published", count: by("published") },
    { value: "draft",     label: "Drafts",    count: by("draft") },
    { value: "scheduled", label: "Scheduled", count: by("scheduled") },
    { value: "archived",  label: "Archived",  count: by("archived") },
  ];
}, [entries]);
// Render the soft `line` tab row (violet active text + bottom border, muted
// count pill). active = statusFilter === tab.value; click calls setStatusFilter.
// This is a thin presentational layer over EXISTING statusFilter state, so
// EntryFilters' status control and the tabs stay in sync (both write statusFilter).

// 3) FilterBar look: EntryFilters.tsx hosts search + status + type + author + the
//    advanced (date-range) Collapsible. Restyle its container to the prototype
//    FilterBar (rounded-2xl card, soft border, search Input with leading Search
//    icon, right-aligned controls; advanced toggle becomes a soft "Filters" button).
//    Keep ALL props/handlers exactly (onSearchChange/onStatusChange/onTypeChange/
//    onAuthorChange/onUpdatedFromChange/onUpdatedToChange/onAdvancedOpenChange/
//    onClear) and the Collapsible open state. No filter logic moves.

// 4) DataTable / EntryTable.tsx: keep columns, selection checkboxes (isAllSelected/
//    isIndeterminate/onToggleAll/onToggleEntry), the AdminLink title cell, and the
//    DropdownMenu row actions (Edit/Duplicate/Delete). Restyle the wrapper + rows:
//      - container: "overflow-hidden rounded-2xl border bg-card shadow-card"
//        (was rounded-xl ... shadow-sm) to match prototype DataTable.
//      - header row: soft muted bg, xs uppercase tracked labels.
//      - row hover: "hover:bg-accent/40" soft violet-tinted hover.
//      - title cell: leading rounded-xl icon tile (FileText) + title + mono id line
//        like the prototype; AdminLink href + prefetch UNCHANGED.
//      - type cell: <Badge variant="soft">{contentType.name}</Badge>.
//      - author cell: <Avatar name={author?.name}/> + first name (existing
//        AvatarFallback wiring kept).
//      - updated cell: right-aligned muted text.

// 5) Status badges: replace the LOCAL hard-coded hex maps `statusStyles` /
//    `statusLabels` in EntryTable.tsx with the shared `StatusBadge` from 479-06-L02,
//    token-driven so emerald/slate/blue/amber read from the 479-05 tokens instead of
//    inline Tailwind color utilities. Map the REAL `EntryStatus` enum only
//    (`draft | published | scheduled | archived` — NO "review"):
//    published→success, draft→muted, scheduled→info, archived→warning. Same label
//    text (Published/Draft/Scheduled/Archived). Use the SAME shared `StatusBadge` as
//    Posts/Pages so all lists are consistent.
```

**Data flow:** `getCachedAllEntries()` / `getCachedContentTypes()` lazy init →
`listAllEntriesCached` / `listContentTypesCached` hydrate + `cacheBus` background
revalidation (`refreshEntries`/`refreshTypes` with `resolveCacheRefreshBackground`)
→ `filterEntries(entries, filters)` → `useListPagination` → `EntryTable` rows →
`ListPaginationFooter`. The restyle changes none of these edges; the new tab strip
and the relocated type Select only write the existing `statusFilter` / `typeFilter`
state.

**Navigation/href constraint (preserve):** Row title links and the edit/duplicate
navigations must keep routing through the canonical helpers — keep the `AdminLink`
title cell and the existing
`navigate("/entries/<encoded type>/<encoded id>")` calls in `handleEditEntry` /
`handleDuplicateEntry` / `handleEntryCreated`. Do NOT hand-build `<a href>` or
string-concat admin URLs; if a value is currently produced via `adminPaths`/
`AdminLink`/`prefetchAdminRoute`, leave that wiring intact.

**Error handling:** The destructive `Alert` block (`Entries API error`) and the
`ConfirmActionDialog` (single + bulk delete) keep their existing copy and conditions;
only their surrounding card styling inherits the new tokens. The loading panel
("Loading entries...") and empty-state ("No entries match your current filters.")
keep their text; restyle to the soft dashed/muted card look. No new error surfaces.

**React-hooks/cache rules:** Tab counts are derived at render via `useMemo` over
`entries` — no effect, no synchronous `setState` in an effect. Do not add any mount
effect that force-refetches; the existing two hydrate effects + the two cacheBus
subscriptions are the only data effects and must be left untouched (no dirty-state
overwrite, no refetch loop). Preserve the `hasHydratedEntriesRef`/`hasHydratedTypesRef`
guards exactly.

**Regression-test shape:** see L03 — render `EntryList` with seeded
`getCachedAllEntries` + `getCachedContentTypes`, assert: header + New button present,
type Select renders `typeOptions` with counts, tab strip renders with counts derived
from entries, clicking a status tab updates the visible rows (drives statusFilter),
clicking a type updates rows (drives typeFilter), the table wrapper carries the
rounded-2xl/card classes, status badges render expected label text, and selecting
rows still shows the bulk cluster.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/entry-list-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing list-adjacent suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-table-title.test.tsx tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/entry-list-filters.test.ts tests/vitest/admin/entriesClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-13-L01`.
- If the shared `StatusBadge` helper or `FilterBar`/`DataTable` wrapper is
  introduced/changed for Entries, note it alongside the TASK-479-06 shell notes so
  Pages/Posts/Users lists reuse the same restyled primitives.
