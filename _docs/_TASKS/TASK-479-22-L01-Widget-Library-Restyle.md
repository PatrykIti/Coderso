# TASK-479-22-L01: Widget Library Gallery Restyle
# FileName: TASK-479-22-L01-Widget-Library-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-22
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Widget Library to match the prototype. Port the prototype's
look — a softly-restyled **section `Select`** (categories live here as options,
not tabs) plus the conditionally-shown **Recommended / All scope Tabs**, over a
responsive **widget card gallery** where each card shows an **abstract block
preview** and the existing kebab **actions** menu (Preview / Configure / Insert /
Favorite) — onto the existing `WidgetLibraryPage.tsx` and its child components,
preserving every behavior (catalog/pages cache-hydrate + background revalidation,
favorites, selection, view switch, pagination, insert-into-page, details/insert
drawers) and the lazily-split widget editor loading (TASK-467).

- **Goal:** A Notion-like, violet-accented Widget Library: warm canvas, white
  `rounded-2xl` cards with soft shadow + subtle hover lift, abstract block
  previews in a `rounded-xl` tinted frame, a softly-restyled section `Select` +
  the Recommended/All scope Tabs, and a comfortable responsive grid — with zero
  behavior changes. (`shadow-soft` / `shadow-card` / `font-display` and the
  `soft` Button variant are tokens/variants from 479-05.)
- **Owning module/service:** `core/admin/ui/widgets/WidgetLibraryPage.tsx` (+
  `WidgetCard.tsx`, `WidgetCatalogFilters.tsx`, the `renderPreview` /
  `PreviewFrame` helpers inside `WidgetLibraryPage.tsx`), reusing
  `core/admin/ui/shared/PageHeader.tsx`,
  `core/admin/components/ui/{card,badge,button,tabs,input,select}.tsx`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`. **Ports from:**
  `_docs/_PROTOTYPE/src/pages/advanced/WidgetLibraryPage.tsx` (the `WIDGETS`
  gallery, `WidgetPreview` abstract block previews, category `Tabs`, and the
  Card → preview → name/Badge → Insert/Preview layout),
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,tabs}.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/PageHeader.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `widgetsClient`, `pagesClient`,
  `userSettingsClient`, `cachePolicy`, `cacheBus`, the widget registry
  (`listRegisteredWidgetLibraryWidgets`, `listModulePackStatus`), the lazy
  editor split (TASK-467 — do NOT add a static import of any `editors/*` bundle
  to the library page), the section/tab/complexity/module taxonomy, favorites
  limit logic, the insert mutation, or the details/insert drawers' behavior. No
  new endpoints. Do NOT invent a "Marketing" category the registry lacks.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Catalog reads stay on
`listWidgetCatalogCached`, page reads on `listPagesCached`, favorites on
`setUserSetting("widgets.favorites", …)`, and inserts on `getPageCached` +
`updatePage` (admin CSRF). No new fields enter client cache, logs, or debug
payloads.

---

## Implementation Pseudocode

Concrete shapes — port the prototype's visual structure but bind it to the REAL
state already in `WidgetLibraryPage.tsx`. **Keep all existing hooks, effects,
handlers, memoized derivations, and the cache-hydrate + background-revalidation
flow untouched**; only the returned JSX and the child-component class names
change. The `WidgetLibraryPage` continues to render inside
`<AdminShell activeHref="/admin/advanced/widgets" …>` (do NOT hand-build hrefs;
nav stays on `AdminShell` + `useAdminRouter().navigate` + the canonical helpers).

### 1) Section `Select` + Recommended/All scope Tabs (`WidgetLibraryPage.tsx` Select + `WidgetCatalogFilters.tsx`)

```tsx
// The REAL section/category control is a `<Select>` in WidgetLibraryPage
// (sectionOptions = All Items / Favorites / All Widgets + the real categories,
// each shown with a sectionCounts count). It is NOT a tab row — softly restyle
// the SelectTrigger (radii/shadow/accent) but KEEP it a Select; do NOT convert
// it to tabs (that would add/remove a control — out of scope). The prototype's
// category-tab row has no 1:1 real control; the categories are Select options.
// Bind to REAL state — do NOT introduce new categories:
//   - keep `section` (WidgetLibrarySection) + `widgetTab` (recommended|all)
//   - keep `widgetCategoryOrder` / `widgetCategoryLabels` from widgetCategoryMeta
//   - the prototype "Marketing" tab has NO registry equivalent → it never
//     appears (sectionOptions derive from widgetCategoryOrder; categories are
//     Layout/Content/Forms/Navigation/Media).
// The ONLY real Tabs are WidgetCatalogFilters' Recommended / All-widgets SCOPE
// tabs, conditionally rendered for the widgets-all/category sections. Restyle
// their TabsList/TabsTrigger to the prototype pill tokens (h-auto rounded-xl
// bg-muted p-1; active = bg-card text-primary shadow-soft [shadow token from
// 479-05]; horizontal-scroll on overflow per the floating-panel UX memo). Keep
// the Recommended/All count Badges, Advanced-mode Switch, and module/complexity
// Selects wired exactly as today (advancedMode still gates complexity).
```

### 2) Page header + toolbar (`WidgetLibraryPage.tsx` — JSX only)

```tsx
// Keep PageHeader title="Widget Library" + description + the existing bulk-action
// actions slot (selectedVisibleRows badge, Add/Remove favorites, Clear). Restyle
// the toolbar card to prototype chrome: <section className="rounded-2xl border
// bg-card p-4 shadow-soft">. Preserve EVERY control and its wiring:
//   - search Input (aria-label="Search widgets", leading Search icon)
//   - section Select (sectionOptions + sectionCounts) — KEEP the sr-only
//     "Available widget library sections:" list (tests assert it)
//   - resourceLabel count Badge, table/grid view toggle (aria-pressed preserved)
//   - the "Section: … / Default view: table" status line + favoritesError slot.
// Only spacing/radii/shadow/accent change; no control is added or removed.
```

### 3) Abstract block previews (`renderPreview` / `PreviewFrame` in `WidgetLibraryPage.tsx`)

```tsx
// The real preview taxonomy is the WidgetPreview union
//   "hero"|"grid"|"form"|"media"|"video"|"text"|"pricing"|"banner".
// PORT the prototype's softer preview frame + block skeletons:
//   PreviewFrame -> "h-full w-full rounded-xl bg-muted p-3" (drop the hard
//   border/shadow-sm; use the warm muted token like prototype's
//   "rounded-xl bg-muted p-3"). Keep the SAME switch arms keyed by WidgetPreview
//   — only restyle the inner skeleton blocks to the prototype's
//   "bg-muted-foreground/{10..30}" tints + rounded-md tiles. Do NOT change the
//   mapping from category → preview kind in `categoryMeta` (it feeds real data).
```

### 4) Widget card gallery (`WidgetCard.tsx` default variant + the grid in `WidgetLibraryPage.tsx`)

```tsx
// Grid container (grid view branch): port the prototype's comfortable gallery:
//   "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4".
// WidgetCard (variant="default"): wrap in the prototype card chrome —
//   <Card className="flex h-full flex-col rounded-2xl p-4 shadow-soft
//     transition-all hover:-translate-y-0.5 hover:shadow-card"> (shadow-soft /
//   shadow-card tokens from 479-05). REAL card composition (re-skin in place, do
//   NOT restructure controls): preview frame (renderPreview) with the kebab
//   `actions` slot pinned top-right → category Badge + metaBadges row → name
//   (h3; may adopt font-display [token from 479-05]) beside the inline
//   `Configure` button (the real resolvedAction/resolvedLabel outline button).
// PRESERVE all existing props/wiring: onSelect (card click → handleOpenPrimary),
//   onSelectionChange Checkbox (selectionMode), `actions` slot
//   (WidgetLibraryRowActions: Preview/Configure/Insert/Favorite), isFavorite
//   star, metaBadges (complexity + module), badge, and the
//   event.stopPropagation() guards on inner controls. The "compact" variant
//   (used elsewhere) stays as-is unless explicitly restyled.
// NOTE: the real card exposes Insert/Preview through the kebab
//   `WidgetLibraryRowActions` DropdownMenu (a MoreHorizontal trigger →
//   Preview/Configure/Insert/Favorite items, rendered only when OPEN) in the
//   `actions` slot, plus the inline `Configure` button — NOT standalone
//   Insert/Preview buttons. The prototype's standalone Insert/Preview buttons
//   are only a VISUAL reference for re-skinning those existing kebab items /
//   Configure button; do NOT add new standalone buttons or handlers (that would
//   change controls/behavior).
```

### 5) Drawers + table (unchanged behavior, light restyle)

```tsx
// WidgetDetailsDrawer.tsx + WidgetInsertDialog.tsx: restyle chrome to soft
//   rounded-2xl panels + violet primary actions ONLY. Do NOT touch the insert
//   payload flow (placement new|inside, getPageCached+updatePage, notify),
//   page-target selection, or error surfaces. The lazy editor split (TASK-467)
//   stays: the library page never statically imports editor bundles.
// WidgetLibraryTable.tsx (table view, the DEFAULT view): may receive soft-token
//   header/row polish but keeps columns, select-all, row actions, and onOpenPrimary.
```

**Data flow:** unchanged. `getCachedWidgetCatalog()` / `getCachedPages()` lazy
initial-cache hydrate → `listWidgetCatalogCached` / `listPagesCached` background
refresh via `subscribeCacheEvents` → `widgets` (memoized, mapped through
`categoryMeta`) → filtered/paginated → table or card grid. Favorites read/write
through `userSettingsClient`; insert through `getPageCached` + `updatePage`. No
new fetch, no mount-force refetch, no setState-in-effect added.

**Error handling:** unchanged — keep the sr-only `role="status"` blocks for
`pagesError` / `catalogError` / `insertError`, the `favoritesError` inline slot,
the dashed empty-state panel ("No items match your search."), and the insert
dialog's error prop. The restyle must not swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** all derivations stay
`useMemo` (no sync setState in effects; obey ESLint 9 react-hooks rules); the
`hasHydratedRef` cache-hydrate guard and background-revalidation effects are
untouched; no mount-force refetch added; no dirty-state overwrite of in-flight
favorites/insert; nav stays on `AdminShell` + canonical helpers (no hand-built
href); the lazy editor split (TASK-467) is preserved (no static `editors/*`
import added to the page).

**Regression-test shape (delivered in L02):** grid view renders one
`rounded-2xl` card per visible widget with abstract preview + name + category
Badge + the kebab `actions` trigger; the section `Select` (via the sr-only
section list) renders only real registry categories (no "Marketing"); the view
toggle, status line, and empty state are preserved; favorites/selection/insert
handlers still fire. (Grid/preview/kebab assertions need the interactive
`createRoot` + `React.act` lane — they are NOT reachable through the SSR
`renderAdminUi` snapshot; see L02.)

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widget-library-row-actions.test.tsx tests/vitest/ui/widget-library-preview-feedback.test.tsx`
- The new restyle suite from L02 (`tests/vitest/ui/widget-library-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/advanced/widgets`; confirm the section
  Select + Recommended/All Tabs, grid/table switch, abstract previews, the kebab
  actions menu (Preview/Configure/Insert/Favorite), favorites, selection, and the
  insert dialog all behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-22-L01`.
- No contract-doc change expected (visual restyle only); if a user-visible label
  changes, note it in the changelog entry — document no behavior change.
