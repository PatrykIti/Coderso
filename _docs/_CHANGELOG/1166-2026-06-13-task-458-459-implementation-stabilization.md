# 1166 - TASK-458/459 implementation stabilization

**Date:** 2026-06-13
**Version:** Unreleased
**Tasks:** TASK-458-01, TASK-458-02, TASK-458-03, TASK-459-01, TASK-459-02, TASK-459-03, TASK-459-04

## Key Changes

### Menus And Site Shell (TASK-458)

- Moved site-shell configuration to the Menus surface through a scoped dialog
  and removed the duplicate Site Settings shell UI.
- Added the menu appearance model, migration artifacts, publish/draft
  snapshot plumbing, and fail-closed public shell CSS builder. Design edits
  are stored as top-level draft state and do not reach the public shell until
  `publishMenu` copies them to `menus.settings.published`.
- Added `/admin/menus/:id/design` with the shared editor host, restricted
  menu palette, menu canvas, appearance panel, and published extras support.

### Visitor Listings (TASK-459)

- Froze and implemented the generic visitor filters contract: filters block
  schema, aliases, canonical `lq.*` precedence, legacy filters-pair
  normalization, pagination, counts, and dangling-link policy.
- Wired the alias-aware filters form, v2 runtime script, sort/search/count
  controls, paged/load-more behavior, list-route search params, and template
  style consumption without changing the established UI direction.
- Added listing SQL pushdown and index artifacts, corpus-wide facet counts,
  option-A filtered HTML cache signatures, and stricter cache-key grammar.
  Arbitrary pretty alias-only URLs intentionally bypass global HTML caching
  unless represented by a cacheable canonical `lq.*`, `cl.*`, route `page`, or
  route `sort` parameter.

## Validation

- Targeted Vitest: search/filter engine, listing runtime script, page
  document v2, page runtime data binding, and admin app route coverage passed.
- Targeted Bun: content list resolver, site cache, menu service, menu routes,
  menu design runtime, listing pushdown superset/oracle matrix, pages runtime,
  and performance gate passed.
- `bun --cwd core lint`, `bun --cwd core lint:types`, local root
  `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, DB reachability,
  EXPLAIN index checks, and `bun run gates:coderso` passed.

## Board

- Done: TASK-458-01, TASK-458-02, TASK-458-03, TASK-459-01, TASK-459-02,
  TASK-459-03, TASK-459-04.
- Still open: TASK-458 and TASK-459 parent tasks remain In Progress because
  TASK-458-04 and TASK-459-05 still require the live dev-host Playwright
  smoke/demo evidence.
