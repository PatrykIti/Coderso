# 870. TASK-273 listing-filters and shared runtime wave

Date: 2026-05-20
Version: Unreleased
Tasks: TASK-273, TASK-273-01, TASK-273-02, TASK-273-03, TASK-273-04, TASK-273-05, TASK-273-06, TASK-273-07, TASK-273-08, TASK-315, TASK-316

## Key Changes

### Listing Filters widget closure
- Listing Filters now supports resilient picker/canvas flows, structured facet authoring, practical range/date controls, taxonomy hierarchy, searchable option mode, active filter chips with `Clear all`, truthful unloaded counts, and bounded `horizontal` / `sidebar` / `drawer` layout variants.
- Wizard, Visual, and Advanced now reflect the live authoring contract with diagnostics, preview guidance, layout controls, and native collapsible behavior instead of report-era placeholder gaps.

### Shared listing runtime and picker owners
- Shared listing-query pickers now use one `useListingQueries()` owner with bounded transient-auth retry and manual refresh behavior across Listing Filters and Search Box.
- Shared listing runtime refresh no longer falls back to immediate redirect on recoverable failures; it now uses scoped busy/error markers, stale-response protection, deterministic cross-block replacement, and explicit post-replacement rebind coverage for Listing Filters, Search Box, Content List, and Entry Teaser.

### Documentation and closure evidence
- The Playwright report, widget source-of-truth doc, task board, and closure evidence now match the live contract and explicitly separate TASK-256/TASK-262-03/TASK-315/TASK-316 ownership from widget-local work.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
