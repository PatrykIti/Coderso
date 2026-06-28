# TASK-479-14-L01: Custom Screen Management List Restyle
# FileName: TASK-479-14-L01-Custom-Screen-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-14
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the Custom Screen **management list** — the index where authors see every
screen they have built — to the prototype's card-grid look. Each screen renders
as a soft `rounded-2xl` card showing its icon, name, status, block/binding
counts, and (for published screens) an **"In sidebar"** badge, with Edit / Open
actions. This is the entry point into the published-screen flow; published
screens are the ones surfaced in the left sidebar, so the "In sidebar" affordance
must be truthful to the real sidebar-shortcut state (`showInSidebar === true` +
`status === "active"` + dedicated-editor support), NOT a fabricated `published`
field (no such boolean exists on `CustomScreenRecord`).

- **Goal:** `core/admin/ui/custom-screens/CustomScreenListPage.tsx` reads like
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreensPage.tsx` — a responsive card
  grid (1/2/3 cols) of soft cards with status badge, "In sidebar" badge for
  published screens, and Edit/Open buttons — while keeping the real
  `useCustomScreens` data, filters, create drawer, pagination, cache
  subscription, and the published→sidebar shortcut wiring.
- **Owning module/service:**
  `core/admin/ui/custom-screens/CustomScreenListPage.tsx` plus its presentation
  children `CustomScreenTable.tsx` / `CustomScreenFilters.tsx` /
  `CustomScreenCreateDrawer.tsx` / `CustomScreenRowActions.tsx` /
  `CustomScreenBulkActionsBar.tsx`; data via `hooks/useCustomScreens`,
  `customScreenListModel.ts`, and `customScreenShortcutsClient.ts`.
- **Source-of-truth docs:** prototype list
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreensPage.tsx`; prototype
  primitives `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,separator}.tsx`
  and `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatusBadge}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No change to the create/duplicate/delete/publish operations,
  the list model derivation, pagination math, filter semantics, or the sidebar
  shortcut sync. The entry-view builder is L02, the published List View is L03,
  the entry editor is L04. Whether the list stays a table or becomes a card grid
  is a presentation decision — if the existing table carries behavior
  (selection/bulk) that the card grid would drop, KEEP the table mechanics and
  restyle them, or offer the card grid as an additional view that reuses the same
  selection state; do not silently drop bulk actions.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

The page is wired through `AdminShell` + `PageHeader` and reads from
`useCustomScreens()` (`{ items, isLoading, error, refresh }`), subscribes to
`cacheKeys` events via `subscribeCacheEvents`, and persists a user list
preference via `getUserSettings`/`setUserSetting`. Keep all of that; restyle the
body that renders `items`.

```tsx
// 1) PageHeader — port the prototype header look:
//    title="Screens", description="Build bespoke admin surfaces from blocks
//    bound to your data, then publish them to the sidebar.", a soft "Beta" Badge,
//    and the primary "New screen" action. The "New screen" action MUST keep its
//    real handler (opens CustomScreenCreateDrawer), NOT a hand-built <Link>.

// 2) Card grid — replace/augment the list body with the prototype grid:
//    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//      {items.map((screen) => (
//        <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
//          <header>{iconTile(screen)}  <StatusBadge status={screen.status} /></header>
//          <div className="mt-4 flex items-center gap-2">
//            <span className="font-display text-[15px] font-semibold">{screen.name}</span>
//            {inSidebar ? (
//              <Badge variant="success" className="gap-1"><PanelLeft className="size-3" /> In sidebar</Badge>
//            ) : null}
//          </div>
//          <Meta blocks={screen.blocks.length} bindings={screen.bindings.length} />
//          <Separator className="my-4" />
//          <footer className="mt-auto flex gap-2">
//            <AdminLink to={editHref(screen)}><Button variant="outline" size="sm" className="w-full">Edit</Button></AdminLink>
//            <AdminLink to={entriesHref(screen)}><Button variant="soft" size="sm" className="w-full">{inSidebar ? "Open" : "Entries"}</Button></AdminLink>
//          </footer>
//        </Card>
//      ))}
//    </div>
//    NOTE: every card field comes from the REAL list model
//    (customScreenListModel.ts / useCustomScreens / CustomScreenRecord), NOT the
//    prototype's hardcoded SCREENS array. Real bindings:
//      - status  -> `screen.status` (the real enum is "draft" | "active" — there is
//        NO "published" status; render it via the shared StatusBadge from 479-06-L02).
//      - inSidebar (the "In sidebar" badge + Open/Entries label) -> derive from the
//        list model: `resolveCustomScreenSidebarShortcutState(screen) === "visible"`,
//        which mirrors EXACTLY what `buildCustomScreenShortcutNavItems` filters on
//        (`status === "active" && showInSidebar === true && supportsDedicatedEditor`).
//        Do NOT invent a `screen.published` boolean.
//      - block/binding counts -> `screen.blocks.length` / `screen.bindings.length`
//        (there are no precomputed `blockCount`/`bindingCount` fields).
//      - iconTile -> there is no per-screen icon field on the record; use a static/
//        generic screen icon (e.g. LayoutGrid, as the sidebar shortcut already does),
//        NOT a fabricated `screen.icon`.

// 3) Hrefs — editHref/entriesHref resolve through adminPaths + the custom-screen
//    route helpers (buildCustomScreenWorkspaceHref / resolveAdminHref), wrapped in
//    AdminLink so prefetch (prefetchCustomScreenListData /
//    prefetchCustomScreenWorkspaceData) keeps firing. Never string-concat a path.

// 4) Preserve selection/bulk: if CustomScreenTable currently drives
//    CustomScreenBulkActionsBar via selection state, EITHER keep the table view
//    (restyled) OR lift the same selection state into the card grid (card carries
//    a Checkbox) — the bulk bar + its actions must remain reachable.

// 5) States: isLoading -> skeleton cards (rounded-2xl placeholders); error ->
//    existing <Alert> restyled; empty -> soft empty card with the "New screen"
//    CTA. Keep the existing conditions/copy; only restyle.
```

**Data flow:** `useCustomScreens()` hydrates from cache + background-revalidates →
`customScreenListModel` derives the per-card view model (name, status, published,
counts) → the grid renders cards → Edit/Open route through `AdminLink` +
`adminPaths`/route helpers → create/duplicate/delete/publish keep their existing
handlers and toasts (`customScreenListToasts`). The restyle touches only
JSX/classNames.

**Cache / refresh (preserve):** Keep the `subscribeCacheEvents` handler and its
`event.key` guards (`cacheKeys.customScreensList`, the `contentTypesList` guard
already present) and `refresh()` call exactly as-is. Do NOT add a mount effect
that force-refetches; rely on the existing hydrate + revalidate path.

**Published→sidebar constraint (preserve):** The "In sidebar" badge is a
read-only reflection of the published state that `buildCustomScreenShortcutNavItems`
(`sidebarConfig.ts`) consumes via `customScreenShortcutsClient`. Restyling must
not change how/when a screen becomes published or how the sidebar shortcut is
built; if a publish toggle exists in a row action, keep its handler.

**React-hooks rules:** No new sync `setState` in effects. Derive the card view
model at render (or `useMemo` over `items`); keep the existing
`useListPagination` and user-setting hooks unchanged.

**Error handling:** Preserve the existing error `<Alert>` (title/description) and
loading/empty branches; they inherit the new card/token styling. No new error
surfaces.

**Regression-test shape:** see L05 — render `CustomScreenListPage` with a seeded
`useCustomScreens` (one `active` + `showInSidebar` screen + one `draft` screen);
assert a `rounded-2xl` card per screen, the "In sidebar" badge present ONLY on the
in-sidebar (`resolveCustomScreenSidebarShortcutState === "visible"`) one, the
"New screen" action present, Edit/Open links resolving to the canonical
workspace/editor hrefs (via `AdminLink`), and that selecting a screen still
surfaces the bulk-action cluster (if selection is retained).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx`
  (new suite in L05)
- Existing list suites MUST stay green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L01`.
- If the list moves from table to card grid as the primary view, note the
  affordance change (and any retained table/bulk view) in the Custom Screens UX
  note so downstream docs and [[task-474-custom-screen-canvas-parity]] stay
  aligned.
