# TASK-514-05: Entries List — List/Grid View Toggle & Row Fidelity

# FileName: TASK-514-05-Entries-List-View-Toggle-And-Row-Fidelity.md

**Parent Task:** TASK-514
**Priority:** Medium
**Category:** Admin UI / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-514-02 (client `visibility` field, if a visibility badge is added)
**Status:** ⏳ To Do

---

## Overview

Bring the entries LIST to prototype fidelity. The prototype `FilterBar`
(`EntriesPage.tsx:108`, `view="list"`) exposes a **list/grid view toggle**; the
current admin renders only `EntryTable` and `EntryGrid.tsx` **exists but is never
imported** (dead component — verified: no import of `EntryGrid` anywhere in
`core/admin`). This subtask wires a real list↔grid toggle, adapts `EntryGrid` to
render across content types (it currently assumes a single `entryTypeSlug`), and
tightens row fidelity (mono id sub-line, `Badge variant="soft"` type, author
`Avatar`) to match `wf514-proto-list.png`.

**Owned files (sole writer):**
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryTable.tsx`
- `core/admin/ui/entries/EntryGrid.tsx`
- `core/admin/ui/entries/EntryFilters.tsx`

**Do NOT** edit the editor (514-03), panel (514-04), or client (514-02).

Max-config-flexibility: the view choice persists per-user in `localStorage`
(mirror the `entries.metadataHelpCollapsed` pattern at
`EntryMetadataPanel.tsx:120-123`).

---

## Execution-Ready Plan

Verified: `EntryList` renders `EntryTable` at `:561-573` and `EntryFilters` at
`:537-555`; `EntryGrid` props `{ entries, onEdit, entryTypeSlug, emptyMessage }`
take `EntrySummary[]` (`:33-38`) — but the list works in `EntryListItem[]`
(each row carries its own `contentType`). `EntryTable` columns are Title /
Content Type / Status / Author-ish (`:126-132`).

### 1. View state + persistence (`EntryList.tsx`)

```ts
const [view, setView] = useState<"list" | "grid">(() =>
  (typeof window !== "undefined" && window.localStorage.getItem("entries.view") === "grid") ? "grid" : "list");
const changeView = (v: "list" | "grid") => {
  setView(v);
  if (typeof window !== "undefined") window.localStorage.setItem("entries.view", v);
};
```

### 2. Toggle control (`EntryFilters.tsx`)

Add a `List`/`LayoutGrid` (lucide) segmented toggle on the right of the filter bar
(prototype places it after Search/Filters), driven by new props
`view` + `onViewChange`. Keep the existing search/status/type/author/advanced +
Clear controls unchanged. Two icon `Button`s (`variant={view==='x'?'secondary':'ghost'}`,
`size="icon-sm"`, `aria-pressed`), or reuse an existing segmented primitive if one
exists in `@/components/ui` (verify before inventing).

### 3. Adapt `EntryGrid` for cross-type rows

- Change props to accept `EntryListItem[]` and per-row navigation:
  `onEdit(entry)` or `onEdit(typeSlug, id)` so the grid can route to
  `/entries/${slug}/${id}` (the list's `handleEditEntry` `:350-354` already
  resolves the slug from the row — pass an `onEdit(id)` that reuses it, since each
  visible row is in `pagination.visibleRows`).
- Render each card: icon tile + title + mono id sub-line + `Badge variant="soft"`
  type (from `entry.contentType.name`) + `StatusBadge` + author + updated date
  (reuse `EntryGrid`'s existing `formatDate` `:21-31`, statusStyles/labels).
- Optionally show a small "Private"/"Password" indicator when `entry.visibility !==
  "public"` (max-config-flexibility surfacing; requires 514-02).
- Keep it selectable-agnostic (grid need not support bulk-select in v1 — document
  that bulk actions remain a list-view affordance; or add checkboxes if trivial).

### 4. Row fidelity (`EntryTable.tsx`)

- Add a mono id sub-line under the title (prototype `#{hash}`; use a short slice of
  `entry.id` or the slug — prefer the real entry id short form, `font-mono text-xs
  text-muted-foreground`).
- Ensure Type renders as `Badge variant="soft"` and author renders with an
  `Avatar` (from `@/components/ui/avatar`) + first name, matching the prototype
  columns (Title / Type / Status / Author / Updated). Do not remove the
  selection checkbox column or the row actions (edit/delete/duplicate) — those are
  richer than the prototype and must stay.

### 5. Wire in `EntryList` render (`:556-573`)

```tsx
{isLoading ? <LoadingCard/> : view === "grid"
  ? <EntryGrid entries={pagination.visibleRows} onEdit={handleEditEntry} emptyMessage={...}/>
  : <EntryTable .../>}
```
Pass `view`/`onViewChange={changeView}` into `EntryFilters`. Pagination footer,
bulk bar, create drawer, delete dialog unchanged.

---

## Acceptance Criteria

1. A list/grid toggle appears in the filter bar; clicking it switches the rendered
   view; the choice persists across reloads (localStorage).
2. Grid view renders real entries across MULTIPLE content types with correct
   type/status/author/updated per row and routes to the right editor on click.
3. Table view keeps selection + row actions (edit/delete/duplicate) + adds the
   mono id sub-line, soft type badge, and author avatar (prototype parity).
4. `EntryGrid` is no longer dead code (imported + rendered).
5. Filters, tabs, pagination, bulk actions still work in list view; empty/filtered
   messages correct in both views.
6. Light + dark, 0 console errors.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free (admin UI)

- Toggle switches `view` and persists to localStorage; initial state honors a
  stored value.
- Grid renders the visible rows with per-row content-type + routes via `onEdit`.
- Table shows id sub-line + soft type badge + author avatar; selection + row
  actions still fire.
- `filterEntries` (existing pure fn `:98-126`) regression stays green.

### SMOKE

List↔grid toggle across content types is 1 of the 514-06 scenarios.

---

## Deferred

SQL-side visibility filtering. Grid bulk-select (if not trivially added). A saved
"default view" server preference (localStorage is sufficient here).
