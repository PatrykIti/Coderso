# TASK-479-24-L01: Plugin Store Gallery Restyle
# FileName: TASK-479-24-L01-Plugin-Store-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Store
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-24
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Plugin Store gallery to match the prototype: a violet **featured
banner**, a soft **category tab** strip, and a `rounded-2xl` **plugin card grid**
where each card shows the icon tile, rating, install count, price/Installed badge,
and an Install/Manage button. The existing master-detail selection model, the Store/
Installed top tabs, the search filter, and the install/update/policy state machine
are preserved exactly — only the presentation changes.

- **Goal:** `core/admin/ui/store/PluginStorePage.tsx` and its `StoreList.tsx` child
  look like `_docs/_PROTOTYPE/src/pages/store/PluginStorePage.tsx` (featured banner +
  category tabs + gallery cards) while keeping the existing `query`/`storeItems`/
  `selectedStoreId`/`selectedVersion`/`installedPlugins`/`selectedInstalled` state
  and all handlers (`handleSelectStore`, `handleInstall`, `handleUpdate`,
  `handleToggleEnabled`, `handlePolicyChange`, `handleUpdateCheck`) intact.
- **Owning module/service:** `core/admin/ui/store/PluginStorePage.tsx`,
  `core/admin/ui/store/StoreList.tsx`, `core/admin/ui/store/StoreDetail.tsx` (light
  touch only), and `core/admin/ui/store/types.ts`. Consumes shell + patterns from
  TASK-479-06 (`@/ui/layouts/AdminShell`, `@/ui/shared/PageHeader`, shared
  `StatusBadge`/icon-tile helpers).
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/store/PluginStorePage.tsx`; prototype primitives
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,input,tabs}.tsx` and
  `_docs/_PROTOTYPE/src/components/patterns/PageHeader.tsx`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  `_docs/STORE_SPEC.md` (store status taxonomy: verified/official/community).
- **Out of scope:** No new `/admin/store/:id` route and no change to the master-detail
  interaction — clicking a card selects into the existing `StoreDetail`/`PluginDetail`
  panel (it does NOT navigate away). No change to install/update/policy semantics,
  `store:browse` RBAC, the search filter algorithm, or any future `storeClient`/cache
  keys. The plugin **details** route is restyled in L02.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `PluginStorePage.tsx` (the six
`useState` hooks, the `selectedStore`/`selectedInstalledPlugin` derivations, the
`storeSelection` `useMemo`, and the six handlers). Keep the `AdminShell
activeHref="/admin/store"` wrapper, the `PageHeader`, and the Store/Installed
`Tabs` structure; reskin the gallery and add the featured banner + category strip.

```tsx
// PluginStorePage.tsx — RENDER ONLY changes inside the existing return().
// Wrapper, PageHeader, and the Store/Installed Tabs stay; only their styling and
// the Store-tab body change.

// 1) PageHeader: keep title/description. Move the StoreList search into the header
//    actions slot to mirror the prototype (search-in-header), OR keep search inside
//    StoreList — either way pass the SAME query/onQueryChange. PageHeader itself is
//    restyled centrally by TASK-479-06; this file just keeps passing props.
<PageHeader
  title="Plugin Store"
  description="Browse verified plugins, install securely, and manage update policies."
/>

// 2) NEW featured banner (port prototype Card.bg-primary). Purely presentational —
//    pick the first official/highest-securityScore catalog item at RENDER TIME
//    (render-time derivation, NO new effect, NO sync setState). Its CTA calls the
//    EXISTING handleSelectStore(featured.id) (and optionally handleInstall) — no new
//    wiring, no new data source.
const featured = useMemo(
  () => storeItems.find((p) => p.status === "official") ?? storeItems[0],
  [storeItems]
);
// <Card className="relative mb-6 overflow-hidden border-0 bg-primary p-7
//   text-primary-foreground shadow-card"> ... blurred orb ... Badge "Featured" ...
//   <h2 className="font-display text-2xl font-bold">{featured?.name}</h2> ...
//   <Button variant="soft" className="bg-white text-primary"
//     onClick={() => handleSelectStore(featured.id)}>View plugin</Button>
// </Card>

// 3) NEW category tab strip (port prototype Tabs: All / Analytics / Marketing /
//    Commerce / AI / Themes). Presentational scaffold layered over EXISTING data.
//    If wired to filter, DERIVE the active category from item.tags at render time
//    (no effect, no setState-in-effect) and pass the chosen category down to
//    StoreList as an extra filter alongside `query`. Default "all" = no filter, so
//    the existing search-only behavior is unchanged when no category is picked.
const [category, setCategory] = useState<string>("all"); // lazy init, UI-only
// const matchesCategory = (item) => category === "all" || item.tags.includes(category);

// 4) Store tab body: REPLACE the StoreList master list visual with the prototype
//    gallery grid, but keep StoreList as the owner of search + selection so the
//    detail panel keeps working. Restyle StoreList.tsx (see below). The
//    grid lives where the StoreList currently renders; StoreDetail stays beside it
//    (keep the two-column layout, just soften it to rounded-2xl/shadow-card).
```

```tsx
// StoreList.tsx — turn the vertical button list into the prototype CARD GRID.
// Keep ALL props (items, selectedId, query, onQueryChange, onSelect) and the
// existing filter algorithm (name/description/tags includes(normalized)).
// Add the optional category filter passed from the page.

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {filtered.map((item) => {
    const isActive = item.id === selectedId;
    const isInstalled = Boolean(item.installedVersion);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}            // UNCHANGED selection wiring
        aria-pressed={isActive}
        className={cn(
          "group flex h-full flex-col rounded-2xl border bg-card p-5 text-left",
          "shadow-card transition-all hover:-translate-y-0.5",
          isActive ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
        )}
      >
        <div className="flex items-start justify-between">
          {/* icon tile — port prototype tone tile; map by status or first tag.
              Reuse the shared icon-tile helper from TASK-479-06 if available. */}
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <Puzzle className="size-6" />
          </span>
          {isInstalled
            ? <Badge variant="success"><Check className="size-3" /> Installed</Badge>
            : <Badge variant="outline" className="capitalize">{item.status}</Badge>}
        </div>
        <div className="mt-4 font-display text-[15px] font-semibold">{item.name}</div>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-success" /> {item.securityScore}%
          </span>
          <span>{item.downloads}</span>            {/* "32k installs" already in data */}
        </div>
        {/* inline CTA: do NOT navigate — drive the existing selection so the detail
            panel opens; install proper happens via StoreDetail's Install button. */}
        <Button variant={isInstalled ? "outline" : "soft"} size="sm" className="mt-4 w-full"
          onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}>
          {isInstalled ? "Manage" : "View"}
        </Button>
      </button>
    );
  })}
</div>
```

**Data flow:** `catalog`/`installedSeed` seeds → `useState` store/installed lists →
`StoreList` filter (`query` + optional `category`) → `onSelect` sets
`selectedStoreId` → `storeSelection` `useMemo` → `StoreDetail` Install/Update calls
`handleInstall`/`handleUpdate`, which mutate `installedPlugins`/`storeItems` state.
The restyle changes none of these edges; the featured banner and category strip only
read existing state and call existing handlers/local UI state.

**Navigation/href constraint (preserve):** The store is a single `/admin/store`
master-detail page — there are NO per-plugin hrefs to build here. Do NOT introduce
hand-built `<a href>` or string-concatenated admin URLs to fake the prototype's
`<Link to="/store/plugins/sample">`; card clicks must keep using the existing
`onSelect(id)` selection. The sidebar entry and any future cross-links must continue
to flow through `adminPaths`/`AdminLink`/`prefetchAdminRoute`.

**Error handling:** Preserve `StoreList`'s "No plugins match your search." empty
state and `StoreDetail`'s incompatible/non-security `Alert` blocks verbatim; only
their surrounding card styling inherits the new tokens. No new error surfaces.

**React-hooks/cache rules:** `featured` and any category-derived filtering are
computed at render via `useMemo`/inline derivation over existing state — no effect,
no synchronous `setState` in an effect. `category` is UI-only `useState` with a lazy
default ("all"). Do not add any mount effect that force-refetches; there is no fetch
to add — the data stays in-memory seed (or the future `storeClient` hydrate, which
must be left untouched if present, with no dirty-state overwrite and no refetch loop).

**Regression-test shape:** see L03 — render `PluginStorePage` via `renderAdminUi` and
assert: PageHeader title, featured banner present, category tab strip renders, the
gallery renders one card per catalog item with security score + downloads + an
Install/View affordance, and the Store/Installed tabs + "Search plugins" still exist.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/plugin-store-restyle.test.tsx`
  (new suite in L03)
- Re-run the pre-existing store suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/plugin-store.test.tsx tests/vitest/storeUi/storeList.test.tsx`
  (keep "Plugin Store" / "Search plugins" / "Install" assertions green; update only
  the minimal selector if a node genuinely moved).
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-24-L01`.
- If a shared icon-tile or `StatusBadge` helper is introduced/changed for the store
  gallery, note it alongside the TASK-479-06 shell/pattern notes so other gallery
  screens reuse the same restyled primitives.
