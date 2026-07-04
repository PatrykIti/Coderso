# 1189 - TASK-468 V4 Custom Screen Completion

**Date:** 2026-06-22
**Version:** Unreleased
**Tasks:** TASK-468, TASK-468-01, TASK-468-01-L01, TASK-468-01-L02, TASK-468-02, TASK-468-02-L01, TASK-468-02-L02, TASK-468-02-L03, TASK-468-02-L04, TASK-468-06, TASK-468-06-L01, TASK-468-06-L02, TASK-468-06-L03, TASK-468-06-L04, TASK-468-07, TASK-468-07-L01, TASK-468-07-L02, TASK-468-07-L03, TASK-468-07-L04

## Key Changes

### Custom Screens

- Finished the V4-only write transition: create/update paths now accept V4
  `definition` payloads and reject legacy `blocks` / `bindings` writes with
  `custom_screen_legacy_write_unsupported`.
- Kept legacy V1/V2/V3 reads migratable to V4 while removing active
  `custom_screens.blocks` and `custom_screens.bindings` storage after the V4
  backfill/default migration.
- Retired active `screen-*` widget registration and the Custom Screen render
  bridge; V4 authoring/runtime now use native screen sections, blocks, and
  bindings.

### Assistant

- Replaced `custom-screen.widget.patch` with V4 section/block/binding/list-view
  actions in schemas, registry, operation policy, executor, undo manifests,
  blueprints, and UI labels.
- Updated active-surface hydration to expose bounded V4 block and binding
  summaries without raw record values.
- Split Custom Screen cache invalidation into lightweight helpers so assistant
  browser code can refresh affected list/detail caches without importing the
  full Custom Screens client.

### Data And Docs

- Added migrations `0061_custom_screen_v4_backfill.sql` and
  `0062_drop_custom_screen_legacy_columns.sql` plus Drizzle snapshots/journal.
- Updated Custom Screens API, architecture, data model, widgets, assistant,
  cache, task board, and widget reference docs to match the V4 source of truth.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- `git diff --check`
- Targeted Vitest suites passed for Custom Screens schemas/service/backfill,
  admin clients, assistant action planning and blueprints, widget retirement
  coverage, and Custom Screen UI flows.
- Targeted Bun suites passed for assistant execution, widget runtime registry,
  Custom Screen routes, and assistant routes.
- DB migration smoke passed against `DATABASE_URL` inside a rolled-back
  transaction for migrations `0061` and `0062`.
- Live `coderso-dev-core-host` plus `playwright-cli` smoke passed for admin
  login, V4 Custom Screen create/edit/reload, list/detail runtime, assistant V4
  dry-run/execute, legacy action rejection, cache refresh, public runtime
  rendering, and cleanup.
