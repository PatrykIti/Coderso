# TASK-479-26: Tools Screens Migration
# FileName: TASK-479-26-Tools-Screens.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the six **Tools** screens into the
real admin so they adopt the soft & friendly (Notion-like) language: warm neutral
canvas, white `rounded-2xl` cards, soft shadows, **violet** accent, light default +
dark toggle. The Tools cluster covers Global Search, SEO Manager, Analytics,
Backups, Import / Export, and Redirects. Only the presentation layer changes — all
data loading, caching, RBAC, routing, action flows (audit/restore/export/redirect
CRUD), and dirty-state protection are preserved exactly.

- **Goal:** Make `core/admin/ui/search/SearchPage.tsx`,
  `core/admin/ui/seo/SeoManagerPage.tsx`, `core/admin/ui/analytics/AnalyticsPage.tsx`,
  `core/admin/ui/backups/BackupsPage.tsx`,
  `core/admin/ui/import-export/ImportExportPage.tsx`, and
  `core/admin/ui/redirects/RedirectsPage.tsx` (plus their child components) match the
  prototype look while keeping every behavior, so a user sees the redesigned Tools
  screens (centered grouped search, stat rows + soft DataTables, area/donut/bar
  charts, schedule + storage cards, import dropzone + export checklist, inline redirect
  add row) with no functional regressions.
- **Owning module/service:** `core/admin/ui/search/**`, `core/admin/ui/seo/**`,
  `core/admin/ui/analytics/**`, `core/admin/ui/backups/**`,
  `core/admin/ui/import-export/**`, `core/admin/ui/redirects/**`. All shared
  primitives (`PageHeader`, `StatCard`, `SectionCard`, `DataTable`, `FilterBar`,
  `EmptyState`, `StatusBadge`, `Charts`, `ListPaginationFooter`) are consumed from
  `core/admin/ui/shared/**` as restyled in TASK-479-06 (L01 primitives, L02 pattern
  library) — they are NOT re-implemented here.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent
  `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source screens under
  `_docs/_PROTOTYPE/src/pages/tools/{SearchPage,SeoManagerPage,AnalyticsPage,BackupsPage,ImportExportPage,RedirectsPage}.tsx`;
  prototype primitives under `_docs/_PROTOTYPE/src/components/{ui,patterns}`; tokens in
  `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No changes to any Tools API route, to the service clients
  (`searchClient`, `seoClient`, `analyticsClient`, `backupsClient`,
  `importExportClient`/`adminExportClient`, `redirectsClient`), to the cache policy /
  keys (`cacheKeys.seoList`/`seoDetail`, `cacheKeys.backupSchedule` + `backups:list:*`,
  `cacheKeys.redirectsList`, the analytics overview/top-content cache, the recent
  searches cache), to `cacheBus` invalidation, or to RBAC. The audit/drawer/restore/
  download/delete/export/import/redirect-CRUD flows stay fully functional; only chrome,
  layout, and styling change. The global token + shell + shared-pattern redesign land
  in TASK-479-05 and TASK-479-06 respectively and are consumed here, not re-built.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-26-L01 | Global Search Restyle | ⏳ To Do |
| TASK-479-26-L02 | SEO Manager Restyle | ⏳ To Do |
| TASK-479-26-L03 | Analytics Restyle | ⏳ To Do |
| TASK-479-26-L04 | Backups Restyle | ⏳ To Do |
| TASK-479-26-L05 | Import / Export Restyle | ⏳ To Do |
| TASK-479-26-L06 | Redirects Restyle | ⏳ To Do |
| TASK-479-26-L07 | Tools Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-search-restyle.test.tsx tests/vitest/ui-integration/tools-seo-restyle.test.tsx tests/vitest/ui-integration/tools-analytics-restyle.test.tsx tests/vitest/ui-integration/tools-backups-restyle.test.tsx tests/vitest/ui-integration/tools-import-export-restyle.test.tsx tests/vitest/ui-integration/tools-redirects-restyle.test.tsx`
  (new suites added in L07)

The full pre-existing Tools suites must stay green — the restyle must not break a
single behavioral test. At minimum re-run the existing Tools family:
`tests/vitest/ui/search-page.test.tsx`, `tests/vitest/ui/search-results.test.tsx`,
`tests/vitest/ui/search-navigation.test.tsx`, `tests/vitest/ui/seo-manager.test.tsx`,
`tests/vitest/ui/analytics.test.tsx`,
`tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx`,
`tests/vitest/ui/backups.test.tsx`, `tests/vitest/ui/backups-page-wave.test.tsx`,
`tests/vitest/ui/import-export.test.tsx`, `tests/vitest/ui/redirects.test.tsx`,
`tests/vitest/ui/redirects-page-leaf.test.tsx`, and the client suites
`tests/vitest/admin/{searchClient,seoClient,analyticsClient,backupsClient,importExportClient,adminExportClient,redirectsClient}.test.ts`.
Do NOT migrate runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If a shared restyle primitive (`StatCard`, `Charts`, `DataTable`, `FilterBar`,
  `StatusBadge`) is added/changed while porting a Tools screen, note it alongside the
  TASK-479-06 shell notes so every screen reuses the same restyled primitive.
