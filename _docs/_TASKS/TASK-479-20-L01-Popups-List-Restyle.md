# TASK-479-20-L01: Popups List Restyle
# FileName: TASK-479-20-L01-Popups-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-20
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Popups **list** screen to match the prototype: a redesigned
`PageHeader` with a "Beta" badge + "New popup" action, a **stat row** of soft
`rounded-2xl` cards, and a responsive **card grid** of popups (icon tile, name,
trigger badge, a small metadata row, an active toggle, and an "Edit popup" action).
All data loading, search/filter, status mutation, delete, and caching stay
byte-for-byte the same.

- **Goal:** `core/admin/ui/popups/PopupsListPage.tsx` (and a new card-grid view that
  replaces the table body) looks like
  `_docs/_PROTOTYPE/src/pages/advanced/PopupsPage.tsx` while preserving the existing
  list logic and cache contract from `usePopups`.
- **Owning module/service:** `core/admin/ui/popups/PopupsListPage.tsx`,
  `core/admin/ui/popups/PopupTable.tsx` (kept or replaced by a `PopupCardGrid`),
  `core/admin/ui/popups/hooks/usePopups.ts` (consumed, not modified).
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/PopupsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard}.tsx` and ui
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,switch}.tsx`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `popupsClient`, `cachePolicy`/`cacheKeys`,
  `cacheBus`, the `PopupRecord` schema, RBAC, or the create/publish/archive/delete
  semantics. **No fabricated analytics** — see the truthfulness constraint below.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the data wiring in `PopupsListPage.tsx`: the
`usePopups()` hook (lazy `getCachedPopups` init → `listPopupsCached({force:true})`
hydrate effect → `subscribeCacheEvents(cacheKeys.popupsList)` background
revalidation), the `useMemo` `filtered`/`counts` derivations, and the
`handleDelete`/`handleStatusChange` handlers (which call `deletePopup` /
`updatePopupStatus` then `refresh(true)`). Keep all of these; only swap the render
tree from the table card to a stat row + card grid.

> **Truthfulness constraint (mandatory).** `PopupRecord` has NO `impressions` or
> `conversion` field (see `core/admin/services/popupsClient.ts`). The prototype's
> `impressions: "42,180"` / `conversion: "7.8%"` are mock strings. Do NOT invent,
> hard-code, or estimate analytics. The per-card "metadata row" MUST show only REAL
> fields, and the stat row MUST be derived from real counts. If/when a real
> analytics source lands, wire it in a separate task — not here.

**Shared primitives (consume by exact name; do NOT fork).** `StatCard`, `StatusBadge`
(content-status mapping incl. `archived`), and `EmptyState` come from TASK-479-06-L02;
the `soft` Badge+Button variant plus the `shadow-card` / `font-display` /
`--*-soft` tokens come from TASK-479-05. This screen consumes them; it does not declare
a divergent local copy.

```tsx
// PopupsListPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader: keep title/description/actions. Add the soft "Beta" badge next to
//    the title (prototype). The "New popup" button keeps its existing handler:
//      navigate("/advanced/popups/new")  // route helper unchanged — see constraint.
<PageHeader
  title={<span className="flex items-center gap-2">Popups <Badge variant="soft">Beta</Badge></span>}
  description="Capture attention with timed, scroll, and exit-intent overlays."
  actions={<Button className="gap-1.5" onClick={() => navigate("/advanced/popups/new")}><Plus className="size-4" /> New popup</Button>}
/>

// 2) STAT ROW — derive from real `items`/`counts` (render-time derivation; NO new
//    effect, NO sync setState). Reuse the shared `StatCard` from 479-06-L02 (do NOT
//    fork a local copy) and feed it the already-computed `counts` from the
//    usePopups-adjacent useMemo. NO spark/mock deltas unless they read from real data
//    — prefer plain count cards (label + value).
const statCards = useMemo(() => ([
  { label: "Total",     value: counts.all },
  { label: "Published", value: counts.published },
  { label: "Drafts",    value: counts.draft },
  // optionally "Archived": counts.archived
]), [counts]);
// Render: <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"> {statCards.map(card => <StatCard {...card} /> /* shared, from 479-06-L02 */)} </div>

// 3) SEARCH + STATUS FILTER: keep the existing search Input + status Tabs
//    (all/published/draft/archived with live counts) — restyle the wrapper to the
//    prototype soft card (rounded-2xl border bg-card shadow-card). Same state:
//    setSearch / setStatusFilter drive the existing `filtered` useMemo.

// 4) CARD GRID — replace <PopupTable items={filtered} .../> with a card grid that
//    maps `filtered` (NOT mock POPUPS). One <Card> per PopupRecord:
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {filtered.map((popup, index) => (
    <Card key={popup.id} className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={`flex size-12 items-center justify-center rounded-2xl ${TONES[index % TONES.length]}`}>
          <Megaphone className="size-6" />
        </span>
        {/* "Active" toggle = REAL status mutation, not decorative.
            checked = popup.status === "published"; onCheckedChange flips
            published <-> draft via the existing handler. */}
        <Switch
          checked={popup.status === "published"}
          aria-label={`Toggle ${popup.name}`}
          onCheckedChange={(on) => handleStatusChange(popup.id, on ? "published" : "draft")}
        />
      </div>

      <div className="mt-4 font-display text-[15px] font-semibold">{popup.name}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="soft">{triggerLabel(popup.trigger)}</Badge>      {/* REAL trigger.type; `soft` variant from 479-05 */}
        <StatusBadge status={popup.status} />                            {/* shared StatusBadge from 479-06-L02 (content-status set incl. `archived`); tokens from 479-05 */}
      </div>

      {/* Metadata row — REAL fields only (audience + frequency; both exist on PopupRecord). NO impressions/conversion. */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Audience</div>
          <div className="font-medium">{audienceLabel(popup.targeting.audience)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Frequency</div>
          <div className="font-medium">{frequencyLabel(popup.frequency.strategy)}</div>
        </div>
      </div>

      {/* Edit nav uses the canonical helper — DO NOT hand-build hrefs. */}
      <AdminLink href={`/advanced/popups/${encodeURIComponent(popup.id)}`} prefetch className="mt-4">
        <Button variant="soft" size="sm" className="w-full">Edit popup</Button>
      </AdminLink>
    </Card>
  ))}
</div>

// 5) Preserve the destructive actions: keep a per-card overflow menu (port the
//    PopupTable DropdownMenu: Edit / Publish / Move to draft / Archive / Delete)
//    OR keep PopupTable available behind a "list/grid" toggle. Either way the
//    handleStatusChange + handleDelete handlers and the ConfirmActionDialog (if
//    present) must remain reachable. Delete must still route through handleDelete.

// helpers (pure, presentational): triggerLabel(trigger) maps time_delay→"Timed",
//   scroll_depth→"Scroll", exit_intent→"Exit intent", cta_click→"On click";
//   audienceLabel / frequencyLabel map enum -> human text. No data mutation.
```

**Data flow:** `getCachedPopups()` lazy init (in `usePopups`) → `listPopupsCached`
hydrate + `cacheBus` background revalidation → `filtered`/`counts` useMemo over
`items` → stat row + card grid render. The restyle changes none of these edges; the
active toggle and overflow menu reuse the EXISTING `handleStatusChange` /
`handleDelete` handlers (which already call the client then `refresh(true)`).

**Navigation/href constraint (preserve):** "New popup", "Edit popup", and the
overflow "Edit" must keep routing through the canonical helpers — `navigate(...)`
for the button and `AdminLink href={...} prefetch` for the card link (already used
in `PopupTable.tsx`). Do NOT hand-build `<a href>` or string-concat admin URLs; if a
value currently flows through `adminPaths`/`AdminLink`/`prefetchAdminRoute`, leave
that wiring intact.

**Error handling:** keep the two destructive `Alert` blocks (`Unable to load
popups` for `error`, `Popup action failed` for `actionError`) with their existing
copy and conditions; only their surrounding card styling inherits the new tokens.
The empty state (was `PopupTable emptyMessage`) becomes a soft empty card:
`isLoading ? "Loading popups…" : "No popups yet."` — same text, restyled container.

**React-hooks/cache rules:** stat cards + trigger/audience/frequency labels are
derived at render via `useMemo`/pure helpers over `items`/`filtered` — no effect, no
synchronous `setState` in an effect. Do not add any mount effect that
force-refetches; the single hydrate effect + cacheBus subscription inside
`usePopups` are the only data effects and must stay untouched (no dirty-state
overwrite, no refetch loop).

**Regression-test shape:** see L03 — render `PopupsListPage` with a seeded
`getCachedPopups`, assert: header + Beta badge + New button, a 3-up stat row with
counts derived from items, a card per popup showing the real trigger/status, NO
impressions/conversion text, the active Switch toggling calls
`updatePopupStatus(id, "published"|"draft")`, the search/status filter still narrows
the grid, and delete still routes through `deletePopup`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/popups-list-restyle.test.tsx`
  (new suite in L03)
- Re-run the existing popups suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/popups-page.test.tsx tests/vitest/admin/popupsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-20-L01`.
- Reuse the shared `StatusBadge` / `StatCard` from TASK-479-06-L02 (tokens/variants
  from TASK-479-05) rather than introducing a Popups-local copy. If a Popups-only
  restyle helper is genuinely unavoidable, note it alongside the TASK-479-06 shell
  notes so other Advanced list screens reuse the same restyled primitives.
