# 382. TASK-105 Listing Filters Editor Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct `happy-dom` coverage for `ListingFiltersEditors` across listing-query binding, runtime labels, facet editing, sort facet config, runtime snapshot rendering, and loader error state.
- This continues the real widget-editor move into the Vitest lane after `EntryTeaserEditors`, reducing reliance on older renderer-level tests for editor confidence.

### Coverage Progress
- Previous snapshot after the first widget-editor slice: `52.40% stmts`, `46.13% branch`, `48.07% funcs`, `55.01% lines`
- Current snapshot after this follow-up remains `52.40% stmts`, `46.13% branch`, `48.07% funcs`, `55.01% lines`
- `ListingFiltersEditors.tsx` moved to `74.33%` lines / `36.06%` branches
- Combined `core/admin/ui/widgets/editors/*` average now sits at `47.79%` lines / `47.73%` branches

### Remaining Focus
- The widget-editor cluster still needs deeper work in `PostsFeedEditors`, `ContentListEditors`, `StatsKpiEditors`, and the `Product*` family.
- The next logical slice in `TASK-105-06` is either `ContentListEditors` or `PostsFeedEditors`, depending on whether we prefer lower line coverage or lower branch coverage first.
