# TASK-514-05: Entries List — List/Grid View Toggle & Row Fidelity

# FileName: TASK-514-05-Entries-List-View-Toggle-And-Row-Fidelity.md

**Parent Task:** TASK-514
**Priority:** Medium
**Category:** Admin UI / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-514-02 (client `visibility` field — required for the §4c/§3 visibility badge)
**Status:** ✅ Done (2026-07-06)

---

## Overview

Bring the entries LIST to prototype fidelity. The prototype `FilterBar`
(`EntriesPage.tsx:108`, `view="list"`) exposes a **list/grid view toggle**; the
current admin renders only `EntryTable` and `EntryGrid.tsx` is **unused by the
admin runtime but exercised by one UI test** (verified: the sole `EntryGrid`
import in the repo is
`tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx:13` — no admin
route/page imports it). This subtask wires a real list↔grid toggle and adapts
`EntryGrid` to render across content types (it currently assumes a single
`entryTypeSlug`). **Because §3 changes `EntryGrid`'s prop contract, the existing
test above MUST be updated in lockstep — see §6.**

**Row fidelity is NOT a build-from-scratch job.** Verified against the current
committed `EntryTable.tsx` (commit `205c66a5`, 2026-07-04): the table ALREADY
renders the mono sub-line under the title (`:196-198`), the soft type badge
(`:209` `<Badge variant="soft">`), the author `Avatar`+name column (`:225-238`),
and the full column set Title / Content Type / Status / Author / Last Updated /
Actions (`:125-142`). So the only remaining table deltas vs the prototype
(`wf514-proto-list.png`) are two small tweaks (§4a sub-line content, §4b author
token); §4 additionally adds a third row element — the committed visibility badge
(§4c) — which is an intentional EXTENSION of the prototype (surfacing the new
persisted `visibility` concept), not a prototype delta.

**Owned files (sole writer):**
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryTable.tsx`
- `core/admin/ui/entries/EntryGrid.tsx`
- `core/admin/ui/entries/EntryFilters.tsx`

**Owned region (per-region writer, NOT sole file writer):**
- `tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx` — **only** the
  `EntryGrid` render block (`:590-615`) and its `EntryFilters` render (§6). This
  file is a shared multi-component leaf test (analytics/settings/entries/seo); do
  NOT touch any non-Entry region. This region-edit is mandatory because §3 changes
  the `EntryGrid` prop contract and the current fixtures crash under it (§6).

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

Add a `List`/`LayoutGrid` (lucide) segmented toggle, driven by new props
`view` + `onViewChange`. Keep the existing search/status/type/author/advanced +
Clear controls unchanged.

**Match the prototype markup exactly** (verified in
`_docs/_PROTOTYPE/src/components/patterns/FilterBar.tsx:34-59`, and live at
`http://localhost:5180/#/advanced/entries` — top-right of the search row). It is a
single **segmented pill container**, NOT two standalone `Button`s:

```tsx
{/* placed ml-auto, after the Filters button */}
<div className="ml-auto inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-soft">
  <button
    type="button"
    onClick={() => onViewChange("list")}
    aria-label="List view"
    className={cn(
      "flex size-7 items-center justify-center rounded-lg transition-colors",
      view === "list" ? "bg-muted text-foreground" : "text-muted-foreground",
    )}
  >
    <List className="size-4" />
  </button>
  <button
    type="button"
    onClick={() => onViewChange("grid")}
    aria-label="Grid view"
    className={cn(
      "flex size-7 items-center justify-center rounded-lg transition-colors",
      view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground",
    )}
  >
    <LayoutGrid className="size-4" />
  </button>
</div>
```

Verified: **no `ToggleGroup`/segmented primitive exists** in
`core/admin/components/ui` (only `tabs.tsx`), so build the pill inline as above —
do NOT invent a new shared primitive for this subtask. If accessibility review
prefers `aria-pressed` over `aria-label`-only, that is an acceptable additive
enhancement, but keep the pill container + `size-7 rounded-lg` + `bg-muted
text-foreground` active style verbatim from the prototype.

### 3. Adapt `EntryGrid` for cross-type rows

**Single, committed prop contract** (do NOT offer alternates). Verified current
signature: `EntryGrid.tsx:33-38` is `{ entries: EntrySummary[]; onEdit: (id:
string) => void; entryTypeSlug?: string | null; emptyMessage?: string }`. The only
REAL breaking change is widening `entries` and dropping the now-pointless
`entryTypeSlug` branch — the `onEdit(id)` shape stays exactly as-is.

- **Keep `onEdit: (id: string) => void` unchanged.** The list's `handleEditEntry`
  (`EntryList.tsx:350-354`) already takes an id and resolves
  `entry.contentType.slug` from the row to `navigate(/entries/<slug>/<id>)`, so the
  grid never needs a slug. Wire `onEdit={handleEditEntry}` in §5.
- **Widen `entries: EntrySummary[]` → `entries: EntryListItem[]`** (each row now
  carries its own `contentType`; import `EntryListItem` from
  `@/services/entriesClient` alongside/instead of `EntrySummary`).
- **DROP the `entryTypeSlug` prop entirely.** This makes the current dead
  `AdminLink` branch (`EntryGrid.tsx:72-80`, only reached when `entryTypeSlug` is
  truthy) unreachable — **delete that branch and always render the `onEdit(entry.id)`
  button**, and **remove the now-unused `import { AdminLink } from
  "@/ui/shared/AdminLink"` (`EntryGrid.tsx:3`)** (otherwise a lint/unused-import
  failure). Also drop the unused `entryTypeSlug`/`encodeURIComponent` usage that
  only served that branch.
- Render each card: icon tile + title + mono id sub-line + `Badge variant="soft"`
  type (from `entry.contentType.name`) + status badge + author + updated date
  (reuse `EntryGrid`'s existing `formatDate` `:21-31`, statusStyles/labels).
- Show a small "Private"/"Password" indicator when `entry.visibility !== "public"`
  (the SAME committed visibility badge as the table — see §4(c); non-`public` only;
  reads `entry.visibility`, guaranteed by 514-01/514-02). Grid parity with the table
  is required, not optional.
- Keep it selectable-agnostic (grid need not support bulk-select in v1 — document
  that bulk actions remain a list-view affordance; or add checkboxes if trivial).

### 4. Row fidelity (`EntryTable.tsx`) — TWO small deltas only

The mono sub-line, soft type `Badge`, `Avatar` author column, and the full column
set already exist (see Overview + line refs). **This is a tweak, not an add.** Do
NOT re-implement or "restore" any of it. The only real deltas vs the prototype:

- **(a) Sub-line content — COMMITTED DECISION: render `entry.id.slice(0, 8)` in
  the existing `font-mono text-xs text-muted-foreground` styling.** Current renders
  `entry.slug` (`:196-198`); the prototype renders a decorative mono id
  (`EntriesPage.tsx:45-47`: `#{(row.title.length*137+1024).toString(16)}`).
  Verified: that prototype hash is **synthetic mock data** derived from title
  length — it is NOT a real identifier and must NOT be reproduced literally. Per
  the prototype-fidelity mandate ("end up EXACTLY as in the prototype" +
  "do NOT invent conservative decisions that keep the old approach"), match the
  prototype's VISUAL structure — a short, mono, hash-like identifier under the
  title — using REAL data: the first 8 chars of the entry id. Do NOT keep the old
  `entry.slug`. (The optional `#` glyph prefix is cosmetic; keep or drop it, but
  keep the short-id-in-mono structure.)
- **(b) Author name form — match the prototype: first token only.** Current shows
  the full name (`entry.author?.name ?? entry.author?.email ?? "System"`,
  `:236-237`); the prototype shows first-name only (`row.author.split(' ')[0]`,
  `EntriesPage.tsx:60`). Trim to the first whitespace-delimited token, guarding the
  email-only / no-space case by falling back to the full resolved value when there
  is no space (so `"jane@site.com"` and `"System"` render whole). This is a purely
  cosmetic column tweak; the `Avatar` + initials fallback already matches.
- **(c) Visibility badge — COMMITTED (not optional).** Render a small badge in the
  row (recommended: inline beside the title or in the Status column) ONLY when
  `entry.visibility !== "public"` — `"Private"` for `private`, `"Password"` for
  `password` (a lucide `Lock`/`EyeOff` glyph is an acceptable additive). Public rows
  render NO badge (avoid noise on the common case). This is a deliberate
  max-config-flexibility surfacing of the new persisted `visibility` concept (the
  prototype list has no such indicator because it has no visibility model — this is
  the "extend functionality" half of the fidelity mandate, not a prototype-drift
  defect). Its data is guaranteed: 514-01 populates `visibility` on all three read
  projections and 514-02 mirrors it onto the client `EntrySummary`, so the badge
  reads `entry.visibility` directly with NO extra fetch. This is the concrete
  rendering the parent Gap #7, 514-01 §3/AC#11, and 514-02 §5 all reference as "the
  514-05 badge" — it is built HERE.

Do NOT remove the selection checkbox column, the row actions
(edit/delete/duplicate), or the content-type slug helper line (`:214-218`) —
those are richer than the prototype and must stay.

> Note: the prototype header labels the column **"Type"**; the current admin uses
> **"Content Type"**. Leave the current label unless the owner asks to shorten it —
> the wider label is clearer and is not a fidelity defect worth changing.

### 5. Wire in `EntryList` render (`:556-573`)

```tsx
{isLoading ? <LoadingCard/> : view === "grid"
  ? <EntryGrid entries={pagination.visibleRows} onEdit={handleEditEntry} emptyMessage={...}/>
  : <EntryTable .../>}
```
Pass `view`/`onViewChange={changeView}` into `EntryFilters`. Pagination footer,
bulk bar, create drawer, delete dialog unchanged.

**Add the `EntryGrid` import to `EntryList`.** Verified: `EntryList.tsx:34-37`
imports only `EntryCreateDrawer`, `EntryBulkActionsBar`, `EntryFilters`, and
`EntryTable` — it does NOT currently import `EntryGrid`. Add `import { EntryGrid }
from "./EntryGrid";` so grid view renders (this is the change that finally makes
`EntryGrid` a runtime-imported component, per Acceptance #4).

### 6. Update the existing `EntryGrid` test fixtures (MANDATORY, coupled to §3)

The only `EntryGrid` importer today is
`tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx`. Its render block
(`:590-615`) uses the OLD contract — `EntrySummary`-shaped rows cast `as never`
(no `contentType`) plus `entryTypeSlug="posts"` — and asserts the href
`/entries/posts/entry-2` (`:622`). Once §3 makes `EntryGrid` take
`EntryListItem[]`, render `entry.contentType.name`, and route via `onEdit`
(dropping the `entryTypeSlug` prop), these fixtures crash at
`entry.contentType.name` → `undefined.name`. Update the block **in lockstep** to
the new shape. Verified target types: `EntryListItem = EntrySummary & {
contentType: EntryListContentType }` and `EntryListContentType = { id; slug; name;
status }` (`core/admin/services/entriesClient.ts:30-39`).

```tsx
// tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx  (~:590-615)
// onEdit now carries the entry id (list resolves the slug); no entryTypeSlug prop.
const onEdit = vi.fn();
// ...
<EntryGrid entries={[]} onEdit={onEdit} emptyMessage="Nothing here" />
<EntryGrid
  entries={[
    {
      id: "entry-1",
      title: "Landing page",
      slug: "landing-page",
      status: "published",
      updatedAt: "2026-03-06T12:00:00.000Z",
      contentType: { id: "ct-page", slug: "pages", name: "Page", status: "active" },
    } as never,
  ]}
  onEdit={onEdit}
/>
<EntryGrid
  entries={[
    {
      id: "entry-2",
      title: "Blog post",
      slug: "blog-post",
      status: "draft",
      updatedAt: "2026-03-06T12:00:00.000Z",
      contentType: { id: "ct-post", slug: "posts", name: "Post", status: "active" },
    } as never,
  ]}
  onEdit={onEdit}
/>
```

Then update the assertions that depended on the dropped `entryTypeSlug` routing:
- Replace the href assertion `expect(...innerHTML).toContain("/entries/posts/entry-2")`
  (`:622`) with a click-through assertion on the new `onEdit(id)` form — e.g. click
  the `entry-2` card button and assert `expect(onEdit).toHaveBeenCalledWith("entry-2")`
  — since `EntryGrid` no longer renders the `AdminLink` `/entries/<slug>/<id>` href
  itself (routing now flows through the list's `handleEditEntry`).
- Add a fixture assertion that the soft type badge text (`"Post"` / `"Page"` from
  `contentType.name`) renders, guaranteeing the new cross-type field is exercised.

Keep the `EntryFilters` render in the same test intact **except** to add the new
`view`/`onViewChange` props (§2) so the file typechecks under the new
`EntryFilters` signature; do not otherwise touch the analytics/settings/seo
regions. **Land order: this test edit ships in the SAME commit as the §3
`EntryGrid` change** so the tree is never in a state where `EntryGrid`'s contract
and its test disagree.

---

## Acceptance Criteria

1. A list/grid toggle appears in the filter bar; clicking it switches the rendered
   view; the choice persists across reloads (localStorage).
2. Grid view renders real entries across MULTIPLE content types with correct
   type/status/author/updated per row, routes to the right editor on click, and
   shows the visibility badge on non-`public` rows (§3, parity with the table §4c).
3. Table view keeps selection + row actions (edit/delete/duplicate) and the
   already-present mono sub-line, soft type badge, and author avatar column; the
   three §4 deltas are present: the title sub-line renders `entry.id.slice(0,
   8)` in mono (§4a), the author cell renders the first token only with the
   no-space fallback (§4b), and a `"Private"`/`"Password"` visibility badge renders
   ONLY on rows where `entry.visibility !== "public"` (§4c) — public rows show none.
4. `EntryGrid` is now rendered by the admin runtime (imported + rendered by
   `EntryList` in grid view), not only by a test. The existing
   `analytics-settings-entries-seo-leafs.test.tsx` `EntryGrid` block is updated to
   the new `EntryListItem` prop contract (§6) and passes.
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
- Table still shows the (already-present) sub-line + soft type badge + author
  avatar and selection + row actions still fire; assert the title sub-line renders
  the 8-char id form (§4a, e.g. matches `entry.id.slice(0, 8)`, not the old slug),
  and assert the author cell renders first-name only for a multi-word name and the
  full value when there is no space (§4b).
- Visibility badge (§4c): a `private`/`password` row renders the `"Private"`/
  `"Password"` badge and a `public` row renders NO visibility badge — assert in BOTH
  table and grid views (§3 parity).
- `filterEntries` (existing pure fn `:98-126`) regression stays green.
- The existing `EntryGrid` block in
  `analytics-settings-entries-seo-leafs.test.tsx` is migrated to the new
  `EntryListItem` fixtures + `onEdit(id)` assertion (§6) and passes; the file's
  `EntryFilters` render compiles under the new `view`/`onViewChange` signature.

### SMOKE

List↔grid toggle across content types is 1 of the 514-06 scenarios.

---

## Deferred

SQL-side visibility filtering. Grid bulk-select (if not trivially added). A saved
"default view" server preference (localStorage is sufficient here).
