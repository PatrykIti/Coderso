# 737 - TASK-207 entries list parity

Date: 2026-04-24
Version: Unreleased
Tasks: TASK-207, TASK-207-01, TASK-207-01-01, TASK-207-01-02, TASK-207-02, TASK-207-02-01, TASK-207-02-02, TASK-207-02-03, TASK-207-03, TASK-207-03-01, TASK-207-03-02, TASK-207-03-03, TASK-207-04, TASK-207-04-01, TASK-207-04-02, TASK-207-04-03, TASK-207-05

## Key Changes

### CMS Entries
- Added the internal all-entries read model at `GET /content-entries`, backed
  by `listEntriesWithContentTypes()` and strict empty query validation.
- Preserved existing type-scoped `/content/:type/entries` routes and
  type-scoped list/detail caches for editors, widgets, relations, and existing
  clients.

### Admin UI
- Rebuilt `/admin/coderso/entries` on the shared admin list pattern:
  `AdminShell`, `PageHeader`, centered max-width content, inline bulk actions,
  `EntryTable`, and `ListPaginationFooter`.
- Entries now render across content types in one table with a `Content Type`
  column linking to the owning Engine editor.
- Filters are split into basic search/status controls plus collapsible advanced
  content type, author, and updated-date filters.
- Bulk selection is scoped to visible paginated rows and executes with
  `{ id, typeSlug }` refs, so cross-type actions no longer depend on one stale
  active content type.
- Row and bulk delete use shared token-backed confirmation primitives.

### Cache and Prefetch
- Added `entries:list:all`, `listAllEntriesCached()`, all-entries cache
  hydration, prefetch warmup for `/coderso/entries`, mutation invalidation, and
  assistant cache events.
- Updated admin cache docs and cache map for the all-entries list contract.

### Validation
- Passed `bun --cwd core lint`.
- Passed `bun --cwd core lint:types`.
- Passed targeted Vitest suites for Entries client cache, admin prefetch,
  assistant cache events, Entries list/filter/table/bulk behavior, and content
  entries render smoke.
- Passed shared list/popup smoke suites covering pagination, Content Types,
  Pages/Posts, Menus, and Entry table support.
- Passed Bun route/schema tests for `GET /content-entries` registration, route
  collision proof, and strict query schema rejection.
- DB-backed Bun service/route tests were invoked with `DATABASE_URL` loaded from
  the main checkout `.env`, but skipped because the test DB connection was
  unavailable in this worktree session.
