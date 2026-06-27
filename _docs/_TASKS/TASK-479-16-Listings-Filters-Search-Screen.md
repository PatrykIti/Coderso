# TASK-479-16: Listings, Filters & Search Modules Migration
# FileName: TASK-479-16-Listings-Filters-Search-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the **Advanced → Listings / Filters /
Search modules** experience into the real admin. This covers the Listings **list**
screen, the Listing **query editor**, and the **Filters** + **Search** preview
screens so they all adopt the soft & friendly (Notion-like) language: warm neutral
canvas, white `rounded-2xl` cards, soft shadows, **violet** accent, light default +
dark toggle. Only the presentation layer changes — the listing query model, content-
type binding, runtime-token preview, public-search preview, caching, RBAC, and
routing are preserved exactly.

- **Goal:** Make `core/admin/ui/listings/ListingListPage.tsx`,
  `ListingEditorPage.tsx`, `ListingFiltersPage.tsx`, and `ListingSearchPage.tsx`
  match the prototype look while keeping every behavior, so a user sees the
  redesigned listings card grid, a calmer query editor (left rail data/filters →
  canvas result preview → right inspector layout), and softly carded Filters/Search
  preview tools with no functional regressions.
- **Owning module/service:** `core/admin/ui/listings/**` (list page + its
  query/template filters, tables, bulk-actions bar, template manager; the query
  editor; the filters + search preview pages; `listings/hooks/*`,
  `listings/defaults.ts`, `listings/listingActionToasts.ts`). Shared primitives from
  TASK-479-05/06 (`core/admin/styles/globals.css`, `AdminShell`,
  `@/ui/shared/PageHeader`).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent
  `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source screens:
  `_docs/_PROTOTYPE/src/pages/advanced/ListingsPage.tsx`,
  `ListingEditorPreview.tsx`, `FiltersPage.tsx`, `SearchModulePage.tsx`; prototype
  primitives under `_docs/_PROTOTYPE/src/components/{ui,patterns}` (notably
  `patterns/{PageHeader,EditorPreviewFrame,SectionCard,EmptyState}.tsx`).
- **Out of scope:** No changes to the listings API routes, the `listingsClient`
  service, the cache policy/keys (`listingQueriesList`, `listingQueryDetail`,
  `listingTemplatesList`, `listingTemplateDetail`), the `cacheBus` contract, the
  listing-query payload schema (source/filters/sort/pagination/fields), the runtime
  token grammar (`lq.<id>.<field>.<op>`), the public-search source set, or RBAC. The
  Filters and Search screens stay functional preview tools (NOT the non-functional
  prototype mock); only their chrome/cards are restyled. The global token + shell
  redesign land in TASK-479-05 and TASK-479-06 and are consumed here, not
  re-implemented.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-16-L01 | Listings List Restyle | ⏳ To Do |
| TASK-479-16-L02 | Listing Editor Restyle | ⏳ To Do |
| TASK-479-16-L03 | Filters & Search Modules Restyle | ⏳ To Do |
| TASK-479-16-L04 | Listings Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  and the new `tests/vitest/ui-integration/listing-*-restyle.test.tsx` suites added
  in L04.

The pre-existing `tests/vitest/admin/listingsClient.test.ts` suite must stay green —
the restyle must not break a single behavioral test. Do NOT migrate runtime tests
into Vitest for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If a shared restyle primitive (e.g. a listing-query summary helper, a source/
  layout badge map, or a SectionCard wrapper) is added/changed, note it alongside
  the TASK-479-06 shell notes so the other Advanced screens reuse it consistently.
