# TASK-479-22: Widget Library Screen Migration
# FileName: TASK-479-22-Widget-Library-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype of the Widget Library into the REAL
admin Widgets screen. This is a **visual restyle only**: the soft & friendly
(Notion-like) design language — VIOLET accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — is applied to the existing
Widget Library surface while the real widget metadata registry, lazily-split
widget editor loading (TASK-467), catalog/pages cache contract, favorites
persistence, insert-into-page flow, RBAC, and the details/insert drawers stay
exactly as they are.

- **Goal:** Make the real Widget Library look like the prototype — a softly
  restyled **section `Select`** (All Items / Favorites / All Widgets + the real
  registry categories, with counts) and the conditionally-shown **Recommended /
  All scope Tabs** over a responsive gallery of `rounded-2xl` widget cards, each
  with an abstract block preview and the existing kebab **actions** menu
  (Preview / Configure / Insert / Favorite) — without changing any control, data
  flow, registry, lazy editor loading, or endpoints. (The real category control
  is a `Select`, not tabs; the prototype's category-tab row has no 1:1 real
  control and is NOT introduced. `shadow-soft` / `shadow-card` / `font-display`
  and the `soft` Badge/Button variant are tokens/variants from 479-05.)
- **Owning module/service:** `core/admin/ui/widgets/**`
  (`WidgetLibraryPage.tsx`, `WidgetCard.tsx`, `WidgetCatalogFilters.tsx`,
  `WidgetLibraryTable.tsx`, `WidgetDetailsDrawer.tsx`, `WidgetInsertDialog.tsx`,
  `registry.ts`, `widgetCategoryMeta.ts`, `types.ts`), reusing
  `core/admin/ui/shared/PageHeader.tsx` and `core/admin/components/ui/*`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md`, `_docs/_PROTOTYPE/README.md`,
  `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/TESTING_STRATEGY.md`. Prototype
  reference screen: `_docs/_PROTOTYPE/src/pages/advanced/WidgetLibraryPage.tsx`.
- **Out of scope:** Any change to the widget registry
  (`listRegisteredWidgetLibraryWidgets`, `listModulePackStatus`,
  `core/widgets/registry`), the **lazily-split widget editor loading (TASK-467)**
  (the library page must NOT statically import editor bundles), the catalog/pages
  cache contract (`cacheKeys`, `getCachedWidgetCatalog`,
  `listWidgetCatalogCached`, `getCachedPages`, `listPagesCached`,
  `subscribeCacheEvents`), favorites persistence (`widgets.favorites` via
  `userSettingsClient`), the insert-into-page mutation (`getPageCached` +
  `updatePage`), RBAC, or the section/tab/complexity/module filtering taxonomy.
  Do NOT introduce a "Marketing" category the real registry does not have — keep
  the real `widgetCategoryOrder` / `widgetCategoryLabels` and section model (the
  categories render as `Select` options, not tabs). No new routes; no editor
  functionality.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The screen continues to read the catalog
through `listWidgetCatalogCached` and pages through `listPagesCached`, persist
favorites through `userSettingsClient`, and insert blocks through the existing
`getPageCached` + `updatePage` mutation (admin CSRF); no client cache, log, or
debug payload gains new fields.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-22-L01 | Widget Library Gallery Restyle | ⏳ To Do |
| TASK-479-22-L02 | Widget Library Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widget-library-row-actions.test.tsx tests/vitest/ui/widget-library-preview-feedback.test.tsx`
- New restyle suite added in L02 (see that leaf for the exact path), run with the
  same `NODE_ENV=test vitest run --config vitest.config.ts <suite>` form.
- All pre-existing Widget Library Vitest suites must stay green (the restyle must
  not alter observable hydration, favorites, selection, insert, view-switch, or
  pagination behavior).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move this subtask + leaves through the
  status buckets) and the Statistics block on every status change.
- On closure, add a `_docs/_CHANGELOG/` entry linking `TASK-479` and the closed
  leaf id(s).
- No contract doc changes expected (visual restyle only); if any user-visible
  affordance label changes, note it in the changelog entry — do not document
  behavior changes (there are none).
